// Preloader: the RS monogram draws itself in (stroke), fills, then the curtain lifts.
// `quick` (repeat visits) skips the drawing and just lifts the curtain.
import { MARK } from './brand-paths.js';

export function createPreloader({ reduced, quick = false }) {
  const el = document.querySelector('.preloader');
  const svg = el.querySelector('.preloader__mark');
  const pct = el.querySelector('.preloader__pct');
  const label = el.querySelector('.preloader__label');
  svg.innerHTML = `
    <path d="${MARK.navy}" fill-rule="evenodd" fill="#2D445A" fill-opacity="0" stroke="#2D445A" stroke-width="10"/>
    <path d="${MARK.orange}" fill-rule="evenodd" fill="#D2780C" fill-opacity="0" stroke="#D2780C" stroke-width="10"/>`;
  const paths = svg.querySelectorAll('path');
  const instant = reduced || quick;

  const counter = { v: 0 };
  let target = 0;
  const setText = () => (pct.textContent = String(Math.round(counter.v)).padStart(2, '0'));

  const draw = gsap.timeline();
  if (instant) {
    gsap.set(paths, { attr: { 'fill-opacity': 1, 'stroke-opacity': 0 } });
  } else {
    draw
      .fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.85, ease: 'power2.inOut', stagger: 0.1 })
      .to(paths, { attr: { 'fill-opacity': 1 }, duration: 0.35, ease: 'power1.out' }, '-=0.25')
      .to(paths, { attr: { 'stroke-opacity': 0 }, duration: 0.25 }, '<0.15');
  }

  return {
    progress(p, text) {
      target = Math.max(target, Math.min(1, p));
      if (text) label.textContent = text;
      gsap.to(counter, { v: target * 100, duration: instant ? 0.2 : 0.45, ease: 'power2.out', overwrite: true, onUpdate: setText });
    },
    async finish() {
      this.progress(1, 'Ready');
      await new Promise((res) => {
        if (instant || draw.progress() === 1) return res();
        draw.eventCallback('onComplete', res);
      });
      await new Promise((res) => gsap.delayedCall(instant ? 0 : 0.15, res));
      const out = gsap.timeline();
      out.to(el.querySelector('.preloader__inner'), { y: -24, autoAlpha: 0, duration: reduced ? 0.01 : 0.35, ease: 'power2.in' })
        .to(el, { clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0.01 : quick ? 0.6 : 0.8, ease: 'expo.inOut' }, reduced ? 0 : 0.12);
      await new Promise((res) => out.eventCallback('onComplete', res));
      el.remove();
    },
  };
}
