function svg(p) {
  const yMap = {
    A: 35,
    B: 85,
    C: 135
  };

  // Input tidak lagi terlalu berdekatan secara horizontal.
  const xLabel = 20;
  const busX = {
    A: 50,
    B: 75,
    C: 100
  };

  let wires = [];
  let shapes = [];

  /*
   * Menambahkan kabel input.
   * Kabel A/B/C berhenti di busX masing-masing.
   */
  p.vars.forEach(v => {
    if (yMap[v] === undefined) return;

    wires.push({
      type: 'input',
      fromX: xLabel,
      fromY: yMap[v],
      toX: busX[v],
      toY: yMap[v],
      variable: v
    });

    shapes.push(
      `<text x="${xLabel - 8}" y="${yMap[v] + 5}"
        text-anchor="middle"
        font-size="15"
        font-weight="700"
        fill="#1d3557"
        stroke="none">${v}</text>`
    );
  });

  /*
   * Cari apakah sebuah kabel vertikal akan melewati
   * jalur input A/B/C.
   */
  function crossingsForVertical(x, y1, y2) {
    const result = [];

    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    p.vars.forEach(v => {
      const y = yMap[v];
      if (y === undefined) return;

      // Jangan bridge pada titik asal kabel itu sendiri.
      if (y === y1) return;

      // Input line hanya sampai busX[v].
      if (x > busX[v]) return;

      if (y > minY + 1 && y < maxY - 1) {
        result.push(y);
      }
    });

    return result.sort((a, b) => a - b);
  }

  /*
   * Membuat kabel vertikal dengan "bridge" ketika
   * melewati kabel input lain.
   *
   * Contoh:
   *
   *       |
   *       )
   * -------  -------
   *       )
   *       |
   *
   * Jadi tidak terlihat sebagai junction.
   */
  function verticalBridge(x, y1, y2) {
    const crossings = crossingsForVertical(x, y1, y2);

    if (!crossings.length) {
      return `M${x} ${y1} V${y2}`;
    }

    const dir = y2 > y1 ? 1 : -1;
    let d = `M${x} ${y1}`;
    let current = y1;

    crossings.forEach(y => {
      const before = y - dir * 6;
      const after = y + dir * 6;

      d += ` V${before}`;

      // Bridge kecil ke kanan.
      d += ` Q${x + 8} ${y - dir * 6} ${x + 8} ${y}`;

      d += ` Q${x + 8} ${y + dir * 6} ${x} ${after}`;

      current = after;
    });

    d += ` V${y2}`;

    return d;
  }

  /*
   * Routing sebuah kabel dari input menuju pin gate.
   */
  function routeInput(child, pinY, inX) {
    const v = child.v;
    const startX = busX[v];
    const startY = yMap[v];

    /*
     * Kalau tujuan masih berada di sebelah kanan
     * bus input, gunakan:
     *
     * input ────┐
     *            │
     *            └──── gate
     */
    if (Math.abs(startY - pinY) < 1) {
      return `M${startX} ${startY} H${inX}`;
    }

    const dVertical = verticalBridge(startX, startY, pinY);

    return `${dVertical} H${inX}`;
  }

  /*
   * Traversal tree.
   *
   * Setiap node diberi posisi berdasarkan level.
   */
  const walk = (rawNode) => {
    let node = rawNode;

    // Kompatibilitas jika ada representasi "NOT A".
    if (
      typeof node === 'string' &&
      node.startsWith('NOT ')
    ) {
      node = {
        op: 'NOT',
        a: node.slice(4)
      };
    }

    // Variable.
    if (typeof node === 'string') {
      const varY =
        yMap[node] !== undefined
          ? yMap[node]
          : 85;

      const varX =
        busX[node] !== undefined
          ? busX[node]
          : 50;

      return {
        x: varX,
        y: varY,
        level: 0,
        isVar: true,
        v: node
      };
    }

    const isUnary = node.op === 'NOT';

    const left = walk(node.a);
    const right = isUnary
      ? null
      : walk(node.b);

    const leftLevel = left ? left.level : 0;
    const rightLevel = right ? right.level : 0;

    const level =
      1 + Math.max(leftLevel, rightLevel);

    /*
     * Setiap level gate punya kolom sendiri.
     */
    const gateX = 145 + level * 105;

    /*
     * Posisi vertikal gate.
     */
    let gateY;

    if (isUnary) {
      gateY = left.y;
    } else {
      gateY = (left.y + right.y) / 2;
    }

    /*
     * Hindari gate tepat berada pada jalur
     * input utama A/B/C.
     */
    const inputYs = p.vars
      .map(v => yMap[v])
      .filter(y => y !== undefined);

    let safety = 0;

    while (
      inputYs.some(y => Math.abs(y - gateY) < 14) &&
      safety < 10
    ) {
      gateY += 20;
      safety++;
    }

    /*
     * Tentukan ukuran pin.
     */
    const inputWidth =
      node.op === 'NOT'
        ? 20
        : node.op === 'XOR'
          ? 30
          : 25;

    const inX = gateX - inputWidth;
    const outX =
      gateX +
      (node.op === 'NOT' ? 12 : 25);

    /*
     * Routing child.
     */
    if (isUnary) {
      if (left.isVar) {
        wires.push({
          type: 'gate',
          d: routeInput(
            left,
            gateY,
            inX
          )
        });
      } else {
        const midX =
          left.x +
          Math.max(
            18,
            (inX - left.x) / 2
          );

        wires.push({
          type: 'gate',
          d:
            `M${left.x} ${left.y}` +
            ` H${midX}` +
            ` V${gateY}` +
            ` H${inX}`
        });
      }
    } else {
      const pin1Y = gateY - 9;
      const pin2Y = gateY + 9;

      if (left.isVar) {
        wires.push({
          type: 'gate',
          d: routeInput(
            left,
            pin1Y,
            inX
          )
        });
      } else {
        const midX =
          left.x +
          Math.max(
            18,
            (inX - left.x) / 2
          );

        wires.push({
          type: 'gate',
          d:
            `M${left.x} ${left.y}` +
            ` H${midX}` +
            ` V${pin1Y}` +
            ` H${inX}`
        });
      }

      if (right.isVar) {
        wires.push({
          type: 'gate',
          d: routeInput(
            right,
            pin2Y,
            inX
          )
        });
      } else {
        const midX =
          right.x +
          Math.max(
            18,
            (inX - right.x) / 2
          );

        wires.push({
          type: 'gate',
          d:
            `M${right.x} ${right.y}` +
            ` H${midX}` +
            ` V${pin2Y}` +
            ` H${inX}`
        });
      }
    }

    /*
     * Gate.
     */
    shapes.push(
      gate(
        node.op,
        gateX,
        gateY
      )
    );

    return {
      x: outX,
      y: gateY,
      level,
      isVar: false
    };
  };

  /*
   * Bangun tree.
   */
  const rootOut = walk(p.tree);

  /*
   * Output Q.
   */
  wires.push({
    type: 'output',
    d:
      `M${rootOut.x} ${rootOut.y}` +
      ` H${rootOut.x + 30}`
  });

  shapes.push(
    `<text
      x="${rootOut.x + 45}"
      y="${rootOut.y + 5}"
      text-anchor="middle"
      font-size="16"
      font-weight="700"
      fill="#e63946"
      stroke="none">Q</text>`
  );

  /*
   * Junction/input dots.
   *
   * Hanya tampil pada titik awal input.
   * Tidak membuat dot pada crossing.
   */
  p.vars.forEach(v => {
    if (yMap[v] === undefined) return;

    shapes.push(
      `<circle
        cx="${busX[v]}"
        cy="${yMap[v]}"
        r="3"
        fill="#1d3557"
        stroke="none"/>`
    );
  });

  /*
   * Render.
   */
  let wireSVG = '';

  wires.forEach(w => {
    wireSVG +=
      `<path d="${w.d || (
        `M${w.fromX} ${w.fromY}` +
        ` H${w.toX}`
      )}"/>`;
  });

  const W = rootOut.x + 70;
  const H = 170;

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${W} ${H}"
      width="100%"
      style="
        max-width:${W * 1.15}px;
        display:block;
        margin:auto;
      "
      font-family="system-ui,sans-serif">

      <g
        stroke="#1d3557"
        stroke-width="2.2"
        fill="none"
        stroke-linejoin="round"
        stroke-linecap="round">

        ${wireSVG}

        ${shapes.join('')}

      </g>
    </svg>
  `;
}
