# saw-walker.github.io

Public website for the **SAW (Socially Assistive Walker)** PhD project by Sergio D. Sierra Marín
(Bristol Robotics Laboratory, UWE Bristol). Visitors reach it by scanning a QR code at a museum,
so it is built mobile-first, loads fast and needs no build step.

Live URL: https://saw-walker.github.io/

## Structure

```
index.html              The whole page: hero, video, how it works, publications, thesis, team
assets/css/style.css    All styles (light/dark via prefers-color-scheme, large-text mode, reduced motion)
assets/js/main.js       Video slot, larger-text and pause toggles, and the animated SVG demos
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

- [ ] **PhD thesis:** add the final title and a link (repository or DOI) in the `#thesis` section.
- [ ] **Under-review papers:** when published, add venue, year and DOI. PDFs are deliberately *not* included
      (possible embargo):
  - "Co-Design and Usability Evaluation of a Socially Assistive Walker for Older Adults and Care Professionals"
    (video: doi:10.6084/m9.figshare.32724324).
  - "A Full-Body IMU Dataset for Fall Detection Research" (data descriptor).
- [ ] **Hardware photo:** `saw-hardware.jpg` comes from a figure in the under-review co-design paper.
      Confirm it is fine to show publicly before publication, or swap in another photo.
- [ ] **Team section:** confirm names, titles and roles of supervisors and collaborators, and add funders' wording
      if wanted (the co-design manuscript acknowledges UKRI MRC grant MR/Y010620/1, EPSRC and FARSCOPE CDT).
- [ ] Optional: add a social preview image (1200×630) and a QR code image for print material.
