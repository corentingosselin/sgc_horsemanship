// "En séance" reels — all 4 videos play in parallel. Hovering one pauses
// the other three and isolates focus on the hovered reel; mouse-leave
// restarts them all. Cycle kicks off when the section is near the viewport
// (saves above-the-fold CPU). On touch devices (no hover), all four just
// keep playing.
(function () {
  const reels = Array.from(document.querySelectorAll('.reel__video'));
  if (!reels.length) return;

  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function playAll() {
    // play() rejects if a pause() races with it — swallow to avoid noise.
    reels.forEach(v => { v.play().catch(() => {}); });
  }

  function isolate(idx) {
    reels.forEach((v, i) => {
      if (i === idx) v.play().catch(() => {});
      else v.pause();
    });
  }

  if (hasHover) {
    reels.forEach((video, i) => {
      const phone = video.closest('.reel__phone') || video;
      phone.addEventListener('mouseenter', () => isolate(i));
      phone.addEventListener('mouseleave', () => playAll());
    });
  }

  function kickOff() {
    if ('IntersectionObserver' in window) {
      const target = reels[0].closest('.reels') || reels[0];
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          io.disconnect();
          playAll();
        }
      }, { rootMargin: '200px 0px' });
      io.observe(target);
    } else {
      playAll();
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
