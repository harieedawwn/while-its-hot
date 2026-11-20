// Búa cao su — đầu cao su vàng quá khổ, cán gỗ quấn thừng dày.
export default {
  meta: {
    id: 'bua_cao_su', name: 'Búa Cao Su', family: 'bua', level: 30,
    inspiration: 'Búa đồ chơi hoạt hình, búa nện cọc hề',
    look: 'đầu cao su vàng hình trống phình hai gờ sẫm, hai đầu lõm, cán gỗ quấn thừng dày, đai sắt nhỏ ở cổ',
    power: { score: 6, note: 'hất bay, nảy tường' },
    effects: ['đòn nặng bắn địch bay 15 m, nảy trên tường', 'đòn nhẹ đẩy 4 m'],
    lengthM: 1.22,
  },
  build(k) {
    const g = k.group();
    const rubber = k.paint('#f4c81e'), rubberDark = k.paint('#c48f0e'), rope = k.paint('#cdb784');
    // head: barrel lathe turned to lie along Z, dished ends
    const head = k.lathe([[0, -0.19], [0.07, -0.18], [0.115, -0.15], [0.13, -0.08], [0.13, 0.08], [0.115, 0.15], [0.07, 0.18], [0, 0.19]], 10, rubber);
    head.rotation.x = Math.PI / 2; head.position.y = 0.66; g.add(head);
    for (const z of [-0.09, 0.09]) { const b = k.cyl(0.139, 0.139, 0.028, 10, rubberDark); b.rotation.x = Math.PI / 2; b.position.set(0, 0.66, z); g.add(b); }
    // ferrule where the haft enters the head
    g.add(k.lathe([[0, 0.5], [0.032, 0.5], [0.034, 0.56], [0.03, 0.6], [0, 0.6]], 8, 'iron_rough'));
    const haft = k.cyl(0.02, 0.023, 1.0, 8, 'wood'); haft.position.y = 0.1; g.add(haft);
    g.add(k.wrap(-0.2, 0.34, 0.0265, 9, rope, 4));
    g.add(k.wrap(0.38, 0.5, 0.025, 3, rope, 4));
    const knob = k.sphere(0.04, 1, rubber); knob.position.y = -0.38; g.add(knob);
    const cap = k.cyl(0.026, 0.026, 0.014, 8, 'iron_rough'); cap.position.y = -0.34; g.add(cap);
    k.marker(g, 'base', [0, 0.6, 0]); k.marker(g, 'tip', [0, 0.66, 0.19]);
    return g;
  },
};
