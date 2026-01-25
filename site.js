/* =========================================================
  site.js (JS ONLY)
  - Do NOT include <script> / <link> tags in this file
  - Those belong in Webflow (Head/Footer custom code)
========================================================= */

window.__SITE_JS_LOADED__ = true;
console.log("[site.js] loaded ✅");

/* =========================================================
  CLEAN BARBA + WIPE + HUD (stable) — UPDATED
  - No scroll jump before wipe
  - Preserves scroll position
  - Freezes ScrollTrigger during transitions (prevents scrub snap)
  - /media => HARD LOAD (no Barba)
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

    prevent: ({ href }) => {
      if (!href) return false;
      try {
        const url = new URL(href, window.location.origin);
        const path = url.pathname.replace(/\/$/, "");
        if (path === "/media") return true;
      } catch (e) {}
      return false;
    },

    transitions: [{
      name: "wipe-stable-nojump",

      async leave(data) {
        const current = data.current.container;

        setHudFixed();
        gsap.killTweensOf(wipe);

        freezeScrollTriggers();
        lockScrollSoft();

        current.style.visibility = "visible";
        current.style.opacity = "1";

        await gsapTo(wipe, {
          y: "0%",
          duration: MOVE_DURATION,
          ease: "power4.inOut",
          overwrite: true
        });

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
        if (!location.hash) hardScrollTop();

        syncWebflowPageIdFromBarba(data);
        reinitWebflow();

        cleanupHomePanels();
        setupHomePanels(data?.next?.container || document);

        initGallerySwipers(data?.next?.container || document);
        hideSectionsIfCollectionEmpty(data?.next?.container || document);

        unfreezeScrollTriggers();
        try { window.ScrollTrigger?.refresh?.(); } catch (e) {}

        gsap.killTweensOf(wipe);
        await gsapTo(wipe, {
          y: "-100%",
          duration: MOVE_DURATION,
          ease: "power4.inOut",
          overwrite: true
        });

        gsap.set(wipe, { y: "100%" });

        unlockScrollAll();

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
    try { gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" }); } catch (e) {}
    try { setHudFixed(); } catch (e) {}
  });
})();

/* =========================================================
  HARD NAV WIPE (for hard-load pages)
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
    const wipe = document.querySelector(".page-wipe");
    if (!wipe || !window.gsap) return;

    const html = document.documentElement;

    let pending = false;
    try { pending = sessionStorage.getItem("hardWipePending") === "1"; } catch(e) {}
    if (!pending && !html.classList.contains("is-hard-wipe-pending")) return;

    try { sessionStorage.removeItem("hardWipePending"); } catch(e) {}
    html.classList.remove("is-hard-wipe-pending");

    gsap.killTweensOf(wipe);
    gsap.set(wipe, { y: "0%", autoAlpha: 1, display: "block" });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        gsap.to(wipe, {
          y: "-100%",
          duration: 1.05,
          ease: "power4.inOut",
          overwrite: true,
          onComplete: () => gsap.set(wipe, { y: "100%" })
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

    const wipe = document.querySelector(".page-wipe");
    if (!wipe || !window.gsap) {
      window.location.href = url.href;
      return;
    }

    gsap.killTweensOf(wipe);
    gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" });

    gsap.to(wipe, {
      y: "0%",
      duration: 1.05,
      ease: "power4.inOut",
      overwrite: true,
      onComplete: () => {
        try { sessionStorage.setItem("hardWipePending", "1"); } catch(e) {}
        document.documentElement.classList.add("is-hard-wipe-pending");
        window.location.href = url.href;
      }
    });
  }, true);
})();

/* =========================================================
  MULTI-STEP FORMS (Barba-safe) — standalone
========================================================= */
(() => {
  function initMultiStepForms(scope = document){
    const root = scope && scope.querySelector ? scope : document;

    root.querySelectorAll("form").forEach((formEl) => {
      const steps = Array.from(formEl.querySelectorAll(".form-step"));
      if (!steps.length) return;

      if (formEl.dataset.msInit === "1") return;
      formEl.dataset.msInit = "1";

      const nextBtns = Array.from(formEl.querySelectorAll(".btn-next-step"));
      const prevBtns = Array.from(formEl.querySelectorAll(".btn-prev-step"));

      const progressText = formEl.querySelector(".form-progress-text") || document.querySelector(".form-progress-text");
      const progressBar  = formEl.querySelector(".form-progress-bar")  || document.querySelector(".form-progress-bar");

      const TOTAL = steps.length;
      let current = steps.findIndex(s => s.classList.contains("is-active"));
      if (current < 0) current = 0;

      function getFields(stepEl){
        return Array.from(stepEl.querySelectorAll("input, select, textarea"));
      }

      function setDisabledForInactiveSteps(activeIndex){
        steps.forEach((stepEl, idx) => {
          const isActive = idx === activeIndex;

          getFields(stepEl).forEach(field => {
            const tag = field.tagName.toLowerCase();
            const type = (field.getAttribute("type") || "").toLowerCase();
            if (tag === "button" || type === "submit" || type === "button") return;
            field.disabled = !isActive;
          });
        });
      }

      function initConditionalFields(){
        const triggers = Array.from(formEl.querySelectorAll(".js-trigger-yes"));
        if (!triggers.length) return;

        triggers.forEach(select => {
          const wrapper = formEl.querySelector(".js-conditional-field");
          if (!wrapper) return;

          const dependentFields = Array.from(wrapper.querySelectorAll("input, select, textarea"));

          function setWrapperVisible(show){
            wrapper.style.display = show ? "block" : "none";

            dependentFields.forEach(f => {
              const tag = f.tagName.toLowerCase();
              const type = (f.getAttribute("type") || "").toLowerCase();
              if (tag === "button" || type === "submit" || type === "button") return;

              f.disabled = !show;
              if (!show) {
                if (type === "checkbox" || type === "radio") f.checked = false;
                else f.value = "";
              }
            });
          }

          function update(){
            const val = (select.value || "").trim().toLowerCase();
            setWrapperVisible(val === "yes");
          }

          if (!select.dataset.condBound) {
            select.addEventListener("change", update);
            select.dataset.condBound = "1";
          }

          update();
        });
      }

      function setStep(i){
        const idx = Math.max(0, Math.min(i, TOTAL - 1));

        steps.forEach((s, n) => s.classList.toggle("is-active", n === idx));
        setDisabledForInactiveSteps(idx);

        if (progressText) progressText.textContent = `Step ${idx + 1} of ${TOTAL}`;
        if (progressBar)  progressBar.style.width = `${((idx + 1) / TOTAL) * 100}%`;

        current = idx;
        initConditionalFields();
      }

      function validateStep(idx){
        const stepEl = steps[idx];
        const fields = getFields(stepEl).filter(f => !f.disabled);

        for (const field of fields){
          if (!field.checkValidity()){
            field.reportValidity();
            return false;
          }
        }
        return true;
      }

      function wireSubmitGuard(){
        if (formEl.dataset.submitGuard === "1") return;
        formEl.dataset.submitGuard = "1";

        formEl.addEventListener("submit", (e) => {
          steps.forEach(step => getFields(step).forEach(f => (f.disabled = false)));

          if (!formEl.checkValidity()){
            e.preventDefault();

            const firstInvalid = formEl.querySelector(":invalid");
            if (firstInvalid){
              const stepOfInvalid = steps.findIndex(step => step.contains(firstInvalid));
              if (stepOfInvalid >= 0) setStep(stepOfInvalid);

              firstInvalid.reportValidity();
              firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
              firstInvalid.focus({ preventScroll: true });
            }

            setDisabledForInactiveSteps(current);
          }
        }, true);
      }

      nextBtns.forEach(btn=>{
        btn.addEventListener("click", (e)=>{
          e.preventDefault();
          if (!validateStep(current)) return;
          setStep(current + 1);
          formEl.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });

      prevBtns.forEach(btn=>{
        btn.addEventListener("click", (e)=>{
          e.preventDefault();
          setStep(current - 1);
          formEl.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });

      setStep(current);
      wireSubmitGuard();
      initConditionalFields();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMultiStepForms(document);
    console.log("[MultiStep] init (DOMContentLoaded) ✅");
  });

  if (window.barba) {
    barba.hooks.afterEnter(({ next }) => {
      const container = next?.container || document;
      initMultiStepForms(container);
      console.log("[MultiStep] init (afterEnter) ✅");
    });
  }
})();

/* =========================================================
  MANUAL WEBFLOW FORM SUBMIT (Barba-safe)
========================================================= */
(() => {
  function isScreeningPage() {
    return location.pathname.replace(/\/$/, "") === "/request-a-screening";
  }

  function getSiteId() {
    return document.documentElement.getAttribute("data-wf-site") || "";
  }

  function getFormEl(scope = document) {
    const root = scope && scope.querySelector ? scope : document;
    return root.querySelector("form");
  }

  function getWebflowBlocks(formEl) {
    const wrap = formEl.closest(".w-form") || formEl.parentElement;
    const done = wrap ? wrap.querySelector(".w-form-done") : null;
    const fail = wrap ? wrap.querySelector(".w-form-fail") : null;
    return { wrap, done, fail };
  }

  function setUiState(formEl, state) {
    const { done, fail } = getWebflowBlocks(formEl);

    if (state === "sending") {
      if (done) done.style.display = "none";
      if (fail) fail.style.display = "none";
      formEl.style.display = "";
      formEl.classList.add("is-sending");
      return;
    }

    formEl.classList.remove("is-sending");

    if (state === "success") {
      if (done) done.style.display = "block";
      if (fail) fail.style.display = "none";
      formEl.style.display = "none";
      return;
    }

    if (state === "error") {
      if (done) done.style.display = "none";
      if (fail) fail.style.display = "block";
      formEl.style.display = "";
      return;
    }
  }

  function withAllFieldsEnabled(formEl, fn) {
    const disabled = Array.from(formEl.querySelectorAll("[disabled]"));
    disabled.forEach(el => (el.disabled = false));
    try { return fn(); }
    finally { disabled.forEach(el => (el.disabled = true)); }
  }

  async function submitToWebflow(formEl) {
    const siteId = getSiteId();
    if (!siteId) {
      console.warn("[ManualSubmit] Missing data-wf-site on <html>.");
      setUiState(formEl, "error");
      return;
    }

    const endpoint = `https://webflow.com/api/v1/form/${siteId}`;

    setUiState(formEl, "sending");

    try {
      const res = await withAllFieldsEnabled(formEl, async () => {
        const fd = new FormData(formEl);

        if (!fd.get("name")) {
          const formName =
            formEl.getAttribute("data-name") ||
            formEl.getAttribute("name") ||
            formEl.id ||
            "Form";
          fd.append("name", formName);
        }

        if (!fd.get("pageUrl")) fd.append("pageUrl", window.location.href);

        return fetch(endpoint, {
          method: "POST",
          body: fd,
          mode: "cors",
          credentials: "omit"
        });
      });

      if (res && res.ok) {
        setUiState(formEl, "success");
        return;
      }

      console.warn("[ManualSubmit] Non-OK response:", res?.status);
      setUiState(formEl, "error");
    } catch (err) {
      console.warn("[ManualSubmit] Fetch error:", err);
      setUiState(formEl, "error");
    }
  }

  function bind(scope = document) {
    if (!isScreeningPage()) return;

    const formEl = getFormEl(scope);
    if (!formEl) return;

    if (formEl.dataset.manualWfSubmitBound === "1") return;
    formEl.dataset.manualWfSubmitBound = "1";

    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!formEl.checkValidity()) {
        formEl.reportValidity();
        return;
      }

      submitToWebflow(formEl);
    }, true);

    console.log("[ManualSubmit] Bound for /request-a-screening ✅");
  }

  document.addEventListener("DOMContentLoaded", () => bind(document));

  if (window.barba) {
    barba.hooks.afterEnter(({ next }) => bind(next?.container || document));
  }
})();

/* =========================================================
  ABOUT CREDITS CRAWL (NO PIN) — EXACT PADDING RULES
========================================================= */
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  function remToPx(rem) {
    const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * fs;
  }

  function initAboutCredits(scope = document) {
    const root = scope && scope.querySelector ? scope : document;
    const wraps = Array.from(root.querySelectorAll(".about-credits-wrap"));
    if (!wraps.length) return;

    wraps.forEach((wrap) => {
      const mask = wrap.querySelector(".about-credits-mask");
      const layout = wrap.querySelector(".about-credits-layout");
      if (!mask || !layout) return;

      if (wrap._creditsST) {
        try { wrap._creditsST.kill(false); } catch (e) {}
        wrap._creditsST = null;
      }
      gsap.killTweensOf(layout);

      const PAD = remToPx(10);

      function computeStartEndY() {
        const mh = mask.clientHeight;
        const lh = layout.scrollHeight;
        const startY = PAD;
        const endY = mh - PAD - lh;
        return { startY, endY, mh, lh };
      }

      const { startY, endY, mh, lh } = computeStartEndY();
      if (lh <= (mh - PAD * 2) + 1) {
        gsap.set(layout, { y: PAD });
        return;
      }

      gsap.set(layout, { y: startY });

      const st = ScrollTrigger.create({
        trigger: wrap,
        start: "top 90%",
        end: "bottom 10%",
        scrub: true,
        invalidateOnRefresh: true,

        onRefresh: () => {
          const vals = computeStartEndY();
          gsap.set(layout, { y: vals.startY });
        },

        onUpdate: (self) => {
          const { startY, endY } = computeStartEndY();
          const y = startY + (endY - startY) * self.progress;
          gsap.set(layout, { y });
        }
      });

      wrap._creditsST = st;
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  document.addEventListener("DOMContentLoaded", () => {
    initAboutCredits(document);
    console.log("[AboutCredits] init (DOMContentLoaded) ✅");
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      try { ScrollTrigger.refresh(); } catch (e) {}
    });
  }

  if (window.barba) {
    barba.hooks.afterEnter(({ next }) => {
      initAboutCredits(next?.container || document);
      console.log("[AboutCredits] init (afterEnter) ✅");
    });

    barba.hooks.after(() => {
      try { ScrollTrigger.refresh(); } catch (e) {}
    });
  }
})();

/* =========================================================
  Footer links: disable current link
========================================================= */
(() => {
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

  document.addEventListener("DOMContentLoaded", () => {
    disableCurrentNavLinks(document);
  });

  if (window.barba) {
    barba.hooks.afterEnter(({ next }) => {
      disableCurrentNavLinks(next?.container || document);
      disableCurrentNavLinks(document);
    });
  }
})();
