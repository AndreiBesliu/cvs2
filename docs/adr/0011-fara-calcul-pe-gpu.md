# ADR 0011 — Fără calcul pe GPU în v1 (T11)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T11). **Intră în:** etapa 4.

**Problema.** Calculul pe placa video ar fi rapid, dar dă alte rezultate decât procesorul și nu poate rula în CI.

**Decizia.** În v1 nu se calculează nimic pe GPU. Placa video doar desenează.

**Dovada.**
- Finisarea a 2,67 M de puncte durează 2,2 s pe 16 workere [măsurat, s5].
- GPU-ul diferă de CPU cu până la 0,18 µm, iar CI-ul n-are GPU [măsurat, s4].

**Ce am respins:** WebGPU compute (`PLAN.md` §3.6).

**Se redeschide dacă:** un job obișnuit durează peste 10 s pe calculatorul owner-ului, măsurat. Atunci GPU-ul intră în
v1.x, ca accelerator al acelorași nuclee, cu probă față de CPU.
