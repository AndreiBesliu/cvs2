# Lista de otrăvuri a feliei 3.6i, pasul 1 (imprimanta owner-ului, o K1C 2025, ADR 0190), 07.11.2026, alese de autor: lista ca
# text (`retGcodeFileInfo`), mărimea fișierelor, firmware-ul din `DWIN sw ver`, verificarea trimiterii după mărime, plus două
# legături din fereastră (prin e2e, cu imprimanta falsă `fel: 'k1c-2025'`).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CR = 'src/machine/imprimanta/creality.ts'
UR = 'src/machine/imprimanta/urcare.ts'
UI = 'src/app/PanouImprimanta.tsx'

o('L01', CR, "    : typeof textLista === 'string' ? fisiereDinText(textLista) : null;", '    : null;', 'creality',
  'lista ca text (K1C 2025) nu se citește: fereastra așteaptă la nesfârșit')
o('L02', CR, 'caleSigura(cale) === null ? null : fisierDin(', 'fisierDin(', 'creality',
  'o intrare din afara directorului G-code e mutată după nume în el')
o('L03', CR, "const nume = p.slice(1, -5).join(':');", "const nume = p[1] ?? '';", 'creality', 'un nume cu „:” se taie')
o('L04', CR, 'size: p[p.length - 5]', 'size: p[2]', 'creality', 'mărimea, citită din stânga (greșit pentru un nume cu „:”)')
o('L05', CR, "marime: numar(r['size'])", 'marime: null', 'creality', 'mărimea se pierde')
o('L06', CR, "return v['printer sw ver'] || v['dwin sw ver'] || null;", "return v['printer sw ver'] || null;", 'creality',
  'firmware-ul K1C 2025 (DWIN sw ver) nu se arată')
o('L07', UR, 'if (f && (f.marime === null || f.marime === o.date.size)) return { ok: true, fisier: f };',
  'if (f) return { ok: true, fisier: f };', 'urcare', 'un fișier ajuns pe jumătate (altă mărime) trece drept ajuns')
o('L08', UR, "return { ok: false, motiv: alta ? 'marime' : 'lipsa' };", "return { ok: false, motiv: 'lipsa' };", 'urcare',
  'altă mărime spusă drept fișier lipsă')
o('W01', UI, '{pas.f.marime === null', '{true', 'e2e', '„Ajuns” fără mărime, deși lista o are')
o('W02', UI, 'f.marime === null ? null : marimeText(f.marime)]', 'null]', 'e2e', 'lista fără mărimile fișierelor')

SETURI = {
    'creality': ['test/unit/imprimanta.creality.test.ts'],
    'urcare': ['test/unit/imprimanta.urcare.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
