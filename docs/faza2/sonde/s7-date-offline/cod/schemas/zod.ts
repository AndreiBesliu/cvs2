// Sondă s7: aceeași schemă de document, în zod v4. looseObject = câmpurile necunoscute se păstrează.
import * as z from 'zod';

const Coord = z.number().min(-1e5).max(1e5);
const Size = z.number().min(0.1).max(1e4);
const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const Hash = z.string().regex(/^[0-9a-f]{64}$/);
const Transform = z.array(z.number().min(-1e6).max(1e6)).length(6);

const SegL = z.looseObject({ k: z.literal('L'), x: Coord, y: Coord });
const SegA = z.looseObject({ k: z.literal('A'), x: Coord, y: Coord, cx: Coord, cy: Coord, cw: z.boolean() });
const SegC = z.looseObject({ k: z.literal('C'), x1: Coord, y1: Coord, x2: Coord, y2: Coord, x: Coord, y: Coord });
const Seg = z.discriminatedUnion('k', [SegL, SegA, SegC]);
const Subpath = z.looseObject({ start: z.tuple([Coord, Coord]), segs: z.array(Seg).max(1_000_000), closed: z.boolean() });

const base = { id: Id, name: z.string().max(200), transform: Transform };
const Group = z.looseObject({ ...base, type: z.literal('group'), children: z.array(Id) });
const Vector = z.looseObject({ ...base, type: z.literal('vector'), subpaths: z.array(Subpath).min(1) });
const Text = z.looseObject({ ...base, type: z.literal('text'), text: z.string().max(10_000), font: Hash, size: z.number().min(0.1).max(2000) });
const Relief = z.looseObject({
  ...base, type: z.literal('relief'),
  recipe: z.looseObject({ w: Size, h: Size, res: z.number().min(0.01).max(10), base: z.number().min(-500).max(500), source: Hash }),
});
const Mesh = z.looseObject({ ...base, type: z.literal('mesh'), asset: Hash, scale: z.number().min(1e-4).max(1e4) });
const Node = z.discriminatedUnion('type', [Group, Vector, Text, Relief, Mesh]);

const Operation = z.looseObject({
  id: Id, setupId: Id, kind: z.enum(['profile', 'pocket', 'vcarve', 'engrave', 'drill']),
  targets: z.array(Id).min(1), tool: Id, depth: z.number().min(0).max(500), stepdown: z.number().min(0.01).max(100),
  order: z.number().int().min(0), enabled: z.boolean(),
});
const Tool = z.looseObject({
  id: Id, kind: z.enum(['flat', 'ball', 'vbit']), diameter: z.number().gt(0).max(100),
  angle: z.number().min(0).max(180), flutes: z.number().int().min(1).max(12),
});
const Setup = z.looseObject({
  id: Id, stock: z.looseObject({ w: Size, h: Size, t: z.number().gt(0).max(500) }),
  origin: z.tuple([Coord, Coord, Coord]), tolerance: z.number().min(1e-4).max(1),
});
const Asset = z.looseObject({ kind: z.enum(['mesh', 'image', 'font', 'heightfield']), bytes: z.number().int().min(0).max(2 ** 31), name: z.string().max(200) });

export const Doc = z.looseObject({
  format: z.literal('cncvs2'), schema: z.number().int().min(1), minWriter: z.number().int().min(1), rev: z.number().int().min(0),
  units: z.enum(['mm', 'in']), root: Id, meta: z.looseObject({ name: z.string().max(200) }),
  nodes: z.record(Id, Node), setups: z.array(Setup), operations: z.array(Operation), tools: z.record(Id, Tool), assets: z.record(Hash, Asset),
});
export type DocT = z.infer<typeof Doc>;
export type NodeT = z.infer<typeof Node>;
export type SegT = z.infer<typeof Seg>;

export type Issue = { path: (string | number)[]; code: string; limit?: number | string };

// Codurile lui zod → coduri neutre pentru t(): limită, tip, format, variantă.
export function validate(doc: unknown): { ok: boolean; value?: unknown; issues: Issue[] } {
  const r = Doc.safeParse(doc);
  if (r.success) return { ok: true, value: r.data, issues: [] };
  return {
    ok: false,
    issues: r.error.issues.map((i: any) => ({
      path: i.path as (string | number)[],
      code: i.code === 'too_big' ? 'max' : i.code === 'too_small' ? 'min' : i.code === 'invalid_type' ? (i.expected === 'int' ? 'integer' : 'type') : i.code === 'invalid_format' ? 'format' : i.code === 'invalid_union' ? 'variant' : i.code === 'invalid_value' ? 'value' : i.code,
      limit: i.maximum ?? i.minimum ?? i.expected,
    })),
  };
}
export const name = 'zod';
