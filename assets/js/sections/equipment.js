// "What we deal in": pinned horizontal track on desktop, stacked on mobile.
// An orange RJ45 plug drags the cable along the bottom as you scroll.
import { ART } from './iso.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const drawEase = gsap.parseEase('power2.inOut');
const fillEase = gsap.parseEase('power1.out');

// Lines draw in one after another (0.9s spread, 1.5s each) and fill in behind them.
// One tween drives the whole drawing: a tween per line meant setting up ~170 tweens in a
// single frame when a card appeared, which stalled the scroll on phones.
function drawIn(card, reduced) {
  if (card.dataset.drawn) return;
  card.dataset.drawn = '1';
  const svg = card.querySelector('.iso');
  if (!svg) return;
  const lines = [...svg.querySelectorAll('polygon, polyline')];
  if (reduced) {
    gsap.set(lines, { strokeDashoffset: 0, fillOpacity: 1 });
    return;
  }
  const step = 0.9 / Math.max(1, lines.length - 1);
  const shown = lines.map(() => [-1, -1]);
  const clock = { t: 0 };
  gsap.to(clock, {
    t: 2.4,
    duration: 2.4,
    ease: 'none',
    onUpdate() {
      lines.forEach((el, i) => {
        const d = Math.round(drawEase(clamp01((clock.t - i * step) / 1.5)) * 1000) / 1000;
        const f = Math.round(fillEase(clamp01((clock.t - 0.25 - i * step) / 0.8)) * 1000) / 1000;
        const s = shown[i];
        if (d !== s[0]) el.style.strokeDashoffset = String(1 - (s[0] = d));
        if (f !== s[1]) el.style.fillOpacity = String((s[1] = f));
      });
    },
  });
}

export function initEquipment({ reduced }) {
  const section = document.querySelector('.equipment');
  if (!section) return;
  const pin = section.querySelector('.equipment__pin');
  const track = section.querySelector('.equipment__track');
  const word = section.querySelector('.equipment__word');
  const cable = section.querySelector('.equipment__cable');
  const cards = [...section.querySelectorAll('.eq-card')];

  // Render the line drawings, hidden until they draw in.
  for (const card of cards) {
    const holder = card.querySelector('[data-art]');
    const make = ART[holder.dataset.art];
    if (!make) continue;
    holder.innerHTML = make();
    const lines = holder.querySelectorAll('polygon, polyline');
    gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1, fillOpacity: 0 });
  }

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const scroller = gsap.to(track, { x: () => -distance(), ease: 'none' });
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin,
      scrub: reduced ? true : 0.7,
      animation: scroller,
      invalidateOnRefresh: true,
      onUpdate: (self) => cable.style.setProperty('--wire', `${(4 + self.progress * 86).toFixed(2)}%`),
    });
    gsap.to(word, {
      x: () => -distance() * 0.32,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: reduced ? true : 0.7, invalidateOnRefresh: true },
    });
    cards.forEach((card) => {
      ScrollTrigger.create({
        trigger: card,
        containerAnimation: scroller,
        start: 'left 88%',
        onEnter: () => drawIn(card, reduced),
      });
    });
    return () => cable.style.removeProperty('--wire');
  });

  mm.add('(max-width: 899px)', () => {
    cards.forEach((card) => {
      ScrollTrigger.create({ trigger: card, start: 'top 82%', once: true, onEnter: () => drawIn(card, reduced) });
    });
  });
}
