import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { RelatorioPage } from '../pages/3.relatorioPage.js'
import { BackendService } from '../services/BackendService.js'
import { agoraSP, mesAnoAtual, semanaAtual } from '../support/dataPtBr.js'
import { nomePropio } from '../support/nomePropio.js'
import { capturar } from '../support/visual.js'
import {
  limparLogcat, contarChamadasHttp, iniciarMedicaoDeFluidez, medirFluidez,
} from '../support/dispositivo.js'
import {
  formatoBRL, somar, textoTotaisEsperado, venda,
} from '../support/formatoPtBr.js'

// Normaliza o traço do intervalo (– ou -) e espaços para comparar sem depender do caractere exato.
const normalizar = (texto) => texto.replace(/\s*[–-]\s*/g, ' - ').replace(/\s+/g, ' ').trim()
const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const pad = (n) => String(n).padStart(2, '0')

let pagina
const relatorio = () => { pagina ??= new RelatorioPage(driver); return pagina }

// Resultados do mês `mes` (1-12) do ano `ano` na API real.
const doMes = (ano, mes) => BackendService.resultadosPorPrescritor(ano, mes)

Then('vejo as abas e a semana atual de segunda a domingo', async function () {
  pagina = new RelatorioPage(driver)
  await pagina.aguardarTela()
  await expect(pagina.tituloText()).toBeDisplayed()
  // T-036: o seletor de visão (`‹ visão ›`) substituiu as 3 abas; "Minha semana" é a visão padrão.
  for (const tag of ['relatorios_visao_anterior', 'relatorios_visao_texto', 'relatorios_visao_proxima']) {
    await expect(pagina.porTag(tag)).toBeDisplayed()
  }
  expect((await pagina.textoDe('relatorios_visao_texto')).toLowerCase().trim()).toBe('minha semana')
  await expect(pagina.porTag('relatorios_semana_anterior')).toBeDisplayed()
  await expect(pagina.porTag('relatorios_semana_proxima')).toBeDisplayed()

  // Informação correta: "Minha semana" é a aba padrão e abre na semana de hoje (segunda a domingo).
  expect(normalizar(await pagina.textoDe('relatorios_semana_texto'))).toBe(normalizar(semanaAtual()))

  // Conteúdo: depois de carregar, totais ou estado vazio (pelo menos um), sem erro.
  await pagina.aguardarCarregarSemana()
  const conteudo = (await pagina.contar('relatorios_semana_texto_totais')) + (await pagina.contar('relatorios_semana_texto_estado_vazio'))
  expect(conteudo).toBeGreaterThanOrEqual(1)
  expect(await pagina.contar('relatorios_semana_texto_erro')).toBe(0)
})

// ---- T-011 ----------------------------------------------------------------------------------

When('abro a aba Por prescritor', async function () {
  await relatorio().abrirAba('prescritor')
})

When('abro a aba Especialidade', async function () {
  await relatorio().abrirAba('especialidade')
})


When('escolho o período Ano', async function () {
  await relatorio().escolherPeriodo('ano')
})

When('volto até janeiro do ano atual e mais um mês', async function () {
  const p = relatorio()
  const { mes } = agoraSP()
  for (let i = 0; i < mes; i += 1) {
    const antes = await p.mesAnoTexto()
    await p.tocar('relatorios_navegador_mes_anterior')
    // Sincroniza pelo texto do mês, que muda a cada toque (nunca por tempo).
    await driver.waitUntil(async () => (await p.mesAnoTexto()) !== antes, { timeout: 10000, timeoutMsg: 'timed out while waiting for the month to change' })
  }
  await p.aguardarCarregarLista()
})

When('escolho setembro pelo seletor de mês e ano', async function () {
  const p = relatorio()
  await p.tocar('relatorios_texto_mes_ano')
  await p.esperarVisivel('relatorios_seletor_dialogo')
  await p.tocar('relatorios_seletor_mes_9')
  await driver.waitUntil(async () => (await p.contar('relatorios_seletor_dialogo')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the month picker to close' })
  await p.aguardarCarregarLista()
})

When('toco no cartão Total', async function () {
  await relatorio().tocar('relatorios_card_totais')
  await relatorio().esperarVisivel('relatorios_detalhe_modal')
})

Then('vejo os totais do mês e os maiores prescritores por venda conforme a API', async function () {
  const p = relatorio()
  const { ano, mes } = agoraSP()
  const naApi = await doMes(ano, mes)
  expect(naApi.length).toBeGreaterThanOrEqual(1) // massa real do tenant: sem ela o cenário não prova nada

  expect((await p.mesAnoTexto()).toLowerCase()).toBe(mesAnoAtual().toLowerCase())
  expect(await p.totaisTexto()).toBe(textoTotaisEsperado(naApi))

  // Ordem padrão "Venda ↓": os 3 primeiros da tela são os 3 maiores da API.
  const esperados = [...naApi].sort((a, b) => venda(b) - venda(a)).slice(0, 3).map((x) => x.nomeMedico.toUpperCase())
  expect((await p.titulosVisiveis(3)).map((s) => s.toUpperCase())).toEqual(esperados)
})

Then('a lista começa pelos primeiros nomes em ordem alfabética conforme a API', async function () {
  const p = relatorio()
  const { ano, mes } = agoraSP()
  const naApi = await doMes(ano, mes)
  const esperados = naApi.map((x) => x.nomeMedico.toUpperCase()).sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, 3)
  expect((await p.titulosVisiveis(3)).map((s) => s.toUpperCase())).toEqual(esperados)
})

Then('vejo os totais do ano atual conforme a API', async function () {
  const p = relatorio()
  const { ano } = agoraSP()
  const naApi = await BackendService.resultadosPorPeriodo(`${ano}-01-01`, `${ano}-12-31`)
  expect(naApi.length).toBeGreaterThanOrEqual(1)
  // No período Ano o navegador troca de id: `relatorios_texto_ano` (e não `..._mes_ano`).
  expect(await p.textoDe('relatorios_texto_ano')).toBe(String(ano))
  expect(await p.totaisTexto()).toBe(textoTotaisEsperado(naApi))
})

Then('vejo dezembro do ano anterior com os totais conforme a API', async function () {
  const p = relatorio()
  const { ano } = agoraSP()
  expect(await p.mesAnoTexto()).toBe(`Dezembro ${ano - 1}`)
  expect(await p.totaisTexto()).toBe(textoTotaisEsperado(await doMes(ano - 1, 12)))
})

Then('vejo setembro do ano atual com os totais conforme a API', async function () {
  const p = relatorio()
  const { ano } = agoraSP()
  expect(await p.mesAnoTexto()).toBe(`Setembro ${ano}`)
  expect(await p.totaisTexto()).toBe(textoTotaisEsperado(await doMes(ano, 9)))
})

Then('vejo o mini gráfico com as cinco séries, os doze meses e o mês atual em destaque', async function () {
  const p = relatorio()
  const { ano, mes } = agoraSP()
  const naApi = await doMes(ano, mes)
  await expect(p.porTag('relatorios_detalhe_titulo')).toBeDisplayed()
  for (const serie of ['visitas', 'venda', 'alopatia', 'revenda', 'homeopatia']) {
    await expect(p.porTag(`relatorios_detalhe_serie_${serie}`)).toBeDisplayed()
  }
  for (let m = 1; m <= 12; m += 1) await expect(p.porTag(`relatorios_detalhe_barra_${m}`)).toBeDisplayed()
  // Mês em destaque = mês de hoje, e o valor da série "Venda" é a soma real da API (R$).
  expect(await p.textoDe('relatorios_detalhe_texto_mes_ano')).toBe(`${MESES_NOME[mes - 1]} ${ano}`)
  // A Nord exibe o valor do mês em maiúsculas ("OUTUBRO 2026: R$ …"): compara sem diferenciar caixa.
  expect((await p.textoDe('relatorios_detalhe_texto_mes')).toLowerCase()).toBe(`${MESES_NOME[mes - 1]} ${ano}: ${formatoBRL(somar(naApi, 'valorAlopatia') + somar(naApi, 'valorRevenda') + somar(naApi, 'valorHomeopatia'))}`.toLowerCase())
})

Then('vejo os totais do mês e a lista agrupada por especialidade', async function () {
  const p = relatorio()
  const { ano, mes } = agoraSP()
  const naApi = await doMes(ano, mes)
  // Os totais da aba Especialidade são os mesmos da aba Por prescritor (mesma fonte, agregada em memória).
  expect(await p.totaisTexto()).toBe(textoTotaisEsperado(naApi))
  await expect(p.porTag('relatorios_lista')).toBeDisplayed()
  // O app escreve literalmente "N prescritor(es)" (inventário do app §11.17) — sem flexão.
  expect(await p.textoDe('relatorios_item_0_texto_subtitulo')).toMatch(/^\d+ prescritor\(es\)$/)
  // Cada especialidade distinta da API vira um item: o nº de especialidades distintas bate com a lista toda.
  const distintas = new Set(naApi.map((x) => (x.especialidade ?? '').toUpperCase())).size
  expect(distintas).toBeGreaterThanOrEqual(1)
})

// ---- T-031 / T-011 (restante) ----------------------------------------------------------------------

const colapsar = (s) => s.replace(/\s+/g, ' ').trim()
const doMesAtual = () => { const { ano, mes } = agoraSP(); return doMes(ano, mes) }
const vendaDe = (p) => (p.valorAlopatia ?? 0) + (p.valorRevenda ?? 0) + (p.valorHomeopatia ?? 0)
const VALOR_POR_CAMPO = {
  venda: vendaDe,
  visitas: (p) => p.qtdeVisitasApp ?? 0,
  revenda: (p) => p.valorRevenda ?? 0,
  alopatia: (p) => p.valorAlopatia ?? 0,
  homeopatia: (p) => p.valorHomeopatia ?? 0,
}

Then('os títulos e subtítulos da lista de relatórios seguem a regra de nome próprio conforme a API', async function () {
  const p = relatorio()
  const naApi = await doMesAtual()
  const porNome = new Map(naApi.map((x) => [colapsar(nomePropio(colapsar(x.nomeMedico))), x]))
  let transformados = 0
  for (let i = 0; i < 4; i += 1) {
    const titulo = colapsar(await p.textoDe(`relatorios_item_${i}_texto_titulo`))
    const api = porNome.get(titulo)
    expect(api).toBeDefined() // o título da tela é o nome da API em nome próprio
    if (titulo !== colapsar(api.nomeMedico)) transformados += 1
    const [crm, especialidade] = (await p.textoDe(`relatorios_item_${i}_texto_subtitulo`)).split(' · ')
    expect(crm).toBe(api.crm)
    if (api.especialidade) expect(colapsar(especialidade)).toBe(colapsar(nomePropio(colapsar(api.especialidade))))
  }
  expect(transformados).toBeGreaterThanOrEqual(1)
  await capturar(driver, 'lista-relatorios-negrito')
})

let campoOrdenado
let ordemOrdenada
When('ordeno por {word} em ordem {word}', async function (campo, ordem) {
  campoOrdenado = campo
  ordemOrdenada = ordem
  await relatorio().ordenarPor(campo, ordem)
})

Then('os primeiros prescritores estão ordenados por {word} em ordem {word} conforme a API', async function (campo, ordem) {
  const p = relatorio()
  const naApi = await doMesAtual()
  const porNome = new Map(naApi.map((x) => [colapsar(nomePropio(colapsar(x.nomeMedico))), x]))
  // A lista é preguiçosa: no AVD da suíte (1080×2400) só os cartões 0–3 existem na árvore (visto no
  // page-source da 1ª rodada); pedir o 5º dava timeout em todos os exemplos.
  const titulos = await p.titulosVisiveis(4)
  const valor = VALOR_POR_CAMPO[campo]
  const valores = titulos.map((t) => valor(porNome.get(colapsar(t))))
  expect(valores.every((v) => typeof v === 'number')).toBe(true)
  const esperado = [...valores].sort((a, b) => (ordem === 'crescente' ? a - b : b - a))
  expect(valores).toEqual(esperado) // só crescem (ou só decrescem), lidos da API real
  // Anti falso-positivo: em ordem crescente os primeiros cartões podem ser todos zero (empate), então "os 4
  // valores diferem" não serve. A ordem é provada pelo extremo: o 1º cartão tem o menor (ou o maior) valor
  // de TODA a lista da API — uma lista fora de ordem não passa nisso — e a API tem valores distintos.
  const todos = naApi.map(valor)
  expect(new Set(todos).size).toBeGreaterThan(1)
  expect(valores[0]).toBe(ordem === 'crescente' ? Math.min(...todos) : Math.max(...todos))
})

Then('as primeiras especialidades estão em ordem de venda decrescente conforme a API agregada', async function () {
  const p = relatorio()
  const naApi = await doMesAtual()
  const soma = new Map()
  for (const x of naApi) {
    const nome = colapsar(nomePropio(colapsar(x.especialidade ?? '')))
    soma.set(nome, (soma.get(nome) ?? 0) + vendaDe(x))
  }
  const esperados = [...soma.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
  const titulos = (await p.titulosVisiveis(3)).map(colapsar)
  const valores = titulos.map((t) => soma.get(t))
  expect(valores.every((v) => typeof v === 'number')).toBe(true) // todo título da tela é uma especialidade da API
  expect(valores).toEqual([...valores].sort((a, b) => b - a))
  expect(titulos[0]).toBe(esperados[0])
})

When('toco no primeiro prescritor da lista de relatórios', async function () {
  await relatorio().tocar('relatorios_item_0')
  await relatorio().esperarVisivel('relatorios_detalhe_modal')
})

Then('o gráfico do prescritor mostra o nome e a venda do mês conforme a API', async function () {
  const p = relatorio()
  const { ano, mes } = agoraSP()
  const naApi = await doMes(ano, mes)
  const maior = [...naApi].sort((a, b) => vendaDe(b) - vendaDe(a))[0] // ordem padrão: Venda ↓
  expect(colapsar(await p.textoDe('relatorios_detalhe_titulo')).toLowerCase()).toBe(colapsar(nomePropio(colapsar(maior.nomeMedico))).toLowerCase())
  expect((await p.textoDe('relatorios_detalhe_texto_mes')).toLowerCase()).toBe(`${MESES_NOME[mes - 1]} ${ano}: ${formatoBRL(vendaDe(maior))}`.toLowerCase())
  for (const serie of ['visitas', 'venda', 'alopatia', 'revenda', 'homeopatia']) await expect(p.porTag(`relatorios_detalhe_serie_${serie}`)).toBeDisplayed()
})

When('volto no gráfico até janeiro do ano atual e mais um mês', async function () {
  const p = relatorio()
  const { mes } = agoraSP()
  for (let i = 0; i < mes; i += 1) {
    const antes = await p.textoDe('relatorios_detalhe_texto_mes_ano')
    await p.tocar('relatorios_detalhe_navegador_mes_anterior')
    await driver.waitUntil(async () => (await p.textoDe('relatorios_detalhe_texto_mes_ano')) !== antes, { timeout: 10000, timeoutMsg: 'timed out while waiting for the chart month to change' })
  }
})

Then('o gráfico mostra dezembro do ano anterior com a venda conforme a API', async function () {
  const p = relatorio()
  const { ano } = agoraSP()
  expect(await p.textoDe('relatorios_detalhe_texto_mes_ano')).toBe(`Dezembro ${ano - 1}`)
  const naApi = await doMes(ano - 1, 12)
  await driver.waitUntil(async () => (await p.textoDe('relatorios_detalhe_texto_mes')).toLowerCase() === `Dezembro ${ano - 1}: ${formatoBRL(somar(naApi, 'valorAlopatia') + somar(naApi, 'valorRevenda') + somar(naApi, 'valorHomeopatia'))}`.toLowerCase(), { timeout: 15000, timeoutMsg: 'timed out while waiting for the December chart value' })
})

When('escolho o ano anterior no seletor de ano', async function () {
  const p = relatorio()
  const { ano } = agoraSP()
  await p.tocar('relatorios_texto_ano')
  await p.esperarVisivel('relatorios_seletor_dialogo')
  expect(await p.textoDe('relatorios_seletor_texto_faixa')).toMatch(/^\d{4} – \d{4}$/)
  await p.tocar(`relatorios_seletor_ano_${ano - 1}`)
  await driver.waitUntil(async () => (await p.contar('relatorios_seletor_dialogo')) === 0, { timeout: 10000 })
  await p.aguardarCarregarLista()
})

Then('vejo o ano anterior com os totais do ano conforme a API', async function () {
  const p = relatorio()
  const { ano } = agoraSP()
  expect(await p.textoDe('relatorios_texto_ano')).toBe(String(ano - 1))
  const naApi = await BackendService.resultadosPorPeriodo(`${ano - 1}-01-01`, `${ano - 1}-12-31`)
  expect(await p.totaisTexto()).toBe(textoTotaisEsperado(naApi))
})

When('aguardo a semana carregar', async function () {
  const p = relatorio()
  await p.aguardarTela()
  await p.aguardarCarregarSemana()
})

Then('Minha semana mostra os totais, os sentimentos e os follow-ups pendentes conforme a API', async function () {
  const p = relatorio()
  const segunda = semanaAtual().slice(0, 10).split('/').reverse().join('-')
  const r = await BackendService.obter(`/relatorios/resumo-semanal-ia?semana=${segunda}`)
  expect(await p.textoDe('relatorios_semana_texto_totais')).toBe(`${r.totalResumos} resumo(s) · ${r.prescritoresVisitados} prescritor(es) visitado(s)`)
  for (const s of ['positivo', 'neutro', 'negativo']) {
    expect(Number(/(\d+)/.exec(await p.rotuloDe(`relatorios_semana_chip_${s}`))?.[1])).toBe(r.sentimentos[s])
  }
  const pendentes = r.followUps.filter((f) => !f.concluido).length
  expect((await p.textoDe('relatorios_semana_followups_titulo')).toUpperCase()).toBe(`FOLLOW-UPS (${pendentes} PENDENTES)`)
})

Then('os primeiros produtos da semana são os mais citados conforme a API', async function () {
  const p = relatorio()
  const segunda = semanaAtual().slice(0, 10).split('/').reverse().join('-')
  const r = await BackendService.obter(`/relatorios/resumo-semanal-ia?semana=${segunda}`)
  const nomes = r.produtosMaisCitados.map((x) => x.produto.toLowerCase())
  for (let i = 0; i < 2; i += 1) {
    const chip = (await p.rotuloDe(`relatorios_semana_produto_${i}`)).toLowerCase()
    expect(nomes.some((n) => chip.includes(n))).toBe(true) // o chip cita um produto da lista da API
  }
})

// ---- T-036: seletor de visão e tela da especialidade ----------------------------------------------------

const lerVisao = async (p) => (await p.textoDe('relatorios_visao_texto')).toLowerCase().trim()
const girarVisao = async (p, lado, esperada) => {
  const antes = await lerVisao(p)
  await p.tocar(`relatorios_visao_${lado}`)
  await driver.waitUntil(async () => (await lerVisao(p)) !== antes, { timeout: 10000, timeoutMsg: 'timed out while waiting for the report view to change' })
  expect(await lerVisao(p)).toBe(esperada)
}

Then('o seletor de visão percorre as três visões nos dois sentidos e as abas antigas não existem', async function () {
  const p = relatorio()
  await p.aguardarTela()
  expect(await lerVisao(p)).toBe('minha semana') // visão padrão
  // A seta é rotacional: um toque no mesmo lado percorre as três e volta à origem.
  await girarVisao(p, 'proxima', 'especialidade')
  await girarVisao(p, 'proxima', 'prescritor')
  await girarVisao(p, 'proxima', 'minha semana')
  await girarVisao(p, 'anterior', 'prescritor')
  await girarVisao(p, 'anterior', 'especialidade')
  await girarVisao(p, 'anterior', 'minha semana')
  for (const aba of ['prescritor', 'semana', 'especialidade']) expect(await p.contar(`relatorios_aba_${aba}`)).toBe(0) // ids removidos
})

let especialidadeAberta
When('toco na primeira especialidade da lista', async function () {
  const p = relatorio()
  await p.aguardarCarregarLista()
  especialidadeAberta = colapsar(await p.textoDe('relatorios_item_0_texto_titulo'))
  await p.tocar('relatorios_item_0')
})

Then('a tela da especialidade mostra o nome e os prescritores conforme a API', async function () {
  const p = relatorio()
  await p.esperarVisivel('relatorios_especialidade_texto_titulo')
  expect(colapsar(await p.textoDe('relatorios_especialidade_texto_nome')).toLowerCase()).toBe(especialidadeAberta.toLowerCase())
  const naApi = (await doMesAtual()).filter((x) => colapsar(nomePropio(colapsar(x.especialidade ?? ''))) === especialidadeAberta)
  expect(naApi.length).toBeGreaterThanOrEqual(1) // a especialidade da tela existe na API do mês
  // Totais da especialidade = soma dos prescritores dela na API (mesmo formato do total da lista).
  expect(await p.textoDe('relatorios_especialidade_texto_totais')).toBe(textoTotaisEsperado(naApi))
  // Todo cartão visível é de um prescritor dessa especialidade.
  const nomes = new Set(naApi.map((x) => colapsar(nomePropio(colapsar(x.nomeMedico)))))
  const titulos = await p.idsNaOrdemVisual('^relatorios_especialidade_item_[0-9]+_texto_titulo$')
  expect(titulos.length).toBeGreaterThanOrEqual(1)
  for (const id of titulos) expect(nomes.has(colapsar(await p.textoDe(id)))).toBe(true)
})

When('volto da tela da especialidade', async function () {
  await relatorio().tocar('relatorios_especialidade_botao_voltar')
})

Then('continuo na visão Especialidade', async function () {
  const p = relatorio()
  await p.esperarVisivel('relatorios_visao_texto')
  expect(await lerVisao(p)).toBe('especialidade')
})

// ---- T-037: chamadas HTTP em Relatórios ------------------------------------------------------------------

Given('que limpo o registro de chamadas HTTP do app', async function () {
  await limparLogcat(driver)
})

// Janela de observação de uma asserção de "nunca" (R-AFP): laço com saída por tempo decorrido, cada volta
// consulta o logcat (é o que dá o ritmo) — não é espera mágica.
When('observo as chamadas HTTP do app por {int} segundos', async function (segundos) {
  const fim = Date.now() + segundos * 1000
  while (Date.now() < fim) await contarChamadasHttp(driver, 'GET', '/relatorios/resultados-por-prescritor')
})

Then('Minha semana fez no máximo 1 resumo-semanal-ia e nenhum resultados-por-prescritor', async function () {
  expect(await contarChamadasHttp(driver, 'GET', '/relatorios/resumo-semanal-ia')).toBeLessThanOrEqual(1)
  expect(await contarChamadasHttp(driver, 'GET', '/relatorios/resultados-por-prescritor')).toBe(0)
})

Then('a visão Prescritor fez exatamente 1 resultados-por-prescritor', async function () {
  await relatorio().aguardarCarregarLista()
  expect(await contarChamadasHttp(driver, 'GET', '/relatorios/resultados-por-prescritor')).toBe(1)
})

// ---- T-043: Minha semana como lista preguiçosa -----------------------------------------------------------------

Given('que começo a medir a fluidez do app', async function () {
  await iniciarMedicaoDeFluidez(driver)
})

Then('a fluidez medida teve menos de {int}% de quadros lentos e nenhum salto acima de {int} quadros', async function (limitePct, limiteSalto) {
  const f = await medirFluidez(driver)
  console.log(`FLUIDEZ: ${f.janky}/${f.total} quadros lentos (${f.percentual.toFixed(1)} %); maior "Skipped N frames" = ${f.maiorSalto}`)
  expect(f.total).toBeGreaterThan(0) // a medição existe (R-AFP)
  expect(f.percentual).toBeLessThan(limitePct)
  expect(f.maiorSalto).toBeLessThanOrEqual(limiteSalto)
})

// T-004: só o critério do pedido — nenhum "Skipped N frames" acima do limite no logcat (sem exigir a fatia de quadros lentos).
Then('a fluidez medida não teve nenhum salto acima de {int} quadros', async function (limiteSalto) {
  const f = await medirFluidez(driver)
  console.log(`FLUIDEZ: ${f.janky}/${f.total} quadros lentos (${f.percentual.toFixed(1)} %); maior "Skipped N frames" = ${f.maiorSalto}`)
  expect(f.total).toBeGreaterThan(0) // a medição existe (R-AFP)
  expect(f.maiorSalto).toBeLessThanOrEqual(limiteSalto)
})

const segundaDaSemana = (base = new Date()) => semanaAtual(base).slice(0, 10).split('/').reverse().join('-')
const resumoDaSemana = (base = new Date()) => BackendService.obter(`/relatorios/resumo-semanal-ia?semana=${segundaDaSemana(base)}`)

Then('o último resumo da semana ainda não existe na árvore de UI', async function () {
  const p = relatorio()
  const { resumos } = await resumoDaSemana()
  expect(resumos.length).toBeGreaterThanOrEqual(6) // com poucos resumos tudo cabe na tela e a prova de "só o que está à vista" não vale (R-AFP)
  expect(await p.contar(`relatorios_semana_resumo_${resumos.length - 1}`)).toBe(0)
})

let vistosNaSemana
When('rolo Minha semana até o fim', { timeout: 180000 }, async function () {
  const p = relatorio()
  vistosNaSemana = { followup: new Set(), proxima: new Set(), resumo: new Set() }
  const juntar = async () => {
    let novos = 0
    for (const prefixo of Object.keys(vistosNaSemana)) {
      for (const id of await p.idsDaSemanaNaArvore(prefixo)) {
        if (!vistosNaSemana[prefixo].has(id)) { vistosNaSemana[prefixo].add(id); novos += 1 }
      }
    }
    return novos
  }
  await juntar()
  // Fim da lista = 3 rolagens seguidas sem nenhum item novo (limite de 60 rolagens, nunca "N no olho").
  let semNovos = 0
  for (let i = 0; i < 60 && semNovos < 3; i += 1) {
    await p.rolarSemana('up', 0.4)
    semNovos = (await juntar()) === 0 ? semNovos + 1 : 0
  }
  expect(semNovos).toBe(3) // chegou mesmo ao fim, não parou por limite
})

Then('a rolagem mostrou todos os follow-ups, as próximas visitas e os resumos conforme a API', async function () {
  const r = await resumoDaSemana()
  console.log(`SEMANA na rolagem: follow-ups ${vistosNaSemana.followup.size}/${r.followUps.length}, próximas ${vistosNaSemana.proxima.size}/${r.proximasVisitasSugeridas.length}, resumos ${vistosNaSemana.resumo.size}/${r.resumos.length}`)
  expect(vistosNaSemana.resumo.size).toBe(r.resumos.length)
  expect(vistosNaSemana.proxima.size).toBe(r.proximasVisitasSugeridas.length)
  expect(vistosNaSemana.followup.size).toBe(r.followUps.length)
})

// Follow-up (T-043 c): o item é o container `relatorios_semana_followup_<i>` (checkable); texto e detalhe ficam em filhos.
let followGuardado
const lerFollowups = (p) => p.followupsNaArvore()
// O título "FOLLOW-UPS (N PENDENTES)" faz parte da lista preguiçosa: depois de rolar até um item ele sai da árvore. Volta ao
// topo (limite de 40 rolagens) antes de ler.
const pendentesNoTitulo = async (p) => {
  for (let i = 0; i < 40 && (await p.contar('relatorios_semana_followups_titulo')) === 0; i += 1) await p.rolarSemana('down', 0.6)
  return Number(/\((\d+)\s+PENDENTES\)/i.exec(await p.textoDe('relatorios_semana_followups_titulo'))?.[1])
}

When('guardo o primeiro follow-up pendente de Minha semana', async function () {
  const p = relatorio()
  const pendente = (await lerFollowups(p)).find((f) => !f.checked)
  expect(pendente).toBeDefined() // sem follow-up pendente não há o que marcar (R-AFP)
  // ANTES de tocar: a limpeza reabre o que este cenário marcar a mais, mesmo que ele falhe no meio (grava no tenant real).
  await BackendService.registrarFollowUpsConcluidos()
  followGuardado = { ...pendente, pendentesAntes: await pendentesNoTitulo(p) }
})

When('marco o follow-up guardado', async function () {
  await relatorio().tocar(followGuardado.id)
})

// Acha (rolando) o follow-up guardado pelo par texto + detalhe: depois de marcar ele vai para o fim da lista.
const acharFollowGuardado = async (p) => {
  const procurar = async () => (await lerFollowups(p)).find((f) => f.texto === followGuardado.texto && f.detalhe === followGuardado.detalhe)
  // Passa por toda a lista descendo e, se o item não apareceu (um gesto pode pular linhas com o emulador sob carga), volta
  // subindo: nas duas direções cada rolagem é curta (40%) e lenta, e o item fica entre duas leituras só se sumir da árvore.
  for (const direcao of ['up', 'down', 'up']) {
    for (let i = 0; i < 30; i += 1) {
      const achado = await procurar()
      if (achado) return achado
      await p.rolarSemana(direcao, 0.3)
    }
  }
  throw new Error(`element (follow-up guardado "${followGuardado.texto}" · "${followGuardado.detalhe}") still not found after scrolling the whole list`)
}

const followNaApi = async () => {
  const { followUps } = await resumoDaSemana()
  return followUps.find((f) => f.item === followGuardado.texto && `Prescritor #${f.codigoPrescritor}` === followGuardado.detalhe.split(' · ')[0])
    ?? followUps.find((f) => f.item === followGuardado.texto)
}

Then('o contador de pendentes baixou em 1, o aviso de sucesso apareceu e a API marca o follow-up concluído', async function () {
  const p = relatorio()
  await p.esperarVisivel('app_aviso_sucesso', 15000)
  await driver.waitUntil(async () => (await pendentesNoTitulo(p)) === followGuardado.pendentesAntes - 1, { timeout: 15000, timeoutMsg: 'timed out while waiting for the pending counter to drop by 1' })
  await driver.waitUntil(async () => (await followNaApi())?.concluido === true, { timeout: 20000, timeoutMsg: 'timed out while waiting for the API to mark the follow-up as done' })
})

When('desfaço o follow-up guardado', async function () {
  const p = relatorio()
  await driver.waitUntil(async () => (await p.contar('app_aviso_texto')) === 0, { timeout: 15000, timeoutMsg: 'timed out while waiting for the notice to disappear' })
  const item = await acharFollowGuardado(p)
  expect(item.checked).toBe(true) // o item marcado está em Concluídos
  await p.tocar(item.id)
})

Then('o contador de pendentes voltou ao original e a API reabriu o follow-up', async function () {
  const p = relatorio()
  await driver.waitUntil(async () => (await pendentesNoTitulo(p)) === followGuardado.pendentesAntes, { timeout: 15000, timeoutMsg: 'timed out while waiting for the pending counter to return' })
  await driver.waitUntil(async () => (await followNaApi())?.concluido === false, { timeout: 20000, timeoutMsg: 'timed out while waiting for the API to reopen the follow-up' })
})

// Semana anterior/atual e calendário (T-043 d). O calendário é o DatePicker do Material, em inglês no aparelho (en-US).
When('toco na seta de semana anterior', async function () {
  await relatorio().tocar('relatorios_semana_anterior')
})

Then('a semana mostrada é a anterior sem erro', async function () {
  const p = relatorio()
  const esperada = semanaAtual(new Date(Date.now() - 7 * 86400000))
  await driver.waitUntil(async () => normalizar(await p.textoDe('relatorios_semana_texto')) === normalizar(esperada), { timeout: 15000, timeoutMsg: `timed out while waiting for the week "${esperada}"` })
  await p.aguardarCarregarSemana()
  expect(await p.contar('relatorios_semana_texto_erro')).toBe(0)
})

const MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
When('abro o calendário da semana e escolho hoje', async function () {
  const p = relatorio()
  await p.tocar('relatorios_semana_texto')
  await p.esperarVisivel('relatorios_semana_seletor_dialogo')
  const { ano, mes, dia } = agoraSP()
  // A célula de hoje do DatePicker se chama "Today, <dia da semana>, <Mês> <d>, <aaaa>" (texto, sem id próprio).
  await driver.$(`android=new UiSelector().textContains("${MESES_EN[mes - 1]} ${dia}, ${ano}")`).click()
  await p.tocar('relatorios_semana_seletor_confirmar')
  await driver.waitUntil(async () => (await p.contar('relatorios_semana_seletor_dialogo')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the calendar to close' })
})

Then('a semana mostrada é a atual sem erro', async function () {
  const p = relatorio()
  await driver.waitUntil(async () => normalizar(await p.textoDe('relatorios_semana_texto')) === normalizar(semanaAtual()), { timeout: 15000, timeoutMsg: 'timed out while waiting for the current week' })
  await p.aguardarCarregarSemana()
  expect(await p.contar('relatorios_semana_texto_erro')).toBe(0)
})

// ---- T-047: girar o seletor de visão sem esperar a lista (sem rede ela não carrega) ------------------------------------------

When('giro o seletor para a visão Prescritor', async function () {
  await relatorio().irParaVisao('prescritor')
})

When('giro o seletor para a visão Especialidade', async function () {
  await relatorio().irParaVisao('especialidade')
})
