// Búa sao lùn — quả cầu sao nén trắng cam kẹp trong lồng kim loại ba càng.
export default {
  meta: {
    id: 'bua_sao_lun', name: 'Búa Sao Lùn', family: 'bua', level: 45,
    inspiration: 'Sao lùn trắng; lồng chứa phản ứng trong truyện khoa học viễn tưởng',
    look: 'cán thép đen đai đồng, ba càng thép cong ôm quả cầu trắng cam, vành xích đạo, ba tia lửa lơ lửng quanh lồng',
    power: { score: 10, note: 'hố đen hút rồi nổ' },
    effects: ['đòn nặng: hố đen 3 s r 8 m hút rồi nổ 40', 'mọi đòn nhẹ có sóng đẩy'],
    lengthM: 1.39,
  },
  build(k) {
    const g = k.group();
    const star = k.paint('#ffd9a0', true), hot = k.paint('#ff9a3a', true);
    const cy = 0.7;
    const haft = k.cyl(0.021, 0.025, 0.98, 8, 'steel_dark'); haft.position.y = 0.04; g.add(haft);
    g.add(k.wrap(-0.14, 0.16, 0.0245, 6, 'leather'));
    for (const y of [0.28, 0.38, -0.3]) { const b = k.cyl(0.029, 0.029, 0.016, 8, 'copper'); b.position.y = y; g.add(b); }
    g.add(k.lathe([[0, -0.47], [0.026, -0.45], [0.032, -0.4], [0.026, -0.37], [0, -0.37]], 8, 'copper'));
    g.add(k.lathe([[0, 0.38], [0.032, 0.38], [0.06, 0.43], [0.06, 0.5], [0.04, 0.54], [0, 0.54]], 8, 'steel_dark'));
    // the star, a faceted blob, with a hotter ring
    const s = k.sphere(0.13, 1, star); s.position.y = cy; g.add(s);
    const ring = []; for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2; ring.push([Math.cos(a) * 0.15, cy, Math.sin(a) * 0.15]); }
    g.add(k.tube(ring, 0.008, 4, hot));
    // three cage claws from the collar over the sphere, meeting at a cap
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5, x = Math.sin(a), z = Math.cos(a);
      g.add(k.tube([[x * 0.05, 0.48, z * 0.05], [x * 0.14, 0.58, z * 0.14], [x * 0.19, cy, z * 0.19], [x * 0.14, cy + 0.13, z * 0.14], [x * 0.04, cy + 0.19, z * 0.04]], 0.014, 4, 'steel'));
      const sp = k.cone(0.014, 0.05, 5, 'brass'); sp.position.set(x * 0.2, cy, z * 0.2); sp.rotation.set(z * 1.5, 0, -x * 1.5); g.add(sp);
    }
    g.add(k.cyl(0.03, 0.04, 0.04, 6, 'steel')); g.children[g.children.length - 1].position.y = cy + 0.2;
    // floating sparks
    [[0.0, 0.0, 0.25], [0.21, 0.1, -0.12], [-0.2, -0.12, -0.08]].forEach(([x, y, z]) => {
      const f = k.cone(0.02, 0.07, 4, hot); f.position.set(x, cy + 0.05 + y, z); f.rotation.set(z, 0, -x); g.add(f);
    });
    k.marker(g, 'base', [0, 0.5, 0]); k.marker(g, 'tip', [0, cy, 0.19]);
    return g;
  },
};
