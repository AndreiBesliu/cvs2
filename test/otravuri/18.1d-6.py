# Lista de otrăvuri a feliei 18.1↑d-6 (desenele fișei reliefului; ADR 0317), 27.11.2026, alese de autor: ce spun desenele
# (trecerile pe Z, pasul liniilor; prinse de proba față de lucrare) și desenele din fereastră (prinse de e2e și de proba
# privirii). Plus un martor, care trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DC = 'src/ui/exportDeseneCalcul.ts'
DS = 'src/ui/exportDesene.tsx'
FF = 'src/ui/FisaFinisare.tsx'

o('D00', DC, "export function treceriPodeaRelief(adancime: number, pas: number, adaos = 0)",
  "export function treceriPodeaRelief(adancime: number, pas: number, adaos = 0 )", 'unit', 'martorul: un spațiu (trebuie să scape)')
o('D01', DC, "  const n = Math.max(1, Math.ceil(P / pas - 1e-9));", "  const n = Math.max(1, Math.round(P / pas));", 'unit',
  'numărul trecerilor rotunjit, nu în sus')
o('D02', DC, "  return { funduri: Array.from({ length: n - 1 }, (_, k) => (k + 1) * pas), n, podea: P };",
  "  return { funduri: Array.from({ length: n - 1 }, (_, k) => k * pas), n, podea: P };", 'unit', 'primul fund la față')
o('D03', DC, "  const P = adancime - (Number.isFinite(adaos) && adaos > 0 ? adaos : 0);", "  const P = adancime;", 'unit',
  'adaosul nu ridică podeaua degroșării')
o('D04', DC, "  if (!aliniat || (unghi !== 0 && unghi !== 90) || celula === undefined || !pozitiv(celula)) return { aliniate: false, pas, celule: null };",
  "  if (!aliniat || celula === undefined || !pozitiv(celula)) return { aliniate: false, pas, celule: null };", 'unit',
  'liniile la 30° desenate prin centrele celulelor')
o('D05', DC, "  return { aliniate: true, pas: k * celula, celule: k };", "  return { aliniate: true, pas, celule: k };", 'unit',
  'desenul arată pasul cerut, nu cel folosit')
o('D06', FF, "        <DesenFreza c={{ ...dc, aprins: dc.aprins.map((x) => (x.startsWith('relief-') ? x.slice(7) : x)) }} numar={r.numarScula}",
  "        <DesenFreza c={dc} numar={r.numarScula}", 'e2e', 'cotele frezei nu se aprind (numele câmpurilor reliefului)')
o('D07', FF, "      case 'adaos': return (dc) => <DesenAdaosRelief c={dc} adaos={nr(r.adaos, 'adaos')} />;", "", 'e2e',
  'adaosul fără desen')
o('D08', FF, "        const a = nr(r.adancime, 'adancime'), p = nr(r.pas, 'pas'), x = deg ? nr(r.adaos, 'adaos') ?? 0 : 0;",
  "        const a = nr(r.adancime, 'adancime'), p = nr(r.pas, 'pas'), x = 0;", 'e2e', 'podeaua degroșării desenată fără adaos')
o('D09', DS, "      <Jos>{linii.aliniate && k !== null ? t('export.desen.relief.linii.celule', { n: k, mm: c.f(linii.pas) }) : t('export.desen.relief.linii.cel-mult', { mm: c.f(linii.pas) })}</Jos>",
  "      <Jos>{t('export.desen.relief.linii.cel-mult', { mm: c.f(linii.pas) })}</Jos>", 'e2e', 'liniile aliniate nu spun celulele')
o('D10', DS, "      {treceri.n <= 12 && treceri.funduri.map((f, i) => (<g key={i}>", "      {treceri.n <= 0 && treceri.funduri.map((f, i) => (<g key={i}>", 'e2e',
  'fundurile trecerilor nedesenate')
o('D11', DS, "    <Desen eticheta={t('export.desen.relief.margine')} data-margine={margine}>", "    <Desen eticheta={t('export.desen.relief.margine')} data-margine=\"perete\">", 'e2e',
  'marginea desenată mereu la perete')
o('D12', DS, "    return t1 - t0 > 1 ? [`M${r(px + ux * t0)} ${r(py + uy * t0)}L${r(px + ux * t1)} ${r(py + uy * t1)}`] : [];",
  "    return [`M${r(px - ux * 300)} ${r(py - uy * 300)}L${r(px + ux * 300)} ${r(py + uy * 300)}`];", 'e2e', 'liniile ies din desen')
o('D13', DS, "      <Jos>{ap > 0 ? t('export.desen.relief.adaos.rest', { mm: c.f(a) }) : t('export.desen.relief.adaos.zero')}</Jos>",
  "      <Jos>{t('export.desen.relief.adaos.zero')}</Jos>", 'e2e', 'adaosul desenat spune mereu „fără adaos”')


# ---- Seturile ----
SETURI = {
    'unit': ['test/unit/export.desene.relief.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.desene.spec.ts', 'test/e2e/export.privire.spec.ts']
