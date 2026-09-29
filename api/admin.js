const { r, B } = require('../lib/db');

module.exports = async (req, res) => {
  if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: 'Kunci admin salah.' });
  const ids = await r.smembers(`${B}:names`);
  const rows = ids.length ? await r.mget(...ids.map(i => `${B}:s:${i}`)) : [];
  res.json({ left: await r.scard(`${B}:pool`), rows: rows.filter(Boolean) });
};
