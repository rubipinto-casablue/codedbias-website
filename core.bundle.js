/* =========================================================
   CBW APP BUNDLE (Repo) — Refactored v2
   ─────────────────────────────────────────────────────────
   Stable + Core + Page modules + Barba/Wipe

   REFACTOR CHANGES (zero functional changes):
   • Shared helpers extracted to top-level CBW namespace
   • Named constants replace all magic numbers
   • Duplicate qs() / normalizePath() removed
   • Anchor system consolidated (was 4 handlers → 1 unified)
   • Consistent code style and commenting
   • All selectors, timings, class names, and behaviors
     remain 100% identical to the original.
========================================================= */

/* =========================================================
   SHARED UTILITIES
   ─────────────────────────────────────────────────────────
   Single source of truth for helpers used across sections.
   Exposed as window.CBW so every IIFE can reference them.
========================================================= */
window.CBW = (() => {
  "use strict";

  /* ----- DOM ----- */
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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

  /* ----- URL / Path ----- */
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

  function normalizeWithSearch(url) {
    const u = new URL(url, location.origin);
    const p = u.pathname.replace(/\/+$/, "") || "/";
    return p + u.search;
  }

  function isHomeRoute() {
    return normalizePath(window.location.pathname) === "/";
  }

  /* ----- Barba helpers ----- */
  function getBarbaContainer() {
    return document.querySelector('[data-barba="container"]');
  }

  function getBarbaNamespace(container) {
    const c = container || getBarbaContainer();
    if (!c || typeof c.getAttribute !== "function") return "";
    return (c.getAttribute("data-barba-namespace") || "").trim();
  }

  /* ----- Misc ----- */
  function safeEscape(val) {
    try { return CSS.escape(val); }
    catch (e) { return String(val).replace(/"/g, '\\"'); }
  }

  function remToPx(rem) {
    const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * fs;
  }

  function numberWithZero(num) {
    return num < 10 ? "0" + num : String(num);
  }

  /* ----- GSAP promise wrappers ----- */
  function gsapTo(target, vars) {
    return new Promise(resolve =>
      window.gsap.to(target, { ...vars, onComplete: resolve })
    );
  }

  function delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /* ----- Media queries ----- */
  const isMobileMode       = () => window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const isTabletOrBelow    = () => window.matchMedia("(max-width: 991px)").matches;
  const isDesktopPointer   = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    qs, qsa, onReady, safeTry,
    normalizePath, normalizeWithSearch, isHomeRoute,
    getBarbaContainer, getBarbaNamespace,
    safeEscape, remToPx, numberWithZero,
    gsapTo, delay,
    isMobileMode, isTabletOrBelow, isDesktopPointer, prefersReducedMotion
  };
})();


/* =========================================================
   SECTION A — STABLE BUNDLE
   Tour dropdown · Audio · GSAP scroll engine ·
   About credits · Footer links
========================================================= */
(() => {
  if (window.__CBW_APP_BUNDLE_LOADED__ === true) return;
  window.__CBW_APP_BUNDLE_LOADED__ = true;

  const { qs, qsa, onReady, safeTry, normalizePath } = window.CBW;

  /* =========================================================
     1) TOUR DROPDOWN + CURRENT STOP HIGHLIGHT
  ========================================================= */
  function initTourDropdown(root = document) {
    const dd = root.querySelector(".tour_dd");
    if (!dd) return;

    const btn   = dd.querySelector(".tour_dd-toggle");
    const panel = dd.querySelector(".tour_dd-panel");
    if (!btn || !panel) return;

    if (dd.dataset.bound === "1") return;
    dd.dataset.bound = "1";

    if (!panel.id) panel.id = "tour-dd-panel-" + Math.random().toString(16).slice(2);
    btn.setAttribute("aria-controls", panel.id);
    btn.setAttribute("aria-expanded", "false");

    const arrow = btn.querySelector(".nav-toggle-icon");
    const ANIM_DURATION = 0.35;
    const ANIM_EASE     = "power2.out";

    const open = () => {
      dd.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      panel.style.display = "flex";
      if (window.gsap) {
        window.gsap.killTweensOf(panel);
        window.gsap.fromTo(panel,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: ANIM_DURATION, ease: ANIM_EASE }
        );
        if (arrow) window.gsap.to(arrow, { rotation: 180, duration: ANIM_DURATION, ease: ANIM_EASE });
      } else {
        if (arrow) arrow.style.transform = "rotate(180deg)";
      }
    };

    const close = () => {
      btn.setAttribute("aria-expanded", "false");
      if (window.gsap) {
        window.gsap.killTweensOf(panel);
        window.gsap.to(panel, {
          opacity: 0, y: -10, duration: ANIM_DURATION, ease: ANIM_EASE,
          onComplete: () => { panel.style.display = "none"; dd.classList.remove("is-open"); }
        });
        if (arrow) window.gsap.to(arrow, { rotation: 0, duration: ANIM_DURATION, ease: ANIM_EASE });
      } else {
        panel.style.display = "none";
        dd.classList.remove("is-open");
        if (arrow) arrow.style.transform = "rotate(0deg)";
      }
    };
    const toggle = () => dd.classList.contains("is-open") ? close() : open();

    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    document.addEventListener("click", (e) => { if (dd.classList.contains("is-open") && !dd.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    panel.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });

    dd.__open  = open;
    dd.__close = close;
  }

  function closeAllTourDropdowns() {
    document.querySelectorAll(".tour_dd").forEach(dd => {
      dd.classList.remove("is-open");
      const btn = dd.querySelector(".tour_dd-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function markCurrentTourStop(root = document) {
    const currentPath = normalizePath(window.location.href);

    root.querySelectorAll(".tour-stop-link").forEach(a => {
      const isCurrent = normalizePath(a.href) === currentPath;
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

  // Block click on current tour stop link
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".tour-stop-link");
    if (!a) return;
    if (normalizePath(a.href) === normalizePath(window.location.href)) {
      e.preventDefault();
      e.stopPropagation();
      closeAllTourDropdowns();
    }
  }, true);

  /* =========================================================
     2) PERSISTENT AUDIO + LOTTIE SYNC
  ========================================================= */
  function initPersistentAudio() {
    const audio = document.getElementById("bg-audio");
    if (!audio) { console.warn("[Audio] #bg-audio not found"); return; }

    // ── Constants ──
    const STORAGE_KEY        = "bg-audio-playing";
    const TARGET_VOL         = 0.6;
    const FADE_IN_MS         = 900;
    const FADE_OUT_MS        = 600;
    const PAUSE_AFTER_FADE   = 650;
    const FADE_STEPS         = 30;
    const LOTTIE_OPACITY_ON  = 1;
    const LOTTIE_OPACITY_OFF = 0.35;
    const LOTTIE_FADE_MS     = 250;
    const SYNC_DELAY_MS      = 400;
    const BARBA_SYNC_DELAY   = 350;

    function fadeVolume(el, to, ms) {
      const from = el.volume;
      let i = 0;
      const tick = ms / FADE_STEPS;
      const iv = setInterval(() => {
        i++;
        el.volume = from + (to - from) * (i / FADE_STEPS);
        if (i >= FADE_STEPS) clearInterval(iv);
      }, tick);
    }

    function getLottieInstance() {
      return safeTry(() => {
        const wf = window.Webflow?.require?.("lottie");
        if (!wf?.lottie) return null;
        const el = document.getElementById("audioLottie");
        if (!el) return null;
        return (wf.lottie.getRegisteredAnimations?.() || []).find(a => a.wrapper === el) || null;
      });
    }

    function setLottieOpacity(on) {
      const el = document.getElementById("audioLottie");
      if (!el) return;
      const to = on ? LOTTIE_OPACITY_ON : LOTTIE_OPACITY_OFF;
      if (window.gsap) {
        window.gsap.to(el, { opacity: to, duration: LOTTIE_FADE_MS / 1000, overwrite: true, ease: "power2.out" });
      } else {
        el.style.transition = `opacity ${LOTTIE_FADE_MS}ms ease`;
        el.style.opacity = String(to);
      }
    }

    function lottieOff()    { const i = getLottieInstance(); if (!i) return; i.loop = false; i.stop(); i.goToAndStop(0, true); setLottieOpacity(false); }
    function lottieOnLoop() { const i = getLottieInstance(); if (!i) return; i.loop = true;  i.play(); setLottieOpacity(true); }
    function syncLottie()   { audio.paused ? lottieOff() : lottieOnLoop(); }

    // Auto-play on load (unless user explicitly turned it off)
    // Browsers block autoplay without interaction — retry on first click/touch/key
    function startAudio() {
      if (!audio.paused) { console.log("[Audio] already playing"); return; }
      console.log("[Audio] startAudio() called");
      audio.volume = 0;
      const p = audio.play();
      console.log("[Audio] play() returned:", typeof p);
      if (p && p.then) {
        p.then(() => {
          console.log("[Audio] play() succeeded immediately");
          fadeVolume(audio, TARGET_VOL, FADE_IN_MS);
          localStorage.setItem(STORAGE_KEY, "true");
          syncLottie();
        }).catch((err) => {
          console.log("[Audio] play() blocked, registering listeners. Error:", err?.message);
          // Blocked by browser — wait for first interaction
          function onInteraction() {
            console.log("[Audio] onInteraction fired");
            document.removeEventListener("click", onInteraction, true);
            document.removeEventListener("touchstart", onInteraction, true);
            document.removeEventListener("keydown", onInteraction, true);
            audio.volume = 0;
            audio.play().then(() => {
              console.log("[Audio] play() succeeded after interaction");
              fadeVolume(audio, TARGET_VOL, FADE_IN_MS);
              localStorage.setItem(STORAGE_KEY, "true");
              syncLottie();
            }).catch((e2) => { console.log("[Audio] play() failed after interaction:", e2?.message); });
          }
          document.addEventListener("click", onInteraction, { capture: true, once: false });
          document.addEventListener("touchstart", onInteraction, { capture: true, once: false });
          document.addEventListener("keydown", onInteraction, { capture: true, once: false });
        });
      } else {
        console.log("[Audio] play() did not return a promise");
      }
    }

    const lsVal = localStorage.getItem(STORAGE_KEY);
    console.log("[Audio] localStorage =", lsVal);
    startAudio();
    setTimeout(syncLottie, SYNC_DELAY_MS);

    function toggleAudio() {
      if (audio.paused) {
        audio.volume = 0;
        audio.play().catch(() => {});
        fadeVolume(audio, TARGET_VOL, FADE_IN_MS);
        localStorage.setItem(STORAGE_KEY, "true");
        lottieOnLoop();
      } else {
        fadeVolume(audio, 0, FADE_OUT_MS);
        setTimeout(() => audio.pause(), PAUSE_AFTER_FADE);
        localStorage.setItem(STORAGE_KEY, "false");
        lottieOff();
      }
    }

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".audio-toggle")) return;
      e.preventDefault();
      toggleAudio();
    });

    // ── Video-aware audio pause/resume ──
    // Pauses bg audio when lightbox opens, resumes when it closes.
    // Only acts if bg audio was playing before.
    let _pausedByVideo = false;

    function pauseForVideo() {
      if (audio.paused) return;
      _pausedByVideo = true;
      fadeVolume(audio, 0, FADE_OUT_MS);
      setTimeout(() => { if (_pausedByVideo) audio.pause(); }, PAUSE_AFTER_FADE);
      lottieOff();
    }

    function resumeAfterVideo() {
      if (!_pausedByVideo) return;
      _pausedByVideo = false;
      audio.volume = 0;
      audio.play().then(() => {
        fadeVolume(audio, TARGET_VOL, FADE_IN_MS);
        lottieOnLoop();
      }).catch(() => {});
    }

    // Expose globally for external scripts
    window.CBW.bgAudioPause  = pauseForVideo;
    window.CBW.bgAudioResume = resumeAfterVideo;

    // Lightbox — detect Webflow native lightbox (w-lightbox-backdrop)
    function watchLightbox() {
      let wasOpen = false;

      const lbObs = new MutationObserver(() => {
        const backdrop = document.querySelector(".w-lightbox-backdrop");
        const isOpen = !!backdrop && !backdrop.classList.contains("w-lightbox-hide");

        if (isOpen && !wasOpen) pauseForVideo();
        else if (!isOpen && wasOpen) resumeAfterVideo();
        wasOpen = isOpen;
      });

      lbObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    }

    // Custom lightbox (#mglb) — created dynamically, watch body for it
    let _mglbWasOpen = false;

    function checkMglb() {
      const mglb = document.getElementById("mglb");
      const isOpen = !!mglb && mglb.classList.contains("is-open");

      if (isOpen && !_mglbWasOpen) pauseForVideo();
      else if (!isOpen && _mglbWasOpen) resumeAfterVideo();
      _mglbWasOpen = isOpen;
    }

    // The body observer from watchLightbox already watches childList+subtree+attributes
    // so we piggyback on it — but it only watches style/class attributeFilter.
    // We need a separate observer for #mglb since it's created dynamically.
    const mglbObs = new MutationObserver(checkMglb);
    mglbObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    watchLightbox();

    if (window.barba?.hooks) {
      window.barba.hooks.after(() => setTimeout(syncLottie, BARBA_SYNC_DELAY));
    }

    console.log("[Audio] init ✅");
  }

  /* =========================================================
     3) GSAP SCROLL ENGINE
  ========================================================= */
  function initGsapEngine() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn("[GSAPEngine] GSAP/ScrollTrigger not found");
      return;
    }
    window.gsap.registerPlugin(window.ScrollTrigger);

    // ── ScrollTrigger defaults ──
    const ST_START    = "top 65%";
    const ST_END      = "top 25%";
    const ABOUT_START = "top 85%";
    const ABOUT_END   = "top 15%";

    // ── Hero parallax amounts ──
    const HERO_BG_Y_PERCENT   = -15;
    const HERO_CARD_Y_PERCENT = -40;

    let timelines = [];

    function killAll() {
      timelines.forEach(tl => {
        safeTry(() => tl.scrollTrigger?.kill?.());
        safeTry(() => tl.kill?.());
      });
      timelines = [];
    }

    /* -- Text splitting -- */
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
        .map(arr => `<span class="gsap-line" style="display:block;">${arr.join(" ")}</span>`)
        .join("");

      el.dataset.splitLinesReady = "1";
      return el.querySelectorAll(".gsap-line");
    }

    function makeScrubTL(triggerEl, start, end) {
      return window.gsap.timeline({
        scrollTrigger: {
          trigger: triggerEl,
          start: start || ST_START,
          end: end || ST_END,
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    }

    /* -- Animation modules -- */
    function initHeroParallax(container = document) {
      if (!window.gsap || !window.ScrollTrigger) return;

      Array.from(container.querySelectorAll(".hero-main")).forEach(hero => {
        const bg   = hero.querySelector(".hero-bg");
        const card = hero.querySelector(".u-hero-card-wrap");
        if (!bg || !card) return;

        if (hero.__heroParallaxST) {
          try { hero.__heroParallaxST.kill(true); } catch (e) {}
          hero.__heroParallaxST = null;
        }

        window.gsap.set([bg, card], { clearProps: "transform" });
        window.gsap.set([bg, card], { yPercent: 0 });

        const tl = window.gsap.timeline({ defaults: { ease: "none" } })
          .to(bg,   { yPercent: HERO_BG_Y_PERCENT }, 0)
          .to(card, { yPercent: HERO_CARD_Y_PERCENT }, 0);

        hero.__heroParallaxST = window.ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          animation: tl,
          onRefreshInit: () => window.gsap.set([bg, card], { yPercent: 0 })
        });
      });
    }

    function initAboutIntro(container = document) {
      container.querySelectorAll('[data-gsap="about-intro"]').forEach(el => {
        if (el.dataset.aboutIntroInited === "1") return;
        el.dataset.aboutIntroInited = "1";

        const words = splitIntoWords(el, "aboutIntroSplitReady");
        if (!words.length) return;

        window.gsap.set(words, { opacity: 0.2 });

        const tl = window.gsap.timeline({
          scrollTrigger: { trigger: el, start: ABOUT_START, end: ABOUT_END, scrub: true, invalidateOnRefresh: true }
        });
        tl.to(words, { opacity: 1, duration: 0.25, ease: "none", stagger: 0.02 }, 0);
        timelines.push(tl);
      });
    }

    function initTitleBlocks(container = document) {
      container.querySelectorAll('[data-gsap="title-block"]').forEach(block => {
        if (block.dataset.titleBlockInited === "1") return;
        block.dataset.titleBlockInited = "1";

        const eyebrow = block.querySelector(".text-eyebrow");
        const display = block.querySelector(".text-display-2");
        const dotted  = block.querySelector(".dotted-line");

        const tl = makeScrubTL(block, ST_START, ST_END);

        if (eyebrow) {
          const words = splitIntoWords(eyebrow, "titleEyebrowSplitReady");
          if (words.length) { window.gsap.set(words, { opacity: 0 }); tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0); }
        }
        if (display) {
          const words = splitIntoWords(display, "titleDisplaySplitReady");
          if (words.length) { window.gsap.set(words, { opacity: 0 }); tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0.05); }
        }
        if (dotted) {
          window.gsap.set(dotted, { opacity: 0 });
          tl.to(dotted, { opacity: 1, ease: "none" }, 0.10);
        }

        timelines.push(tl);
      });
    }

    function initGridCols(container = document) {
      container.querySelectorAll('[data-gsap="grid-cols"]').forEach(grid => {
        if (grid.dataset.gridInited === "1") return;
        grid.dataset.gridInited = "1";

        let cols = Array.from(grid.children).filter(el => el.classList?.contains("u-grid-col"));
        if (!cols.length) cols = Array.from(grid.querySelectorAll(".u-grid-col"));
        if (!cols.length) return;

        window.gsap.set(cols, { opacity: 0 });
        const tl = makeScrubTL(grid, ST_START, ST_END);
        tl.to(cols, { opacity: 1, ease: "none", stagger: 0.15 }, 0);
        timelines.push(tl);
      });
    }

    function initLinesStagger(container = document) {
      container.querySelectorAll('[data-gsap="lines-stagger"]').forEach(el => {
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
      container.querySelectorAll('[data-gsap="fade-simple"]').forEach(el => {
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

    onReady(() => {
      killAll();
      initAll(document);
      safeTry(() => window.ScrollTrigger.refresh());
      console.log("[GSAPEngine] init (DOMContentLoaded) ✅");
    });

    if (window.barba?.hooks) {
      window.barba.hooks.afterLeave(() => killAll());
      window.barba.hooks.afterEnter(({ next }) => {
        const container = next?.container || document;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            initAll(container);
            safeTry(() => window.ScrollTrigger.refresh());
            console.log("[GSAPEngine] init (afterEnter) ✅");
          });
        });
      });
    }
  }

  /* =========================================================
     4) ABOUT CREDITS CRAWL (NO PIN)
  ========================================================= */
  function initAboutCreditsCrawl() {
    if (!window.gsap || !window.ScrollTrigger) return;
    window.gsap.registerPlugin(window.ScrollTrigger);

    const { remToPx, isMobileMode } = window.CBW;
    const CREDITS_PAD_REM        = 10;
    const CREDITS_PAD_MOBILE_REM = 20;

    function init(scope = document) {
      const root = scope && scope.querySelector ? scope : document;

      Array.from(root.querySelectorAll(".about-credits-wrap")).forEach(wrap => {
        const mask   = wrap.querySelector(".about-credits-mask");
        const layout = wrap.querySelector(".about-credits-layout");
        if (!mask || !layout) return;

        if (wrap._creditsST) {
          safeTry(() => wrap._creditsST.kill(false));
          wrap._creditsST = null;
        }
        window.gsap.killTweensOf(layout);

        const PAD = remToPx(isMobileMode() ? CREDITS_PAD_MOBILE_REM : CREDITS_PAD_REM);

        function computeStartEndY() {
          const mh = mask.clientHeight;
          const lh = layout.scrollHeight;
          return { startY: PAD, endY: mh - PAD - lh, mh, lh };
        }

        const { startY, endY, mh, lh } = computeStartEndY();
        if (lh <= (mh - PAD * 2) + 1) {
          window.gsap.set(layout, { y: PAD });
          return;
        }

        window.gsap.set(layout, { y: startY });

        wrap._creditsST = window.ScrollTrigger.create({
          trigger: wrap,
          start: "top 90%",
          end: "bottom 10%",
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh: () => window.gsap.set(layout, { y: computeStartEndY().startY }),
          onUpdate: (self) => {
            const v = computeStartEndY();
            window.gsap.set(layout, { y: v.startY + (v.endY - v.startY) * self.progress });
          }
        });
      });

      requestAnimationFrame(() => safeTry(() => window.ScrollTrigger.refresh()));
    }

    onReady(() => { init(document); console.log("[AboutCredits] init (DOMContentLoaded) ✅"); });

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => safeTry(() => window.ScrollTrigger.refresh()));
    }

    if (window.barba?.hooks) {
      window.barba.hooks.afterEnter(({ next }) => { init(next?.container || document); console.log("[AboutCredits] init (afterEnter) ✅"); });
      window.barba.hooks.after(() => safeTry(() => window.ScrollTrigger.refresh()));
    }
  }

  /* =========================================================
     5) DISABLE CURRENT FOOTER LINKS
  ========================================================= */
  function initDisableCurrentFooterLinks() {
    const { normalizeWithSearch } = window.CBW;
    const NAV_SELECTOR = ".u-footer-link-wrap";

    function disableCurrentNavLinks(scope = document) {
      const current = normalizeWithSearch(location.href);

      scope.querySelectorAll(NAV_SELECTOR).forEach(a => {
        if (a.classList.contains("w-lightbox") || a.closest(".w-lightbox")) return;
        if (a.hash) return; // Never disable anchor links

        const isCurrent = normalizeWithSearch(a.href) === current;
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

    disableCurrentNavLinks(document);

    if (window.barba?.hooks) {
      window.barba.hooks.afterEnter(({ next }) => {
        disableCurrentNavLinks(next?.container || document);
        disableCurrentNavLinks(document);
      });
    }
  }

  /* =========================================================
     BOOT STABLE
  ========================================================= */
  onReady(() => {
    initTourDropdown(document);
    markCurrentTourStop(document);
    initPersistentAudio();
    initGsapEngine();
    initAboutCreditsCrawl();
    initDisableCurrentFooterLinks();

    if (window.barba?.hooks) {
      window.barba.hooks.beforeLeave(() => closeAllTourDropdowns());
      window.barba.hooks.afterEnter(({ next }) => {
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


/* =========================================================
   SECTION B — NAV + TOURS SWIPER
   Desktop: drag + wheel + keyboard
   Mobile: swipe + keyboard
   Drag works even when <a> covers the entire slide
========================================================= */
(() => {
  if (window.__NAV_PUSH_AND_SWIPER_INIT__) return;
  window.__NAV_PUSH_AND_SWIPER_INIT__ = true;

  const { qs, isMobileMode, prefersReducedMotion, isHomeRoute } = window.CBW;

  // ── Selectors ──
  const SEL = {
    navBtn:          ".main-hb-menu",
    pageWrap:        "#page-wrap",
    navPanel:        ".nav-panel",
    backdrop:        ".nav-backdrop",
    toursSwiperRoot: ".nav-tours-wrapper.swiper",
    iconOpen:        ".nav-toggle-icon.is-open",
    iconClose:       ".nav-toggle-icon.is-close"
  };

  // ── Timing constants ──
  const NAV_DURATION       = 1.2;    // seconds — main nav timeline
  const NAV_ICON_DURATION  = 0.6;    // seconds — icon swap
  const NAV_BACKDROP_DUR   = 0.35;   // seconds — backdrop fade
  const SWIPER_UPDATE_DELAY = 150;   // ms — delay before swiper update on open
  const SWIPER_SPACE       = 18;     // px — spaceBetween
  const SWIPER_SPEED       = 650;    // ms — slide transition
  const DRAG_DEADZONE      = 12;     // px — threshold to distinguish drag vs click
  const ICON_TRAVEL        = "3rem"; // icon slide distance
  const DESKTOP_THRESHOLD  = 15;     // px — swiper touch threshold
  const MOBILE_THRESHOLD   = 10;

  const navBtn   = document.querySelector(SEL.navBtn);
  const pageWrap = document.querySelector(SEL.pageWrap);
  const navPanel = document.querySelector(SEL.navPanel);
  const backdrop = document.querySelector(SEL.backdrop);

  if (!navBtn || !pageWrap || !navPanel || !backdrop) {
    console.warn("[NAV] Missing elements.", SEL);
    return;
  }
  if (!window.gsap) {
    console.warn("[NAV] GSAP is not loaded.");
    return;
  }

  const iconOpen  = navBtn.querySelector(SEL.iconOpen);
  const iconClose = navBtn.querySelector(SEL.iconClose);

  if (iconOpen && iconClose) {
    window.gsap.set(iconOpen,  { y: "0rem" });
    window.gsap.set(iconClose, { y: ICON_TRAVEL });
  } else {
    console.warn("[NAV] Toggle icons not found (optional).");
  }

  window.gsap.set(backdrop,  { opacity: 0, pointerEvents: "none" });
  window.gsap.set(navPanel,  { pointerEvents: "none" });

  let savedScrollY = 0;

  function lockScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = "fixed";
    document.body.style.top   = `-${savedScrollY}px`;
    document.body.style.left  = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.body.style.position = "";
    document.body.style.top   = "";
    document.body.style.left  = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, savedScrollY);
  }

  let navToursSwiper = null;

  function getSitePaddingPx() {
    const test = document.createElement("div");
    test.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:calc(var(--_site-settings---site-padding))";
    document.body.appendChild(test);
    const px = test.getBoundingClientRect().width;
    test.remove();
    return Number.isFinite(px) ? px : 0;
  }

  function ensureNavToursEndSpacer(sw) {
    if (!sw?.el) return;
    const wrapper = sw.el.querySelector(".swiper-wrapper");
    if (!wrapper) return;

    const prev = wrapper.querySelector(".nav-tour-spacer");
    if (prev) prev.remove();

    const realSlides = Array.from(wrapper.children).filter(
      el => el.classList?.contains("swiper-slide") && !el.classList.contains("nav-tour-spacer")
    );
    const last = realSlides[realSlides.length - 1];
    if (!last) return;

    const needed = Math.max(
      sw.el.getBoundingClientRect().width - last.getBoundingClientRect().width - (sw.params.slidesOffsetBefore || 0),
      0
    );

    const spacer = document.createElement("div");
    spacer.className = "swiper-slide nav-tour-spacer";
    spacer.style.cssText = `width:${needed}px;flex:0 0 auto;pointer-events:none;opacity:0`;
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

  /* ----- Drag-through-links guard ----- */
  function attachDragThroughLinks(swiperEl) {
    let startX = null, startY = null, isDragging = false, targetLink = null, isTracking = false;

    const getLinks   = () => swiperEl.querySelectorAll(".swiper-slide a");
    const disable    = () => getLinks().forEach(a => { a.style.pointerEvents = "none"; });
    const enable     = () => getLinks().forEach(a => { a.style.pointerEvents = ""; });

    swiperEl.addEventListener("pointerdown", (e) => {
      targetLink = e.target.closest("a");
      startX = e.clientX; startY = e.clientY;
      isDragging = false; isTracking = true;
      disable();
    });

    swiperEl.addEventListener("pointermove", (e) => {
      if (!isTracking || startX === null || isDragging) return;
      if (Math.abs(e.clientX - startX) > DRAG_DEADZONE || Math.abs(e.clientY - startY) > DRAG_DEADZONE) {
        isDragging = true;
      }
    });

    function handleEnd() {
      if (!isTracking) return;
      const wasDrag = isDragging;
      const link = targetLink;
      enable();
      startX = startY = null; isDragging = false; targetLink = null; isTracking = false;
      if (!wasDrag && link) requestAnimationFrame(() => link.click());
    }

    swiperEl.addEventListener("pointerup", handleEnd);
    swiperEl.addEventListener("pointercancel", handleEnd);
    swiperEl.addEventListener("click", (e) => { if (isDragging) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  /* ----- Active slide finder ----- */
  function findActiveTourSlideIndex(sw) {
    if (!sw?.slides) return 0;
    const { normalizePath } = window.CBW;
    const currentPath = normalizePath(location.href);

    const slides = Array.from(sw.slides).filter(
      el => el.classList?.contains("swiper-slide") && !el.classList.contains("nav-tour-spacer")
    );

    for (let i = 0; i < slides.length; i++) {
      const a = slides[i].querySelector("a[href]");
      if (!a) continue;
      if (normalizePath(a.getAttribute("href")) === currentPath) return i;
    }
    return 0;
  }

  /* ----- Swiper init ----- */
  function initNavToursSwiper(scope = document) {
    if (!window.Swiper) { console.warn("[NavToursSwiper] Swiper not loaded."); return; }

    const root = scope.querySelector(SEL.toursSwiperRoot);
    if (!root) return;

    const isMobile = isMobileMode();
    const reduceMotion = prefersReducedMotion();

    if (navToursSwiper) {
      try { navToursSwiper.destroy(true, true); } catch (e) {}
      navToursSwiper = null;
    }

    const sharedInteraction = {
      allowTouchMove: true, simulateTouch: true, touchStartPreventDefault: false,
      preventClicks: false, preventClicksPropagation: false,
      slideToClickedSlide: false, cssMode: false, noSwiping: false,
    };

    navToursSwiper = new window.Swiper(root, {
      ...sharedInteraction,
      ...(isMobile
        ? { mousewheel: false, threshold: MOBILE_THRESHOLD }
        : { mousewheel: { forceToAxis: true, sensitivity: 1 }, threshold: DESKTOP_THRESHOLD }
      ),

      freeMode: false,
      slidesPerView: "auto",
      slidesPerGroup: 1,
      centeredSlides: false,
      slidesOffsetBefore: getSitePaddingPx(),
      slidesOffsetAfter: 0,
      spaceBetween: SWIPER_SPACE,
      speed: reduceMotion ? 0 : SWIPER_SPEED,
      grabCursor: true,
      watchOverflow: true,
      observer: true,
      observeParents: true,
      keyboard: { enabled: true, onlyInViewport: true, pageUpDown: false },

      on: {
        init(sw) {
          sw.__isMobileMode = isMobile;
          ensureNavToursEndSpacer(sw);
          sw.update();
          applyEndHardStop(sw);
          attachDragThroughLinks(sw.el);
        },
        resize(sw) {
          ensureNavToursEndSpacer(sw);
          sw.update();
          applyEndHardStop(sw);
        },
        slideChange(sw) {
          if (sw.activeIndex === sw.slides.length - 1) sw.slideTo(computeLastRealIndex(sw), 0);
          applyEndHardStop(sw);
        }
      }
    });

    window.navToursSwiper = navToursSwiper;
  }

  function updateNavToursSwiper() {
    const sw = window.navToursSwiper;
    if (!sw) return;

    if (sw.__isMobileMode !== isMobileMode()) {
      initNavToursSwiper(document);
      return;
    }

    sw.params.slidesOffsetBefore = getSitePaddingPx();
    ensureNavToursEndSpacer(sw);
    sw.update(); sw.updateSlides(); sw.updateProgress(); sw.updateSlidesClasses();
    applyEndHardStop(sw);
  }

  /* =========================================================
     NAV OPEN / CLOSE
  ========================================================= */
  let isOpen = false;

  const navTL = window.gsap.timeline({
    paused: true,
    defaults: { ease: "power3.inOut", duration: NAV_DURATION }
  });

  navTL
    .to(pageWrap, { x: () => -navPanel.getBoundingClientRect().width }, 0)
    .to(pageWrap, { opacity: 0.6, filter: "blur(6px)" }, 0)
    .to(backdrop,  { opacity: 1, duration: NAV_BACKDROP_DUR }, 0)
    .to(navPanel,  { x: "0%", opacity: 1 }, 0);

  if (iconOpen && iconClose) {
    navTL.to(iconOpen,  { y: `-${ICON_TRAVEL}`, duration: NAV_ICON_DURATION, ease: "power2.inOut" }, 0);
    navTL.to(iconClose, { y: "0rem",            duration: NAV_ICON_DURATION, ease: "power2.inOut" }, 0);
  }

  navTL.eventCallback("onReverseComplete", () => {
    unlockScroll();
    if (iconOpen && iconClose) {
      window.gsap.set(iconOpen,  { y: "0rem" });
      window.gsap.set(iconClose, { y: ICON_TRAVEL });
    }
  });

  function openNav() {
    if (isOpen) return;
    isOpen = true;

    window.gsap.set(backdrop,  { pointerEvents: "auto" });
    window.gsap.set(navPanel,  { pointerEvents: "auto" });
    lockScroll();
    navTL.play(0);

    setTimeout(() => {
      updateNavToursSwiper();
      const sw = window.navToursSwiper;
      if (sw?.slideTo) {
        sw.slideTo(findActiveTourSlideIndex(sw), 0);
        sw.update();
      }
    }, SWIPER_UPDATE_DELAY);
  }

  function closeNav() {
    if (!isOpen && navTL.progress() === 0) return;
    isOpen = false;

    window.gsap.set(backdrop,  { pointerEvents: "none" });
    window.gsap.set(navPanel,  { pointerEvents: "none" });
    navTL.reverse();

    try { window.ScrollTrigger?.refresh?.(); } catch (e) {}
  }

  function toggleNav() { isOpen ? closeNav() : openNav(); }

  navBtn.addEventListener("click",  (e) => { e.preventDefault(); toggleNav(); });
  backdrop.addEventListener("click", () => closeNav());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });

  // Home link: if already home, just close nav + return to intro
  document.addEventListener("click", (e) => {
    const homeLink = e.target.closest("a.nav-home-link");
    if (!homeLink || !isHomeRoute()) return;

    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    closeNav();

    if (document.documentElement.classList.contains("is-home-slider") && typeof window.homePanelsGoToIntro === "function") {
      window.homePanelsGoToIntro();
    }
  }, true);

  navPanel.addEventListener("click", (e) => { if (e.target.closest("a")) closeNav(); });

  window.addEventListener("resize", () => {
    if (!isOpen) return;
    window.gsap.set(pageWrap, { x: -navPanel.getBoundingClientRect().width });
    updateNavToursSwiper();
  });

  document.addEventListener("DOMContentLoaded", () => initNavToursSwiper(document));

  if (window.barba?.hooks) {
    window.barba.hooks.afterEnter((data) => initNavToursSwiper(data?.next?.container || document));
    window.barba.hooks.beforeLeave(() => closeNav());
  }
})();


/* =========================================================
   SECTION C — MEDIA MODULE (Barba-safe) — v2.1
   Lightbox (Swiper) images + YouTube (NO autoplay)
   Finsweet v2 list restart · ?stop= param · Mobile filter nav
========================================================= */
(() => {
  if (window.__MEDIA_MODULE__) return;
  window.__MEDIA_MODULE__ = true;

  const { getBarbaContainer, getBarbaNamespace, safeEscape } = window.CBW;

  const NS = "media";

  // ── Constants ──
  const TRIGGER_SELECTOR    = ".js-pswp";
  const VISUAL_SELECTOR     = ".js-visual";
  const FS_TIMEOUT_MS       = 6000;
  const FS_POLL_MS          = 50;
  const STOP_POLL_MS        = 150;
  const STOP_MAX_TRIES      = 40;
  const LIGHTBOX_Z          = 9999;
  const MODAL_HIDE_DELAY_MS = 200;
  const SWIPER_INIT_DELAY   = 50;
  const SWIPER_UPDATE_DELAY = 60;
  const MODAL_ID            = "mglb";
  const MODAL_STYLES_ID     = "mglb-styles";

  // ── Filter nav constants ──
  const FILTER_BTN_SEL  = ".media-filter-btn";
  const FILTER_ICON_SEL = ".media-filter-btn-icon";
  const FILTER_MENU_SEL = ".media_filter_block";
  const FILTER_KEYS     = ["is-tour", "is-country", "is-type"];
  const ICON_ROTATE_OPEN  = "rotate(0deg)";
  const ICON_ROTATE_CLOSED = "rotate(45deg)";
  const ICON_TRANSITION   = "transform 220ms ease";

  const state = {
    container: null,
    stopIntervalId: null,
    onDocClick: null,
    mainSwiper: null,
    thumbsSwiper: null,
    __mnav: null
  };

  function getContainer() {
    return state.container || getBarbaContainer();
  }

  function isInMedia() {
    return getBarbaNamespace(getContainer()) === NS;
  }

  function getStopParam() {
    return (new URLSearchParams(window.location.search).get("stop") || "").trim().toLowerCase();
  }

  function clearStopInterval() {
    if (state.stopIntervalId) { clearInterval(state.stopIntervalId); state.stopIntervalId = null; }
  }

  /* ─── Finsweet v2 restart ─── */
  async function restartFsList(timeoutMs = FS_TIMEOUT_MS) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeoutMs) {
      if (window.FinsweetAttributes) break;
      await new Promise(r => setTimeout(r, FS_POLL_MS));
    }

    const FA = window.FinsweetAttributes;
    if (!FA) { console.warn("[FS] FinsweetAttributes not found."); return false; }

    if (FA.modules?.list?.restart) {
      try { await FA.modules.list.restart(); console.log("[FS] list.restart() ✅"); return true; } catch (e) { console.warn("[FS] list.restart() failed:", e); }
    }

    if (typeof FA.load === "function") {
      try {
        await FA.load("list");
        if (FA.modules?.list?.restart) { await FA.modules.list.restart(); console.log("[FS] load+restart ✅"); return true; }
      } catch (e) { console.warn("[FS] load('list') failed:", e); }
    }

    console.warn("[FS] list module not available.");
    return false;
  }

  function clickBest(target) {
    if (!target) return false;
    const input = target.querySelector?.('input[type="checkbox"], input[type="radio"]');
    if (input) { if (!input.checked) input.click(); return true; }
    const label = target.querySelector?.("label");
    if (label) { label.click(); return true; }
    target.click?.();
    return true;
  }

  function applyStopParam(scope) {
    const stop = getStopParam();
    if (!stop) return false;
    const el = scope.querySelector(`[fs-list-value="${safeEscape(stop)}"]`);
    return el ? clickBest(el) : false;
  }

  function bootStopParam(scope) {
    clearStopInterval();
    if (!getStopParam()) return;
    let tries = 0;
    state.stopIntervalId = setInterval(() => {
      tries++;
      if (applyStopParam(scope) || tries >= STOP_MAX_TRIES) clearStopInterval();
    }, STOP_POLL_MS);
  }

  async function bootFinsweetList(scope) {
    await restartFsList(FS_TIMEOUT_MS);
    try { bootStopParam(scope); } catch (e) {}
  }

  /* ─── Mobile filter nav ─── */
  function bindMobileFilterNav(scope) {
    if (!scope || scope.__mobileFilterNavBound) return;
    scope.__mobileFilterNavBound = true;

    const { isTabletOrBelow } = window.CBW;

    state.__mnav = state.__mnav || { onClick: null, onDocClick: null, onResize: null, isOpenKey: null };

    function keyFromClassList(el) {
      if (!el) return null;
      return FILTER_KEYS.find(k => el.classList.contains(k)) || null;
    }

    const allBtns  = () => Array.from(scope.querySelectorAll(FILTER_KEYS.map(k => `${FILTER_BTN_SEL}.${k}`).join(", ")));
    const allMenus = () => Array.from(scope.querySelectorAll(FILTER_KEYS.map(k => `${FILTER_MENU_SEL}.${k}`).join(", ")));
    const menuFor  = (key) => key ? scope.querySelector(`${FILTER_MENU_SEL}.${key}`) : null;
    const btnFor   = (key) => key ? scope.querySelector(`${FILTER_BTN_SEL}.${key}`) : null;

    function setBtnIcon(btn, open) {
      const icon = btn?.querySelector(FILTER_ICON_SEL);
      if (!icon) return;
      icon.style.transition = icon.style.transition || ICON_TRANSITION;
      icon.style.transform  = open ? ICON_ROTATE_OPEN : ICON_ROTATE_CLOSED;
    }

    function closeAll() {
      allMenus().forEach(m => { m.style.display = "none"; m.setAttribute("aria-hidden", "true"); });
      allBtns().forEach(b => { b.classList.remove("is-open"); b.setAttribute("aria-expanded", "false"); setBtnIcon(b, false); });
      state.__mnav.isOpenKey = null;
    }

    function openKey(key) {
      const menu = menuFor(key), btn = btnFor(key);
      if (!menu || !btn) return;
      closeAll();
      menu.style.display = "block"; menu.setAttribute("aria-hidden", "false");
      btn.classList.add("is-open"); btn.setAttribute("aria-expanded", "true");
      setBtnIcon(btn, true);
      state.__mnav.isOpenKey = key;
    }

    function toggleKey(key) { state.__mnav.isOpenKey === key ? closeAll() : openKey(key); }

    state.__mnav.onClick = (e) => {
      if (!isTabletOrBelow()) return;
      const btn = e.target?.closest?.(FILTER_BTN_SEL);
      if (!btn) return;
      const key = keyFromClassList(btn);
      if (!key) return;
      e.preventDefault(); e.stopPropagation();
      toggleKey(key);
    };

    state.__mnav.onDocClick = (e) => {
      if (!isTabletOrBelow() || !state.__mnav.isOpenKey) return;
      if (e.target?.closest?.(FILTER_BTN_SEL) || e.target?.closest?.(FILTER_MENU_SEL)) return;
      closeAll();
    };

    scope.addEventListener("click", state.__mnav.onClick, true);
    document.addEventListener("click", state.__mnav.onDocClick, true);

    if (isTabletOrBelow()) closeAll();

    state.__mnav.onResize = () => { if (!isTabletOrBelow()) closeAll(); };
    window.addEventListener("resize", state.__mnav.onResize);
  }

  function unbindMobileFilterNav(scope) {
    const m = state.__mnav;
    if (!m) return;
    try {
      if (scope && m.onClick) scope.removeEventListener("click", m.onClick, true);
      if (m.onDocClick) document.removeEventListener("click", m.onDocClick, true);
      if (m.onResize) window.removeEventListener("resize", m.onResize);
    } catch (e) {}
    state.__mnav = null;
    if (scope) scope.__mobileFilterNavBound = false;
  }

  /* ─── Lightbox modal (Swiper) ─── */
  function ensureModalStylesOnce() {
    if (document.getElementById(MODAL_STYLES_ID)) return;
    const style = document.createElement("style");
    style.id = MODAL_STYLES_ID;
    style.textContent = `
#mglb.mglb{position:fixed;inset:0;z-index:${LIGHTBOX_Z};opacity:0;pointer-events:none;visibility:hidden;transition:opacity .18s ease,visibility 0s linear .18s}
#mglb.mglb.is-open{opacity:1;pointer-events:auto;visibility:visible;transition:opacity .18s ease}
#mglb.mglb>.mglb__backdrop{position:fixed;inset:0;width:100%;height:100%;border-radius:0;background:rgba(0,0,0,.72);z-index:0;pointer-events:auto}
#mglb.mglb>.mglb__panel{position:fixed;inset:0;z-index:1;width:100%;height:100%;padding:28px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px}
@media(max-width:767px){#mglb.mglb>.mglb__panel{padding:16px}}
#mglb .mglb__main{width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
#mglb .mglb__main .swiper-wrapper{align-items:center}
#mglb .mglb__main .swiper-slide{display:flex;align-items:center;justify-content:center}
#mglb .mglb__main img{max-width:100%;max-height:100%;object-fit:contain;display:block}
#mglb .mglb__thumbs{width:100%;padding:0 0 4px}
#mglb .mglb__thumbs .swiper-slide{width:84px;height:58px;opacity:.45;transition:opacity .18s ease}
#mglb .mglb__thumbs .swiper-slide-thumb-active{opacity:1}
#mglb button[data-mglb-close],#mglb .mglb__prev,#mglb .mglb__next{width:44px;height:44px;border-radius:999px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.22);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;backdrop-filter:blur(6px)}
#mglb button[data-mglb-close]{position:absolute;top:22px;right:22px;z-index:10}
#mglb .mglb__prev{position:absolute;left:22px;top:50%;transform:translateY(-50%);z-index:10}
#mglb .mglb__next{position:absolute;right:22px;top:50%;transform:translateY(-50%);z-index:10}
@media(max-width:767px){#mglb button[data-mglb-close]{top:14px;right:14px}#mglb .mglb__prev{left:14px}#mglb .mglb__next{right:14px}}
html.mglb-lock,body.mglb-lock{overflow:hidden!important}`;
    document.head.appendChild(style);
  }

  function ensureModalExists() {
    ensureModalStylesOnce();
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "mglb";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="mglb__backdrop" data-mglb-backdrop></div>
      <div class="mglb__panel">
        <button type="button" data-mglb-close aria-label="Close">✕</button>
        <div class="mglb__main swiper"><div class="swiper-wrapper" id="mglbMainWrapper"></div></div>
        <div class="mglb__thumbs swiper"><div class="swiper-wrapper" id="mglbThumbsWrapper"></div></div>
        <button type="button" class="mglb__prev" aria-label="Previous">‹</button>
        <button type="button" class="mglb__next" aria-label="Next">›</button>
      </div>`;
    document.body.appendChild(modal);

    if (!modal.__mglbBound) {
      modal.__mglbBound = true;
      modal.addEventListener("click", (e) => {
        if (e.target?.closest?.("[data-mglb-close]") || e.target?.closest?.("[data-mglb-backdrop]")) closeModal();
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
      mainRoot:  modal.querySelector(".mglb__main.swiper"),
      thumbsRoot: modal.querySelector(".mglb__thumbs.swiper"),
      mainW:     modal.querySelector("#mglbMainWrapper"),
      thumbsW:   modal.querySelector("#mglbThumbsWrapper"),
      nextEl:    modal.querySelector(".mglb__next"),
      prevEl:    modal.querySelector(".mglb__prev")
    };
  }

  function destroySwipers() {
    try { state.mainSwiper?.destroy?.(true, true); }   catch (e) {}
    try { state.thumbsSwiper?.destroy?.(true, true); } catch (e) {}
    state.mainSwiper = state.thumbsSwiper = null;
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
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("mglb-lock");
    document.body.classList.remove("mglb-lock");
    destroySwipers();
    clearWrappers();
    modal.style.pointerEvents = "none";
    window.clearTimeout(modal.__hideT);
    modal.__hideT = window.setTimeout(() => { modal.style.visibility = "hidden"; }, MODAL_HIDE_DELAY_MS);
  }

  /* -- Thumbnail / video extraction -- */
  function getThumbSrcFromTrigger(trigger) {
    const visual = trigger.querySelector(VISUAL_SELECTOR);
    if (visual) {
      if ((visual.tagName || "").toLowerCase() === "img") return visual.currentSrc || visual.src || null;
      const innerImg = visual.querySelector?.("img");
      if (innerImg) return innerImg.currentSrc || innerImg.src || null;
      const bg = getComputedStyle(visual).backgroundImage;
      if (bg && bg !== "none") { const m = bg.match(/url\(["']?(.*?)["']?\)/); if (m?.[1]) return m[1]; }
    }
    const img = trigger.querySelector("img");
    return img ? (img.currentSrc || img.src || null) : null;
  }

  function getVideoUrlFromTrigger(t)  { return (t.getAttribute("data-video") || "").trim(); }
  function getVideoIdFromTrigger(t)   { return (t.getAttribute("data-video-id") || "").trim(); }

  function parseYouTubeId(input) {
    const s = (input || "").trim();
    if (!s) return "";
    if (/^[a-zA-Z0-9_-]{10,15}$/.test(s) && !s.includes("http")) return s;
    try {
      const u = new URL(s);
      const host = (u.hostname || "").replace("www.", "");
      if (host === "youtu.be") return (u.pathname || "").slice(1);
      if (host.includes("youtube.com")) {
        const v = u.searchParams.get("v"); if (v) return v;
        let m = u.pathname.match(/\/embed\/([^/]+)/);  if (m?.[1]) return m[1];
            m = u.pathname.match(/\/shorts\/([^/]+)/); if (m?.[1]) return m[1];
      }
    } catch (e) {}
    return "";
  }

  function isVisible(el) { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; }

  function getScopeRoot(trigger) {
    return trigger.closest(".w-dyn-list") || trigger.closest(".w-dyn-items") || getContainer() || document;
  }

  function buildScopedGallery(clickedTrigger) {
    const triggers = Array.from(getScopeRoot(clickedTrigger).querySelectorAll(TRIGGER_SELECTOR)).filter(isVisible);
    const items = [];
    let startIndex = 0;

    triggers.forEach(t => {
      const thumb   = getThumbSrcFromTrigger(t) || "";
      const videoId = getVideoIdFromTrigger(t) || parseYouTubeId(getVideoUrlFromTrigger(t));

      if (videoId) {
        if (t === clickedTrigger) startIndex = items.length;
        items.push({ type: "video", videoId, thumb });
        return;
      }
      const src = getThumbSrcFromTrigger(t);
      if (!src) return;
      if (t === clickedTrigger) startIndex = items.length;
      items.push({ type: "image", src, thumb: thumb || src });
    });

    return { items, startIndex };
  }

  function mountSlides(items) {
    const { mainW, thumbsW } = getModalRefs();
    if (!mainW || !thumbsW) return;
    mainW.innerHTML = ""; thumbsW.innerHTML = "";

    items.forEach(it => {
      const s = document.createElement("div");
      s.className = "swiper-slide";
      if (it.type === "video" && it.videoId) {
        s.innerHTML = `<div class="mglb__video" style="width:min(1100px,100%);aspect-ratio:16/9;max-height:100%;border-radius:10px;overflow:hidden;">
          <iframe class="mglb__iframe" src="https://www.youtube-nocookie.com/embed/${it.videoId}?controls=1&modestbranding=1&playsinline=1&rel=0"
            title="YouTube video" frameborder="0" allow="encrypted-media;picture-in-picture" allowfullscreen style="width:100%;height:100%;display:block;"></iframe></div>`;
      } else {
        s.innerHTML = `<img src="${it.src}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;display:block;">`;
      }
      mainW.appendChild(s);
    });

    items.forEach(it => {
      const s = document.createElement("div");
      s.className = "swiper-slide";
      s.innerHTML = `<div style="position:relative;width:100%;height:100%;">${it.thumb ? `<img src="${it.thumb}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : ""}</div>`;
      thumbsW.appendChild(s);
    });
  }

  function setActiveThumb(idx) {
    if (!state.thumbsSwiper) return;
    try {
      state.thumbsSwiper.slides.forEach(sl => sl.classList.remove("swiper-slide-thumb-active"));
      const active = state.thumbsSwiper.slides[idx];
      if (active) active.classList.add("swiper-slide-thumb-active");
      state.thumbsSwiper.slideTo(idx, 250);
      state.thumbsSwiper.update();
    } catch (e) {}
  }

  function initSwipers(startIndex) {
    if (!window.Swiper) { console.warn("[MGLB] Swiper not loaded."); return; }
    const { mainRoot, thumbsRoot, nextEl, prevEl } = getModalRefs();
    if (!mainRoot || !thumbsRoot) return;

    destroySwipers();

    state.thumbsSwiper = new window.Swiper(thumbsRoot, {
      slidesPerView: "auto", spaceBetween: 8, watchSlidesProgress: true,
      grabCursor: true, observer: true, observeParents: true
    });

    state.mainSwiper = new window.Swiper(mainRoot, {
      initialSlide: startIndex,
      navigation: (nextEl && prevEl) ? { nextEl, prevEl } : undefined,
      observer: true, observeParents: true
    });

    state.thumbsSwiper.on("click", () => {
      const idx = state.thumbsSwiper.clickedIndex;
      if (typeof idx === "number" && idx >= 0) state.mainSwiper?.slideTo?.(idx);
    });

    state.mainSwiper.on("slideChange", () => setActiveThumb(state.mainSwiper.activeIndex));

    state.mainSwiper.slideTo(startIndex, 0);
    state.thumbsSwiper.slideTo(startIndex, 0);
    setActiveThumb(startIndex);

    setTimeout(() => {
      try { state.mainSwiper?.update?.(); }   catch (e) {}
      try { state.thumbsSwiper?.update?.(); } catch (e) {}
      setActiveThumb(state.mainSwiper?.activeIndex ?? startIndex);
    }, SWIPER_UPDATE_DELAY);
  }

  /* ─── Boot / Destroy (public) ─── */
  async function MediaBoot(container) {
    state.container = container || getContainer();
    if (!isInMedia()) return;

    await bootFinsweetList(state.container || document);
    bindMobileFilterNav(state.container || document);

    if (typeof window.MediaPatchBoot === "function") {
      try { window.MediaPatchBoot(state.container || document); } catch (e) {}
    }

    if (!state.onDocClick) {
      state.onDocClick = (e) => {
        if (!isInMedia()) return;
        const modal = document.getElementById(MODAL_ID);
        if (modal?.classList.contains("is-open")) return;

        const trigger = e.target.closest(TRIGGER_SELECTOR);
        if (!trigger) return;

        e.preventDefault(); e.stopPropagation();
        const { items, startIndex } = buildScopedGallery(trigger);
        if (!items.length) { console.warn("[MGLB] No items found."); return; }

        openModal();
        mountSlides(items);
        setTimeout(() => initSwipers(startIndex), SWIPER_INIT_DELAY);
      };
      document.addEventListener("click", state.onDocClick, true);
    }

    console.log("[Media] boot ✅ (fs-list restarted)");
  }

  function MediaDestroy() {
    clearStopInterval();
    try { closeModal(); }      catch (e) {}
    try { destroySwipers(); }  catch (e) {}

    if (state.onDocClick) {
      document.removeEventListener("click", state.onDocClick, true);
      state.onDocClick = null;
    }

    try { unbindMobileFilterNav(state.container || document); } catch (e) {}

    if (typeof window.MediaPatchDestroy === "function") {
      try { window.MediaPatchDestroy(state.container || document); } catch (e) {}
    }

    state.container = null;
    console.log("[Media] destroy ✅");
  }

  window.MediaBoot    = MediaBoot;
  window.MediaDestroy = MediaDestroy;
})();


/* =========================================================
   SECTION D — REQUEST SCREENING MODULE (Barba-safe)
========================================================= */
(() => {
  if (window.__REQUEST_SCREENING_MODULE__) return;
  window.__REQUEST_SCREENING_MODULE__ = true;

  const { getBarbaContainer, getBarbaNamespace } = window.CBW;

  const NS = "request-screening";

  const state = {
    container: null,
    onSelectChange: null,
    selectEl: null
  };

  function getContainer() {
    return state.container || getBarbaContainer();
  }

  function isInRequestScreening() {
    return getBarbaNamespace(getContainer()) === NS;
  }

  function reinitWebflowForms() {
    if (!window.Webflow) return;
    let req = null;
    try { req = window.Webflow.require?.bind(window.Webflow); } catch (e) { req = null; }
    try { const f = req?.("forms"); f?.ready?.(); f?.init?.(); } catch (e) {}
    try { window.Webflow?.ready?.(); } catch (e) {}
  }

  function bindConditionalField(scope) {
    if (!scope || scope.__rsBound) return;
    scope.__rsBound = true;

    const select = scope.querySelector(".screening_form .js-show-trigger");
    const field  = scope.querySelector(".screening_form .js-conditional-field");
    if (!select || !field) return;

    field.style.display = "none";

    function toggleField() {
      field.style.display = (select.value === "Yes") ? "block" : "none";
    }

    state.selectEl = select;
    state.onSelectChange = toggleField;
    toggleField();
    select.addEventListener("change", toggleField);
  }

  function unbindConditionalField(scope) {
    try {
      if (state.selectEl && state.onSelectChange) {
        state.selectEl.removeEventListener("change", state.onSelectChange);
      }
    } catch (e) {}
    state.selectEl = null;
    state.onSelectChange = null;
    if (scope) scope.__rsBound = false;
  }

  function RequestScreeningBoot(container) {
    state.container = container || getContainer();
    if (!isInRequestScreening()) return;
    reinitWebflowForms();
    bindConditionalField(state.container || document);
    console.log("[RequestScreening] boot ✅");
  }

  function RequestScreeningDestroy() {
    try { unbindConditionalField(state.container || document); } catch (e) {}
    state.container = null;
    console.log("[RequestScreening] destroy ✅");
  }

  window.RequestScreeningBoot    = RequestScreeningBoot;
  window.RequestScreeningDestroy = RequestScreeningDestroy;
})();


/* =========================================================
   SECTION E — BARBA + WIPE + HUD + HOME PANELS
   SPA router · Wipe transition · Webflow reinit
   Unified anchor system (consolidated from 4 handlers → 1)
========================================================= */
(() => {
  if (window.__CBW_BARBA_CORE__) return;
  window.__CBW_BARBA_CORE__ = true;

  const {
    qs, onReady, safeTry, normalizePath,
    numberWithZero, gsapTo, delay, isDesktopPointer
  } = window.CBW;

  /* ─── Safety / reset ─── */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  try { if (window.barba) window.barba.destroy(); } catch (e) {}

  if (!window.gsap)  { console.warn("[Barba/Wipe] GSAP not found. SPA disabled.");  return; }
  if (!window.barba) { console.warn("[Barba/Wipe] Barba not found. SPA disabled."); return; }

  /* ─── Wipe transition constants ─── */
  const WIPE_MOVE_DURATION = 1.05;   // seconds
  const WIPE_HOLD_DURATION = 0.25;   // seconds

  /* ─── Home panels constants ─── */
  const HOME_BORDER_RADIUS = 32;
  const HOME_INTRO_ZOOM    = 0.68;
  const HOME_SLIDER_START  = 0.80;
  const HOME_INTENT_DELAY  = 50;     // ms after layout before auto-trigger

  /* ─── HUD ─── */
  const HUD_FIXED_TEXT = "CODED BIAS WORLD TOUR";

  /* ─── Hard scroll ─── */
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
      requestAnimationFrame(() => { hardScrollTop(); setTimeout(hardScrollTop, 60); });
    });
  }

  /* =========================================================
     UNIFIED ANCHOR SYSTEM
     ─────────────────────────────────────────────────────────
     Consolidated from the original's 4 overlapping handlers:
     forceAnchor, forceAnchorToHash, bindAnchorClickFallback,
     bindAnchorReTrigger, __captureAnchorClickOnce
     → now a single capture-phase listener + one helper.
  ========================================================= */
  const anchorState = { pendingHash: "", pendingPath: "" };

  function scrollToHash(hash, container = document, opts = {}) {
    if (!hash) return false;
    const target = container.querySelector(hash) || document.querySelector(hash);
    if (!target) { console.warn("[Anchor] Target not found:", hash); return false; }

    const offset = Number.isFinite(opts.offset) ? opts.offset : 0;
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    const instant = opts.instant === true;

    if (instant) {
      window.scrollTo(0, top);
      return true;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { window.scrollTo({ top, behavior: "smooth" }); }
        catch (_) { window.scrollTo(0, top); }
      });
    });
    return true;
  }

  // Single capture-phase click listener for ALL anchor handling
  function bindUnifiedAnchorHandler() {
    if (window.__CBW_UNIFIED_ANCHOR__) return;
    window.__CBW_UNIFIED_ANCHOR__ = true;

    document.addEventListener("click", (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || !href.includes("#")) return;

      let url;
      try { url = new URL(href, location.origin); } catch (_) { return; }

      const targetHash = url.hash || "";
      if (!targetHash) return;

      const currentPath = normalizePath(location.pathname);
      const targetPath  = normalizePath(url.pathname);

      // Always capture the pending hash for Barba transitions
      anchorState.pendingHash = targetHash;
      anchorState.pendingPath = targetPath;

      // Same page + same hash → browser won't change anything → force scroll now
      if (currentPath === targetPath && targetHash === location.hash) {
        e.preventDefault();
        e.stopPropagation();
        try { unlockScrollAll(); } catch (_) {}
        scrollToHash(targetHash, document);
      }
    }, true);
  }

  /* ─── ScrollTrigger freeze/unfreeze ─── */
  function freezeScrollTriggers() {
    try { window.ScrollTrigger?.getAll?.().forEach(st => st.disable(false)); } catch (e) {}
  }

  function unfreezeScrollTriggers() {
    try { window.ScrollTrigger?.getAll?.().forEach(st => st.enable()); } catch (e) {}
  }

  /* ─── Scroll lock (transition helper) ─── */
  const SCROLL_BLOCK_KEYS = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
  let _scrollBlockOn = false;
  let _scrollBlockY  = 0;
  let _onWheel = null, _onTouchMove = null, _onKeyDown = null;

  function lockScrollSoft() {
    if (_scrollBlockOn) return;
    _scrollBlockOn = true;
    _scrollBlockY = window.scrollY || 0;

    _onWheel     = (e) => { e.preventDefault(); window.scrollTo(0, _scrollBlockY); };
    _onTouchMove = (e) => { e.preventDefault(); window.scrollTo(0, _scrollBlockY); };
    _onKeyDown   = (e) => { if (SCROLL_BLOCK_KEYS.includes(e.key)) { e.preventDefault(); window.scrollTo(0, _scrollBlockY); } };

    window.addEventListener("wheel",     _onWheel,     { passive: false });
    window.addEventListener("touchmove", _onTouchMove, { passive: false });
    window.addEventListener("keydown",   _onKeyDown,   { passive: false });
  }

  function lockScrollHardNow() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow     = "hidden";
    document.body.style.touchAction  = "none";
  }

  function unlockScrollAll() {
    if (_scrollBlockOn) {
      _scrollBlockOn = false;
      window.removeEventListener("wheel",     _onWheel,     { passive: false });
      window.removeEventListener("touchmove", _onTouchMove, { passive: false });
      window.removeEventListener("keydown",   _onKeyDown,   { passive: false });
      _onWheel = _onTouchMove = _onKeyDown = null;
    }
    document.documentElement.style.overflow = "";
    document.body.style.overflow    = "";
    document.body.style.touchAction = "";
  }

  /* ─── Gallery Swipers (Home) ─── */
  function initGallerySwipers(scope = document) {
    if (!window.Swiper) { console.warn("[Swiper] Swiper not found."); return; }
    if (!window.jQuery && !window.$) { console.warn("[Swiper] jQuery not found."); return; }

    const $ = window.jQuery || window.$;

    function getInitialIndex($wrap) {
      const $slides = $wrap.find(".swiper.slider-text .swiper-slide");
      if (!$slides.length) return 0;
      const $flag = $wrap.find(".swiper.slider-text .js-swiper-start-flag").first();
      if (!$flag.length) return 0;
      const idx = $slides.index($flag.closest(".swiper-slide"));
      return idx >= 0 ? idx : 0;
    }

    $(scope).find(".slider-gallery-comp").each(function () {
      const $wrap = $(this);
      if ($wrap.data("swiper-inited") === 1) return;
      $wrap.data("swiper-inited", 1);

      $wrap.find(".swiper-number-total").text(numberWithZero($wrap.find(".swiper-slide.slider-thumb").length));

      const START = getInitialIndex($wrap);

      const bgSwiper = new window.Swiper($wrap.find(".swiper.slider-bg")[0], {
        slidesPerView: 1, speed: 700, effect: "fade", allowTouchMove: false, initialSlide: START
      });

      const thumbsSwiper = new window.Swiper($wrap.find(".swiper.slider-thumb")[0], {
        slidesPerView: 1, speed: 700, effect: "coverflow",
        coverflowEffect: { rotate: 0, scale: 1, slideShadows: false },
        loop: true, loopedSlides: 8, slideToClickedSlide: true, initialSlide: START
      });

      const isDesktop = isDesktopPointer();

      const textSwiper = new window.Swiper($wrap.find(".swiper.slider-text")[0], {
        slidesPerView: "auto", speed: 1000, loop: true, loopedSlides: 8,
        slideToClickedSlide: true, allowTouchMove: !isDesktop, simulateTouch: !isDesktop,
        mousewheel: true, keyboard: true, centeredSlides: true,
        slideActiveClass: "is-active", slideDuplicateActiveClass: "is-active",
        thumbs: { swiper: bgSwiper },
        navigation: { nextEl: $wrap.find(".swiper-next")[0], prevEl: $wrap.find(".swiper-prev")[0] },
        initialSlide: START
      });

      textSwiper.controller.control  = thumbsSwiper;
      thumbsSwiper.controller.control = textSwiper;

      try { textSwiper.slideToLoop(START, 0, false); thumbsSwiper.slideToLoop(START, 0, false); bgSwiper.slideTo(START, 0, false); } catch (e) {}

      $wrap.find(".swiper-number-current").text(numberWithZero(START + 1));
      textSwiper.on("slideChange", (e) => $wrap.find(".swiper-number-current").text(numberWithZero(e.realIndex + 1)));

      $wrap.data("swiper-bg", bgSwiper);
      $wrap.data("swiper-thumbs", thumbsSwiper);
      $wrap.data("swiper-text", textSwiper);
    });
  }

  /* ─── Wipe + HUD ─── */
  const wipe = document.querySelector(".page-wipe");
  if (!wipe) { console.error("[Barba/Wipe] .page-wipe not found."); return; }

  const cityEl    = document.querySelector(".wipe-city");
  const countryEl = document.querySelector(".wipe-country");
  const coordsEl  = document.querySelector(".wipe-coords");

  window.gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" });

  function setHudFixed() {
    if (cityEl) cityEl.textContent = HUD_FIXED_TEXT;
    if (countryEl) { countryEl.textContent = ""; countryEl.style.display = "none"; }
    if (coordsEl)  { coordsEl.textContent = "";  coordsEl.style.display = "none"; }
  }

  /* ─── Webflow reinit (NO FORMS — IX2 + Lightbox only) ─── */
  function syncWebflowPageIdFromBarba(data) {
    try {
      const html = data?.next?.html;
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const pid = doc.documentElement.getAttribute("data-wf-page");
      if (pid) document.documentElement.setAttribute("data-wf-page", pid);
    } catch (e) {}
  }

  function reinitWebflowCore() {
    if (!window.Webflow) return;
    let req = null;
    try { req = window.Webflow.require?.bind(window.Webflow); } catch (e) { req = null; }
    try { const ix2 = req?.("ix2"); ix2?.destroy?.(); ix2?.init?.(); } catch (e) {}
    try { req?.("lightbox")?.ready?.(); } catch (e) {}
  }

  function syncHomeNavState() {
    const link = document.querySelector(".nav-home-link");
    if (!link) return;
    link.classList.remove("is-disabled");
    link.setAttribute("aria-disabled", "false");
    link.style.pointerEvents = "";
    link.removeAttribute("disabled");
  }

  /* ─── Home panels (INTRO → SLIDER) ─── */
  function getHomePanelIntent() {
    try { return (new URLSearchParams(window.location.search).get("panel") || "").trim().toLowerCase(); }
    catch (e) { return ""; }
  }

  function cleanHomePanelIntentFromURL() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("panel");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function applyHomePanelIntent(container = document) {
    if (getHomePanelIntent() !== "slider") return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const btn = qs('[data-intro="continue"]', container) || qs('[data-intro="continue"]', document);
          if (!btn) return;
          btn.click();
          cleanHomePanelIntentFromURL();
        }, HOME_INTENT_DELAY);
      });
    });
  }

  function cleanupHomePanels() {
    document.body.classList.remove("no-scroll");
    document.documentElement.classList.remove("is-home-slider");
    if (window.__homePanelsTL) window.__homePanelsTL = null;
    if (window.homePanelsGoToIntro) window.homePanelsGoToIntro = null;
  }

  function setupHomePanels(container = document) {
    const shell = qs(".page-shell", container);
    if (!shell) return;

    const intro  = qs(".panel-panel--intro", container);
    const slider = qs(".panel-panel--slider", container);
    const btn    = qs('[data-intro="continue"]', container);
    if (!intro || !slider || !btn) return;
    if (btn.dataset.homeBound === "1") return;
    btn.dataset.homeBound = "1";

    if (btn.tagName === "BUTTON") btn.setAttribute("type", "button");

    document.documentElement.classList.remove("is-home-slider");
    document.body.classList.add("no-scroll");

    window.gsap.set(intro,  { display: "block", x: 0, scale: 1, borderRadius: 0, willChange: "transform" });
    window.gsap.set(slider, { display: "block", x: "-110vw", scale: HOME_SLIDER_START, borderRadius: HOME_BORDER_RADIUS, willChange: "transform" });

    let isAnimating = false;

    const tl = window.gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    tl
      .to(intro,  { duration: 1.15, scale: HOME_INTRO_ZOOM, borderRadius: HOME_BORDER_RADIUS, ease: "power2.inOut" })
      .to(intro,  { duration: 1.10, x: "120vw" })
      .to(slider, { duration: 1.20, x: "0vw" }, "<")
      .to(slider, { duration: 1.05, scale: 1, borderRadius: 0, ease: "power3.out" }, "-=0.15")
      .set(intro, { display: "none" })
      .add(() => {
        document.body.classList.remove("no-scroll");
        document.documentElement.classList.add("is-home-slider");
        try {
          const $ = window.jQuery || window.$;
          if ($) { $(container).find(".slider-gallery-comp").first().data("swiper-text")?.update?.(); }
        } catch (e) {}
      });

    window.__homePanelsTL = tl;

    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (isAnimating) return;
      isAnimating = true;
      document.documentElement.classList.add("is-home-slider");
      tl.eventCallback("onComplete", () => { isAnimating = false; });
      tl.play(0);
    }, true);

    window.homePanelsGoToIntro = function () {
      if (!window.__homePanelsTL || isAnimating) return;
      isAnimating = true;
      window.gsap.set(intro, { display: "block" });
      document.body.classList.add("no-scroll");

      window.__homePanelsTL.eventCallback("onReverseComplete", () => {
        isAnimating = false;
        document.documentElement.classList.remove("is-home-slider");
        document.body.classList.add("no-scroll");
        window.gsap.set(slider, { x: "-110vw", scale: HOME_SLIDER_START, borderRadius: HOME_BORDER_RADIUS });
        window.gsap.set(intro,  { x: 0, scale: 1, borderRadius: 0 });
      });
      window.__homePanelsTL.reverse();
    };
  }

  /* =========================================================
     BARBA INIT
  ========================================================= */
  bindUnifiedAnchorHandler();

  window.barba.init({
    preventRunning: true,
    prevent: ({ el }) => el?.closest('[fs-list-element], [fs-list-field], [fs-list-value]') ? true : false,

    transitions: [{
      name: "wipe-stable-nojump",

      async leave(data) {
        const current = data.current.container;
        setHudFixed();
        window.gsap.killTweensOf(wipe);
        freezeScrollTriggers();
        lockScrollSoft();
        current.style.visibility = "visible";
        current.style.opacity = "1";

        await gsapTo(wipe, { y: "0%", duration: WIPE_MOVE_DURATION, ease: "power4.inOut", overwrite: true });
        lockScrollHardNow();
        await delay(WIPE_HOLD_DURATION);
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
        try {
          // ALWAYS reset scroll to top during transition
          // (even with hash — we'll scroll to anchor AFTER the reveal)
          hardScrollTop();
          _scrollBlockY = 0;

          // Keep hard lock active during the entire reveal
          lockScrollHardNow();

          syncWebflowPageIdFromBarba(data);
          reinitWebflowCore();
          syncHomeNavState();
          cleanupHomePanels();
          setupHomePanels(data?.next?.container || document);
          initGallerySwipers(data?.next?.container || document);
          applyHomePanelIntent(data?.next?.container || document);
          unfreezeScrollTriggers();
          try { window.ScrollTrigger?.refresh?.(); } catch (e) {}
        } catch (err) {
          console.error("[Barba] after() crashed:", err);
        } finally {
          // Determine anchor target BEFORE reveal
          let wantHash = "";
          try {
            const nextPath = normalizePath(location.pathname);
            wantHash = (anchorState.pendingPath === nextPath && anchorState.pendingHash)
              ? anchorState.pendingHash
              : location.hash;
          } catch (e) {}

          // Scroll to anchor INSTANTLY while wipe still covers the page
          const scrollContainer = data?.next?.container || document;
          if (wantHash) {
            const anchorOffset = window.CBW.remToPx(window.CBW.isMobileMode() ? 13 : 8);
            scrollToHash(wantHash, scrollContainer, { instant: true, offset: anchorOffset });
          }

          // Reveal wipe (page is already at the correct position)
          try {
            window.gsap.killTweensOf(wipe);
            await gsapTo(wipe, { y: "-100%", duration: WIPE_MOVE_DURATION, ease: "power4.inOut", overwrite: true });
            window.gsap.set(wipe, { y: "100%" });
          } catch (e) {
            console.error("[Barba] Reveal failed:", e);
            try { window.gsap.set(wipe, { y: "100%" }); } catch (_) {}
          }

          // Final: if no hash, ensure we're at top
          if (!wantHash) hardScrollTop();

          // NOW unlock — user can scroll freely
          try { unlockScrollAll(); } catch (e) {}

          // Clean up anchor state
          try {
            const nextPath = normalizePath(location.pathname);
            if (anchorState.pendingPath === nextPath) {
              anchorState.pendingHash = "";
              anchorState.pendingPath = "";
            }
          } catch (e) {}
        }
      }
    }]
  });

  /* ─── Namespace module hooks ─── */
  if (window.barba?.hooks) {
    window.barba.hooks.beforeLeave((data) => {
      const ns = data?.current?.namespace;
      if (ns === "media"             && typeof window.MediaDestroy === "function")             window.MediaDestroy();
      if (ns === "request-screening" && typeof window.RequestScreeningDestroy === "function")  window.RequestScreeningDestroy();
    });

    window.barba.hooks.afterEnter((data) => {
      const ns = data?.next?.namespace;
      if (ns === "media")             setTimeout(() => requestAnimationFrame(() => window.MediaBoot?.(data.next.container)), 0);
      if (ns === "request-screening") setTimeout(() => requestAnimationFrame(() => window.RequestScreeningBoot?.(data.next.container)), 0);
    });
  }

  /* ─── First load ─── */
  document.addEventListener("DOMContentLoaded", () => {
    setHudFixed();
    if (!location.hash) hardScrollTopAfterPaint();
    else scrollToHash(location.hash, document);

    reinitWebflowCore();
    cleanupHomePanels();
    setupHomePanels(document);
    initGallerySwipers(document);
    syncHomeNavState();
    applyHomePanelIntent(document);

    const container = window.CBW.getBarbaContainer();
    const ns = window.CBW.getBarbaNamespace(container);
    if (ns === "media")             setTimeout(() => requestAnimationFrame(() => window.MediaBoot?.(container)), 0);
    if (ns === "request-screening") setTimeout(() => requestAnimationFrame(() => window.RequestScreeningBoot?.(container)), 0);

    console.log("[Barba/Wipe] init ✅ (+namespace hooks)");
  });

  /* ─── BFCache ─── */
  window.addEventListener("pageshow", (evt) => {
    if (!evt.persisted) return;
    unlockScrollAll();
    unfreezeScrollTriggers();
    if (!location.hash) hardScrollTopAfterPaint();
    else scrollToHash(location.hash, document);

    try { window.gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" }); } catch (e) {}
    try { setHudFixed(); } catch (e) {}

    reinitWebflowCore();
    cleanupHomePanels();
    setupHomePanels(document);
    syncHomeNavState();
    applyHomePanelIntent(document);

    const container = window.CBW.getBarbaContainer();
    const ns = window.CBW.getBarbaNamespace(container);
    if (ns === "media")             setTimeout(() => requestAnimationFrame(() => window.MediaBoot?.(container)), 0);
    if (ns === "request-screening") setTimeout(() => requestAnimationFrame(() => window.RequestScreeningBoot?.(container)), 0);
  });

  window.__initGallerySwipers = initGallerySwipers;
})();


/* =========================================================
   NOTE: "Force Barba nav for media preset links" handler
   lives in the Webflow footer code (not in this bundle)
   to allow iteration without redeploying GitHub.
========================================================= */
