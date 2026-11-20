// Dao phân thân — hai lưỡi tách đôi lơ lửng song song, một thật một bóng.
export default {
  meta: {
    id: 'dao_phan_than', name: 'Dao Phân Thân', family: 'dao', level: 39,
    inspiration: 'Bóng phân thân của nhẫn giả; dao đôi',
    look: 'một chuôi, một lưỡi thép thật và một lưỡi bóng xanh nhạt đặt lệch lên, hai mảnh trượt rời nhau lơ lửng song song',
    power: { score: 8, note: 'để lại bản sao nổ' },
    effects: ['trượt để lại bản sao đứng yên 3 s, ai chém bản sao bị nổ 10', 'vùng chậm'],
    lengthM: 0.58,
  },
  build(k) {
    const g = k.group();
    const ghost = k.paint('#8fbce0', true), ghostDark = k.paint('#4d7aa8');
    const blade = (slot, fl) => k.edge({
      spine: [[0, 0.07], [0.003, 0.2], [-0.012, 0.34], [-0.03, 0.42]], width: [0.04, 0.046, 0.038, 0], edge: 'front',
      thickness: 0.01, edgeThickness: 0.0018, bevel: 0.5, taper: 0.35, smooth: 4, slot, fuller: { from: 0.05, to: 0.6, at: 0.25, width: 0.22, slot: fl },
    });
    const real = blade('steel', 'steel_dark'); real.position.x = -0.016; g.add(real);
    // the echo: shifted sideways and up, not touching the real blade, drawn with the same curve
    const echo = blade(ghost, ghostDark); echo.position.set(0.075, 0.07, -0.012); g.add(echo);
    // guard: bar that holds the real blade; a hollow bracket holds nothing on the echo side
    const gd = k.box(0.05, 0.02, 0.08, 'steel_dark'); gd.position.set(0, 0.062, 0); g.add(gd);
    g.add(k.tube([[0.026, 0.075, -0.03], [0.04, 0.09, 0.0], [0.026, 0.075, 0.03]], 0.007, 4, 'brass'));
    const gr = k.cyl(0.016, 0.018, 0.12, 8, 'leather'); g.add(gr);
    g.add(k.wrap(-0.055, 0.055, 0.0185, 4, 'cloth_dark'));
    g.add(k.lathe([[0, -0.085], [0.017, -0.075], [0.024, -0.06], [0.017, -0.055], [0, -0.055]], 6, 'brass'));
    // floating motes between the two
    [[0.045, 0.24, 0.02], [0.04, 0.38, -0.02]].forEach(([x, y, z]) => {
      const m = k.box(0.012, 0.012, 0.012, ghost); m.position.set(x, y, z); m.rotation.set(0.6, 0.6, 0.6); g.add(m);
    });
    k.marker(g, 'base', [0, 0.07, 0]); k.marker(g, 'tip', [-0.016, 0.49, -0.03]);
    return g;
  },
};
