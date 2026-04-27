/* Forensics artifact checklist. Loads artifacts.json from api.php (GET),
   lets the user tick items per (os, version) with state persisted in
   localStorage, and edits the master list via api.php POST (same-origin
   gated, single-action 'replace' — whole tree replaced at once). */

(function () {
  "use strict";

  const STORAGE_KEY = "forensics:collected";
  const API_URL = "api.php";

  /* Display labels for the OS-family dropdown. Keys that aren't listed
     fall back to the raw data key. */
  const OS_LABELS = {
    windows:  "Windows",
    linux:    "Linux",
    proxmox:  "Proxmox VE",
    esxi:     "VMware ESXi",
    truenas:  "TrueNAS",
    vyos:     "VyOS",
    pfsense:  "pfSense"
  };

  const state = {
    data: null,       // the full artifacts tree
    os: null,         // selected family key (e.g. "windows", "proxmox")
    version: null,    // selected version string
    editing: false,
    collected: {},    // { "windows:Windows 10": ["id1", ...], ... }
    snapshot: null    // JSON string of data taken on entering edit mode
  };

  // ── DOM handles ────────────────────────────────────────────────────────────

  const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error("forensics: missing element #" + id);
    return el;
  };

  const els = {};

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    siteTheme.init();

    els.emptyState    = $("empty-state");
    els.list          = $("artifact-list");
    els.osSelect      = $("os-select");
    els.versionSelect = $("version-select");
    els.progress      = $("progress");
    els.clearBtn      = $("clear-btn");
    els.editBtn       = $("edit-btn");
    els.saveBtn       = $("save-btn");
    els.cancelBtn     = $("cancel-btn");

    const raw = safeStorage.get(STORAGE_KEY);
    if (raw) {
      try { state.collected = JSON.parse(raw) || {}; }
      catch (e) { console.warn("forensics: bad collected state", e); state.collected = {}; }
    }

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      state.data = await res.json();
    } catch (err) {
      console.warn("forensics: fetch failed", err);
      showToast("Couldn't load artifacts — " + (err.message || "network error"));
      return;
    }

    renderOsPicker();
    wireEvents();
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  function wireEvents() {
    els.osSelect.addEventListener("change", () => {
      if (els.osSelect.value) pickOs(els.osSelect.value);
    });

    els.versionSelect.addEventListener("change", () => {
      state.version = els.versionSelect.value;
      renderList();
      updateProgress();
    });

    els.clearBtn.addEventListener("click", clearProgress);
    els.editBtn.addEventListener("click", enterEditMode);
    els.saveBtn.addEventListener("click", saveToServer);
    els.cancelBtn.addEventListener("click", cancelEditMode);
  }

  function renderOsPicker() {
    els.osSelect.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = "Choose platform…";
    els.osSelect.appendChild(placeholder);
    for (const key of Object.keys(state.data)) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = OS_LABELS[key] || key;
      els.osSelect.appendChild(opt);
    }
  }

  // ── OS / version selection ─────────────────────────────────────────────────

  function pickOs(os) {
    if (state.editing) return;
    state.os = os;
    els.osSelect.value = os;

    const versions = state.data[os].versions;
    els.versionSelect.textContent = "";
    for (const v of versions) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      els.versionSelect.appendChild(opt);
    }
    els.versionSelect.classList.remove("hidden");
    state.version = versions[0];
    els.versionSelect.value = state.version;

    els.clearBtn.classList.remove("hidden");
    els.editBtn.classList.remove("hidden");

    renderList();
    updateProgress();
  }

  function collectedKey() {
    return state.os + ":" + state.version;
  }

  function isCollected(id) {
    const ids = state.collected[collectedKey()] || [];
    return ids.indexOf(id) !== -1;
  }

  function setCollected(id, on) {
    const key = collectedKey();
    let ids = state.collected[key] || [];
    if (on) {
      if (ids.indexOf(id) === -1) ids = ids.concat(id);
    } else {
      ids = ids.filter((x) => x !== id);
    }
    if (ids.length) state.collected[key] = ids;
    else delete state.collected[key];
    safeStorage.save(STORAGE_KEY, JSON.stringify(state.collected));
  }

  function clearProgress() {
    if (state.editing || !state.os) return;
    delete state.collected[collectedKey()];
    safeStorage.save(STORAGE_KEY, JSON.stringify(state.collected));
    renderList();
    updateProgress();
    showToast("Cleared");
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  function itemAppliesToVersion(item, version) {
    if (!item.versions || !item.versions.length) return true;
    return item.versions.indexOf("*") !== -1 || item.versions.indexOf(version) !== -1;
  }

  function visibleCategoriesForCurrent() {
    if (!state.os || !state.version) return [];
    return state.data[state.os].categories.map((cat) => ({
      ...cat,
      items: cat.items.filter((it) => itemAppliesToVersion(it, state.version))
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderList() {
    els.list.textContent = "";
    if (!state.os) {
      els.emptyState.classList.remove("hidden");
      return;
    }
    els.emptyState.classList.add("hidden");

    if (state.editing) renderEditList();
    else renderChecklist();
  }

  function renderChecklist() {
    const cats = visibleCategoriesForCurrent();
    for (const cat of cats) {
      if (!cat.items.length) continue;
      els.list.appendChild(renderCategoryChecklist(cat));
    }
  }

  function renderCategoryChecklist(cat) {
    const wrap = document.createElement("section");
    wrap.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    const title = document.createElement("h2");
    title.className = "category-title";
    title.textContent = cat.name;
    header.appendChild(title);

    const count = document.createElement("span");
    count.className = "category-count";
    const done = cat.items.filter((it) => isCollected(it.id)).length;
    count.textContent = done + " / " + cat.items.length;
    header.appendChild(count);

    wrap.appendChild(header);

    for (const item of cat.items) {
      wrap.appendChild(renderItemChecklist(item));
    }
    return wrap;
  }

  function renderItemChecklist(item) {
    const row = document.createElement("div");
    row.className = "item";
    if (isCollected(item.id)) row.classList.add("collected");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "item-checkbox";
    cb.checked = isCollected(item.id);
    cb.setAttribute("aria-label", "Mark " + item.name + " collected");
    cb.addEventListener("change", () => {
      setCollected(item.id, cb.checked);
      row.classList.toggle("collected", cb.checked);
      updateProgress();
      /* update the per-category count inline */
      const cat = row.closest(".category");
      if (cat) {
        const count = cat.querySelector(".category-count");
        if (count) {
          const rows = cat.querySelectorAll(".item");
          const done = cat.querySelectorAll(".item.collected").length;
          count.textContent = done + " / " + rows.length;
        }
      }
    });
    row.appendChild(cb);

    const body = document.createElement("div");
    body.className = "item-body";

    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name;
    body.appendChild(name);

    if (item.path) {
      const path = document.createElement("div");
      path.className = "item-path";
      path.textContent = item.path;
      body.appendChild(path);
    }

    if (item.description) {
      const desc = document.createElement("div");
      desc.className = "item-desc";
      desc.textContent = item.description;
      body.appendChild(desc);
    }

    if (item.command) {
      const cmd = document.createElement("code");
      cmd.className = "item-cmd";
      cmd.textContent = item.command;
      body.appendChild(cmd);
    }

    row.appendChild(body);
    return row;
  }

  function updateProgress() {
    if (!state.os || !state.version) {
      els.progress.textContent = "";
      return;
    }
    const cats = visibleCategoriesForCurrent();
    let total = 0, done = 0;
    for (const cat of cats) {
      total += cat.items.length;
      done  += cat.items.filter((it) => isCollected(it.id)).length;
    }
    els.progress.textContent = done + " / " + total + " collected";
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  function enterEditMode() {
    if (!state.os) {
      showToast("Pick a platform first");
      return;
    }
    state.editing = true;
    state.snapshot = JSON.stringify(state.data);

    els.editBtn.classList.add("hidden");
    els.clearBtn.classList.add("hidden");
    els.saveBtn.classList.remove("hidden");
    els.cancelBtn.classList.remove("hidden");
    els.versionSelect.disabled = true;
    els.osSelect.disabled = true;

    renderList();
  }

  function exitEditMode() {
    state.editing = false;
    state.snapshot = null;

    els.editBtn.classList.remove("hidden");
    els.clearBtn.classList.remove("hidden");
    els.saveBtn.classList.add("hidden");
    els.cancelBtn.classList.add("hidden");
    els.versionSelect.disabled = false;
    els.osSelect.disabled = false;

    renderList();
    updateProgress();
  }

  function cancelEditMode() {
    if (state.snapshot) {
      try { state.data = JSON.parse(state.snapshot); }
      catch (e) { console.warn("forensics: snapshot restore failed", e); }
    }
    exitEditMode();
  }

  async function saveToServer() {
    /* Pull live values out of the inputs into state.data before POSTing. */
    commitEditsFromDom();

    els.saveBtn.disabled = true;
    els.saveBtn.textContent = "Saving…";
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replace", data: state.data })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || ("HTTP " + res.status));
      showToast("Saved");
      exitEditMode();
    } catch (err) {
      console.warn("forensics: save failed", err);
      showToast("Save failed — " + err.message);
    } finally {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = "Save";
    }
  }

  function commitEditsFromDom() {
    /* Walk the rendered .category nodes; each has data-cat-id binding it
       to a slot in state.data[state.os].categories. We rebuild the
       categories array so add/delete just works. */
    const os = state.os;
    const catNodes = els.list.querySelectorAll(".category");
    const rebuilt = [];
    catNodes.forEach((catNode) => {
      const catId = catNode.dataset.catId;
      const nameInput = catNode.querySelector(".category-title-input");
      const catName = (nameInput && nameInput.value.trim()) || "Untitled";
      const items = [];
      catNode.querySelectorAll(".item").forEach((itemNode) => {
        const id = itemNode.dataset.itemId;
        const get = (sel) => {
          const el = itemNode.querySelector(sel);
          return el ? el.value : "";
        };
        const name = get('[data-field="name"]').trim();
        if (!name) return; /* drop empty rows */
        const versionsRaw = get('[data-field="versions"]').trim();
        const versions = versionsRaw
          ? versionsRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : ["*"];
        items.push({
          id: id,
          name: name,
          path: get('[data-field="path"]').trim(),
          description: get('[data-field="description"]').trim(),
          command: get('[data-field="command"]').trim(),
          versions: versions
        });
      });
      rebuilt.push({ id: catId, name: catName, items: items });
    });
    state.data[os].categories = rebuilt;
  }

  function renderEditList() {
    const osCats = state.data[state.os].categories;
    for (const cat of osCats) {
      els.list.appendChild(renderCategoryEdit(cat));
    }
    const addCat = document.createElement("button");
    addCat.className = "add-btn";
    addCat.textContent = "+ Add category";
    addCat.addEventListener("click", () => {
      commitEditsFromDom();
      state.data[state.os].categories.push({
        id: "cat-" + makeId(),
        name: "New Category",
        items: []
      });
      renderList();
    });
    els.list.appendChild(addCat);
  }

  function renderCategoryEdit(cat) {
    const wrap = document.createElement("section");
    wrap.className = "category editing";
    wrap.dataset.catId = cat.id;

    const header = document.createElement("div");
    header.className = "category-header";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "category-title-input";
    titleInput.value = cat.name;
    header.appendChild(titleInput);

    const delBtn = document.createElement("button");
    delBtn.className = "category-delete";
    delBtn.textContent = "✕ remove category";
    delBtn.addEventListener("click", () => {
      if (!confirm("Delete category \"" + cat.name + "\" and all its items?")) return;
      commitEditsFromDom();
      state.data[state.os].categories = state.data[state.os]
        .categories.filter((c) => c.id !== cat.id);
      renderList();
    });
    header.appendChild(delBtn);

    wrap.appendChild(header);

    for (const item of cat.items) {
      wrap.appendChild(renderItemEdit(item));
    }

    const addItem = document.createElement("button");
    addItem.className = "add-btn";
    addItem.textContent = "+ Add item";
    addItem.addEventListener("click", () => {
      commitEditsFromDom();
      const fresh = state.data[state.os].categories.find((c) => c.id === cat.id);
      if (!fresh) return;
      fresh.items.push({
        id: "item-" + makeId(),
        name: "",
        path: "",
        description: "",
        command: "",
        versions: ["*"]
      });
      renderList();
    });
    wrap.appendChild(addItem);

    return wrap;
  }

  function renderItemEdit(item) {
    const row = document.createElement("div");
    row.className = "item";
    row.dataset.itemId = item.id;

    row.appendChild(editField("Name", "name", item.name, "input"));
    row.appendChild(editField("Path", "path", item.path, "input"));
    row.appendChild(editField("Description", "description", item.description, "textarea"));
    row.appendChild(editField("Command", "command", item.command, "input"));
    row.appendChild(editField(
      'Versions (comma-separated, "*" = all)',
      "versions",
      (item.versions || ["*"]).join(", "),
      "input"
    ));

    const delRow = document.createElement("div");
    delRow.className = "item-delete-row";
    const delBtn = document.createElement("button");
    delBtn.className = "item-delete";
    delBtn.textContent = "✕ remove";
    delBtn.addEventListener("click", () => {
      if (!confirm("Remove \"" + (item.name || "untitled") + "\"?")) return;
      commitEditsFromDom();
      for (const cat of state.data[state.os].categories) {
        cat.items = cat.items.filter((it) => it.id !== item.id);
      }
      renderList();
    });
    delRow.appendChild(delBtn);
    row.appendChild(delRow);

    return row;
  }

  function editField(label, key, value, type) {
    const wrap = document.createElement("div");
    wrap.className = "edit-field";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") input.type = "text";
    input.dataset.field = key;
    input.value = value || "";
    wrap.appendChild(input);
    return wrap;
  }

  function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("visible"), 2500);
  }

  init();
})();
