function calcularApostas() {
    // Reseta a mensagem de erro e a mensagem de aposta inviável a cada cálculo
    var mensagemErro = document.getElementById("mensagemErro");
    var mensagemInviableBet = document.getElementById("mensagemInviableBet");
    mensagemErro.style.display = 'none';
    mensagemInviableBet.style.display = 'none';

    var oddTimeA = parseFloat(document.getElementById("oddTimeA").value);
    var oddTimeB = parseFloat(document.getElementById("oddTimeB").value);
    var retornoDesejado = parseFloat(document.getElementById("retornoDesejado").value);

    // Verifica se algum campo está vazio ou não é um número
    if (isNaN(oddTimeA) || isNaN(oddTimeB) || isNaN(retornoDesejado)) {
        mensagemErro.style.display = 'block';
        return;
    }

    // Calcula as apostas e o total investido
    var apostaTimeA = retornoDesejado / oddTimeA;
    var apostaTimeB = retornoDesejado / oddTimeB;
    var totalInvestido = apostaTimeA + apostaTimeB;

    // Verifica se a aposta é inviável
    if (totalInvestido >= retornoDesejado) {
        mensagemInviableBet.style.display = 'block';
        return;
    }

    // Calcula a porcentagem do total investido em relação ao retorno desejado
    var percentualComprometido = (totalInvestido / retornoDesejado) * 100;

    // Calcula a diferença percentual entre o total investido e o retorno desejado
    var diferencaPercentual = Math.abs((totalInvestido - retornoDesejado) / retornoDesejado) * 100;

    // Atualiza a barra de progresso e a porcentagem de ganho
    var barraProgresso = document.getElementById("barraProgressoBootstrap");
    barraProgresso.style.width = percentualComprometido + '%';
    barraProgresso.setAttribute('aria-valuenow', percentualComprometido);
    atualizaCorBarraProgresso(barraProgresso, percentualComprometido);

    // Atualiza os valores na interface
    document.getElementById("apostaTimeA").innerText = 'R$ ' + apostaTimeA.toFixed(2);
    document.getElementById("apostaTimeB").innerText = 'R$ ' + apostaTimeB.toFixed(2);
    document.getElementById("totalInvestidoValor").innerText = 'R$ ' + totalInvestido.toFixed(2);
    document.getElementById("valorPorcentagemGanho").innerText = diferencaPercentual.toFixed(2) + '%';
}

function atualizaCorBarraProgresso(barraProgresso, percentual) {
    if (percentual <= 72) {
        barraProgresso.classList.add('bg-success');  // Verde
        barraProgresso.classList.remove('bg-warning', 'bg-danger');
    } else if (percentual <= 86) {
        barraProgresso.classList.add('bg-warning');  // Amarelo
        barraProgresso.classList.remove('bg-success', 'bg-danger');
    } else {
        barraProgresso.classList.add('bg-danger');   // Vermelho
        barraProgresso.classList.remove('bg-success', 'bg-warning');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarOportunidades();
    carregarStatusOportunidades();
});

function usarOportunidade(oddA, oddB) {
    document.getElementById("oddTimeA").value = oddA;
    document.getElementById("oddTimeB").value = oddB;
    
    if (!document.getElementById("retornoDesejado").value) {
        document.getElementById("retornoDesejado").value = 100;
    }
    
    calcularApostas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const competicoesMonitoradas = [
    { id: 'serie-a', nome: 'Brasileirão Série A', termos: ['série a', 'serie a'] },
    { id: 'serie-b', nome: 'Brasileirão Série B', termos: ['série b', 'serie b'] },
    { id: 'serie-c', nome: 'Brasileirão Série C', termos: ['série c', 'serie c'] },
    { id: 'serie-d', nome: 'Brasileirão Série D', termos: ['série d', 'serie d'] },
    { id: 'copa-do-brasil', nome: 'Copa do Brasil', termos: ['copa'] },
];

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function getCompeticaoId(liga) {
    const ligaNormalizada = normalizarTexto(liga);
    const competicao = competicoesMonitoradas.find(item =>
        item.termos.some(termo => ligaNormalizada.includes(normalizarTexto(termo)))
    );

    return competicao?.id || null;
}

function renderizarResumoOportunidades(oportunidades) {
    const resumo = document.getElementById('resumoOportunidades');
    if (!resumo) return;

    const contagem = competicoesMonitoradas.reduce((acc, competicao) => {
        acc[competicao.id] = 0;
        return acc;
    }, {});

    if (Array.isArray(oportunidades)) {
        oportunidades.forEach(oportunidade => {
            const competicaoId = getCompeticaoId(oportunidade.liga);
            if (competicaoId) {
                contagem[competicaoId] += 1;
            }
        });
    }

    resumo.innerHTML = competicoesMonitoradas.map(competicao => {
        const total = contagem[competicao.id];
        const texto = total === 1 ? '1 oportunidade no momento' : `${total} oportunidades no momento`;
        const destaque = total > 0 ? ' resumo-oportunidade-item--ativo' : '';

        return `
            <div class="resumo-oportunidade-item${destaque}">
                <span>${competicao.nome}</span>
                <strong>${texto}</strong>
            </div>
        `;
    }).join('');
}

function alternarResumoOportunidades() {
    const resumo = document.getElementById('resumoOportunidades');
    const toggle = document.getElementById('btnToggleResumo');
    const toggleIcon = toggle?.querySelector('.resumo-oportunidades-toggle-icon');
    if (!resumo || !toggle || !toggleIcon) return;

    const estaExpandido = toggle.getAttribute('aria-expanded') === 'true';
    const deveExpandir = !estaExpandido;
    const label = deveExpandir ? 'Retrair resumo por competição' : 'Expandir resumo por competição';

    toggle.setAttribute('aria-expanded', String(deveExpandir));
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
    resumo.classList.toggle('resumo-oportunidades--collapsed', estaExpandido);
    toggleIcon.classList.toggle('fa-chevron-down', !deveExpandir);
    toggleIcon.classList.toggle('fa-chevron-up', deveExpandir);
}

function renderizarOportunidades(oportunidades, mensagemVazia = 'Nenhuma oportunidade com odds equilibradas encontrada no momento.') {
    const tbody = document.querySelector('#tabelaOportunidades tbody');
    if (!tbody) return;

    renderizarResumoOportunidades(oportunidades);

    if (!Array.isArray(oportunidades) || oportunidades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">${mensagemVazia}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    oportunidades.forEach(jogo => {
        const tr = document.createElement('tr');
        
        const linkHtml = jogo.url ? 
            `<a href="${jogo.url}" target="_blank" class="btn btn-sm btn-outline-info ms-1 mt-1 mt-sm-0 btn-icon-action" title="Abrir na Betano" aria-label="Abrir na Betano">
                <i class="fas fa-external-link-alt"></i>
            </a>` : '';
            
        const ganhoHtml = jogo.ganhoPrevisto ? 
            `<br><small class="text-success fw-bold"><i class="fas fa-chart-line"></i> Ganho: ${jogo.ganhoPrevisto}%</small>` : '';

        tr.innerHTML = `
            <td>
                <div class="fw-bold">${jogo.timeA} <span class="text-muted mx-1">vs</span> ${jogo.timeB}</div>
                <div class="mt-1">
                    <span class="badge bg-secondary opacity-75">${jogo.liga}</span> 
                    <small class="text-muted ms-1">${jogo.dataHora}</small>
                </div>
            </td>
            <td>
                <span class="badge odds-badge-a fs-6 me-1">${jogo.oddA}</span>
                <span class="badge odds-badge-b fs-6">${jogo.oddB}</span>
                ${ganhoHtml}
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-success btn-icon-action" onclick="usarOportunidade(${jogo.oddA}, ${jogo.oddB})" title="Usar odds na calculadora" aria-label="Usar odds na calculadora">
                    <i class="fas fa-play"></i>
                </button>
                ${linkHtml}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getApiBaseUrl() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '' 
        : 'https://arbitragem-de-apostas.onrender.com';
}

function atualizarUltimaExecucaoScrape(lastSuccessfulScrapeAt) {
    const status = document.getElementById('ultimaExecucaoScrape');
    if (!status) return;

    if (!lastSuccessfulScrapeAt) {
        status.innerHTML = '<i class="fas fa-clock me-1"></i>Última busca: ainda não registrada.';
        return;
    }

    const data = new Date(lastSuccessfulScrapeAt);
    if (Number.isNaN(data.getTime())) {
        status.innerHTML = '<i class="fas fa-clock me-1"></i>Última busca: data indisponível.';
        return;
    }

    status.innerHTML = `<i class="fas fa-clock me-1"></i>Última busca: ${data.toLocaleString('pt-BR')}`;
}

function getMensagemResultadoBusca(status) {
    if (!status) {
        return 'Busca concluída. Nenhuma oportunidade com odds equilibradas foi encontrada agora.';
    }

    if (status.status === 'completed_no_events') {
        return 'A busca terminou, mas não conseguimos mapear jogos da Betano agora. Tente novamente em instantes.';
    }

    if (status.status === 'completed_no_odds') {
        return 'A busca encontrou jogos, mas não conseguiu ler odds válidas agora. Tente novamente em instantes.';
    }

    return 'Busca concluída. Nenhuma oportunidade acima de 30% foi encontrada agora.';
}

async function carregarStatusOportunidades() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/api/oportunidades/status`);
        if (!response.ok) return;

        const status = await response.json();
        atualizarUltimaExecucaoScrape(status.lastSuccessfulScrapeAt);
    } catch (error) {
        console.error('Erro ao carregar status das oportunidades:', error);
    }
}

async function carregarOportunidades() {
    const tbody = document.querySelector('#tabelaOportunidades tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Buscando oportunidades...</td></tr>';

    try {
        const API_BASE_URL = getApiBaseUrl();
            
        const response = await fetch(`${API_BASE_URL}/api/oportunidades`);
        
        if (!response.ok) {
            throw new Error('Arquivo de oportunidades não encontrado');
        }
        
        const oportunidades = await response.json();
        renderizarOportunidades(oportunidades);
    } catch (error) {
        console.error('Erro ao carregar oportunidades:', error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Erro ao carregar dados. O servidor local está rodando?</td></tr>';
    }
}

async function dispararScraping() {
    const API_BASE_URL = getApiBaseUrl();

    const btn = document.getElementById('btnScrape');
    const tbody = document.querySelector('#tabelaOportunidades tbody');
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        btn.setAttribute('title', 'Preparando busca');
        btn.setAttribute('aria-label', 'Preparando busca');
        btn.disabled = true;
    }
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Preparando a busca. Na primeira vez, isso pode levar cerca de 1 minuto...</td></tr>';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/scrape`, { method: 'POST' });
        if (response.ok) {
            const result = await response.json();
            renderizarOportunidades(
                result.data,
                getMensagemResultadoBusca(result.status)
            );
            atualizarUltimaExecucaoScrape(result.lastSuccessfulScrapeAt);
        } else {
            alert('Erro ao executar o robô. Verifique o terminal para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão ao tentar iniciar o robô.');
    } finally {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-robot"></i>';
            btn.setAttribute('title', 'Buscar novos jogos');
            btn.setAttribute('aria-label', 'Buscar novos jogos');
            btn.disabled = false;
        }
    }
}
