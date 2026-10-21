/*
 * Free My TV → Lampa on LG webOS: opens the card Free My TV asked for.
 * Lampa reads deep links only on Tizen (and from ?card= in its URL); on webOS the launch parameters arrive in
 * PalmSystem.launchParams (a cold start) or in a webOSRelaunch event (Lampa already open). Free My TV sends
 * {card: <TMDB id>, media: 'movie' | 'tv', source: 'tmdb'}.
 * Install it as a Lampac custom plugin (plugins/custom/fmtv_deeplink.js, autoload) or add its URL in Lampa's plugins.
 */
(function () {
  'use strict';

  var handled = '';

  function open(params) {
    if (!params || !params.card) return;
    var key = params.card + ':' + (params.media || '');
    if (key === handled) return;
    handled = key;
    var source = params.source || 'tmdb';
    Lampa.Activity.push({
      url: '',
      component: 'full',
      id: params.card,
      method: params.media === 'tv' ? 'tv' : 'movie',
      card: {id: params.card, source: source},
      source: source
    });
  }

  function parse(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function start() {
    // On a cold start through lampa/webos the card is already in the address (?card=), and Lampa opens it itself:
    // opening it a second time leaves Lampa spinning. Remember it as handled instead.
    var inUrl = Lampa.Utils.gup('card');
    if (inUrl) handled = inUrl + ':' + (Lampa.Utils.gup('media') || 'movie');
    else if (window.PalmSystem) open(parse(window.PalmSystem.launchParams));
    document.addEventListener('webOSRelaunch', function (e) {
      // with handlesRelaunch the app comes to the front only when it asks to
      if (window.PalmSystem && window.PalmSystem.activate) window.PalmSystem.activate();
      handled = '';   // the same title asked again is a new request
      open(parse(e.detail) || (window.PalmSystem && parse(window.PalmSystem.launchParams)));
    }, true);
  }

  if (window.appready) start();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
