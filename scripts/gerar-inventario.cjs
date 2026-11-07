// Gera o inventário canônico de cenários (`PROJECT_CONTEXT.md` §6) A PARTIR dos `.feature`:
// um cenário = uma linha com `L:` (linha real do `Cenário:`/`Esquema do Cenário:`), nome e tags
// (`@wip`, `@skip`, `@leitura`, `@offline`, `@relogio`, `@redeLenta`, `@visual`, `@gravar`).
// Nunca digitado à mão (`R-SYNC`/`R-CONTA`: conta só cenários estáticos). Uso: node scripts/gerar-inventario.cjs
const fs = require('fs')
const path = require('path')

const raiz = path.join(__dirname, '..')
const dirFeatures = path.join(raiz, 'tests', 'features')
const arquivos = fs.readdirSync(dirFeatures).filter((f) => f.endsWith('.feature')).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

const TITULOS = {}
const blocos = []
let total = 0
const indice = []

for (const arq of arquivos) {
  const linhas = fs.readFileSync(path.join(dirFeatures, arq), 'utf8').split(/\r?\n/)
  const [grupo, nome] = arq.replace('.feature', '').split('.')
  const funcionalidade = (linhas.find((l) => /^Funcionalidade:/.test(l)) ?? '').replace('Funcionalidade:', '').trim()
  const cenarios = []
  let tagsPendentes = []
  linhas.forEach((l, i) => {
    const t = l.trim()
    if (/^@/.test(t)) tagsPendentes = tagsPendentes.concat(t.split(/\s+/).filter((x) => x.startsWith('@')))
    const m = /^(Cenário|Esquema do Cenário):\s*(\d+\.\d+)\s+(.*)$/.exec(t)
    if (m) {
      cenarios.push({ linha: i + 1, numero: m[2], nome: m[3], esquema: m[1] !== 'Cenário', tags: tagsPendentes })
      tagsPendentes = []
    } else if (t && !/^#/.test(t) && !/^@/.test(t)) tagsPendentes = []
  })
  total += cenarios.length
  TITULOS[arq] = funcionalidade
  indice.push(`| \`${arq}\` · ${cenarios[0]?.numero ?? ''}–${cenarios[cenarios.length - 1]?.numero ?? ''} | ${cenarios.length} | ${funcionalidade} | \`${grupo}.${nome}.steps.js\` · \`${grupo}.${nome}Page.js\` |`)
  const linhasTabela = cenarios.map((c) => `| ${c.numero} | ${c.linha} | ${c.esquema ? '(esquema) ' : ''}${c.nome} | ${c.tags.map((x) => `\`${x}\``).join(' ')} |`)
  blocos.push(`### ${grupo}. \`${arq}\` — ${funcionalidade} — ${cenarios.length} cenários\n| # | L: | Cenário | Tags |\n|---|---|---|---|\n${linhasTabela.join('\n')}\n`)
}

const secao = `## 6. Inventário canônico de cenários \`[R-SYNC]\`

> **Gerado por \`node scripts/gerar-inventario.cjs\` a partir de \`tests/features/*.feature\`** — nunca editar à mão (a próxima execução do gerador sobrescreve). Como usar (padrão do \`cypress-pharmacie-web\`, §10): \`grep\` por tela, tag do app, rota, nome ou \`#<grupo>.<índice>\`; \`L:\` é a linha real do \`Cenário:\` no arquivo. Usar **antes de criar teste** (duplicidade), **ao receber pedido do app** (qual cenário já cobre / onde entra o novo — \`AGENTS.md\` §14), ao investigar falha. Tags do app: \`prime-visita-3/.agents/PROJECT_CONTEXT.md\` §11. \`@wip\` = aguarda homologação do usuário (\`R-ONLY\`); \`@leitura\` = reinício leve (sessão mantida); \`@offline\`/\`@relogio\`/\`@redeLenta\` = o \`afterScenario\` devolve rede/relógio/velocidade; \`@visual\` = quadro por passo.

**Total: ${total} cenários estáticos em ${arquivos.length} features** (\`R-CONTA\`: \`Esquema do Cenário\` conta 1; as linhas de \`Exemplos\` não).

### 6.0 Índice por feature \`[QUENTE]\`
| Feature · \`#\` | Qtd | Funcionalidade | Steps · Page Object |
|---|---|---|---|
${indice.join('\n')}

${blocos.join('\n')}
`

const arqCtx = path.join(raiz, '.agents', 'PROJECT_CONTEXT.md')
const ctx = fs.readFileSync(arqCtx, 'utf8')
const ini = ctx.indexOf('## 6. Inventário canônico de cenários')
const fim = ctx.indexOf('## 7. Categorias do classificador de erro')
if (ini < 0 || fim < 0) throw new Error('seções §6/§7 não encontradas em PROJECT_CONTEXT.md')
fs.writeFileSync(arqCtx, `${ctx.slice(0, ini)}${secao}\n${ctx.slice(fim)}`)
// ---- Cobertura do README (padrão do cypress-pharmacie-web): suíte → contextos temáticos → cenário com título e
// descrição, em `<details>` recolhíveis. Atemporal, sem resultado de rodada (✅/❌): é inventário de cobertura, não relatório.
// Os contextos vêm de `scripts/contextos-readme.json` (grupos de cenários por tema) e a descrição de cada cenário de
// `scripts/descricoes-readme.json` (escrita à mão, como no Cypress); cenário sem contexto ou sem descrição é erro, para
// os dois mapas nunca ficarem defasados em relação aos `.feature` (`R-SYNC`).
const contextos = JSON.parse(fs.readFileSync(path.join(__dirname, 'contextos-readme.json'), 'utf8'))

const descricoes = JSON.parse(fs.readFileSync(path.join(__dirname, 'descricoes-readme.json'), 'utf8'))

// `resumos-readme.json`: uma frase por feature (cabeçalho da cobertura e abertura de cada seção, como no Cypress).
const resumos = JSON.parse(fs.readFileSync(path.join(__dirname, 'resumos-readme.json'), 'utf8'))

const numerosDosFeatures = new Set()
const cobertura = []
const listaDeSuites = []
let execucoes = 0
for (const arq of arquivos) {
  const linhas = fs.readFileSync(path.join(dirFeatures, arq), 'utf8').split(/\r?\n/)
  const [grupo] = arq.replace('.feature', '').split('.')
  const cenarios = []
  let atual = null
  linhas.forEach((l, i) => {
    const m = /^\s*(Cenário|Esquema do Cenário):\s*(\d+\.\d+)\s+(.*)$/.exec(l)
    if (m) {
      atual = { numero: m[2], nome: m[3], esquema: m[1] !== 'Cenário', linha: i, entao: [], emEntao: false }
      cenarios.push(atual)
      return
    }
    if (!atual) return
    // `Exemplos:` de um Esquema: cada linha da tabela (menos o cabeçalho) é uma execução a mais em runtime.
    if (/^\s*Exemplos:/.test(l)) { atual.exemplos ??= 0; atual.cabecalhoPendente = true; return }
    if (atual.exemplos !== undefined && /^\s*\|/.test(l)) { if (atual.cabecalhoPendente) atual.cabecalhoPendente = false; else atual.exemplos += 1; return }
    const passo = /^\s*(Dado|Quando|Então|E|Mas)\s+(.*)$/.exec(l)
    if (!passo) return
    if (passo[1] === 'Então') { atual.entao.push(passo[2]); atual.emEntao = true } else if (passo[1] === 'E' && atual.emEntao) atual.entao.push(passo[2])
    else atual.emEntao = false
  })
  cenarios.forEach((c) => numerosDosFeatures.add(c.numero))
  const resumo = resumos[grupo]
  if (!resumo) throw new Error(`resumos-readme.json sem a feature ${grupo}`)
  // Estáticos × execuções: `Esquema do Cenário` conta 1 no total e uma execução por linha de `Exemplos` em runtime (`[R-CONTA]`).
  const esquemas = cenarios.filter((c) => c.esquema)
  const execFeature = cenarios.length - esquemas.length + esquemas.reduce((s, c) => s + (c.exemplos ?? 0), 0)
  execucoes += execFeature
  const notaDeExecucoes = esquemas.length === 0
    ? ''
    : ` (${esquemas.length === 1 ? '1 esquema usa' : `${esquemas.length} esquemas usam`} \`Exemplos\` e ${esquemas.length === 1 ? 'roda' : 'rodam'} como ${esquemas.reduce((s, c) => s + (c.exemplos ?? 0), 0)} execuções: ${execFeature} no total em runtime)`
  listaDeSuites.push(`- **\`${arq.replace('.feature', '')}\`** (${cenarios.length}) — ${resumo}`)
  const mapa = contextos[grupo]
  if (!mapa) throw new Error(`contextos-readme.json sem a feature ${grupo}`)
  const porIndice = new Map(cenarios.map((c) => [Number(c.numero.split('.')[1]), c]))
  const cobertos = new Set(mapa.flatMap((c) => c.itens))
  const soltos = [...porIndice.keys()].filter((n) => !cobertos.has(n))
  if (soltos.length > 0) throw new Error(`contextos-readme.json: cenário(s) ${soltos.map((n) => `${grupo}.${n}`).join(', ')} sem contexto — inclua no mapa`)
  const inexistentes = [...cobertos].filter((n) => !porIndice.has(n))
  if (inexistentes.length > 0) throw new Error(`contextos-readme.json: ${grupo}.${inexistentes.join(', ')} não existe(m) no .feature`)
  const blocos = mapa.map((ctx, k) => {
    const itens = ctx.itens.map((n) => {
      const c = porIndice.get(n)
      const desc = descricoes[c.numero]
      if (!desc) throw new Error(`descricoes-readme.json: falta a descrição do cenário ${c.numero}`)
      return `- ${c.numero}. **${c.nome}:** ${desc}`
    })
    const rotulo = `${itens.length} ${itens.length === 1 ? 'cenário' : 'cenários'}`
    return `<details>\n<summary><b>Contexto ${k + 1}: ${ctx.titulo} — ${rotulo}</b></summary>\n\n<dl><dd>\n\n${itens.join('\n')}\n\n</dd></dl>\n\n</details>\n<br>\n`
  })
  const sumario = `🔍 ${arq} — ${cenarios.length} cenários em ${mapa.length} ${mapa.length === 1 ? 'contexto' : 'contextos'} (clique para expandir)`
  cobertura.push(`### ${grupo}. ${TITULOS[arq]} (\`tests/features/${arq}\`) — ${cenarios.length} Cenários\n\nA feature abrange **${cenarios.length} cenários estáticos** (\`AGENTS.md\` \`[R-CONTA]\`)${notaDeExecucoes} — ${resumo.replace(/\.$/, '')}:\n\n<details>\n<summary><b>${sumario}</b></summary>\n\n<dl><dd>\n\n<br>\n\n${blocos.join('\n')}\n</dd></dl>\n\n</details>\n`)
}
const orfas = Object.keys(descricoes).filter((n) => !numerosDosFeatures.has(n))
if (orfas.length > 0) throw new Error(`descricoes-readme.json: descrição(ões) de cenário que não existe(m): ${orfas.join(', ')}`)
const arqReadme = path.join(raiz, 'README.md')
const readme = fs.readFileSync(arqReadme, 'utf8')
const mi = readme.indexOf('<!-- COBERTURA:INICIO -->')
const mf = readme.indexOf('<!-- COBERTURA:FIM -->')
if (mi >= 0 && mf >= 0) {
  const intro = `**Total:** **${total} cenários automatizados** (${execucoes} execuções, contando as linhas de \`Exemplos\`) em ${arquivos.length} features:\n\n${listaDeSuites.join('\n')}\n\n> 💡 O primeiro cenário de cada feature (\`N.1\`) sempre acessa a tela e confere que ela renderiza as informações corretamente; as linhas de \`Exemplos\` de um \`Esquema do Cenário\` não entram na contagem estática (\`AGENTS.md\` \`[R-CONTA]\`).\n\n> 💡 Cada feature abaixo expande numa lista de **contextos** (agrupamentos temáticos); cada contexto expande na lista dos seus cenários, com o número usado no título do cenário, no \`.steps.js\` e no inventário. A fonte de verdade linha a linha (incluindo a linha \`Cenário:\` no arquivo) é \`.agents/PROJECT_CONTEXT.md\` §6. **Esta seção é gerada** por \`npm run inventario\` a partir dos \`.feature\` e de \`scripts/contextos-readme.json\` — não edite à mão.\n\n---\n\n`
  // As contagens narradas no resto do README (Visão Geral e Status) seguem o inventário: nunca digitadas à mão.
  const novo = `${readme.slice(0, mi)}<!-- COBERTURA:INICIO -->\n${intro}${cobertura.join('\n---\n\n')}\n${readme.slice(mf)}`
    .replace(/\*\*\d+ cenários automatizados\*\* \(\d+ execuções, contando as linhas de `Exemplos`\) distribuídos/, `**${total} cenários automatizados** (${execucoes} execuções, contando as linhas de \`Exemplos\`) distribuídos`)
    .replace(/\* \*\*\d+ cenários\*\* cobrindo/, `* **${total} cenários** cobrindo`)
  fs.writeFileSync(arqReadme, novo)
}
console.log(`inventário gerado: ${total} cenários em ${arquivos.length} features`)
