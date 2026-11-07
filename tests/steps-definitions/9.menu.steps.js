import { When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { BasePage } from '../pages/BasePage.js'
import { MenuPage, OPCOES_MENU_LATERAL } from '../pages/9.menuPage.js'
import { RelatorioPage } from '../pages/3.relatorioPage.js'
import { BackendService } from '../services/BackendService.js'
import {
  arquivoDoApp, semRestricaoDeBateria, versaoInstalada, zerarQuadros, lerQuadros, maiorSaltoDeQuadros, limparLogcat, linhasDoLogDoApp,
} from '../support/dispositivo.js'
import { agoraSP, mesAnoAtual } from '../support/dataPtBr.js'
import { loadEnv } from '../support/loadEnv.js'
import { resetarEstadoDoApp, abrirApp } from '../support/appLifecycle.js'
import { nomePropio } from '../support/nomePropio.js'
import { capturar } from '../support/visual.js'

let menu
const tela = () => { menu = new MenuPage(driver); return menu }
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const norm = (s) => semAcento(s).toLowerCase().replace(/\s+/g, ' ').trim()
const contagem = async (m, tag) => Number(/\((\d+)\)/.exec(await m.rotuloDe(tag))?.[1])

const OPCAO = {
  'Aniversários': 'aniversarios', 'Configurações': 'configuracoes', Sobre: 'sobre', Ajuda: 'ajuda',
}

When('abro o menu lateral', async function () {
  await tela().abrirMenuLateral()
})

Then('vejo o título e as opções do menu lateral', async function () {
  await expect(menu.porTag('menulateral_modal')).toBeDisplayed()
  await expect(menu.porTag('menulateral_titulo')).toBeDisplayed()
  // Todas as opções do inventário vigente (app §11.4): Sair é a única destrutiva (vermelha).
  for (const tag of Object.values(OPCOES_MENU_LATERAL)) {
    await expect(menu.porTag(tag)).toBeDisplayed()
  }
})

When(/^abro (Aniversários|Configurações|Sobre|Ajuda) pelo menu lateral$/, async function (nome) {
  const m = tela()
  // Já pode estar com o menu aberto? Não: cada abertura parte da tela de Visitas.
  await m.abrirMenuLateral()
  await m.escolherOpcao(OPCAO[nome])
})

// ---- Aniversários ---------------------------------------------------------------------------

const aniversariosDoMes = (mes) => BackendService.listar(`/relatorios/aniversarios/mes/${mes}`)

Then('vejo o mês atual, as abas com a contagem do mês e os filtros conforme a API', async function () {
  const { mes } = agoraSP()
  const naApi = await aniversariosDoMes(mes)
  expect(naApi.length).toBeGreaterThanOrEqual(1)
  await menu.esperarVisivel('aniversarios_texto_titulo')
  expect((await menu.textoDe('aniversarios_texto_mes_ano')).toLowerCase()).toBe(mesAnoAtual().toLowerCase())
  expect(await contagem(menu, 'aniversarios_aba_prescritores')).toBe(naApi.filter((x) => x.tipo === 1).length)
  expect(await contagem(menu, 'aniversarios_aba_secretarias')).toBe(naApi.filter((x) => x.tipo === 2).length)
  await expect(menu.porTag('aniversarios_filtro_hoje')).toBeDisplayed()
  await expect(menu.porTag('aniversarios_filtro_todos')).toBeDisplayed()
  // Lista ou estado vazio do filtro "Hoje" — exatamente um dos dois, nunca erro.
  await driver.waitUntil(async () => (await menu.contar('aniversarios_indicador_carregando')) === 0, { timeout: 30000 })
  expect((await menu.contar('aniversarios_lista')) + (await menu.contar('aniversarios_icone_estado_vazio'))).toBe(1)
  expect(await menu.contar('aniversarios_texto_erro')).toBe(0)
})

When('volto um mês em Aniversários', async function () {
  const antes = await menu.textoDe('aniversarios_texto_mes_ano')
  await menu.tocar('aniversarios_navegador_mes_anterior')
  await driver.waitUntil(async () => (await menu.textoDe('aniversarios_texto_mes_ano')) !== antes, { timeout: 10000, timeoutMsg: 'timed out while waiting for the month to change' })
  await driver.waitUntil(async () => (await menu.contar('aniversarios_indicador_carregando')) === 0, { timeout: 30000 })
})

Then('vejo o mês anterior e a contagem das abas conforme a API', async function () {
  const { ano, mes } = agoraSP()
  const mesAnterior = mes === 1 ? 12 : mes - 1
  const anoAnterior = mes === 1 ? ano - 1 : ano
  expect(await menu.textoDe('aniversarios_texto_mes_ano')).toBe(`${MESES[mesAnterior - 1]} ${anoAnterior}`)
  const naApi = await aniversariosDoMes(mesAnterior)
  expect(naApi.length).toBeGreaterThanOrEqual(1)
  expect(await contagem(menu, 'aniversarios_aba_prescritores')).toBe(naApi.filter((x) => x.tipo === 1).length)
  expect(await contagem(menu, 'aniversarios_aba_secretarias')).toBe(naApi.filter((x) => x.tipo === 2).length)
})

When('escolho o filtro Todos em Aniversários', async function () {
  await menu.tocar('aniversarios_filtro_todos')
  await driver.waitUntil(async () => (await menu.contar('aniversarios_lista')) === 1, { timeout: 15000, timeoutMsg: 'timed out while waiting for the birthdays list' })
})

Then('os primeiros aniversariantes estão na ordem de dia e nome conforme a API', async function () {
  const { mes, dia } = agoraSP()
  const prescritores = (await aniversariosDoMes(mes)).filter((x) => x.tipo === 1)
  // No mês corrente o 2º filtro é "Próximos": de hoje em diante primeiro, os que já passaram no fim.
  const porDiaNome = (a, b) => a.dia - b.dia || norm(a.nome).localeCompare(norm(b.nome))
  const proximos = prescritores.filter((x) => x.dia >= dia).sort(porDiaNome)
  const passados = prescritores.filter((x) => x.dia < dia).sort(porDiaNome)
  const esperados = [...proximos, ...passados].slice(0, 5).map((x) => x.codigo)
  const ids = await menu.idsNaOrdemVisual('^aniversarios_item_1_[0-9]+$')
  expect(ids.slice(0, 5).map((id) => Number(id.split('_').pop()))).toEqual(esperados)
})

// ---- Configurações ------------------------------------------------------------------------------

Then('vejo as linhas de Configurações com os textos esperados', async function () {
  await menu.esperarVisivel('configuracoes_texto_titulo')
  expect(await menu.textoDe('configuracoes_tema_texto_titulo')).toBe('Tema escuro')
  expect(await menu.textoDe('configuracoes_tema_texto_estado')).toMatch(/^Desligado — tema claro/)
  expect(await menu.textoDe('configuracoes_bateria_texto_titulo')).toBe('Bateria sem restrições')
  expect(await menu.textoDe('configuracoes_notificacoes_texto_titulo').then((s) => s.toUpperCase())).toBe('NOTIFICAÇÕES')
  expect(await menu.textoDe('configuracoes_registro_erros_texto_titulo')).toBe('Registro de erros')
  for (const tag of ['tema', 'bateria']) await expect(menu.porTag(`configuracoes_${tag}_linha`)).toBeDisplayed()
})

When('ligo o tema escuro', async function () {
  await menu.tocar('configuracoes_tema_linha')
})

Then('o tema escuro está ligado e o texto de estado mudou', async function () {
  await driver.waitUntil(async () => menu.estaMarcado('configuracoes_tema_linha'), { timeout: 10000, timeoutMsg: 'timed out while waiting for the dark theme switch to turn on' })
  expect(await menu.textoDe('configuracoes_tema_texto_estado')).toMatch(/^Ligado/)
})

When('desligo o tema escuro', async function () {
  await menu.tocar('configuracoes_tema_linha')
})

Then('o tema escuro está desligado e o texto de estado voltou', async function () {
  await driver.waitUntil(async () => !(await menu.estaMarcado('configuracoes_tema_linha')), { timeout: 10000, timeoutMsg: 'timed out while waiting for the dark theme switch to turn off' })
  expect(await menu.textoDe('configuracoes_tema_texto_estado')).toMatch(/^Desligado — tema claro/)
})

Then('a chave de bateria reflete a lista de apps sem restrição do sistema', async function () {
  // Fonte da verdade: o `deviceidle whitelist` do Android — o app só espelha.
  const noSistema = await semRestricaoDeBateria(driver)
  expect(await menu.estaMarcado('configuracoes_bateria_linha')).toBe(noSistema)
})

Then('o registro de erros mostra a explicação e o app ainda não tem arquivo de erros', async function () {
  // A linha mostra sempre a explicação fixa; o "Ainda não há erros" vem como aviso ao tocar.
  expect(await menu.textoDe('configuracoes_registro_erros_texto_estado')).toMatch(/^Guarda os erros do servidor e do app/)
  expect(await arquivoDoApp(driver, 'files/logs/erros.log')).toBe('') // reset completo: sem erros ainda
})

When('toco na linha do registro de erros', async function () {
  await menu.tocar('configuracoes_registro_erros_linha')
})

Then('vejo o aviso {string}', async function (texto) {
  await menu.esperarVisivel('app_aviso_texto')
  expect(await menu.textoDe('app_aviso_texto')).toBe(texto)
})

// ---- Notificações (T-009) ---------------------------------------------------------------------

const CHAVES = {
  todas: 'Todas as notificações',
  chat: 'Mensagens novas do chat',
  resumodia: 'Resumo do dia (7h)',
  lembrete: 'Lembrete de visita (30 min antes)',
  ponto: 'Lembrete de ponto (15 min antes)',
  servico: 'Ocultar aviso fixo do serviço',
  gravacao: 'Gravação de áudio',
}
const FILHAS = ['chat', 'resumodia', 'lembrete', 'ponto', 'gravacao']

When('expando as Notificações', async function () {
  await menu.tocar('configuracoes_notificacoes_cabecalho')
  await menu.esperarVisivel('configuracoes_notificacoes_conteudo')
})

Then('vejo as sete chaves de notificação com título e estado', async function () {
  for (const [chave, titulo] of Object.entries(CHAVES)) {
    expect(await menu.textoDe(`configuracoes_notificacoes_${chave}_texto_titulo`)).toBe(titulo)
    await expect(menu.porTag(`configuracoes_notificacoes_${chave}_linha`)).toBeDisplayed()
    // "Ocultar aviso fixo" não tem texto de estado próprio (inventário do app §11.22).
    if (chave !== 'servico') expect((await menu.textoDe(`configuracoes_notificacoes_${chave}_texto_estado`)).length).toBeGreaterThan(0)
  }
})

Then('cada chave individual alterna, muda o texto de estado e volta ao valor original', async function () {
  for (const chave of FILHAS) {
    const sw = `configuracoes_notificacoes_${chave}_linha`
    const est = `configuracoes_notificacoes_${chave}_texto_estado`
    const marcadoAntes = await menu.estaMarcado(sw)
    const estadoAntes = await menu.textoDe(est)
    await menu.tocar(sw)
    await driver.waitUntil(async () => (await menu.estaMarcado(sw)) !== marcadoAntes, { timeout: 10000, timeoutMsg: `timed out while waiting for ${chave} to toggle` })
    expect(await menu.textoDe(est)).not.toBe(estadoAntes)
    await menu.tocar(sw)
    await driver.waitUntil(async () => (await menu.estaMarcado(sw)) === marcadoAntes, { timeout: 10000, timeoutMsg: `timed out while waiting for ${chave} to return` })
    expect(await menu.textoDe(est)).toBe(estadoAntes)
  }
})

Then('a chave Todas desliga todas as filhas e ao religar elas voltam', async function () {
  const todas = 'configuracoes_notificacoes_todas_linha'
  const antes = {}
  for (const chave of FILHAS) antes[chave] = await menu.estaMarcado(`configuracoes_notificacoes_${chave}_linha`)
  expect(await menu.estaMarcado(todas)).toBe(true) // reset completo: tudo ligado de fábrica
  await menu.tocar(todas)
  await driver.waitUntil(async () => !(await menu.estaMarcado(todas)), { timeout: 10000, timeoutMsg: 'timed out while waiting for "Todas" to turn off' })
  for (const chave of FILHAS) expect(await menu.estaMarcado(`configuracoes_notificacoes_${chave}_linha`)).toBe(false)
  await menu.tocar(todas)
  await driver.waitUntil(async () => menu.estaMarcado(todas), { timeout: 10000, timeoutMsg: 'timed out while waiting for "Todas" to turn on' })
  for (const chave of FILHAS) expect(await menu.estaMarcado(`configuracoes_notificacoes_${chave}_linha`)).toBe(antes[chave])
})

// ---- Sobre ------------------------------------------------------------------------------------

Then('vejo a licença, o suporte, o desenvolvedor e a versão conforme a API e o aparelho', async function () {
  const sobre = await BackendService.obter('/sobre')
  await menu.esperarVisivel('sobre_texto_licenca_nome')
  expect(await menu.textoDe('sobre_texto_licenca_nome')).toBe(sobre.licenca.nome)
  expect(await menu.textoDe('sobre_texto_licenca_cnpj')).toBe(sobre.licenca.cnpjFormatado)
  expect(await menu.textoDe('sobre_link_email')).toBe(sobre.suporte.email)
  expect(await menu.textoDe('sobre_link_telefone')).toBe(sobre.suporte.telefone)
  expect(await menu.textoDe('sobre_texto_desenvolvido_por')).toBe(sobre.desenvolvidoPor)
  expect(await menu.textoDe('sobre_texto_versao')).toBe(`Versão ${await versaoInstalada(driver)}`)
  expect((await menu.textoDe('sobre_texto_produto')).toUpperCase()).toContain('VISITA MÉDICA')
  expect(await menu.contar('sobre_texto_offline')).toBe(0)
  expect(await menu.contar('sobre_texto_erro')).toBe(0)
})

Then('vejo a licença da cópia do aparelho e o aviso de offline', async function () {
  const sobre = await BackendService.obter('/sobre') // o host tem rede; o aparelho não
  await menu.esperarVisivel('sobre_texto_offline')
  expect(await menu.textoDe('sobre_texto_licenca_nome')).toBe(sobre.licenca.nome)
  expect(await menu.textoDe('sobre_texto_licenca_cnpj')).toBe(sobre.licenca.cnpjFormatado)
  expect(await menu.contar('sobre_texto_erro')).toBe(0)
})

// ---- Ajuda ------------------------------------------------------------------------------------

Then('vejo os contatos de suporte e comercial com os horários de atendimento', async function () {
  await menu.esperarVisivel('ajuda_texto_titulo')
  expect(await menu.textoDe('ajuda_texto_horario_semana')).toBe('Segunda a sexta, das 7h às 19h')
  expect(await menu.textoDe('ajuda_texto_horario_sabado')).toBe('Sábado, das 7h às 12h')
  expect(await menu.rotuloDe('ajuda_link_telefone')).toContain('(62) 3412-4400')
  expect(await menu.rotuloDe('ajuda_link_email')).toContain('@')
  await expect(menu.porTag('ajuda_botao_whatsapp')).toBeDisplayed()
})

When('toco no botão do WhatsApp', async function () {
  await menu.tocar('ajuda_botao_whatsapp')
})

When('toco no telefone de contato', async function () {
  await menu.tocar('ajuda_link_telefone')
})

When('toco no e-mail de contato', async function () {
  await menu.tocar('ajuda_link_email')
})

Then('o app sai de cena para outro aplicativo', async function () {
  await driver.waitUntil(async () => (await driver.getCurrentPackage()) !== 'com.example.medvisit', { timeout: 15000, timeoutMsg: 'timed out while waiting for another app to come to the foreground' })
})

When('volto para o app', async function () {
  await driver.execute('mobile: activateApp', { appId: 'com.example.medvisit' })
})

Then('vejo a tela de Ajuda', async function () {
  await menu.esperarVisivel('ajuda_texto_titulo')
})

// ---- Pendências ---------------------------------------------------------------------------------

When('abro as Pendências de envio pelo ícone de sincronização', async function () {
  await tela().tocar('visitas_icone_sync')
  await menu.esperarVisivel('pendencias_texto_titulo')
})

Then('vejo o resumo com a conexão e as contagens e o estado vazio', { timeout: 200000 }, async function () {
  // T-033: o cartão de situação tem o resumo (conexão + última sincronização) e os contadores à parte.
  const resumo = await menu.textoDe('pendencias_texto_resumo')
  expect(resumo).toMatch(/^(Com|Sem) conexão · última sincronização \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
  expect(await menu.textoDe('pendencias_contador_pendentes')).toBe('0')
  expect(await menu.textoDe('pendencias_contador_recusadas')).toBe('0')
  expect(await menu.textoDe('pendencias_texto_estado_vazio')).toBe('Tudo enviado — nada pendente no aparelho.')
  await expect(menu.porTag('pendencias_botao_sincronizar')).toBeDisplayed()
  // Logo ao abrir a tela sincroniza e o botão fica desabilitado (T-033, visto na 1ª rodada ao vivo): espera
  // habilitar em vez de ler o estado no 1º quadro — o botão tem que voltar a ficar habilitado sozinho.
  await driver.waitUntil(async () => menu.estaHabilitado('pendencias_botao_sincronizar'), { timeout: 150000, interval: 500, timeoutMsg: 'timed out while waiting for the sync button to enable' })
})

// Timeout próprio: depois de um app recém-limpo a 1ª sincronização deixa o botão desabilitado por 85–95 s (medido, A-007).
When('toco em Sincronizar agora', { timeout: 200000 }, async function () {
  // Logo ao abrir, a tela pode estar sincronizando (botão desabilitado — T-033): espera habilitar.
  const aberturaEm = Date.now()
  await driver.waitUntil(async () => menu.estaHabilitado('pendencias_botao_sincronizar'), { timeout: 150000, interval: 500, timeoutMsg: 'timed out while waiting for the sync button to enable' })
  console.log(`TEMPO até o botão habilitar ao abrir Pendências: ${Math.round((Date.now() - aberturaEm) / 1000)} s`)
  const inicioEspera = Date.now()
  await menu.tocar('pendencias_botao_sincronizar')
  // Medição (T-039/Q-004): quanto o botão fica "Sincronizando…" depois do toque — o número vai ao app.
  await driver.waitUntil(async () => menu.estaHabilitado('pendencias_botao_sincronizar'), { timeout: 150000, interval: 500, timeoutMsg: 'timed out while waiting for the sync to finish' })
  console.log(`TEMPO sincronizar agora: ${Math.round((Date.now() - inicioEspera) / 1000)} s`)
})

Then('a hora da última sincronização foi atualizada', async function () {
  // Feedback amigável do catálogo (docs/MENSAGENS_AO_USUARIO.md): "Tudo em dia: nada pendente de envio." (T-007).
  await menu.esperarVisivel('app_aviso_texto', 20000)
  expect(await menu.textoDe('app_aviso_texto')).toBe('Tudo em dia: nada pendente de envio.')
  expect(await menu.contar('app_aviso_sucesso')).toBe(1)
})

// ---- Sair e botões -------------------------------------------------------------------------------

Then('vejo o aviso {string} e a tela de login', async function (texto) {
  await menu.esperarVisivel('app_aviso_texto')
  expect(await menu.textoDe('app_aviso_texto')).toBe(texto)
  expect(await menu.contar('app_aviso_info')).toBe(1)
  await menu.esperarVisivel('login_campo_cnpj')
})

When('abro o formulário de Agendar visita', async function () {
  const m = tela()
  await m.tocar('visitas_fab_nova_visita')
  await m.esperarVisivel('novavisita_modal')
  await m.tocar('novavisita_opcao_agendar')
  await m.esperarVisivel('visitaform_botao_salvar')
})

Then('o botão principal do formulário segue a altura padrão de 54 dp', async function () {
  const salvar = await menu.alturaDp('visitaform_botao_salvar')
  // Padrão do app (AGENTS §13 do app, T-019): botão de largura total = 54 dp. (T-032: o pop-up
  // Nova visita não tem mais o botão Cancelar.)
  expect(Math.round(salvar)).toBe(54)
})

// ---- T-031: Aniversários em nome próprio -----------------------------------------------------------------

Then('os nomes dos aniversariantes seguem a regra de nome próprio conforme a API', async function () {
  const { mes } = agoraSP()
  const naApi = (await aniversariosDoMes(mes)).filter((x) => x.tipo === 1)
  const porCodigo = new Map(naApi.map((x) => [x.codigo, x]))
  const ids = (await menu.idsNaOrdemVisual('^aniversarios_item_1_[0-9]+_texto_nome$')).slice(0, 6)
  expect(ids.length).toBeGreaterThanOrEqual(3)
  let transformados = 0
  for (const id of ids) {
    const api = porCodigo.get(Number(id.split('_')[3]))
    const base = api.nome.replace(/\s+/g, ' ').trim()
    const esperado = nomePropio(base)
    expect((await menu.textoDe(id)).replace(/\s+/g, ' ').trim()).toBe(esperado)
    if (esperado !== base) transformados += 1
  }
  expect(transformados).toBeGreaterThanOrEqual(1)
  await capturar(driver, 'lista-aniversarios-negrito')
})

// ---- T-036 (5): primeiro elemento no mesmo lugar ----------------------------------------------------------

const posicoes = new Map()
When('guardo a posição do elemento {string}', async function (tag) {
  const m = tela()
  await m.esperarVisivel(tag)
  posicoes.set(tag, BasePage.limites(await m.atributo(tag, 'bounds')))
})

// O menu lateral só abre a partir de Visitas: Locais é medido primeiro e a seta de voltar devolve a Visitas, de onde
// a barra inferior leva às demais telas.
When('volto da tela de Locais de atendimento', async function () {
  const m = tela()
  await m.tocar('locaisatendimento_botao_voltar')
  await m.esperarVisivel('visitas_menu_hamburguer')
})

Then('os três campos de busca têm o mesmo bounds e o seletor de visão está centrado na mesma altura', async function () {
  const busca = ['prescritores_campo_busca', 'chat_campo_busca', 'locaisatendimento_campo_busca'].map((t) => posicoes.get(t))
  for (const b of busca) expect(b).toBeDefined()
  const [ref, ...demais] = busca
  // esquerda, topo, direita e base iguais (campo de 56 dp, margem e respiro). A falha lista as posições lidas.
  const tags = ['prescritores_campo_busca', 'chat_campo_busca', 'locaisatendimento_campo_busca']
  const diferentes = tags.filter((t) => JSON.stringify(posicoes.get(t)) !== JSON.stringify(ref))
  if (diferentes.length > 0) throw new Error(`campos de busca em lugares diferentes (T-036 5): ${tags.map((t) => `${t}=${JSON.stringify(posicoes.get(t))}`).join(' | ')}`)
  expect(demais.length).toBe(2)
  const visao = posicoes.get('relatorios_visao_texto')
  expect(visao).toBeDefined()
  const centro = (b) => (b.t + b.b) / 2
  // O texto do seletor tem a altura do texto, não a do contêiner de 56 dp da busca (visto 10,5 px de diferença no centro
  // com o seletor alinhado): tolera 12 px (4 dp) — a posição do CAMPO já foi provada por `bounds` iguais acima.
  expect(Math.abs(centro(visao) - centro(ref))).toBeLessThanOrEqual(12)
})

// T-039: o aviso de fim some em 3–5 s; o 2º toque só prova algo se o 1º aviso já saiu.
When('espero o aviso sumir', async function () {
  await driver.waitUntil(async () => (await tela().contar('app_aviso_texto')) === 0, { timeout: 15000, timeoutMsg: 'timed out while waiting for the notice to disappear' })
})

// ---- T-041 (b): Sincronizar agora num app recém-limpo -------------------------------------------------------

Then('o botão Sincronizar agora habilita em até {int} segundos', { timeout: 120000 }, async function (limite) {
  const inicio = Date.now()
  await driver.waitUntil(async () => tela().estaHabilitado('pendencias_botao_sincronizar'), {
    timeout: limite * 1000, interval: 500, timeoutMsg: `timed out while waiting for the sync button to enable within ${limite} s (T-041 b: eram 84–93 s)`,
  })
  console.log(`TEMPO até o botão habilitar (app recém-limpo): ${Math.round((Date.now() - inicio) / 1000)} s`)
})

// ---- T-042: abas da barra já com o dado (RAM na frente do SQLite) ------------------------------------------------

// `marcador` = o que prova a aba com conteúdo; `indicador` = a bolinha de carregamento da tela. `emRam` = a aba tem cópia na
// RAM (T-042: visitas, 1ª página de prescritores, contatos do chat, ponto de hoje) e por isso NÃO pode passar pela bolinha;
// Relatórios (Minha semana) busca na API a cada abertura e a bolinha ali é esperada — dela só se mede o tempo.
const ABAS_DA_BARRA = [
  { barra: 'prescritores', marcador: 'prescritores_lista', indicador: 'prescritores_indicador_carregando', emRam: true },
  { barra: 'chat', marcador: 'chat_lista', indicador: 'chat_indicador_carregando', emRam: true },
  { barra: 'ponto', marcador: 'registroponto_texto_entrada', indicador: 'registroponto_indicador_carregando', emRam: true },
  { barra: 'relatorios', marcador: 'relatorios_semana_texto_totais', indicador: 'relatorios_semana_indicador_carregando', emRam: false },
  { barra: 'visitas', marcador: 'visitas_lista', indicador: 'visitas_indicador_carregando', emRam: true },
]
let medicoesDeAba = []

// Toca na aba e lê o dump em sequência até o marcador aparecer (ou 5 s): guarda o tempo e se a bolinha chegou a aparecer.
const medirAba = async (m, { barra, marcador, indicador, emRam }) => {
  const inicio = Date.now()
  await m.irPelaBarraInferior(barra)
  let viuIndicador = false
  while (Date.now() - inicio < 5000) {
    const xml = await driver.getPageSource()
    const temMarcador = xml.includes(`resource-id="${marcador}"`)
    // A bolinha só conta quando TOMA o lugar do conteúdo (dump com o indicador e sem o marcador): com o conteúdo na tela ela é
    // só a revalidação em segundo plano, não a "tela em branco que depois carrega" que o T-042 corrige.
    if (!temMarcador && xml.includes(`resource-id="${indicador}"`)) viuIndicador = true
    if (temMarcador) return { barra, ms: Date.now() - inicio, viuIndicador, emRam }
  }
  return { barra, ms: null, viuIndicador, emRam }
}

When('toco nas cinco abas da barra inferior em {int} volta(s) medindo o tempo até o conteúdo', { timeout: 240000 }, async function (voltas) {
  const m = tela()
  // A lista de Visitas só existe com visita no dia: sem ela a aba mostraria o estado vazio e a prova não valeria (R-AFP).
  const { ano, mes, dia } = agoraSP()
  const pad = (n) => String(n).padStart(2, '0')
  const hoje = `${ano}-${pad(mes)}-${pad(dia)}`
  if (!(await BackendService.listar('/visitas')).some((v) => v.dataVisita === hoje)) {
    await BackendService.criarVisitaDeTesteHoje(await BackendService.horarioLivreHoje(), 'abas da barra (T-042)')
  }
  medicoesDeAba = []
  await limparLogcat(driver)
  await zerarQuadros(driver)
  for (let volta = 0; volta < voltas; volta += 1) {
    for (const aba of ABAS_DA_BARRA) medicoesDeAba.push(await medirAba(m, aba))
  }
})

Then('em toda aba o conteúdo apareceu em até {int} segundos e as abas com cópia local não passaram pelo indicador de carregamento', async function (limite) {
  console.log(`TEMPOS das abas: ${medicoesDeAba.map((x) => `${x.barra}=${x.ms ?? 'nunca'}ms${x.viuIndicador ? '+indicador' : ''}`).join(' ')}`)
  expect(medicoesDeAba.length).toBeGreaterThanOrEqual(ABAS_DA_BARRA.length)
  // Abas com cópia local: conteúdo obrigatório, dentro do limite e sem a bolinha. Relatórios (sem cópia, vive da API): só o
  // limite de tempo quando o conteúdo aparece — sem rede ele não aparece e isso não é defeito do T-042 (o online é o `3.15`).
  const falhas = medicoesDeAba.filter((x) => (x.emRam
    ? x.ms === null || x.ms > limite * 1000 || x.viuIndicador
    : x.ms !== null && x.ms > limite * 1000))
  if (falhas.length > 0) {
    throw new Error(`abas sem o conteúdo no 1º quadro (T-042 a): ${falhas.map((x) => `${x.barra} (${x.ms === null ? 'conteúdo nunca apareceu' : `${x.ms} ms`}${x.viuIndicador ? ', com indicador de carregamento' : ''})`).join(' | ')}`)
  }
})

Then('a troca de abas teve menos de {int}% de quadros lentos e nenhum salto acima de {int} quadros', async function (limitePct, limiteSalto) {
  const quadros = await lerQuadros(driver)
  const maior = await maiorSaltoDeQuadros(driver)
  console.log(`FLUIDEZ: ${quadros.janky}/${quadros.total} quadros lentos (${quadros.percentual.toFixed(1)} %); maior "Skipped N frames" = ${maior}`)
  expect(quadros.total).toBeGreaterThan(0) // a medição existe (R-AFP)
  expect(quadros.percentual).toBeLessThan(limitePct)
  expect(maior).toBeLessThanOrEqual(limiteSalto)
})

// Repouso (T-042 c): a RAM desce 60 s depois de o app sair da tela. Espera pelo LOG que prova isso, não por tempo fixo.
When('envio o app para segundo plano até a RAM ser liberada e volto', { timeout: 240000 }, async function () {
  await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
  await driver.waitUntil(async () => (await linhasDoLogDoApp(driver, /RAM das c[óo]pias liberada/i)).length > 0, {
    timeout: 150000, interval: 2000, timeoutMsg: 'timed out while waiting for the app to release the RAM after the rest (T-042 c)',
  })
  await driver.execute('mobile: activateApp', { appId: loadEnv().app.appPackage })
})

Then('o log do app registra a RAM liberada e depois aquecida', async function () {
  await driver.waitUntil(async () => {
    const linhas = await linhasDoLogDoApp(driver, /RAM das c[óo]pias (liberada|aquecida)/i)
    const liberada = linhas.findIndex((l) => /liberada/i.test(l))
    return liberada >= 0 && linhas.slice(liberada + 1).some((l) => /aquecida/i.test(l))
  }, { timeout: 30000, interval: 1000, timeoutMsg: 'timed out while waiting for the "RAM aquecida" log after the rest (T-042 c)' })
})

// ---- T-045: pré-carga em segundo plano e estabilização das abas -----------------------------------------------------

// A pré-carga (downloads antecipados) roda DEPOIS da sincronização, em segundo plano, e termina sem sinal na tela: o sinal é o
// logcat — nenhuma chamada HTTP nova do app durante 20 s seguidos (condição de saída, não espera fixa; teto de 4 min).
When('espero a pré-carga em segundo plano terminar', { timeout: 300000 }, async function () {
  let ultimo = -1
  let desde = Date.now()
  await driver.waitUntil(async () => {
    const atual = (await linhasDoLogDoApp(driver, /HTTP (GET|PUT|POST|DELETE) /)).length
    if (atual !== ultimo) { ultimo = atual; desde = Date.now() }
    return Date.now() - desde >= 20000
  }, { timeout: 240000, interval: 1000, timeoutMsg: 'timed out while waiting for the background pre-load to settle (HTTP calls never went quiet for 20 s)' })
})

// Só as voltas a partir da 2ª: a 1ª pode usar o SQLite enquanto a pré-carga ainda roda (T-045 b).
Then('a partir da 2ª volta as abas com cópia local abriram em até {int} segundos sem passar pelo indicador de carregamento', async function (limite) {
  const doRestoDasVoltas = medicoesDeAba.slice(ABAS_DA_BARRA.length) // descarta a 1ª volta
  console.log(`TEMPOS das abas (a partir da 2ª volta): ${doRestoDasVoltas.map((x) => `${x.barra}=${x.ms ?? 'nunca'}ms${x.viuIndicador ? '+indicador' : ''}`).join(' ')}`)
  expect(doRestoDasVoltas.length).toBeGreaterThanOrEqual(ABAS_DA_BARRA.length) // há ao menos uma volta depois da 1ª
  const falhas = doRestoDasVoltas.filter((x) => x.emRam && (x.ms === null || x.ms > limite * 1000 || x.viuIndicador))
  if (falhas.length > 0) throw new Error(`abas com cópia local que ainda passaram pela bolinha depois da 1ª volta (T-045 b): ${falhas.map((x) => `${x.barra} (${x.ms ?? 'nunca'} ms${x.viuIndicador ? ', com indicador' : ''})`).join(' | ')}`)
})

// ---- T-048 (c): controle — com rede o tempo todo nenhum aviso offline aparece ----------------------------------------------

const AVISOS_OFFLINE = [
  'registroponto_texto_offline', 'chat_texto_offline', 'secretarias_texto_offline', 'locaisatendimento_texto_offline',
  'relatorios_texto_offline', 'relatorios_semana_texto_offline',
]

// "Nunca aparece" pede janela de observação (R-AFP): lê o dump por 2 s depois de a tela abrir (o marcador de conteúdo prova que
// ela abriu) e nenhum `*_texto_offline` pode estar nele.
const semAvisoOfflineNaTela = async (nome, marcador) => {
  await new BasePage(driver).esperarVisivel(marcador, 20000)
  const fim = Date.now() + 2000
  while (Date.now() < fim) {
    const xml = await driver.getPageSource()
    const achados = AVISOS_OFFLINE.filter((tag) => xml.includes(`resource-id="${tag}"`))
    if (achados.length > 0) throw new Error(`aviso offline apareceu COM rede na tela ${nome}: ${achados.join(', ')} (T-048 c)`)
  }
}

Then('nenhuma tela mostra o aviso offline porque há rede', { timeout: 300000 }, async function () {
  const m = tela()
  const rel = new RelatorioPage(driver)
  await m.irPelaBarraInferior('chat'); await semAvisoOfflineNaTela('Chat', 'chat_texto_titulo')
  await m.irPelaBarraInferior('ponto'); await semAvisoOfflineNaTela('Ponto', 'registroponto_texto_titulo')
  await m.irPelaBarraInferior('relatorios')
  for (const visao of ['semana', 'prescritor', 'especialidade']) {
    await rel.irParaVisao(visao)
    await semAvisoOfflineNaTela(`Relatórios (${visao})`, 'relatorios_visao_texto')
  }
  await m.irPelaBarraInferior('visitas'); await semAvisoOfflineNaTela('Visitas', 'visitas_texto_titulo')
  await m.abrirMenuLateral(); await m.escolherOpcao('secretarias')
  await semAvisoOfflineNaTela('Secretárias', 'secretarias_texto_titulo')
  await driver.back()
  await m.esperarVisivel('visitas_texto_titulo')
  await m.abrirMenuLateral(); await m.escolherOpcao('locais')
  await semAvisoOfflineNaTela('Locais', 'locaisatendimento_texto_titulo')
})

// ---- T-004 / T-017: rotação travada ---------------------------------------------------------------------------------------------

// `driver.setOrientation` falha com "Screen rotation cannot be changed" justamente porque o app trava a orientação: o pedido de
// rotação vai direto ao sistema (`user_rotation=1`, giro automático desligado). O aparelho volta ao original SEMPRE (mesmo se a
// asserção falhar no passo seguinte): a restauração roda no `Then`, em `finally`.
let rotacaoOriginal = null
When('giro o aparelho para paisagem', async function () {
  const ler = async (chave) => String(await driver.execute('mobile: shell', { command: 'settings', args: ['get', 'system', chave] })).trim()
  rotacaoOriginal = { automatica: await ler('accelerometer_rotation'), usuario: await ler('user_rotation') }
  await driver.execute('mobile: shell', { command: 'settings', args: ['put', 'system', 'accelerometer_rotation', '0'] })
  await driver.execute('mobile: shell', { command: 'settings', args: ['put', 'system', 'user_rotation', '1'] })
})

Then('a tela de Visitas continua em retrato e à vista', async function () {
  try {
    const visitas = new BasePage(driver)
    await visitas.esperarVisivel('visitas_texto_titulo')
    // Asserção de "nunca" (AGENTS §1): janela de observação de 3 s em que a janela do app tem de seguir em retrato a cada leitura.
    const limite = Date.now() + 3000
    let leituras = 0
    while (Date.now() < limite) {
      const { width, height } = await driver.getWindowSize()
      expect(height).toBeGreaterThan(width)
      leituras += 1
      await driver.pause(300)
    }
    expect(leituras).toBeGreaterThanOrEqual(3)
    await expect(visitas.porTag('visitas_texto_titulo')).toBeDisplayed()
  } finally {
    if (rotacaoOriginal) {
      await driver.execute('mobile: shell', { command: 'settings', args: ['put', 'system', 'user_rotation', rotacaoOriginal.usuario === 'null' ? '0' : rotacaoOriginal.usuario] }).catch(() => {})
      await driver.execute('mobile: shell', { command: 'settings', args: ['put', 'system', 'accelerometer_rotation', rotacaoOriginal.automatica === 'null' ? '0' : rotacaoOriginal.automatica] }).catch(() => {})
      rotacaoOriginal = null
    }
  }
})

// ---- T-009: diálogos de 1ª abertura (notificações e bateria) -------------------------------------------------------------------

// Na 1ª abertura de verdade o app ainda não tem a permissão de notificações: o reset da suíte a concede (para não parar no diálogo
// do sistema), então aqui ela é revogada de novo — sem isso só a recomendação de bateria aparece.
When('apago os dados do app e abro o app como na primeira vez', async function () {
  await resetarEstadoDoApp(driver)
  await driver.execute('mobile: changePermissions', { action: 'revoke', appPackage: loadEnv().app.appPackage, permissions: ['android.permission.POST_NOTIFICATIONS'] })
  await abrirApp(driver)
})

const recomendacao = async (prefixo, confirmar, cancelar) => {
  const base = new BasePage(driver)
  await base.esperarVisivel(`${prefixo}_dialogo`, 30000)
  expect((await base.rotuloDe(`${prefixo}_botao_confirmar`)).toLowerCase()).toBe(confirmar.toLowerCase())
  expect((await base.rotuloDe(`${prefixo}_botao_cancelar`)).toLowerCase()).toBe(cancelar.toLowerCase())
}

Then('vejo a recomendação de notificações com as opções {string} e {string}', async function (confirmar, cancelar) {
  await recomendacao('recomendacao_notificacao', confirmar, cancelar)
})

When('escolho Agora não na recomendação de notificações', async function () {
  await new BasePage(driver).tocar('recomendacao_notificacao_botao_cancelar')
})

Then('vejo o aviso de que as notificações podem ser ativadas depois e confirmo', async function () {
  const base = new BasePage(driver)
  await base.esperarVisivel('recomendacao_notificacao_lembrete_dialogo')
  await base.tocar('recomendacao_notificacao_lembrete_botao_confirmar')
})

Then('vejo a recomendação de bateria com as opções {string} e {string}', async function (confirmar, cancelar) {
  await recomendacao('recomendacao_bateria', confirmar, cancelar)
})

When('escolho Agora não na recomendação de bateria', async function () {
  await new BasePage(driver).tocar('recomendacao_bateria_botao_cancelar')
})

Then('vejo o aviso de bateria e confirmo', async function () {
  const base = new BasePage(driver)
  await base.esperarVisivel('recomendacao_bateria_lembrete_dialogo')
  await base.tocar('recomendacao_bateria_lembrete_botao_confirmar')
})

// ---- T-014: Pendências com a operação da fila ------------------------------------------------------------------------------------

Then('as Pendências listam uma operação pendente com tipo, estado, descrição e data de criação', async function () {
  const base = new BasePage(driver)
  await base.esperarVisivel('pendencias_lista', 20000)
  expect(await base.textoDe('pendencias_contador_pendentes')).toBe('1')
  // O id da operação é um UUID (`pendencias_item_<uuid>`), não um número.
  const itens = await base.idsNaOrdemVisual('^pendencias_item_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  expect(itens).toHaveLength(1)
  const [item] = itens
  expect((await base.textoDe(`${item}_texto_tipo`)).trim().length).toBeGreaterThan(0)
  // O estado ("Sem conexão", "Pendente"…) está no content-desc do selo: "Envio: Sem conexão".
  expect(await base.atributo(`${item}_badge_estado`, 'content-desc')).toMatch(/^Envio: (pendente|sem conex|aguardando)/i)
  expect((await base.textoDe(`${item}_texto_descricao`)).trim().length).toBeGreaterThan(0)
  expect(await base.textoDe(`${item}_texto_criada`)).toMatch(/^Criada em /i)
})
