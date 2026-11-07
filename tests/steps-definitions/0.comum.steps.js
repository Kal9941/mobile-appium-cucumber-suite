// Steps compartilhados entre features (pré-condições comuns). Cenário que precisa
// estar logado NÃO depende de outro cenário: autentica pela UI no próprio Dado
// (AGENTS §1, isolamento de estado).
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { BasePage } from '../pages/BasePage.js'
import { LoginPage } from '../pages/1.loginPage.js'
import { VisitaPage } from '../pages/2.visitaPage.js'
import { MenuPage } from '../pages/9.menuPage.js'
import { loadEnv } from '../support/loadEnv.js'
import { definirEscalaDaFonte } from '../support/dispositivo.js'

const env = loadEnv()

// Autentica só se for preciso: depois de um reinício leve (`@leitura`) a sessão persistente já
// entrega a tela de Visitas; depois do reset completo aparece o Login. Espera por QUALQUER uma das
// duas telas (nunca por tempo) e age conforme a que veio.
Given('que estou autenticado no app', async function () {
  const login = new LoginPage(driver)
  const visitas = new VisitaPage(driver)
  await driver.waitUntil(async () => (await login.contar('login_campo_cnpj')) + (await visitas.contar('visitas_texto_titulo')) > 0, {
    timeout: 30000, timeoutMsg: 'timed out while waiting for the login or the visits screen',
  })
  if ((await login.contar('login_campo_cnpj')) > 0) await login.login(env.credentials)
  // Tela raiz pós-login: Visitas.
  await visitas.aguardarTela()
})

// Navegação pela barra inferior (§11.1 do app) e pelo menu lateral (§11.4).
const DESTINOS_BARRA = {
  'Relatórios': 'relatorios', Chat: 'chat', Ponto: 'ponto', Prescritores: 'prescritores',
}

When(/^acesso (Relatórios|Chat|Ponto|Prescritores) pela barra inferior$/, async function (nome) {
  await new MenuPage(driver).irPelaBarraInferior(DESTINOS_BARRA[nome])
})

When('acesso Secretárias pelo menu lateral', async function () {
  const menu = new MenuPage(driver)
  await menu.abrirMenuLateral()
  await menu.escolherOpcao('secretarias')
})

When('acesso Locais de atendimento pelo menu lateral', async function () {
  const menu = new MenuPage(driver)
  await menu.abrirMenuLateral()
  await menu.escolherOpcao('locais')
})

// ---- T-047: aviso offline `*_texto_offline` em todas as telas servidas da RAM/cópia ---------------------------------------
// O app mostra o mesmo texto padrão SEMPRE que está sem rede (Q-012), mesmo com a tela vinda da memória; some sozinho quando a
// rede volta. O dump é lido em sequência até o id aparecer (a tela acabou de abrir): o tempo sai no log.
const TEXTO_AVISO_OFFLINE = 'Sem conexão — mostrando o que estava salvo no aparelho.'
// Locais tem texto próprio (a lista é a de TODOS os locais da cópia) — visto ao vivo em 2026-10-17, não é defeito.
const TEXTO_AVISO_OFFLINE_POR_TELA = { locaisatendimento_texto_offline: 'Sem conexão — mostrando todos os locais salvos no aparelho.' }

Then('o aviso offline {string} aparece em até {int} segundos', async function (tag, limite) {
  const base = new BasePage(driver)
  const inicio = Date.now()
  await driver.waitUntil(async () => (await driver.getPageSource()).includes(`resource-id="${tag}"`), {
    timeout: limite * 1000, interval: 200, timeoutMsg: `timed out while waiting for the offline notice ${tag} within ${limite} s (T-047 a)`,
  })
  console.log(`TEMPO até o aviso offline ${tag}: ${Date.now() - inicio} ms`)
  expect(await base.textoDe(tag)).toBe(TEXTO_AVISO_OFFLINE_POR_TELA[tag] ?? TEXTO_AVISO_OFFLINE)
})

Then('o aviso offline {string} some em até {int} segundos', { timeout: 240000 }, async function (tag, limite) {
  const inicio = Date.now()
  await driver.waitUntil(async () => (await new BasePage(driver).contar(tag)) === 0, {
    timeout: limite * 1000, interval: 1000, timeoutMsg: `timed out while waiting for the offline notice ${tag} to go away after the network came back (T-047 a)`,
  })
  console.log(`TEMPO até o aviso offline ${tag} sumir: ${Math.round((Date.now() - inicio) / 1000)} s`)
})

// ---- T-004: Salvar alcançável com o teclado aberto, em qualquer formulário de cadastro -----------------------------------------
// O formulário rola e o teclado não cobre o Salvar: com o teclado aberto o toque no botão chega ao app (e não cai no Gboard) —
// prova-se pelo resumo "Preencha: …" que o Salvar do formulário vazio mostra (não grava nada).
const FORMULARIO = { prescritor: 'prescritorform', 'secretária': 'secretariaform', local: 'localform' }

When(/^toco no campo Nome do formulário de (prescritor|secretária|local) e o teclado abre$/, async function (quem) {
  await new BasePage(driver).tocar(`${FORMULARIO[quem]}_campo_nome`)
  await driver.waitUntil(async () => driver.isKeyboardShown(), { timeout: 10000, timeoutMsg: 'timed out while waiting for the keyboard to open' })
})

When(/^toco em Salvar do formulário de (prescritor|secretária|local) com o teclado aberto$/, async function (quem) {
  expect(await driver.isKeyboardShown()).toBe(true) // o teclado segue aberto: nada o fechou antes do toque
  await new BasePage(driver).tocar(`${FORMULARIO[quem]}_botao_salvar`)
})

Then(/^o formulário de (prescritor|secretária|local) mostra o resumo dos campos obrigatórios que faltam$/, async function (quem) {
  const base = new BasePage(driver)
  await base.esperarVisivel(`${FORMULARIO[quem]}_texto_erro`, 10000)
  expect(await base.textoDe(`${FORMULARIO[quem]}_texto_erro`)).toMatch(/^Preencha: .+\.$/)
})

// ---- T-017: fonte do sistema a 1,5 vez ------------------------------------------------------------------------------------------

When('aumento a fonte do sistema para 1,5 vez', async function () {
  await definirEscalaDaFonte(driver, '1.5')
})

// Todo elemento à vista com id do prefixo tem de caber na largura da janela (`bounds` dentro de [0, largura]): a fonte maior quebra
// o texto em mais linhas, nunca empurra o item para fora da tela.
const conferirItensDentroDaJanela = async (regexDeIds, minimo = 3) => {
  const { width } = await driver.getWindowSize()
  const vistos = []
  await driver.waitUntil(async () => {
    vistos.length = 0
    for (const el of await driver.$$(`android=new UiSelector().resourceIdMatches("${regexDeIds}")`)) {
      if (await el.isDisplayed()) vistos.push({ id: await el.getAttribute('resource-id'), ...BasePage.limites(await el.getAttribute('bounds')) })
    }
    return vistos.length >= minimo
  }, { timeout: 15000, timeoutMsg: `timed out while waiting for at least ${minimo} items matching ${regexDeIds} to be on screen` })
  for (const v of vistos) {
    expect({ id: v.id, dentro: v.l >= 0 && v.r <= width && v.r > v.l && v.b > v.t }).toEqual({ id: v.id, dentro: true })
  }
}

const PREFIXO_DA_TELA = { 'Configurações': 'configuracoes', Ajuda: 'ajuda', Sobre: 'sobre' }
Then(/^todos os itens da tela (Configurações|Ajuda|Sobre) cabem na largura da janela com a fonte ampliada$/, async function (tela) {
  await conferirItensDentroDaJanela(`^${PREFIXO_DA_TELA[tela]}_.*`, 4)
})

Then('os campos e o botão do login cabem na largura da janela com a fonte ampliada', async function () {
  await conferirItensDentroDaJanela('^login_(campo_cnpj|campo_usuario|campo_senha|botao_acessar)$', 4)
})

Then('o campo de quantidade mostra 1 e cabe na largura da janela', async function () {
  await new BasePage(driver).esperarVisivel('visitadetalhe_itens_campo_quantidade')
  await conferirItensDentroDaJanela('^visitadetalhe_itens_campo_quantidade$', 1)
  expect((await new BasePage(driver).textoDe('visitadetalhe_itens_campo_quantidade')).trim()).toBe('1')
})
