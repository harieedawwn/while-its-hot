// Búa trọng lực — khối lập phương đen lơ lửng giữa hai càng đồng.
export default {
  meta: {
    id: 'bua_trong_luc', name: 'Búa Trọng Lực', family: 'bua', level: 39,
    inspiration: 'Khối lập phương hút trong phim viễn tưởng; bộ giữ nam châm',
    look: 'cán thép sẫm quấn da, hai càng đồng cong ôm lấy khối lập phương đen lơ lửng không chạm, vòng quỹ đạo đồng và một mảnh vụn bay',
    power: { score: 9, note: 'đập đất dính chân mọi người' },
    effects: ['đập đất: mọi người trong 8 m dính đất 2 s', 'slam mạnh gấp đôi', 'neo'],
    lengthM: 1.42,
  },
  build(k) {
    const g = k.group();
    const black = k.paint('#0c0b12'), edge = k.paint('#2e2b3a');
    const haft = k.cyl(0.02, 0.024, 0.9, 8, 'steel_dark'); haft.position.y = 0.0; g.add(haft);
    g.add(k.wrap(-0.14, 0.14, 0.0235, 6, 'leather'));
    const base = k.lathe([[0, 0.36], [0.03, 0.36], [0.045, 0.39], [0.05, 0.43], [0.03, 0.48], [0, 0.48]], 8, 'copper'); g.add(base);
    const pm = k.lathe([[0, -0.46], [0.026, -0.45], [0.032, -0.4], [0.026, -0.38], [0, -0.38]], 8, 'copper'); g.add(pm);
    // two copper claws swing out and around the cube: tips stop 4 cm short
    for (const s of [-1, 1]) {
      g.add(k.tube([[0, 0.44, s * 0.03], [0, 0.48, s * 0.11], [0, 0.58, s * 0.17], [0, 0.72, s * 0.17], [0, 0.82, s * 0.12]], 0.015, 6, 'copper'));
      const t = k.cone(0.02, 0.05, 6, 'brass'); t.position.set(0, 0.855, s * 0.095); t.rotation.x = s * 0.9; g.add(t);
    }
    // the cube hovers, tilted onto a corner, with a darker inner cube for depth
    const cube = k.group(); cube.position.set(0, 0.66, 0); cube.rotation.set(0.6, 0.78, 0.35);
    cube.add(k.box(0.2, 0.2, 0.2, black));
    for (const [a, b, c] of [[0.22, 0.045, 0.045], [0.045, 0.22, 0.045], [0.045, 0.045, 0.22]]) cube.add(k.box(a, b, c, edge));
    g.add(cube);
    // orbit ring + debris
    const ring = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; ring.push([Math.cos(a) * 0.14, 0.66 + Math.sin(a) * 0.04, Math.sin(a) * 0.14]); }
    const orbit = k.tube(ring, 0.006, 4, 'brass'); orbit.rotation.z = 0.35; g.add(orbit);
    const db = k.box(0.04, 0.04, 0.04, black); db.position.set(0.0, 0.93, -0.02); db.rotation.set(0.6, 0.3, 0.9); g.add(db);
    k.marker(g, 'base', [0, 0.45, 0]); k.marker(g, 'tip', [0, 0.66, 0.14]);
    return g;
  },
};
