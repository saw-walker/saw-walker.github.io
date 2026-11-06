// Three.js scenes for the hero (3D line-art walker) and the band (live laser scan).
// Ink-on-paper look: flat paper-coloured meshes with dark outline edges, blue accents.
// Falls back to the inline SVG drawings when WebGL is unavailable.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isPaused = () => document.documentElement.classList.contains('paused') || reduceMotion.matches;

function cssColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, d) => (cs.getPropertyValue(n).trim() || d);
  return { ink: v('--ink', '#1d1e22'), bg: v('--bg', '#f1f2ee'), blue: v('--blue', '#1f6fe0'), soft: v('--blue-soft', '#5b9cf2') };
}

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

/** Shared scaffolding: renderer in a container, resize, visibility-gated loop. */
function mountScene(container, build) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene3d';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const api = build({ scene, camera, renderer, canvas, colors: cssColors() });

  container.classList.add('has-3d');
  container.appendChild(canvas);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight || w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    api.onResize && api.onResize(w, h);
    renderer.render(scene, camera);
  };
  new ResizeObserver(resize).observe(container);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);

  const clock = new THREE.Clock();
  let t = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    if (!isPaused()) t += dt;
    api.update(t, dt);
    renderer.render(scene, camera);
  });

  const recolor = () => { api.recolor && api.recolor(cssColors()); renderer.render(scene, camera); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
  return api;
}

/* ───────────── outline helpers ───────────── */

function inked(geometry, colors, opts = {}) {
  const fill = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: opts.fill || colors.bg, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }));
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, opts.threshold ?? 25),
    new THREE.LineBasicMaterial({ color: opts.line || colors.ink }));
  const g = new THREE.Group();
  g.add(fill, edges);
  g.userData = { fill, edges };
  return g;
}

const inkMats = new Set();
function inkMat(colors) {
  const m = new THREE.MeshBasicMaterial({ color: colors.ink });
  inkMats.add(m);
  return m;
}

/** Thin solid ink stroke between two points (reads like a pen line from any angle). */
function tube(a, b, r, colors) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const geo = new THREE.CylinderGeometry(r, r, dir.length(), 8, 1);
  const g = new THREE.Mesh(geo, inkMat(colors));
  g.position.copy(a).addScaledVector(dir, 0.5);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return g;
}

function faceTexture(colors, blink) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 180;
  const x = c.getContext('2d');
  x.fillStyle = colors.bg; x.fillRect(0, 0, 256, 180);
  x.strokeStyle = colors.ink; x.fillStyle = colors.ink; x.lineWidth = 9; x.lineCap = 'round';
  if (blink) {
    x.beginPath(); x.moveTo(80, 72); x.lineTo(108, 72); x.moveTo(148, 72); x.lineTo(176, 72); x.stroke();
  } else {
    x.beginPath(); x.arc(94, 72, 12, 0, Math.PI * 2); x.arc(162, 72, 12, 0, Math.PI * 2); x.fill();
  }
  x.beginPath(); x.arc(128, 100, 34, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ───────────── hero: 3D walker ───────────── */

function heroScene({ scene, camera, canvas, colors }) {
  const walker = new THREE.Group();
  scene.add(walker);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const parts = [];
  const add = (o) => { walker.add(o); parts.push(o); return o; };

  // Frame (units ~ metres): width 0.56, depth 0.5, handles at 0.9 m
  for (const s of [-1, 1]) {
    const x = 0.28 * s;
    add(tube(V(x, 0.08, 0.22), V(x, 0.86, 0.12), 0.009, colors));   // front leg
    add(tube(V(x, 0.08, -0.24), V(x, 0.88, -0.14), 0.009, colors)); // rear leg (user side)
    add(tube(V(x, 0.86, 0.12), V(x, 0.88, -0.14), 0.009, colors));  // top rail
    add(tube(V(x, 0.88, -0.14), V(x, 0.9, -0.3), 0.011, colors));   // handle
    add(tube(V(x, 0.42, 0.18), V(x, 0.44, -0.2), 0.008, colors));   // seat rail
  }
  add(tube(V(-0.28, 0.2, 0.2), V(0.28, 0.2, 0.2), 0.008, colors));   // low bar with the laser

  const seat = add(inked(new THREE.BoxGeometry(0.46, 0.05, 0.34), colors));
  seat.position.set(0, 0.47, -0.01);
  // basket under the seat (holds the onboard electronics and CPU)
  const basket = add(inked(new THREE.BoxGeometry(0.4, 0.2, 0.28), colors));
  basket.position.set(0, 0.33, -0.01);

  // Tablet with face on a tall pole rising from the left side of the frame
  add(tube(V(-0.3, 0.3, -0.18), V(-0.3, 1.12, -0.1), 0.009, colors));
  add(tube(V(-0.3, 1.12, -0.1), V(-0.2, 1.28, -0.06), 0.009, colors));
  const tablet = add(inked(new THREE.BoxGeometry(0.3, 0.2, 0.02), colors));
  tablet.position.set(-0.12, 1.34, -0.04);
  // Screen is on the user side (-z); lean its top away from the user so it faces up towards their eyes.
  tablet.rotation.x = 0.3;
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture(colors, false) });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.18), faceMat);
  face.position.set(0, 0, -0.011);
  face.rotation.y = Math.PI;
  tablet.add(face);

  // Lights: the U-shaped bar between the handles lights up (the handlebars themselves only vibrate)
  const lightMat = new THREE.MeshBasicMaterial({ color: colors.blue });
  const uCurve = new THREE.CatmullRomCurve3([
    V(-0.28, 0.89, -0.2), V(-0.26, 0.82, -0.14), V(-0.16, 0.79, -0.1), V(0, 0.78, -0.09),
    V(0.16, 0.79, -0.1), V(0.26, 0.82, -0.14), V(0.28, 0.89, -0.2)]);
  const lightBar = new THREE.Mesh(new THREE.TubeGeometry(uCurve, 48, 0.016, 10, false), lightMat);
  walker.add(lightBar);

  // Wheels
  for (const s of [-1, 1]) for (const z of [0.22, -0.24]) {
    const w = add(inked(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24), colors, { threshold: 30 }));
    w.rotation.z = Math.PI / 2;
    w.position.set(0.28 * s, 0.075, z);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.007, 8, 32), inkMat(colors));
    rim.rotation.y = Math.PI / 2;
    rim.position.copy(w.position);
    walker.add(rim);
  }

  // One 360° LiDAR on the low front bar, with its spinning beam near the floor
  const puck = add(inked(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 20), colors));
  puck.position.set(0, 0.235, 0.2);
  const fanGeo = new THREE.CircleGeometry(0.9, 48, 0, Math.PI / 5);
  const fanMat = new THREE.MeshBasicMaterial({ color: colors.blue, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.rotation.x = -Math.PI / 2;
  fan.position.set(0, 0.24, 0.2);
  walker.add(fan);

  // Camera on the light bar at hip height, looking up at the user's shoulders (user side is -z),
  // with the speaker just below it
  const camPos = V(0.12, 0.83, -0.11);
  const camBody = add(inked(new THREE.BoxGeometry(0.07, 0.05, 0.04), colors));
  camBody.position.copy(camPos);
  const speaker = add(inked(new THREE.BoxGeometry(0.1, 0.05, 0.05), colors));
  speaker.position.set(0.12, 0.74, -0.1);
  const lensMat = new THREE.MeshBasicMaterial({ color: colors.blue });
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 16), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, -0.022);
  camBody.add(lens);

  // Shoulder landmarks floating where a user would stand, with the shoulder line between them
  const shoulders = new THREE.Group();
  shoulders.position.set(0, 1.28, -0.62);
  walker.add(shoulders);
  const lmMat = new THREE.MeshBasicMaterial({ color: colors.blue });
  const lmL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), lmMat);
  const lmR = lmL.clone();
  lmL.position.x = -0.17; lmR.position.x = 0.17;
  const sLineMat = new THREE.LineBasicMaterial({ color: colors.blue });
  const sLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-0.17, 0, 0), V(0.17, 0, 0)]), sLineMat);
  const headMat = new THREE.LineBasicMaterial({ color: colors.blue, transparent: true, opacity: 0.6 });
  const head = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2; return V(Math.cos(a) * 0.07, 0.15 + Math.sin(a) * 0.085, 0); })), headMat);
  shoulders.add(lmL, lmR, sLine, head);

  // View frustum: a four-sided pyramid from the lens to the shoulders
  const camTarget = V(0, 1.2, -0.62);
  const camDir = new THREE.Vector3().subVectors(camTarget, camPos);
  const camLen = camDir.length();
  const frustGeo = new THREE.ConeGeometry(0.34, camLen, 4, 1, true);
  frustGeo.rotateY(Math.PI / 4);
  frustGeo.translate(0, -camLen / 2, 0);
  const frustMat = new THREE.MeshBasicMaterial({ color: colors.blue, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
  const frustEdgeMat = new THREE.LineBasicMaterial({ color: colors.blue, transparent: true, opacity: 0.55 });
  const frustum = new THREE.Group();
  frustum.add(new THREE.Mesh(frustGeo, frustMat), new THREE.LineSegments(new THREE.EdgesGeometry(frustGeo), frustEdgeMat));
  frustum.position.copy(camPos).add(V(0, 0, -0.025));
  frustum.quaternion.setFromUnitVectors(V(0, -1, 0), camDir.clone().normalize());
  walker.add(frustum);
  // A detection square that slides up the frustum, like a frame being analysed
  const scanSq = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    [V(-1, 0, -1), V(1, 0, -1), V(1, 0, 1), V(-1, 0, 1)].map((p) => p.multiplyScalar(0.34 / Math.SQRT2))), frustEdgeMat);
  frustum.add(scanSq);

  // Scan dots on the floor around the walker
  const N = 140;
  const dotGeo = new THREE.BufferGeometry();
  const dotPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, r = 1.0 + 0.25 * Math.sin(a * 3) + 0.1 * Math.cos(a * 7);
    dotPos.set([Math.cos(a) * r, 0.002, 0.2 + Math.sin(a) * r], i * 3);
  }
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  const dotMat = new THREE.PointsMaterial({ color: colors.blue, size: 0.028, transparent: true, opacity: 0.85 });
  walker.add(new THREE.Points(dotGeo, dotMat));

  // Floor line
  const floorMat = new THREE.LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.35 });
  const floor = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CircleGeometry(1.35, 64)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  camera.position.set(3.3, 2.1, 3.8);
  camera.lookAt(0, 0.72, -0.05);

  // Drag to rotate
  // start with the face screen (user side, -z) turned towards the camera
  let yaw = Math.PI - 0.7, target = Math.PI - 0.7, dragging = false, lastX = 0, idle = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (dragging) { target += (e.clientX - lastX) * 0.01; lastX = e.clientX; idle = 0; } });
  canvas.addEventListener('pointerup', () => { dragging = false; });

  let blinkState = false;
  let cur = colors;
  return {
    update(t, dt) {
      idle += dt;
      if (!dragging && idle > 2 && !isPaused()) target += dt * 0.35;
      yaw += (target - yaw) * 0.08;
      walker.rotation.y = yaw;
      floor.rotation.z = 0;
      fan.rotation.z = t * 5.5;
      const glow = 0.55 + 0.45 * Math.sin(t * 3);
      lightMat.color.set(glow > 0.5 ? cur.blue : cur.soft);
      dotMat.opacity = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2));
      // camera: frame sweeps from lens to shoulders, shoulders sway like the posture demo
      const f = (t * 0.6) % 1;
      scanSq.position.y = -camLen * f;
      scanSq.scale.setScalar(Math.max(f, 0.02));
      frustMat.opacity = 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(t * 2.4));
      shoulders.rotation.z = 0.12 * Math.sin(t * 0.9);
      lensMat.color.set((t % 1.6) < 0.8 ? cur.blue : cur.soft);
      const blink = (t % 4) < 0.15;
      if (blink !== blinkState) {
        blinkState = blink;
        faceMat.map.dispose();
        faceMat.map = faceTexture(cssColors(), blink);
        faceMat.needsUpdate = true;
      }
    },
    recolor(c) {
      cur = c;
      parts.forEach((p) => p.traverse((o) => {
        if (o.userData.fill) { o.userData.fill.material.color.set(c.bg); o.userData.edges.material.color.set(c.ink); }
      }));
      inkMats.forEach((m) => m.color.set(c.ink));
      lmMat.color.set(c.blue); sLineMat.color.set(c.blue); headMat.color.set(c.blue);
      frustMat.color.set(c.blue); frustEdgeMat.color.set(c.blue); lensMat.color.set(c.blue);
      lightMat.color.set(c.blue); fanMat.color.set(c.blue); dotMat.color.set(c.blue); floorMat.color.set(c.ink);
      faceMat.map = faceTexture(c, false); faceMat.needsUpdate = true;
    },
  };
}

/* ───────────── band: simulated laser scan of a room and walking legs ───────────── */

function bandScene({ scene, camera, colors }) {
  // 2D world on the floor plane (x right, z towards the viewer). Laser at the origin.
  const room = { x0: -2.6, x1: 2.6, z0: -1.6, z1: 1.8 };
  const furniture = [{ x: -1.6, z: -1.0, r: 0.35 }, { x: 1.7, z: -0.9, r: 0.28 }];
  const RAYS = 360;

  const ink = new THREE.LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.25 });
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(room.x0, 0, room.z0), new THREE.Vector3(room.x1, 0, room.z0),
    new THREE.Vector3(room.x1, 0, room.z1), new THREE.Vector3(room.x0, 0, room.z1)]), ink);
  scene.add(outline);

  // Walker footprint (top view) and laser
  const walkerOutline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.28, 0, -0.45), new THREE.Vector3(0.28, 0, -0.45),
    new THREE.Vector3(0.28, 0, 0.05), new THREE.Vector3(-0.28, 0, 0.05)]),
    new THREE.LineBasicMaterial({ color: colors.ink }));
  scene.add(walkerOutline);
  const laser = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshBasicMaterial({ color: colors.ink }));
  laser.rotation.x = -Math.PI / 2;
  scene.add(laser);

  // Two legs (cylinders) walking behind the walker (towards +z)
  const legMat = new THREE.MeshBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.85 });
  const legs = [-1, 1].map(() => {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.5, 18), legMat);
    g.position.y = 0.25;
    scene.add(g);
    return g;
  });

  // Scan points: walls in ink, legs in blue
  const pos = new Float32Array(RAYS * 3);
  const col = new Float32Array(RAYS * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const ptsMat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true });
  scene.add(new THREE.Points(geo, ptsMat));

  // Sweeping beam
  const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
  const beamMat = new THREE.LineBasicMaterial({ color: colors.blue });
  const beam = new THREE.Line(beamGeo, beamMat);
  scene.add(beam);

  let cInk = new THREE.Color(colors.ink), cBlue = new THREE.Color(colors.blue);
  const circles = () => [
    ...furniture.map((f) => ({ ...f, leg: false })),
    ...legs.map((l) => ({ x: l.position.x, z: l.position.z, r: 0.06, leg: true })),
  ];

  function cast(a, objs) {
    const dx = Math.cos(a), dz = Math.sin(a);
    let best = Infinity, leg = false;
    // room walls
    if (dx > 1e-6) best = Math.min(best, room.x1 / dx); else if (dx < -1e-6) best = Math.min(best, room.x0 / dx);
    if (dz > 1e-6) best = Math.min(best, room.z1 / dz); else if (dz < -1e-6) best = Math.min(best, room.z0 / dz);
    // round obstacles and legs
    for (const o of objs) {
      const b = dx * o.x + dz * o.z;
      const c = o.x * o.x + o.z * o.z - o.r * o.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const d = b - Math.sqrt(disc);
      if (d > 0.05 && d < best) { best = d; leg = o.leg; }
    }
    return { d: best, leg };
  }

  camera.position.set(0, 7.2, 3.6);
  camera.lookAt(0, 0, 0.2);

  let sweep = 0, lastT = -1;
  return {
    update(t) {
      if (t === lastT) return; // paused or reduced motion: keep the last frame
      const first = lastT < 0;
      lastT = t;
      // walking legs: alternate forward/back around 0.55 m behind the laser
      const p = Math.sin(t * 2.6);
      legs[0].position.set(-0.11, 0.25, 0.6 + 0.16 * p);
      legs[1].position.set(0.11, 0.25, 0.6 - 0.16 * p);
      legs[0].rotation.x = -0.25 * p; legs[1].rotation.x = 0.25 * p;

      const objs = circles();
      const jitter = () => (Math.random() - 0.5) * 0.015;
      const step = Math.floor(sweep);
      const batch = first ? RAYS : 12;
      sweep = (sweep + 12) % RAYS; // reveal the scan progressively like a spinning laser
      for (let k = 0; k < batch; k++) {
        const i = (step + k) % RAYS;
        const a = (i / RAYS) * Math.PI * 2;
        const { d, leg } = cast(a, objs);
        pos[i * 3] = Math.cos(a) * d + jitter();
        pos[i * 3 + 1] = 0.01;
        pos[i * 3 + 2] = Math.sin(a) * d + jitter();
        const c = leg ? cBlue : cInk;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      const ba = ((step + 12) / RAYS) * Math.PI * 2;
      const bd = cast(ba, objs).d;
      beamGeo.attributes.position.setXYZ(1, Math.cos(ba) * bd, 0.01, Math.sin(ba) * bd);
      beamGeo.attributes.position.needsUpdate = true;
    },
    recolor(c) {
      cInk = new THREE.Color(c.ink); cBlue = new THREE.Color(c.blue);
      ink.color.set(c.ink); walkerOutline.material.color.set(c.ink); laser.material.color.set(c.ink);
      legMat.color.set(c.ink); beamMat.color.set(c.blue);
    },
  };
}

/* ───────────── boot ───────────── */

if (webglOk()) {
  const hero = document.querySelector('.hero-art');
  const band = document.querySelector('.band-art');
  try { if (hero) mountScene(hero, heroScene); } catch (e) { console.warn('hero 3D unavailable', e); }
  try { if (band) mountScene(band, bandScene); } catch (e) { console.warn('band 3D unavailable', e); }
}
