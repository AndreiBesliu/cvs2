// Sondă s7: aceeași schemă, în arktype. Implicit, cheile nedeclarate sunt ignorate (păstrate în ieșire).
import { scope, type } from 'arktype';

const $ = scope({
  coord: '-100000 <= number <= 100000',
  size: '0.1 <= number <= 10000',
  id: /^[A-Za-z0-9_-]{1,64}$/,
  hash: /^[0-9a-f]{64}$/,
  tnum: '-1000000 <= number <= 1000000',
  transform: ['tnum', 'tnum', 'tnum', 'tnum', 'tnum', 'tnum'],
  segL: { k: "'L'", x: 'coord', y: 'coord' },
  segA: { k: "'A'", x: 'coord', y: 'coord', cx: 'coord', cy: 'coord', cw: 'boolean' },
  segC: { k: "'C'", x1: 'coord', y1: 'coord', x2: 'coord', y2: 'coord', x: 'coord', y: 'coord' },
  seg: 'segL | segA | segC',
  subpath: { start: ['coord', 'coord'], segs: 'seg[] <= 1000000', closed: 'boolean' },
  name200: 'string <= 200',
  group: { id: 'id', name: 'name200', transform: 'transform', type: "'group'", children: 'id[]' },
  vector: { id: 'id', name: 'name200', transform: 'transform', type: "'vector'", subpaths: 'subpath[] >= 1' },
  text: { id: 'id', name: 'name200', transform: 'transform', type: "'text'", text: 'string <= 10000', font: 'hash', size: '0.1 <= number <= 2000' },
  relief: {
    id: 'id', name: 'name200', transform: 'transform', type: "'relief'",
    recipe: { w: 'size', h: 'size', res: '0.01 <= number <= 10', base: '-500 <= number <= 500', source: 'hash' },
  },
  mesh: { id: 'id', name: 'name200', transform: 'transform', type: "'mesh'", asset: 'hash', scale: '0.0001 <= number <= 10000' },
  node: 'group | vector | text | relief | mesh',
  operation: {
    id: 'id', setupId: 'id', kind: "'profile' | 'pocket' | 'vcarve' | 'engrave' | 'drill'", targets: 'id[] >= 1', tool: 'id',
    depth: '0 <= number <= 500', stepdown: '0.01 <= number <= 100', order: '0 <= number.integer <= 2147483648', enabled: 'boolean',
  },
  tool: { id: 'id', kind: "'flat' | 'ball' | 'vbit'", diameter: '0 < number <= 100', angle: '0 <= number <= 180', flutes: '1 <= number.integer <= 12' },
  setup: { id: 'id', stock: { w: 'size', h: 'size', t: '0 < number <= 500' }, origin: ['coord', 'coord', 'coord'], tolerance: '0.0001 <= number <= 1' },
  asset: { kind: "'mesh' | 'image' | 'font' | 'heightfield'", bytes: '0 <= number.integer <= 2147483648', name: 'name200' },
  doc: {
    format: "'cncvs2'", schema: '1 <= number.integer <= 1000000', minWriter: '1 <= number.integer <= 1000000', rev: 'number.integer >= 0',
    units: "'mm' | 'in'", root: 'id', meta: { name: 'name200' },
    nodes: { '[string]': 'node' }, setups: 'setup[]', operations: 'operation[]', tools: { '[string]': 'tool' }, assets: { '[string]': 'asset' },
  },
}).export();

export const Doc = $.doc;
export type DocT = typeof $.doc.infer;
export type NodeT = typeof $.node.infer;
export type SegT = typeof $.seg.infer;

export type Issue = { path: (string | number)[]; code: string; limit?: number | string };
const CODE: Record<string, string> = { max: 'max', min: 'min', domain: 'type', pattern: 'format', unit: 'value', divisor: 'integer', exactLength: 'length', maxLength: 'max', minLength: 'min', union: 'variant' };
export function validate(doc: unknown): { ok: boolean; value?: unknown; issues: Issue[] } {
  const out = Doc(doc);
  if (!(out instanceof type.errors)) return { ok: true, value: out, issues: [] };
  const errs = out as any;
  return { ok: false, issues: [...errs].map((e: any) => ({ path: [...e.path], code: CODE[e.code] ?? e.code, limit: e.rule })) };
}
export const name = 'arktype';
