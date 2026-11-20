// Búa sấm — đầu đá nặng, cuộn dây đồng quấn quanh, cọc thu lôi đồng ở hai đầu.
export default {
  meta: {
    id: 'bua_sam', name: 'Búa Sấm', family: 'bua', level: 33,
    inspiration: 'Búa Mjölnir dạng đá cổ; cuộn dây Tesla',
    look: 'khối đá xám vuông, cuộn dây đồng dày quấn quanh đầu, cọc đồng nhọn trên đỉnh và hai mặt, cán gỗ sẫm đai đồng',
    power: { score: 7, note: 'phóng sét lan' },
    effects: ['đòn nặng phóng sét lan 3 mục tiêu trong 8 m', 'bắn bay', 'đẩy'],
    lengthM: 1.35,
  },
  build(k) {
    const g = k.group();
    const gem = k.paint('#4f86b8', true);
    const cy = 0.66;
    const block = k.box(0.15, 0.17, 0.3, 'stone'); block.position.y = cy; g.add(block);
    for (const z of [-1, 1]) {            // faces: copper plates with a spike each
      const pl = k.box(0.16, 0.18, 0.012, 'copper'); pl.position.set(0, cy, z * 0.155); g.add(pl);
      const sp = k.cone(0.03, 0.12, 6, 'copper'); sp.position.set(0, cy, z * 0.22); sp.rotation.x = z * Math.PI / 2; g.add(sp);
    }
    // the coil: wire wrapped around the head's long axis (Z)
    const coil = k.group(); coil.rotation.x = Math.PI / 2; coil.position.y = cy;
    coil.add(k.wrap(-0.11, 0.11, 0.1, 5, 'copper', 4)); g.add(coil);
    // lightning rod on top, with a gem
    const rod = k.cyl(0.008, 0.016, 0.14, 6, 'copper'); rod.position.y = cy + 0.15; g.add(rod);
    const gm = k.sphere(0.028, 0, gem); gm.position.y = cy + 0.24; g.add(gm);
    // zig-zag lightning inlay on the side face
    g.add(k.tube([[0.081, cy + 0.07, -0.09], [0.083, cy + 0.02, -0.03], [0.083, cy + 0.035, 0.0], [0.083, cy - 0.03, 0.06], [0.081, cy - 0.07, 0.1]], 0.007, 4, 'brass'));
    const col = k.lathe([[0, cy - 0.12], [0.03, cy - 0.12], [0.036, cy - 0.15], [0.03, cy - 0.2], [0, cy - 0.2]], 8, 'iron_rough'); g.add(col);
    const haft = k.cyl(0.02, 0.023, 1.0, 8, 'wood_dark'); haft.position.y = 0.1; g.add(haft);
    g.add(k.wrap(-0.14, 0.14, 0.0245, 6, 'leather'));
    for (const y of [0.3, 0.46, -0.3]) { const b = k.cyl(0.027, 0.027, 0.016, 8, 'copper'); b.position.y = y; g.add(b); }
    const pm = k.lathe([[0, -0.43], [0.026, -0.41], [0.03, -0.36], [0.024, -0.34], [0, -0.34]], 8, 'copper'); g.add(pm);
    k.marker(g, 'base', [0, 0.5, 0]); k.marker(g, 'tip', [0, cy, 0.3]);
    return g;
  },
};
