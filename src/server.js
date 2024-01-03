const express = require('express');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
