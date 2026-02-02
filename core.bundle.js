/* =========================================================
   CBW STABLE BUNDLE (Repo)
   - Put "rarely touched" logic here.
   - Barba-safe (hooks only if Barba exists).
   - Webflow-safe (works with Webflow re-init).
   - Do NOT include Barba init / Wipe here.
   - Swiper is allowed ONLY if it is for global UI (nav swiper, lightbox swiper).
   Code comments in English ✅
========================================================= */

(() => {
  // Prevent double-loading if Webflow injects scripts multiple times
  if (window.__CBW_STABLE_LOADED__ === true) return;
  window.__CBW_STABLE_LOADED__ = true;

  /* ---------------------------------------------------------
     Small helpers
  --------------------------------------------------------- */
  function qs(sel, root = document) { return root.querySelector(sel); }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function safeTry(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  /* =========================================================
     1) TOUR DROPDOWN + CURRENT STOP HIGHLIGHT (Barba-safe)
  ========================================================= */
  function initTourDropdown(root = document) {
    const dd = root.querySelector(".tour_dd");
    if (!dd) return;

    const btn = dd.querySelector(".tour_dd-toggle");
    const panel = dd.querySelector(".tour_dd-panel");
    if (!btn || !panel) return;

    if (dd.dataset.bound === "1") return;
    dd.dataset.bound = "1";

    if (!panel.id) panel.id = "tour-dd-panel-" + Math.random().toString(16).slice(2);
    btn.setAttribute("aria-controls", panel.id);
    btn.setAttribute("aria-expanded", "false");

    const open = () => {
      dd.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    };

    const close = () => {
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    };

    const toggle = () => (dd.classList.contains("is-open") ? close() : open());

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    document.addEventListener("click", (e) => {
      if (!dd.classList.contains("is-open")) return;
      if (dd.contains(e.target)) return;
      close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    panel.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      close();
    });

    dd.__open = open;
    dd.__close = close;
  }

  function closeAllTourDropdowns() {
    document.querySelectorAll(".tour_dd").forEach(dd => {
      dd.classList.remove("is-open");
      const btn = dd.querySelector(".tour_dd-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function normalizePath(urlOrPath) {
    try {
      const u = new URL(urlOrPath, window.location.origin);
      let p = u.pathname || "/";
      if (p.length > 1) p = p.replace(/\/+$/, "");
      return p;
    } catch {
      let p = urlOrPath || "/";
      if (p.length > 1) p = p.replace(/\/+$/, "");
      return p;
    }
  }

  function markCurrentTourStop(root = document) {
    const currentPath = normalizePath(window.location.href);

    root.querySelectorAll(".tour-stop-link").forEach(a => {
      const linkPath = normalizePath(a.href);
      const isCurrent = linkPath === currentPath;

      a.classList.toggle("is-current", isCurrent);

      if (isCurrent) {
        a.setAttribute("aria-current", "page");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("tabindex", "-1");
      } else {
        a.removeAttribute("aria-current");
        a.removeAttribute("aria-disabled");
        a.removeAttribute("tabindex");
      }
    });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest(".tour-stop-link");
    if (!a) return;

    const currentPath = normalizePath(window.location.href);
    const linkPath = normalizePath(a.href);

    if (linkPath === currentPath) {
      e.preventDefault();
      e.stopPropagation();
      closeAllTourDropdowns();
    }
  }, true);

  /* =========================================================
     2) PERSISTENT AUDIO + LOTTIE SYNC (Barba-safe)
  ========================================================= */
  function initPersistentAudio() {
    const audio = document.getElementById("bg-audio");
    if (!audio) return;

    const STORAGE_KEY = "bg-audio-playing";
    const TARGET_VOL = 0.6;

    function fadeVolume(el, to, ms) {
      const from = el.volume;
      const steps = 30;
      let i = 0;
      const tick = ms / steps;

      const iv = setInterval(() => {
        i++;
        el.volume = from + (to - from) * (i / steps);
        if (i >= steps) clearInterval(iv);
      }, tick);
    }

    function getLottieInstance() {
      return safeTry(() => {
        const wf = window.Webflow?.require?.("lottie");
        if (!wf?.lottie) return null;

        const el = document.getElementById("audioLottie");
        if (!el) return null;

        const regs = wf.lottie.getRegisteredAnimations?.() || [];
        return regs.find(a => a.wrapper === el) || null;
      });
    }

    function setLottieOpacity(on) {
      const el = document.getElementById("audioLottie");
      if (!el) return;

      const to = on ? 1 : 0.35;
      const ms = 250;

      if (window.gsap) {
        gsap.to(el, { opacity: to, duration: ms / 1000, overwrite: true, ease: "power2.out" });
      } else {
        el.style.transition = `opacity ${ms}ms ease`;
        el.style.opacity = String(to);
      }
    }

    function lottieOff() {
      const inst = getLottieInstance();
      if (!inst) return;
      inst.loop = false;
      inst.stop();
      inst.goToAndStop(0, true);
      setLottieOpacity(false);
    }

    function lottieOnLoop() {
      const inst = getLottieInstance();
      if (!inst) return;
      inst.loop = true;
      inst.play();
      setLottieOpacity(true);
    }

    function syncLottie() {
      if (audio.paused) lottieOff();
      else lottieOnLoop();
    }

    // Restore state
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      audio.volume = 0;
      audio.play().catch(() => {});
      fadeVolume(audio, TARGET_VOL, 900);
    }

    setTimeout(syncLottie, 400);

    function toggleAudio() {
      if (audio.paused) {
        audio.volume = 0;
        audio.play().catch(() => {});
        fadeVolume(audio, TARGET_VOL, 900);
        localStorage.setItem(STORAGE_KEY, "true");
        lottieOnLoop();
      } else {
        fadeVolume(audio, 0, 600);
        setTimeout(() => audio.pause(), 650);
        localStorage.setItem(STORAGE_KEY, "false");
        lottieOff();
      }
    }

    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".audio-toggle");
      if (!btn) return;
      e.preventDefault();
      toggleAudio();
    });

    if (window.barba) {
      barba.hooks.after(() => setTimeout(syncLottie, 350));
    }
  }

  /* =========================================================
     6) DISABLE CURRENT FOOTER LINKS (Barba-safe)
  ========================================================= */
  function initDisableCurrentFooterLinks() {
    const NAV_SELECTOR = ".footer_link";

    function normalize(url) {
      const u = new URL(url, location.origin);
      let p = u.pathname.replace(/\/+$/, "") || "/";
      return p + u.search;
    }

    function disableCurrentNavLinks(scope = document) {
      const current = normalize(location.href);

      scope.querySelectorAll(NAV_SELECTOR).forEach(a => {
        if (a.classList.contains("w-lightbox") || a.closest(".w-lightbox")) return;

        const link = normalize(a.href);
        const isCurrent = link === current;

        a.classList.toggle("is-current", isCurrent);

        if (isCurrent) {
          a.setAttribute("aria-current", "page");
          a.setAttribute("aria-disabled", "true");
          a.setAttribute("tabindex", "-1");
          a.style.pointerEvents = "none";
          a.style.cursor = "default";
        } else {
          a.removeAttribute("aria-current");
          a.removeAttribute("aria-disabled");
          a.removeAttribute("tabindex");
          a.style.pointerEvents = "";
          a.style.cursor = "";
        }
      });
    }

    onReady(() => disableCurrentNavLinks(document));

    if (window.barba) {
      barba.hooks.afterEnter(({ next }) => {
        disableCurrentNavLinks(next?.container || document);
        disableCurrentNavLinks(document);
      });
    }
  }

  /* =========================================================
     BOOT
  ========================================================= */
  onReady(() => {
    initTourDropdown(document);
    markCurrentTourStop(document);

    initPersistentAudio();
    initDisableCurrentFooterLinks();

    if (window.barba) {
      barba.hooks.beforeLeave(() => closeAllTourDropdowns());
      barba.hooks.afterEnter(({ next }) => {
        const container = next?.container || document;
        initTourDropdown(container);
        markCurrentTourStop(document);
        markCurrentTourStop(container);
        closeAllTourDropdowns();
      });
    }
  });
})();

/* =========================================================
   NAV + TOURS SWIPER (Barba-safe)
   Code comments in English ✅
========================================================= */
(() => {
  if (window.__NAV_PUSH_AND_SWIPER_INIT__) return;
  window.__NAV_PUSH_AND_SWIPER_INIT__ = true;

  const SELECTORS = {
    navBtn: ".main-hb-menu",
    pageWrap: "#page-wrap",
    navPanel: ".nav-panel",
    backdrop: ".nav-backdrop",
    toursSwiperRoot: ".nav-tours-wrapper.swiper",
    iconOpen: ".nav-toggle-icon.is-open",
    iconClose: ".nav-toggle-icon.is-close"
  };

  const navBtn = document.querySelector(SELECTORS.navBtn);
  const pageWrap = document.querySelector(SELECTORS.pageWrap);
  const navPanel = document.querySelector(SELECTORS.navPanel);
  const backdrop = document.querySelector(SELECTORS.backdrop);

  if (!navBtn || !pageWrap || !navPanel || !backdrop) return;
  if (!window.gsap) return;

  const iconOpen = navBtn.querySelector(SELECTORS.iconOpen);
  const iconClose = navBtn.querySelector(SELECTORS.iconClose);

  if (iconOpen && iconClose) {
    gsap.set(iconOpen, { y: "0rem" });
    gsap.set(iconClose, { y: "3rem" });
  }

  gsap.set(backdrop, { opacity: 0, pointerEvents: "none" });
  gsap.set(navPanel, { pointerEvents: "none" });

  let savedScrollY = 0;

  function lockScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, savedScrollY);
  }

  let navToursSwiper = null;

  function getSitePaddingPx() {
    const test = document.createElement("div");
    test.style.position = "absolute";
    test.style.left = "-9999px";
    test.style.top = "-9999px";
    test.style.width = "calc(var(--_site-settings---site-padding))";
    document.body.appendChild(test);
    const px = test.getBoundingClientRect().width;
    test.remove();
    return Number.isFinite(px) ? px : 0;
  }

  function ensureNavToursEndSpacer(sw) {
    if (!sw || !sw.el) return;
    const root = sw.el;
    const wrapper = root.querySelector(".swiper-wrapper");
    if (!wrapper) return;

    const prevSpacer = wrapper.querySelector(".nav-tour-spacer");
    if (prevSpacer) prevSpacer.remove();

    const realSlides = Array.from(wrapper.children).filter(
      (el) => el.classList && el.classList.contains("swiper-slide") && !el.classList.contains("nav-tour-spacer")
    );
    const lastSlide = realSlides[realSlides.length - 1];
    if (!lastSlide) return;

    const offsetBefore = sw.params.slidesOffsetBefore || 0;
    const viewportW = root.getBoundingClientRect().width;
    const lastW = lastSlide.getBoundingClientRect().width;
    const needed = Math.max(viewportW - lastW - offsetBefore, 0);

    const spacer = document.createElement("div");
    spacer.className = "swiper-slide nav-tour-spacer";
    spacer.style.width = `${needed}px`;
    spacer.style.flex = "0 0 auto";
    spacer.style.pointerEvents = "none";
    spacer.style.opacity = "0";

    wrapper.appendChild(spacer);
  }

  function computeLastRealIndex(sw) {
    return Math.max((sw?.slides?.length || 0) - 2, 0);
  }

  function applyEndHardStop(sw) {
    const lastReal = computeLastRealIndex(sw);
    sw.__lastRealIndex = lastReal;
    sw.allowSlideNext = sw.activeIndex < lastReal;
  }

  function initNavToursSwiper(scope = document) {
    if (!window.Swiper) return;

    const root = scope.querySelector(SELECTORS.toursSwiperRoot);
    if (!root) return;

    if (navToursSwiper && typeof navToursSwiper.destroy === "function") {
      navToursSwiper.destroy(true, true);
      navToursSwiper = null;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    navToursSwiper = new Swiper(root, {
      freeMode: false,
      slidesPerView: "auto",
      slidesPerGroup: 1,
      centeredSlides: false,

      slidesOffsetBefore: getSitePaddingPx(),
      slidesOffsetAfter: 0,

      spaceBetween: 18,
      speed: reduceMotion ? 0 : 650,
      grabCursor: true,
      watchOverflow: true,

      observer: true,
      observeParents: true,

      keyboard: { enabled: true, onlyInViewport: true, pageUpDown: false },
      mousewheel: { forceToAxis: true, sensitivity: 1 },

      on: {
        init(sw) {
          ensureNavToursEndSpacer(sw);
          sw.update();
          applyEndHardStop(sw);
        },
        resize(sw) {
          ensureNavToursEndSpacer(sw);
          sw.update();
          applyEndHardStop(sw);
        },
        slideChange(sw) {
          const spacerIndex = sw.slides.length - 1;
          const lastReal = computeLastRealIndex(sw);

          if (sw.activeIndex === spacerIndex) sw.slideTo(lastReal, 0);
          applyEndHardStop(sw);
        }
      }
    });

    window.navToursSwiper = navToursSwiper;
  }

  function updateNavToursSwiper() {
    const sw = window.navToursSwiper;
    if (!sw) return;

    sw.params.slidesOffsetBefore = getSitePaddingPx();
    ensureNavToursEndSpacer(sw);

    sw.update();
    sw.updateSlides();
    sw.updateProgress();
    sw.updateSlidesClasses();

    applyEndHardStop(sw);
  }

  let isOpen = false;

  const navTL = gsap.timeline({
    paused: true,
    defaults: { ease: "power3.inOut", duration: 1.2 }
  });

  navTL
    .to(pageWrap, {
      x: () => {
        const navWidth = navPanel.getBoundingClientRect().width;
        return -navWidth;
      }
    }, 0)
    .to(pageWrap, { opacity: 0.6, filter: "blur(6px)" }, 0)
    .to(backdrop, { opacity: 1, duration: 0.35 }, 0)
    .to(navPanel, { x: "0%", opacity: 1 }, 0);

  if (iconOpen && iconClose) {
    navTL.to(iconOpen, { y: "-3rem", duration: 0.6, ease: "power2.inOut" }, 0);
    navTL.to(iconClose, { y: "0rem",  duration: 0.6, ease: "power2.inOut" }, 0);
  }

  navTL.eventCallback("onReverseComplete", () => {
    unlockScroll();
    if (iconOpen && iconClose) {
      gsap.set(iconOpen, { y: "0rem" });
      gsap.set(iconClose, { y: "3rem" });
    }
  });

  function openNav() {
    if (isOpen) return;
    isOpen = true;

    gsap.set(backdrop, { pointerEvents: "auto" });
    gsap.set(navPanel, { pointerEvents: "auto" });

    lockScroll();
    navTL.play(0);

    setTimeout(() => {
      updateNavToursSwiper();
      const sw = window.navToursSwiper;
      if (sw && typeof sw.slideTo === "function") {
        sw.slideTo(0, 0);
        sw.update();
      }
    }, 150);
  }

  function closeNav() {
    if (!isOpen && navTL.progress() === 0) return;
    isOpen = false;

    gsap.set(backdrop, { pointerEvents: "none" });
    gsap.set(navPanel, { pointerEvents: "none" });

    navTL.reverse();
    try { window.ScrollTrigger?.refresh?.(); } catch (e) {}
  }

  function toggleNav() {
    if (isOpen) closeNav();
    else openNav();
  }

  navBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleNav();
  });

  backdrop.addEventListener("click", () => closeNav());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });

  function isHomeRoute() {
    const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    return path === "/";
  }

  document.addEventListener("click", (e) => {
    const homeLink = e.target.closest("a.nav-home-link");
    if (!homeLink) return;
    if (!isHomeRoute()) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    closeNav();

    const isHomeSlider = document.documentElement.classList.contains("is-home-slider");
    if (isHomeSlider && typeof window.homePanelsGoToIntro === "function") {
      window.homePanelsGoToIntro();
    }
  }, true);

  navPanel.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    closeNav();
  });

  window.addEventListener("resize", () => {
    if (!isOpen) return;
    gsap.set(pageWrap, { x: -navPanel.getBoundingClientRect().width });
    updateNavToursSwiper();
  });

  document.addEventListener("DOMContentLoaded", () => {
    initNavToursSwiper(document);
  });

  if (window.barba?.hooks) {
    window.barba.hooks.afterEnter((data) => {
      initNavToursSwiper(data?.next?.container || document);
    });

    window.barba.hooks.beforeLeave(() => {
      closeNav();
    });
  }
})();

/* =========================================================
  MEDIA MODULE (Barba-safe) — CLEAN + UPDATED
  - Images + YouTube videos in same lightbox
  - Video contract: .js-pswp[data-video="FULL_YOUTUBE_URL"]
  - Thumbnail contract: inside .js-pswp there is .js-visual (img or bg)
  - YouTube autoplay OFF
  Code comments in English ✅
========================================================= */
(() => {
  if (window.__MEDIA_MODULE__) return;
  window.__MEDIA_MODULE__ = true;

  const NS = "media";

  const state = {
    container: null,
    onDocClick: null,
    mainSwiper: null,
    thumbsSwiper: null
  };

  const TRIGGER_SELECTOR = ".js-pswp";
  const VISUAL_SELECTOR  = ".js-visual";

  /* -----------------------------
     Helpers
  ----------------------------- */
  function getContainer() {
    return state.container || document.querySelector('[data-barba="container"]');
  }

  function isInMedia() {
    const c = getContainer();
    const ns = (c?.getAttribute("data-barba-namespace") || "").trim();
    return ns === NS;
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* =========================================================
     Finsweet v2 restart (optional, safe)
  ========================================================= */
  async function restartFsList(timeoutMs = 6000) {
    const t0 = performance.now();

    while (performance.now() - t0 < timeoutMs) {
      if (window.FinsweetAttributes) break;
      await delay(50);
    }

    const FA = window.FinsweetAttributes;
    if (!FA?.modules?.list?.restart) return false;

    try {
      await FA.modules.list.restart();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* =========================================================
     Lightbox modal
  ========================================================= */
  function ensureModalStylesOnce() {
    if (document.getElementById("mglb-styles")) return;

    const style = document.createElement("style");
    style.id = "mglb-styles";
    style.textContent = `
#mglb.mglb{
  position: fixed; inset: 0; z-index: 9999;
  opacity: 0; pointer-events: none; visibility: hidden;
  transition: opacity .18s ease, visibility 0s linear .18s;
}
#mglb.mglb.is-open{
  opacity: 1; pointer-events: auto; visibility: visible;
  transition: opacity .18s ease;
}
#mglb.mglb > .mglb__backdrop{
  position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 0;
}
#mglb.mglb > .mglb__panel{
  position: fixed; inset: 0; z-index: 1;
  width: 100%; height: 100%;
  padding: 28px; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 14px;
}
@media (max-width: 767px){
  #mglb.mglb > .mglb__panel{ padding: 16px; }
}
#mglb .mglb__main{ width:100%; flex:1; min-height:0; display:flex; align-items:center; justify-content:center; }
#mglb .mglb__main .swiper-wrapper{ align-items:center; }
#mglb .mglb__main .swiper-slide{ display:flex; align-items:center; justify-content:center; width:100%; height:100%; }

#mglb .mglb__video{
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0,0,0,.35);
}
#mglb .mglb__video iframe{
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

#mglb .mglb__main img{
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

#mglb .mglb__thumbs{ width:100%; padding:0 0 4px; }
#mglb .mglb__thumbs .swiper-slide{ width:84px; height:58px; opacity:.45; transition: opacity .18s ease; }
#mglb .mglb__thumbs .swiper-slide-thumb-active{ opacity:1; }

#mglb button[data-mglb-close],
#mglb .mglb__prev,
#mglb .mglb__next{
  width: 44px; height: 44px; border-radius: 999px;
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.22);
  color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(6px);
}
#mglb button[data-mglb-close]{ position:absolute; top:22px; right:22px; z-index:10; }
#mglb .mglb__prev{ position:absolute; left:22px; top:50%; transform:translateY(-50%); z-index:10; }
#mglb .mglb__next{ position:absolute; right:22px; top:50%; transform:translateY(-50%); z-index:10; }
@media (max-width: 767px){
  #mglb button[data-mglb-close]{ top:14px; right:14px; }
  #mglb .mglb__prev{ left:14px; }
  #mglb .mglb__next{ right:14px; }
}
html.mglb-lock, body.mglb-lock { overflow: hidden !important; }
`;
    document.head.appendChild(style);
  }

  function ensureModalExists() {
    ensureModalStylesOnce();

    let modal = document.getElementById("mglb");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "mglb";
    modal.className = "mglb";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
      <div class="mglb__backdrop" data-mglb-backdrop></div>
      <div class="mglb__panel">
        <button type="button" data-mglb-close aria-label="Close">✕</button>

        <div class="mglb__main swiper">
          <div class="swiper-wrapper" id="mglbMainWrapper"></div>
        </div>

        <div class="mglb__thumbs swiper">
          <div class="swiper-wrapper" id="mglbThumbsWrapper"></div>
        </div>

        <button type="button" class="mglb__prev" aria-label="Previous">‹</button>
        <button type="button" class="mglb__next" aria-label="Next">›</button>
      </div>
    `;

    document.body.appendChild(modal);

    if (!modal.__mglbBound) {
      modal.__mglbBound = true;

      modal.addEventListener("click", (e) => {
        const closeBtn = e.target?.closest?.("[data-mglb-close]");
        const backdrop = e.target?.closest?.("[data-mglb-backdrop]");
        if (closeBtn || backdrop) closeModal();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
      });
    }

    return modal;
  }

  function getModalRefs() {
    const modal = ensureModalExists();
    return {
      modal,
      mainRoot: modal.querySelector(".mglb__main.swiper"),
      thumbsRoot: modal.querySelector(".mglb__thumbs.swiper"),
      mainW: modal.querySelector("#mglbMainWrapper"),
      thumbsW: modal.querySelector("#mglbThumbsWrapper"),
      nextEl: modal.querySelector(".mglb__next"),
      prevEl: modal.querySelector(".mglb__prev")
    };
  }

  function destroySwipers() {
    try { state.mainSwiper?.destroy?.(true, true); } catch (e) {}
    try { state.thumbsSwiper?.destroy?.(true, true); } catch (e) {}
    state.mainSwiper = null;
    state.thumbsSwiper = null;
  }

  function clearWrappers() {
    const { mainW, thumbsW } = getModalRefs();
    if (mainW) mainW.innerHTML = "";
    if (thumbsW) thumbsW.innerHTML = "";
  }

  function openModal() {
    const { modal } = getModalRefs();
    modal.style.pointerEvents = "auto";
    modal.style.visibility = "visible";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("mglb-lock");
    document.body.classList.add("mglb-lock");
  }

  function closeModal() {
    const modal = document.getElementById("mglb");
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    document.documentElement.classList.remove("mglb-lock");
    document.body.classList.remove("mglb-lock");

    destroySwipers();
    clearWrappers();

    modal.style.pointerEvents = "none";
    window.clearTimeout(modal.__hideT);
    modal.__hideT = window.setTimeout(() => {
      modal.style.visibility = "hidden";
    }, 200);
  }

  /* =========================================================
     Media item parsing (ROBUST)
  ========================================================= */
  function extractBgUrl(el) {
    if (!el) return null;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") return null;
    const match = bg.match(/url\(["']?(.*?)["']?\)/);
    return match && match[1] ? match[1] : null;
  }

  function getThumbSrcFromTrigger(trigger) {
    if (!trigger) return null;

    const dataThumb =
      trigger.getAttribute("data-thumb") ||
      trigger.querySelector?.("[data-thumb]")?.getAttribute?.("data-thumb");
    if (dataThumb) return dataThumb;

    const visual = trigger.querySelector(VISUAL_SELECTOR);
    if (visual) {
      const tag = (visual.tagName || "").toLowerCase();

      if (tag === "img") return visual.currentSrc || visual.src || null;

      const innerImg = visual.querySelector?.("img");
      if (innerImg) return innerImg.currentSrc || innerImg.src || null;

      const bgUrl = extractBgUrl(visual);
      if (bgUrl) return bgUrl;
    }

    const img = trigger.querySelector("img");
    if (img) return img.currentSrc || img.src || null;

    const bgTrigger = extractBgUrl(trigger);
    if (bgTrigger) return bgTrigger;

    return null;
  }

  function getImageSrcFromTrigger(trigger) {
    // In your setup, the full image is the same as the thumbnail.
    const src =
      trigger.getAttribute("data-full") ||
      trigger.querySelector?.("[data-full]")?.getAttribute?.("data-full") ||
      getThumbSrcFromTrigger(trigger);

    return src || null;
  }

  function parseYouTubeId(url) {
    if (!url) return null;

    try {
      const u = new URL(url, window.location.origin);
      const host = (u.hostname || "").toLowerCase();

      if (host.includes("youtu.be")) {
        const id = (u.pathname || "").split("/").filter(Boolean)[0];
        return id || null;
      }

      const v = u.searchParams.get("v");
      if (v) return v;

      const parts = (u.pathname || "").split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];

      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];

      return null;
    } catch (e) {
      const s = String(url);
      const m =
        s.match(/[?&]v=([^&]+)/) ||
        s.match(/youtu\.be\/([^?&/]+)/) ||
        s.match(/\/embed\/([^?&/]+)/) ||
        s.match(/\/shorts\/([^?&/]+)/);

      return m ? m[1] : null;
    }
  }

  function getVideoItemFromTrigger(trigger) {
    // Your contract: data-video contains FULL YouTube URL from CMS
    const url = (trigger.getAttribute("data-video") || "").trim();
    if (!url) return null;

    const id = parseYouTubeId(url);
    if (!id) return null;

    const thumb =
      trigger.getAttribute("data-thumb") ||
      getThumbSrcFromTrigger(trigger) ||
      `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

    return { type: "youtube", id, thumb };
  }

  function getScopeRoot(clickedTrigger) {
    return (
      clickedTrigger.closest(".w-dyn-list") ||
      clickedTrigger.closest(".w-dyn-items") ||
      getContainer() ||
      document
    );
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function buildScopedGallery(clickedTrigger) {
    const scopeRoot = getScopeRoot(clickedTrigger);
    const triggers = Array.from(scopeRoot.querySelectorAll(TRIGGER_SELECTOR)).filter(isVisible);

    const items = [];
    let startIndex = 0;

    triggers.forEach((t) => {
      const videoItem = getVideoItemFromTrigger(t);
      if (videoItem) {
        if (t === clickedTrigger) startIndex = items.length;
        items.push(videoItem);
        return;
      }

      const src = getImageSrcFromTrigger(t);
      if (!src) return;

      const thumb = getThumbSrcFromTrigger(t) || src;
      if (t === clickedTrigger) startIndex = items.length;

      items.push({ type: "image", src, thumb });
    });

    return { items, startIndex };
  }

  function mountSlides(items) {
    const { mainW, thumbsW } = getModalRefs();
    if (!mainW || !thumbsW) return;

    mainW.innerHTML = "";
    thumbsW.innerHTML = "";

    items.forEach((it) => {
      const s = document.createElement("div");
      s.className = "swiper-slide";

      if (it.type === "youtube") {
        const src =
          `https://www.youtube-nocookie.com/embed/${encodeURIComponent(it.id)}` +
          `?autoplay=0&mute=0&controls=1&modestbranding=1&playsinline=1&rel=0`;

        s.innerHTML = `
          <div class="mglb__video">
            <iframe
              src="${src}"
              title="YouTube video"
              allow="encrypted-media; picture-in-picture"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen></iframe>
          </div>
        `;
      } else {
        s.innerHTML = `<img src="${it.src}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;display:block;">`;
      }

      mainW.appendChild(s);
    });

    items.forEach((it) => {
      const s = document.createElement("div");
      s.className = "swiper-slide";

      const thumbSrc = it.thumb || (it.type === "youtube"
        ? `https://i.ytimg.com/vi/${encodeURIComponent(it.id)}/hqdefault.jpg`
        : it.src);

      s.innerHTML = `
        <div style="position:relative;width:100%;height:100%;">
          <img src="${thumbSrc}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
        </div>
      `;
      thumbsW.appendChild(s);
    });
  }

  function setActiveThumb(idx) {
    if (!state.thumbsSwiper) return;
    try {
      state.thumbsSwiper.slides.forEach((sl) => sl.classList.remove("swiper-slide-thumb-active"));
      const active = state.thumbsSwiper.slides[idx];
      if (active) active.classList.add("swiper-slide-thumb-active");
      state.thumbsSwiper.slideTo(idx, 0);
      state.thumbsSwiper.update();
    } catch (e) {}
  }

  function initSwipers(startIndex) {
    if (!window.Swiper) {
      console.warn("[MGLB] Swiper is not loaded.");
      return;
    }

    const { mainRoot, thumbsRoot, nextEl, prevEl } = getModalRefs();
    if (!mainRoot || !thumbsRoot) return;

    destroySwipers();

    state.thumbsSwiper = new Swiper(thumbsRoot, {
      slidesPerView: "auto",
      spaceBetween: 8,
      watchSlidesProgress: true,
      grabCursor: true,
      observer: true,
      observeParents: true
    });

    state.mainSwiper = new Swiper(mainRoot, {
      initialSlide: startIndex,
      navigation: (nextEl && prevEl) ? { nextEl, prevEl } : undefined,
      observer: true,
      observeParents: true
    });

    state.thumbsSwiper.on("click", () => {
      const idx = state.thumbsSwiper.clickedIndex;
      if (typeof idx !== "number" || idx < 0) return;
      state.mainSwiper?.slideTo?.(idx);
    });

    state.mainSwiper.on("slideChange", () => {
      setActiveThumb(state.mainSwiper.activeIndex);
    });

    state.mainSwiper.slideTo(startIndex, 0);
    state.thumbsSwiper.slideTo(startIndex, 0);
    setActiveThumb(startIndex);

    setTimeout(() => {
      try { state.mainSwiper?.update?.(); } catch (e) {}
      try { state.thumbsSwiper?.update?.(); } catch (e) {}
      setActiveThumb(state.mainSwiper?.activeIndex ?? startIndex);
    }, 60);
  }

  /* =========================================================
     Media Boot / Destroy
  ========================================================= */
  async function MediaBoot(container) {
    state.container = container || getContainer();
    if (!isInMedia()) return;

    // Restart fs-list after Barba enter (best effort)
    await restartFsList().catch(() => {});

    // Optional: your inline filter helper (Webflow)
    if (typeof window.MediaAutoRecoverBoot === "function") {
      try { window.MediaAutoRecoverBoot(state.container || document); } catch (e) {}
    }

    if (!state.onDocClick) {
      state.onDocClick = (e) => {
        if (!isInMedia()) return;

        const modal = document.getElementById("mglb");
        if (modal && modal.classList.contains("is-open")) return;

        const trigger = e.target?.closest?.(TRIGGER_SELECTOR);
        if (!trigger) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        const { items, startIndex } = buildScopedGallery(trigger);
        if (!items || !items.length) {
          console.warn("[MGLB] No items found. Ensure .js-visual has an image/bg or .js-pswp has data-video URL.");
          return;
        }

        openModal();
        mountSlides(items);
        setTimeout(() => initSwipers(startIndex), 50);
      };

      document.addEventListener("click", state.onDocClick, true);
    }

    console.log("[Media] boot ✅");
  }

  function MediaDestroy() {
    if (typeof window.MediaAutoRecoverDestroy === "function") {
      try { window.MediaAutoRecoverDestroy(); } catch (e) {}
    }

    try { closeModal(); } catch (e) {}
    try { destroySwipers(); } catch (e) {}

    if (state.onDocClick) {
      try { document.removeEventListener("click", state.onDocClick, true); } catch (e) {}
      state.onDocClick = null;
    }

    state.container = null;
    console.log("[Media] destroy ✅");
  }

  window.MediaBoot = MediaBoot;
  window.MediaDestroy = MediaDestroy;
})();
