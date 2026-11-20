// Dao móc — karambit lưỡi móng vuốt cong sắc, chuôi có vòng xỏ ngón thép kèm gai đập.
export default {
  meta: {
    id: 'dao_moc',
    name: 'Dao móc',
    family: 'dao',
    level: 9,
    inspiration: 'Dao karambit lưỡi móc móng vuốt Đông Nam Á',
    look: 'lưỡi thép cong gắt như móng vuốt chim săn có rãnh máu và răng cưa lưng, cán bọc da đóng đinh đồng, chuôi gắn vòng xỏ ngón thép có gai nhọn và dây đỏ',
    power: { score: 5, note: 'ra đòn nhanh, chí mạng mạnh khi móc từ sau lưng' },
    effects: [
      'đòn thứ 4 trong chuỗi đánh gây thêm +25% sát thương',
      'đánh từ sau lưng mục tiêu gây thêm +50% sát thương',
    ],
    lengthM: 0.35,
  },
  build(k) {
    const g = k.group();

    // --- main claw blade: spine arches up and forward (+Z), razor concave edge on the inside (+Z) ---
    const blade = k.edge({
      spine: [
        [-0.016, 0.066],
        [-0.014, 0.112],
        [0.004, 0.158],
        [0.038, 0.196],
        [0.082, 0.212],
        [0.122, 0.200],
        [0.146, 0.172],
      ],
      width: [0.044, 0.048, 0.044, 0.036, 0.025, 0.014, 0.0],
      edge: 'front',
      thickness: 0.010,
      edgeThickness: 0.0014,
      bevel: 0.55,
      taper: 0.45,
      smooth: 6,
      slot: 'steel',
      fuller: { from: 0.06, to: 0.62, at: 0.22, width: 0.22, slot: 'steel_dark' },
    });
    g.add(blade);

    // --- spine serration teeth sunk into the upper back curve ---
    const teeth = [
      { y: 0.118, z: -0.014, rx: -1.35 },
      { y: 0.144, z: -0.005, rx: -1.10 },
      { y: 0.168, z: 0.011, rx: -0.82 },
    ];
    for (const t of teeth) {
      const tooth = k.cone(0.006, 0.014, 4, 'steel_dark');
      tooth.position.set(0, t.y, t.z);
      tooth.rotation.x = t.rx;
      g.add(tooth);
    }

    // --- bolster & index-finger guard bridging blade heel to grip ---
    const bolster = k.box(0.022, 0.024, 0.048, 'steel_dark');
    bolster.position.set(0, 0.064, 0.006);
    g.add(bolster);

    const bolsterTrim = k.box(0.023, 0.007, 0.042, 'brass');
    bolsterTrim.position.set(0, 0.052, 0.003);
    g.add(bolsterTrim);

    const fingerGuard = k.box(0.014, 0.012, 0.024, 'steel_dark');
    fingerGuard.position.set(0, 0.059, 0.030);
    fingerGuard.rotation.x = 0.42;
    g.add(fingerGuard);

    // --- ergonomic oval grip centered at origin ---
    const gripCore = k.cyl(0.016, 0.015, 0.116, 8, 'wood_dark');
    gripCore.scale.set(0.80, 1, 1.15);
    g.add(gripCore);

    const gripWrap = k.wrap(-0.045, 0.045, 0.0168, 5, 'leather');
    gripWrap.scale.set(0.84, 1, 1.14);
    g.add(gripWrap);

    // exposed full-tang steel spine along the back (-Z) of the grip
    const tangSpine = k.box(0.008, 0.112, 0.008, 'steel_dark');
    tangSpine.position.set(0, 0, -0.016);
    g.add(tangSpine);

    // brass rivets through the handle
    for (const y of [-0.030, 0.0, 0.030]) {
      const rivet = k.cyl(0.0036, 0.0036, 0.029, 6, 'brass');
      rivet.rotation.z = Math.PI / 2;
      rivet.position.set(0, y, 0.001);
      g.add(rivet);
    }

    // --- pommel ferrule connecting grip to finger ring ---
    const pommel = k.lathe([
      [0.0, -0.070],
      [0.015, -0.068],
      [0.018, -0.058],
      [0.017, -0.048],
      [0.0, -0.048],
    ], 8, 'steel_dark');
    pommel.scale.set(0.85, 1, 1.12);
    g.add(pommel);

    const pommelBand = k.cyl(0.0185, 0.0185, 0.006, 8, 'brass');
    pommelBand.scale.set(0.86, 1, 1.13);
    pommelBand.position.y = -0.053;
    g.add(pommelBand);

    // --- retention finger ring (vòng xỏ ngón) in the Z-Y plane ---
    const ringCy = -0.092;
    const ringCz = -0.005;
    const ringR = 0.027;
    const ringPts = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ringPts.push([0, ringCy + Math.cos(a) * ringR, ringCz + Math.sin(a) * ringR]);
    }
    g.add(k.tube(ringPts, 0.0065, 6, 'steel_dark'));

    // brass accent collars on the ring sides
    for (const s of [-1, 1]) {
      const collar = k.cyl(0.0082, 0.0082, 0.008, 6, 'brass');
      collar.position.set(0, ringCy, ringCz + s * ringR);
      g.add(collar);
    }

    // bottom striker spike on the ring
    const spike = k.cone(0.007, 0.020, 4, 'steel');
    spike.position.set(0, ringCy - ringR - 0.008, ringCz - 0.004);
    spike.rotation.x = Math.PI - 0.15;
    g.add(spike);

    // --- small red cloth knot & short cord tassel on the back of the ring ---
    const knot = k.sphere(0.009, 0, 'cloth_red');
    knot.position.set(0, ringCy - 0.008, ringCz - ringR - 0.002);
    g.add(knot);

    const cord = k.tube([
      [0, ringCy - 0.010, ringCz - ringR - 0.004],
      [0.004, ringCy - 0.026, ringCz - ringR - 0.016],
      [-0.003, ringCy - 0.044, ringCz - ringR - 0.022],
    ], 0.0035, 5, 'cloth_red');
    g.add(cord);

    k.marker(g, 'base', [0, 0.072, 0.025]);
    k.marker(g, 'tip', [0, 0.172, 0.146]);
    return g;
  },
};