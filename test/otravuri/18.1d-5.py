# Lista de otrăvuri a feliei 18.1↑d-5 (freza din „Frezele mele” pe rândurile reliefului; ADR 0316), 27.11.2026, alese de
# autor: alegerea (T-ul, diametrul, forma, pașii, originea), nota bibliotecii, „Ia valorile noi”, „Pune-o înapoi”, scrierea
# originii la Exportă (`operatieReliefDinDialog`) și pasul lateral din Tăierea (`operatiiCuFreza`). Cele pure, prinse de probele
# unitare; cele ale ferestrei, de e2e (`relief.biblioteca.spec.ts`). Plus un martor, care trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ER = 'src/ui/exportRelief.ts'
VO = 'src/app/valoriOperatii.ts'
AF = 'src/model/alegereFreza.ts'
FF = 'src/ui/FisaFinisare.tsx'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'

# B00, mutată pe 27.11 (18.1↑e): comentariul și-a primit toroidala.
o('B00', ER, "/** Forma frezei rândului, pentru bibliotecă: bila, toroidala sau V-ul (cu vârful) doar la finisare; plata (lipsă) altfel. */",
  "/** Forma frezei rândului, pentru bibliotecă: bila, toroidala sau V-ul (cu vârful) doar la finisare; plata (lipsă) altfel.  */", 'unit',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('B01', ER, "    pas: text(f.pas), pasLateral: text(f.pasLateral), origineScula: s.origine,",
  "    pas: text(f.pas), origineScula: s.origine,", 'unit', 'freza aleasă nu-și aduce pasul lateral')
o('B02', ER, "  if (r.fel === 'degrosare' || f === undefined) return { formaScula: 'plata' };",
  "  if (f === undefined) return { formaScula: 'plata' };", 'unit', 'degroșarea primește forma rotundă a frezei alese')
o('B03', ER, "    if (cheie === fara) continue;", "    if (false) continue;", 'unit', 'T-ul se socotește și cu freza înlocuită')
o('B04', ER, "    const turatie = r.origineScula?.regim?.turatie;", "    const turatie = undefined;", 'unit',
  'turația frezei din bibliotecă nu face parte din identitate')
o('B05', ER, "  return { unde: 'scula', origine: r.origineScula, diametru: r.diametruScula, ...(forma ? { forma } : {}) };",
  "  return { unde: 'scula', origine: r.origineScula, diametru: r.diametruScula };", 'unit',
  'nota bibliotecii nu vede forma (o bilă și o plată de același Ø ar fi aceeași)')
o('B06', ER, "    if (l.origine?.biblioteca.id === id && stareOrigine(l, biblioteca)?.fel === 'schimbata') n++;",
  "    if (l.origine?.biblioteca.id === id) n++;", 'unit', '„Pe toate (N)” numără și rândurile la zi')
o('B07', ER, "    if (k === cheie || diferenteFreza(l, f).every((d) => d.camp === 'nume')) nou[k] = { ...r, ...cuValorileNoiRelief(r, f, text) };",
  "    nou[k] = { ...r, ...cuValorileNoiRelief(r, f, text) };", 'unit', '„Pune-o înapoi” schimbă și rândurile cu altă copie')
# B08, mutată pe 27.11 (18.1↑e, ADR 0319): garda care ținea toroidala afară de pe rând a plecat; otrava trece pe ramura ei.
o('B08', ER, "  if (f.tip === 'toroidala') return { formaScula: 'toroidala', razaColt: text(f.raza) };\n",
  "", 'unit', 'toroidala aleasă pe finisare se scrie ca V (fără raza colțului)')
o('B09', ER, "    pas: citesteNumar(r.pas), pasLateral: citesteNumar(r.pasLateral),", "    pas: citesteNumar(r.pas), pasLateral: citesteNumar(r.pas),", 'unit',
  'copia de pus înapoi ia pasul pe trecere ca pas lateral')
o('B10', ER, "    origineScula: f.scula.origine ?? null,", "    origineScula: null,", 'unit', 'rândul uită originea din document')
o('B11', VO, "  const deMana = alta && orig !== null && orig !== undefined && s.biblioteca?.id === orig.biblioteca.id && s.biblioteca.rev === orig.biblioteca.rev;",
  "  const deMana = false;", 'unit', 'un diametru schimbat de mână își păstrează originea din bibliotecă')
o('B12', VO, "    if (scula !== s || JSON.stringify(cu) !== JSON.stringify(s)) scula = cu;", "    scula = cu;", 'unit',
  'Exportă fără schimbare rescrie freza (alt obiect)')
o('B13', VO, "    const cu = cuOrigine(s, scula, orig, scula === s ? numeDupaForma(s.forma) : scula.nume);",
  "    const cu = cuOrigine(s, scula, orig, scula.nume);", 'unit', '„Scrisă de mână” păstrează numele frezei din bibliotecă')
o('B14', AF, "const cuPasLateral = (o: Pick<Operatie, 'tip'>): boolean => o.tip === 'buzunar' || o.tip === 'finisare' || o.tip === 'degrosare';",
  "const cuPasLateral = (o: Pick<Operatie, 'tip'>): boolean => o.tip === 'buzunar';", 'unit',
  'în Tăierea, freza aleasă nu aduce pasul lateral pe relief')
o('B15', FF, "          onText={(x) => { onSchimba({ diametruScula: x, origineScula: null }); }} />",
  "          onText={(x) => { onSchimba({ diametruScula: x }); }} />", 'e2e', 'un diametru scris de mână lasă originea pe rând')
o('B16', EC, "        ...((x) => (x ? { origine: x } : {}))(origineDin(s)),", "", 'e2e',
  'fereastra nu citește originea din document (redeschisă, freza pare scrisă de mână)')
o('B17', EC, "      const lista = frezePotrivite(biblioteca.freze, [{ tip: fel, latura: 'pe-linie' }]).map(oferita);",
  "      const lista = frezePotrivite(biblioteca.freze, [{ tip: 'finisare', latura: 'pe-linie' }]).map(oferita);", 'e2e',
  'degroșarea primește și bila în listă')
o('B18', DE, "    ia: (cheie, f) => { const r = paramRelief[cheie]; if (r) schimbaRelief(cheie, cuValorileNoiRelief(r, f, text)); },",
  "    ia: () => undefined,", 'e2e', '„Ia valorile noi” nu face nimic pe rândul reliefului')
o('B19', FF, "          onAlege={(x) => { c.alege(fin.cheie, x); }} onMana={() => { onSchimba({ origineScula: null }); }} />",
  "          onAlege={() => undefined} onMana={() => { onSchimba({ origineScula: null }); }} />", 'e2e', 'freza aleasă din listă nu ajunge pe rând')


# ---- Seturile ----
SETURI = {
    'unit': ['test/unit/export.relief.biblioteca.test.ts', 'test/unit/export.relief.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.biblioteca.spec.ts']
