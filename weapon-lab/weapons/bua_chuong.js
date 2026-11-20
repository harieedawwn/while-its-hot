// Búa chuông — đại hồng chung đồng cổ nằm ngang gắn trên cán dài, lõi quả lắc dung nham.
export default {
  meta: {
    id: 'bua_chuong',
    name: 'Búa chuông',
    family: 'bua',
    level: 27,
    inspiration: 'Đại hồng chung chùa cổ ghép với búa tạ cán dài, nung lõi dung nham bên trong',
    look: 'đầu búa là chuông đồng cổ lớn nằm ngang phủ rêu đồng và đai sắt, miệng chuông hướng trước lộ quả lắc dung nham rực nóng, cán gỗ sẫm dài quấn dây đỏ',
    power: { score: 8, note: 'đập nặng diện rộng, khống chế bằng sóng âm và thiêu đốt dung nham' },
    effects: [
      'đòn trúng vang tiếng chuông làm địch lắc màn hình và chậm 30% trong 2 giây',
      'đòn nặng phát sóng âm bán kính 5 m đẩy choáng kẻ địch xung quanh',
      'miệng chuông văng dung nham gây bỏng cháy kéo dài lên mục tiêu trúng đòn',
    ],
    lengthM: 1.3,
  },
  build(k) {
    const g = k.group();
    const bronze = k.paint('#7d6336', true);      // aged temple bronze
    const patina = k.paint('#3b6958', false);     // verdigris patina
    const lava = k.paint('#ff4a0a', true);        // glowing molten magma

    // --- long dark timber shaft: y = -0.32 to +0.86 ---
    const shaft = k.cyl(0.019, 0.017, 1.18, 8, 'wood_dark');
    shaft.position.y = 0.27;
    g.add(shaft);

    // --- main grip at origin: y = -0.13 to +0.13 ---
    const sleeve = k.cyl(0.020, 0.020, 0.26, 8, 'leather');
    g.add(sleeve);
    g.add(k.wrap(-0.125, 0.125, 0.0215, 6, 'cloth_red'));
    for (const y of [-0.135, 0.135]) {
      const ferrule = k.cyl(0.023, 0.023, 0.018, 8, 'iron_rough');
      ferrule.position.y = y;
      g.add(ferrule);
    }

    // --- upper secondary wrap & iron shaft bands ---
    g.add(k.wrap(0.36, 0.48, 0.021, 4, 'cloth_red'));
    for (const y of [0.24, 0.54]) {
      const band = k.cyl(0.022, 0.022, 0.020, 8, 'iron_rough');
      band.position.y = y;
      g.add(band);
    }

    // --- butt cap: y = -0.34 to -0.24 ---
    const butt = k.lathe([
      [0.0, -0.34], [0.012, -0.33], [0.024, -0.30], [0.022, -0.25], [0.018, -0.24], [0.0, -0.24],
    ], 8, 'iron_rough');
    g.add(butt);
    const buttRing = k.cyl(0.0245, 0.0245, 0.012, 8, bronze);
    buttRing.position.y = -0.258;
    g.add(buttRing);

    // --- heavy forged mounting collar below the bell: y = 0.60 to 0.70 ---
    const collar = k.lathe([
      [0.0, 0.60], [0.023, 0.60], [0.028, 0.62], [0.026, 0.65], [0.036, 0.67], [0.044, 0.70], [0.0, 0.70],
    ], 8, 'iron_rough');
    g.add(collar);

    // --- top iron finial locking the shaft above the bell: y = 0.85 to 0.96 ---
    const finial = k.lathe([
      [0.0, 0.85], [0.042, 0.85], [0.035, 0.88], [0.026, 0.90], [0.028, 0.915], [0.014, 0.945], [0.0, 0.96],
    ], 8, 'iron_rough');
    g.add(finial);
    const finialRing = k.cyl(0.037, 0.037, 0.012, 8, bronze);
    finialRing.position.y = 0.882;
    g.add(finialRing);

    // --- side iron cheek straps bolting collar & finial to the bell ---
    for (const sx of [-1, 1]) {
      const cheek = k.box(0.014, 0.22, 0.048, 'iron_rough');
      cheek.position.set(sx * 0.095, 0.78, 0.002);
      g.add(cheek);
    }

    // --- horizontal bronze bell head: centered at y = 0.78, mouth facing +Z ---
    const bellGroup = k.group();
    bellGroup.position.set(0, 0.78, 0);
    bellGroup.rotation.x = Math.PI / 2;

    // hollow temple bell body (local Y = -0.155 crown to +0.202 flared striking mouth)
    const bellBody = k.lathe([
      [0.0, -0.155], [0.055, -0.150], [0.088, -0.125], [0.094, -0.06],
      [0.098, 0.02], [0.106, 0.09], [0.128, 0.16], [0.136, 0.195],
      [0.124, 0.202], [0.110, 0.192], [0.092, 0.14], [0.074, 0.04],
      [0.064, -0.05], [0.0, -0.06],
    ], 10, bronze);
    bellGroup.add(bellBody);

    // verdigris patina relief bands
    const patinaBack = k.cyl(0.096, 0.095, 0.020, 10, patina);
    patinaBack.position.y = -0.085;
    bellGroup.add(patinaBack);

    const patinaFront = k.cyl(0.108, 0.104, 0.024, 10, patina);
    patinaFront.position.y = 0.075;
    bellGroup.add(patinaFront);

    // forged iron clamping straps around the waist
    for (const ly of [-0.022, 0.024]) {
      const strap = k.cyl(0.101, 0.101, 0.016, 10, 'iron_rough');
      strap.position.y = ly;
      bellGroup.add(strap);
    }

    // temple bell bosses (núm chuông) around the shoulder
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const boss = k.sphere(0.012, 0, bronze);
      boss.position.set(Math.cos(a) * 0.095, -0.085, Math.sin(a) * 0.095);
      bellGroup.add(boss);
    }

    // dragon-arch crown loop (quai chuông) at the back (-Z in world)
    const crownLoop = k.tube([
      [0, -0.14, -0.045], [0, -0.20, -0.032], [0, -0.215, 0], [0, -0.20, 0.032], [0, -0.14, 0.045],
    ], 0.014, 6, 'iron_rough');
    bellGroup.add(crownLoop);

    // molten lava core & clapper inside the bell cavity
    const lavaPool = k.cyl(0.068, 0.062, 0.045, 8, lava);
    lavaPool.position.y = -0.035;
    bellGroup.add(lavaPool);

    const clapperRod = k.cyl(0.012, 0.012, 0.17, 6, 'iron_rough');
    clapperRod.position.y = 0.055;
    bellGroup.add(clapperRod);

    const clapper = k.sphere(0.046, 1, lava);
    clapper.position.y = 0.155;
    bellGroup.add(clapper);

    // glowing magma veins/slag sunk into the flared striking lip
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const vein = k.box(0.018, 0.055, 0.018, lava);
      vein.position.set(Math.cos(a) * 0.123, 0.168, Math.sin(a) * 0.123);
      vein.rotation.y = -a;
      bellGroup.add(vein);
    }

    g.add(bellGroup);

    k.marker(g, 'base', [0, 0.65, 0.0]);
    k.marker(g, 'tip', [0, 0.78, 0.21]);
    return g;
  },
};