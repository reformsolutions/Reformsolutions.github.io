// Page UI: nav behaviour, menu, anchors, reveals, FAQ, enquiry form, loop.

export function initNav({ lenis }) {
  const nav = document.querySelector('[data-nav]');
  const toggle = nav.querySelector('.nav__toggle');
  const menu = document.getElementById('menu');
  const story = document.querySelector('.story');
  let darkStory = false; // the dive has filled the screen with the laptop's display
  let storyUnder = true; // …which only counts while the story is under the nav bar
  let darkSection = false;
  const applyTheme = () => {
    const dark = (darkStory && storyUnder) || darkSection;
    nav.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1B2B3B' : '#FDF8EC');
  };

  // Theme follows whatever section is under the nav bar. These are created before the pinned
  // sections further down, so they're measured last (refreshPriority) to include their pin spacing.
  if (story) {
    ScrollTrigger.create({
      trigger: story,
      start: 'top 38px',
      end: 'bottom 38px',
      refreshPriority: -1,
      onToggle: (self) => {
        storyUnder = self.isActive;
        applyTheme();
      },
    });
  }
  document.querySelectorAll('[data-theme="dark"]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 38px',
      end: 'bottom 38px',
      refreshPriority: -1,
      onToggle: (self) => {
        el._navDark = self.isActive;
        darkSection = [...document.querySelectorAll('[data-theme="dark"]')].some((s) => s._navDark);
        applyTheme();
      },
    });
  });

  // The WhatsApp button (bottom right) turns cream over the dark sections, the same way, along a line
  // through its middle.
  const wa = document.querySelector('.wa');
  let applyWa = () => {};
  if (wa) {
    const line = () => `bottom-=${Math.round(parseFloat(getComputedStyle(wa).bottom) + wa.offsetHeight / 2)}px`;
    const darkUnder = new Set();
    let storyUnderWa = true;
    applyWa = () => wa.classList.toggle('is-on-dark', (darkStory && storyUnderWa) || darkUnder.size > 0);
    const watch = (el, onToggle) =>
      ScrollTrigger.create({ trigger: el, start: () => `top ${line()}`, end: () => `bottom ${line()}`, refreshPriority: -1, onToggle });
    if (story) {
      watch(story, (self) => {
        storyUnderWa = self.isActive;
        applyWa();
      });
    }
    document.querySelectorAll('[data-theme="dark"]').forEach((el) =>
      watch(el, (self) => {
        if (self.isActive) darkUnder.add(el);
        else darkUnder.delete(el);
        applyWa();
      })
    );
  }

  // Hide on scroll down, reveal on scroll up; solid once past the 3D story.
  // Measured on refresh only: reading layout in the scroll handler forced a reflow every frame.
  let lastY = 0;
  let solidAt = Infinity;
  const measure = () => {
    solidAt = story ? story.offsetTop + story.offsetHeight - window.innerHeight * 0.1 : 0;
  };
  measure();
  ScrollTrigger.addEventListener('refresh', measure);
  const onScroll = (y) => {
    const down = y > lastY + 2;
    const up = y < lastY - 2;
    if (menu.hidden) {
      if (down && y > 160) nav.classList.add('is-hidden');
      else if (up || y < 160) nav.classList.remove('is-hidden');
    }
    nav.classList.toggle('is-solid', y > solidAt);
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
      applyWa();
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
    // introduce the unit once it has landed (the story hides it again as soon as it starts)
    if (S.co.incoming) {
      if (window.scrollY < 40) tl.to(S.co.incoming, { intro: 1, duration: 0.6, ease: 'power1.out' }, 1.3);
      else S.co.incoming.intro = 1;
    }
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

// ---- Enquiry form -----------------------------------------------------------
// Tabs switch the fields for each enquiry type. On submit the form is checked and
// multi-choice answers are joined into single fields, then:
//  · no form service yet (the action is a mailto: link): the visitor's email app opens
//    with everything filled in, and a panel offers "Try again" / "Copy your enquiry";
//  · a form service URL in the action: the form posts there directly, and the photo
//    upload on the Sell tab switches on (photos are resized in the browser first).
const ENQUIRY_TYPES = {
  buy: { button: 'Request a quote', message: 'Which models or specs do you need? Any delivery timeline?' },
  sell: { button: 'Get a valuation', message: 'Models, age and specs if you know them — anything that helps us value it.' },
  other: { button: 'Send message', message: 'How can we help?' },
};
const EMAIL_LABELS = { email: 'Email', 'Approx quantity': 'Approx. quantity' };
const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 5;

// Resize a photo to at most 1600px on its longest side (as JPEG) so uploads stay small.
async function shrinkPhoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900 * 1024) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export function initForm({ lenis } = {}) {
  const form = document.querySelector('.enquiry');
  if (!form) return;
  const action = (form.getAttribute('action') || '').trim();
  // How an enquiry leaves: 'web3' (a Web3Forms access key in the form: sent in the background, the
  // visitor stays on the page), 'post' (another form service's URL as the action: the form posts there,
  // photos included), or 'email' (the mailto: action: the visitor's email app opens, all filled in).
  const accessKey = (form.elements.namedItem('access_key')?.value || '').trim();
  const mode = accessKey && form.dataset.service ? 'web3' : /^https?:\/\//i.test(action) ? 'post' : 'email';
  const viaEmail = mode === 'email';
  const inbox = action.startsWith('mailto:')
    ? action.slice('mailto:'.length)
    : (document.querySelector('[data-contact="email"]')?.getAttribute('href') || '').replace('mailto:', '');
  const note = form.querySelector('.enquiry__note');
  if (!viaEmail) note.innerHTML = '<b class="req" aria-hidden="true">*</b> Required · We’ll get back to you by email or phone.';
  const noteDefault = note.innerHTML;
  const submit = form.querySelector('.enquiry__submit');
  const submitLabel = submit.querySelector('span');
  const field = (name) => form.elements.namedItem(name);
  const message = field('Message');
  const groups = [...form.querySelectorAll('.enquiry__group')];
  const typeRadios = [...form.querySelectorAll('input[name="Enquiry type"]')];
  const done = form.querySelector('.enquiry__done');
  let type = 'buy';
  let refreshTimer = 0;
  const refreshSoon = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150); // the form's height changed
  };

  const setNote = (text = '', isError = false) => {
    note.classList.toggle('is-error', isError);
    if (text) note.textContent = text;
    else note.innerHTML = noteDefault;
  };

  function clearErrors() {
    form.querySelectorAll('.field.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    setNote();
  }

  // ---- tabs ----
  function setType(next) {
    type = ENQUIRY_TYPES[next] ? next : 'buy';
    groups.forEach((g) => {
      const on = g.dataset.group === type;
      g.disabled = !on;
      g.hidden = !on;
    });
    submitLabel.textContent = ENQUIRY_TYPES[type].button;
    message.placeholder = ENQUIRY_TYPES[type].message;
    clearErrors();
    refreshSoon();
  }
  typeRadios.forEach((r) => r.addEventListener('change', () => r.checked && setType(r.dataset.type)));
  setType(typeRadios.find((r) => r.checked)?.dataset.type);

  // ---- validation ----
  const isActive = (el) => !el.closest('fieldset[disabled]');
  const control = (el) => (el.matches('input, select, textarea') ? el : el.querySelector('input'));
  const labelOf = (el) =>
    el.closest('.field')?.querySelector('.field__label')?.textContent.replace('*', '').replace(/\(.*\)/, '').trim() || el.name;

  function validate() {
    clearErrors();
    const bad = [];
    form.querySelectorAll('[required]').forEach((el) => {
      if (!isActive(el)) return;
      const value = el.value.trim();
      let ok = value !== '';
      if (ok && el.type === 'email') ok = el.checkValidity();
      if (ok && el.type === 'tel') {
        const digits = value.replace(/\D/g, '');
        ok = digits.length >= 10 && digits.length <= 13;
      }
      if (!ok) bad.push(el);
    });
    form.querySelectorAll('[data-required-group]').forEach((group) => {
      if (isActive(group) && !group.querySelector('input:checked')) bad.push(group);
    });
    bad.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)); // page order
    bad.forEach((el) => {
      el.closest('.field')?.classList.add('is-invalid');
      control(el)?.setAttribute('aria-invalid', 'true');
    });
    if (bad.length) {
      setNote(`Please check: ${bad.map(labelOf).join(', ')}.`, true);
      control(bad[0])?.focus();
    }
    return bad.length === 0;
  }

  // fixing a field clears its mark, and the note then lists only what's still missing
  form.addEventListener('input', (e) => {
    const f = e.target.closest('.field');
    if (!f?.classList.contains('is-invalid')) return;
    f.classList.remove('is-invalid');
    f.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const left = [...form.querySelectorAll('.field.is-invalid')].map(labelOf);
    setNote(left.length ? `Please check: ${left.join(', ')}.` : '', left.length > 0);
  });

  // ---- photos: uploaded only to a form service that takes files ('post'); by email they're attached
  // to the email, and after a Web3Forms enquiry (its free plan takes no files) they go on WhatsApp ----
  const upload = form.querySelector('.upload');
  const uploadHint = form.querySelector('.upload-hint');
  const picker = form.querySelector('.upload__picker');
  const drop = form.querySelector('.upload__drop');
  const list = form.querySelector('.upload__list');
  const slots = [...form.querySelectorAll('.upload__slot')];
  const photos = [];
  const canAssignFiles = (() => {
    try {
      const dt = new DataTransfer();
      dt.items.add(new File([''], 'x.txt'));
      return dt.files.length === 1;
    } catch {
      return false;
    }
  })();
  if (upload) upload.hidden = mode !== 'post';
  if (uploadHint) {
    uploadHint.hidden = mode === 'post';
    uploadHint.querySelectorAll('[data-when]').forEach((el) => (el.hidden = el.dataset.when !== (viaEmail ? 'email' : 'sent')));
  }
  if (mode !== 'post') slots.forEach((s) => (s.disabled = true));
  else if (picker && !canAssignFiles) {
    picker.name = 'Photos'; // older browsers: send the picked files as they are
    slots.forEach((s) => s.remove());
  }

  function renderPhotos() {
    list.replaceChildren(
      ...photos.map((p, i) => {
        const li = document.createElement('li');
        const img = document.createElement('img');
        img.src = p.url;
        img.alt = `Photo ${i + 1}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'upload__remove';
        remove.setAttribute('aria-label', `Remove photo ${i + 1}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          URL.revokeObjectURL(p.url);
          photos.splice(photos.indexOf(p), 1);
          renderPhotos();
        });
        li.append(img, remove);
        return li;
      })
    );
  }

  async function addPhotos(files) {
    let skipped = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
        skipped++;
        continue;
      }
      if (photos.length >= MAX_PHOTOS) {
        skipped++;
        continue;
      }
      const small = await shrinkPhoto(file);
      if (small.size > MAX_PHOTO_MB * 1024 * 1024) {
        skipped++;
        continue;
      }
      photos.push({ file: small, url: URL.createObjectURL(small) });
    }
    renderPhotos();
    setNote(skipped ? `Up to ${MAX_PHOTOS} photos, ${MAX_PHOTO_MB} MB each — ${skipped} not added.` : '', skipped > 0);
  }

  if (mode === 'post' && picker && canAssignFiles) {
    picker.addEventListener('change', () => {
      const files = [...picker.files];
      picker.value = '';
      addPhotos(files);
    });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.add('is-drag')));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-drag')));
  }

  function fillPhotoSlots() {
    slots.forEach((slot, i) => {
      const photo = photos[i];
      slot.disabled = !photo;
      if (!photo) return;
      const dt = new DataTransfer();
      dt.items.add(photo.file);
      slot.files = dt.files;
    });
  }

  // ---- sending ----
  const value = (name) => (field(name)?.value || '').trim();
  const subjectLine = () =>
    `Website enquiry: ${typeRadios.find((r) => r.checked)?.value || 'Enquiry'} — ${value('Company') || value('Name')}`;

  function joinChoices() {
    form.querySelectorAll('.checks[data-target]').forEach((group) => {
      const out = field(group.dataset.target);
      if (out) out.value = [...group.querySelectorAll('input:checked')].map((i) => i.value).join(', ');
    });
  }

  function enquiryText() {
    const lines = [];
    let text = '';
    for (const [name, raw] of new FormData(form)) {
      const v = typeof raw === 'string' ? raw.trim() : '';
      if (!v || name.startsWith('_')) continue;
      if (name === 'Message') text = v;
      else lines.push(`${EMAIL_LABELS[name] || name}: ${v}`);
    }
    lines.push('', 'Message:', text);
    if (type === 'sell') lines.push('', 'Photos: please attach them to this email before sending.');
    return lines.join('\n');
  }

  // the confirmation: 'email' (handed to the email app) or 'sent' (sent in the background)
  function showDone(kind) {
    done.querySelectorAll('[data-when]').forEach((el) => (el.hidden = el.dataset.when !== kind));
    done.querySelectorAll('.enquiry__done-photos').forEach((el) => (el.hidden = type !== 'sell'));
    form.classList.add('is-sent');
    done.hidden = false;
    refreshSoon();
    const y = form.getBoundingClientRect().top + window.scrollY - 120;
    if (lenis) lenis.scrollTo(y, { duration: 0.9 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
    done.focus({ preventScroll: true });
  }

  // Web3Forms: the filled-in fields as form data (a plain cross-site post, so no preflight request),
  // with the access key and a ticked honeypot among them; `email` doubles as the reply-to address.
  // A failure keeps the form as it is and says how else to reach us.
  let sending = false;
  async function sendWeb3(subject) {
    const body = new FormData();
    for (const [name, raw] of new FormData(form)) {
      const v = typeof raw === 'string' ? raw.trim() : '';
      if (v && !name.startsWith('_')) body.append(name, v);
    }
    body.set('subject', subject);
    body.set('from_name', 'Reform Solutions website');
    sending = true;
    submit.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Sending…';
    setNote();
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 20000);
    try {
      const res = await fetch(form.dataset.service, { method: 'POST', headers: { Accept: 'application/json' }, body, signal: stop.signal });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.success) throw new Error(out.body?.message || out.message || `HTTP ${res.status}`);
      showDone('sent');
    } catch (err) {
      console.warn('[enquiry]', err);
      const phone = document.querySelector('[data-contact="phone"]')?.textContent.trim();
      setNote(`Sorry, that didn’t go through. Please try again, or email ${inbox}${phone ? ` or WhatsApp ${phone}` : ''}.`, true);
    } finally {
      clearTimeout(timer);
      sending = false;
      submit.removeAttribute('aria-busy');
      submitLabel.textContent = ENQUIRY_TYPES[type].button;
    }
  }

  let lastEnquiry = '';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sending || !validate()) return;
    joinChoices();
    const subject = subjectLine();
    if (mode === 'web3') {
      sendWeb3(subject);
      return;
    }
    if (viaEmail) {
      const body = enquiryText();
      const href = `mailto:${inbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;
      lastEnquiry = `Subject: ${subject}\n\n${body}`;
      done.querySelector('.enquiry__retry').href = href;
      window.location.href = href;
      showDone('email');
      return;
    }
    if (field('_subject')) field('_subject').value = subject;
    if (canAssignFiles) fillPhotoSlots();
    form.method = 'post';
    form.enctype = 'multipart/form-data';
    submit.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Sending…';
    form.submit();
  });

  // ---- confirmation panel (email hand-off) ----
  const copyButton = done.querySelector('.enquiry__copy');
  const copied = done.querySelector('.enquiry__copied');
  const copyArea = done.querySelector('.enquiry__copy-text');
  copyButton.addEventListener('click', async () => {
    if (await copyText(lastEnquiry)) {
      copied.textContent = 'Copied.';
      setTimeout(() => (copied.textContent = ''), 4000);
    } else {
      copyArea.value = lastEnquiry;
      copyArea.hidden = false;
      copyArea.select();
      copied.textContent = 'Select the text below and copy it.';
    }
  });
  // back to the form: as it was (to try again), or cleared for another enquiry once one was sent
  done.querySelectorAll('.enquiry__back').forEach((back) =>
    back.addEventListener('click', () => {
      if (back.hasAttribute('data-reset')) {
        form.reset();
        setType(typeRadios.find((r) => r.checked)?.dataset.type);
      }
      form.classList.remove('is-sent');
      done.hidden = true;
      copyArea.hidden = true;
      copied.textContent = '';
      refreshSoon();
      typeRadios.find((r) => r.checked)?.focus({ preventScroll: true });
    })
  );

  // coming back via the browser's Back button after posting to a form service
  window.addEventListener('pageshow', () => {
    submit.removeAttribute('aria-busy');
    submitLabel.textContent = ENQUIRY_TYPES[type].button;
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
