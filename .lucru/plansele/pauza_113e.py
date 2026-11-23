# Pauza din 22.11 seara (owner-ul: „cand termina background tasks, vreau sa facem pauza”), pe 11.3↑e: documentele fără
# cifre de inventat, DEVLOG, nota comună și memoria liniei. Folosire: python -B -X utf8 .tmp/pauza_113e.py repo|note "<ora>" "<unitarele>" [sha]
import pathlib, re, sys
faza, ora, unit = sys.argv[1], sys.argv[2], sys.argv[3]
sha = sys.argv[4] if len(sys.argv) > 4 else None
NL = chr(10)
W = pathlib.Path(r'C:\Users\besli\cncvs2-lucru\plansele')
N = pathlib.Path(r'C:\Users\besli\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_a2b0fdea-74f3-4631-824f-6e80ccd9945d\plansele-worktree.md')
M = pathlib.Path(r'C:\Users\besli\.claude\projects\C--Users-besli-Desktop-MyWork-Apps\memory')

def inl(p, a, b):
    t = p.read_bytes().decode('utf-8')
    assert t.count(a) == 1, (p.name, a[:70], t.count(a))
    p.write_bytes(t.replace(a, b).encode('utf-8'))

if faza == 'repo':
  # ADR: lista otrăvurilor e scrisă, dar nerulată.
  inl(W / 'docs/adr/0211-urechile-la-locuri-alese.md', 'Otrăvurile `test/otravuri/11.3e.py`: OTRAVURI.',
      'Otrăvurile `test/otravuri/11.3e.py`: 39, de rulat (felia e în lucru).')

  # DEVLOG: pauza, cu ce s-a verificat și ce rămâne.
  d = W / 'DEVLOG.md'
  t = d.read_bytes().decode('utf-8')
  assert t.rstrip(NL).endswith('egale cădeau 9 + 4. La 10 mm, lemnul de 3,65 mm dintre tăieturi e legat de margine, deci programele rămân ale plăcii.')
  t = t.rstrip(NL) + NL + (
      '- **Lucrarea și fereastra**, comise (`8a8c30fc`, `fa86da15`): `src/cam/urechiLemn.ts`, modul „lemn” în `job.ts`, cele două\n'
      '  treceri (`programFoii`, `src/jobs/calculCam.ts`; fundul foii, `fundFoii`, scos din `src/sim/desprinse.ts`), „unde ține” în\n'
      '  fereastra exportului, butonul „Pune urechile unde țin”, semnele de pe traseu, panoul; ADR 0211 („Implementarea feliei\n'
      '  11.3↑e”), manualul (ro, en) și CLAUDE.md, fără cifrele porților.\n'
      '- **Verificat până la pauză:** tipurile; regulile de import (20 / 20, 0 încălcări); traducerile; `urechi.lemn.test.ts` (placa\n'
      '  11 la 5 mm: 3 + 1 plăcuțe desprinse, cele de pe hârtie, și aceleași prin proba pe G-code; la 10 mm, programele plăcii,\n'
      '  octet cu octet; alegerea și fundul pe hârtie, cu arcele și sensul trigonometric); unitarele întregi: ' + unit + '.\n'
      '- **Pauză:** 22.11, ' + ora + ', la cuvântul owner-ului („cand termina background tasks, vreau sa facem pauza”). Rămân: e2e-ul\n'
      '  (mașina n-a avut un minut liniștit în 20 de minute), otrăvurile (lista de 39, nerulată), build-ul determinist, rândul din\n'
      '  fișa etapei și traducerea lui, `docs/otravuri.md`, canalul, raportul.\n')
  d.write_bytes(t.encode('utf-8'))

if faza == 'note':
  assert sha
  # Nota comună.
  n = N.read_bytes().decode('utf-8')
  assert '## 22.11: 11.3↑e' not in n
  nota = (NL + '## 22.11: 11.3↑e (urechile „unde ține”, ADR 0211, varianta b) ÎN LUCRU: pauză la cuvântul owner-ului, ramura împinsă la `' + sha + '`' + NL
          + '- Pornită la „Da, 11.3↑e” (owner-ul, în sesiunea liniei, 22.11 21:34), peste `main` `88be9d6c` (avans direct). Documentul' + NL
          + '  rămâne v26: modul „lemn” era deja în ușă, deci nicio migrare și nimic de unit în schemă.' + NL
          + '- Commit-urile: `8a8c30fc` (lucrarea: alegerea locurilor în `src/cam/urechiLemn.ts`, modul „lemn” în `job.ts`, cele două' + NL
          + '  treceri în `programFoii`, `src/jobs/calculCam.ts`, pe fundul foii din `src/sim/desprinse.ts`), `fa86da15` (fereastra,' + NL
          + '  butonul „Pune urechile unde țin”, semnele de pe traseu, panoul, e2e-ul nou și lista otrăvurilor), `' + sha + '` (WIP: ADR 0211,' + NL
          + '  manualul ro / en, CLAUDE.md, DEVLOG; fără cifrele porților).' + NL
          + '- Verificat: tipurile; importurile (20 / 20, 0 încălcări); traducerile; `urechi.lemn.test.ts` (placa 11 la 5 mm: 3 + 1' + NL
          + '  plăcuțe desprinse, cele de pe hârtie; la 10 mm, programele plăcii, octet cu octet); unitarele întregi: ' + unit + '.' + NL
          + '- **NU e gata de unit.** Rămân, în ordine: build (`vite build`), e2e pe 4178 după un minut de liniște (`urechi-lemn`, nou,' + NL
          + '  apoi `urechi-alese`, `export-urechi`, apoi suita întreagă); otrăvurile `test/otravuri/11.3e.py` (39) într-o clonă în afara' + NL
          + '  Drive-ului, cu joncțiune spre `node_modules` (scoasă ÎNAINTEA clonei, la capăt); build-ul determinist; rândul din fișa' + NL
          + '  etapei 3 (`.tmp/etapa_113e.py`) și traducerea lui (`node scripts/traduceri.ts`, apoi `.tmp/traducere_113e.py`);' + NL
          + '  `docs/otravuri.md`; DEVLOG Completed; canalul `plansele`; push; raportul, cu întrebarea pentru 11.3↑f (regulile).' + NL)
  N.write_bytes((n.rstrip(NL) + NL + nota).encode('utf-8'))

  # Memoria liniei.
  p = M / 'project_cncvs2_plansele.md'
  t = p.read_bytes().decode('utf-8')
  t, k = re.subn(r'11\.3↑d \(urechile la locuri alese, ADR 0211 acceptat 19\.11 cu toate recomandările, documentul v26\) GATA DE UNIT 21\.11 la `[0-9a-f]+`, peste `main` `a64adf63`; urmează, la cuvântul owner-ului: 11\.3↑e \(unde ține\) și 11\.3↑f \(regulile\)',
                 '11.3↑d ÎN MAIN (`44046e5d`, 22.11); 11.3↑e (urechile „unde ține”, ADR 0211 b, tot v26) ÎN LUCRU, pauză 22.11 la `' + sha + '` (lipsesc e2e, otrăvurile, porțile, canalul); apoi 11.3↑f (regulile), la cuvântul owner-ului', t, count=1)
  assert k == 1
  t = (t.rstrip(NL) + NL + '- **22.11: 11.3↑e ÎN LUCRU, pauză la `' + sha + '`** (împins; „Da, 11.3↑e”): lucrarea în două treceri (`programFoii`), alegerea în '
       '`src/cam/urechiLemn.ts`, fereastra și butonul; probele noi verzi (placa 11 la 5 mm: 3 + 1). Ce rămâne și ordinea: în nota '
       'comună (`plansele-worktree.md`). **De ținut minte:** (1) „un minut de liniște” poate să nu vină 20 de minute cât alte linii '
       'rulează: verifică procesele (`Get-CimInstance Win32_Process`), nu doar procesorul; (2) o joncțiune `node_modules` dintr-o '
       'clonă se scoate cu `rmdir` (fără /s) ÎNAINTEA clonei.' + NL)
  p.write_bytes(t.encode('utf-8'))

  q = M / 'MEMORY.md'
  m = q.read_bytes().decode('utf-8')
  linii = m.split(NL)
  ix = [i for i, l in enumerate(linii) if l.startswith('- [CNCVS2: planșele (etapa 11)]')]
  assert len(ix) == 1
  linii[ix[0]] = ('- [CNCVS2: planșele (etapa 11)](project_cncvs2_plansele.md) - `wip/11.1-plansele`, 4178; până la 11.3↑d în main; 11.3↑e '
                  '(„unde ține”) ÎN LUCRU, pauză 22.11 la `' + sha + '` (lipsesc e2e, otrăvurile, porțile); ce rămâne, în nota comună; tăierea '
                  'plăcii, a lui; motivele și etichetele în `editare.*.ts`')
  q.write_bytes(NL.join(linii).encode('utf-8'))
print('ok')
