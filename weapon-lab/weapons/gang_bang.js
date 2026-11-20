// Găng Băng — găng giáp thép tối phủ cụm tinh thể băng trắng xanh sắc cạnh.
// Right-hand closed fist: wrist at origin, forearm cuff down to -0.22 m, fist 0..+0.12 m,
// glacier knuckle spikes to +0.19 m, back of hand +Z, thumb on -X.
export default {
  meta: {
    id: 'gang_bang',
    name: 'Găng Băng',
    family: 'tay',
    level: 18,
    inspiration: 'Găng giáp thiết kỵ Bắc Cực đóng băng cứng với các mũi tinh thể sông băng mọc xuyên khớp đốt',
    look: 'găng thép tối viền bạc lạnh, mu bàn tay khảm lõi băng xanh lam cùng hàng mũi tinh thể trắng xanh sắc cạnh phủ dọc đốt tay và sống cẳng tay',
    power: { score: 7, note: 'khống chế băng giá mạnh, có tầm bắn cầu băng làm chậm và tự hồi phục bền bỉ' },
    effects: [
      'đòn đánh thứ 4 đóng băng chân mục tiêu trong 0.7 giây',
      'đòn nặng bắn ra cầu băng làm chậm kẻ địch (hồi chiêu 2 giây)',
      'gây sát thương băng giá giúp hồi lại một lượng máu nhỏ',
    ],
    lengthM: 0.42,
  },
  build(k) {
    const g = k.group();
    const frostSteel = k.paint('#7c98ad', true);   // frosted pale blue-silver armor trim
    const iceCore = k.paint('#3bb2e6', false);     // deep glacial cyan-blue crystal
    const iceBright = k.paint('#c8f0ff', false);   // icy pale white-blue crystal
    const iceWhite = k.paint('#eefaff', false);    // snow-white faceted crystal tips

    const crystal = (r, h, sides, slot) => k.lathe(
      [[0, 0], [r * 0.78, h * 0.06], [r, h * 0.62], [0, h]],
      sides,
      slot
    );

    const addCrystal = (x, y, z, r, h, sides, slot, rx, ry, rz) => {
      const c = crystal(r, h, sides, slot);
      c.position.set(x, y, z);
      c.rotation.set(rx, ry, rz);
      g.add(c);
    };

    // --- forearm inner leather sleeve (y: -0.220 to +0.005) ---
    const innerSleeve = k.cyl(0.041, 0.054, 0.225, 8, 'leather');
    innerSleeve.position.set(0, -0.108, 0);
    innerSleeve.scale.set(1.04, 1, 0.90);
    g.add(innerSleeve);

    // --- armored forearm vambrace + rolled frost-steel elbow cuff ---
    const vambrace = k.lathe([
      [0.044, -0.220], [0.063, -0.214], [0.065, -0.192],
      [0.058, -0.178], [0.055, -0.105], [0.050, -0.032],
      [0.046, 0.005], [0.039, 0.005],
    ], 8, 'steel_dark');
    vambrace.scale.set(1.06, 1, 0.92);
    g.add(vambrace);

    const cuffRim = k.lathe([
      [0.055, -0.223], [0.066, -0.220], [0.069, -0.202],
      [0.064, -0.186], [0.056, -0.184],
    ], 8, frostSteel);
    cuffRim.scale.set(1.06, 1, 0.92);
    g.add(cuffRim);

    // dorsal armored ridge + elbow guard plate (+Z side)
    const dorsalBar = k.box(0.036, 0.190, 0.020, frostSteel);
    dorsalBar.position.set(0, -0.105, 0.047);
    dorsalBar.rotation.x = -0.07;
    g.add(dorsalBar);

    const elbowCap = k.box(0.054, 0.044, 0.024, 'steel_dark');
    elbowCap.position.set(0, -0.200, 0.058);
    elbowCap.rotation.x = -0.24;
    g.add(elbowCap);

    // leather forearm straps + frost-steel buckles on +X side
    for (const [y, r, bx] of [[-0.148, 0.059, 0.060], [-0.072, 0.055, 0.056]]) {
      const strap = k.cyl(r - 0.001, r, 0.015, 8, 'leather');
      strap.position.y = y;
      strap.scale.set(1.07, 1, 0.93);
      g.add(strap);

      const buckle = k.box(0.012, 0.020, 0.022, frostSteel);
      buckle.position.set(bx, y, 0.004);
      g.add(buckle);
    }

    // --- wrist articulation lames & side hinge rivets (y: -0.025 to +0.032) ---
    for (const [y, z, w, slot] of [
      [-0.016, 0.036, 0.088, frostSteel],
      [0.004, 0.039, 0.094, 'steel_dark'],
      [0.022, 0.041, 0.098, frostSteel],
    ]) {
      const lame = k.box(w, 0.022, 0.018, slot);
      lame.position.set(0, y, z);
      lame.rotation.x = -0.14;
      g.add(lame);
    }
    for (const sx of [-1, 1]) {
      const hinge = k.box(0.014, 0.032, 0.030, 'steel_dark');
      hinge.position.set(sx * 0.048, 0.004, 0.006);
      g.add(hinge);

      const rivet = k.sphere(0.006, 0, frostSteel);
      rivet.position.set(sx * 0.054, 0.004, 0.006);
      g.add(rivet);
    }

    // --- fist core, metacarpal backplate & heavy knuckle bar (y: 0.00 to +0.125) ---
    const palmCore = k.box(0.096, 0.108, 0.068, 'leather');
    palmCore.position.set(0, 0.056, -0.002);
    g.add(palmCore);

    const backPlate = k.box(0.098, 0.092, 0.026, 'steel_dark');
    backPlate.position.set(0, 0.062, 0.033);
    backPlate.rotation.x = -0.05;
    g.add(backPlate);

    for (const sx of [-1, 1]) {
      const rib = k.box(0.018, 0.084, 0.016, frostSteel);
      rib.position.set(sx * 0.041, 0.064, 0.041);
      rib.rotation.x = -0.05;
      g.add(rib);
    }

    const knuckleBar = k.box(0.106, 0.028, 0.046, frostSteel);
    knuckleBar.position.set(0, 0.112, 0.018);
    knuckleBar.rotation.x = 0.20;
    g.add(knuckleBar);

    // --- 4 curled armored fingers (wrapping from +Y knuckles into -Z palm) ---
    for (const [x, yOff, w] of [
      [-0.036, 0.002, 0.022],
      [-0.012, 0.006, 0.023],
      [0.012, 0.003, 0.022],
      [0.036, -0.005, 0.020],
    ]) {
      const upper = k.box(w, 0.034, 0.032, 'steel_dark');
      upper.position.set(x, 0.106 + yOff, -0.015);
      upper.rotation.x = 0.42;
      g.add(upper);

      const lower = k.box(w - 0.001, 0.046, 0.024, 'steel_dark');
      lower.position.set(x, 0.072 + yOff * 0.7, -0.038);
      lower.rotation.x = -0.14;
      g.add(lower);

      const cap = k.box(w + 0.001, 0.014, 0.016, frostSteel);
      cap.position.set(x, 0.095 + yOff, -0.034);
      cap.rotation.x = 0.25;
      g.add(cap);
    }

    // --- articulated thumb on -X side (curling across fingers on -Z) ---
    const thumbBase = k.box(0.030, 0.048, 0.032, 'steel_dark');
    thumbBase.position.set(-0.048, 0.032, -0.008);
    thumbBase.rotation.set(-0.28, 0, 0.34);
    g.add(thumbBase);

    const thumbMid = k.box(0.028, 0.032, 0.028, frostSteel);
    thumbMid.position.set(-0.052, 0.064, -0.030);
    thumbMid.rotation.set(0.18, 0.20, -0.32);
    g.add(thumbMid);

    const thumbTip = k.box(0.044, 0.024, 0.022, 'steel_dark');
    thumbTip.position.set(-0.026, 0.073, -0.046);
    thumbTip.rotation.set(0.08, -0.18, -0.12);
    g.add(thumbTip);

    // --- glacier knuckle spikes (+Y striking crown, bases sunk into knuckle bar) ---
    addCrystal(-0.038, 0.104, 0.020, 0.014, 0.072, 5, iceBright, -0.12, 0, 0.18);
    addCrystal(-0.010, 0.106, 0.024, 0.016, 0.084, 6, iceWhite,  -0.14, 0, 0.04);
    addCrystal( 0.018, 0.104, 0.022, 0.015, 0.076, 5, iceBright, -0.12, 0, -0.09);
    addCrystal( 0.043, 0.098, 0.016, 0.013, 0.064, 5, iceCore,   -0.08, 0, -0.26);

    // bridging frost crust wedges between knuckle spikes
    addCrystal(-0.024, 0.100, 0.028, 0.013, 0.046, 5, iceCore,   0.26, 0, 0.12);
    addCrystal( 0.004, 0.102, 0.030, 0.014, 0.050, 5, iceBright, 0.30, 0, -0.03);
    addCrystal( 0.031, 0.098, 0.026, 0.012, 0.042, 5, iceWhite,  0.24, 0, -0.18);

    // --- back-of-hand frost core & radiating crystal crown (+Z) ---
    const frostCore = k.sphere(0.022, 0, iceCore);
    frostCore.position.set(0, 0.058, 0.042);
    frostCore.scale.set(1.05, 1.35, 0.72);
    g.add(frostCore);

    addCrystal(-0.018, 0.074, 0.038, 0.011, 0.044, 5, iceWhite,  0.95, 0, 0.45);
    addCrystal( 0.018, 0.072, 0.038, 0.012, 0.046, 5, iceBright, 0.90, 0, -0.42);
    addCrystal(-0.026, 0.048, 0.036, 0.011, 0.042, 5, iceBright, 1.45, 0, 0.65);
    addCrystal( 0.026, 0.046, 0.036, 0.011, 0.040, 5, iceCore,   1.45, 0, -0.65);
    addCrystal( 0.000, 0.034, 0.038, 0.013, 0.052, 6, iceBright, 2.05, 0, 0.00);

    // --- forearm swept glacier crest (+Z dorsal ridge & +X outer edge) ---
    addCrystal( 0.000, -0.058, 0.042, 0.014, 0.058, 5, iceWhite,  1.95, 0, 0.04);
    addCrystal(-0.020, -0.112, 0.044, 0.015, 0.068, 5, iceCore,   2.10, 0, 0.34);
    addCrystal( 0.020, -0.116, 0.044, 0.016, 0.074, 6, iceBright, 2.12, 0, -0.32);
    addCrystal( 0.000, -0.172, 0.048, 0.021, 0.096, 6, iceBright, 2.28, 0, -0.02);
    addCrystal( 0.004, -0.184, 0.050, 0.013, 0.066, 5, iceWhite,  2.48, 0, -0.12);

    // outer ulna (+X) & thumb (-X) frost spurs
    addCrystal( 0.046, -0.088, 0.012, 0.013, 0.054, 5, iceCore,   0.35, 0, -1.95);
    addCrystal( 0.052, -0.152, 0.016, 0.015, 0.066, 5, iceBright, 0.42, 0, -2.08);
    addCrystal(-0.052,  0.064, -0.020, 0.011, 0.044, 5, iceWhite, -0.15, 0, 0.72);

    k.marker(g, 'base', [0, 0.105, 0.020]);
    k.marker(g, 'tip', [0, 0.188, 0.014]);
    return g;
  },
};