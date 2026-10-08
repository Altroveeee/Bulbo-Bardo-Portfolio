// ==========================================
// admin.js - VERSIONE BLINDATA E ANTI-BLOCCO
// ==========================================

// --- 0. SCUDO GLOBALE E GESTIONE CARICAMENTO ---
window.addEventListener("dragover", function(e) { e.preventDefault(); });
window.addEventListener("drop", function(e) { e.preventDefault(); });

function mostraLoader() { document.getElementById('loader-overlay').style.display = 'flex'; }
function nascondiLoader() { document.getElementById('loader-overlay').style.display = 'none'; }

// IL PARACADUTE: Se si blocca, basta cliccare la schermata per farla sparire!
document.getElementById('loader-overlay').addEventListener('click', nascondiLoader);

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
    alert("Scarico completato! Sostituisci il file dati.js nella cartella del sito.");
}

// --- 2. SALVATAGGIO DATI ---
function salvaSticker() {
    const img = document.getElementById('sticker-img').value;
    const x = document.getElementById('sticker-x').value;
    const y = document.getElementById('sticker-y').value;
    const rot = document.getElementById('sticker-rot').value;
    const xMob = document.getElementById('sticker-x-mobile').value;
    const yMob = document.getElementById('sticker-y-mobile').value;
    const rotMob = document.getElementById('sticker-rot-mobile').value;
    const target = document.getElementById('sticker-target').value;

    if (!img) return alert("Inserisci l'immagine per lo sticker!");
    siteData.stickers.push({
        id: 'sticker_' + Date.now(), src: img, startX: Number(x), startY: Number(y), rotDesktop: Number(rot || 0),
        startX_mobile: Number(xMob), startY_mobile: Number(yMob), rotMobile: Number(rotMob || 0), targetPage: target
    });
    esportaDati();
}

function salvaSingola() {
    const sezione = document.getElementById('singola-sezione').value;
    const img = document.getElementById('singola-img').value;
    const desc = document.getElementById('singola-desc').value;

    if (!img) return alert("Inserisci il nome dell'immagine!");
    siteData[sezione].push({ id: Date.now(), src: img, descrizione: desc });
    esportaDati();
}

function salvaFumetto() {
    const titolo = document.getElementById('fumetto-titolo').value;
    const cover = document.getElementById('fumetto-cover').value;
    const desc = document.getElementById('fumetto-desc').value;
    const pagineStr = document.getElementById('fumetto-pagine').value;

    if (!cover || !titolo) return alert("Titolo e Copertina sono obbligatori!");
    const arrayPagine = pagineStr.split(',').map(nome => nome.trim()).filter(nome => nome !== "");
    siteData.fumetti.push({
        id: Date.now(), titolo: titolo, copertina: cover, descrizione: desc, pagine: arrayPagine
    });
    esportaDati();
}

// --- 3. DRAG & DROP BASE (Immagini Singole) ---
function abilitaDragAndDrop(zonaId, inputId) {
    const zona = document.getElementById(zonaId);
    const input = document.getElementById(inputId);
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

// --- 4. DRAG & DROP STICKERS E MAPPE ---
function caricaStickerEsistenti() {
    const areaDesktop = document.getElementById('sticker-preview-desktop');
    const areaMobile = document.getElementById('sticker-preview-mobile');
    
    if (siteData && siteData.stickers) {
        siteData.stickers.forEach(sticker => {
            const rotD = sticker.rotDesktop || 0;
            const imgD = document.createElement('img');
            imgD.src = 'immagini/' + sticker.src;
            imgD.style = `position:absolute; width:40px; opacity:0.3; pointer-events:none; left:${sticker.startX}%; top:${sticker.startY}%; transform: translate(-50%, -50%) rotate(${rotD}deg);`;
            if (areaDesktop) areaDesktop.appendChild(imgD);

            const mX = sticker.startX_mobile !== undefined ? sticker.startX_mobile : sticker.startX;
            const mY = sticker.startY_mobile !== undefined ? sticker.startY_mobile : sticker.startY;
            const rotM = sticker.rotMobile !== undefined ? sticker.rotMobile : rotD;
            const imgM = document.createElement('img');
            imgM.src = 'immagini/' + sticker.src;
            imgM.style = `position:absolute; width:30px; opacity:0.3; pointer-events:none; left:${mX}%; top:${mY}%; transform: translate(-50%, -50%) rotate(${rotM}deg);`;
            if (areaMobile) areaMobile.appendChild(imgM);
        });
    }
}
caricaStickerEsistenti();

function abilitaDragAndDropSticker(zonaId, inputId) {
    const zona = document.getElementById(zonaId);
    const input = document.getElementById(inputId);
    const prevDesktop = document.getElementById('nuovo-sticker-desktop');
    const prevMobile = document.getElementById('nuovo-sticker-mobile');

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
                        if (prevDesktop) { prevDesktop.src = evento.target.result; prevDesktop.style.display = 'block'; }
                        if (prevMobile) { prevMobile.src = evento.target.result; prevMobile.style.display = 'block'; }
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

function abilitaMappa(areaId, stickerId, inputXId, inputYId, inputRotId) {
    const area = document.getElementById(areaId);
    const stick = document.getElementById(stickerId);
    const inX = document.getElementById(inputXId);
    const inY = document.getElementById(inputYId);
    const inRot = document.getElementById(inputRotId);
    let dragging = false;

    if(!area || !stick) return;
    stick.addEventListener('mousedown', () => { dragging = true; stick.style.cursor = 'crosshair'; });
    document.addEventListener('mouseup', () => { dragging = false; stick.style.cursor = 'crosshair'; });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const rect = area.getBoundingClientRect();
        let pX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        let pY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
        if (pX < 0) pX = 0; if (pX > 100) pX = 100;
        if (pY < 0) pY = 0; if (pY > 100) pY = 100;
        inX.value = pX; inY.value = pY;
        stick.style.left = `${pX}%`; stick.style.top = `${pY}%`;
    });
    
    inX.addEventListener('input', () => { stick.style.left = `${inX.value}%`; });
    inY.addEventListener('input', () => { stick.style.top = `${inY.value}%`; });
    inRot.addEventListener('input', () => { stick.style.transform = `translate(-50%, -50%) rotate(${inRot.value}deg)`; });
}

// --- 5. DRAG & DROP FUMETTO (Anteprima Cascata) ---
function abilitaDragAndDropFumetto(zonaId, inputId, previewId) {
    const zona = document.getElementById(zonaId);
    const input = document.getElementById(inputId);
    const previewArea = document.getElementById(previewId);
    const testoScomparsa = document.getElementById('fumetto-placeholder-testo');

    if(!zona) return;
    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('dragover'); });
    zona.addEventListener('dragleave', () => { zona.classList.remove('dragover'); });

    zona.addEventListener('drop', (e) => {
        e.preventDefault(); zona.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            mostraLoader();
            
            // LA CORREZIONE: Trasformiamo subito i file "volatili" in un array permanente
            const filesSalvati = Array.from(e.dataTransfer.files);
            
            setTimeout(() => {
                try {
                    const nomiFiles = filesSalvati.map(file => file.name);
                    if (input.value !== "") input.value += ", " + nomiFiles.join(", ");
                    else { input.value = nomiFiles.join(", "); if (testoScomparsa) testoScomparsa.style.display = 'none'; }
                    zona.textContent = "Pagine caricate! Scorri l'anteprima sotto.";

                    let letti = 0;
                    filesSalvati.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = function(evento) {
                            const img = document.createElement('img');
                            img.src = evento.target.result;
                            img.style.width = '100%'; img.style.borderRadius = '4px'; img.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
                            previewArea.appendChild(img);
                            
                            letti++;
                            if(letti === filesSalvati.length) nascondiLoader(); 
                        };
                        reader.onerror = () => {
                            letti++;
                            if(letti === filesSalvati.length) nascondiLoader();
                        };
                        reader.readAsDataURL(file);
                    });
                } catch (err) {
                    nascondiLoader();
                }
            }, 300);
        }
    });
}

// --- 6. ACCENSIONE MODULI ---
abilitaDragAndDropSticker('drop-sticker', 'sticker-img');
abilitaMappa('sticker-preview-desktop', 'nuovo-sticker-desktop', 'sticker-x', 'sticker-y', 'sticker-rot');
abilitaMappa('sticker-preview-mobile', 'nuovo-sticker-mobile', 'sticker-x-mobile', 'sticker-y-mobile', 'sticker-rot-mobile');

abilitaDragAndDrop('drop-singola', 'singola-img');
abilitaDragAndDrop('drop-fumetto-cover', 'fumetto-cover');
abilitaDragAndDropFumetto('drop-fumetto-pagine', 'fumetto-pagine', 'fumetto-preview-area');