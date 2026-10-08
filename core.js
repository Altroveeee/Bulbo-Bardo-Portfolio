// VARIABILI GLOBALI E STATO
const viewport = document.getElementById('dynamic-viewport');
const BACK_ICON = 'immagini/interfaccia/back-arrow.png';
const POP_W = 0.7; const POP_H = 0.6;
const BOOK_W_SPREAD = 0.30; const BOOK_W_SPREAD_MOBILE = 0.30; const BOOK_W_SINGLE = 0.60;
const BOOK_H = 0.5; const BOOK_SINGLE_BP = 0; const BOOK_MOBILE_BP = 660;
const SHELF_IN_MS = 900; const SHELF_OUT_MS = 700;
const SHELF_SHADOW = 'drop-shadow(0 5px 6px rgba(0,0,0,0.65))';

// Sticker della home: misura dello schermo su cui li hai disposti (0 = usa lo schermo attuale)
const STICKER_REF_W = 0, STICKER_REF_H = 0;                // computer
const STICKER_REF_W_MOBILE = 0, STICKER_REF_H_MOBILE = 0;  // telefono

let openState = null;
let busy = false;
let currentPage = null;

const nextFrames = (n = 2) => new Promise(res => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
});
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// AVVIO: il sipario iniziale (chiuso finché la pagina non è pronta) lo gestisce caricamento.js

// MOTORE DI NAVIGAZIONE
async function navigateTo(page) {
    if (openState && openState.categoria === page && document.querySelector('.fullscreen-view')) { closeView(); return; }
    if (busy) return;
    if (page === currentPage && page !== 'home' && !document.querySelector('.fullscreen-view')) return;
    openState = null; busy = true;
    try { await leaveCurrent(page); } finally { busy = false; }
    showPage(page);
}

async function leaveCurrent(target) {
    const wood = viewport.querySelector('.shelf-wood');
    const grid = viewport.querySelector('.gallery-grid.cat-fumetti');
    const gal  = viewport.querySelector('.h-gallery');
    if (wood && grid && window.slideShelf) await slideShelf(wood, grid, 'out').finished;
    else if (gal && window.slideEls) await slideEls([gal], 'out').finished;
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

function showPage(page) {
    currentPage = page;
    if (page === 'fumetti') renderGrid(siteData[page], page);
    else if (page === 'shop') renderShop(siteData.shop);
    else if (page === 'illustrazioni') renderGallery(siteData.illustrazioni);
    else if (page === 'chi-sono') renderChiSono(siteData.chiSono);
    else renderHome();
}

// STICKERS E TRASCINAMENTO
function dropStickers() {
    const anims = [...viewport.querySelectorAll('.draggable-sticker')].map(st => {
        const m = new DOMMatrix(getComputedStyle(st).transform);
        const a0 = Math.atan2(m.b, m.a) * 180 / Math.PI;
        const drop = window.innerHeight - st.getBoundingClientRect().top + 200;
        st.style.pointerEvents = 'none';
        return st.animate([{ transform: `translate(0px, 0px) rotate(${a0}deg)` }, { transform: `translate(${Math.random() * 20 - 10}vw, ${drop}px) rotate(${a0 + Math.random() * 80 - 40}deg)` }], { duration: 800, delay: Math.random() * 200, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)', fill: 'forwards' }).finished;
    });
    return Promise.all(anims);
}

function renderHome() {
    currentPage = 'home'; openState = null; viewport.innerHTML = '';
    
    // Se il file dati.js è vuoto o corrotto, fermiamo il disastro
    if (!siteData || !siteData.stickers) {
        console.error("Errore: siteData.stickers non trovato. Controlla dati.js!");
        return;
    }

    // Posizioni ancorate al CENTRO dello schermo e fissate in pixel:
    // ridimensionando la finestra gli sticker restano fermi e centrati
    const refD = { w: STICKER_REF_W || window.innerWidth, h: STICKER_REF_H || window.innerHeight };
    const refM = { w: STICKER_REF_W_MOBILE || window.innerWidth, h: STICKER_REF_H_MOBILE || window.innerHeight };
    const off = (v, size) => `calc(50% + ${Math.round((v / 100 - 0.5) * size)}px)`;

    siteData.stickers.forEach(data => {
        const sticker = document.createElement('img');
        sticker.src = 'immagini/' + data.src; 
        sticker.className = 'draggable-sticker';
        sticker.dataset.target = data.targetPage; 
        sticker.draggable = false;
        
        // Iniezione sicura con fallback per i vecchi dati
        sticker.style.setProperty('--x-desktop', off(data.startX, refD.w)); 
        sticker.style.setProperty('--y-desktop', off(data.startY, refD.h)); 
        sticker.style.setProperty('--rot-desktop', `${data.rotDesktop || 0}deg`);
        sticker.style.setProperty('--w-desktop', `${data.wDesktop || 150}px`); // <-- DA vw A px
        
        const mX = data.startX_mobile !== undefined ? data.startX_mobile : data.startX; 
        const mY = data.startY_mobile !== undefined ? data.startY_mobile : data.startY; 
        const mRot = data.rotMobile !== undefined ? data.rotMobile : (data.rotDesktop || 0);
        const mW = data.wMobile !== undefined ? data.wMobile : (data.wDesktop || 150);
        
        sticker.style.setProperty('--x-mobile', off(mX, refM.w)); 
        sticker.style.setProperty('--y-mobile', off(mY, refM.h)); 
        sticker.style.setProperty('--rot-mobile', `${mRot}deg`);
        sticker.style.setProperty('--w-mobile', `${mW}px`);
        
        viewport.appendChild(sticker); 
        makeDraggable(sticker);
    });
}

function makeDraggable(element) {
    let dragging = false; let moved = false; let startX, startY, initialLeft, initialTop;
    element.addEventListener('pointerdown', (e) => { dragging = true; moved = false; element.setPointerCapture(e.pointerId); element.style.zIndex = 1000; element.style.cursor = 'grabbing'; startX = e.clientX; startY = e.clientY; initialLeft = element.offsetLeft; initialTop = element.offsetTop; });
    element.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true; if (!moved) return; element.style.left = `${initialLeft + dx}px`; element.style.top = `${initialTop + dy}px`; });
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

// --- MOTORE DI AVVIO ---
renderHome();