// Ciclo de vida do app no dispositivo/emulador: isolamento de estado por
// cenário e lançamento. Estratégia (decisão registrada em
// .agents/PROJECT_CONTEXT.md §4): app já instalado no emulador (ou instalado
// uma vez por execução quando `app.instalarApkNaExecucao`), e a cada cenário
// `mobile: clearApp` (zera sessão persistente, fila offline e caches — o app
// volta ao Login) + `activateApp`. Mais rápido que reinstalar e tão hermético
// quanto, porque o estado do app vive todo no storage dele.
import { loadEnv } from './loadEnv.js'

const env = loadEnv()

// Permissões que o app pede em runtime. `clearApp` as revoga, então são
// reconcedidas para evitar diálogo do SO no meio do fluxo. Teste que valida o
// próprio diálogo de permissão deve usar outro caminho.
const PERMISSOES_PADRAO = [
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
]

export async function resetarEstadoDoApp(driver) {
  const appId = env.app.appPackage
  await driver.execute('mobile: terminateApp', { appId }).catch(() => {})
  await driver.execute('mobile: clearApp', { appId })
  // `mobile: changePermissions` (e não `mobile: shell`) para não exigir a flag
  // insegura `adb_shell` no servidor Appium.
  await driver.execute('mobile: changePermissions', {
    action: 'grant',
    appPackage: appId,
    permissions: PERMISSOES_PADRAO,
  }).catch(() => {})
}

// Reinício LEVE para cenário de leitura (`@leitura`): mata e reabre o processo SEM limpar dados — a
// sessão persistente do app (tokens cifrados) mantém o login, e todo estado de tela (aba, filtro,
// ordenação, diálogos) volta ao padrão porque vive em memória. O login só é refeito quando a
// sessão sumiu (`garantirAutenticado`). Cenário que escreve, muda preferência ou testa o login
// continua com o reset completo (`resetarEstadoDoApp`) — `[R-ISOLA]`.
export async function reiniciarSemLimpar(driver) {
  const appId = env.app.appPackage
  await driver.execute('mobile: terminateApp', { appId }).catch(() => {})
  await driver.execute('mobile: activateApp', { appId })
}

export async function abrirApp(driver) {
  await driver.execute('mobile: activateApp', { appId: env.app.appPackage })
}

// Diálogos do PRÓPRIO app (não do SO — `autoGrantPermissions` não os cobre) que
// aparecem em cadeia na 1ª abertura após `clearApp`, por cima do Login: pergunta
// de notificações → aviso "Sem problema!" → recomendação de bateria → aviso.
// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.22. Cada diálogo é
// dispensado pelo botão indicado ("Agora não" na pergunta, "OK" no aviso).
const DIALOGOS_DE_PRIMEIRA_ABERTURA = [
  { dialogo: 'recomendacao_notificacao_dialogo', botao: 'recomendacao_notificacao_botao_cancelar' },
  { dialogo: 'recomendacao_notificacao_lembrete_dialogo', botao: 'recomendacao_notificacao_lembrete_botao_confirmar' },
  { dialogo: 'recomendacao_bateria_dialogo', botao: 'recomendacao_bateria_botao_cancelar' },
  { dialogo: 'recomendacao_bateria_lembrete_dialogo', botao: 'recomendacao_bateria_lembrete_botao_confirmar' },
]

const tag = (id) => `android=new UiSelector().resourceId("${id}")`

// Pop-up "Salvar senha" do Gerenciador de Senhas do Google: só aparece em aparelho real com conta Google
// (o AVD dedicado não tem Play Store) e cobre o app logo depois do login. Não é do app: é o preenchimento
// automático do sistema (`com.google.android.gms`). Dispensa por "Agora não" (`autofill_save_no`), que não
// grava nada nem marca "nunca" — assim a configuração do celular do usuário não muda.
const SALVAR_SENHA_NAO = 'android:id/autofill_save_no'

// Espera o login "assentar" (tela de Visitas, aviso de erro ou o aviso de outro usuário) e dispensa o pop-up se ele vier.
export async function dispensarSalvarSenhaDoSistema(driver, timeoutMs = 12000) {
  const limite = Date.now() + timeoutMs
  let assentouEm = 0
  while (Date.now() < limite) {
    if ((await driver.$$(tag(SALVAR_SENHA_NAO))).length > 0) {
      await driver.$(tag(SALVAR_SENHA_NAO)).click()
      return true
    }
    const assentou = (await driver.$$(tag('visitas_texto_titulo'))).length + (await driver.$$(tag('login_texto_erro'))).length
      + (await driver.$$(tag('login_outro_usuario_dialogo'))).length > 0
    if (assentou && !assentouEm) assentouEm = Date.now()
    // Visitas já à vista e nada por cima durante 2,5 s: o pop-up não vem.
    if (assentouEm && Date.now() - assentouEm > 2500) return false
    await driver.pause(300)
  }
  return false
}

// Dispensa os diálogos acima até o Login (`login_campo_cnpj`) ficar à vista.
// Os diálogos têm prioridade sobre o resto a cada volta do laço: um diálogo
// pode aparecer a qualquer momento entre a abertura e a tela esperada.
export async function dispensarDialogosDePrimeiraAbertura(driver, timeoutMs = 30000) {
  const limite = Date.now() + timeoutMs
  while (Date.now() < limite) {
    let dispensou = false
    for (const { dialogo, botao } of DIALOGOS_DE_PRIMEIRA_ABERTURA) {
      if ((await driver.$$(tag(dialogo))).length > 0) {
        await driver.$(tag(botao)).click()
        dispensou = true
        break
      }
    }
    if (!dispensou && (await driver.$$(tag('login_campo_cnpj'))).length > 0) return
    await driver.pause(400)
  }
  throw new Error('timed out while waiting for the login screen after dismissing first-launch dialogs')
}
