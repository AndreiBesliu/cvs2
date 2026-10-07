# check_export.py - ORACOLUL de export: reciteste fisierele scrise de JS cu cititori care nu au cod comun
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
# cu scriitorul (ezdxf, svgelements, PyMuPDF; EPS prin Ghostscript-WASM -> PDF -> PyMuPDF) si compara cu
# valorile pe hartie din paper.py. Glifele se compara cu conturul citit de fontTools din acelasi .ttf.
import json, sys, os, subprocess
from math import pi, radians, degrees, atan2, hypot, sqrt, cos, sin, tan
import numpy as np
import ezdxf
from ezdxf import recover
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from paper import REF, CORPUS
from geo import (line_curve, arc_curve, ellipse_curve, bezier_curve, bulge_segments, poly_bulge_area, bbox_of,
                 max_dist_points_to_curves)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
FONT = os.path.join(HERE, "..", "node_modules", "pdfjs-dist", "standard_fonts", "LiberationSans-Regular.ttf")
K = 72 / 25.4
TOL = 0.001
results = []

def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": detail})

def close(a, b, eps):
    return abs(a - b) <= eps

def bbox_close(b1, b2, eps):
    return all(abs(x - y) <= eps for x, y in zip(b1, b2))

def fmtb(b):
    return "[" + ", ".join(f"{v:.6f}" for v in b) + "]"

# ---------------------------------------------------------------- glifele din fontTools (independent)
class SegPen(BasePen):
    def __init__(self, gs):
        super().__init__(gs); self.contours = []; self.cur = None; self.start = None; self.pos = None
    def _moveTo(self, p):
        self.cur = []; self.contours.append(self.cur); self.start = p; self.pos = p
    def _lineTo(self, p):
        self.cur.append(("L", self.pos, p)); self.pos = p
    def _curveToOne(self, p1, p2, p3):
        self.cur.append(("C", self.pos, p1, p2, p3)); self.pos = p3
    def _qCurveToOne(self, p1, p2):
        self.cur.append(("Q", self.pos, p1, p2)); self.pos = p2
    def _closePath(self):
        if self.pos != self.start: self.cur.append(("L", self.pos, self.start))
        self.pos = self.start

def font_text_truth():
    f = TTFont(FONT)
    upem = f["head"].unitsPerEm
    cap = f["OS/2"].sCapHeight
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f["hmtx"]
    s = REF["text"]["cap_mm"] / cap          # mm pe unitate de font
    x = REF["text"]["x0"]; y0 = REF["text"]["baseline"]
    glyphs = []
    for ch in REF["text"]["string"]:
        gn = cmap[ord(ch)]
        pen = SegPen(gs); gs[gn].draw(pen)
        curves = []
        for cont in pen.contours:
            for seg in cont:
                pts = [(x + px * s, y0 + py * s) for (px, py) in seg[1:]]
                curves.append(line_curve(*pts) if seg[0] == "L" else bezier_curve(pts))
        if curves:
            glyphs.append({"ch": ch, "curves": curves, "bbox": bbox_of(curves, 801)})
        x += hmtx[gn][0] * s
    return {"upem": upem, "cap": cap, "glyphs": glyphs, "em_mm": REF["text"]["cap_mm"] * upem / cap}

TRUTH = font_text_truth()
GN = [g for g in TRUTH["glyphs"] if g["ch"] == "N"][0]

# ---------------------------------------------------------------- DXF
def dxf_entities_to_curves(e):
    t = e.dxftype()
    if t == "LINE":
        return [line_curve(e.dxf.start[:2], e.dxf.end[:2])]
    if t == "CIRCLE":
        return [arc_curve(e.dxf.center[:2], e.dxf.radius, 0, 2 * pi)]
    if t == "ARC":
        a0, a1 = radians(e.dxf.start_angle), radians(e.dxf.end_angle)
        da = (a1 - a0) % (2 * pi) or 2 * pi
        return [arc_curve(e.dxf.center[:2], e.dxf.radius, a0, da)]
    if t == "ELLIPSE":
        t0, t1 = e.dxf.start_param, e.dxf.end_param
        if t1 <= t0: t1 += 2 * pi
        return [ellipse_curve(e.dxf.center[:2], e.dxf.major_axis[:2], e.dxf.ratio, t0, t1)]
    if t == "LWPOLYLINE":
        verts = [(p[0], p[1], p[4]) for p in e.get_points("xyseb")]
        return bulge_segments(verts, e.closed)
    if t == "POLYLINE":
        verts = [(v.dxf.location[0], v.dxf.location[1], v.dxf.bulge) for v in e.vertices]
        return bulge_segments(verts, e.is_closed)
    if t == "SPLINE":
        bs = e.construction_tool()          # implementarea NURBS a lui ezdxf, nu a noastra
        if not bs.is_rational:
            # descompunerea in Bezier facuta de ezdxf (nu de noi), evaluata vectorizat
            return [bezier_curve([tuple(p)[:2] for p in seg]) for seg in bs.bezier_decomposition()]
        k = bs.knots(); deg = bs.degree
        u0, u1 = k[deg], k[len(k) - deg - 1]
        def f(tt, bs=bs, u0=u0, u1=u1):
            return np.array([list(bs.point(u0 + (u1 - u0) * float(x)))[:2] for x in np.atleast_1d(tt)])
        from geo import Curve
        return [Curve(f, "spline", {"bs": bs})]
    raise ValueError(t)

def poly_verts(e):
    if e.dxftype() == "LWPOLYLINE":
        return [(p[0], p[1], p[4]) for p in e.get_points("xyseb")]
    return [(v.dxf.location[0], v.dxf.location[1], v.dxf.bulge) for v in e.vertices]

def load_dxf(path):
    doc, aud = recover.readfile(path)
    a2 = doc.audit()
    return doc, {"recover_errors": len(aud.errors), "recover_fixes": len(aud.fixes), "audit_errors": len(a2.errors),
                 "audit_fixes": len(a2.fixes), "msgs": [str(m.message) for m in (aud.errors + aud.fixes + a2.errors + a2.fixes)][:6],
                 "version": doc.dxfversion, "insunits": doc.header.get("$INSUNITS"), "measurement": doc.header.get("$MEASUREMENT")}

def find(ents, pred):
    return [e for e in ents if pred(e)]

def check_dxf_reference(path, flavour):
    tag = f"ref {flavour}"
    doc, info = load_dxf(path)
    check(f"{tag}: ezdxf recover+audit fara erori", info["recover_errors"] + info["audit_errors"] == 0, json.dumps(info))
    msp = list(doc.modelspace())
    layers = {l.dxf.name for l in doc.layers}
    check(f"{tag}: straturile DECUPARE si GRAVARE exista", REF["layers"] <= layers, str(sorted(layers)))
    check(f"{tag}: nicio entitate pe stratul 0", all(e.dxf.layer != "0" for e in msp), str(sorted({e.dxf.layer for e in msp})))
    types = {}
    for e in msp: types[e.dxftype()] = types.get(e.dxftype(), 0) + 1
    # cercul
    circ = find(msp, lambda e: e.dxftype() == "CIRCLE" and hypot(e.dxf.center[0] - 70, e.dxf.center[1] - 227) < 1e-6)
    c = REF["circle"]
    check(f"{tag}: cercul e CIRCLE, centru (70,227), R 50 exact", len(circ) == 1 and close(circ[0].dxf.radius, c["r"], 1e-9) and circ[0].dxf.layer == "DECUPARE",
          f"{len(circ)} gasite; R={circ[0].dxf.radius if circ else None}")
    # dreptunghiul rotunjit: o singura polilinie inchisa cu 8 varfuri, 4 bulge = tan(22,5)
    rr = REF["rrect"]
    polys = find(msp, lambda e: e.dxftype() in ("LWPOLYLINE", "POLYLINE") and len(poly_verts(e)) == 8 and abs(abs(poly_bulge_area(poly_verts(e))) - rr["area"]) < 1)
    ok = len(polys) == 1
    if ok:
        v = poly_verts(polys[0]); A = abs(poly_bulge_area(v)); bb = bbox_of(dxf_entities_to_curves(polys[0]))
        bul = sorted(abs(x[2]) for x in v)
        closed = polys[0].closed if polys[0].dxftype() == "LWPOLYLINE" else polys[0].is_closed
        check(f"{tag}: dreptunghi rotunjit = 1 polilinie inchisa, 8 varfuri, 4 arce (bulge tan 22,5)",
              closed and all(close(b, rr["bulge"], 1e-9) for b in bul[4:]) and all(b < 1e-12 for b in bul[:4]), f"bulge={bul}")
        check(f"{tag}: dreptunghi rotunjit aria = {rr['area']:.6f}", close(A, rr["area"], 1e-6), f"{A:.9f}")
        check(f"{tag}: dreptunghi rotunjit caseta = {fmtb(rr['bbox'])}", bbox_close(bb, rr["bbox"], 1e-6), fmtb(bb))
        segs = dxf_entities_to_curves(polys[0])
        cs = sorted([tuple(np.round(s.meta['c'], 6)) for s in segs if s.kind == 'arc'])
        exp = sorted([tuple(np.round(p, 6)) for p in rr["arc_centers"]])
        check(f"{tag}: centrele celor 4 colturi rotunjite (rotite 30 grade)", cs == exp, f"{cs}")
    else:
        check(f"{tag}: dreptunghi rotunjit = 1 polilinie inchisa", False, f"{len(polys)} gasite")
    # elipsa
    el = REF["ellipse"]
    if flavour == "R2007":
        E = find(msp, lambda e: e.dxftype() == "ELLIPSE")
        ok = len(E) == 1
        if ok:
            e = E[0]; M = e.dxf.major_axis
            full = close((e.dxf.end_param - e.dxf.start_param) % (2 * pi) or 2 * pi, 2 * pi, 1e-9) or close(e.dxf.end_param - e.dxf.start_param, 2 * pi, 1e-9)
            check(f"{tag}: elipsa e ELLIPSE: centru (75,95), semiaxa 60 la 20 grade, raport 0,5, completa",
                  close(e.dxf.center[0], 75, 1e-9) and close(e.dxf.center[1], 95, 1e-9) and close(hypot(M[0], M[1]), 60, 1e-9)
                  and close(degrees(atan2(M[1], M[0])), 20, 1e-9) and close(e.dxf.ratio, 0.5, 1e-12) and full,
                  f"c={tuple(e.dxf.center)[:2]} M={tuple(M)[:2]} r={e.dxf.ratio} p=({e.dxf.start_param},{e.dxf.end_param})")
        else:
            check(f"{tag}: elipsa e ELLIPSE", False, f"{len(E)}")
    # curba S
    sc = REF["scurve"]
    if flavour == "R2007":
        S = find(msp, lambda e: e.dxftype() == "SPLINE" and len(e.control_points) == 4)
        ok = len(S) == 1
        if ok:
            s = S[0]; cp = [tuple(p)[:2] for p in s.control_points]
            bs = s.construction_tool(); p03 = tuple(bs.point(0.3))[:2]
            cv = dxf_entities_to_curves(s); bb = bbox_of(cv)
            check(f"{tag}: curba S = SPLINE grad 3 cu exact cele 4 puncte de control, nerationala",
                  s.dxf.degree == 3 and all(hypot(a[0] - b[0], a[1] - b[1]) < 1e-9 for a, b in zip(cp, sc["P"])) and not s.weights, str(cp))
            check(f"{tag}: curba S trece prin B(0,3) = (205; 75,12)", hypot(p03[0] - 205, p03[1] - 75.12) < 1e-9, str(p03))
            check(f"{tag}: curba S caseta = {fmtb(sc['bbox'])} (y = 60 +/- 10*sqrt(3))", bbox_close(bb, sc["bbox"], 1e-6), fmtb(bb))
        else:
            check(f"{tag}: curba S = SPLINE cu 4 puncte de control", False, f"{len(S)}")
    else:
        # R12: elipsa si curba S sunt POLYLINE cu arce; abaterea maxima fata de curba ADEVARATA (formula pe hartie)
        er = radians(el["rot_deg"])
        Etrue = ellipse_curve(el["c"], (el["a"] * cos(er), el["a"] * sin(er)), el["b"] / el["a"], 0, 2 * pi)
        Strue = bezier_curve(sc["P"])
        for nm, truth, bbx in (("elipsa", Etrue, el["bbox"]), ("curba S", Strue, sc["bbox"])):
            cand = [e for e in msp if e.dxftype() == "POLYLINE" and bbox_close(bbox_of(dxf_entities_to_curves(e), 401), bbx, 0.05)]
            if len(cand) != 1:
                check(f"{tag}: {nm} gasita ca 1 POLYLINE", False, f"{len(cand)}"); continue
            segs = dxf_entities_to_curves(cand[0])
            pts = np.vstack([s.pts(41) for s in segs])
            dmax, dmean = max_dist_points_to_curves(pts, [truth])
            # si invers: curba adevarata -> arcele exportate
            dmax2, _ = max_dist_points_to_curves(truth.pts(4001), segs)
            narcs = sum(1 for s in segs if s.kind == "arc")
            check(f"{tag}: {nm} aproximata prin {narcs} arce, abatere <= {TOL} mm (ambele sensuri)", max(dmax, dmax2) <= TOL * 1.0001,
                  f"abatere arce->curba {dmax:.6f} mm, curba->arce {dmax2:.6f} mm")
    # textul: glifa N are inaltimea 20 mm exact; toate glifele se potrivesc cu fontTools
    gl = [e for e in msp if e.dxf.layer == "GRAVARE" and e.dxftype() in ("SPLINE", "LWPOLYLINE", "POLYLINE")
          and bbox_of(dxf_entities_to_curves(e), 101)[1] < 40]   # curba S sta deasupra lui y = 42
    boxes = [(e, bbox_of(dxf_entities_to_curves(e), 801)) for e in gl]
    if not boxes:
        check(f"{tag}: textul gasit pe stratul GRAVARE", False, "nicio entitate de text pe GRAVARE"); return types
    tb = (min(b[0] for _, b in boxes), min(b[1] for _, b in boxes), max(b[2] for _, b in boxes), max(b[3] for _, b in boxes))
    tt = (min(g["bbox"][0] for g in TRUTH["glyphs"]), min(g["bbox"][1] for g in TRUTH["glyphs"]),
          max(g["bbox"][2] for g in TRUTH["glyphs"]), max(g["bbox"][3] for g in TRUTH["glyphs"]))
    nb = [b for _, b in boxes if bbox_close(b, GN["bbox"], 0.01)]
    check(f"{tag}: textul are {len(gl)} contururi (fontTools: 8)", len(gl) == 8, str(types))
    check(f"{tag}: glifa N: inaltime 20,000 mm (majuscula = 20 mm), de la y=15 la y=35",
          len(nb) == 1 and close(nb[0][3] - nb[0][1], 20.0, 2e-6) and close(nb[0][1], 15.0, 2e-6),
          f"{fmtb(nb[0]) if nb else 'negasita'}; adevar fontTools {fmtb(GN['bbox'])}")
    check(f"{tag}: caseta textului = caseta din fontTools (+/- {TOL if flavour=='R12' else 1e-6})",
          bbox_close(tb, tt, TOL if flavour == "R12" else 2e-6), f"{fmtb(tb)} vs {fmtb(tt)}")
    if flavour == "R12":
        allpts = np.vstack([np.vstack([s.pts(21) for s in dxf_entities_to_curves(e)]) for e in gl])
        dmax, dmean = max_dist_points_to_curves(allpts, [c for g in TRUTH["glyphs"] for c in g["curves"]], dense=600)
        check(f"{tag}: glifele (arce) fata de conturul fontTools: abatere <= {TOL} mm", dmax <= TOL * 1.0001, f"max {dmax:.6f} mm, medie {dmean:.6f} mm")
    return types

def check_dxf_corpus(path, flavour):
    tag = f"corpus {flavour}"
    doc, info = load_dxf(path)
    check(f"{tag}: ezdxf recover+audit fara erori", info["recover_errors"] + info["audit_errors"] == 0, json.dumps(info))
    msp = list(doc.modelspace())
    circles = [e for e in msp if e.dxftype() == "CIRCLE"]
    for (cx, cy), r in CORPUS["circles"]:
        m = [e for e in circles if hypot(e.dxf.center[0] - cx, e.dxf.center[1] - cy) < 1e-9 and abs(e.dxf.radius - r) < 1e-12]
        check(f"{tag}: CIRCLE R{r} la ({cx},{cy}) exact (inclusiv R0,01 si R600)", len(m) == 1, f"{len(m)}")
    arcs = [e for e in msp if e.dxftype() == "ARC"]
    for (cx, cy), r, a0, a1 in CORPUS["arcs"]:
        m = [e for e in arcs if hypot(e.dxf.center[0] - cx, e.dxf.center[1] - cy) < 1e-9 and abs(e.dxf.radius - r) < 1e-12
             and abs(e.dxf.start_angle - a0) < 1e-7 and abs(e.dxf.end_angle - a1) < 1e-7]
        check(f"{tag}: ARC R{r} {a0}->{a1} grade (sens si capete corecte)", len(m) == 1,
              f"{len(m)}; arce cu R{r}: " + str([(round(e.dxf.start_angle, 6), round(e.dxf.end_angle, 6)) for e in arcs if abs(e.dxf.radius - r) < 1e-9]))
    lines = [e for e in msp if e.dxftype() == "LINE"]
    board = [e for e in msp if e.dxftype() in ("LWPOLYLINE", "POLYLINE") and len(poly_verts(e)) == 4 and close(abs(poly_bulge_area(poly_verts(e))), 2440 * 1220, 1e-6)]
    check(f"{tag}: placa 2440 x 1220 = 1 polilinie inchisa, aria 2 976 800 mm2 exact", len(board) == 1, str(len(board)))
    for a, b in CORPUS["lines"]:
        m = [e for e in lines if hypot(e.dxf.start[0] - a[0], e.dxf.start[1] - a[1]) < 1e-12 and hypot(e.dxf.end[0] - b[0], e.dxf.end[1] - b[1]) < 1e-12]
        check(f"{tag}: LINE {a}->{b} exacta", len(m) >= 1, f"{len(m)}")
    check(f"{tag}: liniile suprapuse raman doua (exportul nu deduplica)", sum(1 for e in lines if abs(e.dxf.start[1] - 100) < 1e-9 and abs(e.dxf.start[0] - 1000) < 1e-9) == 2, "")
    # patratul cu gaura: polilinie + cerc; aria = 10000 - 900 pi
    sq = [e for e in msp if e.dxftype() in ("LWPOLYLINE", "POLYLINE") and len(poly_verts(e)) == 4 and abs(abs(poly_bulge_area(poly_verts(e))) - 10000) < 1e-6]
    hole = [e for e in circles if abs(e.dxf.radius - 30) < 1e-12]
    if sq and hole:
        A = abs(poly_bulge_area(poly_verts(sq[0]))) - pi * hole[0].dxf.radius ** 2
        check(f"{tag}: patrat cu gaura: aria = {CORPUS['square_hole_area']:.6f}", close(A, CORPUS["square_hole_area"], 1e-9), f"{A:.9f}")
    else:
        check(f"{tag}: patrat cu gaura gasit", False, f"{len(sq)} {len(hole)}")
    el = CORPUS["ellipse"]
    if flavour == "R2007":
        E = [e for e in msp if e.dxftype() == "ELLIPSE"]
        ok = len(E) == 1
        if ok:
            e = E[0]; M = e.dxf.major_axis
            ok = (close(e.dxf.center[0], 1800, 1e-9) and close(e.dxf.center[1], 300, 1e-9) and close(hypot(M[0], M[1]), 75, 1e-9)
                  and close(degrees(atan2(M[1], M[0])) % 180, 30, 1e-7) and close(e.dxf.ratio, 50 / 75, 1e-12))
        check(f"{tag}: cercul scalat neuniform (1,5;1) si rotit 30 = ELLIPSE 75x50 la 30 grade (nu cerc!)", ok,
              f"{[(tuple(x.dxf.center)[:2], tuple(x.dxf.major_axis)[:2], x.dxf.ratio) for x in E]}")
    else:
        er = radians(el["rot_deg"])
        truth = ellipse_curve(el["c"], (el["a"] * cos(er), el["a"] * sin(er)), el["b"] / el["a"], 0, 2 * pi)
        cand = [e for e in msp if e.dxftype() == "POLYLINE" and abs(bbox_of(dxf_entities_to_curves(e), 201)[0] - 1800) < 120 and abs(bbox_of(dxf_entities_to_curves(e), 201)[1] - 300) < 120]
        if len(cand) == 1:
            segs = dxf_entities_to_curves(cand[0]); pts = np.vstack([s.pts(41) for s in segs])
            d1, _ = max_dist_points_to_curves(pts, [truth]); d2, _ = max_dist_points_to_curves(truth.pts(4001), segs)
            check(f"{tag}: elipsa scalata neuniform: {len(segs)} arce, abatere <= {TOL} mm", max(d1, d2) <= TOL * 1.0001, f"{d1:.6f} / {d2:.6f}")
        else:
            check(f"{tag}: elipsa scalata gasita", False, str(len(cand)))

# ---------------------------------------------------------------- SVG (svgelements)
def check_svg(path):
    from svgelements import SVG, Circle, Path, Group, Line as SLine, Arc as SArc, CubicBezier, Move, Close
    W, H = REF["page"]
    import re
    raw = open(path, encoding="utf-8").read()
    root = re.search(r"<svg[^>]*>", raw).group(0)
    check("ref SVG: width=400mm height=300mm viewBox=0 0 400 300 (1 unitate = 1 mm)",
          'width="400mm"' in root and 'height="300mm"' in root and 'viewBox="0 0 400 300"' in root, root[:160])
    # svgelements are constanta mm->px rotunjita (3,7795296 la 96 ppi, exact 3,7795275...): lucram in unitati
    # utilizator, impartind la factorul ei propriu W/400 (raportat separat, nu e o abatere a fisierului)
    svg0 = SVG.parse(path, ppi=25.4)
    sfac = svg0.width / 400.0
    svg = SVG.parse(path, ppi=25.4, transform=f"scale({1/sfac})")
    check("ref SVG: svgelements vede 400 x 300 (factorul propriu al bibliotecii, nu al fisierului)", close(sfac, 1, 1e-6) and close(svg0.height / svg0.width, 0.75, 1e-12), f"factor {sfac:.9f}")
    NS = "{http://www.inkscape.org/namespaces/inkscape}"
    groups = [e for e in svg.elements() if isinstance(e, Group) and e.values.get(NS + "groupmode") == "layer"]
    labels = {g.values.get(NS + "label") for g in groups}
    check("ref SVG: straturile DECUPARE si GRAVARE sunt grupuri-strat Inkscape", REF["layers"] <= labels, str(labels))
    Y = lambda y: H - y
    circ = [e for e in svg.elements() if isinstance(e, Circle)]
    c = REF["circle"]
    check("ref SVG: cercul e <circle> R 50 la (70, 227)", len(circ) == 1 and close(circ[0].cx, 70, 1e-9) and close(circ[0].cy, Y(227), 1e-9) and close(circ[0].rx, 50, 1e-9),
          str([(e.cx, e.cy, e.rx) for e in circ]))
    paths = [e for e in svg.elements() if isinstance(e, Path)]
    def kinds(p):
        d = {}
        for s in p.segments():
            d[type(s).__name__] = d.get(type(s).__name__, 0) + 1
        return d
    rr = REF["rrect"]
    rect = [p for p in paths if kinds(p).get("Arc", 0) == 4 and kinds(p).get("Line", 0) >= 4]
    if len(rect) == 1:
        arcs = [s for s in rect[0].segments() if isinstance(s, SArc)]
        cs = sorted((round(a.center.x, 6), round(Y(a.center.y), 6)) for a in arcs)
        exp = sorted(tuple(np.round(p, 6)) for p in rr["arc_centers"])
        b = rect[0].bbox()
        check("ref SVG: dreptunghi rotunjit = 1 cale cu 4 linii + 4 comenzi A de R10", all(close(a.rx, 10, 1e-9) and close(a.ry, 10, 1e-9) for a in arcs), str(kinds(rect[0])))
        check("ref SVG: centrele colturilor = valorile pe hartie", cs == exp, str(cs))
        bb = (b[0], Y(b[3]), b[2], Y(b[1]))
        check(f"ref SVG: caseta dreptunghiului = {fmtb(rr['bbox'])}", bbox_close(bb, rr["bbox"], 1e-6), fmtb(bb))
    else:
        check("ref SVG: dreptunghi rotunjit gasit", False, str([kinds(p) for p in paths][:3]))
    el = REF["ellipse"]
    ell = [p for p in paths if kinds(p).get("Arc", 0) >= 2 and kinds(p).get("Line", 0) == 0 and kinds(p).get("CubicBezier", 0) == 0]
    if len(ell) == 1:
        arcs = [s for s in ell[0].segments() if isinstance(s, SArc)]
        a = arcs[0]
        b = ell[0].bbox(); bb = (b[0], Y(b[3]), b[2], Y(b[1]))
        check(f"ref SVG: elipsa = {len(arcs)} comenzi A (60, 30) cu centrul (75, 95)",
              all(close(max(x.rx, x.ry), 60, 1e-9) and close(min(x.rx, x.ry), 30, 1e-9) and close(x.center.x, 75, 1e-6) and close(Y(x.center.y), 95, 1e-6) for x in arcs),
              f"rx={a.rx} ry={a.ry} c=({a.center.x},{Y(a.center.y)}) rot={a.get_rotation().as_degrees if hasattr(a.get_rotation(),'as_degrees') else a.get_rotation()}")
        check(f"ref SVG: caseta elipsei = {fmtb(el['bbox'])}", bbox_close(bb, el["bbox"], 1e-6), fmtb(bb))
    else:
        check("ref SVG: elipsa gasita", False, str(len(ell)))
    sc = REF["scurve"]
    scp = [p for p in paths if kinds(p) == {"Move": 1, "CubicBezier": 1}]
    if len(scp) == 1:
        cb = [s for s in scp[0].segments() if isinstance(s, CubicBezier)][0]
        pts = [(cb.start.x, Y(cb.start.y)), (cb.control1.x, Y(cb.control1.y)), (cb.control2.x, Y(cb.control2.y)), (cb.end.x, Y(cb.end.y))]
        check("ref SVG: curba S = o comanda C cu exact punctele de control", all(hypot(a[0] - b[0], a[1] - b[1]) < 1e-9 for a, b in zip(pts, sc["P"])), str(pts))
    else:
        check("ref SVG: curba S gasita", False, str([kinds(p) for p in paths]))
    # text: caseta glifei N si a intregului text, fata de fontTools
    glyphp = [p for p in paths if p not in rect and p not in ell and p not in scp]
    boxes = []
    for p in glyphp:
        b = p.bbox(); boxes.append((b[0], Y(b[3]), b[2], Y(b[1])))
    nb = [b for b in boxes if bbox_close(b, GN["bbox"], 0.01)]
    check("ref SVG: glifa N are 20,000 mm inaltime", len(nb) == 1 and close(nb[0][3] - nb[0][1], 20, 2e-6), fmtb(nb[0]) if nb else "negasita")
    tb = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    tt = (min(g["bbox"][0] for g in TRUTH["glyphs"]), min(g["bbox"][1] for g in TRUTH["glyphs"]), max(g["bbox"][2] for g in TRUTH["glyphs"]), max(g["bbox"][3] for g in TRUTH["glyphs"]))
    check("ref SVG: caseta textului = fontTools", bbox_close(tb, tt, 2e-6), f"{fmtb(tb)} vs {fmtb(tt)}")

# ---------------------------------------------------------------- PDF (PyMuPDF)
def pdf_paths(path):
    import pymupdf as fitz
    d = fitz.open(path)
    out = []
    for pno, page in enumerate(d):
        Hpt = page.rect.height
        for dr in page.get_drawings():
            segs = []
            for it in dr["items"]:
                if it[0] == "l":
                    segs.append(("l", [(it[1].x / K, (Hpt - it[1].y) / K), (it[2].x / K, (Hpt - it[2].y) / K)]))
                elif it[0] == "c":
                    segs.append(("c", [(p.x / K, (Hpt - p.y) / K) for p in it[1:5]]))
                else:
                    segs.append((it[0], None))
            out.append({"page": pno, "layer": dr.get("layer"), "segs": segs})
    ocgs = {v["name"] for v in d.get_ocgs().values()} if hasattr(d, "get_ocgs") else set()
    return out, ocgs, d.page_count, (d[0].rect.width / K, d[0].rect.height / K)

def check_pdf(path, tag, expect_layers=True, tol=TOL, exact_eps=1e-4, page_eps=1e-3):
    paths, ocgs, npages, size = pdf_paths(path)
    check(f"{tag}: pagina 400 x 300 mm (+/- {page_eps})", close(size[0], 400, page_eps) and close(size[1], 300, page_eps), f"{size}")
    if expect_layers:
        check(f"{tag}: straturi OCG DECUPARE si GRAVARE", REF["layers"] <= ocgs, str(ocgs))
        lay = {p["layer"] for p in paths}
        check(f"{tag}: fiecare cale e intr-un strat", lay <= REF["layers"], str(lay))
    allsegs = [s for p in paths for s in p["segs"]]
    cub = [s for s in allsegs if s[0] == "c"]; lin = [s for s in allsegs if s[0] == "l"]
    other = [s for s in allsegs if s[0] not in ("c", "l")]
    check(f"{tag}: doar curbe si linii (fara dreptunghiuri/alte operatii)", not other, str(set(s[0] for s in other)))
    def curve_of(s):
        return bezier_curve(s[1]) if s[0] == "c" else line_curve(*s[1])
    # cercul: cubicele cu toate punctele la ~50 de (70,227)
    c = REF["circle"]
    circ = [s for s in cub if all(abs(hypot(x - 70, y - 227) - 50) < 0.05 for x, y in (s[1][0], s[1][3]))]
    if circ:
        pts = np.vstack([bezier_curve(s[1]).pts(201) for s in circ])
        err = float(np.abs(np.hypot(pts[:, 0] - 70, pts[:, 1] - 227) - 50).max())
        check(f"{tag}: cercul = {len(circ)} curbe Bezier, abatere radiala <= {tol} mm", err <= tol * 1.0001, f"max {err:.7f} mm")
    else:
        check(f"{tag}: cercul gasit", False, "")
    # elipsa: distanta la elipsa adevarata
    el = REF["ellipse"]; er = radians(el["rot_deg"])
    Etrue = ellipse_curve(el["c"], (el["a"] * cos(er), el["a"] * sin(er)), el["b"] / el["a"], 0, 2 * pi)
    def on_ellipse(p):
        x, y = p[0] - 75, p[1] - 95; u = x * cos(er) + y * sin(er); v = -x * sin(er) + y * cos(er)
        return abs((u / 60) ** 2 + (v / 30) ** 2 - 1) < 1e-3
    ell = [s for s in cub if on_ellipse(s[1][0]) and on_ellipse(s[1][3])]
    if ell:
        pts = np.vstack([bezier_curve(s[1]).pts(101) for s in ell])
        d1, _ = max_dist_points_to_curves(pts, [Etrue])
        check(f"{tag}: elipsa = {len(ell)} curbe Bezier, abatere <= {tol} mm", d1 <= tol * 1.0001, f"max {d1:.7f} mm")
    sc = REF["scurve"]
    scs = [s for s in cub if hypot(s[1][0][0] - 160, s[1][0][1] - 60) < 1e-3 and hypot(s[1][3][0] - 310, s[1][3][1] - 60) < 1e-3]
    if scs:
        dev = max(hypot(a[0] - b[0], a[1] - b[1]) for a, b in zip(scs[0][1], sc["P"]))
        check(f"{tag}: curba S = 1 Bezier cu punctele de control exacte (+/- {exact_eps} mm)", len(scs) == 1 and dev < exact_eps, f"abatere {dev:.2e} mm")
    else:
        check(f"{tag}: curba S gasita", False, "")
    # textul
    gpaths = [p for p in paths if p.get("layer") == "GRAVARE"] if expect_layers else paths
    boxes = []
    for p in gpaths:
        cv = [curve_of(s) for s in p["segs"] if s[0] in ("c", "l")]
        if cv: boxes.append(bbox_of(cv, 401))
    tt = (min(g["bbox"][0] for g in TRUTH["glyphs"]), min(g["bbox"][1] for g in TRUTH["glyphs"]), max(g["bbox"][2] for g in TRUTH["glyphs"]), max(g["bbox"][3] for g in TRUTH["glyphs"]))
    # caseta textului = toate segmentele din zona textului
    tsegs = [curve_of(s) for s in allsegs if s[0] in ("c", "l") and max(s[1][0][1], s[1][-1][1]) < 40 and s[1][0][0] < 200]
    tb = bbox_of(tsegs, 201)
    check(f"{tag}: caseta textului = fontTools (+/- {tol} mm)", bbox_close(tb, tt, tol), f"{fmtb(tb)} vs {fmtb(tt)}")
    nseg = [curve_of(s) for s in allsegs if s[0] in ("c", "l") and GN["bbox"][0] - 0.01 <= min(p[0] for p in s[1]) and max(p[0] for p in s[1]) <= GN["bbox"][2] + 0.01 and max(p[1] for p in s[1]) < 36]
    nb = bbox_of(nseg, 201) if nseg else None
    check(f"{tag}: glifa N are 20,000 mm inaltime (+/- {tol})", nb is not None and close(nb[3] - nb[1], 20, tol), fmtb(nb) if nb else "-")
    return {"cubics": len(cub), "lines": len(lin)}

def eps_to_pdf(eps, pdf):
    node = "node"
    js = os.path.join(HERE, "..", "testonly", "eps2pdf.cjs")
    subprocess.run([node, js, eps, pdf], check=True, capture_output=True)

if __name__ == "__main__":
    t_types = {}
    t_types["R12"] = check_dxf_reference(os.path.join(OUT, "referinta-R12.dxf"), "R12")
    t_types["R2007"] = check_dxf_reference(os.path.join(OUT, "referinta-R2007.dxf"), "R2007")
    check_dxf_corpus(os.path.join(OUT, "corpus-R12.dxf"), "R12")
    check_dxf_corpus(os.path.join(OUT, "corpus-R2007.dxf"), "R2007")
    check_svg(os.path.join(OUT, "referinta.svg"))
    pdfinfo = check_pdf(os.path.join(OUT, "referinta.pdf"), "ref PDF (pdf-lib)")
    try:
        jsinfo = check_pdf(os.path.join(OUT, "referinta-jspdf.pdf"), "ref PDF (jsPDF)", expect_layers=False)
    except Exception as ex:
        check("ref PDF (jsPDF): citit", False, repr(ex))
    try:
        eps_to_pdf(os.path.join(OUT, "referinta.eps"), os.path.join(OUT, "referinta-eps-prin-gs.pdf"))
        # Ghostscript pdfwrite scrie coordonatele cu ~4 zecimale in pt, iar pagina vine din %%HiResBoundingBox
        check_pdf(os.path.join(OUT, "referinta-eps-prin-gs.pdf"), "ref EPS (Ghostscript -> PDF)", expect_layers=False, exact_eps=5e-4, page_eps=5e-3)
    except Exception as ex:
        check("ref EPS: convertit de Ghostscript", False, repr(ex))
    ok = sum(r["ok"] for r in results)
    for r in results:
        print(("OK  " if r["ok"] else "PICA") + " | " + r["check"] + (" | " + r["detail"] if r["detail"] else ""))
    print(f"\nEXPORT: {ok}/{len(results)} verificari trecute")
    print("tipuri DXF referinta:", json.dumps(t_types))
    json.dump({"results": results, "types": t_types, "font": {"upem": TRUTH["upem"], "cap": TRUTH["cap"], "em_mm": TRUTH["em_mm"]}},
              open(os.path.join(OUT, "oracol-export.json"), "w"), indent=1)
    sys.exit(0 if ok == len(results) else 1)
