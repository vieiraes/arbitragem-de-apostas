require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const { scrapeBetano } = require('./scrapers/betanoScraper');
const {
    uploadOportunidades,
    downloadOportunidades,
    uploadScrapeMetadata,
    downloadScrapeMetadata,
    uploadRawBetanoData,
} = require('./r2Storage');
const port = process.env.PORT || 3001;

// Configuração para servir arquivos estáticos localmente (se necessário)
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors()); // Permite acesso de outros domínios (como o Firebase Hosting)
app.use(express.json());

// Cache em memória RAM como fallback de último recurso
let cacheOportunidades = [];
let scrapeMetadata = {
    lastSuccessfulScrapeAt: null,
    status: 'not_started',
    rawResponsesCaptured: 0,
    eventsFound: 0,
    eventsWithOdds: 0,
    opportunitiesFound: 0,
};

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

app.get('/api/oportunidades/status', async (req, res) => {
    try {
        const metadata = await downloadScrapeMetadata();
        scrapeMetadata = { ...scrapeMetadata, ...metadata };
        return res.json(scrapeMetadata);
    } catch (e) {
        console.log('Metadados do R2 indisponíveis, usando cache RAM:', e.message);
        return res.json(scrapeMetadata);
    }
});

/**
 * POST /api/scrape
 * Dispara o scraping, salva resultado no R2 e atualiza o cache RAM.
 */
app.post('/api/scrape', async (req, res) => {
    console.log('Iniciando web scraping...');
    try {
        const scrapeResult = await scrapeBetano();
        const data = scrapeResult.opportunities;
        const summary = scrapeResult.summary;

        // Atualiza cache RAM
        cacheOportunidades = data;

        // Salva o bruto e as oportunidades filtradas no Cloudflare R2
        await uploadRawBetanoData(scrapeResult.rawData);
        await uploadOportunidades(data);

        scrapeMetadata = {
            lastSuccessfulScrapeAt: new Date().toISOString(),
            ...summary,
            totalOportunidades: data.length,
        };
        await uploadScrapeMetadata(scrapeMetadata);

        const messageByStatus = {
            completed_no_events: 'Scraping concluído, mas nenhum evento foi mapeado nos dados coletados.',
            completed_no_odds: 'Scraping concluído, mas nenhum evento com odds válidas foi encontrado.',
            success_no_opportunities: 'Scraping concluído. Nenhuma oportunidade acima de 30% encontrada agora.',
            success_with_opportunities: `Scraping concluído. ${data.length} oportunidades salvas no R2.`,
        };

        console.log('Scraping, upload bruto e processamento finalizados com sucesso.', scrapeMetadata);
        res.json({
            success: true,
            message: messageByStatus[summary.status] || 'Scraping concluído.',
            lastSuccessfulScrapeAt: scrapeMetadata.lastSuccessfulScrapeAt,
            status: scrapeMetadata,
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
