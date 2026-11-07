import { BasePage } from './BasePage.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.15 (rota `registro_ponto`, prefixo `registroponto`).
// ATENÇÃO (AGENTS §9): "Registrar" grava ponto REAL no desktop/Firebird — este
// Page Object só LÊ a tela; nenhum método toca `registroponto_botao_registrar_*`.
export const TIPOS_PONTO = ['entrada', 'saidaalmoco', 'retornoalmoco', 'saida']

export class PontoPage extends BasePage {
  tituloText() { return this.porTag('registroponto_texto_titulo') }

  async aguardarTela() {
    await this.tituloText().waitForDisplayed({ timeout: 20000 })
  }

  async aguardarCarregar() {
    await this.driver.waitUntil(async () => (await this.contar('registroponto_indicador_carregando')) === 0, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for registroponto_indicador_carregando to be gone',
    })
  }
}
