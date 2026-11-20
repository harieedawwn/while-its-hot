// Găng trọng lực — quả cầu đen lơ lửng trước khớp ngón giữa ba càng đồng.
export default {
  meta: {
    id: 'gang_trong_luc', name: 'Găng Trọng Lực', family: 'tay', level: 39,
    inspiration: 'Găng thu hút của nhà khoa học điên; quả cầu hố đen',
    look: 'găng đồng sẫm, ba càng đồng mảnh cong lên từ khớp ngón ôm một quả cầu đen lơ lửng, vành đồng xoay nghiêng quanh cầu',
    power: { score: 9, note: 'ném hố đen hút người' },
    effects: ['đòn nặng ném hố đen 2.5 s r 6 m', 'đòn nhẹ hút nhẹ', 'bàn tay khổng lồ'],
    lengthM: 0.5,
  },
  build(k) {
    const g = k.group();
    const orb = k.paint('#07060c');
    const cuff = k.cyl(0.048, 0.042, 0.2, 8, 'copper'); cuff.position.y = -0.11; g.add(cuff);
    for (const y of [-0.19, -0.03]) { const r = k.cyl(0.052, 0.052, 0.016, 8, 'steel_dark'); r.position.y = y; g.add(r); }
    const palm = k.box(0.09, 0.08, 0.066, 'copper'); palm.position.y = 0.04; g.add(palm);
    for (let i = 0; i < 4; i++) { const f = k.box(0.021, 0.028, 0.052, 'brass'); f.position.set(-0.033 + i * 0.022, 0.095, 0); g.add(f); }
    const th = k.box(0.028, 0.055, 0.034, 'copper'); th.position.set(-0.055, 0.045, -0.022); g.add(th);
    // three slim prongs rise from the knuckle row and curl around the orb without touching it
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.3, x = Math.sin(a), z = Math.cos(a);
      g.add(k.tube([[x * 0.025, 0.1, z * 0.02], [x * 0.065, 0.15, z * 0.06], [x * 0.085, 0.22, z * 0.085], [x * 0.06, 0.29, z * 0.06]], 0.008, 4, 'brass'));
    }
    // the orb + a tilted orbit ring
    const o = k.sphere(0.058, 1, orb); o.position.y = 0.22; g.add(o);
    const ring = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; ring.push([Math.cos(a) * 0.1, 0.22 + Math.sin(a) * 0.03, Math.sin(a) * 0.1]); }
    const rg = k.tube(ring, 0.006, 4, 'copper'); rg.rotation.z = 0.4; rg.position.y = 0; g.add(rg);
    k.marker(g, 'base', [0, 0.1, 0]); k.marker(g, 'tip', [0, 0.28, 0]);
    return g;
  },
};
