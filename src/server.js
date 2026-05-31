const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const port = process.env.PORT || 3000;

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/oportunidades', (req, res) => {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        return res.json([]);
    }

    try {
        const files = fs.readdirSync(dataDir)
            .filter(file => file.endsWith('.json') && file.startsWith('betano_jogos_'))
            .sort((a, b) => {
                const statA = fs.statSync(path.join(dataDir, a));
                const statB = fs.statSync(path.join(dataDir, b));
                return statB.mtimeMs - statA.mtimeMs;
            });

        if (files.length === 0) {
            return res.json([]);
        }

        const latestFile = path.join(dataDir, files[0]);
        const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

        if (!data.jogos) {
            return res.json([]);
        }

        // Filtra para manter apenas futebol e apostas com ganho projetado > 30%
        const oportunidades = data.jogos.filter(jogo => {
            const ligaLower = (jogo.liga || "").toLowerCase();
            const naoFutebol = ["nba", "nfl", "basquete", "vôlei", "tênis", "nhl", "mlb"];
            if (naoFutebol.some(palavra => ligaLower.includes(palavra))) return false;

            const oddA = parseFloat(jogo.oddA);
            const oddB = parseFloat(jogo.oddB);
            
            if (isNaN(oddA) || isNaN(oddB) || oddA === 0 || oddB === 0) return false;

            const apostaA = 100 / oddA;
            const apostaB = 100 / oddB;
            const totalInvestido = apostaA + apostaB;

            const percentualGanho = ((100 - totalInvestido) / 100) * 100;
            jogo.percentualGanhoCalc = percentualGanho;
            
            return percentualGanho > 30;
        });

        // Ordena pelo maior ganho
        oportunidades.sort((a, b) => b.percentualGanhoCalc - a.percentualGanhoCalc);

        res.json(oportunidades);
    } catch (error) {
        console.error("Erro ao ler dados:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

const { exec } = require('child_process');

app.post('/api/scrape', (req, res) => {
    console.log("Iniciando web scraping manualmente pelo painel...");
    
    // Executa o comando npm run scrape no diretório raiz
    const projectRoot = path.join(__dirname, '..');
    
    exec('npm run scrape', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro na execução do scraper: ${error}`);
            return res.status(500).json({ error: "Erro ao executar o scraper", details: error.message });
        }
        console.log("Scraping finalizado via painel.");
        res.json({ success: true, message: "Scraping concluído com sucesso." });
    });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
