# Lista de otrăvuri a feliei 28.8↑b-2 (alegerile ferestrei exportului ca cartonașe cu poze, ADR 0290), 24.11.2026, alese de
# autor: cartonașul (bifat, alegerea, motivul care oprește, numele fiecărei variante), colțurile oprite pe linie, tokenurile
# pozelor, inch doar unde postul îl scrie, schimbarea frezei, direcția pe linie, valorile colțurilor și câmpul găsit în sursă.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


POZE = 'src/ui/exportPoze.tsx'
DLG = 'src/ui/DialogExport.tsx'
CSS = 'src/app/stil.css'

o('G01', DLG, '<Cartonase data-camp="colturi"', '<Cartonase data-camp="colturi2"', 'grupuri', 'un câmp al cartonașelor fără grup (scanarea sursei îl găsește)')
o('C01', POZE, 'ales={x.v === valoare}', 'ales={false}', 'e2e', 'varianta aleasă nu e bifată')
o('C02', POZE, "onChange={() => { onAlege(x.v); }}", 'onChange={() => {}}', 'e2e', 'clicul pe cartonaș nu alege')
o('C03', POZE, 'disabled={oprit || x.motiv !== undefined}', 'disabled={oprit}', 'e2e', 'o variantă cu motiv rămâne de ales („unde ține” pe linie)')
o('C04', POZE, ' data-camp={camp}\n', '\n', 'e2e', 'inputurile cartonașelor fără numele lor (locurile urechilor, colțurile)')
o('C05', DLG, "oprit={doarCitire || deschis || nuProfil || p.latura === 'pe-linie'} onAlege={(v) => { schimba(o.cheie, { colturi: v }); }}",
  'oprit={doarCitire || deschis || nuProfil} onAlege={(v) => { schimba(o.cheie, { colturi: v }); }}', 'e2e', 'colțurile de ales și pe linie')
o('C06', CSS, '.dx-ilu {\n  --lemn: #ecdcbf;', '.dx-desen {\n  --lemn: #ecdcbf;', 'e2e', 'tokenurile lemnului doar în desene: pozele ies negre')
o('C07', DLG, "...(postAles?.inch !== false ? [{ v: 'inch' as const", "...(true ? [{ v: 'inch' as const", 'e2e', 'inch oferit și unde postul nu-l scrie')
o('C08', DLG, 'onAlege={(v) => { schimbat(); setStrategie(v); }}', 'onAlege={() => { schimbat(); }}', 'e2e', 'schimbarea frezei nu se alege')
o('C09', DLG, "onAlege={(v) => { schimba(o.cheie, { directie: v }); }}", "onAlege={() => { schimba(o.cheie, { directie: '' }); }}", 'e2e',
  'direcția pe linie rămâne „ca desenul”')
o('C10', DLG, "{ v: 'dog-bone', text: t('export.colturi.dog-bone')", "{ v: 't-bone', text: t('export.colturi.dog-bone')", 'e2e',
  'cartonașul dog-bone alege T-bone')

SETURI = {
    'grupuri': ['test/unit/export.grupuri.test.ts'],
}
E2E = ['test/e2e/export.cartonase.spec.ts', 'test/e2e/export.spec.ts', 'test/e2e/gravare.spec.ts', 'test/e2e/masina.spec.ts', 'test/e2e/proiect.spec.ts']
