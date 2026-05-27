// "En séance" reels — rotating cycle of 4 videos. Each plays STEP_MS, then
// the next one takes over; loops forever. Hover on a reel interrupts the
// cycle and plays that reel from start; mouse-leave resumes the cycle at
// the next reel. On touch devices (no hover), the cycle runs uninterrupted.
(function () {
  const reels = Array.from(document.querySelectorAll('.reel__video'));
  if (!reels.length) return;

  const STEP_MS = 3000;
  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let cycleIdx = 0;
  let cycleTimer = null;
  let hovered = false;

  function playOnly(idx) {
    reels.forEach((v, i) => {
      if (i === idx) {
        // play() rejects if a pause() races with it — swallow to avoid noise.
        try { v.currentTime = 0; } catch (_) {}
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }

  function tick() {
    if (hovered) return;
    cycleIdx = (cycleIdx + 1) % reels.length;
    playOnly(cycleIdx);
    cycleTimer = setTimeout(tick, STEP_MS);
  }

  function startCycle() {
    stopCycle();
    playOnly(cycleIdx);
    cycleTimer = setTimeout(tick, STEP_MS);
  }

  function stopCycle() {
    if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
  }

  if (hasHover) {
    reels.forEach((video, i) => {
      const phone = video.closest('.reel__phone') || video;
      phone.addEventListener('mouseenter', () => {
        hovered = true;
        stopCycle();
        playOnly(i);
      });
      phone.addEventListener('mouseleave', () => {
        hovered = false;
        cycleIdx = (i + 1) % reels.length; // resume at the next reel
        startCycle();
      });
    });
  }

  // Wait for the first reel to be near the viewport before kicking the cycle —
  // saves CPU/bandwidth above the fold and avoids autoplay being throttled by
  // the page-load contention.
  function kickOff() {
    if ('IntersectionObserver' in window) {
      const target = reels[0].closest('.reels') || reels[0];
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          io.disconnect();
          startCycle();
        }
      }, { rootMargin: '200px 0px' });
      io.observe(target);
    } else {
      startCycle();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kickOff, { once: true });
  } else {
    kickOff();
  }
})();

// Reveal animations on scroll. The CSS already hides these elements at first
// paint (gated on html.js-fade, which an inline <head> script sets). All this
// script does is add `.in` when an element enters the viewport.
(function () {
  const targets = document.querySelectorAll(
    '.hero__copy, .hero__photo, .about__photo, .about__copy, .section-head, .svc, .reel, .quote, .quote--hero, .avis__single, .contact__card'
  );

  // Reveal any element already in viewport immediately (covers above-the-fold).
  const revealIfVisible = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    targets.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add('in');
    });
  };
  revealIfVisible();

  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  targets.forEach(el => io.observe(el));

  // Safety: re-check on scroll/resize, and a final timeout reveal in case IO never fires.
  window.addEventListener('scroll', revealIfVisible, { passive: true });
  window.addEventListener('resize', revealIfVisible);
  setTimeout(() => {
    targets.forEach(el => el.classList.add('in'));
  }, 1500);
})();
