/**
 * app.js — Trie Autocomplete Frontend
 *
 * Responsibilities:
 *  1. Debounced parallel fetch from /autocomplete and /trie-path.
 *  2. Render suggestion rows with prefix highlighting.
 *  3. Keyboard navigation (↑ ↓ Enter Esc).
 *  4. Real-time latency badge (color-coded).
 *  5. Vertical Trie path visualizer driven by /trie-path data.
 *  6. Word count from /health on load.
 */

// ─── DOM references ──────────────────────────────────────────────────────────
const input        = document.getElementById("search-input");
const clearBtn     = document.getElementById("clear-btn");
const sugList      = document.getElementById("suggestions-list");
const emptyState   = document.getElementById("empty-state");
const idleState    = document.getElementById("idle-state");
const latencyBadge = document.getElementById("latency-badge");
const latencyDot   = document.getElementById("latency-dot");
const latencyMs    = document.getElementById("latency-ms");
const wordCountLbl = document.getElementById("word-count-label");
const limitSlider  = document.getElementById("limit-slider");
const limitVal     = document.getElementById("limit-val");
const vizIdle      = document.getElementById("viz-idle");
const vizNodes     = document.getElementById("viz-nodes");

// ─── State ───────────────────────────────────────────────────────────────────
let activeIndex   = -1;
let debounceTimer = null;
let currentPrefix = "";

const DEBOUNCE_MS = 120;


// ─── Bootstrap ───────────────────────────────────────────────────────────────
(async () => {
  try {
    const res  = await fetch("/health");
    const data = await res.json();
    wordCountLbl.textContent = `${data.words_loaded.toLocaleString()} words loaded in vocabulary`;
  } catch {
    wordCountLbl.textContent = "vocabulary loaded";
  }
  input.focus();
})();


// ─── Limit slider ────────────────────────────────────────────────────────────
limitSlider.addEventListener("input", () => {
  limitVal.textContent = limitSlider.value;
  if (currentPrefix) runSearch(currentPrefix);
});


// ─── Input handler ────────────────────────────────────────────────────────────
input.addEventListener("input", () => {
  const prefix = input.value;
  clearBtn.classList.toggle("hidden", prefix.length === 0);

  if (!prefix.trim()) {
    resetUI();
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSearch(prefix.trim().toLowerCase()), DEBOUNCE_MS);
});


// ─── Keyboard navigation ──────────────────────────────────────────────────────
input.addEventListener("keydown", (e) => {
  const items = sugList.querySelectorAll(".suggestion-item");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActive(Math.min(activeIndex + 1, items.length - 1), items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setActive(Math.max(activeIndex - 1, -1), items);
  } else if (e.key === "Enter" && activeIndex >= 0) {
    e.preventDefault();
    selectSuggestion(items[activeIndex].dataset.word);
  } else if (e.key === "Escape") {
    clearSearch();
  }
});

clearBtn.addEventListener("click", clearSearch);


// ─── Core search ─────────────────────────────────────────────────────────────
async function runSearch(prefix) {
  currentPrefix = prefix;
  const limit = parseInt(limitSlider.value, 10);

  const t0 = performance.now();

  // Fetch autocomplete suggestions and trie path data in parallel
  const [sugRes, pathRes] = await Promise.all([
    fetch(`/autocomplete?prefix=${encodeURIComponent(prefix)}&limit=${limit}`),
    fetch(`/trie-path?prefix=${encodeURIComponent(prefix)}`),
  ]);

  const elapsed = performance.now() - t0;

  const sugData  = await sugRes.json();
  const pathData = await pathRes.json();

  // Guard against stale responses from slow network when user typed faster
  if (prefix !== input.value.trim().toLowerCase()) return;

  renderSuggestions(sugData.suggestions);
  renderVisualizer(pathData);
  showLatency(elapsed);
}


// ─── Render suggestions ───────────────────────────────────────────────────────
function renderSuggestions(suggestions) {
  activeIndex = -1;
  sugList.innerHTML = "";

  // All three sections (sugList, emptyState, idleState) are mutually exclusive
  // and are flex-1 siblings — only one should be visible at a time
  idleState.classList.add("hidden");
  idleState.style.display = "none";

  if (!suggestions.length) {
    sugList.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.style.display = "flex";
    return;
  }

  emptyState.classList.add("hidden");
  emptyState.style.display = "none";
  sugList.classList.remove("hidden");

  suggestions.forEach((word, i) => {
    const item = document.createElement("div");
    item.className = "suggestion-item flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-emerald-900/10 group";
    item.dataset.word = word;

    const matched = word.slice(0, currentPrefix.length);
    const rest    = word.slice(currentPrefix.length);

    item.innerHTML = `
      <svg class="w-3 h-3 text-slate-700 flex-shrink-0 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="m9 18 6-6-6-6"/>
      </svg>
      <span class="suggestion-text font-mono text-sm xl:text-base text-slate-400">
        <span class="text-emerald-400 font-semibold">${escHtml(matched)}</span>${escHtml(rest)}
      </span>
      <span class="ml-auto text-xs text-slate-700 tabular-nums">${i + 1}</span>
    `;

    item.addEventListener("mouseenter", () => setActive(i, sugList.querySelectorAll(".suggestion-item")));
    item.addEventListener("click", () => selectSuggestion(word));
    sugList.appendChild(item);
  });
}


// ─── Keyboard active row ──────────────────────────────────────────────────────
function setActive(idx, items) {
  items.forEach((el) => el.classList.remove("active"));
  activeIndex = idx;
  if (idx >= 0) {
    items[idx].classList.add("active");
    items[idx].scrollIntoView({ block: "nearest" });
  }
}

function selectSuggestion(word) {
  input.value = word;
  clearBtn.classList.remove("hidden");
  runSearch(word);
  input.focus();
}


// ─── Latency badge ────────────────────────────────────────────────────────────
function showLatency(ms) {
  latencyBadge.classList.remove("hidden");
  latencyMs.textContent = `${ms.toFixed(2)} ms`;

  if      (ms < 5)  latencyDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400";
  else if (ms < 20) latencyDot.className = "w-1.5 h-1.5 rounded-full bg-amber-400";
  else              latencyDot.className = "w-1.5 h-1.5 rounded-full bg-red-400";
}


// ─── Vertical Trie Path Visualizer ───────────────────────────────────────────
/**
 * renderVisualizer receives /trie-path data:
 * {
 *   prefix: "app",
 *   valid: true,
 *   path: [
 *     { char: "a", depth: 1, children_count: 26, is_word: true },
 *     { char: "p", depth: 2, children_count: 10, is_word: true },
 *     { char: "p", depth: 3, children_count: 6,  is_word: true },
 *   ]
 * }
 *
 * We render a vertical chain:
 *
 *   ┌────────┐
 *   │  ROOT  │
 *   └────┬───┘
 *        │  26 branches
 *   ┌────▼───┐
 *   │   a    │  ← is_word ✓
 *   └────┬───┘
 *        │  10 branches
 *   ┌────▼───┐
 *   │   p    │
 *   └────┬───┘
 *        │  6 branches  ← branching factor shown on edge
 *   ┌────▼───┐  ← green ring = EOW
 *   │   p    │  ✓ word
 *   └────────┘
 *
 * If the prefix hits a dead end mid-way, a red ✕ node is appended.
 */
function renderVisualizer(data) {
  vizNodes.innerHTML = "";

  if (!data.prefix) {
    showVizIdle();
    return;
  }

  vizIdle.classList.add("hidden");
  vizNodes.classList.remove("hidden");
  // Use flex-col to stack nodes vertically
  vizNodes.style.display = "flex";
  vizNodes.style.flexDirection = "column";
  vizNodes.style.alignItems = "center";

  // Root node (no animation delay)
  vizNodes.appendChild(makeNode({
    label:   "ROOT",
    sublabel: "start",
    isRoot:  true,
    isWord:  false,
    isLast:  false,
    delay:   0,
  }));

  if (!data.valid && data.path.length === 0) {
    // First character already has no match
    vizNodes.appendChild(makeEdge({ branchCount: null, dead: true }));
    vizNodes.appendChild(makeNode({
      label:   data.prefix[0] || "?",
      sublabel: "not found",
      isDead:  true,
      delay:   1,
    }));
    return;
  }

  data.path.forEach((step, i) => {
    const isLast = i === data.path.length - 1;
    const isDeadLast = isLast && !data.valid;

    // Edge: shows the branch count of the NODE WE ARE ABOUT TO ENTER
    // We show it on the connector going INTO this node.
    // Exception: after the last valid node, if dead, show a dead edge.
    vizNodes.appendChild(makeEdge({
      branchCount: step.children_count,
      dead: false,
    }));

    vizNodes.appendChild(makeNode({
      label:   step.char,
      sublabel: step.is_word ? `${step.children_count}↓ · word` : `${step.children_count}↓`,
      isWord:  step.is_word,
      isLast:  isLast && data.valid,
      delay:   i + 1,
    }));
  });

  // Dead-end node after valid path runs out
  if (!data.valid) {
    const deadChar = data.prefix[data.path.length] || "?";
    vizNodes.appendChild(makeEdge({ branchCount: null, dead: true }));
    vizNodes.appendChild(makeNode({
      label:   deadChar,
      sublabel: "not found",
      isDead:  true,
      delay:   data.path.length + 1,
    }));
  }
}


/**
 * makeNode — builds one vertical node element.
 *
 * @param {object} opts
 *   label     string  - character (or "ROOT") shown inside the circle
 *   sublabel  string  - small annotation below the circle (branch count, "word", etc.)
 *   isRoot    bool    - root node styling
 *   isWord    bool    - node is an end-of-word marker (green ring + glow)
 *   isLast    bool    - the last node on a valid path (brighter)
 *   isDead    bool    - dead-end node (red ring)
 *   delay     number  - stagger index for animation delay
 */
function makeNode({ label, sublabel = "", isRoot = false, isWord = false, isLast = false, isDead = false, delay = 0 }) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col items-center";
  wrapper.style.animationDelay = `${delay * 55}ms`;

  // Determine visual style
  let ringCls, bgCls, textCls, glowCls;

  if (isDead) {
    ringCls = "ring-red-500/70";
    bgCls   = "bg-red-950/40";
    textCls = "text-red-400";
    glowCls = "";
  } else if (isRoot) {
    ringCls = "ring-slate-600/60";
    bgCls   = "bg-slate-900/60";
    textCls = "text-slate-500 text-[10px] tracking-widest uppercase";
    glowCls = "";
  } else if (isLast && isWord) {
    // End of path AND it's a complete word: bright emerald glow
    ringCls = "ring-emerald-400";
    bgCls   = "bg-emerald-900/40";
    textCls = "text-emerald-300 font-bold text-base";
    glowCls = "shadow-lg shadow-emerald-500/30";
  } else if (isLast) {
    // End of prefix path, not a word
    ringCls = "ring-emerald-500/80";
    bgCls   = "bg-emerald-950/50";
    textCls = "text-emerald-400 font-semibold text-base";
    glowCls = "shadow-md shadow-emerald-500/20";
  } else {
    // Regular path node
    ringCls = "ring-emerald-700/50";
    bgCls   = "bg-emerald-950/30";
    textCls = "text-emerald-500 text-sm";
    glowCls = "";
  }

  // Circle
  const circle = document.createElement("div");
  circle.className = `trie-node w-12 h-12 rounded-full ring-2 ${ringCls} ${bgCls} ${glowCls} flex items-center justify-center font-mono ${textCls} transition-all select-none`;
  circle.style.animationDelay = `${delay * 55}ms`;

  if (isRoot) {
    // Show a small dot for root
    circle.innerHTML = `<span class="text-slate-600 text-lg">●</span>`;
  } else if (isDead) {
    circle.innerHTML = `<span>${escHtml(label)}</span>`;
  } else {
    circle.textContent = label;
  }

  // Sub-label (branch count / word indicator)
  const sub = document.createElement("div");
  sub.className = "mt-1.5 text-[10px] font-mono text-center leading-tight";
  if (isDead) {
    sub.innerHTML = `<span class="text-red-600">✕ ${escHtml(sublabel)}</span>`;
  } else if (isRoot) {
    sub.innerHTML = `<span class="text-slate-700">root</span>`;
  } else if (isLast && isWord) {
    sub.innerHTML = `<span class="text-emerald-500">${escHtml(sublabel)}</span>`;
  } else {
    sub.innerHTML = `<span class="text-slate-700">${escHtml(sublabel)}</span>`;
  }

  wrapper.appendChild(circle);
  wrapper.appendChild(sub);
  return wrapper;
}


/**
 * makeEdge — builds the vertical connector between two nodes.
 * Shows branch count in the middle of the line.
 *
 * @param {object} opts
 *   branchCount  number|null  - number of branches at the node above this edge
 *   dead         bool         - red dead-end edge
 */
function makeEdge({ branchCount, dead = false }) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col items-center my-0.5";

  const lineColor = dead ? "bg-red-800/40" : "bg-emerald-700/30";

  // Top half of the line
  const top = document.createElement("div");
  top.className = `w-px h-4 ${lineColor}`;

  // Branch count badge (shown on the edge between nodes)
  const badge = document.createElement("div");
  if (branchCount !== null && branchCount !== undefined) {
    badge.className = "text-[9px] font-mono text-slate-700 tabular-nums py-0.5";
    badge.textContent = `${branchCount}↓`;
  }

  // Bottom half of the line
  const bottom = document.createElement("div");
  bottom.className = `w-px h-4 ${lineColor}`;

  wrapper.appendChild(top);
  if (branchCount !== null && branchCount !== undefined) wrapper.appendChild(badge);
  wrapper.appendChild(bottom);
  return wrapper;
}


// ─── Helpers ─────────────────────────────────────────────────────────────────
function showVizIdle() {
  vizIdle.classList.remove("hidden");
  vizNodes.style.display = "none";
}

function resetUI() {
  currentPrefix = "";
  sugList.innerHTML = "";
  sugList.classList.add("hidden");

  emptyState.classList.add("hidden");
  emptyState.style.display = "none";

  idleState.classList.remove("hidden");
  idleState.style.display = "flex";

  latencyBadge.classList.add("hidden");
  clearBtn.classList.add("hidden");
  activeIndex = -1;
  showVizIdle();
}

function clearSearch() {
  input.value = "";
  input.focus();
  resetUI();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
