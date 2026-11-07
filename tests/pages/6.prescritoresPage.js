import { BasePage } from './BasePage.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.9 (lista, rota `prescritores`).
export class PrescritoresPage extends BasePage {
  tituloText() { return this.porTag('prescritores_texto_titulo') }

  async aguardarTela() {
    await this.tituloText().waitForDisplayed({ timeout: 20000 })
  }

  async aguardarCarregar() {
    await this.driver.waitUntil(async () => (await this.contar('prescritores_indicador_carregando')) === 0, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for prescritores_indicador_carregando to be gone',
    })
  }

  // Container do 1º item da lista: `prescritores_item_<codigo>` (sem os filhos `_texto_*`).
  async primeiroItem() { return this.primeiroPorRegex('^prescritores_item_[0-9]+$') }
}
