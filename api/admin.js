const { r, B, norm } = require('../lib/db');

module.exports = async (req, res) => {
  if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: 'Kunci admin salah.' });
  try {
    if (req.query.img) { // perantara foto, supaya browser bisa membuat ZIP
      const u = new URL(req.query.img);
      if (!u.hostname.endsWith('.blob.vercel-storage.com')) return res.status(400).end();
      const f = await fetch(u);
      res.setHeader('Content-Type', f.headers.get('content-type') || 'image/jpeg');
      return res.send(Buffer.from(await f.arrayBuffer()));
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.action === 'roster') { // simpan daftar siswa: Nama, Kelas, PIN
        const seen = new Set(), list = [];
        for (const line of String(b.text || '').split('\n')) {
          const [name, kelas = '', pin = ''] = line.split(/\t|;|\||,/).map(x => x.trim());
          if (!name) continue;
          const id = norm(kelas ? `${name} ${kelas}` : name);
          if (!seen.has(id)) { seen.add(id); list.push({ id, name: name.slice(0, 60), kelas: kelas.slice(0, 12), pin: pin.slice(0, 12) }); }
        }
        await r.set('roster', list);
        return res.json({ saved: list.length });
      }
      // hapus siswa: data, foto, dan kembalikan soalnya ke daftar
      const { del } = await import('@vercel/blob');
      let n = 0;
      for (const id of [].concat((req.body || {}).ids || []).slice(0, 200)) {
        const key = `${B}:s:${id}`, s = await r.get(key);
        if (!s) continue;
        const urls = [s.app, s.table].filter(Boolean);
        if (urls.length) { try { await del(urls); } catch (e) { /* file sudah hilang */ } }
        await r.del(key); await r.srem(`${B}:names`, id); await r.sadd(`${B}:pool`, s.idx); n++;
      }
      return res.json({ deleted: n });
    }
    const ids = await r.smembers(`${B}:names`);
    const rows = ids.length ? await r.mget(...ids.map(i => `${B}:s:${i}`)) : [];
    res.json({ left: await r.scard(`${B}:pool`), roster: (await r.get('roster')) || [], rows: rows.map((x, i) => x && { ...x, id: ids[i] }).filter(Boolean) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
