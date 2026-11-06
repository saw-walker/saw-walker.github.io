/* SAW Smart Walker: page behaviour and animations. No dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var role = function (el, name) { return el.querySelector('[data-role="' + name + '"]'); };

  /* ---------------- larger text ---------------- */
  var textBtn = $('#textSize');
  function setLarge(on) {
    root.classList.toggle('large-text', on);
    textBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    store.set('saw-large-text', on ? '1' : '0');
  }
  setLarge(store.get('saw-large-text') === '1');
  textBtn.addEventListener('click', function () { setLarge(!root.classList.contains('large-text')); });

  /* ---------------- pause / play all motion ---------------- */
  var motionBtn = $('#motionToggle');
  var motionLabel = $('#motionLabel');
  var saved = store.get('saw-paused');
  var paused = saved === null ? reduceMQ.matches : saved === '1';
  function setPaused(p, remember) {
    paused = p;
    root.classList.toggle('paused', p);
    motionBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
    motionLabel.textContent = p ? 'Play animations' : 'Pause animations';
    motionBtn.title = p ? 'Play animations' : 'Pause animations';
    if (remember) store.set('saw-paused', p ? '1' : '0');
    demos.forEach(function (d) { d.sync(); });
  }
  motionBtn.addEventListener('click', function () { setPaused(!paused, true); });

  /* ---------------- video slot ---------------- */
  (function setupVideo() {
    var cfg = (window.SAW_CONFIG && window.SAW_CONFIG.video) || {};
    var slot = $('#videoSlot');
    if (!slot) return;
    var yt = (cfg.youtubeId || '').trim();
    var mp4 = (cfg.mp4 || '').trim();
    var vimeo = String(cfg.vimeoId || '').trim();
    var vimeoHash = String(cfg.vimeoHash || '').trim();
    if (/^\d{5,12}$/.test(vimeo)) {
      var vf = document.createElement('iframe');
      vf.src = 'https://player.vimeo.com/video/' + vimeo + '?' +
        (/^[0-9a-f]{6,20}$/i.test(vimeoHash) ? 'h=' + vimeoHash + '&' : '') + 'dnt=1&title=0&byline=0&portrait=0';
      vf.title = 'SAW Smart Walker video';
      vf.allow = 'autoplay; fullscreen; picture-in-picture';
      vf.allowFullscreen = true;
      vf.loading = 'lazy';
      slot.innerHTML = '';
      slot.appendChild(vf);
    } else if (yt && /^[\w-]{6,20}$/.test(yt)) {
      // Click-to-load keeps the page light and avoids contacting YouTube until asked.
      slot.innerHTML = '';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'yt-load';
      b.textContent = '▶  Play the SAW video (opens YouTube player)';
      b.addEventListener('click', function () {
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + '?autoplay=1&rel=0';
        f.title = 'SAW Smart Walker video';
        f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        slot.innerHTML = '';
        slot.appendChild(f);
      });
      slot.appendChild(b);
    } else if (mp4) {
      var v = document.createElement('video');
      v.controls = true;
      v.playsInline = true;
      v.preload = 'metadata';
      if (cfg.poster) v.poster = cfg.poster;
      v.src = mp4;
      v.setAttribute('aria-label', 'SAW Smart Walker video');
      slot.innerHTML = '';
      slot.appendChild(v);
    }
  })();

  /* =================================================================
     Demo framework
     Each demo has discrete steps (render(i)) and may also have a
     continuous animation (frame(dt)). Demos run only while visible
     and not paused. "Next" always works, even with motion off.
     ================================================================= */
  var demos = [];

  function Demo(el, def) {
    var self = this;
    this.el = el;
    this.def = def;
    this.i = 0;
    this.visible = false;
    this.timer = null;
    this.raf = null;
    this.last = 0;
    var next = role(el, 'next');
    if (next) next.addEventListener('click', function () { self.next(true); });
    def.init && def.init(this);
    this.go(0);
  }
  Demo.prototype.go = function (i) {
    var n = this.def.steps;
    this.i = ((i % n) + n) % n;
    this.def.render(this.i, this);
  };
  Demo.prototype.next = function (manual) {
    if (this.def.onNext) this.def.onNext(this, manual);
    else this.go(this.i + 1);
    if (manual) this.restartTimer();
  };
  Demo.prototype.running = function () { return this.visible && !paused; };
  Demo.prototype.restartTimer = function () {
    var self = this;
    clearInterval(this.timer);
    this.timer = null;
    if (this.running() && this.def.interval) {
      this.timer = setInterval(function () { self.next(false); }, this.def.interval);
    }
  };
  Demo.prototype.sync = function () {
    var self = this;
    this.restartTimer();
    if (this.def.frame) {
      if (this.running() && !this.raf) {
        this.last = 0;
        var loop = function (ts) {
          if (!self.running()) { self.raf = null; return; }
          var dt = self.last ? Math.min(ts - self.last, 100) : 16;
          self.last = ts;
          self.def.frame(dt, self);
          self.raf = requestAnimationFrame(loop);
        };
        this.raf = requestAnimationFrame(loop);
      } else if (!this.running() && this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = null;
      }
    }
    this.el.classList.toggle('is-running', this.running());
  };

  function setPill(el, text, kind) {
    var p = role(el, 'pill');
    if (!p) return;
    p.textContent = text;
    p.className = 'pill' + (kind ? ' is-' + kind : '');
  }
  function setCaption(el, text) {
    var c = role(el, 'caption');
    if (c) c.textContent = text;
  }
  function setColor(node, color) {
    if (!node) return;
    var cls = (node.getAttribute('class') || '').replace(/\bc-\w+\b/g, '').trim();
    node.setAttribute('class', (cls + ' c-' + color).trim());
  }
  function toggleClass(node, cls, on) {
    if (node) node.classList.toggle(cls, !!on);
  }

  /* ---------------- 1. system overview ---------------- */
  var SYSTEM = [
    { pill: 'Legs', on: ['s-ulidar', 'f-ulidar', 'pi', 'f-esp', 'esp', 'f-lights', 'o-lights'] },
    { pill: 'Balance', on: ['s-fsr', 'f-fsr', 'pi', 'f-tab', 'tab', 'f-voice', 'o-voice'] },
    { pill: 'Posture', on: ['s-cam', 'f-cam', 'pi', 'f-tab', 'tab', 'f-face', 'o-face', 'f-voice', 'o-voice'] },
    { pill: 'Guidance', on: ['s-odo', 'f-odo', 'pi', 'f-esp', 'esp', 'f-lights', 'o-lights', 'f-vibe', 'o-vibe', 'f-tab', 'tab', 'f-voice', 'o-voice'] },
    { pill: 'Obstacles', on: ['s-flidar', 'f-flidar', 'pi', 'f-esp', 'esp', 'f-lights', 'o-lights'] },
    { pill: 'Resting', on: ['pi', 'f-tab', 'tab', 'f-face', 'o-face', 'f-esp', 'esp', 'f-brakes', 'o-brakes'] }
  ];
  var sysDef = {
    steps: SYSTEM.length,
    interval: 4200,
    render: function (i, d) {
      var on = SYSTEM[i].on;
      $$('.node, .flow', d.el).forEach(function (n) {
        var id = (n.id || '').replace(/^sys-/, '');
        n.classList.toggle('on', on.indexOf(id) !== -1);
      });
      var items = $$('[data-role="list"] li', d.el);
      items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      setPill(d.el, SYSTEM[i].pill, 'neutral');
      setCaption(d.el, items[i] ? items[i].textContent : '');
    }
  };

  /* ---------------- 2. legs & gait ---------------- */
  var LEGS = [
    { key: 'ok', pill: 'OK', kind: '', dx: 0, dy: 0, led: 'green', text: 'Legs in the comfort zone. Handle lights green.' },
    { key: 'far', pill: 'Too far', kind: 'warn', dx: 0, dy: 50, led: 'yellow', text: 'Too far behind the walker. Lights turn yellow.' },
    { key: 'ok', pill: 'OK', kind: '', dx: 0, dy: 0, led: 'green', text: 'Back in the zone. Lights green again.' },
    { key: 'close', pill: 'Too close', kind: 'warn', dx: 0, dy: -44, led: 'yellow', text: 'Too close to the walker frame. Lights turn yellow.' },
    { key: 'ok', pill: 'OK', kind: '', dx: 0, dy: 0, led: 'green', text: 'Walking well. Steps are being measured.' },
    { key: 'off', pill: 'Off centre', kind: 'warn', dx: 58, dy: 0, led: 'yellow', text: 'Drifting to one side. Lights turn yellow.' }
  ];
  var legsDef = {
    steps: LEGS.length,
    interval: 3200,
    render: function (i, d) {
      var s = LEGS[i];
      var feet = role(d.el, 'feet');
      feet.style.transform = 'translate(' + s.dx + 'px,' + s.dy + 'px)';
      toggleClass(feet, 'walking', s.key === 'ok');
      setColor(role(d.el, 'ledL'), s.led);
      setColor(role(d.el, 'ledR'), s.led);
      setPill(d.el, s.pill, s.kind);
      setCaption(d.el, s.text);
      if (s.key === 'ok') {
        var step = 0.38 + Math.random() * 0.08;
        var cad = 88 + Math.round(Math.random() * 16);
        role(d.el, 'm-step').textContent = step.toFixed(2) + ' m';
        role(d.el, 'm-cad').textContent = cad + ' steps/min';
        role(d.el, 'm-spd').textContent = (step * cad / 60).toFixed(2) + ' m/s';
      }
    }
  };

  /* ---------------- 3. balance ---------------- */
  var BAL = [[0.55, 0.52], [0.85, 0.32], [0.5, 0.55], [0.28, 0.8], [0, 0]];
  var balDef = {
    steps: BAL.length,
    interval: 3200,
    render: function (i, d) {
      var L = BAL[i][0], R = BAL[i][1], sum = L + R;
      var idx = sum > 0 ? Math.abs(R - L) / sum : 0;
      var barL = role(d.el, 'barL'), barR = role(d.el, 'barR');
      barL.style.transform = 'scaleY(' + Math.max(L, 0.02) + ')';
      barR.style.transform = 'scaleY(' + Math.max(R, 0.02) + ')';
      toggleClass(barL, 'heavy', idx > 0.2 && L > R);
      toggleClass(barR, 'heavy', idx > 0.2 && R > L);
      role(d.el, 'beam').style.transform = 'rotate(' + ((R - L) * 26).toFixed(1) + 'deg)';
      if (sum === 0) {
        setPill(d.el, 'Hands off', 'neutral');
        setCaption(d.el, 'No pressure on either handle: nobody is holding on.');
      } else if (idx <= 0.2) {
        setPill(d.el, 'Balanced', '');
        setCaption(d.el, 'Balance index ' + idx.toFixed(2) + ' (0.2 or less is balanced).');
      } else {
        setPill(d.el, 'Uneven', 'amber');
        setCaption(d.el, 'More weight on the ' + (L > R ? 'left' : 'right') + ' (index ' + idx.toFixed(2) + '). “Try to keep a gentle, even pressure through both hands.”');
      }
    }
  };

  /* ---------------- shared path-following helper ---------------- */
  function pathFollower(path) {
    var len = path.getTotalLength();
    path.style.strokeDasharray = len + ' ' + len;
    return {
      len: len,
      at: function (s) {
        s = Math.max(0, Math.min(len, s));
        var p = path.getPointAtLength(s);
        var q = path.getPointAtLength(Math.min(len, s + 2));
        var o = path.getPointAtLength(Math.max(0, s - 2));
        return { x: p.x, y: p.y, a: Math.atan2(q.y - o.y, q.x - o.x) };
      },
      draw: function (s) { path.style.strokeDashoffset = (len - s); }
    };
  }
  var DEG = 180 / Math.PI;

  /* ---------------- 4. odometry ---------------- */
  var odoDef = {
    steps: 5,
    init: function (d) {
      d.path = pathFollower(role(d.el, 'route'));
      d.s = 0;
      d.hold = 0;
    },
    render: function (i, d) {
      d.s = d.path.len * (i / 4);
      d.hold = 0;
      odoDraw(d);
    },
    onNext: function (d) {
      var k = Math.floor((d.s / d.path.len) * 4 + 1e-6) + 1;
      if (k > 4) k = 0;
      d.go(k);
    },
    frame: function (dt, d) {
      if (d.s >= d.path.len) {
        d.hold += dt;
        if (d.hold > 2200) { d.s = 0; d.hold = 0; }
      } else {
        d.s += dt * 0.04;
      }
      odoDraw(d);
    }
  };
  function odoDraw(d) {
    var s = Math.min(d.s, d.path.len);
    var p = d.path.at(s);
    var heading = p.a * DEG + 90;
    d.path.draw(s);
    role(d.el, 'dot').setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + heading.toFixed(1) + ')');
    role(d.el, 'needle').style.transform = 'rotate(' + heading.toFixed(1) + 'deg)';
    role(d.el, 'wheel').style.transform = 'rotate(' + (s * 3).toFixed(1) + 'deg)';
    role(d.el, 'ticks').textContent = Math.round(s * 24) + ' ticks';
    if (s >= d.path.len - 0.5) {
      setPill(d.el, 'Route saved', 'info');
      setCaption(d.el, 'The walker now knows this route and can guide someone along it.');
    } else {
      setPill(d.el, 'Tracking', '');
      setCaption(d.el, 'Distance from the wheels, direction from the IMU.');
    }
  }

  /* ---------------- 5. posture ---------------- */
  var POSTURE = [
    { pill: 'Standing', kind: '', t: 'none', text: 'Shoulders level and at the calibrated height.' },
    { pill: 'Leaning forward', kind: 'amber', t: 'scale(1.16)', text: 'Shoulders look wider because the upper body is closer to the camera.' },
    { pill: 'Standing', kind: '', t: 'none', text: 'Upright again.' },
    { pill: 'Tilted', kind: 'amber', t: 'rotate(-10deg)', text: 'The shoulder line is no longer level: leaning to one side.' },
    { pill: 'Seated', kind: 'info', t: 'translateY(46px)', text: 'Shoulders dropped well below standing height: the user has sat down.' }
  ];
  var postureDef = {
    steps: POSTURE.length,
    interval: 3200,
    render: function (i, d) {
      var s = POSTURE[i];
      role(d.el, 'fig').style.transform = s.t;
      setPill(d.el, s.pill, s.kind);
      setCaption(d.el, s.text);
    }
  };

  /* ---------------- 6. ESP32 ---------------- */
  var ESP = [
    { cmd: 'leds left 0 255 0 20', strip: 'green', vib: false, rod: false, text: 'Left handle LEDs glow green (red, green, blue, brightness).' },
    { cmd: 'leds right 255 150 0 20', strip: 'amber', vib: false, rod: false, text: 'Right handle LEDs glow amber.' },
    { cmd: 'vibr left 1', strip: 'amber', vib: true, rod: false, text: 'Left handle vibrates: 200 ms on, 200 ms off.' },
    { cmd: 'vibr left 0', strip: 'amber', vib: false, rod: false, text: 'Vibration stops.' },
    { cmd: '/brakes ← true', strip: 'off', vib: false, rod: true, text: 'Brakes engage, for example before you sit down to rest.' },
    { cmd: '/brakes ← false', strip: 'off', vib: false, rod: false, text: 'Brakes release when you are ready to walk again.' },
    { cmd: 'enc 10342 10355', strip: 'off', vib: false, rod: false, text: 'The ESP32 streams wheel encoder counts back to the Pi.' }
  ];
  var espDef = {
    steps: ESP.length,
    interval: 2800,
    render: function (i, d) {
      var s = ESP[i];
      role(d.el, 'cmd').textContent = s.cmd;
      $$('rect', role(d.el, 'strip')).forEach(function (r) { setColor(r, s.strip); });
      toggleClass(role(d.el, 'vib'), 'on', s.vib);
      toggleClass(role(d.el, 'rod'), 'on', s.rod);
      setCaption(d.el, s.text);
    }
  };

  /* ---------------- 7. companion ---------------- */
  // Prompts are taken from the walker's web app and behaviour scripts.
  var TASKS = {
    medication: { title: 'Medication', steps: [
      ['We will simulate the process of taking medication.', 'neutral'],
      ['Open the lid with Monday label on it, by pressing the white plastic part.', 'neutral'],
      ['Take one pill. Put it in your mouth and chew it.', 'neutral'],
      ['Drink a bit of water.', 'neutral'],
      ['You have finished the activity of taking medication. Well done', 'happy']
    ] },
    walk: { title: 'Walking', steps: [
      ['We are going to do a walking session for 3 minutes.', 'neutral'],
      ['Start walking now at your own pace.', 'neutral'],
      ['You have completed the walking session. Well done', 'happy']
    ] },
    rest: { title: 'Resting', steps: [
      ['We are going to do a short resting session.', 'neutral'],
      ['Walk to the living room and wait standing in front of the sofa.', 'neutral'],
      ['Make sure the back of your legs are touching the front edge of the sofa.', 'neutral'],
      ['The brakes are being engaged.', 'neutral'],
      ['Slowly sit down while maintaining a relaxed grip on the walker handles.', 'neutral'],
      ['Push down on the walker gently and stand up slowly using its support.', 'neutral'],
      ['The brakes are being disengaged.', 'neutral'],
      ['You have successfully completed the resting session. Well done', 'happy']
    ] },
    chat: { title: 'Chat', steps: [
      ['Before we begin, please tell me your name.', 'neutral'],
      ['Excellent. We can have a chat now. When you want to stop, just say exit.', 'neutral'],
      ['Thank you. It was lovely talking with you.', 'happy']
    ] }
  };
  var TASK_ORDER = ['medication', 'walk', 'rest', 'chat'];
  var compDef = {
    steps: 1,
    interval: 3600,
    init: function (d) {
      d.task = 'medication';
      d.k = 0;
      $$('button[data-task]', d.el).forEach(function (b) {
        b.addEventListener('click', function () {
          d.task = b.getAttribute('data-task');
          d.k = 0;
          compShow(d);
          d.restartTimer();
        });
      });
      $$('button[data-emotion]', d.el).forEach(function (b) {
        b.addEventListener('click', function () {
          role(d.el, 'face').setAttribute('data-emotion', b.getAttribute('data-emotion'));
          d.restartTimer();
        });
      });
    },
    render: function (i, d) { compShow(d); },
    onNext: function (d) {
      d.k += 1;
      if (d.k >= TASKS[d.task].steps.length) {
        d.k = 0;
        d.task = TASK_ORDER[(TASK_ORDER.indexOf(d.task) + 1) % TASK_ORDER.length];
      }
      compShow(d);
    }
  };
  function compShow(d) {
    var t = TASKS[d.task];
    var step = t.steps[d.k];
    var face = role(d.el, 'face');
    face.setAttribute('data-emotion', step[1]);
    role(d.el, 'title').textContent = t.title;
    setCaption(d.el, step[0]);
    role(d.el, 'count').textContent = 'Step ' + (d.k + 1) + ' of ' + t.steps.length;
    $$('button[data-task]', d.el).forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-task') === d.task ? 'true' : 'false');
    });
    face.classList.add('talking');
    clearTimeout(d.talkT);
    d.talkT = setTimeout(function () { face.classList.remove('talking'); }, 1900);
  }

  /* ---------------- 8. navigation ---------------- */
  var NAV_LIGHTS = {
    straight: ['green', 'green', 'Go straight', '', 'Both handles green.'],
    left: ['green', 'off', 'Turn left', 'neutral', 'Left handle lights up and vibrates.'],
    right: ['off', 'green', 'Turn right', 'neutral', 'Right handle lights up and vibrates.'],
    arrived: ['blue', 'blue', 'Arrived', 'info', '“You have arrived.” Both handles blue.']
  };
  var navDef = {
    steps: 5,
    init: function (d) {
      d.path = pathFollower(role(d.el, 'route'));
      d.s = 0;
      d.hold = 0;
      d.instr = null;
    },
    render: function (i, d) {
      d.s = [0, 0.16, 0.42, 0.74, 1][i] * d.path.len;
      d.hold = 0;
      navDraw(d);
    },
    onNext: function (d) {
      var f = d.s / d.path.len;
      var keys = [0, 0.16, 0.42, 0.74, 1];
      var k = 0;
      while (k < keys.length && keys[k] <= f + 1e-3) k++;
      d.go(k >= keys.length ? 0 : k);
    },
    frame: function (dt, d) {
      if (d.s >= d.path.len) {
        d.hold += dt;
        if (d.hold > 2600) { d.s = 0; d.hold = 0; }
      } else {
        d.s += dt * 0.036;
      }
      navDraw(d);
    }
  };
  function navDraw(d) {
    var s = Math.min(d.s, d.path.len);
    var p = d.path.at(s);
    var ahead = d.path.at(Math.min(d.path.len, s + 46));
    var turn = (ahead.a - p.a) * DEG;
    if (turn > 180) turn -= 360;
    if (turn < -180) turn += 360;
    var instr = 'straight';
    if (s >= d.path.len - 1) instr = 'arrived';
    else if (turn > 25) instr = 'right';
    else if (turn < -25) instr = 'left';
    d.path.draw(s);
    role(d.el, 'walker').setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + (p.a * DEG + 90).toFixed(1) + ')');
    if (instr !== d.instr) {
      d.instr = instr;
      var L = NAV_LIGHTS[instr];
      var hl = role(d.el, 'hl'), hr = role(d.el, 'hr');
      setColor(hl, L[0]);
      setColor(hr, L[1]);
      toggleClass(hl, 'buzz', instr === 'left');
      toggleClass(hr, 'buzz', instr === 'right');
      setPill(d.el, L[2], L[3]);
      setCaption(d.el, (instr === 'left' || instr === 'right' ? '“' + L[2] + '.” ' : '') + L[4]);
    }
  }

  /* ---------------- wire up ---------------- */
  var DEFS = {
    system: sysDef, legs: legsDef, balance: balDef, odometry: odoDef,
    posture: postureDef, esp32: espDef, companion: compDef, nav: navDef
  };
  $$('[data-demo]').forEach(function (el) {
    var def = DEFS[el.getAttribute('data-demo')];
    if (def) demos.push(new Demo(el, def));
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        demos.forEach(function (d) {
          if (d.el === e.target) { d.visible = e.isIntersecting; d.sync(); }
        });
      });
    }, { threshold: 0.25 });
    demos.forEach(function (d) { io.observe(d.el); });
  } else {
    demos.forEach(function (d) { d.visible = true; });
  }

  setPaused(paused, false);
  if (reduceMQ.addEventListener) {
    reduceMQ.addEventListener('change', function (e) {
      if (store.get('saw-paused') === null) setPaused(e.matches, false);
    });
  }
})();
