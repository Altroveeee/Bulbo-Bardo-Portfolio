// CARICAMENTO: i drappeggi restano chiusi mentre la pagina si prepara, poi si aprono.
// Si aprono quando sono pronti: pagina caricata + immagini principali + tempo minimo.

(() => {
    const sipario = document.getElementById('intro-curtains');
    if (!sipario) return;

    const MIN_MS = 1200;             // restano chiusi almeno questo tempo, così l'animazione si vede
    const MAX_MS = 10000;            // se qualcosa è lento, si aprono comunque dopo questo tempo
    const PRECARICA_TUTTO = false;   // true = carica prima anche copertine, illustrazioni e shop

    // Immagini dell'interfaccia sempre caricate prima di aprire
    const INTERFACCIA = [
        'tenda-sopra.png', 'tenda-sinistra.png', 'tenda-destra.png',
        'icona-home.png', 'icona-fumetti.png', 'icona-illustrazioni.png', 'icona-shop.png', 'icona-chisono.png',
        'back-arrow.png', 'libreria-ripiano.png'
    ].map(f => 'immagini/interfaccia/' + f);

    const urls = new Set(INTERFACCIA);
    if (typeof siteData !== 'undefined') {
        (siteData.stickers || []).forEach(s => urls.add('immagini/' + s.src));   // la home si vede subito
        if (PRECARICA_TUTTO) {
            (siteData.fumetti || []).forEach(f => urls.add('immagini/' + f.copertina));
            ['illustrazioni', 'shop'].forEach(k => (siteData[k] || []).forEach(x => urls.add('immagini/' + (x.copertina || x.src))));
        }
    }
    const lista = [...urls];

    // Barra di avanzamento (si può togliere: basta cancellare queste righe e .intro-progress nel CSS)
    const barra = document.createElement('div');
    barra.className = 'intro-progress';
    barra.innerHTML = '<span></span>';
    sipario.appendChild(barra);
    const setP = p => sipario.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
    setP(0);

    let fatte = 0, finito = false;
    const t0 = performance.now();
    const carica = url => new Promise(res => {
        const img = new Image();
        img.onload = img.onerror = () => { fatte++; res(); };   // un file mancante non blocca il sito
        img.src = url;
    });

    const assets = Promise.all(lista.map(carica));
    const pagina = new Promise(res => document.readyState === 'complete' ? res() : window.addEventListener('load', res, { once: true }));
    const minimo = new Promise(res => setTimeout(res, MIN_MS));
    const massimo = new Promise(res => setTimeout(res, MAX_MS));

    // La barra segue il più lento tra i file caricati e il tempo minimo
    (function tick() {
        if (finito) return;
        const reale = lista.length ? fatte / lista.length : 1;
        const tempo = (performance.now() - t0) / MIN_MS;
        setP(Math.min(reale, tempo) * 0.92);
        requestAnimationFrame(tick);
    })();

    Promise.race([Promise.all([assets, pagina, minimo]), massimo]).then(() => {
        finito = true;
        setP(1);
        setTimeout(() => {
            sipario.classList.add('loaded');       // la barra sfuma
            setTimeout(() => sipario.classList.add('open'), 300);   // poi i drappeggi si aprono
        }, 250);
    });
})();
