const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Estrutura de dados: { numeroDoJogo: { userId: tentativas } }
let resultados = {};
let ranking = {}; // pontos acumulados

// Regex para capturar mensagens do Term.ooo
const regex = /#(\d+)\s+\*(\d)\/6/;

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const texto = msg.text;

  const match = regex.exec(texto);
  if (match) {
    const numeroJogo = match[1]; // Ex: 1343
    const tentativas = parseInt(match[2]); // Ex: 2

    if (!resultados[numeroJogo]) resultados[numeroJogo] = {};
    resultados[numeroJogo][userId] = tentativas;

    bot.sendMessage(chatId, `📥 Resultado registrado para ${username}: ${tentativas}/6 no jogo #${numeroJogo}`);

    // Verifica se já tem mais de um resultado para comparar
    const jogadores = Object.entries(resultados[numeroJogo]);

    if (jogadores.length > 1) {
      // Descobre menor número de tentativas
      const menor = Math.min(...jogadores.map(([_, t]) => t));
      const vencedores = jogadores.filter(([_, t]) => t === menor).map(([id]) => id);

      // Atualiza ranking
      vencedores.forEach((id) => {
        if (!ranking[id]) ranking[id] = 0;
        ranking[id] += 1;
      });

      let rankingTexto = Object.entries(ranking)
        .map(([id, pontos]) => {
          return `${id == userId ? username : "Jogador " + id}: ${pontos} ponto(s)`;
        })
        .join("\n");

      bot.sendMessage(chatId, `🏆 Jogo #${numeroJogo}\nMenor tentativa: ${menor}/6\nGanhador: ${vencedores.length}\n\n📊 Ranking:\n${rankingTexto}`);
    }
  }
});
