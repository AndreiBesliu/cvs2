# Lista de otrăvuri a feliei 28.8↑c (desenele și pozele buzunarului și ale găuririi, ADR 0290), 24.11.2026, alese de autor:
# formulele desenelor (inelele, suprapunerea, rampa, zigzagul, elicea, ciocănirea) față de lucrare, apoi desenele și cartonașele
# din fereastră: traseul și coborârea alese, urmele, rotirea liniilor, nota rampelor pe trecerea egală, verdictul coborârii,
# frezele de rest, ieșirile ciocănirii.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CAL = 'src/ui/exportDeseneCalcul.ts'
DES = 'src/ui/exportDesene.tsx'
DLG = 'src/ui/DialogExport.tsx'

# Formulele, față de lucrare (proba unitară).
o('F01', CAL, 'centre: [R, R + pas, R + 2 * pas]', 'centre: [0, pas, 2 * pas]', 'desene', 'prima trecere lipită de perete, nu la raza frezei')
o('F02', CAL, 'suprapunere: diametru - pas,', 'suprapunere: R - pas,', 'desene', 'suprapunerea socotită pe rază')
o('F03', CAL, '|| pas > diametru / 2) return null;', '|| pas > diametru) return null;', 'desene', 'pasul lateral până la tot diametrul')
o('F04', CAL, 'const tan = Math.tan((unghi * Math.PI) / 180), L = trecere / tan;', 'const tan = Math.tan((unghi * Math.PI) / 180), L = trecere * tan;',
  'desene', 'rampa înmulțită cu panta, nu împărțită')
o('F05', CAL, 'rampe: Math.max(1, Math.ceil(trecere / (lungime * tan) - 1e-9))', 'rampe: Math.max(1, Math.round(trecere / (lungime * tan)))',
  'desene', 'rampele zigzagului rotunjite, nu în sus')
o('F06', CAL, 'ture: L / (2 * Math.PI * raza)', 'ture: L / (Math.PI * raza)', 'desene', 'turele elicei pe jumătate de cerc')
o('F07', CAL, 'export const RIDICARE_CIOCANIRE = 1, APROPIERE_CIOCANIRE = 0.5;', 'export const RIDICARE_CIOCANIRE = 1, APROPIERE_CIOCANIRE = 1;',
  'desene', 'apropierea după ieșire cât ridicarea')
o('F08', CAL, 'if (k % retragere === 0)', 'if ((k + 1) % retragere === 0)', 'desene', 'ieșirea cu un pas mai devreme')
o('F09', CAL, "!Number.isInteger(retragere) || retragere < 1) return null;", 'retragere < 1) return null;', 'desene',
  'ieșirea la un număr neîntreg de pași')

# Desenele și cartonașele din fereastră (e2e).
o('E01', DLG, "                  case 'golire': return (c) => <DesenGolire", "                  case 'golire-x': return (c) => <DesenGolire",
  'e2e', 'grupul golirii fără desen')
o('E02', DLG, "paralel={p.strategie === 'paralel'} unghi=", 'paralel={false} unghi=', 'e2e', 'liniile paralele desenate ca inele')
o('E03', DLG, "                        oprit={doarCitire} titlu={t('export.paralel.titlu')} onAlege={(v) => { schimba(o.cheie, { strategie: v }); }}",
  "                        oprit={doarCitire} titlu={t('export.paralel.titlu')} onAlege={() => { schimba(o.cheie, { strategie: 'inele' }); }}",
  'e2e', 'cartonașul liniilor paralele nu alege nimic')
o('E04', DLG, "                        const z = coborareDesen('zigzag', treceriEgale(adancimeRand, citesteNumar(p.pas))?.d ?? null, citesteNumar(p.unghiCoborare),",
  "                        const z = coborareDesen('zigzag', citesteNumar(p.pas), citesteNumar(p.unghiCoborare),",
  'e2e', 'nota rampelor pe pasul scris, nu pe trecerea egală (cum era)')
o('E05', DLG, 'fel={p.coborare} bun={b.coborare} trecere=', 'fel={p.coborare} bun trecere=', 'e2e', 'coborarea refuzată de fereastră, desenată totuși')
o('E06', DLG, "                        oprit={doarCitire} titlu={t('export.coborare.titlu')} onAlege={(v) => { schimba(o.cheie, { coborare: v }); }}",
  "                        oprit={doarCitire} titlu={t('export.coborare.titlu')} onAlege={() => { schimba(o.cheie, { coborare: 'plonjare' }); }}",
  'e2e', 'cartonașele coborârii nu aleg nimic')
o('E07', DES, "    <g transform={paralel ? `rotate(${r(90 - a)} 130 68)` : undefined}>", '    <g>', 'e2e',
  'liniile paralele nerotite (verticale, oricare ar fi unghiul)')
o('E08', DES, '{cx.map((x, i) => <rect key={`u${i}`} className="urma" data-trecere-laterala={i + 1}',
  '{cx.slice(1).map((x, i) => <rect key={`u${i}`} className="urma" data-trecere-laterala={i + 1}', 'e2e', 'o urmă lipsă din trei')
o('E09', DLG, "rest={p.rest.map((x) => citesteNumar(x.diametru))} />", 'rest={[]} />', 'e2e', 'frezele de rest nedesenate')
o('E10', DES, '  const pasi = m ? m.slice(0, 80) : [],', '  const pasi = m ? m.filter((x) => x.taie) : [],', 'e2e',
  'ciocănirea fără ridicări și ieșiri')
o('E11', DES, "        <Cota pentru=\"retragere\" c={c} text={t('export.desen.gaurire.iese', { n: retragere ?? 1 })}",
  "        <Cota pentru=\"retragere\" c={c} text={t('export.desen.gaurire.iese', { n: 1 })}", 'e2e', 'ieșirea scrisă mereu „după fiecare pas”')

SETURI = {
    'desene': ['test/unit/export.desene.test.ts'],
}
E2E = ['test/e2e/export.desene.spec.ts', 'test/e2e/buzunar.spec.ts', 'test/e2e/paralel.spec.ts']
