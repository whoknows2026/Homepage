/* ==========================================================================
   Who Knows? — Admin-Bereich — setlist.js
   Setlisten-Editor: Setlisten anlegen, Songs hinzufügen/entfernen, per
   Drag & Drop (oder Pfeil-Buttons) sortieren, Notizen je Song, Abschnitte
   (Set 1 / Set 2 / Zugabe …) und PDF-Export im festen "Bühnen"-Design.

   Daten (Firestore, nur für eingeloggte Admins lesbar — siehe README):
     setlists/{id}   { name, date, venue, city, showId, items[], createdAt, updatedAt }
                     items: { id, type: "section", label }
                          | { id, type: "song", title, note }
     repertoire/{id} { title, createdAt }

   Nutzt die Hilfsfunktionen aus admin.js (escapeText, escapeAttr, _calShows).
   ========================================================================== */

let _slDocs = [];          // alle Setlisten (sortiert)
let _slRepertoire = [];    // [{ id, title }]
let _slCurrentId = null;   // geöffnete Setliste
let _slData = null;        // Arbeitskopie der geöffneten Setliste
let _slSaveTimer = null;
let _slSaving = false;
let _slDragIndex = null;
let _slBound = false;

const SL_SECTION_PRESETS = ["SET 1", "SET 2", "ZUGABE"];

/* Die bisherige PDF-Setliste — per Klick als erste Setliste übernehmbar. */
const SL_SEED = {
  name: "Aktuelle Setliste",
  sections: [
    { label: "SET 1", songs: ["Joker and The Thief", "Tush", "Come Together", "Dead Flowers", "Cocaine Blues", "These Boots Are Made for Walkin", "Blue on Black", "Whisky in the Jar", "Runnin Down a Dream", "Zombie", "Ring of Fire", "Hier in der Kneipe (Akustik)", "I Loved Another Woman", "Wish You Were Here", "Geiler is schon", "Johnny Walker"] },
    { label: "SET 2", songs: ["Jam", "Texas Louisiana", "Passanger", "Folsom Prison Blues", "Achy Breaky Heart", "Sweet Home Alabama", "T.N.T", "Black Night (Into Jam)", "Gimme All Your Lovin", "Whole Lotta Love", "Paranoid", "Blitzkrieg Bob", "Let It Be", "Ain't No Sunshine", "Tage wie diese"] },
    { label: "ZUGABE", songs: ["Mercedes Benz", "La Grange", "Knocking on Heavens Door"] },
  ],
};

const slUid = () => Math.random().toString(36).slice(2, 10);
const slNorm = (t) => String(t || "").trim().toLowerCase();

function slFormatDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/* --------------------------------------------------------------------------
   START
   -------------------------------------------------------------------------- */
function initSetlists() {
  if (_slBound || !document.getElementById("setlist-editor")) return;
  _slBound = true;

  fbDb.collection("setlists").onSnapshot(
    (snap) => {
      _slDocs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          // Mit Datum: neueste zuerst; ohne Datum ans Ende, nach Name
          const da = a.date || "";
          const db = b.date || "";
          if (da && db) return db.localeCompare(da);
          if (da) return -1;
          if (db) return 1;
          return (a.name || "").localeCompare(b.name || "", "de");
        });
      renderSetlistList();
      // Geöffnete Liste wurde (z. B. auf einem anderen Gerät) gelöscht?
      if (_slCurrentId && !_slDocs.some((d) => d.id === _slCurrentId)) {
        _slCurrentId = null;
        _slData = null;
        renderSetlistEditor();
      }
    },
    (err) => {
      console.error(err);
      document.getElementById("setlist-list").innerHTML =
        '<p class="text-rust-light text-sm">Konnte nicht geladen werden. Sind die Firestore-Regeln aktualisiert (README, Abschnitt 9.3)?</p>';
    }
  );

  fbDb.collection("repertoire").onSnapshot(
    (snap) => {
      _slRepertoire = snap.docs
        .map((d) => ({ id: d.id, title: d.data().title || "" }))
        .filter((r) => r.title)
        .sort((a, b) => a.title.localeCompare(b.title, "de"));
      renderRepertoire();
      renderRepertoireDatalist();
    },
    (err) => console.error(err)
  );

  document.getElementById("setlist-new-btn").addEventListener("click", createSetlist);

  document.getElementById("repertoire-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("repertoire-title-input");
    const title = input.value.trim();
    if (!title) return;
    addToRepertoire([title]).then(() => { input.value = ""; });
  });

  // Ungespeicherte Änderungen vor dem Verlassen sichern
  window.addEventListener("beforeunload", (e) => {
    if (_slSaveTimer) {
      flushSetlistSave();
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

/* --------------------------------------------------------------------------
   LISTE DER SETLISTEN (links)
   -------------------------------------------------------------------------- */
function slSongCount(items) {
  return (items || []).filter((i) => i.type === "song").length;
}

function renderSetlistList() {
  const box = document.getElementById("setlist-list");
  if (!box) return;

  if (!_slDocs.length) {
    box.innerHTML = `
      <div class="text-paper-dim text-sm leading-relaxed">
        <p class="mb-3">Noch keine Setlisten angelegt.</p>
        <button type="button" id="setlist-seed-btn" class="btn-ghost text-xs px-3 py-2 rounded-sm w-full">
          Bisherige Setliste übernehmen (34 Songs)
        </button>
      </div>`;
    document.getElementById("setlist-seed-btn").addEventListener("click", seedSetlist);
    return;
  }

  box.innerHTML = "";
  _slDocs.forEach((d) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "setlist-list-item" + (d.id === _slCurrentId ? " active" : "");
    const meta = [slFormatDate(d.date), d.venue].filter(Boolean).join(" · ");
    btn.innerHTML = `
      <span class="block font-medium truncate">${escapeText(d.name || "Ohne Namen")}</span>
      <span class="block text-xs text-paper-dim truncate">${escapeText(meta || "Kein Datum")} · ${slSongCount(d.items)} Songs</span>`;
    btn.addEventListener("click", () => openSetlist(d.id));
    box.appendChild(btn);
  });
}

function openSetlist(id) {
  if (_slSaveTimer) flushSetlistSave();
  const d = _slDocs.find((x) => x.id === id);
  if (!d) return;
  _slCurrentId = id;
  _slData = {
    name: d.name || "",
    date: d.date || "",
    venue: d.venue || "",
    city: d.city || "",
    showId: d.showId || "",
    items: (d.items || []).map((i) => ({ ...i, id: i.id || slUid() })),
  };
  renderSetlistList();
  renderSetlistEditor();
}

async function createSetlist(_e, preset) {
  const data = preset || {
    name: "Neue Setliste",
    date: "",
    venue: "",
    city: "",
    showId: "",
    items: [{ id: slUid(), type: "section", label: "SET 1" }],
  };
  try {
    const ref = await fbDb.collection("setlists").add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Warten, bis der Snapshot die neue Liste kennt, dann öffnen
    const tryOpen = (n) => {
      if (_slDocs.some((d) => d.id === ref.id)) openSetlist(ref.id);
      else if (n > 0) setTimeout(() => tryOpen(n - 1), 100);
    };
    tryOpen(30);
  } catch (err) {
    console.error(err);
    alert("Setliste konnte nicht angelegt werden. Sind die Firestore-Regeln aktualisiert (README, Abschnitt 9.3)?");
  }
}

async function seedSetlist() {
  const items = [];
  const titles = [];
  SL_SEED.sections.forEach((sec) => {
    items.push({ id: slUid(), type: "section", label: sec.label });
    sec.songs.forEach((t) => {
      items.push({ id: slUid(), type: "song", title: t, note: "" });
      titles.push(t);
    });
  });
  await createSetlist(null, { name: SL_SEED.name, date: "", venue: "", city: "", showId: "", items });
  addToRepertoire(titles);
}

/* --------------------------------------------------------------------------
   SPEICHERN (automatisch, kurz verzögert)
   -------------------------------------------------------------------------- */
function setSaveStatus(text, isError) {
  const el = document.getElementById("sl-save-status");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("text-rust-light", !!isError);
  el.classList.toggle("text-paper-dim", !isError);
}

function scheduleSetlistSave() {
  setSaveStatus("Ungespeichert …");
  clearTimeout(_slSaveTimer);
  _slSaveTimer = setTimeout(flushSetlistSave, 700);
}

function flushSetlistSave() {
  clearTimeout(_slSaveTimer);
  _slSaveTimer = null;
  if (!_slCurrentId || !_slData) return Promise.resolve();
  const id = _slCurrentId;
  const payload = {
    name: _slData.name.trim(),
    date: _slData.date,
    venue: _slData.venue.trim(),
    city: _slData.city.trim(),
    showId: _slData.showId || "",
    items: _slData.items.map((i) =>
      i.type === "section"
        ? { id: i.id, type: "section", label: (i.label || "").trim() }
        : { id: i.id, type: "song", title: (i.title || "").trim(), note: (i.note || "").trim() }
    ),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  _slSaving = true;
  setSaveStatus("Speichert …");
  return fbDb
    .collection("setlists")
    .doc(id)
    .update(payload)
    .then(() => {
      _slSaving = false;
      if (id === _slCurrentId && !_slSaveTimer) setSaveStatus("Gespeichert");
    })
    .catch((err) => {
      _slSaving = false;
      console.error(err);
      setSaveStatus("Speichern fehlgeschlagen", true);
    });
}

/* --------------------------------------------------------------------------
   EDITOR (rechts)
   -------------------------------------------------------------------------- */
function renderSetlistEditor() {
  const box = document.getElementById("setlist-editor");
  if (!box) return;

  if (!_slData) {
    box.innerHTML = `<div class="empty-state"><p class="text-sm">Links eine Setliste auswählen oder eine neue anlegen.</p></div>`;
    return;
  }

  const d = _slData;
  const shows = (typeof _calShows !== "undefined" ? _calShows : [])
    .filter((s) => s.date)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const showOptions = shows
    .map((s) => `<option value="${escapeAttr(s.id)}"${s.id === d.showId ? " selected" : ""}>${escapeText(slFormatDate(s.date))} · ${escapeText(s.venue || "")}${s.city ? ", " + escapeText(s.city) : ""}</option>`)
    .join("");

  box.innerHTML = `
    <div class="p-4 sm:p-5 border-b border-white/10">
      <div class="flex items-center gap-3 flex-wrap mb-4">
        <input type="text" id="sl-name" value="${escapeAttr(d.name)}" placeholder="Name der Setliste" aria-label="Name der Setliste"
          class="flex-1 min-w-[12rem] rounded-sm px-3 py-2 text-lg font-display tracking-wide bg-ink-2 border border-white/10 text-paper" />
        <span id="sl-save-status" class="text-xs text-paper-dim whitespace-nowrap">Gespeichert</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label class="block text-xs text-paper-dim">Termin übernehmen
          <select id="sl-show" class="mt-1 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper">
            <option value="">— kein Termin —</option>${showOptions}
          </select>
        </label>
        <label class="block text-xs text-paper-dim">Datum
          <input type="date" id="sl-date" value="${escapeAttr(d.date)}" class="mt-1 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" />
        </label>
        <label class="block text-xs text-paper-dim">Location
          <input type="text" id="sl-venue" value="${escapeAttr(d.venue)}" placeholder="z. B. Raffas Scheune" class="mt-1 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" />
        </label>
        <label class="block text-xs text-paper-dim">Stadt
          <input type="text" id="sl-city" value="${escapeAttr(d.city)}" placeholder="Ort" class="mt-1 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" />
        </label>
      </div>
      <div class="flex gap-2 flex-wrap mt-4">
        <button type="button" id="sl-export" class="btn-primary px-4 py-2 rounded-sm text-sm inline-flex items-center gap-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z"/></svg>
          PDF exportieren
        </button>
        <button type="button" id="sl-duplicate" class="btn-admin-approve">Duplizieren</button>
        <button type="button" id="sl-delete" class="btn-admin-delete">Löschen</button>
      </div>
    </div>

    <div class="p-4 sm:p-5">
      <div class="setlist-head-row text-[11px] uppercase tracking-wider text-paper-dim">
        <span></span><span>Nr.</span><span>Titel</span><span>Notizen</span><span></span>
      </div>
      <ol id="sl-items" class="setlist-items"></ol>

      <form id="sl-add-form" class="flex flex-col sm:flex-row gap-2 mt-4" novalidate>
        <input type="text" id="sl-add-input" list="sl-repertoire-options" placeholder="Song hinzufügen — tippen für Vorschläge aus dem Repertoire" autocomplete="off"
          class="flex-1 rounded-sm px-3 py-2.5 text-sm bg-ink-2 border border-white/10 text-paper" />
        <datalist id="sl-repertoire-options"></datalist>
        <button type="submit" class="btn-admin-approve justify-center px-4">+ Song</button>
        <button type="button" id="sl-add-section" class="btn-ghost text-xs px-3 py-2 rounded-sm">+ Abschnitt (Set / Zugabe)</button>
      </form>

      <details class="mt-3">
        <summary class="text-xs text-paper-dim cursor-pointer hover:text-paper">Mehrere Songs auf einmal einfügen</summary>
        <div class="mt-2">
          <textarea id="sl-bulk" rows="5" placeholder="Ein Song pro Zeile" class="w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper"></textarea>
          <button type="button" id="sl-bulk-add" class="btn-admin-approve mt-2">Alle anhängen</button>
        </div>
      </details>
    </div>`;

  renderRepertoireDatalist();
  renderSetlistItems();
  bindEditorEvents();
}

function bindEditorEvents() {
  const d = _slData;
  const on = (id, ev, fn) => document.getElementById(id).addEventListener(ev, fn);

  on("sl-name", "input", (e) => { d.name = e.target.value; scheduleSetlistSave(); });
  on("sl-date", "input", (e) => { d.date = e.target.value; scheduleSetlistSave(); });
  on("sl-venue", "input", (e) => { d.venue = e.target.value; scheduleSetlistSave(); });
  on("sl-city", "input", (e) => { d.city = e.target.value; scheduleSetlistSave(); });

  on("sl-show", "change", (e) => {
    d.showId = e.target.value;
    const s = (_calShows || []).find((x) => x.id === d.showId);
    if (s) {
      d.date = s.date || "";
      d.venue = s.venue || "";
      d.city = s.city || "";
      document.getElementById("sl-date").value = d.date;
      document.getElementById("sl-venue").value = d.venue;
      document.getElementById("sl-city").value = d.city;
      if (!d.name.trim() || d.name === "Neue Setliste") {
        d.name = s.venue || d.name;
        document.getElementById("sl-name").value = d.name;
      }
    }
    scheduleSetlistSave();
  });

  on("sl-add-form", "submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("sl-add-input");
    const title = input.value.trim();
    if (!title) return;
    d.items.push({ id: slUid(), type: "song", title, note: "" });
    input.value = "";
    renderSetlistItems();
    scheduleSetlistSave();
    addToRepertoire([title]);
    input.focus();
  });

  on("sl-add-section", "click", () => {
    const used = d.items.filter((i) => i.type === "section").map((i) => slNorm(i.label));
    const label = SL_SECTION_PRESETS.find((p) => !used.includes(slNorm(p))) || "ABSCHNITT";
    d.items.push({ id: slUid(), type: "section", label });
    renderSetlistItems();
    scheduleSetlistSave();
  });

  on("sl-bulk-add", "click", () => {
    const ta = document.getElementById("sl-bulk");
    const titles = ta.value.split(/\r?\n/).map((t) => t.replace(/^\s*\d+[\.\)]\s*/, "").trim()).filter(Boolean);
    if (!titles.length) return;
    titles.forEach((title) => d.items.push({ id: slUid(), type: "song", title, note: "" }));
    ta.value = "";
    renderSetlistItems();
    scheduleSetlistSave();
    addToRepertoire(titles);
  });

  on("sl-export", "click", () => {
    if (_slSaveTimer) flushSetlistSave();
    openSetlistPdf(d);
  });

  on("sl-duplicate", "click", async () => {
    if (_slSaveTimer) await flushSetlistSave();
    createSetlist(null, {
      name: `${d.name || "Setliste"} (Kopie)`,
      date: "",
      venue: "",
      city: "",
      showId: "",
      items: d.items.map((i) => ({ ...i, id: slUid() })),
    });
  });

  on("sl-delete", "click", () => {
    if (!confirm(`Setliste "${d.name || "Ohne Namen"}" wirklich löschen?`)) return;
    const id = _slCurrentId;
    clearTimeout(_slSaveTimer);
    _slSaveTimer = null;
    _slCurrentId = null;
    _slData = null;
    renderSetlistEditor();
    fbDb.collection("setlists").doc(id).delete().catch((err) => {
      console.error(err);
      alert("Konnte nicht gelöscht werden.");
    });
  });
}

/* Zeilen neu aufbauen (nach Hinzufügen/Entfernen/Verschieben). Tippen in
   Titel/Notiz ändert nur die Daten und baut nichts neu — der Cursor bleibt. */
function renderSetlistItems() {
  const list = document.getElementById("sl-items");
  if (!list) return;
  const items = _slData.items;
  list.innerHTML = "";

  if (!items.some((i) => i.type === "song")) {
    // Leere Liste: Hinweis + Möglichkeit, die bisherige Setliste einzufügen
    const hint = document.createElement("li");
    hint.className = "text-paper-dim text-sm py-4 flex items-center gap-3 flex-wrap";
    hint.innerHTML = `<span>Noch keine Songs — unten hinzufügen oder</span>
      <button type="button" class="btn-admin-approve" data-seed>Bisherige Setliste einfügen (34 Songs)</button>`;
    hint.querySelector("[data-seed]").addEventListener("click", () => {
      const titles = [];
      // vorhandene leere Abschnitte ersetzen, damit SET 1 nicht doppelt steht
      _slData.items = [];
      SL_SEED.sections.forEach((sec) => {
        _slData.items.push({ id: slUid(), type: "section", label: sec.label });
        sec.songs.forEach((t) => {
          _slData.items.push({ id: slUid(), type: "song", title: t, note: "" });
          titles.push(t);
        });
      });
      renderSetlistItems();
      scheduleSetlistSave();
      addToRepertoire(titles);
    });
    if (!items.length) {
      list.appendChild(hint);
      return;
    }
    // Abschnitte trotzdem anzeigen, Hinweis danach anhängen
    setTimeout(() => list.appendChild(hint), 0);
  }

  let n = 0;
  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.dataset.index = String(idx);

    const handle = `<button type="button" class="sl-handle" aria-label="Ziehen zum Verschieben" title="Ziehen zum Verschieben">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9 19a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>
      </button>`;
    const tools = `<span class="sl-tools">
        <button type="button" data-act="up" aria-label="Nach oben"${idx === 0 ? " disabled" : ""}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 8-6 6 1.4 1.4 4.6-4.6 4.6 4.6L18 14z"/></svg></button>
        <button type="button" data-act="down" aria-label="Nach unten"${idx === items.length - 1 ? " disabled" : ""}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 16 6-6-1.4-1.4-4.6 4.6-4.6-4.6L6 10z"/></svg></button>
        <button type="button" data-act="del" class="sl-del" aria-label="Entfernen"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg></button>
      </span>`;

    if (item.type === "section") {
      const count = slSectionCount(items, idx);
      li.className = "sl-row sl-section";
      li.innerHTML = `${handle}
        <input type="text" class="sl-section-input" value="${escapeAttr(item.label)}" aria-label="Abschnitt" placeholder="z. B. SET 2" />
        <span class="text-xs text-paper-dim whitespace-nowrap">${count} Songs</span>
        ${tools}`;
      li.querySelector(".sl-section-input").addEventListener("input", (e) => {
        item.label = e.target.value;
        scheduleSetlistSave();
      });
    } else {
      n += 1;
      li.className = "sl-row sl-song";
      li.innerHTML = `${handle}
        <span class="sl-nr">${n}</span>
        <input type="text" class="sl-title" value="${escapeAttr(item.title)}" aria-label="Songtitel ${n}" />
        <input type="text" class="sl-note" value="${escapeAttr(item.note || "")}" aria-label="Notiz zu Song ${n}" placeholder="Notiz …" title="Notiz, z. B. Capo 2, Tonart E" />
        ${tools}`;
      li.querySelector(".sl-title").addEventListener("input", (e) => {
        item.title = e.target.value;
        scheduleSetlistSave();
      });
      li.querySelector(".sl-note").addEventListener("input", (e) => {
        item.note = e.target.value;
        scheduleSetlistSave();
      });
    }

    li.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        if (act === "up") slMove(idx, idx - 1);
        else if (act === "down") slMove(idx, idx + 1);
        else if (act === "del") {
          items.splice(idx, 1);
          renderSetlistItems();
          scheduleSetlistSave();
        }
      });
    });

    slBindDrag(li, idx);
    list.appendChild(li);
  });
}

function slSectionCount(items, sectionIdx) {
  let c = 0;
  for (let i = sectionIdx + 1; i < items.length && items[i].type !== "section"; i++) c += 1;
  return c;
}

function slMove(from, to) {
  const items = _slData.items;
  if (to < 0 || to >= items.length || from === to) return;
  const [it] = items.splice(from, 1);
  items.splice(to, 0, it);
  renderSetlistItems();
  scheduleSetlistSave();
}

/* Drag & Drop: nur über den Griff links startbar, damit man in den
   Textfeldern normal markieren kann. Auf Touch-Geräten: Pfeil-Buttons. */
function slBindDrag(li, idx) {
  const handle = li.querySelector(".sl-handle");
  handle.addEventListener("mousedown", () => { li.draggable = true; });
  handle.addEventListener("mouseup", () => { li.draggable = false; });

  li.addEventListener("dragstart", (e) => {
    _slDragIndex = idx;
    li.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  });
  li.addEventListener("dragend", () => {
    li.draggable = false;
    li.classList.remove("is-dragging");
    document.querySelectorAll(".sl-row.drop-before, .sl-row.drop-after").forEach((r) => r.classList.remove("drop-before", "drop-after"));
    _slDragIndex = null;
  });
  li.addEventListener("dragover", (e) => {
    if (_slDragIndex === null) return;
    e.preventDefault();
    const rect = li.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    li.classList.toggle("drop-after", after);
    li.classList.toggle("drop-before", !after);
  });
  li.addEventListener("dragleave", () => li.classList.remove("drop-before", "drop-after"));
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    if (_slDragIndex === null) return;
    const after = li.classList.contains("drop-after");
    li.classList.remove("drop-before", "drop-after");
    let to = idx + (after ? 1 : 0);
    if (_slDragIndex < to) to -= 1;
    slMove(_slDragIndex, to);
  });
}

/* --------------------------------------------------------------------------
   REPERTOIRE (Song-Bibliothek)
   -------------------------------------------------------------------------- */
function addToRepertoire(titles) {
  const known = new Set(_slRepertoire.map((r) => slNorm(r.title)));
  const fresh = [];
  titles.forEach((t) => {
    const title = String(t || "").trim();
    if (title && !known.has(slNorm(title))) {
      known.add(slNorm(title));
      fresh.push(title);
    }
  });
  if (!fresh.length) return Promise.resolve();
  const batch = fbDb.batch();
  fresh.forEach((title) => {
    batch.set(fbDb.collection("repertoire").doc(), {
      title,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });
  return batch.commit().catch((err) => console.error(err));
}

function renderRepertoire() {
  const box = document.getElementById("repertoire-list");
  const count = document.getElementById("repertoire-count");
  if (count) count.textContent = String(_slRepertoire.length);
  if (!box) return;
  if (!_slRepertoire.length) {
    box.innerHTML = '<p class="text-paper-dim text-sm">Noch leer — neue Songs aus Setlisten landen automatisch hier.</p>';
    return;
  }
  box.innerHTML = "";
  _slRepertoire.forEach((r) => {
    const chip = document.createElement("span");
    chip.className = "repertoire-chip";
    chip.innerHTML = `<span></span><button type="button" aria-label="Aus dem Repertoire entfernen">×</button>`;
    chip.querySelector("span").textContent = r.title;
    chip.querySelector("button").addEventListener("click", () => {
      if (confirm(`"${r.title}" aus dem Repertoire entfernen? (Bestehende Setlisten bleiben unverändert.)`)) {
        fbDb.collection("repertoire").doc(r.id).delete().catch((err) => console.error(err));
      }
    });
    box.appendChild(chip);
  });
}

function renderRepertoireDatalist() {
  const dl = document.getElementById("sl-repertoire-options");
  if (!dl) return;
  dl.innerHTML = _slRepertoire.map((r) => `<option value="${escapeAttr(r.title)}"></option>`).join("");
}

/* --------------------------------------------------------------------------
   PDF-EXPORT im "Bühnen"-Design
   --------------------------------------------------------------------------
   Öffnet ein neues Fenster mit der fertig gesetzten A4-Setliste; der Button
   "Drucken / Als PDF speichern" öffnet den Druckdialog — dort als Ziel
   "Als PDF speichern" wählen. Die Zeilenhöhe passt sich automatisch an, damit
   die Liste möglichst auf eine Seite passt; bei sehr vielen Songs geht es
   auf einer zweiten Seite weiter.
   -------------------------------------------------------------------------- */
const SL_PAGE_H = 1123;      // A4 bei 96 dpi
const SL_HEADER_H = 128;     // dunkler Kopfbalken (Seite 1)
const SL_HEADER_CONT_H = 64; // schmaler Kopf ab Seite 2
const SL_SECTION_H = 34;
const SL_FOOTER_H = 70;      // Fußzeile inkl. Rand
const SL_ROW_MAX = 30;
const SL_ROW_MIN = 20;

function slBuildPages(items) {
  const songs = items.filter((i) => i.type === "song").length;
  const sections = items.filter((i) => i.type === "section").length;
  const avail1 = SL_PAGE_H - SL_HEADER_H - 18 - SL_FOOTER_H;
  const fitRow = songs ? (avail1 - sections * SL_SECTION_H) / songs : SL_ROW_MAX;
  const rowH = Math.max(SL_ROW_MIN, Math.min(SL_ROW_MAX, Math.floor(fitRow)));

  // Auf Seiten verteilen
  const pages = [[]];
  let used = 0;
  let cap = avail1;
  items.forEach((it, i) => {
    const h = it.type === "section" ? SL_SECTION_H : rowH;
    // Abschnittstitel nicht allein unten auf der Seite stehen lassen
    const need = it.type === "section" && items[i + 1] && items[i + 1].type === "song" ? h + rowH : h;
    if (used + need > cap && pages[pages.length - 1].length) {
      pages.push([]);
      used = 0;
      cap = SL_PAGE_H - SL_HEADER_CONT_H - 18 - SL_FOOTER_H;
    }
    pages[pages.length - 1].push({ ...it, _idx: i });
    used += h;
  });
  return { pages, rowH };
}

function buildSetlistPdfHtml(d) {
  const e = escapeText;
  const items = d.items.filter((i) => (i.type === "song" ? (i.title || "").trim() : true));
  const totalSongs = items.filter((i) => i.type === "song").length;
  const { pages, rowH } = slBuildPages(items);

  const titleSize = Math.round(Math.min(22, Math.max(15, rowH * 0.74)));
  const noteSize = Math.round(Math.min(18, Math.max(13, rowH * 0.62)));
  const nrSize = Math.round(Math.min(19, Math.max(14, rowH * 0.66)));

  // Laufende Nummern & Songzahl je Abschnitt vorab berechnen
  const numbers = {};
  let n = 0;
  items.forEach((it, i) => { if (it.type === "song") numbers[i] = ++n; });
  const sectionMeta = {};
  items.forEach((it, i) => {
    if (it.type !== "section") return;
    sectionMeta[i] = slSectionCount(items, i);
  });

  const dateText = slFormatDate(d.date);
  const place = [d.venue, d.city].map((x) => (x || "").trim()).filter(Boolean).join(" · ");
  const docTitle = ["Setliste Who Knows", d.date, d.venue].filter(Boolean).join(" ");

  const pageHtml = pages.map((pageItems, p) => {
    let zebra = 0;
    const rows = pageItems.map((it) => {
      if (it.type === "section") {
        zebra = 0;
        const label = (it.label || "").trim() || "ABSCHNITT";
        return `<div class="sec"><span class="sec-label">${e(label)}</span><span class="sec-meta">${sectionMeta[it._idx]} SONGS</span></div>`;
      }
      const bg = zebra++ % 2 ? " alt" : "";
      return `<div class="row${bg}"><span class="nr">${numbers[it._idx]}</span><span class="title">${e(it.title)}</span><span class="note">${e(it.note || "")}</span></div>`;
    }).join("");

    const header = p === 0
      ? `<header class="head">
          <div><div class="band">WHO KNOWS?</div><div class="kicker">SETLISTE</div></div>
          <div class="when">${dateText ? `<div class="date">${e(dateText)}</div>` : ""}${place ? `<div class="place">${e(place)}</div>` : ""}</div>
        </header>`
      : `<header class="head-cont"><span class="band-sm">WHO KNOWS?</span><span class="kicker">SETLISTE · FORTSETZUNG</span></header>`;

    const pageInfo = pages.length > 1 ? ` · SEITE ${p + 1}/${pages.length}` : "";
    return `<section class="page">${header}<main class="list">${rows}</main>
      <footer class="foot"><span>WHO KNOWS?${d.name ? " · " + e(d.name.toUpperCase()) : ""}</span><span>${totalSongs} SONGS${pageInfo}</span></footer></section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" />
<title>${e(docTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #6b6b6b; }
  body { font-family: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .toolbar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 10px 18px; background: #14100c; color: #ece2cb; font: 13px Arial, sans-serif; }
  .toolbar button { padding: 8px 14px; border: 0; border-radius: 3px; background: #a8462b; color: #fff; font-size: 13px; cursor: pointer; }
  .toolbar button.ghost { background: transparent; border: 1px solid #ece2cb55; color: #ece2cb; }
  .page { width: 794px; height: ${SL_PAGE_H}px; margin: 24px auto; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.35); page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .head { height: ${SL_HEADER_H}px; background: #111; color: #fff; padding: 28px 48px; display: flex; justify-content: space-between; align-items: center; flex: none; }
  .band { white-space: nowrap; font-family: 'Bebas Neue', Impact, sans-serif; font-size: 64px; line-height: .9; letter-spacing: 1px; }
  .kicker { font-size: 14px; font-weight: 600; letter-spacing: 5px; color: #D4B06A; margin-top: 2px; }
  .when { text-align: right; }
  .date { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 30px; line-height: 1; }
  .place { font-size: 16px; font-weight: 600; letter-spacing: 1px; margin-top: 2px; }
  .head-cont { height: ${SL_HEADER_CONT_H}px; background: #111; color: #fff; padding: 0 48px; display: flex; justify-content: space-between; align-items: center; flex: none; }
  .head-cont .kicker { margin: 0; }
  .band-sm { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 32px; letter-spacing: 1px; }
  .list { padding: 18px 48px 0; flex: 1; }
  .sec { height: ${SL_SECTION_H}px; display: flex; align-items: flex-end; gap: 12px; padding-bottom: 4px; border-bottom: 2px solid #111; }
  .sec-label { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 24px; line-height: 1; letter-spacing: 1px; }
  .sec-meta { font-size: 13px; font-weight: 600; letter-spacing: 1px; color: #555; padding-bottom: 2px; }
  .row { display: grid; grid-template-columns: 40px 340px minmax(0, 1fr); height: ${rowH}px; align-items: center; background: #fff; }
  .row.alt { background: #f2f2f2; }
  .nr { font-size: ${nrSize}px; font-weight: 700; color: #8a6a2e; padding-left: 4px; }
  .title { font-size: ${titleSize}px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
  .note { height: 100%; display: flex; align-items: center; padding-left: 12px; border-left: 1px solid #d6d6d6; font-size: ${noteSize}px; font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .foot { margin: auto 48px 36px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; color: #555; flex: none; }
  @media print {
    html, body { background: #fff; }
    .toolbar { display: none; }
    .page { margin: 0; box-shadow: none; }
  }
</style></head>
<body>
<div class="toolbar">
  <button type="button" onclick="window.print()">Drucken / Als PDF speichern</button>
  <button type="button" class="ghost" onclick="window.close()">Schließen</button>
  <span>Im Druckdialog als Ziel „Als PDF speichern“ wählen. Ränder: „Keine“ bzw. „Standard“, Kopf-/Fußzeilen ausschalten.</span>
</div>
${pageHtml}
</body></html>`;
}

function openSetlistPdf(d) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Das Fenster wurde vom Browser blockiert. Bitte Pop-ups für diese Seite erlauben und noch einmal klicken.");
    return;
  }
  w.document.open();
  w.document.write(buildSetlistPdfHtml(d));
  w.document.close();
}
