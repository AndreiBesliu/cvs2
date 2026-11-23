# Setul de lucru al liniei: 11.3↑e („unde ține”)

Adus pe 23.11.2026 din `.tmp`-ul worktree-ului local (ignorat de git), la mutarea lucrului în cloud, ca linia să-l aibă în container. Căile și comenzile pentru Windows din scripturi se adaptează la Linux.

**Dosarul `.lucru/` se scoate înainte de raportul „gata de unit”:** ce trebuie din el intră la locul lui (fișa, ADR-ul, probele), restul se șterge. Sesiunea principală nu unește o ramură care îl mai are.

- `pauza_113e.py`: scriptul documentelor lui 11.3↑e de la pauză.
- `etapa_113e.py`: rândul lui 11.3↑e din fișa etapei.
- `traducere_113e.py`: traducerea rândului (roadmap-ul în engleză).
- `msg-113e-wip.txt`: mesajul commit-ului WIP.
- `msg-113e-1.txt`: mesajul de commit pregătit (1).
- `msg-113e-2.txt`: mesajul de commit pregătit (2).
- `nota-113d.md`: nota lui 11.3↑d (felia de dinainte, unită).
