/* Wolo Labs — motion
   Drives assets/css/motion.css: reveals sections as they scroll into view, fills
   the ticker marquee and lights the hero board. The hero itself is started by the
   inline script in <head> (`is-ready`), so it never waits for this file. Only
   builds the static board when the visitor asks for reduced motion (no
   `wl-motion` class on <html>). */
(() => {
  const root = document.documentElement;

  window.__wlMotion = true; // tells the <head> fallback that this script ran

  initMenu();
  document.querySelectorAll('.wl-gallery').forEach(gallery);
  const cells = buildBoard();
  if (!root.classList.contains('wl-motion')) return;

  revealOnScroll();
  parallax();
  document.querySelectorAll('.wl-slides').forEach(slideshow);

  // Board and ticker join in once the hero has started (see the <head> script).
  whenReady(() => {
    bootBoard(cells);
    marquee();
  });

  function whenReady(fn) {
    if (root.classList.contains('is-ready')) { fn(); return; }
    const mo = new MutationObserver(() => {
      if (!root.classList.contains('is-ready')) return;
      mo.disconnect();
      fn();
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---- Nav: solid once you scroll, collapsible on phones ----------------- */
  function initMenu() {
    const nav = document.querySelector('.wl-nav');
    if (!nav) return;

    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const btn = nav.querySelector('.wl-menu-btn');
    if (!btn) return;

    const links = [...nav.querySelectorAll('.wl-menu a')];
    links.forEach((a, i) => a.style.setProperty('--i', i));

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    btn.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---- Product gallery: thumbnails swap the main photo ------------------- */
  function gallery(root) {
    const main = root.querySelector('.wl-gallery-main');
    const thumbs = [...root.querySelectorAll('.wl-thumb')];
    if (!main || !thumbs.length) return;

    thumbs.forEach((thumb) => thumb.addEventListener('click', () => {
      if (thumb.classList.contains('is-active')) return;
      thumbs.forEach((t) => {
        t.classList.toggle('is-active', t === thumb);
        t.setAttribute('aria-pressed', String(t === thumb));
      });
      main.classList.add('is-swapping');
      setTimeout(() => {
        main.onload = () => main.classList.remove('is-swapping');
        main.src = thumb.dataset.src;
        main.alt = thumb.dataset.alt;
        if (main.complete) main.classList.remove('is-swapping');
      }, 200);
    }));
  }

  /* ---- Panel photo carousel ---------------------------------------------- */
  // Crossfades every few seconds; holds still while hovered or off screen.
  function slideshow(box) {
    const slides = [...box.children];
    if (slides.length < 2) return;
    const panel = box.parentElement;

    const dots = document.createElement('span');
    dots.className = 'wl-dots';
    dots.setAttribute('aria-hidden', 'true');
    slides.forEach(() => dots.appendChild(document.createElement('i')));
    panel.appendChild(dots);

    let i = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
    const show = (n) => {
      slides[i].classList.remove('is-active');
      dots.children[i].classList.remove('is-active');
      i = n % slides.length;
      slides[i].classList.add('is-active');
      dots.children[i].classList.add('is-active');
    };
    show(i);

    // The clock only runs while the panel is on screen, so the main photo always
    // gets its full turn when the visitor arrives.
    let hovered = false, timer = 0;
    panel.addEventListener('pointerenter', () => { hovered = true; });
    panel.addEventListener('pointerleave', () => { hovered = false; });
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (!e.isIntersecting) return;
      timer = setInterval(() => {
        if (!hovered && !document.hidden) show(i + 1);
      }, 4500);
    }, { threshold: 0.3 }).observe(panel);
  }

  /* ---- Hero board: 64 cells, like the console --------------------------- */
  function buildBoard() {
    const board = document.querySelector('.wl-board');
    if (!board) return [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 64; i++) frag.appendChild(document.createElement('span'));
    board.appendChild(frag);
    return [...board.children];
  }

  function flash(cell, ms) {
    cell.classList.add('is-lit');
    setTimeout(() => cell.classList.remove('is-lit'), ms);
  }

  function bootBoard(cells) {
    if (!cells.length) return;

    // Power-on sweep: a diagonal wave from the far corner, then random cells.
    cells.forEach((cell, i) => {
      const row = i >> 3, col = i & 7;
      setTimeout(() => flash(cell, 520), 400 + (row + col) * 55);
    });

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; })
      .observe(cells[0].parentElement);

    setTimeout(() => {
      setInterval(() => {
        if (!visible || document.hidden) return;
        flash(cells[(Math.random() * 64) | 0], 1400 + Math.random() * 1200);
      }, 380);
    }, 1800);
  }

  /* ---- Scroll reveals ---------------------------------------------------- */
  function revealOnScroll() {
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
    });

    const targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    targets.forEach((t) => io.observe(t));
  }

  /* ---- Ticker marquee ---------------------------------------------------- */
  // Clone the set until each half of the track is at least a screen wide, then
  // slide the track by half its width forever — the seam lands on an identical frame.
  function marquee() {
    const track = document.querySelector('.wl-ticker-track');
    if (!track) return;
    const set = track.firstElementChild;
    const SPEED = 55; // px per second

    const fill = () => {
      track.querySelectorAll('[data-clone]').forEach((n) => n.remove());
      track.classList.add('is-filled'); // measure the set in its nowrap layout

      const w = set.getBoundingClientRect().width;
      if (!w) return;
      const perHalf = Math.max(1, Math.ceil(window.innerWidth / w));
      for (let i = 1; i < perHalf * 2; i++) {
        const copy = set.cloneNode(true);
        copy.dataset.clone = '';
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
      }
      track.style.animationDuration = `${(w * perHalf) / SPEED}s`;
    };

    fill();
    let t;
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastWidth) return; // mobile URL bar show/hide
      lastWidth = window.innerWidth;
      clearTimeout(t);
      t = setTimeout(fill, 200);
    });
  }

  /* ---- Hero pieces: follow the pointer, drift on scroll ------------------ */
  function parallax() {
    const hero = document.querySelector('.wl-hero');
    const pieces = [...document.querySelectorAll('.wl-piece[data-depth]')];
    if (!hero || !pieces.length) return;

    // Keep each piece's exported rotation; prepend the offset so it moves in screen space.
    const base = pieces.map((p) => p.style.transform);
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;

    if (matchMedia('(pointer: fine)').matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        kick();
      });
      hero.addEventListener('pointerleave', () => { tx = ty = 0; kick(); });
    }
    window.addEventListener('scroll', kick, { passive: true });

    function kick() { if (!raf) raf = requestAnimationFrame(step); }

    function step() {
      raf = 0;
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      const s = Math.min(window.scrollY, window.innerHeight);
      pieces.forEach((p, i) => {
        const d = +p.dataset.depth;
        const px = x * d * 40;
        const py = y * d * 40 - s * d * 0.25;
        p.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) ${base[i]}`;
      });
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) kick();
    }
  }
})();
