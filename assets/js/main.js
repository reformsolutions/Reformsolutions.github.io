// Reform Solutions — site bootstrap.
import { createPreloader } from './preloader.js';
import { createBench, supportsWebGL } from './bench/bench.js';
import { initStory } from './story.js';
import { initEquipment } from './sections/equipment.js';
import { initRoute } from './sections/route.js';
import { initParticles } from './sections/particles.js';
import { initNav, initAnchors, initReveals, heroIntro, initFaq, initForm, initLoop } from './ui.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia('(max-width: 899px)');
const isMobile = () => mobileQuery.matches;

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, CustomEase);
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

async function boot() {
  root.classList.add('js-ready');
  const pre = createPreloader({ reduced });
  pre.progress(0.12, 'Preparing the bench');

  // Smooth scrolling (skipped for reduced motion)
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const hash = location.hash;
  window.scrollTo(0, 0);

  // Fonts affect line breaks and canvas labels, so wait (briefly) for them.
  await Promise.race([document.fonts.ready, wait(2500)]);
  pre.progress(0.35, 'Unpacking unit RS-2231');

  // 3D bench
  let bench = null;
  if (supportsWebGL() && !/[?&]nowebgl\b/.test(location.search)) {
    bench = createBench({
      canvas: document.querySelector('.bench'),
      layer: document.querySelector('.callouts'),
      isMobile,
      reduced,
    });
  }
  if (!bench) root.classList.add('no-webgl');
  if (/[?&]debug\b/.test(location.search)) {
    window.__rs = { bench, lenis };
    window.__lenis = lenis;
  }
  pre.progress(0.7, 'Running diagnostics');
  await wait(30);

  const nav = initNav({ lenis });
  initAnchors({ lenis, nav });
  if (bench) {
    const ok = safe('story', () => initStory({ bench, lenis, isMobile, reduced, onDark: (d) => nav.setStoryDark(d) }));
    if (ok) bench.warm();
    else {
      bench.setActive(false);
      root.classList.add('no-webgl');
    }
  }
  safe('equipment', () => initEquipment({ reduced }));
  safe('route', () => initRoute({ reduced, isMobile }));
  safe('particles', () => initParticles({ reduced }));
  safe('reveals', () => initReveals({ reduced }));
  safe('faq', initFaq);
  safe('form', initForm);
  safe('loop', () => initLoop({ reduced }));
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

  ScrollTrigger.refresh();
  pre.progress(1);
  await pre.finish();

  lenis?.start();
  heroIntro({ bench, reduced });

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
  root.classList.add('js-ready', 'no-webgl');
  document.querySelector('.preloader')?.remove();
});
