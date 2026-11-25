# Lista de otrăvuri a feliei 16.A↑b-7 (Escape în „Frezele mele”, oriunde ar fi focusul; ADR 0300 §3), aleasă de autor: unde se
# ascultă tasta (pe pagină, pe urcare, cu `defaultPrevented`) și stratul pe care îl închide (cel care se vede, nu o stare rămasă
# în urmă). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


F = 'src/app/FrezeleMele.tsx'

o('K01', F, "    document.addEventListener('keydown', asculta);", "    refCorp.current?.addEventListener('keydown', asculta);", 'e2e',
  'Escape ascultat doar în fereastră: se pierde când focusul cade pe pagină')
o('K02', F, "    document.addEventListener('keydown', asculta);", "    document.addEventListener('keydown', asculta, true);", 'e2e',
  'Escape prins la coborâre: fereastra se închide în locul manualului deschis peste ea (F1)')
o('K03', F, "    if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;", "    if (e.key !== 'Escape') return;", 'e2e',
  'Escape oprit de alt strat (manualul) închide și fereastra')
o('K04', F, "    if (redenumit && vede('[data-freze=\"grup-nume-nou\"]')) renuntaRedenumire();", '    if (redenumit) renuntaRedenumire();', 'e2e',
  'redenumirea unui grup deja redenumit oprește Escape')
o('K05', F, "    else if (grupNou !== null && vede('[data-freze=\"grup-nou\"]')) setGrupNou(null);", '    else if (grupNou !== null) setGrupNou(null);',
  'e2e', '„Grup nou…” al unei freze șterse între timp oprește Escape')
o('K06', F, "    else if (stergere && vede('[data-freze=\"sterge-da\"]')) setStergere(false);", '    else if (stergere) setStergere(false);', 'e2e',
  'întrebarea unei freze șterse între timp oprește Escape')
# K03 e practic echivalentă azi: niciun strat de deasupra nu oprește Escape fără să-l și țină (manualul îl ține, paleta nu se
# deschide peste fereastră); verificarea rămâne, ca la fereastra exportului. Fără doar una dintre `preventDefault` și
# `stopPropagation`, scurtăturile desenului tot nu văd tasta (desenul sare peste una oprită); K07 le scoate pe amândouă.
o('K07', F, '    e.preventDefault();\n    e.stopPropagation();\n    // Escape închide stratul', '    // Escape închide stratul', 'e2e',
  'Escape ajunge și la desenul de sub fereastră (unealta se întoarce la selecție)')

E2E = ['test/e2e/freze.spec.ts']
