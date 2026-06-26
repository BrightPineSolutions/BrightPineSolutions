/* ============================================================
   BrightPine Solutions — Front-end interactions
   The enquiry form opens the visitor's email client via a mailto:
   link (front-end only). Reviews are shared across all visitors via
   a small Node server (server.js) that persists them to a real
   data/reviews.json file, with a localStorage mirror for offline display.
   ============================================================ */
(function () {
  "use strict";

  // ---- Config ----
  var ADMIN_EMAIL = "ad.brightpinesolutions@outlook.com";

  // ---- Mobile nav toggle ----
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.classList.toggle("active", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- Footer year ----
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Scroll progress bar + back-to-top ----
  var progress = document.getElementById("scrollProgress");
  var toTop = document.getElementById("toTop");
  function onScroll() {
    var h = document.documentElement;
    var scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
    if (progress) progress.style.width = (scrolled * 100) + "%";
    if (toTop) toTop.classList.toggle("show", h.scrollTop > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- Scroll reveal (IntersectionObserver) ----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = parseInt(el.getAttribute("data-delay") || "0", 10);
          setTimeout(function () { el.classList.add("in-view"); }, delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  }

  // ---- Animated stat counters ----
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target) + (p === 1 ? "+" : "") + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // ---- Enquiry form → opens the visitor's email client via mailto: ----
  var form = document.getElementById("enquiryForm");
  var note = document.getElementById("formNote");
  var submitBtn = document.getElementById("submitBtn");

  var noteTimer;
  function setNote(msg, type) {
    clearTimeout(noteTimer);
    note.textContent = msg;
    note.className = "form-note " + type; // reassigning also clears any previous "hide"

    // Auto-hide success messages after 12s with a smooth fade-out.
    if (type === "ok") {
      noteTimer = setTimeout(function () {
        note.classList.add("hide");
        setTimeout(function () {
          // Only clear if a newer message hasn't replaced this one.
          if (note.classList.contains("hide")) { note.textContent = ""; note.className = "form-note"; }
        }, 500); // matches the CSS opacity transition
      }, 12000);
    }
  }

  // Build a clean, professionally formatted enquiry body.
  // NOTE: mailto: bodies are delivered as PLAIN TEXT (email clients do not
  // honour HTML/CSS in a mailto link). So "modern" here means a tidy, well
  // spaced layout with aligned labels and rule separators that reads cleanly
  // in any mail app — no fragile ASCII-table borders.
  var MAIL_WIDTH = 60; // wrap column for the message and rule lines

  // Word-wrap a paragraph to `width`, indenting each line; hard-breaks any
  // single token longer than the column (e.g. a pasted URL or "TTTT..." run).
  function wrapText(text, width, indent) {
    var out = [];
    String(text).split(/\r?\n/).forEach(function (para) {
      if (!para.trim()) { out.push(""); return; }
      var line = "";
      para.split(/\s+/).forEach(function (word) {
        while (word.length > width) {
          if (line) { out.push(indent + line); line = ""; }
          out.push(indent + word.slice(0, width));
          word = word.slice(width);
        }
        if (!line) line = word;
        else if ((line + " " + word).length <= width) line += " " + word;
        else { out.push(indent + line); line = word; }
      });
      if (line) out.push(indent + line);
    });
    return out;
  }

  function buildEnquiryBody(data) {
    var heavy = new Array(MAIL_WIDTH + 1).join("═");
    var light = new Array(MAIL_WIDTH + 1).join("─");

    var rows = [
      ["Name", data.name],
      ["Email", data.email],
      ["Phone", data.phone || "—"],
      ["Project", data.service || "—"]
    ];
    var labelW = rows.reduce(function (m, r) { return Math.max(m, r[0].length); }, 0);
    function field(label, value) {
      var pad = new Array(labelW - label.length + 1).join(" ");
      return "  " + label + pad + "   " + value;
    }

    var lines = [];
    lines.push(heavy);
    lines.push("  NEW PROJECT ENQUIRY");
    lines.push("  BrightPine Solutions");
    lines.push(heavy);
    lines.push("");
    lines.push("CONTACT DETAILS");
    lines.push(light);
    rows.forEach(function (r) { lines.push(field(r[0], r[1])); });
    lines.push("");
    lines.push("PROJECT DETAILS");
    lines.push(light);
    lines.push.apply(lines, wrapText(data.message, MAIL_WIDTH - 2, "  "));
    lines.push("");
    lines.push(light);
    lines.push("Submitted via the BrightPine Solutions website enquiry form.");
    lines.push("Please reply directly to this email to respond to the client.");
    return lines.join("\n");
  }

  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        service: form.service.value,
        message: form.message.value.trim()
      };

      if (!data.name || !data.email || !data.message) {
        return setNote("Please fill in your name, email and project details.", "err");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return setNote("Please enter a valid email address.", "err");
      }

      // Persist the enquiry to the server (data/customer.json). This is the
      // record of who enquired; it works only when the site is served by
      // server.js over http(s) — opening index.html via file:// has no API.
      // keepalive lets the request survive the mailto: handoff to the mail app.
      var hasApi = /^https?:$/.test(window.location.protocol);
      if (hasApi) {
        fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          keepalive: true
        }).catch(function () { /* best-effort; the mailto: below is the fallback */ });
      }

      var subject = "New Project Enquiry from " + data.name +
        (data.service ? " — " + data.service : "");
      var body = buildEnquiryBody(data);

      var mailto = "mailto:" + ADMIN_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      // Open the visitor's default email application with everything pre-filled.
      window.location.href = mailto;

      setNote("Thanks, " + data.name + " — your enquiry has been saved. Your email app should open so you " +
        "can also send it directly; if nothing opens, email us at " + ADMIN_EMAIL + ".", "ok");
      form.reset();
    });
  }

  // ---- Customer reviews ----
  // Reviews are shared across ALL visitors via the local Node server, which
  // persists them to a real data/reviews.json file (GET/POST /api/reviews).
  // Each review stores only: name, rating and review text.
  //
  // NOTE: this requires the site to be served by server.js (run `node server.js`
  // and open http://localhost:3000). Opening index.html directly from disk
  // (file://) has no API, so reviews can't load or be posted.
  (function reviews() {
    var form = document.getElementById("reviewForm");
    var list = document.getElementById("reviewList");
    var modal = document.getElementById("reviewModal");
    if (!form || !list || !modal) return;

    // ---- API data source (same-origin; works on localhost and in production) ----
    var REVIEWS_API = "/api/reviews";
    // An API is only reachable when served over http(s), not from file://.
    var hasApi = /^https?:$/.test(window.location.protocol);
    var nameEl = document.getElementById("reviewName");
    var commentEl = document.getElementById("reviewComment");
    var rNote = document.getElementById("reviewNote");
    var emptyEl = document.getElementById("reviewEmpty");
    var openTopBtn = document.getElementById("openReviewTop");
    var closeBtn = document.getElementById("reviewModalClose");
    var prevBtn = document.getElementById("revPrev");
    var nextBtn = document.getElementById("revNext");
    var starWrap = document.getElementById("starInput");
    var starButtons = Array.prototype.slice.call(starWrap.querySelectorAll(".star"));
    var rating = 0;
    var rNoteTimer;

    // ---- Horizontal (x-axis) auto-scroll state ----
    // The carousel advances one card every AUTO_INTERVAL ms with a smooth
    // animation. Cards are cloned so it loops seamlessly; manual arrow clicks
    // use the same one-card step and simply restart the timer afterwards.
    var autoTimer = null;     // setInterval handle driving the one-card steps
    var autoPeriod = 0;       // px width of one full set of original cards (wrap distance)
    var autoPaused = false;   // paused while the visitor hovers/focuses the carousel
    var wrapTimer = null;     // normalises position back into the loop after a step settles
    var AUTO_INTERVAL = 3000; // ms between automatic one-card advances
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Pause auto-advance while the visitor is reading or interacting.
    list.addEventListener("pointerenter", function () { autoPaused = true; });
    list.addEventListener("pointerleave", function () { autoPaused = false; });
    list.addEventListener("focusin", function () { autoPaused = true; });
    list.addEventListener("focusout", function () { autoPaused = false; });

    function setRNote(msg, type) {
      clearTimeout(rNoteTimer);
      rNote.textContent = msg;
      rNote.className = "form-note " + (type || "");
      if (type === "ok") rNoteTimer = setTimeout(function () { rNote.textContent = ""; rNote.className = "form-note"; }, 6000);
    }

    // ---- Data source: the shared reviews.json file, via the server API ----
    // Read the full review list from the server (shared for all visitors).
    function loadReviews() {
      if (!hasApi) return Promise.reject(new Error("no-api"));
      return fetch(REVIEWS_API)
        .then(function (r) { if (!r.ok) throw new Error("load failed"); return r.json(); })
        .then(function (arr) { return Array.isArray(arr) ? arr : []; });
    }

    // Persist one review by POSTing it to the server, then return the updated list.
    function saveReview(review) {
      if (!hasApi) return Promise.reject(new Error("no-api"));
      return fetch(REVIEWS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (b) {
            if (!r.ok) throw new Error(b.message || "save failed");
            return loadReviews(); // re-fetch the authoritative list
          });
        });
    }

    // ---- Modal open / close ----
    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      setTimeout(function () { nameEl.focus(); }, 60);
    }
    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }
    openTopBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });

    // ---- Star rating picker ----
    function paintStars(val) {
      starButtons.forEach(function (b) {
        b.classList.toggle("on", parseInt(b.getAttribute("data-value"), 10) <= val);
      });
    }
    starButtons.forEach(function (b) {
      var v = parseInt(b.getAttribute("data-value"), 10);
      b.addEventListener("click", function () { rating = v; paintStars(rating); });
      b.addEventListener("mouseenter", function () { paintStars(v); });
    });
    starWrap.addEventListener("mouseleave", function () { paintStars(rating); });

    // ---- Render ----
    function starsEl(val) {
      var n = Math.max(0, Math.min(5, val));
      var span = document.createElement("div");
      span.className = "tc-stars";
      span.setAttribute("aria-label", n + " out of 5 stars");
      span.appendChild(document.createTextNode("★★★★★".slice(0, n)));
      if (n < 5) { var off = document.createElement("span"); off.className = "off"; off.textContent = "★★★★★".slice(0, 5 - n); span.appendChild(off); }
      return span;
    }
    function makeCard(r, i) {
      var card = document.createElement("article");
      card.className = "testimonial-card";
      card.style.animationDelay = (Math.min(i || 0, 8) * 0.05) + "s";

      var body = document.createElement("div");
      body.className = "tc-body";
      var quote = document.createElement("span"); quote.className = "tc-quote"; quote.setAttribute("aria-hidden", "true"); quote.textContent = "”";
      // Review text lives in a fixed-height area that auto-scrolls if it overflows.
      var scroll = document.createElement("div"); scroll.className = "tc-scroll";
      var p = document.createElement("p"); p.className = "tc-text"; p.textContent = r.comment;
      scroll.appendChild(p);
      var name = document.createElement("h3"); name.className = "tc-name"; name.textContent = "— " + (r.name || "Anonymous");

      body.appendChild(quote);
      body.appendChild(starsEl(r.rating));
      body.appendChild(scroll);
      body.appendChild(name);

      card.appendChild(body);
      return card;
    }
    // Enable a gentle auto-scroll only when the review text overflows its fixed area.
    function setupAutoScroll(scrollEl) {
      var text = scrollEl.querySelector(".tc-text");
      if (!text) return;
      text.classList.remove("auto-scroll");
      text.style.removeProperty("--shift");
      text.style.removeProperty("--dur");
      var overflow = text.scrollHeight - scrollEl.clientHeight;
      if (overflow > 4) {
        text.style.setProperty("--shift", (-overflow) + "px");
        text.style.setProperty("--dur", (Math.round(overflow / 18) + 5) + "s"); // longer text = slower scroll
        text.classList.add("auto-scroll");
      }
    }
    function setupAllAutoScroll() {
      Array.prototype.forEach.call(list.querySelectorAll(".tc-scroll"), setupAutoScroll);
    }

    // ---- Continuous horizontal auto-scroll (x-axis marquee) ----
    // The cards drift leftward on their own. To loop seamlessly we clone the
    // whole set once and append it; when scrollLeft passes the first set's
    // width we subtract that width so the jump is invisible. Cloned cards are
    // hidden from assistive tech and excluded from the original count.
    function clearAutoScrollX() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      if (wrapTimer) { clearTimeout(wrapTimer); wrapTimer = null; }
      Array.prototype.slice.call(list.querySelectorAll(".testimonial-card.clone"))
        .forEach(function (c) { c.parentNode.removeChild(c); });
    }
    function setupAutoScrollX() {
      clearAutoScrollX();

      var cards = Array.prototype.slice.call(list.querySelectorAll(".testimonial-card"));
      if (!cards.length) return;

      // Append one full copy of the original cards (a "set").
      function appendCloneSet() {
        cards.forEach(function (card) {
          var clone = card.cloneNode(true);
          clone.classList.add("clone");
          clone.setAttribute("aria-hidden", "true");
          clone.tabIndex = -1;
          list.appendChild(clone);
        });
      }

      // Always clone at least once so the carousel scrolls even when the few
      // real cards would otherwise fit on screen.
      appendCloneSet();

      // Exact wrap distance = offset between the first real card and its clone.
      var firstClone = list.querySelector(".testimonial-card.clone");
      autoPeriod = firstClone.offsetLeft - cards[0].offsetLeft;
      if (autoPeriod <= 0) { clearAutoScrollX(); return; }

      // Keep cloning until there's a full viewport of content beyond the wrap
      // point, so the loop is seamless no matter how wide the screen is.
      var guard = 0;
      while (list.scrollWidth < autoPeriod + list.clientWidth + 4 && guard < 12) {
        appendCloneSet();
        guard++;
      }

      // Start the automatic one-card advance (respects reduced-motion: cards
      // are still cloned so the arrows work, but no timed motion runs).
      startAuto();
    }

    // Move the position instantly (no animation), bypassing the CSS smooth
    // scroll-behavior — used for the invisible loop wrap onto identical clones.
    function instantScrollTo(left) {
      var prev = list.style.scrollBehavior;
      list.style.scrollBehavior = "auto";
      list.scrollLeft = left;
      void list.offsetWidth; // force reflow so the next smooth scroll starts here
      list.style.scrollBehavior = prev;
    }

    // After a smooth one-card step settles, fold the position back into the
    // first set and snap to the nearest card so subpixel drift never builds up.
    function normalizeAfterStep() {
      if (wrapTimer) clearTimeout(wrapTimer);
      wrapTimer = setTimeout(function () {
        if (autoPeriod <= 0) return;
        var step = cardStep();
        var sl = list.scrollLeft;
        while (sl >= autoPeriod - 1) sl -= autoPeriod;
        while (sl < -1) sl += autoPeriod;
        instantScrollTo(Math.round(sl / step) * step);
      }, 700); // long enough for a one-card smooth scroll to finish
    }

    // Advance/retreat exactly one card, wrapping seamlessly in either direction.
    function stepOnce(dir) {
      if (autoPeriod <= 0) return;
      // Going back from the very start: hop forward one full set first (onto
      // identical clones, so it's invisible), then animate the step backwards.
      if (dir < 0 && list.scrollLeft < cardStep() - 1) {
        instantScrollTo(list.scrollLeft + autoPeriod);
      }
      list.scrollBy({ left: dir * cardStep(), behavior: "smooth" });
      normalizeAfterStep();
    }

    function startAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      if (reduceMotion || autoPeriod <= 0) return;
      autoTimer = setInterval(function () {
        if (!autoPaused) stepOnce(1);
      }, AUTO_INTERVAL);
    }
    function renderList(arr) {
      list.innerHTML = "";
      arr.forEach(function (r, i) { list.appendChild(makeCard(r, i)); });
      emptyEl.hidden = arr.length > 0;
      list.scrollLeft = 0;
      clearAutoScrollX(); // drop stale clones before re-measuring
      updateNav();
      // Measure after layout so overflow/clientHeight/offsets are accurate.
      function afterLayout() { setupAutoScrollX(); setupAllAutoScroll(); }
      if (window.requestAnimationFrame) requestAnimationFrame(afterLayout);
      else afterLayout();
    }

    // ---- Carousel navigation (arrows + mouse wheel) ----
    function cardStep() {
      var first = list.querySelector(".testimonial-card");
      if (!first) return list.clientWidth;
      var gap = parseInt(getComputedStyle(list).columnGap || "26", 10) || 26;
      return first.offsetWidth + gap;
    }
    function canScroll() { return list.scrollWidth - list.clientWidth > 2; }
    function updateNav() {
      // The arrows are always offered so visitors can scroll either way; they
      // only go inert if (somehow) there's nothing to scroll at all.
      var scrollable = canScroll();
      prevBtn.hidden = nextBtn.hidden = !scrollable;
      prevBtn.disabled = nextBtn.disabled = !scrollable;
    }
    // Manual navigation: step one card, then restart the timer so the
    // automatic advance resumes seamlessly from the new position.
    function manualScroll(dir) {
      stepOnce(dir);
      startAuto();
    }
    prevBtn.addEventListener("click", function () { manualScroll(-1); });
    nextBtn.addEventListener("click", function () { manualScroll(1); });
    list.addEventListener("scroll", updateNav, { passive: true });
    var resizeTimer;
    window.addEventListener("resize", function () {
      updateNav();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        setupAutoScrollX();  // card widths change on breakpoints — rebuild the loop
        setupAllAutoScroll();
      }, 200); // re-measure once resizing settles
    });

    // Mouse wheel scrolls the carousel horizontally; at the ends, let the page scroll normally.
    list.addEventListener("wheel", function (e) {
      if (!canScroll()) return;
      var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      var atStart = list.scrollLeft <= 0;
      var atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      e.preventDefault();
      list.scrollLeft += delta;
    }, { passive: false });

    function refresh() {
      return loadReviews()
        .then(renderList)
        .catch(function () {
          // No API (e.g. opened via file://) or the server is down — show nothing.
          renderList([]);
        });
    }

    // ---- Submit (saves to the shared reviews.json via the server) ----
    var submitting = false;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Guard against re-entrant submits (e.g. holding/repeating Enter in a field).
      if (submitting) return;

      var name = nameEl.value.trim();
      var comment = commentEl.value.trim();
      if (!name) return setRNote("Please enter your name.", "err");
      if (!rating) return setRNote("Please select a star rating.", "err");
      if (!comment) return setRNote("Please add your review.", "err");

      if (!hasApi) {
        return setRNote("Reviews are saved on the server — please open the site via http://localhost:3000 (run: node server.js).", "err");
      }

      submitting = true;
      var btn = document.getElementById("reviewSubmitBtn");
      btn.disabled = true; btn.textContent = "Submitting...";

      var review = { name: name, rating: rating, comment: comment };

      saveReview(review)
        .then(function (arr) {
          form.reset(); rating = 0; paintStars(0);
          setRNote("", "");
          closeModal();
          renderList(arr);
        })
        .catch(function () {
          setRNote("Sorry, we couldn't save your review right now. Please check your connection and try again.", "err");
        })
        .finally(function () { submitting = false; btn.disabled = false; btn.textContent = "Submit Review"; });
    });

    refresh();
  })();
})();
