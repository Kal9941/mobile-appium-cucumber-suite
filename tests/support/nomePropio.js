// Réplica, só para calcular o texto ESPERADO, da regra `String.nomePropio()` do app
// (`shared/texto/NomePropio.kt`, pedido `T-028`), palavra por palavra com o algoritmo do app:
// só mexe em texto de UMA caixa só (texto que já mistura caixas passa intacto); as palavras são as
// sequências de letra/dígito e os separadores (espaço, `-`, `.`, `'`, `/`…) ficam onde estão; palavra com
// dígito, sigla e romano II–XX em maiúsculas; conector em minúsculo (exceto na 1ª palavra); o resto vira
// Primeira maiúscula. Só exibição — o que vai ao servidor não muda. Mantida em sincronia com o Kotlin
// (achado 2026-10-15, cenário 8.2: a réplica antiga não tinha "com" nos conectores).
const CONECTORES = new Set([
  'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'ao', 'aos', 'à', 'às',
  'para', 'por', 'com', 'del', 'della', 'di', 'du', 'van', 'von', 'der', 'den', 'y',
])
const SIGLAS = new Set([
  'ME', 'EPP', 'EIRELI', 'SA', 'SUS', 'UBS', 'UPA', 'UTI', 'CTI', 'PSF', 'CRM', 'CRO', 'CRF', 'CRN', 'CPF', 'CNPJ', 'CEP',
  'HC', 'USP', 'UFG', 'UEG', 'PUC', 'APAE', 'ONG',
])
const ROMANOS = new Set(['II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'])

const ehMinuscula = (c) => c !== c.toUpperCase()
const ehMaiuscula = (c) => c !== c.toLowerCase()
const ehLetraOuDigito = (c) => /[\p{L}\p{N}]/u.test(c)

function formatarPalavra(palavra, indice) {
  const maiuscula = palavra.toUpperCase()
  if (/\p{N}/u.test(palavra)) return maiuscula
  if (SIGLAS.has(maiuscula) || ROMANOS.has(maiuscula)) return maiuscula
  const minuscula = palavra.toLowerCase()
  if (indice > 0 && CONECTORES.has(minuscula)) return minuscula
  return minuscula.charAt(0).toUpperCase() + minuscula.slice(1)
}

export function nomePropio(texto) {
  if (!texto || !texto.trim()) return texto
  const letras = [...texto]
  if (letras.some(ehMinuscula) && letras.some(ehMaiuscula)) return texto // já mistura caixas: preserva
  let saida = ''
  let palavra = ''
  let indice = 0
  const fechar = () => {
    if (!palavra) return
    saida += formatarPalavra(palavra, indice)
    indice += 1
    palavra = ''
  }
  for (const c of letras) {
    if (ehLetraOuDigito(c)) palavra += c
    else { fechar(); saida += c }
  }
  fechar()
  return saida
}

// Réplica de `nomeCurto` do app (`shared/chat/Chat.kt`): o Chat mostra só a 1ª e a última palavra do nome,
// cada uma em minúsculo com a inicial maiúscula, ANTES de aplicar `nomePropio` ("ALEX-PH24" → "Alex-ph24").
export function nomeCurto(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  const usadas = partes.length === 1 ? partes : [partes[0], partes[partes.length - 1]]
  return usadas.map((p) => p.toLowerCase().replace(/^./, (c) => c.toUpperCase())).join(' ')
}
