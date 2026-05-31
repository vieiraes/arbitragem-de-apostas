const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const fs = require('fs');
const { scrapeBetano } = require('./scrapers/betanoScraper');
const port = process.env.PORT || 3000;

// Configuração para servir arquivos estáticos localmente (se necessário)
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors()); // Permite acesso de outros domínios (como o Firebase Hosting)
app.use(express.json());

// Memória temporária para servir oportunidades recentes caso a nuvem zere os arquivos
let cacheOportunidades = [];

app.get('/api/oportunidades', (req, res) => {
    // Tenta ler do arquivo primeiro (se rodou localmente e existe o arquivo)
    const publicDir = path.join(__dirname, 'public');
    const filePath = path.join(publicDir, 'oportunidades.json');
    
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return res.json(data);
        }
    } catch (e) {
        console.log("Erro lendo arquivo local, usando cache.");
    }
    
    // Se o arquivo não existir (comum em servidores efêmeros), retorna da memória
    return res.json(cacheOportunidades);
});

app.post('/api/scrape', async (req, res) => {
    console.log("Iniciando web scraping remoto...");
    try {
        const data = await scrapeBetano();
        cacheOportunidades = data; // Atualiza a memória RAM do servidor
        console.log("Scraping finalizado via API na nuvem.");
        res.json({ success: true, message: "Scraping concluído com sucesso.", data: data });
    } catch (error) {
        console.error(`Erro na execução do scraper: ${error}`);
        return res.status(500).json({ error: "Erro ao executar o scraper", details: error.message });
    }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
