/**
 * Tradução pt-BR do "chrome" fixo do multiple-cucumber-html-reporter (pedido
 * do usuário, 2026-10-09) — a lib não tem NENHUMA opção pública de
 * idioma/locale (confirmado inspecionando a interface `Options` em
 * `dist/types.d.ts` — `durationColumnTitle` existe no tipo interno `Suite`,
 * mas é recalculado a partir de `durationAggregation` e sobrescreve
 * qualquer valor passado em `generate()`; achado ao testar que passar essa
 * chave não tinha efeito nenhum no HTML gerado). Todo o texto da UI vem
 * direto em inglês, embutido nos templates .liquid e nos próprios scripts
 * .js da lib. Carregado via
 * `customScript` (hook oficial da lib — copiado pra
 * `assets/js/custom.js` e incluído como `<script>` por último em TODA
 * página do relatório, depois de `main.js`/`table.js`/`scenarios.js`/
 * `charts.js`). Não toca em `node_modules` — sobrevive a `npm install`/
 * atualização da lib.
 *
 * O conteúdo de verdade (nome de Funcionalidade/Cenário/step, tags) já vem
 * em português, porque é escrito assim nos `.feature` — só o texto fixo da
 * própria interface do relatório (títulos, rótulos de gráfico, botões,
 * mensagens) precisa ser traduzido aqui.
 *
 * Estratégia: dicionário de igualdade exata (texto do nó inteiro, já
 * trimado) pra rótulos/frases fixas + um conjunto pequeno de padrões
 * ancorados (^...$) pra texto composto com número dinâmico (ex.: "9 Passed",
 * "Showing 1 to 10 of 23 entries") — nunca substring solta no meio de texto
 * livre, pra não arriscar substituir por engano uma palavra que apareça
 * dentro do nome de um Cenário real.
 */
(() => {
  const EXACT_MATCHES = new Map([
    // Dashboard — cards de gráfico
    ['Features Status', 'Status das Funcionalidades'],
    ['Scenarios Status', 'Status dos Cenários'],
    ['Steps Status', 'Status dos Passos'],
    ['Device & OS', 'Dispositivo e SO'],
    ['Browsers', 'Navegadores'],
    ['Top 10 Tags', 'Top 10 Tags'],
    ['Features Status Trend', 'Tendência de Status das Funcionalidades'],
    ['Features Overview', 'Visão Geral das Funcionalidades'],

    // Rótulos de status "soltos" (legenda de gráfico sem contagem, label do
    // centro de donut "Features"/"Scenarios"/"Steps") — achado validando no
    // Edge headless: sem essas entradas, só a forma composta "N Passed"
    // (ver PATTERN_MATCHES) era traduzida, a legenda do gráfico (só a
    // palavra sozinha) ficava em inglês.
    ['Passed', 'Aprovados'],
    ['Failed', 'Reprovados'],
    ['Ambiguous', 'Ambíguos'],
    ['Not Defined', 'Não Definidos'],
    ['Pending', 'Pendentes'],
    ['Skipped', 'Ignorados'],
    ['Features', 'Funcionalidades'],
    ['Steps', 'Passos'],

    // Tabela de funcionalidades
    ['Search features...', 'Buscar funcionalidades...'],
    ['Filter by tags...', 'Filtrar por tags...'],
    ['Show:', 'Mostrar:'],
    ['Feature Name', 'Nome da Funcionalidade'],
    ['Environment', 'Ambiente'],
    ['Steps status', 'Status dos passos'],
    ['Pass %', '% Aprovação'],
    // Cabeçalho "Duration" — a lib não expõe opção pública pra traduzir essa
    // (ver comentário em scripts/generateHtmlReport.mjs); só resta o DOM.
    ['Duration', 'Duração'],
    ['No feature found', 'Nenhuma funcionalidade encontrada'],
    ['Try adjusting your filters or search terms.', 'Tente ajustar os filtros ou o termo buscado.'],
    ['Tags', 'Tags'],
    ['Clear', 'Limpar'],

    // Navegação / cabeçalho da página de detalhe
    ['Dashboard', 'Painel'],
    ['Feature Detail', 'Detalhe da Funcionalidade'],

    // Página de detalhe de funcionalidade
    ['Scenario Distribution', 'Distribuição de Cenários'],
    ['Top 10 Slowest Scenarios', 'Top 10 Cenários Mais Lentos'],
    ['Top 10 Slowest Steps', 'Top 10 Passos Mais Lentos'],
    ['Step Status Breakdown', 'Detalhamento de Status dos Passos'],
    ['Steps per Scenarios', 'Passos por Cenário'],
    ['Scenarios', 'Cenários'],
    ['Search scenarios...', 'Buscar cenários...'],
    ['No scenario found', 'Nenhum cenário encontrado'],
    ['ALL', 'TODOS'],
    ['PASSED', 'APROVADOS'],
    ['FAILED', 'REPROVADOS'],
    ['AMBIGUOUS', 'AMBÍGUOS'],
    ['NOT DEFINED', 'NÃO DEFINIDOS'],
    ['PENDING', 'PENDENTES'],
    ['SKIPPED', 'IGNORADOS'],
    ['Description', 'Descrição'],
    ['Attachments', 'Anexos'],
    ['Preview not available.', 'Pré-visualização não disponível.'],
    ['Download', 'Baixar'],
    ['Recording of:', 'Gravação de:'],
    ['+ Show Info', '+ Mostrar Informações'],
    ['+ Video', '+ Vídeo'],
    ['Error details', 'Detalhes do erro'],

    // run_info_card (metadados de execução — só aparecem se configurados)
    ['Project & Release', 'Projeto & Versão'],
    ['Release', 'Versão'],
    ['Test Cycle', 'Ciclo de Teste'],
    ['CI Pipeline', 'Pipeline de CI'],
    ['Execution Period', 'Período de Execução'],
    ['Duration:', 'Duração:'],
    ['Username', 'Usuário'],
    ['Node Version', 'Versão do Node'],
    ['Report Version', 'Versão do Relatório'],
    ['Machine Arch', 'Arquitetura da Máquina'],

    // Badges de plataforma (title attribute)
    ['Local machine', 'Máquina local'],
    ['Running on BrowserStack', 'Executando no BrowserStack'],
    ['Running on TestMu AI', 'Executando no TestMu AI'],
    ['Running locally', 'Executando localmente'],

    // Modal de anexo (screenshot/log/erro/vídeo)
    ['Console Log', 'Log do Console'],
    ['Copy Log', 'Copiar Log'],
    ['Copied!', 'Copiado!'],
    ['Error Details & Stack Trace', 'Detalhes do Erro e Stack Trace'],
    ['Copy Error', 'Copiar Erro'],
    ['Failed to load image', 'Falha ao carregar imagem'],
    ['Your browser does not support the video tag.', 'Seu navegador não suporta a tag de vídeo.'],

    // Rodapé (crédito da lib, mantém os nomes próprios)
    ['Generated by', 'Gerado por'],
  ])

  // Status em inglês usados em textos compostos com número dinâmico (badge de
  // linha da tabela, legenda/tooltip de gráfico) — nunca aplicado como
  // substring solta, só como padrão ANCORADO (regex completa, `^...$`) contra
  // o texto já trimado do nó inteiro.
  const STATUS_WORDS = [
    ['Not Defined', 'Não Definidos'],
    ['Passed', 'Aprovados'],
    ['Failed', 'Reprovados'],
    ['Ambiguous', 'Ambíguos'],
    ['Pending', 'Pendentes'],
    ['Skipped', 'Ignorados'],
  ]

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const PATTERN_MATCHES = []
  STATUS_WORDS.forEach(([en, pt]) => {
    // "9 Passed" (badge da tabela de funcionalidades)
    PATTERN_MATCHES.push([new RegExp(`^(\\d+)\\s+${escapeRegExp(en)}$`), (m) => `${m[1]} ${pt}`])
    // "Passed: 9" (legenda do gráfico quando displayChartPercentages está ligado)
    PATTERN_MATCHES.push([new RegExp(`^${escapeRegExp(en)}:\\s*(\\d+)$`), (m) => `${pt}: ${m[1]}`])
  })
  // "Showing 1 to 10 of 23 entries" (paginação da tabela)
  PATTERN_MATCHES.push([
    /^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+entries$/,
    (m) => `Mostrando ${m[1]} a ${m[2]} de ${m[3]} registros`,
  ])

  function translate(text) {
    const trimmed = text.trim()
    if (!trimmed) return null
    if (EXACT_MATCHES.has(trimmed)) return EXACT_MATCHES.get(trimmed)
    for (const [pattern, replacer] of PATTERN_MATCHES) {
      const match = trimmed.match(pattern)
      if (match) return replacer(match)
    }
    return null
  }

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])
  const TRANSLATABLE_ATTRS = ['title', 'placeholder', 'alt']

  function translateAttributes(root) {
    TRANSLATABLE_ATTRS.forEach((attr) => {
      root.querySelectorAll(`[${attr}]`).forEach((el) => {
        const value = el.getAttribute(attr)
        const translated = value && translate(value)
        if (translated) el.setAttribute(attr, translated)
      })
    })
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement && !SKIP_TAGS.has(node.parentElement.tagName)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    })
    const nodes = []
    let current = walker.nextNode()
    while (current) {
      nodes.push(current)
      current = walker.nextNode()
    }
    nodes.forEach((node) => {
      const trimmed = node.textContent.trim()
      if (!trimmed) return
      const translated = translate(trimmed)
      if (translated) node.textContent = node.textContent.replace(trimmed, translated)
    })
  }

  function runTranslationPass(root) {
    translateTextNodes(root)
    translateAttributes(root)
  }

  function start() {
    runTranslationPass(document.body)

    // Tabela (paginação/busca/tags), gráficos (toggle de tema) e o modal de
    // anexo reescrevem `innerHTML` depois da carga inicial — sem observar
    // essas mutações, a tradução só pegaria o primeiro render da página.
    // Desconectar antes de escrever e reconectar depois evita loop infinito
    // (nossa própria escrita também é uma mutação).
    const observer = new MutationObserver(() => {
      observer.disconnect()
      runTranslationPass(document.body)
      observer.observe(document.body, { childList: true, subtree: true })
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start)
})()
