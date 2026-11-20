// Búa núi — đầu búa là một ngọn núi nhỏ có tuyết trên đỉnh và vài cây thông tí hon.
export default {
  meta: {
    id: 'bua_nui', name: 'Búa Núi', family: 'bua', level: 42,
    inspiration: 'Mô hình núi để bàn; cây thông tí hon',
    look: 'đế đất nâu phủ cỏ, hai đỉnh núi đá xám chóp tuyết, bốn cây thông tí hon, cán gỗ to đai sắt',
    power: { score: 9, note: 'khe nứt hất tung cả hàng' },
    effects: ['đòn nặng tạo khe nứt chạy 14 m hất tung người trên đường', 'trọng lực'],
    lengthM: 1.42,
  },
  build(k) {
    const g = k.group();
    const earth = k.paint('#5b4430'), grass = k.paint('#456b30'), snow = k.paint('#f0f4f6'), pine = k.paint('#1f4a2c');
    const haft = k.cyl(0.023, 0.027, 0.85, 8, 'wood'); haft.position.y = 0.075; g.add(haft);
    g.add(k.wrap(-0.2, 0.15, 0.0285, 7, 'leather'));
    for (const y of [0.3, 0.42]) { const b = k.cyl(0.032, 0.032, 0.02, 8, 'iron_rough'); b.position.y = y; g.add(b); }
    const pm = k.lathe([[0, -0.4], [0.03, -0.38], [0.036, -0.33], [0.03, -0.3], [0, -0.3]], 8, 'iron_rough'); g.add(pm);
    // base slab: earth with a grass skin
    const base = k.lathe([[0, 0.47], [0.1, 0.47], [0.2, 0.5], [0.23, 0.56], [0.23, 0.64], [0.2, 0.66], [0, 0.66]], 8, earth); g.add(base);
    const turf = k.cyl(0.215, 0.205, 0.03, 8, grass); turf.position.y = 0.655; g.add(turf);
    // two peaks (one tall, one stubby) + snow caps sunk over the tips
    const p1 = k.cone(0.15, 0.32, 6, 'stone'); p1.position.set(-0.03, 0.82, -0.03); g.add(p1);
    const s1 = k.cone(0.06, 0.11, 6, snow); s1.position.set(-0.03, 0.965, -0.03); g.add(s1);
    const p2 = k.cone(0.11, 0.2, 6, 'stone'); p2.position.set(0.0, 0.76, 0.13); g.add(p2);
    const s2 = k.cone(0.044, 0.07, 6, snow); s2.position.set(0.0, 0.84, 0.13); g.add(s2);
    // tiny pines
    [[0.14, 0.04], [0.15, -0.1], [-0.14, 0.14], [0.06, 0.2]].forEach(([x, z], i) => {
      const t = k.cyl(0.005, 0.005, 0.03, 4, 'wood_dark'); t.position.set(x, 0.69, z); g.add(t);
      const c1 = k.cone(0.026, 0.05, 5, pine); c1.position.set(x, 0.725, z); g.add(c1);
      const c2 = k.cone(0.018, 0.04, 5, pine); c2.position.set(x, 0.76, z); g.add(c2);
    });
    k.marker(g, 'base', [0, 0.55, 0]); k.marker(g, 'tip', [0, 0.78, 0.22]);
    return g;
  },
};
