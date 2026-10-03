// Reform Solutions — the inner pages (process, equipment, for business, contact).
// The same nav, reveals, form, FAQ and footer as the home page, without the 3D bench or the preloader;
// each section script does nothing on pages that don't have its section.
import { initNav, initAnchors, initReveals, initFaq, initForm, initLoop } from './ui.js';
import { initArt } from './sections/equipment.js';
import { initRoute } from './sections/route.js';
import { initStages } from './sections/stages.js';
import { initParticles } from './sections/particles.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia('(max-width: 899px)');
const isMobile = () => mobileQuery.matches;

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

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

async function boot() {
  root.classList.add('js-ready');

  // Smooth scrolling (skipped for reduced motion), as on the home page
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    lenis.on('scroll', () => lenis.isSmooth && ScrollTrigger.update());
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const nav = initNav({ lenis });
  initAnchors({ lenis, nav });
  safe('route', () => initRoute({ reduced, isMobile }));
  safe('art', () => initArt({ reduced }));
  safe('stages', initStages);
  safe('particles', () => initParticles({ reduced }));
  safe('faq', initFaq);
  safe('form', () => initForm({ lenis }));
  safe('loop', () => initLoop({ reduced }));
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  document.querySelector('.wa')?.classList.add('is-in');

  // Headings split into lines, so wait (briefly) for the fonts that set their line breaks.
  await Promise.race([document.fonts.ready, wait(1500)]);
  safe('reveals', () => initReveals({ reduced }));
  ScrollTrigger.refresh();

  // Re-measure when the layout mode flips (rotate / resize across the breakpoint)
  mobileQuery.addEventListener('change', () => location.reload());
}

boot().catch((err) => {
  console.error(err);
  root.classList.add('js-ready');
  document.querySelector('.wa')?.classList.add('is-in');
});
