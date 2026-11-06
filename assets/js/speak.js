/* SAW Smart Walker: read the page aloud with the browser's own voices (Web Speech API).
 * Starts from the part of the page on screen, highlights and scrolls to what it is reading,
 * and follows the language chosen in the language menu. No dependencies, nothing sent anywhere. */
(function () {
  'use strict';

  var btn = document.getElementById('listen');
  if (!btn) return;
  var synth = window.speechSynthesis;
  if (!synth || !window.SpeechSynthesisUtterance) { btn.hidden = true; return; }

  var I = window.SAW_I18N || { t: function (s) { return s; }, lang: 'en', langs: { en: { speech: 'en-GB' } }, onChange: function () {} };
  var T = function (s) { return I.t(s); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var READ = 'h1,h2,h3,h4,p,li,dt,dd,figcaption,summary,svg[role="img"]';
  var CONTAINS_READ = 'h1,h2,h3,h4,p,li,dt,dd,figcaption,summary';

  var toast, msgEl, pauseBtn, queue = [], idx = 0, active = false, paused = false, current = null, run = 0;

  function visible(el) {
    if (el.closest('[aria-hidden="true"],nav,.hero-art,.band-art,[hidden]')) return false;
    var d = el.closest('details');
    if (d && !d.open && !el.matches('summary') && !el.closest('summary')) return false;
    return !!(el.offsetParent || el.getClientRects().length);
  }
  function textOf(el) {
    if (el.matches('svg')) {
      var title = el.querySelector('title'), desc = el.querySelector('desc');
      return [title && title.textContent, desc && desc.textContent].filter(Boolean).join('. ');
    }
    return el.textContent.replace(/[›↓↗▶❚]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function build() {
    var main = document.getElementById('main');
    return Array.prototype.filter.call(main.querySelectorAll(READ), function (el) {
      if (!visible(el)) return false;
      if (el.closest('svg') && !el.matches('svg')) return false;
      // an item that holds its own headings or paragraphs is read through them instead
      if (!el.matches('svg') && el.querySelector(CONTAINS_READ)) return false;
      return /\S/.test(textOf(el));
    });
  }
  function startIndex(list) {
    var top = (document.querySelector('.topbar') || { offsetHeight: 0 }).offsetHeight + 8;
    for (var i = 0; i < list.length; i++) {
      if (list[i].getBoundingClientRect().bottom > top) return i;
    }
    return 0;
  }

  function voiceFor(code) {
    var voices = synth.getVoices();
    var lc = code.toLowerCase(), base = lc.slice(0, 2);
    var pick = function (f) { for (var i = 0; i < voices.length; i++) if (f(voices[i])) return voices[i]; return null; };
    return pick(function (v) { return v.lang.toLowerCase().replace('_', '-') === lc && /natural|neural|enhanced|premium|google/i.test(v.name); }) ||
      pick(function (v) { return v.lang.toLowerCase().replace('_', '-') === lc; }) ||
      pick(function (v) { return v.lang.toLowerCase().slice(0, 2) === base; });
  }

  // Long utterances are cut off by some browsers, so speak one sentence-sized chunk at a time.
  function chunks(text) {
    var parts = text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) || [text];
    var out = [], cur = '';
    parts.forEach(function (p) {
      if ((cur + p).length > 220 && cur) { out.push(cur); cur = ''; }
      cur += p;
    });
    if (cur.trim()) out.push(cur);
    return out;
  }

  function mark(el) {
    if (current) current.classList.remove('reading');
    current = el;
    if (!el) return;
    el.classList.add('reading');
    el.scrollIntoView({ block: 'center', behavior: reduce && reduce.matches ? 'auto' : 'smooth' });
  }

  function speakItem() {
    if (!active) return;
    if (idx >= queue.length) { stop(); return; }
    var el = queue[idx];
    mark(el);
    var lang = (I.langs[I.lang] || I.langs.en).speech;
    var voice = voiceFor(lang);
    var parts = chunks(textOf(el));
    var my = ++run, k = 0;
    var next = function () {
      if (!active || my !== run) return;
      if (k >= parts.length) { idx++; speakItem(); return; }
      var u = new SpeechSynthesisUtterance(parts[k++]);
      u.lang = lang;
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.onend = next;
      u.onerror = function (e) { if (e.error !== 'interrupted' && e.error !== 'canceled') next(); };
      synth.speak(u);
    };
    next();
  }

  function ensureToast() {
    if (toast) return;
    toast = document.createElement('div');
    toast.className = 'speak-toast';
    toast.setAttribute('role', 'region');
    toast.hidden = true;
    msgEl = document.createElement('span');
    msgEl.className = 'msg';
    msgEl.setAttribute('aria-live', 'polite');
    pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.addEventListener('click', togglePause);
    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'skip-next';
    nextBtn.addEventListener('click', function () { if (!active) return; paused = false; run++; synth.cancel(); idx++; speakItem(); labels(); });
    var stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'stop';
    stopBtn.addEventListener('click', stop);
    toast.append(msgEl, pauseBtn, nextBtn, stopBtn);
    document.body.appendChild(toast);
  }
  function labels() {
    if (!toast) return;
    toast.setAttribute('aria-label', T('Read aloud'));
    msgEl.textContent = paused ? T('Paused') : T('Reading aloud…');
    pauseBtn.textContent = paused ? T('Resume') : T('Pause');
    toast.querySelector('.skip-next').textContent = T('Skip');
    toast.querySelector('.stop').textContent = T('Stop');
    var s = btn.querySelector('.sr');
    var label = active ? T('Stop reading aloud') : T('Read the page aloud');
    if (s) s.textContent = label;
    btn.title = label;
  }

  function start() {
    queue = build();
    if (!queue.length) return;
    idx = startIndex(queue);
    active = true; paused = false;
    btn.setAttribute('aria-pressed', 'true');
    ensureToast();
    toast.hidden = false;
    labels();
    synth.cancel();
    speakItem();
  }
  function stop() {
    active = false; paused = false; run++;
    synth.cancel();
    mark(null);
    btn.setAttribute('aria-pressed', 'false');
    if (toast) toast.hidden = true;
    labels();
  }
  function togglePause() {
    if (!active) return;
    if (paused) { paused = false; synth.resume(); }
    else { paused = true; synth.pause(); }
    labels();
  }

  btn.addEventListener('click', function () { active ? stop() : start(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) stop(); });
  I.onChange(function () { if (active) stop(); labels(); });
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = function () { /* voices load lazily in Chrome */ };
  synth.getVoices();
  window.addEventListener('pagehide', function () { synth.cancel(); });
  labels();
})();
