import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..', '..')

function deepMerge(base, override) {
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      base[key] = deepMerge(base[key] || {}, override[key])
    } else {
      base[key] = override[key]
    }
  }
  return base
}

// env.json é versionado com placeholders vazios; credenciais/segredos reais
// vivem em env.local.json (gitignorado) e sobrescrevem env.json quando presente.
export function loadEnv() {
  const env = JSON.parse(readFileSync(path.join(rootDir, 'env.json'), 'utf-8'))
  const localPath = path.join(rootDir, 'env.local.json')
  if (!existsSync(localPath)) return env
  const local = JSON.parse(readFileSync(localPath, 'utf-8'))
  return aplicarVariaveisDeAmbiente(deepMerge(env, local))
}

// `DEVICE_UDID` aponta a execução para outro aparelho (ex.: celular por adb wifi `192.168.1.190:5555`)
// sem editar env.json nem o env.local.json do usuário; `DEVICE_NOME` só rotula o relatório.
function aplicarVariaveisDeAmbiente(env) {
  if (process.env.DEVICE_UDID) {
    env.device.udid = process.env.DEVICE_UDID
    env.device.name = process.env.DEVICE_NOME || process.env.DEVICE_UDID
  }
  return env
}
