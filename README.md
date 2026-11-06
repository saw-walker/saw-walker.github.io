# saw-walker.github.io

Public website for the **SAW (Socially Assistive Walker)** PhD project by Sergio D. Sierra Marín
(Bristol Robotics Laboratory, UWE Bristol). Visitors reach it by scanning a QR code at a museum,
so it is built mobile-first, loads fast and needs no build step.

Live URL: https://saw-walker.github.io/

## Structure

```
index.html              The whole page: hero, exhibition guide, video, how it works, publications, thesis, team, funding
assets/css/style.css    All styles (light/dark via prefers-color-scheme, large-text mode, reduced motion)
assets/js/main.js       Video slot, larger-text and pause toggles, and the animated SVG demos
assets/js/i18n.js       Language menu and page translation
assets/js/speak.js      Read-aloud button (browser speech synthesis)
assets/i18n/<lang>.js   Translations: es, fr, de, zh (keys.json lists every English string)
assets/img/logos/       Funder and university logos (official files, see Funding below)
assets/img/logo.png     Project logo (resized from saw_sw/logoSW.png)
assets/img/icon-180.png Favicon / touch icon
assets/img/saw-hardware.jpg  Labelled walker photo (from the co-design paper's fig/smart-walker.pdf)
.nojekyll               Tells GitHub Pages to serve files as they are
```

Everything is plain HTML/CSS/JS. The hero walker and the laser-scan band are three.js scenes
(`assets/js/scenes.js`, three@0.160.0 from jsDelivr); without WebGL the inline SVG drawings show instead. Fonts (Saira Condensed, Dosis) come from Google Fonts;
the project video is embedded from Vimeo (with `dnt=1`) and the study video from figshare.

### Accessibility

- System fonts at an 18px base size, plus an **A+** button that enlarges all text (remembered per device).
- A **pause** button stops every animation. `prefers-reduced-motion` starts with animations paused and
  removes CSS motion. Every demo has a **Next** button, so it can be stepped through by hand.
- **Read aloud** (speaker button): reads the page with the browser's own voices, starting from what is
  on screen, highlighting and scrolling to each paragraph. Pause, skip and stop from the bar at the
  bottom, or press Esc. It uses the voice for the chosen language; nothing is sent anywhere.
- **Language menu**: English, Español, Français, Deutsch, 中文. Picked from `?lang=xx`, then the last
  choice on this device, then the browser language.
- Colour tokens target WCAG AA contrast in light and dark mode, all touch targets are at least 44px,
  and every SVG has a title and description.

### The "How it works" demos

Each demo is an inline SVG in `index.html` and is driven by `assets/js/main.js` (`DEFS` at the bottom
maps `data-demo="…"` to its behaviour). Demos run only while on screen. Every claim was checked against
the walker code in `saw_sw` / `saw_sw_museum`:

| Demo | Source in the walker code |
|---|---|
| Leg tracking and gait, zone feedback | `saw_sw_perception/scripts/walk_legs_web_node.py` (DBSCAN + Kalman per leg; `too_far`, `too_close`, `off_center`, `crossing`; green/yellow/blue lights), `gait_analysis_node.py` (step length, cadence, speed) |
| Handle force / balance | `saw_sw_base/scripts/fsr_node.py`, balance index `fsr_balance_ok = 0.2` in `walk_legs_web_node.py`, spoken prompt in `saw_sw_behaviors/scripts/older_adult_demo_node.py` |
| Odometry | `saw2_odometry_node.py` (encoders for distance, IMU yaw for heading), `saw2_i2c_acquirer.py` (BNO08x + Madgwick) |
| ESP32 controller | `saw_sw_base/Walker_commander_OTA_RTOS.ino` (FreeRTOS tasks, `leds`, `vibr`, `brakes`, `encoders` commands, 20 LEDs per strip, 200 ms vibration pulses, OTA), `saw2_esp32_cmndr_node.py` |
| Posture | `saw_sw_perception/scripts/saw2_posture_node.py` (MediaPipe shoulders; standing, leaning forward, tilted left/right, seated) |
| Companion and micro-prompts | `saw_sw_web/interface/src/app/agent/*` (emotions, blinking, talking), `modules/micro-prompting/micro-prompting.component.ts` (medication, walking, resting prompts, brakes), `speaker_node.py` (gTTS), `gpt_node.py` (conversation) |
| Navigation guidance | `saw_sw_navigation/scripts/nav_assist_node.py` (record/follow routes, light table, voice), `navigation_feedback.py`, `saw_sw_behaviors/scripts/co_creation_demo.py` (vibration left/right = turn) |
| Fall demo and brakes | `saw_sw_behaviors/scripts/falls_demo.py` |

The gait numbers in the leg-tracking demo are illustrative, and the page says so.

### Translations

`assets/js/i18n.js` translates the English page in place. Each translation file maps the English text of
an element (whitespace collapsed) to its translation, which may include the same inline markup
(`<strong>`, `<em>`, links). Paper titles, authors, venues, DOIs and anything marked `translate="no"`
stay as they are. Demo captions in `main.js` go through `T()`, with `{n}`-style placeholders.

- **Changing English text:** the edited sentence shows in English in every language until its
  translation is updated. Nothing breaks.
- **Finding untranslated text:** open the page with `?lang=es` and run
  `SAW_I18N.keys().filter(k => !(k.key in SAW_I18N_DATA.es))` in the browser console.
- **Adding a language:** add it to `LANGS` in `i18n.js` (name and speech voice code) and create
  `assets/i18n/<code>.js` in the same format as `es.js`.

The translations were machine-assisted and should be checked by native speakers before wide use.

## Funding (logos)

| Project | Logo file | Source |
|---|---|---|
| SAW-Health, MRC Ageing Research Development Award, grant MR/Y010620/1 (2023–25) | `ukri-mrc.png` | ukri.org |
| FARSCOPE CDT (EPSRC) | `ukri-epsrc.png` + text wordmark | ukri.org |
| VIVO Hub for Enhanced Independent Living (EPSRC) | `ukri-epsrc.png` + text wordmark | ukri.org |
| Universities | `uwe-bristol.png`, `university-of-bristol.svg` | farscope.bris.ac.uk, bristol.ac.uk |

FARSCOPE and VIVO Hub have no downloadable official logo, so their names are set as text. Swap in the
official files when the project offices provide them.

## Staff pages (museum)

Not linked from the main page and hidden from search engines (`noindex`):

- `staff/index.html`: **staff remote** (https://saw-walker.github.io/staff/). Web Bluetooth page that talks to the
  walker's `saw-staff` service (`saw_sw_web/museum/staff_ble.py` in the walker repo): status, restart tour,
  mute / unmute, restart walker, shut down. Password-protected with a challenge-response (HMAC-SHA256); the
  password never travels over the air and is not in this repo.
- `staff/guide.html`: **staff guide** for the museum (switching on / off, the remote, troubleshooting), printable on A4,
  with a QR code (`staff/remote-qr.svg`) that opens the remote.

## Setting the project video

At the top of `index.html` there is a single block, `window.SAW_CONFIG.video`. The first one set wins:

- **Vimeo (current):** `vimeoId` and, for unlisted videos, `vimeoHash` from `vimeo.com/<id>/<hash>`.
  Now set to `1224973038` / `49081d4131`.
- **YouTube:** `youtubeId` (the part after `v=`); loads the `youtube-nocookie.com` player on press.
- **MP4:** a path or URL in `mp4` (and optionally `poster`). Keep large videos out of this repo.

The co-design study video is embedded separately from figshare
(doi:10.6084/m9.figshare.32724324, CC BY 4.0).

## Publishing on GitHub Pages

Published from `main` (root) of https://github.com/saw-walker/saw-walker.github.io. Every push to `main`
redeploys https://saw-walker.github.io/, which is the URL in the museum kiosk QR code.

To preview locally, open `index.html` in a browser, or run `python3 -m http.server` in this folder.

## TODO

- [ ] **Funding:** official FARSCOPE and VIVO Hub logos; confirm how the VIVO Hub supports SAW and add its
      grant reference if one should be cited.
- [ ] **Translations:** native-speaker review of `es`, `fr`, `de`, `zh`.

- [ ] **PhD thesis:** add the final title and a link (repository or DOI) in the `#thesis` section.
- [ ] **Under-review papers:** when published, add venue, year and DOI. PDFs are deliberately *not* included
      (possible embargo):
  - "Co-Design and Usability Evaluation of a Socially Assistive Walker for Older Adults and Care Professionals"
    (video: doi:10.6084/m9.figshare.32724324).
  - "A Full-Body IMU Dataset for Fall Detection Research" (data descriptor).
- [ ] **Hardware photo:** `saw-hardware.jpg` comes from a figure in the under-review co-design paper.
      Confirm it is fine to show publicly before publication, or swap in another photo.
- [ ] **Team section:** confirm names, titles and roles of supervisors and collaborators.
- [ ] Optional: add a social preview image (1200×630) and a QR code image for print material.
