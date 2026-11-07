import { BasePage } from './BasePage.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.16 (lista, rota `chat`).
export class ChatPage extends BasePage {
  tituloText() { return this.porTag('chat_texto_titulo') }

  async aguardarTela() {
    await this.tituloText().waitForDisplayed({ timeout: 20000 })
  }

  async aguardarCarregar() {
    await this.driver.waitUntil(async () => (await this.contar('chat_indicador_carregando')) === 0, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for chat_indicador_carregando to be gone',
    })
  }
}
