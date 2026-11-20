// Kiếm mặt trời — lưỡi kim loại trắng vàng, đĩa mặt trời có tia sau chắn tay.
export default {
  meta: {
    id: 'kiem_mat_troi', name: 'Kiếm Mặt Trời', family: 'kiem', level: 45,
    inspiration: 'Huy hiệu mặt trời của Inca (Inti); kiếm lễ vàng',
    look: 'lưỡi thẳng trắng vàng rất sáng, sau chắn tay là đĩa vàng tròn tỏa 12 tia, ba đốm lửa lơ lửng cạnh lưỡi',
    power: { score: 10, note: 'mọi đòn phóng vệt chém, cột lửa 15 m' },
    effects: ['mọi đòn chém phóng vệt chém', 'đòn nặng bắn cột lửa thẳng 15 m'],
    lengthM: 1.45,
  },
  build(k) {
    const g = k.group();
    const white = k.paint('#fffbe6', true), gold = k.paint('#e6b23a', true), flame = k.paint('#ff8a22', true);
    g.add(k.edge({
      spine: [[0, 0.3], [0, 0.75], [0, 1.1], [0, 1.3]], width: [0.1, 0.12, 0.1, 0.0],
      edge: 'both', thickness: 0.018, edgeThickness: 0.003, bevel: 0.5, taper: 0.3, smooth: 2, slot: white,
      fuller: { from: 0.05, to: 0.7, at: 0.35, width: 0.3, slot: gold },
    }));
    // sun disc behind the guard, axis along Z (the disc faces the wielder / the enemy)
    const disc = k.cyl(0.17, 0.17, 0.03, 12, gold); disc.rotation.x = Math.PI / 2; disc.position.set(0, 0.27, -0.01); g.add(disc);
    const core = k.cyl(0.11, 0.11, 0.045, 12, white); core.rotation.x = Math.PI / 2; core.position.set(0, 0.27, -0.01); g.add(core);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, rr = i % 2 ? 0.195 : 0.225;
      const ray = k.cone(0.026, i % 2 ? 0.08 : 0.13, 4, gold);
      ray.position.set(0, 0.27 + Math.sin(a) * rr, -0.01 + Math.cos(a) * rr);
      ray.rotation.x = Math.PI / 2 - a; g.add(ray);
    }
    const gd = k.box(0.03, 0.03, 0.2, gold); gd.position.y = 0.3; g.add(gd);
    const gr = k.cyl(0.018, 0.02, 0.28, 8, 'leather'); gr.position.y = 0.04; g.add(gr);
    g.add(k.wrap(-0.1, 0.17, 0.0205, 6, 'cloth_red'));
    const pm = k.lathe([[0, -0.15], [0.026, -0.14], [0.034, -0.11], [0.026, -0.09], [0, -0.09]], 8, gold); g.add(pm);
    [[0.14, 0.6], [-0.15, 0.9], [0.13, 1.15]].forEach(([x, y]) => {
      const f = k.cone(0.03, 0.12, 5, flame); f.position.set(x, y, 0.02); g.add(f);
    });
    k.marker(g, 'base', [0, 0.32, 0]); k.marker(g, 'tip', [0, 1.3, 0]);
    return g;
  },
};
