// Dao ngọc — lưỡi ngọc bích xanh, chuôi vàng chạm đầu rồng, hạt ngọc lơ lửng.
export default {
  meta: {
    id: 'dao_ngoc', name: 'Dao Ngọc', family: 'dao', level: 33,
    inspiration: 'Đao ngọc triều đình; rồng vàng trên chuôi',
    look: 'lưỡi lá bằng ngọc bích xanh có sống đậm, chắn tay vàng sừng rồng, chuôi vàng quấn thân rồng, đầu rồng ở đuôi chuôi, ba hạt ngọc bay quanh',
    power: { score: 7, note: 'đánh liền tay càng lúc càng nhanh' },
    effects: ['mỗi đòn trúng +6% tốc chạy 3 s, cộng dồn 5', 'nhảy 3 lần', 'vệt lửa'],
    lengthM: 0.5,
  },
  build(k) {
    const g = k.group();
    const jade = k.paint('#49b384'), jadeDark = k.paint('#2a7a58'), gold = k.paint('#e0aa38', true), red = k.paint('#9b2a22');
    g.add(k.edge({
      spine: [[0, 0.075], [0.006, 0.2], [0, 0.32], [-0.015, 0.4]], width: [0.04, 0.055, 0.045, 0], edge: 'front',
      thickness: 0.014, edgeThickness: 0.002, bevel: 0.55, taper: 0.4, smooth: 4, slot: jade,
      fuller: { from: 0.05, to: 0.75, at: 0.2, width: 0.25, slot: jadeDark },
    }));
    const col = k.lathe([[0, 0.06], [0.024, 0.06], [0.026, 0.08], [0.02, 0.095], [0, 0.095]], 8, gold); g.add(col);
    // guard: dragon-horn crescents
    for (const s of [-1, 1]) {
      g.add(k.tube([[0, 0.065, s * 0.015], [0, 0.07, s * 0.06], [0, 0.1, s * 0.08], [0, 0.13, s * 0.065]], 0.01, 5, gold));
    }
    // grip: gold dragon body winds around a red core
    const core = k.cyl(0.015, 0.017, 0.12, 8, red); g.add(core);
    g.add(k.wrap(-0.055, 0.058, 0.019, 3.5, gold, 4));
    // dragon head pommel
    const head = k.box(0.026, 0.03, 0.05, gold); head.position.set(0, -0.08, -0.012); g.add(head);
    const snout = k.box(0.02, 0.02, 0.03, gold); snout.position.set(0, -0.092, 0.025); g.add(snout);
    for (const s of [-1, 1]) {
      const h = k.cone(0.006, 0.04, 4, gold); h.position.set(s * 0.011, -0.058, -0.03); h.rotation.x = -0.9; g.add(h);
      const e = k.sphere(0.006, 0, red); e.position.set(s * 0.013, -0.074, 0.004); g.add(e);
    }
    // floating jade beads
    [[0.07, 0.17, 0.1], [-0.07, 0.27, 0.2], [0.06, 0.37, -0.03]].forEach(([x, y, z]) => {
      const b = k.sphere(0.014, 0, jade); b.position.set(x, y, z); g.add(b);
    });
    k.marker(g, 'base', [0, 0.095, 0]); k.marker(g, 'tip', [0, 0.4, -0.015]);
    return g;
  },
};
