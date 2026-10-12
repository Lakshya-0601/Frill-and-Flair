/* =========================================================
   Frill & Flair — site interactions
   ========================================================= */

// ✏️ EDIT THESE — they fill in every email / Instagram link on the site.
const CONFIG = {
  email: 'frillandflair@example.com', // TODO: replace with Mom's real email
  instagram: 'https://www.instagram.com/frill_and_flair/',
  instagramHandle: '@frill_and_flair',
};

(() => {
  const root = document.documentElement;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Config → DOM ---------- */
  document.querySelectorAll('[data-email-link]').forEach((el) => { el.href = `mailto:${CONFIG.email}`; });
  document.querySelectorAll('[data-email-text]').forEach((el) => { el.textContent = CONFIG.email; });
  document.querySelectorAll('[data-insta-link]').forEach((el) => {
    el.href = CONFIG.instagram;
    el.target = '_blank';
    el.rel = 'noopener';
  });
  document.querySelectorAll('[data-insta-text]').forEach((el) => { el.textContent = CONFIG.instagramHandle; });
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Nav: hide on scroll down, menu toggle ---------- */
  const nav = document.querySelector('.nav');
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (nav && !root.classList.contains('menu-open')) {
      nav.classList.toggle('is-hidden', y > lastY && y > 200);
    }
    lastY = y;
  }, { passive: true });

  const toggle = document.querySelector('.nav__toggle');
  function closeMenu() {
    root.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
    lenis?.start();
  }
  toggle?.addEventListener('click', () => {
    const open = root.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
    if (open) lenis?.stop(); else lenis?.start();
  });
  document.querySelectorAll('.menu a').forEach((a) => a.addEventListener('click', closeMenu));

  /* ---------- Page transitions (curtain) ---------- */
  const curtain = document.querySelector('.curtain');
  if (curtain && root.classList.contains('curtain-in')) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add('is-leaving');
      root.classList.remove('curtain-in');
      setTimeout(() => curtain.classList.remove('is-leaving'), 1000);
    }));
  }
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || reduce || !curtain) return;
      if (url.pathname === location.pathname) return; // same page (hash links handled by browser)
      e.preventDefault();
      try { sessionStorage.setItem('ff-nav', '1'); } catch (err) { /* ignore */ }
      curtain.classList.add('is-covering');
      setTimeout(() => { location.href = a.href; }, 650);
    });
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) curtain?.classList.remove('is-covering', 'is-leaving');
  });

  /* ---------- Custom cursor ---------- */
  const cursor = document.querySelector('.cursor');
  if (cursor && finePointer && !reduce) {
    const label = cursor.querySelector('span');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const target = { ...pos };
    window.addEventListener('pointermove', (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      cursor.classList.add('is-visible');
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.2;
      pos.y += (target.y - pos.y) * 0.2;
      cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      requestAnimationFrame(tick);
    };
    tick();
    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => { label.textContent = el.dataset.cursor; cursor.classList.add('is-big'); });
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-big'));
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduce) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1), background .4s, color .4s, border-color .4s';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 600);
      });
    });
  }

  /* ---------- Contact helpers ---------- */
  document.querySelectorAll('[data-copy-email]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const original = btn.innerHTML;
      try {
        await navigator.clipboard.writeText(CONFIG.email);
        btn.textContent = 'Copied ✓';
      } catch (err) {
        btn.textContent = CONFIG.email;
      }
      setTimeout(() => { btn.innerHTML = original; }, 1800);
    });
  });

  const form = document.querySelector('[data-enquiry]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name') || '';
    const subject = `Boutique enquiry — ${data.get('type') || 'General'}${name ? ` from ${name}` : ''}`;
    const body = [
      `Name: ${name}`,
      `Phone: ${data.get('phone') || '-'}`,
      `Looking for: ${data.get('type') || '-'}`,
      `Needed by: ${data.get('date') || '-'}`,
      '',
      data.get('message') || '',
    ].join('\n');
    location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  /* ---------- Intro (loader) ---------- */
  function start() {
    window.__ffStarted = true;
    window.dispatchEvent(new Event('ff:start'));
    if (hasGSAP && !reduce) {
      gsap.from('[data-intro]', { yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.09 });
      gsap.from('[data-intro-fade]', { y: 24, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.4, stagger: 0.08 });
    }
  }

  const loader = document.querySelector('.loader');
  let seen = false;
  try { seen = !!sessionStorage.getItem('ff-seen'); } catch (err) { /* ignore */ }

  if (!loader) {
    start();
  } else if (seen || reduce || !hasGSAP || root.classList.contains('curtain-in')) {
    loader.remove();
    start();
  } else {
    try { sessionStorage.setItem('ff-seen', '1'); } catch (err) { /* ignore */ }
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    lenis?.stop();
    gsap.set('[data-intro]', { yPercent: 115 });
    const count = loader.querySelector('.loader__count');
    const n = { v: 0 };
    gsap.timeline({ onComplete: () => { loader.remove(); lenis?.start(); } })
      .from('.loader__word', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.1)
      .from('.loader__deva', { opacity: 0, duration: 0.8 }, 0.5)
      .to(n, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(n.v); } }, 0)
      .to('.loader__thread', { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '+=0.15')
      .add(() => { gsap.set('[data-intro]', { clearProps: 'all' }); start(); }, '-=0.7');
  }

  /* ---------- Scroll animations ---------- */
  if (!hasGSAP || reduce) return;

  function splitWords(el) {
    const frag = document.createDocumentFragment();
    [...el.childNodes].forEach((node) => {
      const isText = node.nodeType === 3;
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const outer = document.createElement('span');
        outer.className = 'w';
        const inner = isText ? document.createElement('span') : node.cloneNode(false);
        inner.classList.add('wi');
        inner.textContent = part;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
    });
    el.innerHTML = '';
    el.appendChild(frag);
    return el.querySelectorAll('.wi');
  }

  // headings rise word by word
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 110,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // big statement lights up as you read
  document.querySelectorAll('[data-scrub]').forEach((el) => {
    const words = splitWords(el);
    el.querySelectorAll('.w').forEach((w) => { w.style.overflow = 'visible'; });
    gsap.fromTo(words, { opacity: 0.13 }, {
      opacity: 1,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });

  // generic fade-up
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 50,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
      delay: parseFloat(el.dataset.reveal) || 0,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // groups that stagger in
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    gsap.from(group.children, {
      y: 70,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.12,
      scrollTrigger: { trigger: group, start: 'top 85%' },
    });
  });

  // hero title drifts up & apart while the saree keeps flowing
  const heroTitle = document.querySelector('.hero__title');
  if (heroTitle) {
    const lines = heroTitle.querySelectorAll('.line');
    // (transforms go on the lines, not the h1, so each line keeps its own layer around the canvas)
    lines.forEach((line, i) => {
      gsap.to(line, {
        xPercent: i ? 12 : -12,
        yPercent: -70,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    });
    gsap.to('.hero__foot', { opacity: 0, y: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: '60% top', scrub: true } });
  }

  // collection: horizontal scroll on large screens
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const section = document.querySelector('.collection');
    const track = document.querySelector('.collection__track');
    if (!section || !track) return;
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set('.collection__progress span', { scaleX: self.progress }),
      },
    });
    // each card's motif sways as it travels
    track.querySelectorAll('.card__motif').forEach((m) => {
      gsap.fromTo(m, { rotate: -14 }, {
        rotate: 14,
        ease: 'none',
        scrollTrigger: { trigger: m.closest('.card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      });
    });
  });

  // timeline line fills as you scroll (about page)
  const fill = document.querySelector('.timeline__fill');
  if (fill) {
    gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });
  }

  // footer wordmark slides up
  const big = document.querySelector('.footer__big');
  if (big) gsap.from(big, { yPercent: 60, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
