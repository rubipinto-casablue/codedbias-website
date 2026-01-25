/* =========================================================
  CODED BIAS — CORE (GitHub)
  - Barba + Wipe + HUD (stable)
  - No scroll jump before wipe
  - Preserves scroll position
  - Freezes ScrollTrigger during transitions (prevents scrub snap)
  - /media => HARD LOAD (no Barba)
  - Exposes window.Site API for Hotfix layer (Webflow)
  - English comments only (always)
========================================================= */
(() => {
  /* -----------------------------
     Safety / reset
  ----------------------------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  try { if (window.barba) barba.destroy(); } catch (e) {}

  /* -----------------------------
     Helpers
  ----------------------------- */
  function qs(sel, root = document) { return root.querySelector(sel); }
  function numberWithZero(num) { return num < 10 ? "0" + num : String(num); }
  function gsapTo(target, vars) {
    return new Promise(resolve => gsap.to(target, { ...vars, onComplete: resolve }));
  }
  function delay(seconds) { return new Promise(resolve => setTimeout(resolve, seconds * 1000)); }

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
     Soft scroll lock (prevents jump)
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
     Swiper init (Barba-safe)
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
        slidesPerView: 1,
        speed: 700,
        effect: "fade",
        allowTouchMove: false
      });

      const thumbsSwiper = new Swiper($wrap.find(".swiper.slider-thumb")[0], {
        slidesPerView: 1,
        speed: 700,
        effect: "coverflow",
        coverflowEffect: { rotate: 0, scale: 1, slideShadows: false },
        loop: true,
        loopedSlides: 8,
        slideToClickedSlide: true
      });

      const textSwiper = new Swiper($wrap.find(".swiper.slider-text")[0], {
        slidesPerView: "auto",
        speed: 1000,
        loop: true,
        loopedSlides: 8,
        slideToClickedSlide: true,
        mousewheel: true,
        keyboard: true,
        centeredSlides: true,
        slideActiveClass: "is-active",
        slideDuplicateActiveClass: "is-active",
        thumbs: { swiper: bgSwiper },
        navigation: {
          nextEl: $wrap.find(".swiper-next")[0],
          prevEl: $wrap.find(".swiper-prev")[0]
        }
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

  gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" });

  const HUD_FIXED_TEXT = "CODED BIAS WORLD TOUR";
  function setHudFixed() {
    if (cityEl) cityEl.textContent = HUD_FIXED_TEXT;
    if (countryEl) { countryEl.textContent = ""; countryEl.style.display = "none"; }
    if (coordsEl) { coordsEl.textContent = ""; coordsEl.style.display = "none"; }
  }

  /* -----------------------------
     Webflow re-init (soft)
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

    // Soft re-init only. destroy() can break parts of Webflow runtime on Barba swaps.
    try { Webflow.ready(); } catch (e) {}

    try {
      const ix2 = Webflow.require("ix2");
      ix2?.destroy?.();
      ix2?.init?.();
    } catch (e) {}

    try {
      const lb = Webflow.require("lightbox");
      lb?.ready?.();
    } catch (e) {}

    requestAnimationFrame(() => {
      try { Webflow.ready(); } catch (e) {}
      try { Webflow.require("ix2")?.init?.(); } catch (e) {}
      try { Webflow.require("lightbox")?.ready?.(); } catch (e) {}
    });
  }

  /* -----------------------------
     Home panels
  ----------------------------- */
  function cleanupHomePanels() {
    document.body.classList.remove("no-scroll");
  }

  function setupHomePanels(container) {
    const shell = qs(".page-shell", container);
    if (!shell) return;

    const intro = qs(".panel-panel--intro", container);
    const slider = qs(".panel-panel--slider", container);
    const btn = qs('[data-intro="continue"]', container);
    if (!intro || !slider || !btn) return;

    document.body.classList.add("no-scroll");
    if (btn.dataset.homeBound === "1") return;
    btn.dataset.homeBound = "1";

    const RADIUS = 32;
    const INTRO_ZOOM = 0.68;
    const SLIDER_START = 0.80;

    gsap.set(intro, { display: "block", x: 0, scale: 1, borderRadius: 0, willChange: "transform" });
    gsap.set(slider, { display: "block", x: "-110vw", scale: SLIDER_START, borderRadius: RADIUS, willChange: "transform" });

    let isAnimating = false;

    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });

    tl
      .to(intro, { duration: 1.15, scale: INTRO_ZOOM, borderRadius: RADIUS, ease: "power2.inOut" })
      .to(intro, { duration: 1.10, x: "120vw" })
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
     Barba init
  ----------------------------- */
  barba.init({
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
        gsap.killTweensOf(wipe);

        // Prevent scrub snap
        freezeScrollTriggers();

        // Prevent scroll jump (no overflow hidden yet)
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

        // Now it's safe to hard lock
        lockScrollHardNow();

        await delay(HOLD_DURATION);
        current.style.visibility = "hidden";
      },

      beforeEnter(data) {
        gsap.killTweensOf(wipe);
        gsap.set(wipe, { y: "0%", autoAlpha: 1, display: "block" });

        data.next.container.style.visibility = "visible";
        data.next.container.style.opacity = "0";
      },

      async enter(data) {
        data.next.container.style.opacity = "1";
      },

      async after(data) {
        // Wipe still covers here: we can move scroll to top without showing it
        if (!location.hash) hardScrollTop();

        syncWebflowPageIdFromBarba(data);
        reinitWebflow();

        cleanupHomePanels();
        setupHomePanels(data?.next?.container || document);

        initGallerySwipers(data?.next?.container || document);
        hideSectionsIfCollectionEmpty(data?.next?.container || document);

        // Re-enable ScrollTrigger on the new page
        unfreezeScrollTriggers();
        try { window.ScrollTrigger?.refresh?.(); } catch (e) {}

        // Reveal
        gsap.killTweensOf(wipe);
        await gsapTo(wipe, {
          y: "-100%",
          duration: MOVE_DURATION,
          ease: "power4.inOut",
          overwrite: true
        });

        gsap.set(wipe, { y: "100%" });

        // Release any scroll locks
        unlockScrollAll();

        // Anchors (if any)
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

    console.log("[Core] Barba/Wipe init ✅");
    window.__SITE_JS_LOADED__ = true;
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
    try { gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" }); } catch (e) {}
    try { setHudFixed(); } catch (e) {}
  });

  /* -----------------------------
     Public API (for Webflow Hotfix layer)
  ----------------------------- */
  window.Site = window.Site || {};
  window.Site.version = "core-1";
  window.Site.hardScrollTop = hardScrollTop;
  window.Site.forceAnchor = forceAnchor;
  window.Site.reinitWebflow = reinitWebflow;
  window.Site.initGallerySwipers = initGallerySwipers;
  window.Site.hideSectionsIfCollectionEmpty = hideSectionsIfCollectionEmpty;
  window.Site.applyMediaTypeFromUrl = applyMediaTypeFromUrl;

  console.log("[Core] loaded ✅");
})();
