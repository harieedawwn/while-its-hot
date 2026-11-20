export default {
  meta: {
    id: 'kiem_tram_nguyet',
    name: 'Đại Đao Trảm Nguyệt',
    family: 'kiem',
    level: 21,
    inspiration: 'Thiên Tỏa Trảm Nguyệt dạng chân giải của Ichigo Kurosaki (Bleach), đại đao vỏ trắng lõi đen nối xích',
    look: 'đại đao bản rộng lõi đen ở giữa bọc vỏ trắng dày hai cạnh, mũi đao hếch nhọn, gốc lưỡi dưới vươn dài thành ngạnh chắn tay nối xích sắt lên sống đao, chuôi đen ngắn quấn vải lộ nền đỏ sẫm',
    power: { score: 8, note: 'chém nặng tay, phóng sóng trăng khuyết tầm xa kèm thiêu đốt, đánh chậm' },
    effects: [
      'đòn nặng phóng vệt chém trăng khuyết bay 10 m, gây 14 sát thương (hồi 3 s)',
      'gây hiệu ứng đốt cháy lên mục tiêu trúng lưỡi hoặc vệt chém',
      'tốc độ ra đòn chậm hơn kiếm thường do thân đao bản rộng và nặng',
    ],
    lengthM: 1.48,
  },
  build(k) {
    const g = k.group();
    const whiteShell = k.paint('#eaedf2', true);
    const coreBlack = k.paint('#16161b', true);
    const crimson = k.paint('#8c1824');

    // Outer white greatsword shell: diagonal heel on spine (-Z), broad belly (+Z), upturned sharp tip
    const mainBlade = k.edge({
      spine: [
        [-0.024, 0.15],
        [-0.092, 0.22],
        [-0.094, 0.28],
        [-0.090, 0.48],
        [-0.082, 0.72],
        [-0.072, 0.94],
        [-0.082, 1.07],
        [-0.106, 1.19],
        [-0.148, 1.29],
      ],
      width: [0.148, 0.222, 0.206, 0.194, 0.184, 0.152, 0.116, 0.068, 0.0],
      edge: 'front',
      thickness: 0.018,
      edgeThickness: 0.0018,
      bevel: 0.42,
      taper: 0.35,
      smooth: 5,
      slot: whiteShell,
    });
    g.add(mainBlade);

    // Lower front blade extension curving back along the grip as a pointed guard horn
    const guardHorn = k.edge({
      spine: [
        [0.086, -0.08],
        [0.090, -0.03],
        [0.092, 0.05],
        [0.082, 0.13],
        [0.040, 0.19],
        [0.025, 0.28],
      ],
      width: [0.0, 0.038, 0.048, 0.076, 0.102, 0.087],
      edge: 'front',
      thickness: 0.017,
      edgeThickness: 0.002,
      bevel: 0.45,
      taper: 0.15,
      smooth: 4,
      slot: whiteShell,
    });
    g.add(guardHorn);

    // Inner black blade core: slightly thicker than the white shell so both beveled faces stay crisp
    const coreBlade = k.edge({
      spine: [
        [0.0, 0.11],
        [-0.003, 0.32],
        [-0.007, 0.58],
        [-0.011, 0.80],
        [-0.016, 0.92],
        [-0.022, 1.02],
      ],
      width: [0.050, 0.052, 0.048, 0.042, 0.034, 0.0],
      edge: 'both',
      thickness: 0.022,
      edgeThickness: 0.003,
      bevel: 0.35,
      taper: 0.35,
      smooth: 4,
      slot: coreBlack,
    });
    g.add(coreBlade);

    // Anchor lugs sunk into the spine notch and the guard horn tip for the chain
    const spineLug = k.box(0.014, 0.024, 0.022, 'steel_dark');
    spineLug.position.set(0, 0.94, -0.076);
    g.add(spineLug);

    const hornLug = k.box(0.014, 0.022, 0.020, 'steel_dark');
    hornLug.position.set(0, -0.068, 0.095);
    g.add(hornLug);

    // Dark iron chain sweeping from the spine notch around beneath the pommel to the guard horn
    const chainPts = [
      [0, 0.94, -0.076],
      [0, 0.80, -0.165],
      [0, 0.58, -0.235],
      [0, 0.32, -0.265],
      [0, 0.06, -0.250],
      [0, -0.12, -0.185],
      [0, -0.215, -0.080],
      [0, -0.215, 0.025],
      [0, -0.150, 0.085],
      [0, -0.068, 0.096],
    ];
    g.add(k.tube(chainPts, 0.0042, 5, 'iron_rough'));

    // Alternating flat-shaded link plates along the chain curve
    let linkIdx = 0;
    for (let i = 0; i < chainPts.length - 1; i++) {
      const a = chainPts[i];
      const b = chainPts[i + 1];
      const dy = b[1] - a[1];
      const dz = b[2] - a[2];
      const rx = Math.atan2(dz, dy);
      const steps = i < 5 ? 2 : 1;
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const even = linkIdx % 2 === 0;
        const link = k.box(
          even ? 0.015 : 0.008,
          0.024,
          even ? 0.008 : 0.015,
          even ? 'steel_dark' : 'iron_rough',
        );
        link.position.set(0, a[1] + dy * t, a[2] + dz * t);
        link.rotation.set(rx, 0, 0);
        g.add(link);
        linkIdx++;
      }
    }

    // Blade collar (habaki) and grip ferrule (fuchi) clamping the black core to the handle
    const habaki = k.box(0.026, 0.052, 0.058, 'steel_dark');
    habaki.position.set(0, 0.154, 0.0);
    g.add(habaki);

    const fuchi = k.lathe([
      [0.0, 0.110],
      [0.021, 0.110],
      [0.024, 0.122],
      [0.024, 0.142],
      [0.020, 0.148],
      [0.0, 0.148],
    ], 8, 'steel_dark');
    g.add(fuchi);

    const fuchiRing = k.cyl(0.025, 0.025, 0.006, 8, 'steel');
    fuchiRing.position.y = 0.118;
    g.add(fuchiRing);

    // Short wrapped grip centered at origin with crimson under-wrap peeking through dark cloth
    const gripCore = k.cyl(0.018, 0.0185, 0.265, 8, crimson);
    gripCore.position.y = -0.008;
    g.add(gripCore);
    g.add(k.wrap(-0.125, 0.112, 0.0205, 6, 'cloth_dark'));

    for (const y of [-0.085, -0.032, 0.022, 0.075]) {
      for (const sx of [-1, 1]) {
        const diamond = k.box(0.005, 0.013, 0.013, crimson);
        diamond.position.set(sx * 0.0185, y, 0);
        diamond.rotation.set(Math.PI / 4, 0, 0);
        g.add(diamond);
      }
    }

    // Stepped silver-steel pommel cap (kashira)
    const pommel = k.lathe([
      [0.0, -0.185],
      [0.014, -0.182],
      [0.025, -0.172],
      [0.026, -0.152],
      [0.022, -0.142],
      [0.024, -0.132],
      [0.019, -0.128],
      [0.0, -0.128],
    ], 8, 'steel');
    g.add(pommel);

    const pommelRing = k.cyl(0.025, 0.025, 0.007, 8, 'steel_dark');
    pommelRing.position.y = -0.136;
    g.add(pommelRing);

    k.marker(g, 'base', [0, 0.16, 0.04]);
    k.marker(g, 'tip', [0, 1.29, -0.148]);
    return g;
  },
};