// Găng đá — găng tay phải bằng đá tảng thô chẻ mỏ, đóng nêm sắt giữ khe, rêu mọc trong rãnh nứt và mạch khoáng sét.
export default {
  meta: {
    id: 'gang_da',
    name: 'Găng đá',
    family: 'tay',
    level: 24,
    inspiration: 'Đá tảng chẻ mỏ ghép thành giáp tay bằng nêm sắt thợ đá, phủ rêu khe và ngậm mạch sét',
    look: 'găng nặng đồ sộ ghép từ nhiều mảnh đá tảng thô góc cạnh ôm quanh bao da cẳng tay, nêm sắt ghim chặt khe nứt, rêu xanh nhồi đầy rãnh đá và tia khoáng sét ló ra giữa mu bàn tay',
    power: { score: 7, note: 'nặng tay, đẩy lùi cực xa, dựng tường đá chắn và giật sét' },
    effects: [
      'đòn nặng nhìn xuống đất dựng tường đá chắn 4 s (hồi 6 s)',
      'đòn nặng thường đẩy lùi mục tiêu xa 8 m',
      'đòn đánh kích sét giật qua các nêm sắt và khe đá',
    ],
    lengthM: 0.40,
  },
  build(k) {
    const g = k.group();
    const stoneDark = k.paint('#4d5054');
    const moss = k.paint('#45692e');
    const spark = k.paint('#7cd8ff', true);

    // --- forearm inner leather sleeve & iron cuff (-0.225 .. +0.04) ---
    const sleeve = k.lathe([
      [0.0, -0.222], [0.056, -0.222], [0.057, -0.17], [0.052, -0.09],
      [0.047, -0.01], [0.050, 0.04], [0.0, 0.04],
    ], 8, 'leather');
    g.add(sleeve);

    const cuffRim = k.cyl(0.060, 0.063, 0.024, 8, 'iron_rough');
    cuffRim.position.y = -0.212;
    g.add(cuffRim);

    g.add(k.wrap(-0.188, -0.048, 0.055, 3, 'leather'));

    for (const [y, r] of [[-0.152, 0.061], [-0.062, 0.058]]) {
      const band = k.cyl(r, r + 0.002, 0.018, 8, 'iron_rough');
      band.position.y = y;
      g.add(band);
    }

    // --- forearm raw boulder carapace (+Z back and ±X flanks, -Z stays strapped leather) ---
    const armBackMain = k.box(0.086, 0.172, 0.050, 'stone');
    armBackMain.position.set(-0.006, -0.114, 0.052);
    armBackMain.rotation.set(-0.07, -0.08, 0.05);
    g.add(armBackMain);

    const armBackRidge = k.box(0.064, 0.140, 0.044, stoneDark);
    armBackRidge.position.set(0.024, -0.128, 0.056);
    armBackRidge.rotation.set(-0.05, 0.18, -0.10);
    g.add(armBackRidge);

    const armOuter = k.box(0.044, 0.148, 0.070, stoneDark);
    armOuter.position.set(0.058, -0.108, 0.012);
    armOuter.rotation.set(0.04, 0.12, 0.10);
    g.add(armOuter);

    const armInner = k.box(0.040, 0.132, 0.064, 'stone');
    armInner.position.set(-0.056, -0.104, 0.014);
    armInner.rotation.set(-0.04, -0.10, -0.09);
    g.add(armInner);

    const armCrag = k.sphere(0.036, 0, 'stone');
    armCrag.scale.set(0.85, 1.35, 0.72);
    armCrag.position.set(-0.018, -0.145, 0.068);
    armCrag.rotation.set(0.2, -0.3, 0.15);
    g.add(armCrag);

    // --- solid dark-stone wrist joint & fist core (0.00 .. +0.135) ---
    const wristCollar = k.cyl(0.064, 0.058, 0.064, 7, stoneDark);
    wristCollar.position.set(0.0, -0.002, 0.012);
    g.add(wristCollar);

    const fistCore = k.box(0.134, 0.122, 0.106, stoneDark);
    fistCore.position.set(0.004, 0.068, 0.004);
    g.add(fistCore);

    // --- back-of-hand split boulder plates (+Z) with central fault cleft ---
    const backLeft = k.box(0.072, 0.096, 0.056, 'stone');
    backLeft.position.set(-0.040, 0.082, 0.048);
    backLeft.rotation.set(0.12, -0.20, 0.08);
    g.add(backLeft);

    const backRight = k.box(0.070, 0.090, 0.054, 'stone');
    backRight.position.set(0.044, 0.074, 0.045);
    backRight.rotation.set(0.10, 0.22, -0.11);
    g.add(backRight);

    const backWristSlab = k.box(0.102, 0.056, 0.054, stoneDark);
    backWristSlab.position.set(0.002, 0.026, 0.046);
    backWristSlab.rotation.set(-0.18, 0.04, 0.03);
    g.add(backWristSlab);

    const backCragL = k.sphere(0.044, 0, 'stone');
    backCragL.scale.set(0.95, 1.12, 0.78);
    backCragL.position.set(-0.044, 0.092, 0.050);
    backCragL.rotation.set(-0.22, -0.45, 0.20);
    g.add(backCragL);

    const backCragR = k.sphere(0.042, 0, 'stone');
    backCragR.scale.set(0.92, 1.10, 0.76);
    backCragR.position.set(0.048, 0.084, 0.046);
    backCragR.rotation.set(0.28, 0.42, -0.22);
    g.add(backCragR);

    // --- outer pinky-side boulder flank (+X) ---
    const outerFistRock = k.box(0.044, 0.102, 0.082, stoneDark);
    outerFistRock.position.set(0.068, 0.064, 0.004);
    outerFistRock.rotation.set(0.06, -0.14, -0.10);
    g.add(outerFistRock);

    // --- 4 oversized stone knuckles (+Y striking face) + curled fingers (-Z) ---
    // Index (-X) to pinky (+X) for the right closed fist
    const fingers = [
      { x: -0.054, ky: 0.132, kz: 0.022, kw: 0.042, kh: 0.054, kr: 0.027, fy: 0.094, fz: -0.038, rotZ: 0.10 },
      { x: -0.014, ky: 0.140, kz: 0.026, kw: 0.044, kh: 0.058, kr: 0.030, fy: 0.098, fz: -0.042, rotZ: 0.03 },
      { x: 0.026, ky: 0.132, kz: 0.020, kw: 0.042, kh: 0.054, kr: 0.028, fy: 0.092, fz: -0.040, rotZ: -0.05 },
      { x: 0.062, ky: 0.118, kz: 0.010, kw: 0.038, kh: 0.048, kr: 0.025, fy: 0.084, fz: -0.034, rotZ: -0.14 },
    ];
    for (let i = 0; i < fingers.length; i++) {
      const f = fingers[i];
      const knuck = k.box(f.kw, f.kh, 0.052, 'stone');
      knuck.position.set(f.x, f.ky, f.kz);
      knuck.rotation.set(0.22, (i - 1.5) * 0.10, f.rotZ);
      g.add(knuck);

      const peak = k.sphere(f.kr, 0, i % 2 === 0 ? 'stone' : stoneDark);
      peak.scale.set(0.95, 1.05, 0.85);
      peak.position.set(f.x, f.ky + f.kh * 0.32, f.kz + 0.006);
      peak.rotation.set(0.3 * i, 0.4, -0.2);
      g.add(peak);

      const curl = k.box(f.kw - 0.003, 0.058, 0.046, i % 2 === 0 ? stoneDark : 'stone');
      curl.position.set(f.x, f.fy, f.fz);
      curl.rotation.set(-0.34, 0, f.rotZ * 0.6);
      g.add(curl);
    }

    // --- inner palm leather pad & heel-of-palm stone chunk (-Z) ---
    const palmPad = k.box(0.110, 0.072, 0.036, 'leather');
    palmPad.position.set(0.002, 0.036, -0.042);
    g.add(palmPad);

    const palmHeel = k.box(0.058, 0.054, 0.044, 'stone');
    palmHeel.position.set(0.040, 0.026, -0.046);
    palmHeel.rotation.set(-0.18, -0.22, -0.12);
    g.add(palmHeel);

    // --- massive stone thumb (-X side, locked over the curled fingers on -Z) ---
    const thumbBase = k.box(0.054, 0.068, 0.052, stoneDark);
    thumbBase.position.set(-0.076, 0.044, -0.012);
    thumbBase.rotation.set(-0.24, 0.34, 0.42);
    g.add(thumbBase);

    const thumbProx = k.box(0.052, 0.048, 0.050, 'stone');
    thumbProx.position.set(-0.076, 0.078, -0.042);
    thumbProx.rotation.set(0.14, 0.52, 0.24);
    g.add(thumbProx);

    const thumbKnuck = k.sphere(0.028, 0, 'stone');
    thumbKnuck.scale.set(0.95, 1.05, 0.90);
    thumbKnuck.position.set(-0.088, 0.082, -0.038);
    thumbKnuck.rotation.set(0.3, -0.4, 0.2);
    g.add(thumbKnuck);

    const thumbTip = k.box(0.064, 0.044, 0.046, 'stone');
    thumbTip.position.set(-0.036, 0.076, -0.062);
    thumbTip.rotation.set(0.08, 0.14, -0.12);
    g.add(thumbTip);

    // --- moss cushions & creeping tendrils tucked into rock fissures ---
    const mossTufts = [
      // central back-of-hand cleft
      { p: [0.002, 0.098, 0.066], s: [0.65, 1.25, 0.55], r: 0.022 },
      { p: [0.004, 0.052, 0.066], s: [0.85, 0.95, 0.55], r: 0.021 },
      // wrist-to-fist fault line
      { p: [-0.038, 0.014, 0.062], s: [1.35, 0.65, 0.65], r: 0.019 },
      { p: [0.042, 0.008, 0.056], s: [1.20, 0.60, 0.65], r: 0.018 },
      { p: [-0.064, 0.012, 0.018], s: [0.65, 0.85, 1.15], r: 0.018 },
      // knuckle clefts
      { p: [-0.034, 0.130, 0.044], s: [0.70, 0.95, 0.65], r: 0.016 },
      { p: [0.008, 0.134, 0.046], s: [0.70, 1.00, 0.65], r: 0.017 },
      // thumb crook & forearm seam
      { p: [-0.072, 0.058, -0.016], s: [0.75, 0.85, 1.10], r: 0.017 },
      { p: [0.038, -0.095, 0.066], s: [0.70, 1.40, 0.55], r: 0.019 },
      { p: [-0.044, -0.132, 0.052], s: [0.65, 1.35, 0.60], r: 0.018 },
    ];
    for (let i = 0; i < mossTufts.length; i++) {
      const m = mossTufts[i];
      const tuft = k.sphere(m.r, 0, moss);
      tuft.scale.set(m.s[0], m.s[1], m.s[2]);
      tuft.position.set(m.p[0], m.p[1], m.p[2]);
      tuft.rotation.set(0.2 * i, 0.35 * i, -0.15 * i);
      g.add(tuft);
    }

    const mossCreep = k.tube([
      [0.032, -0.172, 0.058],
      [0.042, -0.124, 0.068],
      [0.034, -0.072, 0.068],
      [0.018, -0.020, 0.070],
      [0.004, 0.028, 0.070],
    ], 0.0075, 5, moss);
    g.add(mossCreep);

    // --- storm-charged mineral vein sunk deep inside the central back fissure (sét) ---
    const shards = [
      { p: [0.002, 0.076, 0.066], r: 0.008, h: 0.034, rot: [0.85, 0.1, -0.18] },
      { p: [0.000, 0.112, 0.062], r: 0.007, h: 0.028, rot: [0.62, -0.2, 0.22] },
      { p: [0.006, 0.038, 0.066], r: 0.0065, h: 0.024, rot: [1.05, 0.15, -0.10] },
      { p: [-0.012, 0.144, 0.040], r: 0.006, h: 0.022, rot: [0.35, 0.0, 0.12] },
    ];
    for (const s of shards) {
      const crystal = k.cone(s.r, s.h, 4, spark);
      crystal.position.set(s.p[0], s.p[1], s.p[2]);
      crystal.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
      g.add(crystal);
    }

    // --- forged iron quarry wedges & staples binding the cracked boulders ---
    const stapleTop = k.tube([
      [-0.036, 0.088, 0.056],
      [-0.024, 0.090, 0.084],
      [0.026, 0.084, 0.082],
      [0.038, 0.082, 0.054],
    ], 0.0065, 5, 'iron_rough');
    g.add(stapleTop);

    const stapleMid = k.tube([
      [-0.036, 0.044, 0.052],
      [-0.022, 0.046, 0.080],
      [0.024, 0.042, 0.078],
      [0.036, 0.040, 0.050],
    ], 0.006, 5, 'iron_rough');
    g.add(stapleMid);

    // 3 quarry-splitting iron wedges hammered into the outer ridge (+X) as spikes & lightning rods
    const wedges = [
      { p: [0.082, 0.094, 0.016], rot: [0.10, -0.18, -1.28], s: [0.018, 0.048, 0.026] },
      { p: [0.080, 0.042, 0.018], rot: [-0.08, -0.14, -1.42], s: [0.016, 0.044, 0.024] },
      { p: [0.074, -0.096, 0.024], rot: [0.06, -0.22, -1.36], s: [0.016, 0.042, 0.024] },
    ];
    for (const w of wedges) {
      const wedge = k.box(w.s[0], w.s[1], w.s[2], 'iron_rough');
      wedge.position.set(w.p[0], w.p[1], w.p[2]);
      wedge.rotation.set(w.rot[0], w.rot[1], w.rot[2]);
      g.add(wedge);

      const cap = k.box(w.s[0] + 0.007, 0.010, w.s[2] + 0.006, 'iron_rough');
      cap.position.set(w.p[0] + 0.014, w.p[1] + 0.004, w.p[2] + 0.002);
      cap.rotation.set(w.rot[0], w.rot[1], w.rot[2]);
      g.add(cap);
    }

    // Heavy iron rivets anchoring the forearm bands to the stone carapace
    const rivets = [
      [0.0, -0.152, 0.074],
      [0.0, -0.062, 0.072],
      [-0.068, -0.152, 0.018],
      [-0.066, -0.062, 0.018],
    ];
    for (const r of rivets) {
      const pin = k.sphere(0.009, 0, 'iron_rough');
      pin.position.set(r[0], r[1], r[2]);
      g.add(pin);
    }

    k.marker(g, 'base', [0, 0.01, 0.01]);
    k.marker(g, 'tip', [0, 0.172, 0.026]);
    return g;
  },
};