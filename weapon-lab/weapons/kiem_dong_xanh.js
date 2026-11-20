// Kiếm đồng xanh — cổ kiếm đồng Đông Sơn phủ rỉ lục, khắc chìm mặt trời và hoa văn trống đồng, chuôi tròn loe.
export default {
  meta: {
    id: 'kiem_dong_xanh',
    name: 'Kiếm đồng xanh',
    family: 'kiem',
    level: 24,
    inspiration: 'Kiếm đồng cổ Đông Sơn kết hợp họa tiết mặt trời và quai trống đồng Ngọc Lũ',
    look: 'lưỡi đồng dáng lá phủ rỉ lục lộ mép đồng mài sáng, khắc chìm mặt trời và dải răng cưa trống đồng, chắn kiếm hình thân trống có quai cong, chuôi tròn chia vòng kết thúc bằng đốc loe mặt trống',
    power: { score: 7, note: 'phản đòn mạnh nhờ vệt chém trả khi đỡ chuẩn, đòn nặng đánh xa và gây đốt' },
    effects: [
      'đỡ chuẩn tự phóng một vệt chém trả về phía trước (hồi chiêu 2 giây)',
      'đòn nặng phóng vệt chém tầm xa gây 18 sát thương',
      'đòn chém và vệt chém gây hiệu ứng đốt cháy theo thời gian',
    ],
    lengthM: 1.13,
  },
  build(k) {
    const g = k.group();
    const bronze = k.paint('#b88946', true);       // burnished antique bronze (edges, sun motif, rings)
    const verdigris = k.paint('#4a9980', true);    // oxidized green bronze patina
    const verdigrisDark = k.paint('#1f493e', true);// deep patina inside sunken drum engravings
    const bronzeDark = k.paint('#5a4326', true);   // aged dark bronze (drum collar, core, pommel throat)

    // --- blade: double-edged leaf-shaped Dong Son bronze blade ---
    // Layer 1: honed bronze outer edge silhouette
    const bladeOuter = k.edge({
      spine: [[0, 0.165], [0, 0.25], [0, 0.38], [0, 0.54], [0, 0.70], [0, 0.83], [0, 0.945]],
      width: [0.098, 0.090, 0.078, 0.088, 0.076, 0.048, 0.0],
      edge: 'both', thickness: 0.0165, edgeThickness: 0.0015, bevel: 0.55, taper: 0.40, smooth: 5,
      slot: bronze,
    });
    g.add(bladeOuter);

    // Layer 2: wide verdigris patina face nested cleanly inside the sharpened bronze bevels
    const bladePatina = k.edge({
      spine: [[0, 0.165], [0, 0.25], [0, 0.38], [0, 0.54], [0, 0.70], [0, 0.875]],
      width: [0.074, 0.068, 0.056, 0.064, 0.052, 0.0],
      edge: 'both', thickness: 0.0176, edgeThickness: 0.002, bevel: 0.38, taper: 0.46, smooth: 4,
      slot: verdigris,
    });
    g.add(bladePatina);

    // Layer 3: dark sunken engraving channel running up the central spine
    const bladeChannel = k.edge({
      spine: [[0, 0.265], [0, 0.42], [0, 0.58], [0, 0.74]],
      width: [0.030, 0.028, 0.025, 0.0],
      edge: 'both', thickness: 0.0174, edgeThickness: 0.002, bevel: 0.25, taper: 0.36, smooth: 3,
      slot: verdigrisDark,
    });
    g.add(bladeChannel);

    // --- Dong Son sun-star medallion sunk into the broad lower blade (y = 0.248) ---
    const sunY = 0.248;
    const sunRim = k.cyl(0.028, 0.028, 0.0184, 8, bronze);
    sunRim.rotation.z = Math.PI / 2; sunRim.position.y = sunY; g.add(sunRim);

    const sunField = k.cyl(0.023, 0.023, 0.0196, 8, verdigrisDark);
    sunField.rotation.z = Math.PI / 2; sunField.position.y = sunY; g.add(sunField);

    for (let i = 0; i < 4; i++) {
      const ray = k.box(0.0208, 0.0034, 0.041, bronze);
      ray.rotation.x = (i * Math.PI) / 4;
      ray.position.y = sunY;
      g.add(ray);
    }

    const sunBoss = k.cyl(0.008, 0.008, 0.0222, 8, bronze);
    sunBoss.rotation.z = Math.PI / 2; sunBoss.position.y = sunY; g.add(sunBoss);

    // --- sunken drum-band chevron frets along the central channel ---
    for (const y of [0.35, 0.42, 0.49, 0.56]) {
      const t = (y - 0.265) / (0.74 - 0.265);
      const th = 0.0174 * (1 - 0.36 * t) + 0.0024;
      for (const s of [-1, 1]) {
        const bar = k.box(th, 0.0042, 0.014, bronze);
        bar.rotation.x = s * 0.62;
        bar.position.set(0, y, s * 0.0052);
        g.add(bar);
      }
    }
    const topDiamond = k.box(0.0148, 0.010, 0.010, bronze);
    topDiamond.rotation.x = Math.PI / 4; topDiamond.position.y = 0.63; g.add(topDiamond);

    // --- stepped geometric ricasso teeth hugging blade base ---
    for (const s of [-1, 1]) {
      const tooth = k.box(0.013, 0.021, 0.021, bronze);
      tooth.rotation.x = Math.PI / 4;
      tooth.position.set(0, 0.194, s * 0.045);
      g.add(tooth);
    }

    // --- guard: miniature bronze drum waisted collar + winged cross-plate + drum handles ---
    const drumCollar = k.lathe([
      [0.0, 0.094], [0.026, 0.094], [0.022, 0.122], [0.035, 0.154],
      [0.033, 0.172], [0.025, 0.182], [0.0, 0.182],
    ], 8, bronzeDark);
    g.add(drumCollar);

    const drumBand = k.cyl(0.0365, 0.0365, 0.009, 8, verdigris);
    drumBand.position.y = 0.155; g.add(drumBand);

    const guardWings = k.blade([
      [-0.072, 0.176], [-0.056, 0.142], [0.0, 0.136], [0.056, 0.142],
      [0.072, 0.176], [0.050, 0.184], [0.0, 0.172], [-0.050, 0.184],
    ], 0.028, bronze, 0.004);
    g.add(guardWings);

    const guardInlay = k.blade([
      [-0.060, 0.170], [-0.048, 0.148], [0.0, 0.144], [0.048, 0.148],
      [0.060, 0.170], [0.046, 0.175], [0.0, 0.164], [-0.046, 0.175],
    ], 0.0305, verdigrisDark, 0.002);
    g.add(guardInlay);

    // Paired curved bronze drum handles (quai trống đồng) on ±Z cheeks
    for (const s of [-1, 1]) {
      const handle = k.tube([
        [0, 0.148, s * 0.054],
        [0, 0.151, s * 0.079],
        [0, 0.168, s * 0.084],
        [0, 0.174, s * 0.063],
      ], 0.006, 5, bronze);
      g.add(handle);
    }

    // --- round ringed bronze grip (chuôi tròn) at origin ---
    const gripCore = k.cyl(0.0185, 0.0185, 0.21, 8, bronzeDark);
    g.add(gripCore);
    g.add(k.wrap(-0.094, 0.094, 0.0195, 6, 'leather'));

    for (const y of [-0.036, 0.036]) {
      const gripRing = k.cyl(0.0235, 0.0235, 0.013, 8, bronze);
      gripRing.position.y = y; g.add(gripRing);
    }
    for (const y of [-0.095, 0.095]) {
      const endBand = k.cyl(0.0225, 0.0225, 0.010, 8, verdigris);
      endBand.position.y = y; g.add(endBand);
    }

    // --- flared circular drum-face pommel (đốc tròn loe hình mặt trống) ---
    const pommel = k.lathe([
      [0.0, -0.171], [0.028, -0.171], [0.044, -0.178], [0.046, -0.166],
      [0.029, -0.146], [0.021, -0.118], [0.023, -0.092], [0.0, -0.092],
    ], 8, bronzeDark);
    g.add(pommel);

    const pommelRim = k.cyl(0.047, 0.047, 0.008, 8, verdigris);
    pommelRim.position.y = -0.170; g.add(pommelRim);

    const pommelFace = k.cyl(0.035, 0.035, 0.006, 8, verdigrisDark);
    pommelFace.position.y = -0.174; g.add(pommelFace);

    const pommelBoss = k.cyl(0.011, 0.013, 0.010, 8, bronze);
    pommelBoss.position.y = -0.176; g.add(pommelBoss);

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const stud = k.box(0.007, 0.007, 0.007, bronze);
      stud.position.set(Math.cos(a) * 0.044, -0.170, Math.sin(a) * 0.044);
      g.add(stud);
    }

    k.marker(g, 'base', [0, 0.18, 0]);
    k.marker(g, 'tip', [0, 0.945, 0]);
    return g;
  },
};