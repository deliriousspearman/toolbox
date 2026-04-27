(function () {
  "use strict";

  // ── Colour palette for token highlighting ─────────────────────────────────

  const COLORS = ["#bd93f9", "#ff79c6", "#8be9fd", "#ffb86c", "#50fa7b", "#f1fa8c"];

  // ── State ─────────────────────────────────────────────────────────────────

  let commands         = [];
  let editingId        = null;
  let activeCategories = new Set();

  // ── API helpers ───────────────────────────────────────────────────────────

  async function loadCommands() {
    try {
      const res = await fetch("api.php");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      commands = await res.json();
    } catch (e) {
      /* Keep the in-memory state empty so the UI still renders, but
         warn loudly and toast so a silent empty list doesn't hide a
         real server problem. showToast is hoisted so it's safe to
         call here even though init() hasn't run yet.               */
      console.warn("shell-explain: loadCommands failed", e);
      commands = [];
      showToast("Couldn't load commands — " + (e.message || "network error"));
    }
  }

  async function saveCommand(entry) {
    const res = await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", entry }),
    });
    if (!res.ok) throw new Error(`save failed (HTTP ${res.status})`);
  }

  async function deleteCommand(id) {
    const res = await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) throw new Error(`delete failed (HTTP ${res.status})`);
  }

  // ── Token colouriser ──────────────────────────────────────────────────────
  //
  // Returns [{text, colorIdx}] where colorIdx is the part index (0-based)
  // or -1 for unmatched text.  Processes parts in order; each token is matched
  // to its first remaining uncoloured occurrence in the command string.

  function colorize(command, parts) {
    let segs = [{ text: command, colorIdx: -1 }];

    parts.forEach((part, idx) => {
      const token = part.token;
      let found = false;

      segs = segs.flatMap((seg) => {
        if (seg.colorIdx !== -1 || found) return [seg];

        const i = seg.text.indexOf(token);
        if (i === -1) return [seg];

        found = true;
        const out = [];
        if (i > 0) out.push({ text: seg.text.slice(0, i), colorIdx: -1 });
        out.push({ text: token, colorIdx: idx });
        const after = seg.text.slice(i + token.length);
        if (after) out.push({ text: after, colorIdx: -1 });
        return out;
      });
    });

    return segs;
  }

  // ── Card builder ──────────────────────────────────────────────────────────

  /* Stable hash used to map a category name to a stripe colour — same
     category always paints the same stripe, so users can scan-group
     cards visually without explicit per-category colour config.      */
  function catHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function makeCard(cmd) {
    const card = document.createElement("div");
    card.className = "cmd-card";

    const firstCat = (cmd.categories || [])[0];
    if (firstCat) {
      card.style.setProperty("--card-stripe", COLORS[catHash(firstCat) % COLORS.length]);
    }

    // ── Command string with coloured tokens ──────────────────────────────
    const cmdLine = document.createElement("div");
    cmdLine.className = "cmd-line";

    const prompt = document.createElement("span");
    prompt.className = "cmd-prompt";
    prompt.textContent = "$ ";
    cmdLine.appendChild(prompt);

    colorize(cmd.command, cmd.parts).forEach((seg) => {
      const span = document.createElement("span");
      span.textContent = seg.text;
      if (seg.colorIdx >= 0) span.style.color = COLORS[seg.colorIdx % COLORS.length];
      cmdLine.appendChild(span);
    });

    // ── Description ──────────────────────────────────────────────────────
    const desc = document.createElement("p");
    desc.className = "cmd-desc";
    desc.textContent = cmd.description;

    // ── Category tags ─────────────────────────────────────────────────────
    const cats = cmd.categories || [];
    const tagsEl = document.createElement("div");
    tagsEl.className = "cmd-tags";
    cats.forEach((cat) => {
      const tag = document.createElement("span");
      tag.className = "cmd-tag";
      tag.textContent = cat;
      tag.addEventListener("click", () => {
        activeCategories.clear();
        activeCategories.add(cat);
        document.getElementById("search-input").value = "";
        renderCategoryFilters();
        renderList();
      });
      tagsEl.appendChild(tag);
    });

    // ── Parts list (collapsible, open by default) ───────────────────────
    const partsWrap = document.createElement("div");
    partsWrap.className = "cmd-parts-wrap";

    const partsToggle = document.createElement("button");
    partsToggle.type = "button";
    partsToggle.className = "parts-toggle";
    const partsArrow = document.createElement("span");
    partsArrow.className = "parts-arrow";
    partsArrow.textContent = "▾"; /* ▾ */
    partsToggle.appendChild(partsArrow);
    partsToggle.appendChild(document.createTextNode(" Parts"));
    partsToggle.addEventListener("click", () => {
      card.classList.toggle("parts-collapsed");
    });

    const partsEl = document.createElement("div");
    partsEl.className = "cmd-parts";

    cmd.parts.forEach((part, idx) => {
      const row = document.createElement("div");
      row.className = "part-row";

      const dot = document.createElement("span");
      dot.className = "part-dot";
      dot.textContent = "●";
      dot.style.color = COLORS[idx % COLORS.length];

      const tok = document.createElement("code");
      tok.className = "part-token";
      tok.textContent = part.token;
      tok.style.color = COLORS[idx % COLORS.length];

      const dsc = document.createElement("span");
      dsc.className = "part-desc-text";
      dsc.textContent = part.desc;

      row.append(dot, tok, dsc);
      partsEl.appendChild(row);
    });

    partsWrap.append(partsToggle, partsEl);

    card.append(cmdLine, desc);
    if (cats.length > 0) card.appendChild(tagsEl);
    card.appendChild(partsWrap);

    // ── Edit / delete controls (all cards) ───────────────────────────────
    const controls = document.createElement("div");
    controls.className = "card-controls";

    const editBtn = document.createElement("button");
    editBtn.textContent = "✎ Edit";
    editBtn.addEventListener("click", () => openModal(cmd));

    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => deleteEntry(cmd.id));

    controls.append(editBtn, delBtn);
    card.appendChild(controls);

    return card;
  }

  // ── Search / filter ───────────────────────────────────────────────────────

  function matches(cmd, query) {
    const q = query.toLowerCase();
    return (
      cmd.command.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      (cmd.categories || []).some((c) => c.toLowerCase().includes(q)) ||
      cmd.parts.some(
        (p) => p.token.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
      )
    );
  }

  // ── Category filter renderer ──────────────────────────────────────────────

  function renderCategoryFilters() {
    const container = document.getElementById("cat-filters");
    const allCats = new Set();
    for (const cmd of commands) (cmd.categories || []).forEach((c) => allCats.add(c));

    container.innerHTML = "";
    if (allCats.size === 0) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");

    [...allCats].sort().forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "cat-btn" + (activeCategories.has(cat) ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        if (activeCategories.has(cat)) {
          activeCategories.delete(cat);
        } else {
          activeCategories.add(cat);
        }
        renderCategoryFilters();
        renderList();
      });
      container.appendChild(btn);
    });
  }

  // ── List renderer ─────────────────────────────────────────────────────────

  function renderList() {
    const query   = document.getElementById("search-input").value.trim();
    const list    = document.getElementById("cmd-list");
    const emptyEl = document.getElementById("empty-state");

    let visible = activeCategories.size > 0
      ? commands.filter((cmd) => (cmd.categories || []).some((c) => activeCategories.has(c)))
      : commands.slice();

    if (query) visible = visible.filter((c) => matches(c, query));

    list.innerHTML = "";

    if (visible.length === 0) {
      emptyEl.textContent = query
        ? `No commands match "${query}"`
        : "No commands yet — add one!";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    const frag = document.createDocumentFragment();
    for (const cmd of visible) frag.appendChild(makeCard(cmd));
    list.appendChild(frag);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("visible"), 2500);
  }

  // ── Delete a command ──────────────────────────────────────────────────────

  async function deleteEntry(id) {
    try {
      await deleteCommand(id);
    } catch (e) {
      showToast("Delete failed — " + e.message);
      return;
    }
    commands = commands.filter((c) => c.id !== id);
    renderCategoryFilters();
    renderList();
  }

  // ── Modal: capture current part inputs ───────────────────────────────────

  function captureModalParts() {
    const rows = document.querySelectorAll("#modal-parts .modal-part-row");
    return Array.from(rows).map((row) => ({
      token: row.querySelector(".modal-part-token").value,
      desc:  row.querySelector(".modal-part-desc-input").value,
    }));
  }

  // ── Modal: category chip helpers ──────────────────────────────────────────

  function addCategoryChip(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const container = document.getElementById("modal-cat-chips");
    const chip = document.createElement("span");
    chip.className = "modal-cat-chip";
    chip.dataset.value = trimmed;
    const label = document.createElement("span");
    label.textContent = trimmed;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.textContent = "×";
    rm.addEventListener("click", () => chip.remove());
    chip.append(label, rm);
    container.appendChild(chip);
  }

  function captureModalCategories() {
    return [...new Set(
      Array.from(document.querySelectorAll("#modal-cat-chips .modal-cat-chip"))
        .map((c) => c.dataset.value)
        .filter(Boolean)
    )];
  }

  // ── Modal: render parts list ──────────────────────────────────────────────

  function renderModalParts(parts) {
    const container = document.getElementById("modal-parts");
    container.innerHTML = "";

    parts.forEach((part, i) => {
      const row = document.createElement("div");
      row.className = "modal-part-row";

      const tokenInput = document.createElement("input");
      tokenInput.type        = "text";
      tokenInput.placeholder = "token";
      tokenInput.value       = part.token;
      tokenInput.className   = "modal-part-token";
      tokenInput.spellcheck  = false;

      const descInput = document.createElement("input");
      descInput.type        = "text";
      descInput.placeholder = "what this part does";
      descInput.value       = part.desc;
      descInput.className   = "modal-part-desc-input";

      const delBtn = document.createElement("button");
      delBtn.type        = "button";
      delBtn.textContent = "✕";
      delBtn.className   = "modal-part-del";
      delBtn.addEventListener("click", () => {
        const current = captureModalParts();
        current.splice(i, 1);
        if (current.length === 0) current.push({ token: "", desc: "" });
        renderModalParts(current);
      });

      row.append(tokenInput, descInput, delBtn);
      container.appendChild(row);
    });
  }

  // ── Modal: open ───────────────────────────────────────────────────────────

  function openModal(cmd = null) {
    editingId = cmd ? cmd.id : null;

    document.getElementById("modal-title-text").textContent = cmd ? "EDIT COMMAND" : "ADD COMMAND";
    document.getElementById("modal-command").value = cmd ? cmd.command     : "";
    document.getElementById("modal-desc").value    = cmd ? cmd.description : "";
    document.getElementById("modal-error").classList.add("hidden");

    document.getElementById("modal-cat-chips").innerHTML = "";
    (cmd ? (cmd.categories || []) : []).forEach(addCategoryChip);
    document.getElementById("modal-cat-input").value = "";

    renderModalParts(cmd ? cmd.parts : [{ token: "", desc: "" }]);
    document.getElementById("add-modal").classList.remove("hidden");
    document.getElementById("modal-command").focus();
  }

  // ── Modal: close ──────────────────────────────────────────────────────────

  function closeModal() {
    document.getElementById("add-modal").classList.add("hidden");
    editingId = null;
  }

  // ── Modal: add part row ───────────────────────────────────────────────────

  function addModalPart() {
    const current = captureModalParts();
    current.push({ token: "", desc: "" });
    renderModalParts(current);
    const rows = document.querySelectorAll("#modal-parts .modal-part-row");
    const last = rows[rows.length - 1];
    if (last) last.querySelector(".modal-part-token").focus();
  }

  // ── Modal: save ───────────────────────────────────────────────────────────

  async function saveModal() {
    const command     = document.getElementById("modal-command").value.trim();
    const description = document.getElementById("modal-desc").value.trim();
    const parts       = captureModalParts()
      .map((p) => ({ token: p.token.trim(), desc: p.desc.trim() }))
      .filter((p) => p.token);

    // Commit any pending text in the category input before saving
    const catInputEl = document.getElementById("modal-cat-input");
    const pendingCat = catInputEl.value.replace(/,/g, "").trim();
    if (pendingCat && !captureModalCategories().includes(pendingCat)) {
      addCategoryChip(pendingCat);
      catInputEl.value = "";
    }

    const categories = captureModalCategories();
    const errorEl    = document.getElementById("modal-error");

    if (!command) {
      errorEl.textContent = "Command is required.";
      errorEl.classList.remove("hidden");
      document.getElementById("modal-command").focus();
      return;
    }

    if (parts.length === 0) {
      errorEl.textContent = "Add at least one part.";
      errorEl.classList.remove("hidden");
      return;
    }

    errorEl.classList.add("hidden");

    const entry = {
      id: editingId || `custom-${Date.now()}`,
      command,
      description,
      parts,
      categories,
    };

    try {
      await saveCommand(entry);
    } catch (e) {
      errorEl.textContent = "Save failed — changes not persisted. " + e.message;
      errorEl.classList.remove("hidden");
      return; // leave the modal open so the user can retry
    }

    if (editingId) {
      const idx = commands.findIndex((c) => c.id === editingId);
      if (idx >= 0) commands[idx] = entry;
      else commands.unshift(entry);
    } else {
      commands.unshift(entry);
    }

    closeModal();
    renderCategoryFilters();
    renderList();
  }

  // ── Site-wide light/dark theme ────────────────────────────────────────────

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    await loadCommands();

    siteTheme.init();

    document.getElementById("search-input").addEventListener("input", renderList);

    document.getElementById("add-btn").addEventListener("click", () => openModal());

    // Modal controls
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-cancel").addEventListener("click", closeModal);
    document.getElementById("modal-save").addEventListener("click", saveModal);
    document.getElementById("add-part-btn").addEventListener("click", addModalPart);

    // Category input: Enter or comma commits chip
    document.getElementById("modal-cat-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = e.target.value.replace(/,/g, "").trim();
        if (val && !captureModalCategories().includes(val)) addCategoryChip(val);
        e.target.value = "";
      }
    });

    // Focus cat input when clicking anywhere in the chip row
    document.getElementById("modal-cat-row").addEventListener("click", () => {
      document.getElementById("modal-cat-input").focus();
    });

    // Close modal on backdrop click or Escape
    document.getElementById("add-modal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("add-modal")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    // Save on Ctrl/Cmd + Enter while modal is open
    document.getElementById("add-modal").addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") saveModal();
    });

    renderCategoryFilters();
    renderList();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
