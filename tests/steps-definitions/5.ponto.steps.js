import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'expect-webdriverio'
import { PontoPage, TIPOS_PONTO } from '../pages/5.pontoPage.js'
import { BackendService } from '../services/BackendService.js'
import { agoraSP, dataPorExtensoAtual, minutosDoDia } from '../support/dataPtBr.js'
import {
  permitirAlarmeExato, semearPreferenciasDoApp, titulosDasNotificacoes, limparLogcat, linhasDoLogDoApp,
} from '../support/dispositivo.js'
import { loadEnv } from '../support/loadEnv.js'

// Campo da API (`GET /ponto` → `registro`) de cada tipo da tela, na ordem do dia.
const CAMPO = { entrada: 'entrada', saidaalmoco: 'saidaAlmoco', retornoalmoco: 'retornoAlmoco', saida: 'saida' }
const hhmm = (s) => (s ? s.slice(0, 5) : null)
// Hora "HH:mm" de um timestamp/horário da API ("2026-10-14T08:02:10", "08:02:10.0000").
const horaDe = (s) => (s ? /(\d{2}):(\d{2})/.exec(s)?.slice(1, 3).join(':') : null)
// O dia tem almoço quando o `intervalo` da API existe e NÃO é zero: o sábado vem com "00:00:00.0000" (sem almoço) e o app
// não mostra "Intervalo de 0h" nem "almoço 0h" — a expectativa depende do dia da semana, nunca é fixa.
const temAlmoco = (horarioEsperado) => Boolean(horarioEsperado?.intervalo) && !/^00:00/.test(horarioEsperado.intervalo)

const pagina = () => new PontoPage(driver)

Then('vejo o relógio, a data de hoje, o horário esperado e os quatro registros', async function () {
  const p = pagina()
  await p.aguardarTela()
  await p.aguardarCarregar()
  await expect(p.tituloText()).toBeDisplayed()

  // Informação correta 1: relógio HH:mm:ss, dentro de 2 min do relógio de São Paulo.
  const hora = await p.textoDe('registroponto_texto_hora')
  expect(hora).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  const [h, m] = hora.split(':').map(Number)
  const diferenca = Math.abs(h * 60 + m - minutosDoDia())
  expect(Math.min(diferenca, 1440 - diferenca)).toBeLessThanOrEqual(2)

  // Informação correta 2: data por extenso em pt-BR fixo ("Quarta-feira, 14/10/2026").
  const data = await p.textoDe('registroponto_texto_data')
  expect(data.toLowerCase()).toBe(dataPorExtensoAtual().toLowerCase())

  // Horário esperado: "Horário: ..." ou "Sem horário de trabalho configurado para hoje." — ambos válidos, nunca vazio.
  const esperado = await p.textoDe('registroponto_texto_horario_esperado')
  expect(esperado.trim().length).toBeGreaterThan(0)

  // Os quatro registros existem; os botões só são lidos, NUNCA tocados (AGENTS §9).
  for (const tipo of TIPOS_PONTO) {
    await expect(p.porTag(`registroponto_texto_${tipo}`)).toBeDisplayed()
    await expect(p.porTag(`registroponto_botao_registrar_${tipo}`)).toBeDisplayed()
  }
})

Then('os botões de registrar seguem a ordem do dia conforme a API e a explicação da ordem aparece', async function () {
  const p = pagina()
  await p.aguardarCarregar()
  const { registro } = await BackendService.obter('/ponto')
  // Só o 1º tipo ainda não registrado (com todos os anteriores já registrados) fica habilitado.
  let anterioresOk = true
  for (const tipo of TIPOS_PONTO) {
    const registrado = Boolean(registro?.[CAMPO[tipo]])
    const esperadoHabilitado = anterioresOk && !registrado
    expect(await p.estaHabilitado(`registroponto_botao_registrar_${tipo}`)).toBe(esperadoHabilitado)
    anterioresOk = anterioresOk && registrado
  }
  expect(await p.textoDe('registroponto_texto_ordem')).toMatch(/^Os registros seguem a ordem do dia: entrada, saída para o almoço, retorno e saída/)
})

Then('cada linha do ponto mostra o horário previsto ou registrado conforme a API', async function () {
  const p = pagina()
  await p.aguardarCarregar()
  const { horarioEsperado, registro } = await BackendService.obter('/ponto')
  const texto = (tipo) => p.textoDe(`registroponto_texto_${tipo}`)
  // Entrada e saída: "Registrada às HH:mm" se já bateu, senão "Previsto às HH:mm" (da API).
  for (const [tipo, previsto] of [['entrada', horarioEsperado?.horaEntrada], ['saida', horarioEsperado?.horaSaida]]) {
    const feito = registro?.[CAMPO[tipo]]
    if (feito) expect(await texto(tipo)).toBe(`Registrada às ${horaDe(feito)}`)
    else if (previsto) expect(await texto(tipo)).toBe(`Previsto às ${hhmm(previsto)}`)
  }
  // Saída do almoço mostra o intervalo ("Intervalo de 2h") quando não registrada; retorno mostra "—". Dia SEM almoço (sábado:
  // `intervalo` "00:00:00.0000") a linha mostra "—", como o retorno — o intervalo zero não conta como almoço.
  if (!registro?.saidaAlmoco) {
    if (temAlmoco(horarioEsperado)) {
      expect(await texto('saidaalmoco')).toMatch(new RegExp(`^Intervalo de ${Number(horarioEsperado.intervalo.slice(0, 2))}h`))
    } else {
      expect(await texto('saidaalmoco')).toBe('—')
    }
  }
  if (!registro?.retornoAlmoco) expect(await texto('retornoalmoco')).toBe('—')
})

Then('o horário esperado mostra entrada, saída e almoço conforme a API', async function () {
  const p = pagina()
  await p.aguardarCarregar()
  const { horarioEsperado } = await BackendService.obter('/ponto')
  const texto = await p.textoDe('registroponto_texto_horario_esperado')
  if (!horarioEsperado) {
    expect(texto).toBe('Sem horário de trabalho configurado para hoje.')
    return
  }
  // "Horário: 08:00 às 18:00 · almoço 2h"
  expect(texto).toContain(`Horário: ${hhmm(horarioEsperado.horaEntrada)} às ${hhmm(horarioEsperado.horaSaida)}`)
  if (temAlmoco(horarioEsperado)) expect(texto).toContain(`almoço ${Number(horarioEsperado.intervalo.slice(0, 2))}h`)
  else expect(texto).not.toContain('almoço') // dia sem almoço (intervalo 00:00): o texto não cita almoço
})

Then('o relógio da tela de ponto avança em poucos segundos', async function () {
  const p = pagina()
  const antes = await p.textoDe('registroponto_texto_hora')
  await driver.waitUntil(async () => (await p.textoDe('registroponto_texto_hora')) !== antes, { timeout: 5000, timeoutMsg: 'timed out while waiting for the clock to tick' })
})

Then('vejo o horário esperado da cópia do aparelho e o aviso de offline do ponto', async function () {
  const p = pagina()
  const { horarioEsperado } = await BackendService.obter('/ponto') // o host tem rede; o aparelho não
  await p.esperarVisivel('registroponto_texto_offline')
  const texto = await p.textoDe('registroponto_texto_horario_esperado')
  if (horarioEsperado) expect(texto).toContain(`Horário: ${hhmm(horarioEsperado.horaEntrada)} às ${hhmm(horarioEsperado.horaSaida)}`)
  expect(await p.contar('registroponto_texto_erro')).toBe(0)
})

// ---- T-001: lembretes de ponto ---------------------------------------------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, '0')
let horaSemeada = null

Given('que o app tem permissão de alarmes exatos', async function () {
  await permitirAlarmeExato(driver)
})

// Semeia o horário de entrada de hoje (por dia da semana, 1 = segunda … 7 = domingo, como o `LocalDate.dayOfWeek` do app) com
// `minutos` à frente do relógio de São Paulo; `jaRegistrada` guarda também o retrato "entrada já batida" de hoje.
const semearEntrada = async (minutos, jaRegistrada) => {
  const agora = agoraSP()
  const alvo = agora.hora * 60 + agora.minuto + minutos
  if (alvo >= 24 * 60 - 5) throw new Error('perto da meia-noite: o cenário não semeia horário que vire o dia')
  horaSemeada = `${pad2(Math.floor(alvo / 60))}:${pad2(alvo % 60)}`
  const diaDaSemana = ((new Date(Date.UTC(agora.ano, agora.mes - 1, agora.dia)).getUTCDay() + 6) % 7) + 1
  const hoje = `${agora.ano}-${pad2(agora.mes)}-${pad2(agora.dia)}`
  await driver.execute('mobile: terminateApp', { appId: loadEnv().app.appPackage })
  await semearPreferenciasDoApp(driver, 'notificacoes', {
    [`ponto_horario_${diaDaSemana}`]: `${horaSemeada}|`,
    ...(jaRegistrada ? { ponto_retrato: `${hoje}|true|false` } : {}),
  })
  await limparLogcat(driver)
  await driver.execute('mobile: activateApp', { appId: loadEnv().app.appPackage })
}

When('semeio a entrada de hoje para daqui a {int} minutos e reabro o app', async function (minutos) {
  await semearEntrada(minutos, false)
})

When('semeio a entrada de hoje para daqui a {int} minutos com o ponto de entrada já registrado e reabro o app', async function (minutos) {
  await semearEntrada(minutos, true)
})

Then('a notificação {string} aparece em até {int} minutos', { timeout: 420000 }, async function (titulo, minutos) {
  await driver.waitUntil(async () => (await titulosDasNotificacoes(driver)).includes(titulo), {
    timeout: minutos * 60000, interval: 5000, timeoutMsg: `timed out while waiting for the notification "${titulo}" (entrada semeada às ${horaSemeada})`,
  })
})

Then('nenhuma notificação {string} foi postada', async function (titulo) {
  expect(await titulosDasNotificacoes(driver)).not.toContain(titulo)
})

Then('depois da hora da entrada o app ignora o lembrete e nenhuma notificação de entrada é postada', { timeout: 420000 }, async function () {
  await driver.waitUntil(async () => (await linhasDoLogDoApp(driver, /lembrete de entrada ignorado — ponto já registrado/)).length > 0, {
    timeout: 300000, interval: 5000, timeoutMsg: `timed out while waiting for the app to ignore the entry reminder (entrada semeada às ${horaSemeada})`,
  })
  const titulos = await titulosDasNotificacoes(driver)
  expect(titulos).not.toContain('Hora de registrar o ponto de entrada')
  expect(titulos).not.toContain('Ponto de entrada em 15 minutos')
})
