const express = require('express');
const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const port = 3000;

let client; // Defina a variável client fora do escopo de create

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
    .then((venomClient) => {
        client = venomClient;  // Atribua o cliente ao escopo global
        start(); // Chama a função start depois que o cliente estiver inicializado
    })
    .catch((erro) => {
        console.error('Erro ao iniciar o Venom:', erro);
    });

function start() {
    // Endpoint para enviar mensagens
    app.post('/send-message', async (req, res) => {
        const { to, message } = req.body;
        let recipient = '';
        // Se for um grupo, use o formato 'group-<groupId>@g.us'
        if (to === 'App') {
            recipient = 'group-JBpKgY41xNMFF1g9mjrvdp@g.us'; // Substitua <groupId> pelo ID real do grupo
        } else {
            recipient = `${to}@c.us`; // Envia para o número de telefone se não for um grupo
        }

        try {
            await client.sendText(recipient, message);
            res.json('Mensagem enviada');
        } catch (error) {
            res.status(500).json({ error: 'Erro ao enviar mensagem', details: error });
        }
    });

    // Endpoint para adicionar membros ao grupo
    app.post('/add-to-group', async (req, res) => {
        const { phoneNumber } = req.body; // Passar o número de telefone do participante

        try {
            await client.addParticipant('group-JBpKgY41xNMFF1g9mjrvdp@g.us', `${phoneNumber}@c.us`);
            res.json('Membro adicionado ao grupo');
        } catch (error) {
            console.error('Erro ao adicionar membro ao grupo:', error);
            res.status(500).json({ error: 'Erro ao adicionar membro ao grupo', details: error });
        }
    });


    app.get('/get-all-chats', async (req, res) => {
        try {
            const chats = await client.getAllChats();
            res.json(chats);
        } catch (error) {
            console.error('Erro ao obter os chats:', error);
            res.status(500).json({ error: 'Falha ao obter os chats', details: error });
        }
    });
    
    app.post('/add-participant', async (req, res) => {
        const { participants } = req.body; // Lista de participantes a serem adicionados
    
        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({ error: 'A lista de participantes é obrigatória e deve ser um array.' });
        }
    
        const groupId = '120363380185122133@g.us';
    
        try {
            for (const participant of participants) {
                await client.addParticipant(groupId, participant);
            }
            res.json({ success: true, message: 'Participantes adicionados com sucesso!' });
        } catch (error) {
            console.error('Erro ao adicionar participantes:', error);
            res.status(500).json({ error: 'Falha ao adicionar participantes', details: error.message });
        }
    });
    




    app.listen(port, () => {
        console.log(`API rodando na porta ${port}`);
    });
}
