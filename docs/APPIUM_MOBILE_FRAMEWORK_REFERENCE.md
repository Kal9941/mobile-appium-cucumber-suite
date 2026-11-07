# Arquitetura e Padrões de Qualidade — Referência para Framework Appium (Apps Mobile Android/iOS)

> **Objetivo:** extrair a arquitetura e os padrões de qualidade já validados em produção neste
> repositório (`appium-pharmacie-desktop`, Appium + driver `windows` para app desktop Delphi/VCL)
> e traduzi-los para um novo framework de testes automatizados com **Appium** mirando
> **aplicações mobile** (Android via `uiautomator2`, iOS via `xcuitest`). Não é um guia de uso do
> Appium — é um mapa de decisões já tomadas e implementadas aqui (não só planejadas), com o
> equivalente conceitual do lado mobile, para acelerar o desenho do novo framework sem repetir os
> mesmos erros nem redescobrir do zero o que já foi resolvido.
> **Fonte:** `.agents/AGENTS.md`, `.agents/PROJECT_CONTEXT.md`, `.agents/ROADMAP.md` e o código
> real (`wdio.conf.js`, `tests/support/*`, `tests/pages/*`) deste repositório — consultar o
> original para o detalhe fino de cada regra; este documento resume e traduz, não substitui.
> **Como ler:** §1-§2 descrevem o que já existe e funciona aqui (implementado, não hipotético);
> §3 é a tradução linha a linha para o mundo mobile/Appium; §4-§7 são decisões em aberto e ponto
> de partida prático.

---

## 1. Visão geral da arquitetura de referência (este projeto, Appium Desktop Windows)

- **Stack:** Appium 2.x/3.x com driver oficial `windows` (sucessor do WinAppDriver standalone) +
  WebdriverIO 10 como runner (`@wdio/cli`, `@wdio/local-runner`, `@wdio/appium-service`) +
  framework **Cucumber** (`@wdio/cucumber-framework` + `@cucumber/cucumber`, Gherkin em
  português).
- **Alvo:** aplicação desktop Win32/Delphi-VCL monolítica, rodando como processo nativo
  (`PS01.exe`) — sem DOM, sem browser, árvore de controles exposta via **UI Automation (UIA)**.
- **Execução:** local (sessão interativa do operador) e CI self-hosted (runner Windows dedicado,
  única sessão de desktop física — ver §1.3).
- **Dados:** `env.json` versionado (placeholders vazios) + `env.local.json` gitignorado
  (credenciais reais), mesclados em runtime por `loadEnv()` (merge raso por chave de topo) — nunca
  lido direto via `readFileSync`, sempre pela função central.
- **Rede:** o app fala REST **apenas** para um fluxo específico (link de pagamento,
  `tests/services/PaymentLinkService.js`); o resto do domínio é banco direto (Firebird 2.5), fora
  do escopo de teste automatizado por decisão explícita — não existe camada de mock/Strategy
  porque quase não há rede para interceptar.

### 1.1 Estrutura de diretórios
```text
appium-pharmacie-desktop/
├── .agents/               # AGENTS.md (regras de escrita) + PROJECT_CONTEXT.md (arquitetura/inventário) + ROADMAP.md (status/backlog)
├── tests/
│   ├── features/          # .feature por domínio, numerados (<grupo>.<índice>), Gherkin em pt-BR
│   ├── steps-definitions/ # Given/When/Then, mesmo número do .feature correspondente
│   ├── pages/             # Page Objects — seletor + interação, nunca rede/mock/asserção de contrato
│   ├── services/          # Service Objects — chamada HTTP crua, sem UI, pra teste de contrato
│   ├── fixtures/          # massa de dados/configuração e inventário de telas curados à mão
│   ├── support/           # sessionLabel, errorHandler, failureArtifacts, loadEnv, appLifecycle, bridge nativo
│   └── reports/           # gitignored — falhas/screenshots/dumps + relatórios Allure/HTML por sessão
├── scripts/                # exploração ad hoc (catálogo de telas/menus) e geração de relatório
├── env.json / env.local.json
└── wdio.conf.js            # config central, capabilities, hooks de ciclo de vida, geração automática de relatório
```

### 1.2 Camadas e padrões de design (implementados)
| Camada | Responsabilidade | Regra dura |
|---|---|---|
| **Page Object** (`tests/pages/`) | Seletores + interação | Nunca contém chamada HTTP, lógica de mock, nem asserção de contrato de API — só seletor + ação (`BasePage.byAutomationId`/`byXPath`/`waitAndClick`/`clickByCoordinate`) |
| **Service Object** (`tests/services/`) | Chamada HTTP direta, sem UI, pra teste de contrato | Única fonte de verdade da rota conhecida |
| **Classificador de erro** (`tests/support/errorHandler.js`) | Categoriza toda falha em causas conhecidas (6 categorias estáticas) + **descoberta automática** de categorias novas via assinatura normalizada da mensagem, persistida em `tests/reports/error-categories.json` | Nunca "causa não classificada" pra sempre — toda falha cai numa categoria, revisável depois |
| **Coleta de falha** (`tests/support/failureArtifacts.js`) | Screenshot + dump da árvore de UI Automation + log consolidado (`failures.jsonl`) + ponteiro de última falha (`last-failure.json`/`.log`, sobrescritos) | Ordem fixa de diagnóstico: log → json → dump → screenshot, nunca chutar causa pela mensagem crua |
| **Ciclo de vida do app** (`tests/support/appLifecycle.js`) | Lançar processo, re-anexar sessão à janela de topo certa, tratar diálogos que podem sobrepor a tela esperada | Isolamento de estado: processo novo por teste (`killProcessByName` + `spawnApp`), nunca reaproveitar estado entre cenários |
| **Bridge nativo** (`tests/support/windowsNative.js`) | Chamadas Win32 (enumerar janelas, matar processo) via processo PowerShell **persistente** (evita recompilar C# a cada poll) | Nunca recompilar/`Add-Type` dentro de um loop de polling — custo proibitivo sob carga |

### 1.3 Execução e paralelismo
- **Sem paralelismo real hoje** (`maxInstances: 1`): WinAppDriver roda na sessão interativa do
  Windows e assume o mouse/teclado físico — subir `maxInstances` só paralelizaria sessões
  roubando o controle umas das outras. Decisão registrada: isolar em **VM dedicada por executor**
  (Hyper-V), não em conta de usuário Windows local.
- **`SESSION_LABEL`** (timestamp formato brasileiro, `tests/support/sessionLabel.js`) namespacia
  toda saída de uma execução (relatórios, falhas) — evita que execuções concorrentes (ou
  sucessivas) pisem nas evidências umas das outras. Setado também via `process.env` logo cedo em
  `wdio.conf.js` pra sobreviver ao processo *worker* separado que o `@wdio/local-runner` spawna.
- **CI self-hosted de propósito**: `.github/workflows/tests.yml` roda num runner
  `[self-hosted, Windows, <label>]`, com `concurrency: { cancel-in-progress: false }` —
  enfileira execuções em vez de derrubar a que está em andamento, porque só existe **uma** sessão
  de desktop física disponível.

### 1.4 Diagnóstico e relatórios automáticos
- Três saídas paralelas por execução: JSON interno do WDIO (debug), `cucumber-report.json`
  (formato nativo do Cucumber, alimenta o HTML), `allure-results/*.json` (histórico/tendência
  entre execuções, pasta **compartilhada**, sem política de exclusão).
- HTML consolidado (`multiple-cucumber-html-reporter`) gerado **automaticamente** ao fim de
  `npm test` (`onComplete` em `wdio.conf.js`), filtrado pela sessão exata que acabou de rodar;
  **traduzido para pt-BR** via `customScript` + `MutationObserver` (a lib não expõe i18n nativo).
- **Orçamento de diagnóstico** (circuit breaker): mesma causa presumida 2x seguidas, ou 3
  tentativas de correção no mesmo teste → parar e escalar para decisão humana, nunca insistir
  sozinho.

### 1.5 Governança de documentação
- Três documentos com responsabilidade exclusiva e sem sobreposição: **regras de escrita de
  teste** (`AGENTS.md`) · **arquitetura/contratos/inventário** (`PROJECT_CONTEXT.md`) ·
  **status/backlog/histórico** (`ROADMAP.md`). Cada fato mora em exatamente um lugar.
- Lições aprendidas (achados técnicos reais, não hipóteses) viram entrada datada na seção dona,
  nunca se perdem em código ou numa conversa isolada.

---

## 2. Padrões de qualidade independentes de plataforma (reaproveitar tal como estão)

Estes princípios não são específicos de Windows/UIA — valem igual para mobile:

| Princípio | Resumo | Por quê |
|---|---|---|
| **Seletores estáveis, validados por inspeção ao vivo** | Nunca presumir que um identificador é estável sem confirmar rodando o app de verdade (`AutomationId` neste app desktop muda a cada execução — pode não ser o caso no app mobile, mas a disciplina de *validar antes de confiar* vale igual) | Elemento novo = validação nova, nunca copiar seletor de memória |
| **AAA (Arrange-Act-Assert)** | Estado isolado antes de interagir; nunca misturar preparo e asserção no mesmo bloco | Legibilidade e isolamento de falha |
| **Anti falso-positivo** | Nunca deixar a asserção principal dentro de um `if` que pode não executar; massa vazia validada explicitamente | Condição não atingida não pode fechar o teste "verde" sem checar nada |
| **RBAC bidirecional** | Todo teste de permissão prova concessão (ação permitida) **e** revogação (ação bloqueada) | Testar só um lado mascara vazamento de permissão |
| **Isolamento de estado por teste** | Processo/app novo (ou estado resetado) por teste, nunca reaproveitar estado entre cenários | Falha num teste não cascateia pro próximo por lixo deixado |
| **Orçamento de diagnóstico** | Limite de tentativas de correção antes de escalar para decisão humana | Evita loop de tentativa-e-erro sem fim e silencioso |
| **Evidência antes de código** (ordem fixa: log → json classificado → dump de árvore → screenshot) | Nunca chutar seletor/causa a partir da mensagem de erro crua | Correção às cegas é a causa mais comum de regressão nova |
| **Classificador de erro com descoberta automática** | Toda falha cai numa categoria; forma desconhecida de erro gera categoria nova reaproveitável, nunca "sem categoria" pra sempre | Relatório cita causa real, não "seletor deve estar errado" |
| **Validação isolada por cenário (2x) antes da suíte** | Ao terminar um cenário, rodar só ele 2x (detecta flakiness sem desperdiçar tempo de sessão física) antes de rodar o arquivo/suíte ao redor | Prova também co-dependência zero entre cenários do mesmo arquivo |
| **Governança de isolamento temporário** (`@wip`/`@skip`) | Ciclo de vida claro: quem isola, quando, quem remove — nunca perdido no código | Teste isolado esquecido mascara regressão em toda a suíte |
| **Nomenclatura e numeração determinística** | Todo teste tem `<grupo>.<índice>` estável no título e no nome do arquivo | Localiza o teste exato citado num relatório sem abrir o código |
| **Conventional Commits** | `feat`/`fix`/`refactor`/`chore`/`test` | Histórico pesquisável |
| **Fonte única por fato** | Regras de escrita × arquitetura/contratos × status/backlog nunca se sobrepõem | Evita documentos divergentes entre si |
| **Comentários e documentação em português do Brasil** | Sem exceção, nem em comentário curto/inline | Consistência do time |

---

## 3. Tradução para Appium Mobile (Android `uiautomator2` / iOS `xcuitest`)

> Contexto técnico: para mobile, o Appium usa os drivers **`uiautomator2`** (Android, herdeiro do
> UiAutomator2 do Google) e **`xcuitest`** (iOS, baseado no XCTest da Apple) — ambos rodam contra
> um **emulador/simulador** ou **dispositivo físico**, nunca contra um processo desktop com janela
> de topo. Isso elimina inteiramente a classe de problema mais específica deste projeto (re-anexo
> de sessão a janelas de topo Win32) e abre outras novas (gestos touch nativos, troca de contexto
> nativo/WebView, instalação/estado do app no dispositivo). A tabela abaixo mapeia conceito a
> conceito.

| Conceito neste projeto (Appium Desktop/UIA) | Equivalente/tradução para Appium Mobile | Observação |
|---|---|---|
| Driver `windows` (WinAppDriver) | Driver **`uiautomator2`** (Android) ou **`xcuitest`** (iOS) — projeto mobile geralmente precisa dos **dois**, um worker/config por plataforma | `appium driver install uiautomator2`/`appium driver install xcuitest`; `xcuitest` só roda com toolchain Xcode num host macOS |
| `appium:app` apontando pro executável (`PS01.exe`) | Android: `appium:app` (caminho do `.apk`) ou `appium:appPackage`+`appium:appActivity` (app já instalado); iOS: `appium:app` (`.app`/`.ipa`) ou `appium:bundleId` (já instalado) | Decisão de framework: sempre instalar o build do CI, ou assumir app pré-instalado no device/emulador de teste |
| `appium:appTopLevelWindow` + `driver.reloadSession()` a cada transição de tela (achado central deste projeto — login é janela de topo separada) | **Não existe equivalente** — apps mobile são uma única janela/activity-stack por app; não há "janela de topo" separada pra re-anexar | Simplificação real: elimina uma das fontes de flakiness mais trabalhadas aqui (`appLifecycle.js` inteiro não tem equivalente 1:1) |
| `AutomationId` instável (handle de runtime do app Delphi/VCL) | Android: `resource-id` (via `android:id` do XML) ou `content-desc` (via `contentDescription`); iOS: `accessibility id` (via `accessibilityIdentifier`); React Native: `testID` nos dois (mapeado pro atributo nativo certo por plataforma) | Em apps mobile nativos modernos, esses identificadores **costumam ser estáveis** (não são handle de runtime) — mas a regra de "validar por inspeção ao vivo antes de assumir estável" (`[R-SEL]`) continua valendo, principalmente em apps híbridos/WebView ou com libs de UI de terceiros |
| `ClassName` + XPath posicional (fallback quando não há `Name`/`AutomationId`) | Mesma ideia: `className`/`-android uiautomator`(`UiSelector`)/`-ios predicate string`/`-ios class chain` como fallback quando falta identificador estável | WebdriverIO expõe os dois como estratégia de seletor nativa (`$('android=...')`, `$('-ios predicate string:...')`) |
| Grids/controles *owner-drawn* sem elemento UIA (ex.: botão Logout, teclas do teclado virtual) — só clique por coordenada `pointerType: 'touch'` | Equivalente real existe: **Canvas** (jogos, apps desenhados via engine gráfica — Unity/Flutter antes de habilitar semantics) ou listas virtualizadas que reciclam view sem accessibility id | `clickByCoordinate` (`BasePage.js`) é **praticamente idêntico** ao gesto `tap` mobile via W3C Actions (`pointerType: 'touch'`) — reaproveitar a técnica quase sem adaptação |
| Diálogo "Atenção: usuário já conectado" sobreposto de forma imprevisível | Permission dialogs do SO (Android runtime permissions, iOS alerts de localização/câmera/push) também podem aparecer de forma imprevisível entre uma ação e a tela esperada | Mitigação nativa no Appium: `appium:autoGrantPermissions` (Android) e `appium:autoAcceptAlerts`/`appium:autoDismissAlerts` (iOS) resolvem boa parte sem precisar do padrão de "loop que prioriza o diálogo" deste projeto — mas alertas de app (não do SO) ainda exigem o mesmo tratamento ativo |
| Isolamento de estado: `killProcessByName` + `spawnApp` (processo novo por teste) | `driver.terminateApp()`+`driver.activateApp()` (reabre sem reinstalar) ou `driver.removeApp()`+reinstalação (hermético total) ou `appium:fullReset`/`appium:noReset` nas capabilities | Mobile tem granularidade extra que o desktop não tinha: dá pra resetar só o storage do app (`mobile: clearApp`/`adb shell pm clear`) sem reinstalar nem derrubar o processo do SO |
| `windowsNative.js`: bridge PowerShell persistente pra chamadas Win32 (enumerar janelas, matar processo) | Android: `adb shell`/`driver.execute('mobile: shell', {...})` (já embutido no protocolo do Appium, sem bridge próprio); iOS: `xcrun simctl`/comandos `mobile:` do `xcuitest` | Ganho real: **não precisa construir um bridge nativo próprio** — o driver mobile já expõe esses comandos como extensão de primeira classe (`mobile: shell`, `mobile: installApp`, `mobile: terminateApp`, etc.) |
| Encoding/mojibake ao capturar saída de `powershell.exe` via `execFileSync` | Sem equivalente — não há processo de shell externo no caminho crítico; chamadas `mobile:`/`adb` já retornam UTF-8 limpo pelo protocolo WebDriver | Uma classe inteira de *achado-armadilha* deste projeto simplesmente não existe no mobile |
| Classificador de erro (`errorHandler.js`, vocabulário UIA) | Mesmo mecanismo (regras estáticas + descoberta automática normalizada), vocabulário adaptado: elemento ausente na árvore (Android `NoSuchElementException`/iOS `NSPredicate` sem match), timeout de espera, app não responde/ANR (Android)/crash, elemento encontrado mas não interagível (fora da viewport/overlay), falha de contrato HTTP (se houver API), falha de instalação/lançamento do app (`InstallError`/`SessionNotCreatedError`) | Reaproveitar o arquivo quase 1:1, só trocar os `RULES` (regex) pelo vocabulário de erro do Appium mobile |
| Coleta de falha: screenshot + dump de árvore UIA (`getPageSource()`) | Idêntico: `driver.takeScreenshot()` + `driver.getPageSource()` funcionam igual nos dois mundos (é o mesmo protocolo WebDriver) | Reaproveitar `failureArtifacts.js` quase sem mudança — só o nome do campo (`uiaTreePath` → `pageSourcePath`, por clareza) |
| Paralelismo bloqueado por "uma sessão de desktop física, mouse/teclado compartilhado" | **Paralelismo real e barato**: múltiplos emuladores Android (cada um com sua porta ADB) ou múltiplos simuladores iOS rodam simultaneamente na mesma máquina sem disputar mouse/teclado; dispositivos físicos paralelizam por `udid` | Principal ganho de arquitetura em relação a este projeto — `maxInstances` do WDIO finalmente vale a pena subir |
| CI self-hosted Windows (`PS01.exe` exige sessão interativa + rede com Firebird) | Android: emulador roda headless em runner Linux/Windows hospedado (`reactivecircus/android-emulator-runner` ou similar) com KVM; iOS: simulador **só roda em runner macOS** (hospedado `macos-latest` ou self-hosted) | Decisão nova de framework: Android pode ir pro CI hospedado padrão; iOS normalmente exige macOS (hospedado tem custo/minuto maior, self-hosted exige Mac físico) |
| Contexto único (sempre nativo, sem WebView) | Apps **híbridos**/com WebView exigem troca explícita de contexto (`driver.getContexts()` → `driver.switchContext('WEBVIEW_<pkg>')`) pra interagir com conteúdo web dentro do app | Decisão de framework: se o app mobile tiver telas WebView, Page Object precisa saber em qual contexto operar — não existe no desktop porque UIA nunca expôs DOM |
| Teste de contrato de API via Service Object (`PaymentLinkService.js`) | **Idêntico** — se o app mobile falar REST com um backend, a mesma técnica (chamada HTTP direta, sem UI, schema validation) se aplica sem adaptação | Camada mais estável entre as três gerações de projeto (web → desktop → mobile) |
| Relatórios (Allure + `multiple-cucumber-html-reporter` + i18n pt-BR) | **Idêntico** — são reporters do WebdriverIO/Cucumber, agnósticos de driver/plataforma | Reaproveitar `wdio.conf.js` (seção de `reporters`), `scripts/generateHtmlReport.mjs` e `scripts/report-i18n-pt-br.js` sem mudança nenhuma |
| `env.json`/`env.local.json` + `loadEnv()` | **Idêntico** no mecanismo; chaves novas: `app.apkPath`/`app.appPackage`/`app.appActivity` (Android), `app.ipaPath`/`app.bundleId` (iOS), `device.udid`/`device.platformVersion`/`device.name` | Reaproveitar `loadEnv.js` sem mudança — só o schema de `env.json` cresce |
| Ferramenta de inspeção: UI Automation (`getPageSource()`, dumps XML namespaced) | **Appium Inspector** (GUI oficial, inspeciona Android e iOS ao vivo) é o equivalente direto ao fluxo de dump+summarize deste projeto (`scripts/explore.mjs`/`summarizeScreen.mjs`) | Scripts de exploração ad hoc deste projeto inspiram scripts equivalentes mobile (`scripts/exploreScreen.mjs` por `resource-id`/`accessibility id` em vez de `ClassName`+posição) |

---

## 4. Decisões técnicas específicas de mobile a resolver antes de iniciar o framework

Lacunas reais entre "como funciona hoje neste projeto desktop" e "como vai funcionar no Appium
mobile" — precisam de decisão explícita, sem resposta herdada automaticamente:

1. **Escopo de plataforma**: Android só, iOS só, ou ambos desde o início? Definir isso primeiro
   decide se o CI precisa de runner macOS (custo maior) e se o framework precisa de uma camada de
   capabilities por plataforma desde o primeiro teste.
2. **Dispositivo físico vs. emulador/simulador**: emulador/simulador é mais barato e paraleliza
   melhor em CI; dispositivo físico é mais fiel (sensores reais, performance real, OEM
   customizations da Samsung/Xiaomi/etc. no caso Android) — decidir por ambiente (local = físico
   pra depuração, CI = emulador/simulador pra velocidade) é uma combinação comum.
3. **Origem do build sob teste**: instalar um `.apk`/`.ipa` novo a cada execução (hermético, mais
   lento) vs. assumir app já instalado no device/emulador de teste (`appPackage`/`bundleId`,
   mais rápido, exige setup manual do ambiente) — decisão equivalente à de isolamento de processo
   deste projeto (`killProcessByName`+`spawnApp`), mas com mais opções intermediárias
   (`appium:noReset`/`appium:fullReset`).
4. **Identificação de elementos**: levantar com o time de desenvolvimento mobile se `testID`
   (React Native)/`accessibilityIdentifier` (iOS nativo)/`resource-id` ou `contentDescription`
   (Android nativo) já são atribuídos de forma estável e consistente em todo elemento
   interativo — mesmo esforço que motivou `AutomationId` aqui e `data-testid` no projeto web
   irmão.
5. **Apps híbridos/WebView**: se alguma tela for WebView, decidir a estratégia de troca de
   contexto (`switchContext`) e se o Page Object dessa tela usa seletor web (CSS/XPath DOM) em vez
   de seletor nativo — camada nova que não existe neste projeto desktop.
6. **Mocking de rede**: se o app mobile fala REST com um backend, decidir entre proxy MITM
   configurável no dispositivo (ex.: `mitmproxy`/Charles apontado via proxy de rede do
   emulador/dispositivo) vs. endpoint trocável por variável de ambiente/build flavor de teste vs.
   aceitar rodar sempre contra ambiente real controlado — réplica da mesma decisão em aberto
   (`USE_MOCKS`) do projeto web irmão, ainda sem solução no projeto desktop atual.
7. **Paralelismo real**: decidir quantos emuladores/simuladores simultâneos o runner de CI
   suporta (limitado por CPU/RAM do host, não mais por "uma sessão de desktop física") e como
   `SESSION_LABEL`/`maxInstances` do WDIO mapeiam pra isso.
8. **Permissões e diálogos do SO**: decidir a postura padrão (`autoGrantPermissions`/
   `autoAcceptAlerts` sempre ligado, ou tratamento explícito por teste quando o próprio fluxo de
   permissão for o que está sob teste — ex.: negar permissão de câmera e validar o app degradando
   bem).
9. **Versão do SO/dispositivo sob teste**: fixar `platformVersion`/`deviceName` (Android) e
   versão do simulador/dispositivo (iOS) usados no CI, equivalente a fixar a versão do app
   desktop — evita variação de comportamento por versão de SO diferente entre execuções.
10. **Gestos específicos de mobile sem equivalente desktop**: swipe/scroll, pull-to-refresh,
    long-press, pinch-to-zoom, rotação de tela (orientação) — nenhum tem precedente neste
    projeto (que só usa `tap` por coordenada); desenhar os helpers de gesto em `BasePage`
    equivalente antes do primeiro teste que precisar deles.

---

## 5. Estrutura de diretórios proposta para o novo framework

Mantendo a mesma separação de responsabilidades por camada já validada nos dois projetos
anteriores (web → desktop):

```text
appium-<nome-do-app>-mobile/
├── .agents/                # mesma governança (AGENTS/PROJECT_CONTEXT/ROADMAP), adaptada ao domínio mobile
├── tests/
│   ├── features/            # .feature por domínio funcional, numerados (<grupo>.<índice>), Gherkin pt-BR
│   ├── steps-definitions/   # Given/When/Then, mesmo número do .feature
│   ├── pages/                # Page Objects — resource-id/accessibility id/testID, sem lógica de rede
│   ├── services/              # Service Objects — chamada HTTP direta, se o app consumir API
│   ├── fixtures/               # massa de dados/configuração curada à mão
│   ├── support/                 # sessionLabel, errorHandler, failureArtifacts, loadEnv, appLifecycle, contextSwitch
│   └── reports/                  # gitignored — falhas/screenshots/dumps + Allure/HTML por sessão
├── scripts/                 # exploração ad hoc (Appium Inspector-assistida) e geração de relatório
├── wdio.android.conf.js      # config específica Android (capabilities uiautomator2)
├── wdio.ios.conf.js          # config específica iOS (capabilities xcuitest) — só se escopo incluir iOS
├── wdio.shared.conf.js       # base comum (reporters, hooks, cucumberOpts) importada pelas duas acima
└── env.json / env.local.json # credenciais, caminhos de apk/ipa, appPackage/bundleId, device/platformVersion
```

---

## 6. Convenções reaproveitáveis tal como estão (sem adaptação)

- **Numeração determinística de teste** (`<grupo>.<índice>`) sincronizada entre `.feature` e
  `.steps.js`.
- **Conventional Commits** (`feat`/`fix`/`refactor`/`chore`/`test`).
- **Comentários e documentação sempre em português do Brasil.**
- **Governança de três documentos** (`AGENTS.md`/`PROJECT_CONTEXT.md`/`ROADMAP.md`) com fonte
  única por fato.
- **Orçamento de diagnóstico** (circuit breaker de tentativas) antes de escalar para decisão
  humana.
- **Ordem fixa de evidência antes de código** (log consolidado → registro classificado → dump de
  árvore → screenshot).
- **Classificador de erro com descoberta automática de categoria** (`errorHandler.js` inteiro,
  só trocando as regras estáticas).
- **RBAC bidirecional** em todo teste de permissão.
- **Validação isolada por cenário (2x) antes da suíte completa.**
- **Governança de `@wip`/`@skip`** (quem isola, quando, quem remove, no mesmo commit).
- **Pipeline de relatórios** (Allure + `multiple-cucumber-html-reporter` + i18n pt-BR via
  `customScript`/`MutationObserver`) — zero mudança, são agnósticos de driver.
- **`env.json`/`env.local.json` + `loadEnv()`** (merge raso, segredo nunca versionado).
- **Rodapé obrigatório de turno** citando specs/testes tocados, isolamento ativo de terceiros e
  confirmação de que nenhum processo (emulador/`node`) ficou residual.

---

## 7. Checklist de adoção (primeiros passos ao iniciar o framework mobile)

1. Decidir escopo de plataforma (Android/iOS/ambos) — determina se o CI precisa de runner macOS
   desde o primeiro commit.
2. Instalar e validar o(s) driver(s) (`appium driver install uiautomator2`/`xcuitest`) contra um
   emulador/simulador local antes de escrever o primeiro teste — equivalente ao
   `driver:install`/`driver:install-wad` deste projeto.
3. Levantar com o time de desenvolvimento mobile quais elementos já têm identificador estável
   (`testID`/`accessibilityIdentifier`/`resource-id`) hoje — equivalente ao inventário inicial de
   `AutomationId` deste projeto, mas com expectativa de que já exista (apps mobile modernos
   costumam ter isso de fábrica em maior proporção que o app Delphi legado daqui).
4. Decidir a estratégia de isolamento de estado entre testes (reinstalar app × `terminateApp`+
   `activateApp` × limpar storage) antes de desenhar o primeiro Page Object — decisão equivalente
   a `killProcessByName`+`spawnApp` deste projeto, com granularidade extra disponível.
5. Decidir se existe (e como interceptar) uma camada de rede entre o app e um backend — essa
   resposta determina se o framework terá ou não um equivalente à Strategy de Mocks do projeto
   web irmão (que este projeto desktop não precisou resolver, por ter rede quase inexistente).
6. Portar a governança de documentação (`.agents/AGENTS.md`/`PROJECT_CONTEXT.md`/`ROADMAP.md`)
   adaptando só o conteúdo técnico (vocabulário de erro, inventário de telas), mantendo a mesma
   separação de responsabilidade entre os três arquivos.
7. Portar `errorHandler.js`/`failureArtifacts.js`/`loadEnv.js`/`sessionLabel.js` quase sem
   mudança — são as peças mais estáveis entre as três gerações de projeto (web → desktop →
   mobile); só trocar o vocabulário das regras estáticas do classificador.
8. Escolher e validar cedo a estratégia de CI (Android: runner hospedado padrão com KVM; iOS:
   runner macOS, hospedado ou self-hosted) — é o maior desvio de custo de infraestrutura em
   relação a este projeto (que exige só uma VM Windows persistente).
9. Se o app tiver qualquer tela WebView, desenhar o helper de troca de contexto
   (`switchContext`) antes do primeiro Page Object dessa tela — camada nova sem precedente aqui.
