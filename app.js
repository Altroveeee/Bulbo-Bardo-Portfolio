const viewport = document.getElementById('dynamic-viewport');
const BACK_ICON = 'immagini/interfaccia/back-arrow.png';

// Misure dell'immagine ingrandita (shop): devono coincidere con .fullscreen-img nel CSS
const POP_W = 0.7;   // % della larghezza dello schermo
const POP_H = 0.6;   // % dell'altezza dello schermo

// Misure del libro
const BOOK_W_SPREAD = 0.30;         // larghezza di UNA pagina (computer), in % dello schermo
const BOOK_W_SPREAD_MOBILE = 0.30;  // larghezza di UNA pagina (telefono)
const BOOK_W_SINGLE = 0.60;         // larghezza pagina singola (usata solo se BOOK_SINGLE_BP > 0)
const BOOK_H = 0.5;                 // altezza massima, in % dello schermo
const BOOK_SINGLE_BP = 0;           // 0 = doppia pagina sempre. Metti 660 per una pagina sola sul telefono
const BOOK_MOBILE_BP = 660;         // sotto questa larghezza usa la misura da telefono

// Libreria
const SHELF_IN_MS  = 900;           // la libreria sale da sotto
const SHELF_OUT_MS = 700;           // la libreria scende
const SHELF_SHADOW = 'drop-shadow(0 5px 6px rgba(0,0,0,0.65))';

let openState = null;     // ricorda cosa è aperto, per poter tornare indietro
let busy = false;
let currentPage = null;

const nextFrames = (n = 2) => new Promise(res => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
});

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- SIPARIO INIZIALE ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const sipario = document.getElementById('intro-curtains');
        if (sipario) sipario.classList.add('open');
    }, 500);
});

// --- NAVIGAZIONE ---
async function navigateTo(page) {
    // Stessa categoria già aperta: animazione al contrario
    if (openState && openState.categoria === page && document.querySelector('.fullscreen-view')) {
        closeView();
        return;
    }
    if (busy) return;
    // Già nella pagina (la home si può sempre ricaricare)
    if (page === currentPage && page !== 'home' && !document.querySelector('.fullscreen-view')) return;

    openState = null;
    busy = true;
    try { await leaveCurrent(page); } finally { busy = false; }
    showPage(page);
}

// Prima di cambiare pagina: libreria e galleria salgono verso l'alto, gli sticker cadono
async function leaveCurrent(target) {
    const wood = viewport.querySelector('.shelf-wood');
    const grid = viewport.querySelector('.gallery-grid.cat-fumetti');
    const gal  = viewport.querySelector('.h-gallery');
    if (wood && grid) await slideShelf(wood, grid, 'out').finished;
    else if (gal)     await slideEls([gal], 'out').finished;
    else if (target !== 'home') await dropStickers();
}

// Gli sticker della home cadono sparsi
function dropStickers() {
    const anims = [...viewport.querySelectorAll('.draggable-sticker')].map(st => {
        const m  = new DOMMatrix(getComputedStyle(st).transform);
        const a0 = Math.atan2(m.b, m.a) * 180 / Math.PI;
        const drop = window.innerHeight - st.getBoundingClientRect().top + 200;
        st.style.pointerEvents = 'none';
        return st.animate([
            { transform: `translate(0px, 0px) rotate(${a0}deg)` },
            { transform: `translate(${Math.random() * 20 - 10}vw, ${drop}px) rotate(${a0 + Math.random() * 80 - 40}deg)` }
        ], { duration: 800, delay: Math.random() * 200, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)', fill: 'forwards' }).finished;
    });
    return Promise.all(anims);
}

function showPage(page) {
    currentPage = page;
    if (page === 'fumetti' || page === 'shop') {
        renderGrid(siteData[page], page);
    } else if (page === 'illustrazioni') {
        renderGallery(siteData.illustrazioni);
    } else if (page === 'chi-sono') {
        viewport.innerHTML = '<h1 style="color:white; text-align:center; padding-top:20vh;">Chi Sono</h1>';
    } else {
        renderHome();
    }
}

// --- HOME: STICKERS ---
function renderHome() {
    currentPage = 'home';
    openState = null;
    viewport.innerHTML = '';
    siteData.stickers.forEach(data => {
        const sticker = document.createElement('img');
        sticker.src = 'immagini/' + data.src;
        sticker.className = 'draggable-sticker';
        sticker.dataset.target = data.targetPage;
        sticker.draggable = false;

        sticker.style.setProperty('--x-desktop', `${data.startX}vw`);
        sticker.style.setProperty('--y-desktop', `${data.startY}vh`);
        sticker.style.setProperty('--rot-desktop', `${data.rotDesktop || 0}deg`);

        const mX = data.startX_mobile !== undefined ? data.startX_mobile : data.startX;
        const mY = data.startY_mobile !== undefined ? data.startY_mobile : data.startY;
        const mRot = data.rotMobile !== undefined ? data.rotMobile : (data.rotDesktop || 0);

        sticker.style.setProperty('--x-mobile', `${mX}vw`);
        sticker.style.setProperty('--y-mobile', `${mY}vh`);
        sticker.style.setProperty('--rot-mobile', `${mRot}deg`);

        viewport.appendChild(sticker);
        makeDraggable(sticker);
    });
}

// Trascinamento con mouse e tocco
function makeDraggable(element) {
    let dragging = false;
    let moved = false;
    let startX, startY, initialLeft, initialTop;

    element.addEventListener('pointerdown', (e) => {
        dragging = true;
        moved = false;
        element.setPointerCapture(e.pointerId);
        element.style.zIndex = 1000;
        element.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
    });

    element.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
        if (!moved) return;
        element.style.left = `${initialLeft + dx}px`;
        element.style.top = `${initialTop + dy}px`;
    });

    const end = (e) => {
        if (!dragging) return;
        dragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = '';
        if (e.type === 'pointerup' && !moved) {
            navigateTo(element.dataset.target);
        }
    };

    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
}

// ==========================================
// GRIGLIA (fumetti = libreria, shop = griglia semplice)
// ==========================================
function buildGrid(dataArray, categoria) {
    const grid = document.createElement('div');
    grid.id = 'gallery-grid';
    grid.className = 'gallery-grid cat-' + categoria;

    dataArray.forEach(item => {
        const box = document.createElement('div');
        box.className = 'gallery-item';

        const immagineGriglia = item.copertina ? item.copertina : item.src;
        const img = document.createElement('img');
        img.src = `immagini/${immagineGriglia}`;
        img.alt = item.titolo || '';
        img.draggable = false;
        box.appendChild(img);

        box.addEventListener('click', () => {
            if (categoria === 'fumetti') openComic(box, grid, item);
            else triggerFullscreen(box, grid, item, categoria);
        });
        grid.appendChild(box);
    });
    return grid;
}

function renderGrid(dataArray, categoria) {
    viewport.innerHTML = '';

    let wood = null;
    if (categoria === 'fumetti') {
        wood = document.createElement('div');
        wood.className = 'shelf-wood';
        viewport.appendChild(wood);
    }

    const grid = buildGrid(dataArray, categoria);
    viewport.appendChild(grid);

    // La libreria sale da sotto con i fumetti sopra
    if (wood) {
        busy = true;
        slideShelf(wood, grid, 'in').finished.then(() => { busy = false; });
    }
}

// Scivolamento dall'alto: entra da sopra, esce verso sopra
function slideEls(els, dir, delay = 0, dist = window.innerHeight + 60) {
    const away = `translateY(${-dist}px)`;
    const frames = dir === 'in'
        ? [{ transform: away }, { transform: 'translateY(0)' }]
        : [{ transform: 'translateY(0)' }, { transform: away }];
    const opt = dir === 'in'
        ? { duration: SHELF_IN_MS,  delay, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',   fill: 'backwards' }
        : { duration: SHELF_OUT_MS, delay, easing: 'cubic-bezier(0.55, 0, 0.85, 0.4)', fill: 'forwards' };
    const anims = els.map(e => e.animate(frames, opt));
    return { anims, finished: Promise.all(anims.map(a => a.finished)) };
}

// La libreria (legno + ripiani con i fumetti) si muove tutta insieme, alla stessa distanza
function slideShelf(wood, grid, dir, delay = 0) {
    const dist = Math.max(window.innerHeight, grid.getBoundingClientRect().bottom) + 60;
    return slideEls([wood, grid], dir, delay, dist);
}

// Dove si vede davvero la copertina dentro la sua carta (object-fit: contain)
function shownRect(img, ar) {
    const r = img.getBoundingClientRect();
    const w = Math.min(r.width, r.height * ar);
    const h = w / ar;
    const bottom = getComputedStyle(img).objectPosition.split(' ')[1] === '100%';
    return { w, h, cx: r.left + r.width / 2, cy: bottom ? r.bottom - h / 2 : r.top + r.height / 2 };
}

// Copia della copertina, fissa sullo schermo, che vola tra libreria e libro
function makeFly(src, t) {
    const f = document.createElement('img');
    f.src = src;
    f.className = 'fly';
    f.draggable = false;
    f.style.left   = (t.cx - t.w / 2) + 'px';
    f.style.top    = (t.cy - t.h / 2) + 'px';
    f.style.width  = t.w + 'px';
    f.style.height = t.h + 'px';
    viewport.appendChild(f);
    return f;
}

// ---------- APERTURA FUMETTO ----------
function openComic(selectedBox, grid, itemData) {
    if (busy) return;
    busy = true;

    const wood  = viewport.querySelector('.shelf-wood');
    const index = [...grid.children].indexOf(selectedBox);
    const img   = selectedBox.querySelector('img');
    const ar    = (img.naturalWidth && img.naturalHeight)
        ? img.naturalWidth / img.naturalHeight
        : selectedBox.offsetWidth / selectedBox.offsetHeight;

    const s    = shownRect(img, ar);          // dove sta ora la copertina
    const book = prepareBook(itemData, ar);   // libro nascosto: ci dice dove deve arrivare
    const t    = book.target;
    const fly  = makeFly(img.src, t);

    img.style.visibility = 'hidden';          // l'originale resta sullo scaffale, vuoto

    // La copertina si stacca e va al centro...
    const flyAnim = fly.animate(
        [
            { transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w})`, filter: SHELF_SHADOW },
            { transform: 'none', filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }
        ],
        { duration: 700, delay: 150, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' }
    );

    // ...mentre la libreria scende, lasciando lo sfondo nero
    const shelf = slideShelf(wood, grid, 'out', 100);

    Promise.all([flyAnim.finished, shelf.finished]).then(async () => {
        openState = { categoria: 'fumetti', itemData, index, ar, target: t };
        await revealBook(book);
        fly.remove();
        busy = false;
    });
}

// ---------- RITORNO ----------
function closeView() {
    if (busy || !openState) return;
    if (openState.categoria === 'fumetti') { closeComic(); return; }
    if (openState.categoria === 'illustrazioni') { closeIllustration(); return; }

    busy = true;
    const { categoria, index, ar, fall } = openState;
    openState = null;

    renderGrid(siteData[categoria], categoria);
    const container = document.getElementById('gallery-grid');
    container.classList.add('falling-cards-active');

    const cards = [...container.children];
    const box   = cards[index];
    const img   = box.querySelector('img');
    box.classList.add('selected');

    const g = popGeometry(box, ar, centerTarget(ar));
    prepBigImg(img, g);

    cards.forEach((card, i) => {
        if (card === box) return;
        card.animate(fallFrames(card, fall[i]).reverse(), {
            duration: 700,
            delay: fall[i].delay,
            easing: 'cubic-bezier(0.1, 0.6, 0.5, 1)',
            fill: 'both'
        });
    });

    img.animate(
        [
            { transform: `translate(${g.dx}px, ${g.dy}px) scale(1)` },
            { transform: `translate(0, 0) scale(${g.sw / g.tw})` }
        ],
        { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
    );

    Promise.all(container.getAnimations({ subtree: true }).map(a => a.finished)).then(() => {
        resetBigImg(img);
        container.getAnimations({ subtree: true }).forEach(a => a.cancel());
        box.classList.remove('selected');
        container.classList.remove('falling-cards-active');
        busy = false;
    });
}

// Dal libro alla libreria: la copertina torna al suo posto mentre la libreria risale
function closeComic() {
    busy = true;
    const { itemData, index, ar, target: t } = openState;
    openState = null;

    // Al posto del libro resta la copertina, ferma dove stava il libro
    const fly = makeFly('immagini/' + itemData.copertina, t);
    viewport.querySelectorAll('.book-view, .back-arrow').forEach(n => n.remove());

    // La libreria nuova, fuori schermo
    const wood = document.createElement('div');
    wood.className = 'shelf-wood';
    const grid = buildGrid(siteData.fumetti, 'fumetti');
    viewport.append(wood, grid);

    const img = grid.children[index].querySelector('img');
    const s   = shownRect(img, ar);           // posto finale della copertina
    img.style.visibility = 'hidden';

    const shelf = slideShelf(wood, grid, 'in');
    const flyAnim = fly.animate(
        [
            { transform: 'none', filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' },
            { transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w})`, filter: SHELF_SHADOW }
        ],
        { duration: SHELF_IN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' }
    );

    Promise.all([flyAnim.finished, shelf.finished]).then(() => {
        img.style.visibility = '';
        fly.remove();
        busy = false;
    });
}

// ==========================================
// SHOP: ANIMAZIONE "CARTE CADENTI" + VISTA SINGOLA
// ==========================================
function centerTarget(ar) {
    const w = Math.min(window.innerWidth * POP_W, window.innerHeight * POP_H * ar);
    return { w, h: w / ar, cx: window.innerWidth / 2, cy: window.innerHeight / 2 };
}

function popGeometry(box, ar, t) {
    const b = box.getBoundingClientRect();
    return {
        tw: t.w,
        th: t.h,
        sw: Math.min(b.width, b.height * ar),   // dimensione attuale dell'immagine nella griglia
        dx: t.cx - (b.left + b.width  / 2),
        dy: t.cy - (b.top  + b.height / 2)
    };
}

// L'immagine ha già la dimensione finale: la animiamo solo con scale <= 1, quindi resta nitida
function prepBigImg(img, g) {
    img.style.position   = 'absolute';
    img.style.left       = '50%';
    img.style.top        = '50%';
    img.style.width      = g.tw + 'px';
    img.style.height     = g.th + 'px';
    img.style.marginLeft = (-g.tw / 2) + 'px';
    img.style.marginTop  = (-g.th / 2) + 'px';
    img.style.maxWidth   = 'none';
}

function resetBigImg(img) {
    ['position', 'left', 'top', 'width', 'height', 'marginLeft', 'marginTop', 'maxWidth']
        .forEach(p => img.style[p] = '');
}

function fallFrames(card, p) {
    const drop = window.innerHeight - card.getBoundingClientRect().top + 200;
    return [
        { transform: 'translate(0, 0) rotate(0deg)' },
        { transform: `translate(${p.drift}vw, ${drop}px) rotate(${p.rot}deg)` }
    ];
}

function triggerFullscreen(selectedBox, container, itemData, categoria) {
    if (busy || container.classList.contains('falling-cards-active')) return;
    busy = true;
    container.classList.add('falling-cards-active');
    selectedBox.classList.add('selected');

    const cards = [...container.children];
    const index = cards.indexOf(selectedBox);

    const img = selectedBox.querySelector('img');
    const ar  = (img.naturalWidth && img.naturalHeight)
        ? img.naturalWidth / img.naturalHeight
        : selectedBox.offsetWidth / selectedBox.offsetHeight;

    // 1. Le altre carte cadono
    const fall = cards.map(() => ({
        rot:   Math.random() * 80 - 40,
        drift: Math.random() * 20 - 10,
        delay: Math.random() * 200
    }));

    cards.forEach((card, i) => {
        if (card === selectedBox) return;
        card.animate(fallFrames(card, fall[i]), {
            duration: 800,
            delay: fall[i].delay,
            easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)',
            fill: 'forwards'
        });
    });

    // 2. La carta scelta si ingrandisce al centro
    const g = popGeometry(selectedBox, ar, centerTarget(ar));
    prepBigImg(img, g);

    const pop = img.animate(
        [
            { transform: `translate(0, 0) scale(${g.sw / g.tw})` },
            { transform: `translate(${g.dx}px, ${g.dy}px) scale(1)` }
        ],
        { duration: 700, delay: 150, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' }
    );

    pop.finished.then(async () => {
        openState = { categoria, itemData, index, ar, fall };
        await renderFullscreenView(itemData, categoria, ar);
        busy = false;
    });
}

// Vista singola: la nuova vista va SOPRA la griglia, poi la griglia viene tolta
async function renderFullscreenView(itemData, categoria, ar = 1) {
    const tw = centerTarget(ar).w;   // identica all'animazione

    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <button class="back-arrow" onclick="navigateTo('${categoria}')" aria-label="Indietro">
            <img src="${BACK_ICON}" alt="">
        </button>
        <div class="fullscreen-view fullscreen-single" style="background: transparent;">
            <img src="immagini/${itemData.src}" class="fullscreen-img"
                 style="--ar:${ar}; width:${tw}px; height:auto;">
            <p class="fullscreen-caption">${itemData.descrizione || ''}</p>
        </div>
    `;

    const newImg = wrap.querySelector('.fullscreen-img');
    try { await newImg.decode(); } catch (e) {}

    const oldChildren = [...viewport.childNodes];
    viewport.append(...wrap.childNodes);

    await nextFrames(2);
    oldChildren.forEach(n => n.remove());
}

// ==========================================
// ILLUSTRAZIONI: GALLERIA A SCORRIMENTO ORIZZONTALE
// ==========================================
let galleryLayout = [];   // disposizione casuale: resta uguale quando torni dalla vista singola

function newLayout(n) {
    return Array.from({ length: n }, () => {
        const k = 0.5 + Math.random() * 0.28;           // altezza (frazione dello spazio utile)
        return { k, oy: Math.random() * (1 - k), gx: 6 + Math.random() * 12,
                 rot: Math.random() * 3.6 - 1.8, nrot: Math.random() * 8 - 4 };
    });
}

function buildGallery(dataArray, layout) {
    const items = dataArray.map((item, i) => {
        const L = layout[i];
        return `
            <figure class="gal-item" data-index="${i}" style="--k:${L.k.toFixed(3)}; --oy:${L.oy.toFixed(3)}; --gx:${L.gx.toFixed(1)}vw; --rot:${L.rot.toFixed(2)}deg;">
                <img src="immagini/${item.src}" alt="${esc(item.descrizione)}" draggable="false">
                ${item.descrizione ? `<figcaption class="gal-note" style="--nrot:${L.nrot.toFixed(1)}deg;">${esc(item.descrizione)}</figcaption>` : ''}
            </figure>`;
    }).join('');

    const el = document.createElement('div');
    el.className = 'h-gallery';
    el.id = 'h-gallery';
    el.innerHTML = `<div class="gal-track"><div class="gal-spacer"></div>${items}<div class="gal-spacer"></div></div>`;
    setupGalleryScroll(el, fig => openIllustration(fig, el, dataArray[+fig.dataset.index], +fig.dataset.index));
    return el;
}

function renderGallery(dataArray) {
    openState = null;
    galleryLayout = newLayout(dataArray.length);
    viewport.innerHTML = '';
    const el = buildGallery(dataArray, galleryLayout);
    viewport.appendChild(el);
    busy = true;
    slideEls([el], 'in').finished.then(() => { busy = false; });   // entra dall'alto
}

function setupGalleryScroll(el, onPick) {
    // La rotella del mouse scorre in orizzontale
    el.addEventListener('wheel', e => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        el.scrollLeft += e.deltaY;
    }, { passive: false });

    // Trascinamento col mouse (al tocco scorre da solo)
    let down = false, moved = false, sx = 0, sl = 0;
    el.addEventListener('pointerdown', e => {
        moved = false;
        if (e.pointerType !== 'mouse') return;
        down = true; sx = e.clientX; sl = el.scrollLeft;
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
    });
    el.addEventListener('pointermove', e => {
        if (!down) return;
        if (Math.abs(e.clientX - sx) > 5) moved = true;
        el.scrollLeft = sl - (e.clientX - sx);
    });
    const end = () => { down = false; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    // Clic su un'illustrazione (se non stavi trascinando)
    el.addEventListener('click', e => {
        if (moved) return;
        const fig = document.elementFromPoint(e.clientX, e.clientY)?.closest('.gal-item');
        if (fig) onPick(fig);
    });

    // Frecce della tastiera
    const onKey = e => {
        if (!document.body.contains(el)) return document.removeEventListener('keydown', onKey);
        if (e.key === 'ArrowRight') el.scrollBy({ left:  window.innerWidth * 0.4, behavior: 'smooth' });
        if (e.key === 'ArrowLeft')  el.scrollBy({ left: -window.innerWidth * 0.4, behavior: 'smooth' });
    };
    document.addEventListener('keydown', onKey);
}

// Dove sta ora l'immagine nella galleria (dimensione reale, senza la piccola rotazione)
function galleryRect(fig) {
    const img = fig.querySelector('img');
    const r = img.getBoundingClientRect();
    return { img, w: img.offsetWidth, cx: r.left + r.width / 2, cy: r.top + r.height / 2,
             rot: parseFloat(fig.style.getPropertyValue('--rot')) || 0 };
}

// ---------- APERTURA ILLUSTRAZIONE (stessa animazione dei fumetti) ----------
function openIllustration(fig, gal, itemData) {
    if (busy) return;
    busy = true;

    const s  = galleryRect(fig);
    const ar = (s.img.naturalWidth && s.img.naturalHeight)
        ? s.img.naturalWidth / s.img.naturalHeight : s.img.offsetWidth / s.img.offsetHeight;

    const view = prepareIllus(itemData, ar);   // vista nascosta: ci dice dove deve arrivare
    const t    = view.target;
    const fly  = makeFly(s.img.src, t);
    s.img.style.visibility = 'hidden';
    fig.querySelector('.gal-note')?.classList.add('texts-hidden');

    const flyAnim = fly.animate(
        [
            { transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w}) rotate(${s.rot}deg)`, filter: SHELF_SHADOW },
            { transform: 'none', filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }
        ],
        { duration: 700, delay: 150, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' }
    );
    const out = slideEls([gal], 'out', 100);   // la galleria sale, resta lo sfondo nero

    Promise.all([flyAnim.finished, out.finished]).then(async () => {
        openState = { categoria: 'illustrazioni', itemData, index: +fig.dataset.index, ar, target: t, scroll: gal.scrollLeft };
        await revealBook(view);                // stessa conclusione del libro
        fly.remove();
        busy = false;
    });
}

function prepareIllus(itemData, ar) {
    const tw = centerTarget(ar).w;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <button class="back-arrow pending" onclick="navigateTo('illustrazioni')" aria-label="Indietro">
            <img src="${BACK_ICON}" alt="">
        </button>
        <div class="fullscreen-view fullscreen-single illus-view pending" style="background: transparent;">
            <figure class="illus-fig" style="width:${tw}px;">
                <img src="immagini/${itemData.src}" alt="" draggable="false" style="aspect-ratio:${ar};">
                ${itemData.descrizione ? `<figcaption class="gal-note texts-hidden">${esc(itemData.descrizione)}</figcaption>` : ''}
            </figure>
        </div>`;

    const oldChildren = [...viewport.childNodes];
    viewport.append(...wrap.childNodes);

    const view  = viewport.querySelector('.illus-view');
    const arrow = viewport.querySelector('.back-arrow');
    const r = view.querySelector('.illus-fig img').getBoundingClientRect();
    return { view, arrow, oldChildren, target: { w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } };
}

// ---------- RITORNO ALLA GALLERIA ----------
async function closeIllustration() {
    busy = true;
    const { itemData, index, target: t, scroll } = openState;
    openState = null;

    const fly = makeFly('immagini/' + itemData.src, t);
    viewport.querySelectorAll('.illus-view, .back-arrow').forEach(n => n.remove());

    // La stessa galleria di prima (stessa disposizione, stessa posizione), fuori schermo in alto
    const gal = buildGallery(siteData.illustrazioni, galleryLayout);
    viewport.appendChild(gal);
    const fig  = gal.querySelector(`.gal-item[data-index="${index}"]`);
    const note = fig.querySelector('.gal-note');
    if (note) note.classList.add('texts-hidden');
    fig.querySelector('img').style.visibility = 'hidden';
    gal.style.visibility = 'hidden';

    // Le immagini devono avere le loro misure, altrimenti la galleria è ancora corta e lo scroll torna a 0
    await Promise.all([...gal.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    gal.scrollLeft = scroll;
    gal.style.visibility = '';

    const s = galleryRect(fig);

    const inn = slideEls([gal], 'in');
    const flyAnim = fly.animate(
        [
            { transform: 'none', filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' },
            { transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w}) rotate(${s.rot}deg)`, filter: SHELF_SHADOW }
        ],
        { duration: SHELF_IN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' }
    );

    Promise.all([flyAnim.finished, inn.finished]).then(() => {
        s.img.style.visibility = '';
        if (note) note.classList.remove('texts-hidden');
        fly.remove();
        busy = false;
    });
}

// ==========================================
// LIBRO (fumetti)
// ==========================================
function bookSize(ar, single) {
    const isMobile = window.innerWidth <= BOOK_MOBILE_BP;
    const spread = isMobile ? BOOK_W_SPREAD_MOBILE : BOOK_W_SPREAD;
    const maxW = window.innerWidth * (single ? BOOK_W_SINGLE : spread);
    const pw = Math.min(maxW, window.innerHeight * BOOK_H * ar);
    return { pw, ph: pw / ar };
}

// Costruisce il libro NASCOSTO sopra la libreria e misura dove sta la copertina.
// L'animazione arriva esattamente lì.
function prepareBook(itemData, ar) {
    // Pagine in ordine: copertina, poi le pagine inserite nell'admin
    const faces = [itemData.copertina, ...(itemData.pagine || [])].map(f => `immagini/${f}`);

    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <button class="back-arrow pending" onclick="navigateTo('fumetti')" aria-label="Indietro">
            <img src="${BACK_ICON}" alt="">
        </button>
        <div class="fullscreen-view book-view pending">
            <div class="book-scene">
                <h1 class="book-title texts-hidden">${itemData.titolo || ''}</h1>
                <div class="book" id="book"></div>
                <span class="book-counter texts-hidden"></span>
                <p class="book-desc texts-hidden">${itemData.descrizione || ''}</p>
            </div>
        </div>
    `;

    const oldChildren = [...viewport.childNodes];
    viewport.append(...wrap.childNodes);

    const view  = viewport.querySelector('.book-view');
    const arrow = viewport.querySelector('.back-arrow');
    const book  = view.querySelector('#book');

    book.style.transition = 'none';          // misuriamo la posizione finale, senza transizioni
    createBook(view, faces, ar);
    const r = book.querySelector('.leaf').getBoundingClientRect();
    void book.offsetWidth;
    book.style.transition = '';

    return {
        view, arrow, oldChildren,
        target: { w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
    };
}

// Fine animazione: il libro (già identico alla copertina in volo) diventa visibile
async function revealBook(b) {
    b.view.classList.remove('pending');
    b.arrow.classList.remove('pending');
    await nextFrames(2);
    b.oldChildren.forEach(n => n.remove());
    // titolo, contatore e descrizione compaiono in dissolvenza
    b.view.querySelectorAll('.texts-hidden').forEach(el => el.classList.remove('texts-hidden'));
}

function createBook(root, faces, ar) {
    const book    = root.querySelector('#book');
    const counter = root.querySelector('.book-counter');
    const total   = faces.length;
    const NEAR    = 70;           // distanza (px) a cui la pagina inizia a sollevarsi

    let single = null;
    let cur = 0;                  // quante foglie sono già state voltate
    let leaves = [];

    const maxCur = () => single ? leaves.length - 1 : leaves.length;
    const face = (side, src) =>
        `<div class="face ${side}">${src ? `<img src="${src}" alt="" draggable="false">` : ''}</div>`;

    function build() {
        const wasSingle = single;
        single = window.innerWidth <= BOOK_SINGLE_BP;
        if (wasSingle !== single) cur = 0;

        const { pw, ph } = bookSize(ar, single);
        book.style.setProperty('--pw', pw + 'px');
        book.style.setProperty('--ph', ph + 'px');
        book.classList.toggle('single', single);

        let pairs = [];
        if (single) {
            pairs = faces.map(f => [f, null]);
        } else {
            const f = [faces[0], null, ...faces.slice(1)];   // il retro della copertina è bianco
            if (f.length % 2) f.push(null);                  // numero dispari: ultima pagina bianca
            for (let i = 0; i < f.length; i += 2) pairs.push([f[i], f[i + 1]]);
        }

        book.innerHTML = pairs.map(p => `<div class="leaf">${face('front', p[0])}${face('back', p[1])}</div>`).join('');
        leaves = [...book.children];
        cur = Math.min(cur, maxCur());

        leaves.forEach((el, i) => {
            el.classList.toggle('flipped', i < cur);
            el.style.zIndex = i < cur ? i : leaves.length - i;
        });
        update();
    }

    function update() {
        book.classList.toggle('at-start', !single && cur === 0);
        book.classList.toggle('at-end',   !single && cur === leaves.length);
        const page = single ? cur + 1 : (cur === 0 ? 1 : Math.min(2 * cur, total));
        counter.textContent = `${page} / ${total}`;
    }

    // Solleva leggermente la pagina successiva (dir > 0) o precedente (dir < 0)
    function peek(dir) {
        leaves.forEach(l => l.classList.remove('peek-next', 'peek-prev'));
        if (dir > 0 && cur < maxCur()) leaves[cur].classList.add('peek-next');
        if (dir < 0 && cur > 0)        leaves[cur - 1].classList.add('peek-prev');
    }

    function go(d) {
        const next = cur + d;
        if (next < 0 || next > maxCur()) return;
        peek(0);

        const i  = d > 0 ? cur : next;
        const el = leaves[i];
        el.style.zIndex = leaves.length + 1;
        el.classList.toggle('flipped', d > 0);
        cur = next;
        update();

        setTimeout(() => {
            if (el.classList.contains('flipped') === (d > 0)) {
                el.style.zIndex = d > 0 ? i : leaves.length - i;
            }
        }, 900);
    }

    // Mouse vicino al libro: la pagina si alza
    root.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || single) return;
        const r = book.getBoundingClientRect();
        let left = r.left, right = r.right;
        if (cur === 0)             left  += r.width / 2;   // chiuso: si vede solo la copertina
        if (cur === leaves.length) right -= r.width / 2;   // finito: si vede solo la pagina sinistra

        const near = e.clientX > left - NEAR && e.clientX < right + NEAR &&
                     e.clientY > r.top - NEAR && e.clientY < r.bottom + NEAR;
        if (!near) return peek(0);

        peek(e.clientX < r.left + r.width / 2 ? -1 : 1);
    });
    root.addEventListener('pointerleave', () => peek(0));

    // Clic e scorrimento (mouse o dito)
    let sx = null;
    book.addEventListener('pointerdown', e => { sx = e.clientX; });
    book.addEventListener('pointerup', e => {
        if (sx === null) return;
        const dx = e.clientX - sx;
        sx = null;
        if (Math.abs(dx) > 40) return go(dx < 0 ? 1 : -1);
        const r = book.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        go(x < (single ? 0.3 : 0.5) ? -1 : 1);
    });

    // Tastiera e ridimensionamento: si tolgono da soli quando il libro sparisce
    const onKey = e => {
        if (!document.body.contains(book)) return cleanup();
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft')  go(-1);
    };
    const onResize = () => {
        if (!document.body.contains(book)) return cleanup();
        build();
    };
    function cleanup() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', onResize);
    }
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    build();
}

// --- BOTTONI IN BASSO ---
document.getElementById('nav-fumetti').addEventListener('click', () => navigateTo('fumetti'));
document.getElementById('nav-illustrazioni').addEventListener('click', () => navigateTo('illustrazioni'));
document.getElementById('nav-shop').addEventListener('click', () => navigateTo('shop'));
document.getElementById('nav-about').addEventListener('click', () => navigateTo('chi-sono'));
document.getElementById('nav-home').addEventListener('click', () => navigateTo('home'));

// --- AVVIO ---
renderHome();