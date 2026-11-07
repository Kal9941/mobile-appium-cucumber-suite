// Page Object base — seletores e interação, nunca lógica de rede/mock nem
// asserção de contrato de API (AGENTS §1).
export class BasePage {
  constructor(driver) {
    this.driver = driver
  }

  // `testTag` do Compose exposto como `resource-id` (testTagsAsResourceId, ver
  // AGENTS do app §8). Usa UiSelector em vez de `id=`/`~`: a estratégia `id`
  // do uiautomator2 pode prefixar `<pacote>:id/` num id sem prefixo, e o
  // resource-id do Compose é o tag cru, sem pacote.
  // Inventário de tags por tela: prime-visita-3/.agents/PROJECT_CONTEXT.md §11.
  porTag(tag) {
    return this.driver.$(`android=new UiSelector().resourceId("${tag}")`)
  }

  // Prefixo de tag (ex.: `visitas_item_` para qualquer item da lista).
  porTagComecandoCom(prefixo) {
    return this.driver.$(`android=new UiSelector().resourceIdMatches("^${prefixo}.*")`)
  }

  // Regex completa sobre o resource-id. SEM barra invertida: o parser do UiSelector do Appium
  // não interpreta o escape (d vira barra literal + d) — usar classe [0-9]. Ex.: o container
  // do item é `^prescritores_item_[0-9]+$` (não casa os filhos `_texto_nome`).
  porTagRegex(regex) {
    return this.driver.$(`android=new UiSelector().resourceIdMatches("${regex}")`)
  }

  // 1º elemento (na ordem da tela) cujo resource-id casa com a regex — `$` do wdio falha
  // em modo estrito quando a regex casa vários (uma lista), então usa `$$` e pega o primeiro.
  async primeiroPorRegex(regex) {
    const todos = await this.driver.$$(`android=new UiSelector().resourceIdMatches("${regex}")`)
    if (todos.length === 0) throw new Error(`no such element: nenhum resource-id casa com ${regex}`)
    return todos[0]
  }

  // Quantos elementos com a tag existem agora (sem esperar) — para decidir o
  // que o estado da tela PRECISA mostrar a partir de dado real, nunca para
  // condicionar uma asserção (AGENTS §1, anti falso-positivo).
  async contar(tag) {
    return (await this.driver.$$(`android=new UiSelector().resourceId("${tag}")`)).length
  }

  async textoDe(tag) {
    const el = await this.esperarVisivel(tag)
    return el.getText()
  }

  // Atributo do nó achado pelo id: `checked`, `enabled`, `selected`, `bounds`, `text`… (`[R-ID]`).
  async atributo(tag, nome) {
    const el = await this.esperarVisivel(tag)
    return el.getAttribute(nome)
  }

  async estaHabilitado(tag) { return (await this.atributo(tag, 'enabled')) === 'true' }

  async estaMarcado(tag) { return (await this.atributo(tag, 'checked')) === 'true' }

  // "[l,t][r,b]" → { l, t, r, b }.
  static limites(texto) {
    const [l, t, r, b] = texto.match(/\d+/g).map(Number)
    return { l, t, r, b }
  }

  // Altura do elemento em dp (px × 160 ÷ densidade do aparelho) — padronização de botões (T-019/T-026).
  async alturaDp(tag) {
    const { t, b } = BasePage.limites(await this.atributo(tag, 'bounds'))
    const densidade = await this.densidade()
    return ((b - t) * 160) / densidade
  }

  async densidade() {
    if (!BasePage.densidadeCache) {
      const saida = await this.driver.execute('mobile: shell', { command: 'wm', args: ['density'] })
      BasePage.densidadeCache = Number(/(\d+)\s*$/.exec(String(saida).trim())[1])
    }
    return BasePage.densidadeCache
  }

  // Rótulo de um botão/chip: no Compose o container com o id NÃO agrega o texto dos filhos; o texto
  // fica num TextView filho SEM id, dentro dos bounds do container. Lê-se o texto cujo retângulo está
  // contido nos bounds do elemento achado pelo id — a âncora continua sendo o id (`[R-ID]`).
  async rotuloDe(tag) {
    const dono = BasePage.limites(await this.atributo(tag, 'bounds'))
    const filhos = await this.driver.$$('android=new UiSelector().className("android.widget.TextView")')
    const textos = []
    for (const filho of filhos) {
      const c = BasePage.limites(await filho.getAttribute('bounds'))
      if (c.l >= dono.l && c.t >= dono.t && c.r <= dono.r && c.b <= dono.b) textos.push(await filho.getText())
    }
    return textos.join(' ').replace(/\s+/g, ' ').trim()
  }

  // Descrição (content-desc) de um botão só de ícone: no Compose o id fica no container clicável e a descrição no
  // nó filho do ícone (sem id), dentro dos bounds do container — mesma âncora do `rotuloDe`, pelo id (`[R-ID]`).
  async descricaoDe(tag) {
    const dono = BasePage.limites(await this.atributo(tag, 'bounds'))
    const filhos = await this.driver.$$('android=new UiSelector().descriptionMatches(".+")')
    const descricoes = []
    for (const filho of filhos) {
      const c = BasePage.limites(await filho.getAttribute('bounds'))
      if (c.l >= dono.l && c.t >= dono.t && c.r <= dono.r && c.b <= dono.b) descricoes.push(await filho.getAttribute('content-desc'))
    }
    return descricoes.join(' ').replace(/\s+/g, ' ').trim()
  }

  // resource-id de TODOS os elementos que casam com a regex (sem barra invertida: use [0-9]), do topo
  // para baixo (ordem da tela pelo `bounds`). Serve para provar ordenação por id (`[R-ID]`).
  async idsNaOrdemVisual(regex) {
    const itens = await this.driver.$$(`android=new UiSelector().resourceIdMatches("${regex}")`)
    const lidos = []
    for (const el of itens) {
      lidos.push({ id: await el.getAttribute('resource-id'), topo: BasePage.limites(await el.getAttribute('bounds')).t })
    }
    return lidos.sort((a, b) => a.topo - b.topo).map((x) => x.id)
  }

  // Espera o 1º elemento VISÍVEL com a tag. Usa `$$` (e não `$`) porque o wdio 10 falha em modo
  // estrito quando o id aparece 2x — acontece durante a transição entre telas (a que sai e a que
  // entra coexistem por ~300 ms) e com título duplicado (ex.: `ajuda_texto_titulo`).
  // Topo do teclado na tela: menor `top` entre os nós do Gboard; `Infinity` se o teclado está fechado.
  async topoDoTeclado() {
    const nos = await this.driver.$$('android=new UiSelector().packageName("com.google.android.inputmethod.latin")')
    let topo = Infinity
    for (const no of nos) topo = Math.min(topo, BasePage.limites(await no.getAttribute('bounds')).t)
    return topo
  }

  async esperarVisivel(tag, timeout = 10000) {
    let achado = null
    await this.driver.waitUntil(async () => {
      const todos = await this.driver.$$(`android=new UiSelector().resourceId("${tag}")`)
      for (const el of todos) {
        if (await el.isDisplayed()) { achado = el; return true }
      }
      return false
    }, { timeout, timeoutMsg: `element ("${tag}") still not displayed after ${timeout}ms` })
    return achado
  }

  async tocar(tag) {
    const el = await this.esperarVisivel(tag)
    // `waitForClickable` só existe para browsers; em app nativo, habilitado + visível.
    await el.waitForEnabled({ timeout: 10000 })
    await el.click()
  }

  async preencher(tag, valor) {
    const el = await this.esperarVisivel(tag)
    await el.click()
    await el.setValue(valor)
  }

  // Toque por coordenada (W3C Actions, `touch`) — fallback para o que não
  // tem nó na árvore (ex.: fechar o Gboard sem mexer no app).
  async tocarEm(x, y) {
    await this.driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await this.driver.releaseActions()
  }

  // Gesto de arrasto nativo do uiautomator2 (`direction`: up|down|left|right).
  // Rolagem de lista = arrastar no sentido contrário (`up` rola o conteúdo para baixo).
  // `speed` (px/s, opcional): o padrão do uiautomator2 é rápido e a lista anda ~1 janela por gesto,
  // pulando cartões; velocidade baixa + percentual pequeno dá janelas que se sobrepõem.
  async arrastar(tag, direction, percent = 0.75, speed) {
    const el = await this.esperarVisivel(tag)
    await this.driver.execute('mobile: swipeGesture', {
      elementId: el.elementId,
      direction,
      percent,
      ...(speed ? { speed } : {}),
    })
  }

  // Fecha o teclado só se estiver aberto (BACK com o teclado fechado navega
  // para trás — na tela de Login isso fecharia o app).
  async fecharTecladoSeAberto() {
    if (await this.driver.isKeyboardShown()) {
      // Em alguns estados o Gboard recusa o hide (o app já fecha o teclado sozinho
      // ao perder o foco) — não é motivo para derrubar o teste.
      await this.driver.hideKeyboard().catch(() => {})
    }
  }
}
