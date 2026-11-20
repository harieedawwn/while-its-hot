// Phi Đao Lôi Thần — phi đao ba cạnh đen ánh thép, chuôi thẳng dán bùa ký tự đỏ và vòng xỏ ngón lớn.
export default {
  meta: {
    id: 'phi_dao_loi_than',
    name: 'Phi Đao Lôi Thần',
    family: 'dao',
    level: 15,
    inspiration: 'Phi Lôi Thần Khổ Vô (Hiraishin Kunai) của Minato Namikaze (Naruto) — phi đao ba mũi dán bùa thuấn thân',
    look: 'lưỡi ba cạnh đen ánh thép vát sắc với hai cánh xòe hướng mũi, chuôi thẳng quấn vải kem dán bùa giấy ký tự đỏ buộc chỉ son, đuôi vòng xỏ ngón lớn',
    power: { score: 7, note: 'ném xa, tự thu đao và dồn sát thương chí mạng khi đánh lưng' },
    effects: [
      'đòn nặng ném phi đao xa 15 m gây 12 sát thương xuyên thẳng',
      'dao tự bay về tay sau 1 giây (hồi chiêu 1.5 s), gây sát thương trên đường quay về',
      'đánh lưng mục tiêu gây sát thương chí mạng cao hơn và rút ngắn hồi chiêu thu đao',
    ],
    lengthM: 0.36,
  },
  build(k) {
    const g = k.group();

    const blackSteel = k.paint('#222731', true);     // blackened forged steel with metallic sheen
    const wrapCream = k.paint('#ded6c3', false);     // off-white grip cloth wrap
    const talismanPaper = k.paint('#efe1bc', false); // warm parchment talisman band
    const sealRed = k.paint('#c41e1a', false);       // crimson ink glyphs & binding cords

    // --- central dagger blade (y: 0.058 -> 0.258, double-edged diamond cross-section) ---
    const mainBlade = k.edge({
      spine: [[0, 0.058], [0, 0.096], [0, 0.150], [0, 0.204], [0, 0.258]],
      width: [0.030, 0.052, 0.035, 0.0175, 0.0],
      edge: 'both',
      thickness: 0.015,
      edgeThickness: 0.0015,
      bevel: 0.65,
      taper: 0.55,
      smooth: 5,
      slot: blackSteel,
    });
    g.add(mainBlade);

    // --- two forward-swept side prongs (wings) forming the iconic three-pronged head ---
    for (const s of [-1, 1]) {
      const wing = k.edge({
        spine: [
          [0.0, 0.076],
          [s * 0.023, 0.087],
          [s * 0.044, 0.097],
          [s * 0.066, 0.108],
        ],
        width: [0.038, 0.027, 0.016, 0.0],
        edge: 'both',
        thickness: 0.0138,
        edgeThickness: 0.0015,
        bevel: 0.65,
        taper: 0.5,
        smooth: 4,
        slot: blackSteel,
      });
      g.add(wing);
    }

    // --- crimson geometric seal inlay on the blade base (both +X and -X faces) ---
    const bladeStem = k.box(0.0146, 0.020, 0.0018, sealRed);
    bladeStem.position.set(0, 0.085, 0);
    g.add(bladeStem);
    for (const [y, wX, dZ, tilt] of [
      [0.076, 0.0152, 0.0082, 0.08],
      [0.084, 0.0148, 0.0064, -0.14],
      [0.092, 0.0143, 0.0052, 0.10],
    ]) {
      const mark = k.box(wX, 0.0024, dZ, sealRed);
      mark.position.set(0, y, 0);
      mark.rotation.x = tilt;
      g.add(mark);
    }

    // --- upper bolster & collar uniting blade base to grip (y: 0.049 -> 0.066) ---
    const upperCollar = k.lathe([
      [0.0, 0.049], [0.0142, 0.049], [0.0146, 0.054], [0.0126, 0.058],
      [0.0148, 0.062], [0.0135, 0.066], [0.0, 0.066],
    ], 8, 'steel_dark');
    g.add(upperCollar);

    const bolster = k.box(0.0162, 0.012, 0.031, 'steel_dark');
    bolster.position.set(0, 0.060, 0);
    g.add(bolster);

    const upperTrim = k.cyl(0.0150, 0.0150, 0.0035, 8, 'brass');
    upperTrim.position.y = 0.052;
    g.add(upperTrim);

    for (const z of [-0.012, 0.012]) {
      const rivet = k.sphere(0.0032, 0, 'brass');
      rivet.position.set(0, 0.060, z);
      g.add(rivet);
    }

    // --- straight tang core & cream cloth wrap (y: -0.054 -> 0.064) ---
    const core = k.cyl(0.0112, 0.0112, 0.118, 8, blackSteel);
    core.position.y = 0.005;
    g.add(core);

    g.add(k.wrap(-0.043, 0.052, 0.0124, 6, wrapCream));

    // --- parchment talisman band wrapped around the grip with crimson seal markings ---
    const talisman = k.cyl(0.0136, 0.0136, 0.044, 8, talismanPaper);
    talisman.position.y = 0.008;
    g.add(talisman);

    for (const y of [-0.013, 0.029]) {
      const cord = k.cyl(0.0143, 0.0143, 0.0042, 8, sealRed);
      cord.position.y = y;
      g.add(cord);
    }

    // geometric crimson rune strokes inlaid on the talisman (side faces +X/-X and edges +Z/-Z)
    const glyphSpineX = k.box(0.0282, 0.030, 0.0018, sealRed);
    glyphSpineX.position.set(0, 0.008, 0);
    g.add(glyphSpineX);

    for (const [y, dZ, tilt] of [
      [0.020, 0.0085, 0.12],
      [0.012, 0.0068, -0.18],
      [0.004, 0.0092, 0.08],
      [-0.004, 0.0062, -0.12],
    ]) {
      const stroke = k.box(0.0286, 0.0022, dZ, sealRed);
      stroke.position.set(0, y, 0);
      stroke.rotation.x = tilt;
      g.add(stroke);
    }

    for (const y of [0.016, 0.006, -0.003]) {
      const edgeTick = k.box(0.0055, 0.0022, 0.0284, sealRed);
      edgeTick.position.set(0, y, 0);
      g.add(edgeTick);
    }

    // folded paper talisman corner tucked under the lower crimson cord
    const tail = k.box(0.0028, 0.024, 0.009, talismanPaper);
    tail.position.set(0, -0.023, -0.0135);
    tail.rotation.x = -0.18;
    g.add(tail);
    const tailBorder = k.box(0.0032, 0.018, 0.0024, sealRed);
    tailBorder.position.set(0, -0.023, -0.0140);
    tailBorder.rotation.x = -0.18;
    g.add(tailBorder);

    // --- lower ferrule joining grip to the large finger ring (y: -0.055 -> -0.040) ---
    const lowerCollar = k.lathe([
      [0.0, -0.055], [0.0102, -0.055], [0.0118, -0.050], [0.0146, -0.046],
      [0.0144, -0.040], [0.0, -0.040],
    ], 8, 'steel_dark');
    g.add(lowerCollar);

    const lowerTrim = k.cyl(0.0150, 0.0150, 0.0035, 8, 'brass');
    lowerTrim.position.y = -0.043;
    g.add(lowerTrim);

    // --- large forged throwing finger ring in the blade plane (Z-Y, y: -0.106 -> -0.046) ---
    const ringPts = [];
    const segs = 14;
    const ringR = 0.0225;
    const ringY = -0.076;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      ringPts.push([0, ringY + Math.cos(a) * ringR, Math.sin(a) * ringR]);
    }
    g.add(k.tube(ringPts, 0.0075, 6, blackSteel));

    // forged knuckle stud at bottom of ring for counterweight
    const ringCap = k.box(0.0155, 0.008, 0.012, 'steel_dark');
    ringCap.position.set(0, -0.100, 0);
    g.add(ringCap);

    k.marker(g, 'base', [0, 0.062, 0]);
    k.marker(g, 'tip', [0, 0.258, 0]);
    return g;
  },
};