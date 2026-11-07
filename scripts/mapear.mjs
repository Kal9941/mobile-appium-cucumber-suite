// Mapeia VÁRIAS telas numa sessão só: para cada roteiro, reinicia o app (mantém o login), executa os
// toques e grava `tests/reports/mapa/<nome>.json` ({ id: texto }) + `<nome>.png`. É o levantamento de
// ids/textos reais que alimenta os cenários (`[R-SEL]`, `[R-EVID]`) — nunca é teste, nunca grava dado.
//
//   node scripts/mapear.mjs                 → todos os roteiros
//   node scripts/mapear.mjs ajuda,sobre     → só estes (por nome)
//
// Passos: `tag` toca; `~regex` toca o 1º id que casa (sem barra invertida: use [0-9]); `@N` espera N ms.
// Roteiros só LEEM e voltam: nenhum confirma ação que grave (Salvar/Concluir/Cancelar/Registrar).
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { remote } from 'webdriverio'
import { loadEnv } from '../tests/support/loadEnv.js'
import { selecionarApk, verificarManifesto, instalarApk, zerarEVerificarDados } from '../tests/support/apk.js'
import { resetarEstadoDoApp, abrirApp, dispensarDialogosDePrimeiraAbertura, reiniciarSemLimpar } from '../tests/support/appLifecycle.js'

const env = loadEnv()
const PORTA = 4726
const NAV = (destino) => `visitas_bottomnav_${destino}`
const MENU = (opcao) => ['visitas_menu_hamburguer', `menulateral_opcao_${opcao}`]
const ITEM = (prefixo) => `~^${prefixo}_item_[0-9]+$`

const ROTEIROS = {
  'nova-visita': ['visitas_fab_nova_visita', '@800'],
  'agendar-form': ['visitas_fab_nova_visita', 'novavisita_opcao_agendar', '@1500'],
  'iniciar-form': ['visitas_fab_nova_visita', 'novavisita_opcao_iniciar', '@1500'],
  'detalhe-visita': ['visitas_aba_agendada', '@1500', ITEM('visitas'), '@2500'],
  'cancelar-dialogo': ['visitas_aba_agendada', '@1500', ITEM('visitas'), '@2500', 'visitadetalhe_botao_cancelar', '@1200'],
  'prescritores-lista': [NAV('prescritores'), '@2500'],
  'prescritor-detalhe': [NAV('prescritores'), '@2500', ITEM('prescritores'), '@3000'],
  'prescritor-form': [NAV('prescritores'), '@2500', 'prescritores_fab_novo', '@2000'],
  'secretarias-lista': [...MENU('secretarias'), '@2500'],
  'secretaria-form': [...MENU('secretarias'), '@2500', 'secretarias_fab_nova', '@2000'],
  'secretaria-editar': [...MENU('secretarias'), '@2500', ITEM('secretarias'), '@3000'],
  'locais-lista': [...MENU('locaisatendimento'), '@2500'],
  'local-form': [...MENU('locaisatendimento'), '@2500', 'locaisatendimento_fab_novo', '@2000'],
  'local-editar': [...MENU('locaisatendimento'), '@2500', ITEM('locaisatendimento'), '@3000'],
  aniversarios: [...MENU('aniversarios'), '@3000'],
  configuracoes: [...MENU('configuracoes'), '@2000'],
  'config-notificacoes': [...MENU('configuracoes'), '@1500', 'configuracoes_notificacoes_cabecalho', '@1500'],
  sobre: [...MENU('sobre'), '@3000'],
  ajuda: [...MENU('ajuda'), '@2000'],
  pendencias: ['visitas_icone_sync', '@2500'],
  'chat-conversa': [NAV('chat'), '@3000', ITEM('chat'), '@3000'],
  ponto: [NAV('registroponto'), '@3500'],
  'relatorios-semana': [NAV('relatorios'), '@3500'],
  // ---- lote 2: abas dos formulários, seletores e detalhes --------------------------------------
  'prescritor-form-contato': [NAV('prescritores'), '@2500', 'prescritores_fab_novo', '@1500', 'prescritorform_aba_contato', '@1000'],
  'prescritor-form-endereco': [NAV('prescritores'), '@2500', 'prescritores_fab_novo', '@1500', 'prescritorform_aba_endereco', '@1000'],
  'prescritor-form-conselho': [NAV('prescritores'), '@2500', 'prescritores_fab_novo', '@1500', 'prescritorform_campo_conselho', '@1500'],
  'prescritor-filtro-grupo': [NAV('prescritores'), '@2500', 'prescritores_campo_filtro_grupo', '@1500'],
  'prescritor-filtro-especialidade': [NAV('prescritores'), '@2500', 'prescritores_campo_filtro_especialidade', '@1500'],
  'prescritor-detalhe-locais': [NAV('prescritores'), '@2500', ITEM('prescritores'), '@2500', 'prescritordetalhe_aba_locais', '@1500'],
  'prescritor-detalhe-secretarias': [NAV('prescritores'), '@2500', ITEM('prescritores'), '@2500', 'prescritordetalhe_aba_secretarias', '@1500'],
  'prescritor-detalhe-grafico': [NAV('prescritores'), '@2500', ITEM('prescritores'), '@2500', 'prescritordetalhe_aba_grafico', '@2500'],
  'secretaria-form-contato': [...MENU('secretarias'), '@2500', 'secretarias_fab_nova', '@1500', 'secretariaform_aba_contato', '@1000'],
  'secretaria-form-endereco': [...MENU('secretarias'), '@2500', 'secretarias_fab_nova', '@1500', 'secretariaform_aba_endereco', '@1000'],
  'secretaria-form-vinculos': [...MENU('secretarias'), '@2500', ITEM('secretarias'), '@2500', 'secretariaform_aba_vinculos', '@2000'],
  'local-form-contato': [...MENU('locaisatendimento'), '@2500', 'locaisatendimento_fab_novo', '@1500', 'localform_aba_contato', '@1000'],
  'local-form-endereco': [...MENU('locaisatendimento'), '@2500', 'locaisatendimento_fab_novo', '@1500', 'localform_aba_endereco', '@1000'],
  'visita-seletor-prescritor': ['visitas_fab_nova_visita', 'novavisita_opcao_agendar', '@1500', 'visitaform_campo_prescritor', '@2000'],
  'visita-seletor-local': ['visitas_fab_nova_visita', 'novavisita_opcao_agendar', '@1500', 'visitaform_campo_local', '@2000'],
  'chat-lista': [NAV('chat'), '@3500'],
  'relatorios-detalhe-prescritor': [NAV('relatorios'), '@2000', 'relatorios_aba_prescritor', '@2500', ITEM('relatorios'), '@2500'],
  'relatorios-seletor-ano': [NAV('relatorios'), '@2000', 'relatorios_aba_prescritor', '@2000', 'relatorios_periodo_ano', '@1500', 'relatorios_texto_ano', '@1500'],
  'relatorios-ordenar': [NAV('relatorios'), '@2000', 'relatorios_aba_especialidade', '@2500', 'relatorios_botao_ordenar', '@1500'],
  // SEMPRE por último: sair derruba a sessão e os roteiros seguintes cairiam no login.
  sair: [...MENU('sair'), '@1000'],
}

const porTag = (d, tag) => d.$(`android=new UiSelector().resourceId("${tag}")`)
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

async function tocar(driver, passo) {
  if (passo.startsWith('@')) return pausa(Number(passo.slice(1)))
  if (passo.startsWith('~')) {
    const todos = await driver.$$(`android=new UiSelector().resourceIdMatches("${passo.slice(1)}")`)
    if (todos.length === 0) throw new Error(`nenhum id casa com ${passo}`)
    await todos[0].click()
  } else {
    const el = await porTag(driver, passo)
    await el.waitForDisplayed({ timeout: 15000 })
    await el.click()
  }
  return pausa(600)
}

// `[R-APK]`: mapeia SEMPRE no APK mais novo, rastreável (SHA-256 do manifesto) e com dados zerados.
{
  const apk = selecionarApk()
  verificarManifesto(apk)
  const versao = instalarApk(apk)
  zerarEVerificarDados()
  console.log(`APK mapeado: ${apk.nome} (versionName ${versao}, dados zerados)`)
}

const escolhidos = process.argv[2] ? process.argv[2].split(',') : Object.keys(ROTEIROS)
mkdirSync(path.join('tests', 'reports', 'mapa'), { recursive: true })

const appium = spawn('npx', ['appium', '--address', '127.0.0.1', '--port', String(PORTA), '--allow-insecure', 'uiautomator2:adb_shell'], { stdio: 'ignore', shell: true })
let driver
try {
  for (let i = 0; i < 40; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${PORTA}/status`)).ok) break } catch { /* subindo */ }
    await pausa(500)
  }
  driver = await remote({
    hostname: '127.0.0.1', port: PORTA, logLevel: 'error',
    capabilities: {
      platformName: 'Android', 'appium:automationName': 'UiAutomator2', 'appium:udid': env.device.udid,
      'appium:appPackage': env.app.appPackage, 'appium:appActivity': env.app.appActivity,
      'appium:noReset': true, 'appium:autoGrantPermissions': true, 'appium:newCommandTimeout': 300,
    },
  })
  // Login 1x (reset completo); os roteiros reiniciam o processo sem limpar.
  await resetarEstadoDoApp(driver)
  await abrirApp(driver)
  await dispensarDialogosDePrimeiraAbertura(driver)
  for (const [tag, valor] of [['login_campo_cnpj', env.credentials.cnpj], ['login_campo_usuario', env.credentials.usuario], ['login_campo_senha', env.credentials.senha]]) {
    const el = await porTag(driver, tag)
    await el.waitForDisplayed({ timeout: 20000 })
    await el.click()
    await el.setValue(valor)
  }
  if (await driver.isKeyboardShown()) await driver.hideKeyboard().catch(() => {})
  await (await porTag(driver, 'login_botao_acessar')).click()
  await (await porTag(driver, 'visitas_texto_titulo')).waitForDisplayed({ timeout: 40000 })
  await pausa(4000)

  for (const nome of escolhidos) {
    const passos = ROTEIROS[nome]
    if (!passos) { console.log(`?? roteiro desconhecido: ${nome}`); continue }
    try {
      await reiniciarSemLimpar(driver)
      await (await porTag(driver, 'visitas_texto_titulo')).waitForDisplayed({ timeout: 30000 })
      for (const p of passos) await tocar(driver, p)
      const xml = await driver.getPageSource()
      const mapa = {}
      for (const m of xml.matchAll(/<[^>]*?text="([^"]*)"[^>]*?resource-id="([^"]+)"[^>]*>|<[^>]*?resource-id="([^"]+)"[^>]*?text="([^"]*)"[^>]*>/g)) {
        const id = m[2] ?? m[3]
        if (id && !id.startsWith('android:')) mapa[id] = m[1] ?? m[4] ?? ''
      }
      writeFileSync(path.join('tests', 'reports', 'mapa', `${nome}.json`), JSON.stringify(mapa, null, 2))
      writeFileSync(path.join('tests', 'reports', 'mapa', `${nome}.png`), await driver.takeScreenshot(), 'base64')
      console.log(`OK  ${nome.padEnd(20)} ${Object.keys(mapa).length} ids`)
    } catch (erro) {
      console.log(`ERR ${nome.padEnd(20)} ${String(erro.message).slice(0, 110)}`)
    }
  }
} finally {
  if (driver) await driver.deleteSession().catch(() => {})
  appium.kill()
  spawn('taskkill', ['/pid', String(appium.pid), '/T', '/F'], { stdio: 'ignore', shell: true })
}
