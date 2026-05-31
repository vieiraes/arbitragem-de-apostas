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

document.addEventListener('DOMContentLoaded', carregarOportunidades);

function usarOportunidade(oddA, oddB) {
    document.getElementById("oddTimeA").value = oddA;
    document.getElementById("oddTimeB").value = oddB;
    
    if (!document.getElementById("retornoDesejado").value) {
        document.getElementById("retornoDesejado").value = 100;
    }
    
    calcularApostas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function carregarOportunidades() {
    const tbody = document.querySelector('#tabelaOportunidades tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Buscando oportunidades...</td></tr>';

    try {
        const response = await fetch('/api/oportunidades');
        const oportunidades = await response.json();

        if (oportunidades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Nenhuma oportunidade com odds equilibradas encontrada no momento.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        oportunidades.forEach(jogo => {
            const tr = document.createElement('tr');
            
            const linkHtml = jogo.url ? 
                `<a href="${jogo.url}" target="_blank" class="btn btn-sm btn-outline-info ms-1 mt-1 mt-sm-0" title="Abrir na Betano">
                    <i class="fas fa-external-link-alt"></i> Betano
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
                    <span class="badge bg-primary fs-6 me-1">${jogo.oddA}</span>
                    <span class="badge bg-secondary fs-6">${jogo.oddB}</span>
                    ${ganhoHtml}
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-success" onclick="usarOportunidade(${jogo.oddA}, ${jogo.oddB})">
                        <i class="fas fa-play"></i> Usar
                    </button>
                    ${linkHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar oportunidades:', error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Erro ao carregar dados. O servidor local está rodando?</td></tr>';
    }
}

async function dispararScraping() {
    const btn = document.getElementById('btnScrape');
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Buscando na Betano...';
        btn.disabled = true;
    }
    
    try {
        const response = await fetch('/api/scrape', { method: 'POST' });
        if (response.ok) {
            await carregarOportunidades();
        } else {
            alert('Erro ao executar o robô. Verifique o terminal para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão ao tentar iniciar o robô.');
    } finally {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-robot me-2"></i> Buscar Novos Jogos';
            btn.disabled = false;
        }
    }
}
