# Setul de lucru al liniei: A.4 (Sugestii ca tablă)

Adus pe 23.11.2026 din `.tmp`-ul worktree-ului local (ignorat de git), la mutarea lucrului în cloud, ca linia să-l aibă în container. Căile și comenzile pentru Windows din scripturi se adaptează la Linux.

**Dosarul `.lucru/` se scoate înainte de raportul „gata de unit”:** ce trebuie din el intră la locul lui (fișa, ADR-ul, probele), restul se șterge. Sesiunea principală nu unește o ramură care îl mai are.

- `a4-ciorne/fisa_a4.py`: ciorna rândului A.4 din fișa etapei 3 (scriptul care îl scrie).
- `a4-ciorne/adr_a4.md`: ciorna textului A.4 pentru ADR 0260.
- `vizual/vizual.spec.ts`: bancul vizual al tablei (cu `playwright.banc.config.ts`), cu datele lui pe emulatoare.
- `otravuri_emu.py`: otrăvurile pe emulatoare (E12, E19, E27 de reluat: vezi nota liniei).
- `e2e-a4.sh`: lanțul e2e local (Windows): de citit ca listă de pași.
- `banc-a4.sh`: lanțul bancului local (Windows): de citit ca listă de pași.
- `lant-a4.sh`: lanțul porților local (Windows): de citit ca listă de pași.
