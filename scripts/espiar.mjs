// "Espiar" o app avulso, fora de qualquer cenário: captura a tela do dispositivo da suíte
// (e, com --dump, a árvore de UI) e imprime os caminhos — para eu LER a imagem na hora
// (`Read`), ex.: ao investigar algo que o dump não mostra (`[R-ID]`).
//
//   node scripts/espiar.mjs [nome]            → 1 captura (PNG)
//   node scripts/espiar.mjs [nome] --dump     → PNG + dump da árvore (uiautomator)
//   node scripts/espiar.mjs [nome] --rajada 6 → 6 capturas, uma a cada 500 ms (aviso que some, transição)
//
// Usa só `adb` e o `udid` de env.json — nunca outro dispositivo (AGENTS §7).
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from '../tests/support/loadEnv.js'
import { formatBrazilianTimestamp } from '../tests/support/sessionLabel.js'

const { device } = loadEnv()
const args = process.argv.slice(2)
const nome = (args.find((a) => !a.startsWith('--') && Number.isNaN(Number(a))) ?? 'espiada').replace(/[^a-z0-9-_]+/gi, '_')
const comDump = args.includes('--dump')
const iRajada = args.indexOf('--rajada')
const quantidade = iRajada >= 0 ? Number(args[iRajada + 1]) : 1

const pasta = path.join('tests', 'reports', 'visual-avulso', formatBrazilianTimestamp())
mkdirSync(pasta, { recursive: true })

const adb = (...a) => execFileSync('adb', ['-s', device.udid, ...a], { maxBuffer: 64 * 1024 * 1024 })
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

for (let i = 1; i <= quantidade; i += 1) {
  const arquivo = path.join(pasta, `${String(i).padStart(2, '0')}_${nome}.png`)
  writeFileSync(arquivo, adb('exec-out', 'screencap', '-p'))
  console.log(arquivo)
  if (i < quantidade) dormir(500)
}

if (comDump) {
  // `uiautomator dump` briga com o servidor do Appium: com uma sessão ativa (suíte rodando) ele
  // falha. Nesse caso o dump vem do próprio cenário (`getPageSource`, failureArtifacts).
  try {
    adb('shell', 'uiautomator', 'dump', '/sdcard/espiar.xml')
    const xml = path.join(pasta, `${nome}.dump.xml`)
    writeFileSync(xml, adb('exec-out', 'cat', '/sdcard/espiar.xml'))
    console.log(xml)
  } catch {
    console.log('dump indisponível: há sessão Appium ativa (use getPageSource no cenário) — só a imagem foi gerada')
  }
}
