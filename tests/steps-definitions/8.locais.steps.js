import { When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { LocaisPage } from '../pages/8.locaisPage.js'
import { BackendService } from '../services/BackendService.js'
import { nomePropio } from '../support/nomePropio.js'
import { capturar } from '../support/visual.js'

let pagina
const lista = () => { pagina ??= new LocaisPage(driver); return pagina }
const colapsar = (s) => s.replace(/\s+/g, ' ').trim()
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const norm = (s) => semAcento(s).toLowerCase().replace(/\s+/g, ' ').trim()
const ITEM = '^locaisatendimento_item_[0-9]+$'
const codigoDe = (id) => Number(id.split('_')[2])

Then('vejo a busca, os filtros e a lista de locais conforme a API', async function () {
  // Arrange: filtro padrão "Meus" = locais do representante logado.
  const { codigoFuncionario } = await BackendService.sessao()
  const naApi = await BackendService.listar(`/locais-atendimento?codigoRepresentante=${codigoFuncionario}`)

  pagina = new LocaisPage(driver)
  await pagina.aguardarTela()
  await expect(pagina.tituloText()).toBeDisplayed()
  await expect(pagina.porTag('locaisatendimento_campo_busca')).toBeDisplayed()
  await expect(pagina.porTag('locaisatendimento_filtro_meus')).toBeDisplayed()
  await expect(pagina.porTag('locaisatendimento_filtro_todos')).toBeDisplayed()
  await expect(pagina.porTag('locaisatendimento_fab_novo')).toBeDisplayed()

  await pagina.aguardarCarregar()
  expect(await pagina.contar('locaisatendimento_texto_erro')).toBe(0)

  // Assert: a decisão vem da API, nunca da UI.
  const tagEsperada = naApi.length > 0 ? 'locaisatendimento_lista' : 'locaisatendimento_texto_estado_vazio'
  await expect(pagina.porTag(tagEsperada)).toBeDisplayed()

  if (naApi.length > 0) {
    const codigo = (await (await pagina.primeiroItem()).getAttribute('resource-id')).split('_').pop()
    expect((await pagina.textoDe(`locaisatendimento_item_${codigo}_texto_nome`)).trim().length).toBeGreaterThan(0)
    // Endereço mostra o texto ou "Sem endereço" — nunca vazio.
    expect((await pagina.textoDe(`locaisatendimento_item_${codigo}_texto_endereco`)).trim().length).toBeGreaterThan(0)
  }
})

// ---- T-031 ------------------------------------------------------------------------------------

Then('os nomes e endereços da lista de locais seguem a regra de nome próprio conforme a API', async function () {
  const p = lista()
  await p.aguardarCarregar()
  const { codigoFuncionario } = await BackendService.sessao()
  const naApi = await BackendService.listar(`/locais-atendimento?codigoRepresentante=${codigoFuncionario}`)
  const porCodigo = new Map(naApi.map((l) => [l.codigo, l]))
  const ids = (await p.idsNaOrdemVisual('^locaisatendimento_item_[0-9]+_texto_nome$')).slice(0, 6)
  expect(ids.length).toBeGreaterThanOrEqual(1)
  let transformados = 0
  for (const id of ids) {
    const api = porCodigo.get(codigoDe(id))
    const nomeEsperado = colapsar(nomePropio(colapsar(api.nomeatendimento)))
    expect(colapsar(await p.textoDe(id))).toBe(nomeEsperado)
    if (nomeEsperado !== colapsar(api.nomeatendimento)) transformados += 1
    if (api.endereco) {
      const endEsperado = colapsar(nomePropio(colapsar(api.endereco)))
      expect(colapsar(await p.textoDe(`locaisatendimento_item_${codigoDe(id)}_texto_endereco`))).toBe(endEsperado)
      if (endEsperado !== colapsar(api.endereco)) transformados += 1
    }
  }
  expect(transformados).toBeGreaterThanOrEqual(1)
  await capturar(driver, 'lista-locais-negrito')
})

// ---- filtro e busca ----------------------------------------------------------------------------

When('escolho o filtro Todos na lista de locais', async function () {
  const p = lista()
  await p.aguardarCarregar()
  await p.tocar('locaisatendimento_filtro_todos')
  await p.aguardarCarregar()
})

Then('a lista de locais mostra mais locais que o filtro Meus conforme a API', async function () {
  const p = lista()
  const { codigoFuncionario } = await BackendService.sessao()
  const meus = await BackendService.listar(`/locais-atendimento?codigoRepresentante=${codigoFuncionario}`)
  const todos = await BackendService.listar('/locais-atendimento')
  expect(todos.length).toBeGreaterThan(meus.length)
  // A lista é preguiçosa (só ~8 cartões existem na árvore), então contar cartões não prova "mais que Meus":
  // prova-se achando, rolando devagar, um cartão de Todos que NÃO está em Meus (limite de 40 rolagens).
  const codigosMeus = new Set(meus.map((l) => l.codigo))
  const codigosApi = new Set(todos.map((l) => l.codigo))
  const codigoDe = (id) => Number(id.split('_').pop())
  let achouForaDeMeus = false
  for (let i = 0; i <= 40 && !achouForaDeMeus; i++) {
    const visiveis = (await p.idsNaOrdemVisual(ITEM)).map(codigoDe)
    for (const c of visiveis) expect(codigosApi.has(c)).toBe(true) // todo cartão é local da API
    achouForaDeMeus = visiveis.some((c) => !codigosMeus.has(c))
    if (!achouForaDeMeus) await p.arrastar('locaisatendimento_lista', 'up', 0.3, 600)
  }
  expect(achouForaDeMeus).toBe(true) // Todos lista locais que o filtro Meus não tem
})

When('busco {string} na lista de locais', async function (texto) {
  const p = lista()
  await p.preencher('locaisatendimento_campo_busca', texto)
  await p.fecharTecladoSeAberto()
  await p.esperarVisivel('locaisatendimento_busca_botao_limpar')
})

Then('a lista de locais mostra só os locais da API que contêm {string}', async function (texto) {
  const p = lista()
  const todos = await BackendService.listar('/locais-atendimento')
  const esperados = new Set(todos.filter((l) => norm(l.nomeatendimento).includes(norm(texto))).map((l) => l.codigo))
  expect(esperados.size).toBeGreaterThanOrEqual(1)
  await driver.waitUntil(async () => {
    const codigos = (await p.idsNaOrdemVisual(ITEM)).map((id) => Number(id.split('_').pop()))
    return codigos.length === esperados.size && codigos.every((c) => esperados.has(c))
  }, { timeout: 15000, timeoutMsg: `timed out while waiting for the "${texto}" search to match the API (filter is in memory)` })
})

// ---- edição ------------------------------------------------------------------------------------

let codigoAberto
When('abro o primeiro local da lista', async function () {
  const p = lista()
  await p.aguardarCarregar()
  const primeiro = await p.primeiroItem()
  codigoAberto = Number((await primeiro.getAttribute('resource-id')).split('_').pop())
  await primeiro.click()
  await p.esperarVisivel('localform_botao_salvar')
})

Then('o formulário de edição do local mostra o nome conforme a API', async function () {
  const p = lista()
  const api = await BackendService.obter(`/locais-atendimento/${codigoAberto}`)
  expect((await p.textoDe('localform_texto_titulo')).toUpperCase()).toBe('LOCAL DE ATENDIMENTO')
  expect(colapsar(await p.textoDe('localform_campo_nome'))).toBe(colapsar(api.nomeatendimento))
})

// ---- formulário --------------------------------------------------------------------------------

When('toco no botão + de Locais', async function () {
  await lista().tocar('locaisatendimento_fab_novo')
  await lista().esperarVisivel('localform_botao_salvar')
})

Then('vejo o formulário Incluir local com as abas e os campos', async function () {
  const p = lista()
  expect((await p.textoDe('localform_texto_titulo')).toUpperCase()).toBe('LOCAL DE ATENDIMENTO')
  for (const tag of ['aba_dados', 'aba_contato', 'aba_endereco', 'campo_nome', 'campo_observacao', 'botao_salvar']) {
    await expect(p.porTag(`localform_${tag}`)).toBeDisplayed()
  }
})

let totalLocaisAntes
When('toco em Salvar no formulário de local', async function () {
  totalLocaisAntes = (await BackendService.listar('/locais-atendimento')).length
  await lista().fecharTecladoSeAberto()
  await lista().tocar('localform_botao_salvar')
})

Then('vejo a mensagem {string} e nenhum local novo na API', async function (mensagem) {
  const p = lista()
  await p.esperarVisivel('localform_texto_erro')
  expect(await p.textoDe('localform_texto_erro')).toBe(mensagem)
  expect((await BackendService.listar('/locais-atendimento')).length).toBe(totalLocaisAntes)
})

When('digito {string} no nome do local', async function (texto) {
  await lista().preencher('localform_campo_nome', texto)
})

When('toco na seta de voltar do formulário de local', async function () {
  await lista().fecharTecladoSeAberto()
  await lista().tocar('localform_botao_voltar')
})

Then('volto para a lista de locais', async function () {
  await lista().aguardarTela()
  expect(await lista().contar('localform_botao_salvar')).toBe(0)
})

// ---- T-013 / lote 2: contato e CEP ---------------------------------------------------------------------

When('abro a aba Contato do formulário de local', async function () {
  await lista().tocar('localform_aba_contato')
  await lista().esperarVisivel('localform_campo_telefone1')
})

When('digito {string} no telefone 1 do local', async function (texto) {
  await lista().preencher('localform_campo_telefone1', texto)
})

Then('o telefone 1 do local mostra {string} e vejo os campos fax e e-mail', async function (esperado) {
  const p = lista()
  expect(await p.textoDe('localform_campo_telefone1')).toBe(esperado)
  await expect(p.porTag('localform_campo_fax')).toBeDisplayed()
  await expect(p.porTag('localform_campo_email')).toBeDisplayed()
})

When('abro a aba Endereço do formulário de local', async function () {
  await lista().tocar('localform_aba_endereco')
  await lista().esperarVisivel('localform_endereco_campo_cep')
})

When('digito o CEP {string} no endereço do local', async function (cep) {
  await lista().preencher('localform_endereco_campo_cep', cep)
  await lista().fecharTecladoSeAberto()
})

Then('o endereço do local foi preenchido pelo CEP com a Praça da Sé', async function () {
  const p = lista()
  await driver.waitUntil(async () => {
    const aviso = (await p.contar('localform_endereco_texto_cep_aviso')) ? await p.textoDe('localform_endereco_texto_cep_aviso') : ''
    return aviso.length > 0 && !/Buscando/.test(aviso)
  }, { timeout: 30000, timeoutMsg: 'timed out while waiting for the ViaCEP lookup to finish' })
  expect(norm(await p.textoDe('localform_endereco_campo_endereco'))).toContain('praca da se')
  // Bairro é campo de seleção: o valor fica num TextView filho (o `text` do campo vem vazio).
  expect(norm(await p.rotuloDe('localform_endereco_campo_bairro'))).toMatch(/ se$/)
})

// ---- T-038 (4): erro do próprio campo ---------------------------------------------------------------------------

Then('o campo Nome do local mostra o erro {string}', async function (erro) {
  expect(await lista().textoDe('localform_campo_nome_erro')).toBe(erro)
})
