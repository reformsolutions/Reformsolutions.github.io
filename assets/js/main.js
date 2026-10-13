// Reform Solutions — home page bootstrap.
// The opening laptop is a still image with plain transforms (sections/intro.js); the 3D bench
// story is on /how-it-works/ (tour.js), so this page loads no 3D at all.
import { createPreloader } from './preloader.js';
import { initIntro } from './sections/intro.js';
import { initEquipment } from './sections/equipment.js';
import { initRoute } from './sections/route.js';
import { initParticles } from './sections/particles.js';
import { initNav, initAnchors, initReveals, heroIntro, initFaq, initForm, initLoop } from './ui.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia('(max-width: 899px)');
const isMobile = () => mobileQuery.matches;

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// One failing section should never take the rest of the page down with it.
const safe = (name, fn) => {
  try {
    return fn();
  } catch (err) {
    console.error(`[${name}]`, err);
    return null;
  }
};

// The full logo draw plays once per visit; later page loads get a quick fade.
function firstVisit() {
  try {
    const seen = sessionStorage.getItem('rs-intro');
    sessionStorage.setItem('rs-intro', '1');
    return !seen;
  } catch {
    return true;
  }
}

async function boot() {
  root.classList.add('js-ready');
  const pre = createPreloader({ reduced, quick: !firstVisit() });
  pre.progress(0.15);

  // Smooth scrolling (skipped for reduced motion)
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    // ScrollTrigger hears native (touch) scrolling by itself; only Lenis' own smooth scrolling
    // needs relaying in the same frame (relaying every event updated all triggers twice)
    lenis.on('scroll', () => lenis.isSmooth && ScrollTrigger.update());
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const hash = location.hash;
  window.scrollTo(0, 0);

  // Fonts set the line breaks and the laptop is the hero, so wait (briefly) for both.
  const img = document.querySelector('.lap__img');
  await Promise.race([Promise.all([document.fonts.ready, img?.decode?.().catch(() => {})]), wait(2500)]);
  pre.progress(0.7);
  if (/[?&]debug\b/.test(location.search)) window.__lenis = lenis;

  const nav = initNav({ lenis });
  initAnchors({ lenis, nav });
  const intro = safe('intro', () => initIntro({ reduced, onDark: (d) => nav.setStoryDark(d) }));
  safe('equipment', () => initEquipment({ reduced }));
  safe('route', () => initRoute({ reduced, isMobile }));
  safe('particles', () => initParticles({ reduced }));
  safe('reveals', () => initReveals({ reduced }));
  safe('faq', initFaq);
  safe('form', () => initForm({ lenis }));
  safe('loop', () => initLoop({ reduced }));
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

  ScrollTrigger.refresh();
  pre.progress(1);
  await pre.finish();
  document.querySelector('.wa')?.classList.add('is-in'); // the WhatsApp button comes in with the page

  lenis?.start();
  heroIntro({ bench: null, reduced });
  intro?.boot();

  if (hash && hash.length > 1) {
    const target = document.querySelector(hash);
    if (target) {
      await wait(200);
      lenis ? lenis.scrollTo(target, { immediate: true }) : target.scrollIntoView();
    }
  }

  // Re-measure when the layout mode flips (rotate / resize across the breakpoint)
  mobileQuery.addEventListener('change', () => location.reload());
}

boot().catch((err) => {
  console.error(err);
  root.classList.add('js-ready');
  document.querySelector('.preloader')?.remove();
  document.querySelector('.wa')?.classList.add('is-in');
  // never leave the hero switched off
  document.querySelectorAll('.lap, .lap__mark, .lap__line').forEach((el) => (el.style.visibility = el.style.opacity = ''));
  document.querySelector('.lap__off')?.style.setProperty('display', 'none');
});
