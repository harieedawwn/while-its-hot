export default {
  meta: {
    id: 'bua_dung_nham',
    name: 'Búa dung nham',
    family: 'bua',
    level: 24,
    inspiration: 'Búa rèn núi lửa bằng đá bazan nứt kẹp lõi dung nham nóng chảy trong lò rèn sâu',
    look: 'đầu búa đá bazan khổng lồ rực lõi dung nham nứt nẻ, giằng đai thép tán đinh thô ráp, vòm thép rebar bảo vệ phía trên, hệ thống van và ống đồng xả nhiệt cơ khí ở đuôi',
    power: { score: 8, note: 'đập chấn động diện rộng, tạo vũng dung nham thiêu đốt và lực từ trường hút gom kẻ địch' },
    effects: [
      'đòn đập đất tạo vũng dung nham bán kính 2,5 m tồn tại 4 giây, gây 8 sát thương mỗi giây lên kẻ địch đứng trong vùng cháy',
      'đòn nặng từ trên cao (slam) tạo vũng dung nham bán kính lớn hơn và kéo dài thời gian thiêu đốt',
      'lực chấn động khi chạm đất tạo luồng hút kéo kẻ địch xung quanh gom về tâm vũng dung nham',
    ],
    lengthM: 1.22,
  },
  build(k) {
    const g = k.group();

    // Material palette
    const basalt = k.paint('#1a191d', false);
    const magma = k.paint('#ff4500', true);
    const magmaHot = k.paint('#ffa200', true);
    const scorchedSteel = k.paint('#2b2628', true);
    const copperPipe = k.paint('#8c4426', true);
    const charredWood = 'wood_dark';
    const darkLeather = 'leather';

    // --- 1. POMMEL & CHAIN AT BOTTOM (y: -0.38 to -0.22) ---
    const pommelBase = k.lathe(
      [
        [0.0, -0.36],
        [0.012, -0.35],
        [0.034, -0.32],
        [0.028, -0.26],
        [0.026, -0.24],
        [0.021, -0.22],
        [0.0, -0.22],
      ],
      8,
      scorchedSteel
    );
    g.add(pommelBase);

    // Fluted pommel teeth / ridges
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const ridge = k.box(0.008, 0.08, 0.016, scorchedSteel);
      ridge.position.set(Math.cos(angle) * 0.025, -0.28, Math.sin(angle) * 0.025);
      ridge.rotation.y = -angle;
      g.add(ridge);
    }

    // Glowing magma shard at the very tip of pommel
    const crystalTip = k.cone(0.014, 0.035, 6, magmaHot);
    crystalTip.position.set(0, -0.365, 0);
    crystalTip.rotation.x = Math.PI;
    g.add(crystalTip);

    // Hanging forged chain links at bottom
    const chainLink1 = k.tube(
      [
        [0, -0.355, 0],
        [0, -0.385, 0],
      ],
      0.006,
      5,
      scorchedSteel
    );
    g.add(chainLink1);
    const chainLink2 = k.tube(
      [
        [0, -0.38, 0.005],
        [0, -0.41, -0.005],
      ],
      0.005,
      5,
      scorchedSteel
    );
    g.add(chainLink2);

    // --- 2. HAFT & GRIP (y: -0.22 to 0.48) ---
    const shaft = k.cyl(0.019, 0.018, 0.72, 8, charredWood);
    shaft.position.y = 0.13;
    g.add(shaft);

    // Leather wrapped grip (y: -0.16 to 0.14)
    const gripBase = k.cyl(0.0205, 0.0205, 0.30, 8, darkLeather);
    gripBase.position.y = -0.01;
    g.add(gripBase);

    const wrap = k.wrap(-0.15, 0.13, 0.0215, 7, darkLeather);
    g.add(wrap);

    // Reinforcing steel bands & rivets on handle
    for (const y of [-0.16, 0.14, 0.28, 0.42]) {
      const band = k.cyl(0.024, 0.024, 0.018, 8, scorchedSteel);
      band.position.y = y;
      g.add(band);
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const rivet = k.sphere(0.005, 0, 'brass');
        rivet.position.set(Math.cos(angle) * 0.023, y, Math.sin(angle) * 0.023);
        g.add(rivet);
      }
    }

    // Copper pressure conduit along handle
    const handlePipe = k.tube(
      [
        [0.022, 0.22, 0.0],
        [0.022, 0.44, 0.0],
        [0.035, 0.49, 0.02],
      ],
      0.006,
      4,
      copperPipe
    );
    g.add(handlePipe);

    // --- 3. MULTI-TIERED HEAT-SINK COLLAR (y: 0.48 to 0.62) ---
    const collarLower = k.lathe(
      [
        [0.0, 0.46],
        [0.022, 0.46],
        [0.026, 0.48],
        [0.036, 0.49],
        [0.034, 0.52],
        [0.045, 0.53],
        [0.045, 0.57],
        [0.036, 0.58],
        [0.0, 0.58],
      ],
      8,
      scorchedSteel
    );
    g.add(collarLower);

    // Cooling fins around collar
    for (const y of [0.50, 0.525, 0.55]) {
      const fin = k.cyl(0.048, 0.048, 0.008, 8, scorchedSteel);
      fin.position.y = y;
      g.add(fin);
    }

    // Heavy flared sleeve meeting head
    const collarUpper = k.lathe(
      [
        [0.0, 0.57],
        [0.035, 0.57],
        [0.052, 0.60],
        [0.058, 0.62],
        [0.0, 0.62],
      ],
      8,
      scorchedSteel
    );
    g.add(collarUpper);

    // --- 4. THE MASSIVE VOLCANIC HEAD (y: 0.58 to 0.81, z: -0.19 to 0.22, x: -0.12 to 0.12) ---

    // Glowing magma core interior
    const magmaCore = k.box(0.180, 0.200, 0.330, magma);
    magmaCore.position.set(0, 0.70, 0.01);
    g.add(magmaCore);

    const innerCoreHot = k.box(0.192, 0.180, 0.340, magmaHot);
    innerCoreHot.position.set(0, 0.70, 0.01);
    g.add(innerCoreHot);

    // Fractured black basalt rock blocks (clumped jagged stones)
    const stoneBlocks = [
      // Top blocks
      [0.210, 0.055, 0.120, 0.0, 0.775, 0.090],
      [0.210, 0.055, 0.120, 0.0, 0.775, -0.070],
      // Bottom blocks
      [0.210, 0.052, 0.120, 0.0, 0.615, 0.090],
      [0.210, 0.052, 0.120, 0.0, 0.615, -0.070],
      // Middle sides left/right
      [0.050, 0.130, 0.120, -0.095, 0.695, 0.090],
      [0.050, 0.130, 0.120, 0.095, 0.695, 0.090],
      [0.050, 0.130, 0.120, -0.095, 0.695, -0.070],
      [0.050, 0.130, 0.120, 0.095, 0.695, -0.070],
      // Jagged basalt chunk variants
      [0.090, 0.070, 0.080, -0.060, 0.730, 0.140],
      [0.090, 0.070, 0.080, 0.060, 0.730, 0.140],
      [0.090, 0.070, 0.080, -0.060, 0.650, 0.140],
      [0.090, 0.070, 0.080, 0.060, 0.650, 0.140],
      [0.090, 0.070, 0.080, -0.060, 0.730, -0.125],
      [0.090, 0.070, 0.080, 0.060, 0.730, -0.125],
      [0.090, 0.070, 0.080, -0.060, 0.650, -0.125],
      [0.090, 0.070, 0.080, 0.060, 0.650, -0.125],
    ];
    for (const [w, h, d, x, y, z] of stoneBlocks) {
      const rock = k.box(w, h, d, basalt);
      rock.position.set(x, y, z);
      g.add(rock);
    }

    // Extra rough rocky angled facets on sides
    for (const [x, y, z] of [
      [-0.095, 0.70, 0.13],
      [0.095, 0.70, 0.13],
      [-0.095, 0.70, -0.11],
      [0.095, 0.70, -0.11],
    ]) {
      const wedge = k.cone(0.045, 0.06, 5, basalt);
      wedge.position.set(x, y, z);
      wedge.rotation.z = x > 0 ? -1.2 : 1.2;
      g.add(wedge);
    }

    // --- 5. HEAVY INDUSTRIAL STEEL REINFORCEMENTS & CAGE ---

    // Horizontal riveted iron bands wrapping the stone head
    for (const y of [0.635, 0.755]) {
      const bandOuter = k.box(0.224, 0.024, 0.355, scorchedSteel);
      bandOuter.position.set(0, y, 0.01);
      g.add(bandOuter);

      // Heavy studs on the bands
      for (const z of [-0.155, -0.05, 0.05, 0.165]) {
        for (const x of [-0.114, 0.114]) {
          const bolt = k.sphere(0.008, 0, 'iron_rough');
          bolt.position.set(x, y, z);
          g.add(bolt);
        }
      }
    }

    // Vertical structural clamp ribs
    for (const z of [-0.145, 0.160]) {
      const ribL = k.box(0.016, 0.170, 0.025, scorchedSteel);
      ribL.position.set(-0.106, 0.695, z);
      g.add(ribL);
      const ribR = k.box(0.016, 0.170, 0.025, scorchedSteel);
      ribR.position.set(0.106, 0.695, z);
      g.add(ribR);
    }

    // --- 6. TOP REBAR CAGE & ERUPTING VENT (y: 0.79 to 0.85) ---
    const topVent = k.cyl(0.055, 0.070, 0.025, 8, magmaHot);
    topVent.position.set(0, 0.795, 0.01);
    g.add(topVent);

    // Rebar protective cage arches
    const bar1 = k.tube(
      [
        [-0.075, 0.77, 0.01],
        [-0.05, 0.825, 0.01],
        [0.05, 0.825, 0.01],
        [0.075, 0.77, 0.01],
      ],
      0.007,
      5,
      scorchedSteel
    );
    g.add(bar1);

    const bar2 = k.tube(
      [
        [0.0, 0.77, -0.065],
        [0.0, 0.825, -0.04],
        [0.0, 0.825, 0.06],
        [0.0, 0.77, 0.085],
      ],
      0.007,
      5,
      scorchedSteel
    );
    g.add(bar2);

    const barRing = k.tube(
      [
        [-0.045, 0.825, 0.01],
        [0.0, 0.825, 0.055],
        [0.045, 0.825, 0.01],
        [0.0, 0.825, -0.035],
        [-0.045, 0.825, 0.01],
      ],
      0.006,
      5,
      scorchedSteel
    );
    g.add(barRing);

    // --- 7. BACK EXHAUST MECHANISM & PIPING (-Z side, z: -0.19 to -0.25) ---
    const exhaustBox = k.box(0.080, 0.080, 0.060, scorchedSteel);
    exhaustBox.position.set(0, 0.695, -0.195);
    g.add(exhaustBox);

    const exhaustValve = k.cyl(0.036, 0.036, 0.040, 8, scorchedSteel);
    exhaustValve.position.set(0, 0.695, -0.225);
    exhaustValve.rotation.x = Math.PI / 2;
    g.add(exhaustValve);

    const valveWheel = k.cyl(0.038, 0.038, 0.010, 6, 'brass');
    valveWheel.position.set(0, 0.745, -0.205);
    g.add(valveWheel);

    const exhaustPipeLeft = k.tube(
      [
        [-0.04, 0.695, -0.19],
        [-0.085, 0.695, -0.17],
        [-0.085, 0.625, -0.12],
      ],
      0.008,
      4,
      copperPipe
    );
    g.add(exhaustPipeLeft);

    const exhaustPipeRight = k.tube(
      [
        [0.04, 0.695, -0.19],
        [0.085, 0.695, -0.17],
        [0.085, 0.625, -0.12],
      ],
      0.008,
      4,
      copperPipe
    );
    g.add(exhaustPipeRight);

    // --- 8. BRUTAL IMPACT STRIKING FACE (+Z side, z: 0.17 to 0.23) ---
    const impactBase = k.box(0.180, 0.165, 0.035, scorchedSteel);
    impactBase.position.set(0, 0.695, 0.185);
    g.add(impactBase);

    // Jagged basalt/steel crushing teeth across impact surface
    const pyramidPositions = [
      [-0.060, 0.745], [0.0, 0.745], [0.060, 0.745],
      [-0.060, 0.695], [0.0, 0.695], [0.060, 0.695],
      [-0.060, 0.645], [0.0, 0.645], [0.060, 0.645],
    ];

    for (const [px, py] of pyramidPositions) {
      const tooth = k.cone(0.024, 0.028, 4, basalt);
      tooth.position.set(px, py, 0.205);
      tooth.rotation.x = Math.PI / 2;
      tooth.rotation.y = Math.PI / 4;
      g.add(tooth);

      const toothTip = k.cone(0.014, 0.016, 4, magmaHot);
      toothTip.position.set(px, py, 0.218);
      toothTip.rotation.x = Math.PI / 2;
      toothTip.rotation.y = Math.PI / 4;
      g.add(toothTip);
    }

    // Heavy corner brackets on impact face
    for (const [bx, by] of [
      [-0.085, 0.76], [0.085, 0.76],
      [-0.085, 0.63], [0.085, 0.63],
    ]) {
      const bracket = k.box(0.024, 0.024, 0.024, scorchedSteel);
      bracket.position.set(bx, by, 0.195);
      g.add(bracket);
    }

    // Markers on the striking zone
    k.marker(g, 'base', [0, 0.695, -0.19]);
    k.marker(g, 'tip', [0, 0.695, 0.23]);

    return g;
  },
};