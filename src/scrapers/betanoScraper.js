const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

function getChromeExecutablePath() {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
    ].filter(Boolean);

    return candidates.find(candidate => fs.existsSync(candidate));
}

function calcularGanhoPrevisto(oddA, oddB) {
    const investimento = (1 / oddA) + (1 / oddB);
    const lucro = 1 - investimento;
    return lucro * 100;
}

function filtrarOportunidades(eventos) {
    return eventos
        .filter(evento => evento.oddA > 0 && evento.oddB > 0)
        .map(evento => ({
            ...evento,
            ganhoPrevisto: parseFloat(calcularGanhoPrevisto(evento.oddA, evento.oddB).toFixed(2)),
        }))
        .filter(evento => evento.ganhoPrevisto > 30)
        .sort((a, b) => b.ganhoPrevisto - a.ganhoPrevisto);
}

function hasOdds(evento) {
    return evento.oddA > 0 && evento.oddB > 0;
}

function deduplicateEventos(eventos) {
    const eventosPorId = new Map();

    eventos.forEach(evento => {
        const existente = eventosPorId.get(evento.id);
        if (!existente) {
            eventosPorId.set(evento.id, evento);
            return;
        }

        if (!hasOdds(existente) && hasOdds(evento)) {
            eventosPorId.set(evento.id, evento);
            return;
        }

        if (hasOdds(existente) && !hasOdds(evento)) {
            return;
        }

        eventosPorId.set(evento.id, {
            ...existente,
            ...evento,
            oddA: evento.oddA || existente.oddA,
            oddEmpate: evento.oddEmpate || existente.oddEmpate,
            oddB: evento.oddB || existente.oddB,
        });
    });

    return Array.from(eventosPorId.values());
}

async function extrairEventosDoDom(page) {
    return page.evaluate(() => {
        function extrairOdd(selection) {
            const ariaLabel = selection.getAttribute('aria-label') || '';
            const match = ariaLabel.match(/odds\s+([\d.]+)/i);
            if (match) return Number(match[1]);

            const oddsText = selection.querySelector('.tw-font-bold')?.textContent?.trim();
            return Number((oddsText || '').replace(',', '.'));
        }

        return Array.from(document.querySelectorAll('[data-qa="event-card"]')).map((card, index) => {
            const link = card.querySelector('a[data-qa="pre-event"]');
            const participantes = link?.getAttribute('data-testid') || '';
            const [timeA = '', timeB = ''] = participantes.split(' - ').map(item => item.trim());

            const selections = Array.from(card.querySelectorAll('[data-qa="event-selection"]'));
            const oddsPorNome = selections.reduce((acc, selection) => {
                const nome = selection.querySelector('.s-name')?.textContent?.trim();
                if (nome) acc[nome] = extrairOdd(selection);
                return acc;
            }, {});

            const spans = Array.from(card.querySelectorAll('span')).map(span => span.textContent.trim());
            const data = spans.find(text => /^\d{1,2}\/\d{1,2}$/.test(text));
            const hora = spans.find(text => /^\d{1,2}:\d{2}$/.test(text));

            return {
                id: card.getAttribute('data-evtid') || `betano-dom-${index}`,
                liga: link?.getAttribute('title') || 'Futebol Brasil',
                timeA,
                timeB,
                oddA: oddsPorNome['1'] || 0,
                oddEmpate: oddsPorNome['X'] || 0,
                oddB: oddsPorNome['2'] || 0,
                dataHora: [data, hora].filter(Boolean).join(' '),
                url: link?.getAttribute('href') ? `https://www.betano.bet.br${link.getAttribute('href')}` : null,
                fonte: 'Betano',
                origem: 'dom',
            };
        }).filter(evento => evento.timeA && evento.timeB);
    });
}

async function scrapeBetano() {
    console.log('Iniciando scraping da Betano...');

    const executablePath = getChromeExecutablePath();
    if (executablePath) {
        console.log(`Usando navegador local: ${executablePath}`);
    } else {
        console.log('Nenhum Chrome local encontrado. Execute `npm run setup:chrome` ou configure PUPPETEER_EXECUTABLE_PATH.');
    }

    const browser = await puppeteer.launch({
        headless: "new",
        ...(executablePath ? { executablePath } : {}),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-features=IsolateOrigins,site-per-process',
        ],
    });

    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    try {
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        let rawEventsData = [];
        let eventosDom = [];

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
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            } catch (e) {
                console.log(`Timeout ou erro ao acessar ${targetUrl}: ${e.message}`);
            }

            try {
                await page.waitForSelector('[data-qa="event-card"]', { timeout: 15000 });
                const eventosDaPagina = await extrairEventosDoDom(page);
                eventosDom.push(...eventosDaPagina);
                console.log(`Eventos extraídos do DOM nesta página: ${eventosDaPagina.length}`);
            } catch (e) {
                console.log(`Nenhum card de evento encontrado no DOM para ${targetUrl}: ${e.message}`);
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
        
        const eventosApiFormatados = [];
        let eventosApiComOdds = 0;
        
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
                        eventosApiComOdds += 1;
                        eventosApiFormatados.push({
                            id: eventoRaw.id || `betano-${index}`,
                            liga: liga,
                            timeA,
                            timeB,
                            oddA,
                            oddEmpate,
                            oddB,
                            dataHora: new Date(timestamp).toLocaleString(),
                            url: urlAposta,
                            fonte: 'Betano',
                            origem: 'api',
                        });
                    }
                }
            } catch(e) {}
        });

        const eventosMapeados = [...eventosApiFormatados, ...eventosDom];
        const eventosUnicos = deduplicateEventos(eventosMapeados);
        const eventosComOdds = eventosUnicos.filter(hasOdds);
        const jogosFormatados = filtrarOportunidades(eventosComOdds);

        let status = 'success_with_opportunities';
        if (eventosUnicos.length === 0) {
            status = 'completed_no_events';
        } else if (eventosComOdds.length === 0) {
            status = 'completed_no_odds';
        } else if (jogosFormatados.length === 0) {
            status = 'success_no_opportunities';
        }

        const summary = {
            status,
            rawResponsesCaptured: rawEventsData.length,
            apiEventsFound: jogosUnicos.length,
            apiEventsWithOdds: eventosApiComOdds,
            domEventsFound: eventosDom.length,
            eventsFound: eventosUnicos.length,
            eventsWithOdds: eventosComOdds.length,
            opportunitiesFound: jogosFormatados.length,
        };
        
        console.log(`Jogos com ganho > 30% encontrados: ${jogosFormatados.length}`);
        console.log('Resumo do scraping:', summary);
        
        const jsonFilePath = path.join(publicDir, 'oportunidades.json');
        fs.writeFileSync(jsonFilePath, JSON.stringify(jogosFormatados, null, 2));

        console.log(`Dados salvos com sucesso em ${jsonFilePath}!`);
        return {
            opportunities: jogosFormatados,
            rawData: {
                source: 'Betano',
                capturedAt: new Date().toISOString(),
                targetUrls: urlsAlvo,
                responses: rawEventsData,
                domEvents: eventosDom,
            },
            summary,
        };

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
        .then(result => console.log('Scraping concluído com sucesso:', result.summary))
        .catch(err => console.error('Erro no scraping:', err));
}
