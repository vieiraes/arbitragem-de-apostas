# Relatório de Conhecimento Inicial: Calculadora de Apostas Arbitrárias

## 1. Visão Geral do Projeto
O projeto **Arbitragem de Apostas** é uma ferramenta projetada para calcular a distribuição ideal de valores em apostas arbitrárias (surebets). O objetivo principal é permitir que o usuário insira as cotações (odds) de dois times e o retorno desejado, para que o sistema calcule quanto deve ser investido em cada opção, garantindo lucro independentemente do resultado da partida.

## 2. Arquitetura e Tecnologias
O projeto é dividido basicamente em três partes: Frontend (Calculadora), Servidor Local (Express) e Web Scraper (Puppeteer).

### Frontend (Interface do Usuário)
*   **Localização:** `src/public/`
*   **Tecnologias:** HTML5, CSS3 (com Bootstrap 5) e JavaScript puro (`script/script.js`).
*   **Funcionalidades:** 
    *   Interface para entrada de dados (odds do Time A, Time B e Retorno Desejado).
    *   Cálculos matemáticos para distribuição do investimento e análise de risco (baixo, médio, alto).
    *   Apresentação do lucro garantido e viabilidade da aposta.

### Backend (Servidor Estático)
*   **Localização:** `src/server.js`
*   **Tecnologias:** Node.js com Express.
*   **Funcionalidades:** Um servidor extremamente simples configurado apenas para servir a pasta estática `src/public` durante o desenvolvimento local (porta 3001 por padrão). Executado via `npm run web`.

### Web Scraper (Coleta de Dados)
*   **Localização:** `src/scrapers/` (principalmente `betanoScraper.js`).
*   **Tecnologias:** Node.js com Puppeteer.
*   **Funcionalidades:** 
    *   Navega na página de jogos de hoje da Betano de forma automatizada (e furtiva).
    *   Extrai informações de times, ligas, datas e cotações (odds).
    *   Salva os dados estruturados em arquivos JSON na pasta raiz `data/` (ex: `betano_jogos_YYYY-MM-DD.json`).
    *   Executado via `npm run scrape`.

### Hospedagem e Deploy
*   **Tecnologia:** Firebase Hosting.
*   **Configuração:** O arquivo `firebase.json` define o diretório `src/public` como a pasta pública a ser servida em produção.
*   **Produção:** A aplicação já encontra-se em produção sob o domínio do Firebase (`https://calculadora-de-apostas-1d2e5.web.app/`).

## 3. Próximos Passos e Oportunidades de Melhoria
Pelo que pude analisar do código e da estrutura, aqui estão algumas oportunidades interessantes:
1.  **Integração do Scraper com a UI:** Atualmente, a calculadora parece depender de inputs manuais das odds. O projeto poderia evoluir conectando os dados extraídos pelo `betanoScraper.js` diretamente na interface, exibindo automaticamente as oportunidades de arbitragem (surebets) encontradas no dia.
2.  **Expansão de Casas de Aposta:** O diretório de `scrapers` sugere uma intenção de expansão. Adicionar scrapers de outras casas (Bet365, Sportingbet, etc.) permitiria cruzar dados entre diferentes plataformas, o que é a essência real da arbitragem de apostas lucrativa.
3.  **Melhoria de Performance do Scraper:** O Puppeteer é robusto, mas APIs diretas (se disponíveis ou por engenharia reversa das requisições web) poderiam tornar a extração de dados muito mais rápida e menos custosa.

## Conclusão
Compreendi perfeitamente a base do seu projeto! Ele está bem organizado em suas responsabilidades, com o ambiente de desenvolvimento local preparado, deploy para o Firebase configurado e scripts iniciais para automatização de coleta de dados prontos para serem expandidos. 

Como posso ajudar na continuidade agora? Quer melhorar a calculadora, evoluir o scraper ou implementar alguma funcionalidade nova?
