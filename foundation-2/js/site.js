/* The Foundation — shared behaviour, linked by every page. */
document.addEventListener('DOMContentLoaded', () => {
      // --- ELEMENT REFERENCES ---
      const deskTopImage = document.getElementById('desk-top-image');
      const deskBtmImage = document.getElementById('desk-btm-image');
      const mobBtmImage = document.getElementById('mob-btm-image');
      const mobSky = document.getElementById('mob-sky');

      const container = document.getElementById('scroll-container');
      const stickyWrapper = document.getElementById('sticky-wrapper');
      const introTitle = document.getElementById('intro-title');
      const rail = document.getElementById('rail');
      const footerEl = document.querySelector('.site-footer');
      const burger = document.getElementById('burger');
      const siteNav = document.getElementById('site-nav');

      // One breakpoint, shared by the layout above and the behaviour below.
      const DESKTOP = window.matchMedia('(min-width: 1024px)');

      /* ── THE MOBILE SKY ────────────────────────────────────────────
         The clouds drift on their own from CSS. This is only about what
         SCROLLING does to them.

           'speed'  the clouds accelerate across the sky
           'zoom'   the clouds keep their pace, the whole sky moves in
           'both'   a measured amount of each — the current setting

         The two numbers below are the amount at the very end of the
         scroll, and they are read from whichever mode is chosen.      */
      const SKY_SCROLL_MODE = 'both';        // ← 'speed' | 'zoom' | 'both'
      const SKY_SETTINGS = {
        speed: { rate: 9,   zoom: 1    },
        zoom:  { rate: 1,   zoom: 1.6  },
        both:  { rate: 4,   zoom: 1.25 },
      };
      const SKY = SKY_SETTINGS[SKY_SCROLL_MODE] || SKY_SETTINGS.both;

      /* How quickly the sky clears on scroll, so the town underneath can
         be seen. These are points on the splash's own 0→1 scroll, and the
         sky is fully gone well before the splash itself starts fading at
         0.8. Widen the gap between them for a lazier fade.

         Only desktop reads this — the CSS that applies --sky-fade lives in
         the 768px block, so the phone is unaffected by either number. */
      const SKY_FADE_START = 0.10;
      const SKY_FADE_END   = 0.50;

      /* The clouds are CSS animations. Reaching them through the Web
         Animations API lets us change playbackRate, which speeds them up
         from wherever they currently are — setting animation-duration
         instead would make them jump, because the elapsed time would
         suddenly mean a different position in the loop.

         Collected lazily: at DOMContentLoaded the animations may not have
         started yet, and getAnimations() would come back empty. */
      let cloudAnims = null;
      function getCloudAnims() {
        if (cloudAnims) return cloudAnims;
        if (!mobSky || typeof mobSky.getAnimations !== 'function') return (cloudAnims = []);
        const found = [];
        mobSky.querySelectorAll('.sky-cloud').forEach((el) => {
          el.getAnimations().forEach((a) => found.push(a));
        });
        // don't cache an empty result — try again on the next frame
        if (found.length) cloudAnims = found;
        return found;
      }
      // Internal pages reuse this file but have no splash screen, so every
      // reference below has to tolerate the elements being absent.
      // `splash-seen` means the town screen has been hidden by CSS for this
      // visit. The elements are still in the DOM, so this has to be part of
      // the test — otherwise the scroll maths would run against a
      // zero-height container and the burger would be told to hide and
      // never told to come back.
      const splashSeen = document.documentElement.classList.contains('splash-seen');
      const hasSplash = !splashSeen &&
        !!(container && stickyWrapper && introTitle && mobBtmImage);

      // The burger is visible by default — that is the internal-page
      // behaviour, and it is also what happens if this script never runs.
      // Only a page WITH a splash starts it hidden, to be faded in as the
      // town clears, so the landing screen stays uninterrupted.
      if (burger && hasSplash) burger.classList.add('is-out');

      // --- THE MENU ---
      // One nav for both sizes. On desktop it is an ordinary list in the
      // rail and this code is inert: the burger is display:none, so it is
      // never clicked, and the class it toggles has no desktop styling.
      if (burger && siteNav) {
        const setNav = (open) => {
          document.body.classList.toggle('nav-open', open);
          burger.setAttribute('aria-expanded', open ? 'true' : 'false');
          document.body.style.overflow = open ? 'hidden' : '';
        };
        burger.addEventListener('click', () => {
          setNav(!document.body.classList.contains('nav-open'));
        });
        // Following a link closes it, which matters for the link to the
        // page you are already on — otherwise the overlay stays up.
        siteNav.addEventListener('click', (e) => {
          if (e.target.closest('a')) setNav(false);
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
            setNav(false);
          }
        });
      }

      function updateTitlePosition() {
        if (!hasSplash) return;
        const isDesktop = window.innerWidth >= 768;

        if (isDesktop) {
          introTitle.style.bottom = 'auto';
          introTitle.style.top = '50%';
          introTitle.style.transform = 'translate(-50%, -50%)';
        } else {
          const btmImgHeight = mobBtmImage.offsetHeight;
          introTitle.style.bottom = `${btmImgHeight}px`;
          introTitle.style.top = 'auto';
          introTitle.style.transform = 'none';
        }
      }
      updateTitlePosition();
      if (hasSplash) mobBtmImage.addEventListener('load', updateTitlePosition);
      // --- MAIN SCROLL ANIMATION LOOP ---
      function handleScrollAnimation() {
        // 1. INTRO TOWN SCROLL
        if (hasSplash) {
        const distanceScrolled = window.scrollY - container.offsetTop;
        const scrollableDistance = container.offsetHeight - window.innerHeight;
        let progress = distanceScrolled / scrollableDistance;
        progress = Math.max(0, Math.min(progress, 1));
        const titleOpacity = Math.max(0, 1 - (progress * 10));
        introTitle.style.opacity = titleOpacity;
        const minScale = 1;
        const maxScale = 2.5;
        const btmCurrentScale = minScale + (progress * (maxScale - minScale));
        // THE SKY — scroll drives the clouds' speed and the sky's scale.
        // Runs at both sizes: the sky is on desktop now too.
        if (mobSky) {
          if (SKY.rate !== 1) {
            const rate = 1 + (progress * (SKY.rate - 1));
            getCloudAnims().forEach((a) => { a.playbackRate = rate; });
          }
          // Custom properties, not inline styles. An inline `scale` would
          // outrank the desktop rule that switches the zoom off, and an
          // inline `opacity` on the band would rebuild the stacking
          // context that lets clouds sit above the town. The CSS decides
          // which of these two it actually uses at each size.
          if (SKY.zoom !== 1) {
            mobSky.style.setProperty(
              '--sky-zoom', (1 + (progress * (SKY.zoom - 1))).toFixed(4));
          }
          const fade = 1 - Math.max(0, Math.min(1,
            (progress - SKY_FADE_START) / (SKY_FADE_END - SKY_FADE_START)));
          mobSky.style.setProperty('--sky-fade', fade.toFixed(3));
        }
        // DESKTOP TOWN — sized for a 1920 x 543 artwork.
        // The old figures (1.45 -> 1.16, pan +/-8) were written for a 2.4:1
        // image that had to be blown up to cover the sticky screen. At 3.5:1
        // that same scale threw ~430px off each side, which is the cropping.
        // It now RESTS at 1.00 — the full width of the artwork, edge to edge,
        // nothing cut — and only zooms as you scroll away from it, so any
        // cropping happens while it is already fading.
        const deskPanStart = 0;
        const deskPanEnd = -2;
        const deskCurrentPan = deskPanStart + (progress * (deskPanEnd - deskPanStart));
        const deskScaleStart = 1.0;
        const deskScaleEnd = 1.12;
        const deskTopScale = deskScaleStart + (progress * (deskScaleEnd - deskScaleStart));
        let currentOpacity = 1;
        const fadeStart = 0.8;
        if (progress > fadeStart) {
            const fadeProgress = (progress - fadeStart) / (1 - fadeStart);
            currentOpacity = 1 - fadeProgress;
        }
        stickyWrapper.style.opacity = currentOpacity;
        // arrives with the same fade that takes the town away
        if (burger) burger.classList.toggle('is-out', progress < fadeStart);
        const isDesktop = window.innerWidth >= 768;
        if (isDesktop) {
          // deskTopImage is gone from index.html — the sky replaced it —
          // but the guard keeps this working if it is ever put back.
          if (deskTopImage) {
            deskTopImage.style.transform = `scale(${deskTopScale}) translateX(${deskCurrentPan}%)`;
          }
          deskBtmImage.style.transform = `scale(${btmCurrentScale})`;
        } else {
          mobBtmImage.style.transform = `scale(${btmCurrentScale})`;
        }
        }
        // 2. THE FOOTER PUSHES THE RAIL UP
        // The rail is lifted by exactly as many pixels as the footer has
        // climbed into the viewport, so the footer's top edge reads as a
        // physical shove rather than the rail simply vanishing under it.
        if (rail && footerEl) {
          if (!DESKTOP.matches) {
            rail.style.transform = '';
          } else {
            const intrusion = window.innerHeight - footerEl.getBoundingClientRect().top;
            const push = Math.max(0, Math.min(intrusion, window.innerHeight));
            rail.style.transform = `translateY(${-push.toFixed(1)}px)`;
          }
        }
      }
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            handleScrollAnimation();
            ticking = false;
          });
          ticking = true;
        }
      });
      window.addEventListener('resize', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateTitlePosition();
            handleScrollAnimation();
            ticking = false;
          });
          ticking = true;
        }
      });

      handleScrollAnimation();
      // --- STACKED IMAGE REVEAL LOGIC ---
      const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      }, { threshold: 0.15 });
      document.querySelectorAll('.stacked-img').forEach(img => {
        fadeObserver.observe(img);
      });
      // --- DRAGGABLE INTERACTIVE IMAGES LOGIC ---
      const draggables = document.querySelectorAll('.draggable-wrapper');
      // The flowers behind the copy. They are static, so the visitor can
      // never move them off the words the way they can the bird — the
      // first touch of the bird fades them out instead, and they stay out.
      const copyFloral = document.querySelector('.copy-floral');
      let isDragging = false;
      let currentDraggable = null;
      let startX, startY;
      let initialMouseX, initialMouseY;
      draggables.forEach(el => {
        const onDragStart = (e) => {
          if (e.type === 'mousedown' && e.button !== 0) return;

          isDragging = true;
          currentDraggable = el;

          // On mousedown / touchstart, not on the first move — a click
          // that never becomes a drag should still clear the flowers.
          if (copyFloral) copyFloral.classList.add('is-out');

          el.classList.add('is-dragging');
          const event = e.type.includes('mouse') ? e : e.touches[0];
          startX = event.clientX;
          startY = event.clientY;

          initialMouseX = startX;
          initialMouseY = startY;
          draggables.forEach(d => d.style.zIndex = 10);
          el.style.zIndex = 100;
        };
        el.addEventListener('mousedown', onDragStart);
        el.addEventListener('touchstart', onDragStart, { passive: false });
        el.addEventListener('click', (e) => {
          const dist = Math.abs(e.clientX - initialMouseX) + Math.abs(e.clientY - initialMouseY);
          if (dist > 5) {
            e.preventDefault();
          }
        });
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDragging || !currentDraggable) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const currentX = parseFloat(currentDraggable.getAttribute('data-x')) + dx;
        const currentY = parseFloat(currentDraggable.getAttribute('data-y')) + dy;
        currentDraggable.style.transform = `translate(${currentX}px, ${currentY}px)`;
        currentDraggable.setAttribute('data-x', currentX);
        currentDraggable.setAttribute('data-y', currentY);
        startX = e.clientX;
        startY = e.clientY;
      });
      document.addEventListener('touchmove', (e) => {
        if (!isDragging || !currentDraggable) return;
        e.preventDefault();

        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        const currentX = parseFloat(currentDraggable.getAttribute('data-x')) + dx;
        const currentY = parseFloat(currentDraggable.getAttribute('data-y')) + dy;
        currentDraggable.style.transform = `translate(${currentX}px, ${currentY}px)`;
        currentDraggable.setAttribute('data-x', currentX);
        currentDraggable.setAttribute('data-y', currentY);
        startX = touch.clientX;
        startY = touch.clientY;
      }, { passive: false });
      const onDragEnd = () => {
        if (currentDraggable) {
          currentDraggable.classList.remove('is-dragging');
        }
        isDragging = false;
        currentDraggable = null;
      };
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchend', onDragEnd);
    });
