// Dao rạch không gian — lưỡi là khe nứt đen viền trắng xám như kính vỡ.
export default {
  meta: {
    id: 'dao_khe_nut', name: 'Dao Rạch Không Gian', family: 'dao', level: 45,
    inspiration: 'Kính vỡ; vết nứt của không gian',
    look: 'lưỡi là mảnh kính vỡ răng cưa đen thẫm viền trắng xám, vết nứt tỏa ra mặt lưỡi, ba mảnh vỡ lơ lửng quanh mũi, chuôi thép đen',
    power: { score: 10, note: 'dịch chuyển chém xuyên người' },
    effects: ['đòn nặng: dịch chuyển 12 m theo hướng nhắm, chém mọi người trên đường 25', 'nhảy 3 lần', 'bão dao'],
    lengthM: 0.62,
  },
  build(k) {
    const g = k.group();
    const glass = k.paint('#d3d8e0', true), void_ = k.paint('#06060a');
    const outer = [[-0.02, 0.07], [0.02, 0.07], [0.05, 0.14], [0.035, 0.17], [0.075, 0.24], [0.045, 0.28], [0.065, 0.36], [0.03, 0.4], [0.014, 0.5], [-0.012, 0.42], [-0.045, 0.38], [-0.03, 0.32], [-0.07, 0.27], [-0.04, 0.22], [-0.058, 0.15], [-0.04, 0.11]];
    const a = k.blade(outer, 0.012, glass, 0.6); g.add(a);
    const inner = k.blade(outer.map(([z, y]) => [z * 0.66, 0.28 + (y - 0.28) * 0.84]), 0.02, void_, 0.2); g.add(inner);
    // cracks fanning across the face: thin plates crossing the whole thickness
    [[0.2, 0.03, 0.4], [0.27, -0.02, -0.5], [0.33, 0.015, 0.8], [0.4, -0.01, -0.3]].forEach(([y, z, r]) => {
      const c = k.box(0.024, 0.07, 0.006, glass); c.position.set(0, y, z); c.rotation.x = r; g.add(c);
    });
    // floating shards near the tip, evenly spaced
    [[0.08, 0.3, 0.05], [-0.07, 0.42, 0.1], [0.06, 0.52, -0.05]].forEach(([x, y, z], i) => {
      const s = k.blade([[0, 0], [0.02, 0.01], [0.005, 0.045]], 0.006, i % 2 ? glass : void_, 0.4); s.position.set(x, y, z); s.rotation.set(i, i * 0.7, i * 1.3); g.add(s);
    });
    const gd = k.box(0.03, 0.02, 0.1, 'steel_dark'); gd.position.y = 0.062; g.add(gd);
    const gr = k.cyl(0.016, 0.018, 0.12, 8, 'steel_dark'); g.add(gr);
    g.add(k.wrap(-0.055, 0.055, 0.0185, 4, 'cloth_dark'));
    const pm = k.box(0.03, 0.03, 0.03, glass); pm.position.y = -0.075; pm.rotation.set(0.6, 0.6, 0); g.add(pm);
    k.marker(g, 'base', [0, 0.07, 0]); k.marker(g, 'tip', [0, 0.5, 0.014]);
    return g;
  },
};
