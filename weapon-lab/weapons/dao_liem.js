// Dao Liềm — liềm cong lớn thích khách cấp 24.
// Tỉ lệ: lưỡi liềm hắc diện thạch cong móc lớn (~52% chiều cao, vươn mạnh về +Z),
// cổ đồng rỉ gắn bầu độc nuôi rãnh máu (~17%), cán gỗ ngắn quấn vải tối (~21%),
// chuôi tròn móc dây lao tới (~10%).
export default {
  meta: {
    id: 'dao_liem',
    name: 'Dao Liềm',
    family: 'dao',
    level: 24,
    inspiration: 'Liềm móc thích khách bằng hắc diện thạch nẹp đồng rỉ gắn bầu độc và vòng dây móc',
    look: 'lưỡi liềm hắc diện thạch cong lớn có rãnh độc xanh và sống đồng rỉ răng cưa, cổ đao ngậm ống độc, cán ngắn quấn vải tối thả dải lụa và vòng móc ở chuôi',
    power: { score: 7, note: 'móc lao áp sát chớp nhoáng, rỉa độc rồi ẩn thân' },
    effects: [
      'đòn nặng móc: lao tới mục tiêu trong 7 m (hồi chiêu 3 s)',
      'đòn đánh thấm độc rút máu mục tiêu theo thời gian',
      'tàng hình ngắn giúp tiếp cận bất ngờ hoặc thoát giao tranh',
    ],
    lengthM: 0.52,
  },
  build(k) {
    const g = k.group();
    const obsidian = k.paint('#1d1924', true);  // lưỡi hắc diện thạch ánh tím đen
    const patina = k.paint('#4b7a6b', true);    // đồng xanh rỉ cổ cho nẹp sống & cổ đao
    const venom = k.paint('#4cd950', false);    // dịch độc xanh lục nổi bật

    // --- lưỡi liềm cong lớn: sống ngoài cong ra trước, mép sắc lõm bên trong (+Z / -Y) ---
    const blade = k.edge({
      spine: [
        [-0.015, 0.118],
        [-0.022, 0.190],
        [ 0.004, 0.268],
        [ 0.072, 0.335],
        [ 0.162, 0.368],
        [ 0.248, 0.354],
        [ 0.302, 0.306],
        [ 0.316, 0.246],
      ],
      width: [0.042, 0.055, 0.070, 0.080, 0.076, 0.060, 0.035, 0.0],
      edge: 'front',
      thickness: 0.015,
      edgeThickness: 0.0016,
      bevel: 0.55,
      taper: 0.45,
      smooth: 5,
      slot: obsidian,
      fuller: { from: 0.08, to: 0.72, at: 0.26, width: 0.18, slot: venom },
    });
    g.add(blade);

    // --- nẹp sống đồng rỉ ôm lưng lưỡi + ngạnh răng cưa + đinh tán đồng thau ---
    const spineBrace = k.tube([
      [0, 0.118, -0.015],
      [0, 0.190, -0.022],
      [0, 0.268,  0.004],
      [0, 0.335,  0.072],
      [0, 0.368,  0.162],
    ], 0.0105, 6, patina);
    g.add(spineBrace);

    const backBarb = k.blade([
      [0.055, 0.318],
      [0.095, 0.376],
      [0.105, 0.356],
      [0.148, 0.388],
      [0.168, 0.362],
      [0.120, 0.340],
    ], 0.009, patina, 0.0025);
    g.add(backBarb);

    for (const [y, z] of [[0.188, -0.018], [0.264, 0.006], [0.330, 0.071]]) {
      const rivet = k.cyl(0.0045, 0.0045, 0.025, 6, 'brass');
      rivet.position.set(0, y, z);
      rivet.rotation.z = Math.PI / 2;
      g.add(rivet);
    }

    // --- cổ đao đồng rỉ nhiều tầng & má kẹp gốc lưỡi ---
    const collar = k.lathe([
      [0.0,   0.050],
      [0.021, 0.050],
      [0.027, 0.066],
      [0.023, 0.084],
      [0.029, 0.112],
      [0.028, 0.130],
      [0.020, 0.144],
      [0.0,   0.144],
    ], 8, patina);
    g.add(collar);

    const cheekClamp = k.box(0.024, 0.052, 0.060, patina);
    cheekClamp.position.set(0, 0.132, 0.008);
    g.add(cheekClamp);

    for (const y of [0.062, 0.106]) {
      const ring = k.cyl(0.030, 0.030, 0.008, 8, 'brass');
      ring.position.y = y;
      g.add(ring);
    }

    // --- bầu độc gắn trước cổ đao + ống dẫn dịch độc vào rãnh lưỡi ---
    const vialCore = k.cyl(0.0095, 0.0105, 0.044, 6, venom);
    vialCore.position.set(0, 0.114, 0.028);
    vialCore.rotation.x = 0.10;
    g.add(vialCore);

    const capBot = k.cyl(0.012, 0.011, 0.010, 6, 'brass');
    capBot.position.set(0, 0.090, 0.026);
    capBot.rotation.x = 0.10;
    g.add(capBot);

    const capTop = k.cyl(0.011, 0.012, 0.010, 6, 'brass');
    capTop.position.set(0, 0.138, 0.030);
    capTop.rotation.x = 0.10;
    g.add(capTop);

    for (const x of [-0.0105, 0.0105]) {
      const guardBar = k.box(0.004, 0.048, 0.005, patina);
      guardBar.position.set(x, 0.114, 0.032);
      guardBar.rotation.x = 0.10;
      g.add(guardBar);
    }

    const feedPipe = k.tube([
      [0, 0.138, 0.030],
      [0, 0.158, 0.024],
      [0, 0.170, 0.004],
    ], 0.0035, 6, 'brass');
    g.add(feedPipe);

    // --- cán ngắn quấn vải tối màu + nút thắt và dải vải thả ---
    const gripCore = k.cyl(0.0175, 0.019, 0.134, 8, 'wood_dark');
    gripCore.position.y = -0.002;
    g.add(gripCore);

    g.add(k.wrap(-0.055, 0.053, 0.0205, 5, 'cloth_dark'));

    const clothKnot = k.cyl(0.0225, 0.022, 0.013, 8, 'cloth_dark');
    clothKnot.position.y = -0.048;
    g.add(clothKnot);

    const clothTail = k.blade([
      [-0.012, -0.044],
      [-0.022, -0.056],
      [-0.044, -0.092],
      [-0.068, -0.124],
      [-0.050, -0.128],
      [-0.032, -0.094],
      [-0.014, -0.060],
    ], 0.004, 'cloth_dark', 0.001);
    clothTail.rotation.y = 0.20;
    g.add(clothTail);

    // --- chuôi đồng rỉ & vòng móc dây cho đòn lao tới ---
    const pommel = k.lathe([
      [0.0,   -0.094],
      [0.011, -0.092],
      [0.019, -0.082],
      [0.024, -0.068],
      [0.021, -0.054],
      [0.0,   -0.054],
    ], 8, patina);
    g.add(pommel);

    const pommelBand = k.cyl(0.025, 0.025, 0.007, 8, 'brass');
    pommelBand.position.y = -0.062;
    g.add(pommelBand);

    const ringPts = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ringPts.push([0, -0.108 + Math.cos(a) * 0.020, Math.sin(a) * 0.020]);
    }
    g.add(k.tube(ringPts, 0.0055, 6, 'brass'));

    k.marker(g, 'base', [0, 0.130, 0.030]);
    k.marker(g, 'tip', [0, 0.246, 0.316]);
    return g;
  },
};