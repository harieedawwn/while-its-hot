// Dao Gương — đoản đao chế từ mảnh gương bạc cầm tay viền đen, mũi móc sắc và bầu độc gắn khung.
export default {
  meta: {
    id: 'dao_guong',
    name: 'Dao Gương',
    family: 'dao',
    level: 27,
    inspiration: 'Gương soi cầm tay khung đen mài sắc thành đoản đao sát thủ có mũi móc và bầu độc',
    look: 'lưỡi bạc sáng loáng bầu rộng như mặt gương vát mũi móc sắc, khung đen ôm sống lưỡi gắn bầu độc lục bảo, chắn tay móc đỡ và chuôi đen vòng nhẫn',
    power: { score: 7, note: 'phản đòn dịch chuyển bất ngờ, kéo móc phá thế và thấm độc' },
    effects: [
      'đỡ chuẩn: dịch chuyển ra sau lưng người đánh và tàng hình trong 1 giây',
      'móc: chém nặng móc kéo mục tiêu lệch thế, mở góc đánh sau lưng',
      'độc: vết cắt thấm độc từ bầu kính gắn khung lưỡi, gây rút máu theo thời gian',
    ],
    lengthM: 0.46,
  },
  build(k) {
    const g = k.group();

    const mirrorSilver = k.paint('#eef6fc', true);
    const mirrorIce = k.paint('#a8c8dc', true);
    const obsidian = k.paint('#16161b', true);
    const handleBlack = k.paint('#202026', false);
    const venom = k.paint('#3ee06e', false);

    // --- mirror blade: broad reflective oval belly sweeping into a hooked beak tip (+Z) ---
    const blade = k.edge({
      spine: [[-0.012, 0.080], [-0.028, 0.132], [-0.033, 0.190], [-0.023, 0.248], [0.003, 0.296], [0.044, 0.340]],
      width: [0.038, 0.072, 0.079, 0.056, 0.026, 0.0],
      edge: 'front',
      thickness: 0.011,
      edgeThickness: 0.0014,
      bevel: 0.42,
      taper: 0.45,
      smooth: 7,
      slot: mirrorSilver,
      fuller: { from: 0.06, to: 0.65, at: 0.28, width: 0.34, slot: mirrorIce },
    });
    g.add(blade);

    // --- rear spine hook (móc lưng) embedded into the upper mirror frame ---
    const spineHook = k.blade(
      [[-0.018, 0.248], [-0.038, 0.266], [-0.060, 0.268], [-0.056, 0.244], [-0.044, 0.252], [-0.028, 0.220], [-0.018, 0.212]],
      0.008,
      mirrorSilver,
      0.0025
    );
    g.add(spineHook);

    // --- dark obsidian mirror bezel hugging the spine ---
    const spineFrame = k.tube(
      [[0, 0.074, -0.010], [0, 0.112, -0.023], [0, 0.156, -0.032], [0, 0.200, -0.033], [0, 0.246, -0.023], [0, 0.286, -0.003]],
      0.0072,
      6,
      obsidian
    );
    g.add(spineFrame);

    const frameTip = k.cone(0.0072, 0.022, 6, obsidian);
    frameTip.position.set(0, 0.290, -0.001);
    frameTip.rotation.x = 0.48;
    g.add(frameTip);

    // --- twin lower front bezel prongs clamping the mirror glass ---
    for (const s of [-1, 1]) {
      const prong = k.tube(
        [[s * 0.0056, 0.076, 0.016], [s * 0.0056, 0.106, 0.030], [s * 0.0052, 0.136, 0.036], [s * 0.0046, 0.148, 0.028]],
        0.003,
        6,
        obsidian
      );
      g.add(prong);
    }

    // --- bezel clasps + silver rivets along the spine ---
    const clasps = [
      { y: 0.148, z: -0.030, rx: -0.20 },
      { y: 0.204, z: -0.032, rx: 0.12 },
      { y: 0.250, z: -0.022, rx: 0.34 },
    ];
    for (let i = 0; i < clasps.length; i++) {
      const c = clasps[i];
      const band = k.box(0.016, 0.010, 0.017, obsidian);
      band.position.set(0, c.y, c.z + 0.003);
      band.rotation.x = c.rx;
      g.add(band);
      if (i < 2) {
        for (const s of [-1, 1]) {
          const rivet = k.sphere(0.0028, 0, mirrorIce);
          rivet.position.set(s * 0.0085, c.y, c.z + 0.004);
          g.add(rivet);
        }
      }
    }

    // --- venom ampoule caged into the lower bezel + inlaid venom channels ---
    const vialGroup = k.group();
    vialGroup.position.set(0, 0.114, -0.019);
    vialGroup.rotation.x = -0.30;
    vialGroup.add(k.cyl(0.0076, 0.0076, 0.028, 6, venom));
    for (const vy of [-0.015, 0.015]) {
      const cap = k.cyl(0.0086, 0.0086, 0.0055, 6, obsidian);
      cap.position.y = vy;
      vialGroup.add(cap);
    }
    for (const vy of [-0.005, 0.005]) {
      const cage = k.cyl(0.0083, 0.0083, 0.0026, 6, obsidian);
      cage.position.y = vy;
      vialGroup.add(cage);
    }
    g.add(vialGroup);

    for (const s of [-1, 1]) {
      const duct = k.tube(
        [[s * 0.0052, 0.126, -0.020], [s * 0.0052, 0.165, -0.026], [s * 0.0050, 0.205, -0.025], [s * 0.0044, 0.244, -0.016]],
        0.0017,
        4,
        venom
      );
      g.add(duct);
    }

    // --- mirror collar & sweeping parry guard (đỡ chuẩn) ---
    const collar = k.lathe(
      [[0.0, 0.052], [0.021, 0.052], [0.022, 0.058], [0.020, 0.064], [0.024, 0.070], [0.025, 0.080], [0.020, 0.088], [0.0, 0.088]],
      8,
      obsidian
    );
    collar.scale.set(0.90, 1, 1.32);
    g.add(collar);

    const collarRing = k.cyl(0.0225, 0.0225, 0.0055, 8, mirrorIce);
    collarRing.position.y = 0.060;
    collarRing.scale.set(0.90, 1, 1.32);
    g.add(collarRing);

    const guard = k.tube(
      [[0, 0.062, -0.042], [0, 0.070, -0.022], [0, 0.072, 0.005], [0, 0.076, 0.036], [0, 0.088, 0.056], [0, 0.104, 0.052]],
      0.0072,
      6,
      obsidian
    );
    g.add(guard);

    const frontQuillTip = k.cone(0.0072, 0.018, 6, mirrorSilver);
    frontQuillTip.position.set(0, 0.108, 0.050);
    frontQuillTip.rotation.x = -0.25;
    g.add(frontQuillTip);

    const rearQuillTip = k.cone(0.0070, 0.017, 6, mirrorSilver);
    rearQuillTip.position.set(0, 0.060, -0.045);
    rearQuillTip.rotation.x = -1.95;
    g.add(rearQuillTip);

    // --- recessed mirror diamond & venom eye on guard sides ---
    const guardMirror = k.box(0.046, 0.013, 0.013, mirrorSilver);
    guardMirror.position.set(0, 0.074, 0.004);
    guardMirror.rotation.x = Math.PI / 4;
    g.add(guardMirror);

    const guardEye = k.box(0.048, 0.005, 0.005, venom);
    guardEye.position.set(0, 0.074, 0.004);
    guardEye.rotation.x = Math.PI / 4;
    g.add(guardEye);

    // --- black ergonomic grip (chuôi đen) centered at origin ---
    const grip = k.lathe(
      [[0.0, -0.060], [0.0155, -0.060], [0.0168, -0.042], [0.0148, -0.010], [0.0152, 0.018], [0.0170, 0.044], [0.0165, 0.056], [0.0, 0.056]],
      8,
      handleBlack
    );
    grip.scale.set(0.88, 1, 1.08);
    g.add(grip);

    const wrap = k.wrap(-0.045, 0.045, 0.0162, 5, 'cloth_dark');
    wrap.scale.set(0.90, 1, 1.08);
    g.add(wrap);

    for (const y of [-0.049, 0.049]) {
      const band = k.cyl(0.0182, 0.0182, 0.0055, 8, mirrorIce);
      band.position.y = y;
      band.scale.set(0.89, 1, 1.09);
      g.add(band);
    }

    // --- obsidian pommel + mirror-handle finger loop ---
    const pommel = k.lathe(
      [[0.0, -0.082], [0.012, -0.080], [0.0185, -0.070], [0.020, -0.060], [0.0175, -0.054], [0.0, -0.054]],
      8,
      obsidian
    );
    pommel.scale.set(0.88, 1, 1.12);
    g.add(pommel);

    const pommelInlay = k.box(0.036, 0.011, 0.011, mirrorSilver);
    pommelInlay.position.set(0, -0.067, 0);
    pommelInlay.rotation.x = Math.PI / 4;
    g.add(pommelInlay);

    const ringPts = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ringPts.push([0, -0.096 + Math.cos(a) * 0.017, Math.sin(a) * 0.017]);
    }
    g.add(k.tube(ringPts, 0.0046, 6, obsidian));

    const pommelSpur = k.cone(0.0055, 0.016, 6, mirrorSilver);
    pommelSpur.position.set(0, -0.118, 0.003);
    pommelSpur.rotation.x = Math.PI - 0.25;
    g.add(pommelSpur);

    k.marker(g, 'base', [0, 0.085, 0.024]);
    k.marker(g, 'tip', [0, 0.340, 0.044]);
    return g;
  },
};