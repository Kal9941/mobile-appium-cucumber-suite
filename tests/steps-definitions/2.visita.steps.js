import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { BasePage } from '../pages/BasePage.js'
import { VisitaPage } from '../pages/2.visitaPage.js'
import { BackendService } from '../services/BackendService.js'
import { reiniciarSemLimpar, resetarEstadoDoApp } from '../support/appLifecycle.js'
import { agoraSP, mesAnoAtual, minutosDoDia, MESES } from '../support/dataPtBr.js'
import {
  definirRelogio, definirVelocidadeDaRede, limparLogcat, contarChamadasHttp, linhasChamadasHttp, restaurarRede,
} from '../support/dispositivo.js'
import { nomePropio } from '../support/nomePropio.js'
import { capturar } from '../support/visual.js'

// Abas de status na ordem passado → futuro (app §11.3, 2026-10-12); o rótulo
// vira tag em minúsculo, com acento.
const ABAS_STATUS = ['concluída', 'pendente', 'hoje', 'agendada', 'todos']
const ITENS_BARRA_INFERIOR = ['prescritores', 'registroponto', 'visitas', 'relatorios', 'chat']

let visitaPage

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
// Compara nomes sem depender de caixa, acento ou espaço duplicado (o app mostra "Nome Próprio").
const norm = (s) => semAcento(s).toLowerCase().replace(/\s+/g, ' ').trim()
const chave = (v) => `${v.dataVisita} ${v.horaVisita}`

When('aguardo a tela de Visitas carregar', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.aguardarCarregar()
})

Then('vejo a casca da tela de Visitas com o mês atual, as abas de status e a lista ou o estado vazio', async function () {
  // Arrange/Assert: casca fixa.
  await expect(visitaPage.tituloText()).toBeDisplayed()
  await expect(visitaPage.menuHamburguer()).toBeDisplayed()
  await expect(visitaPage.fabNovaVisita()).toBeDisplayed()
  await expect(visitaPage.porTag('visitas_icone_sync')).toBeDisplayed()
  for (const aba of ABAS_STATUS) {
    await expect(visitaPage.porTag(`visitas_aba_${aba}`)).toBeDisplayed()
  }
  for (const item of ITENS_BARRA_INFERIOR) {
    await expect(visitaPage.porTag(`visitas_bottomnav_${item}`)).toBeDisplayed()
  }

  // Informação correta: navegador de mês no mês/ano de hoje, em pt-BR fixo.
  const mesAno = await visitaPage.textoDe('visitas_texto_mes_ano')
  expect(mesAno.toLowerCase()).toBe(mesAnoAtual().toLowerCase())

  // Conteúdo: a aba Hoje mostra a lista OU o estado vazio — exatamente um dos dois.
  const lista = await visitaPage.contar('visitas_lista')
  const vazio = await visitaPage.contar('visitas_icone_estado_vazio')
  expect(lista + vazio).toBe(1)
  expect(await visitaPage.contar('visitas_texto_erro')).toBe(0)
})

// ---- T-020 / T-021 / T-023 ------------------------------------------------------------------

When(/^abro a aba (Todos|Hoje|Agendada|Pendente|Concluída) de Visitas$/, async function (aba) {
  visitaPage = new VisitaPage(driver)
  await visitaPage.aguardarTela()
  await visitaPage.abrirAba(aba.toLowerCase())
})

When('reinicio o app sem limpar os dados', async function () {
  await reiniciarSemLimpar(driver)
  visitaPage = new VisitaPage(driver)
  await visitaPage.aguardarTela()
})

Given('que existem visitas de teste hoje às 07:00 e às 23:30', async function () {
  // Massa conhecida nos extremos do dia; a limpeza (cancelar) é automática no `afterScenario`.
  await BackendService.criarVisitaDeTesteHoje('07:00', 'ordem Hoje (T-021)')
  await BackendService.criarVisitaDeTesteHoje('23:30', 'ordem Hoje (T-021)')
})

Then('todos os cartões visíveis mostram prescritor, local e bairro conforme a API', async function () {
  const todas = await BackendService.listar('/visitas')
  const porCodigo = new Map(todas.map((v) => [v.codigo, v]))
  // Depois da sincronização inicial NENHUM cartão pode ficar com "Prescritor #<código>" (T-020).
  await driver.waitUntil(async () => {
    const codigos = await visitaPage.codigosNaOrdemVisual()
    if (codigos.length === 0) return false
    for (const c of codigos) {
      if (/^Prescritor #\d+$/.test(await visitaPage.prescritorDe(c))) return false
    }
    return true
  }, { timeout: 240000, interval: 2000, timeoutMsg: 'timed out while waiting for the visit cards to show prescriber names (still "Prescritor #…")' })

  const codigos = await visitaPage.codigosNaOrdemVisual()
  expect(codigos.length).toBeGreaterThanOrEqual(1)
  for (const c of codigos) {
    const v = porCodigo.get(c)
    const prescritor = await BackendService.obter(`/prescritores/${v.codigoMedico}`)
    expect(norm(await visitaPage.prescritorDe(c))).toBe(norm(prescritor.nomemedico))
    if (v.codigoLocalAtendimento) {
      const local = await BackendService.obter(`/locais-atendimento/${v.codigoLocalAtendimento}`)
      const texto = await visitaPage.localDe(c)
      // "Nome · Bairro": o nome vem da API; o bairro (região detalhe) não pode faltar quando o local tem um — local sem região
      // (`codigo_regiaodetalhe` nulo, ex.: o "Teste Backend Novo" criado pela sessão do backend em 2026-10-24) mostra só o nome.
      const [nome, bairro] = texto.split(' · ')
      expect(norm(nome)).toBe(norm(local.nomeatendimento))
      if (local.codigo_regiaodetalhe) expect((bairro ?? '').trim().length).toBeGreaterThan(0)
      else expect(bairro).toBeUndefined()
    }
  }
})

Then('os cartões já mostram os nomes no primeiro quadro da lista', async function () {
  // 2º login (cópias locais prontas): no instante em que o 1º cartão aparece, o nome já está lá.
  await driver.waitUntil(async () => (await visitaPage.contar('visitas_indicador_carregando')) === 0
    && (await visitaPage.codigosNaOrdemVisual()).length > 0, { timeout: 30000, interval: 100, timeoutMsg: 'timed out while waiting for the first visit card' })
  for (const c of await visitaPage.codigosNaOrdemVisual()) {
    expect(await visitaPage.prescritorDe(c)).not.toMatch(/^Prescritor #\d+$/)
    expect((await visitaPage.localDe(c)).trim().length).toBeGreaterThan(0)
  }
})

Then('a aba Hoje mostra as visitas de hoje em ordem crescente de hora conforme a API', async function () {
  const { ano, mes, dia } = agoraSP()
  const pad = (n) => String(n).padStart(2, '0')
  const hoje = `${ano}-${pad(mes)}-${pad(dia)}`
  const todas = await BackendService.listar('/visitas')
  const deHoje = todas.filter((v) => v.dataVisita === hoje)
  // Arrange provado: a massa de teste (07:00 e 23:30) + qualquer outra de hoje.
  expect(deHoje.filter((v) => v.statusVisita !== 3).length).toBeGreaterThanOrEqual(2)

  await visitaPage.abrirAba('hoje')
  const naTela = await visitaPage.codigosNaOrdemVisual()
  expect(naTela.length).toBeGreaterThanOrEqual(2)
  // A lista é preguiçosa (só os cartões visíveis existem na árvore) e mostra também cancelados de testes
  // antigos: prova-se a ORDEM dos visíveis — a hora (lida da API) só cresce de cima para baixo.
  const porCodigo = new Map(deHoje.map((v) => [v.codigo, v]))
  for (const c of naTela) expect(porCodigo.has(c)).toBe(true) // todo cartão de Hoje é visita de hoje na API
  const horas = naTela.map((c) => porCodigo.get(c).horaVisita)
  expect([...horas].sort()).toEqual(horas)
  // O topo da lista tem a menor hora de hoje (a lista mostra também os cancelados de rodadas antigas,
  // que empatam com a de teste às 07:00 — por isso a prova é pela HORA, não pelo código da visita de teste).
  const menorHora = deHoje.map((v) => v.horaVisita).sort()[0]
  expect(horas[0]).toBe(menorHora)
})

Given('que existem duas visitas de teste agendadas nos próximos dias', async function () {
  // A aba Agendada só prova ordem com 2+ visitas (R-AFP); a massa é própria e cancelada no `afterScenario`.
  await BackendService.criarVisitaDeTeste({ dias: 1, hora: '08:00', rotulo: 'ordem Agendada (T-021)' })
  await BackendService.criarVisitaDeTeste({ dias: 2, hora: '09:00', rotulo: 'ordem Agendada (T-021)' })
})

Then('cada aba lista as visitas na ordem esperada conforme a API', async function () {
  visitaPage = new VisitaPage(driver)
  const todas = await BackendService.listar('/visitas')
  const porCodigo = new Map(todas.map((v) => [v.codigo, v]))
  const regras = [['concluída', 'desc'], ['pendente', 'desc'], ['todos', 'desc'], ['agendada', 'asc']]
  const provadas = []
  for (const [aba, sentido] of regras) {
    await visitaPage.abrirAba(aba)
    const chaves = (await visitaPage.codigosNaOrdemVisual()).map((c) => chave(porCodigo.get(c)))
    if (chaves.length < 2) continue // aba com 0-1 visita não prova ordem — não conta como prova
    const ordenado = [...chaves].sort()
    expect(chaves).toEqual(sentido === 'asc' ? ordenado : ordenado.reverse())
    provadas.push(aba)
  }
  // A ordem tem que ter sido PROVADA em pelo menos Todos e Agendada (massa real do mês) — anti falso-positivo.
  expect(provadas).toEqual(expect.arrayContaining(['todos', 'agendada']))
})

// ---- Nova visita, formulários, detalhe e pop-ups (T-004, T-025, T-026, T-028, T-029, T-002) ----------

let visitaDeTeste
let totalAntes
const colapsar = (s) => s.replace(/\s+/g, ' ').trim()
const pad2 = (n) => String(n).padStart(2, '0')
const dataBR = (iso) => iso.split('-').reverse().join('/')

When('toco no botão + de Visitas', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.tocar('visitas_fab_nova_visita')
})

Then('vejo o modal Nova visita com as opções Iniciar e Agendar e sem botão Cancelar', async function () {
  await visitaPage.esperarVisivel('novavisita_modal')
  expect((await visitaPage.textoDe('novavisita_titulo')).toUpperCase()).toBe('NOVA VISITA')
  for (const tag of ['novavisita_opcao_iniciar', 'novavisita_opcao_agendar']) {
    await expect(visitaPage.porTag(tag)).toBeDisplayed()
  }
  // T-032: cada opção é um cartão com rótulo e linha de apoio; o botão Cancelar foi removido.
  expect((await visitaPage.rotuloDe('novavisita_opcao_iniciar')).toLowerCase()).toContain('começar agora')
  expect((await visitaPage.rotuloDe('novavisita_opcao_agendar')).toLowerCase()).toContain('marcar para outro dia')
  expect(await visitaPage.contar('novavisita_botao_cancelar')).toBe(0)
})

When('fecho o modal Nova visita com o botão voltar do sistema', async function () {
  await driver.back()
})

Then('o modal Nova visita fecha e vejo a tela de Visitas', async function () {
  await driver.waitUntil(async () => (await visitaPage.contar('novavisita_modal')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the new-visit modal to close' })
  await expect(visitaPage.tituloText()).toBeDisplayed()
})

When('abro o formulário de Iniciar visita', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.tocar('visitas_fab_nova_visita')
  await visitaPage.esperarVisivel('novavisita_modal')
  await visitaPage.tocar('novavisita_opcao_iniciar')
  await visitaPage.esperarVisivel('visitaform_botao_salvar')
})

Then('vejo os campos do formulário Agendar com a data de hoje, a hora vazia e as quatro repetições', async function () {
  const { ano, mes, dia } = agoraSP()
  expect((await visitaPage.textoDe('visitaagendar_texto_titulo')).toUpperCase()).toBe('AGENDAR VISITA')
  for (const tag of ['campo_prescritor', 'campo_local', 'campo_data', 'icone_calendario', 'campo_hora', 'icone_relogio', 'campo_historico', 'campo_observacaomedico', 'botao_salvar']) {
    await expect(visitaPage.porTag(`visitaform_${tag}`)).toBeDisplayed()
  }
  expect(await visitaPage.textoDe('visitaform_campo_data')).toBe(`${pad2(dia)}/${pad2(mes)}/${ano}`)
  // Agendar: a hora nasce vazia (o campo mostra só o rótulo "Hora (HH:MM)", sem valor digitado).
  expect(await visitaPage.textoDe('visitaform_campo_hora')).not.toMatch(/^\d{2}:\d{2}$/)
  for (const chip of ['nenhuma', 'semanal', 'quinzenal', 'a_cada_30_dias']) {
    await expect(visitaPage.porTag(`visitaform_repetir_${chip}`)).toBeDisplayed()
  }
})

Then('vejo os campos do formulário Iniciar com a data de hoje e a hora de agora', async function () {
  const { ano, mes, dia } = agoraSP()
  expect((await visitaPage.textoDe('visitainiciar_texto_titulo')).toUpperCase()).toBe('INICIAR VISITA')
  for (const tag of ['campo_prescritor', 'campo_local', 'campo_data', 'campo_hora', 'campo_historico', 'campo_observacaomedico', 'botao_salvar']) {
    await expect(visitaPage.porTag(`visitaform_${tag}`)).toBeDisplayed()
  }
  expect(await visitaPage.textoDe('visitaform_campo_data')).toBe(`${pad2(dia)}/${pad2(mes)}/${ano}`)
  const hora = await visitaPage.textoDe('visitaform_campo_hora')
  expect(hora).toMatch(/^\d{2}:\d{2}$/)
  const [h, m] = hora.split(':').map(Number)
  const diferenca = Math.abs(h * 60 + m - minutosDoDia())
  expect(Math.min(diferenca, 1440 - diferenca)).toBeLessThanOrEqual(2)
  // Iniciar não tem repetição (só agendar).
  expect(await visitaPage.contar('visitaform_repetir_nenhuma')).toBe(0)
})

When('toco em Salvar no formulário de visita', async function () {
  totalAntes = (await BackendService.listar('/visitas')).length
  await visitaPage.fecharTecladoSeAberto()
  await visitaPage.tocar('visitaform_botao_salvar')
})

Then('vejo o pop-up Iniciar a visita agora com Iniciar e Voltar', async function () {
  await visitaPage.esperarVisivel('visitaform_iniciar_dialogo')
  expect((await visitaPage.rotuloDe('visitaform_iniciar_botao_confirmar')).toLowerCase()).toBe('iniciar')
  expect((await visitaPage.rotuloDe('visitaform_iniciar_botao_cancelar')).toLowerCase()).toBe('voltar')
})

When('confirmo o pop-up de iniciar do formulário', async function () {
  await visitaPage.tocar('visitaform_iniciar_botao_confirmar')
})

Then('vejo a mensagem {string} e nenhuma visita nova na API', async function (mensagem) {
  await visitaPage.esperarVisivel('visitaform_texto_erro')
  expect(await visitaPage.textoDe('visitaform_texto_erro')).toBe(mensagem)
  expect((await BackendService.listar('/visitas')).length).toBe(totalAntes)
})

When('digito {string} no histórico da visita', async function (texto) {
  await visitaPage.preencher('visitaform_campo_historico', texto)
})

When('toco na seta de voltar do formulário', async function () {
  await visitaPage.fecharTecladoSeAberto()
  const voltar = (await visitaPage.contar('visitaagendar_botao_voltar')) > 0 ? 'visitaagendar_botao_voltar' : 'visitainiciar_botao_voltar'
  await visitaPage.tocar(voltar)
})

// Passo compartilhado com 6/7/8 (formulários de prescritor, secretária e local): lá nenhum passo de Visitas
// inicializou `visitaPage`, então ele nasce aqui (só usa métodos do BasePage).
Then('vejo o pop-up Descartar alterações com Continuar e Descartar', async function () {
  visitaPage ??= new VisitaPage(driver)
  await visitaPage.esperarVisivel('descartar_dialogo')
  expect((await visitaPage.rotuloDe('descartar_botao_cancelar')).toLowerCase()).toBe('continuar')
  expect((await visitaPage.rotuloDe('descartar_botao_confirmar')).toLowerCase()).toBe('descartar')
})

When('escolho Continuar', async function () {
  await visitaPage.tocar('descartar_botao_cancelar')
})

Then('o pop-up fecha e continuo no formulário com o texto digitado', async function () {
  await driver.waitUntil(async () => (await visitaPage.contar('descartar_dialogo')) === 0, { timeout: 10000 })
  expect(await visitaPage.textoDe('visitaform_campo_historico')).toBe('rascunho de teste')
})

When('escolho Descartar', async function () {
  visitaPage ??= new VisitaPage(driver)
  await visitaPage.tocar('descartar_botao_confirmar')
})

Then('volto para a tela de Visitas', async function () {
  await visitaPage.aguardarTela()
  expect(await visitaPage.contar('visitaform_botao_salvar')).toBe(0)
})

Then('volto para a tela de Visitas sem pop-up', async function () {
  await visitaPage.aguardarTela()
  expect(await visitaPage.contar('descartar_dialogo')).toBe(0)
})

// ---- detalhe da visita de teste -------------------------------------------------------------------

Given('que existe uma visita de teste hoje às 07:00', async function () {
  visitaDeTeste = await BackendService.criarVisitaDeTesteHoje('07:00', 'detalhe/pop-ups (T-025/T-026)')
})

Given('que existe uma visita de teste amanhã às 08:00', async function () {
  visitaDeTeste = await BackendService.criarVisitaDeTeste({ dias: 1, hora: '08:00', rotulo: 'virada do dia (T-002)' })
})

When('abro o detalhe da visita de teste', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.aguardarTela()
  await visitaPage.abrirDetalheDaAbaHoje(visitaDeTeste.codigo)
})

Then('o detalhe mostra código, data, hora, prescritor, local e histórico conforme a API', async function () {
  const v = await BackendService.obter(`/visitas/${visitaDeTeste.codigo}`)
  const prescritor = await BackendService.obter(`/prescritores/${v.codigoMedico}`)
  const local = await BackendService.obter(`/locais-atendimento/${v.codigoLocalAtendimento}`)
  expect(await visitaPage.textoDe('visitadetalhe_texto_codigo')).toBe(`#${v.codigo}`)
  expect(await visitaPage.textoDe('visitadetalhe_campo_data')).toBe(dataBR(v.dataVisita))
  expect(await visitaPage.textoDe('visitadetalhe_campo_hora')).toBe(v.horaVisita)
  expect(colapsar(await visitaPage.textoDe('visitadetalhe_texto_prescritor'))).toBe(colapsar(nomePropio(colapsar(prescritor.nomemedico))))
  expect(colapsar((await visitaPage.textoDe('visitadetalhe_texto_local')).split(' · ')[0])).toBe(colapsar(nomePropio(colapsar(local.nomeatendimento))))
  expect((await visitaPage.textoDe('visitadetalhe_campo_historico')).trim()).toBe(v.historico.trim())
  // Visita agendada com versão: reagendar, iniciar e cancelar disponíveis.
  for (const tag of ['botao_salvar', 'botao_iniciar', 'botao_cancelar', 'botao_reagendar', 'botao_alterar_local']) {
    await expect(visitaPage.porTag(`visitadetalhe_${tag}`)).toBeDisplayed()
  }
})

When('toco em Cancelar visita no detalhe', async function () {
  await visitaPage.tocar('visitadetalhe_botao_cancelar')
  await visitaPage.esperarVisivel('visitadetalhe_cancelar_dialogo')
})

Then('o pop-up de cancelar tem Cancelar visita e Voltar com a mesma altura e o confirmar desabilitado', async function () {
  expect((await visitaPage.rotuloDe('visitadetalhe_cancelar_botao_confirmar')).toLowerCase()).toBe('cancelar visita')
  expect((await visitaPage.rotuloDe('visitadetalhe_cancelar_botao_cancelar')).toLowerCase()).toBe('voltar')
  const a = await visitaPage.alturaDp('visitadetalhe_cancelar_botao_confirmar')
  const b = await visitaPage.alturaDp('visitadetalhe_cancelar_botao_cancelar')
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1) // pílulas sempre da mesma altura (T-026)
  expect(await visitaPage.estaHabilitado('visitadetalhe_cancelar_botao_confirmar')).toBe(false) // sem motivo
})

When('digito o motivo {string} no pop-up', async function (motivo) {
  const el = await visitaPage.esperarVisivel('visitadetalhe_cancelar_campo_motivo')
  await el.click()
  await el.setValue(motivo)
  // Sem `fecharTecladoSeAberto`: o BACK do `hideKeyboard` fecha o pop-up inteiro (visto na 1ª rodada ao vivo,
  // o detalhe voltou sem o pop-up). O confirmar tem que estar alcançável com o teclado aberto.
})

Then('o botão de confirmar o cancelamento fica habilitado', async function () {
  await driver.waitUntil(async () => visitaPage.estaHabilitado('visitadetalhe_cancelar_botao_confirmar'), { timeout: 10000, timeoutMsg: 'timed out while waiting for the confirm button to enable' })
})

When('escolho Voltar no pop-up de cancelar', async function () {
  await visitaPage.tocar('visitadetalhe_cancelar_botao_cancelar')
})

Then('o pop-up fecha e a visita de teste continua agendada na API', async function () {
  await driver.waitUntil(async () => (await visitaPage.contar('visitadetalhe_cancelar_dialogo')) + (await visitaPage.contar('visitadetalhe_iniciar_dialogo')) === 0, { timeout: 10000 })
  expect((await BackendService.obter(`/visitas/${visitaDeTeste.codigo}`)).statusVisita).toBe(0)
})

When('toco em Iniciar no detalhe da visita', async function () {
  await visitaPage.tocar('visitadetalhe_botao_iniciar')
  await visitaPage.esperarVisivel('visitadetalhe_iniciar_dialogo')
})

Then('o pop-up de iniciar tem Iniciar e Voltar com a mesma altura', async function () {
  expect((await visitaPage.rotuloDe('visitadetalhe_iniciar_botao_confirmar')).toLowerCase()).toBe('iniciar')
  expect((await visitaPage.rotuloDe('visitadetalhe_iniciar_botao_cancelar')).toLowerCase()).toBe('voltar')
  const a = await visitaPage.alturaDp('visitadetalhe_iniciar_botao_confirmar')
  const b = await visitaPage.alturaDp('visitadetalhe_iniciar_botao_cancelar')
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1)
})

When('escolho Voltar no pop-up de iniciar', async function () {
  await visitaPage.tocar('visitadetalhe_iniciar_botao_cancelar')
})

// ---- T-028: nome próprio; T-029: negrito (visual) -------------------------------------------------

Then('os nomes de prescritor e local dos cartões seguem a regra de nome próprio conforme a API', async function () {
  const todas = await BackendService.listar('/visitas')
  const porCodigo = new Map(todas.map((x) => [x.codigo, x]))
  await driver.waitUntil(async () => (await visitaPage.codigosNaOrdemVisual()).length > 0, { timeout: 30000 })
  let transformados = 0
  const conferidos = new Set()
  const conferirVisiveis = async () => {
    let novos = 0
    for (const c of await visitaPage.codigosNaOrdemVisual()) {
      if (conferidos.has(c)) continue
      // Cartão cortado na borda da tela: o container existe mas os textos ainda não estão visíveis — fica para a próxima rolagem.
      const textoVisivel = async (tag) => (await driver.$$(`android=new UiSelector().resourceId("${tag}")`)).length > 0
        && (await driver.$(`android=new UiSelector().resourceId("${tag}")`).isDisplayed())
      if (!(await textoVisivel(`visitas_item_${c}_texto_prescritor`)) || !(await textoVisivel(`visitas_item_${c}_texto_local`))) continue
      conferidos.add(c)
      novos += 1
      const v = porCodigo.get(c)
      const prescritor = await BackendService.obter(`/prescritores/${v.codigoMedico}`)
      const esperadoP = colapsar(nomePropio(colapsar(prescritor.nomemedico)))
      expect(colapsar(await visitaPage.prescritorDe(c))).toBe(esperadoP)
      if (esperadoP !== colapsar(prescritor.nomemedico)) transformados += 1
      if (v.codigoLocalAtendimento) {
        const local = await BackendService.obter(`/locais-atendimento/${v.codigoLocalAtendimento}`)
        const nomeLocal = colapsar((await visitaPage.localDe(c)).split(' · ')[0])
        expect(nomeLocal).toBe(colapsar(nomePropio(colapsar(local.nomeatendimento))))
      }
    }
    return novos
  }
  await conferirVisiveis()
  // O cenário usa a aba Concluída (visitas reais; a massa de teste é cancelada/agendada e não entra nela). Se mesmo assim nenhum
  // nome à vista for transformado pela regra (CAIXA ALTA da API), rola um pouco (no máximo 8 rolagens) antes de reprovar.
  let semNovos = 0
  for (let i = 0; i < 8 && transformados < 1 && semNovos < 3; i += 1) {
    await visitaPage.arrastar('visitas_lista', 'up', 0.4, 700)
    semNovos = (await conferirVisiveis()) === 0 ? semNovos + 1 : 0
  }
  // Anti falso-positivo: a regra foi de fato exercitada (ao menos um nome da API em CAIXA ALTA mudou).
  expect(transformados).toBeGreaterThanOrEqual(1)
})

Then('o cartão mostra o nome do prescritor acima do local e o quadro fica salvo para conferência', async function () {
  await driver.waitUntil(async () => (await visitaPage.codigosNaOrdemVisual()).length > 0, { timeout: 30000 })
  const c = (await visitaPage.codigosNaOrdemVisual())[0]
  const topoPrescritor = BasePage.limites(await visitaPage.atributo(`visitas_item_${c}_texto_prescritor`, 'bounds')).t
  const topoLocal = BasePage.limites(await visitaPage.atributo(`visitas_item_${c}_texto_local`, 'bounds')).t
  expect(topoPrescritor).toBeLessThan(topoLocal)
  // Quadro lido por mim (`Read`) — o peso da fonte não existe na árvore de UI.
  await capturar(driver, 'cartao-prescritor-negrito')
})

// ---- T-002: virada do dia -----------------------------------------------------------------------

Then('a visita de teste de amanhã não aparece na aba Hoje', async function () {
  expect(await visitaPage.contar(`visitas_item_${visitaDeTeste.codigo}`)).toBe(0)
})

When('envio o app para segundo plano e adianto o relógio em um dia', async function () {
  await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
  await definirRelogio(driver, new Date(Date.now() + 24 * 3600 * 1000))
})

Then('a visita de teste aparece na aba Hoje sem eu sair da tela', async function () {
  // A lista de Hoje é preguiçosa e traz os cancelados de rodadas antigas (a visita das 08:00 fica abaixo da dobra):
  // rola até o cartão ficar visível em vez de só contar nós na árvore.
  await driver.waitUntil(async () => {
    try { await visitaPage.rolarAteCartaoVisivel(visitaDeTeste.codigo); return true } catch { return false }
  }, {
    timeout: 120000, interval: 500, timeoutMsg: 'timed out while waiting for tomorrow\'s visit to show in "Hoje" after the day rolled over',
  })
  await expect(visitaPage.tituloText()).toBeDisplayed()
})

// ---- T-030: rede lenta --------------------------------------------------------------------------

Given('que a rede do aparelho está lenta', async function () {
  definirVelocidadeDaRede('edge')
})

// ---- seletores do formulário (T-013) ----------------------------------------------------------------------

When('abro o seletor de prescritor do formulário de visita', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.tocar('visitaform_campo_prescritor')
  await visitaPage.esperarVisivel('visitaform_prescritor_lista')
})

Then('o seletor de prescritor mostra os vinculados a mim com busca, filtros e lápis conforme a API', async function () {
  const { codigos } = await BackendService.obter('/prescritores/vinculados-a-mim')
  await expect(visitaPage.porTag('visitaform_prescritor_campo_busca')).toBeDisplayed()
  await expect(visitaPage.porTag('visitaform_prescritor_filtro_meus')).toBeDisplayed()
  await expect(visitaPage.porTag('visitaform_prescritor_filtro_todos')).toBeDisplayed()
  const ids = await visitaPage.idsNaOrdemVisual('^visitaform_prescritor_item_[0-9]+$')
  expect(ids.length).toBeGreaterThanOrEqual(1)
  for (const id of ids) {
    const codigo = Number(id.split('_').pop())
    expect(codigos).toContain(codigo) // filtro padrão "Meus": só vinculados a mim
    await expect(visitaPage.porTag(`visitaform_prescritor_item_${codigo}_botao_editar`)).toBeDisplayed() // lápis (T-013)
  }
})

When('abro o seletor de local do formulário de visita', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.tocar('visitaform_campo_local')
  await visitaPage.esperarVisivel('visitaform_local_lista')
})

Then('o seletor de local mostra locais da API com busca e lápis de edição', async function () {
  const todos = new Set((await BackendService.listar('/locais-atendimento')).map((l) => l.codigo))
  await expect(visitaPage.porTag('visitaform_local_campo_busca')).toBeDisplayed()
  const ids = await visitaPage.idsNaOrdemVisual('^visitaform_local_item_[0-9]+$')
  expect(ids.length).toBeGreaterThanOrEqual(1)
  for (const id of ids) {
    const codigo = Number(id.split('_').pop())
    expect(todos.has(codigo)).toBe(true)
    await expect(visitaPage.porTag(`visitaform_local_item_${codigo}_botao_editar`)).toBeDisplayed()
  }
})

let prescritorEscolhido
let localEscolhido
const escolherPrimeiroPrescritorELocal = async () => {
  visitaPage = new VisitaPage(driver)
  await visitaPage.tocar('visitaform_campo_prescritor')
  await visitaPage.esperarVisivel('visitaform_prescritor_lista')
  const idP = (await visitaPage.idsNaOrdemVisual('^visitaform_prescritor_item_[0-9]+$'))[0]
  prescritorEscolhido = Number(idP.split('_').pop())
  await visitaPage.tocar(idP)
  await visitaPage.esperarVisivel('visitaform_botao_salvar')
  await visitaPage.tocar('visitaform_campo_local')
  await visitaPage.esperarVisivel('visitaform_local_lista')
  const idL = (await visitaPage.idsNaOrdemVisual('^visitaform_local_item_[0-9]+$'))[0]
  localEscolhido = Number(idL.split('_').pop())
  await visitaPage.tocar(idL)
  await visitaPage.esperarVisivel('visitaform_botao_salvar')
}
When('escolho o primeiro prescritor e o primeiro local nos seletores', escolherPrimeiroPrescritorELocal)

Then('os campos Prescritor e Local mostram os nomes escolhidos e nenhuma visita foi criada', async function () {
  const prescritor = await BackendService.obter(`/prescritores/${prescritorEscolhido}`)
  const local = await BackendService.obter(`/locais-atendimento/${localEscolhido}`)
  // O campo mostra o nome escolhido (comparação sem caixa/acento: o app aplica nome próprio só na exibição).
  expect(norm(await visitaPage.rotuloDe('visitaform_campo_prescritor'))).toContain(norm(prescritor.nomemedico))
  expect(norm(await visitaPage.rotuloDe('visitaform_campo_local'))).toContain(norm(local.nomeatendimento))
  expect(await visitaPage.contar('visitaform_texto_erro')).toBe(0)
})

// ---- T-036 (6): aba e mês sobrevivem ao detalhe ---------------------------------------------------------

let mesEscolhido
let abaEscolhida
When('escolho a aba {word} e abro o detalhe da primeira visita da lista', async function (aba) {
  visitaPage ??= new VisitaPage(driver)
  abaEscolhida = aba.toLowerCase()
  await visitaPage.abrirAba(abaEscolhida)
  mesEscolhido = await visitaPage.textoDe('visitas_texto_mes_ano')
  // A prova só vale com pelo menos uma visita na aba (a Concluída tem dezenas no tenant de teste).
  const codigos = await visitaPage.codigosNaOrdemVisual()
  expect(codigos.length).toBeGreaterThanOrEqual(1)
  await visitaPage.tocar(`visitas_item_${codigos[0]}`)
  await visitaPage.esperarVisivel('visitadetalhe_texto_titulo')
})

When('volto do detalhe da visita', async function () {
  await visitaPage.tocar('visitadetalhe_botao_voltar')
  await visitaPage.aguardarTela()
})

Then('a tela de Visitas mantém o mês e a aba escolhidos', async function () {
  expect(await visitaPage.textoDe('visitas_texto_mes_ano')).toBe(mesEscolhido)
  expect(await visitaPage.atributo(`visitas_aba_${abaEscolhida}`, 'selected')).toBe('true')
})

// ---- T-037 (1): uma rodada de sincronização por volta ao primeiro plano ----------------------------------

const chamadas = async (caminho) => contarChamadasHttp(driver, 'GET', caminho)
// Laço com saída por tempo decorrido: cada volta consulta o logcat (dá o ritmo) — janela de observação, não espera mágica.
const observarPor = async (ms) => {
  const fim = Date.now() + ms
  while (Date.now() < fim) await chamadas('/visitas')
}

When('espero a sincronização do login terminar', async function () {
  // Quieto = nenhuma chamada nova de /visitas nem de /prescritores durante 6 s seguidos (o login dispara uma rodada).
  let ultimo = ''
  let desde = Date.now()
  await driver.waitUntil(async () => {
    const atual = `${await chamadas('/visitas')}/${await chamadas('/prescritores')}`
    if (atual !== ultimo) { ultimo = atual; desde = Date.now() }
    return Date.now() - desde >= 6000
  }, { timeout: 120000, interval: 500, timeoutMsg: 'timed out while waiting for the login sync to settle' })
})

Then('voltar ao primeiro plano 3 vezes sincroniza no máximo uma vez por volta', async function () {
  let algumaVoltaSincronizou = false
  const excedeu = []
  for (let volta = 1; volta <= 3; volta += 1) {
    await limparLogcat(driver)
    await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
    await observarPor(6000) // ≥ 6 s em segundo plano (T-037)
    await driver.execute('mobile: activateApp', { appId: 'com.example.medvisit' })
    await observarPor(8000) // janela em que as rodadas de uma volta apareceriam
    const prescritores = await chamadas('/prescritores')
    const visitas = await chamadas('/visitas')
    if (prescritores > 1 || visitas > 1) {
      const linhas = [...await linhasChamadasHttp(driver, 'GET', '/prescritores'), ...await linhasChamadasHttp(driver, 'GET', '/visitas')]
      excedeu.push(`volta ${volta}: /prescritores=${prescritores} /visitas=${visitas} [${linhas.join(' ; ')}]`)
    }
    if (prescritores + visitas > 0) algumaVoltaSincronizou = true
  }
  // Falha com o que foi contado em cada volta (não só "recebeu 2"), para o achado ir ao app com evidência.
  if (excedeu.length > 0) throw new Error(`mais de 1 chamada por volta (T-037 pede no máximo 1): ${excedeu.join(' | ')}`)
  // Anti falso-positivo: se nenhuma volta chamou nada, o logcat pode não estar capturando — o cenário não prova nada.
  expect(algumaVoltaSincronizou).toBe(true)
})

// ---- T-038 (5): textos das opções do modal Nova visita ----------------------------------------------------------

Then('as opções do modal têm os textos {string} e {string}', async function (iniciar, agendar) {
  visitaPage ??= new VisitaPage(driver)
  // O cartão traz também a linha de apoio ("Começar agora, com check-in"): o rótulo é o texto que COMEÇA com o título.
  expect((await visitaPage.rotuloDe('novavisita_opcao_iniciar')).toLowerCase()).toContain(iniciar.toLowerCase())
  expect((await visitaPage.rotuloDe('novavisita_opcao_agendar')).toLowerCase()).toContain(agendar.toLowerCase())
})

// ---- T-040 / T-041 (c) / T-044: intervalo mínimo de 10 minutos entre visitas --------------------------------------------
// A massa nasce PELA TELA (visitas "Teste Appium"); a limpeza cancela, por prefixo, toda visita aberta ao fim do cenário.

let horaBase
const somarMinutos = (hhmm, minutos) => {
  const total = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + minutos
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}
const soDigitos = (hhmm) => hhmm.replace(':', '')

// Troca o conteúdo do campo (clique + limpar + digitar): `setValue` sozinho ACRESCENTA ao que já está lá (a máscara de hora
// cortava "00:050030" e o campo ficava com a hora antiga).
const substituirTexto = async (tag, valor) => {
  const el = await visitaPage.esperarVisivel(tag)
  await el.click()
  await el.clearValue()
  await el.setValue(valor)
}

Given('que há um horário livre hoje para agendar visitas de teste', async function () {
  horaBase = await BackendService.horarioLivreHoje()
  BackendService.registrarMassaPelaUI() // a limpeza cancela por prefixo o que a tela criar
})

// Visita criada PELA API antes do login: entra na cópia local na 1ª sincronização (é o que a checagem do intervalo lê).
Given('que existe uma visita de teste hoje no horário base mais {int} minutos', async function (minutos) {
  visitaDeTeste = await BackendService.criarVisitaDeTesteHoje(somarMinutos(horaBase, minutos), 'intervalo mínimo (T-044)')
})

When('preencho o formulário de Agendar com a hora base mais {int} minutos', async function (minutos) {
  await escolherPrimeiroPrescritorELocal()
  // Histórico ANTES da hora: com o teclado da hora aberto (e o erro empurrando o layout) o campo de histórico sai da tela.
  await visitaPage.preencher('visitaform_campo_historico', 'Teste Appium intervalo minimo (T-044)')
  await substituirTexto('visitaform_campo_hora', soDigitos(somarMinutos(horaBase, minutos)))
})

When('preencho a hora do formulário com o horário base mais {int} minutos', async function (minutos) {
  await substituirTexto('visitaform_campo_hora', soDigitos(somarMinutos(horaBase, minutos)))
})

Then('o campo Hora do formulário mostra o erro de intervalo mínimo', async function () {
  const erro = await visitaPage.esperarVisivel('visitaform_campo_hora_erro')
  const texto = await erro.getText()
  expect(texto).toMatch(/^Já existe uma visita às \d{2}:\d{2}/)
  expect(texto).toContain('pelo menos 10 minutos entre visitas')
})

// "Não mostra erro" é uma asserção de "nunca": o erro nasce enquanto digita, então observa por 2 s em vez de olhar um instante (R-AFP).
Then('o campo Hora do formulário não mostra erro', async function () {
  const fim = Date.now() + 2000
  while (Date.now() < fim) expect(await visitaPage.contar('visitaform_campo_hora_erro')).toBe(0)
})

const abertasNaApi = async () => (await BackendService.visitasDeTesteAbertas()).length

Then('a visita é agendada e a API tem {int} visita(s) de teste aberta(s)', async function (quantas) {
  await visitaPage.aguardarTela() // o formulário fechou e voltou à lista
  await driver.waitUntil(async () => (await abertasNaApi()) === quantas, { timeout: 20000, timeoutMsg: `timed out while waiting for the API to have ${quantas} open test visit(s)` })
})

Then('o aviso de erro mostra a recusa do intervalo mínimo e a API continua com {int} visita(s) de teste aberta(s)', async function (quantas) {
  await visitaPage.esperarVisivel('app_aviso_erro', 15000)
  // O aviso traz o contexto da ação antes do motivo ("Não deu pra agendar a visita: Já existe uma visita às 23:40 (Nome) — …").
  expect(await visitaPage.textoDe('app_aviso_texto')).toMatch(/Já existe uma visita às \d{2}:\d{2}.*deixe pelo menos 10 minutos entre visitas/)
  expect(await visitaPage.contar('visitaform_botao_salvar')).toBe(1) // continua no formulário: nada foi criado
  expect(await abertasNaApi()).toBe(quantas)
})

// Hora "agora + N min" de hoje (HH:mm); falha perto da virada do dia, onde o cenário perde o sentido.
const agoraMais = (minutos) => {
  const { hora, minuto } = agoraSP()
  const total = hora * 60 + minuto + minutos
  if (total > 23 * 60 + 59) throw new Error('schema validation: faltam menos de N minutos para a virada do dia — rode o cenário mais cedo')
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

Given('que existe uma visita de teste hoje daqui a {int} minutos', async function (minutos) {
  visitaDeTeste = await BackendService.criarVisitaDeTesteHoje(agoraMais(minutos), 'intervalo mínimo ao iniciar (T-040)')
  BackendService.registrarMassaPelaUI() // se o app criar a visita que devia recusar, a limpeza cancela por prefixo
})

// Acha na API a visita de teste de hoje (aberta) no horário base + N e abre o detalhe dela pela aba Hoje.
When('abro o detalhe da visita de teste do horário base mais {int} minutos', async function (minutos) {
  visitaPage = new VisitaPage(driver)
  const hora = somarMinutos(horaBase, minutos)
  const { ano, mes, dia } = agoraSP()
  const hoje = `${ano}-${pad2(mes)}-${pad2(dia)}`
  const visita = (await BackendService.visitasDeTesteAbertas()).find((v) => v.dataVisita === hoje && v.horaVisita.slice(0, 5) === hora)
  expect(visita).toBeDefined() // a visita de teste do horário existe na API (R-AFP)
  visitaDeTeste = { codigo: visita.codigo }
  await visitaPage.aguardarTela()
  await visitaPage.abrirDetalheDaAbaHoje(visita.codigo)
})

When('cancelo a visita aberta no detalhe com o motivo {string}', async function (motivo) {
  await visitaPage.tocar('visitadetalhe_botao_cancelar')
  await visitaPage.esperarVisivel('visitadetalhe_cancelar_dialogo')
  const campo = await visitaPage.esperarVisivel('visitadetalhe_cancelar_campo_motivo')
  await campo.click()
  await campo.setValue(motivo)
  await driver.waitUntil(async () => visitaPage.estaHabilitado('visitadetalhe_cancelar_botao_confirmar'), { timeout: 10000, timeoutMsg: 'timed out while waiting for the confirm button to enable' })
  await visitaPage.tocar('visitadetalhe_cancelar_botao_confirmar')
  // Depois de cancelar o app FICA no detalhe (selo "Cancelada", "Visita cancelada — sem edição"): confere o selo e volta à lista.
  await driver.waitUntil(async () => (await visitaPage.rotuloDe('visitadetalhe_badge_status')).toLowerCase() === 'cancelada', { timeout: 15000, timeoutMsg: 'timed out while waiting for the "Cancelada" badge on the detail' })
  await visitaPage.tocar('visitadetalhe_botao_voltar')
  await visitaPage.aguardarTela()
})

When('troco a hora do detalhe para o horário base mais {int} minutos e toco em Reagendar', async function (minutos) {
  await substituirTexto('visitadetalhe_campo_hora', soDigitos(somarMinutos(horaBase, minutos)))
  await visitaPage.tocar('visitadetalhe_botao_reagendar')
})

// A recusa do reagendamento por intervalo pode aparecer no campo do detalhe (`visitadetalhe_texto_erro`) ou no aviso global.
const recusaDeIntervalo = async () => {
  const textos = []
  if ((await visitaPage.contar('visitadetalhe_texto_erro')) > 0) textos.push(await visitaPage.textoDe('visitadetalhe_texto_erro'))
  if ((await visitaPage.contar('app_aviso_erro')) > 0) textos.push(await visitaPage.textoDe('app_aviso_texto'))
  return textos.find((t) => /Já existe uma visita às \d{2}:\d{2}.*deixe pelo menos 10 minutos entre visitas/.test(t))
}

Then('o detalhe recusa o reagendamento pelo intervalo mínimo', async function () {
  await driver.waitUntil(async () => Boolean(await recusaDeIntervalo()), { timeout: 15000, timeoutMsg: 'timed out while waiting for the minimum-interval refusal on the detail' })
})

// "Nunca recusa" pede janela de observação (R-AFP): durante 5 s o campo e o aviso não podem mostrar a recusa, e a visita segue no horário.
Then('o detalhe não recusa o reagendamento para o próprio horário', async function () {
  const inicio = Date.now()
  const fim = inicio + 5000
  while (Date.now() < fim) {
    const recusa = await recusaDeIntervalo()
    if (recusa) {
      await capturar(driver, 'reagendar-proprio-horario-recusa')
      throw new Error(`o reagendamento para o próprio horário foi recusado após ${Date.now() - inicio} ms (campo: ${await visitaPage.textoDe('visitadetalhe_campo_hora')}; texto_erro: ${(await visitaPage.contar('visitadetalhe_texto_erro')) > 0 ? await visitaPage.textoDe('visitadetalhe_texto_erro') : '(nenhum)'}; aviso_erro: ${(await visitaPage.contar('app_aviso_erro')) > 0 ? await visitaPage.textoDe('app_aviso_texto') : '(nenhum)'}): ${recusa}`)
    }
  }
  expect(await visitaPage.textoDe('visitadetalhe_campo_hora')).toBe(horaBase ? somarMinutos(horaBase, 20) : '')
})

Then('o detalhe aceita o reagendamento e a API tem a visita no horário base mais {int} minutos', async function (minutos) {
  await visitaPage.esperarVisivel('app_aviso_sucesso', 15000)
  expect(await visitaPage.textoDe('app_aviso_texto')).toMatch(/^Visita reagendada para \d{2}\/\d{2} às \d{2}:\d{2}\.?$/)
  await driver.waitUntil(async () => (await BackendService.obter(`/visitas/${visitaDeTeste.codigo}`)).horaVisita.slice(0, 5) === somarMinutos(horaBase, minutos), { timeout: 20000, timeoutMsg: 'timed out while waiting for the API to have the visit at the new time' })
})

Then('o detalhe aceita o reagendamento', async function () {
  try {
    await visitaPage.esperarVisivel('app_aviso_sucesso', 15000)
  } catch (erro) {
    // Evidência do estado NO MOMENTO (a limpeza do afterScenario roda antes dos artefatos de falha e cancela a massa).
    const estado = `hora no campo: ${await visitaPage.textoDe('visitadetalhe_campo_hora').catch(() => '?')}; texto_erro: ${(await visitaPage.contar('visitadetalhe_texto_erro')) > 0 ? await visitaPage.textoDe('visitadetalhe_texto_erro') : '(nenhum)'}; app_aviso_erro: ${(await visitaPage.contar('app_aviso_erro')) > 0 ? await visitaPage.textoDe('app_aviso_texto') : '(nenhum)'}`
    await capturar(driver, 'reagendar-proprio-horario')
    throw new Error(`o reagendamento para o próprio horário não deu o aviso de sucesso (${estado}): ${erro.message}`)
  }
  expect(await visitaPage.textoDe('app_aviso_texto')).toMatch(/^Visita reagendada para \d{2}\/\d{2} às \d{2}:\d{2}\.?$/)
})

Then('o início da visita é recusado pelo intervalo mínimo e nenhuma visita foi criada', async function () {
  // Salvar abre o pop-up "Iniciar a visita agora"; confirmar dispara a checagem. Aceita a recusa já no Salvar ou depois do confirmar.
  await driver.waitUntil(async () => (await visitaPage.contar('visitaform_iniciar_dialogo')) + (await visitaPage.contar('app_aviso_erro')) > 0, { timeout: 15000, timeoutMsg: 'timed out while waiting for the start dialog or the refusal' })
  if ((await visitaPage.contar('visitaform_iniciar_dialogo')) > 0) await visitaPage.tocar('visitaform_iniciar_botao_confirmar')
  await visitaPage.esperarVisivel('app_aviso_erro', 15000)
  expect(await visitaPage.textoDe('app_aviso_texto')).toMatch(/Já existe uma visita às \d{2}:\d{2}.*deixe pelo menos 10 minutos entre visitas/)
  expect((await BackendService.listar('/visitas')).length).toBe(totalAntes) // nada foi criado nem iniciado
})

// ---- T-044: intervalo mínimo SEM rede (cópia local + fila) --------------------------------------------------------------

// Sem rede o Salvar abre o pop-up "Salvo no aparelho" (`visitaform_dialogo_pendente`); o OK fecha o formulário.
const confirmarSalvoNoAparelho = async () => {
  await visitaPage.esperarVisivel('visitaform_dialogo_pendente', 15000)
  await visitaPage.tocar('visitaform_dialogo_pendente_botao_ok')
  await driver.waitUntil(async () => (await visitaPage.contar('visitaform_dialogo_pendente')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the "saved on the device" dialog to close' })
}

When('confirmo o aviso de visita salva no aparelho', async function () {
  await confirmarSalvoNoAparelho()
})

Then('a visita fica na fila do aparelho e a API continua com {int} visita(s) de teste aberta(s)', async function (quantas) {
  await confirmarSalvoNoAparelho()
  await visitaPage.aguardarTela() // o formulário fechou: a visita foi aceita localmente
  expect(await abertasNaApi()).toBe(quantas) // sem rede nada chegou ao servidor
})

// Fecha o app e apaga os dados ANTES de a rede voltar: a fila de envio morre junto e nenhuma visita pendente chega ao tenant
// quando o `afterScenario` religar a rede (a limpeza por prefixo roda antes disso).
When('encerro o app e apago os dados antes de religar a rede', async function () {
  await resetarEstadoDoApp(driver)
})

When('religo a rede do aparelho', async function () {
  await restaurarRede(driver)
})

// Visita criada PELA API no meio do cenário (o app, sem rede, não fica sabendo): é o que faz o servidor recusar depois.
When('crio na API uma visita de teste no horário base mais {int} minutos', async function (minutos) {
  visitaDeTeste = await BackendService.criarVisitaDeTesteHoje(somarMinutos(horaBase, minutos), 'concorrente criada por fora (T-044 e)')
})

// Rede de volta: a fila envia o `POST`, o servidor responde `409 intervalo_minimo` (B-054) e o app mostra o texto do servidor.
// O `VALIDATED` do emulador demora minutos depois de religar (AGENTS §10): a prova é o aviso/a fila, não o ícone de rede.
Then('o app mostra a recusa do servidor pelo intervalo mínimo e a visita recusada não existe na API', { timeout: 300000 }, async function () {
  await driver.waitUntil(async () => (await visitaPage.contar('app_aviso_erro')) > 0 && /Já existe uma visita às \d{2}:\d{2}.*deixe pelo menos 10 minutos entre visitas/.test(await visitaPage.textoDe('app_aviso_texto')), {
    timeout: 240000, interval: 1000, timeoutMsg: 'timed out while waiting for the server minimum-interval refusal notice after the network came back',
  })
  // Só a visita criada por fora existe: a das 5 min depois foi recusada e saiu da fila.
  expect(await abertasNaApi()).toBe(1)
})

Then('as Pendências mostram nada pendente de envio', async function () {
  expect(await visitaPage.textoDe('pendencias_contador_pendentes')).toBe('0')
})

// ---- T-042 (b): dado não velho — visita criada por fora aparece sem reabrir ------------------------------------------------

When('crio na API uma visita de teste hoje às {word}', async function (hora) {
  visitaDeTeste = await BackendService.criarVisitaDeTesteHoje(hora, 'criada por fora com o app aberto (T-042 b)')
})

Then('a visita criada por fora aparece na lista de Hoje sem eu reabrir o app', { timeout: 200000 }, async function () {
  // O app recebe o evento (`eventos: conectado`) e atualiza a lista; confere as primeiras linhas a cada 3 s, até 2 min.
  await driver.waitUntil(async () => visitaPage.cartaoNoInicio(visitaDeTeste.codigo), {
    timeout: 120000, interval: 3000, timeoutMsg: `timed out while waiting for the visit created outside the app (#${visitaDeTeste.codigo}) to show in "Hoje" without reopening it`,
  })
})

// ---- T-038 (5)(e): botão "Adicionar produto" da seção Itens --------------------------------------------------------------------

Then('o botão da seção Itens diz {string}', async function (texto) {
  // O botão fica abaixo da dobra em visita com muitos itens: rola até ele aparecer, com limite de tentativas.
  // O detalhe não tem id de rolagem: o gesto vale numa faixa central da janela (devagar, para não pular o botão).
  const { width, height } = await driver.getWindowSize()
  for (let i = 0; i < 8 && !(await visitaPage.contar('visitadetalhe_itens_botao_adicionar') > 0 && await visitaPage.porTag('visitadetalhe_itens_botao_adicionar').isDisplayed()); i++) {
    await driver.execute('mobile: swipeGesture', { left: Math.round(width * 0.1), top: Math.round(height * 0.25), width: Math.round(width * 0.8), height: Math.round(height * 0.5), direction: 'up', percent: 0.4, speed: 600 })
  }
  expect((await visitaPage.rotuloDe('visitadetalhe_itens_botao_adicionar')).toLowerCase()).toBe(texto.toLowerCase()) // a Nord exibe em maiúsculas
})

When('toco no botão Adicionar produto da seção Itens', async function () {
  await visitaPage.tocar('visitadetalhe_itens_botao_adicionar')
})

Then('vejo o seletor de produtos com a busca e a lista', async function () {
  await visitaPage.esperarVisivel('visitadetalhe_itens_produto_campo_busca')
  await expect(visitaPage.porTag('visitadetalhe_itens_produto_lista')).toBeDisplayed()
  await expect(visitaPage.porTag('visitadetalhe_itens_produto_botao_voltar')).toBeDisplayed()
})

When('volto do seletor de produtos', async function () {
  await visitaPage.tocar('visitadetalhe_itens_produto_botao_voltar')
})

Then('a seção Itens continua à vista no detalhe da visita', async function () {
  await driver.waitUntil(async () => (await visitaPage.contar('visitadetalhe_itens_produto_campo_busca')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the product picker to close' })
  await visitaPage.esperarVisivel('visitadetalhe_itens_texto_titulo')
})

// ---- T-012: contadores das abas × API e troca de mês -------------------------------------------------------------------------------

// Regra do app (`VisitasScreen.filtrarPorAba`) sobre as visitas do mês exibido; `statusVisita`: 0 agendada, 1 iniciada, 2 concluída, 3 cancelada.
const contadoresEsperados = (visitasDoMes, hojeIso) => ({
  'concluída': visitasDoMes.filter((v) => v.statusVisita === 2).length,
  pendente: visitasDoMes.filter((v) => [0, 1].includes(v.statusVisita) && v.dataVisita < hojeIso).length,
  hoje: visitasDoMes.filter((v) => v.dataVisita === hojeIso).length,
  agendada: visitasDoMes.filter((v) => v.statusVisita === 0 && v.dataVisita >= hojeIso).length,
  todos: visitasDoMes.length,
})

// Mês exibido ("Outubro 2026") → "2026-10".
const mesExibido = async () => {
  const [nome, ano] = (await visitaPage.textoDe('visitas_texto_mes_ano')).trim().split(/\s+/)
  return `${ano}-${String(MESES.findIndex((m) => m.toLowerCase() === nome.toLowerCase()) + 1).padStart(2, '0')}`
}

// Ordem REAL das abas na tela, da esquerda para a direita (`VisitasScreen.abasStatus`): o inventário do app (§11.3) ainda diz que
// "Concluída" vem primeiro, mas ela é a última (achado A-016).
const ORDEM_DAS_ABAS = ['todos', 'pendente', 'hoje', 'agendada', 'concluída']

// A barra de abas é rolável: com "Todos" ou "Agendada" selecionada as abas da ponta oposta saem da tela. Arrasta a própria barra
// (pelo id da aba escolhida) até a aba pedida ficar visível, com limite de tentativas.
const aparecerAba = async (aba) => {
  const alvo = `visitas_aba_${aba}`
  for (let i = 0; i < 6; i++) {
    if ((await visitaPage.contar(alvo)) > 0 && (await visitaPage.porTag(alvo).isDisplayed())) return
    // Âncora = a aba à vista mais perto do centro da tela: arrastar a partir da borda dispararia o gesto de voltar do sistema.
    const largura = (await driver.getWindowSize()).width
    let ancora = null
    let menorDistancia = Infinity
    for (const outra of ABAS_STATUS) {
      if ((await visitaPage.contar(`visitas_aba_${outra}`)) === 0 || !(await visitaPage.porTag(`visitas_aba_${outra}`).isDisplayed())) continue
      const { l, r } = BasePage.limites(await visitaPage.atributo(`visitas_aba_${outra}`, 'bounds'))
      const distancia = Math.abs((l + r) / 2 - largura / 2)
      if (distancia < menorDistancia) { menorDistancia = distancia; ancora = outra }
    }
    if (!ancora) throw new Error('no such element: nenhuma aba de Visitas à vista para arrastar a barra')
    // Aba à esquerda da âncora → arrasta a barra para a direita, e vice-versa.
    await visitaPage.arrastar(`visitas_aba_${ancora}`, ORDEM_DAS_ABAS.indexOf(aba) < ORDEM_DAS_ABAS.indexOf(ancora) ? 'right' : 'left', 0.9)
  }
  throw new Error(`element ("${alvo}") still not displayed after scrolling the tab bar`)
}

const lerContadores = async () => {
  const lidos = {}
  for (const aba of ABAS_STATUS) {
    await aparecerAba(aba)
    lidos[aba] = Number(/\((\d+)\)/.exec(await visitaPage.rotuloDe(`visitas_aba_${aba}`))?.[1])
  }
  return lidos
}

const conferirContadores = async () => {
  visitaPage ??= new VisitaPage(driver)
  await visitaPage.aguardarCarregar()
  const { ano, mes, dia } = agoraSP()
  const hojeIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  const mesLido = await mesExibido()
  const doMes = (await BackendService.listar('/visitas')).filter((v) => (v.dataVisita ?? '').startsWith(mesLido))
  const esperado = contadoresEsperados(doMes, hojeIso)
  let lido = {}
  // O contador acompanha a cópia local que acabou de chegar: espera igualar (a prova é o valor final, nunca um instante).
  await driver.waitUntil(async () => { lido = await lerContadores(); return JSON.stringify(lido) === JSON.stringify(esperado) }, {
    timeout: 20000, interval: 1000, timeoutMsg: `timed out while waiting for the tab counters of ${mesLido} to match the API: esperado ${JSON.stringify(esperado)}, lido ${JSON.stringify(lido)}`,
  })
  expect(lido).toEqual(esperado)
}

Then('os contadores das abas de Visitas batem com a API do mês exibido', async function () {
  await conferirContadores()
})

When('navego para o mês anterior de Visitas', async function () {
  visitaPage ??= new VisitaPage(driver)
  await visitaPage.tocar('visitas_navegador_mes_anterior')
})

When('navego para o mês seguinte de Visitas', async function () {
  visitaPage ??= new VisitaPage(driver)
  await visitaPage.tocar('visitas_navegador_mes_proximo')
})

Then(/^a aba (Todos|Hoje|Agendada) está selecionada e os contadores batem com a API do mês exibido$/, async function (aba) {
  await driver.waitUntil(async () => (await visitaPage.atributo(`visitas_aba_${aba.toLowerCase()}`, 'selected')) === 'true', {
    timeout: 10000, timeoutMsg: `timed out while waiting for the tab ${aba} to be selected after changing the month`,
  })
  await conferirContadores()
})

// ---- T-013: lápis e "+" do seletor (edição/cadastro embutidos) e calendário/relógio do formulário -------------------------------

// Cada seletor tem o seu prefixo de tags: itens `visitaform_<quem>_item_<código>`, lápis `…_botao_editar`, "+" `visitaform_<quem>_botao_cadastrar`,
// edição embutida `visitaform_<quem>_edicao_*` e cadastro embutido `visitaform_<quem>_cadastro_*` (formulário do próprio cadastro por dentro).
let codigoDoLapis
When(/^toco no lápis do primeiro item do seletor de (prescritor|local)$/, async function (quem) {
  const id = (await visitaPage.idsNaOrdemVisual(`^visitaform_${quem}_item_[0-9]+$`))[0]
  codigoDoLapis = Number(id.split('_').pop())
  await visitaPage.tocar(`visitaform_${quem}_item_${codigoDoLapis}_botao_editar`)
})

Then(/^vejo a edição embutida de (prescritor|local) com o nome conforme a API$/, async function (quem) {
  await visitaPage.esperarVisivel(`visitaform_${quem}_edicao_texto_titulo`)
  await visitaPage.esperarVisivel(`${quem}form_botao_salvar`)
  const api = quem === 'prescritor' ? await BackendService.obter(`/prescritores/${codigoDoLapis}`) : await BackendService.obter(`/locais-atendimento/${codigoDoLapis}`)
  const nome = quem === 'prescritor' ? api.nomemedico : api.nomeatendimento
  const colapsar = (t) => t.replace(/\s+/g, ' ').trim()
  expect(colapsar(await visitaPage.textoDe(`${quem}form_campo_nome`))).toBe(colapsar(nome))
})

When(/^volto da edição embutida de (prescritor|local)$/, async function (quem) {
  await visitaPage.tocar(`visitaform_${quem}_edicao_botao_voltar`)
})

Then(/^o seletor de (prescritor|local) continua aberto depois de fechar a edição embutida$/, async function (quem) {
  await driver.waitUntil(async () => (await visitaPage.contar(`visitaform_${quem}_edicao_texto_titulo`)) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the embedded edit screen to close' })
  await visitaPage.esperarVisivel(`visitaform_${quem}_lista`) // só a edição fechou: o seletor segue por baixo
})

let totalLocaisAntes
When('toco no botão + do seletor de local', async function () {
  totalLocaisAntes = (await BackendService.listar('/locais-atendimento')).length
  await visitaPage.tocar('visitaform_local_botao_cadastrar')
})

Then('vejo o cadastro embutido de local vazio', async function () {
  await visitaPage.esperarVisivel('visitaform_local_cadastro_texto_titulo')
  await visitaPage.esperarVisivel('localform_botao_salvar')
  expect((await visitaPage.textoDe('localform_campo_nome')).trim()).toBe('')
})

When('volto do cadastro embutido de local', async function () {
  await visitaPage.tocar('visitaform_local_cadastro_botao_voltar')
})

Then('o seletor de local continua aberto e a API segue com o mesmo número de locais', async function () {
  await driver.waitUntil(async () => (await visitaPage.contar('visitaform_local_cadastro_texto_titulo')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the embedded register screen to close' })
  await visitaPage.esperarVisivel('visitaform_local_lista')
  expect((await BackendService.listar('/locais-atendimento')).length).toBe(totalLocaisAntes)
})

let valorGuardado
When('guardo o valor do campo Data do formulário', async function () {
  valorGuardado = await visitaPage.textoDe('visitaform_campo_data')
  expect(valorGuardado).toMatch(/\d{2}\/\d{2}\/\d{4}/)
})

const ICONE_DO_SELETOR = { calendário: 'visitaform_icone_calendario', relógio: 'visitaform_icone_relogio' }
const CAMPO_DO_SELETOR = { calendário: 'visitaform_campo_data', relógio: 'visitaform_campo_hora' }

When(/^abro o (calendário|relógio) do formulário de visita$/, async function (quem) {
  await visitaPage.tocar(ICONE_DO_SELETOR[quem])
  await visitaPage.esperarVisivel(`${ICONE_DO_SELETOR[quem]}_dialogo`)
})

When(/^(cancelo|confirmo) o seletor do (calendário|relógio)$/, async function (acao, quem) {
  await visitaPage.tocar(`${ICONE_DO_SELETOR[quem]}_${acao === 'cancelo' ? 'cancelar' : 'confirmar'}`)
  await driver.waitUntil(async () => (await visitaPage.contar(`${ICONE_DO_SELETOR[quem]}_dialogo`)) === 0, { timeout: 10000, timeoutMsg: `timed out while waiting for the ${quem} dialog to close` })
})

Then('o campo Data do formulário continua com o valor guardado', async function () {
  expect(await visitaPage.textoDe(CAMPO_DO_SELETOR['calendário'])).toBe(valorGuardado)
})

Then('o campo Hora do formulário continua vazio', async function () {
  expect((await visitaPage.textoDe(CAMPO_DO_SELETOR['relógio'])).trim()).toBe('')
})

Then('o campo Hora do formulário mostra uma hora válida', async function () {
  expect((await visitaPage.textoDe(CAMPO_DO_SELETOR['relógio'])).trim()).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
})

// ---- T-017: item com a fonte ampliada ------------------------------------------------------------------------------------------

When('escolho o primeiro produto do seletor', async function () {
  await visitaPage.esperarVisivel('visitadetalhe_itens_produto_lista')
  const id = (await visitaPage.idsNaOrdemVisual('^visitadetalhe_itens_produto_item_[0-9]+$'))[0]
  await visitaPage.tocar(id)
  await visitaPage.esperarVisivel('visitadetalhe_itens_texto_produto_selecionado')
})

When('cancelo a escolha do produto', async function () {
  await visitaPage.tocar('visitadetalhe_itens_botao_cancelar')
})

// ---- T-014: visita iniciada sem rede ---------------------------------------------------------------------------------------------

Then('a visita iniciada sem rede aparece na lista como pendente de envio e a API continua com {int} visita(s) de teste aberta(s)', async function (quantas) {
  // Sem rede o Salvar abre o aviso "Salvo no aparelho"; o OK leva à lista de Visitas, que mostra o cartão da visita nova
  // (`visitas_item_pendente_<uuid>`, no topo) e o selo de envios pendentes.
  await confirmarSalvoNoAparelho()
  await visitaPage.aguardarTela()
  await visitaPage.esperarVisivel('visitas_badge_pendentes', 20000)
  expect(await visitaPage.atributo('visitas_badge_pendentes', 'content-desc')).toMatch(/^1 envio/)
  for (let i = 0; i < 3; i++) await visitaPage.arrastar('visitas_lista', 'down', 0.6) // a visita pendente fica no topo da lista
  let cartoes = []
  await driver.waitUntil(async () => {
    cartoes = await visitaPage.idsNaOrdemVisual('^visitas_item_pendente_[0-9a-f-]{36}$')
    return cartoes.length > 0
  }, { timeout: 20000, timeoutMsg: 'timed out while waiting for the card of the visit started without network (visitas_item_pendente_<uuid>)' })
  expect(cartoes).toHaveLength(1)
  const [cartao] = cartoes
  expect(await visitaPage.atributo(`${cartao}_badge_pendente`, 'content-desc')).toBe('Envio: Pendente de envio')
  expect((await visitaPage.textoDe(`${cartao}_texto_prescritor`)).trim().length).toBeGreaterThan(0)
  expect(await abertasNaApi()).toBe(quantas) // sem rede nada chegou ao servidor
})
