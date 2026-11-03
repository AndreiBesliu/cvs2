import { semnal } from '../ui/CipuriVedere.tsx';

/**
 * O lucrare pornită și neterminată pe mașină (ADR 0132 §6): o scrie fereastra Mașina, din sesiune, iar carcasa o citește, ca
 * „Reîncarcă” (versiunea nouă) să aștepte sfârșitul lucrării. În pornire stă doar semnalul, nu senderul; până la prima
 * deschidere a Mașinii nu există sesiune, deci nici lucrare.
 */
export const lucrarePornita = semnal(false);
