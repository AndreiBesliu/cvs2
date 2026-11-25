/**
 * Pentru otrăvurile „P” ale cotelor în export (felia 10.4↑c-2, `test/otravuri/10.4c2.py`): corpusul exportului 2D scris din nou
 * (`scripts/export2d-corpus.ts`), EPS-urile cotelor trecute prin Ghostscript și oracolul Python (`export2d_cote.py`) pe ele.
 * Nu e în suita unitară (n-are `.test.ts`): îl cheamă unealta de otrăvuri, într-o clonă cu venv-ul oracolelor
 * (`.tmp/venv-export2d`, ca în CI) și cu Ghostscript (`gs`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

test('corpusul cotelor, recitit de oracolul Python', () => {
  const dosar = '.tmp/export2d-otrava';
  rmSync(dosar, { recursive: true, force: true });
  execFileSync('node', ['scripts/export2d-corpus.ts', dosar], { stdio: 'pipe' });
  for (const f of ['cote', 'cote-text']) {
    execFileSync('gs', ['-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pdfwrite', '-dCompressPages=false', `-sOutputFile=${dosar}/${f}-eps.pdf`, `${dosar}/${f}.eps`], { stdio: 'pipe' });
  }
  const python = ['.tmp/venv-export2d/bin/python', '.tmp/venv-export2d/Scripts/python.exe'].find((p) => existsSync(p));
  assert.ok(python, 'venv-ul oracolelor lipsește');
  try {
    execFileSync(python, ['test/oracles-py/export2d_cote.py', dosar], { stdio: 'pipe', encoding: 'utf-8' });
  } catch (e) {
    assert.fail(String((e as { stdout?: string }).stdout ?? e));
  }
});
