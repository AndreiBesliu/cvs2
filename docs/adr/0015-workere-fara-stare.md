# ADR 0015 — Workerele nu țin date între joburi (T15)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T15). **Intră în:** etapa 1 (workerul de randare); bazinul în etapa 4.

**Problema.** Workerele care țin date între joburi cer invalidarea cache-ului și recuperarea după cădere: cod în plus,
cu defectele lui.

**Decizia.** Un bazin fără stare, plus workerul de randare. **Mă abat de la s11 §5.2**, care recomanda date ținute în
workere: costul măsurat e același.

**Dovada.** Același cost la blur și la finisare, cu sau fără date ținute [măsurat, s11 §4.1–4.2].

**Ce am respins:** datele ținute în workere, între joburi.

**Se redeschide dacă:** se întâmplă una dintre două:
- memoria temporară (+64 MB pe operație, la 4 000²) devine o problemă pe un laptop de 8 GB;
- re-simularea se simte (+60–190 ms).

Atunci relieful și simularea primesc fiecare un worker-proprietar. Trecerea e locală, fiindcă nucleele lucrează deja pe
benzi.
