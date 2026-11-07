// Visão do app para a IA: capturas e gravação de tela como EVIDÊNCIA que eu leio (`Read` da
// imagem), nunca como asserção automática (`[R-ID]`, AGENTS §0/§6: componente se testa pelo
// id). Serve para o que o dump não mostra — cor, contraste, sobreposição, recorte, layout,
// avisos que aparecem e somem, transições e animações.
//
// Três ferramentas:
//  - `capturar(driver, nome)`      → 1 quadro nomeado, durante o cenário;
//  - tag `@visual` no cenário      → 1 quadro automático ao fim de CADA passo (wdio.shared.conf.js);
//  - tag `@gravar` no cenário      → vídeo da tela inteira + quadros extraídos com ffmpeg
//                                    (4 por segundo), para animação/transição.
// Saída em `tests/reports/<sessão>/visual/<cenário>/`.
import {
  mkdirSync, writeFileSync, existsSync, readdirSync,
} from 'node:fs'
import { spawn, execFileSync } from 'node:child_process'
import path from 'node:path'
import { loadEnv } from './loadEnv.js'

const env = loadEnv()
const udid = env.device.udid

let cenarioAtual = { pasta: null, seq: 0 }
let gravacao = null

const seguro = (texto) => texto.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 70)
const pad = (n) => String(n).padStart(3, '0')

// Chamado no `beforeScenario`: aponta a pasta do cenário e zera a sequência.
export function iniciarCenarioVisual(sessionLabel, tituloCenario) {
  const pasta = path.join('tests', 'reports', sessionLabel, 'visual', seguro(tituloCenario))
  mkdirSync(pasta, { recursive: true })
  cenarioAtual = { pasta, seq: 0 }
  return pasta
}

// 1 quadro via Appium (`takeScreenshot`) — cabe em qualquer ponto do cenário.
export async function capturar(driver, nome) {
  if (!cenarioAtual.pasta) throw new Error('capturar: cenário visual não iniciado (iniciarCenarioVisual)')
  cenarioAtual.seq += 1
  const arquivo = path.join(cenarioAtual.pasta, `${pad(cenarioAtual.seq)}_${seguro(nome)}.png`)
  writeFileSync(arquivo, await driver.takeScreenshot(), 'base64')
  return arquivo
}

// `pidof` sai com código 1 quando não há processo — isso significa "parado", não erro.
function pidScreenrecord() {
  try {
    return execFileSync('adb', ['-s', udid, 'shell', 'pidof', 'screenrecord'], { encoding: 'utf-8' }).trim()
  } catch {
    return ''
  }
}

// Começa a gravar a tela do dispositivo da suíte (limite do Android: 180 s por arquivo).
export function iniciarGravacao() {
  if (gravacao) return
  const remoto = `/sdcard/prime_suite_${Date.now()}.mp4`
  // Destacado do `adb` (nohup, stdin/stdout fechados, em segundo plano no aparelho): com o `adb shell`
  // preso ao processo local, fechar o stdin dele derruba o `screenrecord` antes da hora.
  const proc = spawn('adb', ['-s', udid, 'shell', `nohup screenrecord --time-limit 180 --bit-rate 4000000 ${remoto} </dev/null >/dev/null 2>&1 &`], { stdio: 'ignore' })
  gravacao = { proc, remoto }
}

// Para a gravação, traz o mp4 e extrai quadros (4/s, largura 540) para a pasta do cenário.
// Devolve a pasta dos quadros, ou null se não havia gravação.
export function pararGravacaoEExtrair(fps = 4) {
  if (!gravacao) return null
  const { proc, remoto } = gravacao
  gravacao = null
  // SIGINT no `screenrecord` DENTRO do aparelho (matar o adb local não fecha o mp4) e espera o
  // processo sumir: só depois do `moov atom` gravado o arquivo é legível pelo ffmpeg.
  const pid = pidScreenrecord()
  if (pid) execFileSync('adb', ['-s', udid, 'shell', 'kill', '-2', ...pid.split(/\s+/)], { stdio: 'ignore' })
  for (let i = 0; i < 40; i += 1) {
    if (!pidScreenrecord()) break
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250)
  }
  try { proc.kill() } catch { /* já encerrou */ }
  const pasta = path.join(cenarioAtual.pasta ?? path.join('tests', 'reports', 'visual-avulso'), 'video')
  mkdirSync(pasta, { recursive: true })
  const mp4 = path.join(pasta, 'gravacao.mp4')
  execFileSync('adb', ['-s', udid, 'pull', remoto, mp4], { stdio: 'ignore' })
  execFileSync('adb', ['-s', udid, 'shell', 'rm', '-f', remoto], { stdio: 'ignore' })
  const quadros = path.join(pasta, 'quadros')
  mkdirSync(quadros, { recursive: true })
  execFileSync(env.tools.ffmpeg, ['-y', '-loglevel', 'error', '-i', mp4, '-vf', `fps=${fps},scale=540:-1`, path.join(quadros, 'q_%03d.png')], { stdio: 'ignore' })
  return quadros
}

export function listarQuadros(pasta) {
  return existsSync(pasta) ? readdirSync(pasta).filter((f) => f.endsWith('.png')).sort() : []
}
