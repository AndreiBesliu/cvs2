// Sondă s7: aceeași schemă, în valibot. looseObject = câmpurile necunoscute se păstrează.
import * as v from 'valibot';

const num = (lo: number, hi: number) => v.pipe(v.number(), v.finite(), v.minValue(lo), v.maxValue(hi));
const Coord = num(-1e5, 1e5);
const Size = num(0.1, 1e4);
const Id = v.pipe(v.string(), v.minLength(1), v.maxLength(64), v.regex(/^[A-Za-z0-9_-]+$/));
const Hash = v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/));
const Transform = v.pipe(v.array(num(-1e6, 1e6)), v.length(6));

const SegL = v.looseObject({ k: v.literal('L'), x: Coord, y: Coord });
const SegA = v.looseObject({ k: v.literal('A'), x: Coord, y: Coord, cx: Coord, cy: Coord, cw: v.boolean() });
const SegC = v.looseObject({ k: v.literal('C'), x1: Coord, y1: Coord, x2: Coord, y2: Coord, x: Coord, y: Coord });
const Seg = v.variant('k', [SegL, SegA, SegC]);
const Subpath = v.looseObject({ start: v.tuple([Coord, Coord]), segs: v.pipe(v.array(Seg), v.maxLength(1_000_000)), closed: v.boolean() });

const base = { id: Id, name: v.pipe(v.string(), v.maxLength(200)), transform: Transform };
const Group = v.looseObject({ ...base, type: v.literal('group'), children: v.array(Id) });
const Vector = v.looseObject({ ...base, type: v.literal('vector'), subpaths: v.pipe(v.array(Subpath), v.minLength(1)) });
const Text = v.looseObject({ ...base, type: v.literal('text'), text: v.pipe(v.string(), v.maxLength(10_000)), font: Hash, size: num(0.1, 2000) });
const Relief = v.looseObject({
  ...base, type: v.literal('relief'),
  recipe: v.looseObject({ w: Size, h: Size, res: num(0.01, 10), base: num(-500, 500), source: Hash }),
});
const Mesh = v.looseObject({ ...base, type: v.literal('mesh'), asset: Hash, scale: num(1e-4, 1e4) });
const Node = v.variant('type', [Group, Vector, Text, Relief, Mesh]);

const int = (lo: number, hi: number) => v.pipe(v.number(), v.integer(), v.minValue(lo), v.maxValue(hi));
const Operation = v.looseObject({
  id: Id, setupId: Id, kind: v.picklist(['profile', 'pocket', 'vcarve', 'engrave', 'drill']),
  targets: v.pipe(v.array(Id), v.minLength(1)), tool: Id, depth: num(0, 500), stepdown: num(0.01, 100),
  order: int(0, 2 ** 31), enabled: v.boolean(),
});
const Tool = v.looseObject({
  id: Id, kind: v.picklist(['flat', 'ball', 'vbit']), diameter: v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(100)),
  angle: num(0, 180), flutes: int(1, 12),
});
const Setup = v.looseObject({
  id: Id, stock: v.looseObject({ w: Size, h: Size, t: v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(500)) }),
  origin: v.tuple([Coord, Coord, Coord]), tolerance: num(1e-4, 1),
});
const Asset = v.looseObject({ kind: v.picklist(['mesh', 'image', 'font', 'heightfield']), bytes: int(0, 2 ** 31), name: v.pipe(v.string(), v.maxLength(200)) });

export const Doc = v.looseObject({
  format: v.literal('cncvs2'), schema: int(1, 1e6), minWriter: int(1, 1e6), rev: int(0, 2 ** 53),
  units: v.picklist(['mm', 'in']), root: Id, meta: v.looseObject({ name: v.pipe(v.string(), v.maxLength(200)) }),
  nodes: v.record(Id, Node), setups: v.array(Setup), operations: v.array(Operation), tools: v.record(Id, Tool), assets: v.record(Hash, Asset),
});
export type DocT = v.InferOutput<typeof Doc>;
export type NodeT = v.InferOutput<typeof Node>;
export type SegT = v.InferOutput<typeof Seg>;

export type Issue = { path: (string | number)[]; code: string; limit?: number | string };

const CODE: Record<string, string> = { max_value: 'max', min_value: 'min', gt_value: 'min', number: 'type', boolean: 'type', string: 'type', finite: 'finite', integer: 'integer', regex: 'format', variant: 'variant', picklist: 'value', literal: 'value', length: 'length', min_length: 'min', max_length: 'max' };
export function validate(doc: unknown): { ok: boolean; value?: unknown; issues: Issue[] } {
  const r = v.safeParse(Doc, doc);
  if (r.success) return { ok: true, value: r.output, issues: [] };
  return {
    ok: false,
    issues: r.issues.map((i) => ({ path: (i.path ?? []).map((p: any) => p.key as string | number), code: CODE[i.type] ?? i.type, limit: (i as any).requirement })),
  };
}
export const name = 'valibot';
