// ==========================================
// admin.js - VERSIONE BLINDATA E ANTI-BLOCCO
// ==========================================

const $ = id => document.getElementById(id);

// --- 0. SCUDO GLOBALE E GESTIONE CARICAMENTO ---
window.addEventListener("dragover", function(e) { e.preventDefault(); });
window.addEventListener("drop", function(e) { e.preventDefault(); });

function mostraLoader() { $('loader-overlay').style.display = 'flex'; }
function nascondiLoader() { $('loader-overlay').style.display = 'none'; }

// IL PARACADUTE: Se si blocca, basta cliccare la schermata per farla sparire!
$('loader-overlay').addEventListener('click', nascondiLoader);

// Avviso "modifiche non salvate"
let modificato = false;
function segnaModificato() {
    modificato = true;
    const f = $('dirty-flag');
    if (f) f.style.display = 'block';
}
window.addEventListener('beforeunload', (e) => {
    if (modificato) { e.preventDefault(); e.returnValue = ''; }
});

// --- 1. MOTORE DI ESPORTAZIONE ---
function esportaDati() {
    const contenutoJS = `const siteData = ${JSON.stringify(siteData, null, 4)};`;
    const blob = new Blob([contenutoJS], { type: 'text/javascript' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dati.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    modificato = false;
    const f = $('dirty-flag');
    if (f) f.style.display = 'none';
    renderGestione();
    alert("Scarico completato! Sostituisci il file dati.js nella cartella del sito.");
}

// --- 2. AGGIUNTA ALLA LISTA (il file si scarica solo con "Genera file dati.js") ---
function numero(id, def) { const n = parseFloat($(id).value); return isNaN(n) ? def : n; }

function aggiungiSticker() {
    const img = $('sticker-img').value.trim();
    if (!img) return alert("Trascina prima l'immagine dello sticker!");
    const s = {
        id: 'sticker_' + Date.now(), src: img,
        startX: numero('sticker-x', 40), startY: numero('sticker-y', 40), rotDesktop: numero('sticker-rot', 0), wDesktop: numero('sticker-w', 150),
        startX_mobile: numero('sticker-x-mobile', 35), startY_mobile: numero('sticker-y-mobile', 40), rotMobile: numero('sticker-rot-mobile', 0), wMobile: numero('sticker-w-mobile', 100),
        targetPage: $('sticker-target').value
    };
    const nome = $('sticker-nome').value.trim();
    if (nome) s.nome = nome;
    (siteData.stickers = siteData.stickers || []).push(s);
    finisciAggiunta('stickers');
}

function aggiungiSingola() {
    const sez = sezioneAttiva === 'shop' ? 'shop' : 'illustrazioni';
    const img = $('singola-img').value.trim();
    if (!img) return alert("Trascina prima l'immagine!");
    const o = { id: Date.now(), src: img, descrizione: $('singola-desc').value };
    if (sez === 'shop') {
        const t = $('singola-titolo').value.trim(); const p = $('singola-prezzo').value.trim();
        if (t) o.titolo = t;
        if (p) o.prezzo = p;
    }
    (siteData[sez] = siteData[sez] || []).push(o);
    finisciAggiunta(sez);
}

function aggiungiFumetto() {
    const titolo = $('fumetto-titolo').value.trim();
    const cover = $('fumetto-cover').value.trim();
    if (!cover || !titolo) return alert("Titolo e Copertina sono obbligatori!");
    const pagine = $('fumetto-pagine').value.split(',').map(nome => nome.trim()).filter(nome => nome !== "");
    (siteData.fumetti = siteData.fumetti || []).push({
        id: Date.now(), titolo: titolo, copertina: cover, descrizione: $('fumetto-desc').value, pagine: pagine
    });
    finisciAggiunta('fumetti');
}

function finisciAggiunta(sez) {
    segnaModificato();
    resetForm(sez);
    pannelloAperto = false;
    sezioneAttiva = sez;
    renderGestione();
    const ultima = document.querySelector('#gestione-lista > .item-row:last-child');
    if (ultima) ultima.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetZona(id) { const z = $(id); if (z && z.dataset.orig !== undefined) z.textContent = z.dataset.orig; }

function resetForm(sez) {
    if (sez === 'stickers') {
        $('sticker-img').value = ''; $('sticker-nome').value = '';
        const def = { 'sticker-x': 40, 'sticker-y': 40, 'sticker-rot': 0, 'sticker-w': 150, 'sticker-x-mobile': 35, 'sticker-y-mobile': 40, 'sticker-rot-mobile': 0, 'sticker-w-mobile': 100 };
        Object.entries(def).forEach(([id, v]) => { $(id).value = v; });
        ['nuovo-sticker-desktop', 'nuovo-sticker-mobile'].forEach(id => { const i = $(id); i.removeAttribute('src'); i.style.display = 'none'; });
        resetZona('drop-sticker');
        mappe.forEach(m => m());
    } else if (sez === 'fumetti') {
        ['fumetto-titolo', 'fumetto-cover', 'fumetto-desc', 'fumetto-pagine'].forEach(id => { $(id).value = ''; });
        resetZona('drop-fumetto-cover'); resetZona('drop-fumetto-pagine');
        anteprimaFumetto.cover = null; anteprimaFumetto.pagine = [];
        renderAnteprimaFumetto();
    } else {
        ['singola-img', 'singola-desc', 'singola-titolo', 'singola-prezzo'].forEach(id => { $(id).value = ''; });
        resetZona('drop-singola');
    }
}

// --- 3. DRAG & DROP BASE (Immagini Singole) ---
function abilitaDragAndDrop(zonaId, inputId) {
    const zona = $(zonaId);
    const input = $(inputId);
    if(!zona) return;

    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('dragover'); });
    zona.addEventListener('dragleave', () => { zona.classList.remove('dragover'); });
    zona.addEventListener('drop', (e) => {
        e.preventDefault(); zona.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            mostraLoader();

            // LA CORREZIONE: Salviamo il nome SUBITO, prima che il browser svuoti la memoria
            const nomeFile = e.dataTransfer.files[0].name;

            setTimeout(() => {
                try {
                    input.value = nomeFile;
                    zona.textContent = `File letto: ${nomeFile}`;
                } finally {
                    nascondiLoader();
                }
            }, 300);
        }
    });
}

// --- 4. STICKERS: ANTEPRIMA IN SCALA REALE ---
// Sul sito lo sticker ha l'angolo in alto a sinistra a X% / Y% dello schermo,
// è largo esattamente "Largh." pixel e ruota attorno al proprio centro.
// Qui gli schermi hanno la proporzione di uno schermo vero e le misure in px
// sono ridotte nella stessa scala, quindi si vede la stessa cosa.
const RIF = { pc: { w: 1440, h: 800 }, tel: { w: 390, h: 780 } };

function posizionaSticker(img, ref, x, y, rot, w) {
    img.style.left = x + '%';
    img.style.top = y + '%';
    img.style.width = (w / ref.w * 100) + '%';
    img.style.transform = `rotate(${rot}deg)`;
}

// Gli sticker già presenti, sfumati, nello stesso identico modo in cui li legge core.js
function disegnaStickerEsistenti() {
    [['sticker-preview-desktop', 'nuovo-sticker-desktop', RIF.pc, false], ['sticker-preview-mobile', 'nuovo-sticker-mobile', RIF.tel, true]].forEach(([areaId, nuovoId, ref, mob]) => {
        const area = $(areaId); const nuovo = $(nuovoId);
        if (!area || !nuovo) return;
        area.querySelectorAll('img.vecchio').forEach(n => n.remove());
        (siteData.stickers || []).forEach(s => {
            const x = mob && s.startX_mobile !== undefined ? s.startX_mobile : s.startX;
            const y = mob && s.startY_mobile !== undefined ? s.startY_mobile : s.startY;
            const rot = mob ? (s.rotMobile !== undefined ? s.rotMobile : (s.rotDesktop || 0)) : (s.rotDesktop || 0);
            const w = mob ? (s.wMobile !== undefined ? s.wMobile : (s.wDesktop || 150)) : (s.wDesktop || 150);
            const img = document.createElement('img');
            img.className = 'st vecchio'; img.alt = ''; img.draggable = false; img.title = s.nome || s.src;
            img.src = 'immagini/' + s.src;
            posizionaSticker(img, ref, x, y, rot, w);
            area.insertBefore(img, nuovo);
        });
    });
}

// Collega i 4 campi numerici allo sticker nuovo e lo rende trascinabile (mouse e dito)
function creaMappa(areaId, imgId, ref, idX, idY, idRot, idW) {
    const area = $(areaId); const img = $(imgId);
    const inX = $(idX), inY = $(idY), inRot = $(idRot), inW = $(idW);
    const applica = () => posizionaSticker(img, ref, parseFloat(inX.value) || 0, parseFloat(inY.value) || 0, parseFloat(inRot.value) || 0, parseFloat(inW.value) || 150);
    [inX, inY, inRot, inW].forEach(i => i.addEventListener('input', applica));

    const limita = v => Math.max(-20, Math.min(120, Math.round(v * 10) / 10));
    let drag = null;
    img.addEventListener('pointerdown', (e) => {
        e.preventDefault(); img.setPointerCapture(e.pointerId); img.style.cursor = 'grabbing';
        drag = { cx: e.clientX, cy: e.clientY, x: parseFloat(inX.value) || 0, y: parseFloat(inY.value) || 0 };
    });
    img.addEventListener('pointermove', (e) => {
        if (!drag) return;
        inX.value = limita(drag.x + (e.clientX - drag.cx) / area.clientWidth * 100);
        inY.value = limita(drag.y + (e.clientY - drag.cy) / area.clientHeight * 100);
        applica();
    });
    const fine = () => { drag = null; img.style.cursor = ''; };
    img.addEventListener('pointerup', fine); img.addEventListener('pointercancel', fine);

    applica();
    return applica;
}

function abilitaDragAndDropSticker(zonaId, inputId) {
    const zona = $(zonaId);
    const input = $(inputId);
    const prevDesktop = $('nuovo-sticker-desktop');
    const prevMobile = $('nuovo-sticker-mobile');

    if(!zona) return;
    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('dragover'); });
    zona.addEventListener('dragleave', () => { zona.classList.remove('dragover'); });
    zona.addEventListener('drop', (e) => {
        e.preventDefault(); zona.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            mostraLoader();
            const file = e.dataTransfer.files[0];

            setTimeout(() => {
                try {
                    input.value = file.name;
                    zona.textContent = `File letto: ${file.name}`;
                    const reader = new FileReader();
                    reader.onload = function(evento) {
                        [prevDesktop, prevMobile].forEach(p => { if (p) { p.src = evento.target.result; p.style.display = 'block'; } });
                        mappe.forEach(m => m());
                        nascondiLoader();
                    };
                    reader.onerror = () => nascondiLoader();
                    reader.readAsDataURL(file);
                } catch (err) {
                    nascondiLoader();
                }
            }, 300);
        }
    });
}

// --- 5. DRAG & DROP FUMETTO (Anteprima a libro aperto) ---
// Le pagine vengono mostrate a coppie, una coppia sotto l'altra, come nel libro:
// prima riga = [vuoto | copertina], poi [pag.1 | pag.2], [pag.3 | pag.4]...
const anteprimaFumetto = { cover: null, pagine: [] };

function leggiFile(file) {
    return new Promise(res => {
        const r = new FileReader();
        r.onload = e => res({ nome: file.name, src: e.target.result });
        r.onerror = () => res({ nome: file.name, src: '' });
        r.readAsDataURL(file);
    });
}

function renderAnteprimaFumetto() {
    const area = $('fumetto-preview-area');
    const testo = $('fumetto-placeholder-testo');
    if (!area) return;
    area.querySelectorAll('.spread').forEach(n => n.remove());
    const { cover, pagine } = anteprimaFumetto;
    if (testo) testo.style.display = (cover || pagine.length) ? 'none' : '';

    const facce = [null, cover, ...pagine];
    if (facce.length % 2) facce.push(null);
    for (let i = 0; i < facce.length; i += 2) {
        const riga = document.createElement('div');
        riga.className = 'spread';
        [facce[i], facce[i + 1]].forEach(f => {
            const cella = document.createElement('div');
            cella.className = 'cell' + (f ? '' : ' vuota');
            if (f && f.src) {
                const img = document.createElement('img');
                img.src = f.src; img.title = f.nome; img.draggable = false;
                cella.appendChild(img);
            }
            riga.appendChild(cella);
        });
        area.appendChild(riga);
    }
}

function abilitaAnteprimaCover(zonaId) {
    const zona = $(zonaId);
    if (!zona) return;
    zona.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (!file) return;
        leggiFile(file).then(c => { anteprimaFumetto.cover = c; renderAnteprimaFumetto(); });
    });
}

function abilitaDragAndDropFumetto(zonaId, inputId) {
    const zona = $(zonaId);
    const input = $(inputId);

    if(!zona) return;
    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('dragover'); });
    zona.addEventListener('dragleave', () => { zona.classList.remove('dragover'); });

    zona.addEventListener('drop', (e) => {
        e.preventDefault(); zona.classList.remove('dragover');
        // Salviamo subito i file "volatili" in un array permanente
        const files = Array.from(e.dataTransfer.files);
        if (!files.length) return;
        mostraLoader();
        Promise.all(files.map(leggiFile)).then(lista => {
            anteprimaFumetto.pagine.push(...lista);
            const nomi = lista.map(p => p.nome).join(", ");
            input.value = input.value !== "" ? input.value + ", " + nomi : nomi;
            zona.textContent = `Pagine caricate: ${anteprimaFumetto.pagine.length}. Guarda l'anteprima sotto.`;
            renderAnteprimaFumetto();
        }).catch(() => {}).finally(nascondiLoader);
    });
}

// --- 6. GESTIONE CONTENUTI (togli / modifica / riordina / aggiungi con +) ---
const SEZIONI = { stickers: 'Sticker', illustrazioni: 'Illustrazioni', shop: 'Personaggi', fumetti: 'Fumetti' };
const HINTS = {
    stickers: "Nella home gli sticker in FONDO alla lista stanno DAVANTI agli altri. Trascina ☰ o usa ▲▼ per cambiare chi sta sopra. Il nome serve solo a te per riconoscerli. Premi + per aggiungerne uno.",
    illustrazioni: "L'ordine della lista è l'ordine in cui le illustrazioni scorrono nella galleria. La descrizione appare come nota sotto il disegno. Premi + per aggiungerne una.",
    shop: "L'ordine della lista è l'ordine delle miniature nello shop. Titolo, descrizione e prezzo compaiono nella scheda del prodotto (se vuoti, non si vedono). Premi + per aggiungere un prodotto.",
    fumetti: "L'ordine della lista è l'ordine sullo scaffale. Apri \"Pagine\" per riordinare o togliere le pagine di un fumetto (il file immagine NON viene cancellato dalla cartella). Premi + per aggiungerne uno."
};
const PANNELLI = { stickers: 'pannello-stickers', illustrazioni: 'pannello-singola', shop: 'pannello-singola', fumetti: 'pannello-fumetti' };
let sezioneAttiva = 'stickers';
let pannelloAperto = false;
let trascinato = null;

function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    Object.assign(n, props);
    kids.flat().forEach(k => k && n.append(k));
    return n;
}

function muovi(arr, da, a) {
    if (da === a || a < 0 || a >= arr.length) return;
    arr.splice(a, 0, arr.splice(da, 1)[0]);
    segnaModificato();
}

function miniatura(src) {
    return el('img', { className: 'thumb', src: 'immagini/' + src, draggable: false, onerror: function () { this.style.visibility = 'hidden'; } });
}

function campo(obj, chiave, placeholder, tag = 'input') {
    const c = el(tag, { placeholder, value: obj[chiave] || '' });
    if (tag === 'textarea') c.rows = 2;
    c.addEventListener('input', () => { obj[chiave] = c.value; segnaModificato(); });
    return c;
}

// Una riga della lista: numero, maniglia, contenuto, bottoni su / giù / togli
function creaRiga(arr, i, corpo, rerender, opzioni = {}) {
    const row = el('div', { className: 'item-row' + (opzioni.piccolo ? ' small' : '') });

    const handle = el('span', { className: 'handle', textContent: '☰', title: 'Trascina per spostare' });
    handle.addEventListener('mousedown', () => { row.draggable = true; });

    row.addEventListener('dragstart', e => {
        e.stopPropagation();
        trascinato = { arr, da: i };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'riga');
        row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
        row.draggable = false; row.classList.remove('dragging'); trascinato = null;
        document.querySelectorAll('.item-row.over').forEach(n => n.classList.remove('over'));
    });
    row.addEventListener('dragover', e => {
        if (!trascinato || trascinato.arr !== arr) return;
        e.preventDefault(); e.stopPropagation(); row.classList.add('over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('over'));
    row.addEventListener('drop', e => {
        if (!trascinato || trascinato.arr !== arr) return;
        e.preventDefault(); e.stopPropagation();
        muovi(arr, trascinato.da, i);
        trascinato = null;
        rerender();
    });

    const su = el('button', { className: 'row-btn', textContent: '▲', title: 'Sposta su', disabled: i === 0, onclick: () => { muovi(arr, i, i - 1); rerender(); } });
    const giu = el('button', { className: 'row-btn', textContent: '▼', title: 'Sposta giù', disabled: i === arr.length - 1, onclick: () => { muovi(arr, i, i + 1); rerender(); } });
    const del = el('button', {
        className: 'row-btn del', textContent: '✖', title: 'Togli',
        onclick: () => {
            if (!confirm(`Togliere ${opzioni.nome || 'questo elemento'} dal sito?\n(Il file immagine resta nella cartella, sparisce solo dalla lista)`)) return;
            arr.splice(i, 1); segnaModificato(); rerender();
        }
    });

    row.append(
        el('span', { className: 'num', textContent: (i + 1) + '.' }),
        handle, corpo,
        el('div', { className: 'ctrl' }, su, giu, del)
    );
    return row;
}

function corpoSticker(s) {
    const sel = el('select');
    ['fumetti', 'illustrazioni', 'personaggi', 'chi-sono'].forEach(v => sel.append(el('option', { value: v, textContent: 'Porta a: ' + v })));
    sel.value = s.targetPage || 'fumetti';
    sel.addEventListener('change', () => { s.targetPage = sel.value; segnaModificato(); });
    return el('div', { className: 'item-body' },
        campo(s, 'nome', 'Nome (es: drago blu)'),
        el('span', { className: 'fname', textContent: s.src }),
        sel
    );
}

function corpoSingola(obj, conTesti) {
    const body = el('div', { className: 'item-body' });
    if (conTesti) body.append(campo(obj, 'titolo', 'Titolo (facoltativo)'));
    body.append(campo(obj, 'descrizione', 'Descrizione'));
    if (conTesti) body.append(campo(obj, 'prezzo', 'Prezzo (es: 15 €)'));
    body.append(el('span', { className: 'fname', textContent: obj.src }));
    return body;
}

function disegnaPagine(box, f, summary) {
    box.innerHTML = '';
    f.pagine = f.pagine || [];
    summary.textContent = `📖 Pagine (${f.pagine.length})`;
    f.pagine.forEach((p, k) => {
        const corpo = el('div', { className: 'item-body hor' }, miniatura(p), el('span', { className: 'fname', textContent: p }));
        box.append(creaRiga(f.pagine, k, corpo, () => disegnaPagine(box, f, summary), { piccolo: true, nome: 'la pagina "' + p + '"' }));
    });
    if (!f.pagine.length) box.append(el('p', { className: 'vuoto', textContent: 'Nessuna pagina' }));
}

function corpoFumetto(f) {
    const summary = el('summary');
    const box = el('div', { className: 'pagine-box' });
    disegnaPagine(box, f, summary);
    const dett = el('details', { className: 'pagine' }, summary, box);
    return el('div', { className: 'item-body' },
        campo(f, 'titolo', 'Titolo'),
        campo(f, 'descrizione', 'Testo introduttivo', 'textarea'),
        el('span', { className: 'fname', textContent: 'copertina: ' + f.copertina }),
        dett
    );
}

// Mostra solo il pannello della scheda attiva (se il + è aperto)
function aggiornaPannello() {
    ['pannello-stickers', 'pannello-singola', 'pannello-fumetti'].forEach(id => { $(id).style.display = 'none'; });
    const btn = $('btn-piu');
    btn.classList.toggle('aperto', pannelloAperto);
    btn.textContent = pannelloAperto ? '−' : '+';
    btn.title = pannelloAperto ? 'Chiudi' : 'Aggiungi';
    if (!pannelloAperto) return;
    $(PANNELLI[sezioneAttiva]).style.display = 'block';
    document.querySelectorAll('.solo-shop').forEach(n => { n.style.display = sezioneAttiva === 'shop' ? 'block' : 'none'; });
    $('titolo-singola').textContent = sezioneAttiva === 'shop' ? 'Nuovo personaggio' : 'Nuova illustrazione';
}

function renderGestione() {
    const box = $('gestione-lista');
    if (!box) return;
    document.querySelectorAll('.tab').forEach(t => {
        const n = (siteData[t.dataset.sez] || []).length;
        t.textContent = `${SEZIONI[t.dataset.sez]} (${n})`;
        t.classList.toggle('active', t.dataset.sez === sezioneAttiva);
    });
    $('gestione-hint').textContent = '💡 ' + HINTS[sezioneAttiva];

    box.innerHTML = '';
    const arr = siteData[sezioneAttiva] = siteData[sezioneAttiva] || [];
    if (!arr.length) box.append(el('p', { className: 'vuoto', textContent: 'Qui non c\'è ancora niente...' }));

    arr.forEach((obj, i) => {
        const miniaturaSrc = sezioneAttiva === 'fumetti' ? obj.copertina : obj.src;
        let corpo, nome;
        if (sezioneAttiva === 'stickers') { corpo = corpoSticker(obj); nome = 'lo sticker "' + (obj.nome || obj.src) + '"'; }
        else if (sezioneAttiva === 'fumetti') { corpo = corpoFumetto(obj); nome = 'il fumetto "' + (obj.titolo || obj.copertina) + '"'; }
        else { corpo = corpoSingola(obj, sezioneAttiva === 'shop'); nome = 'l\'immagine "' + obj.src + '"'; }

        const riga = creaRiga(arr, i, corpo, renderGestione, { nome });
        corpo.before(miniatura(miniaturaSrc));
        box.append(riga);
    });

    aggiornaPannello();
    disegnaStickerEsistenti();   // l'anteprima sticker segue sempre la lista (ordine, tolti, nuovi)
}

// --- 7. ACCENSIONE MODULI ---
document.querySelectorAll('.tab').forEach(t => { if (t.dataset.sez === 'personaggi') t.dataset.sez = 'shop'; });
document.querySelectorAll('.drop-zone').forEach(z => { z.dataset.orig = z.textContent; });

const mappe = [
    creaMappa('sticker-preview-desktop', 'nuovo-sticker-desktop', RIF.pc, 'sticker-x', 'sticker-y', 'sticker-rot', 'sticker-w'),
    creaMappa('sticker-preview-mobile', 'nuovo-sticker-mobile', RIF.tel, 'sticker-x-mobile', 'sticker-y-mobile', 'sticker-rot-mobile', 'sticker-w-mobile')
];
abilitaDragAndDropSticker('drop-sticker', 'sticker-img');
abilitaDragAndDrop('drop-singola', 'singola-img');
abilitaDragAndDrop('drop-fumetto-cover', 'fumetto-cover');
abilitaDragAndDropFumetto('drop-fumetto-pagine', 'fumetto-pagine');
abilitaAnteprimaCover('drop-fumetto-cover');

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { sezioneAttiva = t.dataset.sez; pannelloAperto = false; renderGestione(); }));
$('btn-piu').addEventListener('click', () => {
    pannelloAperto = !pannelloAperto;
    aggiornaPannello();
    if (pannelloAperto) $(PANNELLI[sezioneAttiva]).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
// Ogni mouseup rimette le righe non trascinabili (così i campi di testo restano selezionabili)
document.addEventListener('mouseup', () => document.querySelectorAll('.item-row[draggable="true"]').forEach(r => { if (!trascinato) r.draggable = false; }));
renderGestione();