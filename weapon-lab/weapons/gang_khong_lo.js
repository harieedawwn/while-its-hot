// Găng khổng lồ — găng to gấp ba, đinh tán to bằng nắm tay.
export default {
  meta: {
    id: 'gang_khong_lo', name: 'Găng Khổng Lồ', family: 'tay', level: 36,
    inspiration: 'Găng sắt của người khổng lồ; búa tạ bọc găng',
    look: 'găng thép đen thô to gấp ba, mu bàn tay đóng sáu đinh tán đồng to như quả đấm, cổ tay đai dày, ngón tay là khối thép vuông có gờ',
    power: { score: 8, note: 'bàn tay khổng lồ đập xuống' },
    effects: ['đòn nặng: bàn tay khổng lồ hiện ra đập xuống r 4 m', 'hồi máu', 'tên lửa'],
    lengthM: 0.6,
  },
  build(k) {
    const g = k.group();
    const cuff = k.cyl(0.118, 0.105, 0.34, 8, 'steel_dark'); cuff.position.y = -0.15; g.add(cuff);
    for (const y of [-0.3, -0.06]) { const r = k.cyl(0.128, 0.128, 0.04, 8, 'iron_rough'); r.position.y = y; g.add(r); }
    const palm = k.box(0.25, 0.2, 0.18, 'steel_dark'); palm.position.y = 0.1; g.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = k.box(0.058, 0.09, 0.16, 'iron_rough'); f.position.set(-0.09 + i * 0.06, 0.22, -0.01); g.add(f);
      const g2 = k.box(0.062, 0.02, 0.17, 'steel'); g2.position.set(-0.09 + i * 0.06, 0.27, -0.01); g.add(g2);
    }
    const th = k.box(0.08, 0.15, 0.1, 'iron_rough'); th.position.set(-0.15, 0.12, -0.06); g.add(th);
    // huge rivets on the back of the hand and cuff
    [[-0.07, 0.16], [0.07, 0.16], [-0.07, 0.04], [0.07, 0.04]].forEach(([x, y]) => { const r = k.sphere(0.034, 1, 'brass'); r.position.set(x, y, 0.09); g.add(r); });
    for (const x of [-0.075, 0.075]) { const r = k.sphere(0.032, 1, 'brass'); r.position.set(x, -0.17, 0.11); g.add(r); }
    const plate = k.box(0.22, 0.1, 0.03, 'iron_rough'); plate.position.set(0, 0.1, 0.09); g.add(plate);
    k.marker(g, 'base', [0, 0.2, 0]); k.marker(g, 'tip', [0, 0.28, 0]);
    return g;
  },
};
