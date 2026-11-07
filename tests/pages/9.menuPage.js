import { BasePage } from './BasePage.js'

// Casca de navegação: barra inferior (§11.1) e menu lateral (§11.4) de
// prime-visita-3/.agents/PROJECT_CONTEXT.md. Page Object transversal — as demais
// features navegam por aqui, nunca repetem os seletores da casca.
const BARRA_INFERIOR = {
  prescritores: 'visitas_bottomnav_prescritores',
  ponto: 'visitas_bottomnav_registroponto',
  visitas: 'visitas_bottomnav_visitas',
  relatorios: 'visitas_bottomnav_relatorios',
  chat: 'visitas_bottomnav_chat',
}

// Opções do menu lateral (as de Relatórios/Prescritores/Pendências/Sincronizar
// saíram dele em 2026-10-11 — app §11.4).
export const OPCOES_MENU_LATERAL = {
  secretarias: 'menulateral_opcao_secretarias',
  locais: 'menulateral_opcao_locaisatendimento',
  aniversarios: 'menulateral_opcao_aniversarios',
  configuracoes: 'menulateral_opcao_configuracoes',
  sobre: 'menulateral_opcao_sobre',
  ajuda: 'menulateral_opcao_ajuda',
  sair: 'menulateral_opcao_sair',
}

export class MenuPage extends BasePage {
  async irPelaBarraInferior(destino) {
    await this.tocar(BARRA_INFERIOR[destino])
  }

  // O ☰ da Visitas tem tag própria; nas demais telas da barra é `<prefixo>_menu_hamburguer`.
  async abrirMenuLateral(tagHamburguer = 'visitas_menu_hamburguer') {
    await this.tocar(tagHamburguer)
    await this.esperarVisivel('menulateral_modal')
  }

  async escolherOpcao(opcao) {
    await this.tocar(OPCOES_MENU_LATERAL[opcao])
  }

  async sair() {
    await this.abrirMenuLateral()
    await this.escolherOpcao('sair')
  }
}
