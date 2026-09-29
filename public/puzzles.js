function svg(p) {
    let w = '', sh = '';
    
    // 1. Definisikan Posisi Y Tetap untuk Baris Input (A, B, C)
    const yMap = { A: 35, B: 85, C: 135 };
    const xLabel = 25;
    const xBusBase = 55;
    const busGap = 15;
    
    // Saluran X untuk garis bus vertikal tiap input A, B, C
    const busX = {
      A: xBusBase,
      B: xBusBase + busGap,
      C: xBusBase + busGap * 2
    };

    // Render Label Input (A, B, C) dan Garis Awalnya
    p.vars.forEach(v => {
      w += `<path d="M${xLabel} ${yMap[v]} H${busX[v]}"/>`;
      sh += `<text x="${xLabel - 10}" y="${yMap[v] + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d3557" stroke="none">${v}</text>`;
    });

    // 2. Ekstrak Semua Langkah Gerbang secara Urut (Dari Level Pertama ke Output Q)
    const st = steps(p.tree); // steps() sudah tersedia di puzzles.js
    const gateNodes = [];
    
    // Pemetaan posisi koordinat untuk tiap simpul (node)
    const nodePos = {};
    p.vars.forEach(v => {
      nodePos[v] = { x: busX[v], y: yMap[v], isVar: true };
    });

    // 3. Tentukan Posisi X & Y Setiap Gerbang Secara Seksama
    st.forEach((step, idx) => {
      const n = step.n;
      const isFinal = (idx === st.length - 1);
      
      // Hitung Level Gerbang (L1 = Gerbang Pertama, L2 = Gerbang Kedua)
      let level = 1;
      const getL = (child) => typeof child === 'string' ? 0 : (nodePos[str(child, 1)]?.level || 1);
      if (typeof n !== 'string') {
        level = 1 + Math.max(getL(n.a), n.b ? getL(n.b) : 0);
      }

      // Tentukan Posisi X berdasarkan Level
      const x = 150 + (level - 1) * 110;

      // Tentukan Posisi Y
      let y = 85; // Default tengah (sejajar B)
      if (typeof n.a === 'string' && typeof n.b === 'string') {
        // Jika kedua input adalah variabel (misal A dan C)
        y = (yMap[n.a] + yMap[n.b]) / 2;
      } else if (typeof n.a === 'string' || typeof n.b === 'string') {
        // Jika salah satu input adalah gerbang dan satunya variabel
        const gChild = typeof n.a !== 'string' ? n.a : n.b;
        const vChild = typeof n.a === 'string' ? n.a : n.b;
        const gY = nodePos[str(gChild, 1)].y;
        const vY = yMap[vChild];
        y = (gY + vY) / 2;
      }

      const nodeKey = str(n, 1);
      const outX = x + (n.op === 'NOT' ? 12 : 25);
      
      nodePos[nodeKey] = { x: outX, y, level, op: n.op, gateX: x };
      gateNodes.push({ n, key: nodeKey, x, y, op: n.op });
    });

    // 4. Gambar Kawat Penghubung antar Gerbang dan Input
    gateNodes.forEach(g => {
      const n = g.n;
      const inX = g.x - (g.op === 'NOT' ? 20 : g.op === 'XOR' ? 30 : 25);
      const inputs = [n.a, n.b].filter(Boolean);

      inputs.forEach((child, i) => {
        const inY = inputs.length === 1 ? g.y : (i === 0 ? g.y - 9 : g.y + 9);

        if (typeof child === 'string') {
          // Kawat dari Input Variabel (A, B, atau C)
          const v = child;
          const bx = busX[v];
          const startY = yMap[v];
          
          // Garis dari Bus Vertikal menuju Pin Input Gerbang
          w += `<path d="M${bx} ${startY} V${inY} H${inX}"/>`;
          w += `<circle cx="${bx}" cy="${startY}" r="3" fill="#1d3557"/>`;
        } else {
          // Kawat dari Output Gerbang Sebelumnya
          const prevKey = str(child, 1);
          const prev = nodePos[prevKey];
          const midX = prev.x + (inX - prev.x) / 2;
          
          w += `<path d="M${prev.x} ${prev.y} H${midX} V${inY} H${inX}"/>`;
        }
      });

      // Gambar Simbol Gerbang Logika
      sh += gate(g.op, g.x, g.y);
    });

    // 5. Gambar Output Akhir Q
    const lastGate = gateNodes[gateNodes.length - 1];
    const finalX = lastGate.x + (lastGate.op === 'NOT' ? 12 : 25);
    const finalY = lastGate.y;

    w += `<path d="M${finalX} ${finalY} H${finalX + 30}"/>`;
    sh += `<text x="${finalX + 45}" y="${finalY + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="#e63946" stroke="none">Q</text>`;

    // Ukuran Canvas SVG
    const W = finalX + 65;
    const H = 170;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W * 1.15}px; display:block; margin:auto;" font-family="system-ui,sans-serif"><g stroke="#1d3557" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round">${w}${sh}</g></svg>`;
  }
