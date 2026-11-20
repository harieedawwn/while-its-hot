// Kiếm hắc thạch — đá núi lửa đen bóng, cạnh mẻ răng cưa, khe nứt cam như dung nham.
export default {
  meta: {
    id: 'kiem_hac_thach', name: 'Kiếm Hắc Thạch', family: 'kiem', level: 30,
    inspiration: 'Kiếm đá obsidian của người Aztec (macuahuitl) lai dung nham',
    look: 'lưỡi đá đen bóng cạnh mẻ răng cưa, khe nứt cam sáng chạy chéo, chắn tay thép sẫm thô, chuôi da',
    power: { score: 6, note: 'để lại vết nứt dung nham, sát thương theo thời gian' },
    effects: ['mỗi đòn trúng để lại vết nứt dung nham 3 s', 'vệt chém bay đốt'],
    lengthM: 1.18,
  },
  build(k) {
    const g = k.group();
    const rock = k.paint('#17151a'), lava = k.paint('#ee6a1c', true);
    // chipped double-edged slab: width zig-zags along the length (the chips)
    g.add(k.edge({
      spine: [[0, 0.16], [0, 0.45], [0, 0.78], [0, 1.0]],
      width: [0.07, 0.095, 0.07, 0.1, 0.066, 0.088, 0.05, 0.062, 0.0],
      edge: 'both', thickness: 0.022, edgeThickness: 0.004, bevel: 0.45, taper: 0.3, smooth: 1, slot: rock,
    }));
    // lava cracks: slim slanted plates sunk through the faces
    [[0.3, 0.5, 0.012], [0.46, -0.6, 0.016], [0.62, 0.45, 0.012], [0.78, -0.5, 0.01], [0.9, 0.4, 0.008]].forEach(([y, a, w]) => {
      const c = k.box(0.028, 0.08, w * 1.5, lava); c.position.set(0, y, 0); c.rotation.x = a; g.add(c);
    });
    // chunky stone guard: two raw steel-dark wedges clamping the slab
    const gd = k.box(0.05, 0.035, 0.19, 'steel_dark'); gd.position.set(0, 0.155, 0); g.add(gd);
    for (const z of [-0.1, 0.1]) { const t = k.cone(0.026, 0.07, 5, 'iron_rough'); t.position.set(0, 0.19, z); g.add(t); }
    const clamp = k.box(0.04, 0.06, 0.075, 'iron_rough'); clamp.position.set(0, 0.19, 0); g.add(clamp);
    // grip
    const gr = k.cyl(0.018, 0.019, 0.27, 8, 'leather'); gr.position.y = 0.01; g.add(gr);
    g.add(k.wrap(-0.12, 0.13, 0.02, 6, 'cloth_dark'));
    const pm = k.lathe([[0, -0.17], [0.026, -0.155], [0.032, -0.13], [0.026, -0.115], [0, -0.115]], 6, 'steel_dark'); g.add(pm);
    const ember = k.sphere(0.014, 0, lava); ember.position.set(0, -0.172, 0); g.add(ember);
    k.marker(g, 'base', [0, 0.2, 0]); k.marker(g, 'tip', [0, 1.0, 0]);
    return g;
  },
};
