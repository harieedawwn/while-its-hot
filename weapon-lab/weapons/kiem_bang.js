// Kiếm băng — lưỡi băng trắng xanh đục, tinh thể nhô ra như cành giá, chuôi bạc.
export default {
  meta: {
    id: 'kiem_bang', name: 'Kiếm Băng', family: 'kiem', level: 33,
    inspiration: 'Kiếm băng trong truyện cổ tích phương Bắc; cành cây đóng băng',
    look: 'lưỡi băng đục xanh nhạt, tinh thể mọc chéo hai bên, ba mảnh băng lơ lửng, chắn tay và chuôi bạc',
    power: { score: 7, note: 'đóng băng, mặt đất trơn' },
    effects: ['đòn 3 đóng băng 0.8 s', 'vệt chém để lại băng trơn 3 s'],
    lengthM: 1.34,
  },
  build(k) {
    const g = k.group();
    const ice = k.paint('#b8e4f2'), deep = k.paint('#5d9fc0'), frost = k.paint('#eefaff');
    g.add(k.edge({
      spine: [[0, 0.17], [0, 0.55], [0.01, 0.95], [0, 1.1]],
      width: [0.075, 0.09, 0.08, 0.05, 0],
      edge: 'both', thickness: 0.024, edgeThickness: 0.004, bevel: 0.5, taper: 0.4, smooth: 3, slot: ice,
      fuller: { from: 0.08, to: 0.7, at: 0.3, width: 0.4, slot: deep },
    }));
    // frost crystals: cones angled out of the blade edges, base buried in the blade
    [[0.32, 1], [0.42, -1], [0.55, 1], [0.66, -1], [0.78, 1]].forEach(([y, s], i) => {
      const c = k.cone(0.024 - i * 0.002, 0.22 - i * 0.016, 5, i % 2 ? frost : deep);
      c.position.set(0, y, s * 0.06); c.rotation.x = -s * 1.15; g.add(c);
    });
    // floating shards, evenly spaced along the blade
    [[0.38, 0.17, 0.2], [0.72, -0.19, -0.2], [1.02, 0.15, 0.3]].forEach(([y, x, rz]) => {
      const s = k.cone(0.02, 0.1, 4, frost); s.position.set(x, y + 0.1, 0.02); s.rotation.z = rz; g.add(s);
    });
    // silver crossguard sweeping up like frost vines
    const gd = k.box(0.026, 0.03, 0.12, 'steel'); gd.position.set(0, 0.165, 0); g.add(gd);
    for (const s of [-1, 1]) g.add(k.tube([[0, 0.165, s * 0.05], [0, 0.17, s * 0.1], [0, 0.22, s * 0.14], [0, 0.29, s * 0.13]], 0.011, 5, 'steel'));
    const gr = k.cyl(0.017, 0.018, 0.26, 8, 'steel_dark'); gr.position.y = 0.02; g.add(gr);
    for (const y of [-0.08, -0.02, 0.04, 0.1]) { const r = k.cyl(0.021, 0.021, 0.012, 8, 'steel'); r.position.y = y; g.add(r); }
    const pm = k.sphere(0.034, 1, frost); pm.position.y = -0.14; g.add(pm);
    k.marker(g, 'base', [0, 0.2, 0]); k.marker(g, 'tip', [0, 1.1, 0]);
    return g;
  },
};
