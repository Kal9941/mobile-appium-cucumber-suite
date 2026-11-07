// Service Object — chamada HTTP crua ao backend, sem UI (AGENTS §1, camadas não
// se misturam). Única fonte de verdade das rotas usadas pela suíte.
// Diretriz [R-APIREAL]: a suíte roda contra a API real; se o backend estiver
// fora do ar, falhar cedo e com categoria própria em vez de deixar os testes
// quebrarem no meio com erro de tela.
// Contratos lidos de prime-visita-3-backend/src/modules/<recurso>/*.schema.ts
// (AGENTS §9): login `{ cnpj, login, senha }` → `{ accessToken, funcionario }`;
// as rotas de listagem devolvem array puro.
import { randomUUID } from 'node:crypto'
import { loadEnv } from '../support/loadEnv.js'
import { agoraSP } from '../support/dataPtBr.js'

const env = loadEnv()
const base = env.backend.baseUrl

let sessaoCache = null

// Massa de teste criada pela suíte (visitas "Teste Appium"), cancelada ao fim do cenário.
const visitasCriadas = []
// Disponibilidade (Disponível/Ocupado) que um cenário alterou e que `limparMassaDeTeste` devolve ao original.
let disponibilidadeParaRestaurar = null
export const PREFIXO_MASSA = 'Teste Appium'
// Cenário que cria visita PELA TELA (não pela API): o código não é conhecido aqui, então a limpeza cancela toda visita
// aberta com o prefixo da massa (T-044). Ligado por `registrarMassaPelaUI`, desligado ao limpar.
let varrerMassaPorPrefixo = false
// Instantâneo (`"codigo:indice"`) dos follow-ups JÁ concluídos antes de um cenário que marca follow-up: a limpeza REABRE todo
// follow-up concluído que não estava nele, passe ou falhe (T-043 c). `null` = o cenário não mexe em follow-up.
let followUpsConcluidosAntes = null
// Idem para os prescritores vinculados ao representante de teste (`6.23` vincula/desvincula pela lista): códigos vinculados ANTES.
let vinculadosAntes = null

// O access token expira (~15 min, `T-003` b) e a sessão fica em cache pelo processo inteiro: um `401`
// com o token do cache significa token vencido, não bug — loga de novo uma vez e repete o pedido.
async function requisitar(rota, opcoes = {}) {
  const resposta = await requisitarUmaVez(rota, opcoes)
  if (resposta.status === 401 && opcoes.token && sessaoCache && opcoes.token === sessaoCache.token) {
    sessaoCache = null
    const { token } = await BackendService.sessao()
    return requisitarUmaVez(rota, { ...opcoes, token })
  }
  return resposta
}

async function requisitarUmaVez(rota, { metodo = 'GET', corpo, token } = {}) {
  const resposta = await fetch(`${base}${rota}`, {
    method: metodo,
    headers: {
      // Sem corpo não há `content-type`: o Fastify recusa (400) um DELETE com `application/json` e corpo vazio.
      ...(corpo ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  const texto = await resposta.text()
  let json = null
  try { json = texto ? JSON.parse(texto) : null } catch { /* corpo não-JSON */ }
  return { status: resposta.status, corpo: json }
}

export const BackendService = {
  // `/health` não prova banco — a prontidão real é `/health/banco` (backend, B-016). O backend é
  // de outra sessão e recarrega sozinho (`tsx watch`): tolera um reinício de até 45 s antes de
  // declarar `backend fora do ar`.
  async garantirNoAr(tolerarMs = 45000) {
    const limite = Date.now() + tolerarMs
    let ultimoErro = ''
    do {
      try {
        const { status } = await requisitar('/health/banco')
        if (status === 200) return
        ultimoErro = `status ${status}`
      } catch (erro) {
        ultimoErro = erro.message
      }
      await new Promise((r) => setTimeout(r, 3000))
    } while (Date.now() < limite)
    throw new Error(`backend fora do ar em ${base} (health/banco: ${ultimoErro})`)
  },

  // Sessão do usuário de teste (token + código do funcionário), em cache por processo.
  async sessao() {
    if (sessaoCache) return sessaoCache
    const { cnpj, usuario, senha } = env.credentials
    const { status, corpo } = await requisitar('/login', {
      metodo: 'POST',
      corpo: { cnpj, login: Number(usuario), senha },
    })
    if (status !== 200) throw new Error(`expected status 200 em POST /login, recebeu status code ${status}`)
    sessaoCache = { token: corpo.accessToken, codigoFuncionario: corpo.funcionario.codigo }
    return sessaoCache
  },

  // Resultados por prescritor de um período livre (`YYYY-MM-DD`), `todos=true` como o app.
  async resultadosPorPeriodo(dataInicio, dataFim) {
    return this.listar(`/relatorios/resultados-por-prescritor?dataInicio=${dataInicio}&dataFim=${dataFim}&todos=true`)
  },

  // Resultados por prescritor do mês (`relatorios.schema.ts`: `dataInicio`/`dataFim` ISO + `todos`).
  // O app pede `todos=true` (empresa toda, decisão do usuário até existir a permissão gerencial).
  async resultadosPorPrescritor(ano, mes) {
    const pad = (n) => String(n).padStart(2, '0')
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    return this.listar(`/relatorios/resultados-por-prescritor?dataInicio=${ano}-${pad(mes)}-01&dataFim=${ano}-${pad(mes)}-${pad(ultimo)}&todos=true`)
  },

  // Visita AGENDADA de teste hoje, na hora `HH:mm`, com o prefixo "Teste Appium" no histórico
  // (`POST /visitas`, `createVisitaBodySchema`; idempotente por `uuid`). Usa prescritor/local de uma
  // visita já existente (o tenant é real). Fica registrada e é CANCELADA por `limparMassaDeTeste`.
  async criarVisitaDeTesteHoje(hora, rotulo = '') {
    return this.criarVisitaDeTeste({ dias: 0, hora, rotulo })
  },

  // `dias`: 0 = hoje, 1 = amanhã… (dia civil de São Paulo).
  async criarVisitaDeTeste({ dias = 0, hora, rotulo = '' }) {
    const { token } = await this.sessao()
    const existentes = await this.listar('/visitas')
    const modelo = existentes.find((v) => v.codigoMedico && v.codigoLocalAtendimento)
    if (!modelo) throw new Error('schema validation: nenhuma visita existente para copiar prescritor/local')
    const hoje = agoraSP()
    const alvo = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia + dias))
    const pad = (n) => String(n).padStart(2, '0')
    const dataIso = `${alvo.getUTCFullYear()}-${pad(alvo.getUTCMonth() + 1)}-${pad(alvo.getUTCDate())}`
    const { status, corpo } = await requisitar('/visitas', {
      metodo: 'POST',
      token,
      corpo: {
        uuid: randomUUID(),
        codigoMedico: modelo.codigoMedico,
        codigoLocalAtendimento: modelo.codigoLocalAtendimento,
        statusVisita: 0,
        dataVisita: dataIso,
        horaVisita: hora,
        historico: `${PREFIXO_MASSA} ${rotulo}`.trim(),
      },
    })
    if (status !== 201 && status !== 200) throw new Error(`expected status 201 em POST /visitas, recebeu status code ${status}`)
    visitasCriadas.push(corpo.codigo)
    return { codigo: corpo.codigo, hora, dataVisita: dataIso }
  },

  // Primeiro horário de hoje (`HH:mm`, de 22:30 para trás, de 5 em 5 min) em que `base` e `+5`, `+10`, `+15`, `+20`, `+60` e
  // `+65` ficam a 10 min ou mais de qualquer visita NÃO cancelada do dia — para o cenário agendar/reagendar em série sem
  // esbarrar no intervalo mínimo (T-040/T-044). Os deslocamentos são os que os cenários usam.
  async horarioLivreHoje() {
    const hoje = agoraSP()
    const pad = (n) => String(n).padStart(2, '0')
    const iso = `${hoje.ano}-${pad(hoje.mes)}-${pad(hoje.dia)}`
    const minutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
    const ocupados = (await this.listar('/visitas')).filter((v) => v.dataVisita === iso && v.statusVisita !== 3).map((v) => minutos(v.horaVisita))
    for (let base = 22 * 60 + 30; base >= 8 * 60; base -= 5) {
      if ([0, 5, 10, 15, 20, 60, 65].every((d) => ocupados.every((o) => Math.abs(o - (base + d)) >= 10))) return `${pad(Math.floor(base / 60))}:${pad(base % 60)}`
    }
    throw new Error('schema validation: nenhum horário livre hoje para a massa de teste')
  },

  registrarMassaPelaUI() {
    varrerMassaPorPrefixo = true
  },

  // `PUT /resumo-visita-ia/:codigo/follow-ups/:indice` (`F-034`): marca/desmarca o follow-up do resumo.
  async definirFollowUpConcluido(codigo, indice, concluido) {
    const { token } = await this.sessao()
    const { status } = await requisitar(`/resumo-visita-ia/${codigo}/follow-ups/${indice}`, { metodo: 'PUT', token, corpo: { concluido } })
    if (status !== 200) throw new Error(`expected status 200 em PUT follow-up, recebeu status code ${status}`)
  },

  // Follow-ups da semana de hoje (inclui os pendentes de semanas anteriores), como a tela de Minha semana os mostra.
  async followUpsDaSemanaAtual() {
    const hoje = agoraSP()
    const pad = (n) => String(n).padStart(2, '0')
    const data = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia))
    const segunda = new Date(data.getTime() - ((data.getUTCDay() + 6) % 7) * 86400000)
    const iso = `${segunda.getUTCFullYear()}-${pad(segunda.getUTCMonth() + 1)}-${pad(segunda.getUTCDate())}`
    return (await this.obter(`/relatorios/resumo-semanal-ia?semana=${iso}`)).followUps
  },

  // `DELETE /prescritores/:codigo/representante` (`F-020`): desfaz o vínculo do prescritor ao representante de teste (204, idempotente).
  async desvincularPrescritor(codigo) {
    const { token } = await this.sessao()
    const { status } = await requisitar(`/prescritores/${codigo}/representante`, { metodo: 'DELETE', token })
    if (status !== 204) throw new Error(`expected status 204 em DELETE vínculo do prescritor, recebeu status code ${status}`)
  },

  // Cenário que vai vincular prescritor chama ANTES de tocar: a limpeza desvincula todo vinculado que não estava na lista.
  async registrarVinculadosAntes() {
    vinculadosAntes = new Set((await this.obter('/prescritores/vinculados-a-mim')).codigos)
  },

  // Cenário que vai marcar um follow-up chama ANTES de tocar: guarda quais já estavam concluídos (padrão da disponibilidade).
  async registrarFollowUpsConcluidos() {
    followUpsConcluidosAntes = new Set((await this.followUpsDaSemanaAtual()).filter((f) => f.concluido).map((f) => `${f.codigo}:${f.indice}`))
  },

  // Visitas com o prefixo da massa que ainda estão abertas (status diferente de cancelada), conforme a API.
  async visitasDeTesteAbertas() {
    return (await this.listar('/visitas')).filter((v) => (v.historico ?? '').startsWith(PREFIXO_MASSA) && v.statusVisita !== 3)
  },

  // Cancela as visitas "Teste Appium" que ficaram ABERTAS (agendada/iniciada) de uma execução interrompida.
  // Roda no `onPrepare`: massa de teste nunca fica pendurada no tenant real.
  async cancelarMassaDeTesteOrfa() {
    const { token } = await this.sessao()
    const todas = await this.listar('/visitas')
    const orfas = todas.filter((v) => (v.historico ?? '').startsWith(PREFIXO_MASSA) && v.statusVisita !== 3 && v.version != null)
    for (const v of orfas) {
      await requisitar(`/visitas/${v.codigo}`, { metodo: 'PUT', token, corpo: { version: v.version, statusVisita: 3, motivoCancelamento: `${PREFIXO_MASSA}: limpeza de massa órfã` } })
    }
    return orfas.map((v) => v.codigo)
  },

  // Cancela (statusVisita 3, motivo obrigatório) toda visita de teste criada neste processo.
  async limparMassaDeTeste() {
    if (disponibilidadeParaRestaurar) {
      const original = disponibilidadeParaRestaurar
      disponibilidadeParaRestaurar = null
      await this.definirDisponibilidade(original)
    }
    if (vinculadosAntes) {
      const antes = vinculadosAntes
      vinculadosAntes = null
      for (const codigo of (await this.obter('/prescritores/vinculados-a-mim')).codigos) {
        if (!antes.has(codigo)) await this.desvincularPrescritor(codigo)
      }
    }
    if (followUpsConcluidosAntes) {
      const antes = followUpsConcluidosAntes
      followUpsConcluidosAntes = null
      for (const f of await this.followUpsDaSemanaAtual()) {
        if (f.concluido && !antes.has(`${f.codigo}:${f.indice}`)) await this.definirFollowUpConcluido(f.codigo, f.indice, false)
      }
    }
    if (varrerMassaPorPrefixo) {
      varrerMassaPorPrefixo = false
      await this.cancelarMassaDeTesteOrfa()
    }
    if (visitasCriadas.length === 0) return
    const { token } = await this.sessao()
    while (visitasCriadas.length > 0) {
      const codigo = visitasCriadas.pop()
      const { status, corpo } = await requisitar(`/visitas/${codigo}`, { token })
      if (status !== 200 || corpo.statusVisita === 3) continue
      await requisitar(`/visitas/${codigo}`, {
        metodo: 'PUT', token, corpo: { version: corpo.version, statusVisita: 3, motivoCancelamento: `${PREFIXO_MASSA}: limpeza automática` },
      })
    }
  },

  // Usuário logado + disponibilidade (`GET /funcionarios/eu`): `disponivel` | `ocupado` | null (não é atendente).
  async eu() {
    return this.obter('/funcionarios/eu')
  },

  // `PUT /funcionarios/eu/disponibilidade` — o cenário que muda registra o ORIGINAL para a limpeza devolver.
  async definirDisponibilidade(valor) {
    const { token } = await this.sessao()
    const { status } = await requisitar('/funcionarios/eu/disponibilidade', { metodo: 'PUT', token, corpo: { disponibilidade: valor } })
    if (status !== 200) throw new Error(`expected status 200 em PUT disponibilidade, recebeu status code ${status}`)
  },

  registrarDisponibilidadeOriginal(valor) {
    disponibilidadeParaRestaurar ??= valor
  },

  // 2º usuário de teste (`credentialsOutroUsuario` do `env.local.json`): token próprio, só para LER os dados dele pela API e
  // provar que a tela do app, depois de trocar de usuário, não mostra nada do anterior (T-003 d / T-042 b). Nunca grava.
  async obterComoOutroUsuario(rota) {
    const { cnpj, usuario, senha } = env.credentialsOutroUsuario ?? {}
    if (!cnpj || !usuario || !senha) throw new Error('schema validation: credentialsOutroUsuario ausente no env.local.json (bloqueado: sem 2ª credencial)')
    const login = await requisitarUmaVez('/login', { metodo: 'POST', corpo: { cnpj, login: Number(usuario), senha } })
    if (login.status !== 200) throw new Error(`expected status 200 em POST /login do outro usuário, recebeu status code ${login.status}`)
    const { status, corpo } = await requisitarUmaVez(rota, { token: login.corpo.accessToken })
    if (status !== 200) throw new Error(`expected status 200 em GET ${rota} (outro usuário), recebeu status code ${status}`)
    return corpo
  },

  // GET autenticado de um recurso único (objeto), ex.: `/prescritores/24897`.
  async obter(rota) {
    const { token } = await this.sessao()
    const { status, corpo } = await requisitar(rota, { token })
    if (status !== 200) throw new Error(`expected status 200 em GET ${rota}, recebeu status code ${status}`)
    return corpo
  },

  // GET autenticado de uma rota de listagem (array puro). `rota` já com a query.
  async listar(rota) {
    const { token } = await this.sessao()
    const { status, corpo } = await requisitar(rota, { token })
    if (status !== 200) throw new Error(`expected status 200 em GET ${rota}, recebeu status code ${status}`)
    if (!Array.isArray(corpo)) throw new Error(`schema validation: GET ${rota} não devolveu array`)
    return corpo
  },
}
