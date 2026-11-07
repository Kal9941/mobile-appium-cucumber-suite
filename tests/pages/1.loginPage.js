import { BasePage } from './BasePage.js'
import { dispensarSalvarSenhaDoSistema } from '../support/appLifecycle.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.2 (rota `login`).
export class LoginPage extends BasePage {
  cnpjField() { return this.porTag('login_campo_cnpj') }

  usuarioField() { return this.porTag('login_campo_usuario') }

  senhaField() { return this.porTag('login_campo_senha') }

  acessarButton() { return this.porTag('login_botao_acessar') }

  erroText() { return this.porTag('login_texto_erro') }

  rodape() { return this.porTag('login_texto_rodape') }

  // Digita num campo SEM fechar o teclado (para testar máscara/filtro do próprio campo).
  async digitar(tag, texto) {
    const el = await this.esperarVisivel(tag)
    await el.click()
    await el.setValue(texto)
  }

  async aguardarTela() {
    await this.cnpjField().waitForDisplayed({ timeout: 20000 })
  }

  async login({ cnpj, usuario, senha }) {
    await this.preencher('login_campo_cnpj', cnpj)
    await this.preencher('login_campo_usuario', usuario)
    await this.preencher('login_campo_senha', senha)
    // O teclado aberto cobre o botão "Acessar" e o toque cairia no Gboard.
    await this.fecharTecladoSeAberto()
    await this.tocar('login_botao_acessar')
    await dispensarSalvarSenhaDoSistema(this.driver)
  }
}
