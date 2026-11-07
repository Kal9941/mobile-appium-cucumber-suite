# language: pt
# Casca de navegação e tudo que não cabe nas features 1-8 (Aniversários, Sobre, Ajuda, Pendências,
# Configurações e Notificações). Pedido novo do app entra aqui ou na feature da tela dona — AGENTS §14.
Funcionalidade: Menu
  Como representante
  Quero navegar pelo menu lateral
  Para chegar às telas que não estão na barra inferior

  @wip @leitura
  Cenário: 9.1 Abre o menu lateral e renderiza as opções corretamente
    Dado que estou autenticado no app
    Quando abro o menu lateral
    Então vejo o título e as opções do menu lateral

  # ---- Aniversários -------------------------------------------------------------------------
  @wip @leitura
  Cenário: 9.2 Aniversários mostra o mês atual e a contagem das abas conforme a API
    Dado que estou autenticado no app
    Quando abro Aniversários pelo menu lateral
    Então vejo o mês atual, as abas com a contagem do mês e os filtros conforme a API

  @wip @leitura
  Cenário: 9.3 Aniversários navega para o mês anterior e a contagem muda conforme a API
    Dado que estou autenticado no app
    Quando abro Aniversários pelo menu lateral
    E volto um mês em Aniversários
    Então vejo o mês anterior e a contagem das abas conforme a API

  @wip @leitura
  Cenário: 9.4 Aniversários filtro Todos lista o mês na ordem de dia e nome conforme a API
    Dado que estou autenticado no app
    Quando abro Aniversários pelo menu lateral
    E escolho o filtro Todos em Aniversários
    Então os primeiros aniversariantes estão na ordem de dia e nome conforme a API

  # ---- Configurações ------------------------------------------------------------------------
  @wip @leitura
  Cenário: 9.5 Configurações mostra tema, bateria, notificações e registro de erros
    Dado que estou autenticado no app
    Quando abro Configurações pelo menu lateral
    Então vejo as linhas de Configurações com os textos esperados

  # Muda a preferência de tema: NÃO é @leitura (o próximo cenário volta ao reset completo).
  @wip
  Cenário: 9.6 Tema escuro liga e desliga e o estado muda
    Dado que estou autenticado no app
    Quando abro Configurações pelo menu lateral
    E ligo o tema escuro
    Então o tema escuro está ligado e o texto de estado mudou
    Quando desligo o tema escuro
    Então o tema escuro está desligado e o texto de estado voltou

  @wip @leitura
  Cenário: 9.7 Bateria sem restrições reflete o estado do sistema
    Dado que estou autenticado no app
    Quando abro Configurações pelo menu lateral
    Então a chave de bateria reflete a lista de apps sem restrição do sistema

  # Reset completo (sem @leitura): garante que ainda não existe `erros.log` — tocar na linha mostra o aviso.
  @wip
  Cenário: 9.8 Registro de erros explica a função e avisa que ainda não há erros
    Dado que estou autenticado no app
    Quando abro Configurações pelo menu lateral
    Então o registro de erros mostra a explicação e o app ainda não tem arquivo de erros
    Quando toco na linha do registro de erros
    Então vejo o aviso "Ainda não há erros registrados. Bom sinal!"

  # ---- Notificações (T-009) --------------------------------------------------------------------
  @wip @leitura
  Cenário: 9.9 Notificações expande e mostra as sete chaves
    Dado que estou autenticado no app
    Quando abro Configurações pelo menu lateral
    E expando as Notificações
    Então vejo as sete chaves de notificação com título e estado

  @wip
  Cenário: 9.10 Cada chave de notificação alterna, muda o texto de estado e volta
    Dado que estou autenticado no app
    Quando abro Configurações pelo menu lateral
    E expando as Notificações
    Então cada chave individual alterna, muda o texto de estado e volta ao valor original

  @wip
  Cenário: 9.11 Chave Todas desliga todas as filhas e religa
    Dado que estou autenticado no app
    Quando abro Configurações pelo menu lateral
    E expando as Notificações
    Então a chave Todas desliga todas as filhas e ao religar elas voltam

  # ---- Sobre ------------------------------------------------------------------------------
  @wip @leitura
  Cenário: 9.12 Sobre mostra licença, suporte, desenvolvedor e versão conforme a API
    Dado que estou autenticado no app
    Quando abro Sobre pelo menu lateral
    Então vejo a licença, o suporte, o desenvolvedor e a versão conforme a API e o aparelho

  @wip @offline
  Cenário: 9.13 Sobre sem rede mostra a cópia do aparelho e o aviso offline
    Dado que estou autenticado no app
    Quando abro Sobre pelo menu lateral
    E desligo a rede do aparelho
    E reinicio o app sem limpar os dados
    E abro Sobre pelo menu lateral
    Então vejo a licença da cópia do aparelho e o aviso de offline

  # ---- Ajuda ----------------------------------------------------------------------------
  @wip @leitura
  Cenário: 9.14 Ajuda mostra os contatos e os horários de atendimento
    Dado que estou autenticado no app
    Quando abro Ajuda pelo menu lateral
    Então vejo os contatos de suporte e comercial com os horários de atendimento

  @wip @leitura
  Cenário: 9.15 Ajuda abre o WhatsApp fora do app e volta
    Dado que estou autenticado no app
    Quando abro Ajuda pelo menu lateral
    E toco no botão do WhatsApp
    Então o app sai de cena para outro aplicativo
    Quando volto para o app
    Então vejo a tela de Ajuda

  @wip @leitura
  Cenário: 9.16 Ajuda abre o discador com o telefone comercial
    Dado que estou autenticado no app
    Quando abro Ajuda pelo menu lateral
    E toco no telefone de contato
    Então o app sai de cena para outro aplicativo
    Quando volto para o app
    Então vejo a tela de Ajuda

  # ---- Pendências de envio ---------------------------------------------------------------
  @wip @leitura
  Cenário: 9.17 Pendências mostra o resumo e o estado vazio quando tudo foi enviado
    Dado que estou autenticado no app
    Quando abro as Pendências de envio pelo ícone de sincronização
    Então vejo o resumo com a conexão e as contagens e o estado vazio

  @wip @leitura
  Cenário: 9.18 Sincronizar agora nas Pendências atualiza a hora da última sincronização
    Dado que estou autenticado no app
    Quando abro as Pendências de envio pelo ícone de sincronização
    E toco em Sincronizar agora
    Então a hora da última sincronização foi atualizada

  # ---- Sair e botões -----------------------------------------------------------------------
  @wip
  Cenário: 9.19 Sair mostra o aviso de despedida e volta ao login
    Dado que estou autenticado no app
    Quando saio pelo menu lateral
    Então vejo o aviso "Você saiu da sua conta. Até logo!" e a tela de login

  # T-019 + T-026 — padronização de botões: alturas por `bounds` (convertidas em dp), por id.
  @wip @leitura
  Cenário: 9.20 Botões principais têm a mesma altura padrão
    Dado que estou autenticado no app
    Quando abro o formulário de Agendar visita
    Então o botão principal do formulário segue a altura padrão de 54 dp

  # T-031 — Aniversários: nome em Primeira Maiúscula (negrito = quadro lido por mim).
  @wip @leitura
  Cenário: 9.21 Aniversários mostra o nome em formato de nome próprio
    Dado que estou autenticado no app
    Quando abro Aniversários pelo menu lateral
    E escolho o filtro Todos em Aniversários
    Então os nomes dos aniversariantes seguem a regra de nome próprio conforme a API

  # T-036 (5) — o primeiro elemento de Prescritores, Chat, Locais (campo de busca) e Relatórios (seletor de visão) ocupa o
  # MESMO lugar: mesmo bounds nos três campos de busca e o seletor de visão centrado na mesma altura. Só leitura de `bounds`.
  @wip @leitura
  Cenário: 9.22 Campo de busca de Prescritores, Chat e Locais e o seletor de Relatórios ficam no mesmo lugar
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E guardo a posição do elemento "locaisatendimento_campo_busca"
    E volto da tela de Locais de atendimento
    E acesso Prescritores pela barra inferior
    E guardo a posição do elemento "prescritores_campo_busca"
    E acesso Chat pela barra inferior
    E guardo a posição do elemento "chat_campo_busca"
    E acesso Relatórios pela barra inferior
    E guardo a posição do elemento "relatorios_visao_texto"
    Então os três campos de busca têm o mesmo bounds e o seletor de visão está centrado na mesma altura

  # T-039 (a) — "Sincronizar agora" roda a rodada sempre e dá o aviso de fim, mesmo logo ao abrir o app e 2x seguidas.
  @wip @leitura
  Cenário: 9.23 Sincronizar agora dá o aviso de fim logo ao abrir e duas vezes seguidas
    Dado que estou autenticado no app
    Quando abro as Pendências de envio pelo ícone de sincronização
    E toco em Sincronizar agora
    Então a hora da última sincronização foi atualizada
    Quando espero o aviso sumir
    E toco em Sincronizar agora
    Então a hora da última sincronização foi atualizada

  # T-041 (b) — app recém-limpo: o botão Sincronizar agora habilita bem antes dos 84–93 s medidos (os downloads antecipados
  # passaram a rodar em segundo plano, depois da rodada). Mede o tempo e fixa o teto em 45 s.
  @wip
  Cenário: 9.24 Sincronizar agora habilita em até 45 segundos num app recém-limpo
    Dado que estou autenticado no app
    Quando abro as Pendências de envio pelo ícone de sincronização
    Então o botão Sincronizar agora habilita em até 45 segundos

  # T-042 (a)(e) — as abas da barra nascem já com o dado (cópias em RAM na frente do SQLite): no 1º dump depois do toque o
  # conteúdo da aba já está na tela, sem passar por `*_indicador_carregando`; e a troca não trava (quadros lentos < 5 % e
  # nenhum "Skipped N frames" acima de 30 no logcat).
  @wip @leitura
  Cenário: 9.25 Trocar de aba da barra mostra o conteúdo no primeiro quadro, sem indicador e sem travar
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando toco nas cinco abas da barra inferior em 2 voltas medindo o tempo até o conteúdo
    Então em toda aba o conteúdo apareceu em até 2 segundos e as abas com cópia local não passaram pelo indicador de carregamento
    E a troca de abas teve menos de 5% de quadros lentos e nenhum salto acima de 30 quadros

  # T-042 (c) — repouso: com o app em segundo plano a RAM é liberada (log do app "liberada", 60 s depois de sair da tela) e
  # ao voltar sobe de novo ("aquecida"); as abas seguem abrindo com o conteúdo. Espera pelo log, não por tempo fixo.
  @wip
  Cenário: 9.26 Depois do repouso em segundo plano a RAM sobe de novo e as abas abrem com o conteúdo
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E que limpo o registro de chamadas HTTP do app
    Quando envio o app para segundo plano até a RAM ser liberada e volto
    Então o log do app registra a RAM liberada e depois aquecida
    Quando toco nas cinco abas da barra inferior em 1 volta medindo o tempo até o conteúdo
    Então em toda aba o conteúdo apareceu em até 2 segundos e as abas com cópia local não passaram pelo indicador de carregamento

  # T-042 (d) / T-045 (a) — sem rede as abas continuam abrindo com o conteúdo da cópia local. A pré-carga em segundo plano
  # (downloads antecipados, depois da sincronização) tem de ter terminado: a gravação em lote dela expulsava a 1ª página de
  # Prescritores da RAM (`T-045`).
  @wip @offline
  Cenário: 9.27 Sem rede as abas da barra continuam abrindo com o conteúdo da cópia
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E toco nas cinco abas da barra inferior em 3 voltas medindo o tempo até o conteúdo
    Então em toda aba o conteúdo apareceu em até 2 segundos e as abas com cópia local não passaram pelo indicador de carregamento

  # T-045 (b) — controle: logo depois de limpar os dados e logar (pré-carga ainda rodando) a 1ª página pode precisar do SQLite
  # na 1ª volta, mas as abas com cópia local têm de estabilizar (sem bolinha) a partir da 2ª volta. COM rede: sem rede logo
  # depois do login a sincronização ainda não trouxe as cópias e as abas de Prescritores e Chat não teriam o que mostrar.
  @wip
  Cenário: 9.28 Logo depois do login, com a pré-carga rodando, as abas com cópia local estabilizam a partir da 2ª volta
    Dado que estou autenticado no app
    Quando toco nas cinco abas da barra inferior em 3 voltas medindo o tempo até o conteúdo
    Então a partir da 2ª volta as abas com cópia local abriram em até 2 segundos sem passar pelo indicador de carregamento

  # T-048 (c) — controle: com rede o tempo todo nenhum `*_texto_offline` aparece em nenhuma tela (barra inferior, as três visões
  # de Relatórios, Secretárias e Locais). Janela de observação de 2 s por tela.
  @wip
  Cenário: 9.29 Com rede o tempo todo nenhum aviso offline aparece em nenhuma tela
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Então nenhuma tela mostra o aviso offline porque há rede

  # T-004 / T-017 — retrato fixo: girar o aparelho para paisagem não muda a tela (o app trava a orientação).
  @wip @leitura
  Cenário: 9.30 Girar o aparelho para paisagem não muda a tela do app
    Dado que estou autenticado no app
    Quando giro o aparelho para paisagem
    Então a tela de Visitas continua em retrato e à vista

  # T-016 — o link de e-mail da Ajuda abre o cliente de e-mail (intent externo) e voltar traz o app de volta. Nada é enviado.
  @wip @leitura
  Cenário: 9.31 Ajuda abre o cliente de e-mail com o e-mail de contato
    Dado que estou autenticado no app
    Quando abro Ajuda pelo menu lateral
    E toco no e-mail de contato
    Então o app sai de cena para outro aplicativo
    Quando volto para o app
    Então vejo a tela de Ajuda

  # T-009 — 1ª abertura: o app pergunta sobre notificações e recomenda a configuração de bateria; "Agora não" mostra o aviso de OK
  # e a cadeia termina no Login. O cenário apaga os dados e reabre o app (o `beforeScenario` já dispensou a cadeia da 1ª abertura).
  @wip
  Cenário: 9.32 A primeira abertura recomenda notificações e bateria e Agora não leva ao aviso e ao login
    Dado que estou na tela de login
    Quando apago os dados do app e abro o app como na primeira vez
    Então vejo a recomendação de notificações com as opções "Sim, quero" e "Agora não"
    Quando escolho Agora não na recomendação de notificações
    Então vejo o aviso de que as notificações podem ser ativadas depois e confirmo
    E vejo a recomendação de bateria com as opções "Abrir configurações" e "Agora não"
    Quando escolho Agora não na recomendação de bateria
    Então vejo o aviso de bateria e confirmo
    E volto para a tela de login

  # T-017 — fonte do sistema a 1,5×: nenhum item das telas sai da largura da janela (o texto quebra em vez de vazar). `@fonte`: o
  # `afterScenario` devolve a fonte ao padrão. Só leitura.
  @wip @fonte
  Esquema do Cenário: 9.33 Com a fonte do sistema a 1,5 vez os itens de <tela> cabem na largura da janela
    Dado que estou autenticado no app
    E aumento a fonte do sistema para 1,5 vez
    Quando abro <tela> pelo menu lateral
    Então todos os itens da tela <tela> cabem na largura da janela com a fonte ampliada

    Exemplos:
      | tela          |
      | Configurações |
      | Ajuda         |
      | Sobre         |

  # T-014 — Pendências lista a operação que ficou na fila sem rede (tipo, estado, descrição, criada em) e o contador mostra 1. O cenário
  # apaga os dados ANTES de a rede voltar: nada chega ao tenant.
  @wip @offline
  Cenário: 9.34 Sem rede a visita agendada aparece nas Pendências com tipo, estado e descrição
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    E toco em Salvar no formulário de visita
    Então a visita fica na fila do aparelho e a API continua com 0 visitas de teste abertas
    Quando abro as Pendências de envio pelo ícone de sincronização
    Então as Pendências listam uma operação pendente com tipo, estado, descrição e data de criação
    Quando encerro o app e apago os dados antes de religar a rede

  # T-014 — Aniversários abre da cópia do aparelho sem rede, com o aviso offline e a lista do mês. VERMELHO DE PROPÓSITO (`[R-CAUSA]`):
  # no APK `T-048` o app mostra o erro "Não foi possível conectar…" em vez da cópia — achado `A-015`, pedido `Q-015`.
  @wip @offline
  Cenário: 9.35 Sem rede Aniversários abre da cópia do aparelho com o aviso offline
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E abro Aniversários pelo menu lateral
    Então o aviso offline "aniversarios_texto_offline" aparece em até 5 segundos
