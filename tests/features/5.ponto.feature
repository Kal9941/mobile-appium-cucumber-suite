# language: pt
Funcionalidade: Ponto
  Como representante
  Quero ver o Registro de Ponto
  Para conferir horário esperado e registros do dia

  # Nunca aciona "Registrar": grava ponto real no desktop (AGENTS §9). Todos os cenários só LEEM.
  @wip @leitura
  Cenário: 5.1 Acessa a tela de Registro de Ponto e renderiza as informações corretamente
    Dado que estou autenticado no app
    Quando acesso Ponto pela barra inferior
    Então vejo o relógio, a data de hoje, o horário esperado e os quatro registros

  # T-008 — a ordem do dia: só o próximo registro está habilitado.
  @wip @leitura
  Cenário: 5.2 Só o próximo registro do dia está habilitado conforme a API
    Dado que estou autenticado no app
    Quando acesso Ponto pela barra inferior
    Então os botões de registrar seguem a ordem do dia conforme a API e a explicação da ordem aparece

  @wip @leitura
  Cenário: 5.3 Cada linha mostra o previsto ou o registrado conforme a API
    Dado que estou autenticado no app
    Quando acesso Ponto pela barra inferior
    Então cada linha do ponto mostra o horário previsto ou registrado conforme a API

  @wip @leitura
  Cenário: 5.4 Horário esperado do dia confere com a API
    Dado que estou autenticado no app
    Quando acesso Ponto pela barra inferior
    Então o horário esperado mostra entrada, saída e almoço conforme a API

  @wip @leitura
  Cenário: 5.5 O relógio da tela anda a cada segundo
    Dado que estou autenticado no app
    Quando acesso Ponto pela barra inferior
    Então o relógio da tela de ponto avança em poucos segundos

  # T-008 — cópia local da tela: sem rede o Ponto mostra o último retrato com o aviso offline.
  @wip @offline
  Cenário: 5.6 Sem rede o Ponto mostra a cópia do aparelho com o aviso offline
    Dado que estou autenticado no app
    Quando acesso Ponto pela barra inferior
    E desligo a rede do aparelho
    E reinicio o app sem limpar os dados
    E acesso Ponto pela barra inferior
    Então vejo o horário esperado da cópia do aparelho e o aviso de offline do ponto

  # T-047 (a) — o aviso offline do Ponto (`5.6`) some quando a rede volta.
  @wip @offline
  Cenário: 5.7 Sem rede o Ponto mostra o aviso offline e ele some quando a rede volta
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E acesso Ponto pela barra inferior
    Então o aviso offline "registroponto_texto_offline" aparece em até 2 segundos
    Quando religo a rede do aparelho
    Então o aviso offline "registroponto_texto_offline" some em até 180 segundos

  # T-001 — lembretes de ponto, SEM bater ponto real: o horário de hoje é semeado em `shared_prefs/notificacoes.xml` (`run-as`) e o
  # app reaberto agenda os avisos; o que vale é a notificação na barra (`dumpsys notification`).
  @wip
  Cenário: 5.8 Na hora da entrada o app avisa para registrar o ponto
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E que o app tem permissão de alarmes exatos
    Quando semeio a entrada de hoje para daqui a 2 minutos e reabro o app
    Então a notificação "Hora de registrar o ponto de entrada" aparece em até 5 minutos
    E nenhuma notificação "Ponto de entrada em 15 minutos" foi postada

  @wip
  Cenário: 5.9 Quinze minutos antes da entrada o app avisa e ainda não é a hora
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E que o app tem permissão de alarmes exatos
    Quando semeio a entrada de hoje para daqui a 16 minutos e reabro o app
    Então a notificação "Ponto de entrada em 15 minutos" aparece em até 4 minutos
    E nenhuma notificação "Hora de registrar o ponto de entrada" foi postada

  # T-001 (caso negativo) — com a entrada já registrada (retrato guardado) e sem rede, o aviso é ignorado e fica no log do app.
  @wip @offline
  Cenário: 5.10 Com a entrada já registrada o lembrete não aparece
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E que o app tem permissão de alarmes exatos
    Quando semeio a entrada de hoje para daqui a 2 minutos com o ponto de entrada já registrado e reabro o app
    E desligo a rede do aparelho
    Então depois da hora da entrada o app ignora o lembrete e nenhuma notificação de entrada é postada
