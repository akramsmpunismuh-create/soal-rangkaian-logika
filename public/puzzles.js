// Membuat 120 soal unik & RINGAN (maks 3 input A,B,C & 3 gerbang; AND OR NAND NOR XOR XNOR NOT) + gambar SVG-nya. Dipakai siswa & admin.
(function (root) {
  const V = ['A', 'B', 'C'], OPS = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR'];
  const ev = (n, e) => { if (typeof n == 'string') return e[n]; const a = ev(n.a, e); if (n.op == 'NOT') return !a; const b = ev(n.b, e);
    switch (n.op) { case 'AND': return a && b; case 'OR': return a || b; case 'XOR': return a !== b; case 'NAND': return !(a && b); case 'NOR': return !(a || b); default: return a === b; } };
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
  // Skor kesulitan: NOT = 1, AND/OR/NAND/NOR = 2, XOR/XNOR = 3 (paling sulit dibaca), dijumlah di seluruh pohon.
  const cost = n => typeof n == 'string' ? 0 : (n.op == 'NOT' ? 1 : /^X/.test(n.op) ? 3 : 2) + cost(n.a) + (n.b ? cost(n.b) : 0);

  // Kumpulkan semua fungsi unik; untuk tiap fungsi simpan rangkaian TERMUDAH.
  const seen = new Set(), best = new Map(), all = [];
  T[0].concat(T[1]).forEach(t => seen.add(key(t)));
  T.forEach((r, g) => { if (g < 2) return; r.forEach(t => {
    const vs = vars(t); if (vs.length < 2 || dep(t) != vs.length) return;
    const k = key(t); if (seen.has(k)) return;
    const p = { tree: t, g, vars: vs, text: str(t, 1), level: cost(t) };
    const old = best.get(k);
    if (!old) { best.set(k, p); all.push(p); }
    else if (p.level < old.level) { all[all.indexOf(old)] = p; best.set(k, p); }
  }); });

  // Ambil 120 soal termudah; bila tingkat batas kelebihan, dipilih merata.
  const N = 120, srt = all.slice().sort((x, y) => x.level - y.level);
  const cut = srt[Math.min(N, srt.length) - 1].level;
  const tier = all.filter(p => p.level == cut), keep = all.filter(p => p.level < cut);
  const take = Math.min(N - keep.length, tier.length);
  const chosen = new Set(keep.concat(Array.from({ length: take }, (_, k) => tier[Math.floor(k * tier.length / take)])));
  const P = all.filter(p => chosen.has(p));
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
  const CORE = { NAND: 'AND', NOR: 'OR', XNOR: 'XOR' };
  const gate = (op, x, y) => {
    const t = (dx) => `<text x="${x + dx}" y="${y + 4}" text-anchor="middle" font-size="${op.length > 3 ? 7.5 : op == 'NOT' ? 8 : 9}" font-weight="700" fill="#1d3557" stroke="none">${op}</text>`;
    if (op == 'NOT') return `<path d="M${x - 20} ${y - 14}L${x + 8} ${y}L${x - 20} ${y + 14}Z" ${S}/><circle cx="${x + 12}" cy="${y}" r="4" ${S}/>${t(-9)}`;
    const core = CORE[op] || op, inv = core != op;
    const bub = inv ? `<circle cx="${x + (core == 'AND' ? 24 : 29)}" cy="${y}" r="4" ${S}/>` : '';
    if (core == 'AND') return `<path d="M${x - 25} ${y - 20}H${x}A20 20 0 0 1 ${x} ${y + 20}H${x - 25}Z" ${S}/>${bub}${t(-12)}`;
    return `<path d="M${x - 25} ${y - 20}C${x - 5} ${y - 20} ${x + 15} ${y - 12} ${x + 25} ${y}C${x + 15} ${y + 12} ${x - 5} ${y + 20} ${x - 25} ${y + 20}C${x - 15} ${y + 8} ${x - 15} ${y - 8} ${x - 25} ${y - 20}Z" ${S}/>`
      + (core == 'XOR' ? `<path d="M${x - 32} ${y - 20}C${x - 22} ${y - 8} ${x - 22} ${y + 8} ${x - 32} ${y + 20}" fill="none"/>` : '') + bub + t(0);
  };

  // Normalisasi pohon AST agar format string ("NOT A") diubah jadi objek konsisten
  function parseTree(n) {
    if (typeof n === 'string') {
      if (n.startsWith('NOT ')) return { op: 'NOT', a: n.replace('NOT ', '') };
      return n;
    }
    return { op: n.op, a: parseTree(n.a), b: n.b ? parseTree(n.b) : null };
  }

  function svg(p) {
    let w = '', sh = '';
    const tree = parseTree(p.tree);

    // Grid Y Tetap untuk Variabel A, B, C
    const yMap = { A: 30, B: 90, C: 150 };
    const xLabel = 18;
    const busX = { A: 45, B: 60, C: 75 };

    // Render Label Input A, B, C
    p.vars.forEach(v => {
      if (yMap[v] !== undefined) {
        w += `<path d="M${xLabel} ${yMap[v]} H${busX[v]}"/>`;
        sh += `<text x="${xLabel - 8}" y="${yMap[v] + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d3557" stroke="none">${v}</text>`;
      }
    });

    // Menghitung Posisi Y Gerbang dengan Penanganan Khusus Pasangan A & C
    function calcY(node) {
      if (typeof node === 'string') return yMap[node] !== undefined ? yMap[node] : 90;
      if (node.op === 'NOT') return calcY(node.a);
      const yA = calcY(node.a);
      const yB = calcY(node.b);
      // Jika input berasal dari rentang A (30) dan C (150), geser Y gerbang ke 125 agar jalur B (90) tidak tertabrak
      if (Math.min(yA, yB) <= 45 && Math.max(yA, yB) >= 135) return 125;
      return (yA + yB) / 2;
    }

    function calcLevel(node) {
      if (typeof node === 'string') return 0;
      if (node.op === 'NOT') return 1 + calcLevel(node.a);
      return 1 + Math.max(calcLevel(node.a), calcLevel(node.b));
    }

    const walk = (node) => {
      if (typeof node === 'string') {
        return { x: busX[node], y: yMap[node], isVar: true, v: node, level: 0 };
      }

      const isUnary = (node.op === 'NOT');
      const left = walk(node.a);
      const right = isUnary ? null : walk(node.b);

      const level = calcLevel(node);
      const gateY = calcY(node);
      const gateX = 60 + level * 105;

      const inX = gateX - (node.op === 'NOT' ? 20 : /XOR$/.test(node.op) ? 30 : 25);
      const outX = gateX + ({ NOT: 12, AND: 20, NAND: 24, OR: 25, XOR: 25, NOR: 29, XNOR: 29 })[node.op];

      const children = isUnary ? [left] : [left, right];
      children.forEach((child, idx) => {
        if (!child) return;
        const pinY = isUnary ? gateY : (idx === 0 ? gateY - 9 : gateY + 9);

        if (child.isVar) {
          const bx = busX[child.v];
          const varY = yMap[child.v];
          w += `<path d="M${bx} ${varY} V${pinY} H${inX}"/>`;
          w += `<circle cx="${bx}" cy="${varY}" r="3" fill="#1d3557"/>`;
        } else {
          const midX = child.x + (inX - child.x) / 2;
          w += `<path d="M${child.x} ${child.y} H${midX} V${pinY} H${inX}"/>`;
        }
      });

      sh += gate(node.op, gateX, gateY);

      return { x: outX, y: gateY, isVar: false, level };
    };

    const rootOut = walk(tree);

    // Render Garis Output Akhir Q
    w += `<path d="M${rootOut.x} ${rootOut.y} H${rootOut.x + 30}"/>`;
    sh += `<text x="${rootOut.x + 45}" y="${rootOut.y + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="#e63946" stroke="none">Q</text>`;

    const W = rootOut.x + 60;
    const H = 180;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W * 1.15}px; display:block; margin:auto;" font-family="system-ui,sans-serif"><g stroke="#1d3557" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round">${w}${sh}</g></svg>`;
  }

  root.LOGIC = { PUZZLES: P, svg, table };
  if (typeof module != 'undefined') module.exports = root.LOGIC;
})(typeof window != 'undefined' ? window : globalThis);
