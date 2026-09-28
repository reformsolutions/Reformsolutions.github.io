// Page UI: nav behaviour, menu, anchors, reveals, FAQ, enquiry form, loop.

export function initNav({ lenis }) {
  const nav = document.querySelector('[data-nav]');
  const toggle = nav.querySelector('.nav__toggle');
  const menu = document.getElementById('menu');
  let darkStory = false;
  let darkSection = false;
  const applyTheme = () => {
    const dark = darkStory || darkSection;
    nav.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1B2B3B' : '#FDF8EC');
  };

  // Theme follows whatever section is under the nav bar
  document.querySelectorAll('[data-theme="dark"]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 38px',
      end: 'bottom 38px',
      onToggle: (self) => {
        el._navDark = self.isActive;
        darkSection = [...document.querySelectorAll('[data-theme="dark"]')].some((s) => s._navDark);
        applyTheme();
      },
    });
  });

  // Hide on scroll down, reveal on scroll up; solid once past the 3D story
  let lastY = 0;
  const storyEnd = () => {
    const s = document.querySelector('.story');
    return s ? s.offsetTop + s.offsetHeight - window.innerHeight : 0;
  };
  const onScroll = (y) => {
    const down = y > lastY + 2;
    const up = y < lastY - 2;
    if (menu.hidden) {
      if (down && y > 160) nav.classList.add('is-hidden');
      else if (up || y < 160) nav.classList.remove('is-hidden');
    }
    nav.classList.toggle('is-solid', y > storyEnd() + window.innerHeight * 0.9);
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  // Mobile menu
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav__toggle-label').textContent = open ? 'Close' : 'Menu';
    if (open) {
      menu.hidden = false;
      nav.classList.remove('is-hidden');
      nav.dataset.theme = 'light';
      lenis?.stop();
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'expo.out' });
      gsap.fromTo(menu.querySelectorAll('a'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.1 });
    } else {
      lenis?.start();
      applyTheme();
      gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.45, ease: 'expo.in', onComplete: () => (menu.hidden = true) });
    }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) setMenu(false);
  });

  return {
    setStoryDark(v) {
      darkStory = v;
      applyTheme();
    },
    closeMenu: () => !menu.hidden && setMenu(false),
  };
}

export function initAnchors({ lenis, nav }) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    nav.closeMenu();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY });
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });
}

export function initReveals({ reduced }) {
  if (reduced) return;
  // headings: lines rise out of a mask
  document.querySelectorAll('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line-inner' });
    gsap.from(split.lines, {
      yPercent: 108,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.09,
      scrollTrigger: { trigger: el, start: 'top 84%', once: true },
      onComplete: () => split.revert(),
    });
  });
  // everything else: a short, quiet rise
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.closest('.hero')) return; // hero is handled by the intro
    gsap.from(el, {
      y: 26,
      autoAlpha: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  // client rows + principles
  gsap.utils.toArray('.client').forEach((row, i) => {
    gsap.from(row, { y: 40, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 92%', once: true } });
  });
  const principles = gsap.utils.toArray('.principle');
  if (principles.length) {
    gsap.set(principles, { '--draw': 0 });
    ScrollTrigger.create({
      trigger: '.principles__grid',
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.to(principles, { '--draw': 1, duration: 1.2, ease: 'expo.out', stagger: 0.12 });
        gsap.from(principles.map((p) => p.children), { y: 24, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.05 });
      },
    });
  }
}

export function heroIntro({ bench, reduced }) {
  const title = document.querySelector('.hero__title');
  const items = document.querySelectorAll('.hero [data-reveal]');
  const tl = gsap.timeline();
  if (reduced) return tl;
  const split = SplitText.create(title, { type: 'lines', mask: 'lines' });
  tl.from(split.lines, { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 0)
    .from(items, { y: 24, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.3)
    .from('.hero__foot', { autoAlpha: 0, duration: 0.8 }, 0.6)
    .add(() => split.revert(), 1.8);
  if (bench) {
    const S = bench.state;
    tl.fromTo(S, { introY: 2.6, introRy: -0.9 }, { introY: 0, introRy: 0, duration: 1.8, ease: 'expo.out' }, 0.05);
    // introduce the unit once it has landed (only if the visitor hasn't scrolled on)
    if (S.co.incoming && window.scrollY < 40) tl.to(S.co.incoming, { o: 1, duration: 0.6, ease: 'power1.out' }, 1.3);
  }
  return tl;
}

export function initFaq() {
  document.querySelectorAll('.qa').forEach((qa) => {
    const btn = qa.querySelector('button');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      qa.classList.toggle('is-open', open);
      setTimeout(() => ScrollTrigger.refresh(), 600);
    });
  });
}

export function initForm() {
  const form = document.querySelector('.enquiry');
  if (!form) return;
  const note = form.querySelector('.enquiry__note');
  const emailLink = document.querySelector('[data-contact="email"]');
  const to = emailLink ? emailLink.getAttribute('href').replace('mailto:', '') : '';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    if (!name || !email || !form.querySelector('[name="email"]').checkValidity()) {
      note.textContent = 'Please add your name and a valid email address.';
      note.classList.add('is-error');
      form.querySelector(!name ? '[name="name"]' : '[name="email"]').focus();
      return;
    }
    note.classList.remove('is-error');
    const intent = data.get('intent');
    const lines = [
      `Enquiry: ${intent}`,
      `Name: ${name}`,
      data.get('company') ? `Company: ${data.get('company')}` : null,
      `Email: ${email}`,
      data.get('phone') ? `Phone: ${data.get('phone')}` : null,
      `Quantity: ${data.get('quantity')}`,
      '',
      (data.get('message') || '').toString(),
    ].filter((l) => l !== null);
    const subject = `${intent} — ${data.get('company') || name}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    note.textContent = 'Your email app should open with everything filled in.';
  });
}

export function initLoop({ reduced }) {
  const ring = document.querySelector('.loop__ring');
  if (!ring) return;
  const arcs = ring.querySelectorAll('.loop__arc');
  if (reduced) return;
  gsap.set(arcs, { drawSVG: '0%' });
  ScrollTrigger.create({
    trigger: '.impact',
    start: 'top 70%',
    once: true,
    onEnter: () => gsap.to(arcs, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut', stagger: 0.25 }),
  });
  gsap.set(ring, { svgOrigin: '0 0' });
  gsap.fromTo(ring, { rotation: -18 }, {
    rotation: 18,
    ease: 'none',
    scrollTrigger: { trigger: '.impact', start: 'top bottom', end: 'bottom top', scrub: 1 },
  });
}
