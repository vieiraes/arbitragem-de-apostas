function calcularApostas() {
    var oddTimeA = document.getElementById("oddTimeA").value;
    var oddTimeB = document.getElementById("oddTimeB").value;
    var retornoDesejado = document.getElementById("retornoDesejado").value;
    var mensagemErro = document.getElementById("mensagemErro");

    // Verifica se algum campo está vazio
    if (oddTimeA === '' || oddTimeB === '' || retornoDesejado === '') {
        mensagemErro.style.display = 'block';
        return;
    } else {
        mensagemErro.style.display = 'none';
    }

    oddTimeA = parseFloat(oddTimeA);
    oddTimeB = parseFloat(oddTimeB);
    retornoDesejado = parseFloat(retornoDesejado);

    var apostaTimeA = retornoDesejado / oddTimeA;
    var apostaTimeB = retornoDesejado / oddTimeB;

    document.getElementById("apostaTimeA").innerText = 'R$ ' + apostaTimeA.toFixed(2);
    document.getElementById("apostaTimeB").innerText = 'R$ ' + apostaTimeB.toFixed(2);
    document.getElementById("totalInvestidoValor").innerText = 'R$ ' + (apostaTimeA + apostaTimeB).toFixed(2);
}