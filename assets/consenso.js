/*
 * EER Pro: consenso cookie (Google Consent Mode v2) + tag Google Ads + link di campagna App Store.
 * Nessuna dipendenza esterna. Il tag Google (gtag.js) NON viene scaricato finché l'utente non accetta.
 *
 * ======================  CONFIGURAZIONE (unico punto da modificare)  ======================
 *  ADS_ID          ID del tag Google Ads (formato AW-123456789).
 *  LABEL_CLIC_APPSTORE  etichetta dell'azione di conversione "Clic App Store"
 *                  (il send_to completo diventa ADS_ID + "/" + LABEL_CLIC_APPSTORE).
 *  PT              provider token di App Store Connect (App Analytics > Acquisizione > Campagne).
 *                  Finché è vuoto i link App Store NON vengono riscritti (restano quelli attuali).
 *  PERSONALIZZAZIONE_ANNUNCI  false = mai remarketing/annunci personalizzati, anche con consenso
 *                  (piano growth §2.10: "Mai remarketing"). Da confermare con Andrea.
 * ==========================================================================================
 */
(function () {
  'use strict';

  var CONFIG = {
    ADS_ID: 'AW-XXXXXXXXX',
    LABEL_CLIC_APPSTORE: 'YYYYYYYY',
    PT: '',
    APP_ID: '6787630404',
    PERSONALIZZAZIONE_ANNUNCI: false,
    INFORMATIVA_URL: 'cookie.html',
    CHIAVE_STORAGE: 'eerpro_consenso_v1',
    DURATA_SCELTA_GIORNI: 180 // dopo 6 mesi la scelta viene richiesta di nuovo
  };

  // ?ag= (gruppo di annunci, team/ads.md §2 e §8) -> ct del link di campagna App Store
  var MAPPA_AG_CT = {
    codici: 'g_codici',
    classificazione: 'g_classif',
    app: 'g_app',
    brand: 'g_brand',
    filiera: 'g_filiera'
  };
  var CT_SENZA_PARAMETRI = 'lp_org';

  var IDENTIFICATIVI_SEGNAPOSTO = /X{6,}|Y{6,}/;

  // ---------------------------------------------------------------- Consent Mode v2: default negato
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  var tagCaricato = false;

  function idConfigurati() {
    return !IDENTIFICATIVI_SEGNAPOSTO.test(CONFIG.ADS_ID) &&
      !IDENTIFICATIVI_SEGNAPOSTO.test(CONFIG.LABEL_CLIC_APPSTORE) &&
      /^AW-\d+$/.test(CONFIG.ADS_ID);
  }

  function caricaTagGoogle() {
    if (tagCaricato) return;
    if (!idConfigurati()) {
      if (window.console) console.info('[EER Pro] Consenso dato, ma ID Google Ads ancora segnaposto: gtag.js non caricato.');
      return;
    }
    tagCaricato = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.ADS_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', CONFIG.ADS_ID, {
      allow_ad_personalization_signals: CONFIG.PERSONALIZZAZIONE_ANNUNCI
    });
  }

  function aggiornaConsenso(accettato) {
    gtag('consent', 'update', {
      ad_storage: accettato ? 'granted' : 'denied',
      ad_user_data: accettato ? 'granted' : 'denied',
      ad_personalization: (accettato && CONFIG.PERSONALIZZAZIONE_ANNUNCI) ? 'granted' : 'denied',
      analytics_storage: 'denied' // nessuno strumento di analytics Google sul sito
    });
  }

  // ---------------------------------------------------------------- memoria della scelta
  function leggiScelta() {
    try {
      var v = JSON.parse(window.localStorage.getItem(CONFIG.CHIAVE_STORAGE) || 'null');
      if (!v || (v.scelta !== 'accettato' && v.scelta !== 'rifiutato')) return null;
      var eta = Date.now() - new Date(v.data).getTime();
      if (!(eta >= 0) || eta > CONFIG.DURATA_SCELTA_GIORNI * 864e5) return null;
      return v.scelta;
    } catch (e) { return null; }
  }

  function salvaScelta(scelta) {
    try {
      window.localStorage.setItem(CONFIG.CHIAVE_STORAGE,
        JSON.stringify({ scelta: scelta, data: new Date().toISOString() }));
    } catch (e) { /* storage non disponibile: la scelta vale solo per questa pagina */ }
  }

  function cancellaCookieGoogle() {
    var nomi = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); });
    var host = location.hostname;
    nomi.forEach(function (n) {
      if (/^(_gcl_|_gac_|_ga|_gid|_gat)/.test(n)) {
        var scad = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = n + scad;
        document.cookie = n + scad + '; domain=' + host;
        document.cookie = n + scad + '; domain=.' + host;
      }
    });
  }

  // ---------------------------------------------------------------- banner
  var banner = null;

  function chiudiBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function scegli(scelta) {
    var precedente = leggiScelta();
    salvaScelta(scelta);
    chiudiBanner();
    if (scelta === 'accettato') {
      aggiornaConsenso(true);
      caricaTagGoogle();
    } else {
      aggiornaConsenso(false);
      if (precedente === 'accettato') cancellaCookieGoogle();
    }
  }

  function mostraBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-labelledby', 'cookie-banner-titolo');
    banner.innerHTML =
      '<div class="cookie-banner__testo">' +
        '<p id="cookie-banner-titolo"><strong>Cookie su questo sito</strong></p>' +
        '<p>Usiamo solo cookie tecnici. Con il tuo consenso attiviamo anche il tag di <strong>Google Ads</strong> ' +
        '(cookie di marketing) per misurare quante persone arrivano dagli annunci e aprono l\'App Store. ' +
        'Senza consenso non viene caricato nulla di Google. L\'app EER Pro non usa tracciamento. ' +
        'Puoi cambiare idea quando vuoi da "Gestisci cookie" in fondo alla pagina. ' +
        '<a href="' + CONFIG.INFORMATIVA_URL + '">Informativa cookie</a>.</p>' +
      '</div>' +
      '<div class="cookie-banner__azioni">' +
        '<button type="button" class="btn cookie-btn" data-scelta="rifiutato">Rifiuta</button>' +
        '<button type="button" class="btn cookie-btn" data-scelta="accettato">Accetta</button>' +
      '</div>';
    banner.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-scelta]') : null;
      if (b) scegli(b.getAttribute('data-scelta'));
    });
    document.body.appendChild(banner);
  }

  // ---------------------------------------------------------------- link App Store
  function eLinkAppStore(a) {
    return a && a.hostname === 'apps.apple.com';
  }

  function ctDaParametri() {
    var ag;
    try { ag = new URLSearchParams(location.search).get('ag'); } catch (e) { ag = null; }
    if (ag) {
      ag = ag.toLowerCase().trim();
      return MAPPA_AG_CT.hasOwnProperty(ag) ? MAPPA_AG_CT[ag] : CT_SENZA_PARAMETRI;
    }
    return CT_SENZA_PARAMETRI;
  }

  function riscriviLinkAppStore() {
    if (!CONFIG.PT) return; // provider token non ancora disponibile: link invariati
    var url = 'https://apps.apple.com/app/apple-store/id' + CONFIG.APP_ID +
      '?pt=' + encodeURIComponent(CONFIG.PT) +
      '&ct=' + encodeURIComponent(ctDaParametri()) + '&mt=8';
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      if (eLinkAppStore(links[i])) links[i].setAttribute('href', url);
    }
  }

  function tracciaClicAppStore(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!eLinkAppStore(a)) return;
    if (!tagCaricato || leggiScelta() !== 'accettato') return; // nessun invio senza consenso
    gtag('event', 'conversion', {
      send_to: CONFIG.ADS_ID + '/' + CONFIG.LABEL_CLIC_APPSTORE,
      transport_type: 'beacon'
    });
  }

  // ---------------------------------------------------------------- avvio
  function avvia() {
    riscriviLinkAppStore();
    document.addEventListener('click', tracciaClicAppStore, true);

    var gestisci = document.querySelectorAll('[data-gestisci-cookie]');
    for (var i = 0; i < gestisci.length; i++) {
      gestisci[i].addEventListener('click', function (ev) { ev.preventDefault(); mostraBanner(); });
    }

    var scelta = leggiScelta();
    if (scelta === 'accettato') {
      aggiornaConsenso(true);
      caricaTagGoogle();
    } else if (scelta === 'rifiutato') {
      aggiornaConsenso(false);
    } else {
      mostraBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }

  // Per i test locali: window.EERProConsenso.config
  window.EERProConsenso = { config: CONFIG, mostraBanner: mostraBanner };
})();
