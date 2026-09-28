# Reform Solutions — website

A single-page, scroll-driven site for Reform Solutions (IT asset refurbishment & lifecycle management).
It is plain HTML/CSS/JS with no build step, so it runs on GitHub Pages as-is.

## What's on the page

| Section | What happens |
| --- | --- |
| Hero → Process | A procedurally built 3D laptop (Three.js) is followed through the bench: sourcing, inspection (scan line), hardware testing (exploded view), data sanitization (SSD wipe), cleaning (brush pass), grading (stamp) and QC. The camera then dives into the laptop's screen. |
| Equipment | Pinned horizontal track. Isometric line drawings draw themselves in while an RJ45 plug (from the logo) pulls the cable along. |
| For business | The logo's cable winds through the ITAD steps and forks into Reuse / Recycle. |
| Clients, principles, sustainability, FAQ, contact | Editorial sections with quiet reveals. The contact form opens the visitor's email app with the enquiry pre-filled (no server needed). |
| Footer | The RS monogram as particles that re-form from scattered "debris" and scatter away from the cursor. |

## Run it locally

From this folder:

```bash
node serve.mjs
```

Then open http://localhost:5173. Opening `index.html` straight from disk will not work, because ES modules need a server.
Test locally before pushing — GitHub Pages publishes whatever is on `main` within a minute or two.

## Publishing

The site is live at https://reformsolutions.github.io/ (GitHub Pages, deployed from `main`, root folder).
Push to `main` and the site updates automatically. `.nojekyll` makes GitHub serve every file untouched.
For a custom domain, add a `CNAME` file containing the domain and point your DNS at GitHub Pages;
then update the canonical/`og:` URLs at the top of `index.html`.

## How the 3D stays out of the way of the text

The story (`assets/js/story.js`) measures a "safe rectangle" for each moment — the band above the hero copy
on phones, the space right of the stage text on desktop — and the bench (`assets/js/bench/bench.js`)
pulls the camera back or shifts the view whenever the laptop's on-screen footprint would spill out of it.
If you change the copy length or layout, the framing adapts on its own.

## Performance notes

- `vendor/three.min.js` is a trimmed three.js build (see `vendor/README.md`).
- The 3D canvas renders only when something changes; the idle hero float runs at 30fps.
- Render resolution is capped by a pixel budget and lowered automatically on slow devices.
- Shaders and textures are prepared during the preloader so the exploded view doesn't stutter.
- The footer particles stop animating once the logo has formed.
- The full logo preloader plays once per visit; later page loads get a short fade.

## Things to fill in before launch

- **Contact details:** search `index.html` for `enquiries@example.com` and `+00 00000 00000` (both appear in the contact section and the footer). The enquiry form sends to whatever email is in the contact section's email link.
- **Claims to confirm:** the process copy describes drive wiping as "overwrite + verification, logged per device" and mentions warranty terms confirmed per quote. Adjust these to match exactly what you do. Add any certifications you hold (for example R2 or ISO 14001).
- **Demo data:** the numbers on the laptop's screen and callouts (91% battery, 77/77 keys, and so on) are illustrative sample readings for the demo unit "RS-2231", not company statistics.
- **Social image:** `assets/img/og.png` is generated from the logo; replace it with a designed card if you like.

## Where things live

```
index.html                 all content and copy
assets/css/main.css        design system, layout, responsive rules
assets/js/main.js          boot sequence
assets/js/story.js         scroll timeline for the 3D bench (stage timings, cameras, callouts)
assets/js/bench/           3D scene: laptop model, screen UI, procedural textures, renderer
assets/js/sections/        equipment track + isometric art, business route, footer particles
assets/js/ui.js            nav, menu, reveals, FAQ, form, sustainability loop
assets/img/brand.svg       vector logo (traced from the original artwork) used across the site
vendor/                    three.js r186 (trimmed), GSAP 3.15 (+ plugins), Lenis 1.3 — see vendor/README.md
serve.mjs                  local preview server (not needed on GitHub Pages)
```

## Accessibility and fallbacks

- `prefers-reduced-motion` turns off smooth scrolling, idle motion and decorative animations.
- Without WebGL, the seven process stages render as a normal readable list.
- Headings, landmarks, labelled form fields and keyboard-operable FAQ are in place.
- Append `?nowebgl` to the URL to preview the fallback, or `?debug` to expose the 3D state in the console.

## Credits and licences

- Three.js — MIT
- GSAP — free "Standard" licence (includes ScrollTrigger, SplitText, DrawSVG, MotionPath)
- Lenis — MIT
- Fonts: Bodoni Moda, Archivo, IBM Plex Mono — SIL Open Font License, self-hosted
