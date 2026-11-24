# Extensii de probă pentru stările de pornire (ADR 0232, felia 3.Xi-1)

Trei pachete mici, împachetate de probe cu `impacheteaza(<dosar>)`:

- `cade`: aruncă la fiecare pornire (starea „n-a pornit”);
- `sovaie`: aruncă la prima pornire și pornește de la a doua (numără pornirile în stocarea ei), pentru „Încearcă din nou”;
- `incet`: pornirea ei nu se mai termină (starea „pornește greu”).

Un pachet bun cu un fișier schimbat de mână nu ajunge la pornire: îl refuză amprenta SHA-256 de la instalare. De aceea
extensiile stricate sunt împachetate din dosarele lor.
