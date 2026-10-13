// Home page opening: the laptop sits on the bench with our logo on its screen. Scrolling flies
// the camera into the screen until the display fills the viewport; the display is the dark
// chapter's colour, so the page carries on from inside the screen.
// One still image (rendered from the 3D bench's laptop) and plain transforms, so it stays smooth
// on phones. The full 3D bench story is on /how-it-works/ (story.js).

// Where the display sits in assets/img/laptop-*.webp, as fractions of the image.
// If the image is re-rendered, update these and .lap__screen in main.css.
const SCREEN = { x: 0.21171, y: 0.05859, w: 0.57658, h: 0.55688 };

export function initIntro({ reduced, onDark }) {
  const section = document.querySelector('.intro');
  if (!section) return null;
  const pin = section.querySelector('.intro__pin');
  const lap = section.querySelector('.lap');
  const body = section.querySelector('.lap__body');
  const ui = section.querySelector('.lap__ui');
  const off = section.querySelector('.lap__off');
  const mark = section.querySelector('.lap__mark');
  const line = section.querySelector('.lap__line');
  const meta = section.querySelector('.lap__meta');
  const copy = section.querySelector('.hero__copy');
  const foot = section.querySelector('.hero__foot');
  const grid = section.querySelector('.intro__grid');
  const metaText = meta.textContent;

  // ---- power-on, played as the preloader lifts (see boot below); hidden until then ----
  if (!reduced) {
    gsap.set(lap, { autoAlpha: 0 });
    gsap.set(off, { autoAlpha: 1 });
    gsap.set([mark, line], { autoAlpha: 0 });
    meta.textContent = '';
  }
  const boot = () => {
    if (reduced) return null;
    const typed = { n: 0 };
    return gsap.timeline()
      .fromTo(lap, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, ease: 'expo.out' }, 0.1)
      .to(off, { autoAlpha: 0, duration: 0.45, ease: 'power1.inOut' }, 0.7)
      .fromTo(mark, { scale: 0.88, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, ease: 'expo.out' }, 0.9)
      .fromTo(line, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out' }, 1.05)
      .to(typed, {
        n: metaText.length,
        duration: 0.6,
        ease: 'none',
        onUpdate: () => (meta.textContent = metaText.slice(0, Math.round(typed.n))),
      }, 1.3);
  };
  if (reduced) return { boot };

  // ---- the flight into the screen, scrubbed by the scroll ----
  section.classList.add('intro--live');
  const st = { m: 0, z: 0 }; // m: screen centre moves to the viewport centre · z: camera distance covered
  let g = { dx: 0, dy: 0, K: 3 };
  // Layout offsets (not getBoundingClientRect), so neither the power-on rise nor the flight
  // itself skews the measurement.
  const measure = () => {
    const vw = pin.clientWidth;
    const vh = pin.clientHeight;
    let x = 0;
    let y = 0;
    for (let el = lap; el && el !== pin; el = el.offsetParent) {
      x += el.offsetLeft;
      y += el.offsetTop;
    }
    const w = lap.offsetWidth;
    const h = lap.offsetHeight;
    g = {
      dx: vw / 2 - (x + w * (SCREEN.x + SCREEN.w / 2)),
      dy: vh / 2 - (y + h * (SCREEN.y + SCREEN.h / 2)),
      // how much bigger the display must get to cover the viewport (a little extra for its edges)
      K: Math.max(vw / (w * SCREEN.w), vh / (h * SCREEN.h)) * 1.04,
    };
  };
  let dark = false;
  const apply = () => {
    // a camera moving at a steady speed: the screen grows slowly at first, then rushes in
    const s = 1 / (1 - st.z * (1 - 1 / g.K));
    body.style.transform = st.m || st.z ? `translate3d(${(g.dx * st.m).toFixed(1)}px, ${(g.dy * st.m).toFixed(1)}px, 0) scale(${s.toFixed(4)})` : '';
    const isDark = st.z > 0.985; // the display fills the viewport
    if (isDark !== dark) {
      dark = isDark;
      onDark?.(dark);
    }
  };

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: apply });
  // explicit start values: the page intro may still be fading these in when the scroll starts
  tl.fromTo(copy, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -48, duration: 0.2, ease: 'power1.in', immediateRender: false }, 0)
    .fromTo(foot, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1, immediateRender: false }, 0)
    .to(st, { m: 1, duration: 0.5, ease: 'power2.inOut' }, 0)
    .to(st, { z: 1, duration: 0.92 }, 0.08)
    .to(grid, { autoAlpha: 0, duration: 0.3 }, 0.3)
    .to(ui, { autoAlpha: 0, duration: 0.16 }, 0.58);

  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);
  ScrollTrigger.addEventListener('refresh', apply);
  // Touch scrolling follows the finger directly, so only a little smoothing there.
  const touch = window.matchMedia('(pointer: coarse)').matches;
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: touch ? 0.3 : 0.7,
    animation: tl,
  });

  return { boot, timeline: tl };
}
