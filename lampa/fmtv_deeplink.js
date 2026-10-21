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
    if (window.PalmSystem) open(parse(window.PalmSystem.launchParams));
    document.addEventListener('webOSRelaunch', function (e) {
      handled = '';   // the same title asked again is a new request
      open(parse(e.detail) || (window.PalmSystem && parse(window.PalmSystem.launchParams)));
    }, true);
  }

  if (window.appready) start();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
