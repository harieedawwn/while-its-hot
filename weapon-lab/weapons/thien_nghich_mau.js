// Thiên Nghịch Mâu — đoản đao hai ngạnh, cảm hứng từ Inverted Spear of Heaven của Toji Fushiguro. //
// Proportions from the refs: blade ≈ 50% of total length, thick flat plate forked by a slot, both tips
// cut on the same slant; stepped wrench-like shoulders; chip emblem on the ricasso; oval guard between
// hex gold nuts; chunky crimson rope grip; gold cap with a hanging ring. Edge faces +Z, slot + prong -Z.
export default {
  meta: {
    id: 'thien_nghich_mau',
    name: 'Thiên Nghịch Mâu',
    family: 'kiem',
    level: 9,
    inspiration: 'Thiên Nghịch Mâu (Inverted Spear of Heaven) — chú cụ đặc cấp của Toji Fushiguro (Jujutsu Kaisen)',
    look: 'lưỡi thép phẳng dày xẻ rãnh thành hai ngạnh, hai mũi vát xiên, huy hiệu vi mạch khắc ở gốc lưỡi, đệm chắn bầu dục viền dày kẹp giữa hai đai vàng, cán quấn dây đỏ sẫm dày sợi, đuôi chụp vàng treo vòng',
    power: { score: 7, note: 'ngắn và nhanh, xé phép hộ thân, kẹp binh khí địch' },
    effects: [
      'đòn trúng xé tan khiên phép và mọi hiệu ứng cường hóa đang có trên mục tiêu',
      'rãnh chẻ giữa hai ngạnh kẹp được binh khí địch: đỡ đúng lúc thì địch bị khóa vũ khí một nhịp',
      'thân ngắn, nhẹ: ra đòn nhanh, đổi thế liền mạch, đòn thứ ba trong chuỗi bỏ qua một phần giáp',
    ],
    lengthM: 0.68,
  },
  build(k) {
    const g = k.group();
    const cord = k.paint('#7b1c1c');   // crimson rope
    const shade = k.paint('#2b0f10');  // dark core that shows between the strands
    const put = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
    const rnd = (n) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

    // ===== blade: plate faces ±X, cutting edge toward +Z, slot + prong toward -Z =====
    const TIP = 0.505;       // far corner of the main tine
    const SLOT_Z = -0.025;   // back wall of the main tine (the slot side)
    const plate = (y0, y1, z0, z1, t) => put(k.box(t, y1 - y0, z1 - z0, 'steel'), 0, (y0 + y1) / 2, (z0 + z1) / 2);

    // main tine: the long cutting blade; its spine corner outruns the edge corner, so the tip is a slanted chisel
    g.add(k.edge({
      spine: [[SLOT_Z, 0.200], [SLOT_Z - 0.0002, 0.300], [SLOT_Z, 0.400], [SLOT_Z, TIP - 0.058], [SLOT_Z, TIP]],
      width: [0.046, 0.046, 0.046, 0.046, 0.0],
      edge: 'front', thickness: 0.0118, edgeThickness: 0.0016, bevel: 0.3, taper: 0.1, smooth: 1,
      slot: 'steel',
      fuller: { from: 0.10, to: 0.86, at: 0.14, width: 0.08, slot: 'steel_dark' },
    }));
    // prong: shorter second tine, same slant, blunt (catches blades instead of cutting)
    g.add(k.edge({
      spine: [[-0.080, 0.225], [-0.0802, 0.290], [-0.080, 0.304], [-0.080, 0.352]],
      width: [0.038, 0.038, 0.038, 0.0],
      edge: 'front', thickness: 0.0100, edgeThickness: 0.0092, bevel: 0.2, taper: 0.05, smooth: 1,
      slot: 'steel',
    }));

    // stepped shoulders: neck with an outer step, then three stairs growing into the prong root and slot floor
    plate(0.150, 0.215, SLOT_Z, 0.027, 0.0114);
    plate(0.1635, 0.180, -0.050, -0.015, 0.0108);
    plate(0.180, 0.196, -0.065, -0.015, 0.0108);
    plate(0.196, 0.240, -0.080, -0.015, 0.0108);
    // slot floor: two 45° fillets so the closed end of the slot reads as rounded
    for (const z of [-0.042, SLOT_Z]) {
      const f = put(k.box(0.0098, 0.0102, 0.0102, 'steel'), 0, 0.240, z);
      f.rotation.x = Math.PI / 4;
    }

    // chip emblem on the ricasso (through both faces): raised frame, dark window, contact pins
    const plY = 0.186, plZ = -0.0035;
    put(k.box(0.0150, 0.040, 0.0150, 'steel'), 0, plY, plZ);
    put(k.box(0.0154, 0.030, 0.0085, 'steel_dark'), 0, plY, plZ);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      put(k.box(0.0150, 0.0034, 0.0044, 'steel'), 0, plY + (i - 1.5) * 0.0085, plZ + s * 0.0097);
    }

    // battle wear: hairline scratches running through both faces (main tine, prong, shoulder)
    for (let i = 0; i < 16; i++) {
      const y = 0.232 + rnd(i + 1) * 0.205;
      const len = 0.010 + rnd(i + 73) * 0.014;
      const th = 0.0118 * (1 - 0.1 * (y - 0.2) / 0.305) + 0.0004;
      const m = put(k.box(th, len, 0.0007, 'steel_dark'), 0, y, -0.0140 + rnd(i + 37) * 0.012);
      m.rotation.x = (rnd(i + 109) - 0.5) * 1.0;
    }
    for (let i = 0; i < 4; i++) {
      const m = put(k.box(0.0105, 0.008 + rnd(i + 5) * 0.010, 0.0006, 'steel_dark'), 0, 0.250 + rnd(i + 11) * 0.032, -0.072 + rnd(i + 17) * 0.020);
      m.rotation.x = (rnd(i + 23) - 0.5) * 1.0;
    }
    for (let i = 0; i < 3; i++) {
      const m = put(k.box(0.0110, 0.008 + rnd(i + 41) * 0.008, 0.0006, 'steel_dark'), 0, 0.205 + rnd(i + 47) * 0.028, -0.074 + rnd(i + 53) * 0.022);
      m.rotation.x = (rnd(i + 59) - 0.5) * 1.0;
    }

    // ===== collar: stacked rings, widest at the blade, dark steel inlay bands in the grooves =====
    g.add(k.lathe([[0.0, 0.126], [0.0235, 0.126], [0.0245, 0.130], [0.0235, 0.1335], [0.0275, 0.1365], [0.0285, 0.140],
      [0.0285, 0.1445], [0.0265, 0.1470], [0.0295, 0.1500], [0.0300, 0.154], [0.0300, 0.160], [0.0290, 0.164], [0.0, 0.164]], 10, 'brass'));
    for (const [y, r] of [[0.1335, 0.0270], [0.1470, 0.0278]]) {
      put(k.cyl(r, r, 0.0030, 10, 'steel_dark'), 0, y, 0);
    }
    put(k.cyl(0.0272, 0.0272, 0.0095, 6, 'brass'), 0, 0.1225, 0);   // upper hex nut
    put(k.cyl(0.0258, 0.0258, 0.0120, 6, 'brass'), 0, 0.1100, 0);   // lower hex nut

    // ===== guard: oval plate with a thick rim, brass inlay ring and rivets =====
    const tsuba = k.lathe([[0.0, 0.1125], [0.050, 0.1125], [0.052, 0.1105], [0.0670, 0.1105], [0.0685, 0.1115], [0.0685, 0.1205],
      [0.0670, 0.1215], [0.052, 0.1215], [0.050, 0.1195], [0.0, 0.1195]], 12, 'iron_rough');
    tsuba.scale.set(0.60, 1, 1);
    g.add(tsuba);
    const inlay = k.lathe([[0.0590, 0.1212], [0.0606, 0.1212], [0.0606, 0.1224], [0.0590, 0.1224]], 12, 'brass');
    inlay.scale.set(0.60, 1, 1);
    g.add(inlay);
    for (const z of [-0.0385, 0.0385]) put(k.sphere(0.0034, 0, 'brass'), 0, 0.1198, z);

    // ===== grip: brass fuchi, swollen dark core, three interleaved rope strands, menuki, pins =====
    g.add(k.lathe([[0.0200, 0.084], [0.0236, 0.084], [0.0242, 0.0865], [0.0236, 0.0890], [0.0244, 0.0915], [0.0240, 0.0940],
      [0.0240, 0.1050], [0.0200, 0.1050]], 10, 'brass'));
    g.add(k.lathe([[0.0, -0.101], [0.0162, -0.101], [0.0168, -0.070], [0.0176, -0.030], [0.0180, 0.020], [0.0176, 0.060],
      [0.0170, 0.095], [0.0170, 0.106], [0.0, 0.106]], 10, shade));
    for (let i = 0; i < 3; i++) {
      const d = i * (0.200 / 12) / 3;       // a third of a pitch apart => the strands fill each other's gaps
      g.add(k.wrap(-0.101 - d, 0.099 - d, 0.0199, 12, cord));
    }
    for (const s of [-1, 1]) {
      const men = put(k.cyl(0.0050, 0.0050, 0.0040, 4, 'brass'), s * 0.0212, 0.018, 0);
      men.rotation.z = Math.PI / 2;
      put(k.sphere(0.0017, 0, 'brass'), s * 0.0236, 0.018, 0);
      for (const y of [0.064, -0.070]) {
        const pin = put(k.cyl(0.0033, 0.0033, 0.0030, 8, 'iron_rough'), s * 0.0222, y, 0);
        pin.rotation.z = Math.PI / 2;
      }
    }

    // ===== pommel: shaped gold cap, dark band, eyelet and a hanging ring with a clasp bead =====
    g.add(k.lathe([[0.0, -0.1385], [0.0070, -0.1380], [0.0135, -0.1345], [0.0190, -0.1275], [0.0225, -0.1190], [0.0242, -0.1100],
      [0.0246, -0.1010], [0.0240, -0.0950], [0.0200, -0.0950]], 10, 'brass'));
    put(k.cyl(0.0252, 0.0252, 0.0035, 10, 'steel_dark'), 0, -0.1040, 0);
    const lug = put(k.cyl(0.0052, 0.0052, 0.0100, 8, 'brass'), 0, -0.1385, 0);
    lug.rotation.z = Math.PI / 2;
    const section = [];
    for (let a = 0; a <= 10; a++) {
      const t = (a / 10) * Math.PI * 2;
      section.push([0.0155 + 0.0032 * Math.cos(t), 0.0032 * Math.sin(t)]);
    }
    const ring = put(k.lathe(section, 16, 'brass'), 0, -0.152, 0);
    ring.rotation.z = Math.PI / 2;
    put(k.sphere(0.0045, 0, 'brass'), 0, -0.1675, 0);

    k.marker(g, 'base', [0, 0.170, 0.0]);
    k.marker(g, 'tip', [0, TIP, SLOT_Z]);
    return g;
  },
};