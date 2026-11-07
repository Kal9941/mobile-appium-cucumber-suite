import { When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { PrescritoresPage } from '../pages/6.prescritoresPage.js'
import { BackendService } from '../services/BackendService.js'
import { agoraSP } from '../support/dataPtBr.js'
import { nomePropio } from '../support/nomePropio.js'
import { capturar } from '../support/visual.js'

let pagina
const lista = () => { pagina ??= new PrescritoresPage(driver); return pagina }
const colapsar = (s) => s.replace(/\s+/g, ' ').trim()
const codigoDe = (id) => Number(id.split('_')[2])
const ITEM = '^prescritores_item_[0-9]+$'

Then('vejo a busca, os filtros e a lista de prescritores conforme a API', async function () {
  // Arrange: o que a tela PRECISA mostrar vem da API real, não da própria tela.
  const naApi = await BackendService.listar('/prescritores?limite=1')

  pagina = new PrescritoresPage(driver)
  await pagina.aguardarTela()
  await expect(pagina.tituloText()).toBeDisplayed()
  await expect(pagina.porTag('prescritores_campo_busca')).toBeDisplayed()
  await expect(pagina.porTag('prescritores_campo_filtro_grupo')).toBeDisplayed()
  await expect(pagina.porTag('prescritores_campo_filtro_especialidade')).toBeDisplayed()
  await expect(pagina.porTag('prescritores_fab_novo')).toBeDisplayed()

  await pagina.aguardarCarregar()
  expect(await pagina.contar('prescritores_texto_erro')).toBe(0)

  // Assert: a decisão vem da API (nunca da UI): massa real → lista com item bem
  // formado; sem massa → estado vazio.
  const tagEsperada = naApi.length > 0 ? 'prescritores_lista' : 'prescritores_texto_estado_vazio'
  await expect(pagina.porTag(tagEsperada)).toBeDisplayed()

  if (naApi.length > 0) {
    const codigo = (await (await pagina.primeiroItem()).getAttribute('resource-id')).split('_').pop()
    expect((await pagina.textoDe(`prescritores_item_${codigo}_texto_nome`)).trim().length).toBeGreaterThan(0)
    expect((await pagina.textoDe(`prescritores_item_${codigo}_texto_crm`)).trim().length).toBeGreaterThan(0)
  }
})

// ---- T-031: nome próprio ----------------------------------------------------------------------

Then('os nomes da lista de prescritores seguem a regra de nome próprio conforme a API', async function () {
  const p = lista()
  await p.aguardarTela()
  await p.aguardarCarregar()
  const ids = (await p.idsNaOrdemVisual('^prescritores_item_[0-9]+_texto_nome$')).slice(0, 6)
  expect(ids.length).toBeGreaterThanOrEqual(3)
  let transformados = 0
  for (const id of ids) {
    const api = await BackendService.obter(`/prescritores/${codigoDe(id)}`)
    const esperado = colapsar(nomePropio(colapsar(api.nomemedico)))
    expect(colapsar(await p.textoDe(id))).toBe(esperado)
    if (esperado !== colapsar(api.nomemedico)) transformados += 1
    // Especialidade ("CRM - N · Especialidade"): a parte depois do " · " também em nome próprio.
    const sub = await p.textoDe(`prescritores_item_${codigoDe(id)}_texto_crm`)
    const especialidade = sub.split(' · ')[1]
    if (especialidade && /[A-Za-zÀ-ÿ]{4,}/.test(especialidade)) expect(especialidade).not.toBe(especialidade.toUpperCase())
  }
  expect(transformados).toBeGreaterThanOrEqual(1) // a regra foi exercitada (nome em CAIXA ALTA mudou)
  await capturar(driver, 'lista-prescritores-negrito') // negrito: quadro lido por mim (T-031)
})

// ---- busca -------------------------------------------------------------------------------------

When('busco {string} na lista de prescritores', async function (texto) {
  const p = lista()
  await p.aguardarTela()
  await p.aguardarCarregar()
  await p.preencher('prescritores_campo_busca', texto)
  await p.fecharTecladoSeAberto()
  // Debounce de 350 ms + filtro local: espera o botão "×" (só com texto) e a lista estabilizar.
  await p.esperarVisivel('prescritores_busca_botao_limpar')
})

Then('a lista de prescritores mostra só os resultados da API para {string}', async function (texto) {
  const p = lista()
  const naApi = await BackendService.listar(`/prescritores?q=${encodeURIComponent(texto)}&limite=100`)
  expect(naApi.length).toBeGreaterThanOrEqual(1)
  const esperados = new Set(naApi.map((x) => x.codigo_medico))
  await driver.waitUntil(async () => {
    const codigos = (await p.idsNaOrdemVisual(ITEM)).map((id) => Number(id.split('_').pop()))
    return codigos.length === esperados.size && codigos.every((c) => esperados.has(c))
  }, { timeout: 15000, timeoutMsg: `timed out while waiting for the search results of "${texto}" to match the API` })
})

When('limpo a busca da lista de prescritores', async function () {
  await lista().tocar('prescritores_busca_botao_limpar')
})

Then('a busca está vazia e a lista de prescritores voltou ao topo', async function () {
  const p = lista()
  await driver.waitUntil(async () => (await p.contar('prescritores_busca_botao_limpar')) === 0, { timeout: 10000 })
  expect((await p.textoDe('prescritores_campo_busca')).length).toBeLessThanOrEqual(0)
  await driver.waitUntil(async () => (await p.idsNaOrdemVisual(ITEM)).length > 1, { timeout: 15000, timeoutMsg: 'timed out while waiting for the full list after clearing the search' })
})

// ---- cabeçalhos meus/outros ---------------------------------------------------------------------

Then('os prescritores acima de {string} são vinculados a mim conforme a API', async function (_cabecalho) {
  const p = lista()
  await p.aguardarCarregar()
  const { codigos } = await BackendService.obter('/prescritores/vinculados-a-mim')
  await p.esperarVisivel('prescritores_cabecalho_meus')
  // A lista é preguiçosa: com 6 vinculados o cabeçalho "Outros prescritores" fica abaixo da dobra e não existe na
  // árvore. Rola devagar (30%, 600 px/s: o gesto rápido pula cartões) até ele ficar visível, limite de 15 rolagens.
  for (let i = 0; i <= 15; i++) {
    const todos = await p.driver.$$('android=new UiSelector().resourceId("prescritores_cabecalho_outros")')
    let visivel = false
    for (const el of todos) if (await el.isDisplayed()) visivel = true
    if (visivel) break
    await p.arrastar('prescritores_lista', 'up', 0.3, 600)
  }
  const topoOutros = BasePage_limites(await p.atributo('prescritores_cabecalho_outros', 'bounds')).t
  const acima = []
  for (const id of await p.idsNaOrdemVisual(ITEM)) {
    const topo = BasePage_limites(await p.atributo(id, 'bounds')).t
    if (topo < topoOutros) acima.push(Number(id.split('_').pop()))
  }
  expect(acima.length).toBeGreaterThanOrEqual(1)
  for (const c of acima) expect(codigos).toContain(c) // todo item acima do cabeçalho "Outros" é vinculado a mim
})

// ---- detalhe -----------------------------------------------------------------------------------

let codigoAberto
When('abro o detalhe do primeiro prescritor da lista', async function () {
  const p = lista()
  await p.aguardarCarregar()
  const primeiro = await p.primeiroItem()
  codigoAberto = Number((await primeiro.getAttribute('resource-id')).split('_').pop())
  await primeiro.click()
  await p.esperarVisivel('prescritordetalhe_texto_nome')
})

Then('o detalhe do prescritor mostra nome, CRM, telefone, endereço, situação e vínculo conforme a API', async function () {
  const p = lista()
  const api = await BackendService.obter(`/prescritores/${codigoAberto}`)
  const { codigos } = await BackendService.obter('/prescritores/vinculados-a-mim')
  expect(colapsar(await p.textoDe('prescritordetalhe_texto_nome'))).toBe(colapsar(api.nomemedico))
  expect(await p.textoDe('prescritordetalhe_texto_crm')).toBe(api.crm)
  if (api.telefone1) expect(await p.textoDe('prescritordetalhe_texto_telefone')).toBe(api.telefone1)
  if (api.endereco) expect(colapsar(await p.textoDe('prescritordetalhe_texto_endereco'))).toBe(colapsar(api.endereco))
  expect(await p.textoDe('prescritordetalhe_texto_situacao')).toBe(api.ativo ? 'Ativo' : 'Inativo')
  const vinculado = codigos.includes(codigoAberto)
  expect(await p.textoDe('prescritordetalhe_texto_vinculo')).toBe(vinculado ? 'Vinculado a você' : 'Não vinculado a você')
  for (const aba of ['dados', 'locais', 'secretarias', 'grafico']) await expect(p.porTag(`prescritordetalhe_aba_${aba}`)).toBeDisplayed()
  await expect(p.porTag('prescritordetalhe_botao_editar')).toBeDisplayed()
})

Then('as abas Locais e Secretárias do detalhe mostram a contagem de vinculados conforme a API', async function () {
  const p = lista()
  const locais = (await BackendService.listar(`/locais-atendimento?codigoPrescritor=${codigoAberto}`)).filter((l) => l.vinculado).length
  const secretarias = (await BackendService.listar(`/secretarias?codigoPrescritor=${codigoAberto}`)).length
  const n = async (tag) => Number(/\((\d+)\)/.exec(await p.rotuloDe(tag))?.[1])
  expect(await n('prescritordetalhe_aba_locais')).toBe(locais)
  expect(await n('prescritordetalhe_aba_secretarias')).toBe(secretarias)
})

// ---- formulário --------------------------------------------------------------------------------

When('toco no botão + de Prescritores', async function () {
  await lista().tocar('prescritores_fab_novo')
  await lista().esperarVisivel('prescritorform_botao_salvar')
})

Then('vejo o formulário Incluir prescritor com as abas e os campos', async function () {
  const p = lista()
  expect((await p.textoDe('prescritorform_texto_titulo')).toUpperCase()).toBe('INCLUIR PRESCRITOR')
  for (const tag of ['aba_dados', 'aba_contato', 'aba_endereco', 'campo_conselho', 'campo_uf', 'campo_numero', 'campo_nome', 'radio_sexo_masculino', 'radio_sexo_feminino', 'campo_grupo', 'campo_especialidade', 'check_vincular', 'botao_salvar']) {
    await expect(p.porTag(`prescritorform_${tag}`)).toBeDisplayed()
  }
})

let totalPrescritoresAntes
When('toco em Salvar no formulário de prescritor', async function () {
  totalPrescritoresAntes = (await BackendService.listar('/prescritores?limite=500')).length
  await lista().fecharTecladoSeAberto()
  await lista().tocar('prescritorform_botao_salvar')
})

Then('vejo a mensagem {string} e nenhum prescritor novo na API', async function (mensagem) {
  const p = lista()
  await p.esperarVisivel('prescritorform_texto_erro')
  expect(await p.textoDe('prescritorform_texto_erro')).toBe(mensagem)
  expect((await BackendService.listar('/prescritores?limite=500')).length).toBe(totalPrescritoresAntes)
})

When('digito {string} no nome do prescritor', async function (texto) {
  await lista().preencher('prescritorform_campo_nome', texto)
})

When('toco na seta de voltar do formulário de prescritor', async function () {
  await lista().fecharTecladoSeAberto()
  await lista().tocar('prescritorform_botao_voltar')
})

Then('volto para a lista de prescritores', async function () {
  await lista().aguardarTela()
  expect(await lista().contar('prescritorform_botao_salvar')).toBe(0)
})

// BasePage.limites sem importar a classe inteira neste arquivo.
function BasePage_limites(texto) {
  const [l, t, r, b] = texto.match(/\d+/g).map(Number)
  return { l, t, r, b }
}

// ---- filtros (lote 2) ---------------------------------------------------------------------------

let codigoGrupo
let codigoEspecialidade

async function escolherPrimeiroDoSeletor(p, campo, prefixoSeletor) {
  await p.aguardarCarregar()
  await p.tocar(campo)
  await p.esperarVisivel(`${prefixoSeletor}_lista`)
  const primeiro = (await p.idsNaOrdemVisual(`^${prefixoSeletor}_item_[0-9]+$`))[0]
  await p.tocar(primeiro)
  await driver.waitUntil(async () => (await p.contar(`${prefixoSeletor}_lista`)) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the selector to close' })
  await p.aguardarCarregar()
  return Number(primeiro.split('_').pop())
}

When('escolho o primeiro grupo no filtro de prescritores', async function () {
  codigoGrupo = await escolherPrimeiroDoSeletor(lista(), 'prescritores_campo_filtro_grupo', 'prescritores_filtro_grupo')
})

When('escolho a primeira especialidade no filtro de prescritores', async function () {
  codigoEspecialidade = await escolherPrimeiroDoSeletor(lista(), 'prescritores_campo_filtro_especialidade', 'prescritores_filtro_especialidade')
})

Then('a lista de prescritores mostra só prescritores do grupo escolhido conforme a API', async function () {
  const p = lista()
  await p.esperarVisivel('prescritores_botao_limpar_filtros')
  const naApi = await BackendService.listar(`/prescritores?grupoCodigo=${codigoGrupo}&limite=100`)
  expect(naApi.length).toBeGreaterThanOrEqual(1) // o grupo escolhido tem prescritores na API
  const codigos = (await p.idsNaOrdemVisual(ITEM)).map((id) => Number(id.split('_').pop()))
  expect(codigos.length).toBeGreaterThanOrEqual(1)
  // A tela mostra os 100 primeiros da cópia local (ordem do app), que não são os 100 primeiros da API: o prescritor
  // visível pode não estar em `limite=100`. A prova exata é o grupo de cada um, lido no próprio registro da API.
  for (const c of codigos) expect((await BackendService.obter(`/prescritores/${c}`)).grupoCodigo).toBe(codigoGrupo)
})

Then('a lista de prescritores mostra só prescritores da especialidade escolhida conforme a API', async function () {
  const p = lista()
  await p.esperarVisivel('prescritores_botao_limpar_filtros')
  const naApi = new Set((await BackendService.listar(`/prescritores?especialidadeCodigo=${codigoEspecialidade}&limite=100`)).map((x) => x.codigo_medico))
  expect(naApi.size).toBeGreaterThanOrEqual(1)
  const codigos = (await p.idsNaOrdemVisual(ITEM)).map((id) => Number(id.split('_').pop()))
  expect(codigos.length).toBeGreaterThanOrEqual(1)
  for (const c of codigos) expect(naApi.has(c)).toBe(true)
})

When('limpo os filtros da lista de prescritores', async function () {
  await lista().tocar('prescritores_botao_limpar_filtros')
})

Then('o botão de limpar filtros some', async function () {
  await driver.waitUntil(async () => (await lista().contar('prescritores_botao_limpar_filtros')) === 0, { timeout: 10000 })
})

// ---- abas do detalhe ------------------------------------------------------------------------------

When('abro a aba Locais do detalhe do prescritor', async function () {
  await lista().tocar('prescritordetalhe_aba_locais')
  await lista().esperarVisivel('prescritordetalhe_locais_lista')
})

Then('a aba Locais lista os locais vinculados do prescritor conforme a API', async function () {
  const p = lista()
  const vinculados = (await BackendService.listar(`/locais-atendimento?codigoPrescritor=${codigoAberto}`)).filter((l) => l.vinculado)
  const esperados = new Set(vinculados.map((l) => l.codigo))
  // T-036: Locais virou uma lista única (vinculados primeiro, depois os demais) e a lista é preguiçosa: os
  // primeiros min(visíveis, vinculados) cartões têm que ser vinculados, com o nome em nome próprio.
  await driver.waitUntil(async () => (await p.idsNaOrdemVisual('^prescritordetalhe_local_[0-9]+$')).length >= 1, { timeout: 15000, timeoutMsg: 'timed out while waiting for the places list' })
  const codigos = (await p.idsNaOrdemVisual('^prescritordetalhe_local_[0-9]+$')).map(codigoDe)
  for (const c of codigos.slice(0, Math.min(codigos.length, esperados.size))) expect(esperados.has(c)).toBe(true)
  // Cada local mostra nome (em nome próprio) e endereço (ou "Sem endereço") — nunca vazio.
  for (const l of vinculados.filter((x) => codigos.includes(x.codigo)).slice(0, 3)) {
    expect(colapsar(await p.textoDe(`prescritordetalhe_local_${l.codigo}_texto_nome`))).toBe(colapsar(nomePropio(colapsar(l.nomeatendimento))))
    expect((await p.textoDe(`prescritordetalhe_local_${l.codigo}_texto_endereco`)).length).toBeGreaterThan(0)
  }
})

When('abro a aba Secretárias do detalhe do prescritor', async function () {
  await lista().tocar('prescritordetalhe_aba_secretarias')
  await lista().esperarVisivel('prescritordetalhe_secretarias_lista')
})

Then('a aba Secretárias lista as secretárias vinculadas do prescritor conforme a API', async function () {
  const p = lista()
  const naApi = await BackendService.listar(`/secretarias?codigoPrescritor=${codigoAberto}`)
  const esperados = new Set(naApi.map((s) => s.codigo))
  // T-036: lista única (vinculadas primeiro, depois as outras do tenant) e preguiçosa: os primeiros
  // min(visíveis, vinculadas) cartões são vinculadas; o nome aparece em nome próprio (T-031).
  await driver.waitUntil(async () => (await p.idsNaOrdemVisual('^prescritordetalhe_secretaria_[0-9]+$')).length >= 1, { timeout: 15000, timeoutMsg: 'timed out while waiting for the secretaries list' })
  const codigos = (await p.idsNaOrdemVisual('^prescritordetalhe_secretaria_[0-9]+$')).map(codigoDe)
  for (const c of codigos.slice(0, Math.min(codigos.length, esperados.size))) expect(esperados.has(c)).toBe(true)
  for (const s of naApi.filter((x) => codigos.includes(x.codigo))) {
    expect(colapsar(await p.textoDe(`prescritordetalhe_secretaria_${s.codigo}_texto_nome`))).toBe(colapsar(nomePropio(colapsar(s.nomesecretaria))))
    expect((await p.textoDe(`prescritordetalhe_secretaria_${s.codigo}_texto_contato`)).length).toBeGreaterThan(0)
  }
})

// ---- gráfico do prescritor ------------------------------------------------------------------------

When('abro a aba Gráfico do detalhe do prescritor', async function () {
  await lista().tocar('prescritordetalhe_aba_grafico')
  await lista().esperarVisivel('prescritordetalhe_grafico_texto_ano')
})

async function conferirGrafico(p, ano) {
  const me = await BackendService.sessao()
  const serie = await BackendService.listar(`/relatorios/grafico/ano/${ano}/prescritor/${codigoAberto}/representante/${me.codigoFuncionario}`)
  const total = serie.reduce((acc, m) => acc + (m.qtdeVisita ?? 0), 0)
  await driver.waitUntil(async () => (await p.textoDe('prescritordetalhe_grafico_texto_ano')) === String(ano), { timeout: 10000, timeoutMsg: `timed out while waiting for the chart year ${ano}` })
  await driver.waitUntil(async () => (await p.textoDe('prescritordetalhe_grafico_texto_total')) === `Total no ano: ${total}`, { timeout: 15000, timeoutMsg: `timed out while waiting for the yearly total (${total}) of ${ano}` })
  for (const serieTag of ['visitas', 'receita', 'movimentos']) await expect(p.porTag(`prescritordetalhe_grafico_serie_${serieTag}`)).toBeDisplayed()
  for (let m = 1; m <= 12; m += 1) await expect(p.porTag(`prescritordetalhe_grafico_barra_${m}`)).toBeDisplayed()
}

Then('o gráfico mostra o ano atual e o total de visitas do ano conforme a API', async function () {
  await conferirGrafico(lista(), agoraSP().ano)
})

When('volto um ano no gráfico do prescritor', async function () {
  await lista().tocar('prescritordetalhe_grafico_ano_anterior')
})

Then('o gráfico mostra o ano anterior e o total de visitas conforme a API', async function () {
  await conferirGrafico(lista(), agoraSP().ano - 1)
})

// ---- máscara de telefone e CEP ----------------------------------------------------------------------

When('abro a aba Contato do formulário de prescritor', async function () {
  await lista().tocar('prescritorform_aba_contato')
  await lista().esperarVisivel('prescritorform_campo_telefone1')
})

When('digito {string} no telefone 1 do prescritor', async function (texto) {
  await lista().preencher('prescritorform_campo_telefone1', texto)
})

Then('o telefone 1 do prescritor mostra {string}', async function (esperado) {
  expect(await lista().textoDe('prescritorform_campo_telefone1')).toBe(esperado)
})

When('abro a aba Endereço do formulário de prescritor', async function () {
  await lista().tocar('prescritorform_aba_endereco')
  await lista().esperarVisivel('prescritorform_endereco_campo_cep')
})

When('digito o CEP {string} no endereço do prescritor', async function (cep) {
  await lista().preencher('prescritorform_endereco_campo_cep', cep)
  await lista().fecharTecladoSeAberto()
})

const normaliza = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

Then('o endereço do prescritor foi preenchido pelo CEP com a Praça da Sé', async function () {
  const p = lista()
  // O aviso do CEP acompanha a busca: "Buscando…" → "Endereço preenchido pelo CEP — confira." (ou a variante
  // "cidade não está no catálogo"). Espera sair do "Buscando".
  await driver.waitUntil(async () => {
    const aviso = (await p.contar('prescritorform_endereco_texto_cep_aviso')) ? await p.textoDe('prescritorform_endereco_texto_cep_aviso') : ''
    return aviso.length > 0 && !/Buscando/.test(aviso)
  }, { timeout: 30000, timeoutMsg: 'timed out while waiting for the ViaCEP lookup to finish' })
  expect(normaliza(await p.textoDe('prescritorform_endereco_campo_endereco'))).toContain('praca da se')
  // Bairro é campo de seleção: o valor fica num TextView filho (o `text` do campo vem vazio) — `rotuloDe`
  // lê os filhos pelos bounds do id e o rótulo "Bairro" vem antes do valor.
  expect(normaliza(await p.rotuloDe('prescritorform_endereco_campo_bairro'))).toMatch(/ se$/)
})

// ---- seletor de conselho -------------------------------------------------------------------------------

When('toco no campo Conselho do formulário de prescritor', async function () {
  await lista().tocar('prescritorform_campo_conselho')
})

Then('vejo o seletor de conselho com busca e lista', async function () {
  const p = lista()
  await p.esperarVisivel('prescritorform_conselho_lista')
  await expect(p.porTag('prescritorform_conselho_campo_busca')).toBeDisplayed()
  await expect(p.porTag('prescritorform_conselho_botao_voltar')).toBeDisplayed()
})

// ---- T-024: rótulos de botão -----------------------------------------------------------------------------

// T-036: o botão virou "+" flutuante sem texto visível; a descrição fica no content-desc do ícone dentro do botão (lida pelos bounds do id).
const botaoSoComDescricao = async (tag, descricao) => {
  expect(await lista().descricaoDe(tag)).toBe(descricao)
  expect(await lista().rotuloDe(tag)).toBe('') // nenhum texto visível dentro do botão
}

Then('o botão de novo local é um {string} sem texto e tem a descrição {string}', async function (_simbolo, descricao) {
  await botaoSoComDescricao('prescritordetalhe_botao_novo_local', descricao)
})

Then('o botão de nova secretária é um {string} sem texto e tem a descrição {string}', async function (_simbolo, descricao) {
  await botaoSoComDescricao('prescritordetalhe_botao_nova_secretaria', descricao)
})

// ---- T-036 (4): detalhe do prescritor, Locais e Secretárias em lista única -----------------------------------

Then('a lista de Locais mostra os vinculados antes dos demais conforme a API e os ids antigos não existem', async function () {
  const p = lista()
  await p.esperarVisivel('prescritordetalhe_locais_campo_busca')
  const naApi = await BackendService.listar(`/locais-atendimento?codigoPrescritor=${codigoAberto}`)
  const vinculados = new Set(naApi.filter((l) => l.vinculado).map((l) => l.codigo))
  expect(naApi.length).toBeGreaterThanOrEqual(1)
  const ids = await p.idsNaOrdemVisual('^prescritordetalhe_local_[0-9]+$')
  expect(ids.length).toBeGreaterThanOrEqual(1)
  const codigos = ids.map(codigoDe)
  for (const c of codigos) expect(naApi.some((l) => l.codigo === c)).toBe(true) // todo cartão é local da API
  // Ordem: nenhum vinculado aparece depois de um não vinculado.
  const flags = codigos.map((c) => vinculados.has(c))
  expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)))
  // Botão por item: vinculado → Desvincular; os demais → Vincular (só confere a existência, nunca toca).
  for (const c of codigos) {
    const tag = `prescritordetalhe_local_${c}`
    expect(await p.contar(`${tag}_botao_${vinculados.has(c) ? 'desvincular' : 'vincular'}`)).toBe(1)
    expect(await p.contar(`${tag}_botao_${vinculados.has(c) ? 'vincular' : 'desvincular'}`)).toBe(0)
  }
  // Cabeçalho "Vinculados" só quando há os dois grupos na lista.
  const temOsDois = vinculados.size > 0 && vinculados.size < naApi.length
  expect(await p.contar('prescritordetalhe_locais_cabecalho_vinculados')).toBe(temOsDois ? 1 : 0)
  // Ids do filtro antigo (vinculados/não vinculados) deixaram de existir.
  for (const removido of ['prescritordetalhe_locais_filtro_vinculados', 'prescritordetalhe_locais_filtro_nao_vinculados']) {
    expect(await p.contar(removido)).toBe(0)
  }
})

Then('a lista de Secretárias mostra as vinculadas antes das outras conforme a API e os ids antigos não existem', async function () {
  const p = lista()
  await p.esperarVisivel('prescritordetalhe_secretarias_campo_busca')
  const vinculadas = new Set((await BackendService.listar(`/secretarias?codigoPrescritor=${codigoAberto}`)).map((s) => s.codigo))
  const todas = await BackendService.listar('/secretarias')
  const ids = await p.idsNaOrdemVisual('^prescritordetalhe_secretaria_[0-9]+$')
  expect(ids.length).toBeGreaterThanOrEqual(1)
  const codigos = ids.map(codigoDe)
  for (const c of codigos) expect(todas.some((s) => s.codigo === c)).toBe(true) // todo cartão é secretária da API
  const flags = codigos.map((c) => vinculadas.has(c))
  expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a))) // vinculadas primeiro
  // Ids do seletor/botão antigos deixaram de existir.
  for (const removido of ['prescritordetalhe_botao_vincular_secretaria', 'prescritordetalhe_secretaria_seletor']) {
    expect(await p.contar(removido)).toBe(0)
  }
})

// ---- T-038 (1)(4): lista estável na busca e erro do próprio campo ---------------------------------------------

Then('a lista de prescritores continua na tela a cada tecla digitada em {string}', async function (texto) {
  const p = lista()
  await p.aguardarCarregar()
  const campo = await p.esperarVisivel('prescritores_campo_busca')
  await campo.click()
  const piscadas = []
  for (const letra of texto) {
    await campo.addValue(letra)
    // Lista na tela a cada tecla (sem sumir nem piscar), com a cópia local: 8 leituras seguidas por tecla, cada consulta ao app dá
    // o ritmo (janela de observação, não espera mágica). O que o usuário VÊ como "sumiu" é a bolinha (ou o estado vazio) no lugar da
    // lista: isso reprova na hora. Uma leitura isolada sem `prescritores_lista` com o campo de busca e os cartões na tela é só a
    // árvore de acessibilidade do Compose recompondo (visto em quadro, 2026-10-17: lista visível, sem bolinha) e não reprova;
    // reprova a lista ausente em TODAS as 8 leituras da tecla.
    let ausentes = 0
    let substituida = 0
    let quemSubstituiu = ''
    let noInstante = ''
    for (let i = 0; i < 8; i++) {
      const bolinha = await p.contar('prescritores_indicador_carregando')
      const vazio = await p.contar('prescritores_texto_estado_vazio')
      const listaNaArvore = (await p.contar('prescritores_lista')) > 0
      // A bolinha só conta quando TOMA o lugar da lista (lista ausente na mesma leitura); com a lista na tela ela é só a revalidação.
      if (!listaNaArvore && bolinha + vazio > 0) {
        substituida += 1
        quemSubstituiu = [bolinha ? 'prescritores_indicador_carregando' : '', vazio ? 'prescritores_texto_estado_vazio' : ''].filter(Boolean).join('+')
      }
      if (!listaNaArvore) {
        ausentes += 1
        // Q-009: o que existe na árvore quando a lista some (1ª ausência da tecla) e se o teclado ainda estava subindo.
        if (!noInstante) {
          // Quadro do mesmo instante, para eu LER (`[R-ID]`: a árvore sem a lista não prova que ela sumiu da tela do usuário).
          await capturar(driver, `lista-ausente-tecla-${letra}`).catch(() => {})
          const xml = await driver.getPageSource()
          const achados = ['prescritores_indicador_carregando', 'prescritores_texto_estado_vazio', 'transicao_indicador_carregando', 'prescritores_campo_busca']
            .filter((id) => xml.includes(`resource-id="${id}"`))
          noInstante = ` [no dump: ${achados.join(', ') || 'nenhum dos 4 ids'}; ${xml.length} bytes; teclado ${await driver.isKeyboardShown() ? 'aberto' : 'fechado'}]`
        }
      }
    }
    if (ausentes > 0) console.log(`6.22 tecla "${letra}": ${ausentes} de 8 leituras sem prescritores_lista na árvore${noInstante}`)
    if (substituida > 0 || ausentes === 8) piscadas.push(`tecla "${letra}": ${substituida} leitura(s) com ${quemSubstituiu || 'a bolinha/estado vazio'} no lugar da lista, ${ausentes} de 8 sem a lista${noInstante}`)
  }
  if (piscadas.length > 0) throw new Error(`a lista sumiu enquanto digitava (T-038 1b): ${piscadas.join(' | ')}`)
  // A lista recompõe enquanto filtra: tenta de novo se um nó ficar obsoleto entre a busca e a leitura.
  await driver.waitUntil(async () => {
    try { return (await p.idsNaOrdemVisual(ITEM)).length >= 1 } catch { return false }
  }, { timeout: 15000, timeoutMsg: 'timed out while waiting for the search results' }) // a busca achou prescritores
  await p.fecharTecladoSeAberto()
})

Then('o campo Nome do prescritor mostra o erro {string}', async function (erro) {
  expect(await lista().textoDe('prescritorform_campo_nome_erro')).toBe(erro)
})

// ---- T-042 (b): vincular/desvincular pela lista --------------------------------------------------------------------------

let prescritorGuardado
// Código e posição (topo) dos cartões `prescritores_item_<codigo>` à vista, com o topo do cabeçalho "Outros prescritores".
const cartoesDaLista = async (p) => {
  const topoOutros = (await p.contar('prescritores_cabecalho_outros')) > 0
    ? BasePage_limites(await p.atributo('prescritores_cabecalho_outros', 'bounds')).t
    : Infinity
  const cartoes = []
  for (const el of await p.driver.$$('android=new UiSelector().resourceIdMatches("^prescritores_item_[0-9]+$")')) {
    const codigo = Number((await el.getAttribute('resource-id')).split('_').pop())
    cartoes.push({ codigo, meu: BasePage_limites(await el.getAttribute('bounds')).t < topoOutros })
  }
  return cartoes
}

When('guardo o primeiro prescritor de Outros prescritores', async function () {
  const p = lista()
  await p.aguardarTela()
  await p.aguardarCarregar()
  await p.esperarVisivel('prescritores_cabecalho_outros')
  const outros = (await cartoesDaLista(p)).filter((c) => !c.meu)
  expect(outros.length).toBeGreaterThanOrEqual(1) // há prescritor ainda não vinculado para vincular (R-AFP)
  const jaMeus = new Set((await BackendService.obter('/prescritores/vinculados-a-mim')).codigos)
  prescritorGuardado = outros.find((c) => !jaMeus.has(c.codigo))?.codigo
  expect(prescritorGuardado).toBeDefined()
  // ANTES de tocar: a limpeza desvincula o que este cenário vincular a mais, mesmo se ele falhar no meio (grava no tenant real).
  await BackendService.registrarVinculadosAntes()
})

When('toco em Vincular a mim no prescritor guardado', async function () {
  await lista().tocar(`prescritores_item_${prescritorGuardado}_botao_vincular`)
})

When('toco em Desvincular no prescritor guardado', async function () {
  const p = lista()
  // O botão do cartão é UM só id (`_botao_vincular`) e o rótulo alterna "Vincular a mim" ↔ "Desvincular". Depois de vincular o
  // cartão sobe para "Vinculados a mim", no topo da lista: volta ao topo (até 10 rolagens) até o botão dele aparecer.
  const botao = `prescritores_item_${prescritorGuardado}_botao_vincular`
  for (let i = 0; i < 10; i++) {
    const achados = await p.driver.$$(`android=new UiSelector().resourceId("${botao}")`)
    if (achados.length > 0 && (await achados[0].isDisplayed())) break
    await p.arrastar('prescritores_lista', 'down', 0.6)
  }
  await driver.waitUntil(async () => (await p.rotuloDe(botao)).toLowerCase().includes('desvincular'), { timeout: 10000, timeoutMsg: 'timed out while waiting for the button label to become "Desvincular"' })
  await p.tocar(botao)
})

const vinculadosNaApi = async () => new Set((await BackendService.obter('/prescritores/vinculados-a-mim')).codigos)

Then('o prescritor guardado está entre os vinculados a mim na lista e na API', async function () {
  const p = lista()
  await driver.waitUntil(async () => (await vinculadosNaApi()).has(prescritorGuardado), { timeout: 20000, timeoutMsg: 'timed out while waiting for the API to list the prescriber as linked' })
  await driver.waitUntil(async () => (await cartoesDaLista(p)).some((c) => c.codigo === prescritorGuardado && c.meu), {
    timeout: 20000, timeoutMsg: 'timed out while waiting for the prescriber to move up to "Vinculados a mim"',
  })
})

Then('o prescritor guardado voltou para Outros prescritores na lista e na API', async function () {
  const p = lista()
  await driver.waitUntil(async () => !(await vinculadosNaApi()).has(prescritorGuardado), { timeout: 20000, timeoutMsg: 'timed out while waiting for the API to unlink the prescriber' })
  await driver.waitUntil(async () => {
    const achado = (await cartoesDaLista(p)).find((c) => c.codigo === prescritorGuardado)
    return Boolean(achado) && !achado.meu
  }, { timeout: 20000, timeoutMsg: 'timed out while waiting for the prescriber to go back to "Outros prescritores"' })
})

// ---- T-038 (5)(e): botão "Editar prescritor" ----------------------------------------------------------------------------------

Then('o botão Editar do detalhe do prescritor diz {string}', async function (texto) {
  expect((await lista().rotuloDe('prescritordetalhe_botao_editar')).toLowerCase()).toBe(texto.toLowerCase()) // a Nord exibe em maiúsculas
})

When('toco no botão Editar do detalhe do prescritor', async function () {
  await lista().tocar('prescritordetalhe_botao_editar')
  await lista().esperarVisivel('prescritorform_botao_salvar')
})

Then('o formulário de edição do prescritor mostra o nome conforme a API', async function () {
  const p = lista()
  const api = await BackendService.obter(`/prescritores/${codigoAberto}`)
  expect((await p.textoDe('prescritorform_texto_titulo')).toUpperCase()).toBe('EDITAR PRESCRITOR')
  expect(colapsar(await p.textoDe('prescritorform_campo_nome'))).toBe(colapsar(api.nomemedico))
})

// ---- T-013: caixa "Vincular a mim" (LinhaCheckbox) ---------------------------------------------------------------------------------

const estadoDaCaixa = async (esperado, texto) => {
  const p = lista()
  expect((await p.rotuloDe('prescritorform_check_vincular')).toLowerCase()).toContain(texto.toLowerCase()) // o texto está no componente
  await driver.waitUntil(async () => (await p.estaMarcado('prescritorform_check_vincular')) === esperado, { timeout: 10000, timeoutMsg: `timed out while waiting for the checkbox to be ${esperado ? 'checked' : 'unchecked'}` })
}

Then('a caixa {string} do formulário de prescritor está desmarcada', async function (texto) {
  await estadoDaCaixa(false, texto)
})

When('toco na caixa Vincular a mim do formulário de prescritor', async function () {
  await lista().tocar('prescritorform_check_vincular')
})

Then('a caixa {string} do formulário de prescritor está marcada', async function (texto) {
  await estadoDaCaixa(true, texto)
})
