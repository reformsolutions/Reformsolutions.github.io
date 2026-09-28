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

From the folder that contains `website/`:

```bash
node dev-server.mjs
```

Then open http://localhost:5173. Any static server works too (for example `npx serve website`).
Opening `index.html` straight from disk will not work, because ES modules need a server.

## Publish on GitHub Pages

1. Create a new repository on GitHub (for example `reform-solutions-site`).
2. Put the **contents** of this `website/` folder at the root of the repository and push to `main`.
3. In the repository, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.

All paths are relative, so the site works both at a sub-path and on a custom domain.
`.nojekyll` is included so GitHub serves every file untouched.
For a custom domain, add a `CNAME` file containing the domain (for example `www.reformsolutions.in`) and point your DNS at GitHub Pages.

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
vendor/                    three.js r186, GSAP 3.15 (+ plugins), Lenis 1.3 (bundled locally)
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
