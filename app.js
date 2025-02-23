const express = require('express');
const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());
const port = 3000;

let client; // Defina a variável client fora do escopo de create

// Cria a sessão e captura o QR Code
venom
    .create({
        session: 'session-name', // Nome da sessão
        headless: 'new', // Executar em modo headless
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

        try {
            if (to === 'OTIMIZADOR') {
                await client.sendText('120363379694101728@g.us', message);
                return res.json({ success: true, message: "Mensagem enviada para o grupo" });
            }

            if (Array.isArray(to)) {
                const results = await Promise.allSettled(
                    to.map(async (number) => {
                        try {
                            const recipient = `${number}@c.us`;
                            await client.sendText(recipient, message);
                            return { number, status: "success" };
                        } catch (err) {
                            return { number, status: "error", error: err.message };
                        }
                    })
                );

                return res.json({ success: true, results });
            }

            const recipient = `${to}@c.us`;
            await client.sendText(recipient, message);
            res.json({ success: true, message: "Mensagem enviada para um único número" });

        } catch (error) {
            res.status(500).json({ error: "Erro ao enviar mensagem", details: error.message });
        }
    });

    // Endpoint para adicionar membros ao grupo
    app.post('/add-to-group', async (req, res) => {
        const { phoneNumber } = req.body;
        try {
            const response = await client.addParticipant('120363400138161121@g.us', `${phoneNumber}@c.us`);
            console.log(response);  // Log para verificar o que a API está retornando
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
    
        const groupId = '120363403162987368@g.us';
    
        try {
            // Obtém as informações do grupo antes de adicionar participantes
            const chat = await client.getChatById(groupId);
            console.log('Configurações do grupo:', JSON.stringify(chat, null, 2));
    
            for (const participant of participants) {
                const formattedParticipant = `+55${participant}`;  // Formato correto com +55 para Brasil
                console.log(`Adicionando participante: ${formattedParticipant}`); // Para depuração
    
                await client.addParticipant(groupId, formattedParticipant);
            }
            res.json({ success: true, message: 'Participantes adicionados com sucesso!' });
        } catch (error) {
            console.error('Erro ao adicionar participantes:', error);
            res.status(500).json({ error: 'Falha ao adicionar participantes', details: error.message });
        }
    });

    app.post('/extract-phone-numbers', async (req, res) => {
        try {
            // Faz a requisição para pegar os dados da API
            const response = await axios.get('https://weebhok.whatsapchat.com.br/payloads');
            const payload = response.data.payloads; // Assumindo que o JSON retornado tenha o campo 'payloads'

            if (!Array.isArray(payload)) {
                return res.status(400).json({ error: 'O campo "payloads" deve ser um array.' });
            }

            const phoneNumbers = payload
                .map(item => item.customer.phone_number)
                .filter(phoneNumber => phoneNumber && phoneNumber.length > 0);

            // Remover o prefixo '55' do número (caso queira apenas o número sem o código do país)
            const formattedNumbers = phoneNumbers.map(number => number.replace(/^55/, ''));

            res.json({ to: formattedNumbers });
        } catch (error) {
            console.error('Erro ao extrair números de telefone:', error);
            res.status(500).json({ error: 'Falha ao extrair os números de telefone', details: error.message });
        }
    });


    app.listen(port, () => {
        console.log(`API rodando na porta ${port}`);
    });
}
