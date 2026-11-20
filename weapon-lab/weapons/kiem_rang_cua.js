export default {
  meta: {
    id: 'kiem_rang_cua',
    name: 'Kiếm răng cưa',
    family: 'kiem',
    level: 18,
    inspiration: 'Kiếm răng cưa phá giáp rèn thủ công với gáy thép tán đinh chịu lực',
    look: 'lưỡi kiếm thép một bên xẻ răng cưa móc nhọn, rãnh đồng cháy giữa thân, gáy sắt dày nẹp đinh tán đồng chạy tới mũi nhọn xuyên giáp',
    power: { score: 7, note: 'xé rách gây cháy và làm chậm, đâm nặng xuyên thế đỡ' },
    effects: [
      'gây hiệu ứng đốt 4 sát thương mỗi giây khi chém trúng',
      'trúng đòn làm chậm mục tiêu 20% trong 1.5 giây',
      'đòn đâm nặng xuyên qua tư thế đỡ của đối thủ',
    ],
    lengthM: 1.18,
  },
  build(k) {
    const g = k.group();
    const emberCopper = k.paint('#8c3b19', true);

    // --- main blade: heavy back toward -Z, sharp edge toward +Z, piercing tip ---
    const blade = k.edge({
      spine: [
        [-0.024, 0.14],
        [-0.024, 0.35],
        [-0.023, 0.58],
        [-0.020, 0.78],
        [-0.012, 0.90],
        [0.004, 0.99],
      ],
      width: [0.068, 0.066, 0.062, 0.054, 0.034, 0.0],
      edge: 'front',
      thickness: 0.015,
      edgeThickness: 0.0015,
      bevel: 0.42,
      taper: 0.35,
      smooth: 4,
      slot: 'steel',
      fuller: { from: 0.06, to: 0.72, at: 0.24, width: 0.22, slot: emberCopper },
    });
    g.add(blade);

    // --- thick reinforced spine jacket (-Z side) ---
    const spineJacket = k.blade(
      [
        [-0.014, 0.15],
        [-0.034, 0.15],
        [-0.034, 0.35],
        [-0.033, 0.58],
        [-0.030, 0.78],
        [-0.020, 0.89],
        [-0.008, 0.92],
        [-0.006, 0.89],
        [-0.012, 0.78],
        [-0.014, 0.58],
        [-0.014, 0.35],
      ],
      0.021,
      'iron_rough',
      0.002
    );
    g.add(spineJacket);

    // --- brass rivets through the thick spine ---
    const rivetYs = [0.21, 0.29, 0.37, 0.45, 0.53, 0.61, 0.69, 0.77];
    for (const y of rivetYs) {
      const zRivet = y < 0.58 ? -0.025 : -0.023;
      const rivet = k.cyl(0.0042, 0.0042, 0.025, 6, 'brass');
      rivet.rotation.z = Math.PI / 2;
      rivet.position.set(0, y, zRivet);
      g.add(rivet);
    }

    // --- one-sided rip-saw teeth along +Z cutting edge ---
    for (let i = 0; i < 11; i++) {
      const y0 = 0.20 + i * 0.06;
      const t = (y0 - 0.14) / 0.85;
      const zFront = 0.044 - t * 0.019;
      const zBase = zFront - 0.008;
      const toothReach = i >= 8 ? 0.012 : 0.016;
      const zTip = zFront + toothReach;
      const tooth = k.blade(
        [
          [zBase, y0],
          [zTip, y0 + 0.034],
          [zFront + 0.002, y0 + 0.040],
          [zBase, y0 + 0.048],
        ],
        0.0055,
        'steel',
        0.0018
      );
      g.add(tooth);
    }

    // --- ricasso collar clamping blade and spine ---
    const collar = k.box(0.024, 0.048, 0.082, 'brass');
    collar.position.set(0, 0.168, 0.006);
    g.add(collar);

    const collarBolt = k.cyl(0.0045, 0.0045, 0.028, 6, 'steel_dark');
    collarBolt.rotation.z = Math.PI / 2;
    collarBolt.position.set(0, 0.168, -0.016);
    g.add(collarBolt);

    // --- asymmetric crossguard ---
    const guardCore = k.box(0.034, 0.026, 0.145, 'steel_dark');
    guardCore.position.set(0, 0.132, 0.008);
    g.add(guardCore);

    const frontQuillon = k.blade(
      [
        [0.068, 0.120],
        [0.098, 0.132],
        [0.092, 0.156],
        [0.068, 0.146],
      ],
      0.024,
      'iron_rough',
      0.002
    );
    g.add(frontQuillon);

    const rearQuillon = k.box(0.026, 0.032, 0.034, 'brass');
    rearQuillon.position.set(0, 0.132, -0.064);
    g.add(rearQuillon);

    // --- grip centered at origin ---
    const grip = k.cyl(0.018, 0.019, 0.24, 8, 'leather');
    g.add(grip);

    g.add(k.wrap(-0.115, 0.115, 0.0202, 6, 'cloth_dark'));

    const gripRing = k.cyl(0.0215, 0.0215, 0.016, 8, 'brass');
    gripRing.position.y = 0.0;
    g.add(gripRing);

    // --- heavy counterweight pommel ---
    const pommel = k.lathe(
      [
        [0.0, -0.19],
        [0.010, -0.182],
        [0.026, -0.162],
        [0.028, -0.138],
        [0.021, -0.115],
        [0.0, -0.115],
      ],
      8,
      'steel_dark'
    );
    g.add(pommel);

    const pommelCollar = k.cyl(0.023, 0.023, 0.012, 8, 'brass');
    pommelCollar.position.y = -0.122;
    g.add(pommelCollar);

    k.marker(g, 'base', [0, 0.15, 0.01]);
    k.marker(g, 'tip', [0, 0.99, 0.004]);
    return g;
  },
};