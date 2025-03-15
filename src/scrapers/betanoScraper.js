const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeBetano() {
    console.log('Iniciando scraping dos jogos de hoje da Betano...');

    // Configurações atualizadas para o Puppeteer mais recente
    const browser = await puppeteer.launch({
        headless: "new", // Nova sintaxe para headless no Puppeteer mais recente
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security'
        ]
    });

    try {
        const page = await browser.newPage();

        // Configurações para tornar o scraper mais furtivo
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        // Desativar carregamento de recursos para aceleração
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Adicionar delay aleatório para parecer mais humano (usando page.evaluate em vez de waitForTimeout)
        const delay = Math.floor(Math.random() * 3000) + 1000;
        await page.evaluate((tempo) => {
            return new Promise((resolve) => setTimeout(resolve, tempo));
        }, delay);

        // Acessar a página de jogos de hoje da Betano
        console.log('Acessando página de jogos de hoje da Betano...');
        await page.goto('https://www.betano.bet.br/sport/futebol/jogos-de-hoje/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Fazer screenshot para debug (opcional)
        const dataDir = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const screenshotPath = path.join(dataDir, 'betano-debug.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot salvo em ${screenshotPath}`);

        // Aguardar carregamento dos jogos com retry
        console.log('Aguardando carregamento dos jogos...');
        let tentativas = 0;
        const maxTentativas = 3;
        let seletor = '.events-list__grid';
        let seletorEncontrado = false;
        
        while (tentativas < maxTentativas && !seletorEncontrado) {
            try {
                await page.waitForSelector(seletor, { timeout: 15000 });
                console.log(`Seletor ${seletor} encontrado!`);
                seletorEncontrado = true;
            } catch (error) {
                tentativas++;
                console.log(`Tentativa ${tentativas}/${maxTentativas} falhou. Tentando seletor alternativo...`);
                
                // Tentar seletores alternativos (comuns em sites de apostas)
                if (tentativas === 1) {
                    seletor = '.event-list';
                } else if (tentativas === 2) {
                    seletor = '.events';
                }
                
                if (tentativas === maxTentativas) {
                    console.error('Não foi possível encontrar a lista de jogos. Verificando HTML da página...');
                    const htmlContent = await page.content();
                    const htmlPath = path.join(dataDir, 'betano-page.html');
                    fs.writeFileSync(htmlPath, htmlContent);
                    console.log(`HTML da página salvo em ${htmlPath} para análise`);
                    throw new Error('Não foi possível encontrar a lista de jogos após múltiplas tentativas');
                }
            }
        }

        // Scroll para baixo para carregar mais jogos (se necessário)
        console.log('Rolando a página para carregar mais jogos...');
        await autoScroll(page);

        // Extrair dados dos jogos com seletores atualizados
        console.log('Extraindo dados dos jogos...');
        const jogos = await page.evaluate((seletorUtilizado) => {
            const listaJogos = [];
            const seletores = {
                container: seletorUtilizado,
                evento: '.events-list__grid__event, .event-list__item, .event-item',
                times: '.events-list__grid__info__main__participants__participant-name, .event-name',
                odds: '.selections__selection__odd, .odd-price, .odd-value',
                liga: '.events-list__grid__info__competition, .event-league, .competition-name',
                dataHora: '.events-list__grid__info__datetime, .event-time, .event-date'
            };

            // Selecionar todos os jogos listados usando diferentes possíveis seletores
            const eventosJogos = document.querySelectorAll(seletores.evento);
            console.log(`Encontrados ${eventosJogos.length} eventos`);

            eventosJogos.forEach((evento, index) => {
                try {
                    // Extrair times com suporte a múltiplos seletores
                    const times = evento.querySelectorAll(seletores.times);
                    const timeA = times[0]?.textContent.trim() || 'N/A';
                    const timeB = times.length > 1 ? times[1]?.textContent.trim() : 'N/A';

                    // Extrair odds com suporte a múltiplos seletores
                    const odds = evento.querySelectorAll(seletores.odds);
                    const oddA = odds[0]?.textContent.trim() || 'N/A';
                    const oddEmpate = odds.length > 1 ? odds[1]?.textContent.trim() : 'N/A';
                    const oddB = odds.length > 2 ? odds[2]?.textContent.trim() : 'N/A';

                    // Extrair liga/campeonato
                    const ligaElement = evento.querySelector(seletores.liga);
                    const liga = ligaElement ? ligaElement.textContent.trim() : 'N/A';

                    // Extrair data/hora
                    const dataHoraElement = evento.querySelector(seletores.dataHora);
                    const dataHora = dataHoraElement ? dataHoraElement.textContent.trim() : 'N/A';

                    // Função para converter string de odd em número
                    const parseOdd = (oddStr) => {
                        if (oddStr === 'N/A') return 0;
                        // Substituir vírgula por ponto e converter para número
                        return parseFloat(oddStr.replace(',', '.')) || 0;
                    };

                    // Adicionar à lista de jogos
                    listaJogos.push({
                        id: `betano-${index}-${Date.now()}`,
                        liga,
                        timeA,
                        timeB,
                        oddA: parseOdd(oddA),
                        oddEmpate: parseOdd(oddEmpate),
                        oddB: parseOdd(oddB),
                        dataHora,
                        fonte: 'Betano'
                    });
                } catch (error) {
                    console.error(`Erro ao processar evento ${index}`);
                }
            });

            return listaJogos;
        }, seletor);

        console.log(`Foram encontrados ${jogos.length} jogos`);

        // Salvar dados em um arquivo JSON
        const dataAtual = new Date().toISOString().split('T')[0];
        const dadosJson = {
            fonte: 'Betano',
            dataExtracao: new Date().toISOString(),
            totalJogos: jogos.length,
            jogos: jogos
        };

        const jsonFilePath = path.join(dataDir, `betano_jogos_${dataAtual}.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(dadosJson, null, 2));

        console.log(`Dados salvos com sucesso em ${jsonFilePath}!`);
        return dadosJson;

    } catch (error) {
        console.error('Erro durante o scraping:', error);
        throw error;
    } finally {
        await browser.close();
        console.log('Navegador fechado');
    }
}

// Função para rolar a página automaticamente e carregar mais conteúdo
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight - window.innerHeight || totalHeight > 10000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

module.exports = { scrapeBetano };

// Executar diretamente se este arquivo for chamado diretamente
if (require.main === module) {
    scrapeBetano()
        .then(() => console.log('Scraping concluído com sucesso'))
        .catch(err => console.error('Erro no scraping:', err));
}