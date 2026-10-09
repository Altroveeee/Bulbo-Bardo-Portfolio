// SHOP: la griglia sta in basso e sopra si apre la scheda del prodotto
// (immagine grande a destra, testo a sinistra), come una selezione di personaggio.
// Campi letti da dati.js per ogni prodotto: src (obbligatorio), copertina, titolo, descrizione, prezzo.

const SHOP_APRI_PRIMO = true;    // true = entrando nello shop è già aperto il primo personaggio
const SHOP_OUT_MS  = 220;        // uscita del contenuto che c'era
const SHOP_IN_MS   = 520;        // entrata del nuovo contenuto
const SHOP_FLIP_MS = 650;        // la griglia scende / risale

const SHOP_ARROW_IMG = 'immagini/interfaccia/freccia.png';   // la freccia (quella a sinistra; la destra è la stessa girata)

let shopToken = 0;               // se clicchi in fretta, le animazioni vecchie si fermano

// Anima un elemento da uno stato all'altro e aspetta la fine (anche se viene annullata)
function shopMove(el, from, to, ms, delay = 0) {
    return el.animate([from, to], { duration: ms, delay, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' })
        .finished.catch(() => {});
}

// Cambia il layout e fa scorrere la griglia dalla vecchia alla nuova posizione
// Le frecce (se passi "root") scorrono insieme alla griglia, perché stanno ai suoi lati
function shopFlip(el, mutate, root) {
    const y0 = el.getBoundingClientRect().top;
    mutate();
    if (root) shopPlaceArrows(root);
    const y1 = el.getBoundingClientRect().top;
    if (Math.abs(y0 - y1) < 1) return;
    const frames = [{ transform: `translateY(${y0 - y1}px)` }, { transform: 'translateY(0)' }];
    const opt = { duration: SHOP_FLIP_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };
    el.animate(frames, opt);
    if (root) (root._arrows || []).forEach(a => a.animate(frames, opt));
}

function renderShop(dataArray, startIdx = -1) {
    openState = null; viewport.innerHTML = ''; shopToken++;
    const items = (dataArray || []).map((item, i) => `
        <button class="shop-thumb" data-index="${i}" aria-pressed="false" title="${esc(item.titolo || item.descrizione || '')}">
            <img src="immagini/${item.miniatura || item.copertina || item.src}" alt="${esc(item.titolo || item.descrizione || '')}" draggable="false">
        </button>`).join('');

    const root = document.createElement('div');
    root.className = 'shop-select';
    root.innerHTML = `
        <div class="shop-stage">
            <div class="shop-info"></div>
            <div class="shop-big"></div>
        </div>
        <div class="shop-thumbs">${items}</div>`;
    viewport.appendChild(root);

    const thumbs = root.querySelector('.shop-thumbs');
    thumbs.addEventListener('click', e => {
        const b = e.target.closest('.shop-thumb');
        if (b) shopSelect(root, dataArray, Number(b.dataset.index));
    });
    shopKeys(root, dataArray);

    // Frecce ai lati (stanno nel viewport, sopra le tende, come la freccia "indietro")
    root._arrows = [-1, 1].map(dir => {
        const b = document.createElement('button');
        b.className = 'shop-arrow ' + (dir < 0 ? 'prev' : 'next') + ' off';
        b.setAttribute('aria-label', dir < 0 ? 'Personaggio precedente' : 'Personaggio successivo');
        b.innerHTML = `<img src="${SHOP_ARROW_IMG}" alt="" draggable="false">`;
        b.firstChild.onerror = function () { this.replaceWith(Object.assign(document.createElement('span'), { className: 'shop-arrow-txt', textContent: '‹' })); };
        b.addEventListener('click', () => shopStep(root, dataArray, dir));
        viewport.appendChild(b);
        return b;
    });

    shopPlaceArrows(root);
    requestAnimationFrame(() => shopPlaceArrows(root));
    window.addEventListener('resize', () => { if (document.body.contains(root)) shopPlaceArrows(root); });

    // Un personaggio è già aperto appena si entra (quello del link, oppure il primo)
    const first = dataArray.length && (startIdx >= 0 || SHOP_APRI_PRIMO) ? Math.max(0, startIdx) : -1;
    if (first >= 0) {
        root.querySelectorAll('.shop-thumb').forEach((b, k) => { b.classList.toggle('selected', k === first); b.setAttribute('aria-pressed', k === first); });
        shopFill(root, dataArray, first);
        root.classList.add('open');
        const info = root.querySelector('.shop-info'), big = root.querySelector('.shop-big');
        shopMove(info, { opacity: 0, transform: 'translateX(-6vw)' }, { opacity: 1, transform: 'translateX(0)' }, SHOP_IN_MS, 350);
        shopMove(big,  { opacity: 0, transform: 'translateX(10vw)' }, { opacity: 1, transform: 'translateX(0)' }, SHOP_IN_MS, 250);
    }

    // La griglia entra dal basso
    busy = true;
    thumbs.animate([{ transform: `translateY(${window.innerHeight * 0.7}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: SHELF_IN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' })
        .finished.then(() => { busy = false; });
    // le frecce entrano dal basso insieme alla griglia
    root._arrows.forEach(a => a.animate([{ transform: `translateY(${window.innerHeight * 0.7}px)` }, { transform: 'translateY(0)' }],
        { duration: SHELF_IN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' }));
}

// Riempie la scheda con il personaggio i (testo, immagine grande, frecce, indirizzo)
function shopFill(root, dataArray, i) {
    const item = dataArray[i];
    const stage = root.querySelector('.shop-stage');
    const info = root.querySelector('.shop-info');
    const big = root.querySelector('.shop-big');
    info.innerHTML =
        (item.titolo ? `<h2 class="shop-title">${esc(item.titolo)}</h2>` : '') +
        (item.descrizione ? `<p class="shop-desc">${esc(item.descrizione)}</p>` : '') +
        (item.prezzo ? `<p class="shop-price">${esc(item.prezzo)}</p>` : '');
    big.innerHTML = `<img class="shop-big-img" src="immagini/${item.src}" alt="" draggable="false">`;
    stage.classList.toggle('no-text', !info.innerHTML);   // senza testo l'immagine sta al centro
    root.dataset.index = i;
    (root._arrows || []).forEach(a => a.classList.toggle('off', dataArray.length < 2));
    updateUrl('shop', item, true);
}

// Le frecce stanno ai lati dei quadrati da selezionare (a sinistra del primo, a destra dell'ultimo),
// a metà altezza della griglia. Si usano le misure del layout (offset), che ignorano le animazioni in corso.
function shopPlaceArrows(root) {
    const thumbs = root.querySelector('.shop-thumbs');
    const list = [...root.querySelectorAll('.shop-thumb')];
    if (!thumbs || !root._arrows || !list.length) return;
    const GAP = 14;
    const left = Math.min(...list.map(b => b.offsetLeft));
    const right = Math.max(...list.map(b => b.offsetLeft + b.offsetWidth));
    const y = thumbs.offsetTop + thumbs.offsetHeight / 2;
    root._arrows.forEach(a => {
        const w = a.offsetWidth || 64;
        const x = a.classList.contains('prev') ? left - w - GAP : right + GAP;
        a.style.left = Math.max(0, Math.min(window.innerWidth - w, x)) + 'px';
        a.style.top = y + 'px';
    });
}

// Frecce: avanti / indietro, in tondo
function shopStep(root, dataArray, dir) {
    const n = dataArray.length;
    const open = root.classList.contains('open');
    if (n < 2 && open) return;
    if (!n) return;
    const cur = open ? Number(root.dataset.index) : (dir > 0 ? -1 : 0);
    shopSelect(root, dataArray, (cur + dir + n) % n);
}

async function shopSelect(root, dataArray, i) {
    if (busy) return;
    const t = ++shopToken;
    const stage = root.querySelector('.shop-stage');
    const info = root.querySelector('.shop-info');
    const big = root.querySelector('.shop-big');
    const thumbs = root.querySelector('.shop-thumbs');
    const wasOpen = root.classList.contains('open');
    const same = wasOpen && Number(root.dataset.index) === i;   // stesso prodotto: chiude

    root.querySelectorAll('.shop-thumb').forEach((b, k) => {
        const on = !same && k === i;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-pressed', on);
    });
    [info, big].forEach(el => el.getAnimations().forEach(a => a.cancel()));

    // 1. esce il contenuto che c'era
    if (wasOpen) {
        await Promise.all([
            shopMove(info, { opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-3vw)' }, SHOP_OUT_MS),
            shopMove(big,  { opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(4vw)' },  SHOP_OUT_MS)
        ]);
        if (t !== shopToken) return;
    }

    // 2. chiusura: la scheda sparisce e la griglia torna al centro
    if (same) {
        shopFlip(thumbs, () => {
            root.classList.remove('open'); delete root.dataset.index;
            info.innerHTML = ''; big.innerHTML = '';
        }, root);
        (root._arrows || []).forEach(a => a.classList.add('off'));
        updateUrl('shop', null, true);
        return;
    }

    // 3. nuovo prodotto
    shopFill(root, dataArray, i);
    try { await big.querySelector('img').decode(); } catch (e) {}
    if (t !== shopToken) return;

    if (!wasOpen) shopFlip(thumbs, () => root.classList.add('open'), root);
    else shopPlaceArrows(root);
    await Promise.all([
        shopMove(info, { opacity: 0, transform: 'translateX(-6vw)' }, { opacity: 1, transform: 'translateX(0)' }, SHOP_IN_MS, 120),
        shopMove(big,  { opacity: 0, transform: 'translateX(10vw)' }, { opacity: 1, transform: 'translateX(0)' }, SHOP_IN_MS)
    ]);
}

// Frecce sinistra/destra per scorrere i prodotti, Esc per chiudere
function shopKeys(root, dataArray) {
    const onKey = e => {
        if (!document.body.contains(root)) return document.removeEventListener('keydown', onKey);
        const open = root.classList.contains('open');
        const cur = open ? Number(root.dataset.index) : -1;
        if (e.key === 'ArrowRight') shopStep(root, dataArray, 1);
        else if (e.key === 'ArrowLeft') shopStep(root, dataArray, -1);
        else if (e.key === 'Escape' && open) shopSelect(root, dataArray, cur);
    };
    document.addEventListener('keydown', onKey);
}

// Chiamata da core.js quando lasci lo shop: la griglia scende, la scheda sfuma
function leaveShop() {
    const root = viewport.querySelector('.shop-select');
    if (!root) return Promise.resolve();
    shopToken++;
    const down = root.querySelector('.shop-thumbs').animate(
        [{ transform: 'translateY(0)' }, { transform: `translateY(${window.innerHeight}px)` }],
        { duration: SHELF_OUT_MS, easing: 'cubic-bezier(0.55, 0, 0.85, 0.4)', fill: 'forwards' });
    const fade = root.querySelector('.shop-stage').animate(
        [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    const arr = (root._arrows || []).map(a => a.animate([{ opacity: a.classList.contains('off') ? 0 : 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished);
    return Promise.all([down.finished, fade.finished, ...arr]).catch(() => {});
}
