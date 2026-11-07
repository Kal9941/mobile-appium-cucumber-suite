# PROJECT_CONTEXT.md — Arquitetura e Decisões da suíte Appium

> **Escopo exclusivo:** arquitetura, camadas e decisões técnicas desta suíte. Regras de escrita em
> [`AGENTS.md`](./AGENTS.md); status e backlog em [`ROADMAP.md`](./ROADMAP.md).
> Contexto do app sob teste (telas, seletores, regras de negócio): `prime-visita-3/.agents/` —
> `PROJECT_CONTEXT.md` §11 é o inventário vivo de `testTag`. Raciocínio de cada decisão:
> `Docs/APPIUM_MOBILE_FRAMEWORK_REFERENCE.md`. Histórico: [`HISTORICO.md`](./HISTORICO.md).
> **Atualizado:** 2026-10-17 · **Como ler:** quente até `<!-- fim-quente -->` (§1–§5) mais o §6.0 `[QUENTE]`; o resto é frio, aberto sob demanda pelo **Mapa** abaixo. Numeração preservada.

## Mapa de leitura sob demanda
> **Quente** = §1–§5 + §6.0 (índice, `[QUENTE]`). **Frio** = §6.x (inventário por feature), §7 e §8; abrir por `Grep` (número `N.M`, nome do cenário, tag, feature).

| Seção (frio) | O que responde | Ler quando |
|---|---|---|
| §6 Inventário por feature (`### 1.`…`### 9.`) | cada cenário com `L:` (linha real), nome e tags (`@wip`, `@leitura`, `@offline`…) — gerado por `npm run inventario` | duplicidade antes de criar cenário; ao receber `T-NNN` (qual cenário já cobre); ao investigar falha de um `N.M` (`Grep "| N.M |"`) |
| §7 Categorias do classificador de erro | categorias estáticas do `errorHandler` e como nascem as `descoberta_*` | ao ler `failures.jsonl`/categoria desconhecida; antes de promover categoria a regra |
| §8 Matriz de cobertura funcional `[R-COBERTURA]` | funcionalidade → cenário / `pendente` / `bloqueado: motivo` | ao planejar cobertura, escrever cenário novo ou fechar `T-NNN`; ao responder "o que falta" |
| `prime-visita-3/.agents/PROJECT_CONTEXT.md` §11 (app) | inventário vivo de `testTag` por tela | antes de escolher seletor; tag ausente do dump (`AGENTS.md` §6) |

---

## 1. Alvo e stack

- **App:** `com.example.medvisit` (Compose, sem WebView), activity `.MainActivity`,
  retrato fixo. APK de debug em `prime-visita-3/androidApp/build/outputs/apk/debug/`.
- **Stack:** Appium 3.8 + driver `uiautomator2` (instalado local, `npm run driver:install`) +
  WebdriverIO 10 + Cucumber (Gherkin pt-BR) + reporters spec/json/allure/HTML (pt-BR).
- **Backend:** `prime-visita-3-backend` local (`env.json` → `backend.baseUrl`), API real.

## 2. Estrutura

```text
tests/features/          1.login 2.visita 3.relatorio 4.chat 5.ponto 6.prescritores 7.secretarias 8.locais 9.menu (.feature)
tests/steps-definitions/ N.<nome>.steps.js (mesmo número/nome da feature) + 0.comum.steps.js (passos compartilhados)
tests/pages/             N.<nome>Page.js (mesmo número/nome) + BasePage.js (porTag → resource-id/testTag)
tests/services/          Service Objects (BackendService: health, login, listagens da API real)
tests/support/           loadEnv, sessionLabel, errorHandler, failureArtifacts, appLifecycle, dataPtBr, apk, dispositivo, visual
scripts/espiar.mjs       captura avulsa da tela/dump do dispositivo da suíte (AGENTS §6, "Como eu vejo o app")
scripts/gerar-inventario.cjs + *-readme.json   inventário §6 e cobertura do README (gerados dos .feature; contextos, descrições e resumos à mão)
tools/ffmpeg/            ffmpeg local (gitignorado) — extrai quadros das gravações de tela
tests/reports/           gitignored — falhas/screenshots/dumps + Allure/HTML por sessão
scripts/                 generateHtmlReport.mjs + report-i18n-pt-br.js
wdio.shared.conf.js      reporters, hooks, cucumberOpts (base das configs por plataforma)
wdio.android.conf.js     capabilities uiautomator2
env.json / env.local.json  caminhos/ids (versionado) / credenciais (gitignorado)
```

## 3. Decisões (checklist de adoção do framework de referência)

| # | Decisão | Valor |
|---|---|---|
| 1 | Plataforma | **Android agora**; iOS (`wdio.ios.conf.js`, xcuitest) na Fase 12 do app, quando houver Mac |
| 2 | Dispositivo | AVD **dedicado** `Pixel_6_API_34` (`google_apis` API 36, sem Play Store, adbd root; 8 GB de dados e 6 GB de RAM), porta 5556, `udid` `emulator-5556` em `env.json` (sobe com `emulator -avd Pixel_6_API_34 -port 5556 -memory 6144 -no-snapshot -no-audio -no-boot-anim -timezone America/Sao_Paulo -dns-server 8.8.8.8,1.1.1.1 -gpu host` (**não** `swiftshader_indirect`: o commit do `qemu` chegava a 11–16 GB; rodar uma feature por vez e religar o emulador entre elas)); o `Medium_Phone_API_37.0` (5554, Play Store) e o celular físico são de outras sessões/do usuário e a suíte nunca os usa (o `clearApp` de cada cenário apagaria os dados do app) |
| 3 | Origem do build | APK **imutável** `T-NNN_AAAAMMDD-HHmm.apk` (vários pedidos: `T-001+T-004` ou intervalo `T-021..T-024`, combináveis como `T-004..T-006+T-010`) em `app.apkDir` (`mobile-appium-cucumber-suite/docs/apk/`), depositado pela sessão do app; instalado 1x no `onPrepare` (`tests/support/apk.js`), seguido de `pm clear` + **conferência de cache/dados zerados** (`dadosZerados` em `apk-usado.json`; resíduo aborta a execução); o **mais novo** é sempre o escolhido (builds cumulativos: o APK `T-29` cobre todo pedido `T-MMM` com `MMM ≤ 29`, `cobreAte` em `apk-usado.json`; `[R-APK]` em AGENTS §0); `APK=T-NNN` só para investigar regressão |
| 4 | Isolamento de estado | A cada cenário: `terminateApp` + `clearApp` + reconcessão de permissões + `activateApp` + dispensa dos diálogos de 1ª abertura (volta ao Login) |
| 5 | Identificação | `testTag` → `resource-id` (`testTagsAsResourceId` no app); `porTag` com UiSelector |
| 6 | WebView | Inexistente — sem `contextSwitch` |
| 7 | Rede | Sempre API real (`[R-APIREAL]`); sem mock/MITM |
| 8 | Paralelismo | `maxInstances: 1`; subir só com emuladores independentes (udid/porta por worker) |
| 9 | Permissões do SO | `autoGrantPermissions` + `mobile: changePermissions` após `clearApp` |
| 10 | Gestos | `BasePage.arrastar` (`mobile: swipeGesture`) e `tocarEm` (W3C Actions); demais helpers sob demanda |

## 4. Camadas

| Camada | Responsabilidade | Regra dura |
|---|---|---|
| Page Object | Seletor + ação | Sem HTTP/mock/asserção de contrato |
| Service Object | HTTP cru, sem UI | Única fonte da rota |
| `errorHandler` | Classifica toda falha (regras estáticas + descoberta automática em `tests/reports/error-categories.json`) | Nunca "sem categoria" para sempre |
| `failureArtifacts` | Screenshot + `getPageSource()` + `failures.jsonl` + `last-failure.*` | Ordem de diagnóstico em AGENTS §2 |
| `appLifecycle` | Reset de estado, abertura, diálogos de 1ª abertura | Nunca reaproveitar estado entre cenários |

## 5. Execução

- `npm test` (tudo) · `npm run test:spec -- <arquivo>.feature[:linha]` · `npm run report:html`.
- `SESSION_LABEL` namespacia toda saída da execução (`tests/reports/<label>/`); o HTML sai sozinho
  ao fim (`onComplete`), filtrado pela sessão.

---

<!-- fim-quente -->

# Seções sob demanda (frio) — abrir pelo Mapa; §6.0 é o único bloco quente abaixo daqui

## 6. Inventário canônico de cenários `[R-SYNC]`

> **Gerado por `node scripts/gerar-inventario.cjs` a partir de `tests/features/*.feature`** — nunca editar à mão (a próxima execução do gerador sobrescreve). Como usar (padrão do `cypress-enterprise-suite`, §10): `grep` por tela, tag do app, rota, nome ou `#<grupo>.<índice>`; `L:` é a linha real do `Cenário:` no arquivo. Usar **antes de criar teste** (duplicidade), **ao receber pedido do app** (qual cenário já cobre / onde entra o novo — `AGENTS.md` §14), ao investigar falha. Tags do app: `prime-visita-3/.agents/PROJECT_CONTEXT.md` §11. `@wip` = aguarda homologação do usuário (`R-ONLY`); `@leitura` = reinício leve (sessão mantida); `@offline`/`@relogio`/`@redeLenta` = o `afterScenario` devolve rede/relógio/velocidade; `@visual` = quadro por passo.

**Total: 198 cenários estáticos em 9 features** (`R-CONTA`: `Esquema do Cenário` conta 1; as linhas de `Exemplos` não).

### 6.0 Índice por feature `[QUENTE]`
| Feature · `#` | Qtd | Funcionalidade | Steps · Page Object |
|---|---|---|---|
| `1.login.feature` · 1.1–1.18 | 18 | Login | `1.login.steps.js` · `1.loginPage.js` |
| `2.visita.feature` · 2.1–2.43 | 43 | Visita | `2.visita.steps.js` · `2.visitaPage.js` |
| `3.relatorio.feature` · 3.1–3.25 | 25 | Relatório | `3.relatorio.steps.js` · `3.relatorioPage.js` |
| `4.chat.feature` · 4.1–4.14 | 14 | Chat | `4.chat.steps.js` · `4.chatPage.js` |
| `5.ponto.feature` · 5.1–5.10 | 10 | Ponto | `5.ponto.steps.js` · `5.pontoPage.js` |
| `6.prescritores.feature` · 6.1–6.27 | 27 | Prescritores | `6.prescritores.steps.js` · `6.prescritoresPage.js` |
| `7.secretarias.feature` · 7.1–7.15 | 14 | Secretárias | `7.secretarias.steps.js` · `7.secretariasPage.js` |
| `8.locais.feature` · 8.1–8.12 | 12 | Locais de atendimento | `8.locais.steps.js` · `8.locaisPage.js` |
| `9.menu.feature` · 9.1–9.35 | 35 | Menu | `9.menu.steps.js` · `9.menuPage.js` |

### 1. `1.login.feature` — Login — 18 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 1.1 | 7 | Autentica com credenciais válidas |  |
| 1.2 | 12 | Efetua logout após autenticação |  |
| 1.3 | 19 | Não autentica com senha inválida |  |
| 1.4 | 28 | Rodapé some com o teclado aberto e volta ao fechar | `@wip` |
| 1.5 | 37 | Campo CNPJ aceita só dígitos, no máximo 14, com máscara | `@wip` |
| 1.6 | 43 | Campo Usuário aceita só dígitos | `@wip` |
| 1.7 | 49 | Acessar com os campos vazios pede o preenchimento e não sai do login | `@wip` |
| 1.8 | 56 | Reabrir o app depois do login entra direto em Visitas | `@wip` |
| 1.9 | 64 | Reabrir o app sem rede entra direto em Visitas com os dados do aparelho | `@wip` `@offline` |
| 1.10 | 74 | Link de teste grátis abre o formulário e volta ao login | `@wip` |
| 1.11 | 85 | Olhinho mostra e oculta a senha e o login com a senha à vista entra | `@wip` |
| 1.12 | 99 | Campos do login têm descrição para leitor de tela e o botão diz Acessar | `@wip` |
| 1.13 | 107 | Entrar com outro usuário no mesmo aparelho não mostra nada do usuário anterior | `@wip` |
| 1.14 | 120 | Sair com envio pendente avisa e oferece sincronizar, sair mesmo assim ou cancelar | `@wip` `@offline` |
| 1.15 | 140 | Sincronizar antes de sair abre as Pendências e continua logado com o envio ainda pendente | `@wip` `@offline` |
| 1.16 | 157 | Outro usuário entrando com a fila do anterior vê o aviso e Cancelar mantém o login | `@wip` `@offline` |
| 1.17 | 178 | Descartar e entrar apaga a fila do usuário anterior e entra com o outro usuário | `@wip` `@offline` |
| 1.18 | 200 | Com a fonte do sistema a 1,5 vez o login cabe na largura da janela | `@wip` `@fonte` |

### 2. `2.visita.feature` — Visita — 43 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 2.1 | 8 | Acessa a tela de Visitas e renderiza as informações corretamente | `@wip` `@leitura` |
| 2.2 | 17 | Nomes do prescritor, do local e do bairro aparecem no primeiro login | `@wip` |
| 2.3 | 28 | Aba Hoje lista da hora mais cedo para a mais tarde | `@wip` `@leitura` |
| 2.4 | 38 | Abas Concluída, Pendente e Todos decrescentes e Agendada crescente | `@wip` |
| 2.5 | 48 | Botão + abre o modal Nova visita com Iniciar e Agendar e fecha com o voltar | `@wip` `@leitura` |
| 2.6 | 57 | Formulário Agendar visita mostra os campos com a data de hoje e a hora vazia | `@wip` `@leitura` |
| 2.7 | 63 | Agendar sem preencher pede prescritor, local e hora e não grava nada | `@wip` `@leitura` |
| 2.8 | 70 | Formulário Iniciar visita mostra a data de hoje e a hora de agora | `@wip` `@leitura` |
| 2.9 | 76 | Iniciar sem preencher pede prescritor e local e não grava nada | `@wip` `@leitura` |
| 2.10 | 86 | Voltar do formulário com texto digitado pergunta se descarta | `@wip` `@leitura` |
| 2.11 | 99 | Voltar do formulário sem alteração sai direto | `@wip` `@leitura` |
| 2.12 | 107 | Detalhe de visita agendada mostra os dados conforme a API | `@wip` `@leitura` |
| 2.13 | 116 | Pop-up Cancelar visita exige motivo e tem os botões padronizados | `@wip` `@leitura` |
| 2.14 | 129 | Pop-up Iniciar visita tem Iniciar e Voltar e Voltar não inicia | `@wip` `@leitura` |
| 2.15 | 141 | Nomes dos cartões aparecem em formato de nome próprio, só na exibição | `@wip` `@leitura` |
| 2.16 | 149 | Nome do prescritor no cartão da lista está em negrito (conferência visual) | `@wip` `@leitura` `@visual` |
| 2.17 | 155 | Aba Hoje acompanha a virada do dia sem sair da tela | `@wip` `@relogio` |
| 2.18 | 168 | Nomes aparecem no primeiro login mesmo com o download das cópias demorado | `@wip` `@redeLenta` |
| 2.19 | 177 | Seletor de prescritor mostra os vinculados a mim, os filtros e o lápis de edição | `@wip` `@leitura` |
| 2.20 | 184 | Seletor de local mostra os locais com busca e lápis de edição | `@wip` `@leitura` |
| 2.21 | 191 | Escolher prescritor e local preenche os campos do formulário sem salvar | `@wip` `@leitura` |
| 2.22 | 201 | Aba escolhida sobrevive a abrir o detalhe de uma visita e voltar | `@wip` `@leitura` |
| 2.23 | 211 | Voltar ao primeiro plano sincroniza no máximo uma vez por volta | `@wip` |
| 2.24 | 220 | Agendar a menos de 10 minutos de outra visita é barrado e a 10 minutos cria | `@wip` |
| 2.25 | 239 | Visita cancelada não conta no intervalo mínimo | `@wip` |
| 2.26 | 253 | Iniciar uma visita a menos de 10 minutos de outra é recusado | `@wip` |
| 2.27 | 266 | Reagendar para menos de 10 minutos de outra visita é barrado e para um horário livre é aceito | `@wip` |
| 2.28 | 284 | Sem rede, agendar a menos de 10 minutos de outra visita pendente é barrado | `@wip` `@offline` |
| 2.29 | 301 | Sem rede, o horário liberado por um reagendamento pendente volta a ficar livre | `@wip` `@offline` |
| 2.30 | 321 | Sem rede, reagendar no detalhe para menos de 10 minutos de outra visita é barrado, também depois do repouso | `@wip` `@offline` |
| 2.31 | 341 | Sem rede, a visita cancelada deixa o horário livre | `@wip` `@offline` |
| 2.32 | 357 | Ao religar a rede o servidor recusa o agendamento que a tela deixou passar e a fila esvazia | `@wip` `@offline` |
| 2.33 | 375 | Visita criada por fora aparece na lista de Hoje sem reabrir o app | `@wip` |
| 2.34 | 385 | O botão da seção Itens diz Adicionar produto e abre o seletor de produtos sem adicionar nada | `@wip` `@leitura` |
| 2.35 | 399 | Os contadores das abas de Visitas batem com a API no mês atual | `@wip` `@leitura` |
| 2.36 | 406 | Trocar de mês ajusta a aba e os contadores seguem o mês exibido | `@wip` `@leitura` |
| 2.37 | 419 | O lápis do seletor de prescritor abre a edição embutida e voltar fecha só ela | `@wip` `@leitura` |
| 2.38 | 429 | O lápis do seletor de local abre a edição embutida e voltar fecha só ela | `@wip` `@leitura` |
| 2.39 | 440 | O botão + do seletor de local abre o cadastro embutido e voltar não cria local | `@wip` `@leitura` |
| 2.40 | 452 | O calendário do formulário de Agendar cancela sem mudar a data e confirma mantendo a data | `@wip` `@leitura` |
| 2.41 | 464 | O relógio do formulário de Agendar cancela sem preencher a hora e confirma preenchendo-a | `@wip` `@leitura` |
| 2.42 | 477 | Com a fonte do sistema a 1,5 vez o campo de quantidade do item continua à vista | `@wip` `@fonte` |
| 2.43 | 492 | Sem rede, iniciar uma visita a coloca na lista como pendente de envio | `@wip` `@offline` |

### 3. `3.relatorio.feature` — Relatório — 25 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 3.1 | 8 | Acessa a tela de Relatórios e renderiza as informações corretamente | `@wip` `@leitura` |
| 3.2 | 16 | Aba Por prescritor mostra os totais e a ordem "Venda" conforme a API | `@wip` `@leitura` |
| 3.3 | 23 | Ordena por nome crescente e a lista reordena | `@wip` `@leitura` |
| 3.4 | 31 | Período Ano mostra os totais do ano conforme a API | `@wip` `@leitura` |
| 3.5 | 39 | Navegador de mês atravessa a virada de janeiro para dezembro | `@wip` `@leitura` |
| 3.6 | 47 | Seletor de mês e ano muda o período e os totais | `@wip` `@leitura` |
| 3.7 | 55 | Cartão Total abre o mini gráfico mensal | `@wip` `@leitura` |
| 3.8 | 63 | Aba Especialidade mostra os mesmos totais agrupados | `@wip` `@leitura` |
| 3.9 | 72 | Lista de Relatórios mostra nome e especialidade em formato de nome próprio | `@wip` `@leitura` |
| 3.10 | 80 | (esquema) Ordenar por <campo> em ordem <ordem> reordena a lista conforme a API | `@wip` `@leitura` |
| 3.11 | 100 | Aba Especialidade ordena por venda conforme a API agregada | `@wip` `@leitura` |
| 3.12 | 107 | Tocar num prescritor abre o gráfico mensal dele conforme a API | `@wip` `@leitura` |
| 3.13 | 115 | Setas do gráfico atravessam a virada de janeiro para dezembro conforme a API | `@wip` `@leitura` |
| 3.14 | 124 | Seletor de ano escolhe outro ano e os totais seguem a API | `@wip` `@leitura` |
| 3.15 | 133 | Minha semana mostra totais, sentimentos e follow-ups conforme a API | `@wip` `@leitura` |
| 3.16 | 140 | Minha semana mostra os produtos mais citados conforme a API | `@wip` `@leitura` |
| 3.17 | 148 | Seletor de visão percorre Prescritor, Minha semana e Especialidade nos dois sentidos | `@wip` `@leitura` |
| 3.18 | 155 | Tocar numa especialidade abre a tela dela com os totais conforme a API e voltar mantém a visão | `@wip` `@leitura` |
| 3.19 | 167 | Minha semana não pede resultados por prescritor e a visão Prescritor pede uma vez | `@wip` |
| 3.20 | 180 | Abrir Minha semana não trava a tela | `@wip` `@leitura` |
| 3.21 | 190 | Minha semana monta só as linhas à vista e a rolagem chega a todos os itens | `@wip` `@leitura` |
| 3.22 | 201 | Marcar um follow-up baixa o contador e desfazer reabre | `@wip` |
| 3.23 | 213 | Trocar de semana e abrir o calendário seguem funcionando | `@wip` `@leitura` |
| 3.24 | 224 | Sem rede Minha semana mostra o aviso offline e ele some quando a rede volta | `@wip` `@offline` |
| 3.25 | 235 | Sem rede as visões Prescritor e Especialidade mostram o aviso offline | `@wip` `@offline` |

### 4. `4.chat.feature` — Chat — 14 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 4.1 | 8 | Acessa a tela de Chat e renderiza as informações corretamente | `@wip` `@leitura` |
| 4.2 | 15 | Lista de contatos mostra o nome em formato de nome próprio | `@wip` `@leitura` |
| 4.3 | 21 | Cada contato mostra a última mensagem e a data conforme a API | `@wip` `@leitura` |
| 4.4 | 27 | Busca por nome filtra os contatos conforme a API | `@wip` `@leitura` |
| 4.5 | 35 | Abrir a conversa mostra o contato e as últimas mensagens conforme a API | `@wip` `@leitura` |
| 4.6 | 42 | Teclado não sobe sozinho ao abrir a conversa | `@wip` `@leitura` |
| 4.7 | 50 | Enviar só habilita com texto e o campo fica acima do teclado | `@wip` `@leitura` |
| 4.8 | 61 | Chave Disponível/Ocupado muda a presença na API e volta ao original | `@wip` |
| 4.9 | 72 | Bolinha de disponibilidade de cada contato reflete a API | `@wip` `@leitura` |
| 4.10 | 80 | Chave de disponibilidade aparece em poucos segundos num app recém-limpo | `@wip` |
| 4.11 | 87 | Sem rede o Chat mostra o aviso offline e ele some quando a rede volta | `@wip` `@offline` |
| 4.12 | 99 | O campo de mensagem limita o texto comum a 2000 caracteres | `@wip` `@leitura` |
| 4.13 | 107 | O campo de mensagem conta cada emoji como 10 e para em 200 emojis | `@wip` `@leitura` |
| 4.14 | 117 | Sem rede a mensagem enviada fica pendente de envio na conversa | `@wip` `@offline` |

### 5. `5.ponto.feature` — Ponto — 10 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 5.1 | 9 | Acessa a tela de Registro de Ponto e renderiza as informações corretamente | `@wip` `@leitura` |
| 5.2 | 16 | Só o próximo registro do dia está habilitado conforme a API | `@wip` `@leitura` |
| 5.3 | 22 | Cada linha mostra o previsto ou o registrado conforme a API | `@wip` `@leitura` |
| 5.4 | 28 | Horário esperado do dia confere com a API | `@wip` `@leitura` |
| 5.5 | 34 | O relógio da tela anda a cada segundo | `@wip` `@leitura` |
| 5.6 | 41 | Sem rede o Ponto mostra a cópia do aparelho com o aviso offline | `@wip` `@offline` |
| 5.7 | 51 | Sem rede o Ponto mostra o aviso offline e ele some quando a rede volta | `@wip` `@offline` |
| 5.8 | 64 | Na hora da entrada o app avisa para registrar o ponto | `@wip` |
| 5.9 | 73 | Quinze minutos antes da entrada o app avisa e ainda não é a hora | `@wip` |
| 5.10 | 83 | Com a entrada já registrada o lembrete não aparece | `@wip` `@offline` |

### 6. `6.prescritores.feature` — Prescritores — 27 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 6.1 | 8 | Acessa a tela de Prescritores e renderiza as informações corretamente | `@wip` `@leitura` |
| 6.2 | 15 | Lista de Prescritores mostra nome e especialidade em formato de nome próprio | `@wip` `@leitura` |
| 6.3 | 21 | Busca por nome filtra a lista conforme a API | `@wip` `@leitura` |
| 6.4 | 28 | Limpar a busca devolve a lista completa | `@wip` `@leitura` |
| 6.5 | 36 | Cabeçalhos separam vinculados a mim dos outros prescritores | `@wip` `@leitura` |
| 6.6 | 42 | Detalhe do prescritor mostra os dados conforme a API | `@wip` `@leitura` |
| 6.7 | 49 | Abas Locais e Secretárias do detalhe mostram a contagem conforme a API | `@wip` `@leitura` |
| 6.8 | 56 | Formulário Incluir prescritor mostra as abas e os campos | `@wip` `@leitura` |
| 6.9 | 64 | Salvar o formulário vazio lista todos os obrigatórios e não grava | `@wip` `@leitura` |
| 6.10 | 73 | Voltar do formulário de prescritor com texto digitado pergunta se descarta | `@wip` `@leitura` |
| 6.11 | 85 | Filtro por grupo restringe a lista conforme a API e limpar volta | `@wip` `@leitura` |
| 6.12 | 94 | Filtro por especialidade restringe a lista conforme a API | `@wip` `@leitura` |
| 6.13 | 101 | Aba Locais do detalhe lista os locais vinculados conforme a API | `@wip` `@leitura` |
| 6.14 | 109 | Aba Secretárias do detalhe lista as secretárias vinculadas conforme a API | `@wip` `@leitura` |
| 6.15 | 117 | Aba Gráfico do detalhe mostra o total do ano e navega entre anos conforme a API | `@wip` `@leitura` |
| 6.16 | 128 | Telefone do prescritor aceita só dígitos e aplica a máscara | `@wip` `@leitura` |
| 6.17 | 138 | CEP preenche o endereço do prescritor pelo ViaCEP | `@wip` `@leitura` |
| 6.18 | 147 | Seletor de conselho mostra a lista com busca | `@wip` `@leitura` |
| 6.19 | 156 | Botões do detalhe do prescritor têm o texto padronizado | `@wip` `@leitura` |
| 6.20 | 168 | Aba Locais lista os vinculados antes dos demais conforme a API e os ids antigos não existem | `@wip` `@leitura` |
| 6.21 | 177 | Aba Secretárias lista as vinculadas antes das outras conforme a API e os ids antigos não existem | `@wip` `@leitura` |
| 6.22 | 186 | Digitar na busca de prescritores mantém a lista na tela a cada tecla | `@wip` `@leitura` |
| 6.23 | 194 | Vincular e desvincular um prescritor pela lista é acompanhado pela lista e pela API | `@wip` |
| 6.24 | 206 | O botão Editar do detalhe do prescritor diz Editar prescritor e abre o formulário de edição | `@wip` `@leitura` |
| 6.25 | 216 | Salvar do formulário de prescritor continua alcançável com o teclado aberto | `@wip` `@leitura` |
| 6.26 | 226 | Sem rede o detalhe do prescritor mostra as abas Locais e Secretárias da cópia do aparelho | `@wip` `@offline` |
| 6.27 | 241 | A caixa Vincular a mim do formulário nasce marcada, tem o texto no componente e alterna ao tocar | `@wip` `@leitura` |

### 7. `7.secretarias.feature` — Secretárias — 14 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 7.1 | 8 | Acessa a tela de Secretárias e renderiza as informações corretamente | `@wip` `@leitura` |
| 7.2 | 15 | Lista de Secretárias mostra o nome em formato de nome próprio | `@wip` `@leitura` |
| 7.3 | 21 | Filtro Todas mostra todas as secretárias do tenant conforme a API | `@wip` `@leitura` |
| 7.4 | 28 | Abrir uma secretária mostra o formulário de edição com os dados da API | `@wip` `@leitura` |
| 7.5 | 35 | Formulário Incluir secretária mostra as abas e os campos | `@wip` `@leitura` |
| 7.6 | 43 | Salvar o formulário vazio lista os obrigatórios e não grava | `@wip` `@leitura` |
| 7.7 | 52 | Voltar do formulário de secretária com texto digitado pergunta se descarta | `@wip` `@leitura` |
| 7.8 | 64 | Telefone da secretária aceita só dígitos e aplica a máscara | `@wip` `@leitura` |
| 7.9 | 73 | CEP preenche o endereço da secretária pelo ViaCEP | `@wip` `@leitura` |
| 7.10 | 82 | Aba Vínculos da secretária lista prescritor e local conforme a API | `@wip` `@leitura` |
| 7.11 | 91 | Botão da aba Vínculos tem o texto padronizado | `@wip` `@leitura` |
| 7.12 | 100 | Sem rede a lista de Secretárias mostra o aviso offline e ele some quando a rede volta | `@wip` `@offline` |
| 7.14 | 112 | Salvar do formulário de secretária continua alcançável com o teclado aberto | `@wip` `@leitura` |
| 7.15 | 122 | Abrir a lista de Secretárias não trava a tela | `@wip` `@leitura` |

### 8. `8.locais.feature` — Locais de atendimento — 12 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 8.1 | 8 | Acessa a tela de Locais de atendimento e renderiza as informações corretamente | `@wip` `@leitura` |
| 8.2 | 15 | Lista de Locais mostra nome e endereço em formato de nome próprio | `@wip` `@leitura` |
| 8.3 | 21 | Busca por nome filtra a lista de locais em memória conforme a API | `@wip` `@leitura` |
| 8.4 | 29 | Filtro Todos mostra mais locais que Meus conforme a API | `@wip` `@leitura` |
| 8.5 | 36 | Abrir um local mostra o formulário de edição com os dados da API | `@wip` `@leitura` |
| 8.6 | 43 | Formulário Incluir local mostra as abas e os campos | `@wip` `@leitura` |
| 8.7 | 51 | Salvar o formulário vazio lista os obrigatórios e não grava | `@wip` `@leitura` |
| 8.8 | 60 | Voltar do formulário de local com texto digitado pergunta se descarta | `@wip` `@leitura` |
| 8.9 | 72 | Aba Contato do local mostra telefone com máscara, fax e e-mail | `@wip` `@leitura` |
| 8.10 | 81 | CEP preenche o endereço do local pelo ViaCEP | `@wip` `@leitura` |
| 8.11 | 91 | Sem rede a lista de Locais mostra o aviso offline e ele some quando a rede volta | `@wip` `@offline` |
| 8.12 | 103 | Salvar do formulário de local continua alcançável com o teclado aberto | `@wip` `@leitura` |

### 9. `9.menu.feature` — Menu — 35 cenários
| # | L: | Cenário | Tags |
|---|---|---|---|
| 9.1 | 10 | Abre o menu lateral e renderiza as opções corretamente | `@wip` `@leitura` |
| 9.2 | 17 | Aniversários mostra o mês atual e a contagem das abas conforme a API | `@wip` `@leitura` |
| 9.3 | 23 | Aniversários navega para o mês anterior e a contagem muda conforme a API | `@wip` `@leitura` |
| 9.4 | 30 | Aniversários filtro Todos lista o mês na ordem de dia e nome conforme a API | `@wip` `@leitura` |
| 9.5 | 38 | Configurações mostra tema, bateria, notificações e registro de erros | `@wip` `@leitura` |
| 9.6 | 45 | Tema escuro liga e desliga e o estado muda | `@wip` |
| 9.7 | 54 | Bateria sem restrições reflete o estado do sistema | `@wip` `@leitura` |
| 9.8 | 61 | Registro de erros explica a função e avisa que ainda não há erros | `@wip` |
| 9.9 | 70 | Notificações expande e mostra as sete chaves | `@wip` `@leitura` |
| 9.10 | 77 | Cada chave de notificação alterna, muda o texto de estado e volta | `@wip` |
| 9.11 | 84 | Chave Todas desliga todas as filhas e religa | `@wip` |
| 9.12 | 92 | Sobre mostra licença, suporte, desenvolvedor e versão conforme a API | `@wip` `@leitura` |
| 9.13 | 98 | Sobre sem rede mostra a cópia do aparelho e o aviso offline | `@wip` `@offline` |
| 9.14 | 108 | Ajuda mostra os contatos e os horários de atendimento | `@wip` `@leitura` |
| 9.15 | 114 | Ajuda abre o WhatsApp fora do app e volta | `@wip` `@leitura` |
| 9.16 | 123 | Ajuda abre o discador com o telefone comercial | `@wip` `@leitura` |
| 9.17 | 133 | Pendências mostra o resumo e o estado vazio quando tudo foi enviado | `@wip` `@leitura` |
| 9.18 | 139 | Sincronizar agora nas Pendências atualiza a hora da última sincronização | `@wip` `@leitura` |
| 9.19 | 147 | Sair mostra o aviso de despedida e volta ao login | `@wip` |
| 9.20 | 154 | Botões principais têm a mesma altura padrão | `@wip` `@leitura` |
| 9.21 | 161 | Aniversários mostra o nome em formato de nome próprio | `@wip` `@leitura` |
| 9.22 | 170 | Campo de busca de Prescritores, Chat e Locais e o seletor de Relatórios ficam no mesmo lugar | `@wip` `@leitura` |
| 9.23 | 185 | Sincronizar agora dá o aviso de fim logo ao abrir e duas vezes seguidas | `@wip` `@leitura` |
| 9.24 | 197 | Sincronizar agora habilita em até 45 segundos num app recém-limpo | `@wip` |
| 9.25 | 206 | Trocar de aba da barra mostra o conteúdo no primeiro quadro, sem indicador e sem travar | `@wip` `@leitura` |
| 9.26 | 217 | Depois do repouso em segundo plano a RAM sobe de novo e as abas abrem com o conteúdo | `@wip` |
| 9.27 | 230 | Sem rede as abas da barra continuam abrindo com o conteúdo da cópia | `@wip` `@offline` |
| 9.28 | 242 | Logo depois do login, com a pré-carga rodando, as abas com cópia local estabilizam a partir da 2ª volta | `@wip` |
| 9.29 | 250 | Com rede o tempo todo nenhum aviso offline aparece em nenhuma tela | `@wip` |
| 9.30 | 257 | Girar o aparelho para paisagem não muda a tela do app | `@wip` `@leitura` |
| 9.31 | 264 | Ajuda abre o cliente de e-mail com o e-mail de contato | `@wip` `@leitura` |
| 9.32 | 275 | A primeira abertura recomenda notificações e bateria e Agora não leva ao aviso e ao login | `@wip` |
| 9.33 | 289 | (esquema) Com a fonte do sistema a 1,5 vez os itens de <tela> cabem na largura da janela | `@wip` `@fonte` |
| 9.34 | 304 | Sem rede a visita agendada aparece nas Pendências com tipo, estado e descrição | `@wip` `@offline` |
| 9.35 | 320 | Sem rede Aniversários abre da cópia do aparelho com o aviso offline | `@wip` `@offline` |


## 7. Categorias do classificador de erro

Estáticas (`tests/support/errorHandler.js`, a primeira regra que casa vence): `backend_indisponivel` ·
`falha_de_instalacao_ou_lancamento_do_app` · `app_nao_responde_ou_crash` ·
`elemento_encontrado_mas_nao_interagivel` · `elemento_ausente_na_arvore_de_ui` ·
`timeout_de_espera_por_elemento` · `falha_de_contrato_http`. As demais nascem como `descoberta_*` em
`tests/reports/error-categories.json` e são promovidas a regra estática quando recorrentes (AGENTS §11).

## 8. Matriz de cobertura funcional `[R-COBERTURA]`

> **Regra do usuário (2026-10-14): toda funcionalidade do app tem cenário**, inclusive Configurações e notificações com testes finos. Esta matriz é o mapa funcionalidade → cenário (`<grupo>.<índice>` do §6) e **nunca omite** uma funcionalidade: ela está `coberto`, `pendente` (a escrever, na ordem do roadmap) ou `bloqueado: motivo`. Fonte das funcionalidades: inventário do app (`prime-visita-3/.agents/PROJECT_CONTEXT.md` §11) e os pedidos `T-NNN`. Estados: `coberto` = cenário verde ao vivo · `parcial` = parte coberta · `pendente` · `bloqueado`. Atualizar no mesmo turno de qualquer cenário (`R-SYNC`).

| Feature | Funcionalidade | Estado | Cenário / observação |
|---|---|---|---|
| 1.login | Login válido, logout, senha inválida | coberto | 1.1–1.3 |
| 1.login | Máscara/`maxLength` do CNPJ, campos obrigatórios, erro de servidor 503 ("verificando a cada 15 s") | pendente | — |
| 1.login | Sessão persistente: reabrir entra direto (com e sem rede), renovação após 15 min | pendente | `T-003` (a, b) |
| 1.login | "Sair" com envio pendente (`sair_modal`: sincronizar / sair mesmo assim / cancelar) | pendente | `T-003` (c) |
| 1.login | Outro usuário no aparelho: nada do anterior aparece (visitas e vinculados do 2º conforme a API dele) | coberto | 1.13 (`T-003` d, `T-042` b) |
| 1.login | Motivo de queda ("senha alterada", "acesso bloqueado", "sessão expirou") | bloqueado: não alterar senha no Firebird compartilhado | `T-003` |
| 1.login | Teste grátis: formulário, validações e erros (**sem enviar**) | pendente | `T-016` |
| 2.visita | Tela, mês/ano, abas, lista ou vazio | coberto | 2.1 |
| 2.visita | Contadores das abas × API, ordenação por aba, troca de mês ajusta a aba | pendente | `T-012` |
| 2.visita | "Hoje" acompanha a virada do dia (relógio do aparelho) | pendente | `T-002` (`@relogio`) |
| 2.visita | Nomes em formato próprio (Primeira Maiúscula, conectores, siglas) só na exibição | pendente | `T-028` |
| 2.visita | Nome do prescritor em negrito (conferência visual) | pendente | `T-029` (`@visual`) |
| 2.visita | Agendar visita (obrigatórios, data/hora, histórico, recorrência 3/6/12 meses, dia útil/feriado) | bloqueado: grava visita real — só com prefixo "Teste Appium" + cancelar ao final | `T-012`, `T-004`, `T-013` |
| 2.visita | Iniciar visita (check-in, GPS, confirmação `visitaform_iniciar_*`) | pendente | `T-005` |
| 2.visita | Detalhe: reagendar, alterar local, concluir, cancelar (motivo obrigatório), badges | pendente | `T-005`, `T-025` |
| 2.visita | Itens da visita (adicionar produto, quantidade, remover) | pendente | `T-005`/`T-017` |
| 2.visita | Áudio: gravar, tela apagada (serviço em 1º plano), partes de 2 min, apagar; resumo por IA | parcial: **fala real + "Resumir por IA" `bloqueado: emulador grava silêncio`** | `T-006` |
| 2.visita | Pop-ups: Iniciar/Concluir/Cancelar/Apagar/Descartar — rótulos e pílulas iguais | pendente | `T-026` |
| 2.visita | Offline: iniciar → gravar → concluir sem rede; fila; reenvio | pendente | `T-014` |
| 2.visita | Sincronização por aviso do servidor (SSE `/eventos`) | pendente | `T-015` |
| 3.relatorio | Tela e Minha semana (semana atual, totais ou vazio) | coberto | 3.1 |
| 3.relatorio | Por prescritor: totais, ordenação Venda↓ e nome↑, período Ano, virada jan↔dez, seletor de mês, cartão Total, Especialidade | coberto | 3.2–3.8 (`T-011`) |
| 3.relatorio | Seletor rotacional de visão (Prescritor ↔ Minha semana ↔ Especialidade) e tela da especialidade (rota `relatorio_especialidade`) | escrito (`@wip`, ainda sem rodada) | 3.17, 3.18 (`T-036`) |
| 6.prescritores | Detalhe: Locais e Secretárias em lista única (vinculados primeiro, cabeçalhos, ids antigos ausentes) | escrito (`@wip`, ainda sem rodada) | 6.20, 6.21 (`T-036`); vincular/desvincular grava: `bloqueado` sem decisão |
| 2.visita | Aba e mês escolhidos sobrevivem a abrir o detalhe e voltar | escrito (`@wip`, ainda sem rodada) | 2.22 (`T-036`) |
| 9.menu | Primeiro elemento (busca de Prescritores/Chat/Locais e seletor de Relatórios) no mesmo lugar | escrito (`@wip`, ainda sem rodada) | 9.22 (`T-036`) |
| 3.relatorio | Minha semana não pede `resultados-por-prescritor` (logcat `HTTP GET`) | escrito (`@wip`, ainda sem rodada) | 3.19 (`T-037`) |
| 2.visita | Voltar ao primeiro plano sincroniza no máximo uma vez por volta (logcat) | escrito (`@wip`, ainda sem rodada) | 2.23 (`T-037`) |
| 3.relatorio | Ordenar por visitas/revenda/alopatia/homeopatia e ordem; ordenar na Especialidade; gráfico por prescritor/especialidade; setas do gráfico; `SeletorAno`; calendário da semana | pendente | `T-011` (3.9+) |
| 3.relatorio | Minha semana: chips de sentimento, produtos, follow-ups (marcar), próximas visitas | pendente | — |
| 4.chat | Tela, busca, lista ou vazio | coberto | 4.1 |
| 4.chat | Chave Disponível/Ocupado, bolinha de disponibilidade, badge de não lidas na barra | pendente | `T-010` |
| 4.chat | Conversa: abrir, enviar, emoji (contador 9/10), teclado, mensagem pendente offline | bloqueado: enviar grava no tenant — só para contato de teste definido pelo usuário | `T-010` |
| 4.chat | Chips Ativos/Todos (`A-001`: ausentes do código) | bloqueado: `Q-NNN` ao app | `A-001` |
| 5.ponto | Tela, relógio, data, horário esperado, 4 registros e botões (só leitura) | coberto | 5.1 |
| 5.ponto | Ordem dos botões, mensagem sem rede, cópia local (`registroponto_texto_offline`) | pendente | `T-008` |
| 5.ponto | Lembretes de ponto (15 min antes e na hora; não avisa se já batido) | pendente | `T-001` (`@relogio` + `dumpsys notification`) |
| 5.ponto | Registrar ponto, justificativa de atraso | bloqueado: grava ponto real no desktop (decisão do usuário) | `T-008` |
| 6.prescritores | Tela, busca, filtros, lista conforme API | coberto | 6.1 |
| 6.prescritores | Busca por nome, filtros grupo/especialidade, limpar filtros, vincular/desvincular a mim | pendente | — |
| 6.prescritores | Detalhe (abas Dados/Locais/Secretárias/Gráfico), editar, vínculos | pendente | — |
| 6.prescritores | Formulário: obrigatórios ("Preencha: …"), CEP/ViaCEP, telefone com máscara, "Descartar alterações?" | pendente (validações sem salvar) | `T-004`, `T-013` |
| 6.prescritores | Cadastrar/editar de verdade | bloqueado: grava prescritor no tenant (sem `DELETE`) | `T-004` |
| 7.secretarias | Tela, filtros Minhas/Todas, lista conforme API | coberto | 7.1 |
| 7.secretarias | Formulário, vínculos (prescritor/local), edição | pendente / bloqueado (grava) | `T-004`, `T-013` |
| 8.locais | Tela, busca, filtros Meus/Todos, lista conforme API | coberto | 8.1 |
| 8.locais | Formulário com endereço (CEP), vínculos, edição; erro 403 de permissão com o número | pendente / bloqueado (grava; sem usuário sem permissão 42) | `T-004`, `T-013`, `T-027` |
| 9.menu | Menu lateral e suas opções | coberto | 9.1 |
| 9.menu | Aniversários (abas Prescritores/Secretárias, Hoje/Próximos/Todos, navegador de mês) | pendente | — |
| 9.menu | Sobre (licença, suporte, versão, offline) e Ajuda (WhatsApp, telefone, e-mail, horários) | pendente | `T-016` |
| 9.menu | **Configurações**: tema escuro, bateria sem restrições, registro de erros | pendente | `T-009`, `T-017` |
| 9.menu | **Notificações** — cada chave (Todas, Chat, Resumo do dia 7h, Lembrete 30 min, Gravação, Lembrete de ponto, Ocultar aviso fixo) × canal do Android; notificação do chat (toque abre a conversa, resposta pela barra); lembrete de visita; resumo das 7h | pendente | `T-009`, `T-001` |
| 9.menu | Diálogos de 1ª abertura (notificações, bateria, "Sem problema!") | coberto (tratados no `appLifecycle`) / pendente a asserção | `T-009` |
| 9.menu | Pendências de envio (lista, "Tentar de novo", "Descartar", sincronizar) | pendente | `T-014` |
| 9.menu | Avisos amigáveis `app_aviso_*` (texto do catálogo, some em 3–5 s, empurra o conteúdo) | pendente | `T-007` |
| 9.menu | Botões padronizados (alturas 54/48 dp por `bounds`, ids estáveis) | pendente | `T-019`, `T-026` |
| 9.menu | Tema claro/escuro, fonte 1,5×, acessibilidade (alvos ≥ 48 dp, `contentDescription`), orientação retrato | pendente (insets/câmera furo/`release`: bloqueado, só celular físico) | `T-017` |
| 9.menu | Permissão 403 com texto pronto (`sem_permissao`, número da permissão) | bloqueado: sem usuário sem permissão 42 | `T-027` |
| 1.login | Outro usuário no aparelho **com fila de envio do anterior** (`login_outro_usuario_dialogo`) | pendente | `T-003` (d), parte da fila |
| 2.visita | Intervalo mínimo de 10 min entre visitas: agendar, Iniciar, Reagendar, cancelada não conta, `409 intervalo_minimo` do servidor | coberto | 2.24–2.27, 2.32 (`T-040`, `T-041` c) |
| 2.visita | Intervalo mínimo **sem rede** (cópia local + fila + criações pendentes), também depois do repouso | coberto | 2.28–2.31 (`T-044`) |
| 2.visita | Dado não velho: visita criada por fora aparece na lista de Hoje sem reabrir o app | coberto | 2.33 (`T-042` b) |
| 3.relatorio | Minha semana como lista preguiçosa: não trava, rolagem até todos os itens, marcar/desfazer follow-up, semana anterior e calendário | coberto | 3.20–3.23 (`T-043`) |
| 4.chat | Chave Disponível/Ocupado aparece em segundos num app recém-limpo | coberto | 4.10 (`T-041` a) |
| 5.ponto | Aviso offline do Ponto sem rede (aparece e some ao religar a rede) | coberto | 5.6, 5.7 (`T-047`, `A-012` resolvido) |
| 4.chat | Aviso offline do Chat (aparece e some ao religar a rede) | coberto | 4.11 (`T-047`) |
| 3.relatorio | Aviso offline de Minha semana e das visões Prescritor/Especialidade | coberto | 3.24, 3.25 (`T-047`) |
| 7.secretarias | Aviso offline de Secretárias (aparece e some ao religar a rede) | coberto | 7.12 (`T-047`, `T-048`; `A-014` resolvido) |
| 8.locais | Aviso offline de Locais, texto próprio (aparece e some ao religar a rede) | coberto | 8.11 (`T-047`, `T-048`; `A-014` resolvido) |
| 9.menu | Controle: com rede o tempo todo nenhum `*_texto_offline` aparece em nenhuma tela | coberto | 9.29 (`T-048` c) |
| 6.prescritores | Vincular/desvincular pela lista (cartão sobe e volta, API reflete) | coberto | 6.23 (`T-042` b) |
| 9.menu | Pendências: Sincronizar agora habilita em até 45 s num app recém-limpo | coberto | 9.24 (`T-041` b) |
| 9.menu | Abas da barra: conteúdo no 1º dump sem bolinha (cópia em RAM), repouso, sem rede, logo depois do login | coberto; **9.28 vermelho de propósito** (intermitente) | 9.25–9.28 (`T-042`, `T-045`, `T-046`; `A-013`, `Q-013`) |
| 1.login | "Sair" com envio pendente: modal com a contagem, Cancelar, Sair mesmo assim e Sincronizar antes de sair | coberto | 1.14, 1.15 (`T-003` c) |
| 1.login | Outro usuário com a fila do anterior: aviso, Cancelar mantém o Login, Descartar e entrar apaga a fila | coberto | 1.16, 1.17 (`T-003` d) |
| 1.login | Login com a fonte do sistema a 1,5× | coberto | 1.18 (`T-017`) |
| 2.visita | Contadores das abas × API e troca de mês ajusta a aba | coberto | 2.35, 2.36 (`T-012`) |
| 2.visita | Itens: botão Adicionar produto, seletor de produtos e quantidade com a fonte 1,5× (sem adicionar) | coberto | 2.34, 2.42 (`T-038` e, `T-017`) |
| 2.visita | Seletores: lápis abre a edição embutida, "+" abre o cadastro embutido, calendário e relógio (sem salvar) | coberto | 2.37–2.41 (`T-013`) |
| 2.visita | Iniciar visita sem rede entra na lista como pendente de envio | coberto | 2.43 (`T-014`) |
| 4.chat | Limite do campo (2000; emoji conta 10) e mensagem pendente sem rede | coberto | 4.12–4.14 (`T-010`) |
| 5.ponto | Lembretes de ponto: na hora, 15 min antes e entrada já registrada | coberto | 5.8–5.10 (`T-001`) |
| 6.prescritores | Editar prescritor, "Vincular a mim", Salvar com o teclado aberto e abas offline do detalhe | coberto | 6.24–6.27 (`T-038` e, `T-013`, `T-004`, `T-014`) |
| 7.secretarias | Salvar com o teclado aberto e lista sem travar | coberto | 7.14, 7.15 (`T-004`) |
| 8.locais | Salvar com o teclado aberto | coberto | 8.12 (`T-004`) |
| 9.menu | Orientação travada em retrato | coberto | 9.30 (`T-004`, `T-017`) |
| 9.menu | Ajuda: link de e-mail abre o cliente de e-mail | coberto | 9.31 (`T-016`) |
| 9.menu | Diálogos de 1ª abertura (asserção): notificações e bateria, "Agora não" | coberto | 9.32 (`T-009`) |
| 9.menu | Configurações, Ajuda e Sobre com a fonte do sistema a 1,5× | coberto | 9.33 (`T-017`) |
| 9.menu | Pendências lista a operação da fila (tipo, estado, descrição, data) | coberto | 9.34 (`T-014`) |
| 9.menu | Aniversários sem rede abre da cópia com aviso offline | **vermelho de propósito** (`A-015`, `Q-015`) | 9.35 (`T-014`) |
| 2.visita / 4.chat / 6.prescritores | Concluir visita, áudio, avisos das gravações, recorrência, emoji enviado, "+" que cadastra, prescritor sem grupo salva, offline com `ref:<uuid>` | bloqueado: grava no tenant (base limpa para a apresentação, 2026-10-24) | `P1-07` |
| 9.menu | Tema claro/escuro com texto legível | bloqueado: visual, sem atributo por id | `T-017` |
