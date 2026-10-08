// SHOP: la griglia sta in basso e sopra si apre la scheda del prodotto
// (immagine grande a destra, testo a sinistra), come una selezione di personaggio.
// Campi letti da dati.js per ogni prodotto: src (obbligatorio), copertina, titolo, descrizione, prezzo.

const SHOP_APRI_PRIMO = false;   // true = entrando nello shop è già aperto il primo prodotto
const SHOP_OUT_MS  = 220;        // uscita del contenuto che c'era
const SHOP_IN_MS   = 520;        // entrata del nuovo contenuto
const SHOP_FLIP_MS = 650;        // la griglia scende / risale

let shopToken = 0;               // se clicchi in fretta, le animazioni vecchie si fermano

// Anima un elemento da uno stato all'altro e aspetta la fine (anche se viene annullata)
function shopMove(el, from, to, ms, delay = 0) {
    return el.animate([from, to], { duration: ms, delay, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' })
        .finished.catch(() => {});
}

// Cambia il layout e fa scorrere la griglia dalla vecchia alla nuova posizione
function shopFlip(el, mutate) {
    const y0 = el.getBoundingClientRect().top;
    mutate();
    const y1 = el.getBoundingClientRect().top;
    if (Math.abs(y0 - y1) < 1) return;
    el.animate([{ transform: `translateY(${y0 - y1}px)` }, { transform: 'translateY(0)' }],
        { duration: SHOP_FLIP_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
}

function renderShop(dataArray) {
    openState = null; viewport.innerHTML = ''; shopToken++;
    const items = (dataArray || []).map((item, i) => `
        <button class="shop-thumb" data-index="${i}" aria-pressed="false" title="${esc(item.titolo || item.descrizione || '')}">
            <img src="immagini/${item.copertina || item.src}" alt="${esc(item.titolo || item.descrizione || '')}" draggable="false">
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

    // La griglia entra dal basso
    busy = true;
    thumbs.animate([{ transform: `translateY(${window.innerHeight * 0.7}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: SHELF_IN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' })
        .finished.then(() => { busy = false; if (SHOP_APRI_PRIMO && dataArray.length) shopSelect(root, dataArray, 0); });
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
        });
        return;
    }

    // 3. nuovo prodotto
    const item = dataArray[i];
    info.innerHTML =
        (item.titolo ? `<h2 class="shop-title">${esc(item.titolo)}</h2>` : '') +
        (item.descrizione ? `<p class="shop-desc">${esc(item.descrizione)}</p>` : '') +
        (item.prezzo ? `<p class="shop-price">${esc(item.prezzo)}</p>` : '');
    big.innerHTML = `<img class="shop-big-img" src="immagini/${item.src}" alt="" draggable="false">`;
    stage.classList.toggle('no-text', !info.innerHTML);   // senza testo l'immagine sta al centro
    root.dataset.index = i;
    try { await big.querySelector('img').decode(); } catch (e) {}
    if (t !== shopToken) return;

    if (!wasOpen) shopFlip(thumbs, () => root.classList.add('open'));
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
        if (e.key === 'ArrowRight' && cur + 1 < dataArray.length) shopSelect(root, dataArray, cur + 1);
        else if (e.key === 'ArrowLeft' && open && cur > 0) shopSelect(root, dataArray, cur - 1);
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
    return Promise.all([down.finished, fade.finished]).catch(() => {});
}
