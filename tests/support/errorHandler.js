// Classificador de erro — categoriza toda falha em causas conhecidas para que
// o relatório cite a categoria, nunca "parece que o seletor está errado".
// Portado de appium-pharmacie-desktop/tests/support/errorHandler.js, com o
// vocabulário trocado para Appium Mobile (uiautomator2) — ver
// Docs/APPIUM_MOBILE_FRAMEWORK_REFERENCE.md §3.
import {
  existsSync, readFileSync, writeFileSync, mkdirSync,
} from 'node:fs'
import path from 'node:path'

export const ErrorCategory = {
  ELEMENT_NOT_FOUND: 'elemento_ausente_na_arvore_de_ui',
  WAIT_TIMEOUT: 'timeout_de_espera_por_elemento',
  APP_NOT_RESPONDING: 'app_nao_responde_ou_crash',
  ELEMENT_NOT_INTERACTABLE: 'elemento_encontrado_mas_nao_interagivel',
  HTTP_CONTRACT_FAILURE: 'falha_de_contrato_http',
  APP_INSTALL_OR_LAUNCH_FAILURE: 'falha_de_instalacao_ou_lancamento_do_app',
  BACKEND_UNAVAILABLE: 'backend_indisponivel',
  UNKNOWN: 'causa_nao_classificada',
}

// A ordem importa: a primeira regra que casa vence.
const RULES = [
  { category: ErrorCategory.BACKEND_UNAVAILABLE, match: /backend fora do ar/i },
  { category: ErrorCategory.APP_INSTALL_OR_LAUNCH_FAILURE, match: /session not created|SessionNotCreated|InstallError|INSTALL_FAILED|unable to launch|failed to start|activity.*(not found|does not exist)/i },
  { category: ErrorCategory.APP_NOT_RESPONDING, match: /not responding|ANR|ECONNREFUSED|instrumentation process (is )?not running|has crashed|crashed|proxy.*(died|closed)/i },
  { category: ErrorCategory.ELEMENT_NOT_INTERACTABLE, match: /not interactable|element not visible|is not clickable|obscured|stale element/i },
  { category: ErrorCategory.ELEMENT_NOT_FOUND, match: /no such element|could not locate|NoSuchElement/i },
  { category: ErrorCategory.WAIT_TIMEOUT, match: /wait for.*(to be|to exist)|timed out while waiting|still not (displayed|existing)/i },
  { category: ErrorCategory.HTTP_CONTRACT_FAILURE, match: /expected status|status code \d+|schema validation/i },
]

// Registro de categorias descobertas automaticamente, compartilhado entre
// execuções (sem namespace por sessionLabel, sem política de exclusão — só
// cresce). Todo erro que não bate com nenhuma RULE acima cai aqui: a mesma
// FORMA de erro desconhecido (normalizada) sempre recebe a MESMA categoria
// nova entre rodadas, e uma forma nunca vista gera uma categoria na hora.
const REGISTRY_PATH = path.join('tests', 'reports', 'error-categories.json')

let registryCache = null

function loadRegistry() {
  if (registryCache) return registryCache
  if (!existsSync(REGISTRY_PATH)) {
    registryCache = {}
    return registryCache
  }
  try {
    registryCache = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'))
  } catch {
    registryCache = {}
  }
  return registryCache
}

function saveRegistry(registry) {
  mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true })
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8')
}

// Remove as partes variáveis da mensagem (UUID, número, texto entre aspas)
// pra que a MESMA falha com um id/valor diferente caia na mesma categoria.
function normalizeSignature(message) {
  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
    .replace(/"[^"]*"|'[^']*'/g, '<valor>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

function slugifyForCategory(message) {
  const words = message
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
  const slug = words.join('_') || 'sem_descricao'
  return `descoberta_${slug}`.slice(0, 80)
}

function classifyUnknown(message) {
  if (!message) return { category: ErrorCategory.UNKNOWN, discovered: false }

  const signature = normalizeSignature(message)
  const registry = loadRegistry()
  if (registry[signature]) {
    return { category: registry[signature], discovered: true }
  }

  const category = slugifyForCategory(message)
  registry[signature] = category
  saveRegistry(registry)
  return { category, discovered: true }
}

export function classifyError(error) {
  const message = error?.message ?? String(error)
  const rule = RULES.find((r) => r.match.test(message))
  if (rule) {
    return {
      category: rule.category, message, stack: error?.stack, discovered: false,
    }
  }

  const { category, discovered } = classifyUnknown(message)
  return {
    category, message, stack: error?.stack, discovered,
  }
}
