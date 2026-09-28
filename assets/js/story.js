// Scroll story: one GSAP timeline (0 → 8) scrubbed across the hero + process.
// 0 hero · 1 sourcing · 2 inspection · 3 testing · 4 data wipe · 5 cleaning
// 6 grading · 7 quality check → dive into the screen (8).

const CALLOUTS = [
  { id: 'incoming', anchor: 'lidCorner', title: 'Serial No. 2231', detail: 'Incoming · condition unknown', dir: 'l', desktopOnly: true },
  { id: 'tag', anchor: 'tag', title: 'Asset tag applied', detail: 'Serial No. 2231 · logged at intake' },
  { id: 'sticker', anchor: 'sticker', title: 'Previous owner’s label', detail: 'Comes off at cleaning', dir: 'l' },
  { id: 'hinge', anchor: 'hinge', title: 'Hinges', detail: 'Firm · no wobble', status: 'Checked' },
  { id: 'casing', anchor: 'casing', title: 'Casing', detail: 'Light scuffs · no cracks', status: 'Noted', dy: 44 },
  { id: 'displayI', anchor: 'display', title: 'Display', detail: 'Glass intact', status: 'Checked', dir: 'l' },
  { id: 'battery', anchor: 'battery', title: 'Battery', detail: '91% health · 312 cycles', status: 'Testing', pass: 'Pass', dy: 40 },
  { id: 'ssd', anchor: 'ssd', title: 'Storage', detail: 'SMART healthy · 97% life', status: 'Testing', pass: 'Pass', dy: 30, desktopOnly: true },
  { id: 'ram', anchor: 'ram', title: 'Memory', detail: '2 × 8 GB · 0 errors', status: 'Testing', pass: 'Pass', dir: 'l', desktopOnly: true },
  { id: 'fan', anchor: 'fan', title: 'CPU & thermals', detail: '68 °C peak under load', status: 'Testing', pass: 'Pass', desktopOnly: true },
  { id: 'keys', anchor: 'keys', title: 'Keyboard', detail: '77 / 77 keys registered', status: 'Testing', pass: 'Pass' },
  { id: 'ports', anchor: 'ports', title: 'Ports', detail: '6 / 6 working', status: 'Testing', pass: 'Pass', dir: 'l', dy: 36, desktopOnly: true },
  { id: 'displayT', anchor: 'display', title: 'Display', detail: '0 dead pixels · even backlight', status: 'Testing', pass: 'Pass', dir: 'l', desktopOnly: true },
  { id: 'wipe', anchor: 'ssd', title: 'NVMe SSD · 512 GB', detail: 'Overwrite + verification', status: 'Wiping', pass: 'Verified' },
  { id: 'graded', anchor: 'tag', title: 'Grade A', detail: 'Minimal signs of use' },
];

// Camera + framing per stage. Mobile keeps the same shots, pulled back & raised.
const SHOTS = {
  hero: { x: 0.4, y: 5.2, z: 13.2, tx: 0, ty: 0.25, tz: 0, fov: 22 },
  intake: { x: 0.8, y: 7.9, z: 5.9, tx: 0, ty: 0.0, tz: 0.15, fov: 25 },
  inspect: { x: 4.3, y: 3.7, z: 9.6, tx: 0, ty: 1.0, tz: -0.3, fov: 26 },
  test: { x: 7.6, y: 5.2, z: 12.6, tx: 0, ty: 1.75, tz: -0.55, fov: 27 },
  wipe: { x: 3.8, y: 4.3, z: 10.4, tx: 0.25, ty: 1.3, tz: 0.0, fov: 26 },
  clean: { x: 0.5, y: 8.2, z: 4.8, tx: 0, ty: 0.0, tz: 0.15, fov: 25 },
  grade: { x: 1.7, y: 7.6, z: 6.4, tx: 0.3, ty: 0.0, tz: 0.2, fov: 24 },
  qc: { x: 0, y: 1.55, z: 8.4, tx: 0, ty: 1.12, tz: -0.6, fov: 25 },
};

export function initStory({ bench, lenis, isMobile, reduced, onDark }) {
  const S = bench.state;
  const story = document.querySelector('.story');
  const heroCopy = document.querySelector('.hero__copy');
  const heroFoot = document.querySelector('.hero__foot');
  const ui = document.querySelector('.process__ui');
  const panels = [...document.querySelectorAll('.stage')];
  const rail = document.querySelector('.rail');
  const shade = document.querySelector('.process__shade');
  const railBtns = [...rail.querySelectorAll('button')];
  const railBar = rail.querySelector('.rail__bar i');
  const gradeRows = [...document.querySelectorAll('.grades__row')];
  const mobile = isMobile();

  bench.addCallouts(CALLOUTS.filter((c) => !(mobile && c.desktopOnly)));
  const co = (id) => S.co[id] || { o: 0, pass: 0 };

  // hero pose + framing
  const stageShift = mobile ? 0 : 0.17;
  const stageShiftY = mobile ? 0.2 : 0;
  Object.assign(S, { py: 0.55, rx: 0.12, ry: -0.78, rz: 0.1 });
  S.shiftX = mobile ? 0 : 0.21;
  S.shiftY = stageShiftY;
  Object.assign(S.cam, SHOTS.hero);

  // ---- safe areas the laptop must stay inside (see auto-framing in bench.js) ----
  const nav = document.querySelector('[data-nav]');
  const heroEl = document.querySelector('.hero');
  const heroTitle = document.querySelector('.hero__title');
  const rects = { hero: null, stage: [] };
  function measureRects() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const navH = nav.offsetHeight || (mobile ? 64 : 76);
    const heroTop = heroEl.getBoundingClientRect().top;
    const rel = (el) => el.getBoundingClientRect().top - heroTop - (gsap.getProperty(el, 'y') || 0);
    if (mobile) {
      // phones: the free band between the nav and the hero copy
      const y1 = Math.max(navH + 120, rel(heroCopy) - 24);
      rects.hero = { x0: 14, x1: W - 14, y0: navH + 4, y1 };
    } else {
      // desktop: right of the headline (measured on the text, not its box)
      const range = document.createRange();
      range.selectNodeContents(heroTitle);
      const right = Math.max(range.getBoundingClientRect().right, ...[...heroCopy.querySelectorAll('.hero__lede, .btn')].map((e) => e.getBoundingClientRect().right));
      rects.hero = { x0: right + 28, x1: W - 20, y0: navH + 12, y1: rel(heroFoot) - 12 };
    }
    const railTop = rail.getBoundingClientRect().top;
    panels.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const top = r.top - (gsap.getProperty(p, 'y') || 0);
      rects.stage[i + 1] = mobile
        ? { x0: 10, x1: W - 10, y0: navH + 6, y1: Math.max(navH + 140, top - 18) }
        : { x0: r.right + 36, x1: W - 16, y0: 60, y1: Math.min(H - 70, railTop - 16) };
    });
    // on phones, aim the hero laptop at the middle of its band
    if (mobile && window.scrollY < 10) {
      const mid = (rects.hero.y0 + rects.hero.y1) / 2;
      S.shiftY = (H / 2 - mid) / H;
    }
  }

  ui.style.visibility = 'visible';
  gsap.set(panels, { autoAlpha: 0, y: 30 });
  gsap.set([rail, shade], { autoAlpha: 0 });
  gradeRows.forEach((r) => r.classList.remove('is-active'));

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut', duration: 0.5 } });
  const shot = (name, at, dur = 0.5, extra = {}) => tl.to(S.cam, { ...SHOTS[name], duration: dur }, at).to(S, { shiftX: stageShift, shiftY: stageShiftY, duration: dur, ...extra }, at);

  // ---- hero → 1 · Sourcing ----
  tl.fromTo(co('incoming'), { o: 1 }, { o: 0, duration: 0.12, immediateRender: false }, 0.1)
    .to(heroCopy, { autoAlpha: 0, y: -60, duration: 0.35, ease: 'power1.in' }, 0.08)
    .to(heroFoot, { autoAlpha: 0, duration: 0.2, ease: 'none' }, 0.05)
    .to(S, { py: 0, rx: 0, ry: -0.24, rz: 0, bob: 0, duration: 0.55 }, 0.35);
  shot('intake', 0.35, 0.6);
  tl.to(S, { tag: 1, duration: 0.2, ease: 'none' }, 0.98)
    .to(co('tag'), { o: 1, duration: 0.08 }, 1.12)
    .to(co('sticker'), { o: 1, duration: 0.08 }, 1.2)
    .to([co('tag'), co('sticker')], { o: 0, duration: 0.08 }, 1.46);

  // ---- 2 · Inspection ----
  tl.to(S, { lid: 1, ry: -0.42, duration: 0.5 }, 1.48);
  shot('inspect', 1.45, 0.52);
  tl.to(S, { post: 0.1, duration: 0.12, ease: 'none' }, 1.82)
    .to(S, { scanOn: 1, duration: 0.04, ease: 'none' }, 1.97)
    .fromTo(S, { scan: -1.4 }, { scan: 3.2, duration: 0.46, ease: 'none', immediateRender: false }, 1.97)
    .to(S, { scanOn: 0, duration: 0.05, ease: 'none' }, 2.42)
    .to(S, { post: 1, duration: 0.46, ease: 'none' }, 1.96)
    .to(co('hinge'), { o: 1, duration: 0.07 }, 2.02)
    .to(co('casing'), { o: 1, duration: 0.07 }, 2.12)
    .to(co('displayI'), { o: 1, duration: 0.07 }, 2.22)
    .to([co('hinge'), co('casing'), co('displayI')], { o: 0, duration: 0.07 }, 2.48);

  // ---- 3 · Hardware testing (exploded view) ----
  tl.to(S, { explode: 1, ry: -0.5, duration: 0.5 }, 2.52);
  shot('test', 2.5, 0.52);
  tl.to(S, { diag: 1, duration: 0.5, ease: 'none' }, 2.96)
    .to(S, { fan: 1, duration: 0.08, ease: 'none' }, 2.98)
    .to(S, { keysWave: 1, duration: 0.14, ease: 'none' }, 3.22);
  const tests = ['battery', 'ssd', 'ram', 'fan', 'keys', 'displayT', 'ports'];
  tests.forEach((id, i) => {
    tl.to(co(id), { o: 1, duration: 0.06 }, 3.0 + i * 0.035)
      .to(co(id), { pass: 1, duration: 0.02, ease: 'none' }, 3.12 + i * 0.045);
  });
  tl.to(tests.map(co), { o: 0, duration: 0.06 }, 3.5)
    .to(S, { fan: 0, duration: 0.1, ease: 'none' }, 3.52);

  // ---- 4 · Data sanitization ----
  tl.to(S, { explode: 0.3, duration: 0.42 }, 3.55)
    .to(S, { ssdOut: 1, ry: -0.36, duration: 0.4 }, 3.66);
  shot('wipe', 3.58, 0.5);
  tl.to(S, { wipe: 0.02, duration: 0.02, ease: 'none' }, 3.9)
    .to(S, { ssdGlow: 1, duration: 0.06, ease: 'none' }, 4.0)
    .to(S, { wipe: 1, duration: 0.4, ease: 'none' }, 3.98)
    .to(co('wipe'), { o: 1, duration: 0.06 }, 4.02)
    .to(co('wipe'), { pass: 1, duration: 0.02, ease: 'none' }, 4.36)
    .to(S, { ssdWiped: 1, duration: 0.02, ease: 'none' }, 4.34)
    .to(S, { ssdGlow: 0, duration: 0.08, ease: 'none' }, 4.36)
    .to(co('wipe'), { o: 0, duration: 0.05 }, 4.46);

  // ---- 5 · Cleaning ----
  tl.to(S, { ssdOut: 0, duration: 0.24 }, 4.46)
    .to(S, { explode: 0, duration: 0.22 }, 4.6)
    .to(S, { lid: 0, ry: -0.1, duration: 0.36 }, 4.64);
  shot('clean', 4.6, 0.42);
  tl.to(S, { clean: 1, duration: 0.42, ease: 'none' }, 5.0);

  // ---- 6 · Grading ----
  tl.to(S, { ry: -0.04, duration: 0.4 }, 5.5);
  shot('grade', 5.5, 0.42);
  tl.to(S, { grade: 1, duration: 0.14, ease: 'power2.out' }, 5.96)
    .to(co('graded'), { o: 1, duration: 0.06 }, 6.08)
    .to(co('graded'), { o: 0, duration: 0.06 }, 6.44);

  // ---- 7 · Quality check → dive ----
  tl.to(S, { lid: 90 / 108, ry: 0, rx: 0, duration: 0.45 }, 6.5);
  shot('qc', 6.48, 0.5, { shiftX: mobile ? 0 : 0.12 });
  tl.to(S, { ready: 0.02, duration: 0.02, ease: 'none' }, 6.84)
    .to(S, { ready: 1, duration: 0.42, ease: 'none' }, 6.86)
    .to(S, { dive: 1, duration: 0.44, ease: 'none' }, 7.34) // fills even a tall phone screen by 7.72
    .to(S, { glass: 0, duration: 0.26, ease: 'none' }, 7.38)
    .to(S, { fade: 1, duration: 0.2, ease: 'none' }, 7.52);
  // …then the handoff heading rises onto the display (see initHandoff below)

  // ---- stage copy + rail ----
  panels.forEach((el, i) => {
    const at = i + 1;
    const inAt = i === 0 ? 0.52 : at - 0.46;
    tl.fromTo(el, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.16, ease: 'power2.out', immediateRender: false }, inAt);
    const outAt = i === panels.length - 1 ? 7.34 : at + 0.4;
    tl.to(el, { autoAlpha: 0, y: -26, duration: 0.12, ease: 'power2.in' }, outAt);
  });
  tl.fromTo([rail, shade], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14, ease: 'none', immediateRender: false }, 0.48)
    .to([rail, shade], { autoAlpha: 0, duration: 0.14, ease: 'none' }, 7.3)
    .fromTo(railBar, { scaleX: 0 }, { scaleX: 1, duration: 6.1, ease: 'none', immediateRender: false }, 0.95);
  tl.to({}, { duration: 0.001 }, 7.999);

  // ---- UI that follows the timeline (runs during scrub smoothing too) ----
  let activeStage = -1;
  let dark = false;
  let graded = false;
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    const stage = t > 0.55 && t < 7.4 ? Math.min(7, Math.max(1, Math.round(t))) : -1;
    if (stage !== activeStage) {
      activeStage = stage;
      railBtns.forEach((b, i) => b.classList.toggle('is-active', i + 1 === stage));
    }
    const isDark = t > 7.72; // the display fills the viewport from here
    if (isDark !== dark) {
      dark = isDark;
      onDark?.(dark);
    }
    const g = S.grade > 0.5;
    if (g !== graded) {
      graded = g;
      gradeRows[0]?.classList.toggle('is-active', g);
    }
  });

  // ---- scroll binding ----
  const trigger = ScrollTrigger.create({
    trigger: story,
    start: 'top top',
    end: 'bottom bottom',
    scrub: reduced ? true : 0.9,
    animation: tl,
  });

  // Rail buttons jump to the middle of each stage
  const timeToScroll = (time) => trigger.start + (trigger.end - trigger.start) * (time / tl.duration());
  railBtns.forEach((b) => {
    b.addEventListener('click', () => {
      const y = timeToScroll(Number(b.dataset.go) + 0.12);
      if (lenis) lenis.scrollTo(y, { duration: 1.6 });
      else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  initHandoff({ bench, tl, reduced });

  // ---- auto-framing: tell the bench where the laptop may sit at each moment ----
  measureRects();
  ScrollTrigger.addEventListener('refresh', measureRects);
  bench.setFrameRect(() => {
    const t = tl.time();
    if (t < 0.42) return rects.hero;
    if (t > 7.3) return null; // the dive takes over the camera
    return rects.stage[Math.min(7, Math.max(1, Math.round(t)))] || null;
  });

  return { timeline: tl, trigger };
}

// The closing line lands on the laptop's display. With the story running, the dark
// chapter slides up underneath the dive and its first screen is see-through
// (.has-story in main.css), so the display — filling the viewport by then — is the
// backdrop the heading rises onto, in step with the scroll.
function initHandoff({ bench, tl, reduced }) {
  const handoff = document.querySelector('.handoff');
  const eyebrow = handoff.querySelector('.eyebrow');
  const heading = handoff.querySelector('.handoff__title');
  eyebrow.removeAttribute('data-reveal'); // revealed here instead of by initReveals
  heading.removeAttribute('data-split');

  // starts as the display's own content finishes fading (7.72)
  tl.fromTo(eyebrow, { autoAlpha: 0, y: reduced ? 0 : 16 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 7.72);
  if (reduced) {
    tl.fromTo(heading, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' }, 7.75);
  } else {
    SplitText.create(heading, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'handoff__line',
      autoSplit: true,
      // on a re-split (resize) SplitText reverts the returned tween and syncs the new one
      onSplit: (self) => {
        const rise = gsap.fromTo(self.lines, { yPercent: 135 }, { yPercent: 0, duration: 0.16, ease: 'power3.out', stagger: { amount: 0.08 } });
        tl.add(rise, 7.75); // ends by 7.99, inside the 8-unit timeline
        return rise;
      },
    });
  }
  document.documentElement.classList.add('has-story');

  // Keep rendering until the solid part of the dark chapter covers the fixed canvas
  ScrollTrigger.create({
    trigger: handoff,
    start: 'bottom top',
    onEnter: () => bench.setActive(false),
    onLeaveBack: () => bench.setActive(true),
  });
}
