// Búa Piston: búa đầu trụ thép, ống piston lộ phía sau, đinh tán hai bên.
// Tỉ lệ: cán ≈ 70% chiều dài, đầu búa ≈ 14%, mũ chuôi ≈ 6%; mặt đập hướng +Z, piston nằm sau (-Z).
export default {
  meta: {
    id: 'bua_piston',
    name: 'Búa piston',
    family: 'bua',
    level: 18,
    inspiration: 'Búa hơi công trường: đầu trụ thép đập, ống piston thủy lực lộ phía sau',
    look: 'đầu trụ thép tròn có mặt đập đóng đinh, thân hộp đinh tán, ống piston lộ thanh đồng và vòng sơn cam cảnh báo, ống xả nhỏ trên đỉnh, cán gỗ sẫm quấn da',
    power: { score: 7, note: 'đòn nặng chậm, sóng chấn phá thế thủ và làm choáng' },
    effects: [
      'đòn nặng nổ piston: sóng chấn bán kính 4 m, sát thương 18 (hồi 3 giây)',
      'phá đỡ: sóng chấn xuyên thế chặn, đối thủ đang đỡ bị hất lùi',
      'choáng mục tiêu trúng sóng chấn; đập xuống đất (slam) tạo sóng chấn lan quanh người',
    ],
    lengthM: 1.3,
  },
  build(k) {
    const g = k.group();
    const hazard = k.paint('#c2561b', true);      // sơn cam cảnh báo
    const HY = 0.80;                               // tâm đầu búa theo Y

    // --- cán gỗ sẫm ---
    const shaft = k.cyl(0.018, 0.019, 0.92, 8, 'wood_dark'); shaft.position.y = 0.16; g.add(shaft);
    const sleeve = k.cyl(0.0195, 0.0195, 0.26, 8, 'leather'); g.add(sleeve);
    g.add(k.wrap(-0.13, 0.13, 0.021, 5, 'cloth_dark'));
    g.add(k.wrap(0.38, 0.48, 0.02, 3, 'cloth_dark'));
    for (const y of [0.56, -0.20]) { const band = k.cyl(0.0215, 0.0215, 0.022, 8, 'iron_rough'); band.position.y = y; g.add(band); }

    // --- mũ chuôi sắt ---
    const butt = k.lathe([[0.0, -0.34], [0.014, -0.33], [0.024, -0.30], [0.025, -0.24], [0.021, -0.23], [0.0, -0.23]], 8, 'iron_rough');
    g.add(butt);
    const buttRing = k.cyl(0.027, 0.027, 0.012, 8, 'steel_dark'); buttRing.position.y = -0.235; g.add(buttRing);

    // --- cổ nối cán vào đầu ---
    const neck = k.lathe([[0.0, 0.58], [0.026, 0.58], [0.032, 0.61], [0.036, 0.64], [0.036, 0.70], [0.040, 0.72], [0.0, 0.74]], 8, 'steel_dark');
    g.add(neck);
    const neckRing = k.cyl(0.040, 0.040, 0.012, 8, 'brass'); neckRing.position.y = 0.625; g.add(neckRing);

    // --- thân hộp đầu búa + hai mặt bích ---
    const body = k.box(0.14, 0.16, 0.16, 'steel_dark'); body.position.set(0, HY, 0); g.add(body);
    for (const y of [HY - 0.078, HY + 0.078]) {
      const fl = k.box(0.16, 0.02, 0.18, 'steel'); fl.position.set(0, y, 0); g.add(fl);
    }
    // đinh tán hai bên thân (chìm nửa vào mặt)
    for (const x of [-0.07, 0.07]) {
      for (const dy of [-0.045, 0.045]) {
        for (const z of [-0.05, 0.05]) {
          const r = k.sphere(0.0105, 0, 'brass'); r.position.set(x, HY + dy, z); g.add(r);
        }
      }
    }

    // --- trụ đập phía trước (+Z) ---
    const striker = k.cyl(0.075, 0.075, 0.14, 8, 'steel'); striker.rotation.set(Math.PI / 2, 0, 0); striker.position.set(0, HY, 0.15); g.add(striker);
    const flange = k.cyl(0.09, 0.09, 0.016, 8, 'brass'); flange.rotation.set(Math.PI / 2, 0, 0); flange.position.set(0, HY, 0.105); g.add(flange);
    const face = k.cyl(0.082, 0.082, 0.02, 8, 'iron_rough'); face.rotation.set(Math.PI / 2, 0, 0); face.position.set(0, HY, 0.225); g.add(face);
    for (const sx of [-0.04, 0.04]) for (const sy of [-0.04, 0.04]) {
      const stud = k.sphere(0.011, 0, 'steel'); stud.position.set(sx, HY + sy, 0.235); g.add(stud);
    }

    // --- ống piston lộ phía sau (-Z): hai đoạn ống, giữa hở thấy thanh đồng ---
    const rod = k.cyl(0.02, 0.02, 0.19, 8, 'copper'); rod.rotation.set(Math.PI / 2, 0, 0); rod.position.set(0, HY, -0.165); g.add(rod);
    const tubeA = k.cyl(0.05, 0.05, 0.07, 8, 'steel_dark'); tubeA.rotation.set(Math.PI / 2, 0, 0); tubeA.position.set(0, HY, -0.11); g.add(tubeA);
    const tubeB = k.cyl(0.05, 0.05, 0.075, 8, 'steel_dark'); tubeB.rotation.set(Math.PI / 2, 0, 0); tubeB.position.set(0, HY, -0.215); g.add(tubeB);
    const ringA = k.cyl(0.056, 0.056, 0.014, 8, hazard); ringA.rotation.set(Math.PI / 2, 0, 0); ringA.position.set(0, HY, -0.135); g.add(ringA);
    const ringB = k.cyl(0.056, 0.056, 0.014, 8, hazard); ringB.rotation.set(Math.PI / 2, 0, 0); ringB.position.set(0, HY, -0.185); g.add(ringB);
    const cap = k.cyl(0.06, 0.06, 0.03, 8, 'steel'); cap.rotation.set(Math.PI / 2, 0, 0); cap.position.set(0, HY, -0.25); g.add(cap);
    const nozzle = k.cone(0.03, 0.04, 8, 'iron_rough'); nozzle.rotation.set(-Math.PI / 2, 0, 0); nozzle.position.set(0, HY, -0.285); g.add(nozzle);

    // --- chi tiết trên đỉnh: ống xả + đồng hồ áp ---
    const chim = k.cyl(0.014, 0.014, 0.074, 8, 'iron_rough'); chim.position.set(-0.035, 0.912, -0.03); g.add(chim);
    const chimCap = k.cone(0.021, 0.03, 8, 'steel'); chimCap.position.set(-0.035, 0.955, -0.03); g.add(chimCap);
    const gauge = k.cyl(0.024, 0.024, 0.02, 8, 'brass'); gauge.position.set(0.04, 0.893, 0.02); g.add(gauge);
    const gaugeFace = k.cyl(0.015, 0.015, 0.008, 8, hazard); gaugeFace.position.set(0.04, 0.9, 0.02); g.add(gaugeFace);

    k.marker(g, 'base', [0, HY, 0.08]);
    k.marker(g, 'tip', [0, HY, 0.24]);
    return g;
  },
};