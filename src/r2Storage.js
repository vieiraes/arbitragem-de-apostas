const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET || 'bucket-cf';
const OBJECT_KEY = 'oportunidades.json';

/**
 * Faz upload do JSON de oportunidades para o Cloudflare R2.
 * @param {Array} data - Array de oportunidades
 */
async function uploadOportunidades(data) {
    const jsonString = JSON.stringify(data, null, 2);

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: OBJECT_KEY,
        Body: jsonString,
        ContentType: 'application/json',
        // Deixa o objeto acessível publicamente (requer bucket com acesso público habilitado no CF)
        CacheControl: 'no-cache, no-store, must-revalidate',
    });

    await r2Client.send(command);
    console.log(`✅ JSON enviado para R2: ${BUCKET_NAME}/${OBJECT_KEY}`);
}

/**
 * Lê o JSON de oportunidades direto do R2 (fallback quando o arquivo local não existe).
 * @returns {Array} Array de oportunidades
 */
async function downloadOportunidades() {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: OBJECT_KEY,
    });

    const response = await r2Client.send(command);

    // Converte o stream para string
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(body);
}

module.exports = { uploadOportunidades, downloadOportunidades };
