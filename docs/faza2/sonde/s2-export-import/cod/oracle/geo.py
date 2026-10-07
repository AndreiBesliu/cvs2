# geo.py - geometrie INDEPENDENTA (Python, scrisa separat de modelul JS) pentru oracol.
import numpy as np
from math import atan, atan2, cos, sin, pi, tan, hypot

TAU = 2 * pi

class Curve:
    """Curba parametrica pe [0,1]: f(t) -> (x,y) vectorizat pe numpy."""
    def __init__(self, f, kind, meta=None):
        self.f, self.kind, self.meta = f, kind, meta or {}
    def pts(self, n):
        t = np.linspace(0.0, 1.0, n)
        return self.f(t)

def line_curve(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    return Curve(lambda t: a[None, :] + (b - a)[None, :] * np.asarray(t)[:, None], "line", {"a": a, "b": b})

def arc_curve(c, r, a0, da):
    c = np.asarray(c, float)
    def f(t):
        ang = a0 + da * np.asarray(t)
        return np.stack([c[0] + r * np.cos(ang), c[1] + r * np.sin(ang)], axis=1)
    return Curve(f, "arc", {"c": c, "r": r, "a0": a0, "da": da})

def ellipse_curve(c, major, ratio, t0, t1):
    c, M = np.asarray(c, float), np.asarray(major, float)
    m = ratio * np.array([-M[1], M[0]])
    def f(t):
        tt = t0 + (t1 - t0) * np.asarray(t)
        return c[None, :] + np.cos(tt)[:, None] * M[None, :] + np.sin(tt)[:, None] * m[None, :]
    return Curve(f, "ellipse")

def bezier_curve(P):
    P = np.asarray(P, float)
    n = len(P) - 1
    from math import comb
    def f(t):
        t = np.asarray(t)[:, None]
        out = 0
        for i, p in enumerate(P):
            out = out + comb(n, i) * (1 - t) ** (n - i) * t ** i * p[None, :]
        return out
    return Curve(f, "bezier", {"P": P})

def bulge_segments(verts, closed):
    """verts: [(x, y, bulge)] -> lista de Curve (linii si arce). Formula bulge -> arc, implementata aici."""
    out = []
    n = len(verts)
    m = n if closed else n - 1
    for i in range(m):
        x0, y0, b = verts[i]
        x1, y1, _ = verts[(i + 1) % n]
        if abs(b) < 1e-15:
            out.append(line_curve((x0, y0), (x1, y1)))
            continue
        theta = 4 * atan(b)                      # baleiaj semnat
        chord = hypot(x1 - x0, y1 - y0)
        r = chord / (2 * abs(sin(theta / 2)))
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        # distanta de la mijlocul coardei la centru, pe normala la stanga (pentru b > 0)
        d = r * cos(theta / 2)
        ux, uy = (x1 - x0) / chord, (y1 - y0) / chord
        nx, ny = -uy, ux
        s = 1 if b > 0 else -1
        # pentru |theta| > pi centrul trece de partea cealalta: d devine negativ prin cos
        cx, cy = mx + s * nx * d, my + s * ny * d
        a0 = atan2(y0 - cy, x0 - cx)
        out.append(arc_curve((cx, cy), r, a0, theta))
    return out

def poly_bulge_area(verts):
    """Aria semnata a unei polilinii INCHISE cu bulge: shoelace + segmentele de cerc."""
    A = 0.0
    n = len(verts)
    for i in range(n):
        x0, y0, b = verts[i]
        x1, y1, _ = verts[(i + 1) % n]
        A += 0.5 * (x0 * y1 - x1 * y0)
        if abs(b) > 1e-15:
            theta = 4 * atan(b)
            chord = hypot(x1 - x0, y1 - y0)
            r = chord / (2 * abs(sin(theta / 2)))
            A += 0.5 * r * r * (abs(theta) - sin(abs(theta))) * (1 if b > 0 else -1)
    return A

def bbox_of(curves, n=4001):
    """Caseta prin esantionare densa + rafinare locala (cautare ternara) a extremelor."""
    lo = np.array([np.inf, np.inf]); hi = -lo
    for c in curves:
        t = np.linspace(0, 1, n)
        P = c.f(t)
        for ax in (0, 1):
            for sign in (1, -1):
                i = int(np.argmax(sign * P[:, ax]))
                a, b = t[max(i - 1, 0)], t[min(i + 1, n - 1)]
                for _ in range(48):
                    m1, m2 = a + (b - a) / 3, b - (b - a) / 3
                    v1 = sign * c.f(np.array([m1]))[0, ax]; v2 = sign * c.f(np.array([m2]))[0, ax]
                    if v1 < v2: a = m1
                    else: b = m2
                v = c.f(np.array([(a + b) / 2]))[0, ax]
                v = max(v, P[i, ax]) if sign > 0 else min(v, P[i, ax])
                if sign > 0: hi[ax] = max(hi[ax], v)
                else: lo[ax] = min(lo[ax], v)
    return (lo[0], lo[1], hi[0], hi[1])

def max_dist_points_to_curves(points, curves, dense=4000):
    """Distanta maxima de la puncte la cea mai apropiata curba (esantionare densa + rafinare Newton-free:
    cautare ternara locala pe parametru). Intoarce (max, medie)."""
    points_all = np.asarray(points, float)
    best_all = np.full(len(points_all), np.inf)
    for c in curves:
        t = np.linspace(0, 1, dense)
        P = c.f(t)
        # pre-filtru: doar punctele din caseta curbei, largita cu 2 mm (restul nu pot avea aici distanta minima
        # mai mica decat cea deja gasita, pentru abaterile mici pe care le masuram)
        lo = P.min(axis=0) - 2.0; hi = P.max(axis=0) + 2.0
        sel = np.where(((points_all >= lo) & (points_all <= hi)).all(axis=1))[0]
        if len(sel) == 0: continue
        points = points_all[sel]; best = best_all[sel]
        # cel mai apropiat esantion pentru fiecare punct (pe bucati, ca sa nu explodeze memoria)
        idx = np.empty(len(points), int); dmin = np.empty(len(points))
        for k in range(0, len(points), 512):
            q = points[k:k + 512]
            D = ((q[:, None, :] - P[None, :, :]) ** 2).sum(axis=2)
            j = D.argmin(axis=1); idx[k:k + 512] = j; dmin[k:k + 512] = np.sqrt(D[np.arange(len(q)), j])
        cand = dmin < best + 1e-3
        a = t[np.maximum(idx - 1, 0)]; b = t[np.minimum(idx + 1, dense - 1)]
        for _ in range(60):
            m1 = a + (b - a) / 3; m2 = b - (b - a) / 3
            d1 = ((c.f(m1) - points) ** 2).sum(axis=1); d2 = ((c.f(m2) - points) ** 2).sum(axis=1)
            left = d1 < d2
            b = np.where(left, m2, b); a = np.where(left, a, m1)
        d = np.sqrt(((c.f((a + b) / 2) - points) ** 2).sum(axis=1))
        d = np.minimum(d, dmin)
        best_all[sel] = np.where(cand, np.minimum(best, d), best)
    return float(best_all.max()), float(best_all.mean())
