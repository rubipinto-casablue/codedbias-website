/* =========================================================
   CBW STABLE BUNDLE (Repo)
   - Put "rarely touched" logic here.
   - Barba-safe (hooks only if Barba exists).
   - Webflow-safe (works with Webflow re-init).
   - Do NOT include Barba init / Wipe (those stay in Webflow).
   Code comments in English ✅
========================================================= */

(() => {
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

  function isMobile() {
    return window.matchMedia("(max-width: 991px)").matches;
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

    // Delegate click (works across Barba containers)
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
     3) DISABLE CURRENT FOOTER LINKS (Barba-safe)
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
     4) NAV PUSH + TOURS SWIPER (Barba-safe)
     - Requires Swiper + GSAP loaded in Webflow
  ========================================================= */
  function initNavPushAndToursSwiper() {
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
        (el) =>
          el.classList &&
          el.classList.contains("swiper-slide") &&
          !el.classList.contains("nav-tour-spacer")
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

            if (sw.activeIndex === spacerIndex) {
              sw.slideTo(lastReal, 0);
            }
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
      safeTry(() => window.ScrollTrigger?.refresh?.());
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

    onReady(() => initNavToursSwiper(document));

    if (window.barba?.hooks) {
      window.barba.hooks.afterEnter((data) => {
        initNavToursSwiper(data?.next?.container || document);
      });

      window.barba.hooks.beforeLeave(() => {
        closeNav();
      });
    }
  }

  /* =========================================================
     5) MEDIA: LIGHTBOX (Images + YouTube) — NO AUTOPLAY
     - Trigger: .js-pswp
     - Thumb visual: .js-visual (img or bg)
     - Video marker: data-video="<youtube url>" on the .js-pswp
     Code comments in English ✅
  ========================================================= */
  (() => {
    if (window.__MEDIA_LIGHTBOX_BUNDLE__) return;
    window.__MEDIA_LIGHTBOX_BUNDLE__ = true;

    const NS = "media";

    const state = {
      container: null,
      onDocClick: null,
      mainSwiper: null,
      thumbsSwiper: null
    };

    const TRIGGER_SELECTOR = ".js-pswp";
    const VISUAL_SELECTOR  = ".js-visual";

    function getContainer() {
      return state.container || document.querySelector('[data-barba="container"]');
    }

    function isInMedia() {
      const c = getContainer();
      const ns = (c?.getAttribute("data-barba-namespace") || "").trim();
      return ns === NS;
    }

    function extractBgUrl(el) {
      if (!el) return null;
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none") return null;
      const match = bg.match(/url\(["']?(.*?)["']?\)/);
      return match && match[1] ? match[1] : null;
    }

    function getThumbSrcFromTrigger(trigger) {
      if (!trigger) return null;

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

    function parseYouTubeId(url) {
      if (!url) return null;
      try {
        const u = new URL(url);
        const host = (u.hostname || "").replace(/^www\./, "");
        if (host === "youtu.be") return (u.pathname || "").replace("/", "") || null;
        if (host.includes("youtube.com")) {
          const v = u.searchParams.get("v");
          if (v) return v;
          const m1 = (u.pathname || "").match(/\/embed\/([a-zA-Z0-9_-]+)/);
          if (m1 && m1[1]) return m1[1];
          const m2 = (u.pathname || "").match(/\/shorts\/([a-zA-Z0-9_-]+)/);
          if (m2 && m2[1]) return m2[1];
        }
      } catch (e) {}
      return null;
    }

    function getVideoItemFromTrigger(trigger) {
      // Your CMS puts the full youtube URL in data-video
      const url = (trigger.getAttribute("data-video") || "").trim();
      if (!url) return null;

      const id = parseYouTubeId(url);
      if (!id) return null;

      const thumb =
        trigger.getAttribute("data-thumb") ||
        getThumbSrcFromTrigger(trigger) ||
        `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

      return { kind: "youtube", id, thumb };
    }

    function getImageItemFromTrigger(trigger) {
      const src = getThumbSrcFromTrigger(trigger);
      if (!src) return null;
      return { kind: "image", src, thumb: src };
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
        const v = getVideoItemFromTrigger(t);
        const img = getImageItemFromTrigger(t);

        const item = v || img;
        if (!item) return;

        if (t === clickedTrigger) startIndex = items.length;
        items.push(item);
      });

      return { items, startIndex };
    }

    function ensureModalStylesOnce() {
      if (document.getElementById("mglb-styles")) return;

      const style = document.createElement("style");
      style.id = "mglb-styles";
      style.textContent = `
#mglb.mglb{
  position: fixed;
  inset: 0;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition: opacity .18s ease, visibility 0s linear .18s;
}
#mglb.mglb.is-open{
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  transition: opacity .18s ease;
}
#mglb.mglb > .mglb__backdrop{
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,.72);
  z-index: 0;
}
#mglb.mglb > .mglb__panel{
  position: fixed;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 28px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
@media (max-width: 767px){
  #mglb.mglb > .mglb__panel{ padding: 16px; }
}
#mglb .mglb__main{
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
#mglb .mglb__main .swiper-wrapper{ align-items: center; }
#mglb .mglb__main .swiper-slide{ display:flex; align-items:center; justify-content:center; }
#mglb .mglb__main img{
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
#mglb .mglb__main iframe{
  width: min(1100px, 100%);
  height: min(620px, 70vh);
  border: 0;
  border-radius: 12px;
  background: #000;
}
#mglb .mglb__thumbs{ width: 100%; padding: 0 0 4px; }
#mglb .mglb__thumbs .swiper-slide{
  width: 84px;
  height: 58px;
  opacity: .45;
  transition: opacity .18s ease;
}
#mglb .mglb__thumbs .swiper-slide-thumb-active{ opacity: 1; }

#mglb button[data-mglb-close],
#mglb .mglb__prev,
#mglb .mglb__next{
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.22);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(6px);
}
#mglb button[data-mglb-close]{ position: absolute; top: 22px; right: 22px; z-index: 10; }
#mglb .mglb__prev{ position: absolute; left: 22px; top: 50%; transform: translateY(-50%); z-index: 10; }
#mglb .mglb__next{ position: absolute; right: 22px; top: 50%; transform: translateY(-50%); z-index: 10; }
@media (max-width: 767px){
  #mglb button[data-mglb-close]{ top: 14px; right: 14px; }
  #mglb .mglb__prev{ left: 14px; }
  #mglb .mglb__next{ right: 14px; }
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
      safeTry(() => state.mainSwiper?.destroy?.(true, true));
      safeTry(() => state.thumbsSwiper?.destroy?.(true, true));
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

    function buildYouTubeEmbed(id) {
      // Autoplay is OFF (0). Modest branding + no related.
      const src =
        `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` +
        `?autoplay=0&mute=0&controls=1&modestbranding=1&playsinline=1&rel=0`;

      return `
        <div style="width:100%;display:flex;align-items:center;justify-content:center;">
          <iframe
            src="${src}"
            title="YouTube video"
            allow="encrypted-media; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
      `;
    }

    function mountSlides(items) {
      const { mainW, thumbsW } = getModalRefs();
      if (!mainW || !thumbsW) return;

      mainW.innerHTML = "";
      thumbsW.innerHTML = "";

      items.forEach((it) => {
        const s = document.createElement("div");
        s.className = "swiper-slide";

        if (it.kind === "youtube") {
          s.innerHTML = buildYouTubeEmbed(it.id);
        } else {
          s.innerHTML = `<img src="${it.src}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;display:block;">`;
        }

        mainW.appendChild(s);
      });

      items.forEach((it) => {
        const s = document.createElement("div");
        s.className = "swiper-slide";
        const thumb = it.kind === "youtube" ? it.thumb : (it.thumb || it.src);

        s.innerHTML = `
          <div style="position:relative;width:100%;height:100%;">
            <img src="${thumb}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
          </div>
        `;
        thumbsW.appendChild(s);
      });
    }

    function setActiveThumb(idx) {
      if (!state.thumbsSwiper) return;
      safeTry(() => {
        state.thumbsSwiper.slides.forEach((sl) => sl.classList.remove("swiper-slide-thumb-active"));
        const active = state.thumbsSwiper.slides[idx];
        if (active) active.classList.add("swiper-slide-thumb-active");
        state.thumbsSwiper.slideTo(idx, 250);
        state.thumbsSwiper.update();
      });
    }

    function initSwipers(startIndex) {
      if (!window.Swiper) return;

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
    }

    async function MediaBoot(container) {
      state.container = container || getContainer();
      if (!isInMedia()) return;

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
          if (!items.length) return;

          openModal();
          mountSlides(items);

          setTimeout(() => initSwipers(startIndex), 50);
        };

        document.addEventListener("click", state.onDocClick, true);
      }
    }

    function MediaDestroy() {
      safeTry(() => closeModal());
      safeTry(() => destroySwipers());

      if (state.onDocClick) {
        safeTry(() => document.removeEventListener("click", state.onDocClick, true));
        state.onDocClick = null;
      }

      state.container = null;
    }

    window.MediaBoot = MediaBoot;
    window.MediaDestroy = MediaDestroy;
  })();

  /* =========================================================
     6) MEDIA: SHOW/HIDE FS CLEAR BUTTON WHEN EMPTY
     - If your clear button exists (fs-list-element="clear"), we toggle it.
     - No filter hacking here (pure UX visibility).
     Code comments in English ✅
  ========================================================= */
  (() => {
    if (window.__MEDIA_CLEAR_VIS__) return;
    window.__MEDIA_CLEAR_VIS__ = true;

    const st = {
      root: null,
      mo: null,
      raf: 0,
      clearBtn: null,
      lastEmpty: null
    };

    const SEL = {
      list: "[fs-list-element='list']",
      itemsWrap: "[fs-list-element='items']",
      empty: "[fs-list-element='empty'], .w-dyn-empty",
      clearBtn: "[fs-list-element='clear']"
    };

    function isVisible(el) {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }

    function getEmptyEl(root) {
      return root.querySelector(SEL.empty);
    }

    function countVisibleItems(root) {
      const itemsWrap = root.querySelector(SEL.itemsWrap);
      if (itemsWrap) {
        return Array.from(itemsWrap.children || []).filter(isVisible).length;
      }
      const list = root.querySelector(SEL.list) || root;
      const dynItems = Array.from(list.querySelectorAll(".w-dyn-item"));
      if (dynItems.length) return dynItems.filter(isVisible).length;
      return 0;
    }

    function isListEmpty(root) {
      const emptyEl = getEmptyEl(root);
      if (emptyEl && isVisible(emptyEl)) return true;
      return countVisibleItems(root) === 0;
    }

    function setBtnVisible(show) {
      const btn = st.clearBtn;
      if (!btn) return;
      btn.style.display = show ? "" : "none";
      btn.style.pointerEvents = show ? "auto" : "none";
      btn.setAttribute("aria-hidden", show ? "false" : "true");
    }

    function scheduleUpdate() {
      cancelAnimationFrame(st.raf);
      st.raf = requestAnimationFrame(() => {
        if (!st.root) return;
        const emptyNow = isListEmpty(st.root);
        if (st.lastEmpty === emptyNow) return;
        st.lastEmpty = emptyNow;
        setBtnVisible(emptyNow);
      });
    }

    function MediaClearVisBoot(root = document) {
      st.root = root;

      st.clearBtn = (st.root.querySelector(SEL.clearBtn) || document.querySelector(SEL.clearBtn));
      if (!st.clearBtn) return;

      const watchTarget =
        st.root.querySelector(SEL.itemsWrap) ||
        st.root.querySelector(SEL.list) ||
        getEmptyEl(st.root);

      if (watchTarget && !st.mo) {
        st.mo = new MutationObserver(() => scheduleUpdate());
        st.mo.observe(watchTarget, { childList: true, subtree: true, attributes: true });
      }

      scheduleUpdate();
      setTimeout(scheduleUpdate, 250);
      setTimeout(scheduleUpdate, 900);
    }

    function MediaClearVisDestroy() {
      cancelAnimationFrame(st.raf);
      st.raf = 0;

      if (st.mo) {
        safeTry(() => st.mo.disconnect());
        st.mo = null;
      }

      st.root = null;
      st.clearBtn = null;
      st.lastEmpty = null;
    }

    window.MediaClearVisBoot = MediaClearVisBoot;
    window.MediaClearVisDestroy = MediaClearVisDestroy;
  })();

  /* =========================================================
     BOOT (DOMContentLoaded) + Barba hooks
  ========================================================= */
  onReady(() => {
    initTourDropdown(document);
    markCurrentTourStop(document);

    initPersistentAudio();
    initDisableCurrentFooterLinks();
    initNavPushAndToursSwiper();

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

    console.log("[CBW Stable] loaded ✅");
  });
})();
