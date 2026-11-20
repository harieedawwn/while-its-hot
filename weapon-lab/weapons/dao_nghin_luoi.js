// Dao nghìn lưỡi — chuôi ngắn, một vòng tám lưỡi nhỏ tỏa quanh như bánh xe dao.
export default {
  meta: {
    id: 'dao_nghin_luoi', name: 'Dao Nghìn Lưỡi', family: 'dao', level: 42,
    inspiration: 'Bánh xe dao chakram; mandala lưỡi',
    look: 'một lưỡi chính ngắn giữa, tám nan đồng tỏa ra vòng thép, mỗi nan mang một lưỡi nhỏ chĩa ra ngoài, chuôi da ngắn',
    power: { score: 9, note: 'bão dao quanh người' },
    effects: ['đòn nặng: bão dao quanh người 2 s r 2.5 m', 'bản sao'],
    lengthM: 0.57,
  },
  build(k) {
    const g = k.group();
    const cy = 0.21, R = 0.14;
    g.add(k.edge({ spine: [[0, 0.07], [0, 0.3], [0, 0.48]], width: [0.036, 0.04, 0], edge: 'both', thickness: 0.011, edgeThickness: 0.002, bevel: 0.5, smooth: 2, slot: 'steel',
      fuller: { from: 0.05, to: 0.55, at: 0.3, width: 0.4, slot: 'steel_dark' } }));
    // wheel in the XZ plane at y = cy: rim tube, 8 spokes, 8 outward blades
    const rim = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; rim.push([Math.sin(a) * R, cy, Math.cos(a) * R]); }
    g.add(k.tube(rim, 0.009, 4, 'steel_dark'));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, wp = k.group(); wp.rotation.y = a; wp.position.y = cy;
      const sp = k.box(0.01, 0.01, R, 'copper'); sp.position.z = R / 2; wp.add(sp);
      const b = k.edge({ spine: [[0, 0], [0, 0.09], [0, 0.17]], width: [0.022, 0.028, 0], edge: 'both', thickness: 0.006, edgeThickness: 0.0014, bevel: 0.5, smooth: 1, slot: 'steel' });
      const holder = k.group(); holder.rotation.x = Math.PI / 2; holder.position.z = R - 0.01; holder.add(b); wp.add(holder);
      g.add(wp);
    }
    const hub = k.cyl(0.022, 0.022, 0.03, 8, 'copper'); hub.position.y = cy; g.add(hub);
    const gd = k.box(0.03, 0.02, 0.07, 'steel_dark'); gd.position.y = 0.065; g.add(gd);
    const gr = k.cyl(0.016, 0.018, 0.12, 8, 'leather'); g.add(gr);
    g.add(k.wrap(-0.055, 0.055, 0.0185, 4, 'cloth_red'));
    g.add(k.lathe([[0, -0.085], [0.016, -0.075], [0.022, -0.06], [0.016, -0.055], [0, -0.055]], 6, 'copper'));
    k.marker(g, 'base', [0, 0.07, 0]); k.marker(g, 'tip', [0, 0.48, 0]);
    return g;
  },
};
