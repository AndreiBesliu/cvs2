# Lista de otrăvuri a feliei 18.1↑g-2 (TIFF-ul ca relief; ADR 0322 §5.1), 28.11.2026, alese de autor: citirea exactă din
# `src/trasare/tiff.ts` (scara eșantioanelor, alb-e-zero, alfa, paleta, CMYK, orientarea, mărimea din antet) și ramura TIFF
# din workerul reliefului (`src/jobs/calculRelief.ts`: semnătura, plafonul din antet, refuzurile, adâncimea), prinse de
# `relief.tiff.test.ts`; plus cititorul pe 8 biți al trasării, refăcut în aceeași felie, prins de `trasare.tiff.test.ts`.
# Plus un martor. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


TF = 'src/trasare/tiff.ts'
CR = 'src/jobs/calculRelief.ts'

o('G00', CR, "/** Semnătura unui TIFF clasic (II*\\0 sau MM\\0*); BigTIFF ajunge și el la cititor, care îl refuză cu numele lui. */",
  "/** Semnătura unui TIFF clasic (II*\\0 sau MM\\0*); BigTIFF ajunge și el la cititor, care îl refuză cu numele lui.  */", 'relief',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('G01', TF, "  const ex = (v: number): number => (v * 255) / max;", "  const ex = (v: number): number => Math.round((v * 255) / max);", 'relief',
  'citirea exactă rotunjește la 8 biți: griul de 16 biți se pierde')
o('G02', CR, "  if (esteTiff(cap)) return decodeazaTiff(new Uint8Array(await b.arrayBuffer()));", "", 'relief',
  'TIFF-ul nu mai ajunge la cititor: îl primește browserul, care nu-l decodează')
o('G03', TF, "      } else { const v = ex(es[s] ?? 0); r = gg = b = foto === 0 ? 255 - v : v; }",
  "      } else { const v = ex(es[s] ?? 0); r = gg = b = v; }", 'relief', 'alb-e-zero citit ca negru-e-zero, la citirea exactă')
o('G04', TF, "          const f = (c: number): number => (a > 0 ? Math.min(255, (c * 255) / a) : 0);",
  "          const f = (c: number): number => c;", 'relief', 'alfa asociat: culoarea nu se mai împarte la alfa')
o('G05', TF, "  const exactInt = tot && orient >= 2 && orient <= 8 ?", "  const exactInt = tot && orient >= 2 && orient <= 1 ?", 'relief',
  'orientarea nu se aplică pixelilor exacți')
o('G06', CR, "  if (m && (m.latime > LATURA_MAXIMA || m.inaltime > LATURA_MAXIMA)) return { ok: false, cod: 'prea-mare', detaliu: `${m.latime} × ${m.inaltime}` };",
  "", 'relief', 'fără plafonul din antet: o imagine uriașă e refuzată de cititor („nesprijinit”), nu „prea mare”')
o('G07', TF, "      else if (foto === 3 && hartaEx) { const i = es[s] ?? 0, n = max + 1; r = hartaEx[i] ?? 0; gg = hartaEx[n + i] ?? 0; b = hartaEx[2 * n + i] ?? 0; }",
  "      else if (foto === 3 && harta) { const i = es[s] ?? 0, n = max + 1; r = harta[i] ?? 0; gg = harta[n + i] ?? 0; b = harta[2 * n + i] ?? 0; }", 'relief',
  'paleta exactă luată din paleta rotunjită la 8 biți')
o('G08', TF, "        const kk = 255 - ex(es[s + 3] ?? 0);", "        const kk = 255;", 'relief', 'CMYK exact fără negru (K)')
o('G09', CR, "  if (!t.ok) return { ok: false, cod: t.cod === 'nesprijinit' ? 'tiff' : 'tiff-stricat', detaliu: t.detaliu };",
  "  if (!t.ok) return { ok: false, cod: t.cod === 'stricat' ? 'tiff' : 'tiff-stricat', detaliu: t.detaliu };", 'relief',
  'refuzurile încurcate: „nesprijinit” spus „stricat” și invers')
o('G10', CR, "...(t.biti === 16 ? { fisier: { adancime: 16 } as const } : {})", "...(t.biti >= 8 ? { fisier: { adancime: 16 } as const } : {})", 'relief',
  'un TIFF pe 8 biți spus „pe 16 biți” în fereastră')
o('G11', TF, "    return o >= 5 && o <= 8 ? { latime: H, inaltime: W } : { latime: W, inaltime: H };",
  "    return { latime: W, inaltime: H };", 'relief', 'mărimea din antet nu ține seama de orientare')
o('G12', TF, "        a = ex(es[s + alfa] ?? 0);", "        a = 255;", 'relief', 'alfa neasociat ignorat: pixelii transparenți nu mai sunt goi')
o('G13', TF, "  const t = o >= 5, w2 = t ? H : W;", "  const t = o >= 5, w2 = W;", 'tiff',
  'întoarcerea comună (și a trasării) greșește lățimea rândului la orientările 5–8')
o('G14', TF, "    return { ok: true, img: r.img, latime: r.latime, inaltime: r.inaltime, dpi: r.dpi, pagini, pagina: p };",
  "    return { ok: true, img: r.img, latime: r.latime, inaltime: r.inaltime, dpi: null, pagini, pagina: p };", 'tiff',
  'decodarea pe 8 biți a trasării, refăcută, pierde DPI-ul')
o('G15', TF, "      if (red) { coloreaza(); red.rand(ty * th + r, rgba); }", "      if (red) { red.rand(ty * th + r, rgba); }", 'tiff',
  'decodarea pe 8 biți a trasării, refăcută, nu mai colorează rândurile')


# ---- Seturile ----
SETURI = {
    'relief': ['test/unit/relief.tiff.test.ts'],
    'tiff': ['test/unit/trasare.tiff.test.ts', 'test/unit/relief.tiff.test.ts'],
}
E2E = []
