import { BasePage } from './BasePage.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.10 (lista, rota `secretarias`).
export class SecretariasPage extends BasePage {
  tituloText() { return this.porTag('secretarias_texto_titulo') }

  async aguardarTela() {
    await this.tituloText().waitForDisplayed({ timeout: 20000 })
  }

  async aguardarCarregar() {
    await this.driver.waitUntil(async () => (await this.contar('secretarias_indicador_carregando')) === 0, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for secretarias_indicador_carregando to be gone',
    })
  }

  async primeiroItem() { return this.primeiroPorRegex('^secretarias_item_[0-9]+$') }
}
