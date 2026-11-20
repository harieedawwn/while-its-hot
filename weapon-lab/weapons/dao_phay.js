// Dao phay — dao chặt thịt bản vuông rèn từ thép nhíp, đục lỗ treo khâu đồng ở góc trên.
export default {
  meta: {
    id: 'dao_phay',
    name: 'Dao phay',
    family: 'dao',
    level: 6,
    inspiration: 'Dao phay chặt thịt truyền thống Việt Nam rèn thủ công từ thép nhíp, bản vuông nặng có lỗ treo ở góc',
    look: 'lưỡi bản vuông hai tầng thép nhíp đen rèn thô và mép mài sáng bóng, góc mũi đục lỗ xuyên thấu viền đồng kèm khuyên móc sắt, cán gỗ tiện đóng khâu đồng',
    power: { score: 5, note: 'lưỡi nặng đầm tay, đòn bổ kết chuỗi uy lực' },
    effects: [
      'đòn 4 combo +25% sát thương',
      'đòn thứ 4 bổ mạnh làm mục tiêu khựng nhẹ và chịu sát thương chảy máu ngắn',
      'gây thêm sát thương lên khiên gỗ và giáp nhẹ khi chém trúng bằng phần mũi bản vuông',
    ],
    lengthM: 0.39,
  },
  build(k) {
    const g = k.group();

    // --- Lưỡi chính bản vuông (từ gót dao y=0.075 lên tới sát đáy lỗ treo y=0.266) ---
    const mainBlade = k.edge({
      spine: [
        [-0.020, 0.075],
        [-0.022, 0.120],
        [-0.023, 0.175],
        [-0.024, 0.225],
        [-0.025, 0.266],
      ],
      width: [0.110, 0.114, 0.117, 0.119, 0.120],
      edge: 'front',
      thickness: 0.007,
      edgeThickness: 0.0012,
      bevel: 0.58,
      taper: 0.04,
      smooth: 5,
      slot: 'steel',
      fuller: { from: 0.06, to: 0.90, at: 0.34, width: 0.14, slot: 'steel_dark' },
    });
    g.add(mainBlade);

    // --- Phần mép sắc phía trước lỗ treo (y=0.258..0.305, nối liền mạch lưỡi cắt +Z) ---
    const frontTipEdge = k.edge({
      spine: [
        [0.071, 0.258],
        [0.071, 0.276],
        [0.071, 0.292],
        [0.070, 0.305],
      ],
      width: [0.024, 0.024, 0.023, 0.020],
      edge: 'front',
      thickness: 0.0056,
      edgeThickness: 0.0012,
      bevel: 0.85,
      taper: 0.05,
      smooth: 4,
      slot: 'steel',
    });
    g.add(frontTipEdge);

    // --- Phần bản thép phía sau lỗ treo và cầu nối đỉnh mũi (chừa khoảng trống xuyên thấu ở y=0.276, z=0.060) ---
    const backTopBlade = k.edge({
      spine: [
        [-0.025, 0.258],
        [-0.025, 0.282],
        [-0.026, 0.305],
      ],
      width: [0.074, 0.074, 0.075],
      edge: 'front',
      thickness: 0.007,
      edgeThickness: 0.0055,
      bevel: 0.25,
      taper: 0.0,
      smooth: 3,
      slot: 'steel',
    });
    g.add(backTopBlade);

    const topCornerBridge = k.box(0.006, 0.018, 0.032, 'steel');
    topCornerBridge.position.set(0, 0.296, 0.059);
    g.add(topCornerBridge);

    // --- Lớp thép nhíp đen rèn thô dọc sống lưng và sống dao dày đập xương ---
    const forgedSpinePlate = k.edge({
      spine: [
        [-0.021, 0.076],
        [-0.023, 0.130],
        [-0.024, 0.190],
        [-0.025, 0.250],
        [-0.026, 0.306],
      ],
      width: [0.048, 0.054, 0.058, 0.060, 0.062],
      edge: 'front',
      thickness: 0.0092,
      edgeThickness: 0.0066,
      bevel: 0.45,
      taper: 0.0,
      smooth: 5,
      slot: 'iron_rough',
    });
    g.add(forgedSpinePlate);

    const spineRib = k.box(0.0115, 0.230, 0.010, 'steel_dark');
    spineRib.position.set(0, 0.191, -0.021);
    g.add(spineRib);

    // Đinh tán đồng dọc sống dao và khấc chặt xương
    for (const y of [0.105, 0.165, 0.225, 0.285]) {
      const rivet = k.cyl(0.004, 0.004, 0.011, 6, 'brass');
      rivet.rotation.z = Math.PI / 2;
      rivet.position.set(0, y, 0.004);
      g.add(rivet);
    }
    for (const y of [0.135, 0.195]) {
      const clamp = k.box(0.013, 0.012, 0.018, 'iron_rough');
      clamp.position.set(0, y, -0.018);
      g.add(clamp);
    }

    // --- Lỗ treo ở góc trên (y=0.276, z=0.060): viền khâu đồng + vành sắt + khuyên móc treo ---
    const holeY = 0.276;
    const holeZ = 0.060;
    const grommetPts = [];
    const flangePts = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cy = Math.sin(a);
      const cz = Math.cos(a);
      grommetPts.push([0, holeY + cy * 0.0125, holeZ + cz * 0.0125]);
      flangePts.push([0, holeY + cy * 0.0155, holeZ + cz * 0.0155]);
    }
    g.add(k.tube(grommetPts, 0.0045, 6, 'brass'));
    g.add(k.tube(flangePts, 0.0028, 6, 'iron_rough'));

    // Khuyên sắt móc thịt luồn xuyên qua lỗ treo
    const hookRing = k.tube([
      [-0.002, 0.284, 0.060],
      [0.011, 0.292, 0.067],
      [0.014, 0.305, 0.073],
      [0.006, 0.313, 0.075],
      [-0.007, 0.312, 0.071],
      [-0.013, 0.301, 0.064],
      [-0.009, 0.288, 0.058],
      [-0.002, 0.284, 0.060],
    ], 0.0028, 6, 'steel_dark');
    g.add(hookRing);

    // --- Cổ dao và gót lưỡi nối vào khâu ---
    const heelBolster = k.box(0.014, 0.016, 0.058, 'steel_dark');
    heelBolster.position.set(0, 0.074, 0.007);
    g.add(heelBolster);

    const heelGuard = k.box(0.011, 0.010, 0.098, 'iron_rough');
    heelGuard.position.set(0, 0.075, 0.032);
    g.add(heelGuard);

    // --- Khâu dao bằng đồng thau & đai sắt (y=0.044..0.074) ---
    const ferrule = k.lathe([
      [0.0, 0.044],
      [0.0205, 0.044],
      [0.0215, 0.056],
      [0.0195, 0.070],
      [0.0175, 0.074],
      [0.0, 0.074],
    ], 8, 'brass');
    g.add(ferrule);

    const ferruleBand = k.cyl(0.0222, 0.0222, 0.008, 8, 'iron_rough');
    ferruleBand.position.y = 0.049;
    g.add(ferruleBand);

    // --- Cán gỗ tiện phình giữa + dây da quấn chống trượt (y=-0.074..0.046) ---
    const handle = k.lathe([
      [0.0, -0.074],
      [0.021, -0.072],
      [0.0185, -0.056],
      [0.0215, -0.020],
      [0.021, 0.016],
      [0.0195, 0.046],
      [0.0, 0.046],
    ], 8, 'wood');
    g.add(handle);

    for (const y of [-0.054, 0.024]) {
      const groove = k.cyl(0.0205, 0.0205, 0.006, 8, 'wood_dark');
      groove.position.y = y;
      g.add(groove);
    }

    g.add(k.wrap(-0.044, 0.016, 0.0218, 5, 'leather'));

    // --- Đốc cán: long đền sắt và đầu chuôi xuyên tán đồng ---
    const buttCap = k.lathe([
      [0.0, -0.080],
      [0.008, -0.080],
      [0.010, -0.076],
      [0.0215, -0.076],
      [0.022, -0.071],
      [0.0, -0.071],
    ], 8, 'iron_rough');
    g.add(buttCap);

    const peenedTang = k.sphere(0.007, 0, 'brass');
    peenedTang.scale.set(1, 0.6, 1);
    peenedTang.position.set(0, -0.079, 0);
    g.add(peenedTang);

    k.marker(g, 'base', [0, 0.075, 0.090]);
    k.marker(g, 'tip', [0, 0.305, 0.090]);
    return g;
  },
};