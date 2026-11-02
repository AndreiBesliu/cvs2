type TextAsezat = import('../text/asezare.ts').TextAsezat;

/**
 * Calea SVG a textului așezat (Y în sus devine Y în jos) și cutia ei: previzualizarea din panou (`PrevizualizareText.tsx`).
 * Literele îngroșate (ADR 0123) au și arce: raza din bulge, c (1 + b²) / 4|b|; arcul mare peste |b| > 1; unul trigonometric
 * (b > 0) se vede tot trigonometric, deci în SVG, cu Y în jos, merge în sensul unghiurilor descrescătoare (sweep 0).
 */
export function caleText(a: TextAsezat): { readonly d: string; readonly cutie: readonly [number, number, number, number] } | null {
  let d = '', x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const n = (v: number): string => (Math.round(v * 1000) / 1000).toString();
  const pune = (x: number, y: number): string => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (-y < y0) y0 = -y;
    if (-y > y1) y1 = -y;
    return `${n(x)} ${n(-y)}`;
  };
  for (const g of a.glife) {
    for (const c of g.cai) {
      const v = c.varfuri;
      if (v.length === 0) continue;
      d += `M${pune(v[0]!.p.x, v[0]!.p.y)}`;
      v.forEach((q, k) => {
        const urm = v[(k + 1) % v.length]!.p;
        if (q.s.tip === 'A') {
          const b = q.s.bulge, r = (Math.hypot(urm.x - q.p.x, urm.y - q.p.y) * (1 + b * b)) / (4 * Math.abs(b));
          d += `A${n(r)} ${n(r)} 0 ${Math.abs(b) > 1 ? 1 : 0} ${b > 0 ? 0 : 1} ${pune(urm.x, urm.y)}`;
        } else d += q.s.tip === 'C' ? `C${pune(q.s.c1.x, q.s.c1.y)} ${pune(q.s.c2.x, q.s.c2.y)} ${pune(urm.x, urm.y)}` : `L${pune(urm.x, urm.y)}`;
      });
      d += 'Z';
    }
  }
  return d === '' ? null : { d, cutie: [x0, y0, x1, y1] };
}
