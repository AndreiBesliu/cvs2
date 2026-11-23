# Setul de lucru al liniei: 25.8↑a (imaginile pe foaie, ADR 0272)

Adus pe 23.11.2026 din `.tmp`-ul worktree-ului local (ignorat de git), la mutarea lucrului în cloud, ca linia să-l aibă în container. Căile și comenzile pentru Windows din scripturi se adaptează la Linux.

**Dosarul `.lucru/` se scoate înainte de raportul „gata de unit”:** ce trebuie din el intră la locul lui (fișa, ADR-ul, probele), restul se șterge. Sesiunea principală nu unește o ramură care îl mai are.

- `documente-0272b.py`: scriptul documentelor lui 25.8↑a (partea b).
- `documente-0272c.py`: scriptul documentelor lui 25.8↑a (partea c).
- `valori-0272.json`: valorile măsurate pe care le scriu documentele.
- `pw.canal-captura.config.ts`: configurația capturii de pe canal.
- `captura/imagini-panou.spec.ts`: captura panoului imaginilor.
