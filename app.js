const express = require('express');
const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const port = 3000;

// Cria a sessão e captura o QR Code
venom
  .create({
    session: 'session-name', // Nome da sessão
    headless: true, // Executar em modo headless
    catchQR: (qrCode) => {
      console.log('QR Code gerado. Salvando o arquivo PNG...');
      
      // Salvar o QR Code como um arquivo PNG
      const base64Image = qrCode.replace(/^data:image\/png;base64,/, ""); // Remover o prefixo base64
      fs.writeFile(path.join(__dirname, 'qrcode.png'), base64Image, 'base64', (err) => {
        if (err) {
          console.error('Erro ao salvar o QR Code como PNG:', err);
        } else {
          console.log('QR Code salvo como qrcode.png');
        }
      });
    },
  })
  .then((client) => start(client))
  .catch((erro) => {
    console.error('Erro ao iniciar o Venom:', erro);
  });

function start(client) {
  // Endpoint para enviar mensagens
  app.post('/send-message', async (req, res) => {
    const { to, message } = req.body;
    try {
      await client.sendText(`${to}@c.us`, message);
      res.json('Mensagem enviada');
    } catch (error) {
      res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  });
}

app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
