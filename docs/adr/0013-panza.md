# ADR 0013 — Pânza: vectorii exacți în worker, traseele pe WebGL2 (T13)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T13). **Intră în:** etapa 1 (pânza v0); stratul WebGL2 în etapa 2.

**Problema.** Clicul trebuie să se vadă imediat, chiar în timp ce desenul se reface, și pe placa integrată a unui laptop
de atelier. Pe firul principal, redesenul bloca clicul 456–552 ms.

**Decizia.**
- Vectorii exacți se rasterizează **într-un worker**, pe pânză software, și se predau ca ImageBitmap.
- Traseele merg implicit ca LINE_STRIP; segmentele instanțiate se folosesc doar sub un buget măsurat la pornire.
- Linia unui vector are 1 pixel fizic.
- Zoomul maxim e 1 000 px/mm.
- Intrarea vine prin Pointer Events.

**Dovada** [măsurat, s6-V §4.2 și §4.4]:
- clicul se vede în 24 ms în timpul redesenului, pe RTX și pe iGPU;
- 5 M de segmente ca LINE_STRIP țin 60 Hz pe iGPU.

**Ce am respins:**
- PixiJS, CanvasKit și Three.js pentru desen. PixiJS greșea cercul cu 29 px la 1 000 px/mm (`PLAN.md` §3.6).
- Planul B, vectorii pe WebGL, rămâne rezervă. Verificarea a arătat că problema era locul rasterului, nu desenul.

**Se redeschide dacă:** se întâmplă una dintre două:
- pe un laptop de atelier (măsurat în etapele 4, 18 și 29), imaginea exactă la 50 k forme trece de ~1 s;
- owner-ul respinge imaginea neclară din timpul gestului.

Atunci se trece la planul B.
