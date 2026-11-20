// Găng từ — găng bọc thép tay phải gắn nam châm móng ngựa sơn đỏ cỡ lớn trên lòng bàn tay,
// cấp 27: cuộn dây đồng cảm ứng + bộ tụ điện trên cẳng tay dẫn dòng ra hai cực thép hút địch và phóng sét.
export default {
  meta: {
    id: 'gang_tu',
    name: 'Găng từ',
    family: 'tay',
    level: 27,
    inspiration: 'Nam châm móng ngựa công nghiệp sơn đỏ bắt vít thẳng vào găng đấm bọc thép có cuộn kích từ',
    look: 'găng sắt sẫm tay phải ôm nam châm móng ngựa sơn đỏ cỡ lớn dọc lòng bàn tay, hai đầu cực thép trần chìa vượt khớp ngón có mũi phóng điện bằng đồng, cuộn dây đồng quấn quanh chân nam châm nối dây về ống tụ trên cẳng tay',
    power: { score: 7, note: 'khống chế khoảng cách, kéo địch vào tầm đấm và phá đội hình' },
    effects: [
      'đòn nặng kéo địch trong tầm 8 m về ngay trước mặt rồi tự động đấm bồi (hồi 4 giây)',
      'gồng lực từ gom mảnh đá xung quanh dựng tường đá chắn đòn ngay trước mặt',
      'hai cực nam châm phóng tia sét ngắn khi va chạm, gây giật tê mục tiêu',
    ],
    lengthM: 0.39,
  },
  build(k) {
    const g = k.group();
    const magnetRed = k.paint('#c82620', false);   // classic enamel red horseshoe magnet

    // --- 1. Forearm cuff (-Y: -0.222 to +0.015): insulated leather liner + iron shell ---
    const liner = k.lathe([
      [0.0, -0.222], [0.050, -0.222], [0.053, -0.200],
      [0.047, -0.115], [0.039, -0.025], [0.037, 0.015], [0.0, 0.015],
    ], 8, 'leather');
    liner.scale.set(1.06, 1, 0.92);
    g.add(liner);

    const cuff = k.lathe([
      [0.0, -0.215], [0.056, -0.215], [0.061, -0.202], [0.055, -0.184],
      [0.051, -0.105], [0.045, -0.032], [0.042, -0.024], [0.0, -0.024],
    ], 8, 'steel_dark');
    cuff.scale.set(1.06, 1, 0.94);
    g.add(cuff);

    // Flared elbow rim & heavy clamping straps around the forearm
    const elbowRim = k.cyl(0.059, 0.064, 0.020, 8, 'steel');
    elbowRim.position.y = -0.208;
    elbowRim.scale.set(1.06, 1, 0.94);
    g.add(elbowRim);

    for (const y of [-0.160, -0.088]) {
      const r = y < -0.12 ? 0.056 : 0.051;
      const strap = k.cyl(r, r + 0.001, 0.016, 8, 'leather');
      strap.position.y = y;
      strap.scale.set(1.08, 1, 0.96);
      g.add(strap);
      const buckle = k.box(0.012, 0.020, 0.022, 'brass');
      buckle.position.set(r * 1.07, y, 0.0);
      g.add(buckle);
    }

    // Wrist bellows & bolted collar at origin
    const wristSeal = k.cyl(0.041, 0.044, 0.036, 8, 'leather');
    wristSeal.position.y = -0.012;
    wristSeal.scale.set(1.08, 1, 0.88);
    g.add(wristSeal);

    const wristCollar = k.cyl(0.046, 0.048, 0.020, 8, 'steel_dark');
    wristCollar.position.y = -0.026;
    wristCollar.scale.set(1.08, 1, 0.92);
    g.add(wristCollar);

    // --- 2. Forearm electromagnetic coil pack on +Z (back of forearm) ---
    const dynamoBase = k.box(0.064, 0.132, 0.026, 'steel_dark');
    dynamoBase.position.set(0, -0.115, 0.044);
    g.add(dynamoBase);

    for (const y of [-0.170, -0.060]) {
      const cap = k.box(0.062, 0.020, 0.036, magnetRed);
      cap.position.set(0, y, 0.058);
      g.add(cap);
    }

    const dynamoCore = k.cyl(0.020, 0.020, 0.098, 8, 'copper');
    dynamoCore.position.set(0, -0.115, 0.060);
    g.add(dynamoCore);

    const dynamoCoil = k.wrap(-0.158, -0.072, 0.0225, 5, 'copper');
    dynamoCoil.position.set(0, 0, 0.060);
    g.add(dynamoCoil);

    for (const s of [-1, 1]) {
      const post = k.cyl(0.0055, 0.0065, 0.016, 6, 'brass');
      post.position.set(s * 0.018, -0.058, 0.078);
      post.rotation.x = Math.PI / 2;
      g.add(post);

      // Thick copper power conduit from forearm dynamo around wrist into magnet leg coil
      const cable = k.tube([
        [s * 0.026, -0.060, 0.062],
        [s * 0.052, -0.050, 0.044],
        [s * 0.060, -0.024, 0.008],
        [s * 0.064, 0.006, -0.028],
        [s * 0.058, 0.030, -0.048],
      ], 0.0055, 6, 'copper');
      g.add(cable);

      const clamp = k.box(0.014, 0.016, 0.022, 'steel_dark');
      clamp.position.set(s * 0.055, -0.025, 0.008);
      g.add(clamp);
    }

    // --- 3. Right-hand closed armored fist (y: 0.00 to +0.130, +Z back, -X thumb) ---
    const palmCore = k.box(0.084, 0.094, 0.046, 'leather');
    palmCore.position.set(0, 0.048, 0.002);
    g.add(palmCore);

    const dorsalPlate = k.box(0.088, 0.080, 0.022, 'steel_dark');
    dorsalPlate.position.set(0, 0.048, 0.025);
    dorsalPlate.rotation.x = -0.05;
    g.add(dorsalPlate);

    const dorsalRidge = k.box(0.030, 0.064, 0.014, magnetRed);
    dorsalRidge.position.set(0, 0.048, 0.036);
    g.add(dorsalRidge);

    for (const y of [0.026, 0.070]) {
      const rivet = k.sphere(0.005, 0, 'brass');
      rivet.position.set(0, y, 0.043);
      g.add(rivet);
    }

    // Heavy knuckle bumper bar + 4 distinct stepped knuckles & curled armored fingers
    const knuckleBar = k.box(0.092, 0.030, 0.034, 'steel_dark');
    knuckleBar.position.set(0, 0.102, 0.016);
    g.add(knuckleBar);

    const fingers = [
      { x: -0.032, yTip: 0.116 },
      { x: -0.011, yTip: 0.120 },
      { x: 0.011, yTip: 0.117 },
      { x: 0.032, yTip: 0.110 },
    ];
    for (const f of fingers) {
      const knuck = k.box(0.019, 0.024, 0.026, 'steel');
      knuck.position.set(f.x, f.yTip, 0.014);
      g.add(knuck);

      const midSeg = k.box(0.018, 0.032, 0.024, 'steel_dark');
      midSeg.position.set(f.x, f.yTip - 0.010, -0.008);
      midSeg.rotation.x = 0.25;
      g.add(midSeg);

      const curlSeg = k.box(0.018, 0.034, 0.020, 'steel_dark');
      curlSeg.position.set(f.x, f.yTip - 0.038, -0.020);
      curlSeg.rotation.x = -0.15;
      g.add(curlSeg);
    }

    // Armored thumb on the -X side, tucked across the curled index/middle fingers
    const thumbBase = k.box(0.028, 0.044, 0.028, 'steel_dark');
    thumbBase.position.set(-0.044, 0.028, -0.004);
    thumbBase.rotation.set(0.15, 0, 0.22);
    g.add(thumbBase);

    const thumbMid = k.box(0.024, 0.040, 0.024, 'steel_dark');
    thumbMid.position.set(-0.050, 0.066, -0.012);
    thumbMid.rotation.set(0.28, 0, -0.18);
    g.add(thumbMid);

    const thumbTip = k.box(0.042, 0.022, 0.020, 'steel');
    thumbTip.position.set(-0.024, 0.086, -0.024);
    thumbTip.rotation.set(0, 0.12, -0.14);
    g.add(thumbTip);

    // --- 4. Red Horseshoe Magnet mounted across the palm (-Z) ---
    const magZ = -0.050;
    const magR = 0.056;
    const archY = 0.002;

    // Semicircular U-bend across the palm heel / wrist (9 overlapping faceted blocks)
    const archSegs = 9;
    for (let i = 0; i < archSegs; i++) {
      const a = Math.PI + (Math.PI * (i + 0.5)) / archSegs;
      const seg = k.box(0.026, 0.027, 0.028, magnetRed);
      seg.position.set(Math.cos(a) * magR, archY + Math.sin(a) * magR, magZ);
      seg.rotation.z = a;
      g.add(seg);
    }

    // Straight red legs, copper induction windings, bare steel pole shoes & brass spark prongs
    for (const s of [-1, 1]) {
      const legX = s * magR;

      const redLeg = k.box(0.026, 0.114, 0.028, magnetRed);
      redLeg.position.set(legX, 0.057, magZ);
      g.add(redLeg);

      // Copper coil wound directly around each magnet leg with dark steel retainer flanges
      const legCoil = k.wrap(0.024, 0.082, 0.0205, 4, 'copper');
      legCoil.position.set(legX, 0, magZ);
      g.add(legCoil);

      for (const fy of [0.022, 0.084]) {
        const flange = k.box(0.034, 0.008, 0.036, 'steel_dark');
        flange.position.set(legX, fy, magZ);
        g.add(flange);
      }

      // Seam ring separating red enamel body from unpainted brushed steel poles
      const seam = k.box(0.030, 0.007, 0.032, 'brass');
      seam.position.set(legX, 0.113, magZ);
      g.add(seam);

      // Iconic bare silver steel magnetic pole shoes jutting past the knuckles
      const pole = k.box(0.028, 0.044, 0.032, 'steel');
      pole.position.set(legX, 0.136, magZ + 0.002);
      g.add(pole);

      const poleFace = k.box(0.024, 0.010, 0.026, 'steel');
      poleFace.position.set(legX, 0.159, magZ + 0.002);
      g.add(poleFace);

      // Inward-pointing brass spark-gap electrode (sét)
      const prong = k.cone(0.0055, 0.018, 6, 'brass');
      prong.position.set(legX - s * 0.020, 0.146, magZ + 0.002);
      prong.rotation.z = s * (Math.PI / 2);
      g.add(prong);
    }

    // --- 5. Structural clamping harness joining the magnet solidly to the gauntlet ---
    const archCradle = k.box(0.056, 0.026, 0.034, 'steel_dark');
    archCradle.position.set(0, -0.050, -0.038);
    g.add(archCradle);

    const palmBar = k.box(0.110, 0.020, 0.016, 'steel_dark');
    palmBar.position.set(0, 0.054, -0.036);
    g.add(palmBar);

    // Upper yoke clamping both magnet legs tightly to the armored fist & back of hand
    const backStrap = k.box(0.106, 0.018, 0.014, 'steel_dark');
    backStrap.position.set(0, 0.096, 0.032);
    g.add(backStrap);

    for (const s of [-1, 1]) {
      const upperBracket = k.box(0.016, 0.020, 0.068, 'steel_dark');
      upperBracket.position.set(s * 0.054, 0.098, -0.012);
      g.add(upperBracket);

      const lowerBrace = k.box(0.018, 0.020, 0.044, 'steel_dark');
      lowerBrace.position.set(s * 0.048, -0.008, -0.032);
      g.add(lowerBrace);

      const bolt = k.sphere(0.0055, 0, 'brass');
      bolt.position.set(s * 0.063, 0.098, -0.012);
      g.add(bolt);
    }

    k.marker(g, 'base', [0, 0.03, 0]);
    k.marker(g, 'tip', [0, 0.162, -0.02]);
    return g;
  },
};