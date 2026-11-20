// Kiếm nhật thực — lưỡi đen tuyền, giữa lưỡi là đĩa tròn khoét lỗ, vành vàng.
export default {
  meta: {
    id: 'kiem_nhat_thuc', name: 'Kiếm Nhật Thực', family: 'kiem', level: 42,
    inspiration: 'Nhật thực toàn phần: đĩa đen, vành sáng vàng',
    look: 'lưỡi đen tuyền thon, giữa lưỡi một đĩa tròn khoét thủng, vành vàng ôm quanh lỗ, chắn tay đồng',
    power: { score: 9, note: 'xé hố đen hút người' },
    effects: ['đòn nặng xé lỗ đen 2 s ở mũi kiếm hút người trong 5 m', '3 lưỡi bay'],
    lengthM: 1.32,
  },
  build(k) {
    const g = k.group();
    const black = k.paint('#0b0a0e'), gold = k.paint('#e2b23c', true), umber = k.paint('#3a2a1a');
    const cy = 0.66, R = 0.14, r = 0.07;
    g.add(k.edge({ spine: [[0, 0.16], [0, 0.4], [0, 0.53]], width: [0.06, 0.09, 0.12], edge: 'both', thickness: 0.016, edgeThickness: 0.003, bevel: 0.5, smooth: 1, slot: black }));
    g.add(k.edge({ spine: [[0, cy + R - 0.01], [0, 1.0], [0, 1.12]], width: [0.12, 0.08, 0], edge: 'both', thickness: 0.016, edgeThickness: 0.003, bevel: 0.5, taper: 0.3, smooth: 2, slot: black }));
    // annulus plate: outer circle -> thin slit at the bottom -> inner circle (the hole)
    const N = 14, pts = [];
    for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + 0.01 + (i / N) * (Math.PI * 2 - 0.02); pts.push([Math.cos(a) * R, cy + Math.sin(a) * R]); }
    for (let i = N; i >= 0; i--) { const a = -Math.PI / 2 + 0.03 + (i / N) * (Math.PI * 2 - 0.06); pts.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
    const ring = k.blade(pts, 0.016, black, 0.45); ring.position.x = -0.008; g.add(ring);
    // gold rims inside and outside the hole, in both faces
    for (const [rad, tr] of [[r, 0.007], [R, 0.006]]) {
      const c = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; c.push([0, cy + Math.sin(a) * rad, Math.cos(a) * rad]); }
      g.add(k.tube(c, tr, 4, gold));
    }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const s = k.cone(0.012, 0.05, 4, gold); s.position.set(0, cy + Math.sin(a) * (R + 0.02), Math.cos(a) * (R + 0.02)); s.rotation.x = Math.PI / 2 - a; g.add(s); }
    // guard + grip
    const gd = k.box(0.03, 0.03, 0.2, 'copper'); gd.position.y = 0.16; g.add(gd);
    for (const s of [-1, 1]) { const e = k.cone(0.018, 0.05, 5, gold); e.position.set(0, 0.16, s * 0.11); e.rotation.x = -s * Math.PI / 2; g.add(e); }
    const gr = k.cyl(0.018, 0.019, 0.27, 8, umber); gr.position.y = 0.01; g.add(gr);
    g.add(k.wrap(-0.12, 0.13, 0.0205, 6, 'cloth_dark'));
    const pm = k.sphere(0.035, 1, black); pm.position.y = -0.16; g.add(pm);
    const pr = k.cyl(0.038, 0.038, 0.01, 8, gold); pr.position.y = -0.13; g.add(pr);
    k.marker(g, 'base', [0, 0.18, 0]); k.marker(g, 'tip', [0, 1.12, 0]);
    return g;
  },
};
