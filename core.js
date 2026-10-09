// VARIABILI GLOBALI E STATO
const viewport = document.getElementById('dynamic-viewport');
const BACK_ICON = 'immagini/interfaccia/back-arrow.png';
// FRECCIA "INDIETRO": è un'immagine, si cambia sostituendo il file immagini/interfaccia/back-arrow.png (stesso nome).
// Finché quel file non c'è si usa immagini/interfaccia/back-arrow.svg, una freccia di base già pronta.
const BACK_ICON_FALLBACK = 'immagini/interfaccia/back-arrow.svg';
const BACK_ARROW_IMG = `<img src="${BACK_ICON}" alt="Indietro" draggable="false" onerror="this.onerror=null;this.src='${BACK_ICON_FALLBACK}'">`;
const POP_W = 0.7; const POP_H = 0.6;
const BOOK_W_SPREAD = 0.30; const BOOK_W_SPREAD_MOBILE = 0.30; const BOOK_W_SINGLE = 0.60;
const BOOK_H = 0.5; const BOOK_SINGLE_BP = 0; const BOOK_MOBILE_BP = 660;
const SHELF_IN_MS = 900; const SHELF_OUT_MS = 700;
const SHELF_SHADOW = 'drop-shadow(0 5px 6px rgba(0,0,0,0.65))';

// STICKER DELLA HOME
// Gli sticker vengono letti sulla "tela" di riferimento usata dall'admin (stesse misure dell'anteprima).
// Il blocco intero viene poi centrato nello schermo e rimpicciolito/ingrandito per starci dentro.
const STICKER_REF = { pc: { w: 1440, h: 800 }, tel: { w: 390, h: 780 } };
const STICKER_MAX_SCALE = 1.25;      // quanto può ingrandirsi al massimo su schermi grandi (1 = mai oltre la misura originale)
const STICKER_APPEAR_MS = 480;       // durata dell'apparizione di ogni sticker
const STICKER_APPEAR_STEP = 110;     // distanza tra un sticker e il successivo
const STICKER_APPEAR_BACK_FIRST = true;   // true = parte da quello in fondo (primo della lista), false = da quello davanti

let openState = null;
let busy = false;
let currentPage = null;
let homeCluster = null;

const nextFrames = (n = 2) => new Promise(res => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
});
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const imgAspect = src => new Promise(res => {
    const i = new Image();
    i.onload = () => res(i.naturalWidth && i.naturalHeight ? i.naturalWidth / i.naturalHeight : 0.7);
    i.onerror = () => res(0.7);
    i.src = src;
});

// Aspetta che il sipario iniziale si sia aperto (se è già aperto, subito)
let _intro = null;
function introOpen(extra = 450) {
    if (_intro) return _intro;
    const el = document.getElementById('intro-curtains');
    if (!el || el.classList.contains('open')) return (_intro = Promise.resolve());
    _intro = new Promise(res => {
        const mo = new MutationObserver(() => {
            if (el.classList.contains('open')) { mo.disconnect(); setTimeout(res, extra); }
        });
        mo.observe(el, { attributes: true, attributeFilter: ['class'] });
        setTimeout(() => { mo.disconnect(); res(); }, 15000);
    });
    return _intro;
}

// INDIRIZZI CONDIVISIBILI (#/fumetti/il-poeta, #/illustrazioni/fight, #/personaggi/bulbo ...)
// Si usa il "#" così funziona su qualsiasi hosting, senza configurare nulla.
const PAGE_URL = { shop: 'personaggi' };
const URL_PAGE = { personaggi: 'shop', shop: 'shop', fumetti: 'fumetti', illustrazioni: 'illustrazioni', 'chi-sono': 'chi-sono', home: 'home' };
const slugify = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function itemSlug(item) {
    return slugify(item.titolo) || slugify(String(item.src || item.copertina || '').replace(/\.[^.]+$/, '')) || String(item.id);
}
function findItem(arr, slug) {
    arr = arr || [];
    let i = arr.findIndex(x => itemSlug(x) === slug);
    if (i < 0) i = arr.findIndex(x => String(x.id) === slug);
    return i;
}
function listFor(page) {
    return page === 'fumetti' ? siteData.fumetti : page === 'illustrazioni' ? siteData.illustrazioni : page === 'shop' ? siteData.shop : null;
}
function parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { page: URL_PAGE[parts[0]] || 'home', slug: parts[1] || null };
}
function updateUrl(page, item, replace = false) {
    const seg = page === 'home' ? [] : [PAGE_URL[page] || page];
    if (item && seg.length) seg.push(itemSlug(item));
    const h = '#/' + seg.map(encodeURIComponent).join('/');
    if ((location.hash || '#/') === h) return;
    try { history[replace ? 'replaceState' : 'pushState'](null, '', h); }
    catch (e) { location.hash = h; }
}

let routeTries = 0;
function applyRoute() {
    const { page, slug } = parseHash();
    if (busy && routeTries++ < 20) { setTimeout(applyRoute, 150); return; }
    routeTries = 0;
    if (page !== currentPage) { navigateTo(page, slug); return; }
    if (page === 'home' || page === 'chi-sono') return;
    const arr = listFor(page);
    const idx = slug ? findItem(arr, slug) : -1;
    if (page === 'shop') {
        const root = viewport.querySelector('.shop-select');
        if (root && idx >= 0 && Number(root.dataset.index) !== idx && window.shopSelect) shopSelect(root, siteData.shop, idx);
        return;
    }
    if (!slug) { if (openState) closeView(); return; }
    if (idx < 0 || openState) return;
    if (page === 'fumetti') {
        const box = viewport.querySelector('.gallery-grid.cat-fumetti')?.children[idx];
        if (box) box.click();
    } else if (page === 'illustrazioni') {
        const fig = viewport.querySelector(`.gal-item[data-index="${idx}"]`);
        if (fig) openIllustration(fig, fig.closest('.h-gallery'), siteData.illustrazioni[idx]);
    }
}
window.addEventListener('hashchange', applyRoute);

// MOTORE DI NAVIGAZIONE
async function navigateTo(page, slug = null) {
    if (openState && openState.categoria === page && !slug && document.querySelector('.fullscreen-view')) { closeView(); return; }
    if (busy) return;
    if (page === currentPage && page !== 'home' && !document.querySelector('.fullscreen-view')) return;
    openState = null; busy = true;
    try { await leaveCurrent(page); } finally { busy = false; }
    showPage(page, slug);
}

async function leaveCurrent(target) {
    const wood = viewport.querySelector('.shelf-wood');
    const grid = viewport.querySelector('.gallery-grid.cat-fumetti');
    const gal  = viewport.querySelector('.h-gallery');
    if (wood && grid && window.slideShelf) await slideShelf(wood, grid, 'out').finished;
    else if (gal && window.slideGallery) await slideGallery(gal, 'out').finished;
    else if (viewport.querySelector('.shop-select') && window.leaveShop) await leaveShop();
    else if (viewport.querySelector('.chi-sono') && window.leaveChiSono) await leaveChiSono();
    else if (target !== 'home') await dropStickers();
}

function slideEls(els, dir, delay = 0, dist = window.innerHeight + 60) {
    const away = `translateY(${-dist}px)`;
    const frames = dir === 'in' ? [{ transform: away }, { transform: 'translateY(0)' }] : [{ transform: 'translateY(0)' }, { transform: away }];
    const opt = dir === 'in' ? { duration: SHELF_IN_MS, delay, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' } : { duration: SHELF_OUT_MS, delay, easing: 'cubic-bezier(0.55, 0, 0.85, 0.4)', fill: 'forwards' };
    const anims = els.map(e => e.animate(frames, opt));
    return { anims, finished: Promise.all(anims.map(a => a.finished)) };
}

function showPage(page, slug = null) {
    currentPage = page;
    const arr = listFor(page);
    const idx = (arr && slug) ? findItem(arr, slug) : -1;
    // se l'indirizzo arriva già completo (link condiviso / indietro-avanti) non si aggiunge nulla alla cronologia
    updateUrl(page, (idx >= 0 && page !== 'shop') ? arr[idx] : null, !!slug);

    if (page === 'fumetti') { if (idx >= 0) openComicDirect(idx); else renderGrid(siteData.fumetti, page); }
    else if (page === 'shop') renderShop(siteData.shop, idx);
    else if (page === 'illustrazioni') { if (idx >= 0) openIllustrationDirect(idx); else renderGallery(siteData.illustrazioni); }
    else if (page === 'chi-sono') renderChiSono(siteData.chiSono);
    else renderHome();
}

// STICKERS E TRASCINAMENTO
function dropStickers() {
    const sc = parseFloat(homeCluster && homeCluster.dataset.scale) || 1;
    const anims = [...viewport.querySelectorAll('.draggable-sticker')].map(st => {
        const m = new DOMMatrix(getComputedStyle(st).transform);
        const a0 = Math.atan2(m.b, m.a) * 180 / Math.PI;
        const drop = (window.innerHeight - st.getBoundingClientRect().top + 200) / sc;
        const dx = (Math.random() * 20 - 10) * window.innerWidth / 100 / sc;
        st.style.pointerEvents = 'none';
        return st.animate([{ transform: `translate(0px, 0px) rotate(${a0}deg)` }, { transform: `translate(${dx}px, ${drop}px) rotate(${a0 + Math.random() * 80 - 40}deg)` }], { duration: 800, delay: Math.random() * 200, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)', fill: 'forwards' }).finished;
    });
    return Promise.all(anims);
}

const isMobileLayout = () => matchMedia('(max-width: 768px)').matches;

function renderHome() {
    currentPage = 'home'; openState = null; viewport.innerHTML = ''; homeCluster = null;

    // Se il file dati.js è vuoto o corrotto, fermiamo il disastro
    if (!siteData || !siteData.stickers) {
        console.error("Errore: siteData.stickers non trovato. Controlla dati.js!");
        return;
    }

    const mob = isMobileLayout();
    const ref = mob ? STICKER_REF.tel : STICKER_REF.pc;
    const cluster = document.createElement('div');
    cluster.className = 'sticker-cluster';
    viewport.appendChild(cluster);
    homeCluster = cluster;

    const stickers = siteData.stickers.map(data => {
        const sticker = document.createElement('img');
        sticker.src = 'immagini/' + data.src;
        sticker.className = 'draggable-sticker';
        sticker.dataset.target = data.targetPage;
        sticker.draggable = false;

        const pick = (m, d, fb) => (mob && data[m] !== undefined) ? data[m] : (data[d] !== undefined ? data[d] : fb);
        const g = {
            x: pick('startX_mobile', 'startX', 0) / 100 * ref.w,
            y: pick('startY_mobile', 'startY', 0) / 100 * ref.h,
            rot: pick('rotMobile', 'rotDesktop', 0),
            w: pick('wMobile', 'wDesktop', 150)
        };
        sticker._g = g;
        sticker.style.setProperty('--rot', g.rot + 'deg');
        sticker.style.setProperty('--w', g.w + 'px');
        cluster.appendChild(sticker);
        makeDraggable(sticker);
        return sticker;
    });

    const loaded = stickers.map(s => new Promise(r => { if (s.complete) r(); else { s.onload = s.onerror = () => r(); } }));
    Promise.all(loaded).then(() => introOpen()).then(() => {
        if (!cluster.isConnected) return;   // nel frattempo hai cambiato pagina
        placeCluster(cluster, stickers);
        fitCluster();
        cluster.classList.add('ready');
        appearStickers(stickers);
    });
}

// Mette ogni sticker rispetto al CENTRO del blocco intero (così il blocco sta sempre in mezzo)
function placeCluster(cluster, stickers) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    stickers.forEach(s => {
        const g = s._g;
        const ratio = s.naturalWidth ? s.naturalHeight / s.naturalWidth : 1;
        g.h = g.w * ratio;
        const a = g.rot * Math.PI / 180;
        const bw = Math.abs(g.w * Math.cos(a)) + Math.abs(g.h * Math.sin(a));
        const bh = Math.abs(g.w * Math.sin(a)) + Math.abs(g.h * Math.cos(a));
        const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
        x0 = Math.min(x0, cx - bw / 2); x1 = Math.max(x1, cx + bw / 2);
        y0 = Math.min(y0, cy - bh / 2); y1 = Math.max(y1, cy + bh / 2);
    });
    if (!isFinite(x0)) { x0 = y0 = 0; x1 = y1 = 1; }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    stickers.forEach(s => {
        s.style.setProperty('--x', Math.round(s._g.x - mx) + 'px');
        s.style.setProperty('--y', Math.round(s._g.y - my) + 'px');
    });
    cluster._bw = Math.max(1, x1 - x0);
    cluster._bh = Math.max(1, y1 - y0);
}

// Adatta la grandezza del blocco allo schermo (tende ai lati, icone in basso)
function fitCluster() {
    const c = homeCluster;
    if (!c || !c._bw) return;
    const W = window.innerWidth, H = window.innerHeight;
    const reserved = (W <= 660 ? 38 + 0.03 * H : 65 + 0.04 * H) + 24;   // spazio occupato in alto/in basso (simmetrico, per restare al centro)
    const availW = W * (W <= 660 ? 0.96 : 0.9);
    const availH = Math.max(120, H - 2 * reserved);
    const s = Math.min(STICKER_MAX_SCALE, availW / c._bw, availH / c._bh);
    c.dataset.scale = s;
    c.style.transform = `scale(${s})`;
}
window.addEventListener('resize', () => { if (currentPage === 'home') fitCluster(); });

// Gli sticker riappaiono uno alla volta
function appearStickers(stickers) {
    const list = STICKER_APPEAR_BACK_FIRST ? stickers : [...stickers].reverse();
    list.forEach((s, i) => {
        const r = s._g.rot;
        s.animate([
            { opacity: 0, transform: `rotate(${r - 12}deg) scale(0.2)` },
            { opacity: 1, transform: `rotate(${r}deg) scale(1)` }
        ], { duration: STICKER_APPEAR_MS, delay: i * STICKER_APPEAR_STEP, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' });
    });
}

function makeDraggable(element) {
    let dragging = false; let moved = false; let startX, startY, initialLeft, initialTop;
    const scale = () => parseFloat(element.parentElement && element.parentElement.dataset.scale) || 1;
    element.addEventListener('pointerdown', (e) => { dragging = true; moved = false; element.setPointerCapture(e.pointerId); element.style.zIndex = 1000; element.style.cursor = 'grabbing'; startX = e.clientX; startY = e.clientY; initialLeft = element.offsetLeft; initialTop = element.offsetTop; });
    element.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true; if (!moved) return; const k = scale(); element.style.left = `${initialLeft + dx / k}px`; element.style.top = `${initialTop + dy / k}px`; });
    const end = (e) => { if (!dragging) return; dragging = false; element.style.cursor = 'grab'; element.style.zIndex = ''; if (e.type === 'pointerup' && !moved) navigateTo(element.dataset.target); };
    element.addEventListener('pointerup', end); element.addEventListener('pointercancel', end);
}

// Se si passa dal layout telefono a quello computer (o viceversa), ricalcola le posizioni
matchMedia('(max-width: 768px)').addEventListener('change', () => { if (currentPage === 'home') renderHome(); });

// --- BOTTONI IN BASSO ---
document.getElementById('nav-fumetti').addEventListener('click', () => navigateTo('fumetti'));
document.getElementById('nav-illustrazioni').addEventListener('click', () => navigateTo('illustrazioni'));
document.getElementById('nav-shop').addEventListener('click', () => navigateTo('shop'));
document.getElementById('nav-about').addEventListener('click', () => navigateTo('chi-sono'));
document.getElementById('nav-home').addEventListener('click', () => navigateTo('home'));

// --- MOTORE DI AVVIO (legge l'indirizzo: se è un link a un fumetto / illustrazione / personaggio lo apre) ---
function boot() {
    const { page, slug } = parseHash();
    if (page === 'home') { renderHome(); return; }
    const arr = listFor(page);
    const diretto = slug && page !== 'shop' && arr && findItem(arr, slug) >= 0;
    const vai = () => showPage(page, slug);
    if (diretto) vai(); else introOpen(250).then(vai);
}
// parte quando tutti i file JS sono stati caricati (gallerie, libro e shop arrivano dopo questo file)
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

// PROTEZIONE IMMAGINI: niente tasto destro, trascinamento o salvataggio rapido sulle foto del sito.
// Attenzione: è un freno, non un blocco assoluto (chi conosce gli strumenti del browser o fa uno screenshot può ancora copiarle).
document.addEventListener('contextmenu', e => { if (!e.target.closest('a')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 's') e.preventDefault(); });
