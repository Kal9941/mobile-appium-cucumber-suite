import { When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { ChatPage } from '../pages/4.chatPage.js'
import { BasePage } from '../pages/BasePage.js'
import { BackendService } from '../services/BackendService.js'
import { nomePropio, nomeCurto } from '../support/nomePropio.js'
import { topoDoTecladoPorInsets } from '../support/dispositivo.js'
import { capturar } from '../support/visual.js'

let pagina
const chat = () => { pagina ??= new ChatPage(driver); return pagina }
const colapsar = (s) => s.replace(/\s+/g, ' ').trim()
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const norm = (s) => semAcento(s).toLowerCase().replace(/\s+/g, ' ').trim()
const ITEM = '^chat_item_[0-9]+$'
const nomeDoContato = (c) => c.nick ?? c.nomeFuncionario ?? ''

Then('vejo a busca e a lista de contatos ou o estado vazio', async function () {
  pagina = new ChatPage(driver)
  await pagina.aguardarTela()
  await expect(pagina.tituloText()).toBeDisplayed()
  await expect(pagina.porTag('chat_campo_busca')).toBeDisplayed()

  await pagina.aguardarCarregar()
  // Exatamente um dos dois: lista de contatos OU estado vazio; nunca erro.
  const lista = await pagina.contar('chat_lista')
  const vazio = await pagina.contar('chat_icone_estado_vazio')
  expect(lista + vazio).toBe(1)
  expect(await pagina.contar('chat_texto_erro')).toBe(0)
})

// ---- T-031 ------------------------------------------------------------------------------------

Then('os nomes dos contatos seguem a regra de nome próprio conforme a API', async function () {
  const p = chat()
  await p.aguardarTela()
  await p.aguardarCarregar()
  const contatos = await BackendService.listar('/chat-contatos')
  const porCodigo = new Map(contatos.map((c) => [c.codigo, c]))
  const ids = (await p.idsNaOrdemVisual('^chat_item_[0-9]+_texto_nome$')).slice(0, 8)
  expect(ids.length).toBeGreaterThanOrEqual(1)
  let transformados = 0
  for (const id of ids) {
    const api = porCodigo.get(Number(id.split('_')[2]))
    const base = colapsar(nomeDoContato(api))
    const esperado = colapsar(nomePropio(nomeCurto(base))) // o app encurta (1ª + última palavra) antes do nome próprio
    expect(colapsar(await p.textoDe(id))).toBe(esperado)
    if (esperado !== base) transformados += 1
  }
  expect(transformados).toBeGreaterThanOrEqual(1)
  await capturar(driver, 'lista-chat-negrito')
})

// ---- última mensagem e data ---------------------------------------------------------------------

Then('os contatos visíveis mostram a última mensagem e a data conforme a API', async function () {
  const p = chat()
  await p.aguardarCarregar()
  const contatos = await BackendService.listar('/chat-contatos')
  const porCodigo = new Map(contatos.map((c) => [c.codigo, c]))
  const ids = (await p.idsNaOrdemVisual(ITEM)).slice(0, 6)
  expect(ids.length).toBeGreaterThanOrEqual(1)
  let comMensagem = 0
  for (const id of ids) {
    const codigo = Number(id.split('_').pop())
    const api = porCodigo.get(codigo)
    if (!api.ultimaMensagem) continue
    comMensagem += 1
    // `\r` do receituário vira espaço (inventário do app); o texto fica em 1 linha.
    expect(colapsar(await p.textoDe(`chat_item_${codigo}_texto_ultima_mensagem`))).toBe(colapsar(api.ultimaMensagem.replace(/\r/g, ' ')))
    const [dia, hora] = api.ultimaMensagemEm.split('T')
    expect(await p.textoDe(`chat_item_${codigo}_texto_ultima_data`)).toBe(`${dia.split('-').reverse().join('/')} ${hora.slice(0, 5)}`)
  }
  expect(comMensagem).toBeGreaterThanOrEqual(1)
})

// ---- busca -------------------------------------------------------------------------------------

When('busco {string} nos contatos do chat', async function (texto) {
  const p = chat()
  await p.aguardarCarregar()
  await p.preencher('chat_campo_busca', texto)
  await p.fecharTecladoSeAberto()
})

Then('a lista do chat mostra só os contatos da API que contêm {string}', async function (texto) {
  const p = chat()
  const contatos = await BackendService.listar('/chat-contatos')
  const esperados = new Set(contatos.filter((c) => norm(`${c.nick ?? ''} ${c.nomeFuncionario ?? ''}`).includes(norm(texto))).map((c) => c.codigo))
  expect(esperados.size).toBeGreaterThanOrEqual(1)
  await driver.waitUntil(async () => {
    const codigos = (await p.idsNaOrdemVisual(ITEM)).map((id) => Number(id.split('_').pop()))
    return codigos.length === esperados.size && codigos.every((c) => esperados.has(c))
  }, { timeout: 15000, timeoutMsg: `timed out while waiting for the chat search "${texto}" to match the API` })
})

// ---- conversa ----------------------------------------------------------------------------------

let contatoAberto
When('abro a conversa com o primeiro contato da lista', async function () {
  const p = chat()
  await p.aguardarCarregar()
  const primeiro = (await p.idsNaOrdemVisual(ITEM))[0]
  contatoAberto = Number(primeiro.split('_').pop())
  await p.tocar(primeiro)
  await p.esperarVisivel('chatconversa_campo_mensagem')
})

Then('a conversa mostra o contato e as últimas mensagens conforme a API', async function () {
  const p = chat()
  const contatos = await BackendService.listar('/chat-contatos')
  const contato = contatos.find((c) => c.codigo === contatoAberto)
  expect(colapsar(await p.textoDe('chatconversa_texto_contato')).toLowerCase()).toBe(colapsar(nomeDoContato(contato)).toLowerCase())
  const mensagens = await BackendService.listar(`/chat/${contatoAberto}?limite=100`)
  const codigosApi = new Set(mensagens.map((m) => m.codigo))
  const ids = await p.idsNaOrdemVisual('^chatconversa_mensagem_[0-9]+$')
  expect(ids.length).toBeGreaterThanOrEqual(1)
  for (const id of ids) expect(codigosApi.has(Number(id.split('_').pop()))).toBe(true)
  // A mensagem mais nova da API está na tela (a lista abre no fim).
  const maisNova = [...mensagens].sort((a, b) => b.codigo - a.codigo)[0]
  await expect(p.porTag(`chatconversa_mensagem_${maisNova.codigo}`)).toBeDisplayed()
})

Then('o teclado está fechado', async function () {
  // Dá tempo de o foco automático (se existisse) abrir o teclado, sem espera fixa.
  await driver.waitUntil(async () => (await chat().contar('chatconversa_campo_mensagem')) === 1, { timeout: 10000 })
  await driver.pause(1500) // janela de observação de "nunca": um teclado que subisse sozinho apareceria aqui
  expect(await driver.isKeyboardShown()).toBe(false)
})

Then('o botão de enviar está desabilitado com o campo vazio', async function () {
  expect(await chat().estaHabilitado('chatconversa_botao_enviar')).toBe(false)
})

When('digito {string} no campo de mensagem sem enviar', async function (texto) {
  await chat().preencher('chatconversa_campo_mensagem', texto)
  await driver.waitUntil(async () => driver.isKeyboardShown(), { timeout: 10000, timeoutMsg: 'timed out while waiting for the keyboard' })
})

Then('o botão de enviar está habilitado e o campo de mensagem fica acima do teclado', async function () {
  const p = chat()
  expect(await p.estaHabilitado('chatconversa_botao_enviar')).toBe(true)
  const campo = BasePage.limites(await p.atributo('chatconversa_campo_mensagem', 'bounds'))
  // O teclado aparece com atraso depois do toque no campo, e o nó do Gboard não entra na árvore do app: o topo vem do
  // inset do teclado no `dumpsys window` (visto ao vivo: `type=ime frame=[0,1517][1080,2400] visible=true`).
  await driver.waitUntil(async () => (await topoDoTecladoPorInsets(driver)) < Infinity, { timeout: 10000, timeoutMsg: 'timed out while waiting for the keyboard to appear' })
  const topoTeclado = await topoDoTecladoPorInsets(driver)
  expect(topoTeclado).toBeLessThan(Infinity) // o teclado está mesmo aberto
  expect(campo.b).toBeLessThanOrEqual(topoTeclado) // o campo não é coberto pelo teclado
})

// ---- T-010: disponibilidade ---------------------------------------------------------------------------

let disponibilidadeInicial
const textoDaChave = (d) => (d === 'ocupado' ? 'Ocupado' : 'Disponível')

Then('a chave de disponibilidade mostra o estado da API', async function () {
  const p = chat()
  await p.aguardarCarregar()
  disponibilidadeInicial = (await BackendService.eu()).disponibilidade
  expect(disponibilidadeInicial).not.toBeNull() // o usuário de teste é atendente
  // Este cenário não é @leitura (app recém-limpo): a chave só aparece depois que a 1ª sincronização traz a
  // disponibilidade do usuário (`ServicoSincronizacao.disponibilidade`) — vista ausente aos 10 s na 1ª rodada.
  await p.esperarVisivel('app_chave_disponibilidade', 60000)
  expect(await p.textoDe('app_texto_disponibilidade')).toBe(textoDaChave(disponibilidadeInicial))
  expect(await p.estaMarcado('app_switch_disponibilidade')).toBe(disponibilidadeInicial === 'disponivel')
})

When('toco na chave de disponibilidade', async function () {
  BackendService.registrarDisponibilidadeOriginal(disponibilidadeInicial) // a limpeza devolve, passe ou falhe
  await chat().tocar('app_switch_disponibilidade')
})

Then('a API reflete a disponibilidade invertida e o texto da chave muda', async function () {
  const invertida = disponibilidadeInicial === 'disponivel' ? 'ocupado' : 'disponivel'
  await driver.waitUntil(async () => (await BackendService.eu()).disponibilidade === invertida, { timeout: 15000, timeoutMsg: `timed out while waiting for the API availability to become ${invertida}` })
  await driver.waitUntil(async () => (await chat().textoDe('app_texto_disponibilidade')) === textoDaChave(invertida), { timeout: 10000 })
})

Then('a API volta à disponibilidade original e o texto da chave volta', async function () {
  await driver.waitUntil(async () => (await BackendService.eu()).disponibilidade === disponibilidadeInicial, { timeout: 15000, timeoutMsg: 'timed out while waiting for the API availability to return' })
  await driver.waitUntil(async () => (await chat().textoDe('app_texto_disponibilidade')) === textoDaChave(disponibilidadeInicial), { timeout: 10000 })
})

Then('a bolinha de disponibilidade dos contatos visíveis reflete a API', async function () {
  const p = chat()
  await p.aguardarCarregar()
  const contatos = await BackendService.listar('/chat-contatos')
  const porCodigo = new Map(contatos.map((c) => [c.codigo, c]))
  const ids = (await p.idsNaOrdemVisual(ITEM)).slice(0, 6)
  expect(ids.length).toBeGreaterThanOrEqual(1)
  const vistos = new Set()
  for (const id of ids) {
    const codigo = Number(id.split('_').pop())
    const rotulo = `chat_item_${codigo}_indicador_disponibilidade`
    // O estado tem que estar na árvore por id (content-desc): disponível | ocupado | sem estado.
    const desc = (await p.atributo(rotulo, 'content-desc')).toLowerCase()
    const esperado = { disponivel: 'dispon', ocupado: 'ocupad' }[porCodigo.get(codigo).disponibilidade] ?? ''
    if (esperado) expect(desc).toContain(esperado)
    vistos.add(porCodigo.get(codigo).disponibilidade ?? 'nenhum')
  }
  expect(vistos.size).toBeGreaterThanOrEqual(1)
})

// T-041 (a): num app recém-limpo a chave aparece em poucos segundos (o app consulta `GET /funcionarios/eu` ao abrir o Chat).
Then('a chave de disponibilidade aparece em até {int} segundos e mostra o estado da API', async function (limite) {
  const p = chat()
  const inicio = Date.now()
  await p.esperarVisivel('app_chave_disponibilidade', limite * 1000)
  console.log(`TEMPO até a chave de disponibilidade aparecer (app recém-limpo): ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
  const disponibilidade = (await BackendService.eu()).disponibilidade
  expect(disponibilidade).not.toBeNull() // o usuário de teste é atendente
  expect(await p.textoDe('app_texto_disponibilidade')).toBe(textoDaChave(disponibilidade))
  expect(await p.estaMarcado('app_switch_disponibilidade')).toBe(disponibilidade === 'disponivel')
})

// ---- T-010: limite do campo e mensagem pendente --------------------------------------------------------------------------------

When('digito {int} caracteres no campo de mensagem sem enviar', async function (quantos) {
  await chat().preencher('chatconversa_campo_mensagem', 'a'.repeat(quantos))
})

When('digito {int} emojis no campo de mensagem sem enviar', async function (quantos) {
  await chat().preencher('chatconversa_campo_mensagem', '😀'.repeat(quantos))
})

Then('o campo de mensagem guarda exatamente {int} caracteres', async function (esperado) {
  expect([...(await chat().textoDe('chatconversa_campo_mensagem'))].length).toBe(esperado)
})

Then('o campo de mensagem guarda exatamente {int} emojis', async function (esperado) {
  const texto = await chat().textoDe('chatconversa_campo_mensagem')
  expect([...texto].length).toBe(esperado)
  expect([...texto].every((c) => c === '😀')).toBe(true) // só emoji: nenhum caractere perdido ou trocado
})

When('toco em Enviar na conversa', async function () {
  await chat().fecharTecladoSeAberto()
  await chat().tocar('chatconversa_botao_enviar')
})

Then('a conversa mostra uma mensagem pendente de envio', async function () {
  await driver.waitUntil(async () => (await chat().idsNaOrdemVisual('^chatconversa_pendente_[0-9]+$')).length >= 1, { timeout: 20000, timeoutMsg: 'timed out while waiting for the pending-send bubble (chatconversa_pendente_<i>)' })
})
