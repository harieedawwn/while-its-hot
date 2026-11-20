// Dao lửa — lưỡi uốn như ngọn lửa, thép đỏ sẫm, rãnh cam, vài lưỡi lửa nhỏ mọc ngược.
export default {
  meta: {
    id: 'dao_lua', name: 'Dao Lửa', family: 'dao', level: 30,
    inspiration: 'Dao kris lượn sóng (flamberge); ngọn lửa bập bùng',
    look: 'lưỡi thép đỏ sẫm uốn ba nhịp như ngọn lửa, rãnh cam, hai mảnh lưỡi lửa nhỏ ở sống, chắn tay đồng cuộn, chuôi gỗ quấn da',
    power: { score: 6, note: 'trượt để lại vệt lửa' },
    effects: ['trượt để lại vệt lửa 2 s', 'dao ném đốt', 'dịch chuyển khi đỡ'],
    lengthM: 0.54,
  },
  build(k) {
    const g = k.group();
    const redSteel = k.paint('#8c2a1c', true), orange = k.paint('#e9731f', true);
    g.add(k.edge({
      spine: [[0, 0.07], [0.022, 0.15], [-0.02, 0.23], [0.024, 0.31], [-0.012, 0.38], [0.012, 0.45]],
      width: [0.035, 0.05, 0.046, 0.036, 0.022, 0], edge: 'both', thickness: 0.011, edgeThickness: 0.002, bevel: 0.5, taper: 0.3, smooth: 5, slot: redSteel,
      fuller: { from: 0.05, to: 0.7, at: 0.4, width: 0.2, slot: orange },
    }));
    // flame licks: small flat tongues at the spine
    [[0.12, 0.05], [0.26, -0.05]].forEach(([y, s], i) => {
      const t = k.blade([[0, 0], [s * 0.05, 0.07], [s * 0.012, 0.075], [0, 0.11]], 0.008, orange, 0.4);
      t.position.set(0, y, s > 0 ? -0.025 : 0.0); g.add(t);
    });
    const gd = k.box(0.018, 0.022, 0.1, 'copper'); gd.position.y = 0.06; g.add(gd);
    for (const s of [-1, 1]) g.add(k.tube([[0, 0.065, s * 0.045], [0, 0.085, s * 0.065], [0, 0.11, s * 0.05]], 0.008, 4, 'copper'));
    const gr = k.cyl(0.016, 0.018, 0.12, 8, 'wood_dark'); g.add(gr);
    g.add(k.wrap(-0.055, 0.055, 0.0185, 4, 'leather'));
    g.add(k.lathe([[0, -0.085], [0.016, -0.075], [0.022, -0.06], [0.016, -0.055], [0, -0.055]], 6, 'copper'));
    k.marker(g, 'base', [0, 0.07, 0]); k.marker(g, 'tip', [0, 0.45, 0.012]);
    return g;
  },
};
