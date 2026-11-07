# language: pt
Funcionalidade: Locais de atendimento
  Como representante
  Quero ver a lista de locais de atendimento
  Para consultar onde atendo meus prescritores

  @wip @leitura
  Cenário: 8.1 Acessa a tela de Locais de atendimento e renderiza as informações corretamente
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    Então vejo a busca, os filtros e a lista de locais conforme a API

  # T-031 — nome em negrito e endereço em Primeira Maiúscula (negrito = quadro lido por mim).
  @wip @leitura
  Cenário: 8.2 Lista de Locais mostra nome e endereço em formato de nome próprio
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    Então os nomes e endereços da lista de locais seguem a regra de nome próprio conforme a API

  @wip @leitura
  Cenário: 8.3 Busca por nome filtra a lista de locais em memória conforme a API
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E escolho o filtro Todos na lista de locais
    E busco "absolut" na lista de locais
    Então a lista de locais mostra só os locais da API que contêm "absolut"

  @wip @leitura
  Cenário: 8.4 Filtro Todos mostra mais locais que Meus conforme a API
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E escolho o filtro Todos na lista de locais
    Então a lista de locais mostra mais locais que o filtro Meus conforme a API

  @wip @leitura
  Cenário: 8.5 Abrir um local mostra o formulário de edição com os dados da API
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E abro o primeiro local da lista
    Então o formulário de edição do local mostra o nome conforme a API

  @wip @leitura
  Cenário: 8.6 Formulário Incluir local mostra as abas e os campos
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E toco no botão + de Locais
    Então vejo o formulário Incluir local com as abas e os campos

  # T-004 — "Preencha: Nome, Endereço, UF e cidade, Telefone 1 com DDD." e nada gravado.
  @wip @leitura
  Cenário: 8.7 Salvar o formulário vazio lista os obrigatórios e não grava
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E toco no botão + de Locais
    E toco em Salvar no formulário de local
    Então vejo a mensagem "Preencha: Nome, Endereço, UF e cidade, Telefone 1 com DDD." e nenhum local novo na API
    E o campo Nome do local mostra o erro "Obrigatório"

  @wip @leitura
  Cenário: 8.8 Voltar do formulário de local com texto digitado pergunta se descarta
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E toco no botão + de Locais
    E digito "Teste Appium Rascunho" no nome do local
    E toco na seta de voltar do formulário de local
    Então vejo o pop-up Descartar alterações com Continuar e Descartar
    Quando escolho Descartar
    Então volto para a lista de locais

  # T-013 — contato com máscara de telefone e CEP pelo ViaCEP, sem gravar nada.
  @wip @leitura
  Cenário: 8.9 Aba Contato do local mostra telefone com máscara, fax e e-mail
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E toco no botão + de Locais
    E abro a aba Contato do formulário de local
    E digito "6239524113" no telefone 1 do local
    Então o telefone 1 do local mostra "(62) 3952-4113" e vejo os campos fax e e-mail

  @wip @leitura
  Cenário: 8.10 CEP preenche o endereço do local pelo ViaCEP
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E toco no botão + de Locais
    E abro a aba Endereço do formulário de local
    E digito o CEP "01001000" no endereço do local
    Então o endereço do local foi preenchido pelo CEP com a Praça da Sé

  # T-047 (a) — sem rede a lista de Locais mostra o aviso offline e ele some quando a rede volta.
  @wip @offline
  Cenário: 8.11 Sem rede a lista de Locais mostra o aviso offline e ele some quando a rede volta
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E acesso Locais de atendimento pelo menu lateral
    Então o aviso offline "locaisatendimento_texto_offline" aparece em até 2 segundos
    Quando religo a rede do aparelho
    Então o aviso offline "locaisatendimento_texto_offline" some em até 180 segundos

  # T-004 — Salvar alcançável com o teclado aberto: o toque chega ao botão e o formulário vazio mostra os obrigatórios (nada é gravado).
  @wip @leitura
  Cenário: 8.12 Salvar do formulário de local continua alcançável com o teclado aberto
    Dado que estou autenticado no app
    Quando acesso Locais de atendimento pelo menu lateral
    E toco no botão + de Locais
    E toco no campo Nome do formulário de local e o teclado abre
    E toco em Salvar do formulário de local com o teclado aberto
    Então o formulário de local mostra o resumo dos campos obrigatórios que faltam
