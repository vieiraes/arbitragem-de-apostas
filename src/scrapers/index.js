const { scrapeBetano } = require('./betanoScraper');

async function runAllScrapers() {
    try {
        console.log('Iniciando coleta de dados das casas de apostas...');
        
        console.log('\n--- Betano Scraper ---');
        const betanoResult = await scrapeBetano();
        console.log(`Eventos mapeados: ${betanoResult.summary.eventsFound}`);
        console.log(`Oportunidades > 30%: ${betanoResult.summary.opportunitiesFound}\n`);
        
        // Aqui você pode adicionar outros scrapers no futuro
        // const bet365Data = await scrapeBet365();
        
        console.log('Todos os scrapers foram executados com sucesso!');
        
        return {
            betano: betanoResult,
            // outras casas de apostas podem ser adicionadas aqui
        };
    } catch (error) {
        console.error('Erro ao executar scrapers:', error);
        throw error;
    }
}

// Executar quando chamado diretamente
if (require.main === module) {
    runAllScrapers()
        .then(() => console.log('Processo de coleta finalizado.'))
        .catch(err => {
            console.error('Erro durante o processo de coleta:', err);
            process.exit(1);
        });
}

module.exports = {
    runAllScrapers,
    scrapeBetano
};
