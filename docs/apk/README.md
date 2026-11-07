# docs/apk — APKs de teste do app

Contrato do `Q-001` (`prime-visita-3/.agents/ROADMAP.md` §7) e regra `[R-APK]` (`.agents/AGENTS.md` daqui). A suíte Appium testa **só**
o que está nesta pasta — nunca o `build/outputs` do Gradle do app —, então o build que a sessão do app faz para o celular do usuário
não troca o aplicativo no meio de um cenário. A pasta mora **na suíte** (decisão do usuário, 2026-10-14); `app.apkDir` do `env.json` aponta pra cá.

- **Nome:** `T-NNN[+T-MMM|T-AAA..T-ZZZ]_AAAAMMDD-HHmm.apk` — com mais de um pedido, **intervalo** (`T-001..T-018`, `T-004..T-006+T-010`; o script usa intervalo a partir de 3 seguidos) — o(s) pedido(s) de teste que o build atende (todo `T-NNN` existe em `ROADMAP.md` §6 daqui) + data e hora do build.
- **Imutável:** build novo é arquivo novo; nada aqui é sobrescrito ou apagado enquanto a suíte puder estar usando.
- **Tipo:** `debug`, assinado como o app instalado (a suíte instala por cima com `adb install -r -d`, sem desinstalar).
- **Quem publica:** a sessão do app, com `prime-visita-3/scripts/publica-apk.sh T-018` (`T-018+T-019`, ou intervalo `T-001..T-018`): valida os pedidos, builda, copia
  aqui e registra a linha em `MANIFESTO.md` (commit, `+alteracoes` se havia mudança não commitada no app, e SHA-256).
- **Git:** este diretório não é repositório git; os `.apk` ficam só no disco.

O histórico de builds está em [`MANIFESTO.md`](./MANIFESTO.md).
