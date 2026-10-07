# compare.py - ORACOLUL sondei s12 (doar test). Fara cod comun cu psmini.mjs.
# 1) citeste PDF-ul produs de Ghostscript (interpretor PostScript real) cu PyMuPDF -> punctele cailor pictate;
# 2) citeste JSON-ul interpretorului nostru;
# 3) compara multimile de puncte IN AMBELE SENSURI (distanta Hausdorff pe ancore si pe punctele de control);
# 4) verifica valori calculate pe hartie (din textul fisierului + transformarea explicita), cu toleranta stransa.
# python oracle/compare.py <ours.json> <gs.pdf> <llx> <lly> <paper-id> [tol_pt]
import json, math, sys
import pymupdf

def gs_points(pdf, llx, lly):
    doc = pymupdf.open(pdf)
    page = doc[0]
    H = page.rect.height
    anchors, ctrls, kinds = [], [], {}
    for d in page.get_drawings():
        kinds[d['type']] = kinds.get(d['type'], 0) + 1
        for it in d['items']:
            op = it[0]
            P = lambda p: (p.x + llx, H - p.y + lly)
            if op == 'l':
                anchors += [P(it[1]), P(it[2])]
            elif op == 'c':
                anchors += [P(it[1]), P(it[4])]; ctrls += [P(it[2]), P(it[3])]
            elif op == 're':
                r = it[1]; anchors += [P(r.tl), P(r.tr), P(r.bl), P(r.br)]
            elif op == 'qu':
                q = it[1]; anchors += [P(q.ul), P(q.ur), P(q.ll), P(q.lr)]
    return anchors, ctrls, kinds

def our_points(js):
    anchors, ctrls, kinds = [], [], {}
    for p in js['paths']:
        kinds[p['kind']] = kinds.get(p['kind'], 0) + 1
        for sp in p['sub']:
            for s in sp['pts']:
                v = s['p']
                if s['k'] in ('M', 'L'):
                    anchors.append((v[0], v[1]))
                else:
                    ctrls += [(v[0], v[1]), (v[2], v[3])]; anchors.append((v[4], v[5]))
    return anchors, ctrls, kinds

def directed(A, B, cell=0.5):
    # max peste a din A al distantei minime pana la B; plus cate puncte din A n-au pereche sub toleranta
    if not A: return 0.0, []
    if not B: return math.inf, A
    grid = {}
    for b in B:
        grid.setdefault((math.floor(b[0] / cell), math.floor(b[1] / cell)), []).append(b)
    worst, far = 0.0, []
    for a in A:
        cx, cy = math.floor(a[0] / cell), math.floor(a[1] / cell)
        best = math.inf
        for r in range(0, 64):
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    if max(abs(dx), abs(dy)) != r: continue
                    for b in grid.get((cx + dx, cy + dy), ()):
                        best = min(best, math.hypot(a[0] - b[0], a[1] - b[1]))
            if best <= r * cell: break
        worst = max(worst, best); far.append((best, a))
    return worst, far

# valori pe hartie: puncte care TREBUIE sa apara (calculate de mana din textul fisierului si transformarea lui)
MM = 72 / 25.4  # 1 mm in puncte PostScript
PAPER = {
    # Illustrator CS6, corp: "1 -1 scale 0 -2447.39 translate" => (x, y) -> (x, 2447.39 - y)
    # primul dreptunghi pictat: 377.007 2417.95 / 25.5132 2073.54; cercul cu centrul (388.345, 2429.29)
    'ai-cs6': {'anchors': [(377.007, 29.44), (25.5132, 29.44), (25.5132, 373.85), (377.007, 373.85),
                           (378.425, 18.10), (388.345, 8.18), (398.267, 18.10), (388.345, 28.02)],
               'ctrls': [(378.425, 12.62)]},
    # EPS-ul nostru (s2, corpus): placa 2440 x 1220 mm = 6916.535433 x 3458.267717 pt; cercul R600 mm = 1700.787402 pt
    'own-corpus': {'anchors': [(0, 0), (2440 * MM, 0), (2440 * MM, 1220 * MM), (0, 1220 * MM),
                               ((1220 + 600) * MM, 610 * MM), ((1220 - 600) * MM, 610 * MM)],
                   'ctrls': []},
    # gnuplot zero_bb: '50 50 translate 0.050 0.050 scale' apoi '3896 3541 M -104 38 V stroke'
    'gnuplot': {'anchors': [(50 + 3896 * 0.05, 50 + 3541 * 0.05), (50 + (3896 - 104) * 0.05, 50 + (3541 + 38) * 0.05)], 'ctrls': []},
    'none': {'anchors': [], 'ctrls': []},
}

def paper_check(pid, anchors, ctrls, tol):
    ref = PAPER[pid]; bad = []
    for kind, pts, pool in (('ancora', ref['anchors'], anchors), ('control', ref['ctrls'], ctrls)):
        for p in pts:
            d = min((math.hypot(p[0] - q[0], p[1] - q[1]) for q in pool), default=math.inf)
            if d > tol: bad.append((kind, p, round(d, 6)))
    return len(ref['anchors']) + len(ref['ctrls']), bad

if __name__ == '__main__':
    ours_json, pdf, llx, lly, pid = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
    tol = float(sys.argv[6]) if len(sys.argv) > 6 else 0.01
    js = json.load(open(ours_json, encoding='utf-8'))
    oa, oc, ok = our_points(js)
    ga, gc, gk = gs_points(pdf, llx, lly)
    hA1, farA1 = directed(oa, ga); hA2, farA2 = directed(ga, oa)
    hC1, farC1 = directed(oc, gc); hC2, farC2 = directed(gc, oc)
    nOut = lambda far: sum(1 for d, _ in far if d > tol)
    npaper, badpaper = paper_check(pid, oa, oc, 1e-6 if pid != 'none' else tol)
    fx = lambda v: 'inf' if v == math.inf else round(v, 6)
    res = {
        'ours_anchors': len(oa), 'gs_anchors': len(ga), 'ours_ctrls': len(oc), 'gs_ctrls': len(gc),
        'ours_paint': ok, 'gs_paint': gk,
        'H_anchors_ours_to_gs': fx(hA1), 'H_anchors_gs_to_ours': fx(hA2),
        'H_ctrls_ours_to_gs': fx(hC1), 'H_ctrls_gs_to_ours': fx(hC2),
        'anchors_off_tol': [nOut(farA1), nOut(farA2)], 'ctrls_off_tol': [nOut(farC1), nOut(farC2)],
        'paper_points': npaper, 'paper_bad': [(k, p, 'inf' if d == math.inf else d) for k, p, d in badpaper[:4]],
    }
    ok_all = (max(hA1, hA2) <= tol and (max(hC1, hC2) <= tol) and not badpaper)
    res['VERDE'] = ok_all
    print(json.dumps(res))
    sys.exit(0 if ok_all else 1)
