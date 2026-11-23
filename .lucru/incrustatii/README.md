# Setul de lucru al liniei: 12.1↑e-3 (pereții drepți)

Adus pe 23.11.2026 din `.tmp`-ul worktree-ului local (ignorat de git), la mutarea lucrului în cloud, ca linia să-l aibă în container. Căile și comenzile pentru Windows din scripturi se adaptează la Linux.

**Dosarul `.lucru/` se scoate înainte de raportul „gata de unit”:** ce trebuie din el intră la locul lui (fișa, ADR-ul, probele), restul se șterge. Sesiunea principală nu unește o ramură care îl mai are.

- `unelte-12.1e-3/porti-lente-drepte.sh`: porțile lente ale feliei (local, Windows).
- `unelte-12.1e-3/e2e-3d-drepte.sh`: e2e-ul 3D al pereților drepți (local, Windows).
- `unelte-12.1e-3/void_noi.py`: VOID-urile noi din otrăvuri, după mutarea codului.
- `unelte-12.1e-3/void_la_rev.py`: VOID-urile la o revizie dată.
- `unelte-12.1e-3/marime_bucati.py`: mărimea pe bucăți a build-ului.
- `privire_drepte.mjs`: privirea pe piesa reală (pereții drepți), cu Edge.
- `privire_canal.mjs`: privirea pe canal.
- `mesaj_unire_88be.txt`: mesajul de commit pregătit (aducerea lui main 88be9d6c).
- `mesaj_docs_sectiune.txt`: mesajul de commit pregătit (documentele secțiunii).
- `mesaj_j02.txt`: mesajul de commit pregătit (J02).
