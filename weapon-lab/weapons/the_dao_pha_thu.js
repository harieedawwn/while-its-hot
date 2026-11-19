// Thế Đao Phá Thủ — naginata, cảm hứng từ thế đao của Maki Zenin.
// Proportions from the refs: blade ≈ 22% of total length, curving back, single edge on the convex side;
// thick multi-ring collar; dark slim shaft with sparse bands; pointed iron butt cap.
export default {
  meta: {
    id: 'the_dao_pha_thu',
    name: 'Thế Đao Phá Thủ',
    family: 'thuong',
    level: 8,
    inspiration: 'Thế đao chú cụ của Maki Zenin (Jujutsu Kaisen) — naginata cán dài',
    look: 'cán gỗ sẫm mảnh và dài, cổ đao nhiều vòng thép dày, lưỡi naginata cong ngược một mặt sắc có rãnh máu, chuôi dưới mũi sắt nhọn',
    power: { score: 6, note: 'tầm xa, quét rộng, đánh vỡ thế thủ' },
    effects: [
      'đòn nặng quét ngang rộng hơn các thương khác',
      'gây sát thương lớn lên thế chặn, đỡ bằng chặn bị trừ gấp đôi thể lực',
      'đánh trúng xuyên qua trạng thái bất tử ngắn (khung miễn sát thương khi né)',
    ],
    lengthM: 2.8,
  },
  build(k) {
    const g = k.group();
    const lacquer = k.paint('#1d1a1c');            // near-black lacquered shaft
    const collarSteel = 'steel_dark';

    // --- blade: spine is the concave back edge, edge on the convex front (+Z) ---
    const blade = k.edge({
      spine: [[0.0, 1.26], [-0.004, 1.40], [-0.025, 1.54], [-0.07, 1.67], [-0.14, 1.77], [-0.22, 1.83]],
      width: [0.055, 0.068, 0.072, 0.066, 0.045, 0.0],
      edge: 'front', thickness: 0.013, edgeThickness: 0.0015, bevel: 0.5, taper: 0.4, smooth: 6,
      slot: 'steel',
      fuller: { from: 0.04, to: 0.5, at: 0.18, width: 0.2, slot: 'steel_dark' },
    });
    g.add(blade);

    // --- collar (habaki + sleeve): stacked rings, widest at the blade ---
    const collar = k.lathe([[0.0, 1.10], [0.021, 1.10], [0.024, 1.13], [0.022, 1.15], [0.026, 1.17], [0.026, 1.20],
      [0.030, 1.21], [0.030, 1.245], [0.022, 1.27], [0.0, 1.27]], 8, collarSteel);
    g.add(collar);
    const habaki = k.box(0.02, 0.05, 0.07, 'brass'); habaki.position.set(0, 1.255, 0.018); g.add(habaki);
    for (const y of [1.135, 1.19]) { const r = k.cyl(0.028, 0.028, 0.008, 8, 'steel'); r.position.y = y; g.add(r); }
    for (const z of [-0.026, 0.026]) { const pin = k.sphere(0.006, 0, 'brass'); pin.position.set(0, 1.225, z); g.add(pin); }

    // --- shaft: slim, dark, a few iron bands ---
    const shaft = k.cyl(0.017, 0.018, 1.88, 8, lacquer); shaft.position.y = 0.16; g.add(shaft);
    for (const y of [0.62, 0.30, -0.40]) { const band = k.cyl(0.0205, 0.0205, 0.022, 8, 'iron_rough'); band.position.y = y; g.add(band); }

    // --- main grip at the origin: cord wrap + leather sleeve ---
    const sleeve = k.cyl(0.0195, 0.0195, 0.26, 8, 'leather'); g.add(sleeve);
    g.add(k.wrap(-0.13, 0.13, 0.021, 5, 'cloth_dark'));
    const upper = k.wrap(0.90, 1.00, 0.02, 3, 'cloth_dark'); g.add(upper);

    // --- butt cap (ishizuki): iron sleeve ending in a point ---
    const butt = k.lathe([[0.0, -0.98], [0.006, -0.95], [0.017, -0.90], [0.021, -0.84], [0.021, -0.78], [0.018, -0.77], [0.0, -0.77]], 8, 'iron_rough');
    g.add(butt);
    const buttRing = k.cyl(0.023, 0.023, 0.012, 8, 'steel_dark'); buttRing.position.y = -0.775; g.add(buttRing);

    k.marker(g, 'base', [0, 1.27, 0.03]);
    k.marker(g, 'tip', [0, 1.83, -0.22]);
    return g;
  },
};
