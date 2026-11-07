# HISTORICO.md — Changelog de Validações e Entregas · Suíte Appium do Prime Visita Médica 3

> **Só escrita:** nunca é lido na abertura da sessão; consultar por `Grep` de pedido, achado, cenário ou data (`T-NNN`, `A-NNN`, `Q-NNN`, `<grupo>.<índice>`, `AAAA-MM-DD`). Regras de escrita em `AGENTS.md` §0.1 `[R-DOC]` e §15.2.
> **Gatilhos de leitura (Mapa do `AGENTS.md`):** (1) operador citou pedido/achado/cenário → `Grep` pelo identificador antes de agir: já validado? parcialmente coberto? (2) cenário documentado como validado está quebrando → em que data e como foi validado, com que ressalva; (3) pergunta sobre o que foi feito num pedido/sessão; (4) `atualiza-context` antes de escrever → completar a entrada existente, não duplicar. O resultado de cada `T-NNN` continua **no próprio bloco** em `ROADMAP.md` §6; aqui entra só o resumo da entrega.

## 1. Validações e incrementos
> Uma linha por evento, mais recente primeiro: `- <AAAA-MM-DD> · <cenários/identificadores> · T-NNN/A-NNN · resultado`. Homologação (`@wip` removido com o "ok" do usuário), revalidação e reativação de `@skip` entram aqui.

- (sem registros ainda — nenhum `@wip` foi homologado pelo usuário até 2026-10-17; o estado atual está em `ROADMAP.md` §1)

## 2. Log Executivo de Entregas (mais recente primeiro)
> Item entregue do backlog vira ≤ 3 linhas aqui (data, resultado, o que cobre) — `AGENTS.md` `[R-SYNC]`. Entradas abaixo migradas de `ROADMAP.md` §5 e dos itens concluídos do §2 em 2026-10-17, texto integral.

- **2026-10-24** — Backlog entregue: ~~`T-001` lembretes de ponto~~ e os itens de `P1-01`/`P1-07` que não gravam no tenant — +34 cenários (`1.14`–`1.18`, `2.34`–`2.43`, `4.12`–`4.14`, `5.8`–`5.10`, `6.24`–`6.27`, `7.14`, `7.15`, `8.12`, `9.30`–`9.35`), suíte em **198** cenários, 2x isolado no emulador (menos o `9.35`, vermelho de propósito: `A-015`/`Q-015`). Infra: `DEVICE_UDID` (celular por adb wifi: pop-up "Salvar senha" do Google dispensado, rede só do app por `cmd connectivity` chain3, `cmd alarm set-time`), `semearPreferenciasDoApp`/`titulosDasNotificacoes`, `@fonte`; `afterScenario` apaga a fila offline antes de religar a rede quando um `@offline` falha (vazou 1 visita em 2026-10-24). Achado `A-016`/`Q-016` (ordem das abas de Visitas).

- **2026-10-17** — Pedidos `T-041`–`T-048` atendidos e **regressão completa no APK cumulativo** (`T-046_20261017-1646`, depois `T-047_20261017-1823` e `T-048_20261017-1920`), feature por feature com o emulador religado antes de cada uma: **29 cenários novos** (164 no total) — `1.13` (outro usuário no aparelho), `2.24`–`2.33` (intervalo mínimo online/offline, `409` do servidor, visita criada por fora), `3.20`–`3.25` (Minha semana, aviso offline), `4.10`, `4.11`, `5.7`, `6.23` (vincular/desvincular), `7.12`, `8.11` (aviso offline), `9.24`–`9.28` (abas da barra, RAM, repouso, offline), `9.29` (controle: com rede nenhum aviso offline). `T-041`–`T-045` e `T-048` passaram; `T-046` e `T-047` parciais. `A-004`–`A-012` e `A-014` (aviso offline de Secretárias e Locais não sumia ao religar a rede) resolvidos pelo app; aberto só o `A-013` (`9.28`, Prescritores logo depois do login, `Q-013`). Falhas **do teste** corrigidas: rolagem até o cartão com dezenas de canceladas, `2.15` (aba Concluída), `5.3`/`5.4` (sábado sem almoço), `6.22` (critério do que o usuário vê), `3.22` (título fora da árvore), `9.28` (com rede). Massa: limpeza por instantâneo (follow-ups, vínculos) e por prefixo (visitas).
- **2026-10-17** — Fila antiga `T-001`–`T-040` revisada bloco a bloco contra os cenários que passaram na regressão: fechados como `passou` `T-002`, `T-008`, `T-011`, `T-019`–`T-025`, `T-028`–`T-034`, `T-037`, `T-040`; `passou em parte` os demais com o que falta escrito no backlog `P1-07`; `bloqueado` `T-027`. Exame visual de negrito (quadros `@visual` lidos por mim, `T-029`/`T-031`): nome em negrito e subtítulo em peso normal em Visitas, Prescritores, Relatórios, Chat, Secretárias, Locais e Aniversários. O que depende de ação ou decisão do usuário saiu do backlog para "Pendentes do usuário" (`ROADMAP.md` §3). README refatorado no estilo do `cypress-enterprise-suite` (lista de suítes com contagem e resumo, abertura de cada seção, contagens geradas por `npm run inventario`).

- **2026-10-15/16** — 1ª rodada completa **por feature**, no APK cumulativo mais novo (`T-034` → `T-040`). Falhas do **teste** corrigidas: token do backend vencia em ~15 min (relogin no `401`), lista preguiçosa do Compose com cancelados acumulados (rolagem lenta e curta), `hideKeyboard()` fechando pop-up, teclado medido por inset, Gboard com tutorial de caneta, réplica de `nomePropio`/`nomeCurto` divergente do app, interruptores em `<tag>_linha`, texto exibido em maiúsculas, `$$` perdido num `replace`. Ambiente: `-gpu host -memory 6144 -no-snapshot`, religar o emulador entre features (commit do `qemu` crescia ~0,4 GB/min com `swiftshader_indirect`).
- **2026-10-15/16** — Achados **do app** vistos pela suíte: `A-003` (`CancellationException` gravada como erro, resolvido no `T-035`), `A-004` (`Sincronizar agora` sem aviso, resolvido no `T-039`), `A-005` (2º `GET /visitas` na 3ª volta, resolvido), `A-006` (busca de Locais mais baixa, resolvido), `A-007` (chave Disponível/Ocupado sumiu, regressão do `T-038`/`T-039`, `Q-007`), `A-008` (1ª sincronização de 84–93 s, `Q-008`), `A-009` (lista some na 1ª tecla da busca, `Q-009`). Pedidos de teste: `T-035` e `T-039` passaram; `T-036`/`T-037`/`T-038` com resultado por item; `T-040` com APK e regressão rápida. Cenários novos: 1.12, 2.22, 2.23, 3.17–3.19, 6.20–6.22, 9.22, 9.23 (135 no total).

- **2026-10-15/16** — Backlog entregue: ~~Rodar a suíte inteira no APK mais novo e corrigir o que falhar~~ — feito em 2026-10-15/16 **por feature** (emulador religado entre elas, `[R-MULTI]`): 135 cenários verdes, exceto os vermelhos de propósito `4.8` (`A-007`) e `6.22` (`A-009`).
- **2026-10-15** — Backlog entregue: ~~Decidir com o usuário: abrir `F-NNN` no backend a partir desta suíte sem pedir cada vez~~ — decidido em 2026-10-15: **não**, segue via `Q-NNN` ao app, que abre o `F-NNN` (§3).

- **2026-10-14** — Ambiente: AVD `Prime_Suite_API_37` falhou (SurfaceFlinger em loop, `hasReadColorBufferDma`) → `Pixel_6_API_34` com 8 GB de dados/6 GB de RAM, `-gpu swiftshader_indirect`; `adb_shell` liberado; `tests/support/apk.js` (APK imutável + SHA-256 + intervalo `T-AAA..T-ZZZ`), `dispositivo.js` (relógio/`@relogio`), `visual.js` + `scripts/espiar.mjs` + `ffmpeg` (`@visual`/`@gravar`). Achados na 1ª rodada ao vivo: regex de `resourceIdMatches` não aceita `\d` (usar `[0-9]`); `$` do wdio é estrito (usar `$$`); o menu lateral tem a opção **Configurações** que o inventário do app não listava (vista num quadro).

- **2026-10-14** — Criada a suíte: stack, camadas, `errorHandler`/`failureArtifacts`/`loadEnv`/
  `sessionLabel` portados do `desktop-appium-delphi-suite` (vocabulário trocado para mobile),
  `1.login.feature` (3 cenários). Achados da validação ao vivo: (1) `waitForClickable` não existe em
  app nativo; (2) `mobile: shell` exige flag insegura — trocado por `mobile: changePermissions`;
  (3) depois do `clearApp` o app mostra em cadeia os diálogos de 1ª abertura (notificações, bateria)
  por cima do Login, tratados em `dispensarDialogosDePrimeiraAbertura`; (4) tags `login_*` e
  `recomendacao_*` confirmadas no `page-source`; o aviso de senha inválida (`login_texto_erro`) foi
  observado ao vivo.
- **2026-10-14** — Criadas as features 2.visita, 3.relatorio, 4.chat, 5.ponto, 6.prescritores, 7.secretarias, 8.locais e 9.menu (1 cenário `N.1` cada, `@wip`), renomeados `1.loginPage.js`/`2.visitaPage.js` (padrão numerado do cypress), criados `0.comum.steps.js`, `9.menuPage.js`, `dataPtBr.js` e `BackendService` com login/listagens; `udid` fixado no emulador (celular físico conectado). Regra de roteamento AGENTS §14 e inventário com `L:` em `PROJECT_CONTEXT.md` §6.
- **2026-10-14** — Criada a Diretriz 0 (`[R-CHECK]`, AGENTS §0) e reorganizado o AGENTS: padrões
  extraídos de `cypress-enterprise-suite` (R-EVID, R-CRIT, R-PLANO, R-DELTA, R-CAUSA, R-REPORT, R-NOME,
  R-CONTA, R-DIAG, R-ONLY, R-RUN, R-MULTI, R-SYNC, R-DOC, R-COMENT, R-COMMIT, R-AFP, R-SEL) e de
  `prime-visita-3` (R-APIREAL, R-PEDIDOBACK→R-ACHADO, R-PEDIDORECEBIDO, R-CHECKLIST, R-README,
  R-EDICAO). Não trazidos por serem específicos do Cypress/issues: R-ISSUE, R-PERM, R-BLIND, R-MOCK,
  R-SCHEMA, F-DEVOLUTIVA, hooks de rename de sessão, R-PUSH (sem git aqui) e R-PADRAOUI/R-SELETOR
  (regras de código do app).
- **2026-10-14** — Criada a **fila de pedidos de teste `T-NNN`** (§6) e a regra `[R-PEDIDOAPP]` (AGENTS §0), pedido do usuário:
  a suíte passa a ser quem testa o app; a sessão do app abre `T-NNN` aqui e recebe pedidos desta suíte em
  `prime-visita-3/.agents/ROADMAP.md` §7 (`Q-NNN`). Skill local `.claude/skills/monitor-pedidos` criada. Escrito pela sessão do app
  (a pedido), de forma aditiva.
- **2026-10-14** — Backlog entregue: ~~Criar repositório git aqui~~ — feito em 2026-10-14: 1º commit `7ce539e` e remoto privado `Kal9941/mobile-appium-cucumber-suite`.

## 3. Notas históricas
> Estado da suíte em datas anteriores (migrado de `ROADMAP.md` §1 em 2026-10-17).

- **2026-10-14:** suíte rodando ao vivo no **AVD dedicado** `Pixel_6_API_34` (`google_apis`, root, `emulator-5556`) com **APK rastreável** de `docs/apk/` (sempre o mais novo, cumulativo — `[R-APK]`), backend real e credenciais em `env.local.json`. **132 cenários em 9 features** (140 execuções com os `Exemplos`; inventário gerado em `PROJECT_CONTEXT.md` §6). **Verdes ao vivo:** Login 1.1–1.3, Visitas 2.1–2.4, Relatórios 3.1–3.8 e os 8 `N.1`; **o restante foi escrito nesta fase e ainda não teve a 1ª rodada completa** (a rodada inteira foi interrompida por falta de memória do sistema — não é falha da suíte). Todos os cenários novos estão `@wip` aguardando a homologação do usuário. `adb_shell` liberado (só 127.0.0.1); ferramentas para eu **ver** o app: `scripts/espiar.mjs`, tags `@visual`/`@gravar`, `ffmpeg` local. Fila de pedidos de teste do app (`T-NNN`, §6): `T-018` passou; `T-001`…`T-034` atendidos com cenário escrito (alguns bloqueados por decisão do usuário ou por massa). APK mais novo na pasta: `T-034_20261014-2145.apk`. **Repositório git criado em 2026-10-14** e publicado em `github.com/Kal9941/mobile-appium-cucumber-suite` (privado, ramo `master`, 1º commit `7ce539e`).
