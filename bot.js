const { create, Client } = require('@open-wa/wa-automate');
const fs = require('fs').promises;
const wa = require('@open-wa/wa-automate');


wa.create({
    sessionId: 'my-session',
    cacheEnabled: false, // Não usar cache para evitar sessão corrompida
    authTimeout: 60, // Timeout de autenticação para não ficar preso na tela de "autenticando"
}).then(client => start(client));

async function start(client) {
    console.log("✅ Bot iniciado!");

    const groupId = "120363403162987368@g.us"; // ID do grupo

    try {
        // Ler e carregar os números do JSON
        const data = await fs.readFile('users.json', 'utf8');
        const users = JSON.parse(data).users;

        for (const userId of users) {
            try {
                await client.addParticipant(groupId, userId);
                console.log(`✅ Usuário ${userId} adicionado ao grupo ${groupId}`);
            } catch (error) {
                console.error(`❌ Erro ao adicionar usuário ${userId}:`, error.message);
            }
        }
    } catch (error) {
        console.error("❌ Erro ao carregar usuários do JSON:", error.message);
    }
}

