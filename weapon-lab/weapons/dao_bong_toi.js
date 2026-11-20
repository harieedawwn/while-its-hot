export default {
  meta: {
    id: 'dao_bong_toi',
    name: 'Dao bóng tối',
    family: 'dao',
    level: 21,
    inspiration: 'Dao sát thủ không chắn tay kết hợp dáng lưỡi khói đen phân nhánh và vòng chuôi ném',
    look: 'lưỡi đen mờ như khói có vòng sống khoét rỗng kéo vệt khói cuốn ngược và rãnh độc mảnh, không chắn tay mà vuốt liền vào cổ dao gắn ống độc, cán vải tối nối vòng chuôi ném',
    power: { score: 7, note: 'chuyên đánh lén tàng hình, rút độc và ném tầm xa' },
    effects: [
      'hạ gục kẻ địch hoặc đánh trúng lưng kích hoạt tàng hình 2 giây (ra đòn sẽ hiện hình ngay)',
      'lưỡi dao thấm độc gây sát thương theo thời gian khi chém hoặc ném trúng',
      'có thể ném dao tầm xa tốc độ cao để mở giao tranh hoặc kết liễu',
    ],
    lengthM: 0.4,
  },
  build(k) {
    const g = k.group();
    const smokeBlade = k.paint('#191a20', true);
    const smokeWisp = k.paint('#2e313c', false);
    const venom = k.paint('#46c95b', false);

    // --- main matte-black smoke blade with recessed venom fuller ---
    const blade = k.edge({
      spine: [
        [-0.008, 0.080],
        [-0.010, 0.125],
        [-0.011, 0.170],
        [-0.006, 0.215],
        [0.003, 0.258],
        [0.012, 0.295],
      ],
      width: [0.028, 0.034, 0.037, 0.033, 0.021, 0.0],
      edge: 'front',
      thickness: 0.0095,
      edgeThickness: 0.0012,
      bevel: 0.58,
      taper: 0.55,
      smooth: 6,
      slot: smokeBlade,
      fuller: { from: 0.07, to: 0.58, at: 0.24, width: 0.16, slot: venom },
    });
    g.add(blade);

    // --- split smoke-arch along the spine (pierced crescent cutout) ---
    const smokeArch = k.edge({
      spine: [
        [-0.006, 0.088],
        [-0.020, 0.118],
        [-0.028, 0.155],
        [-0.023, 0.192],
        [-0.005, 0.222],
      ],
      width: [0.008, 0.009, 0.010, 0.008, 0.005],
      edge: 'both',
      thickness: 0.0065,
      edgeThickness: 0.0012,
      bevel: 0.55,
      taper: 0.2,
      smooth: 5,
      slot: smokeWisp,
    });
    g.add(smokeArch);

    // --- rising smoke plumes curling off the spine arch ---
    const smokeWispUpper = k.edge({
      spine: [
        [-0.024, 0.175],
        [-0.031, 0.205],
        [-0.027, 0.236],
        [-0.016, 0.264],
      ],
      width: [0.007, 0.0085, 0.0055, 0.0],
      edge: 'both',
      thickness: 0.005,
      edgeThickness: 0.001,
      bevel: 0.6,
      taper: 0.5,
      smooth: 5,
      slot: smokeWisp,
    });
    g.add(smokeWispUpper);

    const smokeWispLower = k.edge({
      spine: [
        [-0.020, 0.118],
        [-0.031, 0.136],
        [-0.037, 0.158],
      ],
      width: [0.0065, 0.006, 0.0],
      edge: 'both',
      thickness: 0.0045,
      edgeThickness: 0.001,
      bevel: 0.6,
      taper: 0.5,
      smooth: 4,
      slot: smokeWisp,
    });
    g.add(smokeWispLower);

    // --- guardless seamless habaki & tapered bolster ---
    const habaki = k.blade(
      [
        [-0.013, 0.076],
        [0.018, 0.076],
        [0.021, 0.090],
        [0.006, 0.095],
        [-0.012, 0.104],
        [-0.015, 0.090],
      ],
      0.0135,
      'steel_dark',
      0.0018
    );
    g.add(habaki);

    const bolster = k.lathe(
      [
        [0.0, 0.052],
        [0.0182, 0.052],
        [0.019, 0.058],
        [0.018, 0.068],
        [0.016, 0.078],
        [0.0132, 0.088],
        [0.0, 0.09],
      ],
      8,
      'steel_dark'
    );
    bolster.scale.set(0.82, 1, 1.1);
    g.add(bolster);

    const collarBand = k.cyl(0.0198, 0.0198, 0.006, 8, smokeWisp);
    collarBand.scale.set(0.84, 1, 1.12);
    collarBand.position.y = 0.056;
    g.add(collarBand);

    // --- recessed venom ampoules feeding into the fuller ---
    for (const s of [-1, 1]) {
      const vial = k.cyl(0.0028, 0.0028, 0.018, 6, venom);
      vial.position.set(s * 0.0128, 0.073, 0.004);
      vial.rotation.z = s * 0.16;
      g.add(vial);

      const clampLo = k.box(0.0042, 0.003, 0.007, 'steel_dark');
      clampLo.position.set(s * 0.0135, 0.065, 0.004);
      g.add(clampLo);

      const clampHi = k.box(0.0042, 0.003, 0.007, 'steel_dark');
      clampHi.position.set(s * 0.0114, 0.081, 0.004);
      g.add(clampHi);
    }

    // --- seamless oval stealth grip centered at origin ---
    const gripCore = k.cyl(0.0168, 0.0178, 0.114, 8, 'leather');
    gripCore.scale.set(0.84, 1, 1.12);
    g.add(gripCore);

    const gripWrap = k.wrap(-0.05, 0.05, 0.0184, 5, 'cloth_dark');
    gripWrap.scale.set(0.84, 1, 1.12);
    g.add(gripWrap);

    for (const z of [-0.0195, 0.0195]) {
      const strap = k.box(0.0055, 0.106, 0.004, 'steel_dark');
      strap.position.set(0, 0, z);
      g.add(strap);
    }

    for (const y of [-0.026, 0.026]) {
      const pin = k.cyl(0.0032, 0.0032, 0.0305, 6, 'steel_dark');
      pin.rotation.z = Math.PI / 2;
      pin.position.y = y;
      g.add(pin);

      const pinCore = k.cyl(0.0017, 0.0017, 0.032, 6, venom);
      pinCore.rotation.z = Math.PI / 2;
      pinCore.position.y = y;
      g.add(pinCore);
    }

    // --- tapered tail cap & weighted throwing ring pommel ---
    const tailCap = k.lathe(
      [
        [0.0, -0.072],
        [0.009, -0.07],
        [0.0155, -0.062],
        [0.0185, -0.055],
        [0.0175, -0.052],
        [0.0, -0.052],
      ],
      8,
      'steel_dark'
    );
    tailCap.scale.set(0.84, 1, 1.12);
    g.add(tailCap);

    const tailBand = k.cyl(0.0195, 0.0195, 0.005, 8, smokeWisp);
    tailBand.scale.set(0.84, 1, 1.12);
    tailBand.position.y = -0.054;
    g.add(tailBand);

    for (const s of [-1, 1]) {
      const pip = k.sphere(0.0032, 0, venom);
      pip.position.set(s * 0.0105, -0.064, 0);
      g.add(pip);
    }

    const pommelRing = k.tube(
      [
        [0, -0.064, -0.005],
        [0, -0.074, -0.014],
        [0, -0.088, -0.015],
        [0, -0.098, -0.007],
        [0, -0.101, 0.003],
        [0, -0.094, 0.012],
        [0, -0.08, 0.014],
        [0, -0.068, 0.007],
        [0, -0.064, -0.005],
      ],
      0.0042,
      6,
      smokeBlade
    );
    g.add(pommelRing);

    const tailSpur = k.blade(
      [
        [-0.012, -0.086],
        [-0.015, -0.095],
        [-0.021, -0.105],
        [-0.008, -0.099],
        [-0.005, -0.092],
      ],
      0.005,
      smokeWisp,
      0.0012
    );
    g.add(tailSpur);

    k.marker(g, 'base', [0, 0.088, 0.014]);
    k.marker(g, 'tip', [0, 0.295, 0.012]);
    return g;
  },
};