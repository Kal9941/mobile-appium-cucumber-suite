import { BasePage } from './BasePage.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.1 (casca) e §11.3 (Visitas).
// Confirmadas ao vivo em 2026-10-14 (scripts/explorar.mjs): o container `visitas_item_<codigo>`
// NÃO agrega o texto dos filhos (data/hora ficam sem `text` no dump) — hora e data se leem pela
// API real; a ORDEM da lista se lê pelo `bounds` (topo) do container, tudo por id (`[R-ID]`).
const ITEM = '^visitas_item_[0-9]+$'

export class VisitaPage extends BasePage {
  tituloText() { return this.porTag('visitas_texto_titulo') }

  menuHamburguer() { return this.porTag('visitas_menu_hamburguer') }

  mesAnoText() { return this.porTag('visitas_texto_mes_ano') }

  fabNovaVisita() { return this.porTag('visitas_fab_nova_visita') }

  async aguardarTela() {
    await this.tituloText().waitForDisplayed({ timeout: 20000 })
  }

  // O spinner `visitas_indicador_carregando` some quando a lista (ou o estado vazio) chega.
  async aguardarCarregar() {
    await this.driver.waitUntil(async () => (await this.contar('visitas_indicador_carregando')) === 0, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for visitas_indicador_carregando to be gone',
    })
  }

  // `aba`: concluída | pendente | hoje | agendada | todos (tags `visitas_aba_<rótulo>`).
  async abrirAba(aba) {
    await this.tocar(`visitas_aba_${aba}`)
    await this.aguardarCarregar()
  }

  // Códigos das visitas visíveis, do topo para baixo (ordem da tela = `bounds` "[l,t][r,b]").
  async codigosNaOrdemVisual() {
    const itens = await this.driver.$$(`android=new UiSelector().resourceIdMatches("${ITEM}")`)
    const lidos = []
    for (const el of itens) {
      const id = await el.getAttribute('resource-id')
      const topo = Number(/\[\d+,(\d+)\]/.exec(await el.getAttribute('bounds'))[1])
      lidos.push({ codigo: Number(id.split('_').pop()), topo })
    }
    return lidos.sort((a, b) => a.topo - b.topo).map((x) => x.codigo)
  }

  // Rola a lista de Visitas até o cartão ficar VISÍVEL (não basta existir na árvore: o Compose mantém
  // cartões pré-carregados fora da tela com `displayed="false"`). A lista NÃO abre no topo (no page-source da
  // falha ela estava no fim, com os cartões das 23:30): primeiro sobe até o topo, depois desce procurando.
  // A descida é lenta e curta (40%, 700 px/s): o gesto rápido do Appium anda ~1 janela inteira e o cartão
  // cai entre dois quadros (visto por adb: cada gesto pulava ~5 cartões). A lista de Hoje acumula as visitas CANCELADAS de
  // toda a massa de teste (dezenas no mesmo dia, nunca somem), então o limite de rolagens não é fixo: desce até o FIM da lista
  // (3 rolagens seguidas sem cartão novo na tela) e só então desiste; teto de segurança de 400 rolagens para subir/descer.
  async rolarAteCartaoVisivel(codigo) {
    const tag = `visitas_item_${codigo}`
    for (let i = 0; i < 40; i++) {
      const antes = (await this.codigosNaOrdemVisual()).join(',')
      await this.arrastar('visitas_lista', 'down', 0.6)
      if (i >= 2 && (await this.codigosNaOrdemVisual()).join(',') === antes) break // chegou ao topo
    }
    let semNovos = 0
    let anterior = ''
    for (let i = 0; i <= 400 && semNovos < 3; i++) {
      for (const el of await this.driver.$$(`android=new UiSelector().resourceId("${tag}")`)) {
        if (await el.isDisplayed()) return
      }
      await this.arrastar('visitas_lista', 'up', 0.4, 700)
      const atual = (await this.codigosNaOrdemVisual()).join(',')
      semNovos = atual === anterior ? semNovos + 1 : 0
      anterior = atual
    }
    throw new Error(`element ("${tag}") still not displayed after scrolling to the end of the list`)
  }

  // O cartão `codigo` está nas primeiras linhas da lista (volta ao topo e olha até `passos` janelas)? Barato, para esperar uma
  // visita que ainda vai chegar à lista (aba Hoje é crescente: a de começo do dia fica no topo) sem varrer a lista inteira.
  async cartaoNoInicio(codigo, passos = 6) {
    const tag = `visitas_item_${codigo}`
    for (let i = 0; i < 3; i++) await this.arrastar('visitas_lista', 'down', 0.6)
    for (let i = 0; i <= passos; i++) {
      for (const el of await this.driver.$$(`android=new UiSelector().resourceId("${tag}")`)) {
        if (await el.isDisplayed()) return true
      }
      await this.arrastar('visitas_lista', 'up', 0.4, 700)
    }
    return false
  }

  // Abre o detalhe da visita `codigo` que está na aba Hoje. A lista é preguiçosa e traz também os
  // cancelados de rodadas antigas, que empatam com a visita de teste às 07:00: rola até o cartão
  // aparecer em vez de supor que ele está no topo.
  async abrirDetalheDaAbaHoje(codigo) {
    await this.abrirAba('hoje')
    await this.rolarAteCartaoVisivel(codigo)
    await this.tocar(`visitas_item_${codigo}`)
    await this.esperarVisivel('visitadetalhe_texto_titulo')
  }

  async prescritorDe(codigo) { return this.textoDe(`visitas_item_${codigo}_texto_prescritor`) }

  async localDe(codigo) { return this.textoDe(`visitas_item_${codigo}_texto_local`) }
}
