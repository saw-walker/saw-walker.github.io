# saw-walker.github.io

Public website for the **SAW (Socially Assistive Walker)** PhD project by Sergio D. Sierra Marín
(Bristol Robotics Laboratory, UWE Bristol). Visitors reach it by scanning a QR code at a museum,
so it is built mobile-first, loads fast and needs no build step.

Live URL (once published): https://saw-walker.github.io/

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

Everything is plain HTML/CSS/JS with no external scripts, fonts or CDNs, and nothing is downloaded from
third parties unless a visitor presses play on a YouTube video.

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

At the top of `index.html` there is a single block:

```html
<script>
  window.SAW_CONFIG = { video: { youtubeId: "", mp4: "", poster: "" } };
</script>
```

- **YouTube:** put the video ID (the part after `v=`) in `youtubeId`. The page shows a play button and only
  loads the privacy-enhanced `youtube-nocookie.com` player when pressed.
- **MP4:** put a path or URL in `mp4` (and optionally a `poster` image). Avoid committing large videos to this
  repo (GitHub Pages sites should stay small). Prefer YouTube or an external host.

Leave both empty to keep the "Video coming soon" poster.

Candidate local footage (not copied here) in `~/OneDrive - UWE Bristol/video/`:
`Structure2.mp4`, `handle.mp4`, `Haptic3.mp4`.

## Publishing on GitHub Pages

1. Create a **public** repository named exactly `saw-walker.github.io` under the `saw-walker` GitHub organisation.
2. Push this repository:
   ```sh
   git remote add origin https://github.com/saw-walker/saw-walker.github.io.git
   git push -u origin main
   ```
3. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and choose `main` and `/ (root)`.
4. After a minute the site is live at https://saw-walker.github.io/. Generate the museum QR code from that URL.

To preview locally, open `index.html` in a browser, or run `python3 -m http.server` in this folder.

## TODO

- [ ] **Video:** upload the project video (YouTube recommended) and set `youtubeId` in `index.html`.
- [ ] **PhD thesis:** add the final title and a link (repository or DOI) in the `#thesis` section.
- [ ] **Under-review papers:** when published, add venue, year and DOI. PDFs are deliberately *not* included
      (possible embargo):
  - "Co-Creating a Socially Assistive Walker: Collaborating with Older Adults and Carers" (the revised
    manuscript is titled "Co-Design and Usability Evaluation of a Socially Assistive Walker for Older Adults and
    Care Professionals"; confirm which title is final).
  - "A Full-Body IMU Dataset for Fall Detection Research" (data descriptor).
  - "VLM-Guided Geometric Grasping Across Fixed and Quadruped-Mounted Configurations for Assistive Object
    Retrieval in the Home": the local manuscript is anonymised, so confirm the author list (and whether it
    belongs on this site).
- [ ] **Hardware photo:** `saw-hardware.jpg` comes from a figure in the under-review co-design paper.
      Confirm it is fine to show publicly before publication, or swap in another photo.
- [ ] **Team section:** confirm names, titles and roles of supervisors and collaborators, and add funders' wording
      if wanted (the co-design manuscript acknowledges UKRI MRC grant MR/Y010620/1, EPSRC and FARSCOPE CDT).
- [ ] **GitHub org:** make sure https://github.com/saw-walker exists and is public (the page links to it).
- [ ] Optional: add a social preview image (1200×630) and a QR code image for print material.
