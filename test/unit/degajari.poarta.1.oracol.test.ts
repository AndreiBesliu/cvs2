/**
 * Oracolul degajărilor (ADR 0032): poarta de acum și cea de dinainte dau aceleași încălcări pe programele scrise de mână
 * ale oracolelor de dinainte. Partea 1 din 4. Programele, judecata și împărțirea sunt în `ajutor-degajari-poarta.ts`;
 * fișierul doar își numește partea, ca părțile să ruleze în paralel (un singur test ținea 2–3 minute).
 */
import { probaPortii } from './ajutor-degajari-poarta.ts';

probaPortii(1);
