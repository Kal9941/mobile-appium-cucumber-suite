// Explorador de telas: abre uma sessão Appium própria (porta 4725, não conflita com a suíte),
// zera o app, faz login e executa uma sequência de toques por id; ao fim grava o dump
// (`getPageSource`) e a imagem e imprime os `resource-id` achados. Serve para descobrir/validar
// seletores e olhar a tela (`[R-SEL]`, `[R-EVID]`) ANTES de escrever cenário — nunca é teste.
//
//   node scripts/explorar.mjs "visitas_bottomnav_relatorios"
//   node scripts/explorar.mjs "visitas_menu_hamburguer,menulateral_opcao_ajuda" --nome ajuda
//   node scripts/explorar.mjs "visitas_item_1234" --sem-login   (app já logado, sem reset)
//
// Toques separados por vírgula; `nome:texto` digita `texto` no campo `nome`; `@N` espera N ms.
// Só usa o dispositivo da suíte (`device.udid` de env.json — AGENTS §7).
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { remote } from 'webdriverio'
import { loadEnv } from '../tests/support/loadEnv.js'
import { formatBrazilianTimestamp } from '../tests/support/sessionLabel.js'
import { resetarEstadoDoApp, abrirApp, dispensarDialogosDePrimeiraAbertura } from '../tests/support/appLifecycle.js'

const env = loadEnv()
const args = process.argv.slice(2)
const sequencia = (args.find((a) => !a.startsWith('--')) ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const nome = args.includes('--nome') ? args[args.indexOf('--nome') + 1] : 'explorar'
const semLogin = args.includes('--sem-login')
const PORTA = 4725

const porTag = (driver, tag) => driver.$(`android=new UiSelector().resourceId("${tag}")`)
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

const appium = spawn('npx', ['appium', '--address', '127.0.0.1', '--port', String(PORTA), '--allow-insecure', 'uiautomator2:adb_shell'], { stdio: 'ignore', shell: true })
let driver
try {
  // Espera o servidor responder.
  for (let i = 0; i < 40; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${PORTA}/status`)).ok) break } catch { /* ainda subindo */ }
    await pausa(500)
  }
  driver = await remote({
    hostname: '127.0.0.1',
    port: PORTA,
    logLevel: 'error',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:udid': env.device.udid,
      'appium:appPackage': env.app.appPackage,
      'appium:appActivity': env.app.appActivity,
      'appium:noReset': true,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 180,
    },
  })

  if (!semLogin) {
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
    await (await porTag(driver, 'visitas_texto_titulo')).waitForDisplayed({ timeout: 30000 })
  }

  for (const passo of sequencia) {
    if (passo.startsWith('@')) { await pausa(Number(passo.slice(1))); continue }
    const [tag, texto] = passo.split(':')
    const el = await porTag(driver, tag)
    await el.waitForDisplayed({ timeout: 15000 })
    await el.click()
    if (texto !== undefined) await el.setValue(texto)
    await pausa(700)
  }
  await pausa(1500)

  const pasta = path.join('tests', 'reports', 'explorar', `${formatBrazilianTimestamp()}_${nome}`)
  mkdirSync(pasta, { recursive: true })
  const xml = await driver.getPageSource()
  writeFileSync(path.join(pasta, 'dump.xml'), xml)
  writeFileSync(path.join(pasta, 'tela.png'), await driver.takeScreenshot(), 'base64')
  const ids = [...new Set([...xml.matchAll(/resource-id="([^"]+)"/g)].map((m) => m[1]))].filter((i) => !i.startsWith('android:'))
  console.log(`${path.join(pasta, 'tela.png')}\n${path.join(pasta, 'dump.xml')}\n--- ${ids.length} ids ---\n${ids.join('\n')}`)
} finally {
  if (driver) await driver.deleteSession().catch(() => {})
  appium.kill()
  spawn('taskkill', ['/pid', String(appium.pid), '/T', '/F'], { stdio: 'ignore', shell: true })
}
