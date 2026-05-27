// Hover-to-play for the "En séance" reels. The <video> elements ship with
// preload="metadata" + poster, so first paint is just the still image; the
// video bytes only stream once the pointer enters. On touch devices (no
// hover), tap toggles play/pause.
(function () {
  const reels = document.querySelectorAll('.reel__video');
  if (!reels.length) return;

  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  reels.forEach((video) => {
    if (hasHover) {
      const phone = video.closest('.reel__phone') || video;
      phone.addEventListener('mouseenter', () => {
        // play() returns a promise that rejects if interrupted by a pause()
        // racing with it — swallow to avoid unhandled-rejection noise.
        video.play().catch(() => {});
      });
      phone.addEventListener('mouseleave', () => {
        video.pause();
        video.currentTime = 0;
      });
    } else {
      video.addEventListener('click', () => {
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      });
    }
  });
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
