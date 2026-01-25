/* =========================================================
  CODED BIAS — CORE (GitHub) / site.js
  Stable baseline:
  - Barba page transitions (wipe + HUD) with "no jump" scroll behavior
  - ScrollTrigger freeze/unfreeze during transitions (prevents scrub snap)
  - /media => HARD LOAD (no Barba)
  - Hard-nav wipe ONLY for /media deep links (optional, keeps UX consistent)
  - Webflow soft re-init (IX2 + Lightbox) after Barba swap
  - Home panels (intro -> slider)
  - Swiper gallery init (Barba-safe)
  - Hide CMS sections if empty
  - Tour dropdown + current stop highlight (Barba-safe)
  - Persistent audio + Lottie sync (Barba-safe)
  - GSAP scroll engine (single motor, Barba-safe)
  - Film grain overlay (Barba-safe)
  - Disable current footer nav links (Barba-safe)

  Notes:
  - This file MUST NOT be edited frequently (use Webflow hotfix layer for that).
  - English comments only (always).
========================================================= */

(() => {
  /* -----------------------------
     Safety / reset
  ----------------------------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  try { if (window.barba) window.barba.destroy(); } catch (e) {}

  /* -----------------------------
     Helpers
  ----------------------------- */
  const qs = (sel, root = document) => root.querySelector(sel);

  function numberWithZero(num) {
    const n = Number(num) || 0;
    return n < 10 ? "0" + n : String(n);
  }

  function gsapTo(target, vars) {
    return new Promise(resolve => window.gsap.to(target, { ...vars, onComplete: resolve }));
  }

  function delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  function hardScrollTop() {
    try {
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    } catch (e) {}
  }

  function hardScrollTopAfterPaint() {
    requestAnimationFrame(() => {
      hardScrollTop();
      requestAnimationFrame(() => {
        hardScrollTop();
        setTimeout(hardScrollTop, 60);
      });
    });
  }

  function forceAnchor() {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    const jump = () => {
      try { target.scrollIntoView({ behavior: "auto", block: "start" }); } catch (e) {}
    };

    requestAnimationFrame(() => requestAnimationFrame(jump));
    window.addEventListener("load", jump, { once: true });
    setTimeout(jump, 350);
    setTimeout(jump, 900);
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

  function normalizeForCompare(url) {
    const u = new URL(url, location.origin);
    const p = u.pathname.replace(/\/+$/, "") || "/";
    return p + (u.search || "");
  }

  /* -----------------------------
     /media filter-from-URL helper
     (kept in CORE because it is stable)
  ----------------------------- */
  function applyMediaTypeFromUrl({ scope = document } = {}) {
    const path = location.pathname.replace(/\/$/, "");
    if (path !== "/media") return;

    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    if (!type) return;

    const root = scope && scope.querySelector ? scope : document;

    const activateFsListControl = (el) => {
      if (!el) return false;

      const wCheckbox = el.closest(".w-checkbox") || el.closest("label");
      const input = wCheckbox ? wCheckbox.querySelector('input[type="checkbox"], input[type="radio"]') : null;

      if (input) {
        if (!input.checked) input.click();
        return true;
      }

      el.click?.();
      return true;
    };

    const findCandidate = () => {
      let el =
        root.querySelector(`[fs-list-value="${CSS.escape(type)}"]`) ||
        root.querySelector(`[fs-list-field="${CSS.escape(type)}"]`);

      if (!el) {
        const all = root.querySelectorAll("[fs-list-value], [fs-list-field]");
        const wanted = String(type).trim().toLowerCase();
        el = Array.from(all).find(node => {
          const v = (node.getAttribute("fs-list-value") || "").trim().toLowerCase();
          const f = (node.getAttribute("fs-list-field") || "").trim().toLowerCase();
          return v === wanted || f === wanted;
        }) || null;
      }

      return el;
    };

    let tries = 0;
    const maxTries = 20;
    const tickMs = 150;

    const iv = setInterval(() => {
      tries++;

      const el = findCandidate();
      if (el) {
        activateFsListControl(el);
        clearInterval(iv);
        console.log("[MediaFilters] Applied type from URL:", type);
      }

      if (tries >= maxTries) {
        clearInterval(iv);
        console.warn("[MediaFilters] Could not find control for type:", type);
      }
    }, tickMs);
  }

  /* -----------------------------
     ScrollTrigger freeze/unfreeze
  ----------------------------- */
  function freezeScrollTriggers() {
    try { window.ScrollTrigger?.getAll?.().forEach(st => st.disable(false)); } catch (e) {}
  }
  function unfreezeScrollTriggers() {
    try { window.ScrollTrigger?.getAll?.().forEach(st => st.enable()); } catch (e) {}
  }

  /* -----------------------------
     Soft scroll lock (prevents jump before wipe)
  ----------------------------- */
  let _scrollBlockOn = false;
  let _scrollBlockY = 0;
  let _onWheel = null, _onTouchMove = null, _onKeyDown = null;

  function lockScrollSoft() {
    if (_scrollBlockOn) return;
    _scrollBlockOn = true;

    _scrollBlockY = window.scrollY || 0;

    _onWheel = (e) => { e.preventDefault(); window.scrollTo(0, _scrollBlockY); };
    _onTouchMove = (e) => { e.preventDefault(); window.scrollTo(0, _scrollBlockY); };
    _onKeyDown = (e) => {
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
      if (keys.includes(e.key)) {
        e.preventDefault();
        window.scrollTo(0, _scrollBlockY);
      }
    };

    window.addEventListener("wheel", _onWheel, { passive: false });
    window.addEventListener("touchmove", _onTouchMove, { passive: false });
    window.addEventListener("keydown", _onKeyDown, { passive: false });
  }

  function lockScrollHardNow() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }

  function unlockScrollAll() {
    if (_scrollBlockOn) {
      _scrollBlockOn = false;
      window.removeEventListener("wheel", _onWheel, { passive: false });
      window.removeEventListener("touchmove", _onTouchMove, { passive: false });
      window.removeEventListener("keydown", _onKeyDown, { passive: false });
      _onWheel = _onTouchMove = _onKeyDown = null;
    }

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  }

  /* -----------------------------
     Swiper gallery init (Barba-safe)
  ----------------------------- */
  function initGallerySwipers(scope = document) {
    if (!window.Swiper) { console.warn("[Swiper] Swiper not found."); return; }
    if (!window.jQuery && !window.$) { console.warn("[Swiper] jQuery not found."); return; }
    const $ = window.jQuery || window.$;

    $(scope).find(".slider-gallery-comp").each(function () {
      const $wrap = $(this);
      if ($wrap.data("swiper-inited") === 1) return;
      $wrap.data("swiper-inited", 1);

      const totalSlides = numberWithZero($wrap.find(".swiper-slide.slider-thumb").length);
      $wrap.find(".swiper-number-total").text(totalSlides);

      const bgSwiper = new Swiper($wrap.find(".swiper.slider-bg")[0], {
        slidesPerView: 1, speed: 700, effect: "fade", allowTouchMove: false
      });

      const thumbsSwiper = new Swiper($wrap.find(".swiper.slider-thumb")[0], {
        slidesPerView: 1, speed: 700, effect: "coverflow",
        coverflowEffect: { rotate: 0, scale: 1, slideShadows: false },
        loop: true, loopedSlides: 8, slideToClickedSlide: true
      });

      const textSwiper = new Swiper($wrap.find(".swiper.slider-text")[0], {
        slidesPerView: "auto", speed: 1000, loop: true, loopedSlides: 8,
        slideToClickedSlide: true, mousewheel: true, keyboard: true,
        centeredSlides: true, slideActiveClass: "is-active",
        slideDuplicateActiveClass: "is-active",
        thumbs: { swiper: bgSwiper },
        navigation: { nextEl: $wrap.find(".swiper-next")[0], prevEl: $wrap.find(".swiper-prev")[0] }
      });

      textSwiper.controller.control = thumbsSwiper;
      thumbsSwiper.controller.control = textSwiper;

      textSwiper.on("slideChange", function (e) {
        $wrap.find(".swiper-number-current").text(numberWithZero(e.realIndex + 1));
      });

      $wrap.data("swiper-bg", bgSwiper);
      $wrap.data("swiper-thumbs", thumbsSwiper);
      $wrap.data("swiper-text", textSwiper);
    });
  }

  function hideSectionsIfCollectionEmpty(scope = document) {
    const root = scope && scope.querySelector ? scope : document;
    root.querySelectorAll(".js-media-library").forEach(section => {
      const wrapper = section.querySelector(".js-media-wrapper");
      if (!wrapper) return;
      section.style.display = wrapper.querySelector(".w-dyn-item") ? "" : "none";
    });
  }

  /* -----------------------------
     Wipe + HUD
  ----------------------------- */
  const wipe = document.querySelector(".page-wipe");
  if (!wipe) {
    console.error("[Barba/Wipe] .page-wipe not found (must be outside Barba container).");
    return;
  }

  const cityEl = document.querySelector(".wipe-city");
  const countryEl = document.querySelector(".wipe-country");
  const coordsEl = document.querySelector(".wipe-coords");

  const MOVE_DURATION = 1.05;
  const HOLD_DURATION = 0.25;

  // Base state: wipe below viewport
  window.gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" });

  const HUD_FIXED_TEXT = "CODED BIAS WORLD TOUR";
  function setHudFixed() {
    if (cityEl) cityEl.textContent = HUD_FIXED_TEXT;
    if (countryEl) { countryEl.textContent = ""; countryEl.style.display = "none"; }
    if (coordsEl)  { coordsEl.textContent = "";  coordsEl.style.display = "none";  }
  }

  /* -----------------------------
     Webflow soft re-init (Barba-safe)
  ----------------------------- */
  function syncWebflowPageIdFromBarba(data) {
    try {
      const nextHtml = data?.next?.html;
      if (!nextHtml) return;
      const doc = new DOMParser().parseFromString(nextHtml, "text/html");
      const nextPageId = doc.documentElement.getAttribute("data-wf-page");
      if (nextPageId) document.documentElement.setAttribute("data-wf-page", nextPageId);
    } catch (e) {}
  }

  function reinitWebflow() {
    if (!window.Webflow) return;

    // Soft re-init only. destroy() can break runtime in SPA swaps.
    try { window.Webflow.ready(); } catch (e) {}

    try {
      const ix2 = window.Webflow.require("ix2");
      ix2?.destroy?.();
      ix2?.init?.();
    } catch (e) {}

    try {
      const lb = window.Webflow.require("lightbox");
      lb?.ready?.();
    } catch (e) {}

    requestAnimationFrame(() => {
      try { window.Webflow.ready(); } catch (e) {}
      try { window.Webflow.require("ix2")?.init?.(); } catch (e) {}
      try { window.Webflow.require("lightbox")?.ready?.(); } catch (e) {}
    });
  }

  /* -----------------------------
     Home panels (intro -> slider)
  ----------------------------- */
  function cleanupHomePanels() {
    document.body.classList.remove("no-scroll");
  }

  function setupHomePanels(container) {
    const shell = qs(".page-shell", container);
    if (!shell) return;

    const intro  = qs(".panel-panel--intro", container);
    const slider = qs(".panel-panel--slider", container);
    const btn    = qs('[data-intro="continue"]', container);
    if (!intro || !slider || !btn) return;

    document.body.classList.add("no-scroll");
    if (btn.dataset.homeBound === "1") return;
    btn.dataset.homeBound = "1";

    const RADIUS = 32;
    const INTRO_ZOOM = 0.68;
    const SLIDER_START = 0.80;

    window.gsap.set(intro,  { display: "block", x: 0, scale: 1, borderRadius: 0, willChange: "transform" });
    window.gsap.set(slider, { display: "block", x: "-110vw", scale: SLIDER_START, borderRadius: RADIUS, willChange: "transform" });

    let isAnimating = false;

    const tl = window.gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });

    tl
      .to(intro,  { duration: 1.15, scale: INTRO_ZOOM, borderRadius: RADIUS, ease: "power2.inOut" })
      .to(intro,  { duration: 1.10, x: "120vw" })
      .to(slider, { duration: 1.20, x: "0vw" }, "<")
      .to(slider, { duration: 1.05, scale: 1, borderRadius: 0, ease: "power3.out" }, "-=0.15")
      .set(intro, { display: "none" })
      .add(() => {
        document.body.classList.remove("no-scroll");
        try {
          const $ = window.jQuery || window.$;
          if ($) {
            const $wrap = $(container).find(".slider-gallery-comp").first();
            const textSwiper = $wrap.data("swiper-text");
            textSwiper?.update?.();
          }
        } catch (e) {}
      });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAnimating) return;
      isAnimating = true;
      tl.eventCallback("onComplete", () => { isAnimating = false; });
      tl.play(0);
    });
  }

  /* -----------------------------
     BARBA init (CORE owns it)
     /media is excluded (hard load)
     /request-a-screening is INCLUDED in Barba (fix via Webflow hotfix)
  ----------------------------- */
  if (!window.barba) {
    console.error("[Barba] @barba/core not found.");
    return;
  }
  if (!window.gsap) {
    console.error("[GSAP] gsap not found.");
    return;
  }

  window.barba.init({
    preventRunning: true,

    // Hard-load exclusions
    prevent: ({ href }) => {
      if (!href) return false;
      try {
        const url = new URL(href, window.location.origin);
        const path = url.pathname.replace(/\/$/, "");
        if (path === "/media") return true; // keep /media as hard load
      } catch (e) {}
      return false;
    },

    transitions: [{
      name: "wipe-stable-nojump",

      async leave(data) {
        const current = data.current.container;

        setHudFixed();
        window.gsap.killTweensOf(wipe);

        // Prevent scrub snapping during transition
        freezeScrollTriggers();

        // Prevent scroll jump before wipe
        lockScrollSoft();

        current.style.visibility = "visible";
        current.style.opacity = "1";

        // Cover
        await gsapTo(wipe, {
          y: "0%",
          duration: MOVE_DURATION,
          ease: "power4.inOut",
          overwrite: true
        });

        // Now it's safe to hard-lock input
        lockScrollHardNow();

        await delay(HOLD_DURATION);
        current.style.visibility = "hidden";
      },

      beforeEnter(data) {
        window.gsap.killTweensOf(wipe);
        window.gsap.set(wipe, { y: "0%", autoAlpha: 1, display: "block" });

        data.next.container.style.visibility = "visible";
        data.next.container.style.opacity = "0";
      },

      async enter(data) {
        data.next.container.style.opacity = "1";
      },

      async after(data) {
        // Wipe still covers here: move scroll without flashing
        if (!location.hash) hardScrollTop();

        syncWebflowPageIdFromBarba(data);
        reinitWebflow();

        cleanupHomePanels();
        setupHomePanels(data?.next?.container || document);

        initGallerySwipers(data?.next?.container || document);
        hideSectionsIfCollectionEmpty(data?.next?.container || document);

        // Restore ScrollTrigger and refresh
        unfreezeScrollTriggers();
        try { window.ScrollTrigger?.refresh?.(); } catch (e) {}

        // Reveal
        window.gsap.killTweensOf(wipe);
        await gsapTo(wipe, {
          y: "-100%",
          duration: MOVE_DURATION,
          ease: "power4.inOut",
          overwrite: true
        });
        window.gsap.set(wipe, { y: "100%" });

        // Release input locks
        unlockScrollAll();

        // Anchor jump (if any)
        if (location.hash) forceAnchor();
      }
    }]
  });

  /* -----------------------------
     First load
  ----------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    setHudFixed();

    if (!location.hash) hardScrollTopAfterPaint();
    else forceAnchor();

    cleanupHomePanels();
    setupHomePanels(document);

    initGallerySwipers(document);
    hideSectionsIfCollectionEmpty(document);

    applyMediaTypeFromUrl({ scope: document });

    console.log("[Barba/Wipe] init ✅");
  });

  /* -----------------------------
     BFCache support
  ----------------------------- */
  window.addEventListener("pageshow", (evt) => {
    if (!evt.persisted) return;

    unlockScrollAll();
    unfreezeScrollTriggers();

    if (!location.hash) hardScrollTopAfterPaint();
    else forceAnchor();

    try { applyMediaTypeFromUrl({ scope: document }); } catch (e) {}
    try { window.gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" }); } catch (e) {}
    try { setHudFixed(); } catch (e) {}
  });

  /* =========================================================
     HARD NAV WIPE (ONLY for /media hard-load routes)
     - Keeps the same wipe feeling even when Barba is bypassed
  ========================================================= */
  (() => {
    const HARD_URLS = new Set([
      "/media?stop=paris",
      "/media?stop=paris#video",
      "/media?stop=taipei",
      "/media?stop=taipei#video",
      "/media?stop=kigali",
      "/media?stop=kigali#video",
      "/media?stop=oxford-ms",
      "/media?stop=oxford-ms#video",
      "/media?stop=oxford-uk",
      "/media?stop=oxford-uk#video",
      "/media?stop=nairobi",
      "/media?stop=nairobi#video",
      "/media?type=Local%20voices"
    ]);

    function makeKeyFromUrl(u) {
      const path = (u.pathname || "").replace(/\/+$/, "") || "/";
      return path + (u.search || "") + (u.hash || "");
    }

    function wipeOutIfPending() {
      const w = document.querySelector(".page-wipe");
      if (!w || !window.gsap) return;

      const html = document.documentElement;

      let pending = false;
      try { pending = sessionStorage.getItem("hardWipePending") === "1"; } catch (e) {}
      if (!pending && !html.classList.contains("is-hard-wipe-pending")) return;

      try { sessionStorage.removeItem("hardWipePending"); } catch (e) {}
      html.classList.remove("is-hard-wipe-pending");

      window.gsap.killTweensOf(w);
      window.gsap.set(w, { y: "0%", autoAlpha: 1, display: "block" });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.gsap.to(w, {
            y: "-100%",
            duration: 1.05,
            ease: "power4.inOut",
            overwrite: true,
            onComplete: () => window.gsap.set(w, { y: "100%" })
          });
        });
      });
    }

    document.addEventListener("DOMContentLoaded", wipeOutIfPending);

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;

      if (a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const hrefAttr = a.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;

      let url;
      try { url = new URL(a.href, window.location.origin); } catch { return; }
      if (url.origin !== window.location.origin) return;

      const key = makeKeyFromUrl(url);
      const shouldHardWipe = HARD_URLS.has(key);
      const attrForced = (a.getAttribute("data-wipe-hard") === "1");

      if (!shouldHardWipe && !attrForced) return;

      const currentKey = makeKeyFromUrl(new URL(window.location.href));
      if (key === currentKey) return;

      e.preventDefault();
      e.stopPropagation();

      const w = document.querySelector(".page-wipe");
      if (!w || !window.gsap) {
        window.location.href = url.href;
        return;
      }

      window.gsap.killTweensOf(w);
      window.gsap.set(w, { y: "100%", autoAlpha: 1, display: "block" });

      window.gsap.to(w, {
        y: "0%",
        duration: 1.05,
        ease: "power4.inOut",
        overwrite: true,
        onComplete: () => {
          try { sessionStorage.setItem("hardWipePending", "1"); } catch (e) {}
          document.documentElement.classList.add("is-hard-wipe-pending");
          window.location.href = url.href;
        }
      });
    }, true);
  })();

  /* =========================================================
     TOUR DROPDOWN + CURRENT STOP HIGHLIGHT (Barba-safe)
  ========================================================= */
  (() => {
    function initDropdown(root = document) {
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

      const toggle = () => dd.classList.contains("is-open") ? close() : open();

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

    function closeAllDropdowns() {
      document.querySelectorAll(".tour_dd").forEach(dd => {
        dd.classList.remove("is-open");
        const btn = dd.querySelector(".tour_dd-toggle");
        if (btn) btn.setAttribute("aria-expanded", "false");
      });
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
        closeAllDropdowns();
      }
    }, true);

    document.addEventListener("DOMContentLoaded", () => {
      initDropdown(document);
      markCurrentTourStop(document);
    });

    if (window.barba) {
      window.barba.hooks.beforeLeave(() => closeAllDropdowns());

      window.barba.hooks.afterEnter(({ next }) => {
        const container = next?.container || document;
        initDropdown(container);
        markCurrentTourStop(document);
        markCurrentTourStop(container);
        closeAllDropdowns();
      });
    }

    console.log("[TourDropdown] init ✅");
  })();

  /* =========================================================
     PERSISTENT AUDIO + LOTTIE SYNC (Barba-safe)
  ========================================================= */
  (() => {
    const audio = document.getElementById("bg-audio");
    if (!audio) {
      console.warn("[Audio] #bg-audio not found");
      return;
    }

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
      try {
        const wf = window.Webflow?.require?.("lottie");
        if (!wf?.lottie) return null;

        const el = document.getElementById("audioLottie");
        if (!el) return null;

        const regs = wf.lottie.getRegisteredAnimations?.() || [];
        return regs.find(a => a.wrapper === el) || null;
      } catch {
        return null;
      }
    }

    function setLottieOpacity(on) {
      const el = document.getElementById("audioLottie");
      if (!el) return;

      const to = on ? 1 : 0.35;
      const ms = 250;

      if (window.gsap) {
        window.gsap.to(el, { opacity: to, duration: ms / 1000, overwrite: true, ease: "power2.out" });
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

    // Auto-resume if it was playing
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
      window.barba.hooks.after(() => setTimeout(syncLottie, 350));
    }

    console.log("[Audio] init ✅");
  })();

  /* =========================================================
     GSAP SCROLL ENGINE (single motor, Barba-safe)
     - Kills timelines afterLeave (prevents visible snap)
  ========================================================= */
  (() => {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn("[GSAPEngine] GSAP/ScrollTrigger not found");
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);

    const ST_DEFAULTS = { start: "top 65%", end: "top 25%" };
    let timelines = [];

    function killAll() {
      timelines.forEach(tl => {
        try { tl.scrollTrigger?.kill?.(); } catch {}
        try { tl.kill?.(); } catch {}
      });
      timelines = [];
    }

    function splitIntoWords(el, key = "splitWordsReady") {
      if (el.dataset[key] === "1") return el.querySelectorAll(".gsap-word");

      const text = (el.textContent || "").trim();
      if (!text) return [];

      const words = text.split(/\s+/).filter(Boolean);
      el.innerHTML = words
        .map(w => `<span class="gsap-word" style="display:inline-block;">${w}</span>`)
        .join(" ");

      el.dataset[key] = "1";
      return el.querySelectorAll(".gsap-word");
    }

    function splitIntoLines(el) {
      if (el.dataset.splitLinesReady === "1") return el.querySelectorAll(".gsap-line");

      const originalText = (el.textContent || "").trim();
      if (!originalText) return [];

      const words = originalText.split(/\s+/).filter(Boolean);

      el.innerHTML = "";
      const frag = document.createDocumentFragment();

      words.forEach((w, i) => {
        const s = document.createElement("span");
        s.className = "gsap-word-measure";
        s.style.display = "inline-block";
        s.textContent = w;
        frag.appendChild(s);
        if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
      });

      el.appendChild(frag);

      const wordSpans = Array.from(el.querySelectorAll(".gsap-word-measure"));
      if (!wordSpans.length) return [];

      const lines = [];
      let currentTop = null;
      let currentLineWords = [];

      wordSpans.forEach(span => {
        const top = span.offsetTop;
        if (currentTop === null) currentTop = top;

        if (top !== currentTop) {
          lines.push(currentLineWords);
          currentLineWords = [];
          currentTop = top;
        }
        currentLineWords.push(span.textContent);
      });
      if (currentLineWords.length) lines.push(currentLineWords);

      el.innerHTML = lines
        .map(wordsArr => `<span class="gsap-line" style="display:block;">${wordsArr.join(" ")}</span>`)
        .join("");

      el.dataset.splitLinesReady = "1";
      return el.querySelectorAll(".gsap-line");
    }

    function makeScrubTL(triggerEl, start, end) {
      return window.gsap.timeline({
        scrollTrigger: {
          trigger: triggerEl,
          start: start || ST_DEFAULTS.start,
          end: end || ST_DEFAULTS.end,
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    }

    function initHeroParallax(container = document) {
      const hero = container.querySelector(".hero-main");
      if (!hero) return;

      const bg = hero.querySelector(".hero-bg");
      const card = hero.querySelector(".u-hero-card-wrap");
      if (!bg || !card) return;

      window.gsap.set([bg, card], { yPercent: 0 });

      const tl = window.gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      tl.to(bg,   { yPercent: -15, ease: "none" }, 0);
      tl.to(card, { yPercent: -40, ease: "none" }, 0);

      timelines.push(tl);
    }

    function initAboutIntro(container = document) {
      const targets = container.querySelectorAll('[data-gsap="about-intro"]');
      if (!targets.length) return;

      targets.forEach(el => {
        if (el.dataset.aboutIntroInited === "1") return;
        el.dataset.aboutIntroInited = "1";

        const words = splitIntoWords(el, "aboutIntroSplitReady");
        if (!words.length) return;

        window.gsap.set(words, { opacity: 0.2 });

        const tl = window.gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "top 15%",
            scrub: true,
            invalidateOnRefresh: true
          }
        });

        tl.to(words, { opacity: 1, duration: 0.25, ease: "none", stagger: 0.02 }, 0);
        timelines.push(tl);
      });
    }

    function initTitleBlocks(container = document) {
      const blocks = container.querySelectorAll('[data-gsap="title-block"]');
      if (!blocks.length) return;

      blocks.forEach(block => {
        if (block.dataset.titleBlockInited === "1") return;
        block.dataset.titleBlockInited = "1";

        const eyebrow = block.querySelector(".text-eyebrow");
        const display = block.querySelector(".text-display-2");
        const dotted  = block.querySelector(".dotted-line");

        const tl = makeScrubTL(block, "top 65%", "top 25%");

        if (eyebrow) {
          const words = splitIntoWords(eyebrow, "titleEyebrowSplitReady");
          if (words.length) {
            window.gsap.set(words, { opacity: 0 });
            tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0);
          }
        }

        if (display) {
          const words = splitIntoWords(display, "titleDisplaySplitReady");
          if (words.length) {
            window.gsap.set(words, { opacity: 0 });
            tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0.05);
          }
        }

        if (dotted) {
          window.gsap.set(dotted, { opacity: 0 });
          tl.to(dotted, { opacity: 1, ease: "none" }, 0.10);
        }

        timelines.push(tl);
      });
    }

    function initGridCols(container = document) {
      const grids = container.querySelectorAll('[data-gsap="grid-cols"]');
      if (!grids.length) return;

      grids.forEach(grid => {
        if (grid.dataset.gridInited === "1") return;
        grid.dataset.gridInited = "1";

        let cols = Array.from(grid.children).filter(el => el.classList?.contains("u-grid-col"));
        if (!cols.length) cols = Array.from(grid.querySelectorAll(".u-grid-col"));
        if (!cols.length) return;

        window.gsap.set(cols, { opacity: 0 });

        const tl = makeScrubTL(grid, "top 65%", "top 25%");
        tl.to(cols, { opacity: 1, ease: "none", stagger: 0.15 }, 0);

        timelines.push(tl);
      });
    }

    function initLinesStagger(container = document) {
      const blocks = container.querySelectorAll('[data-gsap="lines-stagger"]');
      if (!blocks.length) return;

      blocks.forEach(el => {
        if (el.dataset.linesInited === "1") return;
        el.dataset.linesInited = "1";

        const lines = splitIntoLines(el);
        if (!lines.length) return;

        window.gsap.set(lines, { opacity: 0 });

        const tl = makeScrubTL(el);
        tl.to(lines, { opacity: 1, duration: 0.25, ease: "none", stagger: 0.05 }, 0);

        timelines.push(tl);
      });
    }

    function initFadeSimple(container = document) {
      const blocks = container.querySelectorAll('[data-gsap="fade-simple"]');
      if (!blocks.length) return;

      blocks.forEach(el => {
        if (el.dataset.fadeInited === "1") return;
        el.dataset.fadeInited = "1";

        window.gsap.set(el, { opacity: 0 });

        const tl = makeScrubTL(el);
        tl.to(el, { opacity: 1, duration: 0.25, ease: "none" }, 0);

        timelines.push(tl);
      });
    }

    function initAll(container = document) {
      initHeroParallax(container);
      initAboutIntro(container);
      initTitleBlocks(container);
      initGridCols(container);
      initLinesStagger(container);
      initFadeSimple(container);
    }

    document.addEventListener("DOMContentLoaded", () => {
      killAll();
      initAll(document);
      window.ScrollTrigger.refresh();
      console.log("[GSAPEngine] init (DOMContentLoaded) ✅");
    });

    if (window.barba) {
      window.barba.hooks.afterLeave(() => killAll());

      window.barba.hooks.afterEnter(({ next }) => {
        const container = next?.container || document;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            initAll(container);
            window.ScrollTrigger.refresh();
            console.log("[GSAPEngine] init (afterEnter) ✅");
          });
        });
      });
    }
  })();

  /* =========================================================
     FILM GRAIN OVERLAY (Barba-safe, no deps)
     - Fixed overlay outside Barba, no flicker
  ========================================================= */
  (() => {
    const overlay = document.querySelector(".grain-overlay");
    if (!overlay) {
      console.warn("[Grain] .grain-overlay not found");
      return;
    }

    const FPS = 18;
    const SIZE = 220;
    const CONTRAST = 38;
    const ALPHA = 110;
    const USE_COLORED = false;

    let rafId = null;
    let last = 0;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = SIZE;
    canvas.height = SIZE;

    function drawNoise() {
      const img = ctx.createImageData(SIZE, SIZE);
      const d = img.data;

      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;

        if (USE_COLORED) {
          d[i]     = v;
          d[i + 1] = (Math.random() * 255) | 0;
          d[i + 2] = (Math.random() * 255) | 0;
        } else {
          d[i] = d[i + 1] = d[i + 2] = v;
        }

        const a = Math.max(0, Math.min(255, ALPHA + ((v - 128) * CONTRAST) / 128));
        d[i + 3] = a;
      }

      ctx.putImageData(img, 0, 0);
      overlay.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
      overlay.style.backgroundRepeat = "repeat";
    }

    function loop(t) {
      if (t - last >= 1000 / FPS) {
        last = t;
        drawNoise();
      }
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId) return;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    start();

    if (window.barba) {
      window.barba.hooks.afterEnter(() => start());
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    console.log("[Grain] init ✅");
  })();

  /* =========================================================
     DISABLE CURRENT FOOTER LINKS (Barba-safe)
  ========================================================= */
  (() => {
    const NAV_SELECTOR = ".footer_link";

    function disableCurrentNavLinks(scope = document) {
      const current = normalizeForCompare(location.href);

      scope.querySelectorAll(NAV_SELECTOR).forEach(a => {
        // Never touch lightbox links
        if (a.classList.contains("w-lightbox") || a.closest(".w-lightbox")) return;

        const link = normalizeForCompare(a.href);
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

    document.addEventListener("DOMContentLoaded", () => disableCurrentNavLinks(document));

    if (window.barba) {
      window.barba.hooks.afterEnter(({ next }) => {
        disableCurrentNavLinks(next?.container || document);
        disableCurrentNavLinks(document); // nav may live outside container
      });
    }
  })();

  console.log("[site.js] loaded v3 ✅");
  window.__CORE_BUNDLE_LOADED__ = true;
console.log("[core.bundle] loaded ✅");


})();
