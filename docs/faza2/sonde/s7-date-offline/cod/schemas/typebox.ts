// Sondă s7: aceeași schemă, în TypeBox 1.x (JSON Schema). Check nu modifică valoarea, deci necunoscutele rămân.
import Type from 'typebox';
import Compile from 'typebox/compile';

const N = (minimum: number, maximum: number) => Type.Number({ minimum, maximum });
const Coord = N(-1e5, 1e5);
const Size = N(0.1, 1e4);
const Id = Type.String({ minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$' });
const Hash = Type.String({ pattern: '^[0-9a-f]{64}$' });
const Transform = Type.Array(N(-1e6, 1e6), { minItems: 6, maxItems: 6 });

const SegL = Type.Object({ k: Type.Literal('L'), x: Coord, y: Coord });
const SegA = Type.Object({ k: Type.Literal('A'), x: Coord, y: Coord, cx: Coord, cy: Coord, cw: Type.Boolean() });
const SegC = Type.Object({ k: Type.Literal('C'), x1: Coord, y1: Coord, x2: Coord, y2: Coord, x: Coord, y: Coord });
const Seg = Type.Union([SegL, SegA, SegC]);
const Subpath = Type.Object({ start: Type.Tuple([Coord, Coord]), segs: Type.Array(Seg, { maxItems: 1_000_000 }), closed: Type.Boolean() });

const Name = Type.String({ maxLength: 200 });
const Group = Type.Object({ id: Id, name: Name, transform: Transform, type: Type.Literal('group'), children: Type.Array(Id) });
const Vector = Type.Object({ id: Id, name: Name, transform: Transform, type: Type.Literal('vector'), subpaths: Type.Array(Subpath, { minItems: 1 }) });
const Text = Type.Object({ id: Id, name: Name, transform: Transform, type: Type.Literal('text'), text: Type.String({ maxLength: 10_000 }), font: Hash, size: N(0.1, 2000) });
const Relief = Type.Object({
  id: Id, name: Name, transform: Transform, type: Type.Literal('relief'),
  recipe: Type.Object({ w: Size, h: Size, res: N(0.01, 10), base: N(-500, 500), source: Hash }),
});
const Mesh = Type.Object({ id: Id, name: Name, transform: Transform, type: Type.Literal('mesh'), asset: Hash, scale: N(1e-4, 1e4) });
const Node = Type.Union([Group, Vector, Text, Relief, Mesh]);

const Int = (minimum: number, maximum: number) => Type.Integer({ minimum, maximum });
const Operation = Type.Object({
  id: Id, setupId: Id, kind: Type.Union([Type.Literal('profile'), Type.Literal('pocket'), Type.Literal('vcarve'), Type.Literal('engrave'), Type.Literal('drill')]),
  targets: Type.Array(Id, { minItems: 1 }), tool: Id, depth: N(0, 500), stepdown: N(0.01, 100), order: Int(0, 2 ** 31), enabled: Type.Boolean(),
});
const Tool = Type.Object({
  id: Id, kind: Type.Union([Type.Literal('flat'), Type.Literal('ball'), Type.Literal('vbit')]),
  diameter: Type.Number({ exclusiveMinimum: 0, maximum: 100 }), angle: N(0, 180), flutes: Int(1, 12),
});
const Setup = Type.Object({
  id: Id, stock: Type.Object({ w: Size, h: Size, t: Type.Number({ exclusiveMinimum: 0, maximum: 500 }) }),
  origin: Type.Tuple([Coord, Coord, Coord]), tolerance: N(1e-4, 1),
});
const Asset = Type.Object({ kind: Type.Union([Type.Literal('mesh'), Type.Literal('image'), Type.Literal('font'), Type.Literal('heightfield')]), bytes: Int(0, 2 ** 31), name: Name });

export const Doc = Type.Object({
  format: Type.Literal('cncvs2'), schema: Int(1, 1e6), minWriter: Int(1, 1e6), rev: Int(0, 2 ** 53),
  units: Type.Union([Type.Literal('mm'), Type.Literal('in')]), root: Id, meta: Type.Object({ name: Name }),
  nodes: Type.Record(Type.String({ pattern: '^[A-Za-z0-9_-]+$' }), Node), setups: Type.Array(Setup), operations: Type.Array(Operation),
  tools: Type.Record(Type.String({ pattern: '^[A-Za-z0-9_-]+$' }), Tool), assets: Type.Record(Type.String({ pattern: '^[0-9a-f]{64}$' }), Asset),
});
export type DocT = Type.Static<typeof Doc>;
export type NodeT = Type.Static<typeof Node>;
export type SegT = Type.Static<typeof Seg>;

export type Issue = { path: (string | number)[]; code: string; limit?: number | string };
let V: ReturnType<typeof Compile<typeof Doc>> | null = null;
export function compiled() { return (V ??= Compile(Doc)); }
const CODE: Record<string, string> = { maximum: 'max', minimum: 'min', exclusiveMinimum: 'min', type: 'type', pattern: 'format', anyOf: 'variant', const: 'value', minItems: 'min', maxItems: 'max', maxLength: 'max', minLength: 'min', required: 'required' };
export function validate(doc: unknown): { ok: boolean; value?: unknown; issues: Issue[] } {
  const c = compiled();
  if (c.Check(doc)) return { ok: true, value: doc, issues: [] };
  return {
    ok: false,
    issues: c.Errors(doc).map((e: any) => ({
      path: e.instancePath.split('/').slice(1).map((s: string) => (/^\d+$/.test(s) ? Number(s) : s.replace(/~1/g, '/').replace(/~0/g, '~'))),
      code: CODE[e.keyword] ?? e.keyword,
      limit: e.params?.limit ?? e.params?.maximum ?? e.params?.minimum ?? e.params?.comparableLimit,
    })),
  };
}
export const name = 'typebox';
