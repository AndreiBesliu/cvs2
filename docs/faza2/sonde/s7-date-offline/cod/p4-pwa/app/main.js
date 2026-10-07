// Aplicația-jucărie: trei markeri de versiune (JS, CSS, JSON) ca să vedem dacă rulează un amestec de build-uri.
import './ver.css';
import { registerSW } from 'virtual:pwa-register';
document.getElementById('js').textContent = __VER__;
document.getElementById('css').textContent = getComputedStyle(document.documentElement).getPropertyValue('--ver').trim().replace(/"/g, '');
fetch('/data.json').then((r) => r.json()).then((d) => { document.getElementById('data').textContent = d.ver; window.__data = d.ver; }).catch((e) => { window.__data = 'EROARE ' + e; });
window.__js = __VER__;
// Actualizarea se OFERĂ, nu se impune (cât mașina taie, aplicația nu are voie să se reîncarce singură).
const updateSW = registerSW({ immediate: true, onNeedRefresh() { window.__needRefresh = true; }, onOfflineReady() { window.__offlineReady = true; } });
window.__update = () => updateSW(true);
