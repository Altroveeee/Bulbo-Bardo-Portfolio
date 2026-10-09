// LOGICA LIBRERIA E FUMETTO 3D
function slideShelf(wood, grid, dir, delay = 0) { const dist = Math.max(window.innerHeight, grid.getBoundingClientRect().bottom) + 60; return slideEls([wood, grid], dir, delay, dist); }
function shownRect(img, ar) { const r = img.getBoundingClientRect(); const w = Math.min(r.width, r.height * ar); const h = w / ar; const bottom = getComputedStyle(img).objectPosition.split(' ')[1] === '100%'; return { w, h, cx: r.left + r.width / 2, cy: bottom ? r.bottom - h / 2 : r.top + r.height / 2 }; }
function makeFly(src, t) { const f = document.createElement('img'); f.src = src; f.className = 'fly'; f.draggable = false; f.style.left = (t.cx - t.w / 2) + 'px'; f.style.top = (t.cy - t.h / 2) + 'px'; f.style.width = t.w + 'px'; f.style.height = t.h + 'px'; viewport.appendChild(f); return f; }

function openComic(selectedBox, grid, itemData) {
    if (busy) return; busy = true; updateUrl('fumetti', itemData); const wood = viewport.querySelector('.shelf-wood'); const index = [...grid.children].indexOf(selectedBox);
    const img = selectedBox.querySelector('img'); const ar = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : selectedBox.offsetWidth / selectedBox.offsetHeight;
    const s = shownRect(img, ar); const book = prepareBook(itemData, ar); const t = book.target; const fly = makeFly(img.src, t); img.style.visibility = 'hidden';
    const flyAnim = fly.animate([{ transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w})`}, { transform: 'none'}], { duration: 700, delay: 150, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' });
    const shelf = slideShelf(wood, grid, 'out', 100);
    Promise.all([flyAnim.finished, shelf.finished]).then(async () => { openState = { categoria: 'fumetti', itemData, index, ar, target: t }; await revealBook(book); fly.remove(); busy = false; });
}

// Apertura diretta da link condiviso (#/fumetti/nome): niente scaffale, si vede subito il fumetto
async function openComicDirect(index) {
    const itemData = siteData.fumetti[index];
    busy = true; viewport.innerHTML = '';
    const ar = await imgAspect('immagini/' + itemData.copertina);
    if (currentPage !== 'fumetti') { busy = false; return; }
    const book = prepareBook(itemData, ar);
    openState = { categoria: 'fumetti', itemData, index, ar, target: book.target };
    await revealBook(book); busy = false;
}

async function closeComic() {
    busy = true; const { itemData, index, ar, target: t } = openState;
    // 1. il libro si richiude dal punto in cui eri arrivato; titolo, contatore e freccia sfumano
    const bookEl = viewport.querySelector('#book');
    viewport.querySelectorAll('.book-title, .book-counter, .book-desc').forEach(n => n.classList.add('texts-hidden'));
    const arrow = viewport.querySelector('.back-arrow'); if (arrow) { arrow.style.transition = 'opacity 0.3s'; arrow.style.opacity = '0'; arrow.style.pointerEvents = 'none'; }
    // lo scaffale si prepara (e le copertine si decodificano) mentre le pagine si chiudono, così dopo non ci sono scatti
    const grid = buildGrid(siteData.fumetti, 'fumetti');

    // Inibizione brutale delle animazioni di ingresso
    grid.style.animation = 'none';
    Array.from(grid.children).forEach(box => {
        box.style.animation = 'none';
        const img = box.querySelector('img');
        if (img) img.style.animation = 'none';
        box.style.transition = 'none'; // Opzionale, previene sbalzi di transizione
    });
    const pronto = Promise.all([...grid.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    if (bookEl && bookEl._closeAll) await bookEl._closeAll();
    await pronto;
    // 2. il fumetto chiuso torna sullo scaffale
    updateUrl('fumetti', null);
    openState = null;
    
    // PRIMA appendiamo la griglia al DOM...
    const wood = document.createElement('div'); 
    wood.className = 'shelf-wood'; 
    viewport.append(wood, grid);
    
    // ...così possiamo recuperare la sua immagine esatta (già scaricata e in cache)
    const img = grid.children[index].querySelector('img'); 
    const s = shownRect(img, ar); 
    img.style.visibility = 'hidden';
    
    // ORA creiamo l'animazione di volo usando "img.src" invece del percorso testuale!
    const fly = makeFly(img.src, t); 
    viewport.querySelectorAll('.book-view, .back-arrow').forEach(n => n.remove());
    
    const shelf = slideShelf(wood, grid, 'in');
    const flyAnim = fly.animate([{ transform: 'none', }, { transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w})`}], { duration: SHELF_IN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });
    Promise.all([flyAnim.finished, shelf.finished]).then(() => { img.style.visibility = ''; fly.remove(); busy = false; });
}

function bookSize(ar, single) { const isMobile = window.innerWidth <= BOOK_MOBILE_BP; const spread = isMobile ? BOOK_W_SPREAD_MOBILE : BOOK_W_SPREAD; const maxW = window.innerWidth * (single ? BOOK_W_SINGLE : spread); const pw = Math.min(maxW, window.innerHeight * BOOK_H * ar); return { pw, ph: pw / ar }; }
function prepareBook(itemData, ar) {
    const faces = [itemData.copertina, ...(itemData.pagine || [])].map(f => `immagini/${f}`);
    const wrap = document.createElement('div'); wrap.innerHTML = `<button class="back-arrow pending" onclick="navigateTo('fumetti')">${BACK_ARROW_IMG}</button><div class="fullscreen-view book-view pending"><div class="book-scene"><h1 class="book-title texts-hidden">${itemData.titolo || ''}</h1><div class="book" id="book"></div><span class="book-counter texts-hidden"></span><p class="book-desc texts-hidden">${itemData.descrizione || ''}</p></div></div>`;
    const oldChildren = [...viewport.childNodes]; viewport.append(...wrap.childNodes);
    const view = viewport.querySelector('.book-view'); const arrow = viewport.querySelector('.back-arrow'); const book = view.querySelector('#book');
    book.style.transition = 'none'; createBook(view, faces, ar); const r = book.querySelector('.leaf').getBoundingClientRect(); void book.offsetWidth; book.style.transition = '';
    return { view, arrow, oldChildren, target: { w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } };
}
async function revealBook(b) { b.view.classList.remove('pending'); b.arrow.classList.remove('pending'); await nextFrames(2); b.oldChildren.forEach(n => n.remove()); b.view.querySelectorAll('.texts-hidden').forEach(el => el.classList.remove('texts-hidden')); }

function createBook(root, faces, ar) {
    const book = root.querySelector('#book'); const counter = root.querySelector('.book-counter'); const total = faces.length; const NEAR = 70;
    let single = null; let cur = 0; let leaves = [];
    const maxCur = () => single ? leaves.length - 1 : leaves.length;
    const face = (side, src) => `<div class="face ${side}">${src ? `<img src="${src}" alt="" draggable="false">` : ''}</div>`;
    
    function build() {
        const wasSingle = single; single = window.innerWidth <= BOOK_SINGLE_BP; if (wasSingle !== single) cur = 0;
        const { pw, ph } = bookSize(ar, single); book.style.setProperty('--pw', pw + 'px'); book.style.setProperty('--ph', ph + 'px'); book.classList.toggle('single', single);
        let pairs = [];
        if (single) pairs = faces.map(f => [f, null]);
        else { const f = [faces[0], null, ...faces.slice(1)]; if (f.length % 2) f.push(null); for (let i = 0; i < f.length; i += 2) pairs.push([f[i], f[i + 1]]); }
        book.innerHTML = pairs.map(p => `<div class="leaf">${face('front', p[0])}${face('back', p[1])}</div>`).join('');
        leaves = [...book.children]; cur = Math.min(cur, maxCur());
        leaves.forEach((el, i) => { el.classList.toggle('flipped', i < cur); el.style.zIndex = i < cur ? i : leaves.length - i; }); update(); showNear(); warmNear();
    }

    // Solo le pagine vicine a quella aperta esistono per il browser (le altre sono display:none):
    // meno strati 3D e meno immagini da decodificare insieme = niente scatti
    function showNear() { leaves.forEach((l, i) => l.classList.toggle('far', i < cur - 3 || i > cur + 2)); }
    function warmNear() { leaves.forEach((l, i) => { if (i >= cur - 2 && i <= cur + 3) l.querySelectorAll('img').forEach(im => { if (im.decode) im.decode().catch(() => {}); }); }); }
    
    function update() { book.classList.toggle('at-start', !single && cur === 0); book.classList.toggle('at-end', !single && cur === leaves.length); const page = single ? cur + 1 : (cur === 0 ? 1 : Math.min(2 * cur, total)); counter.textContent = `${page} / ${total}`; }
    function peek(dir) { leaves.forEach(l => l.classList.remove('peek-next', 'peek-prev')); if (dir > 0 && cur < maxCur()) leaves[cur].classList.add('peek-next'); if (dir < 0 && cur > 0) leaves[cur - 1].classList.add('peek-prev'); }
    let closing = false;   // durante la chiusura i clic/tasti non girano le pagine
    function go(d, force) { if (closing && !force) return; const next = cur + d; if (next < 0 || next > maxCur()) return; peek(0); const i = d > 0 ? cur : next; const el = leaves[i]; el.style.zIndex = leaves.length + 1; el.classList.toggle('flipped', d > 0); cur = next; update(); showNear(); warmNear(); setTimeout(() => { if (el.classList.contains('flipped') === (d > 0)) el.style.zIndex = d > 0 ? i : leaves.length - i; }, 900); }
    
    root.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || single) return; const r = book.getBoundingClientRect(); let left = r.left, right = r.right; if (cur === 0) left += r.width / 2; if (cur === leaves.length) right -= r.width / 2; const near = e.clientX > left - NEAR && e.clientX < right + NEAR && e.clientY > r.top - NEAR && e.clientY < r.bottom + NEAR; if (!near) return peek(0); peek(e.clientX < r.left + r.width / 2 ? -1 : 1); });
    root.addEventListener('pointerleave', () => peek(0));
    let sx = null; book.addEventListener('pointerdown', e => { sx = e.clientX; }); book.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) return go(dx < 0 ? 1 : -1); const r = book.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width; go(x < (single ? 0.3 : 0.5) ? -1 : 1); });
    const onKey = e => { if (!document.body.contains(book)) return cleanup(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    // Su telefono la barra del browser che appare/scompare fa partire "resize": si ricostruisce solo se la misura cambia davvero
    let lastW = window.innerWidth, lastH = window.innerHeight, resizeT = 0;
    const onResize = () => {
        if (!document.body.contains(book)) return cleanup();
        clearTimeout(resizeT);
        resizeT = setTimeout(() => {
            const w = window.innerWidth, h = window.innerHeight;
            if (w === lastW && Math.abs(h - lastH) < 150) return;
            lastW = w; lastH = h; build();
        }, 200);
    };
    function cleanup() { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); }
    document.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);

    // Chiusura: si vedono girare indietro solo le ultime pagine (al massimo 3, veloci), le altre tornano chiuse subito sotto.
    // Così il libro si richiude "da dove eri" ma senza far scorrere decine di pagine in 3D (che faceva scattare).
    // Le foto di tutte le pagine vengono decodificate prima, così durante il giro sono già pronte (senza apparire dopo, una alla volta)
    book._warm = warmNear;
    book._closeAll = () => Promise.resolve().then(() => {
        leaves[0].classList.remove('far');
        return Promise.all([...leaves[0].querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    }).then(() => nextFrames(2)).then(() => new Promise(res => {
        closing = true; peek(0);
        if (cur <= 0) return nextFrames(2).then(res);
        
        const DUR = 450;
        
        // 1. Chiudiamo subito le pagine interne e lasciamo solo la copertina a sinistra
        for (let i = 1; i < cur; i++) {
            const l = leaves[i]; 
            l.style.transition = 'none'; 
            l.classList.remove('flipped'); 
            l.style.zIndex = leaves.length - i; 
        }
        
        // Il libro si ritrova ora alla "prima pagina" (solo la copertina è aperta)
        cur = 1; update();
        
        // 2. Animiamo la copertina che si chiude
        setTimeout(() => { 
            leaves[0].style.transitionDuration = DUR + 'ms'; 
            go(-1, true); 
        }, 50);
        
        // 3. Ripristino finale
        setTimeout(() => {
            book.style.transition = 'none';
            leaves.forEach((l, i) => { l.style.transition = 'none'; l.classList.remove('flipped'); l.style.zIndex = leaves.length - i; });
            cur = 0; update();
            void book.offsetWidth;
            nextFrames(2).then(res);
        }, DUR + 100);
    }));
    build();
}