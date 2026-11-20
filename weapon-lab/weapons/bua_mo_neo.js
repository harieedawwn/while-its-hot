// Búa mỏ neo — mỏ neo tàu khổng lồ gỉ sét làm búa, xích to quấn thân.
export default {
  meta: {
    id: 'bua_mo_neo', name: 'Búa Mỏ Neo', family: 'bua', level: 36,
    inspiration: 'Mỏ neo tàu hải tặc; vũ khí kéo móc',
    look: 'thân neo dài làm cán, hai càng cong hình trăng khuyết có mũi vuốt ở đỉnh, vòng neo ở đáy, xích gỉ quấn thân, chốt ngang gỗ',
    power: { score: 8, note: 'ném neo kéo bạn bay tới hoặc kéo địch về' },
    effects: ['đòn nặng ném neo 14 m, kéo', 'sét'],
    lengthM: 1.45,
  },
  build(k) {
    const g = k.group();
    const rust = k.paint('#7a4a2c', true), dark = k.paint('#3e3029');
    // shank
    const shank = k.cyl(0.027, 0.034, 1.2, 8, 'iron_rough'); shank.position.y = 0.16; g.add(shank);
    g.add(k.wrap(-0.12, 0.12, 0.037, 5, 'cloth_dark', 4));           // grip: tarred rope
    // stock bar (wood) across the shank near the bottom, along Z
    const stock = k.box(0.04, 0.04, 0.5, 'wood_dark'); stock.position.y = -0.32; g.add(stock);
    for (const z of [-0.26, 0.26]) { const e = k.box(0.05, 0.05, 0.05, 'iron_rough'); e.position.set(0, -0.32, z); g.add(e); }
    // ring at the very bottom
    const ring = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; ring.push([0, -0.5 + Math.sin(a) * 0.05, Math.cos(a) * 0.05]); }
    g.add(k.tube(ring, 0.012, 5, 'iron_rough'));
    // arms: a heavy crescent across the top (along Z) ending in flukes
    g.add(k.tube([[0, 0.66, -0.34], [0, 0.56, -0.22], [0, 0.5, -0.1], [0, 0.49, 0], [0, 0.5, 0.1], [0, 0.56, 0.22], [0, 0.66, 0.34]], 0.042, 6, 'iron_rough'));
    for (const s of [-1, 1]) {
      const f = k.blade([[-0.11, 0.0], [0.11, 0.0], [0.0, 0.22]], 0.04, 'iron_rough', 0.5);
      f.position.set(0, 0.64, s * 0.35); f.rotation.x = 0; g.add(f);
      f.rotation.x = s * 0.5;
      const r = k.sphere(0.02, 0, rust); r.position.set(0, 0.7, s * 0.34); g.add(r);
    }
    const crown = k.lathe([[0, 0.44], [0.05, 0.46], [0.05, 0.54], [0.036, 0.6], [0, 0.6]], 8, 'iron_rough'); g.add(crown);
    // chain wound around the shank (spiral of small links) + a loose hanging run
    g.add(k.wrap(0.1, 0.42, 0.04, 4, dark, 4));
    for (let i = 0; i < 6; i++) { const l = k.box(0.014, 0.05, 0.03, i % 2 ? dark : 'iron_rough'); l.position.set(i % 2 ? 0.035 : -0.035, -0.12 - i * 0.04, 0.03 - i * 0.012); l.rotation.set(0, i * 0.9, 0); g.add(l); }
    k.marker(g, 'base', [0, 0.5, 0]); k.marker(g, 'tip', [0, 0.7, 0.34]);
    return g;
  },
};
