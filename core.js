// VARIABILI GLOBALI E STATO
const viewport = document.getElementById('dynamic-viewport');
const BACK_ICON = 'immagini/interfaccia/back-arrow.png';
const POP_W = 0.7; const POP_H = 0.6;
const BOOK_W_SPREAD = 0.30; const BOOK_W_SPREAD_MOBILE = 0.30; const BOOK_W_SINGLE = 0.60;
const BOOK_H = 0.5; const BOOK_SINGLE_BP = 0; const BOOK_MOBILE_BP = 660;
const SHELF_IN_MS = 900; const SHELF_OUT_MS = 700;
const SHELF_SHADOW = 'drop-shadow(0 5px 6px rgba(0,0,0,0.65))';

let openState = null;
let busy = false;
let currentPage = null;

const nextFrames = (n = 2) => new Promise(res => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
});
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// AVVIO E SIPARIO
window.addEventListener('load', () => {
    setTimeout(() => { const sipario = document.getElementById('intro-curtains'); if (sipario) sipario.classList.add('open'); }, 500);
});

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
    if (page === 'fumetti' || page === 'shop') renderGrid(siteData[page], page);
    else if (page === 'illustrazioni') renderGallery(siteData.illustrazioni);
    else if (page === 'chi-sono') viewport.innerHTML = '<h1 style="color:white; text-align:center; padding-top:20vh;">Chi Sono</h1>';
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
    siteData.stickers.forEach(data => {
        const sticker = document.createElement('img');
        sticker.src = 'immagini/' + data.src; sticker.className = 'draggable-sticker';
        sticker.dataset.target = data.targetPage; sticker.draggable = false;
        sticker.style.setProperty('--x-desktop', `${data.startX}vw`); sticker.style.setProperty('--y-desktop', `${data.startY}vh`); sticker.style.setProperty('--rot-desktop', `${data.rotDesktop || 0}deg`);
        const mX = data.startX_mobile !== undefined ? data.startX_mobile : data.startX; const mY = data.startY_mobile !== undefined ? data.startY_mobile : data.startY; const mRot = data.rotMobile !== undefined ? data.rotMobile : (data.rotDesktop || 0);
        sticker.style.setProperty('--x-mobile', `${mX}vw`); sticker.style.setProperty('--y-mobile', `${mY}vh`); sticker.style.setProperty('--rot-mobile', `${mRot}deg`);
        viewport.appendChild(sticker); makeDraggable(sticker);
    });
}

function makeDraggable(element) {
    let dragging = false; let moved = false; let startX, startY, initialLeft, initialTop;
    element.addEventListener('pointerdown', (e) => { dragging = true; moved = false; element.setPointerCapture(e.pointerId); element.style.zIndex = 1000; element.style.cursor = 'grabbing'; startX = e.clientX; startY = e.clientY; initialLeft = element.offsetLeft; initialTop = element.offsetTop; });
    element.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true; if (!moved) return; element.style.left = `${initialLeft + dx}px`; element.style.top = `${initialTop + dy}px`; });
    const end = (e) => { if (!dragging) return; dragging = false; element.style.cursor = 'grab'; element.style.zIndex = ''; if (e.type === 'pointerup' && !moved) navigateTo(element.dataset.target); };
    element.addEventListener('pointerup', end); element.addEventListener('pointercancel', end);
}

document.getElementById('nav-fumetti').addEventListener('click', () => navigateTo('fumetti'));
document.getElementById('nav-illustrazioni').addEventListener('click', () => navigateTo('illustrazioni'));
document.getElementById('nav-shop').addEventListener('click', () => navigateTo('shop'));
document.getElementById('nav-about').addEventListener('click', () => navigateTo('chi-sono'));
document.getElementById('nav-home').addEventListener('click', () => navigateTo('home'));

renderHome();