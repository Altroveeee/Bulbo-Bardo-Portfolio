// CHI SONO: testo a sinistra, immagine grande a destra, sotto al testo le icone di Instagram e email.
// Dati letti da dati.js (blocco "chiSono"):
//   immagine  = nome del file in immagini/ (facoltativo)
//   titolo    = titolo sopra al testo (facoltativo)
//   testo     = il testo; "\n" per andare a capo
//   instagram = link intero oppure solo il nome utente (con o senza @)
//   email     = indirizzo email
// Le icone sono immagini/interfaccia/icona-instagram.png e icona-email.png:
// se un file manca, al suo posto compare la scritta.

const CHI_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

function chiLink(href, file, etichetta, esterno) {
    const a = document.createElement('a');
    a.className = 'chi-link'; a.href = href; a.title = etichetta; a.setAttribute('aria-label', etichetta);
    if (esterno) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    const img = new Image();
    img.src = 'immagini/interfaccia/' + file; img.alt = etichetta; img.draggable = false;
    img.onerror = () => { const t = document.createElement('span'); t.className = 'chi-etichetta'; t.textContent = etichetta; img.replaceWith(t); };
    a.appendChild(img);
    return a;
}

function chiIcone(d) {
    const out = [];
    const ig = String(d.instagram || '').trim();
    if (ig) {
        const url = /^https?:\/\//i.test(ig) ? ig : 'https://www.instagram.com/bulbo.bardo//' + ig.replace(/^@/, '').replace(/\/+$/, '') + '/';
        out.push(chiLink(url, 'icona-instagram.png', 'Instagram', true));
    }
    const mail = String(d.email || '').trim();
    if (mail) out.push(chiLink('mailto:' + mail, 'icona-email.png', 'Email', false));
    return out;
}

function renderChiSono(d) {
    d = d || {};
    openState = null; viewport.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'chi-sono';
    root.innerHTML = `
        <div class="chi-grid${d.immagine ? '' : ' no-img'}">
            <div class="chi-info">
                ${d.titolo ? `<h2 class="chi-titolo">${esc(d.titolo)}</h2>` : ''}
                <div class="chi-testo">${esc(d.testo || '')}</div>
                <div class="chi-social"></div>
            </div>
            <div class="chi-big">
                ${d.immagine ? `<img class="chi-img" src="immagini/${esc(d.immagine)}" alt="" draggable="false" onerror="this.style.display='none'">` : ''}
            </div>
        </div>`;
    viewport.appendChild(root);

    const social = root.querySelector('.chi-social');
    chiIcone(d).forEach(a => social.appendChild(a));
    if (!social.children.length) social.remove();

    // Entrata: il testo da sinistra, l'immagine da destra
    const info = root.querySelector('.chi-info');
    const big = root.querySelector('.chi-big');
    busy = true;
    Promise.all([
        info.animate([{ opacity: 0, transform: 'translateX(-6vw)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 520, delay: 120, easing: CHI_EASING, fill: 'backwards' }).finished,
        big.animate([{ opacity: 0, transform: 'translateX(10vw)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 520, easing: CHI_EASING, fill: 'backwards' }).finished
    ]).catch(() => {}).finally(() => { busy = false; });
}

// Chiamata da core.js quando lasci la pagina: testo e immagine escono ai lati
function leaveChiSono() {
    const root = viewport.querySelector('.chi-sono');
    if (!root) return Promise.resolve();
    const opt = { duration: 320, easing: 'cubic-bezier(0.55, 0, 0.85, 0.4)', fill: 'forwards' };
    const a = root.querySelector('.chi-info').animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-6vw)' }], opt);
    const b = root.querySelector('.chi-big').animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(8vw)' }], opt);
    return Promise.all([a.finished, b.finished]).catch(() => {});
}