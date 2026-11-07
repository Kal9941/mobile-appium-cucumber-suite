import { When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { SecretariasPage } from '../pages/7.secretariasPage.js'
import { BackendService } from '../services/BackendService.js'
import { nomePropio } from '../support/nomePropio.js'
import { capturar } from '../support/visual.js'

let pagina
const lista = () => { pagina ??= new SecretariasPage(driver); return pagina }
const colapsar = (s) => s.replace(/\s+/g, ' ').trim()
const ITEM = '^secretarias_item_[0-9]+$'
const dataBR = (iso) => iso.split('-').reverse().join('/')

Then('vejo os filtros e a lista de secretárias conforme a API', async function () {
  // Arrange: filtro padrão "Minhas" = secretárias dos prescritores do representante logado.
  const { codigoFuncionario } = await BackendService.sessao()
  const naApi = await BackendService.listar(`/secretarias?codigoRepresentante=${codigoFuncionario}`)

  pagina = new SecretariasPage(driver)
  await pagina.aguardarTela()
  await expect(pagina.tituloText()).toBeDisplayed()
  await expect(pagina.porTag('secretarias_filtro_meus')).toBeDisplayed()
  await expect(pagina.porTag('secretarias_filtro_todos')).toBeDisplayed()
  await expect(pagina.porTag('secretarias_fab_nova')).toBeDisplayed()

  await pagina.aguardarCarregar()
  expect(await pagina.contar('secretarias_texto_erro')).toBe(0)

  // Assert: a decisão vem da API, nunca da UI.
  const tagEsperada = naApi.length > 0 ? 'secretarias_lista' : 'secretarias_texto_estado_vazio'
  await expect(pagina.porTag(tagEsperada)).toBeDisplayed()

  if (naApi.length > 0) {
    const codigo = (await (await pagina.primeiroItem()).getAttribute('resource-id')).split('_').pop()
    expect((await pagina.textoDe(`secretarias_item_${codigo}_texto_nome`)).trim().length).toBeGreaterThan(0)
    expect((await pagina.textoDe(`secretarias_item_${codigo}_texto_contato`)).trim().length).toBeGreaterThan(0)
  }
})

// ---- T-031 ------------------------------------------------------------------------------------

Then('os nomes da lista de secretárias seguem a regra de nome próprio conforme a API', async function () {
  const p = lista()
  await p.aguardarCarregar()
  const { codigoFuncionario } = await BackendService.sessao()
  const naApi = await BackendService.listar(`/secretarias?codigoRepresentante=${codigoFuncionario}`)
  const porCodigo = new Map(naApi.map((s) => [s.codigo, s]))
  const ids = (await p.idsNaOrdemVisual('^secretarias_item_[0-9]+_texto_nome$')).slice(0, 6)
  expect(ids.length).toBeGreaterThanOrEqual(1)
  let transformados = 0
  for (const id of ids) {
    const api = porCodigo.get(Number(id.split('_')[2]))
    const esperado = colapsar(nomePropio(colapsar(api.nomesecretaria)))
    expect(colapsar(await p.textoDe(id))).toBe(esperado)
    if (esperado !== colapsar(api.nomesecretaria)) transformados += 1
  }
  expect(transformados).toBeGreaterThanOrEqual(1)
  await capturar(driver, 'lista-secretarias-negrito')
})

// ---- filtro Todas ------------------------------------------------------------------------------

When('escolho o filtro Todas na lista de secretárias', async function () {
  const p = lista()
  await p.aguardarCarregar()
  await p.tocar('secretarias_filtro_todos')
})

Then('a lista de secretárias mostra a quantidade de secretárias do tenant conforme a API', async function () {
  const p = lista()
  const todas = await BackendService.listar('/secretarias')
  // A lista é preguiçosa (só os visíveis existem na árvore): confere que os visíveis são secretárias da API
  // e que "Todas" tem mais itens que "Minhas" quando o tenant tem mais secretárias que as minhas.
  const { codigoFuncionario } = await BackendService.sessao()
  const minhas = await BackendService.listar(`/secretarias?codigoRepresentante=${codigoFuncionario}`)
  expect(todas.length).toBeGreaterThan(minhas.length)
  await driver.waitUntil(async () => (await p.idsNaOrdemVisual(ITEM)).length > minhas.length, { timeout: 15000, timeoutMsg: 'timed out while waiting for more secretaries than "Minhas" after choosing "Todas"' })
  const codigosApi = new Set(todas.map((s) => s.codigo))
  for (const id of await p.idsNaOrdemVisual(ITEM)) expect(codigosApi.has(Number(id.split('_').pop()))).toBe(true)
})

// ---- edição ------------------------------------------------------------------------------------

let codigoAberto
When('abro a primeira secretária da lista', async function () {
  const p = lista()
  await p.aguardarCarregar()
  const primeiro = await p.primeiroItem()
  codigoAberto = Number((await primeiro.getAttribute('resource-id')).split('_').pop())
  await primeiro.click()
  await p.esperarVisivel('secretariaform_botao_salvar')
})

Then('o formulário de edição da secretária mostra nome, data de nascimento e e-mail conforme a API', async function () {
  const p = lista()
  const api = (await BackendService.listar('/secretarias')).find((s) => s.codigo === codigoAberto)
  expect((await p.textoDe('secretariaform_texto_titulo')).toUpperCase()).toBe('EDITAR SECRETÁRIA(O)')
  expect(colapsar(await p.textoDe('secretariaform_campo_nome'))).toBe(colapsar(api.nomesecretaria))
  if (api.dataNascimento) expect(await p.textoDe('secretariaform_campo_datanascimento')).toBe(dataBR(api.dataNascimento))
  if (api.email1) expect(await p.textoDe('secretariaform_campo_email1')).toBe(api.email1)
})

// ---- formulário --------------------------------------------------------------------------------

When('toco no botão + de Secretárias', async function () {
  await lista().tocar('secretarias_fab_nova')
  await lista().esperarVisivel('secretariaform_botao_salvar')
})

Then('vejo o formulário Incluir secretária com as abas e os campos', async function () {
  const p = lista()
  expect((await p.textoDe('secretariaform_texto_titulo')).toUpperCase()).toBe('INCLUIR SECRETÁRIA(O)')
  for (const tag of ['aba_dados', 'aba_contato', 'aba_endereco', 'aba_vinculos', 'campo_nome', 'campo_email1', 'campo_datanascimento', 'icone_calendario', 'radio_sexo_masculino', 'radio_sexo_feminino', 'campo_estadocivil', 'botao_salvar']) {
    await expect(p.porTag(`secretariaform_${tag}`)).toBeDisplayed()
  }
})

let totalSecretariasAntes
When('toco em Salvar no formulário de secretária', async function () {
  totalSecretariasAntes = (await BackendService.listar('/secretarias')).length
  await lista().fecharTecladoSeAberto()
  await lista().tocar('secretariaform_botao_salvar')
})

Then('vejo a mensagem {string} e nenhuma secretária nova na API', async function (mensagem) {
  const p = lista()
  await p.esperarVisivel('secretariaform_texto_erro')
  expect(await p.textoDe('secretariaform_texto_erro')).toBe(mensagem)
  expect((await BackendService.listar('/secretarias')).length).toBe(totalSecretariasAntes)
})

When('digito {string} no nome da secretária', async function (texto) {
  await lista().preencher('secretariaform_campo_nome', texto)
})

When('toco na seta de voltar do formulário de secretária', async function () {
  await lista().fecharTecladoSeAberto()
  await lista().tocar('secretariaform_botao_voltar')
})

Then('volto para a lista de secretárias', async function () {
  await lista().aguardarTela()
  expect(await lista().contar('secretariaform_botao_salvar')).toBe(0)
})

// ---- T-013 / lote 2: contato, CEP e vínculos ----------------------------------------------------------

const normaliza = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

When('abro a aba Contato do formulário de secretária', async function () {
  await lista().tocar('secretariaform_aba_contato')
  await lista().esperarVisivel('secretariaform_campo_telefone1')
})

When('digito {string} no telefone 1 da secretária', async function (texto) {
  await lista().preencher('secretariaform_campo_telefone1', texto)
})

Then('o telefone 1 da secretária mostra {string}', async function (esperado) {
  expect(await lista().textoDe('secretariaform_campo_telefone1')).toBe(esperado)
})

When('abro a aba Endereço do formulário de secretária', async function () {
  await lista().tocar('secretariaform_aba_endereco')
  await lista().esperarVisivel('secretariaform_endereco_campo_cep')
})

When('digito o CEP {string} no endereço da secretária', async function (cep) {
  await lista().preencher('secretariaform_endereco_campo_cep', cep)
  await lista().fecharTecladoSeAberto()
})

Then('o endereço da secretária foi preenchido pelo CEP com a Praça da Sé', async function () {
  const p = lista()
  await driver.waitUntil(async () => {
    const aviso = (await p.contar('secretariaform_endereco_texto_cep_aviso')) ? await p.textoDe('secretariaform_endereco_texto_cep_aviso') : ''
    return aviso.length > 0 && !/Buscando/.test(aviso)
  }, { timeout: 30000, timeoutMsg: 'timed out while waiting for the ViaCEP lookup to finish' })
  expect(normaliza(await p.textoDe('secretariaform_endereco_campo_endereco'))).toContain('praca da se')
  // Bairro é campo de seleção: o valor fica num TextView filho (o `text` do campo vem vazio).
  expect(normaliza(await p.rotuloDe('secretariaform_endereco_campo_bairro'))).toMatch(/ se$/)
})

When('abro a aba Vínculos do formulário de secretária', async function () {
  await lista().tocar('secretariaform_aba_vinculos')
  await lista().esperarVisivel('secretariaform_vinculos_botao_vincular')
})

Then('a aba Vínculos lista os prescritores e locais da secretária conforme a API', async function () {
  const p = lista()
  const vinculos = await BackendService.listar(`/secretarias/${codigoAberto}/vinculos`)
  await driver.waitUntil(async () => (await p.idsNaOrdemVisual('^secretariaform_vinculos_item_[0-9]+_[0-9]+$')).length === vinculos.length, { timeout: 15000, timeoutMsg: 'timed out while waiting for the links list' })
  for (const v of vinculos) {
    const base = `secretariaform_vinculos_item_${v.codigoPrescritor}_${v.codigoLocalAtendimento}`
    expect(normaliza(await p.textoDe(`${base}_texto_prescritor`))).toBe(normaliza(v.nomePrescritor))
    expect(normaliza(await p.textoDe(`${base}_texto_local`))).toBe(normaliza(v.nomeLocal))
  }
})

// ---- T-024: rótulo do botão de vínculo ---------------------------------------------------------------------

Then('o botão de vincular da secretária mostra {string}', async function (rotulo) {
  expect((await lista().rotuloDe('secretariaform_vinculos_botao_vincular')).toLowerCase()).toBe(rotulo.toLowerCase())
})

// ---- T-038 (4): erro do próprio campo ---------------------------------------------------------------------------

Then('o campo Nome da secretária mostra o erro {string}', async function (erro) {
  expect(await lista().textoDe('secretariaform_campo_nome_erro')).toBe(erro)
})

// ---- T-004: a lista de Secretárias abre sem travar ---------------------------------------------------------------------------

When('aguardo a lista de secretárias carregar', async function () {
  await lista().aguardarTela()
  await lista().aguardarCarregar()
})
