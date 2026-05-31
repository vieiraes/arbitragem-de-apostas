const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Força o Puppeteer a baixar e procurar o Chrome na pasta local do projeto.
  // Isso resolve o problema de "Could not find Chrome" no Render.com
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
