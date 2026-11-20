// Dao đồng hồ — lưỡi là kim đồng hồ lớn, chuôi bánh răng lộ.
export default {
  meta: {
    id: 'dao_dong_ho', name: 'Dao Đồng Hồ', family: 'dao', level: 36,
    inspiration: 'Kim đồng hồ tháp chuông kiểu spade; bộ máy lộ',
    look: 'lưỡi là kim đồng hồ đen mũi thoi và đầu kim mảnh, viền đồng, chuôi có hai bánh răng đồng lộ ra, núm lên dây ở đuôi',
    power: { score: 8, note: 'vùng làm chậm thời gian' },
    effects: ['đòn nặng: vùng chậm thời gian r 4 m 2 s', 'tốc cộng dồn'],
    lengthM: 0.63,
  },
  build(k) {
    const g = k.group();
    const iron = k.paint('#1c1b1f', true);
    // clock hand: spade-shaped flat plate, rim in brass sandwiching the black core
    const pts = [[-0.014, 0.1], [0.014, 0.1], [0.014, 0.17], [0.055, 0.25], [0.014, 0.31], [0.01, 0.44], [0, 0.5], [-0.01, 0.44], [-0.014, 0.31], [-0.055, 0.25], [-0.014, 0.17]];
    const hand = k.blade(pts, 0.014, iron, 0.55); g.add(hand);
    const rim = k.blade(pts.map(([z, y]) => [z * 0.62, 0.26 + (y - 0.26) * 0.78]), 0.019, 'brass', 0.3); g.add(rim);
    const eye = k.cyl(0.018, 0.018, 0.024, 8, 'brass'); eye.rotation.z = Math.PI / 2; eye.position.set(0, 0.25, 0); g.add(eye);
    // exposed gears on the grip (axis X)
    const gear = (r, teeth, y, z, slot) => {
      const gr = k.group(); gr.position.set(0, y, z);
      const d = k.cyl(r, r, 0.02, teeth, slot); d.rotation.z = Math.PI / 2; gr.add(d);
      for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; const t = k.box(0.02, r * 0.4, r * 0.32, slot); t.position.set(0, Math.sin(a) * r * 1.02, Math.cos(a) * r * 1.02); t.rotation.x = -a + Math.PI / 2 * 0 + 0; gr.add(t); }
      const hub = k.cyl(r * 0.3, r * 0.3, 0.026, 6, 'steel_dark'); hub.rotation.z = Math.PI / 2; gr.add(hub); g.add(gr);
    };
    const core = k.cyl(0.014, 0.016, 0.2, 8, 'steel_dark'); core.position.y = -0.0; g.add(core);
    const plate = k.box(0.012, 0.15, 0.07, 'steel_dark'); plate.position.set(-0.014, 0.0, 0); g.add(plate);
    gear(0.04, 10, 0.045, 0.0, 'brass'); gear(0.026, 8, -0.03, 0.045, 'copper');
    g.add(k.wrap(-0.1, -0.05, 0.0185, 2, 'leather'));
    const crown = k.cyl(0.016, 0.018, 0.03, 6, 'brass'); crown.position.y = -0.115; g.add(crown);
    k.marker(g, 'base', [0, 0.1, 0]); k.marker(g, 'tip', [0, 0.5, 0]);
    return g;
  },
};
