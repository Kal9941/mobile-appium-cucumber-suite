// Datas esperadas em pt-BR, calculadas com tabelas explícitas — nunca pelo locale
// do Node/aparelho (o bug sistêmico do app legado era exatamente mismatch de
// locale, `PROJECT_CONTEXT.md` do app §2.4). O fuso é o do emulador
// (America/Sao_Paulo, fixado na subida do emulador — AGENTS §10).
const FUSO = 'America/Sao_Paulo'

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const pad = (n) => String(n).padStart(2, '0')

// Partes de data/hora "agora" no fuso de São Paulo.
export function agoraSP(base = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(base).map((p) => [p.type, p.value]),
  )
  return {
    ano: Number(partes.year), mes: Number(partes.month), dia: Number(partes.day), hora: Number(partes.hour), minuto: Number(partes.minute),
  }
}

export function mesAnoAtual(base = new Date()) {
  const { ano, mes } = agoraSP(base)
  return `${MESES[mes - 1]} ${ano}`
}

// "Quarta-feira, 14/10/2026"
export function dataPorExtensoAtual(base = new Date()) {
  const { ano, mes, dia } = agoraSP(base)
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
  return `${DIAS[diaSemana]}, ${pad(dia)}/${pad(mes)}/${ano}`
}

// Semana de segunda a domingo que contém hoje: "dd/MM/aaaa – dd/MM/aaaa"
export function semanaAtual(base = new Date()) {
  const { ano, mes, dia } = agoraSP(base)
  const hoje = new Date(Date.UTC(ano, mes - 1, dia))
  const deslocamento = (hoje.getUTCDay() + 6) % 7
  const fmt = (d) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
  const segunda = new Date(hoje.getTime() - deslocamento * 86400000)
  const domingo = new Date(segunda.getTime() + 6 * 86400000)
  return `${fmt(segunda)} – ${fmt(domingo)}`
}

// Minutos desde 00:00 no fuso de São Paulo.
export function minutosDoDia(base = new Date()) {
  const { hora, minuto } = agoraSP(base)
  return hora * 60 + minuto
}
