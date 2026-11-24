# Lista de otrăvuri a feliei 28.8↑g (fereastra exportului se închide la Esc și la un clic în afara ei, ADR 0290), 24.11.2026,
# alese de autor: Esc fără efect, Esc care închide fereastra ascunsă (urechile alese pe desen) sau peste un Esc luat de altcineva,
# clicul afară fără efect, tragerile dintre fereastră și fundal socotite clicuri afară.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; toate „e2e” (cer build-ul).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DLG = 'src/ui/DialogExport.tsx'

o('E01', DLG, "if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;",
  "if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || e.key === 'Escape') return;", 'e2e', 'Esc nu închide fereastra')
o('E02', DLG, "      if (!r || !r.checkVisibility()) return;\n", "      if (!r) return;\n", 'e2e',
  'Esc închide și fereastra ascunsă (cât pui urechile pe desen)')
o('E03', DLG, "if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;", "if (e.key !== 'Escape' || e.isComposing) return;",
  'e2e', 'Esc închide fereastra și când și l-a luat altcineva (modul urechilor)')
o('E04', DLG, "        if (afara) onInchide();\n", "        if (afara) void 0;\n", 'e2e', 'clicul afară nu închide fereastra')
o('E05', DLG, "const afara = apasatAfara.current && ridicatAfara.current && e.target === e.currentTarget;",
  "const afara = ridicatAfara.current && e.target === e.currentTarget;", 'e2e', 'o tragere din fereastră lăsată afară o închide')
o('E06', DLG, "const afara = apasatAfara.current && ridicatAfara.current && e.target === e.currentTarget;",
  "const afara = apasatAfara.current && e.target === e.currentTarget;", 'e2e', 'o tragere de afară lăsată în fereastră o închide')
o('E07', DLG, "onPointerDown={(e) => { apasatAfara.current = e.target === e.currentTarget; }}", "onPointerDown={() => { apasatAfara.current = true; }}",
  'e2e', 'orice apăsare socotită afară')

SETURI = {}
E2E = ['test/e2e/export.fisa.spec.ts']
