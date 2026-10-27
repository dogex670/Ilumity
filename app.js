(function () {
  "use strict";

  var ALL = window.ILUMITY_DATA || [];
  var QUOTES = ALL.filter(function (x) { return x.type === "quote"; });
  var FACTS = ALL.filter(function (x) { return x.type === "fact"; });
  var BY_ID = {};
  ALL.forEach(function (x) { BY_ID[x.id] = x; });

  var ERA_LABEL = { ancient: "Ancient world", medieval: "Middle Ages", "early-modern": "Early modern", modern: "Modern era" };
  var feed = document.getElementById("feed");
  var toastEl = document.getElementById("toast");

  // ---------- Date + seeded randomness ----------
  var now = new Date();
  var dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);

  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(list, seed) {
    var a = list.slice(), r = rng(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Quote of the day: walk a fixed shuffled order so every quote appears once
  // before any repeats, and everyone sees the same quote on the same day.
  var dailyOrder = shuffled(QUOTES, 1717);
  var daily = dailyOrder[dayNumber % dailyOrder.length];

  // ---------- Saved items (per device) ----------
  var saved = load();
  function load() {
    try { return JSON.parse(localStorage.getItem("ilumity:saved") || "[]"); } catch (e) { return []; }
  }
  function persist() {
    try { localStorage.setItem("ilumity:saved", JSON.stringify(saved)); } catch (e) { /* storage blocked */ }
  }
  function isSaved(id) { return saved.indexOf(id) !== -1; }
  function toggleSave(id, force) {
    var on = typeof force === "boolean" ? force : !isSaved(id);
    saved = saved.filter(function (x) { return x !== id; });
    if (on) saved.unshift(id);
    persist();
    document.querySelectorAll('.act[data-save="' + id + '"]').forEach(function (b) {
      b.setAttribute("aria-pressed", String(on));
      b.querySelector(".lbl").textContent = on ? "Saved" : "Save";
    });
    return on;
  }

  // ---------- Rendering ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var ICON_SAVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>';

  function quoteSize(text) {
    if (text.length < 50) return " short";
    if (text.length > 95) return " long";
    return "";
  }

  function cardHTML(item, opts) {
    opts = opts || {};
    var on = isSaved(item.id);
    var inner;
    if (item.type === "quote") {
      var first = item.text.charAt(0), rest = item.text.slice(1);
      inner =
        '<div class="eyebrow"><span class="kind">Quote</span><span>·</span><span>' + ERA_LABEL[item.era] + "</span></div>" +
        '<blockquote class="quote' + quoteSize(item.text) + '"><span class="initial" aria-hidden="true">' + esc(first) +
        '</span><span class="sr">' + esc(first) + "</span>" + esc(rest) + "</blockquote>" +
        '<div class="who"><span class="name">' + esc(item.who) + '</span>' +
        '<span class="meta">' + esc(item.role) + " · " + esc(item.years) + "</span>" +
        '<span class="src">' + esc(item.source) + "</span></div>";
    } else {
      inner =
        '<div class="eyebrow"><span class="kind">Did you know?</span><span>·</span><span>' + esc(item.when) + "</span></div>" +
        '<h2 class="fact-title">' + esc(item.title) + "</h2>" +
        '<p class="fact-text">' + esc(item.text) + "</p>" +
        '<div class="who"><span class="meta">' + ERA_LABEL[item.era] + "</span></div>";
    }
    var badge = opts.daily
      ? '<span class="badge">Today’s light · ' + now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) + "</span>"
      : "";
    var hint = opts.hint ? '<div class="hint" aria-hidden="true">Swipe up for more</div>' : "";
    return (
      '<article class="card" data-id="' + item.id + '" data-era="' + item.era + '">' +
      '<div class="body">' + badge + inner + "</div>" +
      '<div class="rail">' +
      '<button type="button" class="act" data-save="' + item.id + '" aria-pressed="' + on + '" aria-label="Save">' + ICON_SAVE + '<span class="lbl">' + (on ? "Saved" : "Save") + "</span></button>" +
      '<button type="button" class="act" data-share="' + item.id + '" aria-label="Share">' + ICON_SHARE + '<span class="lbl">Share</span></button>' +
      "</div>" + hint + "</article>"
    );
  }

  // ---------- Feeds ----------
  var tab = "foryou";
  var batch = 0;

  function sourceFor(t) {
    if (t === "quotes") return QUOTES;
    if (t === "facts") return FACTS;
    return ALL;
  }
  function nextBatch() {
    var list = sourceFor(tab).filter(function (x) { return batch > 0 || tab !== "foryou" || x.id !== daily.id; });
    var out = shuffled(list, dayNumber * 31 + batch * 7919 + tab.length);
    batch++;
    return out;
  }

  function render() {
    batch = 0;
    feed.scrollTop = 0;
    if (tab === "saved") {
      var items = saved.map(function (id) { return BY_ID[id]; }).filter(Boolean);
      feed.innerHTML = items.length
        ? items.map(function (x) { return cardHTML(x); }).join("")
        : '<section class="card empty" data-era="medieval"><div class="body">' +
          '<span class="mark">Nothing saved yet</span>' +
          "<p>Tap the heart on a quote or fact, or double-tap the card, and it will be kept here.</p></div></section>";
      return;
    }
    var html = "";
    if (tab === "foryou") html += cardHTML(daily, { daily: true, hint: true });
    var first = nextBatch();
    html += first.map(function (x, i) { return cardHTML(x, { hint: tab !== "foryou" && i === 0 }); }).join("");
    feed.innerHTML = html;
  }

  // Endless scrolling: add another shuffled round when near the end.
  feed.addEventListener("scroll", function () {
    if (tab === "saved") return;
    if (feed.scrollTop + feed.clientHeight * 3 >= feed.scrollHeight) {
      feed.insertAdjacentHTML("beforeend", nextBatch().map(function (x) { return cardHTML(x); }).join(""));
    }
  }, { passive: true });

  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      tab = b.dataset.tab;
      document.querySelectorAll(".tabs button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      try { localStorage.setItem("ilumity:tab", tab); } catch (e) {}
      render();
    });
  });

  // ---------- Actions ----------
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 1800);
  }

  function shareText(item) {
    return item.type === "quote"
      ? "“" + item.text + "” — " + item.who + " (" + item.source + ")"
      : item.title + ". " + item.text;
  }
  function share(item) {
    var text = shareText(item) + "\n\nvia Ilumity";
    if (navigator.share) {
      navigator.share({ text: text }).catch(function (err) {
        if (err && err.name === "AbortError") return;
        copy(text);
      });
    } else copy(text);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Copied to clipboard"); }, function () { toast("Couldn’t copy. Long-press the text instead."); });
    } else toast("Couldn’t copy. Long-press the text instead.");
  }

  feed.addEventListener("click", function (e) {
    var s = e.target.closest("[data-save]");
    if (s) { toast(toggleSave(s.dataset.save) ? "Saved" : "Removed from saved"); return; }
    var sh = e.target.closest("[data-share]");
    if (sh) share(BY_ID[sh.dataset.share]);
  });

  // Double-tap a card to save it.
  var lastTap = 0;
  feed.addEventListener("pointerup", function (e) {
    if (e.target.closest(".act")) return;
    var card = e.target.closest(".card[data-id]");
    if (!card) return;
    var t = Date.now();
    if (t - lastTap < 320) {
      toggleSave(card.dataset.id, true);
      var r = card.getBoundingClientRect();
      var b = document.createElement("div");
      b.className = "burst";
      b.innerHTML = ICON_SAVE.replace('class="fill"', 'fill="currentColor"');
      b.style.left = (e.clientX - r.left) + "px";
      b.style.top = (e.clientY - r.top) + "px";
      card.appendChild(b);
      setTimeout(function () { b.remove(); }, 800);
      lastTap = 0;
    } else lastTap = t;
  });

  // Keyboard: arrow keys / j k move between cards.
  document.addEventListener("keydown", function (e) {
    if (e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
    var dir = (e.key === "ArrowDown" || e.key === "j") ? 1 : (e.key === "ArrowUp" || e.key === "k") ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    feed.scrollBy({ top: dir * feed.clientHeight, behavior: "smooth" });
  });

  // ---------- Start ----------
  try {
    var savedTab = localStorage.getItem("ilumity:tab");
    if (savedTab && document.getElementById("tab-" + savedTab)) {
      document.getElementById("tab-" + savedTab).click();
    } else render();
  } catch (e) { render(); }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    try { navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (e) {}
  }
})();
