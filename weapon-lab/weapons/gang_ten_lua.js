// Găng tên lửa — nắm đấm thép đỏ có ống phản lực sau cổ tay và đầu tên lửa trên mu bàn tay.
export default {
  meta: {
    id: 'gang_ten_lua', name: 'Găng Tên Lửa', family: 'tay', level: 30,
    inspiration: 'Cánh tay robot hoạt hình; tên lửa đồ chơi',
    look: 'găng thép sơn đỏ, một ống tên lửa trắng sọc đỏ gắn dọc mu bàn tay mũi nhọn vượt qua khớp ngón, loa phun đồng sau cổ tay, hai cánh đuôi',
    power: { score: 6, note: 'nắm đấm bay ra như tên lửa' },
    effects: ['đòn nặng: nắm đấm bay ra như tên lửa 20 m, nổ r 3 m', 'kéo', 'sét'],
    lengthM: 0.53,
  },
  build(k) {
    const g = k.group();
    const red = k.paint('#a8301f', true), white = k.paint('#e8e2d4', true);
    // cuff + forearm guard
    const cuff = k.cyl(0.046, 0.04, 0.2, 8, red); cuff.position.y = -0.11; g.add(cuff);
    for (const y of [-0.19, -0.03]) { const r = k.cyl(0.05, 0.05, 0.018, 8, 'steel_dark'); r.position.y = y; g.add(r); }
    // fist
    const palm = k.box(0.09, 0.08, 0.066, red); palm.position.y = 0.04; g.add(palm);
    for (let i = 0; i < 4; i++) { const f = k.box(0.021, 0.026, 0.05, 'steel'); f.position.set(-0.033 + i * 0.022, 0.095, 0.0); g.add(f); }
    const th = k.box(0.028, 0.055, 0.034, red); th.position.set(-0.055, 0.045, -0.022); g.add(th);
    // rocket pod along the back of the hand/forearm (+Z)
    const pod = k.cyl(0.026, 0.026, 0.27, 8, white); pod.position.set(0, -0.03, 0.062); g.add(pod);
    for (const y of [-0.1, -0.02]) { const s = k.cyl(0.0275, 0.0275, 0.03, 8, red); s.position.set(0, y, 0.062); g.add(s); }
    const nose = k.cone(0.026, 0.09, 8, red); nose.position.set(0, 0.145, 0.062); g.add(nose);
    for (const s of [-1, 1]) { const fin = k.blade([[0, 0], [0.05, 0], [0, 0.07]], 0.008, red, 0.5); fin.position.set(s * 0.026, -0.14, 0.062); fin.rotation.y = s * Math.PI / 2; g.add(fin); }
    // exhaust nozzle at the wrist end, opening toward the elbow
    g.add(k.lathe([[0.018, -0.27], [0.034, -0.27], [0.046, -0.24], [0.032, -0.2], [0, -0.2]], 8, 'copper'));
    const fl = k.cone(0.024, 0.07, 6, k.paint('#ee7a22', true)); fl.position.y = -0.3; fl.rotation.x = Math.PI; g.add(fl);
    k.marker(g, 'base', [0, 0.095, 0]); k.marker(g, 'tip', [0, 0.12, 0.0]);
    return g;
  },
};
