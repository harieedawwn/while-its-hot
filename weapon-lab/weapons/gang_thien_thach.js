// Găng thiên thạch — đá vũ trụ xanh đen cắm mảnh kim loại, một khối đá nhỏ bay trước khớp ngón.
export default {
  meta: {
    id: 'gang_thien_thach', name: 'Găng Thiên Thạch', family: 'tay', level: 42,
    inspiration: 'Mảnh thiên thạch sắt; nắm đấm đá',
    look: 'găng ghép từ mảng đá xanh đen sần, năm mảnh kim loại sáng cắm chéo ra từ mu bàn tay và cổ tay, một viên đá nhỏ lơ lửng trước khớp ngón',
    power: { score: 9, note: 'gọi thiên thạch lên đầu địch' },
    effects: ['mỗi đòn 4 gọi thiên thạch nhỏ trên đầu mục tiêu', 'đòn nặng mưa 5 thiên thạch'],
    lengthM: 0.48,
  },
  build(k) {
    const g = k.group();
    const rock = k.paint('#23304a'), rock2 = k.paint('#3a4a68'), metal = k.paint('#c5c8c4', true);
    const cuff = k.sphere(0.5, 1, rock); cuff.scale.set(0.1, 0.24, 0.1); cuff.position.y = -0.12; g.add(cuff);
    const c2 = k.box(0.1, 0.07, 0.09, rock2); c2.position.y = -0.05; c2.rotation.y = 0.5; g.add(c2);
    const palm = k.box(0.095, 0.085, 0.07, rock); palm.position.y = 0.04; palm.rotation.y = 0.12; g.add(palm);
    for (let i = 0; i < 4; i++) { const f = k.box(0.024, 0.03, 0.054, i % 2 ? rock2 : rock); f.position.set(-0.034 + i * 0.023, 0.1, 0); f.rotation.z = (i - 1.5) * 0.12; g.add(f); }
    const th = k.box(0.03, 0.055, 0.04, rock2); th.position.set(-0.056, 0.045, -0.02); g.add(th);
    // embedded metal shards
    [[0.02, 0.07, 0.04, 0.7, 0.35], [-0.03, 0.03, 0.04, -0.5, 0.5], [0.04, -0.06, 0.03, 0.9, 0.2], [-0.03, -0.14, 0.04, -0.7, 0.3], [0.0, 0.1, 0.03, 0.3, -0.3]].forEach(([x, y, z, rz, rx]) => {
      const s = k.cone(0.014, 0.1, 4, metal); s.position.set(x, y, z + 0.03); s.rotation.set(rx + 1.0, 0, rz); g.add(s);
    });
    // floating chunk
    const ch = k.sphere(0.04, 0, rock2); ch.scale.set(1, 0.8, 0.9); ch.position.set(0.01, 0.21, 0.03); g.add(ch);
    const ch2 = k.sphere(0.022, 0, rock); ch2.position.set(0.07, 0.17, -0.03); g.add(ch2);
    k.marker(g, 'base', [0, 0.1, 0]); k.marker(g, 'tip', [0, 0.15, 0.0]);
    return g;
  },
};
