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

// Criar servidor HTTP e socket
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

server.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
});

// 🔁 Função de inicialização e reconexão do Venom
function startVenom() {
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

        // Apagar o QR após conectar
        const qrPath = path.join(__dirname, 'qrcode.png');
        if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);

        console.log("✅ Venom conectado!");
        io.emit("status", "✅ Conectado ao WhatsApp!");

        // Detectar se perdeu conexão depois de conectado
        client.onStateChange((state) => {
            console.log(`📡 Estado do WhatsApp: ${state}`);
            if (["UNPAIRED", "UNPAIRED_IDLE", "CONFLICT", "DISCONNECTED"].includes(state)) {
                console.log("⚠️ Venom desconectado, tentando reconectar...");
                venomReady = false;
                client = null;
                setTimeout(startVenom, 5000);
            }
        });

    }).catch((err) => {
        console.error("❌ Erro ao iniciar o Venom:", err);
        io.emit("status", "❌ Erro ao iniciar sessão do WhatsApp. Tentando novamente...");
        venomReady = false;
        client = null;
        setTimeout(startVenom, 5000);
    });
}

// Inicia a primeira vez
startVenom();

// Rota para exibir o QR code
app.get("/qrcode", (req, res) => {
    const qrPath = path.join(__dirname, "qrcode.png");
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).json({ error: "QR Code ainda não gerado" });
    }
});

// Endpoint de envio sequencial
app.post('/send-sequencial', async (req, res) => {
    const { to, messages, minDelay = 3, maxDelay = 5 } = req.body;

    if (!venomReady || !client) {
        return res.status(500).json({ error: "Venom ainda não está conectado." });
    }

    if (!Array.isArray(to) || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Parâmetros inválidos. Esperado: { to: [], messages: [] }" });
    }
//ok
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
