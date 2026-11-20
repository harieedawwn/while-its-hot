// Vạn kiếm — một chuôi, năm lưỡi nhỏ xòe như nan quạt, hai lưỡi ngoài lơ lửng.
export default {
  meta: {
    id: 'kiem_van_kiem', name: 'Vạn Kiếm', family: 'kiem', level: 39,
    inspiration: 'Kiếm trận phi kiếm trong tiểu thuyết kiếm hiệp; nan quạt xếp',
    look: 'một chuôi lụa đỏ, ba lưỡi chính xòe ra trên vành bạc, hai lưỡi ngoài rời ra lơ lửng',
    power: { score: 8, note: 'lưỡi nhỏ bay quanh người tự chém' },
    effects: ['3 lưỡi nhỏ bay quanh người tự chém địch trong 2.5 m', 'thiên thạch'],
    lengthM: 1.27,
  },
  build(k) {
    const g = k.group();
    const lac = k.paint('#2b1714');
    const pivotY = 0.15;
    const leaf = (len, w) => k.edge({
      spine: [[0, 0.02], [0, len * 0.5], [0, len]], width: [w * 0.7, w, 0], edge: 'both',
      thickness: 0.012, edgeThickness: 0.002, bevel: 0.5, taper: 0.3, smooth: 3, slot: 'steel',
      fuller: { from: 0.1, to: 0.6, at: 0.3, width: 0.4, slot: 'steel_dark' },
    });
    [[0, 0.78, 0.055, 0], [-0.3, 0.7, 0.05, 0], [0.3, 0.7, 0.05, 0], [-0.62, 0.62, 0.045, 0.06], [0.62, 0.62, 0.045, 0.06]].forEach(([a, len, w, lift]) => {
      const p = k.group(); p.position.set(0, pivotY + lift, 0); p.rotation.z = a; p.add(leaf(len, w)); g.add(p);
    });
    // silver rim holds the three inner blades (outer two float free)
    g.add(k.tube([[0.11, pivotY + 0.07, 0], [0.06, pivotY + 0.1, 0], [0, pivotY + 0.11, 0], [-0.06, pivotY + 0.1, 0], [-0.11, pivotY + 0.07, 0]], 0.012, 5, 'brass'));
    const hub = k.sphere(0.03, 0, 'brass'); hub.position.set(0, pivotY, 0); g.add(hub);
    const gr = k.cyl(0.017, 0.019, 0.26, 8, lac); gr.position.y = 0.0; g.add(gr);
    g.add(k.wrap(-0.11, 0.11, 0.0195, 5, 'cloth_red'));
    g.add(k.lathe([[0, -0.17], [0.022, -0.16], [0.03, -0.14], [0.022, -0.125], [0, -0.125]], 6, 'brass'));
    const tas = k.box(0.014, 0.12, 0.014, 'cloth_red'); tas.position.set(0, -0.23, 0); g.add(tas);
    const tas2 = k.box(0.03, 0.05, 0.012, 'cloth_red'); tas2.position.set(0, -0.31, 0); g.add(tas2);
    k.marker(g, 'base', [0, 0.17, 0]); k.marker(g, 'tip', [0, 0.93, 0]);
    return g;
  },
};
