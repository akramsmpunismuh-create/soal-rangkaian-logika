const { r, B, TOTAL } = require('../lib/db');

module.exports = async (req, res) => {
  try {
    const roster = (await r.get(`${B}:roster`)) || [];
    if (req.method === 'GET') return res.json(roster.map(({ id, name, kelas, pin }) => ({ id, name, kelas, pin: !!pin })));
    if (req.method !== 'POST') return res.status(405).end();
    const { action, id, pin, app, ans } = req.body || {};
    const e = roster.find(x => x.id === id);
    if (!e) return res.status(404).json({ error: 'Nama tidak ada di daftar. Hubungi guru.' });
    if (e.pin && String(pin || '').trim() !== e.pin) return res.status(403).json({ error: 'PIN salah.' });
    const key = `${B}:s:${id}`;
    let s = await r.get(key);

    if (action === 'start' && !s) {
      if (await r.setnx(`${B}:init`, 1)) await r.sadd(`${B}:pool`, ...Array.from({ length: TOTAL }, (_, i) => i));
      const idx = await r.spop(`${B}:pool`); // ambil acak & atomik: tidak mungkin kembar
      if (idx == null) return res.status(409).json({ error: 'Semua soal sudah terpakai. Hubungi guru.' });
      s = { name: e.name, kelas: e.kelas, idx: Number(idx), at: Date.now() };
      if (await r.set(key, s, { nx: true })) await r.sadd(`${B}:names`, id);
      else { await r.sadd(`${B}:pool`, s.idx); s = await r.get(key); } // klik ganda: kembalikan soal
    }
    if (!s) return res.status(404).json({ error: 'Belum mengambil soal.' });

    if (action === 'help' && !s.helped) { s.helped = Date.now(); await r.set(key, s); }

    if (action === 'submit') {
      const { put } = await import('@vercel/blob'); // SDK baru: autentikasi OIDC otomatis
      const save = async (d, k) => {
        const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(d || '');
        if (!m) throw new Error(`Foto ${k} tidak valid.`);
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 2.5e6) throw new Error(`Foto ${k} terlalu besar.`);
        const path = `${B}/${id.replace(/[^a-z0-9]+/g, '-')}/${k}.${m[1]}`;
        return (await put(path, buf, { access: 'public', addRandomSuffix: true, contentType: 'image/' + m[1] })).url;
      };
      if (!/^[01]{8,24}$/.test(ans || '')) return res.status(400).json({ error: 'Isi semua kotak tabel kebenaran dulu.' });
      if (!app && !s.app) return res.status(400).json({ error: 'Screenshot aplikasi wajib diupload.' });
      if (app) s.app = await save(app, 'screenshot');
      s.ans = ans;
      s.submittedAt = Date.now();
      await r.set(key, s);
    }
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
