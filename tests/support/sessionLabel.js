import { loadEnv } from './loadEnv.js'

const env = loadEnv()

// Formato brasileiro (DD-MM-AAAA_HH-mm-ss-SSS) para nomear pastas de relatório.
// Milissegundos no final evitam colisão entre processos/workers iniciados no
// mesmo segundo (o framework cucumber do WDIO sobe um worker por feature).
export function formatBrazilianTimestamp(date = new Date()) {
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  const dd = pad(date.getDate())
  const mm = pad(date.getMonth() + 1)
  const yyyy = date.getFullYear()
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  const ms = pad(date.getMilliseconds(), 3)
  return `${dd}-${mm}-${yyyy}_${hh}-${min}-${ss}-${ms}`
}

// Namespacing de artefatos por execução — evita que execuções concorrentes
// pisem nas evidências uma da outra (equivalente ao SESSION_LABEL do Cypress).
export function getSessionLabel() {
  return process.env.SESSION_LABEL || `${env.session.defaultLabel}-${formatBrazilianTimestamp()}`
}
