function svg(p) {
    let w = '', sh = '';

    // 1. Koordinat Y Tetap untuk Baris Utama A, B, C
    const yMap = { A: 35, B: 85, C: 135 };
    const xLabel = 20;
    const busX = { A: 50, B: 65, C: 80 }; // Bus vertikal terpisah untuk A, B, C

    // Render Teks Label A, B, C & Jalur Masuk Bus
    p.vars.forEach(v => {
      w += `<path d="M${xLabel} ${yMap[v]} H${busX[v]}"/>`;
      sh += `<text x="${xLabel - 8}" y="${yMap[v] + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d3557" stroke="none">${v}</text>`;
    });

    // 2. Traversal Pohon Rekursif untuk Menghitung Posisi & Menghubungkan Kawat
    const walk = (node) => {
      // Jika Node adalah Variabel (A, B, C)
      if (typeof node === 'string') {
        return { x: busX[node], y: yMap[node], isVar: true, v: node, level: 0 };
      }

      // Jika Node adalah Gerbang Logika (NOT, AND, OR, XOR)
      const isUnary = node.op === 'NOT';
      const left = walk(node.a);
      const right = isUnary ? null : walk(node.b);

      const level = 1 + Math.max(left.level, right ? right.level : 0);
      
      // Menentukan Posisi X berdasarkan Level Rangkaian
      const gateX = 120 + level * 95;

      // Menentukan Posisi Y
      let gateY = left.y;
      if (!isUnary && right) {
        gateY = (left.y + right.y) / 2;
      }

      // Lebar Simbol Gerbang untuk Menghitung Kawat Masuk & Keluar
      const inX = gateX - (node.op === 'NOT' ? 20 : node.op === 'XOR' ? 30 : 25);
      const outX = gateX + (node.op === 'NOT' ? 12 : 25);

      // --- PERBAIKAN ROUTING KAWAT INPUT ---
      const children = isUnary ? [left] : [left, right];
      children.forEach((child, idx) => {
        // Offset Y agar kawat masuk tepat di pin Atas (-9) / Bawah (+9) gerbang
        const pinY = isUnary ? gateY : (idx === 0 ? gateY - 9 : gateY + 9);

        if (child.isVar) {
          // Kawat langsung dari Bus Vertikal A, B, C
          const bx = busX[child.v];
          w += `<path d="M${bx} ${yMap[child.v]} V${pinY} H${inX}"/>`;
          w += `<circle cx="${bx}" cy="${yMap[child.v]}" r="3" fill="#1d3557"/>`;
        } else {
          // Kawat antar Gerbang (Belokan Orthogonal Siku-90 yang Bersih)
          const midX = child.x + Math.max(12, (inX - child.x) / 2);
          w += `<path d="M${child.x} ${child.y} H${midX} V${pinY} H${inX}"/>`;
        }
      });

      // Render Simbol Gerbang Logika
      sh += gate(node.op, gateX, gateY);

      return { x: outX, y: gateY, isVar: false, level };
    };

    // 3. Jalankan Render Pohon Rangkaian Utama
    const rootOut = walk(p.tree);

    // 4. Render Garis dan Teks Output Akhir Q
    w += `<path d="M${rootOut.x} ${rootOut.y} H${rootOut.x + 30}"/>`;
    sh += `<text x="${rootOut.x + 45}" y="${rootOut.y + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="#e63946" stroke="none">Q</text>`;

    // Dimensi SVG Sesuai Luas Konten
    const W = rootOut.x + 65;
    const H = 170;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W * 1.15}px; display:block; margin:auto;" font-family="system-ui,sans-serif"><g stroke="#1d3557" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round">${w}${sh}</g></svg>`;
  }
