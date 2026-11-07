# language: pt
Funcionalidade: Visita
  Como representante
  Quero ver a tela de Visitas
  Para acompanhar minhas visitas do mês

  @wip @leitura
  Cenário: 2.1 Acessa a tela de Visitas e renderiza as informações corretamente
    Dado que estou autenticado no app
    Quando aguardo a tela de Visitas carregar
    Então vejo a casca da tela de Visitas com o mês atual, as abas de status e a lista ou o estado vazio

  # T-020 + T-023 — o cartão da Visita mostra prescritor, local e bairro depois da 1ª sincronização
  # (dados limpos → login → lista durante a 1ª carga) e já no 1º quadro a partir do 2º login.
  # Não leva @leitura: precisa do reset completo (dados limpos) e termina com o app reiniciado.
  @wip
  Cenário: 2.2 Nomes do prescritor, do local e do bairro aparecem no primeiro login
    Dado que estou na tela de login
    Quando informo CNPJ, usuário e senha válidos
    E abro a aba Todos de Visitas
    Então todos os cartões visíveis mostram prescritor, local e bairro conforme a API
    Quando reinicio o app sem limpar os dados
    Então os cartões já mostram os nomes no primeiro quadro da lista

  # T-021 — aba Hoje em ordem crescente (hora mais cedo primeiro). Cria 2 visitas "Teste Appium" hoje
  # (07:00 e 23:30) para a ordem ser provada com massa conhecida; são canceladas ao fim do cenário.
  @wip @leitura
  Cenário: 2.3 Aba Hoje lista da hora mais cedo para a mais tarde
    Dado que existem visitas de teste hoje às 07:00 e às 23:30
    E que estou autenticado no app
    Quando reinicio o app sem limpar os dados
    E aguardo a tela de Visitas carregar
    Então a aba Hoje mostra as visitas de hoje em ordem crescente de hora conforme a API

  # T-021 — as demais abas: Concluída, Pendente e Todos da mais nova para a mais antiga; Agendada
  # da mais próxima para a mais distante.
  @wip
  Cenário: 2.4 Abas Concluída, Pendente e Todos decrescentes e Agendada crescente
    Dado que existem duas visitas de teste agendadas nos próximos dias
    E que estou autenticado no app
    Quando reinicio o app sem limpar os dados
    E aguardo a tela de Visitas carregar
    Então cada aba lista as visitas na ordem esperada conforme a API

  # ---- Nova visita (FAB) e formulários --------------------------------------------------------
  # T-032 — o pop-up virou duas opções em cartão, sem botão Cancelar; fecha com BACK ou tocando fora.
  @wip @leitura
  Cenário: 2.5 Botão + abre o modal Nova visita com Iniciar e Agendar e fecha com o voltar
    Dado que estou autenticado no app
    Quando toco no botão + de Visitas
    Então vejo o modal Nova visita com as opções Iniciar e Agendar e sem botão Cancelar
    E as opções do modal têm os textos "Iniciar visita" e "Agendar visita"
    Quando fecho o modal Nova visita com o botão voltar do sistema
    Então o modal Nova visita fecha e vejo a tela de Visitas

  @wip @leitura
  Cenário: 2.6 Formulário Agendar visita mostra os campos com a data de hoje e a hora vazia
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    Então vejo os campos do formulário Agendar com a data de hoje, a hora vazia e as quatro repetições

  @wip @leitura
  Cenário: 2.7 Agendar sem preencher pede prescritor, local e hora e não grava nada
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E toco em Salvar no formulário de visita
    Então vejo a mensagem "Preencha: Prescritor, Local de atendimento, Hora (HH:MM válida)." e nenhuma visita nova na API

  @wip @leitura
  Cenário: 2.8 Formulário Iniciar visita mostra a data de hoje e a hora de agora
    Dado que estou autenticado no app
    Quando abro o formulário de Iniciar visita
    Então vejo os campos do formulário Iniciar com a data de hoje e a hora de agora

  @wip @leitura
  Cenário: 2.9 Iniciar sem preencher pede prescritor e local e não grava nada
    Dado que estou autenticado no app
    Quando abro o formulário de Iniciar visita
    E toco em Salvar no formulário de visita
    Então vejo o pop-up Iniciar a visita agora com Iniciar e Voltar
    Quando confirmo o pop-up de iniciar do formulário
    Então vejo a mensagem "Preencha: Prescritor, Local de atendimento." e nenhuma visita nova na API

  # T-004 — voltar com algo digitado pergunta "Descartar alterações?"; sem alteração sai direto.
  @wip @leitura
  Cenário: 2.10 Voltar do formulário com texto digitado pergunta se descarta
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E digito "rascunho de teste" no histórico da visita
    E toco na seta de voltar do formulário
    Então vejo o pop-up Descartar alterações com Continuar e Descartar
    Quando escolho Continuar
    Então o pop-up fecha e continuo no formulário com o texto digitado
    Quando toco na seta de voltar do formulário
    E escolho Descartar
    Então volto para a tela de Visitas

  @wip @leitura
  Cenário: 2.11 Voltar do formulário sem alteração sai direto
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E toco na seta de voltar do formulário
    Então volto para a tela de Visitas sem pop-up

  # ---- Detalhe da visita (massa "Teste Appium", cancelada ao fim) ---------------------------------
  @wip @leitura
  Cenário: 2.12 Detalhe de visita agendada mostra os dados conforme a API
    Dado que existe uma visita de teste hoje às 07:00
    E que estou autenticado no app
    Quando reinicio o app sem limpar os dados
    E abro o detalhe da visita de teste
    Então o detalhe mostra código, data, hora, prescritor, local e histórico conforme a API

  # T-025 + T-026 — pop-up de cancelar: texto inteiro, pílulas de mesma altura, confirmar só com motivo.
  @wip @leitura
  Cenário: 2.13 Pop-up Cancelar visita exige motivo e tem os botões padronizados
    Dado que existe uma visita de teste hoje às 07:00
    E que estou autenticado no app
    Quando reinicio o app sem limpar os dados
    E abro o detalhe da visita de teste
    E toco em Cancelar visita no detalhe
    Então o pop-up de cancelar tem Cancelar visita e Voltar com a mesma altura e o confirmar desabilitado
    Quando digito o motivo "Teste Appium: não confirmar" no pop-up
    Então o botão de confirmar o cancelamento fica habilitado
    Quando escolho Voltar no pop-up de cancelar
    Então o pop-up fecha e a visita de teste continua agendada na API

  @wip @leitura
  Cenário: 2.14 Pop-up Iniciar visita tem Iniciar e Voltar e Voltar não inicia
    Dado que existe uma visita de teste hoje às 07:00
    E que estou autenticado no app
    Quando reinicio o app sem limpar os dados
    E abro o detalhe da visita de teste
    E toco em Iniciar no detalhe da visita
    Então o pop-up de iniciar tem Iniciar e Voltar com a mesma altura
    Quando escolho Voltar no pop-up de iniciar
    Então o pop-up fecha e a visita de teste continua agendada na API

  # ---- T-028 / T-029 / T-002 ---------------------------------------------------------------
  @wip @leitura
  Cenário: 2.15 Nomes dos cartões aparecem em formato de nome próprio, só na exibição
    Dado que estou autenticado no app
    Quando abro a aba Concluída de Visitas
    Então os nomes de prescritor e local dos cartões seguem a regra de nome próprio conforme a API

  # Peso da fonte não aparece no dump: o quadro é lido por mim (`@visual`, [R-ID]); o cenário garante
  # que o cartão está na tela e salva o quadro.
  @wip @leitura @visual
  Cenário: 2.16 Nome do prescritor no cartão da lista está em negrito (conferência visual)
    Dado que estou autenticado no app
    Quando abro a aba Hoje de Visitas
    Então o cartão mostra o nome do prescritor acima do local e o quadro fica salvo para conferência

  @wip @relogio
  Cenário: 2.17 Aba Hoje acompanha a virada do dia sem sair da tela
    Dado que existe uma visita de teste amanhã às 08:00
    E que estou autenticado no app
    Quando reinicio o app sem limpar os dados
    E abro a aba Hoje de Visitas
    Então a visita de teste de amanhã não aparece na aba Hoje
    Quando envio o app para segundo plano e adianto o relógio em um dia
    E volto para o app
    Então a visita de teste aparece na aba Hoje sem eu sair da tela

  # T-030 — causa real: a tela relia os nomes antes de a cópia local terminar de baixar. Rede LENTA
  # (`adb emu network speed edge`, restaurada no afterScenario) alarga a janela do download de ~5 MB.
  @wip @redeLenta
  Cenário: 2.18 Nomes aparecem no primeiro login mesmo com o download das cópias demorado
    Dado que a rede do aparelho está lenta
    E que estou na tela de login
    Quando informo CNPJ, usuário e senha válidos
    E abro a aba Todos de Visitas
    Então todos os cartões visíveis mostram prescritor, local e bairro conforme a API

  # ---- seletores do formulário de Agendar visita (T-013): só leitura, nada é salvo ------------------
  @wip @leitura
  Cenário: 2.19 Seletor de prescritor mostra os vinculados a mim, os filtros e o lápis de edição
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E abro o seletor de prescritor do formulário de visita
    Então o seletor de prescritor mostra os vinculados a mim com busca, filtros e lápis conforme a API

  @wip @leitura
  Cenário: 2.20 Seletor de local mostra os locais com busca e lápis de edição
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E abro o seletor de local do formulário de visita
    Então o seletor de local mostra locais da API com busca e lápis de edição

  @wip @leitura
  Cenário: 2.21 Escolher prescritor e local preenche os campos do formulário sem salvar
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E escolho o primeiro prescritor e o primeiro local nos seletores
    Então os campos Prescritor e Local mostram os nomes escolhidos e nenhuma visita foi criada

  # T-036 (6) — a aba escolhida sobrevive a abrir o detalhe de uma visita e voltar (antes voltava à aba padrão). O mês escolhido
  # não é provado: o tenant de teste só tem visitas no mês corrente (a API não devolve meses anteriores), então não há
  # visita para abrir fora dele — o mês corrente só é conferido como inalterado.
  @wip @leitura
  Cenário: 2.22 Aba escolhida sobrevive a abrir o detalhe de uma visita e voltar
    Dado que estou autenticado no app
    Quando aguardo a tela de Visitas carregar
    E escolho a aba Concluída e abro o detalhe da primeira visita da lista
    E volto do detalhe da visita
    Então a tela de Visitas mantém o mês e a aba escolhidos

  # T-037 (1) — voltar ao primeiro plano sincroniza uma rodada por vez: no máximo 1 `GET /prescritores` (delta) e 1
  # `GET /visitas` por volta (antes: 2 a 3 rodadas em 1–2 s). Conta as linhas `HTTP GET` do logcat `VisitaMedica`.
  @wip
  Cenário: 2.23 Voltar ao primeiro plano sincroniza no máximo uma vez por volta
    Dado que estou autenticado no app
    Quando aguardo a tela de Visitas carregar
    E espero a sincronização do login terminar
    Então voltar ao primeiro plano 3 vezes sincroniza no máximo uma vez por volta

  # ---- T-040 / T-041 (c) / T-044: intervalo mínimo de 10 minutos entre visitas -------------------------------------------------
  # A massa nasce pela tela (visitas "Teste Appium", canceladas ao fim por prefixo) num horário livre de hoje (horário base).
  @wip
  Cenário: 2.24 Agendar a menos de 10 minutos de outra visita é barrado e a 10 minutos cria
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    E toco em Salvar no formulário de visita
    Então a visita é agendada e a API tem 1 visita de teste aberta
    Quando abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 5 minutos
    Então o campo Hora do formulário mostra o erro de intervalo mínimo
    Quando toco em Salvar no formulário de visita
    Então o aviso de erro mostra a recusa do intervalo mínimo e a API continua com 1 visita de teste aberta
    Quando preencho a hora do formulário com o horário base mais 10 minutos
    Então o campo Hora do formulário não mostra erro
    Quando toco em Salvar no formulário de visita
    Então a visita é agendada e a API tem 2 visitas de teste abertas

  # T-040 (a) — a visita cancelada não conta: cancelada a visita do horário base, agendar a base + 5 min passa.
  @wip
  Cenário: 2.25 Visita cancelada não conta no intervalo mínimo
    Dado que há um horário livre hoje para agendar visitas de teste
    E que existe uma visita de teste hoje no horário base mais 0 minutos
    E que estou autenticado no app
    Quando abro o detalhe da visita de teste do horário base mais 0 minutos
    E cancelo a visita aberta no detalhe com o motivo "Teste Appium: cancelada não conta"
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 5 minutos
    Então o campo Hora do formulário não mostra erro
    Quando toco em Salvar no formulário de visita
    Então a visita é agendada e a API tem 1 visita de teste aberta

  # T-040 (b) — Iniciar visita (hora = agora) a menos de 10 minutos de outra visita não cancelada é recusado e nada é criado.
  @wip
  Cenário: 2.26 Iniciar uma visita a menos de 10 minutos de outra é recusado
    Dado que existe uma visita de teste hoje daqui a 5 minutos
    E que estou autenticado no app
    Quando abro o formulário de Iniciar visita
    E escolho o primeiro prescritor e o primeiro local nos seletores
    E digito "Teste Appium: iniciar no intervalo" no histórico da visita
    Então o campo Hora do formulário mostra o erro de intervalo mínimo
    Quando toco em Salvar no formulário de visita
    Então o início da visita é recusado pelo intervalo mínimo e nenhuma visita foi criada

  # T-040 (c) — Reagendar no detalhe: a menos de 10 min de outra visita é recusado; para o próprio horário não é recusado (a
  # própria visita é ignorada na checagem); para um horário livre é aceito e a API passa a ter a visita nele.
  @wip
  Cenário: 2.27 Reagendar para menos de 10 minutos de outra visita é barrado e para um horário livre é aceito
    Dado que há um horário livre hoje para agendar visitas de teste
    E que existe uma visita de teste hoje no horário base mais 0 minutos
    E que existe uma visita de teste hoje no horário base mais 20 minutos
    E que estou autenticado no app
    Quando abro o detalhe da visita de teste do horário base mais 20 minutos
    E troco a hora do detalhe para o horário base mais 5 minutos e toco em Reagendar
    Então o detalhe recusa o reagendamento pelo intervalo mínimo
    Quando espero o aviso sumir
    E troco a hora do detalhe para o horário base mais 20 minutos e toco em Reagendar
    Então o detalhe não recusa o reagendamento para o próprio horário
    Quando espero o aviso sumir
    E troco a hora do detalhe para o horário base mais 60 minutos e toco em Reagendar
    Então o detalhe aceita o reagendamento e a API tem a visita no horário base mais 60 minutos

  # ---- T-044: o intervalo mínimo vale também SEM rede (cópia local das visitas + fila de envio + criações pendentes) ---------------
  # Cada cenário offline fecha o app e apaga os dados ANTES de a rede voltar, para a fila não enviar visita ao tenant.
  @wip @offline
  Cenário: 2.28 Sem rede, agendar a menos de 10 minutos de outra visita pendente é barrado
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    E toco em Salvar no formulário de visita
    Então a visita fica na fila do aparelho e a API continua com 0 visitas de teste abertas
    Quando abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 5 minutos
    Então o campo Hora do formulário mostra o erro de intervalo mínimo
    Quando toco em Salvar no formulário de visita
    Então o aviso de erro mostra a recusa do intervalo mínimo e a API continua com 0 visitas de teste abertas
    Quando encerro o app e apago os dados antes de religar a rede

  @wip @offline
  Cenário: 2.29 Sem rede, o horário liberado por um reagendamento pendente volta a ficar livre
    Dado que há um horário livre hoje para agendar visitas de teste
    E que existe uma visita de teste hoje no horário base mais 0 minutos
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o detalhe da visita de teste do horário base mais 0 minutos
    E troco a hora do detalhe para o horário base mais 60 minutos e toco em Reagendar
    E volto do detalhe da visita
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    Então o campo Hora do formulário não mostra erro
    Quando toco em Salvar no formulário de visita
    E confirmo o aviso de visita salva no aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 65 minutos
    Então o campo Hora do formulário mostra o erro de intervalo mínimo
    Quando encerro o app e apago os dados antes de religar a rede

  @wip @offline
  Cenário: 2.30 Sem rede, reagendar no detalhe para menos de 10 minutos de outra visita é barrado, também depois do repouso
    Dado que há um horário livre hoje para agendar visitas de teste
    E que existe uma visita de teste hoje no horário base mais 0 minutos
    E que existe uma visita de teste hoje no horário base mais 20 minutos
    E que estou autenticado no app
    E espero a sincronização do login terminar
    E que limpo o registro de chamadas HTTP do app
    Quando desligo a rede do aparelho
    E abro o detalhe da visita de teste do horário base mais 20 minutos
    E troco a hora do detalhe para o horário base mais 5 minutos e toco em Reagendar
    Então o detalhe recusa o reagendamento pelo intervalo mínimo
    Quando espero o aviso sumir
    E volto do detalhe da visita
    E envio o app para segundo plano até a RAM ser liberada e volto
    E abro o detalhe da visita de teste do horário base mais 20 minutos
    E troco a hora do detalhe para o horário base mais 5 minutos e toco em Reagendar
    Então o detalhe recusa o reagendamento pelo intervalo mínimo
    Quando encerro o app e apago os dados antes de religar a rede

  @wip @offline
  Cenário: 2.31 Sem rede, a visita cancelada deixa o horário livre
    Dado que há um horário livre hoje para agendar visitas de teste
    E que existe uma visita de teste hoje no horário base mais 0 minutos
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o detalhe da visita de teste do horário base mais 0 minutos
    E cancelo a visita aberta no detalhe com o motivo "Teste Appium: cancelada sem rede"
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 5 minutos
    Então o campo Hora do formulário não mostra erro
    Quando encerro o app e apago os dados antes de religar a rede

  # T-041 (c) / T-044 (e) — o `409 intervalo_minimo` do servidor só se alcança com a validação local contornada: a visita
  # concorrente nasce na API enquanto o app está sem rede; ao religar, o servidor recusa e a visita sai da fila.
  @wip @offline
  Cenário: 2.32 Ao religar a rede o servidor recusa o agendamento que a tela deixou passar e a fila esvazia
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 5 minutos
    E toco em Salvar no formulário de visita
    E confirmo o aviso de visita salva no aparelho
    E crio na API uma visita de teste no horário base mais 0 minutos
    E religo a rede do aparelho
    Então o app mostra a recusa do servidor pelo intervalo mínimo e a visita recusada não existe na API
    Quando abro as Pendências de envio pelo ícone de sincronização
    Então as Pendências mostram nada pendente de envio

  # T-042 (b) — dado não velho: uma visita criada por fora (API) aparece na lista de Hoje com o app aberto, sem reabrir.
  # A massa é cancelada ao fim. O horário é o começo do dia para o cartão ficar nas primeiras linhas da lista.
  @wip
  Cenário: 2.33 Visita criada por fora aparece na lista de Hoje sem reabrir o app
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Quando abro a aba Hoje de Visitas
    E crio na API uma visita de teste hoje às 00:20
    Então a visita criada por fora aparece na lista de Hoje sem eu reabrir o app

  # T-038 (5)(e) — o botão da seção Itens do detalhe diz "Adicionar produto" e abre o seletor de produtos; Voltar fecha sem adicionar
  # nada. Usa uma visita que já existe (Itens vale para qualquer status): não cria nem altera visita no tenant.
  @wip @leitura
  Cenário: 2.34 O botão da seção Itens diz Adicionar produto e abre o seletor de produtos sem adicionar nada
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Quando escolho a aba Todos e abro o detalhe da primeira visita da lista
    Então o botão da seção Itens diz "Adicionar produto"
    Quando toco no botão Adicionar produto da seção Itens
    Então vejo o seletor de produtos com a busca e a lista
    Quando volto do seletor de produtos
    Então a seção Itens continua à vista no detalhe da visita

  # T-012 — o contador de cada aba ("Hoje (3)") segue a regra do app sobre `GET /visitas` do mês exibido: Concluída = status concluída;
  # Pendente = agendada ou iniciada com data passada; Hoje = data de hoje (qualquer status); Agendada = agendada de hoje em diante;
  # Todos = o mês inteiro. Só leitura.
  @wip @leitura
  Cenário: 2.35 Os contadores das abas de Visitas batem com a API no mês atual
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Então os contadores das abas de Visitas batem com a API do mês exibido

  # T-012 — `ajustarAbaAoMes`: mês passado abre em Todos, mês futuro em Agendada, o mês atual em Hoje; os contadores seguem o mês.
  @wip @leitura
  Cenário: 2.36 Trocar de mês ajusta a aba e os contadores seguem o mês exibido
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Quando navego para o mês anterior de Visitas
    Então a aba Todos está selecionada e os contadores batem com a API do mês exibido
    Quando navego para o mês seguinte de Visitas
    Então a aba Hoje está selecionada e os contadores batem com a API do mês exibido
    Quando navego para o mês seguinte de Visitas
    Então a aba Agendada está selecionada e os contadores batem com a API do mês exibido

  # T-013 — o lápis de um item do seletor abre a edição embutida (formulário do próprio cadastro) e voltar fecha só ela: o seletor
  # continua aberto por baixo. Só leitura: nada é salvo.
  @wip @leitura
  Cenário: 2.37 O lápis do seletor de prescritor abre a edição embutida e voltar fecha só ela
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E abro o seletor de prescritor do formulário de visita
    E toco no lápis do primeiro item do seletor de prescritor
    Então vejo a edição embutida de prescritor com o nome conforme a API
    Quando volto da edição embutida de prescritor
    Então o seletor de prescritor continua aberto depois de fechar a edição embutida

  @wip @leitura
  Cenário: 2.38 O lápis do seletor de local abre a edição embutida e voltar fecha só ela
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E abro o seletor de local do formulário de visita
    E toco no lápis do primeiro item do seletor de local
    Então vejo a edição embutida de local com o nome conforme a API
    Quando volto da edição embutida de local
    Então o seletor de local continua aberto depois de fechar a edição embutida

  # T-013 — o "+" flutuante do seletor abre o cadastro embutido; voltar sem salvar não cria nada.
  @wip @leitura
  Cenário: 2.39 O botão + do seletor de local abre o cadastro embutido e voltar não cria local
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E abro o seletor de local do formulário de visita
    E toco no botão + do seletor de local
    Então vejo o cadastro embutido de local vazio
    Quando volto do cadastro embutido de local
    Então o seletor de local continua aberto e a API segue com o mesmo número de locais

  # T-013 — os ícones de calendário e relógio abrem `DatePickerDialog`/`TimePicker` (janelas próprias); Cancelar não muda o campo e
  # Confirmar grava o valor escolhido no campo.
  @wip @leitura
  Cenário: 2.40 O calendário do formulário de Agendar cancela sem mudar a data e confirma mantendo a data
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E guardo o valor do campo Data do formulário
    E abro o calendário do formulário de visita
    E cancelo o seletor do calendário
    Então o campo Data do formulário continua com o valor guardado
    Quando abro o calendário do formulário de visita
    E confirmo o seletor do calendário
    Então o campo Data do formulário continua com o valor guardado

  @wip @leitura
  Cenário: 2.41 O relógio do formulário de Agendar cancela sem preencher a hora e confirma preenchendo-a
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    E abro o relógio do formulário de visita
    E cancelo o seletor do relógio
    Então o campo Hora do formulário continua vazio
    Quando abro o relógio do formulário de visita
    E confirmo o seletor do relógio
    Então o campo Hora do formulário mostra uma hora válida

  # T-017 — fonte do sistema a 1,5×: o campo de quantidade ao adicionar item (110 dp) continua à vista e mostra o "1" padrão inteiro.
  # Só leitura: escolhe o primeiro produto e cancela, nada é adicionado.
  @wip @fonte
  Cenário: 2.42 Com a fonte do sistema a 1,5 vez o campo de quantidade do item continua à vista
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Quando escolho a aba Todos e abro o detalhe da primeira visita da lista
    E aumento a fonte do sistema para 1,5 vez
    Então o botão da seção Itens diz "Adicionar produto"
    Quando toco no botão Adicionar produto da seção Itens
    E escolho o primeiro produto do seletor
    Então o campo de quantidade mostra 1 e cabe na largura da janela
    Quando cancelo a escolha do produto
    Então a seção Itens continua à vista no detalhe da visita

  # T-014 — visita INICIADA sem rede: entra na lista como pendente de envio (`visitas_item_pendente_<uuid>`) e o selo do topo conta 1 envio
  # (o cenário apaga os dados antes de a rede voltar: nada chega ao tenant).
  @wip @offline
  Cenário: 2.43 Sem rede, iniciar uma visita a coloca na lista como pendente de envio
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Iniciar visita
    E escolho o primeiro prescritor e o primeiro local nos seletores
    E digito "Teste Appium: iniciada sem rede" no histórico da visita
    E toco em Salvar no formulário de visita
    E confirmo o pop-up de iniciar do formulário
    Então a visita iniciada sem rede aparece na lista como pendente de envio e a API continua com 0 visitas de teste abertas
    Quando encerro o app e apago os dados antes de religar a rede
