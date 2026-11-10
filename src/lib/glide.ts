const GLIDE_MS = 700;

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * Scroll to an element over a short, eased glide. Driven by requestAnimationFrame rather than
 * scroll-behavior so it still glides with Reduce Motion on (Liam's call); it only ever runs
 * when someone clicks, and any wheel or touch input stops it.
 */
export const glideTo = (target: HTMLElement) => {
  const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const from = window.scrollY;
  const to = Math.max(0, from + target.getBoundingClientRect().top - offset);
  const start = performance.now();
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
  };
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });

  const tick = (now: number) => {
    const k = Math.min(1, (now - start) / GLIDE_MS);
    window.scrollTo({ top: from + (to - from) * easeInOut(k), behavior: 'instant' });
    if (k < 1) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);
};
