# language: pt
Funcionalidade: Prescritores
  Como representante
  Quero ver a lista de prescritores
  Para consultar e vincular médicos

  @wip @leitura
  Cenário: 6.1 Acessa a tela de Prescritores e renderiza as informações corretamente
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    Então vejo a busca, os filtros e a lista de prescritores conforme a API

  # T-031 — nome em Primeira Maiúscula; negrito só no nome (quadro lido por mim, `[R-ID]`).
  @wip @leitura
  Cenário: 6.2 Lista de Prescritores mostra nome e especialidade em formato de nome próprio
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    Então os nomes da lista de prescritores seguem a regra de nome próprio conforme a API

  @wip @leitura
  Cenário: 6.3 Busca por nome filtra a lista conforme a API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E busco "farinelli" na lista de prescritores
    Então a lista de prescritores mostra só os resultados da API para "farinelli"

  @wip @leitura
  Cenário: 6.4 Limpar a busca devolve a lista completa
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E busco "farinelli" na lista de prescritores
    E limpo a busca da lista de prescritores
    Então a busca está vazia e a lista de prescritores voltou ao topo

  @wip @leitura
  Cenário: 6.5 Cabeçalhos separam vinculados a mim dos outros prescritores
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    Então os prescritores acima de "Outros prescritores" são vinculados a mim conforme a API

  @wip @leitura
  Cenário: 6.6 Detalhe do prescritor mostra os dados conforme a API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    Então o detalhe do prescritor mostra nome, CRM, telefone, endereço, situação e vínculo conforme a API

  @wip @leitura
  Cenário: 6.7 Abas Locais e Secretárias do detalhe mostram a contagem conforme a API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    Então as abas Locais e Secretárias do detalhe mostram a contagem de vinculados conforme a API

  @wip @leitura
  Cenário: 6.8 Formulário Incluir prescritor mostra as abas e os campos
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    Então vejo o formulário Incluir prescritor com as abas e os campos

  # T-004 — obrigatórios em uma mensagem única; não grava nada (a API não ganha prescritor novo).
  @wip @leitura
  Cenário: 6.9 Salvar o formulário vazio lista todos os obrigatórios e não grava
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    E toco em Salvar no formulário de prescritor
    Então vejo a mensagem "Preencha: UF, Número, Nome, Sexo, Especialidade." e nenhum prescritor novo na API
    E o campo Nome do prescritor mostra o erro "Obrigatório"

  @wip @leitura
  Cenário: 6.10 Voltar do formulário de prescritor com texto digitado pergunta se descarta
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    E digito "Teste Appium Rascunho" no nome do prescritor
    E toco na seta de voltar do formulário de prescritor
    Então vejo o pop-up Descartar alterações com Continuar e Descartar
    Quando escolho Descartar
    Então volto para a lista de prescritores

  # ---- filtros, abas do detalhe e formulário (lote 2 do mapeamento) ----------------------------
  @wip @leitura
  Cenário: 6.11 Filtro por grupo restringe a lista conforme a API e limpar volta
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E escolho o primeiro grupo no filtro de prescritores
    Então a lista de prescritores mostra só prescritores do grupo escolhido conforme a API
    Quando limpo os filtros da lista de prescritores
    Então o botão de limpar filtros some

  @wip @leitura
  Cenário: 6.12 Filtro por especialidade restringe a lista conforme a API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E escolho a primeira especialidade no filtro de prescritores
    Então a lista de prescritores mostra só prescritores da especialidade escolhida conforme a API

  @wip @leitura
  Cenário: 6.13 Aba Locais do detalhe lista os locais vinculados conforme a API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    E abro a aba Locais do detalhe do prescritor
    Então a aba Locais lista os locais vinculados do prescritor conforme a API

  @wip @leitura
  Cenário: 6.14 Aba Secretárias do detalhe lista as secretárias vinculadas conforme a API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    E abro a aba Secretárias do detalhe do prescritor
    Então a aba Secretárias lista as secretárias vinculadas do prescritor conforme a API

  @wip @leitura
  Cenário: 6.15 Aba Gráfico do detalhe mostra o total do ano e navega entre anos conforme a API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    E abro a aba Gráfico do detalhe do prescritor
    Então o gráfico mostra o ano atual e o total de visitas do ano conforme a API
    Quando volto um ano no gráfico do prescritor
    Então o gráfico mostra o ano anterior e o total de visitas conforme a API

  # T-013 — telefone com máscara única, DDD separado só no envio.
  @wip @leitura
  Cenário: 6.16 Telefone do prescritor aceita só dígitos e aplica a máscara
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    E abro a aba Contato do formulário de prescritor
    E digito "11999998888" no telefone 1 do prescritor
    Então o telefone 1 do prescritor mostra "(62) 9 9322-5337"

  # T-013 — CEP preenche endereço/bairro (ViaCEP, dado público) sem gravar nada.
  @wip @leitura
  Cenário: 6.17 CEP preenche o endereço do prescritor pelo ViaCEP
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    E abro a aba Endereço do formulário de prescritor
    E digito o CEP "01001000" no endereço do prescritor
    Então o endereço do prescritor foi preenchido pelo CEP com a Praça da Sé

  @wip @leitura
  Cenário: 6.18 Seletor de conselho mostra a lista com busca
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    E toco no campo Conselho do formulário de prescritor
    Então vejo o seletor de conselho com busca e lista

  # T-024 + T-036 — os botões "+ Novo local" / "+ Nova secretária" viraram "+" flutuante sem texto visível: o rótulo está só no content-desc do id.
  @wip @leitura
  Cenário: 6.19 Botões do detalhe do prescritor têm o texto padronizado
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    E abro a aba Locais do detalhe do prescritor
    Então o botão de novo local é um "+" sem texto e tem a descrição "Novo local"
    Quando abro a aba Secretárias do detalhe do prescritor
    Então o botão de nova secretária é um "+" sem texto e tem a descrição "Nova secretária"

  # T-036 (4) — Locais numa lista só: vinculados primeiro, depois os demais; cabeçalhos; "Vincular"/"Desvincular" por item.
  # Só leitura: nenhum vínculo é gravado. Os ids do filtro antigo deixaram de existir.
  @wip @leitura
  Cenário: 6.20 Aba Locais lista os vinculados antes dos demais conforme a API e os ids antigos não existem
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    E abro a aba Locais do detalhe do prescritor
    Então a lista de Locais mostra os vinculados antes dos demais conforme a API e os ids antigos não existem

  # T-036 (4) — Secretárias na mesma lógica: vinculadas primeiro, busca própria, e os ids do seletor antigo não existem.
  @wip @leitura
  Cenário: 6.21 Aba Secretárias lista as vinculadas antes das outras conforme a API e os ids antigos não existem
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    E abro a aba Secretárias do detalhe do prescritor
    Então a lista de Secretárias mostra as vinculadas antes das outras conforme a API e os ids antigos não existem

  # T-038 (1)(b) — a busca digitada tecla a tecla não faz a lista sumir nem piscar: `prescritores_lista` presente a cada tecla.
  @wip @leitura
  Cenário: 6.22 Digitar na busca de prescritores mantém a lista na tela a cada tecla
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    Então a lista de prescritores continua na tela a cada tecla digitada em "mar"

  # T-042 (b) — dado não velho: vincular e desvincular um prescritor pela lista faz a lista acompanhar na hora (o cartão sobe para
  # "Vinculados a mim" e volta para "Outros prescritores") e a API reflete. GRAVA o vínculo no tenant e o desfaz no próprio cenário.
  @wip
  Cenário: 6.23 Vincular e desvincular um prescritor pela lista é acompanhado pela lista e pela API
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E guardo o primeiro prescritor de Outros prescritores
    E toco em Vincular a mim no prescritor guardado
    Então o prescritor guardado está entre os vinculados a mim na lista e na API
    Quando toco em Desvincular no prescritor guardado
    Então o prescritor guardado voltou para Outros prescritores na lista e na API

  # T-038 (5)(e) — o botão do detalhe diz "Editar prescritor" (a Nord exibe em maiúsculas) e abre o formulário de edição com os dados
  # da API. Só leitura: nada é alterado nem salvo.
  @wip @leitura
  Cenário: 6.24 O botão Editar do detalhe do prescritor diz Editar prescritor e abre o formulário de edição
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    Então o botão Editar do detalhe do prescritor diz "Editar prescritor"
    Quando toco no botão Editar do detalhe do prescritor
    Então o formulário de edição do prescritor mostra o nome conforme a API

  # T-004 — Salvar alcançável com o teclado aberto: o toque chega ao botão e o formulário vazio mostra os obrigatórios (nada é gravado).
  @wip @leitura
  Cenário: 6.25 Salvar do formulário de prescritor continua alcançável com o teclado aberto
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    E toco no campo Nome do formulário de prescritor e o teclado abre
    E toco em Salvar do formulário de prescritor com o teclado aberto
    Então o formulário de prescritor mostra o resumo dos campos obrigatórios que faltam

  # T-014 — sem rede o detalhe do prescritor abre da cópia do aparelho e as abas Locais e Secretárias listam os vínculos conforme a API.
  @wip @offline
  Cenário: 6.26 Sem rede o detalhe do prescritor mostra as abas Locais e Secretárias da cópia do aparelho
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    E espero a pré-carga em segundo plano terminar
    Quando acesso Prescritores pela barra inferior
    E abro o detalhe do primeiro prescritor da lista
    E desligo a rede do aparelho
    E abro a aba Locais do detalhe do prescritor
    Então a aba Locais lista os locais vinculados do prescritor conforme a API
    Quando abro a aba Secretárias do detalhe do prescritor
    Então a aba Secretárias lista as secretárias vinculadas do prescritor conforme a API

  # T-013 — a caixa "Vincular a mim" do formulário de prescritor nasce marcada, tem o texto no próprio componente (LinhaCheckbox) e
  # alterna ao tocar na linha. Só leitura: o formulário não é salvo.
  @wip @leitura
  Cenário: 6.27 A caixa Vincular a mim do formulário nasce marcada, tem o texto no componente e alterna ao tocar
    Dado que estou autenticado no app
    Quando acesso Prescritores pela barra inferior
    E toco no botão + de Prescritores
    Então a caixa "Vincular a mim" do formulário de prescritor está marcada
    Quando toco na caixa Vincular a mim do formulário de prescritor
    Então a caixa "Vincular a mim" do formulário de prescritor está desmarcada
