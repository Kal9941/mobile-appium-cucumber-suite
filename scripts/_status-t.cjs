// Atualiza o Status de um T-NNN em ROADMAP.md §6 (uso interno): node scripts/_status-t.cjs T-011 "texto"
const fs = require('fs')
const [id, texto] = process.argv.slice(2)
const arq = '.agents/ROADMAP.md'
let r = fs.readFileSync(arq, 'utf8')
const i = r.indexOf('- **ID:** `' + id + '`')
if (i < 0) throw new Error('bloco ' + id)
const j = r.indexOf('- **Status:**', i)
const prox = r.indexOf('\n- **ID:**', i + 5)
if (j < 0 || (prox > 0 && j > prox)) throw new Error('status ' + id)
const fim = r.indexOf('\n', j)
r = r.slice(0, j) + '- **Status:** ' + texto + r.slice(fim)
fs.writeFileSync(arq, r)
console.log('ok', id)
