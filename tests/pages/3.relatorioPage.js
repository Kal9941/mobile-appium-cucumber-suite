import { BasePage } from './BasePage.js'

// Tags: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.17 (rota `graficos_relatorios`, prefixo `relatorios`).
// Confirmadas ao vivo em 2026-10-14 (scripts/explorar.mjs, APK T-025+T-026).
export class RelatorioPage extends BasePage {
  tituloText() { return this.porTag('relatorios_texto_titulo') }

  semanaText() { return this.porTag('relatorios_semana_texto') }

  async aguardarTela() {
    await this.tituloText().waitForDisplayed({ timeout: 20000 })
  }

  async aguardarCarregarSemana() {
    await this.driver.waitUntil(async () => (await this.contar('relatorios_semana_indicador_carregando')) === 0, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for relatorios_semana_indicador_carregando to be gone',
    })
  }

  // Lista (Por prescritor / Especialidade): some o spinner e aparece o texto de totais.
  async aguardarCarregarLista() {
    await this.driver.waitUntil(async () => (await this.contar('relatorios_indicador_carregando')) === 0
      && (await this.contar('relatorios_texto_totais')) === 1, {
      timeout: 30000, timeoutMsg: 'timed out while waiting for relatorios_texto_totais after the loading indicator is gone',
    })
  }

  // T-036: as 3 abas viraram o seletor rotacional `‹ visão ›` (`relatorios_visao_anterior|texto|proxima`).
  // `aba` continua sendo `prescritor|semana|especialidade`; gira com a seta "próxima" até o texto bater.
  async irParaVisao(aba) {
    const alvo = { prescritor: 'prescritor', semana: 'minha semana', especialidade: 'especialidade' }[aba]
    for (let i = 0; i < 3; i++) {
      const atual = (await this.textoDe('relatorios_visao_texto')).toLowerCase().trim()
      if (atual === alvo) return
      await this.tocar('relatorios_visao_proxima')
      await this.driver.waitUntil(async () => (await this.textoDe('relatorios_visao_texto')).toLowerCase().trim() !== atual, {
        timeout: 10000, timeoutMsg: 'timed out while waiting for the report view to change',
      })
    }
    throw new Error(`element ("relatorios_visao_texto") never showed the "${alvo}" view after 3 taps`)
  }

  async abrirAba(aba) {
    await this.irParaVisao(aba)
    await this.aguardarCarregarLista()
  }

  async escolherPeriodo(periodo) {
    await this.tocar(`relatorios_periodo_${periodo}`)
    await this.aguardarCarregarLista()
  }

  // Folha "Ordenar por": campo (`venda|visitas|revenda|alopatia|homeopatia|nome`) e ordem.
  async ordenarPor(campo, ordem) {
    await this.tocar('relatorios_botao_ordenar')
    await this.esperarVisivel('relatorios_ordenar_modal')
    await this.tocar(`relatorios_ordenar_opcao_${campo}`)
    await this.tocar(`relatorios_ordenar_${ordem}`)
    await this.tocar('relatorios_ordenar_botao_concluir')
    await this.driver.waitUntil(async () => (await this.contar('relatorios_ordenar_modal')) === 0, { timeout: 10000 })
  }

  async mesAnoTexto() { return this.textoDe('relatorios_texto_mes_ano') }

  async totaisTexto() { return this.textoDe('relatorios_texto_totais') }

  // Títulos dos N primeiros itens visíveis (`relatorios_item_<i>_texto_titulo`).
  async titulosVisiveis(n) {
    const titulos = []
    for (let i = 0; i < n; i += 1) titulos.push(await this.textoDe(`relatorios_item_${i}_texto_titulo`))
    return titulos
  }

  // Minha semana é uma lista preguiçosa (T-043): só as linhas à vista existem na árvore, então chegar ao fim é ROLAR.
  // A lista não tem id próprio: o gesto é uma região no meio da tela (abaixo do seletor de visão, acima da barra inferior).
  // `direcao`: `up` desce o conteúdo (rola para baixo), `down` volta ao topo. Percentual baixo = janelas que se sobrepõem.
  // Velocidade baixa (600 px/s): o gesto padrão do Appium é um arremesso que anda ~1 janela e pula linhas (ver §10 do AGENTS).
  async rolarSemana(direcao = 'up', percent = 0.5) {
    await this.driver.execute('mobile: swipeGesture', { left: 100, top: 700, width: 880, height: 1100, direction: direcao, percent, speed: 600 })
  }

  // Follow-ups que existem agora na árvore, lidos de UM dump: container `relatorios_semana_followup_<i>` (checkable, `checked`)
  // com o texto e o detalhe dos filhos `_texto`/`_detalhe` — ids posicionais, na ordem em que a lista os mostra.
  async followupsNaArvore() {
    const xml = await this.driver.getPageSource()
    const decodificar = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '\n').replace(/&amp;/g, '&')
    const itens = new Map()
    const regex = /\btext="([^"]*)" resource-id="(relatorios_semana_followup_[0-9]+)(_texto|_detalhe)?" checkable="(?:true|false)" checked="(true|false)"/g
    for (const [, texto, id, filho, checked] of xml.matchAll(regex)) {
      const item = itens.get(id) ?? { id, checked: false, texto: '', detalhe: '' }
      if (filho === '_texto') item.texto = decodificar(texto)
      else if (filho === '_detalhe') item.detalhe = decodificar(texto)
      else item.checked = checked === 'true'
      itens.set(id, item)
    }
    return [...itens.values()]
  }

  // Ids de todos os itens de `prefixo` (`followup`|`proxima`|`resumo`) que existem agora na árvore de UI, lidos de um único
  // dump (barato) — o conjunto cresce a cada rolagem e prova que a lista monta os itens à medida que aparecem.
  async idsDaSemanaNaArvore(prefixo) {
    const xml = await this.driver.getPageSource()
    const regex = new RegExp(`resource-id="(relatorios_semana_${prefixo}_[0-9]+)"`, 'g')
    return [...new Set([...xml.matchAll(regex)].map((m) => m[1]))]
  }
}
