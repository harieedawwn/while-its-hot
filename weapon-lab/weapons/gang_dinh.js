export default {
  meta: {
    id: 'gang_dinh',
    name: 'Găng đinh',
    family: 'tay',
    level: 6,
    inspiration: 'Găng tay chiến đấu bọc sắt thời trung cổ gắn thanh đấm đinh tán của thợ rèn',
    look: 'bao cổ tay da đai khóa đồng ốp thép sẫm, mu bàn tay giáp bản liền, đốt ngón và thanh khớp đấm gắn dày đinh tán thép bốn cạnh nhọn',
    power: { score: 5, note: 'đấm cận chiến nặng tay, tích nhịp combo đẩy văng mạnh' },
    effects: [
      'đòn 4 combo hất văng 3 m',
      'đòn đấm nặng làm choáng ngắn kẻ địch đang vung đòn',
      'các đinh tán nhọn gây rách nhẹ khi đánh trúng mục tiêu không giáp',
    ],
    lengthM: 0.38,
  },
  build(k) {
    const g = k.group();
    const darkPad = k.paint('#231d19', false);

    // Helper: forged pyramidal spike on an iron washer (+ optional brass collar)
    const addSpike = (x, y, z, rx, ry, rz, r, h, brassCollar) => {
      const sg = k.group();
      sg.position.set(x, y, z);
      sg.rotation.set(rx, ry, rz);

      const washer = k.cyl(r * 1.18, r * 1.32, 0.007, 6, 'iron_rough');
      washer.position.y = 0.001;
      sg.add(washer);

      let coneBase = 0.003;
      if (brassCollar) {
        const collar = k.cyl(r * 0.96, r * 1.08, 0.005, 6, 'brass');
        collar.position.y = 0.006;
        sg.add(collar);
        coneBase = 0.0065;
      }

      const spike = k.cone(r, h, 4, 'steel');
      spike.position.y = coneBase + h * 0.5;
      spike.rotation.y = Math.PI * 0.25;
      sg.add(spike);

      g.add(sg);
    };

    // --- forearm sleeve & elbow rim (-0.22 to +0.005) ---
    const sleeve = k.lathe(
      [
        [0.0, -0.215],
        [0.056, -0.215],
        [0.054, -0.16],
        [0.049, -0.09],
        [0.044, -0.015],
        [0.047, 0.005],
        [0.0, 0.005],
      ],
      8,
      'leather'
    );
    g.add(sleeve);

    const cuffLip = k.cyl(0.059, 0.061, 0.02, 8, darkPad);
    cuffLip.position.y = -0.211;
    g.add(cuffLip);

    const elbowBand = k.cyl(0.061, 0.064, 0.016, 8, 'iron_rough');
    elbowBand.position.y = -0.197;
    g.add(elbowBand);

    // --- armored forearm vambrace plates (+Z dorsal & side guards) ---
    const dorsalPlate = k.box(0.058, 0.184, 0.022, 'steel_dark');
    dorsalPlate.position.set(0, -0.112, 0.044);
    dorsalPlate.rotation.x = -0.06;
    g.add(dorsalPlate);

    const dorsalRidge = k.box(0.016, 0.174, 0.012, 'steel');
    dorsalRidge.position.set(0, -0.112, 0.056);
    dorsalRidge.rotation.x = -0.06;
    g.add(dorsalRidge);

    for (const side of [-1, 1]) {
      const sidePlate = k.box(0.02, 0.174, 0.06, 'steel_dark');
      sidePlate.position.set(side * 0.045, -0.112, 0.014);
      sidePlate.rotation.set(0, side * 0.28, side * 0.06);
      g.add(sidePlate);
    }

    // Small brass rivets along the forearm dorsal plate
    for (const y of [-0.18, -0.11, -0.04]) {
      const zOff = 0.054 - (y + 0.112) * 0.06;
      for (const side of [-1, 1]) {
        const pin = k.sphere(0.0042, 0, 'brass');
        pin.position.set(side * 0.02, y, zOff);
        g.add(pin);
      }
    }

    // --- two leather forearm straps with brass buckles ---
    const straps = [
      { y: -0.155, r: 0.057 },
      { y: -0.065, r: 0.052 },
    ];
    for (const s of straps) {
      const band = k.cyl(s.r, s.r, 0.02, 8, darkPad);
      band.position.set(0, s.y, 0.004);
      band.scale.set(1.04, 1, 1.05);
      g.add(band);

      const bx = s.r * 1.03;
      const buckle = k.box(0.012, 0.026, 0.024, 'brass');
      buckle.position.set(bx, s.y, 0.004);
      g.add(buckle);

      const buckleSlot = k.box(0.014, 0.014, 0.012, darkPad);
      buckleSlot.position.set(bx + 0.001, s.y, 0.004);
      g.add(buckleSlot);

      const tongue = k.box(0.015, 0.004, 0.016, 'brass');
      tongue.position.set(bx + 0.001, s.y, 0.004);
      g.add(tongue);
    }

    // --- articulated wrist collar (origin) ---
    const wristRing = k.lathe(
      [
        [0.0, -0.022],
        [0.049, -0.022],
        [0.052, -0.012],
        [0.051, 0.002],
        [0.047, 0.01],
        [0.0, 0.01],
      ],
      8,
      'iron_rough'
    );
    wristRing.scale.set(1.08, 1, 0.94);
    g.add(wristRing);

    const wristLame = k.box(0.088, 0.032, 0.026, 'steel_dark');
    wristLame.position.set(0, 0.014, 0.033);
    wristLame.rotation.x = 0.1;
    g.add(wristLame);

    for (const side of [-1, 1]) {
      const bolt = k.cyl(0.007, 0.007, 0.014, 6, 'brass');
      bolt.position.set(side * 0.052, 0.003, 0.008);
      bolt.rotation.z = Math.PI * 0.5;
      g.add(bolt);
    }

    // --- fist palm core & armored back of hand (+Z) ---
    const palmCore = k.box(0.096, 0.102, 0.068, 'leather');
    palmCore.position.set(0, 0.054, 0.002);
    g.add(palmCore);

    const palmHeel = k.box(0.084, 0.052, 0.022, darkPad);
    palmHeel.position.set(0.004, 0.03, -0.028);
    g.add(palmHeel);

    const handPlate = k.box(0.102, 0.074, 0.024, 'steel_dark');
    handPlate.position.set(0, 0.058, 0.033);
    handPlate.rotation.x = -0.05;
    g.add(handPlate);

    const handTrim = k.box(0.086, 0.032, 0.014, 'steel');
    handTrim.position.set(0, 0.072, 0.043);
    handTrim.rotation.x = -0.05;
    g.add(handTrim);

    for (const side of [-1, 1]) {
      const handEdge = k.box(0.016, 0.068, 0.044, 'steel_dark');
      handEdge.position.set(side * 0.046, 0.056, 0.014);
      g.add(handEdge);
    }

    for (const x of [-0.028, 0, 0.028]) {
      const stud = k.cone(0.0055, 0.009, 4, 'brass');
      stud.position.set(x, 0.046, 0.048);
      stud.rotation.set(Math.PI * 0.5, 0, Math.PI * 0.25);
      g.add(stud);
    }

    // --- four curled fingers with armored bands & mid-joint spikes ---
    const fingers = [
      { x: -0.036, yTop: 0.11, w: 0.023, r: 0.009, h: 0.038, rz: 0.06 },
      { x: -0.011, yTop: 0.114, w: 0.024, r: 0.0095, h: 0.042, rz: 0.01 },
      { x: 0.014, yTop: 0.108, w: 0.023, r: 0.0088, h: 0.036, rz: -0.04 },
      { x: 0.037, yTop: 0.098, w: 0.021, r: 0.008, h: 0.03, rz: -0.1 },
    ];

    for (const f of fingers) {
      // Proximal finger block forming the +Y striking plane
      const topSeg = k.box(f.w, 0.034, 0.066, 'leather');
      topSeg.position.set(f.x, f.yTop - 0.016, -0.002);
      g.add(topSeg);

      const topPlate = k.box(f.w - 0.002, 0.016, 0.056, 'steel_dark');
      topPlate.position.set(f.x, f.yTop - 0.003, 0.003);
      g.add(topPlate);

      // Curled lower finger tucked into the palm (-Z side)
      const curlSeg = k.box(f.w - 0.001, 0.05, 0.026, 'leather');
      curlSeg.position.set(f.x, f.yTop - 0.036, -0.029);
      g.add(curlSeg);

      const jointBand = k.box(f.w + 0.001, 0.022, 0.028, 'steel_dark');
      jointBand.position.set(f.x, f.yTop - 0.025, -0.03);
      g.add(jointBand);

      // Sharp rivet stud on the second finger joint (PIP)
      addSpike(f.x, f.yTop - 0.014, -0.039, -0.95, 0, f.rz * 0.5, 0.0062, 0.016, false);

      // Primary heavy spiked rivet on the main knuckle (+Y striking face)
      addSpike(f.x, f.yTop + 0.007, 0.02, 0.07, 0, f.rz, f.r, f.h, true);

      // Secondary back-knuckle rivet stud (+Z/+Y ridge for FPS silhouette)
      addSpike(f.x, f.yTop - 0.011, 0.041, 1.15, 0, f.rz * 0.6, 0.0058, 0.014, false);
    }

    // --- heavy bolted knuckle impact bar across all four knuckles ---
    const knuckleBar = k.box(0.106, 0.024, 0.034, 'steel');
    knuckleBar.position.set(0, 0.104, 0.022);
    knuckleBar.rotation.z = -0.08;
    g.add(knuckleBar);

    for (const side of [-1, 1]) {
      const clamp = k.box(0.014, 0.034, 0.038, 'iron_rough');
      clamp.position.set(side * 0.052, 0.095 - side * 0.004, 0.02);
      g.add(clamp);

      const hexBolt = k.cyl(0.008, 0.008, 0.014, 6, 'brass');
      hexBolt.position.set(side * 0.057, 0.095 - side * 0.004, 0.02);
      hexBolt.rotation.z = Math.PI * 0.5;
      g.add(hexBolt);
    }

    // --- armored thumb on -X side curled across the palm (-Z) ---
    const thumbBase = k.box(0.028, 0.046, 0.034, 'leather');
    thumbBase.position.set(-0.048, 0.028, -0.009);
    thumbBase.rotation.set(-0.24, 0, 0.24);
    g.add(thumbBase);

    const thumbShield = k.box(0.016, 0.046, 0.032, 'steel_dark');
    thumbShield.position.set(-0.056, 0.034, -0.009);
    thumbShield.rotation.set(-0.24, 0, 0.24);
    g.add(thumbShield);

    const thumbTip = k.box(0.056, 0.028, 0.028, 'leather');
    thumbTip.position.set(-0.034, 0.064, -0.036);
    thumbTip.rotation.set(0, 0.34, 0.1);
    g.add(thumbTip);

    const thumbCap = k.box(0.05, 0.022, 0.016, 'steel_dark');
    thumbCap.position.set(-0.034, 0.066, -0.046);
    thumbCap.rotation.set(0, 0.34, 0.1);
    g.add(thumbCap);

    // Side spike mounted on the thumb knuckle (-X)
    addSpike(-0.056, 0.058, -0.028, -0.25, 0, 1.15, 0.0072, 0.024, true);

    k.marker(g, 'base', [0, 0.095, 0.02]);
    k.marker(g, 'tip', [-0.011, 0.164, 0.025]);
    return g;
  },
};