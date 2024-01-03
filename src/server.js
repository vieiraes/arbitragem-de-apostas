const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public')); // Defina a pasta que contém seus arquivos HTML/CSS

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
