const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Estrutura de dados
let resultados = {};
let ranking = {}; // pontos acumulados
let nomes = {};

// -------------------- Pontos iniciais a partir do env --------------------
const SPECIAL_POINTS_RAW = process.env.SPECIAL_POINTS || "";
const PONTOS_INICIAIS_ESPECIAIS = Object.fromEntries(
  SPECIAL_POINTS_RAW.split(",").map(pair => {
    const [id, pontos] = pair.split(":");
    return [id, parseInt(pontos)];
  })
);

const rainha = "jessica"; // Nome especial para condição

// -------------------- Admins --------------------
const ADMINS = new Set((process.env.ADMINS || "").split(","));

// Regex para capturar mensagens do Term.ooo
const regex = /#(\d+).*?(\d)\/6/;

// ================== FUNÇÃO PARA MOSTRAR PLACAR ==================
function gerarRankingTexto() {
  if (Object.keys(ranking).length === 0) {
    return "Ainda não há pontos registrados no ranking.";
  }

  return Object.keys(nomes)
    .map((id) => [id, ranking[id] !== undefined ? ranking[id] : (PONTOS_INICIAIS_ESPECIAIS[id] || 0)])
    .sort((a, b) => b[1] - a[1])
    .map(([id, pontos], idx) => {
      const nomeJogador = nomes[id] || `Jogador ${id}`;
      return `${idx + 1}º - ${nomeJogador}: ${pontos} ponto(s)`;
    })
    .join("\n");
}

// ================== LÓGICA DO BOT ==================
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.first_name || msg.from.username || "Jogador sem nome";
  const texto = msg.text;

  if (!texto) return; // ignora mensagens sem texto

  // ----- Mostra userId apenas para admins -----
  if (ADMINS.has(userId)) {
    console.log("UserID:", userId, "Username:", username);
  }

  // ----- Comando /placar -----
  if (texto.startsWith("/placar")) {
    const rankingTexto = gerarRankingTexto();
    bot.sendMessage(chatId, `🏅 Placar Atual:\n\n${rankingTexto}`);
    return;
  }

  // ----- Resultado de jogo -----
  const match = regex.exec(texto);
  if (match) {
    const numeroJogo = match[1]; // Ex: 1343
    const tentativas = parseInt(match[2]); // Ex: 2

    if (!resultados[numeroJogo]) resultados[numeroJogo] = {};
    resultados[numeroJogo][userId] = tentativas;
    nomes[userId] = username;

    bot.sendMessage(chatId, `📥 Resultado registrado para ${username}: ${tentativas}/6 no jogo #${numeroJogo}`);

    // Verifica se já tem mais de um resultado para comparar
    const jogadores = Object.entries(resultados[numeroJogo]);

    if (jogadores.length > 1) {
      // Descobre menor número de tentativas
      const menor = Math.min(...jogadores.map(([_, t]) => t));
      const vencedores = jogadores.filter(([_, t]) => t === menor).map(([id]) => id);

      // Atualiza ranking
      vencedores.forEach((id) => {
        if (!ranking[id]) ranking[id] = PONTOS_INICIAIS_ESPECIAIS[id] || 0;
        ranking[id] += 1;
      });

      const rankingTexto = gerarRankingTexto();

      // Mensagem de parabéns ou empate
      let resumoPartida = "";
      if (vencedores.length === 1) {
        const vencedorId = vencedores[0];
        const nomeVencedor = nomes[vencedorId];

        resumoPartida = `🏆 Parabéns ${nomeVencedor}! Você ganhou o jogo #${numeroJogo} com ${menor}/6 tentativas.`;

        // Condição especial para Jessica
        if (nomeVencedor.toLowerCase() === rainha) {
          resumoPartida += `\n(🎉 Rainha do Term.ooo!!!!!)`;
        } else {
          resumoPartida += `\n(😒 Espero que perca na próxima...)`;
        }

      } else {
        const lista = vencedores.map((id) => nomes[id]).join(", ");
        resumoPartida = `🤝 Empate no jogo #${numeroJogo}! Ambos venceram com ${menor}/6 tentativas.`;

        // Se Jessica estiver entre os empatados
        if (lista.toLowerCase().includes(rainha)) {
          resumoPartida += `\n(👏 Jessica sempre se destaca mesmo no empate!)`;
        }
      }

      bot.sendMessage(chatId, `${resumoPartida}\n\n🏅 Placar:\n${rankingTexto}`);
    }
  }
});
