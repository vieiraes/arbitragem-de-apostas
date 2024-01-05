function calcularApostas() {
    var oddTimeA = parseFloat(document.getElementById("oddTimeA").value);
    var oddTimeB = parseFloat(document.getElementById("oddTimeB").value);
    var retornoDesejado = parseFloat(document.getElementById("retornoDesejado").value);
    var mensagemErro = document.getElementById("mensagemErro");

    // Verifica se algum campo está vazio ou não é um número
    if (isNaN(oddTimeA) || isNaN(oddTimeB) || isNaN(retornoDesejado)) {
        mensagemErro.style.display = 'block';
        return;
    } else {
        mensagemErro.style.display = 'none';
    }

    var apostaTimeA = retornoDesejado / oddTimeA;
    var apostaTimeB = retornoDesejado / oddTimeB;
    var totalInvestido = apostaTimeA + apostaTimeB;

    // Calcula a porcentagem do total investido em relação ao retorno desejado
    var percentualComprometido = (totalInvestido / retornoDesejado) * 100;

    // Calcula a diferença percentual entre o total investido e o retorno desejado
    var diferencaPercentual = Math.abs((totalInvestido - retornoDesejado) / retornoDesejado) * 100;

    // Atualiza a barra de progresso
    var barraProgresso = document.getElementById("barraProgressoBootstrap");
    barraProgresso.style.width = percentualComprometido + '%';
    barraProgresso.setAttribute('aria-valuenow', percentualComprometido);

    // Atualiza as classes da barra de progresso com base na porcentagem comprometida
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
