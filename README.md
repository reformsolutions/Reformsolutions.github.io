# Reform Solutions — website

A single-page, scroll-driven site for Reform Solutions (IT asset refurbishment & lifecycle management).
It is plain HTML/CSS/JS with no build step, so it runs on GitHub Pages as-is.

## What's on the page

| Section | What happens |
| --- | --- |
| Hero → Process | A procedurally built 3D laptop (Three.js) is followed through the bench: sourcing, inspection (scan line), hardware testing (exploded view), data sanitization (SSD wipe), cleaning (brush pass), grading (stamp) and QC. The camera then dives into the laptop's screen, and the next section's heading rises onto it (the dark section slides up under the dive with a see-through top). |
| Equipment | Pinned horizontal track. Isometric line drawings draw themselves in while an RJ45 plug (from the logo) pulls the cable along. |
| For business | The logo's cable winds through the ITAD steps and forks into Reuse / Recycle. On phones the steps stack and the cable runs down beside them, drawn at a steady pace with the scroll; the plug leads in the lower-middle of the screen, clear of browser toolbars. |
| Clients, principles, sustainability, FAQ, contact | Editorial sections with quiet reveals. The contact form has tabs for buying, selling and other enquiries; for now it hands off to the visitor's email app (see Enquiry form below). |
| Footer | The RS monogram as particles that re-form from scattered "debris" and scatter away from the cursor. On touch screens the logo builds (and unbuilds) with the scroll, a tap scatters the particles around the finger, and a sideways drag sweeps through them. |

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

The callout labels keep clear of each other too: when a label appears, its box goes above or below its dot,
whichever keeps it off the labels already showing and off the other dots of the same stage (the `stage`
field in `CALLOUTS`, `story.js`). Give a new label the stage it shares the screen with.

## Performance notes

- `vendor/three.min.js` is a trimmed three.js build (see `vendor/README.md`).
- The 3D canvas renders only when something changes; the idle hero float runs at 30fps.
- Draw calls are kept low: static laptop parts that share a material are baked into one mesh
  (`bake()` in `laptop.js`), labelled boxes use two material groups (`topBox()`), and the keyboard
  and screen sides aren't drawn while the lid is shut (~50 draw calls in the exploded view, not ~150).
- Render resolution is capped by a pixel budget and lowered automatically on slow devices.
- Phones: at most 1.5× pixel ratio, no clear-coat layer, screen-texture redraws capped at ~30 a second,
  and a shorter scroll catch-up (scrub) on touch screens. The canvas is sized to the large viewport
  height, so the address bar sliding in and out doesn't resize it.
- Shaders, textures and every part's geometry are prepared during the preloader (one draw with
  everything visible), so parts that appear mid-story don't stutter.
- This is a long page, so a forced layout or a repaint of the whole page costs a phone tens of
  milliseconds. Don't read layout (`offsetTop`, `getBoundingClientRect`…) in scroll handlers, don't
  animate layout properties like `top` in CSS, and give elements that the story animates inside the
  normal page flow `will-change` so each frame doesn't repaint everything.
- On phones the business route's cable is drawn from points sampled once per layout, on its own narrow
  layer, so scrolling never reads SVG geometry or repaints the text beside it.
- The footer particles stop animating once the logo has formed.
- The full logo preloader plays once per visit; later page loads get a short fade.

## Things to fill in before launch

- **Contact details:** the email is `info.reformsolutions@gmail.com` (contact section, footer and the enquiry form's `action`). The phone number is still the placeholder `+00 00000 00000` in the contact section and footer.
- **Recycling wording:** Reform Solutions doesn't recycle in-house. Equipment that can't be reused is handed to recyclers in its partner network, so keep all copy consistent with that (no promises about what happens after hand-off).
- **Claims to confirm:** the process copy describes drive wiping as "overwrite + verification, logged per device" and mentions warranty terms confirmed per quote. Adjust these to match exactly what you do. Add any certifications you hold (for example R2 or ISO 14001).
- **Demo data:** the numbers on the laptop's screen and callouts (91% battery, 77/77 keys, and so on) are illustrative sample readings for the demo unit "Serial No. 2231", not company statistics. (Avoid an "RS-" prefix for IDs: in India it reads as a rupee price.)
- **Social image:** `assets/img/og.png` is generated from the logo; replace it with a designed card if you like.

## Enquiry form

The contact form has three tabs (Buy refurbished, Sell or retire assets, Something else), each with its own fields.

**Now (no form service):** the form's `action` is `mailto:info.reformsolutions@gmail.com`. Pressing the button opens
the visitor's own email app with a new email to that address, filled in with everything they entered (sellers are
asked to attach photos there). A confirmation panel offers **Try again** and **Copy your enquiry** for visitors whose
email app doesn't open.

**Adding a form service later:** replace that `action` in `index.html` with the service's endpoint URL (for example
FormSubmit, Formspree, Web3Forms or your own server). The form then posts directly (multipart), and the photo upload
on the Sell tab switches itself on: up to 5 photos, resized in the browser to 1600px JPEGs and sent as `Photo 1` …
`Photo 5`. If the service uses extra hidden fields (such as `_subject`, `_next` or `_captcha`), add them inside the
form as its docs describe; a `_subject` field is filled in automatically.

Fields live in the `<form class="enquiry">` block of `index.html`; each field's `name` is the label used in the email.

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
- Fonts: Archivo (headings and body), IBM Plex Mono (labels) — SIL Open Font License, self-hosted
