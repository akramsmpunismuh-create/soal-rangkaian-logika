// Membuat 120 soal unik (maks 3 input A,B,C & 3 gerbang) + gambar SVG-nya. Dipakai siswa & admin.
(function (root) {
  const V = ['A', 'B', 'C'], OPS = ['AND', 'OR', 'XOR'];
  const ev = (n, e) => { if (typeof n == 'string') return e[n]; const a = ev(n.a, e); if (n.op == 'NOT') return !a; const b = ev(n.b, e); return n.op == 'AND' ? a && b : n.op == 'OR' ? a || b : a !== b; };
  const str = (n, top) => typeof n == 'string' ? n : n.op == 'NOT' ? 'NOT ' + str(n.a) : top ? str(n.a) + ' ' + n.op + ' ' + str(n.b) : '(' + str(n, 1) + ')';
  const env = m => ({ A: !!(m & 4), B: !!(m & 2), C: !!(m & 1) });
  const key = n => { let s = ''; for (let m = 0; m < 8; m++) s += +ev(n, env(m)); return s; };
  const dep = n => V.filter(v => { for (let m = 0; m < 8; m++) { const e = env(m); if (ev(n, e) !== ev(n, { ...e, [v]: !e[v] })) return 1; } return 0; }).length;
  const vars = n => { const s = new Set; (function w(x) { if (typeof x == 'string') s.add(x); else { w(x.a); x.b && w(x.b); } })(n); return V.filter(v => s.has(v)); };

  // semua pohon rangkaian dengan tepat g gerbang (NOT hanya di input)
  const T = [V.slice()];
  for (let g = 1; g <= 3; g++) {
    const r = [];
    if (g == 1) V.forEach(v => r.push({ op: 'NOT', a: v }));
    for (let i = 0; i < g; i++) for (const a of T[i]) for (const b of T[g - 1 - i]) for (const op of OPS) r.push({ op, a, b });
    T.push(r);
  }
  const seen = new Set(), all = [];
  T[0].concat(T[1]).forEach(t => seen.add(key(t)));
  T.forEach((r, g) => { if (g < 2) return; r.forEach(t => {
    const vs = vars(t); if (vs.length < 2 || dep(t) != vs.length) return;
    const k = key(t); if (seen.has(k)) return; seen.add(k);
    all.push({ tree: t, g, vars: vs, text: str(t, 1) });
  }); });
  const lo = all.filter(p => p.g == 2), hi = all.filter(p => p.g == 3), need = 120 - lo.length;
  const P = lo.concat(Array.from({ length: need }, (_, k) => hi[Math.floor(k * hi.length / need)])).slice(0, 120);
  P.forEach((p, i) => p.id = i);

  function steps(n, out = [], seen = new Set()) { // hasil tiap gerbang, urut dari input ke Q
    if (typeof n == 'string') return out;
    steps(n.a, out, seen); n.b && steps(n.b, out, seen);
    const t = str(n, 1); if (!seen.has(t)) { seen.add(t); out.push({ n, t }); }
    return out;
  }
  function table(p) { // baris = [input..., langkah..., Q]
    const vs = p.vars, st = steps(p.tree), rows = [];
    for (let m = 0; m < 1 << vs.length; m++) { const e = {}; vs.forEach((v, i) => e[v] = !!((m >> (vs.length - 1 - i)) & 1)); rows.push([...vs.map(v => +e[v]), ...st.map(x => +ev(x.n, e))]); }
    return { vars: vs, cols: st.map((x, j) => j == st.length - 1 ? 'Q' : x.t), rows };
  }

  const S = 'fill="#fff" stroke="#1d3557" stroke-width="2.5"';
  const gate = (op, x, y) => {
    const t = dx => `<text x="${x + dx}" y="${y + 4}" text-anchor="middle" font-size="11" fill="#1d3557" stroke="none">${op}</text>`;
    if (op == 'NOT') return `<path d="M${x - 20} ${y - 16}L${x + 14} ${y}L${x - 20} ${y + 16}Z" ${S}/><circle cx="${x + 18}" cy="${y}" r="4" ${S}/>${t(-8)}`;
    if (op == 'AND') return `<path d="M${x - 30} ${y - 25}H${x}A25 25 0 0 1 ${x} ${y + 25}H${x - 30}Z" ${S}/>${t(-8)}`;
    return `<path d="M${x - 30} ${y - 25}C${x - 5} ${y - 25} ${x + 20} ${y - 15} ${x + 30} ${y}C${x + 20} ${y + 15} ${x - 5} ${y + 25} ${x - 30} ${y + 25}C${x - 18} ${y + 10} ${x - 18} ${y - 10} ${x - 30} ${y - 25}Z" ${S}/>`
      + (op == 'XOR' ? `<path d="M${x - 38} ${y - 25}C${x - 26} ${y - 10} ${x - 26} ${y + 10} ${x - 38} ${y + 25}" fill="none"/>` : '') + t(0);
  };

  function svg(p) {
    const ys = {}, bus = {}, col = {}; let w = '', sh = '', maxY = 0;
    p.vars.forEach((v, i) => { ys[v] = 50 + i * 70; bus[v] = 62 + i * 14; });
    const walk = n => {
      if (typeof n == 'string') return { L: 0, y: ys[n], v: n };
      const kids = [n.a, n.b].filter(Boolean).map(walk).sort((p, q) => p.y - q.y), L = 1 + Math.max(...kids.map(k => k.L));
      let y = kids.reduce((s, k) => s + k.y, 0) / kids.length;
      const u = col[L] = col[L] || []; while (u.some(q => Math.abs(q - y) < 60)) y += 60; u.push(y);
      const x = 170 + (L - 1) * 130, tx = x - (n.op == 'NOT' ? 20 : 28); maxY = Math.max(maxY, y);
      kids.forEach((k, i) => {
        const ty = y + (kids.length == 1 ? 0 : i ? 12 : -12);
        w += k.v ? `<path d="M${bus[k.v]} ${k.y}V${ty}H${tx}"/><circle cx="${bus[k.v]}" cy="${ty}" r="3" fill="#1d3557"/>`
                 : `<path d="M${k.x} ${k.y}H${tx - 18}V${ty}H${tx}"/>`;
      });
      sh += gate(n.op, x, y);
      return { L, y, x: x + (n.op == 'NOT' ? 22 : n.op == 'AND' ? 25 : 30) };
    };
    const r = walk(p.tree);
    p.vars.forEach(v => { w += `<path d="M42 ${ys[v]}H${bus[v]}"/>`; sh += `<text x="26" y="${ys[v] + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#1d3557" stroke="none">${v}</text>`; });
    w += `<path d="M${r.x} ${r.y}H${r.x + 40}"/>`;
    sh += `<text x="${r.x + 54}" y="${r.y + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#e63946" stroke="none">Q</text>`;
    const W = r.x + 80, H = Math.max(maxY, ys[p.vars[p.vars.length - 1]]) + 50;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W * 1.3}px" font-family="system-ui,sans-serif"><g stroke="#1d3557" stroke-width="2.5" fill="none" stroke-linejoin="round">${w}${sh}</g></svg>`;
  }
  root.LOGIC = { PUZZLES: P, svg, table };
  if (typeof module != 'undefined') module.exports = root.LOGIC;
})(typeof window != 'undefined' ? window : globalThis);
