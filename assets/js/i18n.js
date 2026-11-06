/* SAW Smart Walker: page translation. No dependencies.
 *
 * The English page is the source. Translations live in assets/i18n/<lang>.js as
 * { "English text": "translated text or HTML" }, keyed by the element's text with
 * whitespace collapsed, so the HTML can be edited freely: a changed sentence simply
 * shows in English until its translation is updated.
 *
 * Exposes window.SAW_I18N = { lang, langs, t(text), set(lang), onChange(fn), keys() }.
 */
(function () {
  'use strict';

  var LANGS = {
    en: { name: 'English', speech: 'en-GB' },
    es: { name: 'Español', speech: 'es-ES' },
    fr: { name: 'Français', speech: 'fr-FR' },
    de: { name: 'Deutsch', speech: 'de-DE' },
    zh: { name: '中文', speech: 'zh-CN' }
  };
  // Elements translated as a whole (their inner HTML), when they hold no block children.
  var UNIT = 'h1,h2,h3,h4,p,li,dt,dd,summary,figcaption,button,a,label,th,td,title,desc,text,q';
  var BLOCK = 'p,li,h1,h2,h3,h4,ul,ol,dl,div,details,figure,section,article,nav,svg,table';
  // Kept in their original language: paper titles, author lists, venues, links to DOIs.
  var SKIP = 'script,style,noscript,code,iframe,[translate="no"],.pub-title,.pub-authors,.pub-venue,.doi';
  var ATTRS = ['aria-label', 'title', 'alt'];

  var data = (window.SAW_I18N_DATA = window.SAW_I18N_DATA || {});
  var norm = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  var units = [];   // { el, key, html, svg }
  var texts = [];   // { node, key, raw }
  var attrs = [];   // { el, name, key, raw }
  var listeners = [];
  var current = 'en';

  function isSvg(el) { return el.namespaceURI === 'http://www.w3.org/2000/svg'; }
  // Elements whose text the demo scripts rewrite (they translate it themselves through t()).
  function inDynamic(el) { return !!(el.closest && el.closest('[data-role]:not([data-role="next"]):not([data-role="list"])')); }

  function collect(el) {
    if (el.matches(SKIP)) return;
    ATTRS.forEach(function (name) {
      var v = el.getAttribute(name);
      if (v && /[A-Za-z]/.test(v)) attrs.push({ el: el, name: name, key: norm(v), raw: v });
    });
    var unit = el.matches(UNIT) && !el.hasAttribute('data-role') &&
      // children that scripts hold on to (ids, data-role) or that must stay as they are keep the
      // element from being replaced as a whole; its text nodes are translated one by one instead
      !el.querySelector(BLOCK + ',[data-role],[id],[translate="no"],.pub-title,.pub-authors,.pub-venue,.doi');
    if (unit) {
      var key = norm(el.textContent);
      if (/[A-Za-z]/.test(key)) units.push({ el: el, key: key, html: el.innerHTML, svg: isSvg(el) });
      el.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach(function (c) { collectAttrsOnly(c); });
      return;
    }
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1) collect(n);
      else if (n.nodeType === 3 && /[A-Za-z]/.test(n.nodeValue) && !inDynamic(el)) {
        texts.push({ node: n, key: norm(n.nodeValue), raw: n.nodeValue });
      }
    }
  }
  function collectAttrsOnly(el) {
    ATTRS.forEach(function (name) {
      var v = el.getAttribute(name);
      if (v && /[A-Za-z]/.test(v)) attrs.push({ el: el, name: name, key: norm(v), raw: v });
    });
  }

  function dict() { return data[current] || {}; }
  function t(s) {
    if (current === 'en') return s;
    var v = dict()[norm(s)];
    return v == null ? s : v;
  }

  function apply() {
    var d = current === 'en' ? {} : dict();
    units.forEach(function (u) {
      var v = d[u.key];
      if (u.svg) u.el.textContent = v == null ? u.key : v.replace(/<[^>]+>/g, '');
      else u.el.innerHTML = v == null ? u.html : v;
    });
    texts.forEach(function (x) {
      var v = d[x.key];
      if (v == null) { x.node.nodeValue = x.raw; return; }
      var lead = x.raw.match(/^\s*/)[0], tail = x.raw.match(/\s*$/)[0];
      x.node.nodeValue = lead + v + tail;
    });
    attrs.forEach(function (a) {
      var v = d[a.key];
      a.el.setAttribute(a.name, v == null ? a.raw : v);
    });
    document.documentElement.lang = current === 'zh' ? 'zh-Hans' : current;
    var sel = document.getElementById('langSelect');
    if (sel) sel.value = current;
    listeners.forEach(function (fn) { try { fn(current); } catch (e) { console.error(e); } });
  }

  function load(lang, done) {
    if (lang === 'en' || data[lang]) { done(); return; }
    var s = document.createElement('script');
    s.src = 'assets/i18n/' + lang + '.js';
    s.onload = done;
    s.onerror = function () { console.warn('Translation not available:', lang); done(); };
    document.head.appendChild(s);
  }

  function set(lang, remember) {
    if (!LANGS[lang]) lang = 'en';
    if (remember) store.set('saw-lang', lang);
    load(lang, function () { current = lang; apply(); });
  }

  function initial() {
    var q = (location.search.match(/[?&]lang=([a-z]{2})/) || [])[1];
    if (q && LANGS[q]) return q;
    var saved = store.get('saw-lang');
    if (saved && LANGS[saved]) return saved;
    var prefs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i]).slice(0, 2).toLowerCase();
      if (LANGS[code]) return code;
    }
    return 'en';
  }

  collect(document.body);
  // document title and description
  var titleEl = document.querySelector('head title');
  var titleKey = norm(titleEl && titleEl.textContent);
  var meta = document.querySelector('meta[name="description"]');
  var metaKey = norm(meta && meta.content);
  listeners.push(function () {
    if (titleEl) titleEl.textContent = t(titleKey);
    if (meta) meta.content = t(metaKey);
  });

  var sel = document.getElementById('langSelect');
  if (sel) {
    sel.innerHTML = '';
    Object.keys(LANGS).forEach(function (code) {
      var o = document.createElement('option');
      o.value = code;
      o.lang = code;
      o.textContent = LANGS[code].name;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { set(sel.value, true); });
  }

  window.SAW_I18N = {
    get lang() { return current; },
    langs: LANGS,
    t: t,
    set: set,
    onChange: function (fn) { listeners.push(fn); },
    /* For translators: every string on the page, in English. */
    keys: function () {
      var seen = {}, out = [];
      var add = function (k, html) { if (k && !seen[k]) { seen[k] = 1; out.push({ key: k, html: html || k }); } };
      add(titleKey); add(metaKey);
      units.forEach(function (u) { add(u.key, u.svg ? u.key : norm(u.html)); });
      texts.forEach(function (x) { add(x.key); });
      attrs.forEach(function (a) { add(a.key); });
      return out;
    }
  };

  var first = initial();
  if (first !== 'en') set(first, false);
  else if (sel) sel.value = 'en';
})();
