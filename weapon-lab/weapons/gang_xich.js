// Găng xích — găng tay chiến đấu bọc sắt, quấn xích cổ tay và móc treo rèn sắc.
export default {
  meta: {
    id: 'gang_xich',
    name: 'Găng xích',
    family: 'tay',
    level: 9,
    inspiration: 'Găng chiến đấu bến cảng và đồ tể — nắm đấm bọc sắt quấn xích nặng kèm móc treo thép',
    look: 'găng da bọc nẹp thép tối, dải xích sắt dày quấn xoắn quanh cổ tay trên nền vải đỏ sẫm, thanh đấm khớp ngón có đinh thép và móc treo rèn sắc rủ bên má ngoài',
    power: { score: 5, note: 'áp sát bền bỉ, vừa đấm vừa hồi máu và hất văng kết chuỗi' },
    effects: [
      'mỗi đòn trúng hồi 1 máu',
      'đòn thứ 4 trong chuỗi đánh hất văng mạnh kẻ địch về sau',
    ],
    lengthM: 0.38,
  },
  build(k) {
    const g = k.group();
    const crimsonCloth = k.paint('#6b1e1b', false);

    // Helper: chunky 4-sided forged oval chain link (long axis X, width Y, normal Z)
    const makeLink = (hl, hw, r, slot) => {
      const c = hl * 0.58;
      return k.tube([
        [ hl,  0.0, 0],
        [  c,   hw, 0],
        [ -c,   hw, 0],
        [-hl,  0.0, 0],
        [ -c,  -hw, 0],
        [  c,  -hw, 0],
        [ hl,  0.0, 0],
      ], r, 4, slot);
    };

    // --- 1. Forearm leather bracer, crimson cloth cuff & iron splints (y: -0.230 to +0.015) ---
    const bracer = k.lathe([
      [0.0,   -0.224],
      [0.055, -0.224],
      [0.058, -0.208],
      [0.051, -0.185],
      [0.048, -0.095],
      [0.044,  0.014],
      [0.0,    0.014],
    ], 8, 'leather');
    bracer.scale.set(1.12, 1.0, 0.90);
    g.add(bracer);

    // Crimson cloth cuff lining & wrist under-wrap
    const cuffCloth = k.cyl(0.053, 0.055, 0.020, 8, crimsonCloth);
    cuffCloth.position.y = -0.222;
    cuffCloth.scale.set(1.09, 1.0, 0.87);
    g.add(cuffCloth);

    const wristCloth = k.cyl(0.0465, 0.0495, 0.078, 8, crimsonCloth);
    wristCloth.position.y = -0.032;
    wristCloth.scale.set(1.13, 1.0, 0.91);
    g.add(wristCloth);

    // Flared iron cuff rim band
    const cuffBand = k.cyl(0.056, 0.060, 0.020, 8, 'iron_rough');
    cuffBand.position.y = -0.210;
    cuffBand.scale.set(1.13, 1.0, 0.91);
    g.add(cuffBand);

    // Dorsal and side forearm armor splints
    const backSplint = k.box(0.064, 0.132, 0.014, 'steel_dark');
    backSplint.position.set(0, -0.142, 0.044);
    backSplint.rotation.x = 0.045;
    g.add(backSplint);

    const backRidge = k.box(0.016, 0.120, 0.010, 'steel');
    backRidge.position.set(0, -0.142, 0.050);
    backRidge.rotation.x = 0.045;
    g.add(backRidge);

    for (const side of [-1, 1]) {
      const sideSplint = k.box(0.014, 0.118, 0.044, 'steel_dark');
      sideSplint.position.set(side * 0.053, -0.144, 0.002);
      sideSplint.rotation.z = side * 0.05;
      g.add(sideSplint);

      const rivet = k.box(0.007, 0.007, 0.007, 'brass');
      rivet.position.set(side * 0.059, -0.184, 0.002);
      g.add(rivet);
    }

    // Underside cinch strap & brass buckle
    const strap = k.cyl(0.052, 0.053, 0.020, 8, 'leather');
    strap.position.y = -0.156;
    strap.scale.set(1.15, 1.0, 0.93);
    g.add(strap);

    const buckle = k.box(0.026, 0.024, 0.010, 'brass');
    buckle.position.set(0, -0.156, -0.049);
    g.add(buckle);

    // --- 2. Spiral heavy iron chain wrapped around the wrist (y: -0.092 to +0.004) ---
    const a0 = 0.25;
    const linksCount = 9;
    for (let i = 0; i < linksCount; i++) {
      const t = i / (linksCount - 1);
      const y = -0.092 + t * 0.096;
      const a = a0 + i * (Math.PI / 3);
      const rx = 0.060 - 0.005 * t;
      const rz = 0.050 - 0.004 * t;

      const x = Math.cos(a) * rx;
      const z = Math.sin(a) * rz;
      const dx = -Math.sin(a) * rx;
      const dz = Math.cos(a) * rz;
      const yaw = Math.atan2(-dz, dx);

      const lg = k.group();
      lg.position.set(x, y, z);
      lg.rotation.y = yaw;

      const tilt = k.group();
      tilt.rotation.z = 0.20;
      lg.add(tilt);

      const link = makeLink(0.032, 0.014, 0.0055, i % 2 === 0 ? 'iron_rough' : 'steel_dark');
      link.rotation.x = i % 2 === 0 ? 0.14 : (Math.PI / 2 + 0.14);
      tilt.add(link);
      g.add(lg);
    }

    // Lower anchor clamp (pins spiral start at i=0 into forearm splint)
    const startClamp = k.box(0.020, 0.026, 0.022, 'iron_rough');
    startClamp.position.set(0.057, -0.094, 0.012);
    g.add(startClamp);
    const startPin = k.box(0.008, 0.008, 0.008, 'brass');
    startPin.position.set(0.066, -0.094, 0.012);
    g.add(startPin);

    // Upper wrist lock clasp (locks spiral end at i=8 on -X/+Z side)
    const clasp = k.box(0.024, 0.030, 0.024, 'iron_rough');
    clasp.position.set(-0.044, 0.004, 0.034);
    clasp.rotation.y = -0.6;
    g.add(clasp);
    const claspPlate = k.box(0.012, 0.016, 0.008, 'brass');
    claspPlate.position.set(-0.052, 0.004, 0.042);
    claspPlate.rotation.y = -0.6;
    g.add(claspPlate);

    // --- 3. Closed right fist, fingers, thumb & spiked knuckle bar (y: 0.00 to +0.142) ---
    const palm = k.box(0.094, 0.096, 0.050, 'leather');
    palm.position.set(0, 0.048, -0.002);
    g.add(palm);

    // Dorsal hand armor plate (+Z)
    const dorsalPlate = k.box(0.096, 0.088, 0.018, 'steel_dark');
    dorsalPlate.position.set(0, 0.054, 0.023);
    dorsalPlate.rotation.x = -0.05;
    g.add(dorsalPlate);

    const dorsalCrest = k.box(0.052, 0.076, 0.012, 'steel');
    dorsalCrest.position.set(0, 0.056, 0.031);
    dorsalCrest.rotation.x = -0.05;
    g.add(dorsalCrest);

    // Heavy iron lashing strap tying dorsal plate up to the knuckle bar
    const lashStrap = k.box(0.022, 0.104, 0.010, 'iron_rough');
    lashStrap.position.set(0, 0.062, 0.035);
    lashStrap.rotation.x = -0.08;
    g.add(lashStrap);

    for (const y of [0.022, 0.088]) {
      const r = k.box(0.008, 0.008, 0.008, 'brass');
      r.position.set(0, y, 0.040);
      g.add(r);
    }

    // 4 anatomically staggered curled fingers (index at -X to pinky at +X)
    const fingerXs = [-0.035, -0.012, 0.012, 0.035];
    const fingerYs = [0.112, 0.117, 0.112, 0.105];
    for (let i = 0; i < 4; i++) {
      const fx = fingerXs[i];
      const fy = fingerYs[i];

      const upperF = k.box(0.021, 0.034, 0.030, 'steel');
      upperF.position.set(fx, fy - 0.008, 0.006);
      upperF.rotation.x = 0.36;
      g.add(upperF);

      const lowerF = k.box(0.020, 0.046, 0.026, 'steel_dark');
      lowerF.position.set(fx, fy - 0.038, -0.022);
      lowerF.rotation.x = -0.20;
      g.add(lowerF);
    }

    // Forged knuckle-duster striking bar (+Y end) + 4 steel striking lugs
    const knuckleBar = k.box(0.102, 0.020, 0.034, 'iron_rough');
    knuckleBar.position.set(0, 0.118, 0.008);
    knuckleBar.rotation.z = -0.055;
    g.add(knuckleBar);

    for (let i = 0; i < 4; i++) {
      const fx = fingerXs[i];
      const fy = fingerYs[i];
      const lug = k.cone(0.0105, 0.020, 4, 'steel');
      lug.position.set(fx, fy + 0.021, 0.010);
      lug.rotation.y = Math.PI / 4;
      g.add(lug);
    }

    // Side flanges riveting knuckle bar into the hand sides
    for (const side of [-1, 1]) {
      const flange = k.box(0.012, 0.054, 0.028, 'iron_rough');
      flange.position.set(side * 0.050, 0.094, 0.008);
      g.add(flange);
      const pin = k.box(0.007, 0.007, 0.007, 'brass');
      pin.position.set(side * 0.056, 0.082, 0.008);
      g.add(pin);
    }

    // Armored thumb on the -X side curled across the palm (-Z)
    const thumbBase = k.box(0.028, 0.044, 0.032, 'leather');
    thumbBase.position.set(-0.048, 0.032, -0.014);
    thumbBase.rotation.z = 0.28;
    g.add(thumbBase);

    const thumbMid = k.box(0.026, 0.044, 0.026, 'steel_dark');
    thumbMid.position.set(-0.052, 0.060, -0.028);
    thumbMid.rotation.set(-0.32, 0.15, -0.34);
    g.add(thumbMid);

    const thumbTip = k.box(0.044, 0.024, 0.025, 'steel');
    thumbTip.position.set(-0.028, 0.080, -0.038);
    thumbTip.rotation.set(-0.10, 0.22, -0.14);
    g.add(thumbTip);

    const thumbRivet = k.box(0.007, 0.007, 0.007, 'brass');
    thumbRivet.position.set(-0.056, 0.072, -0.036);
    g.add(thumbRivet);

    // --- 4. Outer wrist shackle, hanging chain & forged meat/cargo hook ("móc treo") ---
    // Heavy U-shackle bolted onto the outer wrist chain (i=6 at x≈0.054, y=-0.020, z≈0.012)
    const shackle = k.box(0.026, 0.024, 0.024, 'iron_rough');
    shackle.position.set(0.060, -0.022, 0.013);
    g.add(shackle);

    const shackleBolt = k.cyl(0.0055, 0.0055, 0.032, 6, 'brass');
    shackleBolt.position.set(0.068, -0.026, 0.013);
    shackleBolt.rotation.x = Math.PI / 2;
    g.add(shackleBolt);

    // Hanging Link 1 (loops around brass shackle bolt)
    const hang1 = makeLink(0.024, 0.012, 0.0048, 'iron_rough');
    hang1.position.set(0.071, -0.046, 0.014);
    hang1.rotation.z = Math.PI / 2 + 0.12;
    g.add(hang1);

    // Hanging Link 2 (interlocked perpendicular to Link 1)
    const hang2 = makeLink(0.024, 0.012, 0.0048, 'steel_dark');
    hang2.position.set(0.077, -0.082, 0.015);
    hang2.rotation.set(0, Math.PI / 2, Math.PI / 2 + 0.08);
    g.add(hang2);

    // Hook Top Eye Ring (interlocked with Link 2, welded into hook collar)
    const hookEye = makeLink(0.017, 0.012, 0.0048, 'iron_rough');
    hookEye.position.set(0.080, -0.112, 0.015);
    hookEye.rotation.z = Math.PI / 2 + 0.05;
    g.add(hookEye);

    // Forged J-Hook assembly (local +Z mapped to world +X, angled slightly toward +Z)
    const hookGroup = k.group();
    hookGroup.position.set(0.081, -0.130, 0.015);
    hookGroup.rotation.y = Math.PI / 2 - 0.18;
    g.add(hookGroup);

    const hookCollar = k.cyl(0.011, 0.013, 0.022, 6, 'iron_rough');
    hookCollar.position.y = 0.002;
    hookGroup.add(hookCollar);

    const swivelRing = k.cyl(0.0135, 0.0135, 0.006, 6, 'brass');
    swivelRing.position.y = 0.003;
    hookGroup.add(swivelRing);

    const hookBlade = k.edge({
      spine: [
        [ 0.000,  0.000],
        [-0.003, -0.028],
        [ 0.006, -0.062],
        [ 0.032, -0.086],
        [ 0.062, -0.076],
        [ 0.075, -0.044],
        [ 0.060, -0.014],
      ],
      width: [0.015, 0.018, 0.024, 0.026, 0.022, 0.015, 0.0],
      edge: 'both',
      thickness: 0.014,
      edgeThickness: 0.002,
      bevel: 0.45,
      taper: 0.35,
      smooth: 4,
      slot: 'steel',
    });
    hookGroup.add(hookBlade);

    // Forged inner barb below the hook point
    const hookBarb = k.cone(0.0065, 0.018, 4, 'steel');
    hookBarb.position.set(0, -0.030, 0.055);
    hookBarb.rotation.x = -2.35;
    hookGroup.add(hookBarb);

    k.marker(g, 'base', [0, 0.04, 0.01]);
    k.marker(g, 'tip', [0, 0.142, 0.01]);
    return g;
  },
};