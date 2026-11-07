// Gera um HTML (multiple-cucumber-html-reporter) a partir de cucumber-report.json
// (formato cucumber-json nativo, configurado via cucumberOpts.format no
// wdio.conf.js), espalhados em tests/reports/<sessionLabel>/ (um por
// worker/execução — ver tests/support/sessionLabel.js). A lib só lê um
// diretório plano (não recursivo), então copiamos os JSONs achados por glob
// recursivo pra uma pasta temporária antes de chamar generate().
//
// Seleção de quais JSONs entram (pedido do usuário, 2026-10-09: por padrão o
// relatório deve refletir só a execução mais recente, não um acumulado de
// todo o histórico):
//   node scripts/generateHtmlReport.mjs            → só a sessão mais recente
//   node scripts/generateHtmlReport.mjs <trecho>    → só sessão(ões) cujo
//                                                      caminho contém <trecho>
//                                                      (ex.: "13-41-24" ou
//                                                      "local-09-10-2026")
//   node scripts/generateHtmlReport.mjs --all       → histórico inteiro
//                                                      (comportamento antigo,
//                                                      útil pra tendência)
//
// Reaproveitado automaticamente pelo `onComplete` de `wdio.conf.js` (pedido do
// usuário, 2026-10-09) — por isso a lógica vive numa função exportada
// (`generateHtmlReport`), não só no bloco `main()` do CLI.
//
// Sem política de exclusão: cada chamada cria uma pasta de saída nova, nomeada
// com data/hora no padrão brasileiro — nunca sobrescreve nem apaga relatórios
// anteriores.
import { generate } from 'multiple-cucumber-html-reporter'
import { globSync } from 'glob'
import {
  mkdtempSync, mkdirSync, copyFileSync, rmSync, statSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { formatBrazilianTimestamp } from '../tests/support/sessionLabel.js'
import { loadEnv } from '../tests/support/loadEnv.js'

const REPORTS_ROOT = path.join('tests', 'reports')
const HTML_OUTPUT_ROOT = path.join(REPORTS_ROOT, 'html-reports')

function collectAllJsonFiles() {
  return globSync('**/cucumber-report*.json', {
    cwd: REPORTS_ROOT,
    absolute: true,
  })
}

// Mais recente = maior mtime do próprio arquivo, não o nome da pasta — o
// nome (`sessionLabel`) usa um formato brasileiro (DD-MM-AAAA) que não ordena
// como string; reaproveitar o relógio do sistema de arquivos evita reimplementar
// esse parse.
function selectMostRecent(files) {
  if (files.length === 0) return []
  let newest = files[0]
  let newestMtime = statSync(newest).mtimeMs
  for (const file of files.slice(1)) {
    const mtime = statSync(file).mtimeMs
    if (mtime > newestMtime) {
      newest = file
      newestMtime = mtime
    }
  }
  return [newest]
}

function selectByFilter(files, filterText) {
  return files.filter((file) => file.includes(filterText))
}

function parseArgs(argv) {
  const args = argv.slice(2)
  if (args.includes('--all')) return { mode: 'all' }
  const [filterText] = args
  if (filterText) return { mode: 'filter', filterText }
  return { mode: 'latest' }
}

function stageJsonFiles(files) {
  const stagingDir = mkdtempSync(path.join(os.tmpdir(), 'wdio-cucumber-json-'))
  files.forEach((file, i) => {
    copyFileSync(file, path.join(stagingDir, `report-${i}.json`))
  })
  return stagingDir
}

// `{ mode: 'latest' | 'filter' | 'all', filterText }` — ver cabeçalho do
// arquivo. Retorna `{ reportPath, filesCount }` em sucesso, ou `null` se não
// havia nenhum `cucumber-report.json` (ou nenhum batendo o filtro) — nunca
// lança nesses dois casos, só loga; lança de verdade se `generate()` falhar.
// Cabeçalho do relatório: qual build (APK, SHA-256, cobertura), aparelho, Android e backend foram
// testados — lidos de `apk-usado.json` (gravado no `onPrepare`) e do `adb`, nunca digitados à mão.
function metadadosDaExecucao(sessionLabel) {
  const env = loadEnv()
  const adbProp = (prop) => {
    try {
      return execFileSync('adb', ['-s', env.device.udid, 'shell', 'getprop', prop], { encoding: 'utf-8' }).trim()
    } catch {
      return ''
    }
  }
  const arquivoApk = sessionLabel ? path.join(REPORTS_ROOT, sessionLabel, 'apk-usado.json') : null
  const apk = arquivoApk && existsSync(arquivoApk) ? JSON.parse(readFileSync(arquivoApk, 'utf-8')) : null
  const android = adbProp('ro.build.version.release')
  const dados = [
    { label: 'APK', value: apk ? apk.nome : 'não rastreado (APK_JA_INSTALADO=1)' },
    { label: 'Cobre pedidos até', value: apk?.cobreAte != null ? `T-${String(apk.cobreAte).padStart(3, '0')}` : '—' },
    { label: 'Versão do app', value: apk ? apk.versionName : '—' },
    { label: 'SHA-256 do APK', value: apk?.sha256 ?? '—' },
    { label: 'Backend', value: env.backend.baseUrl },
    { label: 'Sessão', value: sessionLabel ?? '—' },
  ]
  return {
    metadata: {
      device: `${env.device.name} (${env.device.udid})`,
      executionPlatform: 'local',
      platform: { name: 'Android', version: android || 'desconhecida' },
    },
    // Nesta versão da lib `customData` é um mapa rótulo → valor (não `{ title, data: [...] }`).
    customData: Object.fromEntries(dados.map(({ label, value }) => [label, value])),
  }
}

export async function generateHtmlReport({ mode = 'latest', filterText } = {}) {
  const allFiles = collectAllJsonFiles()
  if (allFiles.length === 0) {
    console.log('Nenhum JSON de execução encontrado em tests/reports/ — rode os testes antes.')
    return null
  }

  const files = mode === 'all'
    ? allFiles
    : mode === 'filter'
      ? selectByFilter(allFiles, filterText)
      : selectMostRecent(allFiles)

  if (files.length === 0) {
    console.log(
      `Nenhuma execução encontrada contendo "${filterText}". Sessões disponíveis:\n` +
        allFiles.map((f) => `  - ${path.relative(REPORTS_ROOT, path.dirname(f))}`).join('\n')
    )
    return null
  }

  const stagingDir = stageJsonFiles(files)
  const reportPath = path.join(HTML_OUTPUT_ROOT, formatBrazilianTimestamp())
  mkdirSync(reportPath, { recursive: true })

  try {
    await generate({
      jsonDir: stagingDir,
      reportPath,
      reportName: 'Prime Visita - Relatório de testes mobile',
      pageTitle: 'Prime Visita - Relatório de testes mobile',
      displayDuration: true,
      humanReadableDuration: true,
      displayReportTime: true,
      // A lib não expõe NENHUMA opção pública de idioma/locale (confirmado
      // em dist/types.d.ts — `durationColumnTitle` existe só no tipo
      // interno `Suite`, é recalculado a partir de `durationAggregation` e
      // sobrescreve qualquer valor passado aqui; achado ao validar que
      // passar essa chave não tinha efeito nenhum no HTML gerado). Único
      // jeito real de traduzir o "chrome" fixo (headings, legendas de
      // gráfico, botões, mensagens) é via `customScript` abaixo (pedido do
      // usuário, 2026-10-09).
      customScript: 'scripts/report-i18n-pt-br.js',
      ...metadadosDaExecucao(mode === 'filter' ? filterText : null),
    })
    const modeLabel = mode === 'all' ? 'todo o histórico' : mode === 'filter' ? `filtro "${filterText}"` : 'sessão mais recente'
    console.log(`Relatório HTML gerado em: ${reportPath} (${modeLabel}, ${files.length} arquivo(s) de execução consolidado(s))`)
    return { reportPath, filesCount: files.length }
  } finally {
    rmSync(stagingDir, { recursive: true, force: true })
  }
}

// Só roda o CLI (parseia argv/chama process.exit) quando este arquivo é o
// entrypoint — importar `generateHtmlReport` de outro módulo (`wdio.conf.js`)
// não deve disparar isso nem matar o processo em caso de erro.
const isCliEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCliEntrypoint) {
  generateHtmlReport(parseArgs(process.argv)).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
