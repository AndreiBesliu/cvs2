"""Otrăvurile de pe emulatoare ale unei liste (setul „e2e” al listelor cu `GREP`), într-o singură pornire a emulatoarelor.

Completează `scripts/otravuri.py` (docs/otravuri.md) pentru probele din `test/e2e-emulator/`: lista își spune proba (`E2E`)
și, pentru fiecare otravă a setului „e2e”, titlul probei care trebuie s-o prindă (`GREP`: titlul, sau perechea
(fișier, titlu) când lista are mai multe fișiere). Titlul e o expresie regulată (`--grep`): fără paranteze.

Rulat ÎN `firebase emulators:exec`, din rădăcina unei CLONE, după commit, cu funcțiile compilate
(`npm --prefix functions run compileaza`) și cu 4173 și porturile emulatoarelor libere:
  firebase emulators:exec --only auth,firestore,functions,storage --project demo-cncvs2 \\
    "python3 -X utf8 scripts/otravuri-emulatoare.py LISTA baza ID [ID ...]"
`baza` e controlul: probele listei, fără otravă, trebuie să fie verzi întâi (altfel se oprește). Fiecare otravă: aplicată
(exact o potrivire), build, Playwright pe proba ei, restaurată și verificată cu sha256; verdictul în `.tmp/otravuri.log`, ca
la `scripts/otravuri.py`, iar ieșirea întreagă a rulării în `.tmp/otravuri-emu-<ID>.out` (verdictul PRINSĂ cere motivul
potrivit: aserțiunea care îi țintește defectul). La capăt, un build curat și arborele identic cu HEAD.

Login-ul Google al emulatorului de Auth încarcă `https://apis.google.com/js/api.js`: într-un mediu cu rețeaua limitată,
gazda trebuie permisă, altfel nicio probă a paginii `/admin` nu trece de intrare.
"""
import importlib.util, os, re, sys

spec = importlib.util.spec_from_file_location('otravuri', os.path.join(os.getcwd(), 'scripts', 'otravuri.py'))
U = importlib.util.module_from_spec(spec)
spec.loader.exec_module(U)

# Configul local (`.tmp/pw.emulator.config.ts`: alt port, `dist/` servit cu node), dacă există; altfel cel din repo.
CONFIG = '.tmp/pw.emulator.config.ts' if os.path.exists(os.path.join('.tmp', 'pw.emulator.config.ts')) else 'playwright.emulator.config.ts'


def ruleaza(fisier, titlu, eticheta):
    rcb, outb, dtb, _ = U.sh(['node', 'node_modules/vite/bin/vite.js', 'build'], 600)
    if rcb != 0:
        return dict(rc=rcb, rez='build eșuat', dt=dtb, expirat=False, nevalida=True, rosii=[outb[-300:].replace('\n', ' ')])
    rc, out, dt, expirat = U.sh(['node', 'node_modules/@playwright/test/cli.js', 'test', '-c', CONFIG, fisier, '--grep', titlu], 900)
    os.makedirs('.tmp', exist_ok=True)
    with open(os.path.join('.tmp', 'otravuri-emu-%s.out' % eticheta), 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    m_p, m_f = re.search(r'(\d+) passed', out), re.search(r'(\d+) failed', out)
    # Playwright marchează eșecul cu „✘” (pe Windows, cu „x”).
    rosii = [s.strip()[:200] for s in out.splitlines() if re.match(r'^\s*(x|✘)\s+\d+', s)]
    erori = [s.strip()[:200] for s in out.splitlines() if 'Error:' in s][:2]
    # Un port ocupat sau nicio probă potrivită (rc ≠ 0 fără „failed”) nu prind nimic: otrava e NEVALIDĂ.
    nevalida = 'is already used' in out or (rc != 0 and m_f is None)
    return dict(rc=rc, rez='passed=%s failed=%s' % (m_p.group(1) if m_p else None, m_f.group(1) if m_f else None), dt=dtb + dt,
                expirat=expirat, nevalida=nevalida, rosii=(rosii + erori) if rosii or erori else [out[-300:].replace('\n', ' ')])


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    lista = U.incarca_lista(sys.argv[1])
    specuri, grep = getattr(lista, 'E2E', None), getattr(lista, 'GREP', None)
    if not specuri or grep is None:
        raise SystemExit('lista n-are E2E și GREP')
    ids = sys.argv[2:]
    if 'baza' in ids:
        for sp in specuri:
            r = ruleaza(sp, '.', 'baza-' + os.path.basename(sp).split('.')[0])
            U.jurnal('emu\tbaza\t%s\tfără otravă\t%s %.0fs\t%s' % (sp, r['rez'], r['dt'], ' | '.join(r['rosii'][:3]) if r['rc'] else ''))
            if r['rc'] != 0:
                raise SystemExit('baza nu e verde')
    for x in lista.O:
        if x['id'] not in ids:
            continue
        if x['set'] != 'e2e' or x['id'] not in grep:
            U.jurnal('emu\t%s\tnu e o otravă de emulatoare' % x['id'])
            continue
        g = grep[x['id']]
        fisier, titlu = g if isinstance(g, tuple) else (specuri[0], g)
        U.cu_otrava(x, lambda f=fisier, t=titlu, e=x['id']: ruleaza(f, t, e), 'emu')
    rc, _, _, _ = U.sh(['node', 'node_modules/vite/bin/vite.js', 'build'], 600)
    U.jurnal('emu\tbuild curat la capăt: %s' % ('ok' if rc == 0 else 'EȘUAT'))
    U.verifica_final()


if __name__ == '__main__':
    main()
