# ADR 0020 — Senderul: sesiune Web Serial, flux pe octeți, proceduri ca mașini de stare (T20)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T20). **Intră în:** etapa 3; complet în etapa 13.

**Problema.** În ediția întâi:
- o linie de ≥ 128 de caractere bloca fluxul;
- reluarea avea drept oracol propria funcție;
- starea stătea în steaguri cu două înțelesuri (`LECTII.md` §1 și §2.2).

**Decizia.**
- O sesiune Web Serial cu tranzacții (`$#`, `$G`, `$$`), cu fluxul pe numărarea caracterelor.
- Senderul trimite exact octeții exportați și arată hash-ul.
- Bariera `M6`.
- Procedurile (zero, palpare, schimbarea sculei) sunt mașini de stare pure.
- Emulatorul GRBL și transcrierile sunt fixturi.

**Dovada.** Defectele din ediția întâi [citit, `LECTII.md` §1]. Regulile de protocol care trec, cu testele lor, sunt în
`docs/PORTARE.md` §3.4.

**Ce impune.**
- `machine` primește programul ca date (octeți + manifest); nu importă `post` și nici documentul (`PLAN.md` §3.3).
- Liniile de peste 70 de octeți se refuză la încărcare.
- WCS-ul e obligatoriu; nu există `G54` implicit.

**Se redeschide dacă:** la proba din etapa 3, planificatorul GRBL rămâne gol sub încărcare. Atunci senderul se mută
într-un worker.
