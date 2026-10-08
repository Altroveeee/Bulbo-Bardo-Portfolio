// GRIGLIA SHOP
function buildGrid(dataArray, categoria) {
    const grid = document.createElement('div');
    grid.id = 'gallery-grid'; grid.className = 'gallery-grid cat-' + categoria;
    dataArray.forEach(item => {
        const box = document.createElement('div'); box.className = 'gallery-item';
        const img = document.createElement('img'); img.src = `immagini/${item.copertina ? item.copertina : item.src}`; img.alt = item.titolo || ''; img.draggable = false;
        box.appendChild(img);
        box.addEventListener('click', () => { if (categoria === 'fumetti' && window.openComic) openComic(box, grid, item); else triggerFullscreen(box, grid, item, categoria); });
        grid.appendChild(box);
    });
    return grid;
}

function renderGrid(dataArray, categoria) {
    viewport.innerHTML = '';
    let wood = null;
    if (categoria === 'fumetti') { wood = document.createElement('div'); wood.className = 'shelf-wood'; viewport.appendChild(wood); }
    const grid = buildGrid(dataArray, categoria); viewport.appendChild(grid);
    if (wood && window.slideShelf) { busy = true; slideShelf(wood, grid, 'in').finished.then(() => { busy = false; }); }
}

function centerTarget(ar) { const w = Math.min(window.innerWidth * POP_W, window.innerHeight * POP_H * ar); return { w, h: w / ar, cx: window.innerWidth / 2, cy: window.innerHeight / 2 }; }
function popGeometry(box, ar, t) { const b = box.getBoundingClientRect(); return { tw: t.w, th: t.h, sw: Math.min(b.width, b.height * ar), dx: t.cx - (b.left + b.width / 2), dy: t.cy - (b.top + b.height / 2) }; }
function prepBigImg(img, g) { img.style.position = 'absolute'; img.style.left = '50%'; img.style.top = '50%'; img.style.width = g.tw + 'px'; img.style.height = g.th + 'px'; img.style.marginLeft = (-g.tw / 2) + 'px'; img.style.marginTop = (-g.th / 2) + 'px'; img.style.maxWidth = 'none'; }
function resetBigImg(img) { ['position', 'left', 'top', 'width', 'height', 'marginLeft', 'marginTop', 'maxWidth'].forEach(p => img.style[p] = ''); }
function fallFrames(card, p) { const drop = window.innerHeight - card.getBoundingClientRect().top + 200; return [{ transform: 'translate(0, 0) rotate(0deg)' }, { transform: `translate(${p.drift}vw, ${drop}px) rotate(${p.rot}deg)` }]; }

function triggerFullscreen(selectedBox, container, itemData, categoria) {
    if (busy || container.classList.contains('falling-cards-active')) return;
    busy = true; container.classList.add('falling-cards-active'); selectedBox.classList.add('selected');
    const cards = [...container.children]; const index = cards.indexOf(selectedBox);
    const img = selectedBox.querySelector('img'); const ar = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : selectedBox.offsetWidth / selectedBox.offsetHeight;
    const fall = cards.map(() => ({ rot: Math.random() * 80 - 40, drift: Math.random() * 20 - 10, delay: Math.random() * 200 }));
    cards.forEach((card, i) => { if (card === selectedBox) return; card.animate(fallFrames(card, fall[i]), { duration: 800, delay: fall[i].delay, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)', fill: 'forwards' }); });
    const g = popGeometry(selectedBox, ar, centerTarget(ar)); prepBigImg(img, g);
    const pop = img.animate([{ transform: `translate(0, 0) scale(${g.sw / g.tw})` }, { transform: `translate(${g.dx}px, ${g.dy}px) scale(1)` }], { duration: 700, delay: 150, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' });
    pop.finished.then(async () => { openState = { categoria, itemData, index, ar, fall }; await renderFullscreenView(itemData, categoria, ar); busy = false; });
}

async function renderFullscreenView(itemData, categoria, ar = 1) {
    const tw = centerTarget(ar).w; const wrap = document.createElement('div');
    wrap.innerHTML = `<button class="back-arrow" onclick="navigateTo('${categoria}')"><img src="${BACK_ICON}" alt=""></button><div class="fullscreen-view fullscreen-single" style="background: transparent;"><img src="immagini/${itemData.src}" class="fullscreen-img" style="--ar:${ar}; width:${tw}px; height:auto;"><p class="fullscreen-caption">${itemData.descrizione || ''}</p></div>`;
    const newImg = wrap.querySelector('.fullscreen-img'); try { await newImg.decode(); } catch (e) {}
    const oldChildren = [...viewport.childNodes]; viewport.append(...wrap.childNodes);
    await nextFrames(2); oldChildren.forEach(n => n.remove());
}

// ILLUSTRAZIONI ORIZZONTALI
let galleryLayout = [];
function newLayout(n) { return Array.from({ length: n }, () => { const k = 0.5 + Math.random() * 0.28; return { k, oy: Math.random() * (1 - k), gx: 6 + Math.random() * 12, rot: Math.random() * 3.6 - 1.8, nrot: Math.random() * 8 - 4 }; }); }
function buildGallery(dataArray, layout) {
    const items = dataArray.map((item, i) => { const L = layout[i]; return `<figure class="gal-item" data-index="${i}" style="--k:${L.k.toFixed(3)}; --oy:${L.oy.toFixed(3)}; --gx:${L.gx.toFixed(1)}vw; --rot:${L.rot.toFixed(2)}deg;"><img src="immagini/${item.src}" alt="${esc(item.descrizione)}" draggable="false">${item.descrizione ? `<figcaption class="gal-note" style="--nrot:${L.nrot.toFixed(1)}deg;">${esc(item.descrizione)}</figcaption>` : ''}</figure>`; }).join('');
    const el = document.createElement('div'); el.className = 'h-gallery'; el.id = 'h-gallery'; el.innerHTML = `<div class="gal-track"><div class="gal-spacer"></div>${items}<div class="gal-spacer"></div></div>`;
    setupGalleryScroll(el, fig => openIllustration(fig, el, dataArray[+fig.dataset.index], +fig.dataset.index)); return el;
}
function renderGallery(dataArray) { openState = null; galleryLayout = newLayout(dataArray.length); viewport.innerHTML = ''; const el = buildGallery(dataArray, galleryLayout); viewport.appendChild(el); busy = true; slideEls([el], 'in').finished.then(() => { busy = false; }); }
function setupGalleryScroll(el, onPick) {
    el.addEventListener('wheel', e => { if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; e.preventDefault(); el.scrollLeft += e.deltaY; }, { passive: false });
    let down = false, moved = false, sx = 0, sl = 0;
    el.addEventListener('pointerdown', e => { moved = false; if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = el.scrollLeft; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); });
    el.addEventListener('pointermove', e => { if (!down) return; if (Math.abs(e.clientX - sx) > 5) moved = true; el.scrollLeft = sl - (e.clientX - sx); });
    const end = () => { down = false; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('click', e => { if (moved) return; const fig = document.elementFromPoint(e.clientX, e.clientY)?.closest('.gal-item'); if (fig) onPick(fig); });
    const onKey = e => { if (!document.body.contains(el)) return document.removeEventListener('keydown', onKey); if (e.key === 'ArrowRight') el.scrollBy({ left: window.innerWidth * 0.4, behavior: 'smooth' }); if (e.key === 'ArrowLeft') el.scrollBy({ left: -window.innerWidth * 0.4, behavior: 'smooth' }); };
    document.addEventListener('keydown', onKey);
}
function galleryRect(fig) { const img = fig.querySelector('img'); const r = img.getBoundingClientRect(); return { img, w: img.offsetWidth, cx: r.left + r.width / 2, cy: r.top + r.height / 2, rot: parseFloat(fig.style.getPropertyValue('--rot')) || 0 }; }

function openIllustration(fig, gal, itemData) {
    if (busy) return; busy = true; const s = galleryRect(fig); const ar = (s.img.naturalWidth && s.img.naturalHeight) ? s.img.naturalWidth / s.img.naturalHeight : s.img.offsetWidth / s.img.offsetHeight;
    const view = prepareIllus(itemData, ar); const t = view.target; const fly = makeFly(s.img.src, t); s.img.style.visibility = 'hidden'; fig.querySelector('.gal-note')?.classList.add('texts-hidden');
    const flyAnim = fly.animate([{ transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w}) rotate(${s.rot}deg)` }, { transform: 'none', filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }], { duration: 700, delay: 150, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' });
    const out = slideEls([gal], 'out', 100);
    Promise.all([flyAnim.finished, out.finished]).then(async () => { openState = { categoria: 'illustrazioni', itemData, index: +fig.dataset.index, ar, target: t, scroll: gal.scrollLeft }; await revealBook(view); fly.remove(); busy = false; });
}
function prepareIllus(itemData, ar) {
    const tw = centerTarget(ar).w; const wrap = document.createElement('div');
    wrap.innerHTML = `<button class="back-arrow pending" onclick="navigateTo('illustrazioni')"><img src="${BACK_ICON}" alt=""></button><div class="fullscreen-view fullscreen-single illus-view pending" style="background: transparent;"><figure class="illus-fig" style="width:${tw}px;"><img src="immagini/${itemData.src}" alt="" draggable="false" style="aspect-ratio:${ar};">${itemData.descrizione ? `<figcaption class="gal-note texts-hidden">${esc(itemData.descrizione)}</figcaption>` : ''}</figure></div>`;
    const oldChildren = [...viewport.childNodes]; viewport.append(...wrap.childNodes); const view = viewport.querySelector('.illus-view'); const arrow = viewport.querySelector('.back-arrow'); const r = view.querySelector('.illus-fig img').getBoundingClientRect();
    return { view, arrow, oldChildren, target: { w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } };
}

// LOGICA DI RITORNO CHIUSURA PER GALLERIA E SHOP
function closeView() {
    if (busy || !openState) return;
    if (openState.categoria === 'fumetti' && window.closeComic) { closeComic(); return; }
    if (openState.categoria === 'illustrazioni') { closeIllustration(); return; }
    busy = true; const { categoria, index, ar, fall } = openState; openState = null;
    renderGrid(siteData[categoria], categoria); const container = document.getElementById('gallery-grid'); container.classList.add('falling-cards-active');
    const cards = [...container.children]; const box = cards[index]; const img = box.querySelector('img'); box.classList.add('selected');
    const g = popGeometry(box, ar, centerTarget(ar)); prepBigImg(img, g);
    cards.forEach((card, i) => { if (card === box) return; card.animate(fallFrames(card, fall[i]).reverse(), { duration: 700, delay: fall[i].delay, easing: 'cubic-bezier(0.1, 0.6, 0.5, 1)', fill: 'both' }); });
    img.animate([{ transform: `translate(${g.dx}px, ${g.dy}px) scale(1)` }, { transform: `translate(0, 0) scale(${g.sw / g.tw})` }], { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    Promise.all(container.getAnimations({ subtree: true }).map(a => a.finished)).then(() => { resetBigImg(img); container.getAnimations({ subtree: true }).forEach(a => a.cancel()); box.classList.remove('selected'); container.classList.remove('falling-cards-active'); busy = false; });
}
async function closeIllustration() {
    busy = true; const { itemData, index, target: t, scroll } = openState; openState = null;
    const fly = makeFly('immagini/' + itemData.src, t); viewport.querySelectorAll('.illus-view, .back-arrow').forEach(n => n.remove());
    const gal = buildGallery(siteData.illustrazioni, galleryLayout); viewport.appendChild(gal); const fig = gal.querySelector(`.gal-item[data-index="${index}"]`); const note = fig.querySelector('.gal-note'); if (note) note.classList.add('texts-hidden'); fig.querySelector('img').style.visibility = 'hidden'; gal.style.visibility = 'hidden';
    await Promise.all([...gal.querySelectorAll('img')].map(i => i.decode().catch(() => {}))); gal.scrollLeft = scroll; gal.style.visibility = '';
    const s = galleryRect(fig); const inn = slideEls([gal], 'in'); const flyAnim = fly.animate([{ transform: 'none', filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }, { transform: `translate(${s.cx - t.cx}px, ${s.cy - t.cy}px) scale(${s.w / t.w}) rotate(${s.rot}deg)` }], { duration: SHELF_IN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });
    Promise.all([flyAnim.finished, inn.finished]).then(() => { s.img.style.visibility = ''; if (note) note.classList.remove('texts-hidden'); fly.remove(); busy = false; });
}