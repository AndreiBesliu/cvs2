"""Cotele unei elice LDraw: axa de rotație, diametrul, butucul (raza, înălțimea), gaura (cruce sau cerc, raza), paletele
(câte, iar la 30, 50, 70 și 90 % din rază: unghiul β față de planul rotației, pasul 2πr·tan β, coarda, întinderea pe axă).
Suprafața e eșantionată uniform (puncte pe triunghiuri, după arie), apoi împărțită pe raze și unghiuri.
Axa de rotație trece prin originea piesei (gaura butucului e modelată acolo), NU prin centrul cutiei: la o elice cu 3 palete,
centrul cutiei cade la un sfert de rază de axă, iar razele măsurate de acolo ies cu ~15 % prea mari (15790: Ø83,3 în loc de
Ø73,9). Unealta arată, ca verificare, raza vârfului fiecărei palete față de axă: trebuie să fie aceeași la toate.
Semnul pantei e sensul elicei (LDraw are un reper drept, cu −Y în sus): +1 = elicoid drept, elicea „pe dreapta” a motorului
(15790, 92842, 4617b); −1 = „pe stânga” (6041, 65768).
Folosire: python -I -B -X utf8 elice_masura.py <dosarul bibliotecii> <piesa> [<piesa> ...]   (piesa fără `.dat`)."""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plat  # noqa: E402

DENS = 40.0  # puncte pe mm²


def esantion(tri, rnd):
    pts = []
    for a, b, c in tri:
        ab = [b[i] - a[i] for i in range(3)]
        ac = [c[i] - a[i] for i in range(3)]
        cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
        arie = 0.5 * math.sqrt(sum(x * x for x in cr))
        n = max(1, int(arie * DENS + rnd.random()))
        for _ in range(n):
            u, v = rnd.random(), rnd.random()
            if u + v > 1:
                u, v = 1 - u, 1 - v
            pts.append(tuple(a[i] + u * ab[i] + v * ac[i] for i in range(3)))
    return pts


def segmente(ocupate, n):
    """Grupurile de unghiuri ocupate (pe cerc), ca liste de indici."""
    if all(ocupate):
        return [list(range(n))]
    start = next(i for i in range(n) if not ocupate[i])
    grupuri, cur = [], []
    for k in range(1, n + 1):
        i = (start + k) % n
        if ocupate[i]:
            cur.append(i)
        elif cur:
            grupuri.append(cur)
            cur = []
    if cur:
        grupuri.append(cur)
    return grupuri


def masoara(dosar, piesa):
    tri = plat.in_mm(plat.triunghiuri(dosar, piesa + '.dat'))
    cut = [(min(p[i] for t in tri for p in t), max(p[i] for t in tri for p in t)) for i in range(3)]
    ext = [hi - lo for lo, hi in cut]
    k = min(range(3), key=lambda i: ext[i])  # axa rotației: întinderea cea mai mică
    o = [(k + 1) % 3, (k + 2) % 3]  # în ordine ciclică: (o0, o1, axa) e un reper drept, ca semnul pantei să fie al elicei
    pts = esantion(tri, random.Random(1))
    P = []
    for p in pts:
        # față de axa prin origine (nu față de centrul cutiei: vezi antetul)
        a, b, h = p[o[0]], p[o[1]], p[k]
        P.append((math.hypot(a, b), math.atan2(b, a), h))
    R = max(q[0] for q in P)
    print(f'== {piesa}: axa {"XYZ"[k]}, prin origine (întinderile X {ext[0]:.2f}, Y {ext[1]:.2f}, Z {ext[2]:.2f}); Ø {2 * R:.2f} mm; '
          f'pe axă {cut[k][0]:.2f} … {cut[k][1]:.2f}')
    NA = 360
    # verificarea axei: raza vârfului fiecărei palete (grupurile de unghiuri ocupate dincolo de 0,8·R) trebuie să fie aceeași
    oc = [False] * NA
    for q in P:
        if q[0] > 0.8 * R:
            oc[int((q[1] + math.pi) / (2 * math.pi) * NA) % NA] = True
    varfuri = []
    for g in segmente(oc, NA):
        unghiuri = set(g)
        varfuri.append(max(q[0] for q in P if q[0] > 0.8 * R and int((q[1] + math.pi) / (2 * math.pi) * NA) % NA in unghiuri))
    print(f'   vârfurile paletelor, față de axă: {", ".join(f"{x:.2f}" for x in varfuri)}'
          + ('' if max(varfuri) - min(varfuri) < 0.1 else '   ATENȚIE: nu sunt la aceeași rază, originea nu e pe axă'))
    # butucul: raza până la care unghiurile sunt aproape toate ocupate (în benzi de 0,25 mm); profilul acoperirii
    rh = 0.0
    r = 0.25
    profil = []
    while r < R:
        oc = [False] * NA
        for q in P:
            if r - 0.25 <= q[0] < r + 0.25:
                oc[int((q[1] + math.pi) / (2 * math.pi) * NA) % NA] = True
        fr = sum(oc) / NA
        profil.append((r, fr))
        if fr >= 0.9 and (rh == 0.0 or r <= rh + 0.5):
            rh = r
        r += 0.25
    print('   acoperirea pe rază: ' + ', '.join(f'{x:.1f}:{int(y * 100)}%' for x, y in profil if abs(x * 2 - round(x * 2)) < 1e-9 and x <= min(R, 12)))
    hub = [q[2] for q in P if q[0] < rh - 0.3]
    print(f'   butucul: r ≈ {rh:.2f} (Ø {2 * rh:.2f}); pe axă {min(hub):.2f} … {max(hub):.2f} ({max(hub) - min(hub):.2f} mm)' if hub else '   butucul: —')
    # gaura: raza cea mai mică pe unghi, în mijlocul butucului
    if hub:
        hm = (min(hub) + max(hub)) / 2
        rmin = [9e9] * 72
        for q in P:
            if abs(q[2] - hm) < 1.0 and q[0] < rh:
                i = int((q[1] + math.pi) / (2 * math.pi) * 72) % 72
                rmin[i] = min(rmin[i], q[0])
        val = [x for x in rmin if x < 9e9]
        if val:
            print(f'   gaura (la mijlocul butucului): r min {min(val):.2f}, r max {max(val):.2f} '
                  f'({"cruce" if max(val) - min(val) > 0.6 else "cerc"})')
    # paletele, la fracțiuni din rază
    for f in (0.3, 0.5, 0.7, 0.9):
        rr = rh + f * (R - rh)
        banda = [q for q in P if abs(q[0] - rr) < 0.3]
        oc = [False] * NA
        for q in banda:
            oc[int((q[1] + math.pi) / (2 * math.pi) * NA) % NA] = True
        gr = segmente(oc, NA)
        rez = []
        for g in gr:
            unghiuri = set(g)
            sec = [q for q in banda if int((q[1] + math.pi) / (2 * math.pi) * NA) % NA in unghiuri]
            if len(sec) < 20:
                continue
            th0 = sec[0][1]
            s = [rr * ((q[1] - th0 + math.pi) % (2 * math.pi) - math.pi) for q in sec]
            h = [q[2] for q in sec]
            ms, mh = sum(s) / len(s), sum(h) / len(h)
            sxx = sum((x - ms) ** 2 for x in s)
            syy = sum((y - mh) ** 2 for y in h)
            sxy = sum((x - ms) * (y - mh) for x, y in zip(s, h))
            # direcția principală a secțiunii (coarda), nu regresia h pe s: ține și la paletele abrupte
            fi = 0.5 * math.atan2(2 * sxy, sxx - syy)
            beta = math.degrees(abs(fi))
            if beta > 90:
                beta = 180 - beta
            # coarda: întinderea de-a lungul direcției principale
            u = [(x - ms) * math.cos(fi) + (y - mh) * math.sin(fi) for x, y in zip(s, h)]
            coarda = max(u) - min(u)
            panta = math.tan(fi)
            rez.append((beta, 2 * math.pi * rr * abs(panta), coarda, min(h), max(h), math.copysign(1, panta)))
        if rez:
            b = sum(x[0] for x in rez) / len(rez)
            pas = sum(x[1] for x in rez) / len(rez)
            c = sum(x[2] for x in rez) / len(rez)
            print(f'   la {int(f * 100)} % (r {rr:.1f}): {len(rez)} palete; β ≈ {b:.1f}°, pasul ≈ {pas:.1f} mm '
                  f'(P/D {pas / (2 * R):.2f}); coarda ≈ {c:.1f}; pe axă {min(x[3] for x in rez):.2f} … {max(x[4] for x in rez):.2f}; '
                  f'semnul pantei {[int(x[5]) for x in rez]}')


if __name__ == '__main__':
    for p in sys.argv[2:]:
        masoara(sys.argv[1], p)
