// Base comum às configs por plataforma (wdio.android.conf.js, e no futuro
// wdio.ios.conf.js): reporters, hooks de ciclo de vida e cucumberOpts.
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSessionLabel } from './tests/support/sessionLabel.js'
import { captureFailureArtifacts, logClassifiedFailure } from './tests/support/failureArtifacts.js'
import {
  resetarEstadoDoApp, abrirApp, dispensarDialogosDePrimeiraAbertura, reiniciarSemLimpar,
} from './tests/support/appLifecycle.js'
import { BackendService } from './tests/services/BackendService.js'
import {
  garantirAdbRoot, desligarTutorialDeCaneta, restaurarRelogio, restaurarRede, definirVelocidadeDaRede, restaurarEscalaDaFonte,
} from './tests/support/dispositivo.js'
import {
  selecionarApk, verificarManifesto, instalarApk, zerarEVerificarDados, registrarApkUsado,
} from './tests/support/apk.js'
import {
  iniciarCenarioVisual, capturar, iniciarGravacao, pararGravacaoEExtrair,
} from './tests/support/visual.js'
import { generateHtmlReport } from './scripts/generateHtmlReport.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const sessionLabel = getSessionLabel()

// O worker do @wdio/local-runner é um processo separado que reexecuta esta
// config do zero; sem fixar o rótulo aqui ele geraria OUTRO timestamp e a
// execução acabaria espalhada em duas pastas de relatório.
process.env.SESSION_LABEL = sessionLabel

mkdirSync(path.join(__dirname, 'tests', 'reports', sessionLabel), { recursive: true })

// Tags `@visual`/`@gravar` (ou variáveis VISUAL=1/GRAVAR=1 para uma rodada avulsa).
// `beforeScenario`/`afterScenario` recebem o `world` (com `.pickle`); `afterStep` recebe o próprio pickle.
const temTag = (world, tag) => (world.pickle ?? world).tags.some((t) => t.name === tag)
// `@leitura`: cenário que só lê — reinício leve (mantém a sessão); o reset completo volta se o
// cenário anterior falhou ou ainda não houve login nesta execução (`sessaoViva`).
let sessaoViva = false
const querVisual = (world) => temTag(world, '@visual') || process.env.VISUAL === '1'
const querGravar = (world) => temTag(world, '@gravar') || process.env.GRAVAR === '1'

// Cenário `@offline` sempre devolve a rede, passando ou falhando. Se falhou antes do passo que apaga os dados, a fila de
// envio ainda está no app e subiria ao tenant ao religar (achado 2026-10-24: uma visita "Teste Appium" vazou assim):
// por isso, depois dos artefatos de falha, apaga os dados ANTES de religar.
async function religarRedeDoCenarioOffline(world, falhou) {
  if (!world.pickle.tags.some((t) => t.name === '@offline')) return
  if (falhou) await resetarEstadoDoApp(driver).catch(() => {})
  await restaurarRede(driver).catch(() => {})
}

export const sharedConfig = {
  runner: 'local',
  // Todas as features num ÚNICO worker (grupo): uma sessão Appium só, em sequência — o reinício leve
  // (`@leitura`) vale entre features e o relatório sai completo. `--spec` na CLI substitui o grupo.
  specs: [['./tests/features/**/*.feature']],

  // Serial por enquanto. Com emuladores independentes (um udid/porta por
  // worker) dá para subir — ver Docs/APPIUM_MOBILE_FRAMEWORK_REFERENCE.md §4.7.
  maxInstances: 1,

  // `adb_shell` liberado só para o driver uiautomator2 e só neste servidor local
  // (decisão do usuário, 2026-10-14): habilita `mobile: shell` para os cenários que
  // precisam mexer no dispositivo (relógio, alarmes, dumpsys). Nunca expor esse
  // servidor Appium fora de 127.0.0.1.
  services: [['appium', {
    args: { address: '127.0.0.1', port: 4723, allowInsecure: 'uiautomator2:adb_shell' },
  }]],

  logLevel: 'info',
  framework: 'cucumber',
  reporters: [
    'spec',
    ['json', { outputDir: path.join('tests', 'reports', sessionLabel) }],
    // allure-results é compartilhado entre execuções (sem política de
    // exclusão): cada rodada só acrescenta, é isso que dá histórico/tendência.
    ['allure', {
      outputDir: path.join('tests', 'reports', 'allure-results'),
      useCucumberStepReporter: false,
      disableWebdriverStepsReporting: false,
      disableWebdriverScreenshotsReporting: false,
    }],
  ],
  cucumberOpts: {
    require: ['./tests/steps-definitions/**/*.steps.js'],
    timeout: 90000,
    ignoreUndefinedDefinitions: false,
    // `@skip` = isolamento com dono e condição de remoção (AGENTS §5): nunca roda até a condição cair.
    tags: 'not @skip',
    // cucumber-json nativo — é o que scripts/generateHtmlReport.mjs consome.
    // Nome único por worker: dois workers na mesma sessão não se sobrescrevem.
    format: [`json:${path.join('tests', 'reports', sessionLabel, `cucumber-report-${process.pid}.json`)}`],
  },

  // [R-APIREAL]: falha cedo, com categoria própria, se o backend não estiver no ar.
  onPrepare: async function () {
    await BackendService.garantirNoAr()
    // adbd em root: `mobile: shell` precisa dele para relógio/alarmes (AVD dedicado, dispositivo.js).
    garantirAdbRoot()
    // O Gboard mostra o tutorial de caneta por cima do app na 1ª abertura do teclado (achado 4.7).
    desligarTutorialDeCaneta()
    // Massa "Teste Appium" órfã de uma execução interrompida é cancelada ANTES de começar.
    const orfas = await BackendService.cancelarMassaDeTesteOrfa().catch((e) => { console.error(`limpeza de massa órfã falhou: ${e.message}`); return [] })
    if (orfas.length > 0) console.log(`massa órfã cancelada: visitas ${orfas.join(', ')}`)
    // Instala o APK escolhido (o mais novo da pasta de builds, ou o do pedido `--env APK=T-NNN`)
    // UMA vez por execução — nunca no meio de um cenário (contrato em tests/support/apk.js).
    // `APK_JA_INSTALADO=1` (só depuração da própria suíte) pula a instalação; resultado assim NÃO
    // pode ser registrado em `T-NNN` (não há APK rastreável — `[R-APK]`).
    if (process.env.APK_JA_INSTALADO === '1') {
      console.warn('APK_JA_INSTALADO=1: sem APK rastreável — não registrar resultado em T-NNN')
      return
    }
    const apk = selecionarApk()
    apk.sha256 = verificarManifesto(apk)
    const versionName = instalarApk(apk)
    // Cache e dados do app zerados e CONFERIDOS a cada instalação (regra do usuário).
    const zerado = zerarEVerificarDados()
    registrarApkUsado(sessionLabel, { ...apk, ...zerado }, versionName)
    console.log(`APK sob teste: ${apk.nome} (versionName ${versionName})`)
  },

  // Isolamento de estado: app limpo (volta ao Login) a cada cenário.
  beforeScenario: async function (world) {
    iniciarCenarioVisual(sessionLabel, world.pickle.name)
    if (querGravar(world)) iniciarGravacao()
    if (temTag(world, '@leitura') && sessaoViva) {
      await reiniciarSemLimpar(driver)
      return
    }
    sessaoViva = false
    await resetarEstadoDoApp(driver)
    await abrirApp(driver)
    await dispensarDialogosDePrimeiraAbertura(driver)
  },

  // `@visual` (ou VISUAL=1): 1 quadro ao fim de CADA passo, em tests/reports/<sessão>/visual/ — para eu
  // LER (`Read`), nunca como asserção ([R-ID]; helpers e limites em tests/support/visual.js).
  afterStep: async function (step, world) {
    if (!querVisual(world)) return
    await capturar(driver, step.text ?? 'passo').catch(() => {})
  },

  afterScenario: async function (world, result) {
    if (querGravar(world)) {
      const quadros = pararGravacaoEExtrair()
      if (quadros) console.log(`Quadros da gravação: ${quadros}`)
    }
    // Massa "Teste Appium" criada pelo cenário é cancelada SEMPRE (passando ou falhando).
    await BackendService.limparMassaDeTeste().catch((e) => console.error(`limpeza da massa de teste falhou: ${e.message}`))
    // Cenário que mexeu no relógio (`@relogio`) sempre devolve a hora certa, passando ou falhando.
    if (world.pickle.tags.some((t) => t.name === '@relogio')) await restaurarRelogio(driver)
    // Cenário `@fonte` sempre devolve a fonte do sistema ao padrão (1,0), passando ou falhando.
    if (world.pickle.tags.some((t) => t.name === '@fonte')) await restaurarEscalaDaFonte(driver).catch(() => {})
    // Cenário `@redeLenta` sempre devolve a velocidade normal, passando ou falhando.
    if (world.pickle.tags.some((t) => t.name === '@redeLenta')) definirVelocidadeDaRede('full')
    // Sessão só é reaproveitada depois de um cenário VERDE que terminou logado (leitura); falha ou
    // cenário de escrita/login força o reset completo no próximo.
    sessaoViva = !result.error && temTag(world, '@leitura')
    if (!result.error) {
      await religarRedeDoCenarioOffline(world, false)
      return
    }
    logClassifiedFailure(result.error)
    await captureFailureArtifacts({
      driver,
      sessionLabel,
      testTitle: world.pickle.name,
      error: result.error,
    })
    await religarRedeDoCenarioOffline(world, true)
  },

  // Gera o HTML ao fim da suíte, filtrado pela sessão exata que acabou de
  // rodar. Erro de relatório nunca derruba o exit code dos testes.
  onComplete: async function () {
    try {
      await generateHtmlReport({ mode: 'filter', filterText: sessionLabel })
    } catch (error) {
      console.error('Falha ao gerar o relatório HTML automaticamente:', error)
    }
  },
}
