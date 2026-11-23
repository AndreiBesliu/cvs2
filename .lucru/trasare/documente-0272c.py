"""Documentele feliei 25.8↑a, a treia parte: indexul ADR, fișa etapei, tabelul de acoperire, CLAUDE.md, DEVLOG, registrul
otrăvurilor. Valorile măsurate vin dintr-un json (argumentul)."""
import json
import sys

V = json.loads(open(sys.argv[1], encoding='utf-8').read())
CANAL = 'https://cncvectorstudio-test--trasare-icw58h57.web.app'


def editeaza(p, perechi):
    s = open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    s = s.replace('\r\n', '\n')
    for a, b in perechi:
        assert s.count(a) == 1, (p, a[:90], s.count(a))
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', nl))


# ── Indexul ADR ──────────────────────────────────────────────────────────────────────────────────────────────────────
editeaza('docs/adr/README.md', [
    ("""| Imaginile pe foaie, straturile bitmap (feliile 25.8↑a–b; propus pe 21.11 la „Da, propunerea”, cu schița; codul la răspunsuri): o imagine""",
     """| Imaginile pe foaie, straturile bitmap (feliile 25.8↑a–b; propus pe 21.11 la „Da, propunerea”, cu schița; acceptat în aceeași zi la „Da, 1a–3a”; 25.8↑a implementată pe 22.11): o imagine"""),
])

# ── Fișa etapei: rândul de încercat și jurnalul feliei ───────────────────────────────────────────────────────────────
editeaza('docs/etape/etapa-03.md', [
    ("""| Răspunsurile la cele trei întrebări din ADR 0272 (imaginile pe foaie, straturile bitmap; propus pe ramura `wip/25.1-trasare`): formularul din schiță (<https://claude.ai/artifact/Ctc63ZdA6ipkLPA8uGCJyb>: macheta foii cu imaginea sub desen, lacătul, opacitatea, calibrarea din două puncte, trasarea din imagine, piciorul ferestrei trasării), apoi „gata” în sesiune | 25.8↑ | acum |""",
     f"""| Încercarea imaginilor pe foaie (25.8↑a, ADR 0272) pe canalul `trasare` (<{CANAL}>; ramura `wip/25.1-trasare`): din „Importă…”, o poză sau o scanare a ta: bifează **Păstrează imaginea pe foaie** și **Importă** (vectorii și, sub ei, imaginea), ori **Doar imaginea**; cu nimic selectat, în panoul Proprietăți, **Imaginile foii**: ochiul, opacitatea, lacătul; desfăcută, mut-o, scaleaz-o dintr-un colț și rotește-o (Shift: 15°); reîncarcă pagina: imaginea e tot acolo. Spune unde imaginea nu stă exact sub vectori, unde mânerele încurcă desenul sau unde ți-ar trebui calibrarea (25.8↑b) | 25.8↑a | când vrei |"""),
])
p = 'docs/etape/etapa-03.md'
s = open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
s = s.replace('\r\n', '\n')
rand = s.split('\n')
k = next(i for i, r in enumerate(rand) if r.startswith('| 25.8↑ | 21.11 18:56 |'))
rand.insert(k + 1, (
    f"| 25.8↑a | 21.11 19:15 | {V['gata']} | 2 | **Imaginile pe foaie** (fără mașină; ADR 0272, acceptat la „Da, 1a–3a”, cu toate "
    "recomandările, și implementat; worktree-ul `trasare`, ramura `wip/25.1-trasare`; oprită de pauza din 21.11 seara, reluată pe "
    "22.11 la mesajul sesiunii principale, după „neata, continua si porneste si worktrees” al owner-ului). Documentul: "
    "`Foaie.imagini` (fără schemă nouă), ușa, comanda `inlocuieste-imagini`, acțiunea `foaie.imagini`; octeții în baza "
    "`cncvs2-imagini`, după amprentă, curățați la pornire (nefolosiți de document și de versiunile păstrate, puși de cel puțin "
    "o zi). Importul: bifa **Păstrează imaginea pe foaie** (vectorii și imaginea într-un pas, imaginea exact sub ei) și **Doar "
    "imaginea** (și după un refuz al trasării; lăsată pe planșă, cu centrul în punctul lăsat); imaginea, prelucrată ca în "
    "fereastră (foaia, îndreptarea, 16 Mpx) și codată în workerul trasării; un JPEG / PNG / WebP neprelucrat rămâne fișierul "
    "lui. Pânza: stratul imaginilor, sub vectori, din trepte reduse. Panoul foii: **Imaginile foii** (miniatura, ochiul, "
    "lacătul, opacitatea, coșul). Mânerele unei imagini desfăcute: mutarea, scalarea dintr-un colț, rotirea (Shift: 15°); pe o "
    "linie a desenului, apăsarea e a formei. **Treceri:** (1) modelul, importul, pânza, panoul, mânerele (21.11 seara, "
    f"întreruptă la curățare); (2) curățarea, probele, otrăvurile, `main` `88be9d6c` adus (`a5ed2216`: ciocniri în DEVLOG și în "
    f"importul lui `App.tsx`; documentul trecut între timp la v26, deci probele spun acum schema documentului nou), documentele. "
    f"Otrăvurile: 43 / 43 (27 unitare, 16 prin e2e); la prima rulare, M06 („vizibilă” opțională) a scăpat: proba cere acum "
    f"fiecare câmp, lipsă. E2e {V['e2e']}; unitare {V['unit']}. Totalul {V['total']} / 800 kB (felia +{V['delta']}), "
    f"pornirea {V['pornire']} / 115, cu ușa {V['usa']}; publicat pe canalul `trasare` (<{CANAL}>, până pe {V['expira']}), "
    f"amprenta `{V['amprenta']}`. |"))
open(p, 'w', encoding='utf-8', newline='').write('\n'.join(rand).replace('\n', nl))

# ── Tabelul de acoperire ─────────────────────────────────────────────────────────────────────────────────────────────
editeaza('ACOPERIRE-ARTCAM-DESKPROTO.md', [
    ("""| de făcut (propus pe 21.11: ADR 0272, imaginile pe foaie, feliile 25.8↑a–b: imaginea sub desen, calibrarea, trasarea din ea; schița și întrebările la owner); formele ridicate din culori țin de reliefuri, încă de făcut |""",
     """| în lucru (ADR 0272, acceptat pe 21.11: 25.8↑a făcută pe 22.11, imaginea pe foaie sub desen, fixată sau desfăcută, cu mânerele și lista din panoul foii; 25.8↑b: calibrarea din două puncte și trasarea din imaginea de pe foaie); formele ridicate din culori țin de reliefuri, încă de făcut |"""),
])

# ── Registrul otrăvurilor ────────────────────────────────────────────────────────────────────────────────────────────
p = 'docs/otravuri.md'
s = open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
s = s.replace('\r\n', '\n')
rand = s.split('\n')
k = next(i for i, r in enumerate(rand) if r.startswith('| `test/otravuri/25.4c.py` |'))
rand.insert(k + 1, (
    "| `test/otravuri/25.8a.py` | imaginile pe foaie (ADR 0272, felia 25.8↑a): ușa (amprenta, opacitatea, rotirea, id-urile "
    "unice, plafonul, câmpurile cerute), jurnalul (aplicarea, inversa), acțiunea (garda pe valorile care nu sunt numere, "
    "amprenta, doar-citirea, aceeași listă), importul (imaginea mutată cu desenul, id-ul nou, comanda ținută, primul id "
    "liber, locul în pagină, tipurile păstrate cum sunt, ce se păstrează: reducerea, prelucrarea, JPEG-ul), pânza "
    "(întoarcerea, opacitatea, stratul ținut, imaginile trimise workerului), fereastra (bifa oprită, ținută minte, folosită; "
    "„Doar imaginea” după un refuz și în punctul lăsat), panoul (ochiul, procentele, lacătul), mânerele (sensul rotirii, "
    "Shift, colțul opus, latura minimă, coordonatele, cadrul de selecție), curățarea (vârsta, versiunile citite), alegerea "
    "doar pe contur; alese de autor | 43: 43 / 43 prinse (27 unitare, 16 prin e2e pe portul 4183), pe `1a313d57`; la prima "
    "rulare (`ad836e58`), 26 / 27 unitare: M06 („vizibilă” făcută opțională) a scăpat, probele refuzau doar „vizibilă” scrisă "
    "ca șir: proba cere acum fiecare câmp, lipsă. Nerulată: curățarea fără documentul de acum (IndexedDB și ceasul) |"))
open(p, 'w', encoding='utf-8', newline='').write('\n'.join(rand).replace('\n', nl))

# ── CLAUDE.md: starea liniei trasării ────────────────────────────────────────────────────────────────────────────────
editeaza('CLAUDE.md', [
    ("""(cu ușa 111,2). **ADR 0272 (imaginile pe foaie, straturile bitmap; feliile 25.8↑a–b) propus pe 21.11,** cu schița
  (<https://claude.ai/artifact/Ctc63ZdA6ipkLPA8uGCJyb>, formularul în `raspunsuri/owner`): codul pornește după răspunsuri.""",
     f"""(cu ușa 111,2). **ADR 0272 (imaginile pe foaie, straturile bitmap; feliile 25.8↑a–b) acceptat pe 21.11** („Da,
  1a–3a”), cu schița (<https://claude.ai/artifact/Ctc63ZdA6ipkLPA8uGCJyb>). **25.8↑a gata pe 22.11** (`{V['sha']}`, cu `main`
  `88be9d6c` adus): `Foaie.imagini` (fără schemă nouă), ușa, comanda `inlocuieste-imagini`, acțiunea `foaie.imagini`; baza
  `cncvs2-imagini` (`src/app/imaginiFoaie.ts`, după amprentă; `curataLaPornire`: nefolosite și puse de cel puțin o zi);
  importul („Păstrează imaginea pe foaie”, „Doar imaginea”; `octetiImaginiiFoii` în workerul trasării, `asezareInPagina`,
  `comandaImport` cu `imagineImport`); pânza (`CerereImagini`, stratul și treptele în `lucrator.ts`); panoul
  (`ImaginiFoii.tsx`); mânerele (`ManereImagine.tsx`, `manereImagine.ts`; `instantaLa` cu `doarContur`). Otrăvurile 43 / 43;
  totalul {V['total']} / 800 kB (+{V['delta']}), pornirea {V['pornire']} / 115 (cu ușa {V['usa']}); canalul, amprenta
  `{V['amprenta']}`. Urmează 25.8↑b („Calibrează”, „Trasează…” din imaginea de pe foaie), la cuvântul owner-ului."""),
])

# ── DEVLOG: intrarea feliei, întreagă ────────────────────────────────────────────────────────────────────────────────
editeaza('DEVLOG.md', [
    ("""## 2026-11-21 — Felia 25.8↑a pornită: imaginile pe foaie (ADR 0272, acceptat: „Da, 1a–3a”) (Model: Claude Opus 5.5)

**Prompt:** „Da, 1a–3a” (owner-ul, în sesiunea liniei trasării, la întrebarea „Iei cele trei recomandări (1a, 2a, 3a)?”
despre ADR 0272).
**Started:** 21.11, 19:15.""", f"""## 2026-11-22 — Felia 25.8↑a: imaginile pe foaie (ADR 0272, acceptat: „Da, 1a–3a”, implementat) (Model: Claude Opus 5.5)

**Prompt:** „Da, 1a–3a” (owner-ul, în sesiunea liniei trasării, la întrebarea „Iei cele trei recomandări (1a, 2a, 3a)?”
despre ADR 0272). Reluată pe 22.11 la mesajul sesiunii principale: „Reia 25.8↑a (ADR 0272): aseară te-ai oprit la
curățarea la pornire”, după „neata, continua si porneste si worktrees” al owner-ului.
**Started:** 21.11, 19:15. **Completed:** {V['gata']}.

- **Ramura:** pornită pe `78a44def` (ADR 0272 propus); lucrul comis în `ad836e58` și `1a313d57`, apoi `main` `88be9d6c`
  adus (`a5ed2216`): ciocniri doar în DEVLOG și în importul tipurilor din `App.tsx`. Între timp, `main` a trecut documentul
  la v26 (11.3↑d): probele imaginilor spun acum schema documentului nou, nu un număr.
- **Documentul:** `Foaie.imagini` (fără schemă nouă), ușa (amprenta, plafoanele, id-urile unice), comanda
  `inlocuieste-imagini`, acțiunea `foaie.imagini` (garda spune ce spune ușa, și pe un șir „5”).
- **Baza imaginilor** (`src/app/imaginiFoaie.ts`): octeții după amprenta SHA-256, în afara documentului. Curățarea la
  pornire, în fila care scrie: nefolosite de document și de versiunile păstrate (citite din text, fără ușă), puse de cel
  puțin o zi (plasa celorlalte file). Prima scriere a ei, întreruptă de pauză, nu se aplicase: refăcută din fișier.
- **Importul:** bifa „Păstrează imaginea pe foaie” (oprită, ținută minte) și „Doar imaginea” (și după un refuz al
  trasării, lăsată pe planșă în punctul lăsat). Imaginea vine din workerul trasării, prelucrată ca în fereastră și codată
  acolo (`octetiImaginiiFoii`): firul principal nu primește pixelii. Un JPEG / PNG / WebP neprelucrat rămâne fișierul lui;
  un JPEG prelucrat, tot JPEG (abaterea de la §2, spusă în ADR). Vectorii și imaginea, într-un pas.
- **Pânza:** stratul imaginilor în workerul ei, sub vectori, din trepte reduse; redesenat doar la schimbarea vederii, a
  imaginilor sau la o decodare.
- **Panoul și mânerele:** „Imaginile foii” (miniatura, ochiul, lacătul, opacitatea, coșul); pe o imagine desfăcută,
  mutarea, scalarea dintr-un colț, rotirea (Shift: 15°).
- **Pe drum:**
  - Apăsarea înăuntrul unui contur închis alegea forma, iar după „Importă” cu imaginea, chenarul trasat acoperă aproape
    toată imaginea: o imagine desfăcută n-ar fi putut fi mutată. Acum forma câștigă doar pe linia ei (`instantaLa` cu
    `doarContur`).
  - În e2e, mânerul de rotire ajunsese sub riglă (imaginea scalată, ori lăsată prea sus): proba verifică acum că punctul
    apăsat e pe pânză (`elementFromPoint`) înaintea gestului.
  - Un punct de lăsare cu coordonate fracționare: browserul dă evenimentului un `clientY` întreg, deci proba socotește
    punctul din valorile rotunjite.
- **Probele:** unitare (ușa, jurnalul, acțiunea, paritatea, importul, locul în pagină, mânerele, baza, curățarea, alegerea
  doar pe contur) și 4 e2e (`imagini-foaie.spec.ts`).
- **Otrăvurile** (`test/otravuri/25.8a.py`): 43 / 43 (27 unitare, 16 prin e2e); M06 scăpase la prima rulare (doar
  „vizibilă” ca șir era refuzată): proba cere acum fiecare câmp, lipsă.
- **Porțile, pe arborele unit:** `tsc` pe cele trei configurații, regulile importurilor, licențele, determinismul,
  traducerile; unitare {V['unit']}; e2e {V['e2e']}. Mărimea: totalul {V['total']} / 800 kB (`main` {V['total_main']}:
  +{V['delta']}), pornirea {V['pornire']} / 115, cu ușa {V['usa']}.
- **Publicat** pe canalul `trasare` (<{CANAL}>, până pe {V['expira']}), amprenta `{V['amprenta']}`, din build-ul curat al
  commit-ului de cod. {V['privit']}
- **Lecții:**
  - O probă de gest pe pânză întâi verifică ce e sub punct: o riglă sau o bară care plutește deasupra face gestul fals.
  - O imagine pusă „sub desen” cere o regulă de alegere: pe linie, forma; înăuntru, imaginea. Altfel conturul trasat al
    chenarului o acoperă întreagă."""),
])
print('gata')
