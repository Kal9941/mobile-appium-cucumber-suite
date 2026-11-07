import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { BasePage } from '../pages/BasePage.js'
import { LoginPage } from '../pages/1.loginPage.js'
import { VisitaPage } from '../pages/2.visitaPage.js'
import { MenuPage } from '../pages/9.menuPage.js'
import { PrescritoresPage } from '../pages/6.prescritoresPage.js'
import { BackendService } from '../services/BackendService.js'
import { desligarRede } from '../support/dispositivo.js'
import { loadEnv } from '../support/loadEnv.js'

const env = loadEnv()

// Senha propositalmente inválida — não vem de env porque não representa um
// registro real a buscar, só uma entrada que não pode casar com nenhuma conta.
const SENHA_INVALIDA = 'senha_errada_xyz_123'

let loginPage
let visitaPage

Given('que estou na tela de login', async function () {
  loginPage = new LoginPage(driver)
  await loginPage.aguardarTela()
})

When('informo CNPJ, usuário e senha válidos', async function () {
  await loginPage.login(env.credentials)
})

When('informo CNPJ e usuário válidos e uma senha inválida', async function () {
  await loginPage.login({ ...env.credentials, senha: SENHA_INVALIDA })
})

Then('vejo a tela de Visitas', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.aguardarTela()
  await expect(visitaPage.tituloText()).toBeDisplayed()
})

When('saio pelo menu lateral', async function () {
  await new MenuPage(driver).sair()
})

Then('volto para a tela de login', async function () {
  loginPage = new LoginPage(driver)
  await loginPage.aguardarTela()
  await expect(loginPage.cnpjField()).toBeDisplayed()
})

Then('permaneço na tela de login com a mensagem de erro', async function () {
  // A asserção principal nunca fica atrás de um `if` (AGENTS §1, anti falso-positivo).
  await loginPage.erroText().waitForDisplayed({ timeout: 15000 })
  await expect(loginPage.erroText()).toBeDisplayed()
  await expect(loginPage.acessarButton()).toBeDisplayed()
})

// ---- T-022: rodapé × teclado ------------------------------------------------------------------

const rodapeVisivelAcimaDoTeclado = async () => {
  if ((await loginPage.contar('login_texto_rodape')) === 0) return false
  const { t, b } = BasePage.limites(await loginPage.atributo('login_texto_rodape', 'bounds'))
  const altura = (await driver.getWindowSize()).height
  return b <= altura && t < (await loginPage.topoDoTeclado())
}

Then('o rodapé da tela de login está visível', async function () {
  await driver.waitUntil(rodapeVisivelAcimaDoTeclado, { timeout: 10000, timeoutMsg: 'timed out while waiting for the login footer to be visible' })
  expect(await rodapeVisivelAcimaDoTeclado()).toBe(true)
})

When('toco no campo CNPJ e o teclado abre', async function () {
  await loginPage.cnpjField().click()
  await driver.waitUntil(async () => driver.isKeyboardShown(), { timeout: 10000, timeoutMsg: 'timed out while waiting for the keyboard to open' })
})

Then('o rodapé da tela de login não está visível e o botão Acessar continua alcançável', async function () {
  // T-022: com o teclado aberto o rodapé não pode ficar à vista (acima do teclado) — o nó pode até continuar
  // na árvore, coberto pelo teclado; o que vale é o que o usuário vê (`bounds` × topo do teclado).
  await driver.waitUntil(async () => !(await rodapeVisivelAcimaDoTeclado()), { timeout: 10000, timeoutMsg: 'timed out while waiting for the footer to leave the screen above the keyboard' })
  expect(await rodapeVisivelAcimaDoTeclado()).toBe(false)
  // Alcançável: existe na árvore (a tela rola) — o toque só é possível depois de fechar o teclado.
  expect(await loginPage.contar('login_botao_acessar')).toBe(1)
})

When('fecho o teclado', async function () {
  await loginPage.fecharTecladoSeAberto()
  await driver.waitUntil(async () => !(await driver.isKeyboardShown()), { timeout: 10000, timeoutMsg: 'timed out while waiting for the keyboard to close' })
})

// ---- campos: máscara, só dígitos, vazio -------------------------------------------------------

When('digito {string} no campo CNPJ', async function (texto) {
  await loginPage.digitar('login_campo_cnpj', texto)
})

Then('o campo CNPJ mostra {string}', async function (esperado) {
  expect(await loginPage.textoDe('login_campo_cnpj')).toBe(esperado)
})

When('digito {string} no campo Usuário', async function (texto) {
  await loginPage.digitar('login_campo_usuario', texto)
})

Then('o campo Usuário mostra {string}', async function (esperado) {
  expect(await loginPage.textoDe('login_campo_usuario')).toBe(esperado)
})

When('toco em Acessar sem preencher nada', async function () {
  await loginPage.fecharTecladoSeAberto()
  await loginPage.tocar('login_botao_acessar')
})

Then('vejo a mensagem {string} e permaneço na tela de login', async function (mensagem) {
  await loginPage.erroText().waitForDisplayed({ timeout: 10000 })
  expect(await loginPage.textoDe('login_texto_erro')).toBe(mensagem)
  await expect(loginPage.cnpjField()).toBeDisplayed()
})

// ---- T-003 (a): sessão persistente ---------------------------------------------------------------

Then('vejo a tela de Visitas sem passar pelo login', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.aguardarTela()
  // Direto em Visitas: em nenhum momento a tela de login ficou à vista.
  expect(await visitaPage.contar('login_campo_cnpj')).toBe(0)
})

When('desligo a rede do aparelho', async function () {
  await desligarRede(driver)
})

// ---- T-016: teste grátis (só o formulário; nunca envia) -----------------------------------------

When('toco em Solicite teste grátis', async function () {
  await loginPage.fecharTecladoSeAberto()
  await loginPage.tocar('login_link_solicitar_teste')
})

Then('vejo o formulário de teste grátis', async function () {
  await loginPage.esperarVisivel('testegratis_tela')
  await expect(loginPage.porTag('testegratis_tela')).toBeDisplayed()
})

When('volto pela seta do app', async function () {
  await loginPage.tocar('testegratis_botao_voltar')
})

// ---- T-033: olhinho da senha ------------------------------------------------------------------

When('digito a senha válida no campo Senha', async function () {
  await loginPage.digitar('login_campo_senha', env.credentials.senha)
})

When('toco no olhinho da senha', async function () {
  await loginPage.tocar('login_botao_mostrar_senha')
})

// T-034: o estado do olhinho está no `content-desc` do botão (nunca no `password` do campo, que não reflete
// o estado, nem em screenshot): "Mostrar senha" = senha oculta; "Ocultar senha" = senha à vista.
Then('a senha está oculta', async function () {
  await driver.waitUntil(async () => (await loginPage.atributo('login_botao_mostrar_senha', 'content-desc')) === 'Mostrar senha', { timeout: 10000, timeoutMsg: 'timed out while waiting for the eye to offer "Mostrar senha" (password hidden)' })
})

Then('a senha está à vista com o texto digitado', async function () {
  await driver.waitUntil(async () => (await loginPage.atributo('login_botao_mostrar_senha', 'content-desc')) === 'Ocultar senha', { timeout: 10000, timeoutMsg: 'timed out while waiting for the eye to offer "Ocultar senha" (password visible)' })
  expect(await loginPage.textoDe('login_campo_senha')).toBe(env.credentials.senha)
})

// ---- T-038 (4): descrição dos campos e rótulo do botão ----------------------------------------------------

// O app põe o content-desc num nó irmão com os MESMOS bounds do campo (o EditText com o id não o carrega): lê-se pelos
// bounds do id, como o `rotuloDe`.
Then('os campos do login têm a descrição CNPJ, Usuário e Senha e o botão diz Acessar', async function () {
  expect(await loginPage.descricaoDe('login_campo_cnpj')).toBe('CNPJ')
  expect(await loginPage.descricaoDe('login_campo_usuario')).toBe('Usuário')
  expect(await loginPage.descricaoDe('login_campo_senha')).toBe('Senha')
  expect((await loginPage.rotuloDe('login_botao_acessar')).toLowerCase()).toBe('acessar') // a Nord exibe em maiúsculas
})

// ---- T-003 (d) / T-042 (b): outro usuário no mesmo aparelho -------------------------------------------------------------

When('informo CNPJ, usuário e senha do outro usuário', async function () {
  loginPage = new LoginPage(driver)
  await loginPage.login(env.credentialsOutroUsuario)
})

Then('as visitas na tela são só as do outro usuário conforme a API dele', async function () {
  visitaPage = new VisitaPage(driver)
  await visitaPage.aguardarTela()
  await visitaPage.abrirAba('todos')
  const doOutro = new Set((await BackendService.obterComoOutroUsuario('/visitas')).map((v) => v.codigo))
  const doPrimeiro = new Set((await BackendService.listar('/visitas')).map((v) => v.codigo))
  expect(doOutro.size).toBeGreaterThanOrEqual(1) // o outro usuário tem visita: sem ela a prova não valeria (R-AFP)
  // Espera a lista do outro usuário aparecer (1ª sincronização dele) e confere os cartões à vista.
  await driver.waitUntil(async () => (await visitaPage.codigosNaOrdemVisual()).length > 0, { timeout: 60000, timeoutMsg: 'timed out while waiting for the other user\'s visit cards' })
  const naTela = await visitaPage.codigosNaOrdemVisual()
  const vazados = naTela.filter((c) => !doOutro.has(c) && doPrimeiro.has(c))
  expect(vazados).toEqual([]) // nenhum cartão do usuário anterior
  for (const c of naTela) expect(doOutro.has(c)).toBe(true) // todo cartão é do outro usuário
})

Then('os prescritores vinculados a mim são os do outro usuário conforme a API dele', async function () {
  const p = new PrescritoresPage(driver)
  await p.aguardarTela()
  await p.aguardarCarregar()
  const doOutro = new Set((await BackendService.obterComoOutroUsuario('/prescritores/vinculados-a-mim')).codigos)
  const doPrimeiro = new Set((await BackendService.obter('/prescritores/vinculados-a-mim')).codigos)
  expect(doOutro.size).toBeGreaterThanOrEqual(1)
  await p.esperarVisivel('prescritores_cabecalho_meus')
  // Os cartões acima do cabeçalho "Outros prescritores" são os vinculados a mim (R-ID: posição pelos `bounds` do id).
  const topoOutros = (await p.contar('prescritores_cabecalho_outros')) > 0
    ? BasePage.limites(await p.atributo('prescritores_cabecalho_outros', 'bounds')).t
    : Infinity
  let meus = []
  await driver.waitUntil(async () => {
    meus = []
    for (const el of await driver.$$('android=new UiSelector().resourceIdMatches("^prescritores_item_[0-9]+$")')) {
      if (BasePage.limites(await el.getAttribute('bounds')).t < topoOutros) meus.push(Number((await el.getAttribute('resource-id')).split('_').pop()))
    }
    return meus.length > 0
  }, { timeout: 60000, interval: 1000, timeoutMsg: 'timed out while waiting for the other user\'s linked prescribers' })
  const vazados = meus.filter((c) => !doOutro.has(c) && doPrimeiro.has(c))
  expect(vazados).toEqual([]) // nenhum vinculado do usuário anterior
  for (const c of meus) expect(doOutro.has(c)).toBe(true)
})

// ---- T-003 (c): "Sair" com envio pendente ------------------------------------------------------------------------------------

const OPCOES_DO_MODAL_SAIR = { Sincronizar: 'sair_opcao_sincronizar', 'Sair mesmo assim': 'sair_opcao_sair_mesmo_assim', Cancelar: 'sair_botao_cancelar' }

Then('vejo o modal Sair com {int} envio pendente e as opções Sincronizar, Sair mesmo assim e Cancelar', async function (quantos) {
  const menu = new MenuPage(driver)
  // A raiz `sair_modal` não é exposta como nó visível no dump: o título prova que o modal abriu.
  await menu.esperarVisivel('sair_titulo')
  // O título diz quantos envios aguardam: "Há N envio(s) pendente(s) — sair agora?" (a Nord exibe em maiúsculas).
  expect((await menu.textoDe('sair_titulo')).toLowerCase()).toBe(`há ${quantos} envio(s) pendente(s) — sair agora?`)
  for (const tag of Object.values(OPCOES_DO_MODAL_SAIR)) await expect(menu.porTag(tag)).toBeDisplayed()
})

When(/^escolho (Sincronizar|Sair mesmo assim|Cancelar) no modal Sair$/, async function (opcao) {
  await new MenuPage(driver).tocar(OPCOES_DO_MODAL_SAIR[opcao])
})

Then('o modal Sair fecha e continuo logado em Visitas', async function () {
  const visitas = new VisitaPage(driver)
  await driver.waitUntil(async () => (await visitas.contar('sair_titulo')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the exit modal to close' })
  await visitas.aguardarTela()
  expect(await visitas.contar('login_campo_cnpj')).toBe(0)
})

Then('vejo as Pendências com {int} envio pendente e continuo logado', async function (quantos) {
  const visitas = new VisitaPage(driver)
  await visitas.esperarVisivel('pendencias_contador_pendentes', 20000)
  expect(await visitas.textoDe('pendencias_contador_pendentes')).toBe(String(quantos))
  expect(await visitas.contar('login_campo_cnpj')).toBe(0)
})

// ---- T-003 (d): outro usuário com a fila do anterior --------------------------------------------------------------------------

Then('vejo o aviso de outro usuário no aparelho com Descartar e entrar e Cancelar', async function () {
  loginPage = new LoginPage(driver)
  await loginPage.esperarVisivel('login_outro_usuario_dialogo', 30000)
  await expect(loginPage.porTag('login_outro_usuario_botao_confirmar')).toBeDisplayed()
  await expect(loginPage.porTag('login_outro_usuario_botao_cancelar')).toBeDisplayed()
})

When('escolho Cancelar no aviso de outro usuário', async function () {
  await loginPage.tocar('login_outro_usuario_botao_cancelar')
})

When('escolho Descartar e entrar no aviso de outro usuário', async function () {
  await loginPage.esperarVisivel('login_outro_usuario_dialogo', 30000)
  await loginPage.tocar('login_outro_usuario_botao_confirmar')
})

Then('continuo na tela de login sem o aviso', async function () {
  await driver.waitUntil(async () => (await loginPage.contar('login_outro_usuario_dialogo')) === 0, { timeout: 10000, timeoutMsg: 'timed out while waiting for the other-user notice to close' })
  await expect(loginPage.cnpjField()).toBeDisplayed()
  expect(await loginPage.contar('visitas_texto_titulo')).toBe(0) // não entrou: Cancelar não descarta nem loga
})

Then('a API não tem visitas de teste abertas', async function () {
  expect(await BackendService.visitasDeTesteAbertas()).toEqual([])
})
