const S = 'fill="#fff" stroke="#1d3557" stroke-width="2.5"';
  const gate = (op, x, y) => {
    // Penyesuaian ukuran teks agar tidak keluar dari area gerbang
    const t = (dx) => `<text x="${x + dx}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="bold" fill="#1d3557" stroke="none">${op}</text>`;
    
    if (op == 'NOT') {
      return `<path d="M${x - 20} ${y - 14}L${x + 10} ${y}L${x - 20} ${y + 14}Z" ${S}/><circle cx="${x + 14}" cy="${y}" r="4" ${S}/>${t(-6)}`;
    }
    if (op == 'AND') {
      return `<path d="M${x - 25} ${y - 20}H${x}A20 20 0 0 1 ${x} ${y + 20}H${x - 25}Z" ${S}/>${t(-8)}`;
    }
    // OR & XOR
    return `<path d="M${x - 25} ${y - 20}C${x - 5} ${y - 20} ${x + 15} ${y - 12} ${x + 25} ${y}C${x + 15} ${y + 12} ${x - 5} ${y + 20} ${x - 25} ${y + 20}C${x - 15} ${y + 8} ${x - 15} ${y - 8} ${x - 25} ${y - 20}Z" ${S}/>`
      + (op == 'XOR' ? `<path d="M${x - 32} ${y - 20}C${x - 22} ${y - 8} ${x - 22} ${y + 8} ${x - 32} ${y + 20}" fill="none"/>` : '') + t(0);
  };

  function svg(p) {
    const ys = {}, bus = {}, col = {}; 
    let w = '', sh = '', maxY = 0;

    // 1. Tambahkan margin vertikal awal agar baris pertama tidak menabrak batas atas
    p.vars.forEach((v, i) => { 
      ys[v] = 40 + i * 65; 
      bus[v] = 50 + i * 16; 
    });

    const walk = (n) => {
      if (typeof n == 'string') return { L: 0, y: ys[n], v: n };
      
      const kids = [n.a, n.b].filter(Boolean).map(walk).sort((p, q) => p.y - q.y);
      const L = 1 + Math.max(...kids.map(k => k.L));
      let y = kids.reduce((s, k) => s + k.y, 0) / kids.length;
      
      // 2. Perbesar jarak minimal antar gerbang (min gap) menjadi 75px agar Jalur Kawat & Teks tidak menumpuk
      const u = col[L] = col[L] || []; 
      while (u.some(q => Math.abs(q - y) < 75)) y += 75; 
      u.push(y);

      // 3. Jarak horizontal antar level gerbang diperlebar
      const x = 160 + (L - 1) * 140; 
      const tx = x - (n.op == 'NOT' ? 20 : 25); 
      maxY = Math.max(maxY, y);

      kids.forEach((k, i) => {
        const ty = y + (kids.length == 1 ? 0 : i ? 10 : -10);
        if (k.v) {
          // Jalur dari input bus utama
          w += `<path d="M${bus[k.v]} ${k.y}V${ty}H${tx}"/><circle cx="${bus[k.v]}" cy="${ty}" r="3" fill="#1d3557"/>`;
        } else {
          // Jalur bertingkat antar gerbang dengan sudut siku yang jelas
          w += `<path d="M${k.x} ${k.y}H${tx - 15}V${ty}H${tx}"/>`;
        }
      });

      sh += gate(n.op, x, y);
      return { L, y, x: x + (n.op == 'NOT' ? 18 : n.op == 'AND' ? 25 : 25) };
    };

    const r = walk(p.tree);

    // Render Pin Input (A, B, C)
    p.vars.forEach(v => { 
      w += `<path d="M25 ${ys[v]}H${bus[v]}"/>`; 
      sh += `<text x="15" y="${ys[v] + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="#1d3557" stroke="none">${v}</text>`; 
    });

    // Render Output Q
    w += `<path d="M${r.x} ${r.y}H${r.x + 35}"/>`;
    sh += `<text x="${r.x + 50}" y="${r.y + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="#e63946" stroke="none">Q</text>`;

    // 4. Tambahkan Padding Dinamis pada Dimensi SVG
    const W = r.x + 75; 
    const H = Math.max(maxY, ys[p.vars[p.vars.length - 1]]) + 45;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W * 1.2}px; display:block; margin:auto;" font-family="system-ui,sans-serif"><g stroke="#1d3557" stroke-width="2" fill="none" stroke-linejoin="round">${w}${sh}</g></svg>`;
  }
