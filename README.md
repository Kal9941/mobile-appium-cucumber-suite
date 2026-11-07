# 📱 Mobile Appium Cucumber Suite — Android & Jetpack Compose

[![Appium Version](https://img.shields.io/badge/Appium-v3.8.0-EA5906?style=for-the-badge&logo=appium&logoColor=white)](https://appium.io/)
[![UiAutomator2](https://img.shields.io/badge/Driver-UiAutomator2-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/appium/appium-uiautomator2-driver)
[![WebdriverIO](https://img.shields.io/badge/WebdriverIO-v10.0.1-EA5906?style=for-the-badge&logo=webdriverio&logoColor=white)](https://webdriver.io/)
[![Cucumber BDD](https://img.shields.io/badge/Cucumber-BDD%20pt--BR-23D96C?style=for-the-badge&logo=cucumber&logoColor=white)](https://cucumber.io/)
[![AI-Governance](https://img.shields.io/badge/AI%20Governance-.agents%20Framework-blueviolet?style=for-the-badge)](#-recursos-para-agentes-de-ia)

> **Framework de Automação Mobile Corporativo**: 198 cenários em Gherkin cobrindo 9 domínios funcionais de um aplicativo Android nativo (Jetpack Compose), com Page Objects mapeados por `testTag`/`resource-id`, isolamento estrito de ciclo de vida do app (`clearApp`), categorização automatizada de falhas (`errorHandler.js`) e governança orientada a agentes de IA (`.agents/`).

---

## 📌 Visão Geral do Projeto

### O produto sob teste (MedVisit Mobile CRM)

O aplicativo sob teste é um CRM mobile Android nativo construído com **Kotlin Multiplatform (KMP) + Jetpack Compose** para representantes em campo. Ele cobre:

* **Visitas:** agenda do dia/mês em abas (Concluída, Pendente, Hoje, Agendada, Todos), **Iniciar** (com check-in) e **Agendar** (com repetição), detalhe com histórico, itens, **áudio** com **resumo por IA**, reagendar e cancelar com motivo.
* **Cadastros:** prescritores, secretárias e locais de atendimento, com vínculos entre eles, CEP pelo ViaCEP e máscaras.
* **Relatórios:** totais de venda por prescritor e por especialidade (mês/ano), gráficos mensais e a **Minha semana** (sentimentos, follow-ups, produtos mais citados).
* **Chat** com a equipe, **Registro de Ponto**, **Aniversários**, **Configurações** (tema, bateria, notificações), **Sobre**, **Ajuda** e **Pendências de envio**.
* **Offline em primeiro lugar:** as telas abrem pela cópia local e o app sincroniza com o servidor por trás; o que se grava sem rede entra numa **fila** de envio.

O servidor é o `prime-visita-3-backend` (Fastify + Firebird), que fala com a base do **Pharmacie** (sistema desktop legado); o app **não** fala direto com o banco.

### O que este repositório faz

Este repositório contém a automação de testes de interface do app: **Appium** (driver `uiautomator2`) + **WebdriverIO** + **Cucumber** (Gherkin em português), rodando num **emulador Android dedicado** contra o **backend real** — **sem mock**, por decisão de projeto. O valor da suíte é confrontar o que a tela mostra com o que a API devolve e provar o comportamento que o usuário vê (máscaras, ordem das listas, pop-ups, offline, notificações), cenário por cenário, a partir de um app limpo.

A suíte conta atualmente com **198 cenários automatizados** (208 execuções, contando as linhas de `Exemplos`) distribuídos em 9 features (`tests/features/`), uma por tela/área do app — detalhamento completo em [🧪 Cobertura Atual de Testes](#-cobertura-atual-de-testes).

### Como funciona o ciclo de teste

* **Build sob teste rastreável:** a sessão do app deposita APKs imutáveis (`T-NNN_AAAAMMDD-HHmm.apk`); a suíte instala o mais novo uma vez por execução, confere o **SHA-256**, zera cache e dados e registra qual build testou — ver [📦 Build sob Teste](#-build-sob-teste-apk).
* **Quem testa o app é esta suíte:** a sessão do app confere o que o build prova (compila, testes de unidade) e **pede** a validação ao vivo abrindo um pedido `T-NNN`; esta suíte escreve o cenário, roda e devolve o resultado no próprio pedido. O que a suíte descobre de errado vira **achado** `A-NNN` e um pedido `Q-NNN` ao app — ver [🔀 Filas entre sessões](#-filas-entre-sessões).
* **Principais padrões:** **Page Object** (`tests/pages/`), **Service Object** para a API real (`tests/services/`), **isolamento de estado por cenário** (`clearApp`) com **reinício leve** nos cenários de leitura, componentes localizados **sempre pelo id** (`testTag` → `resource-id`), massa de teste própria (prefixo `Teste Appium`, cancelada ao fim) e **classificador de erro** com descoberta automática de categorias.
* **Base de conhecimento para agentes de IA** (`.agents/`), ferramentas para a IA **enxergar o app** (mapeamento, capturas, gravação com `ffmpeg`) e skills locais do Claude Code que vigiam as filas de pedidos — ver [🤖 Recursos para Agentes de IA](#-recursos-para-agentes-de-ia).

---

## 🌐 Endereços e Credenciais Globais

O projeto separa configuração versionada de segredos: `env.json` (versionado, só caminhos, ids e placeholders vazios) e `env.local.json` (**gitignorado**, credenciais reais) são mesclados em tempo de execução por `loadEnv()` (`tests/support/loadEnv.js`) — nunca lidos direto.

| Chave (`env.json`) | Responsabilidade | Consumido por |
|---|---|---|
| `app.apkDir` | Pasta dos APKs imutáveis `T-NNN_AAAAMMDD-HHmm.apk` (padrão: `docs/apk/`) | `tests/support/apk.js`, `wdio.shared.conf.js` |
| `app.appPackage` / `app.appActivity` | Pacote e activity do app (`com.example.medvisit`) | capabilities, `appLifecycle.js` |
| `device.name` / `device.udid` | AVD dedicado da suíte (`Pixel_6_API_34`, `emulator-5556`) — **único** alvo permitido | `wdio.android.conf.js`, `dispositivo.js` |
| `backend.baseUrl` | URL do backend real (`http://localhost:3000`) | `tests/services/BackendService.js` |
| `credentials.cnpj` / `usuario` / `senha` | Conta do tenant de teste (**só em `env.local.json`**) | steps de login, `BackendService` |
| `credentialsOutroUsuario.*` | 2ª conta do mesmo tenant, para o cenário “outro usuário no aparelho” (**só em `env.local.json`**) | cenários de troca de usuário |
| `tools.ffmpeg` | `ffmpeg` local (gitignorado) para extrair quadros das gravações de tela | `tests/support/visual.js` |
| `session.defaultLabel` | Prefixo do rótulo de sessão (`SESSION_LABEL`) | `sessionLabel.js` |

> 🔒 Os valores reais (CNPJ, usuário, senha) não aparecem neste README nem em `.agents/` — só em `env.local.json`, que nunca é versionado.

### ⚙️ Como Configurar

1. Copie as credenciais para `env.local.json` (nunca versione): `{ "credentials": { "cnpj": "…", "usuario": "…", "senha": "…" } }`.
2. Confirme em `env.json` o `device.udid` do emulador dedicado. **Nunca** use um celular físico nem o emulador de outras sessões: o `clearApp` de cada cenário apagaria os dados do app.
3. Deixe os APKs de teste em `app.apkDir` (quem publica é a sessão do app, com `scripts/publica-apk.sh` do `prime-visita-3`).
4. Tenha o backend `prime-visita-3-backend` no ar: a suíte confere `GET /health/banco` antes de começar e aborta com `backend_indisponivel` se ele não responder.

---

## 🛠️ Tecnologias e Dependências

| Tecnologia | Versão | Uso |
|---|---|---|
| **[Appium](https://appium.io/)** + driver **`uiautomator2`** | 3.8 / 8.7 | Automação do app Android via servidor local (`--allow-insecure uiautomator2:adb_shell` só em `127.0.0.1`, para relógio, rede e `dumpsys`) |
| **[WebdriverIO](https://webdriver.io/)** (`@wdio/cli`, `local-runner`, `appium-service`) | 10 | Runner, API de elementos e hooks (`onPrepare`, `beforeScenario`, `afterScenario`) |
| **[Cucumber](https://cucumber.io/)** (`@wdio/cucumber-framework`) | 13 | Gherkin em português, passos em JavaScript (ESM) |
| **expect-webdriverio** | 8 | Asserções sobre elementos |
| **[Allure](https://allurereport.org/)** (`@wdio/allure-reporter`, `allure-commandline`) | 2.46 | Relatório com histórico entre execuções |
| **multiple-cucumber-html-reporter** + `report-i18n-pt-br.js` | 4.4 | Relatório HTML em pt-BR, com o bloco “Build sob teste” |
| **`@wdio/spec-reporter`** / **`@wdio/json-reporter`** | 10 | Saída no terminal e JSON da execução |
| **Node.js** | 24 | Runtime da suíte e dos scripts (`scripts/`) |
| **Android SDK** (`adb`, `emulator`, `avdmanager`) + AVD **`google_apis` API 36** | — | Dispositivo dedicado, com `adb root`, 8 GB de dados e 6 GB de RAM, sem Play Store |
| **[ffmpeg](https://ffmpeg.org/)** (`tools/`, gitignorado) | — | Quadros extraídos das gravações de tela (`screenrecord`) |
| **Backend real** `prime-visita-3-backend` (Fastify + Firebird) | — | Fonte do conteúdo esperado: a suíte lê a API (`BackendService`) e confronta com a tela |
| **ViaCEP** | — | Serviço público de CEP exercitado pelos formulários (somente leitura) |
| **[Claude Code](https://claude.com/claude-code)** + skills (`.agents/skills/`, `.claude/skills/`) | — | Agente que escreve, roda e diagnostica os cenários; `inicia-contexto-projeto`, `atualiza-context`, `pre-commit` (genéricas, em `.agents/skills/`) e a local `monitor-pedidos` |
| **Git / GitHub** | — | Versionamento (`master`, remoto privado) |

---

## 🏗️ Estrutura de Arquitetura e Padrões

```text
mobile-appium-cucumber-suite/
├── .agents/                 # padrão quente/frio: AGENTS.md (regras) · PROJECT_CONTEXT.md (arquitetura + inventário gerado) · ROADMAP.md (status, backlog, fila T, achados A) · HISTORICO.md (changelog) · skills/ (3 skills genéricas)
├── .claude/skills/          # monitor-pedidos (skill local, gitignorada)
├── docs/
│   ├── APPIUM_MOBILE_FRAMEWORK_REFERENCE.md   # raciocínio da arquitetura (portado do projeto desktop)
│   └── apk/                 # APKs imutáveis T-NNN_AAAAMMDD-HHmm.apk + MANIFESTO.md (SHA-256) — .apk gitignorados
├── tests/
│   ├── features/            # 1.login 2.visita 3.relatorio 4.chat 5.ponto 6.prescritores 7.secretarias 8.locais 9.menu
│   ├── steps-definitions/   # N.<nome>.steps.js (mesmo número/nome da feature) + 0.comum.steps.js
│   ├── pages/               # Page Objects N.<nome>Page.js + BasePage.js
│   ├── services/            # BackendService.js (API real: health, login, listagens, massa de teste)
│   ├── support/             # apk, appLifecycle, dispositivo, visual, errorHandler, failureArtifacts, dataPtBr, formatoPtBr, nomePropio, loadEnv, sessionLabel
│   └── reports/             # gitignored — falhas, dumps, screenshots, HTML e Allure por sessão
├── scripts/                 # mapear, explorar, espiar, gerar-inventario (+ contextos/descrições do README), lint-agents (docs:lint), generateHtmlReport, report-i18n-pt-br
├── tools/                   # ffmpeg (gitignorado)
├── wdio.shared.conf.js      # reporters, hooks, cucumberOpts, onPrepare (backend, APK, massa órfã)
├── wdio.android.conf.js     # capabilities uiautomator2
└── env.json / env.local.json
```

| Camada | Responsabilidade | Regra dura |
|---|---|---|
| **Page Object** | Seletor (`resource-id` = `testTag` do Compose) + ação | Nunca HTTP, mock nem asserção de contrato |
| **Service Object** | Chamada HTTP crua à API real, sem UI | Única fonte da rota; contrato lido do `.schema.ts` do backend; renova o token ao receber `401` |
| **`errorHandler`** | Classifica toda falha (regras estáticas + descoberta automática) | Nunca “causa não classificada” para sempre |
| **`failureArtifacts`** | Screenshot + `getPageSource()` + `failures.jsonl` | Ordem de diagnóstico: log → categoria → dump → screenshot |
| **`appLifecycle`** | Reset de estado, abertura, diálogos de 1ª abertura, reinício leve | Nunca reaproveitar estado entre cenários (exceto `@leitura`) |
| **`dispositivo`** | Relógio, rede, velocidade, `logcat` de chamadas HTTP, topo do teclado por `dumpsys` | Só no AVD dedicado; o `afterScenario` devolve tudo ao normal |

### 🔑 Padrões de escrita

* **Padrão AAA (Arrange, Act, Assert):** `Dado` prepara o estado (login, massa de teste, rede), `Quando` executa a ação que o cenário existe para validar e `Então` confere o resultado; a asserção principal **nunca** fica dentro de um `if` que pode não executar (anti falso-positivo, `AGENTS.md` `[R-AFP]`).
* **Componente se testa pelo id** (`testTag` → `resource-id`: existência, texto, estado, `bounds`) — **nunca por screenshot**. Elemento sem id vira pedido `Q-NNN` ao app, nunca contorno por coordenada ou texto.
* **Conteúdo sempre confrontado com a API real**: o esperado vem do backend (ou de cálculo em pt-BR fixo, como datas e nomes próprios), nunca de valor fixo; o app roda contra dados reais do tenant de teste, então a suíte prova a ordem pelos **extremos** da lista da API e trata listas preguiçosas do Compose com rolagem lenta e curta.
* **Numeração `<grupo>.<índice>`** sincronizada entre `.feature`, `.steps.js` e `Page.js`; o **primeiro cenário de cada feature é sempre “acessa a tela e renderiza as informações corretamente”**; cenário novo entra no fim da feature, nunca no meio.
* **Massa de teste** só com o prefixo `Teste Appium`, criada pela API e **cancelada ao fim** do cenário (e as órfãs, no início de toda execução). **Nunca** grava ponto real (`Registrar Ponto`) nem envia “Teste grátis”.
* **Validação de escrita pelo `GET`** depois do `PUT`/`POST` (o backend já respondeu 200 sem gravar), e conferência de que o app não mostra o que a API não tem.

### 🏷️ Tags

| Tag | Efeito |
|---|---|
| `@wip` | Cenário novo aguardando a homologação do usuário |
| `@skip` | Isolamento com dono e condição de remoção (fica fora da execução) |
| `@leitura` | Só lê: **reinício leve** (termina e reabre o processo sem `clearApp`; a sessão persistente mantém o login) |
| `@offline` | Desliga a rede do aparelho; o `afterScenario` religa sempre |
| `@redeLenta` | Limita a velocidade da rede do emulador; o `afterScenario` restaura |
| `@relogio` | Muda o relógio do aparelho; o `afterScenario` restaura |
| `@visual` / `@gravar` | Quadro por passo / vídeo da tela + quadros (`ffmpeg`), para a IA **olhar** (nunca asserção) |

---

## 📦 Build sob Teste (APK)

A suíte testa **só** APKs imutáveis de `app.apkDir` — nunca o `build/outputs` do Gradle — para que o build que o app faz para o celular do usuário não troque o aplicativo no meio de um cenário.

* **Nome:** `T-NNN_AAAAMMDD-HHmm.apk`; vários pedidos com `+` ou intervalo (`T-021..T-024`, `T-004..T-006+T-010`).
* **Cumulativo por número:** um APK com `T-29` no nome cobre todo pedido `T-MMM` com `MMM ≤ 29`. A suíte instala **sempre o mais novo** (`APK=T-NNN` escolhe o mais novo que cobre o pedido; para comparar com um build anterior, instale-o à mão e use `APK_JA_INSTALADO=1`, só para diagnóstico).
* **Instalação (uma vez, no `onPrepare`):** confere o **SHA-256** contra `docs/apk/MANIFESTO.md`, instala com `adb install -r -d`, executa `pm clear` e **verifica que cache e dados ficaram vazios** (`files/`, `databases/`, `shared_prefs/`, `cache/`, `code_cache/`); resíduo aborta a execução.
* **Rastro:** `tests/reports/<sessão>/apk-usado.json` (nome, `versionName`, SHA-256, cobertura, dados zerados) e o bloco “Build sob teste” do relatório HTML.

---

## 🤖 Recursos para Agentes de IA

O projeto foi deliberadamente instrumentado para que um agente de IA consiga **escrever, rodar, diagnosticar e corrigir cenários com o mínimo de intervenção do operador**.

### 🧠 Diagnóstico Inteligente de Falhas (`tests/support/errorHandler.js`)

Toda falha é classificada em uma categoria (`backend_indisponivel`, `falha_de_instalacao_ou_lancamento_do_app`, `app_nao_responde_ou_crash`, `elemento_encontrado_mas_nao_interagivel`, `elemento_ausente_na_arvore_de_ui`, `timeout_de_espera_por_elemento`, `falha_de_contrato_http`); formas desconhecidas geram **categorias novas automaticamente** (`tests/reports/error-categories.json`, só cresce) e são promovidas a regra estática quando se repetem. Junto de cada falha a suíte grava `failures.jsonl`, o dump da árvore de UI (`*.page-source.xml`, e o diagnóstico avisa quando ele é pequeno demais para ser confiável) e o screenshot. A ordem de diagnóstico é fixa: `failures.jsonl` → categoria → `page-source` → screenshot.

### 📚 Base de Conhecimento para Agentes (`.agents/`)

A base segue o padrão **quente/frio** (o mesmo do `cypress-pharmacie-web`): em `AGENTS.md`, `PROJECT_CONTEXT.md` e `ROADMAP.md`, tudo acima do marcador `<!-- fim-quente -->` é o **quente** — só o que muda a ação do próximo turno, lido na abertura da sessão pela skill `inicia-contexto-projeto`; o que vem abaixo é o **frio**, consultado sob demanda pelo **Mapa de leitura** no topo de cada arquivo (a coluna "Ler quando" é o gatilho). A numeração das seções é a mesma nos dois lados, então toda citação `§n` continua válida.

| Arquivo | Conteúdo |
|---|---|
| `AGENTS.md` | Regras de escrita e disciplina: **§0 Diretrizes Principais `[R-CHECK]`** (checklist verificado em todo turno), orçamento de diagnóstico (`[R-DIAG]`), governança de `@wip`/`@skip`, sincronização de docs e as **Particularidades para as skills** (§15, `[R-SKILL]`); no frio, seletores (§6), integração com app/backend e APK (§9), armadilhas já pagas (§10), rodapé e checklist (§12) e roteamento de cenários (§14) |
| `PROJECT_CONTEXT.md` | Arquitetura, decisões e execução (quente); **inventário de cenários gerado** (§6, índice §6.0 `[QUENTE]`), categorias de erro (§7) e matriz de cobertura funcional (§8) no frio |
| `ROADMAP.md` | Status atual (§1) e **backlog em tabela** (§2) no quente; decisões do usuário (§3), achados `A-NNN` (§4), corpo de cada item do backlog (§5) e a **fila de pedidos de teste `T-NNN`** (§6) no frio |
| `HISTORICO.md` | Changelog só de escrita: homologações e validações (§1), log de entregas (§2) e notas históricas (§3); consultado por `Grep` de `T-NNN`/`A-NNN`/cenário/data, nunca lido na abertura |
| `skills/` | As 3 skills genéricas do padrão (`inicia-contexto-projeto`, `atualiza-context`, `pre-commit`), que leem as Particularidades do `AGENTS.md` §15 antes de agir |

`npm run docs:lint` (`scripts/lint-agents.cjs`, chamado pela skill `pre-commit`) garante o padrão: marcador presente e único, teto de KB do quente por arquivo, teto de caracteres por linha e Mapa de leitura presente.

Os seletores de cada tela **não** são copiados para cá: a fonte única é o inventário vivo do app (`prime-visita-3/.agents/PROJECT_CONTEXT.md` §11).

### 🔀 Filas entre sessões

| Prefixo | Direção | Onde mora |
|---|---|---|
| `T-NNN` | app → esta suíte (“mudei X, valide”) | `.agents/ROADMAP.md` §6 |
| `Q-NNN` | esta suíte → app (bug, `testTag` faltando, capacidade de teste) | `prime-visita-3/.agents/ROADMAP.md` §7 |
| `F-NNN` | app → backend | `prime-visita-3-backend/.agents/ROADMAP.md` §5 |
| `B-NNN` | backend → app | `prime-visita-3/.agents/ROADMAP.md` §6 |
| `A-NNN` | achado da suíte (não é pedido) | `.agents/ROADMAP.md` §4 |

Todo `T-NNN` é atendido na hora (cenário escrito, status atualizado a cada passo no próprio bloco). A skill local `.claude/skills/monitor-pedidos` vigia as filas e avisa quando chega pedido novo ou resposta do app.

### 👁️ Ferramentas para a IA enxergar o app

| Comando | Uso |
|---|---|
| `node scripts/mapear.mjs [roteiros]` | Mapeia várias telas numa sessão só: grava `{ id: texto }` e imagem em `tests/reports/mapa/` (instala o APK mais novo antes) |
| `node scripts/explorar.mjs "<toques>"` | Abre uma tela, executa toques por id e imprime os `resource-id` achados |
| `node scripts/espiar.mjs [nome] [--rajada N] [--dump]` | Captura avulsa da tela do emulador da suíte |
| tags `@visual` / `@gravar` | Quadros por passo e vídeo com quadros extraídos (`ffmpeg`) |
| `npm run inventario` | Regenera o inventário de cenários (`PROJECT_CONTEXT.md` §6) e a cobertura deste README a partir dos `.feature`, de `scripts/contextos-readme.json` e de `scripts/descricoes-readme.json` |
| `npm run docs:lint` | Lint da base `.agents/` (marcador `<!-- fim-quente -->`, teto de KB do quente, teto por linha, Mapa de leitura) — chamado pela skill `pre-commit` |

---

## 📑 Estrutura de Relatórios e Evidências

Cada execução gera uma pasta `tests/reports/<SESSION_LABEL>/` com:

* `failures.jsonl` / `failures.log` / `last-failure.json` — falhas classificadas;
* `<cenário>.page-source.xml` e `<cenário>.png` — dump e screenshot de cada falha;
* `cucumber-report-<pid>.json` — formato nativo do Cucumber (alimenta o HTML);
* `apk-usado.json` — build testado;
* `visual/` — quadros e vídeos das tags `@visual`/`@gravar`.

Relatórios consolidados: **HTML em pt-BR** (`multiple-cucumber-html-reporter`, gerado sozinho ao fim da execução, com o bloco “Build sob teste”) em `tests/reports/html-reports/<data-hora>/` e **Allure** com histórico entre execuções (`npm run report:allure:generate` / `:open`).

### 🧩 Execução Multi-Instância (Múltiplas Abas/Sessões)

O **emulador** e o **Appium** (porta 4723) são recurso único: duas sessões não podem rodar ao mesmo tempo no mesmo emulador. `SESSION_LABEL` namespacia toda a saída da execução (`tests/reports/<label>/`); `allure-results` e `error-categories.json` são só de acrescentar. Paralelismo real (`maxInstances > 1`) só com emuladores independentes, cada um com `udid` e porta de Appium próprios.

---

## 🧪 Cobertura Atual de Testes

<!-- COBERTURA:INICIO -->
**Total:** **198 cenários automatizados** (208 execuções, contando as linhas de `Exemplos`) em 9 features:

- **`1.login`** (18) — tela de login: autenticação e logout, teclado, máscaras e validações do formulário, sessão persistente (com e sem rede), teste grátis (só o formulário), olhinho da senha, acessibilidade e troca de usuário no mesmo aparelho.
- **`2.visita`** (43) — agenda de Visitas: abas e ordenação, nova visita (Iniciar e Agendar), detalhe e pop-ups, seletores de prescritor e local, nomes nos cartões, virada do dia, sincronização, intervalo mínimo de 10 minutos entre visitas (online, offline e o `409` do servidor) e visita criada por fora.
- **`3.relatorio`** (25) — Relatórios: totais por prescritor e por especialidade, ordenação e período, gráficos mensais, seletor de visão e Minha semana (lista preguiçosa, follow-ups, calendário) com o aviso offline.
- **`4.chat`** (14) — Chat: lista e busca de contatos, conversa e teclado, disponibilidade (chave e bolinha), chave em segundos num app recém-limpo e aviso offline.
- **`5.ponto`** (10) — Registro de Ponto: ordem dos botões, linhas previstas e registradas, horário esperado (inclusive o dia sem almoço), relógio e aviso offline — sem bater ponto real.
- **`6.prescritores`** (27) — Prescritores: lista, busca, filtros e vínculos (vincular e desvincular pela lista), formulário, detalhe com Locais e Secretárias, nome próprio e a lista que não some enquanto se digita na busca.
- **`7.secretarias`** (14) — Secretárias: lista, filtros Minhas e Todas, formulário, vínculos e aviso offline.
- **`8.locais`** (12) — Locais de atendimento: lista, busca, filtros Meus e Todos, formulário com CEP, vínculos e aviso offline.
- **`9.menu`** (35) — casca do app e telas de apoio: barra inferior (abas com cópia em RAM, repouso e offline), menu lateral, Aniversários, Configurações, Notificações, Sobre, Ajuda, Pendências de envio e o controle de que o aviso offline não aparece com rede.

> 💡 O primeiro cenário de cada feature (`N.1`) sempre acessa a tela e confere que ela renderiza as informações corretamente; as linhas de `Exemplos` de um `Esquema do Cenário` não entram na contagem estática (`AGENTS.md` `[R-CONTA]`).

> 💡 Cada feature abaixo expande numa lista de **contextos** (agrupamentos temáticos); cada contexto expande na lista dos seus cenários, com o número usado no título do cenário, no `.steps.js` e no inventário. A fonte de verdade linha a linha (incluindo a linha `Cenário:` no arquivo) é `.agents/PROJECT_CONTEXT.md` §6. **Esta seção é gerada** por `npm run inventario` a partir dos `.feature` e de `scripts/contextos-readme.json` — não edite à mão.

---

### 1. Login (`tests/features/1.login.feature`) — 18 Cenários

A feature abrange **18 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) — tela de login: autenticação e logout, teclado, máscaras e validações do formulário, sessão persistente (com e sem rede), teste grátis (só o formulário), olhinho da senha, acessibilidade e troca de usuário no mesmo aparelho:

<details>
<summary><b>🔍 1.login.feature — 18 cenários em 7 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Autenticação — 3 cenários</b></summary>

<dl><dd>

- 1.1. **Autentica com credenciais válidas:** Login com CNPJ, usuário e senha válidos do tenant de teste; chega à tela de Visitas.
- 1.2. **Efetua logout após autenticação:** Depois de autenticar, “Sair” pelo menu lateral devolve o app à tela de login.
- 1.3. **Não autentica com senha inválida:** Senha inválida mantém o app no login com a mensagem de erro; em seguida o login válido entra normalmente (o erro não trava a tela).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Teclado, Máscaras e Validações do Formulário — 4 cenários</b></summary>

<dl><dd>

- 1.4. **Rodapé some com o teclado aberto e volta ao fechar:** O rodapé “PRIME SOFTWARE” só aparece com o teclado fechado: aberto, ele fica atrás do teclado (medido pelos `bounds` contra o topo do teclado), o botão Acessar continua alcançável e o rodapé volta ao fechar (`T-022`).
- 1.5. **Campo CNPJ aceita só dígitos, no máximo 14, com máscara:** Letras, pontuação e mais de 14 dígitos no CNPJ: o campo guarda só os 14 primeiros dígitos com a máscara `11.111.111/1111-11`.
- 1.6. **Campo Usuário aceita só dígitos:** Letras no campo Usuário são descartadas; só os dígitos ficam.
- 1.7. **Acessar com os campos vazios pede o preenchimento e não sai do login:** Acessar com os três campos vazios mostra “Preencha CNPJ, usuário e senha.” e permanece no login.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Sessão Persistente — 2 cenários</b></summary>

<dl><dd>

- 1.8. **Reabrir o app depois do login entra direto em Visitas:** Depois do login, reiniciar o app sem limpar os dados entra direto em Visitas, sem passar pelo login (sessão persistente, `T-003` a).
- 1.9. **Reabrir o app sem rede entra direto em Visitas com os dados do aparelho:** Com a rede do aparelho desligada, reabrir o app entra direto em Visitas com os dados do aparelho (`T-003` a, offline).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Teste Grátis, Senha à Vista e Acessibilidade — 3 cenários</b></summary>

<dl><dd>

- 1.10. **Link de teste grátis abre o formulário e volta ao login:** “Solicite teste grátis” abre o formulário e a seta do app volta ao login; a suíte nunca envia (criaria contato comercial real na base central, `T-016`).
- 1.11. **Olhinho mostra e oculta a senha e o login com a senha à vista entra:** O olhinho alterna mostrar/ocultar a senha, com o estado lido pelo `content-desc` do botão (“Mostrar senha” ↔ “Ocultar senha”), e o login com a senha à vista entra (`T-033`/`T-034`).
- 1.12. **Campos do login têm descrição para leitor de tela e o botão diz Acessar:** Os campos têm descrição para leitor de tela (“CNPJ”, “Usuário”, “Senha”) e o botão de acesso diz “Acessar” (`T-038`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 5: Outro Usuário no Mesmo Aparelho — 1 cenário</b></summary>

<dl><dd>

- 1.13. **Entrar com outro usuário no mesmo aparelho não mostra nada do usuário anterior:** Depois de sair e entrar com o 2º usuário de teste no mesmo aparelho, as visitas e os prescritores vinculados vêm só do 2º, conforme a API dele; nada do 1º aparece (`T-003` d, `T-042` b).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 6: Sair com Envio Pendente e Outro Usuário com Fila — 4 cenários</b></summary>

<dl><dd>

- 1.14. **Sair com envio pendente avisa e oferece sincronizar, sair mesmo assim ou cancelar:** Sair com uma visita agendada na fila (sem rede) abre o modal com a contagem de envios e as opções Sincronizar, Sair mesmo assim e Cancelar; Cancelar mantém o login e Sair mesmo assim leva ao Login (`T-003` c).
- 1.15. **Sincronizar antes de sair abre as Pendências e continua logado com o envio ainda pendente:** Sincronizar antes de sair abre as Pendências sem sair: continua logado e o envio segue pendente porque não há rede (`T-003` c).
- 1.16. **Outro usuário entrando com a fila do anterior vê o aviso e Cancelar mantém o login:** Outro funcionário entrando no aparelho com a fila do anterior vê o aviso (Descartar e entrar / Cancelar); Cancelar mantém o Login sem descartar e nada chega ao tenant (`T-003` d).
- 1.17. **Descartar e entrar apaga a fila do usuário anterior e entra com o outro usuário:** Descartar e entrar apaga a fila do usuário anterior e entra com o outro: nada pendente nas Pendências e nenhuma visita criada na API (`T-003` d).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 7: Fonte do Sistema Ampliada — 1 cenário</b></summary>

<dl><dd>

- 1.18. **Com a fonte do sistema a 1,5 vez o login cabe na largura da janela:** Com a fonte do sistema a 1,5×, os campos CNPJ, Usuário e Senha e o botão Acessar seguem dentro da largura da janela (`T-017`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 2. Visita (`tests/features/2.visita.feature`) — 43 Cenários

A feature abrange **43 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) — agenda de Visitas: abas e ordenação, nova visita (Iniciar e Agendar), detalhe e pop-ups, seletores de prescritor e local, nomes nos cartões, virada do dia, sincronização, intervalo mínimo de 10 minutos entre visitas (online, offline e o `409` do servidor) e visita criada por fora:

<details>
<summary><b>🔍 2.visita.feature — 43 cenários em 11 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Tela, Abas e Ordenação da Lista — 4 cenários</b></summary>

<dl><dd>

- 2.1. **Acessa a tela de Visitas e renderiza as informações corretamente:** Casca da tela: mês atual, abas de status e a lista ou o estado vazio.
- 2.3. **Aba Hoje lista da hora mais cedo para a mais tarde:** Cria duas visitas “Teste Appium” hoje (07:00 e 23:30, canceladas ao fim) e prova, pela API e pelos `bounds`, que a aba Hoje lista da hora mais cedo para a mais tarde (`T-021`).
- 2.4. **Abas Concluída, Pendente e Todos decrescentes e Agendada crescente:** Com duas visitas de teste agendadas nos próximos dias, Concluída, Pendente e Todos ficam da mais nova para a mais antiga e Agendada da mais próxima para a mais distante (`T-021`).
- 2.22. **Aba escolhida sobrevive a abrir o detalhe de uma visita e voltar:** Abre a aba Concluída, entra no detalhe de uma visita e volta: a aba escolhida continua a mesma (antes voltava à padrão); o mês só é conferido como inalterado, porque o tenant de teste só tem visitas no mês corrente (`T-036`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Nomes nos Cartões (1º Login, Nome Próprio e Negrito) — 4 cenários</b></summary>

<dl><dd>

- 2.2. **Nomes do prescritor, do local e do bairro aparecem no primeiro login:** Dados limpos → login → aba Todos: depois da 1ª sincronização todo cartão mostra prescritor, local e bairro conforme a API (nenhum “Prescritor #código”); reiniciando sem limpar os dados, os nomes já estão no 1º quadro (`T-020`/`T-023`).
- 2.15. **Nomes dos cartões aparecem em formato de nome próprio, só na exibição:** Nome do prescritor e do local nos cartões seguem a regra de nome próprio do app (Primeira Maiúscula, conectores e siglas), só na exibição (`T-028`).
- 2.16. **Nome do prescritor no cartão da lista está em negrito (conferência visual):** O nome do prescritor aparece acima do local no cartão e o quadro é salvo para conferência visual do negrito: o peso da fonte não aparece no dump (`T-029`, `@visual`).
- 2.18. **Nomes aparecem no primeiro login mesmo com o download das cópias demorado:** Rede do emulador lenta (`edge`) para alargar o download das cópias locais: depois do login os cartões mostram prescritor, local e bairro sem “#código” (`T-030`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Nova Visita: Modal e Formulários Iniciar/Agendar — 7 cenários</b></summary>

<dl><dd>

- 2.5. **Botão + abre o modal Nova visita com Iniciar e Agendar e fecha com o voltar:** O botão + abre o modal Nova visita com “Iniciar visita” e “Agendar visita” e sem botão Cancelar; o voltar do sistema fecha o modal (`T-032`/`T-038`).
- 2.6. **Formulário Agendar visita mostra os campos com a data de hoje e a hora vazia:** O formulário Agendar abre com a data de hoje, a hora vazia e as quatro opções de repetição; nada é salvo.
- 2.7. **Agendar sem preencher pede prescritor, local e hora e não grava nada:** Salvar vazio mostra “Preencha: Prescritor, Local de atendimento, Hora (HH:MM válida).” e a API não ganha visita.
- 2.8. **Formulário Iniciar visita mostra a data de hoje e a hora de agora:** O formulário Iniciar abre com a data de hoje e a hora de agora.
- 2.9. **Iniciar sem preencher pede prescritor e local e não grava nada:** Iniciar sem preencher passa pelo pop-up “Iniciar a visita agora?” e então pede prescritor e local, sem criar visita.
- 2.10. **Voltar do formulário com texto digitado pergunta se descarta:** Voltar com texto digitado pergunta “Descartar alterações?”: Continuar mantém o texto e Descartar sai (`T-004`).
- 2.11. **Voltar do formulário sem alteração sai direto:** Voltar do formulário sem alteração sai direto, sem pop-up.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Seletores de Prescritor e de Local — 3 cenários</b></summary>

<dl><dd>

- 2.19. **Seletor de prescritor mostra os vinculados a mim, os filtros e o lápis de edição:** O seletor de prescritor lista os vinculados a mim, com busca, filtros e o lápis de edição por item, conforme a API (`T-013`).
- 2.20. **Seletor de local mostra os locais com busca e lápis de edição:** O seletor de local lista os locais da API com busca e lápis de edição (`T-013`).
- 2.21. **Escolher prescritor e local preenche os campos do formulário sem salvar:** Escolher prescritor e local nos seletores preenche os campos do formulário; nenhuma visita é criada.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 5: Detalhe da Visita e Pop-ups — 3 cenários</b></summary>

<dl><dd>

- 2.12. **Detalhe de visita agendada mostra os dados conforme a API:** Visita “Teste Appium” agendada criada pela API (cancelada ao fim): o detalhe mostra código, data, hora, prescritor, local e histórico conforme a API.
- 2.13. **Pop-up Cancelar visita exige motivo e tem os botões padronizados:** Pop-up Cancelar visita: texto “Cancelar visita” inteiro, pílulas Cancelar visita e Voltar com a mesma altura (`bounds`), confirmar desabilitado sem motivo e habilitado com motivo; Voltar não cancela (`T-025`/`T-026`).
- 2.14. **Pop-up Iniciar visita tem Iniciar e Voltar e Voltar não inicia:** Pop-up Iniciar visita com Iniciar e Voltar de mesma altura; Voltar fecha o pop-up e a visita continua agendada na API.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 6: Relógio do Aparelho e Sincronização — 2 cenários</b></summary>

<dl><dd>

- 2.17. **Aba Hoje acompanha a virada do dia sem sair da tela:** A visita de amanhã não aparece em Hoje; com o app em segundo plano e o relógio do aparelho adiantado um dia, ao voltar ela aparece em Hoje sem sair da tela (`T-002`, `@relogio`).
- 2.23. **Voltar ao primeiro plano sincroniza no máximo uma vez por volta:** Três voltas ao primeiro plano (HOME, ≥ 6 s fora, 8 s de espera) fazem no máximo 1 `GET /prescritores` e 1 `GET /visitas` por volta, contados nas linhas `HTTP GET` do `logcat` (`T-037`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 7: Intervalo Mínimo de 10 Minutos entre Visitas — 10 cenários</b></summary>

<dl><dd>

- 2.24. **Agendar a menos de 10 minutos de outra visita é barrado e a 10 minutos cria:** Agendar às X e depois a X+5 min: o campo Hora mostra “Já existe uma visita às … — deixe pelo menos 10 minutos entre visitas” e Salvar mostra o aviso de erro sem criar nada; a X+10 min cria (conferido pela API; `T-040` a, `T-041` c).
- 2.25. **Visita cancelada não conta no intervalo mínimo:** Visita cancelada não conta no intervalo mínimo: depois de cancelar a visita do horário base pelo detalhe, agendar a base+5 min passa (`T-040` a).
- 2.26. **Iniciar uma visita a menos de 10 minutos de outra é recusado:** Iniciar visita (hora = agora) com outra visita não cancelada a menos de 10 min mostra o erro no campo Hora e a recusa; nenhuma visita é criada ou iniciada (`T-040` b).
- 2.27. **Reagendar para menos de 10 minutos de outra visita é barrado e para um horário livre é aceito:** Reagendar no detalhe para menos de 10 min de outra visita é recusado; para o próprio horário não é recusado; para um horário livre é aceito e a API passa a ter a visita nele (`T-040` c).
- 2.28. **Sem rede, agendar a menos de 10 minutos de outra visita pendente é barrado:** Sem rede, agendar a menos de 10 min de outra visita pendente na fila é barrado (campo Hora e aviso de erro); a 1ª fica no aparelho com o pop-up “Salvo no aparelho” e a API tem 0 (`T-044` a).
- 2.29. **Sem rede, o horário liberado por um reagendamento pendente volta a ficar livre:** Sem rede, reagendar a visita A (pendente) para X+60 libera o horário X: agendar às X passa e às X+65 (que colide com a A reagendada) é barrado (`T-044` b).
- 2.30. **Sem rede, reagendar no detalhe para menos de 10 minutos de outra visita é barrado, também depois do repouso:** Sem rede, reagendar no detalhe para menos de 10 min de outra visita é barrado, e continua barrado depois de o app ficar em segundo plano até a RAM ser liberada (`T-044` c).
- 2.31. **Sem rede, a visita cancelada deixa o horário livre:** Sem rede, cancelar a visita deixa o horário livre: agendar a base+5 min passa (`T-044` d).
- 2.32. **Ao religar a rede o servidor recusa o agendamento que a tela deixou passar e a fila esvazia:** Com a visita concorrente criada por fora, ao religar a rede o servidor recusa o agendamento que a tela deixou passar (`409 intervalo_minimo`): o app mostra o texto do servidor e a fila esvazia (`T-041` c, `T-044` e).
- 2.33. **Visita criada por fora aparece na lista de Hoje sem reabrir o app:** Uma visita criada por fora (API) aparece na lista de Hoje com o app aberto, sem reabrir (`T-042` b).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 8: Contadores das Abas e Troca de Mês — 2 cenários</b></summary>

<dl><dd>

- 2.35. **Os contadores das abas de Visitas batem com a API no mês atual:** Os contadores das abas (Todos, Pendente, Hoje, Agendada, Concluída) batem com a regra do app aplicada sobre `GET /visitas` do mês exibido (`T-012`).
- 2.36. **Trocar de mês ajusta a aba e os contadores seguem o mês exibido:** Trocar de mês ajusta a aba (anterior → Todos, atual → Hoje, seguinte → Agendada) e os contadores seguem o mês exibido, rolando a barra de abas quando preciso (`T-012`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 9: Itens da Visita: Adicionar Produto — 2 cenários</b></summary>

<dl><dd>

- 2.34. **O botão da seção Itens diz Adicionar produto e abre o seletor de produtos sem adicionar nada:** O botão da seção Itens do detalhe diz “Adicionar produto”, abre o seletor de produtos (busca, lista, voltar) e Voltar fecha sem adicionar nada (`T-038` e).
- 2.42. **Com a fonte do sistema a 1,5 vez o campo de quantidade do item continua à vista:** Com a fonte do sistema a 1,5×, o campo de quantidade ao escolher um produto continua à vista, mostra o 1 padrão e cabe na janela (`T-017`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 10: Edição e Cadastro Embutidos, Calendário e Relógio — 5 cenários</b></summary>

<dl><dd>

- 2.37. **O lápis do seletor de prescritor abre a edição embutida e voltar fecha só ela:** O lápis do seletor de prescritor abre a edição embutida com o nome conforme a API e voltar fecha só ela: o seletor continua aberto (`T-013`).
- 2.38. **O lápis do seletor de local abre a edição embutida e voltar fecha só ela:** O lápis do seletor de local abre a edição embutida com o nome conforme a API e voltar fecha só ela (`T-013`).
- 2.39. **O botão + do seletor de local abre o cadastro embutido e voltar não cria local:** O botão + do seletor de local abre o cadastro embutido vazio; voltar sem salvar não cria local na API (`T-013`).
- 2.40. **O calendário do formulário de Agendar cancela sem mudar a data e confirma mantendo a data:** O ícone de calendário do formulário de Agendar abre o seletor de data; Cancelar e Confirmar mantêm o valor do campo Data (`T-013`).
- 2.41. **O relógio do formulário de Agendar cancela sem preencher a hora e confirma preenchendo-a:** O ícone de relógio abre o seletor de hora; Cancelar deixa a hora vazia e Confirmar preenche uma hora válida (`T-013`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 11: Visita Iniciada sem Rede — 1 cenário</b></summary>

<dl><dd>

- 2.43. **Sem rede, iniciar uma visita a coloca na lista como pendente de envio:** Sem rede, iniciar uma visita a coloca na lista como pendente de envio (`visitas_item_pendente_<uuid>`) e o selo do topo conta 1 envio; nada chega ao tenant (`T-014`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 3. Relatório (`tests/features/3.relatorio.feature`) — 25 Cenários

A feature abrange **25 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) (1 esquema usa `Exemplos` e roda como 9 execuções: 33 no total em runtime) — Relatórios: totais por prescritor e por especialidade, ordenação e período, gráficos mensais, seletor de visão e Minha semana (lista preguiçosa, follow-ups, calendário) com o aviso offline:

<details>
<summary><b>🔍 3.relatorio.feature — 25 cenários em 8 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Tela e Seletor de Visão — 2 cenários</b></summary>

<dl><dd>

- 3.1. **Acessa a tela de Relatórios e renderiza as informações corretamente:** Casca da tela: seletor de visão (Minha semana é a padrão), semana atual de segunda a domingo e nenhum erro.
- 3.17. **Seletor de visão percorre Prescritor, Minha semana e Especialidade nos dois sentidos:** O seletor `‹ visão ›` é rotacional: percorre Prescritor, Minha semana e Especialidade nos dois sentidos e volta à origem; os ids das abas antigas não existem mais (`T-036`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Por Prescritor: Totais, Ordenação e Período — 7 cenários</b></summary>

<dl><dd>

- 3.2. **Aba Por prescritor mostra os totais e a ordem "Venda" conforme a API:** Visão Prescritor: totais do mês e os três maiores prescritores por venda (Alopatia + Revenda + Homeopatia) iguais à API `GET /relatorios/resultados-por-prescritor`.
- 3.3. **Ordena por nome crescente e a lista reordena:** Ordenar por nome crescente: os primeiros nomes seguem a ordem alfabética calculada da API.
- 3.4. **Período Ano mostra os totais do ano conforme a API:** Período Ano: os totais são os do ano inteiro da API e o navegador passa a andar de ano em ano.
- 3.5. **Navegador de mês atravessa a virada de janeiro para dezembro:** Voltando mês a mês a partir de hoje, o navegador atravessa janeiro e chega a dezembro do ano anterior com os totais da API.
- 3.6. **Seletor de mês e ano muda o período e os totais:** O seletor de mês e ano escolhe setembro e os totais passam a ser os de setembro da API.
- 3.9. **Lista de Relatórios mostra nome e especialidade em formato de nome próprio:** Títulos em nome próprio e subtítulo “CRM · Especialidade” com a especialidade em nome próprio, conforme a API (`T-031`).
- 3.10. **Ordenar por <campo> em ordem <ordem> reordena a lista conforme a API:** *(Esquema, uma combinação por campo e ordem)* Ordenar por venda, visitas, revenda, alopatia ou homeopatia, crescente e decrescente: os primeiros cartões seguem a ordem e o primeiro tem o menor (ou maior) valor de toda a lista da API.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Gráficos Mensais — 4 cenários</b></summary>

<dl><dd>

- 3.7. **Cartão Total abre o mini gráfico mensal:** O cartão Total abre o mini gráfico mensal: cinco séries, doze barras, mês atual em destaque e valor do mês igual à soma da API.
- 3.12. **Tocar num prescritor abre o gráfico mensal dele conforme a API:** Tocar no primeiro prescritor abre o gráfico mensal dele, com o nome e a venda do mês iguais aos da API.
- 3.13. **Setas do gráfico atravessam a virada de janeiro para dezembro conforme a API:** Voltando as setas do gráfico até janeiro e mais um mês, o gráfico mostra dezembro do ano anterior com a venda da API.
- 3.14. **Seletor de ano escolhe outro ano e os totais seguem a API:** O seletor de ano troca para o ano anterior e os totais seguem a API.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Especialidade — 3 cenários</b></summary>

<dl><dd>

- 3.8. **Aba Especialidade mostra os mesmos totais agrupados:** Visão Especialidade: os mesmos totais e a lista agrupada por especialidade (“N prescritor(es)”).
- 3.11. **Aba Especialidade ordena por venda conforme a API agregada:** Na visão Especialidade, as primeiras linhas estão em ordem decrescente de venda, conforme a API agregada por especialidade.
- 3.18. **Tocar numa especialidade abre a tela dela com os totais conforme a API e voltar mantém a visão:** Tocar numa especialidade abre a tela dela (rota `relatorio_especialidade`) com nome, totais e prescritores da API; voltar mantém a visão Especialidade (`T-036`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 5: Minha Semana — 2 cenários</b></summary>

<dl><dd>

- 3.15. **Minha semana mostra totais, sentimentos e follow-ups conforme a API:** Minha semana: totais, sentimentos (positivo, neutro e negativo) e follow-ups pendentes iguais aos da API.
- 3.16. **Minha semana mostra os produtos mais citados conforme a API:** Minha semana: os primeiros produtos da lista são os mais citados na API.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 6: Requisições HTTP — 1 cenário</b></summary>

<dl><dd>

- 3.19. **Minha semana não pede resultados por prescritor e a visão Prescritor pede uma vez:** Com a visão Minha semana parada por 30 s, o app faz no máximo 1 `GET /relatorios/resumo-semanal-ia` e nenhum `resultados-por-prescritor`; abrir a visão Prescritor faz exatamente 1 (`T-037`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 7: Minha Semana: Lista Preguiçosa e Follow-ups — 4 cenários</b></summary>

<dl><dd>

- 3.20. **Abrir Minha semana não trava a tela:** Abrir Minha semana (lista preguiçosa) não trava a tela: menos de 5 % de quadros lentos e nenhum “Skipped N frames” acima de 30 (`T-043` a).
- 3.21. **Minha semana monta só as linhas à vista e a rolagem chega a todos os itens:** Só as linhas à vista existem na árvore: o último resumo não existe antes de rolar e a rolagem chega a todos os follow-ups, próximas visitas e resumos que a API devolve (`T-043` b).
- 3.22. **Marcar um follow-up baixa o contador e desfazer reabre:** Marcar o 1º follow-up pendente baixa o contador, mostra o aviso de sucesso e a API marca concluído; desfazer reabre (grava no tenant e desfaz no próprio cenário; `T-043` c).
- 3.23. **Trocar de semana e abrir o calendário seguem funcionando:** A seta de semana anterior e o calendário da semana seguem funcionando na lista preguiçosa (`T-043` d).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 8: Aviso Offline — 2 cenários</b></summary>

<dl><dd>

- 3.24. **Sem rede Minha semana mostra o aviso offline e ele some quando a rede volta:** Sem rede, Minha semana mostra o aviso offline `relatorios_semana_texto_offline` em poucos instantes e ele some quando a rede volta (`T-047` a).
- 3.25. **Sem rede as visões Prescritor e Especialidade mostram o aviso offline:** Sem rede, as visões Prescritor e Especialidade de Relatórios mostram o aviso offline `relatorios_texto_offline` (`T-047` a).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 4. Chat (`tests/features/4.chat.feature`) — 14 Cenários

A feature abrange **14 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) — Chat: lista e busca de contatos, conversa e teclado, disponibilidade (chave e bolinha), chave em segundos num app recém-limpo e aviso offline:

<details>
<summary><b>🔍 4.chat.feature — 14 cenários em 5 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Lista e Busca de Contatos — 4 cenários</b></summary>

<dl><dd>

- 4.1. **Acessa a tela de Chat e renderiza as informações corretamente:** Casca da tela: busca e lista de contatos ou o estado vazio.
- 4.2. **Lista de contatos mostra o nome em formato de nome próprio:** O nome do contato aparece em nome próprio, encurtado como o app faz (primeira e última palavra), conforme a API (`T-031`).
- 4.3. **Cada contato mostra a última mensagem e a data conforme a API:** Cada contato visível mostra a última mensagem e a data conforme a API.
- 4.4. **Busca por nome filtra os contatos conforme a API:** Buscar por nome filtra a lista e confere com os contatos da API que contêm o termo.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Conversa e Teclado — 3 cenários</b></summary>

<dl><dd>

- 4.5. **Abrir a conversa mostra o contato e as últimas mensagens conforme a API:** Abrir a conversa mostra o contato e as últimas mensagens da API (abrir marca como lidas, `POST /chat/lidas`, efeito inofensivo).
- 4.6. **Teclado não sobe sozinho ao abrir a conversa:** Ao abrir a conversa o teclado não sobe sozinho.
- 4.7. **Enviar só habilita com texto e o campo fica acima do teclado:** Enviar fica desabilitado com o campo vazio e habilita ao digitar; o campo fica acima do teclado, medido pelo inset do sistema. Nunca envia (`T-010`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Disponibilidade (Disponível/Ocupado) — 3 cenários</b></summary>

<dl><dd>

- 4.8. **Chave Disponível/Ocupado muda a presença na API e volta ao original:** A chave Disponível/Ocupado inverte a presença real do usuário de teste na API e volta ao original (devolvida sempre no `afterScenario`) (`T-010`).
- 4.9. **Bolinha de disponibilidade de cada contato reflete a API:** A bolinha de disponibilidade de cada contato visível reflete a API (lida por id e atributo, nunca pela cor).
- 4.10. **Chave de disponibilidade aparece em poucos segundos num app recém-limpo:** Num app recém-limpo a chave Disponível/Ocupado aparece em poucos segundos (o app consulta `GET /funcionarios/eu` ao abrir o Chat) e mostra o estado da API (`T-041` a).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Aviso Offline — 1 cenário</b></summary>

<dl><dd>

- 4.11. **Sem rede o Chat mostra o aviso offline e ele some quando a rede volta:** Sem rede, o Chat mostra o aviso offline junto da lista da cópia e ele some quando a rede volta (`T-047` a).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 5: Limite do Campo de Mensagem e Pendente sem Rede — 3 cenários</b></summary>

<dl><dd>

- 4.12. **O campo de mensagem limita o texto comum a 2000 caracteres:** O campo de mensagem guarda no máximo 2000 caracteres comuns (digitando 2100); nada é enviado (`T-010`).
- 4.13. **O campo de mensagem conta cada emoji como 10 e para em 200 emojis:** Cada emoji conta 10 no limite: digitando 250 emojis o campo guarda exatamente 200 (`T-010`).
- 4.14. **Sem rede a mensagem enviada fica pendente de envio na conversa:** Sem rede, a mensagem enviada vira um balão pendente de envio na conversa; os dados são apagados antes de a rede voltar e nada chega ao contato (`T-010`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 5. Ponto (`tests/features/5.ponto.feature`) — 10 Cenários

A feature abrange **10 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) — Registro de Ponto: ordem dos botões, linhas previstas e registradas, horário esperado (inclusive o dia sem almoço), relógio e aviso offline — sem bater ponto real:

<details>
<summary><b>🔍 5.ponto.feature — 10 cenários em 4 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Tela e Registros do Dia — 5 cenários</b></summary>

<dl><dd>

- 5.1. **Acessa a tela de Registro de Ponto e renderiza as informações corretamente:** Relógio, data de hoje, horário esperado e os quatro registros do dia; todos os cenários só leem, nunca registram ponto real.
- 5.2. **Só o próximo registro do dia está habilitado conforme a API:** Só o próximo registro do dia está habilitado conforme a API e a explicação da ordem aparece (`T-008`).
- 5.3. **Cada linha mostra o previsto ou o registrado conforme a API:** Cada linha mostra o horário previsto ou o registrado conforme a API.
- 5.4. **Horário esperado do dia confere com a API:** O horário esperado mostra entrada, saída e almoço conforme a API.
- 5.5. **O relógio da tela anda a cada segundo:** O relógio da tela avança em poucos segundos.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Sem Rede — 1 cenário</b></summary>

<dl><dd>

- 5.6. **Sem rede o Ponto mostra a cópia do aparelho com o aviso offline:** Sem rede, reiniciando o app, o Ponto mostra a cópia do aparelho com o aviso offline (`T-008`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Aviso Offline — 1 cenário</b></summary>

<dl><dd>

- 5.7. **Sem rede o Ponto mostra o aviso offline e ele some quando a rede volta:** Sem rede, o Ponto mostra o aviso offline e ele some quando a rede volta (`T-047` a, complementa o `5.6`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Lembretes de Ponto — 3 cenários</b></summary>

<dl><dd>

- 5.8. **Na hora da entrada o app avisa para registrar o ponto:** Com a entrada de hoje semeada para daqui a 2 minutos, a notificação “Hora de registrar o ponto de entrada” aparece na barra na hora marcada (`T-001`).
- 5.9. **Quinze minutos antes da entrada o app avisa e ainda não é a hora:** Com a entrada semeada para daqui a 16 minutos, “Ponto de entrada em 15 minutos” aparece 1 minuto depois e o aviso da hora ainda não (`T-001`).
- 5.10. **Com a entrada já registrada o lembrete não aparece:** Com a entrada já registrada (retrato guardado) e sem rede, o lembrete é ignorado: nenhuma notificação de entrada e o log do app registra o aviso ignorado (`T-001`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 6. Prescritores (`tests/features/6.prescritores.feature`) — 27 Cenários

A feature abrange **27 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) — Prescritores: lista, busca, filtros e vínculos (vincular e desvincular pela lista), formulário, detalhe com Locais e Secretárias, nome próprio e a lista que não some enquanto se digita na busca:

<details>
<summary><b>🔍 6.prescritores.feature — 27 cenários em 7 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Lista, Busca e Filtros — 8 cenários</b></summary>

<dl><dd>

- 6.1. **Acessa a tela de Prescritores e renderiza as informações corretamente:** Casca da tela: busca, filtros de grupo e especialidade e a lista de prescritores conforme a API.
- 6.2. **Lista de Prescritores mostra nome e especialidade em formato de nome próprio:** Nome e especialidade em nome próprio (`T-031`).
- 6.3. **Busca por nome filtra a lista conforme a API:** Buscar “farinelli” mostra só os resultados da API para o termo.
- 6.4. **Limpar a busca devolve a lista completa:** Limpar a busca devolve a lista completa, de volta ao topo.
- 6.5. **Cabeçalhos separam vinculados a mim dos outros prescritores:** Cabeçalhos “Vinculados a mim” e “Outros prescritores”: tudo acima do segundo é vinculado a mim conforme `GET /prescritores/vinculados-a-mim` (rola devagar até o cabeçalho existir, porque a lista é preguiçosa).
- 6.11. **Filtro por grupo restringe a lista conforme a API e limpar volta:** O filtro de grupo restringe a lista (cada prescritor visível pertence ao grupo, lido no registro da API) e Limpar filtros some e volta.
- 6.12. **Filtro por especialidade restringe a lista conforme a API:** O filtro de especialidade restringe a lista conforme a API.
- 6.22. **Digitar na busca de prescritores mantém a lista na tela a cada tecla:** Digitar “mar” tecla a tecla na busca não faz a lista sumir nem piscar (`T-038`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Detalhe do Prescritor — 8 cenários</b></summary>

<dl><dd>

- 6.6. **Detalhe do prescritor mostra os dados conforme a API:** O detalhe mostra nome, CRM, telefone, endereço, situação e vínculo conforme a API.
- 6.7. **Abas Locais e Secretárias do detalhe mostram a contagem conforme a API:** As abas Locais e Secretárias do detalhe mostram a contagem de vinculados da API.
- 6.13. **Aba Locais do detalhe lista os locais vinculados conforme a API:** A aba Locais do detalhe lista os vinculados primeiro, com o nome em nome próprio e o endereço (`T-036`).
- 6.14. **Aba Secretárias do detalhe lista as secretárias vinculadas conforme a API:** A aba Secretárias do detalhe lista as vinculadas primeiro, com o nome em nome próprio e o contato (`T-036`).
- 6.15. **Aba Gráfico do detalhe mostra o total do ano e navega entre anos conforme a API:** A aba Gráfico mostra o ano atual e o total de visitas do ano e navega para o ano anterior conforme a API.
- 6.19. **Botões do detalhe do prescritor têm o texto padronizado:** Os botões de novo local e de nova secretária viraram “+” flutuante sem texto visível, com a descrição “Novo local” e “Nova secretária” lida pelos `bounds` do id (`T-024`/`T-036`).
- 6.20. **Aba Locais lista os vinculados antes dos demais conforme a API e os ids antigos não existem:** A aba Locais é uma lista única: vinculados antes dos demais, “Desvincular” nos vinculados e “Vincular” nos outros, cabeçalho “Vinculados” quando há os dois grupos e ids do filtro antigo inexistentes; só leitura (`T-036`).
- 6.21. **Aba Secretárias lista as vinculadas antes das outras conforme a API e os ids antigos não existem:** A aba Secretárias segue a mesma lógica (vinculadas primeiro) e os ids do seletor antigo não existem (`T-036`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Formulário Incluir Prescritor — 6 cenários</b></summary>

<dl><dd>

- 6.8. **Formulário Incluir prescritor mostra as abas e os campos:** O formulário Incluir prescritor mostra as abas Dados, Contato e Endereço e os campos de cada uma.
- 6.9. **Salvar o formulário vazio lista todos os obrigatórios e não grava:** Salvar vazio mostra “Preencha: UF, Número, Nome, Sexo, Especialidade.” (o Conselho já vem CRM), marca “Obrigatório” no campo Nome e a API não ganha prescritor (`T-004`/`T-038`).
- 6.10. **Voltar do formulário de prescritor com texto digitado pergunta se descarta:** Voltar com texto digitado pergunta “Descartar alterações?”; Descartar volta à lista sem criar nada.
- 6.16. **Telefone do prescritor aceita só dígitos e aplica a máscara:** O telefone aceita só dígitos e aplica a máscara `(62) 9 9322-5337` (`T-013`).
- 6.17. **CEP preenche o endereço do prescritor pelo ViaCEP:** O CEP 01001000 preenche endereço e bairro pelo ViaCEP (dado público), sem gravar nada (`T-013`).
- 6.18. **Seletor de conselho mostra a lista com busca:** O campo Conselho abre o seletor com busca e lista.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Vincular e Desvincular pela Lista — 1 cenário</b></summary>

<dl><dd>

- 6.23. **Vincular e desvincular um prescritor pela lista é acompanhado pela lista e pela API:** Vincular e desvincular um prescritor pela lista: o cartão sobe para “Vinculados a mim” e volta para “Outros prescritores” e a API reflete (grava o vínculo e o desfaz no próprio cenário; `T-042` b).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 5: Editar Prescritor e Vincular a Mim — 2 cenários</b></summary>

<dl><dd>

- 6.24. **O botão Editar do detalhe do prescritor diz Editar prescritor e abre o formulário de edição:** O botão Editar do detalhe diz “Editar prescritor” e abre o formulário de edição com o nome conforme a API (`T-038` e).
- 6.27. **A caixa Vincular a mim do formulário nasce marcada, tem o texto no componente e alterna ao tocar:** A caixa “Vincular a mim” do formulário nasce marcada, tem o texto no próprio componente e desmarca ao tocar (`T-013`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 6: Salvar com o Teclado Aberto — 1 cenário</b></summary>

<dl><dd>

- 6.25. **Salvar do formulário de prescritor continua alcançável com o teclado aberto:** Com o teclado aberto, o Salvar do formulário de prescritor continua alcançável: o toque chega ao botão e mostra o resumo dos obrigatórios que faltam (`T-004`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 7: Aviso Offline — 1 cenário</b></summary>

<dl><dd>

- 6.26. **Sem rede o detalhe do prescritor mostra as abas Locais e Secretárias da cópia do aparelho:** Sem rede, o detalhe do prescritor abre da cópia do aparelho e as abas Locais e Secretárias listam os vínculos conforme a API (`T-014`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 7. Secretárias (`tests/features/7.secretarias.feature`) — 14 Cenários

A feature abrange **14 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) — Secretárias: lista, filtros Minhas e Todas, formulário, vínculos e aviso offline:

<details>
<summary><b>🔍 7.secretarias.feature — 14 cenários em 5 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Lista e Filtros — 3 cenários</b></summary>

<dl><dd>

- 7.1. **Acessa a tela de Secretárias e renderiza as informações corretamente:** Casca da tela: filtros Minhas/Todas e a lista de secretárias conforme a API.
- 7.2. **Lista de Secretárias mostra o nome em formato de nome próprio:** O nome aparece em nome próprio (`T-031`).
- 7.3. **Filtro Todas mostra todas as secretárias do tenant conforme a API:** O filtro Todas mostra a quantidade de secretárias do tenant da API.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Formulário de Secretária — 6 cenários</b></summary>

<dl><dd>

- 7.4. **Abrir uma secretária mostra o formulário de edição com os dados da API:** Abrir uma secretária mostra o formulário de edição com nome, data de nascimento e e-mail da API.
- 7.5. **Formulário Incluir secretária mostra as abas e os campos:** O formulário Incluir secretária mostra as abas e os campos.
- 7.6. **Salvar o formulário vazio lista os obrigatórios e não grava:** Salvar vazio mostra “Preencha: Nome, Sexo, Telefone 1 com DDD.”, marca “Obrigatório” no campo Nome e nada é gravado (`T-004`/`T-038`).
- 7.7. **Voltar do formulário de secretária com texto digitado pergunta se descarta:** Voltar com texto digitado pergunta “Descartar alterações?”; Descartar volta à lista.
- 7.8. **Telefone da secretária aceita só dígitos e aplica a máscara:** O telefone aceita só dígitos e aplica a máscara (`T-013`).
- 7.9. **CEP preenche o endereço da secretária pelo ViaCEP:** O CEP preenche o endereço pelo ViaCEP, sem gravar nada (`T-013`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Vínculos — 2 cenários</b></summary>

<dl><dd>

- 7.10. **Aba Vínculos da secretária lista prescritor e local conforme a API:** A aba Vínculos lista os prescritores e locais da secretária conforme a API.
- 7.11. **Botão da aba Vínculos tem o texto padronizado:** O botão da aba Vínculos diz “Vincular prescritor e local” (`T-024`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Aviso Offline — 1 cenário</b></summary>

<dl><dd>

- 7.12. **Sem rede a lista de Secretárias mostra o aviso offline e ele some quando a rede volta:** Sem rede, a lista de Secretárias mostra o aviso offline e ele some quando a rede volta (`T-047` a, `T-038` f, `T-048`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 5: Salvar com o Teclado Aberto e Fluidez da Lista — 2 cenários</b></summary>

<dl><dd>

- 7.14. **Salvar do formulário de secretária continua alcançável com o teclado aberto:** Com o teclado aberto, o Salvar do formulário de secretária continua alcançável e mostra os obrigatórios que faltam (`T-004`).
- 7.15. **Abrir a lista de Secretárias não trava a tela:** Abrir a lista de Secretárias não trava a tela: nenhum “Skipped N frames” acima de 60 no logcat (`T-004`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 8. Locais de atendimento (`tests/features/8.locais.feature`) — 12 Cenários

A feature abrange **12 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) — Locais de atendimento: lista, busca, filtros Meus e Todos, formulário com CEP, vínculos e aviso offline:

<details>
<summary><b>🔍 8.locais.feature — 12 cenários em 4 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Lista, Busca e Filtros — 4 cenários</b></summary>

<dl><dd>

- 8.1. **Acessa a tela de Locais de atendimento e renderiza as informações corretamente:** Casca da tela: busca, filtros Meus/Todos e a lista de locais conforme a API.
- 8.2. **Lista de Locais mostra nome e endereço em formato de nome próprio:** Nome e endereço em nome próprio, com conectores em minúsculo (“Esquina com T 13”) (`T-031`).
- 8.3. **Busca por nome filtra a lista de locais em memória conforme a API:** Buscar “absolut” no filtro Todos filtra a lista em memória e confere com os locais da API.
- 8.4. **Filtro Todos mostra mais locais que Meus conforme a API:** O filtro Todos mostra mais locais que Meus: rolando devagar, acha um cartão de Todos que não está em Meus.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Formulário de Local — 6 cenários</b></summary>

<dl><dd>

- 8.5. **Abrir um local mostra o formulário de edição com os dados da API:** Abrir um local mostra o formulário de edição com o nome da API.
- 8.6. **Formulário Incluir local mostra as abas e os campos:** O formulário Incluir local mostra as abas e os campos.
- 8.7. **Salvar o formulário vazio lista os obrigatórios e não grava:** Salvar vazio mostra “Preencha: Nome, Endereço, UF e cidade, Telefone 1 com DDD.”, marca “Obrigatório” no campo Nome e nada é gravado (`T-004`/`T-038`).
- 8.8. **Voltar do formulário de local com texto digitado pergunta se descarta:** Voltar com texto digitado pergunta “Descartar alterações?”; Descartar volta à lista.
- 8.9. **Aba Contato do local mostra telefone com máscara, fax e e-mail:** A aba Contato aplica a máscara no telefone (`(62) 3952-4113`) e mostra os campos fax e e-mail (`T-013`).
- 8.10. **CEP preenche o endereço do local pelo ViaCEP:** O CEP preenche o endereço pelo ViaCEP, com o bairro lido no campo de seleção (`T-013`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Aviso Offline — 1 cenário</b></summary>

<dl><dd>

- 8.11. **Sem rede a lista de Locais mostra o aviso offline e ele some quando a rede volta:** Sem rede, a lista de Locais mostra o aviso offline (texto próprio, “…todos os locais salvos…”) e ele some quando a rede volta (`T-047` a, `T-048`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Salvar com o Teclado Aberto — 1 cenário</b></summary>

<dl><dd>

- 8.12. **Salvar do formulário de local continua alcançável com o teclado aberto:** Com o teclado aberto, o Salvar do formulário de local continua alcançável e mostra os obrigatórios que faltam (`T-004`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

---

### 9. Menu (`tests/features/9.menu.feature`) — 35 Cenários

A feature abrange **35 cenários estáticos** (`AGENTS.md` `[R-CONTA]`) (1 esquema usa `Exemplos` e roda como 3 execuções: 37 no total em runtime) — casca do app e telas de apoio: barra inferior (abas com cópia em RAM, repouso e offline), menu lateral, Aniversários, Configurações, Notificações, Sobre, Ajuda, Pendências de envio e o controle de que o aviso offline não aparece com rede:

<details>
<summary><b>🔍 9.menu.feature — 35 cenários em 14 contextos (clique para expandir)</b></summary>

<dl><dd>

<br>

<details>
<summary><b>Contexto 1: Menu Lateral, Casca e Botões — 4 cenários</b></summary>

<dl><dd>

- 9.1. **Abre o menu lateral e renderiza as opções corretamente:** O menu lateral abre com o título e as opções.
- 9.19. **Sair mostra o aviso de despedida e volta ao login:** Sair mostra “Você saiu da sua conta. Até logo!” e volta ao login.
- 9.20. **Botões principais têm a mesma altura padrão:** O botão principal do formulário de Agendar tem 54 dp de altura, medido pelos `bounds` e pela densidade da tela (`T-019`/`T-026`).
- 9.22. **Campo de busca de Prescritores, Chat e Locais e o seletor de Relatórios ficam no mesmo lugar:** A busca de Locais, Prescritores e Chat tem o mesmo `bounds` e o seletor de visão de Relatórios fica centrado na mesma altura (tolerância de 4 dp) (`T-036`/`T-039`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 2: Aniversários — 4 cenários</b></summary>

<dl><dd>

- 9.2. **Aniversários mostra o mês atual e a contagem das abas conforme a API:** Aniversários: mês atual, abas com a contagem do mês e filtros conforme a API.
- 9.3. **Aniversários navega para o mês anterior e a contagem muda conforme a API:** Navegar para o mês anterior muda a contagem das abas conforme a API.
- 9.4. **Aniversários filtro Todos lista o mês na ordem de dia e nome conforme a API:** O filtro Todos lista o mês na ordem de dia e nome conforme a API.
- 9.21. **Aniversários mostra o nome em formato de nome próprio:** Aniversários mostra os nomes em nome próprio conforme a API (`T-031`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 3: Configurações — 4 cenários</b></summary>

<dl><dd>

- 9.5. **Configurações mostra tema, bateria, notificações e registro de erros:** Configurações mostra tema escuro, bateria sem restrições, notificações e registro de erros com os textos esperados.
- 9.6. **Tema escuro liga e desliga e o estado muda:** Liga e desliga o tema escuro tocando a linha `configuracoes_tema_linha`: o estado e o texto mudam e voltam (muda preferência, por isso sem reinício leve).
- 9.7. **Bateria sem restrições reflete o estado do sistema:** O interruptor de bateria reflete a lista de apps sem restrição do sistema (`deviceidle`).
- 9.8. **Registro de erros explica a função e avisa que ainda não há erros:** Num app recém-limpo o arquivo de erros está vazio e tocar a linha do registro de erros mostra “Ainda não há erros registrados. Bom sinal!” (`T-035`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 4: Notificações — 3 cenários</b></summary>

<dl><dd>

- 9.9. **Notificações expande e mostra as sete chaves:** Expandir Notificações mostra as sete chaves com título e estado.
- 9.10. **Cada chave de notificação alterna, muda o texto de estado e volta:** Cada chave alterna, o texto de estado muda e volta ao valor original; o estado é lido pelo `checked` da linha (`T-038`).
- 9.11. **Chave Todas desliga todas as filhas e religa:** A chave Todas desliga todas as filhas e, ao religar, elas voltam ao que eram.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 5: Sobre e Ajuda — 5 cenários</b></summary>

<dl><dd>

- 9.12. **Sobre mostra licença, suporte, desenvolvedor e versão conforme a API:** Sobre mostra licença, suporte, desenvolvedor e versão conforme `GET /sobre` e a versão instalada.
- 9.13. **Sobre sem rede mostra a cópia do aparelho e o aviso offline:** Sem rede, Sobre mostra a cópia do aparelho com o aviso offline.
- 9.14. **Ajuda mostra os contatos e os horários de atendimento:** Ajuda mostra os contatos de suporte e comercial e os horários de atendimento.
- 9.15. **Ajuda abre o WhatsApp fora do app e volta:** O botão do WhatsApp abre outro aplicativo (conferido pelo pacote em primeiro plano) e o app volta.
- 9.16. **Ajuda abre o discador com o telefone comercial:** O telefone comercial abre o discador e o app volta.

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 6: Pendências de Envio — 3 cenários</b></summary>

<dl><dd>

- 9.17. **Pendências mostra o resumo e o estado vazio quando tudo foi enviado:** Pendências mostra o resumo (conexão e última sincronização), os contadores zerados e o estado vazio quando tudo foi enviado.
- 9.18. **Sincronizar agora nas Pendências atualiza a hora da última sincronização:** “Sincronizar agora” em Pendências dá o aviso “Tudo em dia: nada pendente de envio.” (`T-007`/`T-039`); num app recém-limpo espera a 1ª sincronização terminar (até 150 s).
- 9.23. **Sincronizar agora dá o aviso de fim logo ao abrir e duas vezes seguidas:** “Sincronizar agora” dá o aviso de fim logo ao abrir as Pendências e de novo numa 2ª vez seguida (`T-039`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 7: Abas da Barra: Cópia em RAM e Sincronização — 5 cenários</b></summary>

<dl><dd>

- 9.24. **Sincronizar agora habilita em até 45 segundos num app recém-limpo:** Num app recém-limpo o botão Sincronizar agora habilita em até 45 s (eram 84–93 s; `T-041` b).
- 9.25. **Trocar de aba da barra mostra o conteúdo no primeiro quadro, sem indicador e sem travar:** Tocar nas cinco abas da barra em 2 voltas: o conteúdo aparece no 1º dump, em até 2 s, sem passar pela bolinha nas abas com cópia local; menos de 5 % de quadros lentos (`T-042` a e, `T-045` c).
- 9.26. **Depois do repouso em segundo plano a RAM sobe de novo e as abas abrem com o conteúdo:** Depois de o app ficar em segundo plano até a RAM ser liberada e voltar (log “liberada” e depois “aquecida”), as abas abrem com o conteúdo (`T-042` c).
- 9.27. **Sem rede as abas da barra continuam abrindo com o conteúdo da cópia:** Sem rede e com a pré-carga terminada, as abas abrem com o conteúdo da cópia em 3 voltas, sem a bolinha nas abas com cópia local (`T-042` d, `T-045` a).
- 9.28. **Logo depois do login, com a pré-carga rodando, as abas com cópia local estabilizam a partir da 2ª volta:** Logo depois do login, com a pré-carga ainda rodando: a 1ª volta pode usar o SQLite, mas a partir da 2ª as abas com cópia local não passam pela bolinha (`T-045` b).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 8: Aviso Offline (Controle com Rede) — 1 cenário</b></summary>

<dl><dd>

- 9.29. **Com rede o tempo todo nenhum aviso offline aparece em nenhuma tela:** Controle: com rede o tempo todo nenhum aviso offline aparece em nenhuma tela (barra inferior, as três visões de Relatórios, Secretárias e Locais; `T-048` c).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 9: Orientação Travada — 1 cenário</b></summary>

<dl><dd>

- 9.30. **Girar o aparelho para paisagem não muda a tela do app:** Girar o aparelho para paisagem não muda a tela: a janela do app segue em retrato durante a janela de observação (`T-004`/`T-017`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 10: Ajuda: E-mail de Contato — 1 cenário</b></summary>

<dl><dd>

- 9.31. **Ajuda abre o cliente de e-mail com o e-mail de contato:** O link de e-mail da Ajuda abre o cliente de e-mail (outro app) e voltar traz o app de volta (`T-016`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 11: Primeira Abertura: Notificações e Bateria — 1 cenário</b></summary>

<dl><dd>

- 9.32. **A primeira abertura recomenda notificações e bateria e Agora não leva ao aviso e ao login:** Na primeira abertura o app recomenda notificações (Sim, quero / Agora não) e bateria (Abrir configurações / Agora não); “Agora não” mostra o aviso de OK e a cadeia termina no Login (`T-009`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 12: Fonte do Sistema Ampliada — 1 cenário</b></summary>

<dl><dd>

- 9.33. **Com a fonte do sistema a 1,5 vez os itens de <tela> cabem na largura da janela:** Com a fonte do sistema a 1,5×, todos os itens de Configurações, Ajuda e Sobre cabem na largura da janela (`T-017`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 13: Pendências com a Operação da Fila — 1 cenário</b></summary>

<dl><dd>

- 9.34. **Sem rede a visita agendada aparece nas Pendências com tipo, estado e descrição:** Sem rede, a visita agendada aparece nas Pendências com tipo, estado (“Envio: Sem conexão”), descrição e data de criação, e o contador marca 1 (`T-014`).

</dd></dl>

</details>
<br>

<details>
<summary><b>Contexto 14: Aniversários sem Rede — 1 cenário</b></summary>

<dl><dd>

- 9.35. **Sem rede Aniversários abre da cópia do aparelho com o aviso offline:** Sem rede, Aniversários deveria abrir da cópia do aparelho com o aviso offline; hoje mostra o erro de conexão (`T-014`, achado `A-015`).

</dd></dl>

</details>
<br>

</dd></dl>

</details>

<!-- COBERTURA:FIM -->

---

## 🚀 Como Executar Localmente

### 1. Preparação (instalação)

```bash
npm install
npm run driver:install        # uiautomator2
```

Pré-requisitos: Node 24+, Android SDK (`ANDROID_HOME`), o AVD dedicado `Pixel_6_API_34` (imagem `google_apis` API 36 **sem Play Store**; `disk.dataPartition.size=8G` e `hw.ramSize=6144` no `config.ini`), o backend `prime-visita-3-backend` no ar e `env.local.json` preenchido.

### 2. Subir o emulador dedicado

```bash
emulator -avd Pixel_6_API_34 -port 5556 -memory 6144 -no-snapshot -no-audio -no-boot-anim \
  -timezone America/Sao_Paulo -dns-server 8.8.8.8,1.1.1.1 -gpu host
```

Sempre com fuso e DNS (sem eles as datas caem no dia seguinte e o ViaCEP falha). Use `-gpu host`: com `swiftshader_indirect` o processo `qemu` chegava a 11–16 GB no Windows. Espere o `system_server` estabilizar (o 1º boot leva ~8 min) e, numa execução longa, **rode uma feature por vez e religue o emulador entre elas**.

### 3. Executar os testes

```bash
npm test                                                       # suíte inteira (um único worker; pega o APK mais novo)
npm run test:spec -- tests/features/3.relatorio.feature        # uma feature
npm run test:spec -- tests/features/3.relatorio.feature:31     # um cenário (linha do Cenário)
npm run test:spec -- tests/features/9.menu.feature --cucumberOpts.name="^9\.18 "   # um cenário pelo número
APK=T-017 npm test                                             # build mais novo que cobre o pedido T-017 (só para regressão)
VISUAL=1 npm run test:spec -- tests/features/9.menu.feature    # quadro por passo, para a IA olhar
GRAVAR=1 npm run test:spec -- tests/features/9.menu.feature    # vídeo da tela + quadros
npm run report:html                                            # HTML da execução mais recente
npm run inventario                                             # regenera inventário e cobertura deste README
```

Regras de execução: **cenário novo roda 2x isolado** antes do arquivo; a suíte inteira só com pedido explícito de regressão; **um emulador/Appium por vez** (porta 4723) — o emulador é recurso único.

### 4. Cuidados com o tenant de teste

O backend e o tenant são **reais e compartilhados**: cenários que gravam usam o prefixo `Teste Appium` e cancelam ao fim; `Registrar Ponto` e o envio do “Teste grátis” **nunca** rodam; ação que não dá para desfazer só com decisão explícita do usuário.

---

## 🔄 CI/CD

Ainda **não implementada**. Plano: runner com KVM e emulador Android headless (`google_apis` API 36), backend de teste acessível ao runner, `env.local.json` provisionado no runner e publicação dos relatórios como artefato. Item do backlog em `.agents/ROADMAP.md` §2.

---

## 📋 Status do projeto

### ✅ Implementado

* Esqueleto Appium/WebdriverIO/Cucumber (Android, `uiautomator2`), camadas e suporte de falha/relatório (HTML pt-BR + Allure).
* **198 cenários** cobrindo Login, Visitas, Relatórios, Chat, Ponto, Prescritores, Secretárias, Locais e Menu (Aniversários, Configurações, Notificações, Sobre, Ajuda, Pendências, abas da barra e cópia em RAM) e os pedidos de teste `T-001`…`T-048`.
* Build sob teste rastreável (APK imutável + SHA-256 + dados zerados), AVD dedicado, reinício leve para cenários de leitura, massa de teste com limpeza automática.
* Fila de pedidos entre as sessões do app, do backend e desta suíte, com achados `A-NNN` documentados.
* Ferramentas para a IA enxergar o app (mapear, explorar, espiar, `@visual`/`@gravar`).

### ⬜ Pendente

* **Pendente do usuário** (lista completa em `ROADMAP.md` §3): **homologar os `@wip`** cenário a cenário (todos rodaram por feature no APK `T-046` e os pedidos seguintes até o `T-048`, 2026-10-17; vermelho de propósito, aguardando o app: `9.28` — Prescritores logo depois do login, `Q-013`).
* Cenários que dependem de decisão ou de massa: notificações que exigem gravar no tenant (lembrete de visita 30 min antes, chat com resposta pela barra), offline completo com fila que sobe ao religar a rede, visitas completas (Iniciar → áudio → Concluir, recorrência) e cadastros que gravam no tenant — parados até o aval do usuário, para manter a base limpa (o intervalo mínimo entre visitas, online e offline, está em `2.24`–`2.32`; os lembretes de ponto, em `5.8`–`5.10`).
* CI e iOS (`wdio.ios.conf.js`, quando o app tiver projeto iOS).
