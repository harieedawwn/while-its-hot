// Cự Chùy Trọng Lực — đại chùy khối lập phương kim loại đen lõi rãnh tím, hai vòng năng lượng giao chéo ngàm trục và cặp piston giáng lực.
export default {
  meta: {
    id: 'bua_cu_chuy',
    name: 'Cự Chùy Trọng Lực',
    family: 'bua',
    level: 21,
    inspiration: 'Đại chùy khối lập phương kết hợp khung con quay trọng lực hai vòng giao chéo và cặp piston giáng lực',
    look: 'đầu búa khối lập phương kim loại đen khắc rãnh sâu phát sáng tím, mặt đập trước lắp đệm piston bốn múi, hai vòng năng lượng tím giao chéo ngàm trục quanh đầu búa, cổ búa gắn cặp piston thép trên cán bọc da và chuôi đối trọng vuông',
    power: { score: 7, note: 'gom mục tiêu mạnh bằng trường hút và dập piston phá giáp nặng' },
    effects: [
      'đòn nặng hút mọi kẻ địch trong bán kính 6 m về ngay trước mặt (hồi chiêu 5 giây)',
      'cặp piston cổ chùy nén và bung lực khi vung đập, tăng mạnh sát thương phá giáp và đẩy lùi',
      'cú giáng slam dội sóng trọng lực làm choáng ngắn mục tiêu tại tâm điểm chạm đất',
    ],
    lengthM: 1.31,
  },
  build(k) {
    const g = k.group();
    const obsidian = k.paint('#1c1b26', true);      // black forged gravity metal
    const glowPurple = k.paint('#b84dff', false);   // glowing purple energy core & rings
    const headY = 0.76;
    const tiltX = 36 * Math.PI / 180;
    const tiltY = 35 * Math.PI / 180;

    // --- main cube head: glowing purple core framed by 8 black corner armor blocks ---
    const core = k.box(0.172, 0.172, 0.172, glowPurple);
    core.position.set(0, headY, 0);
    g.add(core);

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const blk = k.box(0.083, 0.083, 0.083, obsidian);
          blk.position.set(sx * 0.0505, headY + sy * 0.0505, sz * 0.0505);
          g.add(blk);
        }
      }
    }

    // --- side diamond hubs & emitter pylons anchoring Ring 1 along X ---
    for (const sx of [-1, 1]) {
      const hub = k.box(0.014, 0.082, 0.082, 'steel_dark');
      hub.position.set(sx * 0.090, headY, 0);
      hub.rotation.set(Math.PI / 4, 0, 0);
      g.add(hub);

      const emblem = k.box(0.012, 0.044, 0.044, glowPurple);
      emblem.position.set(sx * 0.095, headY, 0);
      emblem.rotation.set(Math.PI / 4, 0, 0);
      g.add(emblem);

      const pylon = k.cyl(0.011, 0.020, 0.084, 6, 'steel_dark');
      pylon.position.set(sx * 0.135, headY, 0);
      pylon.rotation.set(0, 0, -sx * Math.PI / 2);
      g.add(pylon);

      const clamp = k.box(0.026, 0.026, 0.026, obsidian);
      clamp.position.set(sx * 0.176, headY, 0);
      clamp.rotation.set(tiltX, 0, 0);
      g.add(clamp);
    }

    // --- front (+Z) piston-driven striking anvil face ---
    const ventCore = k.box(0.118, 0.118, 0.024, glowPurple);
    ventCore.position.set(0, headY, 0.096);
    g.add(ventCore);

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const rail = k.box(0.018, 0.018, 0.032, 'steel');
        rail.position.set(sx * 0.056, headY + sy * 0.056, 0.100);
        g.add(rail);
      }
    }

    const anvilBase = k.box(0.150, 0.150, 0.018, 'steel_dark');
    anvilBase.position.set(0, headY, 0.113);
    g.add(anvilBase);

    const anvilGlow = k.box(0.116, 0.116, 0.010, glowPurple);
    anvilGlow.position.set(0, headY, 0.123);
    g.add(anvilGlow);

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const pad = k.box(0.060, 0.060, 0.014, obsidian);
        pad.position.set(sx * 0.040, headY + sy * 0.040, 0.126);
        g.add(pad);
      }
    }

    // --- back (-Z) tapered gravity recoil cap ---
    const recoilCap = k.lathe(
      [[0, 0], [0.096, 0], [0.096, 0.012], [0.068, 0.030], [0, 0.030]],
      4, 'steel_dark'
    );
    recoilCap.position.set(0, headY, -0.088);
    recoilCap.rotation.set(-Math.PI / 2, Math.PI / 4, 0);
    g.add(recoilCap);

    const recoilVent = k.box(0.056, 0.056, 0.016, glowPurple);
    recoilVent.position.set(0, headY, -0.113);
    g.add(recoilVent);

    // --- top crown spire anchoring Ring 2 ---
    const crown = k.lathe(
      [[0, 0.844], [0.056, 0.844], [0.048, 0.870], [0.025, 0.888], [0.022, 0.950], [0.032, 0.965], [0.018, 0.990], [0, 1.010]],
      4, 'steel_dark'
    );
    crown.rotation.set(0, Math.PI / 4, 0);
    g.add(crown);

    const topClamp = k.box(0.038, 0.026, 0.026, obsidian);
    topClamp.position.set(0, headY + 0.205, 0);
    topClamp.rotation.set(0, tiltY, 0);
    g.add(topClamp);

    // --- Ring 1 (inner tilted orbital energy ring, anchored on X pylons) ---
    const r1 = 0.176;
    const pts1 = [];
    for (let i = 0; i <= 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      pts1.push([
        r1 * Math.cos(t),
        headY + r1 * Math.sin(t) * Math.cos(tiltX),
        r1 * Math.sin(t) * Math.sin(tiltX),
      ]);
    }
    g.add(k.tube(pts1, 0.0075, 6, glowPurple));

    for (const s of [-1, 1]) {
      const vane1 = k.box(0.044, 0.022, 0.022, obsidian);
      vane1.position.set(0, headY + s * r1 * Math.cos(tiltX), s * r1 * Math.sin(tiltX));
      vane1.rotation.set(tiltX, 0, 0);
      g.add(vane1);
    }

    // --- Ring 2 (outer tilted orbital energy ring, anchored on top crown & shaft collar) ---
    const r2 = 0.205;
    const pts2 = [];
    for (let i = 0; i <= 12; i++) {
      const u = Math.PI / 2 + (i / 12) * Math.PI * 2;
      pts2.push([
        r2 * Math.cos(u) * Math.cos(tiltY),
        headY + r2 * Math.sin(u),
        -r2 * Math.cos(u) * Math.sin(tiltY),
      ]);
    }
    g.add(k.tube(pts2, 0.0082, 6, glowPurple));

    for (const s of [-1, 1]) {
      const vane2 = k.box(0.024, 0.046, 0.024, obsidian);
      vane2.position.set(s * r2 * Math.cos(tiltY), headY, -s * r2 * Math.sin(tiltY));
      vane2.rotation.set(0, tiltY, 0);
      g.add(vane2);
    }

    // --- twin hydraulic slam pistons & gimbal yoke below cube head ---
    const headBase = k.box(0.148, 0.022, 0.054, 'steel_dark');
    headBase.position.set(0, 0.665, 0);
    g.add(headBase);

    for (const sx of [-1, 1]) {
      const barrel = k.cyl(0.016, 0.016, 0.115, 6, obsidian);
      barrel.position.set(sx * 0.058, 0.515, 0);
      g.add(barrel);

      const pressRing = k.cyl(0.0185, 0.0185, 0.016, 6, glowPurple);
      pressRing.position.set(sx * 0.058, 0.576, 0);
      g.add(pressRing);

      const rod = k.cyl(0.0105, 0.0105, 0.095, 6, 'steel');
      rod.position.set(sx * 0.058, 0.625, 0);
      g.add(rod);

      const brace = k.box(0.016, 0.078, 0.026, 'steel_dark');
      brace.position.set(sx * 0.038, 0.422, 0);
      brace.rotation.set(0, 0, -sx * 0.50);
      g.add(brace);
    }

    const yokeCollar = k.cyl(0.036, 0.024, 0.072, 8, 'steel_dark');
    yokeCollar.position.set(0, 0.452, 0);
    g.add(yokeCollar);

    const yokeBridge = k.box(0.152, 0.032, 0.048, obsidian);
    yokeBridge.position.set(0, 0.466, 0);
    g.add(yokeBridge);

    // --- lower Ring 2 anchor collar on central shaft ---
    const ringAnchor = k.cyl(0.032, 0.032, 0.034, 8, 'steel_dark');
    ringAnchor.position.set(0, headY - r2, 0);
    g.add(ringAnchor);

    const anchorGlow = k.cyl(0.029, 0.029, 0.012, 8, glowPurple);
    anchorGlow.position.set(0, headY - r2 - 0.021, 0);
    g.add(anchorGlow);

    const botClamp = k.box(0.038, 0.026, 0.026, obsidian);
    botClamp.position.set(0, headY - r2, 0);
    botClamp.rotation.set(0, tiltY, 0);
    g.add(botClamp);

    // --- continuous shaft & glowing purple power conduits ---
    const shaft = k.cyl(0.022, 0.0195, 0.96, 8, 'steel_dark');
    shaft.position.set(0, 0.22, 0);
    g.add(shaft);

    for (const sz of [-1, 1]) {
      const conduit = k.box(0.008, 0.26, 0.010, glowPurple);
      conduit.position.set(0, 0.295, sz * 0.0185);
      g.add(conduit);
    }

    const midBand = k.cyl(0.026, 0.026, 0.028, 8, obsidian);
    midBand.position.set(0, 0.295, 0);
    g.add(midBand);

    // --- grip centered at origin ---
    const upperBolster = k.cyl(0.029, 0.024, 0.034, 8, obsidian);
    upperBolster.position.set(0, 0.155, 0);
    g.add(upperBolster);

    const gripSleeve = k.cyl(0.021, 0.021, 0.28, 8, 'leather');
    g.add(gripSleeve);
    g.add(k.wrap(-0.135, 0.135, 0.0225, 5, 'cloth_dark'));

    const lowerBolster = k.cyl(0.024, 0.030, 0.034, 8, obsidian);
    lowerBolster.position.set(0, -0.155, 0);
    g.add(lowerBolster);

    // --- counterweight cube pommel echoing the main head ---
    const pomNeck = k.cyl(0.024, 0.028, 0.020, 8, 'steel_dark');
    pomNeck.position.set(0, -0.178, 0);
    g.add(pomNeck);

    const pomTop = k.box(0.056, 0.028, 0.056, obsidian);
    pomTop.position.set(0, -0.194, 0);
    g.add(pomTop);

    const pomCore = k.box(0.048, 0.030, 0.048, glowPurple);
    pomCore.position.set(0, -0.214, 0);
    g.add(pomCore);

    const pomBot = k.box(0.056, 0.028, 0.056, obsidian);
    pomBot.position.set(0, -0.234, 0);
    g.add(pomBot);

    const pomTip = k.cone(0.030, 0.056, 4, 'steel_dark');
    pomTip.position.set(0, -0.270, 0);
    pomTip.rotation.set(Math.PI, Math.PI / 4, 0);
    g.add(pomTip);

    k.marker(g, 'base', [0, 0.67, 0.133]);
    k.marker(g, 'tip', [0, 0.85, 0.133]);
    return g;
  },
};