const { Redis } = require('@upstash/redis');
const r = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});
const B = process.env.BATCH || 'b1'; // ganti BATCH untuk memulai kelompok soal baru
const TOTAL = 120;
const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 60);
module.exports = { r, B, TOTAL, norm };
