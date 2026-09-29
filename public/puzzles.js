// Membuat 120 soal unik (maks 3 input A,B,C & 3 gerbang) + gambar SVG-nya. Dipakai siswa & admin.
(function (root) {
  const V = ['A', 'B', 'C'], OPS = ['AND', 'OR', 'XOR'];
  const ev = (n, e) => { if (typeof n == 'string') return e[n]; const a = ev(n.a, e); if (n.op == 'NOT') return !a; const b = ev(n.b, e); return n.op == 'AND' ? a && b : n.op == 'OR' ? a || b : a !== b; };
  const str = (n, top) => typeof n == 'string' ? n : n.op == 'NOT' ? 'NOT ' + str(n.a) : top ? str(n.a) + ' ' + n.op + ' ' + str(n.b) : '(' + str(n, 1) + ')';
  const env = m => ({ A: !!(m & 4), B: !!(m & 2), C: !!(m & 1) });
  const key = n => { let s = ''; for (let m = 0; m < 8; m++) s += +ev(n, env(m)); return s; };
  const dep = n => V.filter(v => { for (let m = 0; m < 8; m++) { const e = env(m); if (ev(n, e) !== ev(n, { ...e, [v]: !e[v] })) return 1; } return 0; }).length;
  const vars = n => { const s = new Set; (function w(x) { if (typeof x == 'string') s.add(x); else { w(x.a); x.b && w(x.b); } })(n); return V.filter(v => s.has(v)); };

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

  function steps(n, out = [], seen = new Set()) {
    if (typeof n == 'string') return out;
    steps(n.a, out, seen); n.b && steps(n.b, out, seen);
    const t = str(n, 1); if (!seen.has(t)) { seen.add(t); out.push({ n, t }); }
    return out;
  }
  function table(p) {
    const vs = p.vars, st = steps(p.tree), rows = [];
    for (let m = 0; m < 1 << vs.length; m++) { const e = {}; vs.forEach((v, i) => e[v] = !!((m >> (vs.length - 1 - i)) & 1)); rows.push([...vs.map(v => +e[v]), ...st.map(x => +ev(x.n, e))]); }
    return { vars: vs, cols: st.map((x, j) => j == st.length - 1 ? 'Q' : x.t), rows };
  }

  const S = 'fill="#fff" stroke="#1d3557" stroke-width="2.5"';
  const gate = (op, x, y) => {
    const t = (dx) => `<text x="${x + dx}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#1d3557" stroke="none">${op}</text>`;
    if (op == 'NOT') return `<path d="M${x - 20} ${y - 14}L${x + 8} ${y}L${x - 20} ${y + 14}Z" ${S}/><circle cx="${x + 12}" cy="${y}" r="4" ${S}/>${t(-6)}`;
    if (op == 'AND') return `<path d="M${x - 25} ${y - 20}H${x}A20 20 0 0 1 ${x} ${y + 20}H${x - 25}Z" ${S}/>${t(-8)}`;
    return `<path d="M${x - 25} ${y - 20}C${x - 5} ${y - 20} ${x + 15} ${y - 12} ${x + 25} ${y}C${x + 15} ${y + 12} ${x - 5} ${y + 20} ${x - 25} ${y + 20}C${x - 15} ${y + 8} ${x - 15} ${y - 8} ${x - 25} ${y - 20}Z" ${S}/>`
      + (op == 'XOR' ? `<path d="M${x - 32} ${y - 20}C${x - 22} ${y - 8} ${x - 22} ${y + 8} ${x - 32} ${y + 20}" fill="none"/>` : '') + t(0);
  };

  function svg(p) {
    const ys = {}, busX = {}; 
    let w = '', sh = '', maxY = 0;
    const startX = 35;

    // 1. Grid Y untuk Input A, B, C dengan spasi luas
    p.vars.forEach((v, i) => { 
      ys[v] = 40 + i * 50; 
      busX[v] = startX + 15 + i * 14; 
    });

    const walk = (n) => {
      if (typeof n == 'string') return { L: 0, y: ys[n], v: n };
      
      const kids = [n.a, n.b].filter(Boolean).map(walk).sort((a, b) => a.y - b.y);
      const L = 1 + Math.max(...kids.map(k => k.L));
      
      // Hitung Y dasar
      let targetY = kids.reduce((s, k) => s + k.y, 0) / kids.length;

      // KUNCI PERBAIKAN: Jika gerbang terhubung langsung ke variabel tunggal (misal B di B OR (A AND C)),
      // geser posisi Y gerbang agar kawat masuknya lurus horizontal!
      if (kids.length === 2 && (kids[0].v || kids[1].v)) {
        if (!kids[0].v) targetY = kids[0].y + 18;
        else if (!kids[1].v) targetY = kids[1].y - 18;
      }

      const y = targetY;
      maxY = Math.max(maxY, y);

      // Skala X antar tingkat gerbang
      const x = 165 + (L - 1) * 115; 
      const inX = x - (n.op == 'NOT' ? 20 : n.op == 'XOR' ? 32 : 25); 

      // Hubungkan Kawat ke Gerbang
      kids.forEach((k, i) => {
        const inY = kids.length == 1 ? y : (i === 0 ? y - 9 : y + 9);

        if (k.v) {
          // Dari Bus Input Utama (A, B, C)
          const bx = busX[k.v];
          // Jalur Orthogonal Siku-90 yang bersih
          w += `<path d="M${bx} ${k.y} V${inY} H${inX}"/>`;
          w += `<circle cx="${bx}" cy="${k.y}" r="3" fill="#1d3557"/>`;
        } else {
          // Dari Gerbang Sebelumnya
          const midX = k.x + 15 + (L * 8); // Offset channel vertikal terpisah
          w += `<path d="M${k.x} ${k.y} H${midX} V${inY} H${inX}"/>`;
        }
      });

      sh += gate(n.op, x, y);
      const outX = x + (n.op == 'NOT' ? 12 : n.op == 'AND' ? 25 : 25);
      return { L, y, x: outX };
    };

    const r = walk(p.tree);

    // Label Input A, B, C
    p.vars.forEach(v => { 
      w += `<path d="M${startX} ${ys[v]} H${busX[v]}"/>`; 
      sh += `<text x="${startX - 10}" y="${ys[v] + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d3557" stroke="none">${v}</text>`; 
    });

    // Label Output Q
    w += `<path d="M${r.x} ${r.y} H${r.x + 25}"/>`;
    sh += `<text x="${r.x + 38}" y="${r.y + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="#e63946" stroke="none">Q</text>`;

    const W = r.x + 55; 
    const H = Math.max(maxY + 35, ys[p.vars[p.vars.length - 1]] + 30);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W * 1.15}px; display:block; margin:auto;" font-family="system-ui,sans-serif"><g stroke="#1d3557" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round">${w}${sh}</g></svg>`;
  }

  root.LOGIC = { PUZZLES: P, svg, table };
  if (typeof module != 'undefined') module.exports = root.LOGIC;
})(typeof window != 'undefined' ? window : globalThis);
