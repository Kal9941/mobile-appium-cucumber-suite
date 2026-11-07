import { BasePage } from './BasePage.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.11 (lista, rota `locais_atendimento`, prefixo `locaisatendimento`).
export class LocaisPage extends BasePage {
  tituloText() { return this.porTag('locaisatendimento_texto_titulo') }

  async aguardarTela() {
    await this.tituloText().waitForDisplayed({ timeout: 20000 })
  }

  async aguardarCarregar() {
    await this.driver.waitUntil(async () => (await this.contar('locaisatendimento_indicador_carregando')) === 0, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for locaisatendimento_indicador_carregando to be gone',
    })
  }

  async primeiroItem() { return this.primeiroPorRegex('^locaisatendimento_item_[0-9]+$') }
}
