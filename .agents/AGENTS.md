# AGENTS.md — Regras Operacionais · Suíte Appium do Prime Visita 3

> **Atualizado:** 2026-10-17 · **Âncoras estáveis:** `[R-*]` = regra — referencie a âncora, nunca "item N"/"Seção N". · **Checklist sempre-verificar:** §0 `[R-CHECK]`.
> **Casa única de cada fato:** regras de escrita e disciplina → este arquivo · arquitetura, camadas e decisões → [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) · status, backlog, achados, decisões e fila `T-NNN` → [`ROADMAP.md`](./ROADMAP.md) · o que já aconteceu (entregas, homologações) → [`HISTORICO.md`](./HISTORICO.md). Nunca duplicar entre os quatro.
> **Como ler:** quente até `<!-- fim-quente -->` (a skill `inicia-contexto-projeto` lê só isso); o resto é frio, aberto sob demanda pelo **Mapa** abaixo. Numeração das seções preservada nos dois lados.
>
> **Origem das regras (conferidas em 2026-10-14):** `prime-visita-3/.agents/AGENTS.md` (§0-§8, app e backend — em conflito, **vale o do app**), `cypress-pharmacie-web/.agents/AGENTS.md` (só o que se aplica a teste de UI com mock/API real; o que é específico de Cypress/issues/multi-sessão de hooks não foi trazido) e `Docs/APPIUM_MOBILE_FRAMEWORK_REFERENCE.md`. **Inventário de seletores:** `prime-visita-3/.agents/PROJECT_CONTEXT.md` §11 (fonte única — nunca copiar a tabela para cá).

## Mapa de leitura sob demanda
> **Quente** = tudo acima de `<!-- fim-quente -->`. **Frio** = seções abaixo do marcador, numeração original; abrir por `Grep '^## <nº>\.'` (ou `'^### <nº>'`) → `Read` daquela linha até o próximo cabeçalho. A coluna "Ler quando" é o gatilho: sem gatilho, não ler.

| Seção (frio) | O que responde | Ler quando |
|---|---|---|
| §3.1 Técnicas de medição e diagnóstico `[R-DIAG]` | medir rede, estado acumulado e carga do emulador antes de culpar seletor ou app | ao abrir qualquer investigação de timeout, ANR ou falha intermitente; antes da 2ª tentativa de fix |
| §6 Seletores e sincronização `[R-SEL]`/`[R-ID]` | hierarquia de seletor, asserção por id, como eu vejo o app (`espiar`, `@visual`, `@gravar`), teclado, listas, botões de estado | antes de escolher seletor ou escrever asserção; `NoSuchElement`, "não visível", toque caindo no teclado, lista que não rola |
| §9 Integração com o app e o backend `[R-APIREAL]`/`[R-APK]` | backend real e contratos `.schema.ts`, massa de teste, APK imutável, dispositivo dedicado e `@relogio` | antes de escrever Service Object ou cenário que grava; ao instalar APK ou registrar resultado de `T-NNN`; ao mexer em relógio/rede do emulador |
| §10 Armadilhas já pagas | lições de emulador/AVD, `adb`, Compose, token do backend, Gboard, `String.replace` | falha de ambiente/emulador/`adb`; antes de mexer em `appLifecycle`/`BackendService`/`dispositivo`; antes de editar código por script |
| §11 Estratégia de relatório e erro `[R-ERR]` | categorias do `errorHandler` e promoção de categoria descoberta | ao ler um log de falha com categoria `descoberta_*`; ao mexer em `errorHandler`/reporters |
| §12 Rodapé e checklist `[R-QUEMEU]`/`[R-CHECKLIST]` | formato fixo do rodapé de turno e do quadro de checklist | ao fechar turno que tocou teste; pedido de "checklist"/"o que falta"/"como estamos" |
| §13 Edição de docs por ferramenta `[R-EDICAO]` | UTF-8/LF, mojibake, `perl`/PowerShell, `rm` seguro | antes de editar `.agents/*.md`, `README.md` ou `docs/*.md` por script; depois, para conferir |
| §14 Roteamento de cenários `[R-ROTEAR]` | feature dona de cada tela, regra do `N.1`, pedido → cenário `@wip` | ao receber `T-NNN`/`B-NNN`/bug relatado; antes de criar ou localizar cenário |
| `PROJECT_CONTEXT.md` §6–§8 | inventário de cenários, categorias de erro, matriz de cobertura | ver o Mapa daquele arquivo |
| `ROADMAP.md` §3 Decisões do usuário | o que já foi decidido sobre massa, gravação no tenant, bloqueios e homologação | `T-NNN` ou cenário que grava/bloqueia; antes de perguntar ao usuário algo que pode já estar decidido |
| `ROADMAP.md` §4 Achados `A-NNN` | bugs do app/backend vistos pela suíte e seu status | cenário vermelho de propósito; resposta `Q-NNN` do app; registrar achado novo (próximo número) |
| `ROADMAP.md` §5 Corpo do backlog | detalhe integral de cada item da tabela §2 | ao pegar um item da tabela §2 (`Grep "#### <ID>"`) |
| `ROADMAP.md` §6 Fila `T-NNN` | pedidos de teste da sessão do app, formato e status | início de sessão e aviso do monitor (só blocos `aberto`/`em triagem`/`em execução`, §15.1); ao registrar resultado de um pedido |
| `HISTORICO.md` (Grep por `T-NNN`/`A-NNN`/`N.M`/data) | o que já foi entregue, validado, homologado e como | (1) operador cita pedido/achado/cenário → conferir antes de agir; (2) cenário "validado" quebrando → quando/como foi validado; (3) pergunta sobre o que foi feito; (4) `atualiza-context` antes de escrever |

---

## 0. Diretrizes Principais — verificar sempre `[R-CHECK]`

Checklist de disciplina operacional, não de técnica de teste (isso é §1 em diante). Vale para **todo** turno, mesmo quando o pedido não menciona a regra.

| Quando | Verificar |
|---|---|
| Início da sessão | ler só o **quente** dos 3 arquivos e as seções `[QUENTE]` (`[R-SKILL]` §15.1); o frio entra pelo Mapa de leitura, nunca de uma vez. |
| Início de qualquer sessão deste repositório | `[R-PEDIDORECEBIDO]`: ler `prime-visita-3/.agents/ROADMAP.md` §6 (fila `B-NNN` do backend para o app), `prime-visita-3/.agents/ROADMAP.md` §7 (fila `Q-NNN` **desta suíte** ao app — status e `T-NNN` citados) e `prime-visita-3-backend/.agents/ROADMAP.md` §5 (fila `F-NNN`) **na hora** — pedido que muda comportamento de tela/rota que a suíte cobre vira item no `ROADMAP.md` §2 daqui. Nunca depender de memória de sessão anterior. |
| Início de qualquer sessão **e** sempre que o monitor (`.claude/skills/monitor-pedidos`) avisar `T-NNN` aberto | `[R-PEDIDOAPP]` (desde 2026-10-14: **esta suíte é quem testa o app**; a sessão do app só confere o que o build prova e **pede** a validação ao vivo): ler `ROADMAP.md` §6 daqui (fila `T-NNN`, pedidos de teste da sessão do app). **Atendimento automático (regra do usuário, 2026-10-14): todo `T-NNN` é atendido na hora, sem esperar o usuário mandar** — o monitor avisou, eu triagem e executo; só pergunto (`AskUserQuestion`) quando o pedido exigir **decisão** (gravar dado irreversível no tenant, `Registrar Ponto`, arquitetura de teste `R-PLANO`). **Todo `T-NNN` vira cenário escrito (regra do usuário, 2026-10-14: "sempre escreva os cenários dos pedidos"):** o pedido só fecha com cenário `<grupo>.<índice>` na feature dona (§14), `@wip` até o OK, citado no bloco do `T-NNN` e no `PROJECT_CONTEXT.md` §6/§8 — nunca resultado só de conferência manual, de exploração ou de memória. Pedido que não dá para automatizar ganha o cenário mesmo assim, `@skip` com a condição de remoção, e `bloqueado: motivo` no bloco. **O app precisa enxergar o andamento:** atualizo o bloco do `T-NNN` em `ROADMAP.md` §6 **a cada passo**, não só no fim — `em execução` ao começar; cada sub-item validado (a, b, c…) anotado no próprio bloco assim que sai (`passou`/`falhou: A-NNN`/`bloqueado: motivo`), com o APK usado; resultado final no status. Um `T-NNN` parado em `aberto`/`em triagem` sem motivo escrito é falha minha. Todo `T-NNN` `aberto` ganha status e vira item do §2; cenário a criar segue `[R-ONLY]`/`[R-RUN]`. Resultado volta **no próprio bloco** (`passou em … (cenário N.M)` / `falhou: A-NNN` / `bloqueado: motivo`) — a sessão do app é avisada pelo monitor dela. **Pedido nosso ao app** (bug, `testTag` faltando, comportamento a confirmar, capacidade de teste) = `Q-NNN` em `prime-visita-3/.agents/ROADMAP.md` §7 (formato de lá, cita o `A-NNN`); o app abre o `F-NNN` no backend quando depende dele, e só fecha o `Q-NNN` abrindo um `T-NNN` aqui. Nomenclatura por par: `B`/`F`/`Q`/`T`, nunca reaproveitada; `A-NNN` é achado, não pedido. |
| Início de qualquer turno que escreva ou rode teste | `[R-ONLY]`: `grep -rn "@wip\|@skip" tests/features` — achou isolamento **seu** já homologado em turno anterior → remover **nesse turno**, antes de qualquer coisa nova; achou isolamento de terceiros → apontar no rodapé, nunca remover. Isolamento pendente de homologação **desta sessão** → parar e perguntar antes de seguir para o próximo cenário. |
| Antes de rodar qualquer coisa que instale/atualize o app, ou ao registrar resultado de `T-NNN` | `[R-APK]` (§9): a suíte testa **só** APK imutável de `app.apkDir` (`T-NNN_AAAAMMDD-HHmm.apk` (vários pedidos: `T-001+T-004` ou intervalo `T-021..T-024`, combináveis como `T-004..T-006+T-010`), depositado pela sessão do app — nunca o `build/outputs` do Gradle); instala **uma vez** por execução, no `onPrepare`, nunca no meio de cenário. Resultado de `T-NNN` cita o APK usado (`tests/reports/<sessão>/apk-usado.json`). Pasta vazia ou sem APK do pedido → `bloqueado: sem APK do T-NNN`, nunca testar build diferente. **Cobertura cumulativa por número (regra do usuário, 2026-10-14): um APK com `T-29` no nome cobre TODO pedido `T-MMM` com `MMM ≤ 29`** — esteja o número escrito no nome ou não (`T-025+T-026` cobre `T-001`…`T-026`); só é `bloqueado: sem APK do T-NNN` o pedido de número **maior** que o do APK mais novo. **Ao instalar um APK novo, conferir que cache e dados foram ZERADOS** (regra do usuário, 2026-10-14): depois do `adb install -r -d` a suíte executa `pm clear` e verifica que `files/`, `databases/`, `shared_prefs/` e `cache/` do app ficaram vazios (`run-as`), registrando `dadosZerados` em `apk-usado.json`; se sobrar dado, a execução **aborta** (`failed to start: dados do app não zerados`) — nunca testar com resíduo de build anterior (cada cenário ainda faz `clearApp`). **Terminei todos os `T-NNN` abertos? instalo o APK mais novo disponível** (sempre relistando a pasta, `[R-APK]`) e rodo a suíte nele. **Builds são cumulativos — nunca ficar preso ao APK do pedido em mãos** (regra do usuário, 2026-10-14): estou no `T-001` e, quando termino, já existe o do `T-009`? Uso o **último**, que já contém todos os pedidos anteriores. Por isso: (1) no início de **cada** execução e de **cada** `T-NNN` (e antes de registrar `passou`/`falhou`), `ls` da pasta de builds de novo e confirmar qual é o mais novo; (2) existe APK mais novo que o instalado → **reinstalar só no início da próxima execução** (nunca no meio de cenário) e **reconfirmar nele** o que acabei de validar (2x isolado) antes de escrever `passou`; (3) o resultado cita o APK realmente usado; (4) `APK=T-NNN` (variável) só para investigar regressão contra um build antigo, nunca para validar pedido novo. |
| Antes de rodar qualquer coisa contra o dispositivo | `[R-RUN]` + `[R-MULTI]`: o emulador e a porta 4723 do Appium são recurso único. Porta ocupada ou `adb devices` mostrando outra sessão em uso → parar e avisar, nunca derrubar o processo alheio. Rodar **só** o cenário em jogo (`--spec <arquivo>.feature:<linha>`), nunca a suíte inteira sem pedido explícito de regressão. |
| Antes de escrever ou mockar qualquer cenário novo/ajustado | `[R-APIREAL]`: validar contra a **API real** (backend `prime-visita-3-backend` no ar — conferir `/health/banco`, não a memória) e o app real; esta suíte **não tem mock** por decisão (`PROJECT_CONTEXT.md` §3). Backend confirmadamente fora do ar → parar e avisar (`backend_indisponivel`), nunca contornar. |
| Escrever qualquer asserção, ou validar algo que o dump não mostra | `[R-ID]` (§6, regra do usuário, 2026-10-14): **componente se testa pelo id** (`testTag` → `resource-id`: existência, `text`, `enabled`/`checked`/`selected`, `bounds`), **nunca por screenshot**. Screenshot só quando eu **não estiver enxergando** o que aconteceu ou precisar validar algo **visualmente** (cor, contraste, sobreposição, recorte, layout) — e nesse caso o screenshot é **evidência lida por mim** (`Read` da imagem), nunca o gate automático do cenário (sem comparação de pixels). Elemento relevante **sem id** no dump → **não contornar** (nem screenshot, nem coordenada, nem texto/posição): abrir `Q-NNN` (`seletor/testTag`) ao app (`prime-visita-3/.agents/ROADMAP.md` §7), registrar `A-NNN` e deixar o cenário `@skip` com a condição "`Q-NNN` feito" (`R-ONLY`). |
| Antes de codificar ou mudar seletor | `[R-EVID]`: dump (`getPageSource()`)/log real primeiro, nunca chutar seletor ou comando; `[R-SEL]`: confirmar no dump que o `resource-id` existe e é o do inventário §11 do app. `[R-CRIT]`: avaliar a sugestão técnica do usuário antes de implementar cegamente. |
| Escrever dado fixo (CNPJ, usuário, nome, telefone) | `[R-POM]`: sempre de `env.json`/`env.local.json` via `loadEnv()`, nunca literal no step/page. Exceção declarada: entrada propositalmente inválida (ex.: senha errada) fica numa constante nomeada com comentário. |
| Aparecer **qualquer** erro do backend (5xx, contrato diferente do `.schema.ts`) ou do app (tag ausente do dump, crash, ANR, comportamento diferente do inventário §11) | `[R-ACHADO]`: registrar em `ROADMAP.md` §4 **na hora**, com evidência (categoria, `page-source`, rota/`curl`), e citar no resumo do turno — nunca `TODO` solto, nunca contornar com sleep/seletor por posição, nunca "registro depois". Backend: o pedido formal `F-NNN` (`prime-visita-3-backend/.agents/ROADMAP.md` §5) segue `[R-PEDIDOBACK]` do app; **abrir esse pedido a partir deste repo precisa de autorização do usuário** (a pré-autorização de 2026-10-10 foi dada na sessão do app) — enquanto não houver, o achado fica no §4 daqui. Teste que revela bug real pode ficar vermelho de propósito (`[R-CAUSA]`). |
| Corrigir uma falha | `[R-DIAG]` (orçamento): mesma causa presumida 2x ou 3 tentativas no mesmo cenário → parar e perguntar; `[R-CAUSA]`: separar bug do app/backend de bug do teste **antes** de "consertar"; `[R-DELTA]`: correção = menor delta. |
| Escrever cenários / planejar cobertura | `[R-COBERTURA]` (regra do usuário, 2026-10-14): **toda funcionalidade do app tem cenário** — telas, formulários, ações, estados de erro/vazio/offline, permissões, **Configurações e notificações com testes finos** (cada chave, canal do Android, notificação, horário, ação da notificação). O mapa funcionalidade → cenário vive em `PROJECT_CONTEXT.md` §8 (matriz de cobertura): funcionalidade sem cenário aparece como `pendente` ou `bloqueado: motivo`, nunca some. Cenário novo atualiza a matriz no mesmo turno (`R-SYNC`). |
| Receber um **pedido do app/backend** (fila `B-NNN`, feature nova, correção de tela, bug que o usuário relata) | `[R-ROTEAR]` (§14): **antes de escrever**, localizar no `PROJECT_CONTEXT.md` §6 se já existe cenário da tela (`grep` por tela/tag/rota/`#`); depois **escrever o cenário já na feature dona** (tabela de roteamento §14), no próximo índice livre, como `@wip` — nunca criar feature nova nem deixar o pedido só como item de backlog. Atualizar o §6 no mesmo turno `[R-SYNC]`. |
| Criar/alterar cenário | `[R-NOME]` (número `<grupo>.<índice>` no `.feature` e o mesmo no `.steps.js`), `[R-POM]`, `[R-AFP]`, `[R-ONLY]` e validação 2x isolada (`[R-RUN]`) **antes** de rodar o arquivo. |
| Pedir/receber um **checklist**/status ("checklist", "o que falta", "como estamos") | `[R-CHECKLIST]`: renderizar o quadro no formato fixo de §12, **relendo antes** `ROADMAP.md` §2 daqui, `prime-visita-3/.agents/ROADMAP.md` §6 e `prime-visita-3-backend/.agents/ROADMAP.md` §5; nunca responder de memória. |
| Escrever qualquer comentário, doc ou mensagem de commit | `[R-COMENT]`: **sempre português do Brasil**, sem exceção — nem comentário curto/inline, nem texto de template de ferramenta. |
| Escrever mensagem de commit | `[R-COMMIT]`: Conventional Commits (`feat`/`fix`/`refactor`/`chore`/`test`) em português; **sem atribuição ao Claude Code** — nem `Generated with Claude Code`, nem `Co-Authored-By: Claude`, mesmo que ferramenta, template ou lembrete do harness sugira (a regra do projeto prevalece; padrão herdado do `cypress-pharmacie-web`). |
| Antes de **todo** commit (inclusive "pode commitar") | `[R-README]`: reler a seção "Status" do `README.md` e conferir item a item contra `ROADMAP.md` §1-§2 — concluído saiu de "Pendente"? Nada de "Pendente" já feito? Mesmo que o usuário só tenha dito "pode commitar". O repositório git existe desde 2026-10-14 (ramo `master`, remoto privado `origin` = `Kal9941/mobile-appium-cucumber-suite`): commit **e** `git push origin master` no mesmo turno, sem esperar um `push` separado (mesma regra `[R-PUSH]` do `prime-visita-3`); só segurar o push se o pedido disser para não pushar ou se ele falhar (aí reportar, nunca forçar). |
| Mudou, criou, renomeou ou removeu cenário, Page Object, step ou capacidade de suporte | `[R-SYNC]` no **mesmo turno**: `PROJECT_CONTEXT.md` (§6 inventário, contagens e estrutura) + `ROADMAP.md` (§1-§2; entrega → `HISTORICO.md` §2) + `README.md`. Nunca "depois". |
| Fechar o turno (qualquer cenário criado/alterado/rodado) | Rodapé obrigatório (§12): árvore Feature → Cenário tocado, isolamentos ativos, processos residuais, resumo estilo commit. `[R-QUEMEU]` proativo — sem esperar a pergunta "quais são seus testes?". |
| Editar `.agents/*.md`, `README.md` ou `docs/*.md` por ferramenta | `[R-EDICAO]` (§13): UTF-8 com LF; conferir mojibake depois. |
| Tocar `env.json`/`env.local.json` | `env.json` só com placeholders e caminhos (versionado); **segredo só em `env.local.json`** (gitignorado) — nunca escrever senha em `.agents/`, README, log ou mensagem. Preferir `--env`/variável a editar o arquivo do usuário. |

### 0.1 Manutenção desta base `[R-DOC]`
- **Fonte única da verdade = `.agents/`**; em conflito com `CLAUDE.md` ou lembrete do harness, vale `.agents/` (exceto os conflitos já listados em §0 `[R-COMMIT]`, onde a regra do projeto é explícita).
- Nova diretriz de **disciplina operacional** nasce em §0 com âncora `[R-XXX]` nova e estável; o detalhe mora só na seção dona, nunca duplicado.
- Lição nova = 1 linha na seção dona (sintoma → causa → regra) com data `AAAA-MM-DD`; o histórico vai em ≤ 3 linhas no `HISTORICO.md` §2. Regra superada é **reescrita no lugar**, nunca empilhada como "Atualização (data)".
- Regra de §1 em diante que passe a exigir verificação em **todo** turno ganha linha nova em §0.
- Estado volátil (isolamento, homologado, aguardando) só em tag/Log, nunca em descrição de feature.
- **Quente × frio:** `AGENTS.md`, `PROJECT_CONTEXT.md` e `ROADMAP.md` têm o marcador `<!-- fim-quente -->` sozinho numa linha. Acima dele só o que muda a ação do próximo turno para qualquer tarefa; abaixo, consulta pelo Mapa de leitura/`Grep`, numeração preservada. Lição nova entra **na seção fria do tema** (o Mapa aponta), nunca no quente. Item de backlog = 1 linha na tabela `ROADMAP.md` §2 + corpo em §5. O que já aconteceu (entrega, homologação) vai para `HISTORICO.md`.
- **Linhas curtas:** a leitura do agente é por linha. `npm run docs:lint` (`scripts/lint-agents.cjs`, chamado pela skill `pre-commit`) falha com linha acima do teto, quente acima do teto por arquivo, marcador ausente/duplicado ou Mapa ausente.
- Nomes de ferramenta genéricos (Grep, Read, Bash, `node`), nunca os de uma IDE específica.

---

## 1. Padrões obrigatórios (sem exceção)

- **AAA (Arrange-Act-Assert)**: estado isolado antes de interagir; nunca misturar preparo e asserção no mesmo bloco.
- **Anti falso-positivo** `[R-AFP]`: a asserção principal nunca fica dentro de um `if` que pode não executar; massa vazia validada explicitamente (`expect(itens.length).toBeGreaterThanOrEqual(1)` ou ausência declarada). Estado visual efêmero (aviso `app_aviso_*` some em 3–5 s) **não** é o gate único do cenário quando houver contrato de rede/estado persistente para afirmar. Asserção de "nunca" (campo travado, aviso que não aparece) exige sentinela com janela de observação, não um único `toBeDisplayed` negado. Nunca afirmar que uma mutação "dispara um refetch" da mesma entidade — afirmar o resultado pela resposta da mutação ou pelo efeito observável na tela.
- **RBAC bidirecional**: todo teste de permissão prova concessão (ação permitida) **e** revogação (ação bloqueada). Testar só um lado mascara vazamento. Recurso utilizável com permissão revogada → falhar com `[BUG GRAVE NO APP - VAZAMENTO DE RBAC - <permissão>]` na mensagem.
- **Isolamento de estado por teste** `[R-ISOLA]`: app limpo a cada cenário (`resetarEstadoDoApp` + diálogos de 1ª abertura, `PROJECT_CONTEXT.md` §3) — nunca reaproveitar estado entre cenários. Cenário que precisa de massa criada por outro **não** depende dele: cria a própria. **Exceção `@leitura` (2026-10-14, pergunta do usuário "preciso mesmo fazer login toda vez?"):** cenário que só **lê** (não grava, não muda preferência, não testa o login) leva `@leitura` e usa **reinício leve** — mata e reabre o processo **sem `clearApp`**; a sessão persistente do app mantém o login (o passo "que estou autenticado no app" só faz login se aparecer a tela de Login) e todo estado de tela volta ao padrão por viver em memória. O reset completo volta sozinho no 1º cenário da execução e depois de qualquer cenário vermelho. Cenário de escrita, de Configurações/preferência, de sessão/login e de offline **nunca** leva `@leitura`.
- **Camadas não se misturam** `[R-POM]`: Page Object só tem seletor + ação (`BasePage.porTag`, `tocar`, `preencher`…); nunca chamada HTTP, mock nem asserção de contrato de API. Chamada HTTP crua vive em `tests/services/` (fonte única da rota). Asserção vive no step.
- **Numeração determinística** `[R-NOME]`: todo cenário se chama `<grupo>.<índice>` — `grupo` = número do arquivo (`1.login.feature` → `1.`), `índice` sequencial que reinicia por arquivo, na ordem em que aparecem; o `.steps.js` leva o **mesmo número** no nome. Cenário novo = próximo índice livre **no fim** do arquivo (nunca no meio: renumerar quebra citações em relatórios e docs). `Esquema do Cenário` com `Exemplos` compartilha o número do bloco. Não renomear cenário existente por estilo.
- **Contagem** `[R-CONTA]`: cobertura (docs e commits) conta só `Cenário:`/`Esquema do Cenário:` **estáticos** no `.feature` — nunca as linhas de `Exemplos` nem as instâncias que o runner executa.
- **Comentários e docs em pt-BR** `[R-COMENT]`; **Conventional Commits** `[R-COMMIT]`.
- **Sem espera mágica:** proibido `driver.pause(ms)` como sincronização (permitido só dentro de laço de polling com condição de saída explícita, como em `dispensarDialogosDePrimeiraAbertura`). Esperar sempre por condição (`waitForDisplayed`, `waitUntil`).

## 2. Evidência antes de código e conduta

Ordem fixa de diagnóstico ao investigar uma falha — nunca chutar seletor/causa a partir da mensagem crua `[R-EVID]`:

1. Log consolidado (`tests/reports/<sessão>/failures.jsonl`, `last-failure.log`)
2. Registro classificado (categoria do `errorHandler`)
3. Dump da árvore de UI (`*.page-source.xml`) — **menor que ~1,5 KB é suspeito** (tela errada/vazia/crash); não diagnosticar em cima dele, conferir se o app ainda está em primeiro plano
4. Screenshot

Faltou insumo (payload, regra de negócio, credencial)? Pedir ao usuário — nunca inventar.

- **`[R-CRIT]`** — Avaliar criticamente toda sugestão técnica do usuário; se não for a melhor abordagem (robustez, manutenção), expor as razões e uma alternativa **antes** de implementar.
- **`[R-PLANO]`** — Plano de arquitetura (mudança de camada, nova dependência, nova config por plataforma) nunca é implementado sem aprovação explícita. Pré-autorizados, sem perguntar: sincronizar docs `[R-SYNC]` e remover isolamento próprio já homologado `[R-ONLY]`.
- **`[R-DELTA]`** — Correção = menor delta: só o bloco afetado; sem reescrever arquivo, sem mexer em import funcional, sem remover cenário que passava. Refatoração (renomear, extrair helper, reorganizar hooks) é **proposta separada**, nunca no mesmo diff do fix. Pré-edição: listar os cenários do mesmo `.feature`, conferir steps/Page Objects compartilhados e avaliar o impacto de mexer em `beforeScenario`/`appLifecycle` em **todos** os dependentes.
- **`[R-CAUSA]`** — Separar bug do app/backend de bug do teste. Bug real → documentar com evidência (`[R-ACHADO]`); manter o cenário vermelho de propósito é válido; nunca forçar verde com sleep, seletor por posição ou tolerância que esconda o defeito.
- **`[R-REPORT]`** — Relatório de falha ao usuário, obrigatório: (1) categoria do `errorHandler`; (2) evidência (trecho de log, tag no dump, screenshot); (3) causa raiz provável (1 a 3 hipóteses ranqueadas); (4) ação proposta (diff ou pseudocódigo); (5) impacto colateral (outros cenários afetados). Proibido "parece que o seletor está errado".
- **Anti-chute de seletor:** proibido trocar seletor de Page Object após `NoSuchElement` sem antes (a) confirmar no `page-source` se a **tela** certa estava aberta (diálogo por cima? app em segundo plano?) e (b) conferir a tag no inventário §11 do app. Achado real 2026-10-14: o seletor do Login estava certo; um diálogo de 1ª abertura cobria a tela.

## 3. Orçamento de diagnóstico (circuit breaker) `[R-DIAG]`

| Gatilho | Limite | Ação ao atingir |
|---|---|---|
| Mesma causa raiz presumida | 2 tentativas seguidas | parar e escalar (loop, não progresso) |
| Nova tentativa autônoma | só com evidência **nova** apontando causa **diferente**; reportar causa + fix a cada rodada | — |
| Tentativas de fix no **mesmo** cenário | 3, mesmo com evidência nova | **perguntar**: continuar, reescopar ou declarar inviável |
| Rodadas completas contra API real por hipótese | 3 (cada uma custa minutos) | check-in com o que foi descartado e o que falta — nunca uma 4ª sem aval |
| Investigação cara (API real, emulador, rodadas repetidas) | declarar estimativa ao iniciar | check-in proativo ao estourar |
| Leitura/busca sem hipótese formada | 5 a 8 chamadas por turno | parar, reportar diagnóstico executivo e alinhar próximos passos |
| Cenário inalcançável pela UI, pelo app ou pela infra | — | questionar a viabilidade e sugerir deleção/redesenho em vez de forçar |

- Técnicas de medição e diagnóstico: **§3.1**, sob demanda (Mapa de leitura).

## 4. Validação isolada e execução `[R-RUN]`

- **Cenário novo:** rodar só ele **2x** (`npm run test:spec -- tests/features/<arq>.feature:<linha>`) antes do arquivo; detecta flakiness e prova co-dependência zero entre cenários do mesmo arquivo. Só então o arquivo, e a suíte inteira apenas com pedido explícito de regressão.
- Autonomia só para autocorreção e só no cenário em jogo — nunca a suíte inteira (cada cenário reinicia o app: minutos). Nunca substitui a homologação do usuário; reportar cada execução (resultado + causa raiz).
- Lista de valores numa chave de config nunca com vírgula/`|` que o runner possa dividir — passar token curto e mapear dentro do código.
- Após o turno: nenhum processo residual (Appium na 4723, `node`, emulador que **você** subiu). Emulador sempre com fuso e DNS (§11).

## 5. Governança de `@wip`/`@skip` `[R-ONLY]`

| Tipo | Quem põe | Quando | Quem tira e quando |
|---|---|---|---|
| Diagnóstico temporário | agente | isolar cenário em correção | o agente, ao fim do **mesmo turno** (se não fazia parte do pedido) |
| Cenário novo a homologar | agente — **obrigatório** | todo cenário criado fica `@wip` até o OK | o agente, no mesmo turno do OK breve do usuário ("ok", "validado" e equivalentes), sem novo pedido, sincronizando docs |
| Do usuário | usuário | — | **nunca** sem autorização explícita |
| De outra sessão | outra sessão | — | **nunca**; apontar no rodapé |

Toda tag declara, no **mesmo commit** que a introduz: quem isolou e por quê (comentário na linha acima), a condição de remoção e o dono responsável por tirá-la. Isolamento esquecido mascara regressão em toda a suíte; ao abrir rodada nova, remover o das rodadas anteriores **desta sessão** já aprovadas.

## 7. Multi-sessão e recurso único `[R-MULTI]`

O emulador, o Appium (porta 4723) e `tests/reports/error-categories.json` são compartilhados entre sessões/abas de IA neste diretório e entre este projeto e `prime-visita-3` (que também usa o emulador para validação manual — app `AGENTS.md` §8).

- Antes de subir/rodar: `adb devices` e a porta 4723 livres; sessão alheia ativa (mesmo `udid` ou porta) → parar e avisar, nunca derrubar.
- Paralelismo **real** (vários emuladores, `maxInstances > 1`) só com `udid` e porta de Appium distintos por worker e `SESSION_LABEL` próprio — decisão registrada em `PROJECT_CONTEXT.md` §3.
- `SESSION_LABEL` namespacia toda saída da execução (`tests/reports/<label>/`); `allure-results` e `error-categories.json` são **append-only** compartilhados, nunca apagar.
- Edição simultânea do mesmo arquivo por duas sessões: reler antes de editar e depois de qualquer aviso de "arquivo mudou"; nunca reescrever o arquivo inteiro (`Write`) por cima de arquivo que outra sessão pode ter mexido.

## 8. Sincronização de documentação `[R-SYNC]`

Criou, removeu, renomeou ou moveu cenário/Page Object/step/suporte → no **mesmo turno**, sem pedir:
- `PROJECT_CONTEXT.md` §6 (inventário: linha por cenário `<grupo>.<índice>`, tag de isolamento, telas/tags do app que ele toca) e as contagens/estrutura;
- `ROADMAP.md` §1-§3 (status, backlog `[x]` → Histórico em ≤ 3 linhas: data, resultado, cenários);
- `README.md` (contagem de cenários, comandos novos). A seção “Cobertura” é **gerada** por `npm run inventario`: cenário novo precisa de um **contexto** em `scripts/contextos-readme.json` e de uma **descrição** em `scripts/descricoes-readme.json` (número `N.M` → frase), senão o gerador falha de propósito; cenário removido sai dos dois arquivos; feature nova pede ainda o resumo em `scripts/resumos-readme.json` (cabeçalho da cobertura e abertura da seção).

Não presumir que README, `PROJECT_CONTEXT.md` e o código já concordam: conferir por `grep` o conjunto de números `<grupo>.<índice>` dos três lados (1:1), não só o total. **Inventário de seletores do app** nunca é copiado — referenciar `prime-visita-3/.agents/PROJECT_CONTEXT.md` §11. Seção "Cobertura" do README: resumo funcional atemporal (sem data/issue na abertura), **sem anotação de resultado de rodada** (`✅`/`❌`); teste vermelho de propósito (bug real) é descrito em prosa e no `ROADMAP.md` §4.

## 15. Particularidades deste projeto para as skills `[R-SKILL]`
> As skills `inicia-contexto-projeto`, `atualiza-context` e `pre-commit` (`.agents/skills/`) são genéricas: o que é específico deste repositório vive aqui, e cada skill lê a sua subseção antes de agir. A skill local `.claude/skills/monitor-pedidos` (escuta das filas `T`/`Q`) continua valendo e segue as mesmas regras de §0.

### 15.1 `inicia-contexto-projeto`
1. **Sessão única:** sem registro de rótulo de aba nem locks; o recurso único é o emulador/Appium (`[R-MULTI]` §7).
2. Além do quente dos 3 arquivos, ler `PROJECT_CONTEXT.md` §6.0 (índice do inventário, marcado `[QUENTE]`).
3. **Filas, sem ler o §6 inteiro:** listar só os blocos `T-NNN` com status `aberto`/`em triagem`/`em execução` em `ROADMAP.md` §6 (`Grep -n "^- \*\*Status:\*\* (aberto|em triagem|em execução)"` e o `- **ID:**` logo acima) e as respostas `Q-NNN` em `prime-visita-3/.agents/ROADMAP.md` §7 (`[R-PEDIDORECEBIDO]`/`[R-PEDIDOAPP]`).
4. **Medir o estado real:** `git status --short`; `grep -rn "@wip\|@skip" tests/features` (contar por feature); `ls docs/apk` (APK mais novo, `[R-APK]`); `adb devices` (`emulator-5556` e porta 4723 livres, `[R-MULTI]`).
5. No relatório: contagem canônica (total de `PROJECT_CONTEXT.md` §6 e `ROADMAP.md` §1), P0/P1 só pelos títulos da tabela `ROADMAP.md` §2, `T-NNN` abertos e os `A-NNN` citados no §1.

### 15.2 `atualiza-context`
- **Contagens e inventário são gerados:** `npm run inventario` reescreve `PROJECT_CONTEXT.md` §6 e a seção "Cobertura" do README a partir dos `.feature` (cenário novo exige contexto em `scripts/contextos-readme.json` e descrição em `scripts/descricoes-readme.json`; feature nova exige o resumo em `scripts/resumos-readme.json`, `[R-SYNC]` §8); nunca editar o §6 à mão. O gerador também reescreve as contagens narradas no README (Visão Geral e Status) no estilo do `cypress-pharmacie-web`; fora dele a contagem só é narrada em `ROADMAP.md` §1.
- **Onde cada coisa entra aqui:** lição técnica → seção fria do tema (§3.1 diagnóstico, §6 seletores, §9 app/backend/APK, §10 armadilhas, §11 erro, §13 edição de docs); achado → `ROADMAP.md` §4 (`[R-ACHADO]`); resultado de pedido → o próprio bloco `T-NNN` em `ROADMAP.md` §6; funcionalidade coberta/pendente → `PROJECT_CONTEXT.md` §8; decisão do usuário sobre massa/gravação → `ROADMAP.md` §3. Ação ou decisão do **usuário** (homologar `@wip`, `Registrar Ponto` real, celular físico, Firebird, permissão) → `ROADMAP.md` §3 "Pendentes do usuário", nunca no backlog §2/§5 da suíte (regra do usuário, 2026-10-17).
- Homologação (`@wip` removido com o "ok" do usuário), revalidação de cenário, reativação de `@skip` → `HISTORICO.md` §1 (1 linha). Item do backlog entregue → sai de `ROADMAP.md` §2/§5 → `HISTORICO.md` §2 (≤ 3 linhas).
- Sem locks nem tabela de sessão: o encerramento é o rodapé `[R-QUEMEU]` (§12.1) + `npm run docs:lint` verde + nenhum processo residual (`[R-RUN]` §4).

### 15.3 `pre-commit`
- **Flags de ambiente:** nenhuma obrigatória. Conferir que `env.json` segue só com placeholders/caminhos e que nenhum segredo entrou em `.agents/`, README ou `docs/` (§0, linha `env.json`); `*.apk` e `env.local.json` são gitignorados.
- **Política de branch:** commit direto em `master` **e** `git push origin master` no mesmo turno, sem branch nova nem PR (`[R-README]` §0); só segurar o push se o pedido disser ou se ele falhar (reportar, nunca forçar).
- **Mensagem:** Conventional Commits em português do Brasil (`[R-COMMIT]`/`[R-COMENT]`); **sem atribuição ao Claude Code** (nem `Co-Authored-By`, nem `Generated with`), mesmo que o harness sugira; aspas simples dentro da mensagem.
- **Multi-sessão:** `ROADMAP.md` §4 daqui é a lista de achados; não há tabela de mudanças por sessão. A sessão do app escreve em `ROADMAP.md` §6 (blocos `T-NNN`) e em `docs/apk/MANIFESTO.md`: essas linhas são aditivas e entram no commit junto.
- **Checagens bloqueantes:** `npm run docs:lint` verde; `grep -rn "@wip\|@skip" tests/features` (isolamento próprio já homologado removido, de terceiros intocado, `[R-ONLY]` §5); `[R-README]`: seção "Status" do README conferida item a item contra `ROADMAP.md` §1-§2; `npm run inventario` rodado quando houve cenário novo/alterado.

---

<!-- fim-quente -->

# Seções sob demanda (frio) — abrir pelo Mapa; numeração original preservada

### 3.1 Técnicas de medição e diagnóstico `[R-DIAG]` (frio)

- **Meça a rede antes da tela** em timeout contra API real: autenticar e chamar a rota suspeita fora do Appium (`curl`, segundos, sem emulador); só depois hipóteses de seletor/lógica. **Nunca** colocar CNPJ/usuário/senha/token literais em comando de shell — usar `env.local.json` por dentro de um Service Object ou script.
- **Estado real acumulado** (massa criada em rodadas anteriores no tenant de teste, fila offline do aparelho) é suspeito tão provável quanto seletor → medir contagens antes de descartar.
- **Emulador sob carga mente** (app `AGENTS.md` §8): ANR "Input dispatching timed out" com a thread principal ociosa costuma ser harness — conferir `top`/`loadavg` e reiniciar o emulador (`adb emu kill`) antes de culpar o app.
- **Quadros lentos só valem com o emulador recém-ligado** (2026-10-17): `dumpsys gfxinfo` (`medirFluidez`, `3.20`/`9.25`) deu 3,0 % recém-ligado e 84,8 % com ~40 min de uso e pouca memória do host — a causa era o emulador, não o app. Medir fluidez só depois de religar o emulador (a rodada completa religa antes de cada feature) e nunca concluir "travou" de um único número.
- **Falha intermitente: rodar 2x isolado antes de culpar** (2026-10-17): `2.23`, `2.27` e `2.29` falharam 1 vez na regressão e passaram 2 de 2 sozinhos; `9.28` falhou 2 de 6 por causa **do app**. Sem repetição não se separa flaky de bug — registrar a taxa (n de m rodadas) no achado.

## 6. Seletores e sincronização `[R-SEL]`

- **Hierarquia:** (1) `testTag` → `resource-id` via `BasePage.porTag` (UiSelector `resourceId`); (2) `porTagComecandoCom(prefixo)` (`resourceIdMatches`) para itens de lista (`visitas_item_<codigo>`); (3) `content-desc`/texto só quando o app não tem tag — e nesse caso abrir achado `[R-ACHADO]`: o app promete tag em todo elemento relevante (app `AGENTS.md` §8). **Proibido** XPath posicional, índice (`[2]`) e coordenada como seletor de teste.
- **Só pelo id `[R-ID]`:** a asserção lê o atributo do nó achado pelo `testTag` (`getText`, `isDisplayed`, `isEnabled`, `getAttribute('checked'|'selected'|'bounds')`). Tema, cor e layout **sem** atributo na árvore são exceção visual: capturar o screenshot, **olhar** (`Read`) e registrar a conclusão no resultado do `T-NNN` — mas se o app puder expor o dado como atributo (`contentDescription`/estado), pedir ao app (`Q-NNN`, tipo `capacidade de teste`) em vez de depender de imagem. Os screenshots que `failureArtifacts` grava continuam sendo só evidência de diagnóstico (`§2`), nunca asserção.
- **Como eu vejo o app** (`tests/support/visual.js`, `scripts/espiar.mjs`, `tools/ffmpeg/` — decisão do usuário, 2026-10-14): (1) `node scripts/espiar.mjs [nome] [--rajada N] [--dump]` captura o emulador da suíte avulso (PNG que eu leio com `Read`; rajada de N quadros a cada 500 ms para aviso que some; o `--dump` falha com sessão Appium ativa); (2) tag `@visual` (ou `VISUAL=1`) = 1 quadro ao fim de **cada passo**, em `tests/reports/<sessão>/visual/<cenário>/NNN_<passo>.png`; (3) tag `@gravar` (ou `GRAVAR=1`) = `screenrecord` + quadros extraídos com o `ffmpeg` (4/s) em `.../video/quadros/q_NNN.png`, para animação/transição; (4) `capturar(driver, nome)` no meio de um passo. **Nada disso é asserção** — são os meus olhos (`[R-ID]`); o que um quadro revelar vira asserção **por id** no cenário (ex.: a opção "Configurações" do menu lateral, vista no quadro e não no inventário). Quadros/vídeos ficam em `tests/reports/` (fora de versão); `@visual`/`@gravar` ficam só em cenário em investigação, nunca no CI por padrão.
- **Nunca `id=`/`~`:** a estratégia `id` do uiautomator2 pode prefixar `<pacote>:id/`, e o `resource-id` do Compose é o tag cru.
- **Validar antes de confiar:** seletor novo = visto num dump (`getPageSource()`/Appium Inspector/`failures`) com o app rodando. Tag que sumiu do dump com o app aberto é bug do app (modal/`Dialog` sem `testTagsAsResourceId`; overlay `matchParentSize` por cima — app §8), nunca motivo para contornar.
- **Sincronizar por condição de UI, não por tempo:** esperar o elemento esperado (`waitForDisplayed`/`waitUntil`), nunca um intervalo fixo. Elemento re-consultado a cada tentativa — nunca reaproveitar referência antiga: telas Compose recompõem e o nó muda.
- **Botão que alterna estado** (`switch`, aba, chip): conferir o estado (`checked`/`selected`) antes de reclicar — em laço de retry, um 2º clique desfaz o 1º.
- **Teclado:** aberto, cobre o botão de baixo e o toque cai no Gboard. Fechar antes de tocar só se estiver aberto (`fecharTecladoSeAberto`); `KEYCODE_BACK` na tela de Login **fecha o app** (raiz sem back stack) — nunca usar como "voltar" lá. `setValue` em campo Compose pode perder caracteres: conferir o valor lido de volta em campo crítico e digitar em pedaços se preciso (app §8).
- **Valor de `CampoSelecaoCatalogo` não sai no `text` do próprio campo** (fica num filho): ler o filho, nunca concluir "vazio" pelo campo.
- **Toque por coordenada** (`tocarEm`) só como fallback para o que não tem nó na árvore (ex.: fechar o Gboard); nunca para mascarar tag ausente.
- **Fim de lista/rolagem:** rolar por `mobile: swipeGesture`/`scrollGesture` até o alvo ficar visível, com limite de tentativas e asserção de que ele apareceu — nunca N rolagens "no olho".
- **Lista preguiçosa = ids posicionais e árvore que pisca** (2026-10-17): em Minha semana (`LazyColumn`) os ids são a posição (`followup_0`…`27`, `resumo_0`…`8`) e só as linhas à vista existem; gesto rápido pula linhas (usar `speed: 600`, 30–40 %), e o próprio título ("FOLLOW-UPS (N PENDENTES)") sai da árvore depois de rolar. Prova de "chegou a todos" = acumular os ids vistos e comparar com a API (fim = 3 rolagens sem id novo). A lista de Hoje acumula dezenas de visitas **canceladas** da massa: rolar até o FIM da lista, nunca "30 vezes".
- **Bolinha só conta quando toma o lugar do conteúdo** (2026-10-17): `*_indicador_carregando` com o conteúdo na mesma leitura é a revalidação em segundo plano, não a "tela em branco que carrega". Reprovar só com indicador/estado vazio **e** conteúdo ausente na mesma leitura; uma leitura isolada sem o id, com o conteúdo visível em quadro (`capturar`), é a árvore de acessibilidade do Compose recompondo (`6.22`).

## 9. Integração com o app e o backend `[R-APIREAL]`

- **Backend real, sempre** (`[R-APIREAL]`, pedido do usuário no app em 2026-10-10): `onPrepare` falha cedo com `backend_indisponivel` se `GET /health/banco` não responder 200 (`/health` não prova banco). Sem mock, sem MITM, sem "modo de teste" no app.
- **Nunca supor contrato:** ler o `.schema.ts` real em `prime-visita-3-backend/src/modules/<recurso>/` antes de escrever qualquer verificação/Service Object (nome de campo, tipo, valores exatos de enum — ex.: sentimento é `positivo`/`neutro`/`negativo`).
- **Toda rota de domínio exige `Authorization: Bearer <token>`**; Service Object autentica por dentro, a partir de `env.local.json`, nunca com credencial literal no comando `[R-DIAG]`.
- **Validar escrita sempre pelo `GET` depois do `PUT`/`POST`** (o backend já devolveu 200 + `version` nova sem gravar — app `AGENTS.md` §8, `F-017`): reproduzir por `curl` antes de culpar a tela.
- **Massa de teste:** o tenant é real e compartilhado; cenário que cria registro usa nome com sufixo único da execução (`SESSION_LABEL`) e **não** depende de registro de rodada anterior. Ação irreversível sobre massa escassa (ex.: **Registrar Ponto**, grava no desktop/Firebird real) **nunca** roda sem decisão explícita do usuário.
- **Achados** `[R-ACHADO]` e a fila de pedidos (`F-NNN`/`B-NNN`) seguem §0; status de `F-NNN` é da sessão do backend, nunca editar um item já triado.

- **APK sob teste `[R-APK]`** (decisão do usuário, 2026-10-14: o app só builda no celular dele, para não trocar o build no meio de um teste desta suíte): a sessão do app deposita builds em `app.apkDir` (`mobile-appium-cucumber-suite/docs/apk/`) com o nome `T-NNN[+T-MMM|T-AAA..T-ZZZ]_AAAAMMDD-HHmm.apk`, **imutáveis** (build novo = arquivo novo). A suíte escolhe sempre o mais novo (cumulativo — ver §0 `[R-APK]`); a variável `APK=T-017` (ex.: `APK=T-017 npm test`) só serve para investigar regressão em build antigo, instala com `adb install -r -d` no `device.udid` da suíte e registra o nome e o `versionName` em `apk-usado.json`. Nunca instalar fora do `onPrepare`.
- **Aparelho real por adb wifi** (2026-10-24, `DEVICE_UDID=192.168.1.190:5555`): sem adbd root (`adb root` só avisa), sem `adb emu` e **sem desligar o wifi** (é o canal do adb). `desligarRede` troca para o firewall do sistema só para o app (`cmd connectivity set-chain3-enabled true` + `set-package-networking-enabled false <pacote>`): a **fila offline** funciona (`1.9`, `2.28`), mas o app **não mostra o aviso offline** (`*_texto_offline`), então esses cenários ficam no AVD. `@relogio` usa `cmd alarm set-time`; `@redeLenta` não existe lá. Depois do login o Gerenciador de Senhas do Google cobre o app ("Salvar senha"): `dispensarSalvarSenhaDoSistema` toca em "Agora não" (nunca em "Nunca", para não mexer na configuração do celular). A suíte também grava `stylus_handwriting_enabled=0` no aparelho. O celular do usuário só entra com aval dele e sai no mesmo dia.
- **Dispositivo da suíte** (`tests/support/dispositivo.js`): AVD dedicado `Pixel_6_API_34` (imagem `google_apis` API 36, sem Play Store, adbd root, `udid` fixo `emulator-5556`) é o **único** alvo da suíte; `mobile: shell` (flag `adb_shell` liberada só em 127.0.0.1) serve a relógio, alarmes, `dumpsys`, fonte e tema. Cenário que mexe no relógio leva `@relogio` (o `afterScenario` restaura a hora). Nunca mexer em relógio/configuração do celular do usuário nem do emulador de outras sessões.
- **Massa que a tela grava é desfeita por instantâneo** (2026-10-17): cenário que grava pela UI registra o estado ANTES (`registrarFollowUpsConcluidos`, `registrarVinculadosAntes`, `registrarMassaPelaUI`) e o `afterScenario` desfaz tudo o que ficou a mais, passe ou falhe (follow-up `PUT /resumo-visita-ia/:codigo/follow-ups/:indice`, vínculo `DELETE /prescritores/:codigo/representante`, visita por prefixo "Teste Appium"). Falha no meio sem isso deixou 2 follow-ups e 2 vínculos a mais no tenant. Cenário offline fecha o app e apaga os dados **antes** de religar a rede, para a fila não enviar visita ao tenant.
- **Expectativa depende do dia da semana** (2026-10-17): no sábado `GET /ponto` vem com `intervalo: "00:00:00.0000"` (sem almoço) e o app mostra "—"; teste que trata `00:00` como almoço quebra (`5.3`/`5.4`). Derivar a expectativa da API do dia, nunca fixa. Idem horário "livre" de massa: `horarioLivreHoje` acha o slot do dia, não um horário literal.
- **Dois usuários de teste** (2026-10-17): `credentialsOutroUsuario` (`env.local.json`) é outro funcionário do mesmo tenant com dados bem diferentes (150 × 4 visitas, 6 × 3 vinculados). `BackendService.obterComoOutroUsuario` só LÊ; serve a `1.13`.

## 10. Armadilhas já pagas (não redescobrir)

- `waitForClickable` não existe em app nativo → `waitForEnabled`.
- `mobile: shell` exige a flag `adb_shell`: **liberada** em 2026-10-14 (`wdio.shared.conf.js`, só 127.0.0.1, decisão do usuário); ainda assim preferir os comandos `mobile:` próprios (`changePermissions`, `clearApp`, `terminateApp`, `activateApp`) quando existirem.
- `clearApp` faz o app reabrir com a cadeia de diálogos da 1ª abertura por cima do Login (notificações → "Sem problema" → bateria): `dispensarDialogosDePrimeiraAbertura` (`tests/support/appLifecycle.js`) os trata; permissões do SO são reconcedidas por `mobile: changePermissions`.
- Tag do Compose dentro de `ModalBottomSheet`/`Dialog`/`Popup` só aparece se o app aplicou `testTagsAsResourceId` na raiz do modal (app §8): ausente = achado do app.
- Armadilha de `adb`: no Git Bash, `adb pull /sdcard/x` vira `C:/Program Files/Git/sdcard/x` → `MSYS_NO_PATHCONV=1`. Com celular e emulador conectados, fixar `ANDROID_SERIAL`/`appium:udid`.
- Modo avião/offline: depois de reabilitar a rede o emulador pode levar minutos para marcar `VALIDATED`; a prova de que a fila foi enviada é a **resposta HTTP/o estado da fila**, não o ícone (app `PROJECT_CONTEXT.md` §9.4).
- **Imagem `google_apis` da API 37 não presta neste emulador** (achado 2026-10-14): o SurfaceFlinger aborta em loop (`Assertion failed: !rcEnc->featureInfo()->hasReadColorBufferDma`, thread `RegionSampling`) e o `system_server` reinicia a cada ~13 s, com `-gpu swiftshader_indirect` ou sem. `-feature -ReadColorBufferDma` não resolve. A imagem `google_apis` da API **36** (a `targetSdk` do app) é a usada: AVD `Pixel_6_API_34`. Sintoma para reconhecer: `pidof system_server` muda a cada poucos segundos mesmo com `sys.boot_completed=1`.
- **AVD novo no `avdmanager` nasce pequeno demais** (achado 2026-10-14, `Pixel_6_API_34`): partição de dados de 800 MB e 1,5 GB de RAM deixam o `system_server` em loop (`SQLITE_FULL`, SIGABRT do surfaceflinger; `adb` responde `cmd: Can't find service: package/settings` e o `sys.boot_completed` fica `1` mesmo assim). Antes do 1º boot: `disk.dataPartition.size=8G` e `hw.ramSize=6144` em `config.ini`; 1º boot leva ~8 min — esperar `service list` > 250 serviços, não só `boot_completed`.
- Emulador sobe com fuso e DNS: `emulator -avd <nome> -timezone America/Sao_Paulo -dns-server 8.8.8.8,1.1.1.1` (sem isso: datas no dia seguinte e `UnresolvedAddressException`).
- **Token do backend vence em ~15 min** (2026-10-15): o `BackendService` guardava a sessão para sempre e, depois de ~19 min de rodada, todo cenário com API levava `401`. Regra: `401` com o token do cache → loga de novo uma vez e repete (já em `requisitar`).
- **Lista do Compose é preguiçosa e a de teste acumula cancelados** (2026-10-15): só ~5 cartões existem na árvore, e `isDisplayed` é falso para os pré-carregados. Gesto rápido do Appium anda ~1 janela e pula cartões: rolar com `arrastar(tag, dir, 0.3, 600)` (velocidade baixa) até o id ficar **visível**, nunca contar nós nem supor posição.
- **`hideKeyboard()` manda BACK e o BACK fecha o pop-up** (2026-10-15, `2.13`): num `Dialog` com campo de texto não fechar o teclado; o botão tem que estar alcançável com ele aberto.
- **Teclado fora da árvore do app** (2026-10-15, `4.7`): o nó do Gboard nem sempre aparece; o topo do teclado sai de `dumpsys window` (`InsetsSource type=ime frame=[0,topo]… visible=true`, `topoDoTecladoPorInsets`). O Gboard mostra o tutorial de caneta por cima do app: `stylus_handwriting_enabled=0` no `onPrepare`.
- **Descrição de botão só de ícone e rótulos de campo ficam em nó filho/irmão sem id**, dentro dos bounds do id (`descricaoDe`, `rotuloDe`): a âncora segue sendo o id. Interruptor (`LinhaInterruptor`): tocar e ler `checked` em `<tag>_linha`, não em `_switch`.
- **Réplica de regra do app tem que ser palavra por palavra** (2026-10-15): `nomePropio` do teste divergia do Kotlin (conectores "com"…, hífen, dígito) e `nomeCurto` do Chat faltava; qualquer comparação de nome usa `tests/support/nomePropio.js`, em sincronia com `NomePropio.kt`.
- **Emulador (host Windows)**: `-gpu swiftshader_indirect` faz o commit do `qemu` crescer ~0,4 GB/min; usar `-gpu host -memory 6144 -no-snapshot -no-audio` e religar entre features (medir `FreeVirtualMemory`, não só RAM livre).
- **Edição de código por `String.replace` no Node**: `$$` na string de troca vira `$` (quebrou `driver.$`) — usar função de troca `() => novo` ou a ferramenta de edição; checar `node --check` em tudo antes de rodar.
- **`APK=T-NNN` escolhe o mais novo que COBRE o pedido** (2026-10-16), então não serve para comparar com o build anterior (o APK cumulativo mais novo cobre tudo). Para atribuir uma regressão a um build: `adb install -r -d` do APK antigo à mão e rodar com `APK_JA_INSTALADO=1` (só diagnóstico, não vale resultado de `T-NNN`); o `onPrepare` seguinte reinstala o mais novo.
- **Artefatos de falha saem DEPOIS da limpeza** (2026-10-17): o `afterScenario` cancela a massa antes de `failureArtifacts`, então o quadro/dump de falha mostra a visita já "Cancelada" e o estado de antes da limpeza se perde. Para ver o estado do momento, `capturar(driver, nome)` dentro do passo (e mensagem de erro com o estado lido).
- **Matar processo por padrão amplo derruba as ferramentas** (2026-10-17): filtrar por `CommandLine` com o nome do projeto + `wdio`/`appium` também pegou os `bash.exe` das ferramentas de monitoramento e matou os dois monitores. Parar a rodada pelo PID do script/`wdio` específico, nunca por trecho do caminho do projeto.
- **APK novo no meio da rodada mistura builds** (2026-10-17): o `onPrepare` de cada feature instala o MAIS NOVO; um APK depositado durante a rodada faz as features seguintes rodarem num build diferente. Conferir `tests/reports/<sessão>/apk-usado.json` de cada feature e refazer as que rodaram no build antigo. Offline logo depois do login não serve de controle: a sincronização cortada deixa Prescritores/Chat sem cópia.
- **`@offline` que falha vaza a fila** (2026-10-24): o cenário que desliga a rede e falha antes do passo "encerro o app e apago os dados" deixa a fila no app, e ao religar a rede ela sobe ao tenant (vazou uma visita "Teste Appium"). O `afterScenario` agora apaga os dados ANTES de religar quando o `@offline` falha (depois dos artefatos de falha).
- **`adb shell run-as <pacote> sh -c '…|…>…'` precisa de aspas** (2026-10-24): o `adb shell` junta os argumentos numa linha e o `|`/`>` rodam no shell de fora (sem acesso à pasta do app: "can't create … No such file"). Passar `"cmd | cmd > arquivo"` com aspas duplas literais (`semearPreferenciasDoApp`, base64 para não depender de aspas internas). Saída do `adb` no Windows vem em CRLF: normalizar antes de regravar arquivo do app.
- **Abas de Visitas: ordem real e barra rolável** (2026-10-24): a ordem na tela é Todos, Pendente, Hoje, Agendada, Concluída (o inventário do app diz o contrário, `A-016`). Com a fonte grande ou depois de trocar de mês a barra rola e as abas da ponta saem da árvore: arrastar a partir da aba mais perto do **centro** (a borda dispara o gesto de voltar). Pendências usam id de **UUID** (`pendencias_item_<uuid>`, selo em `content-desc` "Envio: …") e a visita criada sem rede aparece como `visitas_item_pendente_<uuid>` no topo da lista (sem `_badge_status`).
- **1ª abertura de verdade** (2026-10-24, `9.32`): o reset da suíte concede `POST_NOTIFICATIONS`, e com ela o app só mostra a recomendação de bateria; para ver também a pergunta de notificações, revogar a permissão depois do `clearApp`. `driver.setOrientation` falha com "Screen rotation cannot be changed" justamente porque o app trava a orientação: o pedido de rotação vai por `settings put system user_rotation 1` (restaurado em `finally`).
- Segredo (senha do tenant) nunca em arquivo versionado nem em `.agents/`.

## 11. Estratégia de relatório e erro `[R-ERR]`

Toda falha cai numa categoria do `tests/support/errorHandler.js`; forma desconhecida gera categoria nova auto-descoberta (`tests/reports/error-categories.json`) — nunca "causa não classificada" para sempre. Ao descobrir causa nova recorrente, **promover** a categoria para regra estática (`RULES`) com a data. Categorias hoje: ver `PROJECT_CONTEXT.md` §7.

## 12. Rodapé obrigatório de turno e checklist

### 12.1 Rodapé `[R-QUEMEU]`
Todo turno que toca teste termina com (formato aprovado — adaptado de `cypress-pharmacie-web` §1.3):

```
📋 Testes tocados — <data>

<arquivo>.feature
├─ #N.M — <criado|ajustado|corrigido|removido>: <o que mudou em 1 linha>
└─ #N.P — ...

<outro arquivo>.feature
└─ #K.L — ...
```

Turno com um só arquivo pode achatar em 1 linha. Depois da árvore, sempre: (1) `grep -rn "@wip\|@skip" tests/features` → isolamentos ativos, **apontando os de terceiros**; (2) confirmação de que nenhum processo (emulador/`node`/Appium na 4723) ficou residual por causa do turno; (3) **resumo estilo mensagem de commit**, escopo só do turno: `- Verbo no presente (Adiciona/Corrige) + N cenários + o quê + (achado/pedido de origem)`; (4) orientação de como o usuário reproduz (`npm run test:spec -- <arquivo>:<linha>`).

### 12.2 Checklist de estado `[R-CHECKLIST]`
Quando o usuário pedir "checklist", responder com **um único bloco de código monoespaçado**, duas colunas em texto puro (feito à esquerda, pendente à direita) — nada de tabela Markdown nem prosa antes do bloco. **Fontes lidas na hora:** `ROADMAP.md` §2 daqui; `prime-visita-3/.agents/ROADMAP.md` §6 (`B-NNN`) e §2 (fases do app); `prime-visita-3-backend/.agents/ROADMAP.md` §5 (`F-NNN` — status é da sessão do backend). Blocos, nesta ordem: `FASES DA SUÍTE` · `ACHADOS ABERTOS` · `PEDIDOS AO APP (Q)` · `TESTES PEDIDOS PELO APP (T)` · `PEDIDOS AO BACKEND (F)` · `REPOSITÓRIO` (fontes novas: `prime-visita-3/.agents/ROADMAP.md` §7 para `Q`, `ROADMAP.md` §6 daqui para `T`; em `T`, `✅` = `passou`, `⏳` = abertos/`falhou`/`bloqueado`). Título `CHECKLIST · AAAA-MM-DD`; itens ≤ 3 palavras; pedidos em duas linhas (`✅` feitos / `⏳` pendentes, `ID nome` separados por ` · `); coluna vazia vira `—`; bloqueio entre parênteses. Modelo:

```
CHECKLIST · 2026-10-14

FASES DA SUÍTE
                     ✅ FEITO                          ⏳ PENDENTE
 0 Esqueleto         stack, camadas, suporte           —
 1 Login             3 cenários                        (aguarda senha)
 2 Visitas           —                                 lista, abas, mês

ACHADOS ABERTOS
 ⏳ A-001 ... · A-002 ...

PEDIDOS AO BACKEND (F)   estado na sessão do backend
 ✅ —
 ⏳ —

REPOSITÓRIO
 ✅ —
 ⏳ sem git
```

## 13. Edição de `.agents/*.md`, `README.md` e `docs/*.md` por ferramenta `[R-EDICAO]`

Regra herdada do app (`prime-visita-3/.agents/AGENTS.md` §12), aplicada aqui:
- Arquivos **UTF-8 com LF**. Nunca editar com `perl -0pi` que leia bloco de inserção via `:encoding(UTF-8)` (acentos duplamente codificados). Inserção de bloco grande: PowerShell `[IO.File]::ReadAllText/WriteAllText` com `New-Object System.Text.UTF8Encoding($false)`, normalizando `\r\n` → `\n`, sem nunca gravar texto vazio; âncora/texto com crase só em **aspas simples**.
- Depois de qualquer edição automatizada: `grep -c 'Ã'` nos arquivos tocados (únicas ocorrências legítimas: maiúsculas como "NÃO"/"CAMPEÃO") e conferir o tamanho plausível do diff — diff do tamanho do arquivo = corrupção, restaurar e refazer.
- `rm` em shell nunca com `"$VAR"/...` cru: usar `"${VAR:?}"` ou caminho absoluto literal.

## 14. Roteamento de cenários — onde cada teste mora `[R-ROTEAR]`

Mesmo papel do `R-SUITE` do `cypress-pharmacie-web`: o cenário vai para a **feature dona da tela**; não se cria feature raiz nova (`10.*`…) sem confirmação expressa do usuário. Features, Page Objects e steps levam o **mesmo número e nome** (`2.visita.feature` ↔ `2.visita.steps.js` ↔ `2.visitaPage.js`); `BasePage` e `0.comum.steps.js` não são numerados (base e passos compartilhados).

| # | Feature | Dona de |
|---|---|---|
| 1 | `1.login` | Login, sessão persistente, motivo de queda, "outro usuário no aparelho", logout |
| 2 | `2.visita` | Visitas: lista/abas/mês, Iniciar/Agendar, detalhe, itens, áudios, resumo por IA, reagendar, recorrência, pendente de envio na lista |
| 3 | `3.relatorio` | Gráficos e Relatórios (por prescritor/especialidade/Minha semana), follow-ups, detalhe mensal |
| 4 | `4.chat` | Lista de contatos e conversa, disponibilidade (chave Disponível/Ocupado) |
| 5 | `5.ponto` | Registro de Ponto (leitura; **registrar só com decisão explícita**, §9) |
| 6 | `6.prescritores` | Lista, busca, filtros, vínculo, formulário (criar/editar), detalhe do prescritor |
| 7 | `7.secretarias` | Lista, filtros Minhas/Todas, formulário, vínculos |
| 8 | `8.locais` | Lista, busca, filtros Meus/Todos, formulário com endereço, vínculos |
| 9 | `9.menu` | Casca (barra inferior, menu lateral, avisos `app_aviso_*`, tema, transições) **e tudo que não encaixa em 1-8**: Aniversários, Sobre, Ajuda, Configurações, Pendências de envio, offline/sincronização, notificações |

- **Regras de decisão:** (1) o cenário vai para a feature da **tela onde o comportamento acontece**, não da onde a regra nasce (vínculo feito na tela do prescritor → `6`; na tela da secretária → `7`); (2) comportamento transversal (aviso, teclado, tema, offline) → `9`; (3) dúvida entre duas → perguntar, não presumir; (4) passo reaproveitável por 2+ features → `0.comum.steps.js`.
- **O primeiro cenário de cada feature (`N.1`) é sempre "acessa a tela e renderiza as informações corretamente"** (decisão do usuário, 2026-10-14): chega à tela pelo caminho real do usuário, confere a casca (título, controles, estados) e que o **conteúdo bate com a fonte** — hora/data/mês calculados em pt-BR fixo (`tests/support/dataPtBr.js`) ou lista conforme a **API real** (`BackendService`). Com massa real → itens bem formados; sem massa → estado vazio; **nunca** "lista ou vazio" aceito sem decidir qual era o esperado quando a API permite (`R-AFP`). Os demais cenários da feature só entram depois dele.
- **Pedido recebido do app** (`B-NNN`, bug relatado, feature nova): vira cenário **na hora**, na feature dona, como `@wip`; referenciar o pedido no `Cenário:` (comentário na linha acima: `# B-NNN`) e no §6 do `PROJECT_CONTEXT.md`. Pedido que o app ainda não entregou → cenário `@skip` com condição de remoção "pedido `B-NNN` feito" (`R-ONLY`).
- **Localizar antes de criar:** `grep -n "<tag ou rota>" .agents/PROJECT_CONTEXT.md` e `grep -rn "<tag>" tests/`; já coberto → **ajustar o cenário existente** (estender asserção) em vez de criar concorrente; cenário novo só para regra substancialmente nova.
- **Cenário novo entra no fim da feature** (próximo índice livre), nunca no meio — renumerar quebra citações (`R-NOME`).
