# Lista de otrăvuri a feliei 3.Cm-5 (grosimea paletelor la elicele mari; ADR 0340; auditul elicelor, constatarea 6; răspunsul
# 2a), 27.11.2026, alese de autor: motorul (pragul de Ø80, factorul k = Ø / 80, grosimea la rădăcină și la vârf, la elice și la
# rotor, în cote și în plasă) și atelierul (fraza grosimii, doar peste prag, la elice și la rotor).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul
o('G01', LG, '  const GROS_PRAG = 80;', '  const GROS_PRAG = 70;', 'grosime', 'pragul la Ø70: elicele de Ø72 și Ø80 se schimbă')
o('G02', LG, '  const grosK = (D: number) => (D > GROS_PRAG ? D / GROS_PRAG : 1);', '  const grosK = (D: number) => (D > GROS_PRAG ? Math.sqrt(D / GROS_PRAG) : 1);', 'grosime', 'grosimea crește cu rădăcina diametrului')
o('G03', LG, '  const grosK = (D: number) => (D > GROS_PRAG ? D / GROS_PRAG : 1);', '  const grosK = (D: number) => (D > GROS_PRAG ? 1 : 1);', 'grosime', 'nicio îngroșare')
o('G04', LG, '    const tRad = ELICE.tRad * grosK(D), tVarf = ELICE.tVarf * grosK(D);', '    const tRad = ELICE.tRad * grosK(D), tVarf = ELICE.tVarf;', 'grosime', 'elicea: vârful, neîngroșat')
o('G05', LG, '    const tRad = ELICE.tRad * grosK(D), tVarf = ELICE.tVarf * grosK(D);', '    const tRad = ELICE.tRad, tVarf = ELICE.tVarf * grosK(D);', 'grosime', 'elicea: rădăcina, neîngroșată')
o('G06', LG, '      const t = q.tRad - (q.tRad - q.tVarf) * x;', '      const t = ELICE.tRad - (ELICE.tRad - ELICE.tVarf) * x;', 'grosime', 'elicea: cotele spun grosimea, plasa nu')
o('G07', LG, ', tRad = VENT.tRad * grosK(D), tVarf = VENT.tVarf * grosK(D);', ', tRad = VENT.tRad * grosK(D), tVarf = VENT.tVarf;', 'grosime', 'rotorul: vârful, neîngroșat')
o('G08', LG, 't = tRad - (tRad - tVarf) * x;', 't = VENT.tRad - (VENT.tRad - VENT.tVarf) * x;', 'grosime', 'rotorul: cotele spun grosimea, plasa nu')
o('G09', LG, 'bRad: q.bRad, bVarf: q.bVarf, consola: q.consola, tRad: q.tRad, tVarf: q.tVarf, avert: q.avert }; },\n    // elicea de barcă', 'bRad: q.bRad, bVarf: q.bVarf, consola: q.consola, avert: q.avert }; },\n    // elicea de barcă', 'grosime', 'cotele elicei fără grosime')
# --- atelierul
o('T01', AT, '    return c.tRad > 1.2 + 1e-9 ? " " + tr`Peste Ø80', '    return c.tRad >= 1.2 ? " " + tr`Peste Ø80', 'e2e', 'fraza și la Ø80 (și sub)')
o('T02', AT, 'paleta e mai groasă: ${fmt(c.tRad, 1)} mm la rădăcină, ${fmt(c.tVarf, 1)} la vârf.`', 'paleta e mai groasă: ${fmt(c.tRad, 1)} mm la rădăcină, ${fmt(c.tRad, 1)} la vârf.`', 'e2e', 'vârful spus cât rădăcina')
o('T03', AT, '° la vârf.${textGrosime(c)}${inel} Carcasa:', '° la vârf.${inel} Carcasa:', 'e2e', 'rotorul nu spune grosimea')
o('T04', AT, ' + " " + paleta + textGrosime(c);', ' + " " + paleta;', 'e2e', 'elicea nu spune grosimea')

SETURI = {
    'grosime': ['test/unit/trenulet.grosime.test.ts'],
}
E2E = ['test/e2e/trenulet.elice.spec.ts', 'test/e2e/trenulet.ventilator.spec.ts']
# pagina se face din surse în spec: build-ul aplicației nu o schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
