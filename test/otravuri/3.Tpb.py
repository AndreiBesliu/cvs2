# Lista de otrăvuri a feliei 3.Tp↑b (pictogramele pieselor din galeriile atelierului Easy 3Draw, ADR 0281 §4), 22.11.2026,
# alese de autor: tabela desenelor (o piesă fără desen, un desen dublat, unul fără piesă, cel generic dublat, o culoare
# scrisă în desen, un punct și un arc ieșite din pătrat: le judecă proba unitară, `trenulet.pictograme.test.ts`), butonul
# (pictograma ascunsă cititoarelor, înaintea numelui, în galeria familiei și în căutare, desenul piesei și nu cel generic,
# pătratul de 24) și stilul ei din head.html (fără umplere, linia de culoarea textului, 18 px, centrată pe buton).
# Ce nu se probează: că fiecare desen seamănă cu piesa lui (două desene schimbate între ele trec): asta se judecă privind
# capturile, la felie.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.pictograme.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


A = 'extensii/trenulet/sursa/planificator/atelier.ts'
H = 'extensii/trenulet/sursa/planificator/head.html'
CONICA = '<path d="M3.5 16.5h17L17 8.5H7zM9 16.5V20h6v-3.5"/><path d="M7 8.5l1-2 1.6 2 1.6-2 1.6 2 1.6-2 1.6 2 1-2 1 2"/>'
BUTON = '`<button type="button" data-piesa="${k}"><svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAME[k] ?? PICTOGRAMA_GENERICA}</svg>${n}</button>`'
VECHI = '`<button type="button" data-piesa="${k}">${n}</button>`'

# Tabela desenelor (unitare).
o('U01', A, '    senila: `<path d="M8 6.5h8a5.5 5.5 0 0 1 0 11H8a5.5 5.5 0 0 1 0-11z" pathLength="48" stroke-dasharray="2.4 1.6"/><circle cx="8" cy="12" r="2.6"/><circle cx="16" cy="12" r="2.6"/>`,\n',
  '', 'pictograme', 'șenila fără desen: butonul ei ar avea, nevăzut, cubul generic')
o('U02', A, '    conicaDubla: `<path d="M7 4h10l3.5 6.5v3L17 20H7l-3.5-6.5v-3zM3.5 10.5h17M3.5 13.5h17M7 10.5v3M10 10.5v3M14 10.5v3M17 10.5v3"/>`,',
  '    conicaDubla: `' + CONICA + '`,', 'pictograme', 'conica dublă cu desenul conicei: nu se mai deosebesc')
o('U03', A, '    senila: `', '    elice: `<path d="M12 4v16"/>`,\n    senila: `', 'pictograme', 'un desen fără piesă în FAMILII (rămas sau scris greșit)')
o('U04', A, 'const PICTOGRAMA_GENERICA = `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/>`;',
  'const PICTOGRAMA_GENERICA = `<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>`;', 'pictograme', 'cubul generic e chiar desenul axului')
o('U05', A, '    bara: `<rect x="2" y="10.5" width="20" height="3" rx="1.5"/>`,', '    bara: `<rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="currentColor"/>`,',
  'pictograme', 'bara plină: o culoare scrisă în desen, nu din stilul pictogramei')
o('U06', A, '    ax: `<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>`,', '    ax: `<path d="M9.5 3.5h5v6h9v5h-9v6h-5v-6h-6v-5h6z"/>`,', 'pictograme',
  'brațul axului lungit până la marginea pătratului: linia lui se taie')
o('U07', A, 'M19.3 12.2a3.6 3.6 0 1 0 0 5.6', 'M19.3 12.2a3.6 3.6 0 1 1 0 5.6', 'pictograme',
  'clema întoarsă: capetele arcului în pătrat, dar arcul iese prin dreapta')

# Butonul (e2e).
o('E01', A, BUTON, BUTON.replace(' aria-hidden="true"', ''), 'e2e', 'pictograma citită de cititoarele de ecran (nu e ascunsă)')
o('E02', A, BUTON, BUTON.replace('<svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAME[k] ?? PICTOGRAMA_GENERICA}</svg>${n}',
                                 '${n}<svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAME[k] ?? PICTOGRAMA_GENERICA}</svg>'),
  'e2e', 'pictograma după nume')
o('E03', A, 'g.innerHTML = gasite.map(([k, n]) => butonPiesa(k, n)).join("");', 'g.innerHTML = gasite.map(([k, n]) => ' + VECHI + ').join("");', 'e2e',
  'piesele găsite la căutare, fără pictograme')
o('E04', A, 'g.innerHTML = fam[2].map(([k, n]) => butonPiesa(k, n)).join("");', 'g.innerHTML = fam[2].map(([k, n]) => ' + VECHI + ').join("");', 'e2e',
  'galeria familiei, fără pictograme')
o('E05', A, 'data-piesa="${k}"><svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAME[k] ?? PICTOGRAMA_GENERICA}', 'data-piesa="${k}"><svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAMA_GENERICA}', 'e2e', 'toate piesele cu cubul generic')
o('E06', A, BUTON, BUTON.replace('viewBox="0 0 24 24"', 'viewBox="0 0 20 20"'), 'e2e', 'pătratul desenului mai mic: desenele tăiate în dreapta și jos')
o('E07', A, BUTON, BUTON.replace(' class="at-pict"', ''), 'e2e', 'fără clasa pictogramei: desen plin, negru, cât îl lasă butonul')

# Stilul (e2e).
C = '.mod-3d .at-pict { flex: none; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }'
o('C01', H, C, C.replace(' fill: none;', ''), 'e2e', 'desenele umplute (negre), nu doar linii')
o('C02', H, C, C.replace('stroke: currentColor;', 'stroke: #444;'), 'e2e', 'linia de o culoare fixă: pe piesa apăsată (și în tema întunecată) nu se mai vede')
o('C03', H, C, C.replace('width: 18px; height: 18px;', 'width: 24px; height: 24px;'), 'e2e', 'pictograma mai mare decât rândul numelui')
o('C04', H, '.mod-3d .at-galerie button { display: inline-flex; align-items: center; gap: 6px; border:', '.mod-3d .at-galerie button { border:', 'e2e',
  'pictograma pe linia de bază a textului, nu la mijlocul butonului')

SETURI = {
    'pictograme': ['test/unit/trenulet.pictograme.test.ts'],
}
E2E = ['test/e2e/trenulet.pictograme.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
