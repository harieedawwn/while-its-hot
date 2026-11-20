// Găng xương — xương trắng, móng đen, khớp bạc.
export default {
  meta: {
    id: 'gang_xuong', name: 'Găng Xương', family: 'tay', level: 33,
    inspiration: 'Bàn tay bộ xương; găng móng vuốt',
    look: 'nắm đấm ghép từ xương trắng, mỗi khớp ngón bọc bạc và mọc một móng đen chĩa lên, cẳng tay là hai xương song song kẹp vòng xương sườn',
    power: { score: 7, note: 'hạ gục hồi máu' },
    effects: ['hạ gục hồi đầy máu', 'mỗi đòn hồi 2', 'tên lửa'],
    lengthM: 0.43,
  },
  build(k) {
    const g = k.group();
    const claw = k.paint('#141114');
    // forearm: two long bones + rib hoops
    for (const x of [-0.016, 0.02]) {
      const b = k.cyl(0.011, 0.013, 0.24, 6, 'bone'); b.position.set(x, -0.12, 0.0); g.add(b);
      const e = k.sphere(0.017, 0, 'bone'); e.position.set(x, -0.245, 0); g.add(e);
    }
    for (const y of [-0.19, -0.13, -0.07]) { const h = k.cyl(0.042 - (y + 0.19) * 0.1, 0.042 - (y + 0.19) * 0.1, 0.018, 7, 'bone'); h.position.set(0.002, y, 0.0); g.add(h); }
    const spine = k.box(0.014, 0.2, 0.02, 'bone'); spine.position.set(0.002, -0.1, 0.042); g.add(spine);
    // hand: palm block, four finger bones folded over, silver knuckle joints, black claws
    const palm = k.box(0.086, 0.075, 0.06, 'bone'); palm.position.y = 0.035; g.add(palm);
    const wr = k.cyl(0.036, 0.04, 0.026, 7, 'steel'); wr.position.y = -0.005; g.add(wr);
    for (let i = 0; i < 4; i++) {
      const x = -0.033 + i * 0.022;
      const seg = k.box(0.018, 0.04, 0.026, 'bone'); seg.position.set(x, 0.092, -0.006); g.add(seg);
      const j = k.sphere(0.014, 0, 'steel'); j.position.set(x, 0.112, 0.004); g.add(j);
      const c = k.cone(0.008, 0.05 + (i === 1 || i === 2 ? 0.012 : 0), 4, claw); c.position.set(x, 0.14, 0.004); g.add(c);
    }
    const th = k.box(0.026, 0.05, 0.034, 'bone'); th.position.set(-0.055, 0.04, -0.02); g.add(th);
    const tj = k.sphere(0.012, 0, 'steel'); tj.position.set(-0.055, 0.07, -0.02); g.add(tj);
    k.marker(g, 'base', [0, 0.1, 0]); k.marker(g, 'tip', [0, 0.17, 0.0]);
    return g;
  },
};
