// Tay trời — găng đồng vàng khắc mây, vòng kim loại lơ lửng sau cổ tay.
export default {
  meta: {
    id: 'gang_troi', name: 'Tay Trời', family: 'tay', level: 45,
    inspiration: 'Tượng thần mây; vòng hào quang trong tranh cổ',
    look: 'găng đồng vàng sáng, cổ tay nở ra thành ba cụm mây tròn, tia vàng khắc dọc mu bàn tay, một vòng kim loại lớn lơ lửng quanh cẳng tay sau cổ tay, hai cụm mây nhỏ bay trước khớp ngón',
    power: { score: 10, note: 'bàn tay từ trời ấn xuống' },
    effects: ['đòn nặng: bàn tay khổng lồ từ trời ấn xuống r 7 m, 50', 'mọi đòn nhẹ đẩy 4 m', 'đánh trúng hồi máu'],
    lengthM: 0.48,
  },
  build(k) {
    const g = k.group();
    const gold = k.paint('#e8b840', true), pale = k.paint('#f6e6b8', true);
    const cuff = k.cyl(0.04, 0.034, 0.2, 8, gold); cuff.position.y = -0.1; g.add(cuff);
    // cloud puffs flaring at the wrist
    [[-0.045, -0.02, 0.0, 0.032], [0.045, -0.02, 0.0, 0.032], [0.0, -0.02, 0.05, 0.034], [0.0, -0.025, -0.05, 0.03], [0.0, -0.07, 0.0, 0.05]].forEach(([x, y, z, r]) => {
      const c = k.sphere(r, 1, pale); c.position.set(x, y, z); g.add(c);
    });
    const palm = k.box(0.09, 0.08, 0.066, gold); palm.position.y = 0.045; g.add(palm);
    for (let i = 0; i < 4; i++) { const f = k.box(0.021, 0.028, 0.052, gold); f.position.set(-0.033 + i * 0.022, 0.1, 0); g.add(f); }
    const th = k.box(0.028, 0.055, 0.034, gold); th.position.set(-0.055, 0.05, -0.022); g.add(th);
    // engraved rays on the back of the hand (thin plates sunk in the surface)
    [-0.03, -0.01, 0.01, 0.03].forEach((x, i) => { const r = k.box(0.006, 0.06, 0.012, pale); r.position.set(x, 0.045, 0.034); r.rotation.z = (i - 1.5) * 0.18; g.add(r); });
    // floating halo ring around the forearm, behind the wrist
    const ring = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; ring.push([Math.cos(a) * 0.11, -0.2, Math.sin(a) * 0.11]); }
    g.add(k.tube(ring, 0.01, 5, 'brass'));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; const t = k.cone(0.012, 0.045, 4, gold); t.position.set(Math.cos(a) * 0.14, -0.2, Math.sin(a) * 0.14); t.rotation.z = -Math.cos(a) * Math.PI / 2; t.rotation.x = Math.sin(a) * Math.PI / 2; g.add(t); }
    // two small clouds ahead of the knuckles
    [[-0.03, 0.2, 0.0, 0.03], [0.035, 0.24, 0.02, 0.022]].forEach(([x, y, z, r]) => { const c = k.sphere(r, 1, pale); c.position.set(x, y, z); g.add(c); });
    k.marker(g, 'base', [0, 0.1, 0]); k.marker(g, 'tip', [0, 0.18, 0.0]);
    return g;
  },
};
