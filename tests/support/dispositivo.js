// Ações no dispositivo via `mobile: shell` (flag `adb_shell` liberada no servidor
// Appium, wdio.shared.conf.js — decisão do usuário, 2026-10-14). Só funcionam no
// AVD dedicado da suíte (`Pixel_6_API_34`, imagem `google_apis` SEM Play
// Store, adbd em root): mexer em relógio/alarmes/fonte no celular do usuário ou
// no emulador de outras sessões é proibido (AGENTS §7).
import { execFileSync } from 'node:child_process'
import { loadEnv } from './loadEnv.js'

const env = loadEnv()

const pad = (n, tam = 2) => String(n).padStart(tam, '0')

// Aparelho real (celular por adb wifi, ex.: `192.168.1.190:5555`) × AVD dedicado (`emulator-NNNN`). No aparelho
// real não há adbd root, nem `adb emu`, e desligar o wifi derrubaria a própria conexão do adb: o que depende
// disso troca de técnica (`desligarRede`, `definirRelogio`) ou fica só no AVD (`@redeLenta`).
export const ehAparelhoReal = () => !String(env.device.udid).startsWith('emulator-')

// Reinicia o adbd em modo root (idempotente). Chamado no `onPrepare`, fora do Appium. Só no AVD.
export function garantirAdbRoot() {
  if (ehAparelhoReal()) return
  const adb = ['-s', env.device.udid]
  execFileSync('adb', [...adb, 'root'], { stdio: 'ignore' })
  execFileSync('adb', [...adb, 'wait-for-device'], { stdio: 'ignore' })
}

// Desliga a escrita à mão com caneta do Android: ao abrir o teclado pela 1ª vez o Gboard mostra o
// tutorial "Try out your stylus" por cima do app (achado 2026-10-15, cenário 4.7: o dump veio com 758
// bytes e o campo de mensagem sumiu da árvore). Idempotente; só no AVD dedicado, fora do Appium.
export function desligarTutorialDeCaneta() {
  execFileSync('adb', ['-s', env.device.udid, 'shell', 'settings', 'put', 'secure', 'stylus_handwriting_enabled', '0'], { stdio: 'ignore' })
}

export async function shell(driver, command, args = []) {
  return driver.execute('mobile: shell', { command, args })
}

// Muda o relógio do aparelho para `data` (Date em UTC absoluto) e desliga a hora
// automática; `restaurarRelogio` desfaz. Formato do `date` do Android: MMDDhhmmYYYY.ss (UTC).
export async function definirRelogio(driver, data) {
  await shell(driver, 'settings', ['put', 'global', 'auto_time', '0'])
  await shell(driver, 'settings', ['put', 'global', 'auto_time_zone', '0'])
  const u = data
  const valor = `${pad(u.getUTCMonth() + 1)}${pad(u.getUTCDate())}${pad(u.getUTCHours())}${pad(u.getUTCMinutes())}${u.getUTCFullYear()}.${pad(u.getUTCSeconds())}`
  // Aparelho real não tem `date` com root: o `cmd alarm set-time` (ms desde a época) faz o mesmo pelo shell.
  if (ehAparelhoReal()) await shell(driver, 'cmd', ['alarm', 'set-time', String(u.getTime())])
  else await shell(driver, 'date', ['-u', valor])
}

// Volta o relógio para o do computador e religa a hora automática.
export async function restaurarRelogio(driver) {
  await definirRelogio(driver, new Date())
  await shell(driver, 'settings', ['put', 'global', 'auto_time', '1'])
  await shell(driver, 'settings', ['put', 'global', 'auto_time_zone', '1'])
}

// Velocidade da rede do EMULADOR (console `adb emu network speed`): gsm | gprs | edge | umts | hsdpa | full.
// Alarga a janela de downloads grandes (cópia local de ~30 mil prescritores, ~5 MB) — T-030.
// `@redeLenta`: o `afterScenario` volta a `full` SEMPRE.
export function definirVelocidadeDaRede(velocidade) {
  if (ehAparelhoReal()) return
  execFileSync('adb', ['-s', env.device.udid, 'emu', 'network', 'speed', velocidade], { stdio: 'ignore' })
}

// Rede do aparelho: `mobile: setConnectivity` (wifi + dados) — cenários `@offline`. O `afterScenario`
// religa SEMPRE (`restaurarRede`). Depois de religar o emulador demora a marcar a rede como
// VALIDATED: a prova de que voltou é a resposta HTTP/a fila, não o ícone (AGENTS §10).
// No aparelho real o wifi é o próprio canal do adb: em vez de desligá-lo, o firewall do sistema nega a rede SÓ ao
// app (`cmd connectivity` chain3) — o app enxerga falha de rede e o adb/Appium seguem de pé. O `afterScenario`
// religa SEMPRE e deixa a chain desligada como estava.
export async function desligarRede(driver) {
  if (ehAparelhoReal()) {
    await shell(driver, 'cmd', ['connectivity', 'set-chain3-enabled', 'true'])
    await shell(driver, 'cmd', ['connectivity', 'set-package-networking-enabled', 'false', env.app.appPackage])
    return
  }
  await driver.execute('mobile: setConnectivity', { wifi: false, data: false })
}

export async function restaurarRede(driver) {
  if (ehAparelhoReal()) {
    await shell(driver, 'cmd', ['connectivity', 'set-package-networking-enabled', 'true', env.app.appPackage])
    await shell(driver, 'cmd', ['connectivity', 'set-chain3-enabled', 'false'])
    return
  }
  await driver.execute('mobile: setConnectivity', { wifi: true, data: true })
}

// versionName do app instalado no aparelho (`dumpsys package`).
export async function versaoInstalada(driver) {
  const saida = String(await driver.execute('mobile: shell', { command: 'dumpsys', args: ['package', env.app.appPackage] }))
  return /versionName=(\S+)/.exec(saida)?.[1] ?? null
}

// O app está na lista de apps sem restrição de bateria (`deviceidle whitelist`)?
export async function semRestricaoDeBateria(driver) {
  const saida = String(await driver.execute('mobile: shell', { command: 'dumpsys', args: ['deviceidle', 'whitelist'] }))
  return saida.includes(env.app.appPackage)
}

// Conteúdo de um arquivo privado do app (`run-as`, só build debug) — ex.: `files/logs/erros.log`; vazio se não existe.
export async function arquivoDoApp(driver, caminho) {
  try {
    return String(await driver.execute('mobile: shell', { command: 'run-as', args: [env.app.appPackage, 'cat', caminho] })).trim()
  } catch {
    return ''
  }
}

export async function dumpsys(driver, servico) {
  return shell(driver, 'dumpsys', [servico])
}

// Chamadas HTTP do app no logcat (`adb logcat -s VisitaMedica`: uma linha `HTTP GET <caminho> -> <status>` por
// chamada, sem query string — pedido `T-037`). `limparLogcat` zera o buffer; `contarChamadasHttp` conta as do caminho.
export async function limparLogcat(driver) {
  await shell(driver, 'logcat', ['-c'])
}

export async function contarChamadasHttp(driver, metodo, caminho) {
  const saida = await shell(driver, 'logcat', ['-d', '-s', 'VisitaMedica'])
  const padrao = new RegExp(`HTTP ${metodo} ${caminho.replace(/[/.]/g, '\$&')} ->`)
  return String(saida).split('\n').filter((linha) => padrao.test(linha)).length
}

// Topo do teclado na tela pelo `dumpsys window` (`InsetsSource type=ime frame=[l,topo][r,b] ... visible=true`).
// O nó do Gboard nem sempre entra na árvore do app (visto no Chat, cenário 4.7), então o `BasePage.topoDoTeclado`
// por nós pode devolver `Infinity` com o teclado na tela; este lê o inset do próprio sistema. `Infinity` = fechado.
export async function topoDoTecladoPorInsets(driver) {
  const saida = String(await shell(driver, 'dumpsys', ['window']))
  let topo = Infinity
  for (const m of saida.matchAll(/type=ime frame=\[\d+,(\d+)\]\[\d+,\d+\] visibleFrame=\[\d+,\d+\]\[\d+,\d+\] visible=true/g)) {
    topo = Math.min(topo, Number(m[1]))
  }
  return topo
}

// As linhas (com hora) das chamadas `HTTP <método> <caminho> ->` no logcat do app — evidência para o achado.
export async function linhasChamadasHttp(driver, metodo, caminho) {
  const saida = await shell(driver, 'logcat', ['-d', '-v', 'time', '-s', 'VisitaMedica'])
  const padrao = new RegExp(`HTTP ${metodo} ${caminho.replace(/[/.]/g, '\$&')} ->`)
  return String(saida).split('\n').map((l) => l.trim()).filter((linha) => padrao.test(linha))
}

// Fluidez do app (T-042 e / T-043 a): `dumpsys gfxinfo <pacote>` acumula os quadros desenhados desde o último
// `reset`; `Janky frames: N (P%)` é a fatia que estourou o prazo do quadro. `zerarQuadros` marca o início da medição.
export async function zerarQuadros(driver) {
  await shell(driver, 'dumpsys', ['gfxinfo', env.app.appPackage, 'reset'])
}

export async function lerQuadros(driver) {
  const saida = String(await shell(driver, 'dumpsys', ['gfxinfo', env.app.appPackage]))
  const total = Number(/Total frames rendered:\s*(\d+)/.exec(saida)?.[1] ?? 0)
  const janky = Number(/Janky frames:\s*(\d+)/.exec(saida)?.[1] ?? 0)
  return { total, janky, percentual: total === 0 ? 0 : (janky * 100) / total }
}

// Maior "Skipped N frames" que o Choreographer registrou para o processo do app desde o último `limparLogcat`
// (o sistema só avisa a partir de 30 quadros): 0 = nenhum aviso. Evidência de trava da thread principal.
export async function maiorSaltoDeQuadros(driver) {
  const pid = String(await shell(driver, 'pidof', [env.app.appPackage])).trim().split(/\s+/)[0]
  if (!pid) return 0
  const saida = String(await shell(driver, 'logcat', ['-d', '-v', 'threadtime', 'Choreographer:I', '*:S']))
  let maior = 0
  for (const linha of saida.split('\n')) {
    const m = /^\S+\s+\S+\s+(\d+)\s+\d+\s+\w\s+Choreographer.*Skipped (\d+) frames/.exec(linha)
    if (m && m[1] === pid) maior = Math.max(maior, Number(m[2]))
  }
  return maior
}

// Linhas do logcat do app (`VisitaMedica`) que casam com `padrao` — ex.: "RAM das cópias aquecida/liberada" (T-042).
export async function linhasDoLogDoApp(driver, padrao) {
  const saida = String(await shell(driver, 'logcat', ['-d', '-v', 'time', '-s', 'VisitaMedica']))
  return saida.split('\n').map((l) => l.trim()).filter((l) => padrao.test(l))
}

// Fluidez desde o último `zerarQuadros`/`limparLogcat`: quadros lentos (gfxinfo) e o maior "Skipped N frames" (logcat).
export async function medirFluidez(driver) {
  const quadros = await lerQuadros(driver)
  return { ...quadros, maiorSalto: await maiorSaltoDeQuadros(driver) }
}

// Marca o início de uma medição de fluidez: zera o contador de quadros e o logcat.
export async function iniciarMedicaoDeFluidez(driver) {
  await limparLogcat(driver)
  await zerarQuadros(driver)
}

// ---- Notificações e preferências do app (T-001: lembretes de ponto) ---------------------------------------------------------------

// Concede "Alarmes e lembretes" (SCHEDULE_EXACT_ALARM): sem ela o lembrete "na hora" cai no WorkManager, que pode atrasar minutos.
export async function permitirAlarmeExato(driver) {
  await shell(driver, 'appops', ['set', env.app.appPackage, 'SCHEDULE_EXACT_ALARM', 'allow'])
}

// Troca (ou cria) chaves `<string name="...">valor</string>` do `shared_prefs/<arquivo>.xml` do app via `run-as` (só build debug).
// O app lê as preferências de novo depois de reaberto (`terminateApp` + `activateApp`). Grava em base64 para não depender de aspas.
export async function semearPreferenciasDoApp(driver, arquivo, valores) {
  const caminho = `shared_prefs/${arquivo}.xml`
  // `adb shell` no Windows devolve CRLF: normaliza para LF antes de regravar o arquivo do app.
  let xml = (await arquivoDoApp(driver, caminho)).replace(/\r\n/g, '\n')
  if (!xml) xml = "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n</map>"
  for (const [chave, valor] of Object.entries(valores)) {
    const linha = `<string name="${chave}">${valor}</string>`
    const existente = new RegExp(`<string name="${chave}">[^<]*</string>|<string name="${chave}" />`)
    xml = existente.test(xml) ? xml.replace(existente, () => linha) : xml.replace('</map>', () => `    ${linha}\n</map>`)
  }
  const b64 = Buffer.from(xml, 'utf-8').toString('base64')
  // O `adb shell` junta os argumentos numa linha só: sem as aspas o `|` e o `>` rodariam no shell de fora do `run-as` (sem acesso à pasta do app).
  await shell(driver, 'run-as', [env.app.appPackage, 'sh', '-c', `"echo ${b64} | base64 -d > ${caminho}"`])
}

// Títulos das notificações do app na barra agora (`dumpsys notification --noredact`: um registro por notificação postada).
export async function titulosDasNotificacoes(driver) {
  const saida = String(await shell(driver, 'dumpsys', ['notification', '--noredact']))
  return saida.split('NotificationRecord(')
    .filter((registro) => registro.includes(`pkg=${env.app.appPackage}`))
    .map((registro) => /android\.title=\S+ \(([^)]*)\)/.exec(registro)?.[1])
    .filter(Boolean)
}

// ---- Fonte do sistema (T-017) ---------------------------------------------------------------------------------------------------

// Escala da fonte do sistema (Configurações › Tamanho da fonte): 1,0 = padrão, 1,5 = o limite que o app tolera. Cenário `@fonte`:
// o `afterScenario` volta SEMPRE a 1,0 (`restaurarEscalaDaFonte`).
export async function definirEscalaDaFonte(driver, escala) {
  await shell(driver, 'settings', ['put', 'system', 'font_scale', String(escala)])
  // A mudança recria a activity do app: espera a árvore de UI parar de mudar (duas leituras iguais seguidas) antes do próximo passo,
  // senão o passo seguinte pega elementos da activity antiga ("Cached elements do not exist in DOM anymore").
  let anterior = ''
  const limite = Date.now() + 15000
  while (Date.now() < limite) {
    await driver.pause(700)
    const atual = await driver.getPageSource().catch(() => '')
    if (atual && atual === anterior) return
    anterior = atual
  }
}

export async function restaurarEscalaDaFonte(driver) {
  await definirEscalaDaFonte(driver, '1.0')
}
