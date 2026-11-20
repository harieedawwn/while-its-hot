export default {
  meta: {
    id: 'dao_hai_luoi',
    name: 'Dao hai lưỡi',
    family: 'dao',
    level: 12,
    inspiration: 'Đoản đao hai đầu dáng chữ S cho lối đánh trượt áp sát và xoay trở nhanh',
    look: 'hai lưỡi cong ngược chiều tạo dáng chữ S qua cán giữa bọc dây đỏ, chắn tay thép sẫm vuốt nhọn, cổ đồng thau tán đinh',
    power: { score: 5, note: 'cơ động cao, dồn sát thương mạnh ngay sau cú trượt và khi đánh lén sau lưng' },
    effects: [
      'trượt dài thêm 30%',
      'đòn đầu sau khi trượt tăng 30% sát thương',
      'đánh lưng gây thêm 50% sát thương',
    ],
    lengthM: 0.52,
  },
  build(k) {
    const g = k.group();

    // --- central grip (y: -0.064 to +0.064) ---
    const grip = k.lathe([
      [0.0, -0.064], [0.0155, -0.064], [0.0175, -0.035], [0.0185, 0.0],
      [0.0175, 0.035], [0.0155, 0.064], [0.0, 0.064],
    ], 8, 'leather');
    g.add(grip);

    // center balance ring + flanking rims + studs
    g.add(k.cyl(0.0195, 0.0195, 0.016, 8, 'brass'));
    for (const y of [-0.009, 0.009]) {
      const rim = k.cyl(0.0205, 0.0205, 0.004, 8, 'steel_dark');
      rim.position.y = y;
      g.add(rim);
    }
    for (const [x, z] of [[0.02, 0], [-0.02, 0], [0, 0.02], [0, -0.02]]) {
      const stud = k.sphere(0.0036, 0, 'brass');
      stud.position.set(x, 0, z);
      g.add(stud);
    }

    // crimson cord wraps flanking the center balance ring
    g.add(k.wrap(0.011, 0.055, 0.0182, 4, 'cloth_red'));
    g.add(k.wrap(-0.055, -0.011, 0.0182, 4, 'cloth_red'));

    // helper to build one blade end pointing along +Y (rotated 180 deg around X for lower end)
    function makeEnd(opts) {
      const end = k.group();

      const trim = k.cyl(0.0185, 0.0185, 0.006, 8, 'cloth_red');
      trim.position.y = 0.057;
      end.add(trim);

      const collar = k.lathe([
        [0.0, 0.058], [0.018, 0.058], [0.021, 0.064], [0.024, 0.070],
        [0.024, 0.077], [0.019, 0.084], [0.0, 0.084],
      ], 8, 'steel_dark');
      end.add(collar);

      const habaki = k.box(0.016, 0.024, 0.034, 'brass');
      habaki.position.set(0, 0.086, 0.006);
      end.add(habaki);

      for (const x of [-0.008, 0.008]) {
        const pin = k.sphere(0.0034, 0, 'steel_dark');
        pin.position.set(x, 0.088, 0.006);
        end.add(pin);
      }

      // swept S-guard wing protecting the edge side + short rear thumb stop
      const guard = k.blade([
        [-0.020, 0.062], [-0.040, 0.046], [-0.028, 0.073],
        [0.018, 0.080], [opts.fangZ, opts.fangY], [0.038, 0.084], [0.018, 0.062],
      ], 0.012, 'steel_dark', 0.0025);
      end.add(guard);

      const guardBolt = k.cyl(0.0038, 0.0038, 0.015, 6, 'brass');
      guardBolt.rotation.z = Math.PI / 2;
      guardBolt.position.set(0, 0.082, 0.028);
      end.add(guardBolt);

      // curved single-edge blade with fuller
      const blade = k.edge({
        spine: opts.spine,
        width: opts.width,
        edge: 'front',
        thickness: opts.thickness,
        edgeThickness: 0.0015,
        bevel: 0.55,
        taper: 0.45,
        smooth: 6,
        slot: 'steel',
        fuller: { from: 0.08, to: opts.fullerTo, at: 0.22, width: 0.22, slot: 'steel_dark' },
      });
      end.add(blade);

      // forged dorsal notch ridge embedded into the spine
      const ridge = k.blade(opts.ridge, opts.thickness - 0.0025, 'steel_dark', 0.002);
      end.add(ridge);

      // brass ricasso pin
      const ricassoPin = k.cyl(0.0036, 0.0036, opts.thickness + 0.002, 6, 'brass');
      ricassoPin.rotation.z = Math.PI / 2;
      ricassoPin.position.set(0, opts.pinY, 0.002);
      end.add(ricassoPin);

      return end;
    }

    // --- upper primary blade (+Y, sharp edge toward +Z, sweeps gently back) ---
    const upper = makeEnd({
      fangZ: 0.048,
      fangY: 0.110,
      thickness: 0.011,
      fullerTo: 0.62,
      pinY: 0.112,
      spine: [[-0.008, 0.078], [-0.006, 0.115], [-0.008, 0.160], [-0.015, 0.205], [-0.024, 0.245], [-0.030, 0.275]],
      width: [0.028, 0.034, 0.038, 0.036, 0.022, 0.0],
      ridge: [[-0.002, 0.092], [-0.013, 0.096], [-0.014, 0.150], [-0.019, 0.158], [-0.009, 0.162], [-0.002, 0.154]],
    });
    g.add(upper);

    // --- lower secondary blade (-Y, rotated 180 deg around X for S-curve silhouette) ---
    const lower = makeEnd({
      fangZ: 0.044,
      fangY: 0.104,
      thickness: 0.010,
      fullerTo: 0.58,
      pinY: 0.108,
      spine: [[-0.008, 0.078], [-0.006, 0.110], [-0.009, 0.148], [-0.017, 0.186], [-0.024, 0.218], [-0.028, 0.245]],
      width: [0.026, 0.031, 0.034, 0.030, 0.018, 0.0],
      ridge: [[-0.002, 0.092], [-0.013, 0.096], [-0.014, 0.138], [-0.018, 0.145], [-0.009, 0.149], [-0.002, 0.142]],
    });
    lower.rotation.x = Math.PI;
    g.add(lower);

    k.marker(g, 'base', [0, 0.09, 0.008]);
    k.marker(g, 'tip', [0, 0.275, -0.03]);
    return g;
  },
};