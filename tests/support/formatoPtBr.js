// Formatos pt-BR calculados à mão — nunca pelo locale do Node/aparelho (o app legado quebrava
// exatamente por mismatch de locale). Usados para montar o texto ESPERADO a partir da API real.
export function formatoBRL(valor) {
  const [inteiro, centavos] = Math.abs(valor).toFixed(2).split('.')
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${valor < 0 ? '-' : ''}R$ ${comPontos},${centavos}`
}

export const rotuloVisitas = (n) => `${n} ${n === 1 ? 'visita' : 'visitas'}`

// Soma de um campo numérico (nulo conta zero) de uma lista da API.
export const somar = (lista, campo) => lista.reduce((acc, item) => acc + (item[campo] ?? 0), 0)

// "Total: 1 visita · Alopatia 52 (R$ 8.809,28) · Revenda 11 (R$ 22.501,25) · Homeopatia 1 (R$ 98,48)"
export function textoTotaisEsperado(lista) {
  return `Total: ${rotuloVisitas(somar(lista, 'qtdeVisitasApp'))} · Alopatia ${somar(lista, 'qtdeAlopatia')} (${formatoBRL(somar(lista, 'valorAlopatia'))}) · Revenda ${somar(lista, 'qtdeRevenda')} (${formatoBRL(somar(lista, 'valorRevenda'))}) · Homeopatia ${somar(lista, 'qtdeHomeopatia')} (${formatoBRL(somar(lista, 'valorHomeopatia'))})`
}

// Venda de um prescritor = Alopatia + Revenda + Homeopatia (R$) — critério da ordenação padrão "Venda ↓".
export const venda = (p) => (p.valorAlopatia ?? 0) + (p.valorRevenda ?? 0) + (p.valorHomeopatia ?? 0)
