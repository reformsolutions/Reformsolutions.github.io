# Reform Solutions — website

A scroll-driven site for Reform Solutions (IT asset refurbishment & lifecycle management): a home page that tells
the story in 3D, and four pages that go into detail.
It is plain HTML/CSS/JS with no build step, so it runs on GitHub Pages as-is.

## Pages

| Page | Address | What it's for |
| --- | --- | --- |
| Home | `/` (`index.html`) | The story: one laptop across the bench in 3D, then every section in brief. Each section links on to its page. |
| Process | `/process/` | The seven refurbishment stages in full. A cable runs down beside them and its plug stops at each stage's node as it comes up the screen (`sections/stages.js`). |
| Equipment | `/equipment/` | The six kinds of hardware, each with its line drawing, then grading, volume, warranty and who buys. |
| For business | `/business/` | Selling or retiring IT (IT asset disposal): the same cable route as the home page opens the page, then what we take, data, getting a valuation, sustainability and questions. |
| Contact | `/contact/` | Email, phone, WhatsApp and the enquiry form. `/contact/?type=sell` (or `buy`, `other`) opens that tab of the form. |

The inner pages share the home page's styles, nav, footer and WhatsApp button, and start with `assets/js/page.js`
(no 3D bench, no preloader), so they load quickly. Moving between pages cross-fades in browsers that support it.
Each page is its own HTML file, so blocks used on several pages are repeated in each:

- the nav, mobile menu, footer, WhatsApp button and the symbols at the top of `<body>`: in all five pages;
- the enquiry form: in `index.html` and `contact/index.html` (keep the two the same);
- copy that also appears on the home page (process stages, equipment, grades, the business route, FAQ answers,
  clients, principles, sustainability): change it on every page that shows it. Search the folder for a phrase.

## What's on the home page

| Section | What happens |
| --- | --- |
| Hero → Process | A procedurally built 3D laptop (Three.js) is followed through the bench: sourcing, inspection (scan line), hardware testing (exploded view), data sanitization (SSD wipe), cleaning (brush pass), grading (stamp) and QC. The camera then dives into the laptop's screen, and the next section's heading rises onto it (the dark section slides up under the dive with a see-through top). |
| Equipment | Pinned horizontal track. Isometric line drawings draw themselves in while an RJ45 plug (from the logo) pulls the cable along. |
| For business | The logo's cable winds through the ITAD steps and forks into Reuse / Recycle. On phones the steps stack and the cable runs down beside them, drawn at a steady pace with the scroll; the plug leads in the lower-middle of the screen, clear of browser toolbars. |
| Clients, principles, sustainability, FAQ, contact | Editorial sections with quiet reveals. The contact form has tabs for buying, selling and other enquiries; it sends them through a Google Apps Script (see Enquiry form below). |
| WhatsApp | A round WhatsApp button stays in the bottom-right corner, in the site's colours (navy, turning cream over dark sections); with a mouse it opens out to "Chat on WhatsApp" on hover. It opens a chat with +91 866 814 5793. The story's stage rail and the hero and footer bottom lines leave room for it (`--wa-w` in `main.css`). |
| Footer | The RS monogram as particles that re-form from scattered "debris" and scatter away from the cursor. It builds once, in under a second, and then stays formed (on touch screens once a third of it is on screen, so the build is seen); on touch, a tap scatters the particles around the finger and a sideways drag sweeps through them. |

## Run it locally

From this folder:

```bash
node serve.mjs
```

Then open http://localhost:5173. Opening `index.html` straight from disk will not work, because ES modules need a server.
Test locally before pushing — GitHub Pages publishes whatever is on `main` within a minute or two.

## Publishing

The site's address is https://reformsolutions.in/ (GitHub Pages, deployed from `main`, root folder); the old
https://reformsolutions.github.io/ address forwards there. Push to `main` and the site updates automatically.
`.nojekyll` makes GitHub serve every file untouched.

The domain is set by the `CNAME` file (the same setting as the repo's **Settings → Pages → Custom domain**). It is
registered at GoDaddy, and its DNS records there must point at GitHub Pages (GoDaddy's default "Parked" `@` records
removed):

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | reformsolutions.github.io |

Once GitHub's DNS check passes, tick **Enforce HTTPS** in Settings → Pages. If the domain ever changes, update
`CNAME`, `robots.txt`, `sitemap.xml` and the addresses at the top of `index.html` (canonical, `og:` tags and the
structured data).

## Search engines

- Every page has its own title, description, canonical address (its own URL) and social-preview (`og:`) tags at the
  top, and one `h1`. Each page answers a different search: the process, refurbished equipment, selling or
  retiring IT, and getting in touch.
- Structured data (the `application/ld+json` blocks): on the home page, the company name, logo
  (`assets/img/logo.png`), email and phone (when the contact details change, change them there too); on the other
  pages, where the page sits in the site (Home › Process), which Google can show in results.
- `robots.txt` lets search engines crawl everything and points them to `sitemap.xml`, which lists all five pages.
  After a real content change, update that page's `<lastmod>`; add a `<url>` block for any new page.
- Pages link to each other (nav, footer, the home page's "more" links), so search engines find them all.
- `favicon.ico` at the root is for crawlers and apps that look for the icon there; pages use `assets/img/favicon.svg`.
- The 404 page is marked `noindex`, so it never shows up in search results.

Getting into Google (once the domain works), signed in as `info.reformsolutions@gmail.com`:

1. [Google Search Console](https://search.google.com/search-console) → **Add property → Domain** → `reformsolutions.in`.
   Google shows a TXT record: add it in GoDaddy's DNS for the domain, then click **Verify**.
2. **Sitemaps** → enter `sitemap.xml` → **Submit**.
3. **URL inspection** → `https://reformsolutions.in/` → **Request indexing**.

Then in [Bing Webmaster Tools](https://www.bing.com/webmasters), import the site from Search Console (Bing's results
also appear on Yahoo and DuckDuckGo). For local searches and Google Maps, set up a free
[Google Business Profile](https://www.google.com/business/).

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
- On phones the business route's cable and plugs move as scroll-driven animations (`ScrollTimeline`),
  which the browser runs on the same thread as its own scrolling. Drawn from JavaScript on each scroll,
  they trailed the page by a frame or more and the plug wobbled against it. Browsers without
  `ScrollTimeline` get the same drawing from scroll updates. Keep scroll-linked motion of anything that
  scrolls with the page off the main thread like this (or use `position: sticky`).
- The footer particles stop animating once the logo has formed.
- The full logo preloader plays once per visit; later page loads get a short fade.

## Things to fill in before launch

- **Enquiry form:** connected to the Google Apps Script (see *Enquiry form* below). Send a test enquiry with a photo from the live site and check the email, the Sheet and the Drive folder.
- **Contact details:** the email is `info.reformsolutions@gmail.com` (the home page's contact section, the contact page, every page's footer, the enquiry form's `action` and the structured data in `index.html`). The phone and WhatsApp number is `+91 866 814 5793`: in the same places (`tel:` links), in the WhatsApp button's link at the end of every page (`wa.me/918668145793`, whose `text=` sets the chat's opening message), and on the For business page (its WhatsApp and call buttons). Search the folder for `8668145793` to find them all.
- **Recycling wording:** Reform Solutions doesn't recycle in-house. Equipment that can't be reused is handed to recyclers in its partner network, so keep all copy consistent with that (no promises about what happens after hand-off).
- **Claims to confirm:** the process copy describes drive wiping as "overwrite + verification, logged per device" and mentions warranty terms confirmed per quote. Adjust these to match exactly what you do. Add any certifications you hold (for example R2 or ISO 14001).
- **Demo data:** the numbers on the laptop's screen and callouts (91% battery, 77/77 keys, and so on) are illustrative sample readings for the demo unit "Serial No. 2231", not company statistics. (Avoid an "RS-" prefix for IDs: in India it reads as a rupee price.)
- **Social image:** `assets/img/og.png` is generated from the logo; replace it with a designed card if you like.

## Enquiry form

The contact form has three tabs (Buy refurbished, Sell or retire assets, Something else), each with its own fields.

**Recommended: Google Apps Script (free; photos and documents included; the visitor stays on the page).**
The script in `google-apps-script/enquiries.gs` receives each enquiry and:

- emails it to `info.reformsolutions@gmail.com` with any photos or documents attached (subject "Website enquiry:
  <type> — <company or name>"; replying goes straight to the customer),
- saves the files in a Google Drive folder called "Website enquiries", one folder per enquiry,
- adds a row to a Google Sheet, so every enquiry is also in one list.

One-time setup, signed in to Google as `info.reformsolutions@gmail.com`:

1. Open [Google Sheets](https://sheets.google.com) and create a blank spreadsheet (for example "Website enquiries").
2. **Extensions → Apps Script.** Delete the sample code, paste in everything from `google-apps-script/enquiries.gs`,
   and click **Save**.
3. **Deploy → New deployment → Select type: Web app.** Execute as: **Me**. Who has access: **Anyone**. **Deploy.**
4. Google asks you to authorise it: choose your account → **Advanced** → **Go to (project name) (unsafe)** → **Allow**.
   The warning appears because it's your own script rather than an app Google has reviewed. It asks to send email as
   you, keep files in your Drive and edit this spreadsheet.
5. Copy the **Web app URL** (it ends in `/exec`). Opening it in a browser should show "Reform Solutions enquiry form:
   ready."
6. In `index.html` and `contact/index.html`, paste that URL between the quotes of `data-endpoint=""` on the `<form class="enquiry" …>` line.
   Push, then send yourself a test enquiry with a photo from the live site.

The site is connected: `data-endpoint` (in both files) holds the web app URL of the script deployed from `info.reformsolutions@gmail.com`.

From then on the button sends the enquiry in the background and the visitor sees "Thanks — we've got your enquiry."
on the page. On the Sell tab they can add photos (resized in the browser) or a list of the equipment (PDF, Excel,
Word, CSV or text): up to 5 files, 10 MB each and 20 MB in all. If sending fails, the form stays filled in and offers
to send the same enquiry from the visitor's email app in one click (or WhatsApp). A free Gmail account can send about 100 of these emails a day; beyond that the Sheet row
and the Drive files are still saved. A hidden `botcheck` field and a limit of 20 enquiries a minute keep simple spam
out. After a quiet spell Google takes several seconds to start the script, so the form wakes it (with the harmless
"ready" request) as soon as someone starts filling it in; if Google is still slow to answer, the form says it's still
sending. After changing the script: **Deploy → Manage deployments → Edit → Version: New version**, so the URL stays the same.

**Without the script (`data-endpoint` empty):** the form's `action` is `mailto:info.reformsolutions@gmail.com`. Pressing the
button opens the visitor's own email app with a new email to that address, filled in with everything they entered
(sellers are asked to attach photos or their equipment list there). A confirmation panel offers **Try again** and
**Copy your enquiry** for visitors whose email app doesn't open.

**Another form service instead:** leave `data-endpoint` empty and put the service's endpoint URL in the form's
`action`. The form then posts to it (multipart; the visitor goes to the service's page unless it redirects back), and
the file box on the Sell tab switches itself on, sending `File 1` … `File 5`. If the service uses extra hidden fields
(such as `_subject`, `_next` or `_captcha`), add them inside the form as its docs describe; a `_subject` field is
filled in automatically.

Fields live in the `<form class="enquiry">` block of `index.html` and `contact/index.html` (change both); each
field's `name` is the label used in the email.

## Where things live

```
index.html                 the home page: all its content and copy
process/, equipment/,      the inner pages (each an index.html, served at /process/ and so on)
business/, contact/
assets/css/main.css        design system, layout, responsive rules (inner pages near the end)
assets/js/main.js          home page boot sequence
assets/js/page.js          inner pages' boot sequence
assets/js/story.js         scroll timeline for the 3D bench (stage timings, cameras, callouts)
assets/js/bench/           3D scene: laptop model, screen UI, procedural textures, renderer
assets/js/sections/        equipment track + isometric art, business route, process stages, footer particles
assets/js/ui.js            nav, menu, links, reveals, FAQ, form, sustainability loop
assets/img/brand.svg       vector logo (traced from the original artwork) used across the site
vendor/                    three.js r186 (trimmed), GSAP 3.15 (+ plugins), Lenis 1.3 — see vendor/README.md
google-apps-script/        the enquiry form's backend (paste into Google Apps Script; see Enquiry form)
CNAME                      the custom domain (see Publishing)
robots.txt, sitemap.xml    for search engines (see Search engines)
favicon.ico                the icon for crawlers and apps that look for it at the root
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
