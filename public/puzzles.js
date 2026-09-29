const S = 'fill="#fff" stroke="#1d3557" stroke-width="2.5"';
  
  // Gambar Simbol Gerbang Logika dengan Posisi Pin Input & Output Presisi
  const gate = (op, x, y) => {
    const t = (dx) => `<text x="${x + dx}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#1d3557" stroke="none">${op}</text>`;
    if (op == 'NOT') {
      return `<path d="M${x - 20} ${y - 14}L${x + 8} ${y}L${x - 20} ${y + 14}Z" ${S}/><circle cx="${x + 12}" cy="${y}" r="4" ${S}/>${t(-6)}`;
    }
    if (op == 'AND') {
      return `<path d="M${x - 25} ${y - 20}H${x}A20 20 0 0 1 ${x} ${y + 20}H${x - 25}Z" ${S}/>${t(-8)}`;
    }
    // OR & XOR
    return `<path d="M${x - 25} ${y - 20}C${x - 5} ${y - 20} ${x + 15} ${y - 12} ${x + 25} ${y}C${x + 15} ${y + 12} ${x - 5} ${y + 20} ${x - 25} ${y + 20}C${x - 15} ${y + 8} ${x - 15} ${y - 8} ${x - 25} ${y - 20}Z" ${S}/>`
      + (op == 'XOR' ? `<path d="M${x - 32} ${y - 20}C${x - 22} ${y - 8} ${x - 22} ${y + 8} ${x - 32} ${y + 20}" fill="none"/>` : '') + t(0);
  };

  function svg(p) {
    const ys = {}, busX = {}; 
    let w = '', sh = '', maxY = 0;

    // 1. Tata letak Input A, B, C (Vertikal & Bus Paralel yang Rapi)
    const startX = 40;
    p.vars.forEach((v, i) => { 
      ys[v] = 45 + i * 50;         // Jarak vertikal antar label A, B, C
      busX[v] = startX + 25 + i * 16; // Jalur kawat bus vertikal terpisah untuk A, B, C
    });

    const walk = (n) => {
      if (typeof n == 'string') return { L: 0, y: ys[n], v: n };
      
      const kids = [n.a, n.b].filter(Boolean).map(walk).sort((p, q) => p.y - q.y);
      const L = 1 + Math.max(...kids.map(k => k.L));
      
      // Hitung posisi Y gerbang (rata-rata posisi inputnya)
      let y = kids.reduce((s, k) => s + k.y, 0) / kids.length;
      maxY = Math.max(maxY, y);

      // Posisi X gerbang berdasarkan level (L)
      const x = 180 + (L - 1) * 130; 
      // Posisi Pin Input Gerbang (kiri gerbang)
      const inX = x - (n.op == 'NOT' ? 20 : n.op == 'XOR' ? 32 : 25); 

      // Hubungkan input ke gerbang ini
      kids.forEach((k, i) => {
        // Tentukan titik pin vertikal (jika 2 input: pin atas & pin bawah)
        const inY = kids.length == 1 ? y : (i === 0 ? y - 10 : y + 10);

        if (k.v) {
          // Kawat dari Bus Utama (A, B, C)
          const bx = busX[k.v];
          w += `<path d="M${bx} ${k.y} V${inY} H${inX}"/>`;
          w += `<circle cx="${bx}" cy="${k.y}" r="3" fill="#1d3557"/>`;
        } else {
          // Kawat dari Output Gerbang Sebelumnya
          const midX = k.x + (inX - k.x) / 2; // Titik belok siku di tengah
          w += `<path d="M${k.x} ${k.y} H${midX} V${inY} H${inX}"/>`;
        }
      });

      sh += gate(n.op, x, y);

      // Posisi Pin Output Gerbang (kanan gerbang)
      const outX = x + (n.op == 'NOT' ? 12 : n.op == 'AND' ? 25 : 25);
      return { L, y, x: outX };
    };

    const r = walk(p.tree);

    // Render Label Input (A, B, C) di sebelah kiri
    p.vars.forEach(v => { 
      w += `<path d="M${startX} ${ys[v]} H${busX[v]}"/>`; 
      sh += `<text x="${startX - 10}" y="${ys[v] + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d3557" stroke="none">${v}</text>`; 
    });

    // Render Output Akhir Q di sebelah kanan
    w += `<path d="M${r.x} ${r.y} H${r.x + 30}"/>`;
    sh += `<text x="${r.x + 45}" y="${r.y + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="#e63946" stroke="none">Q</text>`;

    // Atur Dimensi SVG agar Pas & Tidak Terpotong
    const W = r.x + 65; 
    const H = Math.max(maxY + 40, ys[p.vars[p.vars.length - 1]] + 35);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W * 1.2}px; display:block; margin:auto;" font-family="system-ui,sans-serif"><g stroke="#1d3557" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round">${w}${sh}</g></svg>`;
  }
