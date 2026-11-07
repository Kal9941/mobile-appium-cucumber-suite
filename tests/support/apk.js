// Seleção e instalação do APK sob teste. Contrato com a sessão do app (decisão do
// usuário, 2026-10-14): o app deposita builds IMUTÁVEIS em `app.apkDir` com o nome
// `T-NNN[+T-MMM|T-AAA..T-ZZZ]_AAAAMMDD-HHmm.apk` (número do pedido de teste + data/hora do
// build). A suíte só instala no início da execução (`onPrepare`), nunca no meio de
// um cenário, e nunca lê o `build/outputs` do Gradle (que pode ser regravado a
// qualquer hora).
import {
  existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { loadEnv } from './loadEnv.js'

const env = loadEnv()

// Pedidos no nome: `T-NNN`, junto com `+` ou em intervalo `T-001..T-018` (decisão do usuário, 2026-10-14: com mais de um, o nome usa
// intervalo) — ex.: `T-001..T-005+T-008_20261014-1930.apk`.
const PADRAO_NOME = /^((?:T-\d{3}(?:\.\.T-\d{3})?)(?:\+T-\d{3}(?:\.\.T-\d{3})?)*)_(\d{8})-(\d{4})\.apk$/

// `T-001..T-003+T-008` -> ['T-001', 'T-002', 'T-003', 'T-008'] (intervalo invertido não expande nada).
export function expandirPedidos(texto) {
  return texto.split('+').flatMap((parte) => {
    const [de, ate] = parte.split('..')
    if (!ate) return [de]
    const ini = Number(de.slice(2))
    const fim = Number(ate.slice(2))
    return Array.from({ length: Math.max(0, fim - ini + 1) }, (_, i) => `T-${String(ini + i).padStart(3, '0')}`)
  })
}

export function listarApks(dir = env.app.apkDir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .map((nome) => ({ nome, m: PADRAO_NOME.exec(nome) }))
    .filter(({ m }) => m)
    .map(({ nome, m }) => ({
      nome,
      pedidos: expandirPedidos(m[1]),
      // Cobertura cumulativa (regra do usuário, 2026-10-14): o APK `T-29` cobre TODO pedido de
      // número <= 29, esteja ou não escrito no nome.
      cobreAte: Math.max(...expandirPedidos(m[1]).map((p) => Number(p.slice(2)))),
      // AAAAMMDD-HHmm ordena como texto (mais novo = maior).
      carimbo: `${m[2]}${m[3]}`,
      caminho: path.join(dir, nome),
    }))
    .sort((a, b) => a.carimbo.localeCompare(b.carimbo))
}

// Padrão: o build MAIS NOVO da pasta (cumulativo: contém todos os pedidos anteriores —
// AGENTS §0 `[R-APK]`). `pedido` (variável APK=T-017) só para investigar regressão: o
// build mais novo que COBRE esse pedido (número do pedido <= maior T do nome do APK).
export function selecionarApk(pedido = process.env.APK) {
  const todos = listarApks()
  if (todos.length === 0) throw new Error(`failed to start: nenhum APK no padrão T-NNN_AAAAMMDD-HHmm.apk em ${env.app.apkDir}`)
  const candidatos = pedido ? todos.filter((a) => a.cobreAte >= Number(pedido.slice(2))) : todos
  if (candidatos.length === 0) throw new Error(`failed to start: nenhum APK cobre o pedido ${pedido} em ${env.app.apkDir}`)
  return candidatos[candidatos.length - 1]
}

// Confere o SHA-256 do arquivo contra a linha do `MANIFESTO.md` (gravada pelo
// `publica-apk.sh` do app): garante que o build testado é o que o app declarou.
export function verificarManifesto(apk, dir = env.app.apkDir) {
  const manifesto = path.join(dir, 'MANIFESTO.md')
  if (!existsSync(manifesto)) throw new Error(`failed to start: ${manifesto} ausente — build sem rastro`)
  const linha = readFileSync(manifesto, 'utf-8').split(/\r?\n/).find((l) => l.includes(apk.nome))
  const esperado = linha && /`([0-9a-f]{64})`/.exec(linha)?.[1]
  if (!esperado) throw new Error(`failed to start: ${apk.nome} sem SHA-256 em MANIFESTO.md — build sem rastro`)
  const real = createHash('sha256').update(readFileSync(apk.caminho)).digest('hex')
  if (real !== esperado) throw new Error(`failed to start: SHA-256 de ${apk.nome} difere do MANIFESTO.md (arquivo alterado?)`)
  return real
}

// `adb install -r -d` no dispositivo da suíte (`device.udid`) — nunca em outro.
export function instalarApk(apk) {
  execFileSync('adb', ['-s', env.device.udid, 'install', '-r', '-d', apk.caminho], { stdio: 'pipe' })
  const saida = execFileSync('adb', ['-s', env.device.udid, 'shell', 'dumpsys', 'package', env.app.appPackage], { encoding: 'utf-8' })
  return /versionName=(\S+)/.exec(saida)?.[1] ?? 'desconhecida'
}

// Depois de instalar um APK novo: `pm clear` e CONFERÊNCIA de que cache e dados de armazenamento do app
// ficaram vazios (`files/`, `databases/`, `shared_prefs/`, `cache/`, `code_cache/`) — regra do usuário,
// 2026-10-14: nunca testar com resíduo de build anterior. Devolve o que foi conferido; se sobrar dado,
// aborta a execução.
export function zerarEVerificarDados() {
  const adb = (...a) => execFileSync('adb', ['-s', env.device.udid, ...a], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
  adb('shell', 'pm', 'clear', env.app.appPackage)
  // `run-as` só funciona em build debug (o da suíte). Diretório inexistente = vazio.
  const conteudo = (dir) => {
    try { return adb('shell', 'run-as', env.app.appPackage, 'ls', '-A', dir).trim() } catch { return '' }
  }
  const pastas = ['files', 'databases', 'shared_prefs', 'cache', 'code_cache']
  const residuos = pastas.map((p) => [p, conteudo(p)]).filter(([, c]) => c)
  if (residuos.length > 0) {
    throw new Error(`failed to start: dados do app não zerados após instalar o APK — ${residuos.map(([p, c]) => `${p}: ${c.replace(/s+/g, ',')}`).join(' | ')}`)
  }
  return { dadosZerados: true, pastasConferidas: pastas }
}

// Deixa registrado, na pasta da execução, qual build foi testado.
export function registrarApkUsado(sessionLabel, apk, versionName) {
  const dir = path.join('tests', 'reports', sessionLabel)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'apk-usado.json'), JSON.stringify({ ...apk, versionName }, null, 2), 'utf-8')
}
