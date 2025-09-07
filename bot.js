require("./server"); // inicia o server express

const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Estrutura de dados: { numeroDoJogo: { userId: tentativas } }
let resultados = {};
let ranking = {}; // pontos acumulados
let nomes = {};

const rainha = "jessica"; // Nome especial para condição

// Regex para capturar mensagens do Term.ooo
const regex = /#(\d+)\s+\*(\d)\/6/;

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.first_name || msg.from.username || "Jogador sem nome";
  const texto = msg.text;

  if (!texto) return;

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
        if (!ranking[id]) ranking[id] = 0;
        ranking[id] += 1;
      });

      let rankingTexto = Object.entries(ranking)
        .map(([id, pontos]) => {
          const nomeJogador = nomes[id] || `Jogador ${id}`;
          return `${nomeJogador}: ${pontos} ponto(s)`;
        })
        .join("\n");

      // Mensagem de parabéns ou empate
      let resumoPartida = "";
      if (vencedores.length === 1) {
        const vencedorId = vencedores[0];
        const nomeVencedor = nomes[vencedorId];

        resumoPartida = `🏆 Parabéns ${nomeVencedor}! Você ganhou o jogo #${numeroJogo} com ${menor}/6 tentativas.`;

        // Condição especial para Jessica
        if (nomeVencedor.toLowerCase().includes(rainha)) {
          resumoPartida += `\n🎉 Rainha do Term.ooo!!`;
        } else {
          resumoPartida += `\n😒 Espero que perca na próxima...`;
        }

      } else {
        const lista = vencedores.map((id) => nomes[id]).join(", ");
        resumoPartida = `🤝 Empate no jogo #${numeroJogo}! Ambos venceram com ${menor}/6 tentativas.`;

        // Se Jessica estiver entre os empatados
        if (lista.toLowerCase().includes(rainha)) {
          resumoPartida += `\n👏 Jessica sempre se destaca mesmo no empate!`;
        }
      }

      bot.sendMessage(chatId, resumoPartida);
      bot.sendMessage(chatId, `🏅 Placar:\n${rankingTexto}`);
    }
  }
});
