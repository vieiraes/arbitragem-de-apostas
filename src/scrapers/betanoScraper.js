const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

async function scrapeBetano() {
    console.log('Iniciando scraping via Interceptação de API da Betano (Série A e B)...');

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security'
        ]
    });

    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        let rawEventsData = [];

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/')) {
                try {
                    const contentType = response.headers()['content-type'];
                    if (contentType && contentType.includes('application/json')) {
                        const json = await response.json();
                        rawEventsData.push({ url, data: json });
                    }
                } catch (e) {}
            }
        });

        const urlsAlvo = [
            'https://www.betano.bet.br/sport/futebol/brasil/copa-betano-do-brasil/10008/',
            'https://www.betano.bet.br/sport/futebol/brasil/brasileirao-serie-a-betano/10016/',
            'https://www.betano.bet.br/sport/futebol/brasil/brasileirao-serie-b/10017/',
            'https://www.betano.bet.br/sport/futebol/brasil/brasileirao-serie-c/18249/',
            'https://www.betano.bet.br/sport/futebol/brasil/brasileirao-serie-d/182510/'
        ];

        for (const targetUrl of urlsAlvo) {
            console.log(`Acessando: ${targetUrl}`);
            try {
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 4000));
            } catch (e) {
                console.log(`Timeout ou erro ao acessar ${targetUrl}, continuando...`);
            }
        }

        // Analisa os JSONs coletados
        let jogosEncontrados = [];
        
        function findEventsRecursively(obj) {
            if (!obj) return;
            if (Array.isArray(obj)) {
                obj.forEach(item => findEventsRecursively(item));
                return;
            }
            if (typeof obj === 'object') {
                if (obj.participants && Array.isArray(obj.participants) && obj.markets && Array.isArray(obj.markets)) {
                    jogosEncontrados.push(obj);
                }
                Object.values(obj).forEach(val => findEventsRecursively(val));
            }
        }
        
        rawEventsData.forEach(item => findEventsRecursively(item.data));
        
        // Desduplicar eventos por ID
        const jogosUnicos = Array.from(new Set(jogosEncontrados.map(a => a.id)))
            .map(id => jogosEncontrados.find(a => a.id === id));
            
        console.log(`Encontrei ${jogosUnicos.length} possíveis eventos únicos nos JSONs.`);
        
        const jogosFormatados = [];
        
        jogosUnicos.forEach((eventoRaw, index) => {
            try {
                if (eventoRaw.participants.length >= 2) {
                    const timeA = eventoRaw.participants[0].name;
                    const timeB = eventoRaw.participants[1].name;
                    
                    let liga = eventoRaw.leagueName || eventoRaw.competitionName || "Futebol Brasil";
                    
                    let oddA = 0, oddEmpate = 0, oddB = 0;
                    
                    const mercado1x2 = eventoRaw.markets.find(m => m.name === "Resultado Final" || m.name === "Match Result" || (m.selections && m.selections.length === 3));
                    
                    if (mercado1x2 && mercado1x2.selections && mercado1x2.selections.length >= 2) {
                        oddA = mercado1x2.selections[0].price;
                        if (mercado1x2.selections.length === 3) {
                            oddEmpate = mercado1x2.selections[1].price;
                            oddB = mercado1x2.selections[2].price;
                        } else {
                            oddB = mercado1x2.selections[1].price;
                        }
                    }
                    
                    const timestamp = eventoRaw.startTime || Date.now();
                    const urlAposta = eventoRaw.url ? `https://www.betano.bet.br${eventoRaw.url}` : null;
                    
                    if (oddA > 0 && oddB > 0) {
                        // Cálculo do ganho previsto igual ao da calculadora (Baseado apenas em Time A e Time B)
                        // Investimento necessário para retornar 1
                        const investimento = (1 / oddA) + (1 / oddB);
                        const lucro = 1 - investimento;
                        const ganhoPrevistoPerc = lucro * 100;
                        
                        // O usuário pediu apenas ganhos > 30%
                        if (ganhoPrevistoPerc > 30) {
                            jogosFormatados.push({
                                id: eventoRaw.id || `betano-${index}`,
                                liga: liga,
                                timeA,
                                timeB,
                                oddA,
                                oddEmpate,
                                oddB,
                                ganhoPrevisto: parseFloat(ganhoPrevistoPerc.toFixed(2)),
                                dataHora: new Date(timestamp).toLocaleString(),
                                url: urlAposta,
                                fonte: 'Betano'
                            });
                        }
                    }
                }
            } catch(e) {}
        });

        // Ordenar pelos maiores ganhos
        jogosFormatados.sort((a, b) => b.ganhoPrevisto - a.ganhoPrevisto);
        
        console.log(`Jogos com ganho > 30% encontrados: ${jogosFormatados.length}`);
        
        const dadosJson = {
            fonte: 'Betano',
            dataExtracao: new Date().toISOString(),
            totalJogos: jogosFormatados.length,
            jogos: jogosFormatados
        };

        const dataAtual = new Date().toISOString().split('T')[0];
        const jsonFilePath = path.join(dataDir, `betano_jogos_${dataAtual}.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(dadosJson, null, 2));

        console.log(`Dados salvos com sucesso em ${jsonFilePath}!`);
        return dadosJson;

    } catch (error) {
        console.error('Erro durante o scraping via API:', error);
        throw error;
    } finally {
        await browser.close();
        console.log('Navegador fechado');
    }
}

module.exports = { scrapeBetano };

if (require.main === module) {
    scrapeBetano()
        .then(() => console.log('Scraping concluído com sucesso'))
        .catch(err => console.error('Erro no scraping:', err));
}