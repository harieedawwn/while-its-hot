// Kiếm thiên thạch — chuôi có vuốt, tảng đá vũ trụ xám đen đốm kim loại lơ lửng thay lưỡi.
export default {
  meta: {
    id: 'kiem_thien_thach', name: 'Kiếm Thiên Thạch', family: 'kiem', level: 36,
    inspiration: 'Đá thiên thạch sắt; kiếm không lưỡi chỉ có chuôi giữ một tảng đá',
    look: 'chuôi thép sẫm ba vuốt hướng lên, một tảng đá xám đen đốm kim loại lơ lửng tách khỏi chuôi, hai mảnh vụn bay quanh',
    power: { score: 8, note: 'gọi thiên thạch rơi chỗ nhắm' },
    effects: ['đòn nặng gọi thiên thạch rơi sau 0.8 s', 'vệt chém'],
    lengthM: 1.47,
  },
  build(k) {
    const g = k.group();
    const rock = k.paint('#4b4a54'), rock2 = k.paint('#6e6b78'), ore = k.paint('#b9b2a2', true);
    // hilt with three upward claws that cradle (but do not touch) the rock
    const gr = k.cyl(0.018, 0.02, 0.26, 8, 'leather'); gr.position.y = 0.0; g.add(gr);
    g.add(k.wrap(-0.12, 0.12, 0.021, 5, 'cloth_dark'));
    g.add(k.lathe([[0, 0.12], [0.03, 0.125], [0.034, 0.16], [0.026, 0.2], [0.012, 0.215], [0, 0.215]], 8, 'steel_dark'));
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.4, x = Math.sin(a), z = Math.cos(a);
      g.add(k.tube([[x * 0.02, 0.19, z * 0.02], [x * 0.06, 0.26, z * 0.06], [x * 0.065, 0.33, z * 0.065], [x * 0.045, 0.39, z * 0.045]], 0.011, 5, 'iron_rough'));
      const t = k.cone(0.012, 0.04, 5, 'steel'); t.position.set(x * 0.044, 0.41, z * 0.044); g.add(t);
    }
    g.add(k.lathe([[0, -0.17], [0.024, -0.155], [0.03, -0.13], [0.024, -0.11], [0, -0.11]], 6, 'steel_dark'));
    // floating rock: stretched, faceted, with a pointed tip and ore flecks sunk into it
    const main = k.sphere(0.5, 1, rock); main.scale.set(0.15, 0.8, 0.1); main.position.set(0, 0.88, 0); g.add(main);
    const tip = k.cone(0.045, 0.2, 5, rock2); tip.position.set(0, 1.4 - 0.2, 0); tip.scale.set(0.8, 1, 0.55); g.add(tip);
    [[0.6, 0.04, 0.02], [0.78, -0.03, 0.03], [0.95, 0.03, -0.025], [1.1, -0.02, 0.012]].forEach(([y, x, z]) => {
      const f = k.box(0.02, 0.03, 0.02, ore); f.position.set(x, y, z); f.rotation.set(0.5, 0.6, 0.3); g.add(f);
    });
    // chips orbiting
    [[0.16, 0.7, 0.1], [-0.17, 1.02, -0.1]].forEach(([x, y, z], i) => {
      const c = k.sphere(0.04 - i * 0.008, 0, rock2); c.scale.set(1, 1.4, 0.8); c.position.set(x, y, z); g.add(c);
    });
    k.marker(g, 'base', [0, 0.45, 0]); k.marker(g, 'tip', [0, 1.4, 0]);
    return g;
  },
};
