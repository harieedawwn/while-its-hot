// Kiếm xích — kiếm liên tiết (whip sword), lưỡi chia 6 khúc nối xích như roi.
// Tỉ lệ: lưỡi ≈ 71% tổng chiều dài (6 khúc × 0.15 m + 5 khe × 0.028 m), cán + tời ≈ 22%, vòng xích đuôi ≈ 5%.
// Lưỡi uốn nhẹ ra sau (-Z), mép sắc ở mặt lồi (+Z). Mỗi khúc là một tấm đồng riêng,
// nối nhau bằng thanh xích sắt + khớp đồng thau ở sống lưỡi. Đầu cán là tời cuộn xích có tay quay.
export default {
  meta: {
    id: 'kiem_xich',
    name: 'Kiếm xích',
    family: 'kiem',
    level: 27,
    inspiration: 'Kiếm liên tiết / kiếm roi (whip sword) — lưỡi chia khúc nối dây xích, mở ra như roi',
    look: 'cán gỗ sẫm quấn dây đỏ, chắn tay là tời sắt có tay quay, lưỡi đồng gỉ xanh chia 6 khúc nối nhau bằng xích, cong nhẹ như roi, đuôi cán có vòng xích',
    power: { score: 7, note: 'tầm xa, kéo mục tiêu về gần; đòn nặng có hồi chiêu 4 giây' },
    effects: [
      'đòn nặng: quật roi dài 6 m, kéo mục tiêu về còn 3 m (hồi chiêu 4 s)',
      'đòn nhẹ: tầm đánh dài thêm 0.5 m so với kiếm thường',
      'đòn chém để lại vệt chém',
    ],
    lengthM: 1.45,
  },
  build(k) {
    const g = k.group();
    const bronze = k.paint('#b07d4a', true);      // đồng, sáng lên khi nóng
    const verdigris = k.paint('#3f8f78', true);   // gỉ đồng xanh cho rãnh

    // --- bố cục lưỡi: 6 khúc, mỗi khúc 0.15 m, khe 0.028 m ---
    const Y0 = 0.17, SEG = 0.15, GAP = 0.028, N = 6;
    const LEN = N * SEG + (N - 1) * GAP;           // 1.04 m
    const zs = (y) => { const t = (y - Y0) / LEN; return -0.03 - 0.10 * t * t; };  // sống lưỡi cong ra sau
    const ws = (y) => 0.058 - 0.032 * ((y - Y0) / LEN);                           // bản rộng thu dần về mũi

    for (let i = 0; i < N; i++) {
      const ya = Y0 + i * (SEG + GAP);
      const yb = ya + SEG;
      const ym = (ya + yb) / 2;
      const last = i === N - 1;
      const spine = last
        ? [[zs(ya), ya], [zs(ym), ym], [zs(yb), yb]]
        : [[zs(ya), ya], [zs(yb), yb]];
      const width = last ? [ws(ya), ws(ym), 0] : [ws(ya), ws(yb)];
      g.add(k.edge({
        spine, width, edge: 'front',
        thickness: 0.012, edgeThickness: 0.0015, bevel: 0.5,
        taper: last ? 0.35 : 0.1, smooth: 4, slot: bronze,
        fuller: { from: 0.12, to: last ? 0.6 : 0.88, at: 0.22, width: 0.2, slot: verdigris },
      }));

      if (!last) {
        // xích nối giữa hai khúc: thanh sắt ăn sâu vào đầu khúc + khớp đồng thau ở giữa khe
        const yn = yb + GAP;
        const p1 = yb - 0.004, p2 = yn + 0.004;
        g.add(k.tube([[0, p1, zs(p1) + 0.010], [0, p2, zs(p2) + 0.010]], 0.0052, 6, 'iron_rough'));
        const ymid = (yb + yn) / 2;
        const barrel = k.cyl(0.0085, 0.0085, 0.02, 6, 'brass');
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0, ymid, zs(ymid) + 0.010);
        g.add(barrel);
      }
    }

    // --- ống bọc gốc lưỡi (đồng thau), khúc đầu cắm vào trong ---
    const collar = k.lathe([[0, 0.112], [0.021, 0.112], [0.027, 0.126], [0.030, 0.15], [0.028, 0.168],
      [0.032, 0.174], [0.032, 0.18], [0, 0.18]], 8, 'brass');
    g.add(collar);
    for (const x of [-0.031, 0.031]) { const rv = k.sphere(0.005, 0, 'iron_rough'); rv.position.set(x, 0.15, 0); g.add(rv); }

    // --- tời cuộn xích làm chắn tay: lõi sắt + hai má đồng thau + tay quay ---
    const drum = k.cyl(0.021, 0.021, 0.12, 8, 'iron_rough');
    drum.rotation.z = Math.PI / 2; drum.position.set(0, 0.14, 0); g.add(drum);
    for (const x of [-0.058, 0.058]) {
      const fl = k.cyl(0.031, 0.031, 0.01, 8, 'brass');
      fl.rotation.z = Math.PI / 2; fl.position.set(x, 0.14, 0); g.add(fl);
    }
    g.add(k.tube([[0.060, 0.14, 0], [0.086, 0.14, 0], [0.086, 0.14, 0.034]], 0.005, 6, 'iron_rough'));
    const knob = k.sphere(0.008, 0, 'wood_dark'); knob.position.set(0.086, 0.14, 0.036); g.add(knob);

    // --- cán: gỗ sẫm quấn dây đỏ, hai đai sắt ---
    const grip = k.cyl(0.019, 0.019, 0.23, 8, 'wood_dark'); g.add(grip);
    g.add(k.wrap(-0.10, 0.10, 0.0205, 8, 'cloth_red'));
    for (const y of [-0.108, 0.108]) { const band = k.cyl(0.0225, 0.0225, 0.008, 8, 'iron_rough'); band.position.y = y; g.add(band); }

    // --- đầu cán + vòng xích đuôi ---
    const pommel = k.lathe([[0, -0.18], [0.013, -0.175], [0.025, -0.155], [0.027, -0.135], [0.022, -0.11], [0, -0.11]], 8, 'brass');
    g.add(pommel);
    const ringPts = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ringPts.push([0, -0.205 + 0.028 * Math.cos(a), 0.028 * Math.sin(a)]);
    }
    g.add(k.tube(ringPts, 0.006, 6, 'iron_rough'));

    k.marker(g, 'base', [0, 0.19, 0]);
    k.marker(g, 'tip', [0, Y0 + LEN, zs(Y0 + LEN)]);
    return g;
  },
};