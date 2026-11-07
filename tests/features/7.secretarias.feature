# language: pt
Funcionalidade: Secretárias
  Como representante
  Quero ver a lista de secretárias(os)
  Para consultar os contatos dos meus prescritores

  @wip @leitura
  Cenário: 7.1 Acessa a tela de Secretárias e renderiza as informações corretamente
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    Então vejo os filtros e a lista de secretárias conforme a API

  # T-031 — nome em Primeira Maiúscula; negrito = quadro lido por mim.
  @wip @leitura
  Cenário: 7.2 Lista de Secretárias mostra o nome em formato de nome próprio
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    Então os nomes da lista de secretárias seguem a regra de nome próprio conforme a API

  @wip @leitura
  Cenário: 7.3 Filtro Todas mostra todas as secretárias do tenant conforme a API
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E escolho o filtro Todas na lista de secretárias
    Então a lista de secretárias mostra a quantidade de secretárias do tenant conforme a API

  @wip @leitura
  Cenário: 7.4 Abrir uma secretária mostra o formulário de edição com os dados da API
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E abro a primeira secretária da lista
    Então o formulário de edição da secretária mostra nome, data de nascimento e e-mail conforme a API

  @wip @leitura
  Cenário: 7.5 Formulário Incluir secretária mostra as abas e os campos
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E toco no botão + de Secretárias
    Então vejo o formulário Incluir secretária com as abas e os campos

  # T-004 — "Preencha: Nome, Sexo, Telefone 1 com DDD." e nada gravado.
  @wip @leitura
  Cenário: 7.6 Salvar o formulário vazio lista os obrigatórios e não grava
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E toco no botão + de Secretárias
    E toco em Salvar no formulário de secretária
    Então vejo a mensagem "Preencha: Nome, Sexo, Telefone 1 com DDD." e nenhuma secretária nova na API
    E o campo Nome da secretária mostra o erro "Obrigatório"

  @wip @leitura
  Cenário: 7.7 Voltar do formulário de secretária com texto digitado pergunta se descarta
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E toco no botão + de Secretárias
    E digito "Teste Appium Rascunho" no nome da secretária
    E toco na seta de voltar do formulário de secretária
    Então vejo o pop-up Descartar alterações com Continuar e Descartar
    Quando escolho Descartar
    Então volto para a lista de secretárias

  # T-013 — telefone com máscara única e CEP pelo ViaCEP, sem gravar nada.
  @wip @leitura
  Cenário: 7.8 Telefone da secretária aceita só dígitos e aplica a máscara
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E toco no botão + de Secretárias
    E abro a aba Contato do formulário de secretária
    E digito "11999998888" no telefone 1 da secretária
    Então o telefone 1 da secretária mostra "(62) 9 9322-5337"

  @wip @leitura
  Cenário: 7.9 CEP preenche o endereço da secretária pelo ViaCEP
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E toco no botão + de Secretárias
    E abro a aba Endereço do formulário de secretária
    E digito o CEP "01001000" no endereço da secretária
    Então o endereço da secretária foi preenchido pelo CEP com a Praça da Sé

  @wip @leitura
  Cenário: 7.10 Aba Vínculos da secretária lista prescritor e local conforme a API
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E abro a primeira secretária da lista
    E abro a aba Vínculos do formulário de secretária
    Então a aba Vínculos lista os prescritores e locais da secretária conforme a API

  # T-024 — "Vincular prescritor e local" (sem o "+" de antes).
  @wip @leitura
  Cenário: 7.11 Botão da aba Vínculos tem o texto padronizado
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E abro a primeira secretária da lista
    E abro a aba Vínculos do formulário de secretária
    Então o botão de vincular da secretária mostra "Vincular prescritor e local"

  # T-047 (a) / T-038 (f) — sem rede a lista de Secretárias mostra o aviso offline e ele some quando a rede volta.
  @wip @offline
  Cenário: 7.12 Sem rede a lista de Secretárias mostra o aviso offline e ele some quando a rede volta
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando desligo a rede do aparelho
    E acesso Secretárias pelo menu lateral
    Então o aviso offline "secretarias_texto_offline" aparece em até 2 segundos
    Quando religo a rede do aparelho
    Então o aviso offline "secretarias_texto_offline" some em até 180 segundos

  # T-004 — Salvar alcançável com o teclado aberto: o toque chega ao botão e o formulário vazio mostra os obrigatórios (nada é gravado).
  @wip @leitura
  Cenário: 7.14 Salvar do formulário de secretária continua alcançável com o teclado aberto
    Dado que estou autenticado no app
    Quando acesso Secretárias pelo menu lateral
    E toco no botão + de Secretárias
    E toco no campo Nome do formulário de secretária e o teclado abre
    E toco em Salvar do formulário de secretária com o teclado aberto
    Então o formulário de secretária mostra o resumo dos campos obrigatórios que faltam

  # T-004 — abrir a lista de Secretárias não trava a tela: nenhum "Skipped N frames" acima de 60 no logcat (o critério do pedido).
  @wip @leitura
  Cenário: 7.15 Abrir a lista de Secretárias não trava a tela
    Dado que estou autenticado no app
    E que começo a medir a fluidez do app
    Quando acesso Secretárias pelo menu lateral
    E aguardo a lista de secretárias carregar
    Então a fluidez medida não teve nenhum salto acima de 60 quadros
