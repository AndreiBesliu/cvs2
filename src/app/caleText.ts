type TextAsezat = import('../text/asezare.ts').TextAsezat;

/**
 * Căile SVG ale textului așezat (Y în sus devine Y în jos) și cutia lor: previzualizarea din panou (`PrevizualizareText.tsx`).
 * `d` e umplută (contururile literelor); `linii` e desenată cu linia, fără umplere: trăsăturile unui font cu o singură linie
 * (ADR 0140), deschise (fără Z) sau bucle, și orice cale deschisă. Literele îngroșate (ADR 0123) au și arce: raza din bulge,
 * c (1 + b²) / 4|b|; arcul mare peste |b| > 1; unul trigonometric (b > 0) se vede tot trigonometric, deci în SVG, cu Y în
 * jos, merge în sensul unghiurilor descrescătoare (sweep 0).
 */
export function caleText(a: TextAsezat): { readonly d: string; readonly linii: string; readonly cutie: readonly [number, number, number, number] } | null {
  let d = '', linii = '', x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
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
      let s = `M${pune(v[0]!.p.x, v[0]!.p.y)}`;
      // O cale deschisă are n − 1 segmente: ultimul vârf e capătul.
      v.slice(0, c.inchis ? v.length : v.length - 1).forEach((q, k) => {
        const urm = v[(k + 1) % v.length]!.p;
        if (q.s.tip === 'A') {
          const b = q.s.bulge, r = (Math.hypot(urm.x - q.p.x, urm.y - q.p.y) * (1 + b * b)) / (4 * Math.abs(b));
          s += `A${n(r)} ${n(r)} 0 ${Math.abs(b) > 1 ? 1 : 0} ${b > 0 ? 0 : 1} ${pune(urm.x, urm.y)}`;
        } else s += q.s.tip === 'C' ? `C${pune(q.s.c1.x, q.s.c1.y)} ${pune(q.s.c2.x, q.s.c2.y)} ${pune(urm.x, urm.y)}` : `L${pune(urm.x, urm.y)}`;
      });
      if (c.inchis) s += 'Z';
      if (a.linie || !c.inchis) linii += s;
      else d += s;
    }
  }
  return d === '' && linii === '' ? null : { d, linii, cutie: [x0, y0, x1, y1] };
}
