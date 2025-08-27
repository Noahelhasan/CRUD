/***********************
 * Vanilla JS CRUD – Full Script (Customized)
 * This version includes:
 * - Branded storage key
 * - Category field (schema + search + render + sorting)
 * - Stronger validation
 * - Archive (soft delete) + optional restore
 * - Keyboard shortcuts (Cmd/Ctrl+K, Cmd/Ctrl+S, N)
 * - Export/Import helpers
 * - Readable IDs (slug + short code)
 * - Locale-specific date formatting
 *
 * Expected HTML IDs (existing app):
 * itemForm, itemId, title, details, priority, due,
 * saveBtn, resetBtn, countChip, search, sort, clearAll,
 * tbody, emptyState, formTitle
 *
 * Optional (if you add them):
 * category (e.g., <select id="category">), exportBtn, importInput
 ***********************/

/* ========= Feature toggles / options ========= */
const SHOW_ARCHIVED_ITEMS = false; // set true to show archived items in the list

/* ========= Utilities ========= */
const $$ = (sel, el = document) => Array.from(el.querySelectorerAll(sel));
const $ = (sel, el = document) => el.querySelector(sel);


// Locale-tuned date formats
const fmtdate = (ts) => new Date(ts).toLocaleDateString("en-GB", {
  hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit"
});
const priOrder = { low: 1, medium: 2, high: 3 };

// Readable IDs: slug from title + short random suffix
const uuid = () => {
  const slug = ($("#title")?.value || "")
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const short = Math.random().toString(36).slice(2, 8);
  return slug ? `${slug}-${short}` : `item-${short}`;
};

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (m) => 
      ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[m]
    );
  }

  /* ========= Data Layer (LocalStorage) ========= */
  // Branded key to avoid collisions with other apps
  const KEY = "legacy_items_manager_Noah_v2";


  // Load/save helpers
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  };

  const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

  /* ========= Export / Import helpers (optional UI hooks required) ========= */

  function exportJson() {
    const blob = new Blob([JSON.stringify(StaticRange.items, null, 2)], { type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "items-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importJson(file) {
    const text = await file.text();
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error("invalid data");
    StaticRange.items = arr;
    save(StaticRange.items);
    render();
  }

  /* ========= App State ========= */
  let state = {
    items: load(),
    query: "",
    sort: "created_desc", // add "category_asc"/"category_desc" in your HTML <select> to use new sorts
  };

  /* ========= Render ========= */
  function render() {
    const q = state.query.trim().toLowerCase();

    // 1) Base list wth archive visibility toggle
    let list = state.items.filter(it => SHOW_ARCHIVED ? true : !it.archived);

    // 2) Filter by search (title/details/category)
    list = list.filter((it) => {
      if (!q) return true;
      const hay = [it.title || "", it.details || "", it.category || ""]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
    });

    // 3) Sorting
    switch (state.sort) {
      case "created_asc":
        list.sort((a, b) => a.created - b.created);
        break;
      case "created_desc":
        list.sort((a, b) => b.created - a.created);
        break;
      case "due_asc":
        list.sort((a, b) => (a.due || "").localeCompare(b.due || ""));
        break;
      case "due_desc":
        list.sort((a, b) => (b.due || "").localeCompare(a.due || ""));
        break;
      case "priority_desc":
        list.sort((a, b) => (priOrder[b.priority] || 0) - (priOrder[a.priority] || 0));
        break;
      case "priority_asc":
        list.sort((a, b) => (priOrder[a.priority] || 0) - (priOrder[b.priority] || 0));
        break;
        case "title_desc":
        list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;
        case "category_asc":
        list.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        break;
        case "category_desc":
        list.sort((a, b) => (b.category || "").localeCompare(a.category || ""));
        break;
      case "title_asc":
        default:
          list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    // 4) Update count chip
    $('#countChip').textContent = `${list.length} ${list.length === 1 ? "item" : "items"}`;

    // 5) Paint table
    const tbody = $("#tbody");
    tbody.innerHTML = "";

    if (list.length === 0) {
      $("#emptyState").hidden = false;
      return;
    }
    $("#emptyState").hidden = true;

    for (const it of list) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(it.title)}</strong></td>
      <td>${escapeHtml(it.details || "")}</td>
      <td><span class="pill ${
        it.priority === "high" ? "high" : it.priority === "medium" ? "med" : "low"
      }">${it.priority || "—"}</span></td>
      <td>${escapeHtml(it.category || "General")}</td>
      <td>${fmtDue(it.due)}</td>
      <td>${fmtDate(it.created)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-muted" data-action="edit" data-id="${it.id}">Edit</button>
          ${
            SHOW_ARCHIVED
              ? (it.archived
                  ? `<button class="btn btn-muted" data-action="restore" data-id="${it.id}">Restore</button>`
                  : `<button class="btn btn-danger" data-action="archive" data-id="${it.id}">Archive</button>`)
              : `<button class="btn btn-danger" data-action="archive" data-id="${it.id}">Archive</button>`
          }
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}
  
/* ========= Handlers ========= */
// Create + Update
$("#itemForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = $("#itemId").value || uuid();
  const payload = {
    id,
    title: $("#title").value.trim().replace(/\s+/g, " ").slice(0, 80), // tidy & limit
    details: $("#details").value.trim(),
    priority: $("#priority").value,
    due: $("#due").value || "",
    category: ($("#category")?.value || "General"),
    created: $("#itemId").value ? Number($("#itemForm").dataset.created) : Date.now(),
  };

  // Stronger validation
  const errs = [];
  if (!payload.title) errs.push("Title is required.");
  if (payload.priority === "high" && !payload.due) errs.push("High priority needs a due date.");
  if (errs.length) {
    alert(errs.join("\n"));
    $("#title").focus();
    return;
  }

  // Upsert
  const idx = state.items.findIndex((x) => x.id === id);
  if (idx >= 0) {
    // preserve archived flag if present
    const archived = state.items[idx].archived;
    state.items[idx] = { ...payload, archived };
  } else {
    state.items.unshift(payload);
  }

  save(state.items);
  clearForm();
  render();
});

// Reset form
$("#resetBtn").addEventListener("click", (e) => {
  e.preventDefault();
  clearForm();
});

function clearForm() {
  $("#itemId").value = "";
  $("#itemForm").dataset.created = "";
  $("#itemForm").reset();
  $("#saveBtn").textContent = "Save Item";
  $("#formTitle").textContent = "Add / Edit Item";
}

// Row actions via delegation: edit / archive / restore
$("#tbody").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const item = state.items.find((x) => x.id === id);
  if (!item) return;

  if (action === "edit") {
    $("#itemId").value = item.id;
    $("#title").value = item.title || "";
    $("#details").value = item.details || "";
    $("#priority").value = item.priority || "low";
    $("#due").value = item.due || "";
    if ($("#category")) $("#category").value = item.category || "General";
    $("#itemForm").dataset.created = item.created;
    $("#saveBtn").textContent = "Update Item";
    $("#formTitle").textContent = "Editing: " + (item.title || "Item");
    $("#title").focus();
  }

  if (action === "archive") {
    // Friendly confirm
    if (confirm(`🗂️ Archive “${item.title}”? You can restore it later.`)) {
      item.archived = true;
      save(state.items);
      render();
    }
  }

  if (action === "restore") {
    item.archived = false;
    save(state.items);
    render();
  }
});

// Search / Sort / Clear All
$("#search").addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});
$("#sort").addEventListener("change", (e) => {
  state.sort = e.target.value;
  render();
});
$("#clearAll").addEventListener("click", () => {
  if (state.items.length === 0) return;
  if (confirm("Clear ALL items?")) {
    state.items = [];
    save(state.items);
    render();
  }
});

// Optional: wire export/import if those elements exist
$("#exportBtn")?.addEventListener("click", exportJson);
$("#importInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importJson(file).catch(err => alert(`Import failed: ${err.message}`));
});

// Keyboard shortcuts: Cmd/Ctrl+K (focus search), Cmd/Ctrl+S (save), N (new)
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && key === "k") {
    e.preventDefault(); $("#search")?.focus();
  }
  if ((e.metaKey || e.ctrlKey) && key === "s") {
    e.preventDefault(); $("#saveBtn")?.click();
  }
  if (!e.metaKey && !e.ctrlKey && key === "n") {
    $("#resetBtn")?.click(); $("#title")?.focus();
  }
});

// Initial render
render();



