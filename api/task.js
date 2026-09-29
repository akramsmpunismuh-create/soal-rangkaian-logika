const { r, B, TOTAL, norm } = require('../lib/db');
const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { action, name, app, table } = req.body || {}, id = norm(name);
    if (id.length < 3) return res.status(400).json({ error: 'Tulis nama lengkap (minimal 3 huruf).' });
    const key = `${B}:s:${id}`;
    let s = await r.get(key);

    if (action === 'start' && !s) {
      if (await r.setnx(`${B}:init`, 1)) await r.sadd(`${B}:pool`, ...Array.from({ length: TOTAL }, (_, i) => i));
      const idx = await r.spop(`${B}:pool`); // ambil acak & atomik: tidak mungkin kembar
      if (idx == null) return res.status(409).json({ error: 'Semua soal sudah terpakai. Hubungi guru.' });
      s = { name: String(name).trim().slice(0, 60), idx: Number(idx), at: Date.now() };
      if (await r.set(key, s, { nx: true })) await r.sadd(`${B}:names`, id);
      else { await r.sadd(`${B}:pool`, s.idx); s = await r.get(key); } // klik ganda: kembalikan soal
    }
    if (!s) return res.status(404).json({ error: 'Nama belum terdaftar.' });

    if (action === 'help' && !s.helped) { s.helped = Date.now(); await r.set(key, s); }

    if (action === 'submit') {
      const save = async (d, k) => {
        const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(d || '');
        if (!m) throw new Error(`Foto ${k} tidak valid.`);
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 2.5e6) throw new Error(`Foto ${k} terlalu besar.`);
        const path = `${B}/${id.replace(/[^a-z0-9]+/g, '-')}/${k}.${m[1]}`;
        return (await put(path, buf, { access: 'public', addRandomSuffix: true, contentType: 'image/' + m[1] })).url;
      };
      s.app = await save(app, 'screenshot');
      s.table = await save(table, 'tabel');
      s.submittedAt = Date.now();
      await r.set(key, s);
    }
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
