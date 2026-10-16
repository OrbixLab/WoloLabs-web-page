/* Wolo Labs — guide pages: copy buttons on prompts and the active entry in the
   table of contents. Everything here is an enhancement; the page reads fine
   without it. */
(() => {
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const copyText = { en: ['Copy', 'Copied'], es: ['Copiar', 'Copiado'] }[lang];

  document.querySelectorAll('.g-prompt').forEach((box) => {
    const text = box.querySelector('.g-prompt-text');
    if (!text || !navigator.clipboard) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'g-copy';
    btn.textContent = copyText[0];
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(text.innerText.trim()).then(() => {
        btn.textContent = copyText[1];
        btn.classList.add('is-done');
        setTimeout(() => { btn.textContent = copyText[0]; btn.classList.remove('is-done'); }, 1800);
      });
    });
    box.appendChild(btn);
  });

  const links = [...document.querySelectorAll('.g-toc a[href^="#"]')];
  const sections = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    const current = sections.find((s) => visible.has(s));
    if (!current) return;
    links.forEach((a) => a.classList.toggle('is-active', a.hash === '#' + current.id));
  }, { rootMargin: '-90px 0px -55% 0px' });
  sections.forEach((s) => io.observe(s));
})();
