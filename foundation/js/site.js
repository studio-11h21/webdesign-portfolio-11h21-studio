/* The Foundation — shared behaviour, linked by every page. */
document.addEventListener('DOMContentLoaded', () => {
      // --- ELEMENT REFERENCES ---
      const deskTopImage = document.getElementById('desk-top-image');
      const deskBtmImage = document.getElementById('desk-btm-image');
      const mobTopImage = document.getElementById('mob-top-image');
      const mobBtmImage = document.getElementById('mob-btm-image');

      const container = document.getElementById('scroll-container');
      const stickyWrapper = document.getElementById('sticky-wrapper');
      const introTitle = document.getElementById('intro-title');
      const hzSection = document.getElementById('hz-scroll-section');
      const hzContent = document.getElementById('hz-content');
      const rail = document.getElementById('rail');
      const footerEl = document.querySelector('.site-footer');
      const burger = document.getElementById('burger');
      const siteNav = document.getElementById('site-nav');

      // One breakpoint, shared by the layout above and the behaviour below.
      const DESKTOP = window.matchMedia('(min-width: 1024px)');
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
        const mobPanStart = -4;
        const mobPanEnd = 4;
        const mobCurrentPan = mobPanStart + (progress * (mobPanEnd - mobPanStart));
        const mobTopScale = 1.15;
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
          deskTopImage.style.transform = `scale(${deskTopScale}) translateX(${deskCurrentPan}%)`;
          deskBtmImage.style.transform = `scale(${btmCurrentScale})`;
        } else {
          mobTopImage.style.transform = `scale(${mobTopScale}) translateX(${mobCurrentPan}%)`;
          mobBtmImage.style.transform = `scale(${btmCurrentScale})`;
        }
        }
        // 2. HORIZONTAL SCROLL LOGIC
        // Desktop lays the four cards out side by side, so the scrub must not
        // run there — it would translate a grid that is already complete.
        if (hzSection && hzContent && !DESKTOP.matches) {
          const hzStart = hzSection.offsetTop;
          const hzScrollable = hzSection.offsetHeight - window.innerHeight;
          const hzDistance = window.scrollY - hzStart;

          let hzProgress = hzDistance / hzScrollable;
          hzProgress = Math.max(0, Math.min(hzProgress, 1));

          // was: ... + (window.innerWidth * 0.1)
          // The 10vw side padding is already inside scrollWidth, so that extra
          // term double-counted it and the row over-travelled — the last card
          // ended up short of the right edge with dead space beside it.
          const maxScrollX = hzContent.scrollWidth - window.innerWidth;
          hzContent.style.transform = `translateX(-${hzProgress * maxScrollX}px)`;
        } else if (hzContent) {
          hzContent.style.transform = '';
        }

        // 3. THE FOOTER PUSHES THE RAIL UP
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
      // The four menu cards get the same reveal. The CSS that makes them
      // start hidden only exists at 1024px and up, so this is inert on phones.
      document.querySelectorAll('.hz-item').forEach(item => {
        fadeObserver.observe(item);
      });
      // --- DRAGGABLE INTERACTIVE IMAGES LOGIC ---
      const draggables = document.querySelectorAll('.draggable-wrapper');
      let isDragging = false;
      let currentDraggable = null;
      let startX, startY;
      let initialMouseX, initialMouseY;
      draggables.forEach(el => {
        const onDragStart = (e) => {
          if (e.type === 'mousedown' && e.button !== 0) return;

          isDragging = true;
          currentDraggable = el;

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
