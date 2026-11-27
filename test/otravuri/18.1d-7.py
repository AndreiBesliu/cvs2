# Lista de otrăvuri a feliei 18.1↑d-7 („Dă-i T{n}” pe freza reliefului; ADR 0318), 27.11.2026, alese de autor: locul frezei
# reliefului între frezele ferestrei, numărul scris de buton, butonul din fișă și câmpurile înroșite. Prinse de e2e
# (`relief.export.spec.ts`). Plus un martor, care trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DE = 'src/ui/DialogExport.tsx'
FF = 'src/ui/FisaFinisare.tsx'

o('T00', FF, "  /** Freza e pe numărul unui conflict de T: câmpurile ei se înroșesc, ca la celelalte rânduri (felia 18.1↑d-7). */",
  "  /** Freza e pe numărul unui conflict de T: câmpurile ei se înroșesc, ca la celelalte rânduri (felia 18.1↑d-7).  */", 'e2e',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
# T01, mutată pe 27.11 (18.1↑e): apelul a primit raza colțului toroidalei.
o('T01', DE, "      { cheie: f.cheie, unde: 'scula' }, tor);", "      undefined, tor);", 'e2e', 'freza reliefului fără locul ei: niciun buton')
o('T02', DE, "      out.push(x ? [m, 'freza-relief', { numar: x.numar, fa: () => { schimbaRelief(cheie, { numarScula: text(x.numar) }); } }] : [m, 'freza-relief']);",
  "      out.push(x ? [m, 'freza-relief', { numar: x.numar, fa: () => { schimbaRelief(cheie, { numarScula: text(x.numar + 1) }); } }] : [m, 'freza-relief']);",
  'e2e', 'butonul scrie alt număr decât cel spus')
o('T03', FF, "valoare={r.numarScula} oprit={oprit} rau={rau('scula') || ciocnit} mod=\"numeric\"", "valoare={r.numarScula} oprit={oprit} rau={rau('scula')} mod=\"numeric\"",
  'e2e', 'T-ul ciocnit nu se înroșește')
o('T04', FF, "    ...(rep ? {\n      buton:", "    ...(false ? {\n      buton:", 'e2e', 'fișa reliefului nu arată butonul')


# ---- Seturile ----
SETURI = {
    'e2e': [],
}
E2E = ['test/e2e/relief.export.spec.ts']
