// --- Micro-Interactions: Magnetic Button ---
/**
 * Applies a magnetic hover effect to a button wrapper.
 * Disabled on touch/mobile devices for performance.
 * @param {MouseEvent} e - The mouse move event.
 * @param {HTMLElement} el - The wrapper element.
 */
function magnetEffect(e, el) {
  if (window.matchMedia('(hover: none)').matches) return;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  const btn = el.querySelector('button');
  if (btn) {
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  }
}

/**
 * Resets the magnetic button position when the mouse leaves.
 * @param {HTMLElement} el - The wrapper element.
 */
function resetMagnet(el) {
  const btn = el.querySelector('button');
  if (btn) {
    btn.style.transform = `translate(0px, 0px)`;
  }
}

// --- Micro-Interactions: Glowing Cards (Mouse Tracking) ---
let glowFrame;
/**
 * Updates the CSS variables for the mouse glow effect.
 * Optimized: Only queries the hovered card and runs within requestAnimationFrame.
 * Disabled on touch devices.
 * @param {MouseEvent} e - The mouse move event.
 */
function handleCardsGlow(e) {
  if (window.matchMedia('(hover: none)').matches) return;
  const card = e.target.closest('.product-card');
  if (!card) return;

  if (glowFrame) cancelAnimationFrame(glowFrame);
  glowFrame = requestAnimationFrame(() => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  });
}

// --- Micro-Interactions: Hero Glow ---
/**
 * Moves the ambient background glow in the Hero section based on cursor movement.
 * Disabled on touch devices.
 * @param {MouseEvent} e - The mouse move event.
 */
function moveGlow(e) {
  if (window.matchMedia('(hover: none)').matches) return;
  const glow = document.getElementById('heroGlow');
  const hero = document.getElementById('heroSection');
  if (!glow || !hero) return;

  const rect = hero.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  glow.style.transform = `translate(calc(-50% + ${x*0.1}px), calc(-50% + ${y*0.1}px))`;
}

// --- Header Blur on Scroll & Progress Indicator ---
// Optimized: Throttled scroll listener using requestAnimationFrame and passive registration
let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      const header = document.getElementById('mainHeader');
      if (header) {
        if (window.scrollY > 50) {
          header.style.background = 'rgba(10, 10, 20, 0.9)';
          header.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        } else {
          header.style.background = 'var(--glass)';
          header.style.boxShadow = 'none';
        }
      }

      const scrollProgress = document.getElementById('scrollProgress');
      if (scrollProgress) {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        scrollProgress.style.width = scrolled + "%";
      }
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

// --- Toasts ---
/**
 * Displays a toast notification on the screen with slides/fade effects.
 * @param {string} msg - Message to display.
 * @param {'success'|'error'|'info'} type - Type of toast notification.
 */
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa ${icons[type]}"></i>${msg}`;
  c.appendChild(t);
  
  setTimeout(() => {
    t.style.animation = 'toastOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => t.remove(), 400);
  }, 4000);
}