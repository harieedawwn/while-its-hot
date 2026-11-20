#!/usr/bin/env node
/* lab-sheet.mjs — headless check + contact sheet for weapon-lab files (same kit as weapon-lab/preview.html).
 *   node tools/lab-sheet.mjs [file-substr …] [--out shots/lab] [--per 6]
 * Prints per weapon: tris, parts, size, markers, AABB-connected groups (floating check). Writes sheet PNGs
 * (3 views per weapon: profile, 3/4, front). Exit 1 if a file fails to build. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };
const skip = new Set(['--out', '--per']);
const filters = args.filter((a, i) => !a.startsWith('--') && !skip.has(args[i - 1]));
const out = path.resolve(root, opt('--out', 'shots/lab')); const per = +opt('--per', 6);
fs.mkdirSync(out, { recursive: true });
const wdir = path.join(root, 'weapon-lab/weapons');
let files = fs.readdirSync(wdir).filter(f => f.endsWith('.js') && f !== 'the_dao_pha_thu.js').sort();
if (filters.length) files = files.filter(f => filters.some(s => f.includes(s)));

const prev = fs.readFileSync(path.join(root, 'weapon-lab/preview.html'), 'utf8');
const kitSrc = prev.slice(prev.indexOf('// ---- slots'), prev.indexOf('// ---- scene ----'));
const page = `<!doctype html><meta charset=utf-8><body style="margin:0">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const warnings=[]; function warn(s){warnings.push(s)}
${kitSrc}
const W=240,H=360, files=${JSON.stringify(files)}, PER=${per};
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true}); renderer.setSize(W,H);
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x15110f);
scene.add(new THREE.HemisphereLight(0x8899aa,0x2a1a10,1.0));
const key=new THREE.DirectionalLight(0xffc08a,2.2); key.position.set(2,3,2); scene.add(key);
const rim=new THREE.DirectionalLight(0x7f93a1,1.0); rim.position.set(-2,1,-2); scene.add(rim);
const cam=new THREE.PerspectiveCamera(30,W/H,0.05,50);
const res=[], sheets=[];
let sheet,ctx;
for(let n=0;n<files.length;n++){
  if(n%PER===0){sheet=document.createElement('canvas');sheet.width=W*3*2;sheet.height=H*Math.ceil(Math.min(PER,files.length-n)/2);ctx=sheet.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,sheet.width,sheet.height);sheets.push(sheet);}
  const f=files[n]; warnings.length=0; const r={file:f};
  try{
    const w=(await import('/weapons/'+f)).default; r.id=w.meta.id; r.fam=w.meta.family; r.lvl=w.meta.level; r.len=w.meta.lengthM;
    const g=w.build(kit); scene.add(g); g.updateMatrixWorld(true);
    let tris=0,parts=0; const boxes=[]; g.traverse(o=>{if(o.isMesh){parts++;const gi=o.geometry;tris+=(gi.index?gi.index.count:gi.attributes.position.count)/3; boxes.push(new THREE.Box3().setFromObject(o));}});
    const box=new THREE.Box3().setFromObject(g), size=box.getSize(new THREE.Vector3()), c=box.getCenter(new THREE.Vector3());
    // AABB connectivity (2 mm slack)
    const par=boxes.map((_,i)=>i); const find=i=>par[i]===i?i:(par[i]=find(par[i]));
    const bx=boxes.map(b=>b.clone().expandByScalar(0.004));
    for(let i=0;i<bx.length;i++)for(let j=i+1;j<bx.length;j++)if(bx[i].intersectsBox(bx[j]))par[find(i)]=find(j);
    r.tris=tris|0; r.parts=parts; r.size=[size.x,size.y,size.z].map(v=>+v.toFixed(2)); r.y=[+box.min.y.toFixed(2),+box.max.y.toFixed(2)];
    r.groups=new Set(boxes.map((_,i)=>find(i))).size; r.markers=!!g.getObjectByName('tip')&&!!g.getObjectByName('base');
    r.warn=[...warnings];
    const ext=Math.max(size.x,size.y,size.z)*1.0; const dist=ext/(2*Math.tan(THREE.MathUtils.degToRad(15)))*1.15+size.z*0.3;
    const dirs=[[1,0.05,0],[0.8,0.35,0.9],[0,0.05,1]];
    dirs.forEach((d,vi)=>{
      const v=new THREE.Vector3(...d).normalize();
      cam.position.copy(c).addScaledVector(v,Math.max(dist,0.8)); cam.lookAt(c); cam.updateProjectionMatrix();
      renderer.render(scene,cam);
      const col=(n%PER)%2, row=Math.floor((n%PER)/2);
      ctx.drawImage(renderer.domElement,(col*3+vi)*W,row*H);
    });
    const col=(n%PER)%2,row=Math.floor((n%PER)/2); ctx.fillStyle='#fff';ctx.font='14px sans-serif';ctx.fillText(r.id+' +'+r.lvl+' '+r.tris+'t',col*3*W+6,row*H+16);
    scene.remove(g);
  }catch(e){r.error=String(e&&e.stack||e).split('\\n').slice(0,3).join(' | ')}
  res.push(r);
}
window.__out={res,sheets:sheets.map(s=>s.toDataURL('image/png'))};
</script>`;

const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') { res.setHeader('content-type', 'text/html'); return res.end(page); }
  const map = u.startsWith('/three/') ? path.join(root, 'node_modules/three', u.slice(7)) : u.startsWith('/weapons/') ? path.join(wdir, u.slice(9)) : null;
  if (!map || !fs.existsSync(map)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', 'text/javascript'); res.end(fs.readFileSync(map));
}).listen(0);
await new Promise(r => srv.on('listening', r));
const { chromium } = createRequire(import.meta.url)('playwright');
const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await br.newPage();
pg.on('pageerror', e => console.error('pageerror', e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/`);
await pg.waitForFunction('window.__out', null, { timeout: 120000 });
const o = await pg.evaluate('window.__out');
o.sheets.forEach((s, i) => fs.writeFileSync(path.join(out, `lab-${i + 1}.png`), Buffer.from(s.split(',')[1], 'base64')));
let bad = 0;
for (const r of o.res) {
  if (r.error) { bad = 1; console.log(r.file, 'ERROR', r.error); continue; }
  const flags = [];
  if (r.tris > 1500) flags.push('TRIS'); if (!r.markers) flags.push('NOMARKER'); if (r.groups > 1) flags.push('groups=' + r.groups);
  if (r.warn.length) flags.push(...r.warn);
  console.log(`${r.id} ${r.fam}+${r.lvl} tris=${r.tris} parts=${r.parts} size=${r.size} y=${r.y} meta=${r.len} ${flags.join(' ')}`);
}
await br.close(); srv.close(); process.exit(bad);
