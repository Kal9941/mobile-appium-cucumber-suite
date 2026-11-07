import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import path from 'node:path'
import { classifyError } from './errorHandler.js'

// Abaixo disso o dump de `getPageSource()` provavelmente veio de uma tela
// errada/vazia (app crashou, sessão presa em outro app, tela de bloqueio).
// Valor inicial de calibração — ajustar com dumps reais do app (AGENTS §2).
const SUSPICIOUSLY_SMALL_PAGE_SOURCE_BYTES = 1500

function formatLogLine(record) {
  const suspectNote = record.pageSourceSuspect
    ? ' ⚠ suspeito — menor que o esperado, pode ser tela errada/vazia'
    : ''
  const discoveredNote = record.discovered ? ' (categoria nova, auto-descoberta — ver tests/reports/error-categories.json)' : ''
  return [
    `[${record.timestamp}] ${record.testTitle}`,
    `  categoria: ${record.category ?? 'causa_nao_classificada'}${discoveredNote}`,
    `  mensagem: ${record.message ?? '(sem mensagem)'}`,
    `  screenshot: ${record.screenshotPath ?? '(falhou ao capturar)'}`,
    `  page-source: ${record.pageSourcePath ?? '(falhou ao capturar)'} (${record.pageSourceBytes} bytes)${suspectNote}`,
    '',
  ].join('\n')
}

// Screenshot + dump da árvore de UI (`getPageSource()`) no momento da falha,
// namespaced por sessão, mais o log consolidado e o ponteiro da última falha.
// Ordem de diagnóstico (AGENTS §2): failures.jsonl → registro classificado →
// page-source → screenshot.
export async function captureFailureArtifacts({
  driver, sessionLabel, testTitle, error,
}) {
  const safeTitle = testTitle.replace(/[^a-z0-9-_]+/gi, '_')
  const dir = path.join('tests', 'reports', sessionLabel)
  mkdirSync(dir, { recursive: true })

  const base = path.join(dir, safeTitle)
  const classified = error ? classifyError(error) : null

  let screenshotPath = null
  try {
    const screenshot = await driver.takeScreenshot()
    screenshotPath = `${base}.png`
    writeFileSync(screenshotPath, screenshot, 'base64')
  } catch (err) {
    writeFileSync(`${base}.screenshot-error.txt`, String(err))
  }

  let pageSourcePath = null
  let pageSourceBytes = 0
  try {
    const pageSource = await driver.getPageSource()
    pageSourceBytes = Buffer.byteLength(pageSource, 'utf-8')
    pageSourcePath = `${base}.page-source.xml`
    writeFileSync(pageSourcePath, pageSource)
  } catch (err) {
    writeFileSync(`${base}.page-source-error.txt`, String(err))
  }

  const record = {
    timestamp: new Date().toISOString(),
    testTitle,
    category: classified?.category ?? null,
    discovered: classified?.discovered ?? false,
    message: classified?.message ?? null,
    screenshotPath,
    pageSourcePath,
    pageSourceBytes,
    pageSourceSuspect: pageSourceBytes > 0 && pageSourceBytes < SUSPICIOUSLY_SMALL_PAGE_SOURCE_BYTES,
  }
  const logLine = formatLogLine(record)

  // Consolidado da rodada (append-only, uma linha por falha).
  appendFileSync(path.join(dir, 'failures.jsonl'), `${JSON.stringify(record)}\n`, 'utf-8')
  appendFileSync(path.join(dir, 'failures.log'), logLine, 'utf-8')

  // Ponteiro rápido pra última falha (sobrescrito a cada chamada).
  writeFileSync(path.join(dir, 'last-failure.json'), JSON.stringify(record, null, 2), 'utf-8')
  writeFileSync(path.join(dir, 'last-failure.log'), logLine, 'utf-8')

  return dir
}

export function logClassifiedFailure(error) {
  const classified = classifyError(error)
  const discoveredNote = classified.discovered ? ' (categoria nova, auto-descoberta)' : ''
  // eslint-disable-next-line no-console
  console.error(`[${classified.category}]${discoveredNote} ${classified.message}`)
  return classified
}
