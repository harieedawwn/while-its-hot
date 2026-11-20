// Dao độc — dao găm sát thủ cấp 18 có bầu chứa nọc liền rãnh độc và chuôi xương khắc đốt.
export default {
  meta: {
    id: 'dao_doc',
    name: 'Dao độc',
    family: 'dao',
    level: 18,
    inspiration: 'Dao găm sát thủ có bầu dẫn nọc rắn vào rãnh lưỡi, kết hợp chuôi xương khớp',
    look: 'lưỡi cong nhẹ màu lục sẫm có rãnh chứa độc xanh sáng và gai sống lưỡi, gốc lưỡi gắn bầu nọc bọc đồng thau, chuôi xương đốt quấn da tối với đốc nanh xương',
    power: { score: 7, note: 'rút nhanh, dồn độc liên tục, mạnh khi đánh lưng và ném tầm trung' },
    effects: [
      'trúng đòn gây độc 2 sát thương mỗi giây trong 4 giây, cộng dồn tối đa 3 tầng',
      'ném dao trúng mục tiêu vẫn kích hoạt và cộng dồn độc như chém gần',
      'đánh từ sau lưng tăng mạnh sát thương chí mạng và kéo dài thời gian độc',
    ],
    lengthM: 0.42,
  },
  build(k) {
    const g = k.group();
    const bladeGreen = k.paint('#1c4230', true);  // lưỡi thép ám lục sẫm
    const venomBright = k.paint('#66dc34', false); // nọc độc xanh sáng trong rãnh & bầu

    // --- lưỡi dao: cong nhẹ kiểu nanh rắn, sắc mặt trước (+Z), rãnh độc nổi bật ---
    const blade = k.edge({
      spine: [
        [-0.014, 0.082],
        [-0.020, 0.132],
        [-0.017, 0.184],
        [-0.006, 0.236],
        [0.008, 0.276],
        [0.015, 0.305],
      ],
      width: [0.044, 0.048, 0.041, 0.031, 0.017, 0.0],
      edge: 'front',
      thickness: 0.012,
      edgeThickness: 0.0015,
      bevel: 0.52,
      taper: 0.55,
      smooth: 6,
      slot: bladeGreen,
      fuller: { from: 0.08, to: 0.78, at: 0.30, width: 0.22, slot: venomBright },
    });
    g.add(blade);

    // gai sống lưỡi (cắm sâu vào sống -Z để tạo dáng sắc hiểm)
    const spineBarb = k.blade([
      [-0.010, 0.120],
      [-0.028, 0.140],
      [-0.022, 0.146],
      [-0.033, 0.168],
      [-0.020, 0.175],
      [-0.011, 0.195],
    ], 0.007, 'steel_dark', 0.002);
    g.add(spineBarb);

    // --- gốc lưỡi & bầu chứa độc bọc đồng thau dẫn thẳng vào rãnh ---
    const ricasso = k.box(0.018, 0.032, 0.046, 'steel_dark');
    ricasso.position.set(0, 0.086, 0.006);
    g.add(ricasso);

    const vial = k.lathe([
      [0.0, 0.076], [0.008, 0.080], [0.0125, 0.090],
      [0.0125, 0.104], [0.008, 0.114], [0.0, 0.117],
    ], 6, venomBright);
    vial.position.set(0, 0, -0.004);
    g.add(vial);

    const vialBase = k.cyl(0.011, 0.0125, 0.006, 6, 'brass');
    vialBase.position.set(0, 0.081, -0.004);
    g.add(vialBase);

    const vialTop = k.cyl(0.0085, 0.012, 0.007, 6, 'brass');
    vialTop.position.set(0, 0.112, -0.004);
    g.add(vialTop);

    const nozzle = k.cone(0.0055, 0.016, 6, 'brass');
    nozzle.position.set(0, 0.119, -0.004);
    g.add(nozzle);

    for (const sx of [-0.0128, 0.0128]) {
      const bar = k.box(0.003, 0.028, 0.0045, 'brass');
      bar.position.set(sx, 0.096, -0.004);
      g.add(bar);
    }

    // --- chắn tay chữ S bất đối xứng & cổ chuôi ---
    const collar = k.lathe([
      [0.0, 0.052], [0.018, 0.052], [0.021, 0.062],
      [0.023, 0.070], [0.019, 0.078], [0.0, 0.078],
    ], 8, 'steel_dark');
    g.add(collar);

    const upperFerrule = k.cyl(0.020, 0.0185, 0.010, 8, 'brass');
    upperFerrule.position.y = 0.056;
    g.add(upperFerrule);

    const guard = k.blade([
      [0.062, 0.098],
      [0.038, 0.078],
      [0.012, 0.077],
      [-0.022, 0.074],
      [-0.044, 0.046],
      [-0.026, 0.054],
      [-0.010, 0.061],
      [0.024, 0.063],
      [0.046, 0.073],
    ], 0.014, 'steel_dark', 0.003);
    g.add(guard);

    for (const sx of [-0.0085, 0.0085]) {
      const rFront = k.sphere(0.0035, 0, 'brass');
      rFront.position.set(sx, 0.069, 0.018);
      g.add(rFront);
      const rBack = k.sphere(0.0032, 0, 'brass');
      rBack.position.set(sx, 0.066, -0.016);
      g.add(rBack);
    }

    // --- chuôi xương đốt (tâm cầm tại gốc tọa độ, dài ~0.11 m) ---
    const boneGrip = k.lathe([
      [0.0, -0.060], [0.019, -0.058], [0.017, -0.042], [0.0155, -0.020],
      [0.0168, 0.000], [0.0155, 0.022], [0.017, 0.042], [0.0185, 0.056], [0.0, 0.056],
    ], 7, 'bone');
    boneGrip.scale.set(0.88, 1.0, 1.08);
    g.add(boneGrip);

    // đốt xương nổi dọc sống chuôi (-Z) tạo cảm giác xương thật
    for (const y of [-0.028, 0.0, 0.028]) {
      const knuckle = k.sphere(0.007, 0, 'bone');
      knuckle.scale.set(0.78, 1.12, 1.0);
      knuckle.position.set(0, y, -0.015);
      g.add(knuckle);
    }

    // hai đoạn dây da quấn hai đầu chuôi, chừa phần đốt xương ở giữa
    const wrapTop = k.wrap(0.015, 0.045, 0.0182, 2.5, 'leather');
    wrapTop.scale.set(0.92, 1.0, 1.06);
    g.add(wrapTop);

    const wrapBot = k.wrap(-0.045, -0.015, 0.0182, 2.5, 'leather');
    wrapBot.scale.set(0.92, 1.0, 1.06);
    g.add(wrapBot);

    // chốt đồng xuyên chuôi xương
    for (const sx of [-0.0135, 0.0135]) {
      const pin = k.sphere(0.0035, 0, 'brass');
      pin.position.set(sx, 0.0, 0.004);
      g.add(pin);
    }

    // --- đốc xương khớp & nanh ngược + khoen đồng cho dao ném ---
    const lowerFerrule = k.cyl(0.0185, 0.0195, 0.009, 7, 'brass');
    lowerFerrule.scale.set(0.90, 1.0, 1.08);
    lowerFerrule.position.y = -0.056;
    g.add(lowerFerrule);

    const pommel = k.lathe([
      [0.0, -0.094], [0.013, -0.092], [0.022, -0.080],
      [0.021, -0.068], [0.017, -0.058], [0.0, -0.058],
    ], 7, 'bone');
    pommel.scale.set(0.92, 1.0, 1.12);
    g.add(pommel);

    const condyle = k.sphere(0.014, 0, 'bone');
    condyle.scale.set(0.9, 1.0, 1.1);
    condyle.position.set(0, -0.084, 0.012);
    g.add(condyle);

    const boneSpur = k.cone(0.011, 0.042, 6, 'bone');
    boneSpur.position.set(0, -0.094, -0.010);
    boneSpur.rotation.set(Math.PI + 0.48, 0, 0);
    g.add(boneSpur);

    const ringPts = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ringPts.push([0, -0.095 + Math.cos(a) * 0.009, 0.014 + Math.sin(a) * 0.009]);
    }
    g.add(k.tube(ringPts, 0.0022, 6, 'brass'));

    k.marker(g, 'base', [0, 0.085, 0.028]);
    k.marker(g, 'tip', [0, 0.305, 0.015]);
    return g;
  },
};