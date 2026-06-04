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
const METADATA_KEY = 'oportunidades-meta.json';
const RAW_BETANO_KEY = 'betano/raw/latest.json';

async function putJsonObject(key, data) {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate',
    });

    await r2Client.send(command);
}

async function getJsonObject(key) {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
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

/**
 * Faz upload do JSON de oportunidades para o Cloudflare R2.
 * @param {Array} data - Array de oportunidades
 */
async function uploadOportunidades(data) {
    await putJsonObject(OBJECT_KEY, data);
    console.log(`✅ JSON enviado para R2: ${BUCKET_NAME}/${OBJECT_KEY}`);
}

/**
 * Lê o JSON de oportunidades direto do R2 (fallback quando o arquivo local não existe).
 * @returns {Array} Array de oportunidades
 */
async function downloadOportunidades() {
    return getJsonObject(OBJECT_KEY);
}

async function uploadScrapeMetadata(metadata) {
    await putJsonObject(METADATA_KEY, metadata);
    console.log(`✅ Metadados enviados para R2: ${BUCKET_NAME}/${METADATA_KEY}`);
}

async function downloadScrapeMetadata() {
    return getJsonObject(METADATA_KEY);
}

async function uploadRawBetanoData(data) {
    await putJsonObject(RAW_BETANO_KEY, data);
    console.log(`✅ JSON bruto da Betano enviado para R2: ${BUCKET_NAME}/${RAW_BETANO_KEY}`);
}

module.exports = {
    uploadOportunidades,
    downloadOportunidades,
    uploadScrapeMetadata,
    downloadScrapeMetadata,
    uploadRawBetanoData,
};
