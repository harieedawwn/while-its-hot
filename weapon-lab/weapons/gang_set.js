// Găng sét — găng tay chiến đấu bọc thép tích điện bằng cuộn cảm đồng quanh cổ tay và bốn cọc thu lôi trên đốt ngón.
export default {
  meta: {
    id: 'gang_set',
    name: 'Găng sét',
    family: 'tay',
    level: 21,
    inspiration: 'Găng tay xung điện cuộn Tesla công nghiệp — nạp dòng quanh cổ tay và phóng sét qua bốn cọc thu lôi đốt ngón',
    look: 'găng thép tối bọc da, cổ tay quấn cuộn dây đồng dày kẹp sứ cách điện xanh băng và tụ điện hông, bốn cọc sét đồng có tán sứ nhô thẳng từ khớp đốt ngón',
    power: { score: 7, note: 'đánh dồn dập, lan sét khống chế nhiều địch và làm tê cóng mục tiêu' },
    effects: [
      'mỗi đòn đánh trúng nảy sét sang 1 kẻ địch gần đó gây 8 sát thương',
      'đòn nặng phóng chuỗi sét đánh trúng đồng thời 3 mục tiêu',
      'đóng băng ngắn mục tiêu trúng xung sét cường độ cao',
    ],
    lengthM: 0.40,
  },
  build(k) {
    const g = k.group();
    const ceramic = k.paint('#c8dde6', false);   // sứ cách điện xanh băng
    const arcBlue = k.paint('#5cd6ff', true);    // lõi phóng điện ánh lam

    // --- ống tay trong bằng da & vành cổ tay sau (-Y: -0.22 đến +0.01) ---
    const sleeve = k.cyl(0.044, 0.056, 0.232, 8, 'leather');
    sleeve.position.y = -0.104;
    g.add(sleeve);

    const cuffRim = k.lathe([
      [0.0, -0.220], [0.061, -0.220], [0.066, -0.204],
      [0.063, -0.178], [0.056, -0.162], [0.0, -0.162],
    ], 8, 'steel_dark');
    g.add(cuffRim);

    const cuffBand = k.cyl(0.064, 0.065, 0.010, 8, 'brass');
    cuffBand.position.y = -0.196;
    g.add(cuffBand);

    // giáp cẳng tay mặt mu (+Z) và mặt lòng (-Z)
    const forearmBack = k.box(0.072, 0.082, 0.024, 'steel_dark');
    forearmBack.position.set(0, -0.156, 0.045);
    forearmBack.rotation.x = -0.06;
    g.add(forearmBack);

    const forearmPalm = k.box(0.064, 0.074, 0.020, 'steel_dark');
    forearmPalm.position.set(0, -0.156, -0.045);
    forearmPalm.rotation.x = 0.06;
    g.add(forearmPalm);

    // --- cuộn cảm đồng quanh cổ tay (-0.124 đến +0.006) ---
    const coilBobbin = k.lathe([
      [0.0, -0.124], [0.063, -0.124], [0.063, -0.113],
      [0.052, -0.111], [0.050, -0.007],
      [0.061, -0.005], [0.061, 0.006], [0.0, 0.006],
    ], 8, ceramic);
    g.add(coilBobbin);

    const coilCore = k.cyl(0.0535, 0.0555, 0.104, 8, 'copper');
    coilCore.position.y = -0.059;
    g.add(coilCore);

    g.add(k.wrap(-0.108, -0.010, 0.059, 5, 'copper'));

    // 4 thanh kẹp đồng thau khóa hai vành sứ của cuộn cảm
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const clamp = k.box(0.012, 0.132, 0.012, 'brass');
      clamp.position.set(Math.sin(ang) * 0.061, -0.059, Math.cos(ang) * 0.061);
      clamp.rotation.y = ang;
      g.add(clamp);
    }

    // --- tụ điện phụ bên hông ngoài (+X) nối vào cuộn cổ tay ---
    const capBody = k.cyl(0.015, 0.015, 0.094, 6, ceramic);
    capBody.position.set(0.067, -0.066, 0.012);
    g.add(capBody);

    const capCore = k.cyl(0.0165, 0.0165, 0.024, 6, arcBlue);
    capCore.position.set(0.067, -0.066, 0.012);
    g.add(capCore);

    for (const cy of [-0.111, -0.021]) {
      const capEnd = k.cyl(0.0175, 0.0175, 0.012, 6, 'copper');
      capEnd.position.set(0.067, cy, 0.012);
      g.add(capEnd);

      const strap = k.box(0.030, 0.014, 0.018, 'brass');
      strap.position.set(0.054, cy, 0.012);
      g.add(strap);
    }

    const capLead = k.tube([
      [0.067, -0.018, 0.012],
      [0.064, 0.012, 0.024],
      [0.036, 0.026, 0.036],
    ], 0.0045, 6, 'copper');
    g.add(capLead);

    // --- nắm đấm bọc thép (0.00 đến +0.115) ---
    const palmCore = k.box(0.092, 0.112, 0.068, 'leather');
    palmCore.position.set(0, 0.052, -0.004);
    g.add(palmCore);

    // giáp mu bàn tay (+Z)
    const dorsalPlate = k.box(0.096, 0.096, 0.024, 'steel_dark');
    dorsalPlate.position.set(0, 0.056, 0.030);
    dorsalPlate.rotation.x = -0.06;
    g.add(dorsalPlate);

    // lõi tụ điện nhỏ ở chính giữa mu bàn tay
    const dorsalHousing = k.cyl(0.020, 0.022, 0.016, 6, ceramic);
    dorsalHousing.position.set(0, 0.056, 0.041);
    dorsalHousing.rotation.x = Math.PI / 2 - 0.06;
    g.add(dorsalHousing);

    const dorsalCore = k.cyl(0.011, 0.011, 0.020, 6, arcBlue);
    dorsalCore.position.set(0, 0.056, 0.042);
    dorsalCore.rotation.x = Math.PI / 2 - 0.06;
    g.add(dorsalCore);

    // 4 đốt ngón cuộn vào lòng bàn tay (-Z)
    for (const fx of [-0.033, -0.011, 0.011, 0.033]) {
      const finger = k.box(0.020, 0.052, 0.028, 'steel_dark');
      finger.position.set(fx, 0.082, -0.030);
      g.add(finger);

      const knucklePad = k.box(0.018, 0.024, 0.016, 'leather');
      knucklePad.position.set(fx, 0.054, -0.036);
      g.add(knucklePad);
    }

    // --- ngón cái gập bên phía -X ---
    const thumbBase = k.box(0.034, 0.052, 0.038, 'leather');
    thumbBase.position.set(-0.052, 0.030, -0.008);
    thumbBase.rotation.z = 0.22;
    g.add(thumbBase);

    const thumbGuard = k.box(0.028, 0.044, 0.028, 'steel_dark');
    thumbGuard.position.set(-0.058, 0.036, -0.002);
    thumbGuard.rotation.z = 0.22;
    g.add(thumbGuard);

    const thumbDistal = k.box(0.050, 0.026, 0.028, 'steel_dark');
    thumbDistal.position.set(-0.036, 0.062, -0.034);
    thumbDistal.rotation.set(0, 0.35, 0.22);
    g.add(thumbDistal);

    const thumbStud = k.sphere(0.008, 0, 'brass');
    thumbStud.position.set(-0.013, 0.068, -0.043);
    g.add(thumbStud);

    // --- cầu nối đốt ngón & hai thanh dẫn điện đồng từ cổ tay lên ---
    const knuckleBridge = k.box(0.108, 0.028, 0.048, 'steel_dark');
    knuckleBridge.position.set(0, 0.110, 0.008);
    g.add(knuckleBridge);

    const sparkRail = k.box(0.088, 0.010, 0.012, arcBlue);
    sparkRail.position.set(0, 0.112, 0.030);
    g.add(sparkRail);

    for (const sx of [-0.025, 0.025]) {
      const busbar = k.tube([
        [sx, -0.006, 0.055],
        [sx * 1.08, 0.048, 0.046],
        [sx, 0.110, 0.024],
      ], 0.0055, 6, 'copper');
      g.add(busbar);

      const bridgeClip = k.box(0.012, 0.020, 0.014, 'brass');
      bridgeClip.position.set(sx, 0.112, 0.031);
      g.add(bridgeClip);
    }

    // --- bốn cọc sét trên đốt ngón (+Y: lên tới +0.182) ---
    const rods = [
      { x: -0.038, y: 0.118, h: 0.052, rz: 0.08 },
      { x: -0.012, y: 0.120, h: 0.062, rz: 0.02 },
      { x: 0.014,  y: 0.118, h: 0.056, rz: -0.02 },
      { x: 0.038,  y: 0.114, h: 0.046, rz: -0.09 },
    ];

    for (const r of rods) {
      const rodGroup = k.group();
      rodGroup.position.set(r.x, r.y, 0.008);
      rodGroup.rotation.z = r.rz;

      // đai ốc đồng thau chân cọc
      const nut = k.cyl(0.0115, 0.012, 0.010, 6, 'brass');
      nut.position.y = 0.002;
      rodGroup.add(nut);

      // tán sứ cách điện hai tầng
      const insulator = k.lathe([
        [0.0, -0.006], [0.0105, -0.006], [0.0105, 0.010],
        [0.0070, 0.014], [0.0112, 0.019], [0.0072, 0.024], [0.0, 0.024],
      ], 6, ceramic);
      rodGroup.add(insulator);

      // mũi cọc thu lôi bằng đồng có vành phóng điện
      const spike = k.lathe([
        [0.0, 0.020], [0.0064, 0.020], [0.0084, r.h * 0.62],
        [0.0042, r.h * 0.68], [0.0, r.h],
      ], 6, 'copper');
      rodGroup.add(spike);

      g.add(rodGroup);
    }

    k.marker(g, 'base', [0, 0.105, 0.008]);
    k.marker(g, 'tip', [0, 0.182, 0.008]);
    return g;
  },
};