# language: pt
Funcionalidade: Relatório
  Como representante
  Quero ver Gráficos e Relatórios
  Para acompanhar meu resultado e minha semana

  @wip @leitura
  Cenário: 3.1 Acessa a tela de Relatórios e renderiza as informações corretamente
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    Então vejo as abas e a semana atual de segunda a domingo

  # T-011 — Relatórios: aba Por prescritor, ordenação, período, mini gráfico, seletor e Especialidade.
  # Todos os números esperados vêm da API real (`GET /relatorios/resultados-por-prescritor`), nunca fixos.
  @wip @leitura
  Cenário: 3.2 Aba Por prescritor mostra os totais e a ordem "Venda" conforme a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    Então vejo os totais do mês e os maiores prescritores por venda conforme a API

  @wip @leitura
  Cenário: 3.3 Ordena por nome crescente e a lista reordena
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E ordeno por nome em ordem crescente
    Então a lista começa pelos primeiros nomes em ordem alfabética conforme a API

  @wip @leitura
  Cenário: 3.4 Período Ano mostra os totais do ano conforme a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E escolho o período Ano
    Então vejo os totais do ano atual conforme a API

  @wip @leitura
  Cenário: 3.5 Navegador de mês atravessa a virada de janeiro para dezembro
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E volto até janeiro do ano atual e mais um mês
    Então vejo dezembro do ano anterior com os totais conforme a API

  @wip @leitura
  Cenário: 3.6 Seletor de mês e ano muda o período e os totais
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E escolho setembro pelo seletor de mês e ano
    Então vejo setembro do ano atual com os totais conforme a API

  @wip @leitura
  Cenário: 3.7 Cartão Total abre o mini gráfico mensal
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E toco no cartão Total
    Então vejo o mini gráfico com as cinco séries, os doze meses e o mês atual em destaque

  @wip @leitura
  Cenário: 3.8 Aba Especialidade mostra os mesmos totais agrupados
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Especialidade
    Então vejo os totais do mês e a lista agrupada por especialidade

  # ---- T-031 / T-011 (restante) --------------------------------------------------------------------
  # T-031 — título em nome próprio e subtítulo "CRM · Especialidade" com a especialidade em nome próprio.
  @wip @leitura
  Cenário: 3.9 Lista de Relatórios mostra nome e especialidade em formato de nome próprio
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    Então os títulos e subtítulos da lista de relatórios seguem a regra de nome próprio conforme a API

  # T-011 — ordenar por cada campo nas duas ordens: os valores (lidos da API) só crescem ou só decrescem.
  @wip @leitura
  Esquema do Cenário: 3.10 Ordenar por <campo> em ordem <ordem> reordena a lista conforme a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E ordeno por <campo> em ordem <ordem>
    Então os primeiros prescritores estão ordenados por <campo> em ordem <ordem> conforme a API

    Exemplos:
      | campo       | ordem       |
      | venda       | crescente   |
      | visitas     | decrescente |
      | visitas     | crescente   |
      | revenda     | decrescente |
      | revenda     | crescente   |
      | alopatia    | decrescente |
      | alopatia    | crescente   |
      | homeopatia  | decrescente |
      | homeopatia  | crescente   |

  @wip @leitura
  Cenário: 3.11 Aba Especialidade ordena por venda conforme a API agregada
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Especialidade
    Então as primeiras especialidades estão em ordem de venda decrescente conforme a API agregada

  @wip @leitura
  Cenário: 3.12 Tocar num prescritor abre o gráfico mensal dele conforme a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E toco no primeiro prescritor da lista de relatórios
    Então o gráfico do prescritor mostra o nome e a venda do mês conforme a API

  @wip @leitura
  Cenário: 3.13 Setas do gráfico atravessam a virada de janeiro para dezembro conforme a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E toco no cartão Total
    E volto no gráfico até janeiro do ano atual e mais um mês
    Então o gráfico mostra dezembro do ano anterior com a venda conforme a API

  @wip @leitura
  Cenário: 3.14 Seletor de ano escolhe outro ano e os totais seguem a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Por prescritor
    E escolho o período Ano
    E escolho o ano anterior no seletor de ano
    Então vejo o ano anterior com os totais do ano conforme a API

  @wip @leitura
  Cenário: 3.15 Minha semana mostra totais, sentimentos e follow-ups conforme a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E aguardo a semana carregar
    Então Minha semana mostra os totais, os sentimentos e os follow-ups pendentes conforme a API

  @wip @leitura
  Cenário: 3.16 Minha semana mostra os produtos mais citados conforme a API
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E aguardo a semana carregar
    Então os primeiros produtos da semana são os mais citados conforme a API

  # T-036 (1) — as 3 abas viraram o seletor rotacional "‹ visão ›" (anterior | texto | próxima); "Minha semana" é a padrão.
  @wip @leitura
  Cenário: 3.17 Seletor de visão percorre Prescritor, Minha semana e Especialidade nos dois sentidos
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    Então o seletor de visão percorre as três visões nos dois sentidos e as abas antigas não existem

  # T-036 (2) — tocar numa especialidade abre a tela dela (rota `relatorio_especialidade`), não mais o gráfico.
  @wip @leitura
  Cenário: 3.18 Tocar numa especialidade abre a tela dela com os totais conforme a API e voltar mantém a visão
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E abro a aba Especialidade
    E toco na primeira especialidade da lista
    Então a tela da especialidade mostra o nome e os prescritores conforme a API
    Quando volto da tela da especialidade
    Então continuo na visão Especialidade

  # T-037 (3) — em Minha semana (visão padrão) o `GET /relatorios/resultados-por-prescritor` não sai mais: só quando a
  # visão Prescritor/Especialidade é aberta. Conta as linhas `HTTP GET <caminho> ->` do logcat `VisitaMedica`.
  @wip
  Cenário: 3.19 Minha semana não pede resultados por prescritor e a visão Prescritor pede uma vez
    Dado que estou autenticado no app
    E que limpo o registro de chamadas HTTP do app
    Quando acesso Relatórios pela barra inferior
    E aguardo a semana carregar
    E observo as chamadas HTTP do app por 30 segundos
    Então Minha semana fez no máximo 1 resumo-semanal-ia e nenhum resultados-por-prescritor
    Quando abro a aba Por prescritor
    Então a visão Prescritor fez exatamente 1 resultados-por-prescritor

  # T-043 (a) — Minha semana virou lista preguiçosa (LazyColumn): abrir a visão não trava a tela (quadros lentos < 5 % e
  # nenhum "Skipped N frames" acima de 30 no logcat).
  @wip @leitura
  Cenário: 3.20 Abrir Minha semana não trava a tela
    Dado que estou autenticado no app
    E que começo a medir a fluidez do app
    Quando acesso Relatórios pela barra inferior
    E aguardo a semana carregar
    Então a fluidez medida teve menos de 5% de quadros lentos e nenhum salto acima de 30 quadros

  # T-043 (b) — só as linhas à vista existem na árvore: os itens abaixo da dobra só aparecem DEPOIS de rolar. A rolagem acumula
  # os ids vistos e prova que chegou a todos os follow-ups, próximas visitas e resumos que a API devolve.
  @wip @leitura
  Cenário: 3.21 Minha semana monta só as linhas à vista e a rolagem chega a todos os itens
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E aguardo a semana carregar
    Então o último resumo da semana ainda não existe na árvore de UI
    Quando rolo Minha semana até o fim
    Então a rolagem mostrou todos os follow-ups, as próximas visitas e os resumos conforme a API

  # T-043 (c) — marcar um follow-up: vai para o fim, o contador baixa em 1 e o aviso de sucesso aparece; desfazer reabre. GRAVA
  # no tenant (massa liberada em 2026-10-15) e desfaz no próprio cenário; a conferência é pela API (`resumo-semanal-ia`).
  @wip
  Cenário: 3.22 Marcar um follow-up baixa o contador e desfazer reabre
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E aguardo a semana carregar
    E guardo o primeiro follow-up pendente de Minha semana
    E marco o follow-up guardado
    Então o contador de pendentes baixou em 1, o aviso de sucesso apareceu e a API marca o follow-up concluído
    Quando desfaço o follow-up guardado
    Então o contador de pendentes voltou ao original e a API reabriu o follow-up

  # T-043 (d) — trocar de semana e abrir o calendário (seletor de data) seguem funcionando na lista preguiçosa.
  @wip @leitura
  Cenário: 3.23 Trocar de semana e abrir o calendário seguem funcionando
    Dado que estou autenticado no app
    Quando acesso Relatórios pela barra inferior
    E aguardo a semana carregar
    E toco na seta de semana anterior
    Então a semana mostrada é a anterior sem erro
    Quando abro o calendário da semana e escolho hoje
    Então a semana mostrada é a atual sem erro

  # T-047 (a) — sem rede Minha semana e as visões Prescritor e Especialidade mostram o aviso offline; some quando a rede volta.
  @wip @offline
  Cenário: 3.24 Sem rede Minha semana mostra o aviso offline e ele some quando a rede volta
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E acesso Relatórios pela barra inferior
    Então o aviso offline "relatorios_semana_texto_offline" aparece em até 2 segundos
    Quando religo a rede do aparelho
    Então o aviso offline "relatorios_semana_texto_offline" some em até 180 segundos

  @wip @offline
  Cenário: 3.25 Sem rede as visões Prescritor e Especialidade mostram o aviso offline
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E acesso Relatórios pela barra inferior
    E giro o seletor para a visão Prescritor
    Então o aviso offline "relatorios_texto_offline" aparece em até 2 segundos
    Quando giro o seletor para a visão Especialidade
    Então o aviso offline "relatorios_texto_offline" aparece em até 2 segundos
