# ADR 0016 — Datele: valibot, JSON canonic, migrări pure, undo ca jurnal (T16)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T16). **Intră în:** etapa 1 (documentul v0).

**Problema.** Documentul trebuie validat la fiecare ușă, păstrat între versiuni și anulat pas cu pas, fără copii complete
și sub un CSP strict.

**Decizia.**
- **valibot:** o declarație dă tipul și validatorul, cu limite; câmpurile necunoscute se păstrează; fără `eval`.
- JSON canonic.
- Migrări pure vN → vN+1.
- Undo-ul e un jurnal de comenzi, cu valorile vechi și cele noi.

**Dovada** [măsurat, s7]:
- 10 / 10 defecte prinse la calea exactă;
- 318 ms sub CSP strict; 3,3 KB gzip;
- o comandă de undo ocupă ~190 B, față de 96 MB pentru o copie completă.

**Ce am respins:** OPFS și workerul de persistență. IndexedDB ajunge, iar `move()` din OPFS e neprobat la cădere
(`PLAN.md` §3.6).

**Ce impune:** o singură ușă de încărcare, cu schema versionată. Migrările au corpus de aur din etapa 4, de când există
date pe live.

**Se redeschide dacă:** — pentru valibot (planul nu dă o condiție). OPFS revine doar dacă resursele trec de ~500 MB sau
o salvare trece de 1 s, măsurat pe fișierele owner-ului.
