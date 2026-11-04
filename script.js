'use strict';
// Preferences are optional: the page remains readable when storage is unavailable.
const root = document.documentElement;
const themeBtn = document.getElementById('themeBtn');
const langBtn = document.getElementById('langBtn');
const motionBtn = document.getElementById('motionBtn');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
let language = read('site-language', 'zh') === 'en' ? 'en' : 'zh';
let paused = read('site-motion', 'running') === 'paused';
let theme = read('site-theme', 'light') === 'dark' ? 'dark' : 'light';
const reduced = () => motionQuery.matches || paused;

function updateControls() {
  const zh = language === 'zh';
  const dark = theme === 'dark';
  themeBtn.textContent = dark ? '☀' : '☾';
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.setAttribute('aria-label', zh ? (dark ? '切换浅色主题' : '切换深色主题') : (dark ? 'Switch to light theme' : 'Switch to dark theme'));
  langBtn.textContent = zh ? 'EN' : '中文';
  langBtn.setAttribute('aria-label', zh ? '切换为英文 / Switch to English' : 'Switch to Chinese / 切换为中文');
  motionBtn.textContent = motionQuery.matches ? (zh ? '已减少动态' : 'Motion reduced') : (paused ? (zh ? '播放动画' : 'Play motion') : (zh ? '暂停动画' : 'Pause motion'));
  motionBtn.setAttribute('aria-label', motionBtn.textContent);
  motionBtn.setAttribute('aria-pressed', String(reduced()));
  motionBtn.disabled = motionQuery.matches;
}
function setTheme(value) {
  theme = value;
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0b0a12' : '#f7f8fa';
  save('site-theme', theme);
  updateControls();
  if (reduced()) drawParticles(0);
}
function setLanguage(value) {
  language = value;
  root.lang = value === 'zh' ? 'zh-CN' : 'en';
  // Only translations authored in this repository are used here.
  document.querySelectorAll('[data-cn][data-en]').forEach(el => { el.innerHTML = el.dataset[value === 'zh' ? 'cn' : 'en']; });
  save('site-language', value);
  updateControls();
  if (typeof resizeCanvas === 'function' && ready) resizeCanvas();
}
themeBtn.addEventListener('click', () => setTheme(theme === 'dark' ? 'light' : 'dark'));
langBtn.addEventListener('click', () => setLanguage(language === 'zh' ? 'en' : 'zh'));

// Particle network: bounded density, capped pixel ratio, paused offscreen.
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let ready = false;
let particles = [];
let frame = null;
let lastFrame = 0;
let heroVisible = true;
let width = 0, height = 0;
function resizeCanvas() {
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  width = rect.width; height = rect.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  particles = Array.from({ length: Math.min(55, Math.floor(width / 22)) }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: .8 + Math.random() }));
  drawParticles(0);
}
function drawParticles(step) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const color = theme === 'dark' ? '174,151,255' : '91,116,163';
  for (const p of particles) {
    p.x += p.vx * step; p.y += p.vy * step;
    if (p.x < 0 || p.x > width) { p.vx *= -1; p.x = Math.max(0, Math.min(width, p.x)); }
    if (p.y < 0 || p.y > height) { p.vy *= -1; p.y = Math.max(0, Math.min(height, p.y)); }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(${color},.35)`; ctx.fill();
  }
  for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
    const a = particles[i], b = particles[j], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < 110) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(${color},${.12 * (1 - d / 110)})`; ctx.lineWidth = .7; ctx.stroke(); }
  }
}
function tick(time) {
  frame = null;
  if (reduced() || document.hidden || !heroVisible) return;
  if (time - lastFrame >= 33) { drawParticles(Math.min((time - lastFrame) / 33, 2)); lastFrame = time; }
  frame = requestAnimationFrame(tick);
}
function syncMotion() {
  root.dataset.motion = reduced() ? 'paused' : 'running';
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null; lastFrame = performance.now();
  resetTilt(); updateControls();
  if (!reduced() && !document.hidden && heroVisible && ctx) frame = requestAnimationFrame(tick);
  else drawParticles(0);
}
const stage = document.getElementById('moleculeStage');
function resetTilt() { stage.style.removeProperty('--tilt-x'); stage.style.removeProperty('--tilt-y'); }
stage.addEventListener('pointermove', event => {
  if (reduced() || event.pointerType !== 'mouse') return;
  const box = stage.getBoundingClientRect();
  stage.style.setProperty('--tilt-x', `${((event.clientX - box.left) / box.width - .5) * 10}deg`);
  stage.style.setProperty('--tilt-y', `${-((event.clientY - box.top) / box.height - .5) * 10}deg`);
});
stage.addEventListener('pointerleave', resetTilt);
motionBtn.addEventListener('click', () => { paused = !paused; save('site-motion', paused ? 'paused' : 'running'); syncMotion(); });
motionQuery.addEventListener('change', syncMotion);
document.addEventListener('visibilitychange', syncMotion);
window.addEventListener('resize', resizeCanvas, { passive: true });
if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(document.querySelector('.hero'));
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; syncMotion(); }).observe(document.querySelector('.hero'));
  const navLinks = document.querySelectorAll('.nav-links a');
  const navObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) navLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${entry.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-20% 0px -55% 0px' });
  document.querySelectorAll('main section[id]').forEach(section => navObserver.observe(section));
}
setLanguage(language); setTheme(theme); ready = true; resizeCanvas(); syncMotion();
