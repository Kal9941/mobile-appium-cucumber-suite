# language: pt
Funcionalidade: Chat
  Como representante
  Quero ver minhas conversas
  Para falar com os contatos da empresa

  @wip @leitura
  Cenário: 4.1 Acessa a tela de Chat e renderiza as informações corretamente
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    Então vejo a busca e a lista de contatos ou o estado vazio

  # T-031 — nome do contato em Primeira Maiúscula; negrito = quadro lido por mim.
  @wip @leitura
  Cenário: 4.2 Lista de contatos mostra o nome em formato de nome próprio
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    Então os nomes dos contatos seguem a regra de nome próprio conforme a API

  @wip @leitura
  Cenário: 4.3 Cada contato mostra a última mensagem e a data conforme a API
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    Então os contatos visíveis mostram a última mensagem e a data conforme a API

  @wip @leitura
  Cenário: 4.4 Busca por nome filtra os contatos conforme a API
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    E busco "fabricio" nos contatos do chat
    Então a lista do chat mostra só os contatos da API que contêm "fabricio"

  # Abrir a conversa marca as mensagens como lidas (`POST /chat/lidas`) — efeito conhecido e inofensivo.
  @wip @leitura
  Cenário: 4.5 Abrir a conversa mostra o contato e as últimas mensagens conforme a API
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    E abro a conversa com o primeiro contato da lista
    Então a conversa mostra o contato e as últimas mensagens conforme a API

  @wip @leitura
  Cenário: 4.6 Teclado não sobe sozinho ao abrir a conversa
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    E abro a conversa com o primeiro contato da lista
    Então o teclado está fechado

  # T-010 — nunca envia: só digita. O campo precisa ficar acima do teclado (medido pelos `bounds`).
  @wip @leitura
  Cenário: 4.7 Enviar só habilita com texto e o campo fica acima do teclado
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    E abro a conversa com o primeiro contato da lista
    Então o botão de enviar está desabilitado com o campo vazio
    Quando digito "Teste Appium: não enviar" no campo de mensagem sem enviar
    Então o botão de enviar está habilitado e o campo de mensagem fica acima do teclado

  # T-010 — chave Disponível/Ocupado na barra do Chat. Muda a presença REAL do usuário de teste:
  # o original é registrado e devolvido SEMPRE no afterScenario (BackendService.limparMassaDeTeste).
  @wip
  Cenário: 4.8 Chave Disponível/Ocupado muda a presença na API e volta ao original
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    Então a chave de disponibilidade mostra o estado da API
    Quando toco na chave de disponibilidade
    Então a API reflete a disponibilidade invertida e o texto da chave muda
    Quando toco na chave de disponibilidade
    Então a API volta à disponibilidade original e o texto da chave volta

  # T-010 — a bolinha de cada contato reflete a disponibilidade da API (id + atributo, nunca a cor).
  @wip @leitura
  Cenário: 4.9 Bolinha de disponibilidade de cada contato reflete a API
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    Então a bolinha de disponibilidade dos contatos visíveis reflete a API

  # T-041 (a) — app recém-limpo: a chave Disponível/Ocupado aparece em poucos segundos (o app consulta `GET /funcionarios/eu`
  # ao abrir o Chat), sem esperar a 1ª sincronização completa (~90 s antes). Só lê: não toca na chave.
  @wip
  Cenário: 4.10 Chave de disponibilidade aparece em poucos segundos num app recém-limpo
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    Então a chave de disponibilidade aparece em até 15 segundos e mostra o estado da API

  # T-047 (a) — sem rede o Chat mostra o aviso offline junto da lista da cópia e o aviso some quando a rede volta.
  @wip @offline
  Cenário: 4.11 Sem rede o Chat mostra o aviso offline e ele some quando a rede volta
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E acesso Chat pela barra inferior
    Então o aviso offline "chat_texto_offline" aparece em até 2 segundos
    Quando religo a rede do aparelho
    Então o aviso offline "chat_texto_offline" some em até 180 segundos

  # T-010 — limite do campo de mensagem (2000 no total; cada caractere comum conta 1 e cada emoji conta 10). Nunca envia.
  @wip @leitura
  Cenário: 4.12 O campo de mensagem limita o texto comum a 2000 caracteres
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    E abro a conversa com o primeiro contato da lista
    E digito 2100 caracteres no campo de mensagem sem enviar
    Então o campo de mensagem guarda exatamente 2000 caracteres

  @wip @leitura
  Cenário: 4.13 O campo de mensagem conta cada emoji como 10 e para em 200 emojis
    Dado que estou autenticado no app
    Quando acesso Chat pela barra inferior
    E abro a conversa com o primeiro contato da lista
    E digito 250 emojis no campo de mensagem sem enviar
    Então o campo de mensagem guarda exatamente 200 emojis

  # T-010 — sem rede a mensagem vira balão pendente (`chatconversa_pendente_<i>`). O cenário apaga os dados ANTES de a rede voltar:
  # a mensagem nunca chega ao contato.
  @wip @offline
  Cenário: 4.14 Sem rede a mensagem enviada fica pendente de envio na conversa
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Quando acesso Chat pela barra inferior
    E abro a conversa com o primeiro contato da lista
    E desligo a rede do aparelho
    E digito "Teste Appium: pendente sem rede" no campo de mensagem sem enviar
    E toco em Enviar na conversa
    Então a conversa mostra uma mensagem pendente de envio
    Quando encerro o app e apago os dados antes de religar a rede
