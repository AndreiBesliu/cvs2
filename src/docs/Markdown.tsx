import { Fragment, useMemo, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { parseazaInline, parseazaMarkdown, type Bloc, type Inline } from './markdown.ts';
import './markdown.css';

/**
 * Cititorul de markdown (ADR 0048 §4), partea React: arborele din `markdown.ts` devine elemente React, fără HTML brut
 * (React scrie doar text; nimic `dangerouslySetInnerHTML`). Reutilizabil: fila Documentație din `/admin` și manualul
 * utilizatorului (`src/app/Manual.tsx`, ADR 0058). Cine îl folosește decide ce înseamnă un link intern (`legaturi`).
 */

/** Unde duce un link intern: adresa (pentru clicul de mijloc, „deschide în filă nouă”) și ce face clicul simplu. */
export interface Legatura {
  readonly href: string;
  readonly actiune: () => void;
}

export interface Legaturi {
  /** Un link relativ (`0001-a.md`, `#ancora`); null = nu duce nicăieri cunoscut, deci rămâne text. */
  readonly interna?: (href: string) => Legatura | null;
  /** Un cod inline care numește un document cunoscut (`docs/etape/placa-02.md`) devine link. */
  readonly cod?: (text: string) => Legatura | null;
}

function clicSimplu(e: MouseEvent, actiune: () => void): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  actiune();
}

function LinkIntern({ l, children }: { readonly l: Legatura; readonly children: ReactNode }): ReactElement {
  return <a className="md-intern" href={l.href} onClick={(e) => { clicSimplu(e, l.actiune); }}>{children}</a>;
}

function inline(noduri: readonly Inline[], legaturi: Legaturi | undefined): ReactNode[] {
  return noduri.map((n, k) => {
    switch (n.tip) {
      case 'text': return <Fragment key={k}>{n.text}</Fragment>;
      case 'rand-nou': return <br key={k} />;
      case 'cod': {
        const l = legaturi?.cod?.(n.text);
        const cod = <code className="md-cod-inline">{n.text}</code>;
        return l ? <LinkIntern key={k} l={l}>{cod}</LinkIntern> : <Fragment key={k}>{cod}</Fragment>;
      }
      case 'tare': return <strong key={k}>{inline(n.continut, legaturi)}</strong>;
      case 'cursiv': return <em key={k}>{inline(n.continut, legaturi)}</em>;
      case 'legatura': {
        const continut = inline(n.continut, legaturi);
        // Externă: doar http(s), deja verificat de parser; în filă nouă, fără referrer și fără acces la pagina noastră.
        if (n.fel === 'externa') return <a key={k} href={n.href} target="_blank" rel="noopener noreferrer">{continut}</a>;
        const l = legaturi?.interna?.(n.href);
        return l ? <LinkIntern key={k} l={l}>{continut}</LinkIntern> : <span key={k} className="md-fara-tinta">{continut}</span>;
      }
    }
  });
}

const TITLURI = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

function bloc(b: Bloc, k: number, p: ProprietatiBlocuri): ReactNode {
  const { legaturi, nivelBaza, prefixAncora } = p;
  switch (b.tip) {
    case 'titlu': {
      const H = TITLURI[Math.min(5, b.nivel - 1 + nivelBaza)] ?? 'h6';
      return <H key={k} id={`${prefixAncora}${b.ancora}`} className="md-titlu">{inline(b.continut, legaturi)}</H>;
    }
    case 'paragraf': return <p key={k}>{inline(b.continut, legaturi)}</p>;
    case 'regula': return <hr key={k} />;
    case 'cod':
      return (
        // Liniile exacte, cu derulare proprie (tastatura ajunge la ea: tabIndex).
        <pre key={k} className="md-cod" data-limbaj={b.limbaj || undefined} tabIndex={0}><code>{b.linii.join('\n')}</code></pre>
      );
    case 'citat': return <blockquote key={k}>{b.blocuri.map((x, i) => bloc(x, i, p))}</blockquote>;
    case 'lista': {
      const elemente = b.elemente.map((e, i) => (
        <li key={i} className={e.bifa === null ? undefined : 'md-bifa'}>
          {e.bifa === null ? null : <input type="checkbox" checked={e.bifa} disabled readOnly tabIndex={-1} />}
          <div className="md-element">{e.blocuri.map((x, j) => bloc(x, j, p))}</div>
        </li>
      ));
      return b.ordonata
        ? <ol key={k} start={b.start === 1 ? undefined : b.start}>{elemente}</ol>
        : <ul key={k} className={b.elemente.some((e) => e.bifa !== null) ? 'md-lista-bife' : undefined}>{elemente}</ul>;
    }
    case 'tabel':
      return (
        // Derularea orizontală proprie: un tabel lat nu împinge pagina.
        <div key={k} className="md-tabel" tabIndex={0}>
          <table>
            <thead>
              <tr>{b.antet.map((c, i) => <th key={i} scope="col" data-aliniere={b.aliniere[i] ?? undefined}>{inline(c, legaturi)}</th>)}</tr>
            </thead>
            <tbody>
              {b.randuri.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} data-aliniere={b.aliniere[j] ?? undefined}>{inline(c, legaturi)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

interface ProprietatiBlocuri {
  readonly legaturi: Legaturi | undefined;
  /** Câte niveluri coboară titlurile (`#` devine `h2` pe o pagină care are deja `h1`). */
  readonly nivelBaza: number;
  /** Prefixul id-urilor titlurilor, ca ancorele documentului să nu se lovească de id-urile paginii. */
  readonly prefixAncora: string;
}

/** Un document markdown (textul sau blocurile deja citite). */
export function Markdown({ text, legaturi, nivelBaza = 0, prefixAncora = 'md-' }: {
  readonly text: string;
  readonly legaturi?: Legaturi;
  readonly nivelBaza?: number;
  readonly prefixAncora?: string;
}): ReactElement {
  const blocuri = useMemo(() => parseazaMarkdown(text), [text]);
  const p: ProprietatiBlocuri = { legaturi, nivelBaza, prefixAncora };
  return <div className="md">{blocuri.map((b, k) => bloc(b, k, p))}</div>;
}

/** Un text markdown inline (un titlu, o notă, o celulă), fără paragraf în jur. */
export function TextMd({ md, legaturi }: { readonly md: string; readonly legaturi?: Legaturi }): ReactElement {
  const noduri = useMemo(() => parseazaInline(md), [md]);
  return <>{inline(noduri, legaturi)}</>;
}
