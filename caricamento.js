// CARICAMENTO: i drappeggi restano chiusi mentre la pagina si prepara, poi si aprono.
// Dietro le tende vengono scaricate E decodificate le immagini che servono subito
// (home, copertine, illustrazioni, miniature dello shop). Le immagini pesanti che servono
// dopo (pagine dei fumetti, immagini grandi dello shop) arrivano in sottofondo a sipario aperto.

(() => {
    const sipario = document.getElementById('intro-curtains');
    if (!sipario) return;

    const MIN_MS = 900;              // restano chiusi almeno questo tempo, così l'animazione si vede
    const MAX_MS = 12000;            // se qualcosa è lento, si aprono comunque dopo questo tempo
    const SOTTOFONDO = true;         // true = dopo l'apertura scarica in silenzio pagine dei fumetti e immagini dello shop

    const img = f => 'immagini/' + f;

    // Interfaccia + tutto ciò che si vede entrando nelle pagine
    const urls = new Set([
        'tenda-sopra.png', 'tenda-sinistra.png', 'tenda-destra.png',
        'icona-home.png', 'icona-fumetti.png', 'icona-illustrazioni.png', 'icona-shop.png', 'icona-chisono.png',
        'back-arrow.png', 'libreria-ripiano.png'
    ].map(f => 'immagini/interfaccia/' + f));

    const sfondo = [];   // da scaricare dopo, a sipario aperto
    if (typeof siteData !== 'undefined') {
        (siteData.stickers || []).forEach(s => urls.add(img(s.src)));
        (siteData.fumetti || []).forEach(f => urls.add(img(f.copertina)));
        (siteData.illustrazioni || []).forEach(x => urls.add(img(x.src)));
        (siteData.shop || []).forEach((x, i) => {
            urls.add(img(x.miniatura || x.copertina || x.src));
            if (i === 0) urls.add(img(x.src));          // il primo personaggio si apre subito
            else sfondo.push(img(x.src));
        });
        (siteData.chiSono && siteData.chiSono.immagine) && urls.add(img(siteData.chiSono.immagine));
        (siteData.fumetti || []).forEach(f => (f.pagine || []).forEach(p => sfondo.push(img(p))));
    }

    // Scarica e decodifica: quando serve l'immagine è già pronta, niente scatti
    const carica = url => new Promise(res => {
        const i = new Image();
        i.decoding = 'async';
        i.src = url;
        const fine = () => res();                          // un file mancante non blocca il sito
        if (i.decode) i.decode().then(fine, fine); else i.onload = i.onerror = fine;
    });

    const font = (document.fonts && document.fonts.load) ? document.fonts.load('16px FontSito').catch(() => {}) : Promise.resolve();
    const assets = Promise.all([...urls].map(carica).concat(font));
    const pagina = new Promise(res => document.readyState === 'complete' ? res() : window.addEventListener('load', res, { once: true }));
    const minimo = new Promise(res => setTimeout(res, MIN_MS));
    const massimo = new Promise(res => setTimeout(res, MAX_MS));

    Promise.race([Promise.all([assets, pagina, minimo]), massimo]).then(() => {
        sipario.classList.add('loaded', 'open');
        if (SOTTOFONDO) setTimeout(scaricaInSottofondo, 1500);
    });

    // Due file alla volta, solo quando il browser è tranquillo (e mai con "risparmio dati")
    function scaricaInSottofondo() {
        const c = navigator.connection;
        if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
        const coda = sfondo.filter(u => !urls.has(u));
        const pausa = cb => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 80));
        let attivi = 0;
        const prossimo = () => {
            while (attivi < 2 && coda.length) {
                attivi++;
                const i = new Image();
                i.decoding = 'async';
                i.onload = i.onerror = () => { attivi--; pausa(prossimo); };
                i.src = coda.shift();
            }
        };
        prossimo();
    }
})();
