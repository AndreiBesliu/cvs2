# Lista de otrăvuri a feliei 3.Cm-6 (curățenia motorului elicelor; ADR 0340; auditul elicelor, constatarea 7), 27.11.2026,
# alese de autor: funcția comună a secțiunilor (rotirea, strângerea coardei, pragul, pașii, coarda de pornire a fiecărei piese)
# și numărătorul laturilor cercului, comun acum cu ventilatorul. Le prinde amprenta pieselor (`trenulet.curatenie.test.ts`).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'

SP = '    for (let k = 0; k < pasi && latimePeCerc(sec) > U; k++) { c = Math.max(cMin, c * U / latimePeCerc(sec) * 0.995); sec = roteste(c); }'
o('S01', LG, SP, SP.replace('* 0.995', '* 0.99'), 'curatenie', 'pasul strângerii la 99 %')
o('S02', LG, SP, SP.replace('Math.max(cMin, ', 'Math.max(0, '), 'curatenie', 'coarda strânsă sub grosime')
o('S04', LG, '  const latimePeCerc = (sec: readonly P2[]) => Math.max(...sec.map(p => p[0])) - Math.min(...sec.map(p => p[0]));', '  const latimePeCerc = (sec: readonly P2[]) => Math.max(...sec.map(p => p[0])) - Math.min(...sec.map(p => p[1]));', 'curatenie', 'lățimea măsurată pe înălțime')
o('S05', LG, '    const roteste = (cc: number) => profil(cc).map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) - v * Math.sin(b),', '    const roteste = (cc: number) => profil(cc).map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) + v * Math.sin(b),', 'curatenie', 'rotirea greșită pe s')
o('S06', LG, '      const sec = sectiunePaleta(cc => sectiuneElice(cc, t, profil), b, Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), ELICE.umplere * 2 * Math.PI * r / z, t, 8);', '      const sec = sectiunePaleta(cc => sectiuneElice(cc, t, profil), b, Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), ELICE.umplere * 2 * Math.PI * r / z, t, 40);', 'curatenie', 'elicea cu 40 de pași, ca celelalte (dacă scapă: pe eșantion, 8 și 40 dau același lucru)')
o('S07', LG, '      const sec = sectiunePaleta(cc => sectiuneElice(cc, t, profil), b, Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), ELICE.umplere * 2 * Math.PI * r / z, t, 8);', '      const sec = sectiunePaleta(cc => sectiuneElice(cc, t, profil), b, Math.max(t, cmax * g), ELICE.umplere * 2 * Math.PI * r / z, t, 8);', 'curatenie', 'elicea fără coarda minimă de la vârf')
o('S09', LG, '        const sec = sectiunePaleta(cc => sectiuneElice(cc, t, "placa"), b, Math.max(t, cmax * g), VENT.umplere * 2 * Math.PI * r / z, t, 40);', '        const sec = sectiunePaleta(cc => sectiuneElice(cc, t, "placa"), b, Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), VENT.umplere * 2 * Math.PI * r / z, t, 40);', 'curatenie', 'rotorul cu coarda minimă a elicei la vârf')
o('S11', LG, 'rot: inc * Math.PI / 180 * x * x, lat: latimePeCerc(sec), h:', 'rot: inc * Math.PI / 180 * x * x, lat: 0.9 * latimePeCerc(sec), h:', 'curatenie', 'acoperirea elicei de barcă, din lățimi greșite')
o('L01', LG, '  const laturiFine = (R: number): number => Math.max(N_CERC, 8 * Math.ceil(Math.PI / Math.acos(1 - 0.02 / R) / 8));', '  const laturiFine = (R: number): number => Math.max(N_CERC, 8 * Math.ceil(Math.PI / Math.acos(1 - 0.03 / R) / 8));', 'curatenie', 'săgeata cercului la 0,03 (carcasa ventilatorului se schimbă)')

# Scoase, echivalente (27.11, după prima rulare, cu măsurătoarea în ADR 0340, „Implementarea (3.Cm-6)”): S03, strângerea și
# când lățimea e exact U (nu cade niciodată exact pe ea); S08, elicea de barcă cu 8 pași în loc de 40 (pe 270 de elice de
# barcă, strângerea nu trece de 3 pași).

SETURI = {
    'curatenie': ['test/unit/trenulet.curatenie.test.ts'],
}
for x in O:
    assert x['vechi'] != x['nou'], x['id']
