# language: pt
Funcionalidade: Login
  Como representante
  Quero autenticar com CNPJ, usuário e senha
  Para acessar a tela de Visitas

  Cenário: 1.1 Autentica com credenciais válidas
    Dado que estou na tela de login
    Quando informo CNPJ, usuário e senha válidos
    Então vejo a tela de Visitas

  Cenário: 1.2 Efetua logout após autenticação
    Dado que estou na tela de login
    Quando informo CNPJ, usuário e senha válidos
    Então vejo a tela de Visitas
    Quando saio pelo menu lateral
    Então volto para a tela de login

  Cenário: 1.3 Não autentica com senha inválida
    Dado que estou na tela de login
    Quando informo CNPJ e usuário válidos e uma senha inválida
    Então permaneço na tela de login com a mensagem de erro
    Quando informo CNPJ, usuário e senha válidos
    Então vejo a tela de Visitas

  # T-022 — o rodapé "PRIME SOFTWARE" só aparece com o teclado fechado.
  @wip
  Cenário: 1.4 Rodapé some com o teclado aberto e volta ao fechar
    Dado que estou na tela de login
    Então o rodapé da tela de login está visível
    Quando toco no campo CNPJ e o teclado abre
    Então o rodapé da tela de login não está visível e o botão Acessar continua alcançável
    Quando fecho o teclado
    Então o rodapé da tela de login está visível

  @wip
  Cenário: 1.5 Campo CNPJ aceita só dígitos, no máximo 14, com máscara
    Dado que estou na tela de login
    Quando digito "ab11.111.111/1111-11999" no campo CNPJ
    Então o campo CNPJ mostra "11.111.111/1111-11"

  @wip
  Cenário: 1.6 Campo Usuário aceita só dígitos
    Dado que estou na tela de login
    Quando digito "1x2y3" no campo Usuário
    Então o campo Usuário mostra "123"

  @wip
  Cenário: 1.7 Acessar com os campos vazios pede o preenchimento e não sai do login
    Dado que estou na tela de login
    Quando toco em Acessar sem preencher nada
    Então vejo a mensagem "Preencha CNPJ, usuário e senha." e permaneço na tela de login

  # T-003 (a) — sessão persistente: fechar e reabrir entra direto em Visitas, com e sem rede.
  @wip
  Cenário: 1.8 Reabrir o app depois do login entra direto em Visitas
    Dado que estou na tela de login
    Quando informo CNPJ, usuário e senha válidos
    Então vejo a tela de Visitas
    Quando reinicio o app sem limpar os dados
    Então vejo a tela de Visitas sem passar pelo login

  @wip @offline
  Cenário: 1.9 Reabrir o app sem rede entra direto em Visitas com os dados do aparelho
    Dado que estou na tela de login
    Quando informo CNPJ, usuário e senha válidos
    Então vejo a tela de Visitas
    Quando desligo a rede do aparelho
    E reinicio o app sem limpar os dados
    Então vejo a tela de Visitas sem passar pelo login

  # T-016 — "Solicite teste grátis": só o formulário e as validações; NUNCA envia (cria contato comercial real).
  @wip
  Cenário: 1.10 Link de teste grátis abre o formulário e volta ao login
    Dado que estou na tela de login
    Quando toco em Solicite teste grátis
    Então vejo o formulário de teste grátis
    Quando volto pela seta do app
    Então volto para a tela de login

  # T-033 + T-034 — olhinho de mostrar/ocultar a senha. O estado se lê no `content-desc` do próprio botão
  # ("Mostrar senha" ↔ "Ocultar senha"); o `password` do campo NÃO reflete o estado. Era `@skip` até o
  # `Q-002` (feito pelo app em 2026-10-14, `T-034`).
  @wip
  Cenário: 1.11 Olhinho mostra e oculta a senha e o login com a senha à vista entra
    Dado que estou na tela de login
    Quando digito a senha válida no campo Senha
    Então a senha está oculta
    Quando toco no olhinho da senha
    Então a senha está à vista com o texto digitado
    Quando toco no olhinho da senha
    Então a senha está oculta
    Quando toco no olhinho da senha
    E informo CNPJ, usuário e senha válidos
    Então vejo a tela de Visitas

  # T-038 (4)(d) — os campos do login têm content-desc ("CNPJ", "Usuário", "Senha") e o botão diz "Acessar" (a Nord exibe em maiúsculas).
  @wip
  Cenário: 1.12 Campos do login têm descrição para leitor de tela e o botão diz Acessar
    Dado que estou na tela de login
    Então os campos do login têm a descrição CNPJ, Usuário e Senha e o botão diz Acessar

  # T-003 (d) / T-042 (b) — outro usuário no mesmo aparelho: depois de sair e entrar com o 2º usuário de teste
  # (`credentialsOutroUsuario` do `env.local.json`), nada do 1º aparece: as visitas e os prescritores vinculados vêm do 2º,
  # conforme a API dele (os dois usuários têm dados bem diferentes no tenant de teste).
  @wip
  Cenário: 1.13 Entrar com outro usuário no mesmo aparelho não mostra nada do usuário anterior
    Dado que estou autenticado no app
    E espero a sincronização do login terminar
    Quando saio pelo menu lateral
    Então volto para a tela de login
    Quando informo CNPJ, usuário e senha do outro usuário
    Então as visitas na tela são só as do outro usuário conforme a API dele
    Quando acesso Prescritores pela barra inferior
    Então os prescritores vinculados a mim são os do outro usuário conforme a API dele

  # T-003 (c) — "Sair" com envio pendente (visita agendada sem rede): o modal avisa e oferece três saídas. Cancelar fecha e
  # continua logado; "Sair mesmo assim" leva ao login (a fila fica no aparelho, e o cenário a apaga antes de a rede voltar).
  @wip @offline
  Cenário: 1.14 Sair com envio pendente avisa e oferece sincronizar, sair mesmo assim ou cancelar
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    E toco em Salvar no formulário de visita
    Então a visita fica na fila do aparelho e a API continua com 0 visitas de teste abertas
    Quando saio pelo menu lateral
    Então vejo o modal Sair com 1 envio pendente e as opções Sincronizar, Sair mesmo assim e Cancelar
    Quando escolho Cancelar no modal Sair
    Então o modal Sair fecha e continuo logado em Visitas
    Quando saio pelo menu lateral
    E escolho Sair mesmo assim no modal Sair
    Então volto para a tela de login
    Quando encerro o app e apago os dados antes de religar a rede

  # T-003 (c) — "Sincronizar antes de sair" dispara a fila e abre as Pendências sem sair; sem rede o envio fica pendente.
  @wip @offline
  Cenário: 1.15 Sincronizar antes de sair abre as Pendências e continua logado com o envio ainda pendente
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    E toco em Salvar no formulário de visita
    Então a visita fica na fila do aparelho e a API continua com 0 visitas de teste abertas
    Quando saio pelo menu lateral
    E escolho Sincronizar no modal Sair
    Então vejo as Pendências com 1 envio pendente e continuo logado
    Quando encerro o app e apago os dados antes de religar a rede

  # T-003 (d) — outro funcionário entra no aparelho com a fila do anterior: aviso `login_outro_usuario_dialogo`. A visita da fila
  # nunca chega ao tenant: o 1º usuário sai (a fila fica no aparelho) e quem entra é o 2º; Cancelar mantém o Login sem descartar.
  @wip @offline
  Cenário: 1.16 Outro usuário entrando com a fila do anterior vê o aviso e Cancelar mantém o login
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    E toco em Salvar no formulário de visita
    Então a visita fica na fila do aparelho e a API continua com 0 visitas de teste abertas
    Quando saio pelo menu lateral
    E escolho Sair mesmo assim no modal Sair
    Então volto para a tela de login
    Quando religo a rede do aparelho
    E informo CNPJ, usuário e senha do outro usuário
    Então vejo o aviso de outro usuário no aparelho com Descartar e entrar e Cancelar
    Quando escolho Cancelar no aviso de outro usuário
    Então continuo na tela de login sem o aviso
    Quando encerro o app e apago os dados antes de religar a rede

  # T-003 (d) — "Descartar e entrar" apaga a fila do anterior e entra: nada pendente e nenhuma visita criada no tenant.
  @wip @offline
  Cenário: 1.17 Descartar e entrar apaga a fila do usuário anterior e entra com o outro usuário
    Dado que há um horário livre hoje para agendar visitas de teste
    E que estou autenticado no app
    E espero a sincronização do login terminar
    Quando desligo a rede do aparelho
    E abro o formulário de Agendar visita
    E preencho o formulário de Agendar com a hora base mais 0 minutos
    E toco em Salvar no formulário de visita
    Então a visita fica na fila do aparelho e a API continua com 0 visitas de teste abertas
    Quando saio pelo menu lateral
    E escolho Sair mesmo assim no modal Sair
    Então volto para a tela de login
    Quando religo a rede do aparelho
    E informo CNPJ, usuário e senha do outro usuário
    E escolho Descartar e entrar no aviso de outro usuário
    Então vejo a tela de Visitas
    Quando abro as Pendências de envio pelo ícone de sincronização
    Então as Pendências mostram nada pendente de envio
    E a API não tem visitas de teste abertas

  # T-017 — fonte do sistema a 1,5×: campos, botão e links do login seguem dentro da janela e o botão Acessar continua alcançável.
  @wip @fonte
  Cenário: 1.18 Com a fonte do sistema a 1,5 vez o login cabe na largura da janela
    Dado que estou na tela de login
    Quando aumento a fonte do sistema para 1,5 vez
    Então os campos e o botão do login cabem na largura da janela com a fonte ampliada
