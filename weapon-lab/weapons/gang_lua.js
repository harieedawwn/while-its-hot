// Găng lửa — găng giáp lò rèn cấp 15, thép đen góc cạnh với 4 ống thông lửa đỏ ngay trên đốt ngón.
// Right-hand closed fist: wrist at origin, forearm cuff toward -Y (-0.23 m), knuckles toward +Y (+0.135 m),
// back of hand toward +Z, thumb on -X curling across -Z.
export default {
  meta: {
    id: 'gang_lua',
    name: 'Găng lửa',
    family: 'tay',
    level: 15,
    inspiration: 'Găng giáp lò rèn phun hỏa lực — bốn đốt ngón đóng vai ống xả cầu lửa',
    look: 'găng giáp thép đen góc cạnh có hộp lò rèn và vây tản nhiệt trên cẳng tay, hai ống đồng dẫn nhiệt lên bốn lỗ thông lửa đỏ rực trên đốt ngón',
    power: { score: 7, note: 'cận chiến chắc tay, bắn cầu lửa tầm trung và tự hồi phục' },
    effects: [
      'đòn nặng bắn cầu lửa bay xa 14 m, gây 16 sát thương và nổ bán kính 2 m (hồi chiêu 2 giây)',
      'hơi ấm từ lõi lò rèn giúp hồi máu dần trong giao tranh',
    ],
    lengthM: 0.37,
  },
  build(k) {
    const g = k.group();
    const blackPlate = k.paint('#19181d', true); // blackened forged armor steel
    const ember = k.paint('#f03216', true);      // red-hot fire vents & furnace core

    // --- forearm cuff (-0.230 to -0.008): beveled blackened vambrace over leather sleeve ---
    const vambrace = k.lathe([
      [0.0, -0.230], [0.056, -0.230], [0.072, -0.220], [0.069, -0.185],
      [0.062, -0.125], [0.056, -0.055], [0.052, -0.008], [0.0, -0.008],
    ], 8, blackPlate);
    vambrace.scale.set(1.06, 1, 0.90);
    g.add(vambrace);

    const innerCuff = k.cyl(0.054, 0.054, 0.010, 8, 'leather');
    innerCuff.scale.set(1.04, 1, 0.88);
    innerCuff.position.y = -0.228;
    g.add(innerCuff);

    const cuffLip = k.cyl(0.072, 0.074, 0.014, 8, 'steel_dark');
    cuffLip.scale.set(1.07, 1, 0.91);
    cuffLip.position.y = -0.214;
    g.add(cuffLip);

    // Cuff rivets around the flared rim
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const rivet = k.cyl(0.0045, 0.0045, 0.008, 6, 'copper');
      rivet.position.set(Math.cos(a) * 0.076, -0.214, Math.sin(a) * 0.066);
      rivet.rotation.set(Math.sin(a) * 1.57, 0, -Math.cos(a) * 1.57);
      g.add(rivet);
    }

    // --- dorsal forearm furnace housing (+Z): recessed glowing forge grate with iron louvers ---
    const furnace = k.group();
    furnace.position.set(0, -0.120, 0.057);
    furnace.rotation.x = -0.09;
    g.add(furnace);

    const furnaceBase = k.box(0.064, 0.138, 0.026, blackPlate);
    furnace.add(furnaceBase);
    for (const s of [-1, 1]) {
      const rail = k.box(0.015, 0.136, 0.036, blackPlate);
      rail.position.set(s * 0.024, 0, 0.004);
      furnace.add(rail);
    }
    const furnaceCore = k.box(0.032, 0.098, 0.010, ember);
    furnaceCore.position.set(0, 0, 0.014);
    furnace.add(furnaceCore);

    for (const ly of [-0.036, -0.012, 0.012, 0.036]) {
      const louver = k.box(0.042, 0.008, 0.012, 'steel_dark');
      louver.position.set(0, ly, 0.019);
      louver.rotation.x = -0.35;
      furnace.add(louver);
    }

    // --- side heat-sink cooling fins on vambrace (±X) ---
    const finSpecs = [[-0.174, 0.070], [-0.126, 0.065], [-0.078, 0.060]];
    for (const [fy, rx] of finSpecs) {
      for (const s of [-1, 1]) {
        const fin = k.box(0.022, 0.016, 0.040, 'steel_dark');
        fin.position.set(s * (rx - 0.003), fy, 0.002);
        fin.rotation.z = s * 0.28;
        g.add(fin);
      }
    }

    // --- underside forearm leather straps & copper buckles (-Z) ---
    for (const [sy, sw, sz] of [[-0.165, 0.074, -0.056], [-0.095, 0.066, -0.050]]) {
      const strap = k.box(sw, 0.020, 0.016, 'leather');
      strap.position.set(0, sy, sz);
      g.add(strap);
      const buckle = k.box(0.022, 0.024, 0.010, 'copper');
      buckle.position.set(0.006, sy, sz - 0.008);
      g.add(buckle);
    }

    // --- articulated wrist joint (0.00) ---
    const wristCore = k.cyl(0.048, 0.052, 0.044, 8, 'steel_dark');
    wristCore.scale.set(1.10, 1, 0.88);
    wristCore.position.y = 0.0;
    g.add(wristCore);

    for (const [wy, wz, rot] of [[-0.014, 0.045, -0.18], [0.010, 0.044, 0.14]]) {
      const lame = k.box(0.078, 0.024, 0.016, blackPlate);
      lame.position.set(0, wy, wz);
      lame.rotation.x = rot;
      g.add(lame);
    }
    for (const s of [-1, 1]) {
      const wPin = k.cyl(0.0085, 0.0085, 0.014, 6, 'copper');
      wPin.position.set(s * 0.054, 0.0, 0.0);
      wPin.rotation.z = Math.PI / 2;
      g.add(wPin);
    }

    // --- twin copper heat-conduit tubes feeding from forearm furnace to knuckle manifold ---
    for (const s of [-1, 1]) {
      const pipe = k.tube([
        [s * 0.019, -0.056, 0.056],
        [s * 0.023, -0.028, 0.065],
        [s * 0.027, 0.010, 0.063],
        [s * 0.030, 0.054, 0.054],
        [s * 0.028, 0.100, 0.036],
      ], 0.0058, 6, 'copper');
      g.add(pipe);
    }

    // --- fist core & armored dorsal hand plate (0.010 to 0.115) ---
    const palmCore = k.box(0.092, 0.096, 0.070, 'leather');
    palmCore.position.set(0, 0.058, -0.002);
    g.add(palmCore);

    const dorsalPlate = k.box(0.102, 0.096, 0.032, blackPlate);
    dorsalPlate.position.set(0, 0.062, 0.032);
    g.add(dorsalPlate);

    const dorsalRidge = k.box(0.048, 0.088, 0.022, blackPlate);
    dorsalRidge.position.set(0, 0.064, 0.047);
    dorsalRidge.rotation.x = 0.08;
    g.add(dorsalRidge);

    // Side hand armor guards (pinky +X, index -X)
    const pinkyGuard = k.box(0.018, 0.088, 0.058, blackPlate);
    pinkyGuard.position.set(0.050, 0.058, 0.006);
    g.add(pinkyGuard);

    const indexGuard = k.box(0.018, 0.072, 0.048, blackPlate);
    indexGuard.position.set(-0.050, 0.068, 0.012);
    g.add(indexGuard);

    // Dorsal pressure-valve cap on the center of the back of the hand
    const valve = k.lathe([
      [0.0, -0.006], [0.018, -0.006], [0.018, 0.002], [0.013, 0.006], [0.0, 0.006],
    ], 6, 'steel_dark');
    valve.rotation.x = Math.PI / 2;
    valve.position.set(0, 0.056, 0.056);
    g.add(valve);

    const valveRing = k.cyl(0.0105, 0.0105, 0.005, 6, 'copper');
    valveRing.rotation.x = Math.PI / 2;
    valveRing.position.set(0, 0.056, 0.062);
    g.add(valveRing);

    const valveCore = k.cyl(0.0062, 0.0062, 0.005, 6, ember);
    valveCore.rotation.x = Math.PI / 2;
    valveCore.position.set(0, 0.056, 0.064);
    g.add(valveCore);

    // --- knuckle exhaust manifold & 4 curled fingers with red fire vents ---
    const manifold = k.box(0.096, 0.026, 0.032, 'steel_dark');
    manifold.position.set(0, 0.104, 0.026);
    g.add(manifold);

    const fingerX = [-0.034, -0.011, 0.012, 0.035];
    const fingerY = [0.002, 0.006, 0.003, -0.004];

    for (let i = 0; i < 4; i++) {
      const fx = fingerX[i];
      const yo = fingerY[i];

      // Curled finger plates (top-front, middle face on -Z, tucked fingertip)
      const fTop = k.box(0.021, 0.030, 0.044, blackPlate);
      fTop.position.set(fx, 0.106 + yo, 0.004);
      fTop.rotation.x = 0.22;
      g.add(fTop);

      const fMid = k.box(0.020, 0.042, 0.026, blackPlate);
      fMid.position.set(fx, 0.080 + yo, -0.028);
      fMid.rotation.x = -0.10;
      g.add(fMid);

      const fTip = k.box(0.019, 0.026, 0.024, 'leather');
      fTip.position.set(fx, 0.052 + yo * 0.5, -0.029);
      fTip.rotation.x = 0.32;
      g.add(fTip);

      // Knuckle fire-vent nozzle angled slightly toward +Z for bold readability
      const vent = k.group();
      vent.position.set(fx, 0.114 + yo, 0.027);
      vent.rotation.x = 0.38;
      g.add(vent);

      const barrel = k.cyl(0.0108, 0.0126, 0.026, 6, blackPlate);
      barrel.position.y = 0.002;
      vent.add(barrel);

      const collar = k.cyl(0.0116, 0.0116, 0.005, 6, 'copper');
      collar.position.y = 0.011;
      vent.add(collar);

      const glow = k.cyl(0.0080, 0.0072, 0.010, 6, ember);
      glow.position.y = 0.0125;
      vent.add(glow);

      // Recessed red vent slit on the dorsal knuckle bevel
      const slit = k.box(0.013, 0.007, 0.008, ember);
      slit.position.set(fx, 0.098 + yo, 0.043);
      g.add(slit);
    }

    // Armor ribs framing the dorsal knuckle vent slits
    for (const rx of [-0.046, -0.0225, 0.0005, 0.0235, 0.047]) {
      const rib = k.box(0.006, 0.024, 0.014, blackPlate);
      rib.position.set(rx, 0.099, 0.043);
      g.add(rib);
    }

    // --- armored thumb on -X side, curling across -Z over the fist ---
    const thumbBase = k.box(0.028, 0.046, 0.036, blackPlate);
    thumbBase.position.set(-0.047, 0.032, -0.009);
    thumbBase.rotation.set(0.15, 0.20, 0.24);
    g.add(thumbBase);

    const thumbProx = k.box(0.028, 0.044, 0.028, blackPlate);
    thumbProx.position.set(-0.055, 0.062, -0.027);
    thumbProx.rotation.set(-0.24, 0.34, -0.16);
    g.add(thumbProx);

    const thumbJoint = k.cyl(0.011, 0.012, 0.016, 6, 'steel_dark');
    thumbJoint.position.set(-0.053, 0.077, -0.039);
    thumbJoint.rotation.set(0.4, 0.2, 0.7);
    g.add(thumbJoint);

    const thumbPin = k.cyl(0.0055, 0.0055, 0.008, 6, 'copper');
    thumbPin.position.set(-0.059, 0.078, -0.042);
    thumbPin.rotation.set(0.4, 0.2, 0.7);
    g.add(thumbPin);

    const thumbDist = k.box(0.048, 0.024, 0.024, blackPlate);
    thumbDist.position.set(-0.025, 0.078, -0.043);
    thumbDist.rotation.set(0.10, -0.14, 0.08);
    g.add(thumbDist);

    k.marker(g, 'base', [0, 0.01, 0.0]);
    k.marker(g, 'tip', [0, 0.135, 0.032]);
    return g;
  },
};