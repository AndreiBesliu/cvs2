"""Otrăvurile de pe emulatoare ale unei liste (setul „e2e”), într-o singură pornire a emulatoarelor (doar local).

Rulat ÎN `firebase emulators:exec`, din rădăcina unei clone în afara Drive-ului, după commit:
  python -B -I -X utf8 .tmp/otravuri_emu.py LISTA ID [ID ...]
Fiecare otravă: aplicată (exact o potrivire), build, Playwright pe proba ei (`--grep`, din GREP), restaurată și verificată
cu sha256; verdictul în `.tmp/otravuri.log`, ca la `scripts/otravuri.py`. La capăt, un build curat și arborele identic cu HEAD.
"""
import importlib.util, os, re, sys

spec = importlib.util.spec_from_file_location('otravuri', os.path.join(os.getcwd(), 'scripts', 'otravuri.py'))
U = importlib.util.module_from_spec(spec)
spec.loader.exec_module(U)

SPEC = 'test/e2e-emulator/azi.emulator.spec.ts'
T1, T2, T3, T4, T5 = 'owner: Azi întâi', 'un rol cu o singură permisiune', 'căutarea din antet', 'lista goală are semnul', 'intrarea și'
GREP = {
    'E01': T1, 'E02': T1, 'E03': T1, 'E04': T2, 'E05': T1, 'E06': T3, 'E07': T1, 'E08': T2, 'E09': T4, 'E10': T4, 'E11': T4,
    'E12': T5, 'E13': T1, 'E14': T1, 'E15': T1, 'E16': T1,
}


def ruleaza(grep, eticheta='baza'):
    # Din A.3: GREP poate da și fișierul probei, ca (fișier, titlu).
    spec, grep = grep if isinstance(grep, tuple) else (SPEC, grep)
    rcb, outb, dtb, _ = U.sh(['node', 'node_modules/vite/bin/vite.js', 'build'], 600)
    if rcb != 0:
        return dict(rc=rcb, rez='build eșuat', dt=dtb, expirat=False, nevalida=True, rosii=[outb[-300:].replace('\n', ' ')])
    rc, out, dt, expirat = U.sh(['node', 'node_modules/@playwright/test/cli.js', 'test', '-c', '.tmp/pw.emulator.config.ts', spec, '--grep', grep], 900)
    # Ieșirea întreagă a fiecărei rulări, ca motivul unei căderi să se poată citi (verdictul PRINSĂ cere motivul potrivit).
    with open(os.path.join('.tmp', 'otravuri-emu-%s.out' % eticheta), 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    m_p, m_f = re.search(r'(\d+) passed', out), re.search(r'(\d+) failed', out)
    rosii = [s.strip()[:200] for s in out.splitlines() if re.match(r'^\s*(x|✘)\s+\d+', s)]
    erori = [s.strip()[:200] for s in out.splitlines() if 'Error:' in s][:2]
    nevalida = 'is already used' in out or (rc != 0 and m_f is None)
    return dict(rc=rc, rez='passed=%s failed=%s' % (m_p.group(1) if m_p else None, m_f.group(1) if m_f else None), dt=dtb + dt,
                expirat=expirat, nevalida=nevalida, rosii=(rosii + erori) if rosii or erori else [out[-300:].replace('\n', ' ')])


def main():
    global SPEC, GREP
    lista = U.incarca_lista(sys.argv[1])
    # Din A.2: lista își spune proba (E2E) și titlurile (GREP); A.1 le are aici.
    SPEC = (getattr(lista, 'E2E', None) or [SPEC])[0]
    GREP = getattr(lista, 'GREP', GREP)
    ids = sys.argv[2:]
    if 'baza' in ids:
        # Controlul: proba întreagă, fără otravă, trebuie să fie verde întâi.
        specuri = getattr(lista, 'E2E', None) or [SPEC]
        r = ruleaza((' '.join(specuri), '.')) if len(specuri) == 1 else None
        if r is None:
            r = dict(rc=0, rez='', dt=0)
            for sp in specuri:
                x = ruleaza((sp, '.'), 'baza-' + os.path.basename(sp).split('.')[0])
                r = dict(rc=r['rc'] or x['rc'], rez=(r['rez'] + ' ' + x['rez']).strip(), dt=r['dt'] + x['dt'], rosii=x['rosii'] if x['rc'] else r.get('rosii', []))
        U.jurnal('emu\tbaza\tfără otravă\t%s %.0fs\t%s' % (r['rez'], r['dt'], ' | '.join(r['rosii'][:3]) if r['rc'] else ''))
        if r['rc'] != 0:
            raise SystemExit('baza nu e verde')
    for x in lista.O:
        if x['id'] in ids:
            if x['set'] != 'e2e' or x['id'] not in GREP:
                U.jurnal('emu\t%s\tnu e o otravă de emulatoare' % x['id'])
                continue
            U.cu_otrava(x, lambda g=GREP[x['id']], e=x['id']: ruleaza(g, e), 'emu')
    rc, out, _, _ = U.sh(['node', 'node_modules/vite/bin/vite.js', 'build'], 600)
    U.jurnal('emu\tbuild curat la capăt: %s' % ('ok' if rc == 0 else 'EȘUAT'))
    U.verifica_final()


if __name__ == '__main__':
    main()
