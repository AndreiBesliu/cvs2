// psmini.mjs - interpretor PostScript MINIM, ARUNCABIL (sonda s12-formate). NU e cod de produs.
// Scop: masuram cat dintr-un EPS real poate citi un interpretor "subset" scris de noi:
//   mod "full": executa tot fisierul, inclusiv procset-urile producatorului (AGM la Illustrator, gnudict la gnuplot);
//   mod "body": sare peste prolog/resurse/setup (DSC) si executa doar corpul paginii, cu o tabela de alias-uri
//               per producator (citita din procset-ul din fisier, nu ghicita).
// Iesire: caile pictate (fill/eofill/stroke), in spatiul utilizator implicit (pt), dupa CTM.
// Limbajul e cel din PostScript Language Reference Manual, ed. 3 (Adobe, 1999) - specificatie publica.

class PSError extends Error { constructor(name, detail) { super(name + (detail ? ': ' + detail : '')); this.psname = name; } }
class ExitSig { }
class StopSig { }
class QuitSig { }

const POISON = process.env.POISON || '';

// ---------- obiecte ----------
const nm = (v, x = false) => ({ t: 'name', v, x });
const mkStr = (s) => { const b = typeof s === 'string' ? Uint8Array.from(s, (c) => c.charCodeAt(0) & 255) : s; return { t: 'str', buf: { b }, off: 0, len: b.length, x: false }; };
const strVal = (s) => { let r = ''; for (let i = 0; i < s.len; i++) r += String.fromCharCode(s.buf.b[s.off + i]); return r; };
const mkArr = (a, x = false) => ({ t: 'arr', buf: { a }, off: 0, len: a.length, x });
const arrItems = (o) => o.buf.a.slice(o.off, o.off + o.len);
const mkDict = () => ({ t: 'dict', m: new Map(), x: false });
const MARK = { t: 'mark' };
const typeName = (o) => {
  if (o === null || o === undefined) return 'nulltype';
  if (typeof o === 'number') return Number.isInteger(o) && !o.__real ? 'integertype' : 'realtype';
  if (typeof o === 'boolean') return 'booleantype';
  if (o.t === 'real') return 'realtype';
  return { name: 'nametype', str: 'stringtype', arr: 'arraytype', dict: 'dicttype', op: 'operatortype', mark: 'marktype', file: 'filetype', save: 'savetype', font: 'fonttype', gst: 'gstatetype' }[o.t] || 'nulltype';
};
const keyOf = (k) => {
  if (k === null) return 'Z';
  if (typeof k === 'number') return 'R' + k;
  if (typeof k === 'boolean') return 'B' + k;
  if (k.t === 'name') return 'N' + k.v;
  if (k.t === 'str') return 'N' + strVal(k);
  if (k.t === 'arr') return k.buf; // identitate de tablou (aproximativ)
  return k;
};
const dget = (d, k) => { const e = d.m.get(keyOf(k)); return e ? e[1] : undefined; };
const dhas = (d, k) => d.m.has(keyOf(k));
const dput = (d, k, v) => { if (k && k.t === 'str') k = nm(strVal(k)); d.m.set(keyOf(k), [k, v]); };
const isExecArr = (o) => o && o.t === 'arr' && o.x;
const num = (o) => { if (typeof o !== 'number') throw new PSError('typecheck', 'number expected, got ' + typeName(o)); return o; };

// ---------- scanner ----------
const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set('()<>[]{}/%'.split('').map((c) => c.charCodeAt(0)));
export class Scanner {
  constructor(bytes) { this.b = bytes; this.p = 0; }
  eof() { return this.p >= this.b.length; }
  skipWsAndComments(onComment) {
    const b = this.b;
    for (;;) {
      while (this.p < b.length && WS.has(b[this.p])) this.p++;
      if (this.p < b.length && b[this.p] === 37) { // %
        const s = this.p; while (this.p < b.length && b[this.p] !== 10 && b[this.p] !== 13) this.p++;
        if (onComment) { const r = onComment(this.lineText(s, this.p), s); if (r === 'stop' || r === 'skip') return r; }
        continue;
      }
      return;
    }
  }
  lineText(s, e) { let r = ''; for (let i = s; i < e && i - s < 200; i++) r += String.fromCharCode(this.b[i]); return r; }
  consumeOneWs() { const c = this.b[this.p]; if (c === 13) { this.p++; if (this.b[this.p] === 10) this.p++; } else if (WS.has(c)) this.p++; }
  // returneaza: {k:'obj', v} | {k:'open'} | {k:'close'} | null
  next(onComment) {
    const sw = this.skipWsAndComments(onComment); if (sw === 'stop') return null; if (sw === 'skip') return { k: 'skip' };
    const b = this.b; if (this.p >= b.length) return null;
    const c = b[this.p];
    if (c === 123) { this.p++; return { k: 'open' }; }
    if (c === 125) { this.p++; return { k: 'close' }; }
    if (c === 40) return { k: 'obj', v: this.readParenString() };
    if (c === 60) {
      if (b[this.p + 1] === 60) { this.p += 2; return { k: 'obj', v: nm('<<', true) }; }
      if (b[this.p + 1] === 126) return { k: 'obj', v: this.readA85() };
      return { k: 'obj', v: this.readHexString() };
    }
    if (c === 62 && b[this.p + 1] === 62) { this.p += 2; return { k: 'obj', v: nm('>>', true) }; }
    if (c === 91 || c === 93) { this.p++; return { k: 'obj', v: nm(String.fromCharCode(c), true) }; }
    if (c === 47) { // /name sau //name
      this.p++; let imm = false; if (b[this.p] === 47) { imm = true; this.p++; }
      const s = this.p; while (this.p < b.length && !WS.has(b[this.p]) && !DELIM.has(b[this.p])) this.p++;
      const v = this.lineText(s, this.p); this.consumeOneWs();
      return { k: 'obj', v: imm ? { t: 'imm', v } : nm(v, false) };
    }
    const s = this.p; while (this.p < b.length && !WS.has(b[this.p]) && !DELIM.has(b[this.p])) this.p++;
    if (this.p === s) { this.p++; throw new PSError('syntaxerror', 'char ' + c); }
    const tok = this.lineText(s, this.p); this.consumeOneWs();
    const n = parseNum(tok); if (n !== undefined) return { k: 'obj', v: n };
    return { k: 'obj', v: nm(tok, true) };
  }
  readParenString() {
    const b = this.b; this.p++; let depth = 1; const out = [];
    while (this.p < b.length) {
      const c = b[this.p++];
      if (c === 92) { // backslash
        const d = b[this.p++];
        const map = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12, 92: 92, 40: 40, 41: 41 };
        if (map[d] !== undefined) out.push(map[d]);
        else if (d >= 48 && d <= 55) { let v = d - 48; for (let k = 0; k < 2 && b[this.p] >= 48 && b[this.p] <= 55; k++) v = v * 8 + (b[this.p++] - 48); out.push(v & 255); }
        else if (d === 13) { if (b[this.p] === 10) this.p++; } else if (d === 10) { /* continuare */ } else out.push(d);
        continue;
      }
      if (c === 40) depth++;
      if (c === 41) { depth--; if (depth === 0) break; }
      out.push(c);
    }
    return mkStr(Uint8Array.from(out));
  }
  readHexString() {
    const b = this.b; this.p++; const out = []; let hi = -1;
    while (this.p < b.length && b[this.p] !== 62) { const h = hexv(b[this.p++]); if (h < 0) continue; if (hi < 0) hi = h; else { out.push(hi * 16 + h); hi = -1; } }
    this.p++; if (hi >= 0) out.push(hi * 16); return mkStr(Uint8Array.from(out));
  }
  readA85() {
    const b = this.b; this.p += 2; const out = []; let grp = [];
    while (this.p < b.length) {
      const c = b[this.p++]; if (c === 126) { this.p++; break; } if (WS.has(c)) continue;
      if (c === 122 && grp.length === 0) { out.push(0, 0, 0, 0); continue; }
      grp.push(c - 33); if (grp.length === 5) { let v = 0; for (const g of grp) v = v * 85 + g; out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); grp = []; }
    }
    if (grp.length) { const n = grp.length; while (grp.length < 5) grp.push(84); let v = 0; for (const g of grp) v = v * 85 + g; const by = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; out.push(...by.slice(0, n - 1)); }
    return mkStr(Uint8Array.from(out));
  }
}
const hexv = (c) => (c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1);
function parseNum(t) {
  if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10);
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(t)) { const v = parseFloat(t); return v; }
  const m = /^(\d+)#([0-9a-zA-Z]+)$/.exec(t); if (m) { const v = parseInt(m[2], +m[1]); if (!Number.isNaN(v)) return v; }
  return undefined;
}

// ---------- matrice ----------
const mmul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];
const mapPt = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const minv = (m) => { const d = m[0] * m[3] - m[1] * m[2]; if (!d) throw new PSError('undefinedresult'); return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
const arrToM = (a) => { const v = arrItems(a); if (v.length !== 6) throw new PSError('rangecheck', 'matrix'); return v.map(num); };
const mToArr = (m, a) => { for (let i = 0; i < 6; i++) a.buf.a[a.off + i] = m[i]; return a; };

// ---------- interpretorul ----------
export function implementedOps() { const r = runPS(new Uint8Array(0), { listOps: true }); return r.ops; }
export function runPS(bytes, opts = {}) {
  const mode = opts.mode || 'full';
  const aliases = opts.aliases || {};
  const os = []; // stiva de operanzi
  const systemdict = mkDict(); const globaldict = mkDict(); const userdict = mkDict();
  const ds = [systemdict, globaldict, userdict];
  const stats = { unknown: new Map(), opsUsed: new Map(), errors: [], skipped: { text: 0, image: 0 }, steps: 0 };
  const paths = []; const clips = [];
  let gs = newGState(); const gstack = [];
  const sc = new Scanner(bytes);
  const resources = new Map();
  let stepLimit = opts.stepLimit || 5e7;

  function newGState() { return { ctm: [1, 0, 0, 1, 0, 0], path: [], cp: null, lw: 1, strokeAdjust: false, font: null, color: [0], cs: 'DeviceGray' }; }
  const cloneG = (g) => ({ ...g, ctm: g.ctm.slice(), path: g.path.map((sp) => ({ pts: sp.pts.map((s) => ({ ...s })), closed: sp.closed })), cp: g.cp ? g.cp.slice() : null });

  const pop = () => { if (!os.length) throw new PSError('stackunderflow'); return os.pop(); };
  const popN = () => num(pop());
  const push = (v) => os.push(v);
  const lookup = (key) => { for (let i = ds.length - 1; i >= 0; i--) { const v = dget(ds[i], key); if (v !== undefined) return v; } return undefined; };

  function defOp(name, f) { dput(systemdict, nm(name), { t: 'op', n: name, f }); }

  // ---- executie ----
  function execObj(o) {
    if (++stats.steps > stepLimit) throw new PSError('timeout', 'step limit');
    if (o === null || typeof o !== 'object') { push(o); return; }
    if (o.t === 'name' && o.x) {
      let v = lookup(o);
      if (v === undefined && aliases[o.v]) { v = lookup(nm(aliases[o.v])); }
      if (v === undefined) { stats.unknown.set(o.v, (stats.unknown.get(o.v) || 0) + 1); throw new PSError('undefined', o.v); }
      return execValue(v);
    }
    if (o.t === 'op') return callOp(o);
    push(o);
  }
  function execValue(v) {
    if (v && typeof v === 'object') {
      if (v.t === 'op') return callOp(v);
      if (isExecArr(v)) return execProc(v);
      if (v.t === 'name' && v.x) return execObj(v);
    }
    push(v);
  }
  function callOp(op) { stats.opsUsed.set(op.n, (stats.opsUsed.get(op.n) || 0) + 1); op.f(); }
  function execProc(p) {
    const a = p.buf.a; const end = p.off + p.len;
    for (let i = p.off; i < end; i++) {
      const o = a[i];
      if (o && typeof o === 'object' && o.t === 'arr') { push(o); continue; } // procedurile imbricate se pun pe stiva
      execObj(o);
    }
  }
  // exec pentru orice obiect (operatorul exec)
  function execAny(o) {
    if (o && typeof o === 'object') {
      if (isExecArr(o)) return execProc(o);
      if (o.t === 'name' && o.x) return execObj(o);
      if (o.t === 'op') return callOp(o);
      if (o.t === 'str' && o.x) { return runSub(o.buf.b.slice(o.off, o.off + o.len)); }
      if (o.t === 'file') return; // currentfile cvx exec: ignorat
    }
    push(o);
  }
  function runSub(bytes) { const s2 = new Scanner(bytes); const pstack = []; for (;;) { const t = s2.next(); if (!t) break; handleToken(t, pstack); } }

  // ---- constructia procedurilor la scanare ----
  function handleToken(t, pstack) {
    if (t.k === 'open') { pstack.push([]); return; }
    if (t.k === 'close') { const a = pstack.pop(); if (!a) throw new PSError('syntaxerror', 'extra }'); const proc = mkArr(a, true); if (pstack.length) pstack[pstack.length - 1].push(proc); else push(proc); return; }
    let v = t.v;
    if (v && v.t === 'imm') { const r = lookup(nm(v.v)); if (r === undefined) throw new PSError('undefined', '//' + v.v); v = r; }
    if (pstack.length) { pstack[pstack.length - 1].push(v); return; }
    execObj(v);
  }

  // ---- cai ----
  const needCP = () => { if (!gs.cp) throw new PSError('nocurrentpoint'); };
  function moveto(x, y) { const [X, Y] = mapPt(gs.ctm, x, y); gs.path.push({ pts: [{ k: 'M', p: [X, Y] }], closed: false }); gs.cp = [X, Y]; }
  function lineto(x, y) { needCP(); const [X, Y] = mapPt(gs.ctm, x, y); gs.path[gs.path.length - 1].pts.push({ k: 'L', p: [X, Y] }); gs.cp = [X, Y]; }
  function curveto(x1, y1, x2, y2, x3, y3) {
    needCP(); const a = mapPt(gs.ctm, x1, y1), b = mapPt(gs.ctm, x2, y2), c = mapPt(gs.ctm, x3, y3);
    if (POISON === 'cv-as-li') { gs.path[gs.path.length - 1].pts.push({ k: 'L', p: c }); gs.cp = c; return; }
    gs.path[gs.path.length - 1].pts.push({ k: 'C', p: [...a, ...b, ...c] }); gs.cp = c;
  }
  function closepath() { if (!gs.path.length) return; const sp = gs.path[gs.path.length - 1]; sp.closed = true; const m = sp.pts[0].p; gs.path.push({ pts: [{ k: 'M', p: [m[0], m[1]] }], closed: false, implicit: true }); gs.cp = [m[0], m[1]]; }
  const cleanPath = (p) => p.filter((sp) => sp.pts.length > 1).map((sp) => ({ pts: sp.pts, closed: sp.closed })); // un moveto singur nu picteaza nimic (PLRM: stroke/fill)
  function paint(kind) { const p = cleanPath(gs.path); if (p.length) paths.push({ kind, sub: p }); gs.path = []; gs.cp = null; }
  function arcImpl(xc, yc, r, a1, a2, neg) {
    let A1 = a1 * Math.PI / 180, A2 = a2 * Math.PI / 180;
    if (!neg) { while (A2 < A1) A2 += 2 * Math.PI; } else { while (A2 > A1) A2 -= 2 * Math.PI; }
    const sweep = A2 - A1; const n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9)); const d = sweep / n; const k = 4 / 3 * Math.tan(d / 4);
    const sx = xc + r * Math.cos(A1), sy = yc + r * Math.sin(A1);
    if (gs.cp) lineto(sx, sy); else moveto(sx, sy);
    for (let i = 0; i < n; i++) {
      const t0 = A1 + i * d, t1 = t0 + d; const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
      curveto(xc + r * (c0 - k * s0), yc + r * (s0 + k * c0), xc + r * (c1 + k * s1), yc + r * (s1 - k * c1), xc + r * c1, yc + r * s1);
    }
  }

  // ---- operatori ----
  const O = defOp;
  // stiva
  O('pop', () => pop()); O('exch', () => { const b = pop(), a = pop(); push(b); push(a); }); O('dup', () => { const a = pop(); push(a); push(a); });
  O('copy', () => { const t = pop(); if (typeof t === 'number') { if (t > os.length) throw new PSError('stackunderflow'); os.push(...os.slice(os.length - t)); return; }
    const s = pop(); if (t.t === 'str' || t.t === 'arr') { const key = t.t === 'str' ? 'b' : 'a'; for (let i = 0; i < s.len; i++) t.buf[key][t.off + i] = s.buf[key][s.off + i]; push({ ...t, len: s.len }); return; }
    if (t.t === 'dict') { for (const [k, e] of s.m) t.m.set(k, e); push(t); return; } throw new PSError('typecheck', 'copy'); });
  O('index', () => { const n = popN(); if (n >= os.length) throw new PSError('stackunderflow'); push(os[os.length - 1 - n]); });
  O('roll', () => { const j = popN(), n = popN(); if (n > os.length) throw new PSError('stackunderflow'); if (!n) return; const a = os.splice(os.length - n, n); const s = ((j % n) + n) % n; os.push(...a.slice(n - s), ...a.slice(0, n - s)); });
  O('clear', () => { os.length = 0; }); O('count', () => push(os.length)); O('mark', () => push(MARK));
  O('cleartomark', () => { while (os.length && os[os.length - 1] !== MARK) os.pop(); if (!os.length) throw new PSError('unmatchedmark'); os.pop(); });
  O('counttomark', () => { for (let i = os.length - 1; i >= 0; i--) if (os[i] === MARK) { push(os.length - 1 - i); return; } throw new PSError('unmatchedmark'); });
  // aritmetica
  const ar2 = (n, f) => O(n, () => { const b = popN(), a = popN(); push(f(a, b)); });
  ar2('add', (a, b) => a + b); ar2('sub', (a, b) => a - b); ar2('mul', (a, b) => a * b);
  ar2('div', (a, b) => { if (!b) throw new PSError('undefinedresult'); return a / b; }); ar2('idiv', (a, b) => Math.trunc(a / b)); ar2('mod', (a, b) => a % b);
  ar2('atan', (a, b) => { let d = Math.atan2(a, b) * 180 / Math.PI; if (d < 0) d += 360; return d; }); ar2('exp', (a, b) => Math.pow(a, b));
  ar2('bitshift', (a, b) => (b >= 0 ? a << b : a >> -b));
  const ar1 = (n, f) => O(n, () => push(f(popN())));
  ar1('neg', (a) => -a); ar1('abs', Math.abs); ar1('ceiling', Math.ceil); ar1('floor', Math.floor); ar1('round', (a) => Math.floor(a + 0.5)); ar1('truncate', Math.trunc);
  ar1('sqrt', Math.sqrt); ar1('sin', (a) => Math.sin(a * Math.PI / 180)); ar1('cos', (a) => Math.cos(a * Math.PI / 180)); ar1('ln', Math.log); ar1('log', Math.log10);
  O('cvi', () => { const a = pop(); push(typeof a === 'number' ? Math.trunc(a) : Math.trunc(parseFloat(strVal(a)))); });
  O('cvr', () => { const a = pop(); push(typeof a === 'number' ? a : parseFloat(strVal(a))); });
  let seed = 1; O('rand', () => { seed = (seed * 16807) % 2147483647; push(seed); }); O('srand', () => { seed = popN() || 1; }); O('rrand', () => push(seed));
  // relationale / logice
  const eqv = (a, b) => {
    if (typeof a === 'number' || typeof b === 'number' || typeof a === 'boolean' || a === null || b === null) return a === b;
    const sa = a.t === 'name' ? a.v : a.t === 'str' ? strVal(a) : null; const sb = b.t === 'name' ? b.v : b.t === 'str' ? strVal(b) : null;
    if (sa !== null && sb !== null) return sa === sb;
    if (a.t === 'arr' && b.t === 'arr') return a.buf === b.buf && a.off === b.off && a.len === b.len;
    if (a.t === 'op' && b.t === 'op') return a.f === b.f;
    return a === b;
  };
  O('eq', () => { const b = pop(), a = pop(); push(eqv(a, b)); }); O('ne', () => { const b = pop(), a = pop(); push(!eqv(a, b)); });
  const cmp = (n, f) => O(n, () => { const b = pop(), a = pop(); const va = typeof a === 'number' ? a : strVal(a), vb = typeof b === 'number' ? b : strVal(b); push(f(va, vb)); });
  cmp('gt', (a, b) => a > b); cmp('ge', (a, b) => a >= b); cmp('lt', (a, b) => a < b); cmp('le', (a, b) => a <= b);
  const lg = (n, fb, fi) => O(n, () => { const b = pop(), a = pop(); push(typeof a === 'boolean' ? fb(a, b) : fi(a, b)); });
  lg('and', (a, b) => a && b, (a, b) => a & b); lg('or', (a, b) => a || b, (a, b) => a | b); lg('xor', (a, b) => a !== b, (a, b) => a ^ b);
  O('not', () => { const a = pop(); push(typeof a === 'boolean' ? !a : ~a); });
  O('true', () => push(true)); O('false', () => push(false)); O('null', () => push(null));
  // tipuri / conversii
  O('type', () => push(nm(typeName(pop()), true)));
  O('cvlit', () => { const a = pop(); push(a && typeof a === 'object' ? { ...a, x: false } : a); });
  O('cvx', () => { const a = pop(); push(a && typeof a === 'object' ? { ...a, x: true } : a); });
  O('xcheck', () => { const a = pop(); push(!!(a && typeof a === 'object' && (a.x || a.t === 'op'))); });
  for (const n of ['executeonly', 'noaccess', 'readonly']) O(n, () => {});
  O('rcheck', () => { pop(); push(true); }); O('wcheck', () => { pop(); push(true); }); O('gcheck', () => { pop(); push(false); });
  O('cvn', () => { const s = pop(); push(nm(strVal(s), !!s.x)); });
  const toText = (a) => (typeof a === 'number' ? (Number.isInteger(a) ? String(a) : String(+a.toPrecision(6))) : typeof a === 'boolean' ? String(a) : a && a.t === 'name' ? a.v : a && a.t === 'str' ? strVal(a) : a && a.t === 'op' ? a.n : '--nostringval--');
  O('cvs', () => { const s = pop(), a = pop(); const t = toText(a); for (let i = 0; i < t.length; i++) s.buf.b[s.off + i] = t.charCodeAt(i); push({ ...s, len: t.length }); });
  O('cvrs', () => { const s = pop(), r = popN(), a = popN(); const t = Math.trunc(a).toString(r).toUpperCase(); for (let i = 0; i < t.length; i++) s.buf.b[s.off + i] = t.charCodeAt(i); push({ ...s, len: t.length }); });
  O('length', () => { const a = pop(); push(a.t === 'dict' ? a.m.size : a.t === 'name' ? a.v.length : a.len); });
  // tablouri si siruri
  O('array', () => { const n = popN(); push(mkArr(new Array(n).fill(null))); });
  O('[', () => push(MARK)); O('<<', () => push(MARK));
  O(']', () => { const a = []; while (os.length && os[os.length - 1] !== MARK) a.unshift(os.pop()); if (!os.length) throw new PSError('unmatchedmark'); os.pop(); push(mkArr(a)); });
  O('>>', () => { const a = []; while (os.length && os[os.length - 1] !== MARK) a.unshift(os.pop()); if (!os.length) throw new PSError('unmatchedmark'); os.pop(); const d = mkDict(); for (let i = 0; i + 1 < a.length; i += 2) dput(d, a[i], a[i + 1]); push(d); });
  O('astore', () => { const a = pop(); for (let i = a.len - 1; i >= 0; i--) a.buf.a[a.off + i] = pop(); push(a); });
  O('aload', () => { const a = pop(); os.push(...arrItems(a)); push(a); });
  O('get', () => { const k = pop(), c = pop(); if (c.t === 'dict') { const v = dget(c, k); if (v === undefined) throw new PSError('undefined', 'get ' + toText(k)); push(v); return; }
    if (c.t === 'arr') { if (k < 0 || k >= c.len) throw new PSError('rangecheck', 'get'); push(c.buf.a[c.off + k]); return; } if (c.t === 'str') { if (k < 0 || k >= c.len) throw new PSError('rangecheck', 'get'); push(c.buf.b[c.off + k]); return; } throw new PSError('typecheck', 'get'); });
  O('put', () => { const v = pop(), k = pop(), c = pop(); if (c.t === 'dict') dput(c, k, v); else if (c.t === 'arr') c.buf.a[c.off + k] = v; else if (c.t === 'str') c.buf.b[c.off + k] = v; else throw new PSError('typecheck', 'put'); });
  O('getinterval', () => { const n = popN(), i = popN(), c = pop(); if (i + n > c.len) throw new PSError('rangecheck', 'getinterval'); push({ ...c, off: c.off + i, len: n }); });
  O('putinterval', () => { const s = pop(), i = popN(), d = pop(); const key = d.t === 'str' ? 'b' : 'a'; for (let j = 0; j < s.len; j++) d.buf[key][d.off + i + j] = s.buf[key][s.off + j]; });
  O('string', () => push(mkStr(new Uint8Array(popN()))));
  O('anchorsearch', () => { const k = pop(), s = pop(); const a = strVal(s), b = strVal(k); if (a.startsWith(b)) { push({ ...s, off: s.off + b.length, len: s.len - b.length }); push({ ...s, len: b.length }); push(true); } else { push(s); push(false); } });
  O('search', () => { const k = pop(), s = pop(); const a = strVal(s), b = strVal(k); const i = a.indexOf(b); if (i >= 0) { push({ ...s, off: s.off + i + b.length, len: s.len - i - b.length }); push({ ...s, off: s.off + i, len: b.length }); push({ ...s, len: i }); push(true); } else { push(s); push(false); } });
  O('forall', () => { const p = pop(), c = pop();
    try {
      if (c.t === 'dict') { for (const [, [k, v]] of [...c.m]) { push(k); push(v); execProc(p); } }
      else if (c.t === 'arr') { for (const v of arrItems(c)) { push(v); execProc(p); } }
      else if (c.t === 'str') { for (let i = 0; i < c.len; i++) { push(c.buf.b[c.off + i]); execProc(p); } }
    } catch (e) { if (!(e instanceof ExitSig)) throw e; } });
  O('token', () => { const s = pop(); const s2 = new Scanner(s.buf.b.slice(s.off, s.off + s.len)); const t = s2.next(); if (!t) { push(false); return; } let v = t.v;
    if (t.k === 'open') { let depth = 1; const parts = [[]]; while (depth) { const u = s2.next(); if (!u) break; if (u.k === 'open') { depth++; parts.push([]); } else if (u.k === 'close') { depth--; const a = mkArr(parts.pop(), true); if (depth) parts[parts.length - 1].push(a); else v = a; } else parts[parts.length - 1].push(u.v); } }
    push({ ...s, off: s.off + s2.p, len: s.len - s2.p }); push(v); push(true); });
  // dictionare
  O('dict', () => { popN(); push(mkDict()); }); O('maxlength', () => { const d = pop(); push(d.m.size + 100); });
  O('begin', () => { const d = pop(); if (!d || d.t !== 'dict') throw new PSError('typecheck', 'begin'); ds.push(d); });
  O('end', () => { if (ds.length <= 3) throw new PSError('dictstackunderflow'); ds.pop(); });
  O('def', () => { const v = pop(), k = pop(); dput(ds[ds.length - 1], k, v); });
  O('load', () => { const k = pop(); const v = lookup(k); if (v === undefined) { stats.unknown.set(toText(k), (stats.unknown.get(toText(k)) || 0) + 1); throw new PSError('undefined', 'load ' + toText(k)); } push(v); });
  O('store', () => { const v = pop(), k = pop(); for (let i = ds.length - 1; i >= 0; i--) if (dhas(ds[i], k)) { dput(ds[i], k, v); return; } dput(ds[ds.length - 1], k, v); });
  O('known', () => { const k = pop(), d = pop(); push(dhas(d, k)); });
  O('where', () => { const k = pop(); for (let i = ds.length - 1; i >= 0; i--) if (dhas(ds[i], k)) { push(ds[i]); push(true); return; } push(false); });
  O('undef', () => { const k = pop(), d = pop(); d.m.delete(keyOf(k)); });
  O('currentdict', () => push(ds[ds.length - 1])); O('countdictstack', () => push(ds.length));
  O('dictstack', () => { const a = pop(); ds.forEach((d, i) => { a.buf.a[a.off + i] = d; }); push({ ...a, len: ds.length }); });
  O('cleardictstack', () => { ds.length = 3; });
  dput(systemdict, nm('systemdict'), systemdict); dput(systemdict, nm('userdict'), userdict); dput(systemdict, nm('globaldict'), globaldict);
  for (const n of ['statusdict', 'errordict', '$error', 'FontDirectory', 'GlobalFontDirectory', 'SharedFontDirectory', 'serverdict', '$SDict']) dput(systemdict, nm(n), mkDict());
  dput(dget(systemdict, nm('$error')), nm('newerror'), false);
  dput(systemdict, nm('StandardEncoding'), mkArr(new Array(256).fill(nm('.notdef'))));
  dput(systemdict, nm('ISOLatin1Encoding'), mkArr(new Array(256).fill(nm('.notdef'))));
  // control
  O('exec', () => execAny(pop()));
  O('if', () => { const p = pop(), c = pop(); if (typeof c !== 'boolean') throw new PSError('typecheck', 'if'); if (c) execAny(p); });
  O('ifelse', () => { const q = pop(), p = pop(), c = pop(); if (typeof c !== 'boolean') throw new PSError('typecheck', 'ifelse'); execAny(c ? p : q); });
  O('for', () => { const p = pop(), lim = popN(), inc = popN(); let i = popN(); try { for (; inc > 0 ? i <= lim : i >= lim; i += inc) { push(i); execProc(p); } } catch (e) { if (!(e instanceof ExitSig)) throw e; } });
  O('repeat', () => { const p = pop(), n = popN(); try { for (let i = 0; i < n; i++) execProc(p); } catch (e) { if (!(e instanceof ExitSig)) throw e; } });
  O('loop', () => { const p = pop(); try { for (;;) execProc(p); } catch (e) { if (!(e instanceof ExitSig)) throw e; } });
  O('exit', () => { throw new ExitSig(); }); O('stop', () => { throw new StopSig(); }); O('quit', () => { throw new QuitSig(); });
  O('stopped', () => { const p = pop(); const depth = ds.length; try { execAny(p); push(false); } catch (e) { if (e instanceof StopSig || e instanceof PSError) { if (e instanceof PSError) stats.errors.push('(in stopped) ' + e.message); while (ds.length > depth) ds.pop(); push(true); } else throw e; } });
  O('countexecstack', () => push(10)); O('execstack', () => { const a = pop(); push({ ...a, len: 0 }); });
  O('bind', () => { const p = pop(); const seen = new Set(); const bnd = (q) => { if (seen.has(q.buf)) return; seen.add(q.buf); for (let i = q.off; i < q.off + q.len; i++) { const o = q.buf.a[i]; if (o && o.t === 'name' && o.x) { const v = lookup(o); if (v && v.t === 'op') q.buf.a[i] = v; } else if (isExecArr(o)) bnd(o); } }; if (isExecArr(p)) bnd(p); push(p); });
  // VM / save
  O('save', () => { gstack.push(cloneG(gs)); push({ t: 'save', depth: gstack.length }); });
  O('restore', () => { const s = pop(); if (!s || s.t !== 'save') throw new PSError('typecheck', 'restore'); while (gstack.length >= s.depth) gs = gstack.pop(); });
  O('setglobal', () => pop()); O('currentglobal', () => push(false)); O('setpacking', () => pop()); O('currentpacking', () => push(false));
  O('vmstatus', () => { push(0); push(100000); push(10000000); }); O('vmreclaim', () => pop()); O('setvmthreshold', () => pop());
  O('languagelevel', () => push(2)); O('product', () => push(mkStr('cncvs2 psmini'))); O('version', () => push(mkStr('3010'))); O('revision', () => push(1)); O('serialnumber', () => push(0));
  O('realtime', () => push(0)); O('usertime', () => push(0));
  O('internaldict', () => { popN(); push(mkDict()); });
  // fisiere: currentfile citeste din scanner-ul principal
  const theFile = { t: 'file', x: false };
  O('currentfile', () => push(theFile));
  O('readline', () => { const s = pop(); pop(); const b = sc.b; let n = 0; while (sc.p < b.length && b[sc.p] !== 10 && b[sc.p] !== 13) { if (n < s.len) s.buf.b[s.off + n] = b[sc.p]; n++; sc.p++; } const eof = sc.p >= b.length; if (b[sc.p] === 13) sc.p++; if (b[sc.p] === 10) sc.p++; push({ ...s, len: Math.min(n, s.len) }); push(!eof || n > 0); });
  O('readstring', () => { const s = pop(); pop(); const n = Math.min(s.len, sc.b.length - sc.p); for (let i = 0; i < n; i++) s.buf.b[s.off + i] = sc.b[sc.p + i]; sc.p += n; push({ ...s, len: n }); push(n === s.len); });
  O('readhexstring', () => { const s = pop(); pop(); let n = 0, hi = -1; while (n < s.len && sc.p < sc.b.length) { const h = hexv(sc.b[sc.p++]); if (h < 0) continue; if (hi < 0) hi = h; else { s.buf.b[s.off + n++] = hi * 16 + h; hi = -1; } } push({ ...s, len: n }); push(n === s.len); });
  O('read', () => { pop(); if (sc.p < sc.b.length) { push(sc.b[sc.p++]); push(true); } else push(false); });
  O('bytesavailable', () => { pop(); push(sc.b.length - sc.p); });
  O('closefile', () => pop()); O('flushfile', () => pop()); O('flush', () => {}); O('print', () => pop()); O('=', () => pop()); O('==', () => pop()); O('pstack', () => {}); O('stack', () => {});
  O('filter', () => { throw new PSError('unsupported', 'filter'); }); O('file', () => { throw new PSError('invalidfileaccess', 'file'); }); O('run', () => { throw new PSError('invalidfileaccess', 'run'); });
  O('status', () => { pop(); push(false); }); O('deletefile', () => pop());
  // resurse si fonturi (fara text: textul se numara si se sare)
  const cat = (c) => { const k = typeof c === 'string' ? c : toText(c); if (!resources.has(k)) resources.set(k, new Map()); return resources.get(k); };
  for (const c of ['Category', 'Generic', 'Font', 'CIDFont', 'CMap', 'FontSet', 'Encoding', 'Form', 'Pattern', 'ProcSet', 'ColorSpace', 'Halftone', 'ColorRendering', 'Filter', 'ColorSpaceFamily', 'Emulator', 'IODevice', 'ColorRenderingType', 'FMapType', 'FontType', 'FormType', 'HalftoneType', 'ImageType', 'PatternType', 'FunctionType', 'ShadingType', 'OutputDevice']) cat('Category').set(c, mkDict());
  O('defineresource', () => { const c = pop(), inst = pop(), k = pop(); cat(c).set(toText(k), inst); push(inst); });
  O('findresource', () => { const c = pop(), k = pop(); const v = cat(c).get(toText(k)); if (v === undefined) { if (toText(c) === 'Font') { push(mkDict()); return; } throw new PSError('undefinedresource', toText(c) + '/' + toText(k)); } push(v); });
  O('resourcestatus', () => { const c = pop(), k = pop(); if (cat(c).has(toText(k))) { push(0); push(0); push(true); } else push(false); });
  O('undefineresource', () => { const c = pop(), k = pop(); cat(c).delete(toText(k)); });
  O('resourceforall', () => { pop(); pop(); pop(); pop(); });
  const mkFont = () => { const d = mkDict(); dput(d, nm('FontMatrix'), mkArr([0.001, 0, 0, 0.001, 0, 0])); dput(d, nm('FID'), { t: 'font' }); dput(d, nm('FontType'), 1); dput(d, nm('Encoding'), dget(systemdict, nm('StandardEncoding'))); dput(d, nm('FontName'), nm('Dummy')); return d; };
  const cpDict = (d) => { const n = mkDict(); for (const [k, e] of d.m) n.m.set(k, e); return n; };
  O('findfont', () => { pop(); push(mkFont()); }); O('definefont', () => { const f = pop(); pop(); push(f); }); O('undefinefont', () => pop());
  O('scalefont', () => { pop(); const f = pop(); push(f && f.t === 'dict' ? cpDict(f) : mkFont()); }); O('makefont', () => { pop(); const f = pop(); push(f && f.t === 'dict' ? cpDict(f) : mkFont()); });
  O('setfont', () => { gs.font = pop(); }); O('currentfont', () => push(gs.font || mkFont())); O('selectfont', () => { pop(); pop(); });
  O('stringwidth', () => { pop(); push(0); push(0); });
  const textOp = (n, k) => O(n, () => { for (let i = 0; i < k; i++) pop(); stats.skipped.text++; });
  textOp('show', 1); textOp('ashow', 3); textOp('widthshow', 4); textOp('awidthshow', 6); textOp('xshow', 2); textOp('yshow', 2); textOp('xyshow', 2); textOp('glyphshow', 1); textOp('kshow', 2); textOp('cshow', 2);
  O('charpath', () => { pop(); pop(); stats.skipped.text++; });
  O('setcachedevice', () => { for (let i = 0; i < 6; i++) pop(); }); O('setcharwidth', () => { pop(); pop(); });
  // stare grafica
  O('gsave', () => gstack.push(cloneG(gs))); O('grestore', () => { if (gstack.length) gs = gstack.pop(); }); O('grestoreall', () => { if (gstack.length) gs = gstack[0]; gstack.length = 0; });
  O('initgraphics', () => { gs = newGState(); });
  O('setlinewidth', () => { gs.lw = popN(); }); O('currentlinewidth', () => push(gs.lw));
  for (const n of ['setlinecap', 'setlinejoin', 'setmiterlimit', 'setflat', 'setoverprint', 'setsmoothness', 'setgray', 'setcolorrendering', 'settransfer', 'setblackgeneration', 'setundercolorremoval', 'sethalftone', 'setpattern', 'setuserparams', 'setsystemparams', 'setpagedevice', 'setdevparams', 'setcolorspace', 'setobjectformat', 'setucacheparams', 'setshared', 'sethalftonephase']) O(n, () => pop());
  O('setstrokeadjust', () => { gs.strokeAdjust = pop(); }); O('currentstrokeadjust', () => push(gs.strokeAdjust));
  O('setdash', () => { pop(); pop(); }); O('currentdash', () => { push(mkArr([])); push(0); });
  O('setrgbcolor', () => { pop(); pop(); pop(); }); O('sethsbcolor', () => { pop(); pop(); pop(); }); O('setcmykcolor', () => { pop(); pop(); pop(); pop(); });
  O('setcolor', () => { while (os.length && typeof os[os.length - 1] === 'number') os.pop(); });
  O('setcolortransfer', () => { pop(); pop(); pop(); pop(); }); O('setscreen', () => { pop(); pop(); pop(); }); O('setcolorscreen', () => { for (let i = 0; i < 12; i++) pop(); });
  for (const [n, vals] of [['currentgray', [0]], ['currentrgbcolor', [0, 0, 0]], ['currentcmykcolor', [0, 0, 0, 1]], ['currenthsbcolor', [0, 0, 0]], ['currentflat', [1]], ['currentoverprint', [false]], ['currentlinecap', [0]], ['currentlinejoin', [0]], ['currentmiterlimit', [10]], ['currentsmoothness', [0.02]], ['currentobjectformat', [0]], ['currentshared', [false]]]) O(n, () => vals.forEach(push));
  O('currentcolorspace', () => push(mkArr([nm('DeviceGray')]))); O('currentcolor', () => push(0));
  O('currenthalftone', () => push(mkDict())); O('currenttransfer', () => push(mkArr([], true))); O('currentblackgeneration', () => push(mkArr([], true))); O('currentundercolorremoval', () => push(mkArr([], true)));
  O('currentcolortransfer', () => { for (let i = 0; i < 4; i++) push(mkArr([], true)); }); O('currentscreen', () => { push(60); push(45); push(mkArr([], true)); });
  O('currentpagedevice', () => { const d = mkDict(); dput(d, nm('PageSize'), mkArr([612, 792])); dput(d, nm('HWResolution'), mkArr([72, 72])); push(d); });
  O('currentuserparams', () => push(mkDict())); O('currentsystemparams', () => push(mkDict())); O('currentdevparams', () => { pop(); push(mkDict()); });
  O('currentcolorrendering', () => push(mkDict())); O('findcolorrendering', () => { pop(); push(nm('DefaultColorRendering')); push(false); });
  O('nulldevice', () => {}); O('showpage', () => {}); O('copypage', () => {}); O('erasepage', () => {});
  O('gstate', () => push({ t: 'gst', g: cloneG(gs) })); O('currentgstate', () => { pop(); push({ t: 'gst', g: cloneG(gs) }); }); O('setgstate', () => { gs = cloneG(pop().g); });
  // matrice
  O('matrix', () => push(mkArr([1, 0, 0, 1, 0, 0]))); O('identmatrix', () => push(mToArr([1, 0, 0, 1, 0, 0], pop())));
  O('initmatrix', () => { gs.ctm = [1, 0, 0, 1, 0, 0]; }); O('defaultmatrix', () => push(mToArr([1, 0, 0, 1, 0, 0], pop())));
  O('currentmatrix', () => push(mToArr(gs.ctm, pop()))); O('setmatrix', () => { gs.ctm = arrToM(pop()); });
  O('concat', () => { const m = arrToM(pop()); if (POISON !== 'no-concat') gs.ctm = mmul(m, gs.ctm); });
  O('concatmatrix', () => { const r = pop(), b = arrToM(pop()), a = arrToM(pop()); push(mToArr(mmul(a, b), r)); });
  const optM = (fn) => { const t = os[os.length - 1]; if (t && t.t === 'arr') { const a = pop(); push(mToArr(fn(), a)); return true; } return false; };
  O('translate', () => { const top = os[os.length - 1]; if (top && top.t === 'arr') { const a = pop(); const ty = popN(), tx = popN(); push(mToArr([1, 0, 0, 1, tx, ty], a)); return; } const ty = popN(), tx = popN(); gs.ctm = mmul([1, 0, 0, 1, tx, ty], gs.ctm); });
  O('scale', () => { const top = os[os.length - 1]; if (top && top.t === 'arr') { const a = pop(); const sy = popN(), sx = popN(); push(mToArr([sx, 0, 0, sy, 0, 0], a)); return; } const sy = popN(), sx = popN(); if (POISON !== 'no-scale') gs.ctm = mmul([sx, 0, 0, sy, 0, 0], gs.ctm); });
  O('rotate', () => { const top = os[os.length - 1]; let a = null; if (top && top.t === 'arr') a = pop(); const d = popN() * Math.PI / 180; const m = [Math.cos(d), Math.sin(d), -Math.sin(d), Math.cos(d), 0, 0]; if (a) push(mToArr(m, a)); else gs.ctm = mmul(m, gs.ctm); });
  const tf = (n, f) => O(n, () => { const top = os[os.length - 1]; let m = gs.ctm; if (top && top.t === 'arr') m = arrToM(pop()); const y = popN(), x = popN(); const [X, Y] = f(m, x, y); push(X); push(Y); });
  tf('transform', (m, x, y) => mapPt(m, x, y)); tf('itransform', (m, x, y) => mapPt(minv(m), x, y));
  tf('dtransform', (m, x, y) => [m[0] * x + m[2] * y, m[1] * x + m[3] * y]); tf('idtransform', (m, x, y) => { const i = minv(m); return [i[0] * x + i[2] * y, i[1] * x + i[3] * y]; });
  O('invertmatrix', () => { const r = pop(), m = arrToM(pop()); push(mToArr(minv(m), r)); });
  // cai
  O('newpath', () => { gs.path = []; gs.cp = null; });
  O('moveto', () => { const y = popN(), x = popN(); moveto(x, y); });
  O('lineto', () => { const y = popN(), x = popN(); lineto(x, y); });
  O('curveto', () => { const y3 = popN(), x3 = popN(), y2 = popN(), x2 = popN(), y1 = popN(), x1 = popN(); curveto(x1, y1, x2, y2, x3, y3); });
  const cur = () => { needCP(); return mapPt(minv(gs.ctm), gs.cp[0], gs.cp[1]); };
  O('rmoveto', () => { const dy = popN(), dx = popN(); const [x, y] = cur(); moveto(x + dx, y + dy); });
  O('rlineto', () => { const dy = popN(), dx = popN(); const [x, y] = cur(); lineto(x + dx, y + dy); });
  O('rcurveto', () => { const d = [0, 0, 0, 0, 0, 0]; for (let i = 5; i >= 0; i--) d[i] = popN(); const [x, y] = cur(); curveto(x + d[0], y + d[1], x + d[2], y + d[3], x + d[4], y + d[5]); });
  O('closepath', () => closepath());
  O('currentpoint', () => { const [x, y] = cur(); push(x); push(y); });
  O('arc', () => { const a2 = popN(), a1 = popN(), r = popN(), y = popN(), x = popN(); arcImpl(x, y, r, a1, a2, false); });
  O('arcn', () => { const a2 = popN(), a1 = popN(), r = popN(), y = popN(), x = popN(); arcImpl(x, y, r, a1, a2, true); });
  O('arct', () => { pop(); const y2 = popN(), x2 = popN(); popN(); popN(); lineto(x2, y2); stats.errors.push('arct aproximat cu lineto'); });
  O('arcto', () => { pop(); const y2 = popN(), x2 = popN(); popN(); popN(); lineto(x2, y2); push(0); push(0); push(0); push(0); stats.errors.push('arcto aproximat'); });
  O('flattenpath', () => {}); O('reversepath', () => {}); O('strokepath', () => {});
  O('clip', () => { const p = cleanPath(gs.path); if (p.length) clips.push(p); }); O('eoclip', () => { const p = cleanPath(gs.path); if (p.length) clips.push(p); });
  O('initclip', () => {}); O('clippath', () => { gs.path = []; moveto(-1e5, -1e5); });
  O('rectclip', () => { const t = pop(); if (typeof t !== 'number') return; pop(); pop(); pop(); });
  O('pathbbox', () => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const inv = minv(gs.ctm); for (const sp of gs.path) for (const s of sp.pts) for (let i = 0; i < s.p.length; i += 2) { const [x, y] = mapPt(inv, s.p[i], s.p[i + 1]); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } if (x0 === Infinity) throw new PSError('nocurrentpoint'); push(x0); push(y0); push(x1); push(y1); });
  O('pathforall', () => { for (let i = 0; i < 4; i++) pop(); stats.errors.push('pathforall ignorat'); });
  O('fill', () => paint('fill')); O('eofill', () => paint('eofill')); O('stroke', () => paint('stroke'));
  const rectOp = (kind) => () => { const t = pop(); let rects; if (typeof t === 'number') { const h = t, w = popN(), y = popN(), x = popN(); rects = [[x, y, w, h]]; } else { rects = []; const v = arrItems(t); for (let i = 0; i + 3 < v.length; i += 4) rects.push(v.slice(i, i + 4)); }
    const save = gs.path; gs.path = []; for (const [x, y, w, h] of rects) { moveto(x, y); lineto(x + w, y); lineto(x + w, y + h); lineto(x, y + h); closepath(); } paint(kind); gs.path = save; };
  O('rectfill', rectOp('fill')); O('rectstroke', rectOp('stroke'));
  O('shfill', () => pop());
  // imagini: consumam datele, nu le desenam
  function imageCommon(nComp, dataSrcs, w, h, bpc) {
    const need = Math.ceil(w * bpc * nComp / 8) * h; let got = 0; stats.skipped.image++;
    if (dataSrcs.length === 1 && isExecArr(dataSrcs[0])) { let guard = 0; while (got < need && guard++ < 1e6) { const before = os.length; execProc(dataSrcs[0]); const s = os.length > before ? pop() : null; if (!s || !s.len) break; got += s.len; } return; }
    if (dataSrcs[0] && dataSrcs[0].t === 'file') { sc.p += need; return; }
  }
  O('image', () => { const top = pop(); if (top && top.t === 'dict') { throw new PSError('unsupported', 'image cu dictionar'); } const src = top; pop(); const bpc = popN(), h = popN(), w = popN(); imageCommon(1, [src], w, h, bpc); });
  O('imagemask', () => { const top = pop(); if (top && top.t === 'dict') throw new PSError('unsupported', 'imagemask cu dictionar'); const src = top; pop(); pop(); const h = popN(), w = popN(); imageCommon(1, [src], w, h, 1); });
  O('colorimage', () => { const ncomp = popN(), multi = pop(); const srcs = []; for (let i = 0; i < (multi ? ncomp : 1); i++) srcs.unshift(pop()); pop(); const bpc = popN(), h = popN(), w = popN(); imageCommon(multi ? 1 : ncomp, srcs, w, h, bpc); });
  O('execform', () => pop()); O('makepattern', () => { pop(); const p = pop(); push(p); });
  O('ucache', () => {}); O('setucacheparams', () => {}); O('cachestatus', () => { for (let i = 0; i < 7; i++) push(0); });
  O('start', () => {}); O('handleerror', () => {}); O('prompt', () => {}); O('echo', () => pop());

  // ---- bucla principala, cu sarirea sectiunilor DSC in modul "body" ----
  let skipDepth = 0; let skipKind = null; let stopped = false;
  const onComment = (line, pos) => {
    if (mode === 'body') {
      const mb = /^%%Begin(Prolog|Resource|ProcSet|Setup|PageSetup|Defaults)\b/.exec(line);
      const me = /^%%End(Prolog|Resource|ProcSet|Setup|PageSetup|Defaults)\b/.exec(line);
      if (mb) { if (!skipKind) { skipKind = mb[1]; skipDepth = 1; return 'skip'; } if (mb[1] === skipKind) skipDepth++; return; }
      if (me && skipKind && me[1] === skipKind) { skipDepth--; if (skipDepth === 0) skipKind = null; return; }
      if (/^%%(PageTrailer|Trailer)\b/.test(line)) { stopped = true; return 'stop'; }
    }
    if (/^%%EOF\b/.test(line) && opts.stopAtEOF) { stopped = true; return 'stop'; }
  };
  const pstack = [];
  let fatal = null;
  if (opts.preamble) runSub(Uint8Array.from(opts.preamble, (c) => c.charCodeAt(0)));
  try {
    for (;;) {
      if (mode === 'body' && skipDepth > 0) { // sarim pana la comentariul de sfarsit
        const b = sc.b; let lineStart = sc.p;
        while (sc.p < b.length) { if (b[sc.p] === 10 || b[sc.p] === 13) { sc.p++; lineStart = sc.p; continue; } if (b[sc.p] === 37 && sc.p === lineStart) { const s = sc.p; while (sc.p < b.length && b[sc.p] !== 10 && b[sc.p] !== 13) sc.p++; onComment(sc.lineText(s, sc.p), s); if (skipDepth === 0) break; continue; } while (sc.p < b.length && b[sc.p] !== 10 && b[sc.p] !== 13) sc.p++; }
        if (sc.p >= b.length) break; continue;
      }
      const t = sc.next(onComment); if (!t) break; if (t.k === 'skip') continue;
      handleToken(t, pstack);
    }
  } catch (e) {
    if (e instanceof QuitSig) { /* sfarsit */ } else if (e instanceof PSError || e instanceof StopSig || e instanceof ExitSig) { fatal = (e.message || e.constructor.name) + ' @byte ' + sc.p; } else { fatal = 'JS: ' + e.message + ' @byte ' + sc.p; }
  }
  return { paths, clips, fatal, stats, bytePos: sc.p, total: sc.b.length, stoppedEarly: stopped, ops: opts.listOps ? [...systemdict.m.values()].map((e) => toText(e[0])) : undefined };
}

// extrage partea PostScript dintr-un EPS binar DOS (antet C5D0D3C6)
export function psPart(buf) {
  if (buf[0] === 0xc5 && buf[1] === 0xd0 && buf[2] === 0xd3 && buf[3] === 0xc6) { const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); const off = dv.getUint32(4, true), len = dv.getUint32(8, true); return buf.subarray(off, off + len); }
  return buf;
}
