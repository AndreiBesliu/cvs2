// Sondă s7 (aruncabilă). Generator determinist de document cncvs2 cu N noduri, plus defecte injectate
// cu calea așteptată scrisă de mână (oracolul pentru validatori). Nu depinde de nicio bibliotecă de schemă.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hex64(r) {
  let s = '';
  for (let i = 0; i < 64; i++) s += '0123456789abcdef'[Math.floor(r() * 16)];
  return s;
}

// Corpus care rupe coincidențele: unghiuri 30-90°, arce, cubice, trăsături de 0,01 mm, foaie de 2440 mm,
// puncte aproape coincidente (1e-9 mm).
function makeSubpaths(r, U) {
  const n = 1 + Math.floor(r() * 2);
  const out = [];
  for (let s = 0; s < n; s++) {
    let x = U(0, 2440), y = U(0, 1220);
    const start = [x, y];
    const segs = [];
    const m = 3 + Math.floor(r() * 8);
    for (let k = 0; k < m; k++) {
      const t = r();
      const ang = ((30 + 60 * r()) * Math.PI) / 180 + k * Math.PI / 2;
      const len = t < 0.08 ? 0.01 : U(0.5, 300);
      const nx = x + len * Math.cos(ang), ny = y + len * Math.sin(ang);
      if (t < 0.55) segs.push({ k: 'L', x: nx, y: ny });
      else if (t < 0.8) segs.push({ k: 'A', x: nx, y: ny, cx: (x + nx) / 2 + 1e-9, cy: (y + ny) / 2, cw: r() < 0.5 });
      else segs.push({ k: 'C', x1: x + len / 3, y1: y, x2: nx - len / 3, y2: ny, x: nx, y: ny });
      x = nx; y = ny;
    }
    out.push({ start, segs, closed: r() < 0.7 });
  }
  return out;
}

export function makeDoc(nNodes = 50000, seed = 7) {
  const r = mulberry32(seed);
  const U = (lo, hi) => lo + (hi - lo) * r();
  const fonts = [hex64(r), hex64(r)];
  const meshAsset = hex64(r), fieldAsset = hex64(r);
  const assets = {
    [fonts[0]]: { kind: 'font', bytes: 182344, name: 'Roboto-Regular.ttf' },
    [fonts[1]]: { kind: 'font', bytes: 98232, name: 'Inter-Bold.otf' },
    [meshAsset]: { kind: 'mesh', bytes: 104857684, name: 'leu.stl' },
    [fieldAsset]: { kind: 'heightfield', bytes: 67108864, name: 'relief-pictat.f32' },
  };
  const nodes = {};
  const root = { id: 'root', type: 'group', name: 'Planșa 1', transform: [1, 0, 0, 1, 0, 0], children: [] };
  nodes.root = root;
  let gi = 0, cur = null;
  const vectorIds = [];
  for (let i = 1; i < nNodes; i++) {
    if ((i - 1) % 50 === 0) {
      gi++;
      const g = { id: `g${gi}`, type: 'group', name: `Grup ${gi}`, transform: [1, 0, 0, 1, U(0, 2440), U(0, 1220)], children: [] };
      nodes[g.id] = g; root.children.push(g.id); cur = g;
      continue;
    }
    const id = `n${i}`;
    const t = r();
    const rot = U(0, Math.PI * 2), c = Math.cos(rot), s = Math.sin(rot);
    const transform = [c, s, -s, c, U(-50, 2440), U(-50, 1220)];
    let node;
    if (t < 0.94) { node = { id, type: 'vector', name: '', transform, subpaths: makeSubpaths(r, U) }; vectorIds.push(id); }
    else if (t < 0.97) node = { id, type: 'text', name: '', transform, text: `Atelier ăîșț ${i}`, font: fonts[i % 2], size: U(3, 120) };
    else if (t < 0.99) node = { id, type: 'relief', name: '', transform, recipe: { w: U(10, 2440), h: U(10, 1220), res: U(0.05, 1), base: U(-5, 5), source: fieldAsset } };
    else node = { id, type: 'mesh', name: '', transform, asset: meshAsset, scale: U(0.1, 10) };
    nodes[id] = node; cur.children.push(id);
  }
  const tools = {};
  for (let i = 1; i <= 20; i++) tools[`t${i}`] = { id: `t${i}`, kind: ['flat', 'ball', 'vbit'][i % 3], diameter: U(0.5, 25), angle: i % 3 === 2 ? [30, 60, 90][i % 3] : 0, flutes: 1 + (i % 4) };
  const setups = [
    { id: 's1', stock: { w: 2440, h: 1220, t: 18 }, origin: [0, 0, 18], tolerance: 0.01 },
    { id: 's2', stock: { w: 1220, h: 610, t: 6 }, origin: [0, 0, 0], tolerance: 0.001 },
  ];
  const operations = [];
  for (let i = 0; i < 2000; i++) {
    const nt = 1 + Math.floor(r() * 20), targets = [];
    for (let k = 0; k < nt; k++) targets.push(vectorIds[Math.floor(r() * vectorIds.length)]);
    operations.push({ id: `op${i}`, setupId: i % 2 ? 's2' : 's1', kind: ['profile', 'pocket', 'vcarve', 'engrave', 'drill'][i % 5], targets, tool: `t${1 + (i % 20)}`, depth: U(0.1, 18), stepdown: U(0.5, 6), order: i, enabled: r() < 0.9 });
  }
  return {
    format: 'cncvs2', schema: 1, minWriter: 1, rev: 17, units: 'mm', root: 'root',
    meta: { name: 'Probă 50k noduri' }, nodes, setups, operations, tools, assets,
  };
}

// Câmpuri necunoscute (scrise de un build mai nou) puse pe 5 niveluri. Toți validatorii trebuie să le păstreze.
export function addUnknownFields(doc) {
  const v = firstOf(doc, 'vector');
  doc.x_viitor = { a: 1, lista: [1, 2] };
  doc.nodes[v].glow = 3;
  doc.nodes[v].subpaths[0].segs[0].bulge = 0.25;
  doc.operations[0].leadIn = { r: 2 };
  doc.setups[0].stock.fibra = 'x';
  return doc;
}

export function firstOf(doc, type, from = 0, pred = () => true) {
  for (let i = from; ; i++) {
    const n = doc.nodes[`n${i}`];
    if (n && n.type === type && pred(n)) return n.id;
    if (i > 1e6) throw new Error('nu există');
  }
}

// Defectele: fiecare cu calea așteptată, scrisă din locul injecției, nu din vreun validator.
export function faults(doc) {
  const N = Object.keys(doc.nodes).length, at = (f) => Math.floor(N * f);
  const vA = firstOf(doc, 'vector', at(0.2469));
  const vB = firstOf(doc, 'vector', at(0.6667));
  const vC = firstOf(doc, 'vector', at(0.8), (n) => n.subpaths.length > 1);
  const vE = firstOf(doc, 'vector', at(0.9), (n) => n.subpaths[0].segs.some((s) => s.k === 'A'));
  const iE = doc.nodes[vE].subpaths[0].segs.findIndex((s) => s.k === 'A');
  const tD = firstOf(doc, 'text', at(0.4));
  const meshHash = Object.keys(doc.assets).find((h) => doc.assets[h].kind === 'mesh');
  return [
    { name: 'coordonată 1e400 (Infinity din JSON.parse)', path: ['nodes', vA, 'subpaths', 0, 'segs', 1, 'x'], apply: (d) => { d.nodes[vA].subpaths[0].segs[1].x = JSON.parse('1e400'); } },
    { name: 'NaN în matricea de plasare', path: ['nodes', vB, 'transform', 4], apply: (d) => { d.nodes[vB].transform[4] = NaN; } },
    { name: 'grosime placă 0', path: ['setups', 0, 'stock', 't'], apply: (d) => { d.setups[0].stock.t = 0; } },
    { name: 'diametru frezei negativ', path: ['tools', 't3', 'diameter'], apply: (d) => { d.tools.t3.diameter = -6; } },
    { name: 'toleranță 5 mm (max 1)', path: ['setups', 1, 'tolerance'], apply: (d) => { d.setups[1].tolerance = 5; } },
    { name: 'tip de segment necunoscut', path: ['nodes', vC, 'subpaths', 1, 'segs', 0, 'k'], apply: (d) => { d.nodes[vC].subpaths[1].segs[0].k = 'Q'; } },
    { name: 'ordine neîntreagă', path: ['operations', 777, 'order'], apply: (d) => { d.operations[777].order = 2.5; } },
    { name: 'hash de font invalid', path: ['nodes', tD, 'font'], apply: (d) => { d.nodes[tD].font = 'xyz'; } },
    { name: 'sens de arc ca text', path: ['nodes', vE, 'subpaths', 0, 'segs', iE, 'cw'], apply: (d) => { d.nodes[vE].subpaths[0].segs[iE].cw = 'yes'; } },
    { name: 'mărime de resursă negativă', path: ['assets', meshHash, 'bytes'], apply: (d) => { d.assets[meshHash].bytes = -1; } },
  ];
}

// JSON canonic: chei sortate, fără spații. Folosit pentru comparații independente de ordinea cheilor.
export function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

export function countNodes(doc) { return Object.keys(doc.nodes).length; }
