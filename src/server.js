require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const { scrapeBetano } = require('./scrapers/betanoScraper');
const { uploadOportunidades, downloadOportunidades } = require('./r2Storage');
const port = process.env.PORT || 3000;

// Configuração para servir arquivos estáticos localmente (se necessário)
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors()); // Permite acesso de outros domínios (como o Firebase Hosting)
app.use(express.json());

// Cache em memória RAM como fallback de último recurso
let cacheOportunidades = [];

/**
 * GET /api/oportunidades
 * Tenta buscar do R2. Se falhar, usa o cache RAM.
 */
app.get('/api/oportunidades', async (req, res) => {
    try {
        const data = await downloadOportunidades();
        return res.json(data);
    } catch (e) {
        console.log('R2 indisponível, usando cache RAM:', e.message);
        return res.json(cacheOportunidades);
    }
});

/**
 * POST /api/scrape
 * Dispara o scraping, salva resultado no R2 e atualiza o cache RAM.
 */
app.post('/api/scrape', async (req, res) => {
    console.log('Iniciando web scraping...');
    try {
        const data = await scrapeBetano();

        // Atualiza cache RAM
        cacheOportunidades = data;

        // Faz upload para o Cloudflare R2
        await uploadOportunidades(data);

        console.log('Scraping e upload para R2 finalizados com sucesso.');
        res.json({
            success: true,
            message: `Scraping concluído. ${data.length} oportunidades salvas no R2.`,
            data: data,
        });
    } catch (error) {
        console.error(`Erro na execução do scraper: ${error}`);
        return res.status(500).json({ error: 'Erro ao executar o scraper', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`R2 Bucket: ${process.env.R2_BUCKET || 'bucket-cf'}`);
});
