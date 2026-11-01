import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { dreptLaZi, NUME_MAX, ZILE_PROBA, zileRamase, type Drept } from '../../shared/conturi.ts';
import {
  codEroare, conecteazaContul, creeazaCont, deschideContul, iesi, intraCuGoogle, intraCuParola, primaStare, reconfirma, retrimiteConfirmarea,
  schimbaNumele, trimiteResetarea, type ContEditor,
} from '../cloud/contEditor.ts';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { limba, t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { Config } from './config.ts';
import { contDinRaspuns, contTinut, puneCont, useContTinut } from './dreptCont.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

type Stare = 'indisponibil' | 'incarca' | 'iesit' | 'neconfirmat' | 'intrat';

/**
 * Reconfirmarea de la pornire (ADR 0116 §8), cerută de editor odată cu el, doar când aplicația ține un cont: sesiunea din
 * browser și dreptul de azi de la server. Nimeni logat (ieșit din `/admin`, de pildă) = contul ținut pleacă.
 */
export async function reconfirmaContul(c: Config): Promise<void> {
  const x = await reconfirma(c);
  if (x === 'indisponibil') return;
  puneCont(x === null ? null : contDinRaspuns(x.uid, x.raspuns));
}

/** Textul unei erori a contului, după codul Firebase (logarea, crearea, callable-ul). */
function textEroare(e: unknown): string {
  const cod = codEroare(e);
  switch (cod) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t('cont.eroare.credentiale');
    case 'auth/email-already-in-use':
      return t('cont.eroare.folosita');
    case 'auth/weak-password':
      return t('cont.eroare.parola-slaba');
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return t('cont.eroare.email');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/popup-blocked':
      return t('cont.eroare.popup');
    case 'auth/network-request-failed':
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return t('cont.eroare.retea');
    case 'auth/too-many-requests':
    case 'functions/resource-exhausted':
      return t('cont.eroare.prea-multe');
    default: {
      const mesaj = e instanceof Error ? e.message : String(e);
      return t('cont.eroare.alta', { cod: cod ? `${cod}: ${mesaj}` : mesaj });
    }
  }
}

/** Planul de acum, în cuvinte: dreptul ținut, judecat azi (după zilele offline, proba poate fi trecută). */
function textPlan(d: Drept, acum: number): string {
  const z = dreptLaZi(d, acum);
  if (z.plan === 'proba') {
    return z.pana === null ? t('cont.plan.expirat') : t('cont.plan.proba', { n: zileRamase(z.pana, acum), data: new Date(z.pana).toLocaleDateString(limba()) });
  }
  return t(`cont.plan.${z.plan}`);
}

/**
 * Panoul contului (ADR 0116 §A3): logarea (Google, sau e-mail cu parolă, cu crearea contului și parola uitată), confirmarea
 * adresei, apoi numele, planul cu zilele rămase și ieșirea; nota de confidențialitate dedesubt. Doar online: bucata lui și
 * contul Firebase vin la cerere. Ce primește de la server ține în contul aplicației (`dreptCont.ts`), din care se judecă
 * exportul și senderul.
 */
export function PanouCont({ config, onInchide }: { readonly config: Config | null; readonly onInchide: () => void }): ReactElement {
  useLimba();
  const cont = useContTinut();
  const ce = useRef<ContEditor | null>(null);
  const [stare, setStare] = useState<Stare>(config?.firebase ? 'incarca' : 'indisponibil');
  const [lucreaza, setLucreaza] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [nume, setNume] = useState(cont?.nume ?? '');
  const cutie = useRef<HTMLDivElement>(null);

  // Escape închide fereastra oriunde ar fi focusul, ca la fereastra fonturilor.
  const inchide = useRef(onInchide);
  inchide.current = onInchide;
  useEffect(() => {
    cutie.current?.focus();
    const tasta = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      inchide.current();
    };
    document.addEventListener('keydown', tasta, true);
    return () => { document.removeEventListener('keydown', tasta, true); };
  }, []);

  /** Deschiderea pe server: contul nou cu proba, sau dreptul de azi; ce vine se ține în aplicație. */
  const deschide = async (): Promise<boolean | null> => {
    const c = ce.current;
    const u = c?.auth.currentUser;
    if (!c || !u) {
      setStare('iesit');
      return null;
    }
    const r = await deschideContul(c);
    puneCont(contDinRaspuns(u.uid, r));
    setNume(r.verificat ? r.nume : '');
    setStare(r.verificat ? 'intrat' : 'neconfirmat');
    return r.verificat;
  };

  /** O acțiune a panoului: butoanele stau oprite cât lucrează, iar eroarea ei se spune sub formular. */
  const fa = (f: () => Promise<void>): void => {
    setLucreaza(true);
    setEroare(null);
    setInfo(null);
    f().catch((e: unknown) => { setEroare(textEroare(e)); }).finally(() => { setLucreaza(false); });
  };

  useEffect(() => {
    if (!config?.firebase) return;
    const r = conecteazaContul(config);
    if (!r.ok) {
      setStare('indisponibil');
      return;
    }
    ce.current = r.cont;
    let viu = true;
    primaStare(r.cont).then(async (u) => {
      if (!viu) return;
      if (!u) {
        puneCont(null);
        setStare('iesit');
        return;
      }
      await deschide();
    }).catch((e: unknown) => {
      // Fără server: un cont ținut rămâne cum era (dreptul lui ține zilele offline); altfel, formularul de logare.
      if (!viu) return;
      setStare(contTinut()?.drept ? 'intrat' : 'iesit');
      setEroare(textEroare(e));
    });
    return () => { viu = false; };
  }, []);

  const conectat = (): ContEditor => {
    if (!ce.current) throw new Error('contul nu e conectat');
    return ce.current;
  };

  let corp: ReactNode;
  if (stare === 'indisponibil') {
    corp = <p className="nota" data-cont="indisponibil">{t('cont.indisponibil')}</p>;
  } else if (stare === 'incarca') {
    corp = <p className="nota" data-cont="incarca">{t('cont.incarca')}</p>;
  } else if (stare === 'iesit') {
    corp = (
      <div data-cont="iesit">
        <p className="nota">{t('cont.proba', { n: ZILE_PROBA })}</p>
        <div className="cont-butoane">
          <button type="button" data-buton="cont-google" disabled={lucreaza}
            onClick={() => { fa(async () => { await intraCuGoogle(conectat()); await deschide(); }); }}>{t('cont.google')}</button>
        </div>
        <form className="cont-formular" onSubmit={(e) => { e.preventDefault(); fa(async () => { await intraCuParola(conectat(), email.trim(), parola); await deschide(); }); }}>
          <label>
            {t('cont.email')}
            <input type="email" data-camp="cont-email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); }} />
          </label>
          <label>
            {t('cont.parola')}
            <input type="password" data-camp="cont-parola" autoComplete="current-password" value={parola} onChange={(e) => { setParola(e.target.value); }} />
          </label>
          <div className="cont-butoane">
            <button type="submit" data-buton="cont-intra" disabled={lucreaza}>{t('cont.intra')}</button>
            <button type="button" data-buton="cont-creeaza" disabled={lucreaza}
              onClick={() => { fa(async () => { await creeazaCont(conectat(), email.trim(), parola); await deschide(); }); }}>{t('cont.creeaza')}</button>
            <button type="button" data-buton="cont-uitata" disabled={lucreaza}
              onClick={() => { fa(async () => { await trimiteResetarea(conectat(), email.trim()); setInfo(t('cont.resetare')); }); }}>{t('cont.uitata')}</button>
          </div>
        </form>
      </div>
    );
  } else if (stare === 'neconfirmat') {
    corp = (
      <div data-cont="neconfirmat">
        <p className="nota">{t('cont.neconfirmat', { email: cont?.email ?? '' })}</p>
        <div className="cont-butoane">
          <button type="button" data-buton="cont-confirmat" disabled={lucreaza}
            onClick={() => { fa(async () => { if ((await deschide()) === false) setInfo(t('cont.inca-neconfirmat')); }); }}>{t('cont.confirmat')}</button>
          <button type="button" data-buton="cont-retrimite" disabled={lucreaza}
            onClick={() => { fa(async () => { await retrimiteConfirmarea(conectat()); setInfo(t('cont.retrimis')); }); }}>{t('cont.retrimite')}</button>
          <button type="button" data-buton="cont-iesi" disabled={lucreaza}
            onClick={() => { fa(async () => { await iesi(conectat()); puneCont(null); setStare('iesit'); }); }}>{t('cont.iesi')}</button>
        </div>
      </div>
    );
  } else {
    const drept = cont?.drept ?? null;
    corp = (
      <div data-cont="intrat">
        <p className="cont-email" data-cont-email="">{cont?.email}</p>
        <form className="cont-formular" onSubmit={(e) => {
          e.preventDefault();
          fa(async () => {
            const r = await schimbaNumele(conectat(), nume);
            const acum = contTinut();
            if (acum) puneCont({ ...acum, nume: r.nume });
          });
        }}>
          <label>
            {t('cont.nume')}
            <input type="text" data-camp="cont-nume" maxLength={NUME_MAX} value={nume} onChange={(e) => { setNume(e.target.value); }} />
          </label>
          <button type="submit" data-buton="cont-salveaza" disabled={lucreaza || nume.trim() === '' || nume.trim() === cont?.nume}>{t('cont.salveaza')}</button>
        </form>
        {drept && <p className="cont-plan" data-plan={dreptLaZi(drept, Date.now()).plan}>{textPlan(drept, Date.now())}</p>}
        {drept && <p className="nota">{t('cont.offline', { n: drept.zileOffline })}</p>}
        <div className="cont-butoane">
          <button type="button" data-buton="cont-iesi" disabled={lucreaza}
            onClick={() => { fa(async () => { await iesi(conectat()); puneCont(null); setStare('iesit'); }); }}>{t('cont.iesi')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog dialog-cont" role="dialog" aria-modal="true" aria-labelledby="cont-titlu" data-testid="dialog-cont">
      <div className="dialog-cutie" ref={cutie} tabIndex={-1}>
        <h2 id="cont-titlu">{t('cont.titlu')}</h2>
        {corp}
        {eroare !== null && <p className="camp-motiv" role="alert" data-motiv="cont">{eroare}</p>}
        {info !== null && <p className="nota" role="status" data-info="cont">{info}</p>}
        <details className="cont-nota" data-testid="cont-nota">
          <summary>{t('cont.nota.titlu')}</summary>
          <p>{t('cont.nota.text')}</p>
          <p>{t('cont.nota.operator')}</p>
        </details>
        <div className="butoane">
          <button type="button" data-buton="inchide-cont" onClick={onInchide}>{t('cont.inchide')}</button>
        </div>
      </div>
    </div>
  );
}
