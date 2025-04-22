const express = require('express');
const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require("http");
const socketIo = require("socket.io");

const app = express();
app.use(express.json());
app.use(cors());

const port = 7000;
let client = null;
let venomReady = false;

// Rota para servir o QR Code
app.get("/qrcode", (req, res) => {
    const qrPath = path.join(__dirname, "qrcode.png");
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).json({ error: "QR Code ainda não gerado" });
    }
});

// Criar servidor HTTP e socket
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Iniciar o servidor Express imediatamente
server.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
});

// Inicia a sessão do Venom após servidor estar no ar
venom.create({
    session: 'session-name',
    headless: 'new',
    catchQR: (qrCode) => {
        console.log('QR Code gerado. Salvando o arquivo PNG...');
        const base64Image = qrCode.replace(/^data:image\/png;base64,/, "");
        fs.writeFile(path.join(__dirname, 'qrcode.png'), base64Image, 'base64', (err) => {
            if (err) {
                console.error('Erro ao salvar QR:', err);
            } else {
                console.log('QR Code salvo como qrcode.png');
            }
        });
    },
}).then((venomClient) => {
    client = venomClient;
    venomReady = true;

    // Deleta o QR depois de conectar
    const qrPath = path.join(__dirname, 'qrcode.png');
    if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);

    console.log("✅ Venom conectado!");
}).catch((err) => {
    console.error("Erro ao iniciar o Venom:", err);
});

// Endpoint de envio
app.post('/send-sequencial', async (req, res) => {
    const { to, messages } = req.body;
    const minDelay = req.body.minDelay || 3; // em minutos
    const maxDelay = req.body.maxDelay || 5;

    if (!venomReady || !client) {
        return res.status(500).json({ error: "Venom ainda não está conectado." });
    }

    if (!Array.isArray(to) || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Parâmetros inválidos. Esperado: { to: [], messages: [] }" });
    }

    res.json({ success: true, message: "Envio iniciado em background" });

    (async () => {
        for (let i = 0; i < to.length; i++) {
            const number = to[i];
            const recipient = `${number}@c.us`;

            const message = messages[Math.floor(Math.random() * messages.length)];

            let success = false;

            try {
                await client.sendText(recipient, message);
                const log = `✅ Mensagem enviada para ${number}: ${message}`;
                console.log(log);
                io.emit("status", log);
                success = true;
            } catch (err) {
                const log = `❌ Erro ao enviar para ${number}: ${err.message}`;
                console.error(log);
                io.emit("status", log);
            }

            if (success && i < to.length - 1) {
                const delayTime = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 60 * 1000;
                const delayLog = `⏱️ Próxima mensagem em: ${Math.floor(delayTime / 1000)}s`;
                console.log(delayLog);
                io.emit("status", delayLog);
                await new Promise(resolve => setTimeout(resolve, delayTime));
            }
        }

        io.emit("status", "🚀 Envio finalizado.");
    })();
});
