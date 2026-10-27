/* ==========================================================================
   Who Knows? — Admin-Bereich — admin.js
   Steuert admin.html: Login (Firebase Auth) + Dashboard (Firestore-Daten).
   Läuft komplett clientseitig — der eigentliche Schutz der Daten passiert
   über die Firestore-Sicherheitsregeln (siehe README.md), nicht über dieses
   Skript. Ohne die dort beschriebenen Regeln kann JEDE Website mit eurer
   Firebase-Konfiguration eure Daten lesen, unabhängig vom Login hier.
   ========================================================================== */

// Zwischenspeicher für CSV-Export und das "Neueste Aktivität"-Feed auf der
// Übersicht — werden von den jeweiligen onSnapshot-Listenern befüllt.
let _bookingsCache = [];
let _activityBookings = [];
let _activityReviewsPending = [];
let _activityReviewsPublished = [];

document.addEventListener("DOMContentLoaded", () => {
  const missingEl = document.getElementById("firebase-missing");
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const logoutBtn = document.getElementById("logout-btn");

  initScrollToTop(); // unabhängig von Firebase — funktioniert immer

  if (!isFirebaseConfigured()) {
    missingEl.classList.remove("hidden");
    return;
  }

  fbAuth.onAuthStateChanged((user) => {
    if (user) {
      loginView.classList.add("hidden");
      dashboardView.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
      document.getElementById("welcome-text").textContent = `Angemeldet als ${user.email}`;
      initAdminNav();
      loadDashboardData();
    } else {
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
      logoutBtn.classList.add("hidden");
    }
  });

  initLoginForm();
  logoutBtn.addEventListener("click", () => fbAuth.signOut());
});

/* --------------------------------------------------------------------------
   LOGIN
   -------------------------------------------------------------------------- */
function initLoginForm() {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  if (!form) return;
  const infoEl = document.getElementById("login-info");

  // "Passwort vergessen?": schickt einen Link zum Zurücksetzen per E-Mail. Die
  // Rückmeldung ist bewusst neutral ("falls ein Konto existiert …"), damit
  // Fremde nicht ausprobieren können, welche Adressen Konten haben.
  document.getElementById("forgot-password-btn")?.addEventListener("click", () => {
    errorEl.classList.add("hidden");
    infoEl?.classList.add("hidden");
    const emailInput = document.getElementById("login-email");
    const email = emailInput.value.trim();
    if (!email) {
      errorEl.textContent = "Bitte oben zuerst eure E-Mail-Adresse eintragen — dann schicken wir einen Link zum Zurücksetzen.";
      errorEl.classList.remove("hidden");
      emailInput.focus();
      return;
    }
    const neutral = () => {
      if (!infoEl) return;
      infoEl.textContent = "Wenn zu dieser Adresse ein Konto existiert, ist eine E-Mail mit einem Link zum Zurücksetzen unterwegs. Schaut auch im Spam-Ordner nach.";
      infoEl.classList.remove("hidden");
    };
    fbAuth
      .sendPasswordResetEmail(email)
      .then(neutral)
      .catch((err) => {
        if (err.code === "auth/invalid-email") {
          errorEl.textContent = "Die E-Mail-Adresse sieht nicht richtig aus.";
          errorEl.classList.remove("hidden");
        } else if (err.code === "auth/too-many-requests") {
          errorEl.textContent = "Zu viele Versuche. Bitte in ein paar Minuten noch einmal probieren.";
          errorEl.classList.remove("hidden");
        } else {
          neutral();
        }
      });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    infoEl?.classList.add("hidden");

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitBtn = form.querySelector("button[type='submit']");

    submitBtn.disabled = true;
    submitBtn.textContent = "Wird geprüft…";

    fbAuth
      .signInWithEmailAndPassword(email, password)
      .catch((err) => {
        errorEl.textContent = translateAuthError(err.code);
        errorEl.classList.remove("hidden");
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Anmelden";
      });
  });
}

function translateAuthError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Bitte gebt eine gültige E-Mail-Adresse ein.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-Mail oder Passwort ist falsch.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte wartet einen Moment und versucht es erneut.";
    default:
      return "Anmeldung fehlgeschlagen. Bitte versucht es erneut.";
  }
}

/* --------------------------------------------------------------------------
   DASHBOARD-DATEN LADEN
   -------------------------------------------------------------------------- */
function loadDashboardData() {
  loadVisitStats();
  loadBookings();
  loadPendingReviews();
  loadPublishedReviews();
  loadVenues();
  loadSongs();
  loadShows();
  loadCalendarAdmin();
  loadAnnouncementAdmin();
  initAnnouncementForm();
  loadBandAdmin();
  initBandForm();
  initImportBandButton();
  loadGalleryAdmin();
  loadVideosAdmin();
  initVenueForm();
  initSongForm();
  initShowForm();
  initGalleryForm();
  initVideoForm();
  initSearchFilters();
  initExportButton();
  initImportShowsButton();
  initBookingControls();
  initTodayList();
  initNotifySettings();
  initCleanup();
  loadSettingsAdmin();
  initSettingsForm();
  initBackupSection();
  loadDailyStats();
  loadFaqAdmin();
  initFaqForm();
  initSetlists(); // assets/js/setlist.js
}

function loadVisitStats() {
  fbDb
    .collection("stats")
    .doc("visits")
    .get()
    .then((doc) => {
      const count = doc.exists ? doc.data().count || 0 : 0;
      document.getElementById("stat-visits").textContent = count.toLocaleString("de-DE");
    })
    .catch((err) => console.error(err));
}

/* --------------------------------------------------------------------------
   ICONS — kleine, wiederverwendete SVG-Bausteine für die Info-Zeilen in
   Buchungs-/Bewertungskarten (siehe .info-row in style.css).
   -------------------------------------------------------------------------- */
const ICONS = {
  email: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 4.24-8 5.51-8-5.51V18h16zm-15.35-2 7.35 5.06L19.35 6z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.58 1 1 0 0 1-.25 1z"/></svg>',
  location: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  guests: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-.32 0-.62.05-.91.13a4.98 4.98 0 0 1 0 5.74c.29.08.59.13.91.13zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
  euro: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 4a8.6 8.6 0 0 0-8.3 6.5H5.5v1.7h1.4a8 8 0 0 0 0 1.6H5.5v1.7h1.7A8.6 8.6 0 0 0 15.5 22v-1.9a6.6 6.6 0 0 1-6.2-4.6h4.9v-1.7H8.9a6 6 0 0 1 0-1.6h5.3V10.4H9.3a6.6 6.6 0 0 1 6.2-4.6z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.41 4.29 4.3-1.42 1.41L11 13V6h2z"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.7 19 13.6 9.9c1-2.4.5-5.3-1.5-7.3-2.1-2.1-5.2-2.5-7.7-1.3l4.3 4.3-2.8 2.8L1.6 4.1C.3 6.6.8 9.7 2.9 11.8c2 2 4.9 2.5 7.3 1.5L19.3 22.3z"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke-linecap="round"/></svg>',
};

function iconRow(iconKey, label, valueHtml) {
  if (!valueHtml) return "";
  return `<div class="info-row">${ICONS[iconKey]}<span><span class="info-label">${label}:</span>${valueHtml}</span></div>`;
}

/** "2026-05-16" -> { day: "16", month: "Mai" } fürs Kalender-Chip. Fällt bei
 *  unbekanntem/leerem Format auf "–"/"" zurück, statt einen Fehler zu werfen. */
function formatDateChip(dateStr) {
  if (!dateStr) return { day: "–", month: "", year: "" };
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return { day: "–", month: "", year: "" };
  return {
    day: d.toLocaleDateString("de-DE", { day: "2-digit" }),
    month: d.toLocaleDateString("de-DE", { month: "short" }).replace(".", ""),
    year: d.toLocaleDateString("de-DE", { year: "numeric" }),
  };
}

/** Zeigt ein goldenes "Neu"-Badge für Einträge, die jünger als 48 Stunden
 *  sind — hilft, frische Anfragen auf einen Blick zu erkennen. */
function isRecent(createdAt) {
  if (!createdAt || !createdAt.toDate) return false;
  return Date.now() - createdAt.toDate().getTime() < 48 * 60 * 60 * 1000;
}

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

const BOOKING_STATUS_LABELS = {
  neu: "Neu",
  bearbeitung: "In Bearbeitung",
  zugesagt: "Zugesagt",
  abgesagt: "Abgesagt",
};

let _bookingDocs = [];
let _bookingFilter = "alle";
let _bookingSort = "eingang";
let _bookingFlash = null; // { id, text, until } — kurze Rückmeldung nach einer Statusänderung

/* --------------------------------------------------------------------------
   ANTWORT-VORLAGEN
   --------------------------------------------------------------------------
   Die Knöpfe "Zusage / Absage / Rückfrage" in jeder Anfrage öffnen euer
   E-Mail-Programm mit fertigem Text und der Adresse der Anfragenden. Die
   Texte könnt ihr hier nach Belieben ändern.
   -------------------------------------------------------------------------- */
const MAIL_TEMPLATES = {
  zusage: (b) => ({
    subject: `Zusage: Who Knows? am ${mailDate(b)}`,
    body: [
      `Hallo ${b.from_name || "zusammen"},`,
      "",
      `vielen Dank für eure Anfrage! Wir freuen uns, dass wir am ${mailDate(b)}${b.location ? ` in ${b.location}` : ""} bei euch spielen können.`,
      "",
      "Als Nächstes klären wir die Details (Spielzeiten, Technik, Ablauf) und schicken euch eine Buchungsbestätigung. Falls ihr vorab Fragen habt, meldet euch jederzeit.",
      "",
      "Viele Grüße",
      "Who Knows?",
    ],
  }),
  absage: (b) => ({
    subject: `Eure Anfrage für den ${mailDate(b)}`,
    body: [
      `Hallo ${b.from_name || "zusammen"},`,
      "",
      `vielen Dank für euer Interesse an Who Knows? und eure Anfrage für den ${mailDate(b)}.`,
      "",
      "Leider sind wir an diesem Tag bereits anderweitig verplant und müssen euch deshalb absagen. Wir würden uns freuen, wenn es zu einem anderen Termin klappt — sprecht uns gern darauf an.",
      "",
      "Viele Grüße",
      "Who Knows?",
    ],
  }),
  rueckfrage: (b) => ({
    subject: `Rückfrage zu eurer Anfrage für den ${mailDate(b)}`,
    body: [
      `Hallo ${b.from_name || "zusammen"},`,
      "",
      `vielen Dank für eure Anfrage für den ${mailDate(b)}${b.location ? ` in ${b.location}` : ""}! Damit wir euch ein passendes Angebot machen können, brauchen wir noch ein paar Angaben:`,
      "",
      "- Gewünschte Spielzeiten / Setlänge:",
      "- Technik vor Ort (PA, Bühne, Strom):",
      "- Ungefähre Gästezahl und Art der Veranstaltung:",
      "- Euer Budget bzw. eure Preisvorstellung:",
      "",
      "Sobald wir das wissen, melden wir uns mit einem Angebot.",
      "",
      "Viele Grüße",
      "Who Knows?",
    ],
  }),
};

function mailDate(b) {
  return b.event_date ? calPretty(b.event_date) : "dem gewünschten Termin";
}

function openMailTemplate(kind, b) {
  if (!b.from_email || !MAIL_TEMPLATES[kind]) return;
  const t = MAIL_TEMPLATES[kind](b);
  window.location.href = `mailto:${encodeURI(b.from_email)}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body.join("\r\n"))}`;
}

/* --------------------------------------------------------------------------
   DOPPELBUCHUNGS-WARNUNG
   -------------------------------------------------------------------------- */
function bookingConflicts(b, selfId) {
  const key = b.event_date;
  const status = b.status || "neu";
  if (!key || (status !== "neu" && status !== "bearbeitung")) return [];

  const out = [];
  if (key < calIso(new Date())) out.push({ level: "warn", text: "Das Veranstaltungsdatum liegt in der Vergangenheit." });
  if (isOverdueBooking(b)) out.push({ level: "warn", text: `Seit ${bookingAgeDays(b)} Tagen unbeantwortet.` });

  const shows = _calShows.filter((s) => s.date === key);
  if (shows.length) out.push({ level: "warn", text: `An diesem Tag ist bereits ein Auftritt eingetragen (${shows[0].venue || "Auftritt"}).` });

  const blocks = calBlockedAt(key);
  if (blocks.length) {
    const reason = blocks.map((r) => _calNotes[r.id]).find(Boolean);
    out.push({ level: "warn", text: `Der Tag ist im Kalender gesperrt${reason ? ` (${reason})` : ""}.` });
  }

  const accepted = _bookingsCache.filter((o) => o._id !== selfId && o.event_date === key && (o.status || "neu") === "zugesagt");
  if (accepted.length) out.push({ level: "warn", text: `Für diesen Tag gibt es bereits eine Zusage (${accepted[0].from_name || "—"}).` });

  const others = _bookingsCache.filter((o) => o._id !== selfId && o.event_date === key && ["neu", "bearbeitung"].includes(o.status || "neu"));
  if (others.length) out.push({ level: "info", text: `${others.length} weitere offene Anfrage${others.length > 1 ? "n" : ""} für diesen Tag.` });

  return out;
}

function refreshBookingWarnings() {
  document.querySelectorAll("#bookings-list article[data-doc-id]").forEach((card) => {
    const b = card._booking;
    const el = card.querySelector("[data-warn]");
    if (!b || !el) return;
    const status = card.querySelector("[data-status-select]")?.value || b.status || "neu";
    const items = bookingConflicts({ ...b, status }, card.dataset.docId);
    el.innerHTML = items
      .map((i) => `<span class="booking-warn-item booking-warn-item--${i.level}">${i.level === "warn" ? "&#9888; " : "&#9432; "}${escapeText(i.text)}</span>`)
      .join("");
  });
}

/* --------------------------------------------------------------------------
   STATUS ÄNDERN — "Zugesagt" trägt den Termin ein
   --------------------------------------------------------------------------
   Was bei "Zugesagt" passiert, steht unter "Einstellungen" → "Zusagen und
   Termine" (bookingToShow):
   - auto:  der Auftritt wird unter "Termine" eingetragen (öffentlich sichtbar,
            sperrt damit auch den Tag im Buchungsformular),
   - ask:   es wird jedes Mal gefragt,
   - off:   es wird nur der Tag im Kalender gesperrt (privat).
   Wird die Zusage zurückgenommen oder die Anfrage abgesagt/gelöscht, wird der
   Eintrag bzw. die Sperre wieder entfernt. War der Tag schon belegt oder
   gesperrt, wird nichts doppelt eingetragen — stattdessen erscheint ein
   Warnhinweis.
   -------------------------------------------------------------------------- */
async function applyBookingStatus(doc, b, newStatus) {
  const updates = { status: newStatus, statusChangedAt: firebase.firestore.FieldValue.serverTimestamp() };
  const notes = [];
  const key = b.event_date;

  if (newStatus === "zugesagt" && key) {
    if (!b.blockedId && !b.showId) {
      if (calIsUnavailable(key)) {
        notes.push("Achtung: Der Tag war schon belegt oder gesperrt — bitte Doppelbuchung prüfen. Es wurde nichts zusätzlich eingetragen.");
      } else {
        const mode = _siteSettings.bookingToShow || "auto";
        let publish = mode === "auto";
        if (mode === "ask") {
          publish = confirm(
            "Soll dieser Auftritt auch öffentlich unter „Termine“ auf der Homepage erscheinen?\n\n" +
              `Ort: ${b.location || "—"}\n\n` +
              "OK = anzeigen\nAbbrechen = nur den Tag im Kalender sperren (nicht öffentlich)"
          );
        }
        if (publish) {
          const ref = fbDb.collection("shows").doc();
          await ref.set({
            date: key,
            venue: b.location || "Auftritt",
            city: "",
            type: b.event_type || "Live Gig",
            bookingId: doc.id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          updates.showId = ref.id;
          notes.push("Termin unter „Termine“ eingetragen — öffentlich sichtbar ✓");
        } else {
          const reason = ["Zusage: " + (b.from_name || "—"), b.event_type, b.location].filter(Boolean).join(" · ");
          updates.blockedId = await calBlockRange(key, key, reason);
          notes.push("Tag im Kalender gesperrt ✓ (nicht öffentlich)");
        }
      }
    }
  } else {
    if (b.showId) {
      await fbDb.collection("shows").doc(b.showId).delete();
      updates.showId = firebase.firestore.FieldValue.delete();
      notes.push("Termin aus „Termine“ entfernt ✓");
    }
    if (b.blockedId) {
      await calUnblockRange(key, key, b.blockedId);
      updates.blockedId = firebase.firestore.FieldValue.delete();
      notes.push("Sperre im Kalender aufgehoben ✓");
    }
  }

  // Rückmeldung VOR dem Speichern merken: Der Listener baut die Karte beim
  // Speichern sofort neu auf und soll den Hinweis dabei schon anzeigen.
  if (notes.length) _bookingFlash = { id: doc.id, text: notes.join(" · "), until: Date.now() + 8000 };
  await doc.ref.update(updates);
}

function loadBookings() {
  const container = document.getElementById("bookings-list");
  fbDb
    .collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot(
      (snapshot) => {
        // "Offene" = noch nicht final geklärt (neu oder in Bearbeitung).
        // Ältere Einträge ohne "status"-Feld gelten als "neu".
        const openCount = snapshot.docs.filter((doc) => {
          const status = doc.data().status || "neu";
          return status === "neu" || status === "bearbeitung";
        }).length;
        document.getElementById("stat-bookings").textContent = openCount;
        setNavBadge("badge-bookings", openCount);

        _bookingDocs = snapshot.docs;
        _bookingsCache = snapshot.docs.map((doc) => ({ ...doc.data(), _id: doc.id }));
        if (typeof renderAdminCalendar === "function") renderAdminCalendar(); // Anfragen im Kalender aktuell halten
        _activityBookings = snapshot.docs.slice(0, 5).map((doc) => ({
          type: "booking",
          title: doc.data().from_name || "Neue Buchungsanfrage",
          subtitle: [doc.data().event_date, doc.data().location].filter(Boolean).join(" · "),
          createdAt: doc.data().createdAt,
        }));
        renderActivityFeed();
        updateTabTitle(snapshot.docs.filter((d) => (d.data().status || "neu") === "neu").length);
        handleNewBookings(snapshot.docs);
        renderTodayList();
        renderBookingFilters();
        renderBookingCards();
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

function sortedBookingDocs() {
  const docs = _bookingDocs.slice();
  if (_bookingSort === "datum") {
    // Kommende Termine zuerst (aufsteigend), vergangene danach.
    const today = calIso(new Date());
    const rank = (d) => {
      const key = d.data().event_date || "9999-12-31";
      return (key >= today ? "0" : "1") + key;
    };
    docs.sort((a, b) => rank(a).localeCompare(rank(b)));
  }
  return docs; // "eingang": Reihenfolge aus der Datenbank (neueste zuerst)
}

function renderBookingFilters() {
  const bar = document.getElementById("booking-filters");
  if (!bar) return;
  const counts = { alle: _bookingDocs.length, neu: 0, bearbeitung: 0, zugesagt: 0, abgesagt: 0, ueberfaellig: _bookingDocs.filter((d) => isOverdueBooking(d.data())).length };
  _bookingDocs.forEach((d) => {
    const s = d.data().status || "neu";
    if (counts[s] !== undefined) counts[s]++;
  });
  const defs = [["alle", "Alle"], ["neu", "Neu"], ["bearbeitung", "In Bearbeitung"], ["zugesagt", "Zugesagt"], ["abgesagt", "Abgesagt"], ["ueberfaellig", "Überfällig"]];
  bar.innerHTML = defs
    .map(([key, label]) => `<button type="button" class="filter-chip${_bookingFilter === key ? " is-active" : ""}" data-filter="${key}">${label} <span class="filter-count">${counts[key]}</span></button>`)
    .join("");
}

let _bookingControlsBound = false;
function initBookingControls() {
  if (_bookingControlsBound) return;
  _bookingControlsBound = true;
  document.getElementById("booking-filters")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;
    _bookingFilter = chip.dataset.filter;
    renderBookingFilters();
    applySearchFilter("bookings-search", "bookings-list");
  });
  document.getElementById("booking-sort")?.addEventListener("change", (e) => {
    _bookingSort = e.target.value;
    renderBookingCards();
  });
}

function renderBookingCards() {
  const container = document.getElementById("bookings-list");
  if (!container) return;
  if (_bookingDocs.length === 0) {
    container.innerHTML = emptyStateHtml("Noch keine Buchungsanfragen.");
    return;
  }
  container.innerHTML = "";
  sortedBookingDocs().forEach((doc) => container.appendChild(buildBookingCard(doc)));
  refreshBookingWarnings();
  applySearchFilter("bookings-search", "bookings-list");
}

function buildBookingCard(doc) {
  const b = doc.data();
  const status = b.status || "neu";
  const dateChip = formatDateChip(b.event_date);
  const card = document.createElement("article");
  card.className = "admin-card rounded-md p-5";
  card.dataset.docId = doc.id;
  card.dataset.status = status;
  card.dataset.overdue = isOverdueBooking(b) ? "1" : "0";
  card._booking = b;
  card.dataset.search = [b.from_name, b.company, b.location, b.event_date, b.event_type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  card.innerHTML = `
    <div class="flex items-start gap-4 mb-3">
      <div class="avatar-circle">${initialsOf(b.from_name)}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap mb-0.5">
          <p class="font-medium truncate name-text"></p>
          ${b.event_type ? `<span class="badge badge-type">${escapeText(b.event_type)}</span>` : ""}
        </div>
        <p class="text-xs text-paper-dim company-text"></p>
        <p class="text-xs text-paper-dim timestamp-text mt-0.5"></p>
        <p class="text-xs text-paper-dim reply-text mt-0.5" data-reply></p>
      </div>
      <div class="date-chip-wrap">
        <span class="date-chip-caption">Veranstaltung</span>
        <div class="date-chip">
          <span class="date-chip-month">${dateChip.month}</span>
          <span class="date-chip-day">${dateChip.day}</span>
          <span class="date-chip-year">${dateChip.year}</span>
        </div>
      </div>
      ${DELETE_BUTTON_HTML}
    </div>
    <div class="booking-warn mb-3" data-warn></div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-3 details-grid"></div>
    <div class="quote-box message-box"></div>

    <div class="booking-footer flex flex-wrap items-center gap-3 mt-3 pt-3">
      <label class="text-xs text-paper-dim">Status:</label>
      <select class="status-select" data-status-select>
        <option value="neu">Neu</option>
        <option value="bearbeitung">In Bearbeitung</option>
        <option value="zugesagt">Zugesagt</option>
        <option value="abgesagt">Abgesagt</option>
      </select>
      <button type="button" class="btn-ghost text-xs px-3 py-1.5 rounded-sm notes-toggle-btn" data-toggle-notes>
        ${b.notes ? "Notiz &#9679;" : "Notiz"}
      </button>
      ${
        b.from_email
          ? `<span class="booking-mail">
               <span class="text-xs text-paper-dim">Antworten:</span>
               <button type="button" class="btn-ghost text-xs px-3 py-1.5 rounded-sm" data-mail="zusage">Zusage</button>
               <button type="button" class="btn-ghost text-xs px-3 py-1.5 rounded-sm" data-mail="absage">Absage</button>
               <button type="button" class="btn-ghost text-xs px-3 py-1.5 rounded-sm" data-mail="rueckfrage">Rückfrage</button>
             </span>`
          : ""
      }
      <span class="booking-tools">
        <button type="button" class="btn-ghost text-xs px-3 py-1.5 rounded-sm" data-confirmation>Bestätigung (PDF)</button>
        <button type="button" class="btn-ghost text-xs px-3 py-1.5 rounded-sm" data-mark-replied>${b.repliedAt ? "Antwort-Markierung entfernen" : "Als beantwortet markieren"}</button>
      </span>
    </div>
    <p class="booking-flash text-xs mt-2" data-flash></p>
    <div class="notes-box hidden mt-2">
      <textarea class="notes-textarea w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper mb-2" rows="2" placeholder="Interne Notiz (nur im Admin-Bereich sichtbar) …"></textarea>
      <button type="button" class="btn-admin-approve text-xs" data-save-notes>Notiz speichern</button>
    </div>
  `;

  card.querySelector(".name-text").textContent = b.from_name || "—";
  card.querySelector(".company-text").textContent = b.company || "";

  card.querySelector(".details-grid").innerHTML = [
    iconRow("email", "E-Mail", b.from_email ? `<a href="mailto:${escapeAttr(b.from_email)}">${escapeText(b.from_email)}</a>` : ""),
    iconRow("phone", "Telefon", b.phone ? `<a href="tel:${escapeAttr(b.phone)}">${escapeText(b.phone)}</a>` : ""),
    iconRow("location", "Location", escapeText(b.location)),
    iconRow("guests", "Gäste", escapeText(b.guests)),
    iconRow("clock", "Setlänge", escapeText(b.set_length)),
    iconRow("euro", "Budget", escapeText(b.budget)),
    iconRow("wrench", "Technik", escapeText(b.tech_requirements)),
  ].join("");

  const messageBox = card.querySelector(".message-box");
  if (b.message) messageBox.textContent = b.message;
  else messageBox.remove();

  const receivedAt = formatTimestamp(b.createdAt);
  card.querySelector(".timestamp-text").textContent = receivedAt ? `Anfrage eingegangen am ${receivedAt}` : "";

  // Rückmeldung nach Statusänderung (z. B. "Tag im Kalender gesperrt")
  if (_bookingFlash && _bookingFlash.id === doc.id && Date.now() < _bookingFlash.until) {
    card.querySelector("[data-flash]").textContent = _bookingFlash.text;
  }

  // Status-Auswahl: Farbe spiegelt den Stand wider (.status-select[data-value]
  // in style.css); Änderung wird gespeichert, "Zugesagt" sperrt den Tag.
  const statusSelect = card.querySelector("[data-status-select]");
  statusSelect.value = status;
  statusSelect.dataset.value = status;
  statusSelect.addEventListener("change", async () => {
    const newStatus = statusSelect.value;
    statusSelect.dataset.value = newStatus;
    card.dataset.status = newStatus;
    statusSelect.disabled = true;
    try {
      await applyBookingStatus(doc, b, newStatus);
    } catch (err) {
      console.error(err);
      alert("Der Status konnte nicht geändert werden. Bitte erneut versuchen.");
      statusSelect.value = status;
      statusSelect.dataset.value = status;
      card.dataset.status = status;
    }
    statusSelect.disabled = false;
    refreshBookingWarnings();
  });

  // Antwort vermerken: Wer auf Zusage/Absage/Rückfrage klickt, hat die Anfrage beantwortet.
  const replyEl = card.querySelector("[data-reply]");
  if (b.repliedAt) {
    const when = formatTimestamp(b.repliedAt);
    replyEl.textContent = `Beantwortet${when ? ` am ${when}` : ""} (${REPLY_LABELS[b.repliedWith] || "Antwort"})`;
  }
  card.querySelectorAll("[data-mail]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openMailTemplate(btn.dataset.mail, b);
      doc.ref
        .update({ repliedAt: firebase.firestore.FieldValue.serverTimestamp(), repliedWith: btn.dataset.mail })
        .catch((err) => console.error(err));
    });
  });
  card.querySelector("[data-mark-replied]").addEventListener("click", () => {
    const change = b.repliedAt
      ? { repliedAt: firebase.firestore.FieldValue.delete(), repliedWith: firebase.firestore.FieldValue.delete() }
      : { repliedAt: firebase.firestore.FieldValue.serverTimestamp(), repliedWith: "manuell" };
    doc.ref.update(change).catch((err) => console.error(err));
  });
  card.querySelector("[data-confirmation]").addEventListener("click", () => openBookingConfirmation(b));

  // Interne Notiz: ein-/ausklappen, Speichern aktualisiert Firestore
  const notesToggle = card.querySelector("[data-toggle-notes]");
  const notesBox = card.querySelector(".notes-box");
  const notesTextarea = card.querySelector(".notes-textarea");
  notesToggle.addEventListener("click", () => {
    const isHidden = notesBox.classList.toggle("hidden");
    if (!isHidden) {
      notesTextarea.value = b.notes || "";
      notesTextarea.focus();
    }
  });
  card.querySelector("[data-save-notes]").addEventListener("click", () => {
    doc.ref
      .update({ notes: notesTextarea.value.trim() })
      .then(() => notesBox.classList.add("hidden"))
      .catch((err) => {
        console.error(err);
        alert("Notiz konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });

  card.querySelector("[data-delete]").addEventListener("click", async () => {
    const msg = b.blockedId || b.showId
      ? "Diese Buchungsanfrage wirklich löschen? Der dafür eingetragene Termin bzw. gesperrte Tag wird dabei ebenfalls entfernt."
      : "Diese Buchungsanfrage wirklich löschen?";
    if (!confirm(msg)) return;
    try {
      if (b.showId) await fbDb.collection("shows").doc(b.showId).delete();
      if (b.blockedId) await calUnblockRange(b.event_date, b.event_date, b.blockedId);
      await doc.ref.delete();
    } catch (err) {
      console.error(err);
    }
  });

  return card;
}

function loadPendingReviews() {
  const container = document.getElementById("pending-reviews-list");
  fbDb
    .collection("reviews")
    .where("approved", "==", false)
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snapshot) => {
        document.getElementById("stat-pending-reviews").textContent = snapshot.size;
        setNavBadge("badge-reviews", snapshot.size);
        _pendingReviewCount = snapshot.size;
        renderTodayList();

        _activityReviewsPending = snapshot.docs.slice(0, 5).map((doc) => ({
          type: "review",
          title: `Neue Bewertung von ${doc.data().name || "Anonym"}`,
          subtitle: doc.data().comment || "",
          createdAt: doc.data().createdAt,
        }));
        renderActivityFeed();

        if (snapshot.empty) {
          container.innerHTML = emptyStateHtml("Keine Bewertungen zur Prüfung.");
          return;
        }

        container.innerHTML = "";
        snapshot.forEach((doc) => {
          container.appendChild(buildReviewCard(doc, { showApprove: true }));
        });
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

function loadPublishedReviews() {
  const container = document.getElementById("published-reviews-list");
  fbDb
    .collection("reviews")
    .where("approved", "==", true)
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snapshot) => {
        _activityReviewsPublished = snapshot.docs.slice(0, 5).map((doc) => ({
          type: "review",
          title: `Bewertung von ${doc.data().name || "Anonym"}`,
          subtitle: doc.data().comment || "",
          createdAt: doc.data().createdAt,
        }));
        renderActivityFeed();

        if (snapshot.empty) {
          container.innerHTML = emptyStateHtml("Noch keine veröffentlichten Bewertungen.");
          return;
        }

        container.innerHTML = "";
        snapshot.forEach((doc) => {
          container.appendChild(buildReviewCard(doc, { showApprove: false }));
        });

        applySearchFilter("published-search", "published-reviews-list");
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

/* Wiederverwendete Button-Markups: echte Buttons statt einfacher Text-Links,
   damit "Löschen"/"Freigeben" auch optisch als Aktion erkennbar sind (siehe
   .btn-admin-delete / .btn-admin-approve in style.css). */
const DELETE_BUTTON_HTML = `
  <button type="button" class="btn-admin-delete shrink-0" data-delete aria-label="Löschen">
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 3a1 1 0 0 0-1 1v1H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2h-4V4a1 1 0 0 0-1-1H9zM6 8l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12H6z" />
    </svg>
    Löschen
  </button>
`;
const APPROVE_BUTTON_HTML = `
  <button type="button" class="btn-admin-approve shrink-0" data-approve aria-label="Freigeben">
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
    Freigeben
  </button>
`;

function buildReviewCard(doc, { showApprove }) {
  const r = doc.data();
  const stars = "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0));

  const card = document.createElement("article");
  card.className = "admin-card rounded-md p-5";
  card.dataset.search = [r.name, r.eventName, r.comment].filter(Boolean).join(" ").toLowerCase();
  card.innerHTML = `
    <div class="flex items-start gap-4 mb-3">
      <div class="avatar-circle">${initialsOf(r.name)}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap mb-0.5">
          <p class="font-medium name-text"></p>
          ${isRecent(r.createdAt) ? '<span class="badge badge-new">Neu</span>' : ""}
        </div>
        <p class="stars text-sm"></p>
        ${r.eventName ? `<p class="text-xs text-paper-dim event-name mt-0.5"></p>` : ""}
      </div>
      <div class="flex gap-2 shrink-0">
        ${showApprove ? APPROVE_BUTTON_HTML : ""}
        ${DELETE_BUTTON_HTML}
      </div>
    </div>
    <div class="quote-box comment-box mb-2"></div>
    <p class="text-xs text-paper-dim timestamp-text mb-3"></p>

    <div class="reply-box">
      ${
        r.adminReply
          ? `<div class="reply-existing mb-2">
               <span class="text-xs text-gold font-medium">Eure Antwort:</span>
               <p class="text-sm text-paper-dim reply-existing-text"></p>
             </div>`
          : ""
      }
      <div class="reply-edit hidden">
        <textarea class="reply-textarea w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper mb-2" rows="2" placeholder="Öffentliche Antwort schreiben …"></textarea>
        <div class="flex gap-2">
          <button type="button" class="btn-admin-approve" data-save-reply>Antwort speichern</button>
          <button type="button" class="btn-admin-delete" data-cancel-reply>Abbrechen</button>
        </div>
      </div>
      <button type="button" class="btn-ghost text-xs px-3 py-1.5 rounded-sm reply-toggle-btn" data-toggle-reply>
        ${r.adminReply ? "Antwort bearbeiten" : "Antworten"}
      </button>
    </div>
  `;
  card.querySelector(".name-text").textContent = r.name || "Anonym";
  card.querySelector(".stars").textContent = stars;
  const eventEl = card.querySelector(".event-name");
  if (eventEl) eventEl.textContent = r.eventName || "";
  card.querySelector(".comment-box").textContent = r.comment || "";
  card.querySelector(".timestamp-text").textContent = formatTimestamp(r.createdAt);
  const existingReplyText = card.querySelector(".reply-existing-text");
  if (existingReplyText) existingReplyText.textContent = r.adminReply;

  if (showApprove) {
    card.querySelector("[data-approve]").addEventListener("click", () => {
      doc.ref.update({ approved: true }).catch((err) => console.error(err));
    });
  }
  card.querySelector("[data-delete]").addEventListener("click", () => {
    if (confirm("Diese Bewertung wirklich löschen?")) {
      doc.ref.delete().catch((err) => console.error(err));
    }
  });

  // Antwort schreiben/bearbeiten: Textfeld ein-/ausblenden, Speichern
  // schreibt das Feld "adminReply" ins Bewertungs-Dokument — erscheint
  // dann automatisch auf der Homepage unter der Bewertung.
  const toggleBtn = card.querySelector("[data-toggle-reply]");
  const editBox = card.querySelector(".reply-edit");
  const textarea = card.querySelector(".reply-textarea");

  toggleBtn.addEventListener("click", () => {
    editBox.classList.remove("hidden");
    toggleBtn.classList.add("hidden");
    textarea.value = r.adminReply || "";
    textarea.focus();
  });
  card.querySelector("[data-cancel-reply]").addEventListener("click", () => {
    editBox.classList.add("hidden");
    toggleBtn.classList.remove("hidden");
  });
  card.querySelector("[data-save-reply]").addEventListener("click", () => {
    const text = textarea.value.trim();
    doc.ref
      .update({ adminReply: text })
      .catch((err) => {
        console.error(err);
        alert("Antwort konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });

  return card;
}

/* --------------------------------------------------------------------------
   SUCHE / FILTER
   --------------------------------------------------------------------------
   Rein clientseitiger Textfilter über die bereits geladenen Karten (kein
   erneuter Firestore-Request) — blendet nicht passende Karten einfach aus.
   -------------------------------------------------------------------------- */
function initSearchFilters() {
  ["bookings-search", "published-search"].forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.bound) return;
    input.dataset.bound = "1";
    const listId = inputId === "bookings-search" ? "bookings-list" : "published-reviews-list";
    input.addEventListener("input", () => applySearchFilter(inputId, listId));
  });
}

function applySearchFilter(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;
  const term = input.value.trim().toLowerCase();

  list.querySelectorAll(":scope > article[data-search]").forEach((card) => {
    const matches = !term || card.dataset.search.includes(term);
    const statusOk =
      listId !== "bookings-list" ||
      _bookingFilter === "alle" ||
      (_bookingFilter === "ueberfaellig" ? card.dataset.overdue === "1" : card.dataset.status === _bookingFilter);
    card.classList.toggle("hidden", !(matches && statusOk));
  });
}

function emptyStateHtml(message) {
  return `
    <div class="empty-state">
      ${ICONS.empty}
      <p class="text-sm">${message}</p>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   HILFSFUNKTIONEN
   -------------------------------------------------------------------------- */
function escapeText(value) {
  if (value === undefined || value === null || value === "") return "";
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function formatTimestamp(ts) {
  if (!ts || !ts.toDate) return "";
  return ts.toDate().toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* --------------------------------------------------------------------------
   "NACH OBEN"-BUTTON — identisch zur Homepage (siehe main.js).
   -------------------------------------------------------------------------- */
function initScrollToTop() {
  const btn = document.getElementById("scroll-top-btn");
  if (!btn) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
}

/* --------------------------------------------------------------------------
   AUFTRITTSORTE ("Schon aufgetreten bei" auf der Homepage)
   --------------------------------------------------------------------------
   Einfache Liste: jeder Eintrag ist nur ein Name (kein Logo-Upload, da das
   auf einer reinen GitHub-Pages-Seite eine Datei-Upload-Infrastruktur
   bräuchte). Erscheint live auf der Homepage, siehe loadVenues() in main.js.
   -------------------------------------------------------------------------- */
function loadVenues() {
  const container = document.getElementById("venues-list");
  if (!container) return;

  fbDb
    .collection("venues")
    .orderBy("name")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          container.innerHTML = '<p class="text-paper-dim text-sm">Noch keine Auftrittsorte hinterlegt.</p>';
          return;
        }

        container.innerHTML = "";
        snapshot.forEach((doc) => {
          const venue = doc.data();
          const chip = document.createElement("span");
          chip.className = "badge badge-type flex items-center gap-2";
          chip.style.padding = "0.35rem 0.5rem 0.35rem 0.75rem";
          chip.innerHTML = `
            <span class="venue-name"></span>
            <button type="button" aria-label="Auftrittsort löschen" style="color: var(--color-rust-light); display:flex; align-items:center;">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 5.71 12 12.01l-6.3-6.3-1.41 1.42 6.3 6.29-6.3 6.3 1.41 1.41 6.3-6.3 6.3 6.3 1.41-1.41-6.3-6.3 6.3-6.29z"/></svg>
            </button>
          `;
          chip.querySelector(".venue-name").textContent = venue.name || "";
          chip.querySelector("button").addEventListener("click", () => {
            if (confirm(`"${venue.name}" wirklich löschen?`)) {
              doc.ref.delete().catch((err) => console.error(err));
            }
          });
          container.appendChild(chip);
        });
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

function initVenueForm() {
  const form = document.getElementById("venue-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("venue-name-input");
    const name = input.value.trim();
    if (!name) return;

    fbDb
      .collection("venues")
      .add({ name, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
      .then(() => {
        input.value = "";
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/* --------------------------------------------------------------------------
   PLAYLIST (Media-Player auf der Homepage)
   --------------------------------------------------------------------------
   Verwaltet nur die Titel-Liste (Text-Metadaten) in Firestore — die
   eigentliche MP3-Datei muss weiterhin manuell unter assets/audio/ ins
   Repository hochgeladen werden (siehe Hinweistext in admin.html). Die
   Reihenfolge ergibt sich aus dem Hinzufügungs-Zeitpunkt (createdAt); zum
   Umsortieren einen Song löschen und in gewünschter Reihenfolge neu
   anlegen.
   -------------------------------------------------------------------------- */
function loadSongs() {
  const container = document.getElementById("songs-list");
  if (!container) return;

  fbDb
    .collection("songs")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          container.innerHTML = '<p class="text-paper-dim text-sm">Noch keine Songs hinterlegt — der Player zeigt so lange die Beispiel-Playlist.</p>';
          return;
        }

        container.innerHTML = "";
        snapshot.forEach((doc, index) => {
          const song = doc.data();
          const row = document.createElement("div");
          row.className = "admin-card rounded-md p-3 flex items-center gap-3";
          row.innerHTML = `
            <span class="track-number text-xs w-5 shrink-0">${String(index + 1).padStart(2, "0")}</span>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium truncate title-text"></span>
              <span class="block text-xs text-paper-dim truncate file-text"></span>
            </span>
            <span class="text-xs text-paper-dim shrink-0 duration-text"></span>
            ${DELETE_BUTTON_HTML}
          `;
          row.querySelector(".title-text").textContent = song.title || "Ohne Titel";
          row.querySelector(".file-text").textContent = song.filename || "";
          row.querySelector(".duration-text").textContent = song.duration || "";
          row.querySelector("[data-delete]").addEventListener("click", () => {
            if (confirm(`"${song.title || "Song"}" wirklich aus der Playlist löschen?`)) {
              doc.ref.delete().catch((err) => console.error(err));
            }
          });
          container.appendChild(row);
        });
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

function initSongForm() {
  const form = document.getElementById("song-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleInput = document.getElementById("song-title-input");
    const durationInput = document.getElementById("song-duration-input");
    const filenameInput = document.getElementById("song-filename-input");

    const title = titleInput.value.trim();
    const filename = filenameInput.value.trim();
    if (!title || !filename) return;

    fbDb
      .collection("songs")
      .add({
        title,
        duration: durationInput.value.trim(),
        filename,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        titleInput.value = "";
        durationInput.value = "";
        filenameInput.value = "";
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/* --------------------------------------------------------------------------
   TERMINE (Header-Hinweis + Termine-Seite auf der Homepage)
   --------------------------------------------------------------------------
   Zeigt ALLE Termine (kommend + vergangen) in einer Liste, sortiert nach
   Datum (neueste kommende zuerst), mit einem Badge, das automatisch anhand
   des heutigen Datums "Kommend" oder "Vergangen" anzeigt — dieselbe Logik
   wie auf der Homepage. Bearbeiten passiert inline in der Zeile selbst
   (Klick auf "Bearbeiten" blendet Eingabefelder ein).
   -------------------------------------------------------------------------- */
function loadShows() {
  const container = document.getElementById("shows-list");
  if (!container) return;

  fbDb
    .collection("shows")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          container.innerHTML = '<p class="text-paper-dim text-sm">Noch keine Termine hinterlegt.</p>';
          return;
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        const docs = snapshot.docs.slice().sort((a, b) => {
          const da = a.data().date || "";
          const db = b.data().date || "";
          return da.localeCompare(db);
        });

        container.innerHTML = "";
        docs.forEach((doc) => {
          container.appendChild(buildShowRow(doc, todayStr));
        });
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

function buildShowRow(doc, todayStr) {
  const s = doc.data();
  const isUpcoming = (s.date || "") >= todayStr;
  const dateChip = formatDateChip(s.date);

  const row = document.createElement("article");
  row.className = "admin-card rounded-md p-4";
  renderShowView();
  return row;

  function renderShowView() {
    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="date-chip">
          <span class="date-chip-month">${dateChip.month}</span>
          <span class="date-chip-day">${dateChip.day}</span>
          <span class="date-chip-year">${dateChip.year}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-0.5">
            <p class="font-medium truncate venue-text"></p>
            <span class="badge" style="${isUpcoming ? "background:rgba(199,154,62,0.15);color:var(--color-gold);border:1px solid rgba(199,154,62,0.3);" : "background:rgba(236,226,203,0.06);color:var(--color-paper-dim);border:1px solid var(--color-line);"}">
              ${isUpcoming ? "Kommend" : "Vergangen"}
            </span>
            ${s.type ? `<span class="badge badge-type">${escapeText(s.type)}</span>` : ""}
            ${s.bookingId ? '<span class="badge badge-type">Aus Anfrage</span>' : ""}
          </div>
          <p class="text-xs text-paper-dim city-text"></p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button type="button" class="btn-admin-approve" data-edit>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>
            Bearbeiten
          </button>
          ${DELETE_BUTTON_HTML}
        </div>
      </div>
    `;
    row.querySelector(".venue-text").textContent = s.venue || "—";
    row.querySelector(".city-text").textContent = s.city || "";

    row.querySelector("[data-edit]").addEventListener("click", renderShowEdit);
    row.querySelector("[data-delete]").addEventListener("click", () => {
      if (confirm(`Termin "${s.venue || ""}" wirklich löschen?`)) {
        doc.ref.delete().catch((err) => console.error(err));
      }
    });
  }

  function renderShowEdit() {
    row.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <input type="date" class="edit-date w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" value="${escapeAttr(s.date || "")}" />
        <input type="text" class="edit-venue w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Location" value="${escapeAttr(s.venue || "")}" />
        <input type="text" class="edit-city w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Ort" value="${escapeAttr(s.city || "")}" />
        <input type="text" class="edit-type w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Art" value="${escapeAttr(s.type || "")}" />
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-admin-approve" data-save>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
          Speichern
        </button>
        <button type="button" class="btn-admin-delete" data-cancel>Abbrechen</button>
      </div>
    `;

    row.querySelector("[data-cancel]").addEventListener("click", renderShowView);
    row.querySelector("[data-save]").addEventListener("click", () => {
      const date = row.querySelector(".edit-date").value;
      const venue = row.querySelector(".edit-venue").value.trim();
      const city = row.querySelector(".edit-city").value.trim();
      const type = row.querySelector(".edit-type").value.trim();
      if (!date || !venue) return;

      doc.ref
        .update({ date, venue, city, type })
        .catch((err) => {
          console.error(err);
          alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
        });
    });
  }
}

function initShowForm() {
  const form = document.getElementById("show-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dateInput = document.getElementById("show-date-input");
    const venueInput = document.getElementById("show-venue-input");
    const cityInput = document.getElementById("show-city-input");
    const typeInput = document.getElementById("show-type-input");

    const date = dateInput.value;
    const venue = venueInput.value.trim();
    const city = cityInput.value.trim();
    if (!date || !venue) return;

    fbDb
      .collection("shows")
      .add({
        date,
        venue,
        city,
        type: typeInput.value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        dateInput.value = "";
        venueInput.value = "";
        cityInput.value = "";
        typeInput.value = "";
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/* --------------------------------------------------------------------------
   SIDEBAR-NAVIGATION / VIEW-SWITCHING
   --------------------------------------------------------------------------
   Statt einer langen Scroll-Seite zeigt das Dashboard immer nur einen
   Bereich ("View") gleichzeitig — Klick in der Sidebar (oder auf eine der
   Statistik-Kacheln in der Übersicht) blendet den passenden Bereich ein.
   -------------------------------------------------------------------------- */
const ADMIN_VIEW_TITLES = {
  uebersicht: "Übersicht",
  kalender: "Kalender",
  buchungen: "Buchungsanfragen",
  bewertungen: "Bewertungen",
  termine: "Termine",
  setlisten: "Setlisten",
  auftrittsorte: "Auftrittsorte",
  playlist: "Playlist",
  medien: "Galerie & Videos",
  band: "Band",
  faq: "Häufige Fragen",
  einstellungen: "Einstellungen",
  backup: "Datensicherung",
};

function initAdminNav() {
  if (document.body.dataset.adminNavBound) return;
  document.body.dataset.adminNavBound = "1";

  const navButtons = document.querySelectorAll(".admin-nav-item[data-view], .admin-nav-link[data-view]");
  const views = document.querySelectorAll(".admin-view[data-view-panel]");
  const titleEl = document.getElementById("admin-view-title");

  function showView(viewId) {
    if (!ADMIN_VIEW_TITLES[viewId]) viewId = "uebersicht";

    views.forEach((v) => v.classList.toggle("active", v.dataset.viewPanel === viewId));
    document.querySelectorAll(".admin-nav-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewId);
    });
    if (titleEl) titleEl.textContent = ADMIN_VIEW_TITLES[viewId];
    if (viewId === "einstellungen") autoGrowSettings(); // Textfelder erst jetzt messbar
    document.querySelector(".admin-main")?.scrollTo({ top: 0, behavior: "auto" });
    window.scrollTo({ top: 0, behavior: "auto" });
    history.replaceState(null, "", `#${viewId}`);
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showView(btn.dataset.view);
    });
  });

  const initial = location.hash.replace("#", "");
  showView(initial || "uebersicht");
}

/** Zeigt/versteckt ein rotes Zähler-Badge in der Sidebar (Teams-Stil) —
 *  0 = Badge bleibt unsichtbar, sonst Zahl anzeigen (99+ bei sehr vielen). */
function setNavBadge(elementId, count) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = count > 99 ? "99+" : String(count);
  el.classList.toggle("hidden", count <= 0);
}

/* --------------------------------------------------------------------------
   "NEUESTE AKTIVITÄT" — Übersicht
   --------------------------------------------------------------------------
   Führt die letzten Buchungsanfragen und Bewertungen (wartend + veröffent-
   licht) zu einer gemeinsamen, nach Zeit sortierten Liste zusammen. Rein
   informativ, keine eigene Datenquelle — nutzt die Zwischenspeicher, die
   loadBookings()/loadPendingReviews()/loadPublishedReviews() ohnehin schon
   befüllen.
   -------------------------------------------------------------------------- */
function renderActivityFeed() {
  const container = document.getElementById("activity-feed");
  if (!container) return;

  const items = [..._activityBookings, ..._activityReviewsPending, ..._activityReviewsPublished]
    .filter((item) => item.createdAt && item.createdAt.toDate)
    .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
    .slice(0, 6);

  if (items.length === 0) {
    container.innerHTML = '<p class="text-paper-dim text-sm">Noch keine Aktivität vorhanden.</p>';
    return;
  }

  container.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-card rounded-md p-3 flex items-center gap-3";
    row.innerHTML = `
      <span class="stat-card-icon" style="position:static;">
        ${
          item.type === "booking"
            ? '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M19 4h-1V3a1 1 0 1 0-2 0v1H8V3a1 1 0 0 0-2 0v1H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14zm0-12H5V6h14z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>'
        }
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium truncate item-title"></span>
        <span class="block text-xs text-paper-dim truncate item-subtitle"></span>
      </span>
      <span class="text-xs text-paper-dim shrink-0 item-time"></span>
    `;
    row.querySelector(".item-title").textContent = item.title;
    row.querySelector(".item-subtitle").textContent = item.subtitle || "";
    row.querySelector(".item-time").textContent = formatRelativeTime(item.createdAt);
    container.appendChild(row);
  });
}

/** "vor 5 Minuten" / "vor 3 Std." / "vor 2 Tagen" statt eines vollen
 *  Datums — passender für ein kompaktes Aktivitäts-Feed. */
function formatRelativeTime(ts) {
  if (!ts || !ts.toDate) return "";
  const diffMs = Date.now() - ts.toDate().getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

/* --------------------------------------------------------------------------
   CSV-EXPORT (Buchungsanfragen)
   --------------------------------------------------------------------------
   Rein clientseitig: baut aus dem zuletzt geladenen Buchungs-Zwischen-
   speicher eine CSV-Datei und lässt sie den Browser herunterladen — kein
   Server nötig.
   -------------------------------------------------------------------------- */
function initExportButton() {
  const btn = document.getElementById("export-bookings-btn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", () => {
    if (_bookingsCache.length === 0) {
      alert("Keine Buchungsanfragen zum Exportieren vorhanden.");
      return;
    }

    const columns = [
      "status",
      "from_name",
      "company",
      "from_email",
      "phone",
      "event_date",
      "event_type",
      "location",
      "guests",
      "set_length",
      "budget",
      "tech_requirements",
      "message",
      "notes",
    ];
    const header = columns.join(";");
    const rows = _bookingsCache.map((b) => columns.map((col) => csvEscape(b[col])).join(";"));
    const csv = [header, ...rows].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buchungsanfragen-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function csvEscape(value) {
  if (value === undefined || value === null) return "";
  const str = String(value).replace(/"/g, '""');
  return /[;"\n]/.test(str) ? `"${str}"` : str;
}

/* --------------------------------------------------------------------------
   BESTEHENDE BEISPIEL-TERMINE IMPORTIEREN
   --------------------------------------------------------------------------
   Einmalig nutzbar, um die sechs Termine, die vorher fest im Code standen,
   als "echte", über den Admin-Bereich verwaltbare Einträge in Firestore
   anzulegen. Prüft vorher anhand von Datum+Location, ob ein Termin schon
   existiert, um Dopplungen bei mehrfachem Klick zu vermeiden.
   -------------------------------------------------------------------------- */
const SEED_SHOWS = [
  { date: "2026-05-16", venue: "Raffas Scheune", city: "Brandoberndorf", type: "Live Gig" },
  { date: "2026-06-13", venue: "TSV Neukirchen", city: "Neukirchen", type: "Live Gig" },
  { date: "2026-08-08", venue: "Runde Ritzel", city: "Brandoberndorf", type: "Live Gig" },
  { date: "2026-09-11", venue: "Noise Lab", city: "Heuchelheim", type: "Live Gig" },
  { date: "2026-09-19", venue: "Raffas Scheune", city: "Brandoberndorf", type: "Live Gig" },
  { date: "2026-09-25", venue: "Blue Knights", city: "Ettingshausen", type: "Live Gig" },
];

function initImportShowsButton() {
  const btn = document.getElementById("import-shows-btn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", () => {
    if (
      !confirm(
        `Die ${SEED_SHOWS.length} bisherigen Beispiel-Termine (Raffas Scheune, TSV Neukirchen, Runde Ritzel, Noise Lab, Blue Knights) als Einträge anlegen? Bereits vorhandene, identische Termine werden übersprungen.`
      )
    ) {
      return;
    }

    btn.disabled = true;
    btn.textContent = "Importiere …";

    fbDb
      .collection("shows")
      .get()
      .then((snapshot) => {
        const existing = new Set(snapshot.docs.map((doc) => `${doc.data().date}__${doc.data().venue}`));
        const toAdd = SEED_SHOWS.filter((s) => !existing.has(`${s.date}__${s.venue}`));

        if (toAdd.length === 0) {
          alert("Alle Beispiel-Termine sind bereits vorhanden.");
          return Promise.resolve();
        }

        const batch = fbDb.batch();
        toAdd.forEach((s) => {
          const ref = fbDb.collection("shows").doc();
          batch.set(ref, { ...s, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        });
        return batch.commit().then(() => {
          alert(`${toAdd.length} Termin(e) importiert.`);
        });
      })
      .catch((err) => {
        console.error(err);
        alert("Import fehlgeschlagen. Bitte erneut versuchen.");
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = "Bestehende Beispiel-Termine importieren";
      });
  });
}

/* --------------------------------------------------------------------------
   GALERIEBILDER
   --------------------------------------------------------------------------
   Verwaltet Pfad/Adresse, Bildunterschrift und Kachelgröße. Die Bilddatei
   selbst muss im Repository liegen oder bereits online sein — eine reine
   GitHub-Pages-Seite kann keine Uploads entgegennehmen (siehe Hinweistext
   in admin.html).
   -------------------------------------------------------------------------- */
function loadGalleryAdmin() {
  const container = document.getElementById("gallery-admin-list");
  if (!container) return;

  fbDb
    .collection("gallery")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          container.innerHTML = emptyStateHtml(
            "Noch keine Bilder hinterlegt — auf der Homepage sind so lange die fest eingebauten Fotos zu sehen."
          );
          return;
        }

        container.innerHTML = "";
        snapshot.forEach((doc) => {
          const item = doc.data();
          const row = document.createElement("div");
          row.className = "admin-card rounded-md p-3 flex items-center gap-3";
          row.innerHTML = `
            <span class="media-thumb shrink-0"></span>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium truncate caption-text"></span>
              <span class="block text-xs text-paper-dim truncate src-text"></span>
            </span>
            <span class="badge badge-type shrink-0 size-text"></span>
            ${DELETE_BUTTON_HTML}
          `;

          const thumb = row.querySelector(".media-thumb");
          const img = document.createElement("img");
          img.src = item.src || "";
          img.alt = "";
          img.loading = "lazy";
          img.onerror = () => {
            thumb.classList.add("media-thumb--missing");
            img.remove();
          };
          thumb.appendChild(img);

          row.querySelector(".caption-text").textContent = item.caption || "(ohne Bildunterschrift)";
          row.querySelector(".src-text").textContent = item.src || "";
          row.querySelector(".size-text").textContent =
            item.size === "hoch" ? "Hochformat" : item.size === "breit" ? "Breit" : "Normal";

          row.querySelector("[data-delete]").addEventListener("click", () => {
            if (confirm("Dieses Bild wirklich aus der Galerie entfernen?")) {
              doc.ref.delete().catch((err) => console.error(err));
            }
          });

          container.appendChild(row);
        });
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

function initGalleryForm() {
  const form = document.getElementById("gallery-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const srcInput = document.getElementById("gallery-src-input");
    const captionInput = document.getElementById("gallery-caption-input");
    const sizeInput = document.getElementById("gallery-size-input");

    const src = srcInput.value.trim();
    if (!src) return;

    fbDb
      .collection("gallery")
      .add({
        src,
        caption: captionInput.value.trim(),
        size: sizeInput.value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        srcInput.value = "";
        captionInput.value = "";
        sizeInput.value = "normal";
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/* --------------------------------------------------------------------------
   LIVE-VIDEOS
   --------------------------------------------------------------------------
   Nur ein YouTube-Link — kein Datei-Upload nötig, daher komplett über
   diesen Bereich verwaltbar.
   -------------------------------------------------------------------------- */
function loadVideosAdmin() {
  const container = document.getElementById("videos-admin-list");
  if (!container) return;

  fbDb
    .collection("videos")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          container.innerHTML = emptyStateHtml(
            "Noch keine Videos hinterlegt — der Video-Bereich auf der Homepage bleibt so lange ausgeblendet."
          );
          return;
        }

        container.innerHTML = "";
        snapshot.forEach((doc) => {
          const video = doc.data();
          const videoId = extractYouTubeIdAdmin(video.url || "");
          const row = document.createElement("div");
          row.className = "admin-card rounded-md p-3 flex items-center gap-3";
          row.innerHTML = `
            <span class="media-thumb shrink-0"></span>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium truncate title-text"></span>
              <span class="block text-xs text-paper-dim truncate url-text"></span>
            </span>
            ${DELETE_BUTTON_HTML}
          `;

          // YouTube liefert zu jeder Video-ID ein Vorschaubild — praktisch,
          // um im Admin-Bereich direkt zu sehen, welches Video gemeint ist.
          const thumb = row.querySelector(".media-thumb");
          if (videoId) {
            const img = document.createElement("img");
            img.src = `https://i.ytimg.com/vi/${videoId}/default.jpg`;
            img.alt = "";
            img.loading = "lazy";
            img.onerror = () => {
              thumb.classList.add("media-thumb--missing");
              img.remove();
            };
            thumb.appendChild(img);
          } else {
            thumb.classList.add("media-thumb--missing");
          }

          row.querySelector(".title-text").textContent = video.title || "(ohne Titel)";
          row.querySelector(".url-text").textContent = videoId
            ? video.url
            : `${video.url} — Link konnte nicht gelesen werden`;

          row.querySelector("[data-delete]").addEventListener("click", () => {
            if (confirm("Dieses Video wirklich entfernen?")) {
              doc.ref.delete().catch((err) => console.error(err));
            }
          });

          container.appendChild(row);
        });
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
}

function initVideoForm() {
  const form = document.getElementById("video-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const urlInput = document.getElementById("video-url-input");
    const titleInput = document.getElementById("video-title-input");

    const url = urlInput.value.trim();
    if (!url) return;

    // Vorab prüfen, damit kein unbrauchbarer Link gespeichert wird
    if (!extractYouTubeIdAdmin(url)) {
      alert(
        "Aus diesem Link konnte keine YouTube-Video-ID gelesen werden.\n\n" +
          "Beispiele, die funktionieren:\n" +
          "https://www.youtube.com/watch?v=abcdefghijk\n" +
          "https://youtu.be/abcdefghijk\n" +
          "abcdefghijk (die ID allein)"
      );
      return;
    }

    fbDb
      .collection("videos")
      .add({
        url,
        title: titleInput.value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        urlInput.value = "";
        titleInput.value = "";
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/** Gleiche Logik wie extractYouTubeId() in main.js — hier noch einmal,
 *  weil admin.js eigenständig ohne main.js geladen wird. */
function extractYouTubeIdAdmin(input) {
  const value = String(input).trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;

  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
    /\/live\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}


/* --------------------------------------------------------------------------
   ANKÜNDIGUNGS-BANNER (Übersicht)
   --------------------------------------------------------------------------
   Speichert Text + Ein/Aus-Schalter in settings/announcement. Wird einmalig
   beim Öffnen geladen (kein Live-Listener), damit eure Eingabe nicht
   überschrieben wird, während ihr noch tippt.
   -------------------------------------------------------------------------- */
function loadAnnouncementAdmin() {
  const textInput = document.getElementById("announcement-text-input");
  const activeInput = document.getElementById("announcement-active-input");
  if (!textInput || !activeInput) return;

  fbDb
    .collection("settings")
    .doc("announcement")
    .get()
    .then((doc) => {
      if (!doc.exists) return;
      const data = doc.data();
      textInput.value = data.text || "";
      activeInput.checked = !!data.active;
    })
    .catch((err) => console.error(err));
}

function initAnnouncementForm() {
  const form = document.getElementById("announcement-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const textInput = document.getElementById("announcement-text-input");
    const activeInput = document.getElementById("announcement-active-input");
    const statusEl = document.getElementById("announcement-status");

    const text = textInput.value.trim();
    if (activeInput.checked && !text) {
      alert("Bitte zuerst einen Text eingeben, bevor der Banner angezeigt wird.");
      return;
    }

    fbDb
      .collection("settings")
      .doc("announcement")
      .set(
        { text, active: activeInput.checked, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      )
      .then(() => {
        statusEl.textContent = activeInput.checked ? "Gespeichert — Banner ist live." : "Gespeichert — Banner ist aus.";
        setTimeout(() => (statusEl.textContent = ""), 3500);
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}


/* --------------------------------------------------------------------------
   BAND (Mitglieder auf der Homepage)
   --------------------------------------------------------------------------
   Verwaltet Name, Rolle, Text, Foto-Pfad und Reihenfolge. Das Foto selbst
   muss im Repository liegen oder bereits online sein (siehe Hinweistext in
   admin.html). Bearbeiten passiert inline in der Zeile.
   -------------------------------------------------------------------------- */
const SEED_BAND = [
  {
    name: "Raffa", role: "Gesang", order: 1, photo: "assets/img/band/raffa.jpg",
    bio: "Raffa steht vorne am Mikro und gibt der Band ihr Gesicht — druckvolle Stimme, direkter Kontakt zum Publikum, keine Show ohne diese Energie.",
  },
  {
    name: "Marie", role: "Gesang / Akustikgitarre", order: 2, photo: "",
    bio: "Marie verbindet Gesang und Akustikgitarre zu den intensiven Zwischentönen im Set — dort, wo der Rock kurz Platz zum Atmen lässt.",
  },
  {
    name: "Tim", role: "Lead-Gitarre", order: 3, photo: "assets/img/band/tim.jpg",
    bio: "Tim liefert die Leadgitarre: markante Riffs, druckvolle Soli und der Sound, der noch lange nach dem letzten Ton im Ohr bleibt.",
  },
  {
    name: "Tobi", role: "Rhythmus-Gitarre", order: 4, photo: "assets/img/band/tobi.jpg",
    bio: "Tobi hält als Rhythmusgitarrist alles zusammen — der feste Rahmen, in dem sich Leadgitarre und Gesang frei entfalten können.",
  },
  {
    name: "Nik", role: "Schlagzeug", order: 5, photo: "assets/img/band/nik.jpg",
    bio: "Nik sitzt hinterm Schlagzeug und gibt den Takt vor, druckvoll und präzise — das Herzstück, das die ganze Band zusammenhält.",
  },
  {
    name: "Uli", role: "Bass", order: 6, photo: "assets/img/band/uli.jpg",
    bio: "Uli legt am Bass das Fundament, auf dem der ganze Sound steht — satt, groovend und genau dort, wo er hingehört.",
  },
];

function bandOrderValue(m) {
  const n = Number(m.order);
  return m.order === null || m.order === undefined || m.order === "" || !Number.isFinite(n) ? 999 : n;
}

function loadBandAdmin() {
  const container = document.getElementById("band-admin-list");
  if (!container) return;

  fbDb.collection("band").onSnapshot(
    (snapshot) => {
      if (snapshot.empty) {
        container.innerHTML = emptyStateHtml(
          "Noch keine Mitglieder hinterlegt — auf der Homepage sind so lange die fest eingebauten Karten zu sehen. Mit „Bestehende Mitglieder importieren“ übernehmt ihr sie mit einem Klick hierher."
        );
        return;
      }

      const docs = snapshot.docs.slice().sort((a, b) => {
        const diff = bandOrderValue(a.data()) - bandOrderValue(b.data());
        if (diff !== 0) return diff;
        const ta = a.data().createdAt && a.data().createdAt.toMillis ? a.data().createdAt.toMillis() : 0;
        const tb = b.data().createdAt && b.data().createdAt.toMillis ? b.data().createdAt.toMillis() : 0;
        return ta - tb;
      });

      container.innerHTML = "";
      docs.forEach((doc) => container.appendChild(buildBandRow(doc)));
    },
    (err) => {
      console.error(err);
      container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
    }
  );
}

function buildBandRow(doc) {
  const m = doc.data();
  const row = document.createElement("article");
  row.className = "admin-card rounded-md p-4";
  renderBandView();
  return row;

  function renderBandView() {
    row.innerHTML = `
      <div class="flex items-center gap-4">
        <span class="media-thumb shrink-0"></span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-0.5">
            <p class="font-medium truncate name-text"></p>
            <span class="badge badge-type order-text"></span>
          </div>
          <p class="text-xs text-paper-dim role-text"></p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button type="button" class="btn-admin-approve" data-edit>Bearbeiten</button>
          ${DELETE_BUTTON_HTML}
        </div>
      </div>
    `;

    const thumb = row.querySelector(".media-thumb");
    if (m.photo) {
      const img = document.createElement("img");
      img.src = m.photo;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => {
        thumb.classList.add("media-thumb--missing");
        img.remove();
      };
      thumb.appendChild(img);
    } else {
      thumb.textContent = String(m.name || "?").trim().slice(0, 2).toUpperCase();
      thumb.style.fontFamily = "var(--font-display)";
      thumb.style.color = "var(--color-paper-dim)";
    }

    row.querySelector(".name-text").textContent = m.name || "—";
    row.querySelector(".role-text").textContent = m.role || "";
    row.querySelector(".order-text").textContent =
      m.order === null || m.order === undefined || m.order === "" ? "ohne Nr." : `Nr. ${m.order}`;

    row.querySelector("[data-edit]").addEventListener("click", renderBandEdit);
    row.querySelector("[data-delete]").addEventListener("click", () => {
      if (confirm(`"${m.name || "Mitglied"}" wirklich entfernen?`)) {
        doc.ref.delete().catch((err) => console.error(err));
      }
    });
  }

  function renderBandEdit() {
    row.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
        <input type="text" class="edit-name w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Name" value="${escapeAttr(m.name || "")}" />
        <input type="text" class="edit-role w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Rolle" value="${escapeAttr(m.role || "")}" />
        <input type="number" min="1" class="edit-order w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Reihenfolge" value="${escapeAttr(m.order === null || m.order === undefined ? "" : m.order)}" />
        <input type="text" class="edit-photo w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Foto-Pfad" value="${escapeAttr(m.photo || "")}" />
        <textarea class="edit-bio sm:col-span-4 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" rows="3" placeholder="Text"></textarea>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-admin-approve" data-save>Speichern</button>
        <button type="button" class="btn-admin-delete" data-cancel>Abbrechen</button>
      </div>
    `;
    row.querySelector(".edit-bio").value = m.bio || "";

    row.querySelector("[data-cancel]").addEventListener("click", renderBandView);
    row.querySelector("[data-save]").addEventListener("click", () => {
      const name = row.querySelector(".edit-name").value.trim();
      if (!name) {
        alert("Bitte einen Namen eingeben.");
        return;
      }
      const orderRaw = row.querySelector(".edit-order").value.trim();
      doc.ref
        .update({
          name,
          role: row.querySelector(".edit-role").value.trim(),
          order: orderRaw === "" ? null : Number(orderRaw),
          photo: row.querySelector(".edit-photo").value.trim(),
          bio: row.querySelector(".edit-bio").value.trim(),
        })
        .catch((err) => {
          console.error(err);
          alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
        });
    });
  }
}

function initBandForm() {
  const form = document.getElementById("band-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("band-name-input");
    const roleInput = document.getElementById("band-role-input");
    const orderInput = document.getElementById("band-order-input");
    const photoInput = document.getElementById("band-photo-input");
    const bioInput = document.getElementById("band-bio-input");

    const name = nameInput.value.trim();
    if (!name) return;
    const orderRaw = orderInput.value.trim();

    fbDb
      .collection("band")
      .add({
        name,
        role: roleInput.value.trim(),
        order: orderRaw === "" ? null : Number(orderRaw),
        photo: photoInput.value.trim(),
        bio: bioInput.value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        [nameInput, roleInput, orderInput, photoInput, bioInput].forEach((el) => (el.value = ""));
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/* Übernimmt die sechs bisher fest im HTML stehenden Mitglieder als echte,
   hier verwaltbare Einträge. Wichtig, weil die Homepage die eingebauten
   Karten komplett ausblendet, sobald auch nur EIN Mitglied hier steht —
   ohne Import würdet ihr beim ersten neuen Eintrag die übrigen fünf
   "verlieren". Duplikate werden anhand des Namens übersprungen. */
function initImportBandButton() {
  const btn = document.getElementById("import-band-btn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", () => {
    if (
      !confirm(
        `Die ${SEED_BAND.length} bisherigen Bandmitglieder (Raffa, Marie, Tim, Tobi, Nik, Uli) als Einträge anlegen? Bereits vorhandene Namen werden übersprungen.`
      )
    ) {
      return;
    }

    btn.disabled = true;
    btn.textContent = "Importiere …";

    fbDb
      .collection("band")
      .get()
      .then((snapshot) => {
        const existing = new Set(snapshot.docs.map((doc) => String(doc.data().name || "").toLowerCase()));
        const toAdd = SEED_BAND.filter((m) => !existing.has(m.name.toLowerCase()));

        if (toAdd.length === 0) {
          alert("Alle Mitglieder sind bereits vorhanden.");
          return null;
        }

        const batch = fbDb.batch();
        toAdd.forEach((m) => {
          batch.set(fbDb.collection("band").doc(), {
            ...m,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        });
        return batch.commit().then(() => alert(`${toAdd.length} Mitglied(er) importiert.`));
      })
      .catch((err) => {
        console.error(err);
        alert("Import fehlgeschlagen. Bitte erneut versuchen.");
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = "Bestehende Mitglieder importieren";
      });
  });
}

/* --------------------------------------------------------------------------
   KALENDER (Sperrtage, Auftritte, Anfragen)
   --------------------------------------------------------------------------
   Monatsansicht mit allem, was an einem Tag los ist:
   - Auftritte (Collection "shows", gepflegt unter "Termine")
   - Buchungsanfragen (am Veranstaltungsdatum, farbig nach Status)
   - Sperren (Collection "blocked": { from, to } — bis einschließlich)
   Der interne Sperrgrund liegt bewusst in einer eigenen, nur für Admins
   lesbaren Collection "blockedNotes" (gleiche ID), weil "blocked" öffentlich
   lesbar sein muss: Die Homepage braucht die Daten, um die Tage im
   Buchungsformular zu sperren — der Grund soll dort aber nie sichtbar sein.
   -------------------------------------------------------------------------- */
let _calShows = [];
let _calBlocked = [];
let _calNotes = {};
let _calViewDate = null;
let _calSelected = null;

const CAL_MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const calPad = (n) => String(n).padStart(2, "0");
const calIso = (d) => `${d.getFullYear()}-${calPad(d.getMonth() + 1)}-${calPad(d.getDate())}`;
const calFromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const calAddDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const calPretty = (iso) => calFromIso(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const calShort = (iso) => calFromIso(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
function calIsoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}
const calBlockedAt = (key) => _calBlocked.filter((r) => key >= r.from && key <= r.to);
const calIsUnavailable = (key) => _calShows.some((s) => s.date === key) || calBlockedAt(key).length > 0;

function loadCalendarAdmin() {
  if (!document.getElementById("acal-grid")) return;
  const now = new Date();
  _calViewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  _calSelected = calIso(now);

  const fail = (err) => console.error(err);
  fbDb.collection("shows").onSnapshot((snap) => {
    _calShows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAdminCalendar();
  }, fail);
  fbDb.collection("blocked").onSnapshot((snap) => {
    _calBlocked = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.from && r.to)
      .sort((a, b) => a.from.localeCompare(b.from));
    renderAdminCalendar();
    renderBlockedList();
  }, fail);
  fbDb.collection("blockedNotes").onSnapshot((snap) => {
    _calNotes = {};
    snap.docs.forEach((d) => { _calNotes[d.id] = d.data().reason || ""; });
    renderAdminCalendar();
    renderBlockedList();
  }, fail);

  bindCalendarEvents();
  renderAdminCalendar();
  renderBlockedList();
}

function renderAdminCalendar() {
  const grid = document.getElementById("acal-grid");
  if (!grid || !_calViewDate) return;

  const y = _calViewDate.getFullYear();
  const m = _calViewDate.getMonth();
  document.getElementById("acal-title").textContent = `${CAL_MONTHS[m]} ${y}`;

  const todayIso = calIso(new Date());
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // Woche beginnt am Montag
  const start = calAddDays(first, -offset);
  const weeks = Math.ceil((offset + new Date(y, m + 1, 0).getDate()) / 7);

  const showsByDate = {};
  _calShows.forEach((s) => { if (s.date) (showsByDate[s.date] = showsByDate[s.date] || []).push(s); });
  const bookingsByDate = {};
  _bookingsCache.forEach((b) => { if (b.event_date) (bookingsByDate[b.event_date] = bookingsByDate[b.event_date] || []).push(b); });

  let html = '<span class="acal-dow">KW</span>' + ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span class="acal-dow">${w}</span>`).join("");

  for (let w = 0; w < weeks; w++) {
    const weekStart = calAddDays(start, w * 7);
    const days = Array.from({ length: 7 }, (_, i) => calAddDays(weekStart, i));
    const allBlocked = days.every((d) => calBlockedAt(calIso(d)).length > 0);
    html += `<button type="button" class="acal-week${allBlocked ? " is-blocked" : ""}" data-week="${calIso(weekStart)}" title="${allBlocked ? "Ganze Woche freigeben" : "Ganze Woche sperren"}">KW ${calIsoWeek(days[0])}</button>`;

    days.forEach((d) => {
      const key = calIso(d);
      const sh = showsByDate[key] || [];
      const bk = bookingsByDate[key] || [];
      const bl = calBlockedAt(key);
      const cls = ["acal-day"];
      if (d.getMonth() !== m) cls.push("is-other");
      if (key === todayIso) cls.push("is-today");
      if (key === _calSelected) cls.push("is-selected");
      if (key < todayIso) cls.push("is-past");
      if (bl.length) cls.push("is-blocked");
      if (sh.length) cls.push("has-show");

      const reason = bl.map((r) => _calNotes[r.id]).find(Boolean) || "";
      let inner = `<span class="acal-num">${d.getDate()}</span>`;
      if (sh.length) inner += `<span class="acal-tag acal-tag--show">${escapeText(sh[0].venue || "Auftritt")}${sh.length > 1 ? ` +${sh.length - 1}` : ""}</span>`;
      if (bl.length) inner += `<span class="acal-tag acal-tag--blocked">${escapeText(reason || "gesperrt")}</span>`;
      const dots =
        (sh.length ? '<i class="acal-dot acal-dot--show"></i>' : "") +
        bk
          .filter((b) => (b.status || "neu") !== "abgesagt")
          .map((b) => `<i class="acal-dot acal-dot--${escapeAttr(b.status || "neu")}"></i>`)
          .join("");
      if (dots) inner += `<span class="acal-dots">${dots}</span>`;

      const label = calPretty(key) + (sh.length ? ", Auftritt" : "") + (bl.length ? ", gesperrt" : "") + (bk.length ? `, ${bk.length} Anfrage${bk.length > 1 ? "n" : ""}` : "");
      html += `<button type="button" class="${cls.join(" ")}" data-date="${key}" aria-label="${escapeAttr(label)}">${inner}</button>`;
    });
  }
  grid.innerHTML = html;
  renderDayPanel();
  if (typeof refreshBookingWarnings === "function") refreshBookingWarnings(); // Warnungen an Kalender-Änderungen anpassen
  if (typeof renderTodayList === "function") renderTodayList();
}

function renderDayPanel() {
  const el = document.getElementById("acal-day-panel");
  if (!el) return;
  const key = _calSelected;
  if (!key) {
    el.innerHTML = '<p class="text-paper-dim text-sm">Wählt im Kalender einen Tag aus.</p>';
    return;
  }
  const sh = _calShows.filter((s) => s.date === key);
  const bk = _bookingsCache.filter((b) => b.event_date === key);
  const bl = calBlockedAt(key);

  let html = `<h3 class="font-display text-lg mb-3">${escapeText(calPretty(key))}</h3>`;

  html += '<p class="text-xs uppercase tracking-wide text-paper-dim mb-1">Auftritte</p>';
  html += sh.length
    ? '<ul class="acal-list">' + sh.map((s) => `<li>${escapeText(s.venue || "Auftritt")}${s.city ? `, ${escapeText(s.city)}` : ""}${s.type ? ` <span class="badge badge-type">${escapeText(s.type)}</span>` : ""}</li>`).join("") + "</ul>"
    : '<p class="text-paper-dim text-sm mb-3">Kein Auftritt.</p>';

  html += '<p class="text-xs uppercase tracking-wide text-paper-dim mb-1 mt-4">Buchungsanfragen</p>';
  html += bk.length
    ? '<ul class="acal-list">' + bk.map((b) => `<li>${escapeText(b.from_name || "—")} <span class="badge badge-type">${escapeText(BOOKING_STATUS_LABELS[b.status || "neu"] || b.status)}</span></li>`).join("") + "</ul>"
    : '<p class="text-paper-dim text-sm mb-3">Keine Anfrage für diesen Tag.</p>';

  html += '<p class="text-xs uppercase tracking-wide text-paper-dim mb-1 mt-4">Sperre</p>';
  if (bl.length) {
    html += '<ul class="acal-list">' + bl.map((r) => {
      const range = r.from === r.to ? calShort(r.from) : `${calShort(r.from)} – ${calShort(r.to)}`;
      const reason = _calNotes[r.id];
      return `<li>${escapeText(range)}${reason ? `<br /><span class="text-paper-dim">${escapeText(reason)}</span>` : ""}</li>`;
    }).join("") + "</ul>";
    html += '<button type="button" class="btn-admin-approve mt-3" data-act="unblock-day">Diesen Tag freigeben</button>';
  } else {
    html += sh.length
      ? '<p class="text-paper-dim text-sm mb-3">Für Besucher ist der Tag durch den Auftritt ohnehin nicht buchbar.</p>'
      : '<p class="text-paper-dim text-sm mb-3">Der Tag ist frei und im Buchungsformular wählbar.</p>';
    html += '<button type="button" class="btn-admin-delete mt-1" data-act="block-day">Diesen Tag sperren</button>';
  }
  el.innerHTML = html;
}

/* Zieht den Zeitraum [from, to] von allen bestehenden Sperren ab. Liegt er mitten
   in einer Sperre, wird diese in zwei Teile geteilt (Notiz wird mitkopiert). */
async function calUnblockRange(from, to, onlyId) {
  const ops = [];
  _calBlocked.forEach((r) => {
    if (onlyId && r.id !== onlyId) return; // optional: nur diese eine Sperre betreffen
    if (r.to < from || r.from > to) return;
    const pieces = [];
    if (r.from < from) pieces.push({ from: r.from, to: calIso(calAddDays(calFromIso(from), -1)) });
    if (r.to > to) pieces.push({ from: calIso(calAddDays(calFromIso(to), 1)), to: r.to });
    const note = _calNotes[r.id] || "";
    const ref = fbDb.collection("blocked").doc(r.id);
    if (pieces.length === 0) {
      ops.push(ref.delete());
      ops.push(fbDb.collection("blockedNotes").doc(r.id).delete());
    } else {
      ops.push(ref.update(pieces[0]));
      pieces.slice(1).forEach((extra) => {
        const nref = fbDb.collection("blocked").doc();
        ops.push(
          nref
            .set({ ...extra, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
            .then(() => (note ? fbDb.collection("blockedNotes").doc(nref.id).set({ reason: note }) : null))
        );
      });
    }
  });
  await Promise.all(ops);
}

async function calBlockRange(from, to, reason) {
  await calUnblockRange(from, to); // keine überlappenden Sperren entstehen lassen
  const ref = fbDb.collection("blocked").doc();
  await ref.set({ from, to, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  if (reason) await fbDb.collection("blockedNotes").doc(ref.id).set({ reason });
  return ref.id;
}

function calReport(err) {
  console.error(err);
  alert("Das hat nicht geklappt. Bitte erneut versuchen.");
}

let _calEventsBound = false;
function bindCalendarEvents() {
  if (_calEventsBound) return;
  _calEventsBound = true;
  const shiftMonth = (n) => {
    _calViewDate = new Date(_calViewDate.getFullYear(), _calViewDate.getMonth() + n, 1);
    renderAdminCalendar();
  };
  document.getElementById("acal-prev")?.addEventListener("click", () => shiftMonth(-1));
  document.getElementById("acal-next")?.addEventListener("click", () => shiftMonth(1));
  document.getElementById("acal-today")?.addEventListener("click", () => {
    const now = new Date();
    _calViewDate = new Date(now.getFullYear(), now.getMonth(), 1);
    _calSelected = calIso(now);
    renderAdminCalendar();
  });

  document.getElementById("acal-grid")?.addEventListener("click", (e) => {
    const week = e.target.closest(".acal-week");
    if (week) {
      const start = week.dataset.week;
      const end = calIso(calAddDays(calFromIso(start), 6));
      const days = Array.from({ length: 7 }, (_, i) => calIso(calAddDays(calFromIso(start), i)));
      const allBlocked = days.every((k) => calBlockedAt(k).length > 0);
      const reason = (document.getElementById("acal-reason")?.value || "").trim();
      (allBlocked ? calUnblockRange(start, end) : calBlockRange(start, end, reason)).catch(calReport);
      return;
    }
    const day = e.target.closest(".acal-day");
    if (day) {
      _calSelected = day.dataset.date;
      renderAdminCalendar();
    }
  });

  document.getElementById("acal-day-panel")?.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act || !_calSelected) return;
    if (act === "block-day") {
      const reasonInput = document.getElementById("acal-reason");
      calBlockRange(_calSelected, _calSelected, (reasonInput?.value || "").trim())
        .then(() => { if (reasonInput) reasonInput.value = ""; })
        .catch(calReport);
    } else if (act === "unblock-day") {
      calUnblockRange(_calSelected, _calSelected).catch(calReport);
    }
  });

  document.getElementById("block-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const from = document.getElementById("block-from-input").value;
    const to = document.getElementById("block-to-input").value;
    const reason = document.getElementById("block-reason-input").value.trim();
    if (!from || !to) {
      alert("Bitte „Von“ und „Bis“ ausfüllen.");
      return;
    }
    if (to < from) {
      alert("„Bis“ darf nicht vor „Von“ liegen.");
      return;
    }
    calBlockRange(from, to, reason)
      .then(() => {
        ["block-from-input", "block-to-input", "block-reason-input"].forEach((id) => (document.getElementById(id).value = ""));
        const f = calFromIso(from);
        _calViewDate = new Date(f.getFullYear(), f.getMonth(), 1);
        _calSelected = from;
        renderAdminCalendar();
      })
      .catch(calReport);
  });
}

function renderBlockedList() {
  const container = document.getElementById("blocked-list");
  if (!container) return;
  if (_calBlocked.length === 0) {
    container.innerHTML = emptyStateHtml("Keine Sperren eingetragen — alle Tage ohne Auftritt sind buchbar.");
    return;
  }
  container.innerHTML = "";
  _calBlocked.forEach((r) => container.appendChild(buildBlockedRow(r)));
}

function buildBlockedRow(r) {
  const row = document.createElement("article");
  row.className = "admin-card rounded-md p-4";
  const todayIso = calIso(new Date());
  const days = Math.round((calFromIso(r.to) - calFromIso(r.from)) / 86400000) + 1;
  renderView();
  return row;

  function renderView() {
    const range = r.from === r.to ? calPretty(r.from) : `${calShort(r.from)} – ${calShort(r.to)}`;
    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-0.5">
            <p class="font-medium range-text"></p>
            <span class="badge badge-type">${days} Tag${days > 1 ? "e" : ""}</span>
            ${r.to < todayIso ? '<span class="badge badge-type">Vergangen</span>' : ""}
          </div>
          <p class="text-xs text-paper-dim reason-text"></p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button type="button" class="btn-admin-approve" data-edit>Bearbeiten</button>
          ${DELETE_BUTTON_HTML}
        </div>
      </div>`;
    row.querySelector(".range-text").textContent = range;
    row.querySelector(".reason-text").textContent = _calNotes[r.id] ? `Grund (intern): ${_calNotes[r.id]}` : "Kein Grund hinterlegt";
    row.querySelector("[data-edit]").addEventListener("click", renderEdit);
    row.querySelector("[data-delete]").addEventListener("click", () => {
      if (!confirm("Diese Sperre wirklich löschen? Die Tage sind danach wieder buchbar.")) return;
      Promise.all([fbDb.collection("blocked").doc(r.id).delete(), fbDb.collection("blockedNotes").doc(r.id).delete()]).catch(calReport);
    });
  }

  function renderEdit() {
    row.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
        <input type="date" class="edit-from w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" value="${escapeAttr(r.from)}" />
        <input type="date" class="edit-to w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" value="${escapeAttr(r.to)}" />
        <input type="text" class="edit-reason sm:col-span-2 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Grund (intern)" value="${escapeAttr(_calNotes[r.id] || "")}" />
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-admin-approve" data-save>Speichern</button>
        <button type="button" class="btn-admin-delete" data-cancel>Abbrechen</button>
      </div>`;
    row.querySelector("[data-cancel]").addEventListener("click", renderView);
    row.querySelector("[data-save]").addEventListener("click", () => {
      const from = row.querySelector(".edit-from").value;
      const to = row.querySelector(".edit-to").value;
      const reason = row.querySelector(".edit-reason").value.trim();
      if (!from || !to || to < from) {
        alert("Bitte einen gültigen Zeitraum angeben („Bis“ nicht vor „Von“).");
        return;
      }
      const noteRef = fbDb.collection("blockedNotes").doc(r.id);
      Promise.all([fbDb.collection("blocked").doc(r.id).update({ from, to }), reason ? noteRef.set({ reason }) : noteRef.delete()]).catch(calReport);
    });
  }
}

/* --------------------------------------------------------------------------
   EINSTELLUNGEN (Impressum, Links, Texte) + DATENSICHERUNG
   -------------------------------------------------------------------------- */
let _siteSettings = {};
/* Standardwerte = die Texte/Links, die fest in index.html bzw. main.js stehen.
   Das Formular zeigt sie vollständig an, solange noch nichts anderes
   gespeichert ist. Ändert ihr einen Standardtext im Code, hier mit anpassen. */
const SETTINGS_DEFAULTS = {
  heroClaim: "Rock · Blues · Country — sechs Musiker, eine Bühne",
  heroText:
    "Niemand weiß, welcher Song als Nächstes kommt — aber jeder weiß, dass die Bühne danach nicht mehr dieselbe ist. Who Knows? aus Brandoberndorf bringt Rock, Blues und Country mit Wucht auf jede Bühne.",
  bandIntro: "Sechs Persönlichkeiten, ein Sound. Jede Show lebt vom Zusammenspiel — hier sind die Köpfe dahinter.",
  instagramUrl: "https://www.instagram.com/who_knows_coverband?mdxt=YWJtbGY0MHRkeHkW",
  contactEmail: "info@who-knows-coverband.de",
  bookingToShow: "auto",
};

/* Textfelder wachsen mit ihrem Inhalt, damit der ganze Text sichtbar ist
   (nichts abgeschnitten, kein Scrollen im Feld). */
function autoGrow(el) {
  if (!el || el.offsetParent === null) return; // ausgeblendet -> Höhe unbekannt
  el.style.overflow = "hidden";
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}
function autoGrowSettings() {
  document.querySelectorAll("#settings-form textarea").forEach(autoGrow);
}

const SETTINGS_FIELDS = {
  "set-booking-to-show": "bookingToShow",
  "set-owner-name": "ownerName",
  "set-owner-street": "ownerStreet",
  "set-owner-city": "ownerCity",
  "set-contact-email": "contactEmail",
  "set-instagram": "instagramUrl",
  "set-hero-claim": "heroClaim",
  "set-hero-text": "heroText",
  "set-band-intro": "bandIntro",
};

function loadSettingsAdmin() {
  if (!document.getElementById("settings-form")) return;
  fbDb
    .collection("settings")
    .doc("site")
    .get()
    .then((doc) => {
      _siteSettings = doc.exists ? doc.data() : {};
      Object.entries(SETTINGS_FIELDS).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.value = _siteSettings[key] || SETTINGS_DEFAULTS[key] || "";
      });
      autoGrowSettings();
      renderSetupCheck();
    })
    .catch((err) => console.error(err));
}

function renderSetupCheck() {
  const s = _siteSettings;
  const items = [
    ["Name der verantwortlichen Person (Impressum)", !!s.ownerName],
    ["Straße und Hausnummer (Impressum)", !!s.ownerStreet],
    ["PLZ und Ort (Impressum)", !!s.ownerCity],
    ["Instagram-Link hinterlegt", !!(s.instagramUrl || SETTINGS_DEFAULTS.instagramUrl)],
  ];
  const box = document.getElementById("setup-check");
  if (box) {
    box.innerHTML =
      '<strong class="text-paper">Einrichtungs-Check</strong><ul class="acal-list">' +
      items.map(([label, ok]) => `<li>${ok ? "&#10003;" : "&#10007;"} ${label}</li>`).join("") +
      "</ul>";
  }
  const legalMissing = !s.ownerName || !s.ownerStreet || !s.ownerCity;
  document.getElementById("setup-banner")?.classList.toggle("hidden", !legalMissing);
}

function initSettingsForm() {
  const form = document.getElementById("settings-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  form.querySelectorAll("textarea").forEach((t) => t.addEventListener("input", () => autoGrow(t)));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {};
    Object.entries(SETTINGS_FIELDS).forEach(([id, key]) => {
      data[key] = (document.getElementById(id)?.value || "").trim();
    });
    if (data.instagramUrl && !/^https:\/\//i.test(data.instagramUrl)) {
      alert("Der Instagram-Link muss mit https:// beginnen.");
      return;
    }
    const statusEl = document.getElementById("settings-status");
    fbDb
      .collection("settings")
      .doc("site")
      .set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
      .then(() => {
        _siteSettings = { ..._siteSettings, ...data };
        renderSetupCheck();
        if (statusEl) {
          statusEl.textContent = "Gespeichert ✓ — die Änderungen sind sofort auf der Startseite sichtbar.";
          setTimeout(() => (statusEl.textContent = ""), 5000);
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/* --------------------------------------------------------------------------
   DATENSICHERUNG: HERUNTERLADEN + EINSPIELEN (eigener Menüpunkt)
   --------------------------------------------------------------------------
   Herunterladen: alle Inhalte als eine JSON-Datei (Format-Version 2). Firebase
   legt im Gratis-Tarif keine automatischen Backups an — deshalb regelmäßig
   (z. B. monatlich) sichern und die Datei sicher aufbewahren.

   Einspielen: liest eine solche Datei, zeigt vorab, was darin steckt, und
   schreibt die gewählten Bereiche zurück. Es wird NICHTS gelöscht; Einträge mit
   derselben Kennung werden durch die Version aus der Datei ersetzt, fehlende
   Einträge werden neu angelegt. Zeitstempel werden wieder echte Zeitstempel.
   Nicht enthalten: Admin-Konten/Passwörter (liegen bei Firebase
   Authentication), die Firestore-Regeln sowie Fotos, MP3s und der Seitencode.
   -------------------------------------------------------------------------- */
const BACKUP_COLLECTIONS = ["bookings", "reviews", "shows", "venues", "songs", "gallery", "videos", "band", "faq", "setlists", "repertoire", "blocked", "blockedNotes", "settings", "stats"];
const BACKUP_LABELS = {
  bookings: "Buchungsanfragen",
  reviews: "Bewertungen",
  shows: "Termine",
  venues: "Auftrittsorte",
  songs: "Playlist",
  gallery: "Galerie",
  videos: "Videos",
  band: "Band",
  faq: "Häufige Fragen (FAQ)",
  setlists: "Setlisten",
  repertoire: "Repertoire (Setlisten)",
  blocked: "Gesperrte Tage",
  blockedNotes: "Sperrgründe (intern)",
  settings: "Einstellungen & Banner",
  stats: "Statistik (Zähler)",
};
const BACKUP_FORMAT_VERSION = 2;

/* Zeitstempel werden mit einer Markierung gesichert, damit sie beim
   Einspielen eindeutig wieder zu Zeitstempeln werden (und nicht mit normalen
   Texten verwechselt werden). */
function backupValue(v) {
  if (v && typeof v.toDate === "function") return { __timestamp: v.toDate().toISOString() };
  if (Array.isArray(v)) return v.map(backupValue);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, backupValue(x)]));
  return v;
}

async function collectBackup() {
  const out = { app: "who-knows-website", version: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(), collections: {} };
  for (const name of BACKUP_COLLECTIONS) {
    const snap = await fbDb.collection(name).get();
    out.collections[name] = snap.docs.map((d) => ({ id: d.id, data: backupValue(d.data()) }));
  }
  return out;
}

function downloadJsonFile(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Liest den Dateiinhalt und prüft ihn streng — die Datei kommt von außen und
   wird deshalb nie blind übernommen: nur bekannte Bereiche, gültige Kennungen,
   nur Objekte als Inhalte. */
function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { error: "Die Datei ist keine gültige Sicherung (kein lesbares JSON)." };
  }
  if (!raw || typeof raw !== "object" || !raw.collections || typeof raw.collections !== "object" || Array.isArray(raw.collections)) {
    return { error: "Das ist keine Sicherungsdatei dieser Seite (der Bereich „collections“ fehlt)." };
  }
  const legacy = !(raw.version >= 2); // Version 1: Zeitstempel als reine ISO-Texte, Felder direkt neben "id"
  const collections = {};
  const ignored = [];
  let skipped = 0;

  Object.entries(raw.collections).forEach(([name, list]) => {
    if (!BACKUP_COLLECTIONS.includes(name)) {
      ignored.push(name);
      return;
    }
    if (!Array.isArray(list)) {
      skipped += 1;
      return;
    }
    const docs = [];
    list.forEach((entry) => {
      const idOk = entry && typeof entry.id === "string" && /^[^/]{1,200}$/.test(entry.id) && entry.id !== "." && entry.id !== ".." && !/^__.*__$/.test(entry.id);
      if (!idOk) {
        skipped += 1;
        return;
      }
      let data;
      if (legacy) {
        const { id, ...rest } = entry;
        data = rest;
      } else {
        data = entry.data;
      }
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        skipped += 1;
        return;
      }
      docs.push({ id: entry.id, data });
    });
    collections[name] = docs;
  });

  const total = Object.values(collections).reduce((n, list) => n + list.length, 0);
  if (total === 0) return { error: "In der Datei sind keine einspielbaren Einträge enthalten." };
  return { collections, ignored, skipped, legacy, total, exportedAt: raw.exportedAt || "" };
}

/* Macht aus den gesicherten Werten wieder echte Datenbank-Werte. */
function reviveValue(v, legacy) {
  if (Array.isArray(v)) return v.map((x) => reviveValue(x, legacy));
  if (v && typeof v === "object") {
    if (Object.keys(v).length === 1 && typeof v.__timestamp === "string") {
      const d = new Date(v.__timestamp);
      if (!Number.isNaN(d.getTime())) return firebase.firestore.Timestamp.fromDate(d);
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, reviveValue(x, legacy)]));
  }
  // Alte Sicherungen (Version 1): Zeitstempel waren reine ISO-Texte
  if (legacy && typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return firebase.firestore.Timestamp.fromDate(d);
  }
  return v;
}

let _restoreParsed = null;

function renderRestoreSummary(fileName, parsed) {
  const box = document.getElementById("restore-summary");
  if (!box) return;
  const when = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString("de-DE") : "unbekannt";
  const rows = BACKUP_COLLECTIONS.filter((n) => parsed.collections[n] && parsed.collections[n].length)
    .map((name) => {
      // Zähler wären sonst "veraltet" und würden neuere Stände überschreiben -> standardmäßig NICHT angehakt
      const checked = name === "stats" ? "" : " checked";
      const hint = name === "stats" ? ' <span class="text-xs text-paper-dim">(überschreibt neuere Zählerstände)</span>' : "";
      return `<label class="restore-row"><input type="checkbox" class="restore-check" value="${name}"${checked} /> <span>${escapeText(BACKUP_LABELS[name])}${hint}</span> <span class="badge badge-type">${parsed.collections[name].length}</span></label>`;
    })
    .join("");
  const notes = [];
  if (parsed.ignored.length) notes.push(`Nicht einspielbar (unbekannter Bereich): ${escapeText(parsed.ignored.join(", "))}`);
  if (parsed.skipped) notes.push(`${parsed.skipped} ungültige Einträge werden übersprungen.`);
  if (parsed.legacy) notes.push("Ältere Sicherung (Version 1) — wird automatisch umgewandelt.");
  box.innerHTML = `
    <div class="admin-card rounded-md p-4">
      <p class="text-sm mb-1"><strong>${escapeText(fileName)}</strong></p>
      <p class="text-xs text-paper-dim mb-3">Gesichert am ${escapeText(when)} · ${parsed.total} Einträge insgesamt</p>
      <div class="restore-list">${rows}</div>
      ${notes.length ? `<p class="text-xs text-paper-dim mt-3">${notes.join("<br />")}</p>` : ""}
    </div>`;
}

async function runRestore() {
  if (!_restoreParsed) return;
  const btn = document.getElementById("restore-btn");
  const statusEl = document.getElementById("restore-status");
  const resultEl = document.getElementById("restore-result");
  const selected = [...document.querySelectorAll("#restore-summary .restore-check:checked")].map((c) => c.value);
  if (!selected.length) {
    alert("Bitte mindestens einen Bereich zum Einspielen auswählen.");
    return;
  }
  const lines = selected.map((n) => `• ${BACKUP_LABELS[n]}: ${_restoreParsed.collections[n].length}`).join("\n");
  if (
    !confirm(
      `Sicherung einspielen?\n\n${lines}\n\nEinträge mit derselben Kennung werden durch die Version aus der Datei ersetzt (neuere Änderungen daran gehen verloren). Es wird nichts gelöscht.`
    )
  ) {
    return;
  }

  btn.disabled = true;
  resultEl.innerHTML = "";
  try {
    if (document.getElementById("restore-safety")?.checked) {
      statusEl.textContent = "Sichere zuerst den aktuellen Stand …";
      downloadJsonFile(await collectBackup(), `who-knows-backup-vor-wiederherstellung-${calIso(new Date())}.json`);
    }
  } catch (err) {
    console.error(err);
    if (!confirm("Die Sicherung des aktuellen Stands ist fehlgeschlagen. Trotzdem einspielen?")) {
      btn.disabled = false;
      statusEl.textContent = "";
      return;
    }
  }

  const results = [];
  for (const name of selected) {
    const docs = _restoreParsed.collections[name];
    statusEl.textContent = `Spiele ein: ${BACKUP_LABELS[name]} …`;
    let done = 0;
    try {
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = fbDb.batch();
        chunk.forEach(({ id, data }) => batch.set(fbDb.collection(name).doc(id), reviveValue(data, _restoreParsed.legacy)));
        await batch.commit();
        done += chunk.length;
      }
      results.push({ name, ok: true, count: done });
    } catch (err) {
      console.error(err);
      results.push({ name, ok: false, count: done, denied: err && err.code === "permission-denied" });
    }
  }

  resultEl.innerHTML =
    '<div class="admin-card rounded-md p-4"><ul class="acal-list">' +
    results
      .map((r) =>
        r.ok
          ? `<li>&#10003; ${escapeText(BACKUP_LABELS[r.name])}: ${r.count} eingespielt</li>`
          : `<li class="text-rust-light">&#10007; ${escapeText(BACKUP_LABELS[r.name])}: nicht (vollständig) eingespielt${
              r.denied ? " — Berechtigung fehlt. Bitte die aktuellen Firestore-Regeln aus der README (Abschnitt 9.3) in der Firebase Console veröffentlichen." : "."
            }</li>`
      )
      .join("") +
    "</ul></div>";
  const failed = results.filter((r) => !r.ok).length;
  statusEl.textContent = failed ? `Fertig — bei ${failed} Bereich(en) gab es Probleme.` : "Fertig — alles eingespielt ✓";
  btn.disabled = false;

  // Seiten, die ihre Werte nur einmal laden, aktualisieren
  if (selected.includes("settings")) {
    loadSettingsAdmin();
    loadAnnouncementAdmin();
  }
}

function initBackupSection() {
  const dlBtn = document.getElementById("backup-btn");
  if (dlBtn && !dlBtn.dataset.bound) {
    dlBtn.dataset.bound = "1";
    const statusEl = document.getElementById("backup-status");
    dlBtn.addEventListener("click", async () => {
      dlBtn.disabled = true;
      if (statusEl) statusEl.textContent = "Daten werden gesammelt …";
      try {
        const out = await collectBackup();
        const total = Object.values(out.collections).reduce((n, list) => n + list.length, 0);
        downloadJsonFile(out, `who-knows-backup-${calIso(new Date())}.json`);
        if (statusEl) statusEl.textContent = `Fertig — ${total} Einträge gesichert.`;
      } catch (err) {
        console.error(err);
        if (statusEl) statusEl.textContent = "Die Sicherung hat nicht geklappt. Bitte erneut versuchen.";
      }
      dlBtn.disabled = false;
    });
  }

  const fileInput = document.getElementById("restore-file");
  const restoreBtn = document.getElementById("restore-btn");
  if (fileInput && !fileInput.dataset.bound) {
    fileInput.dataset.bound = "1";
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      const summary = document.getElementById("restore-summary");
      document.getElementById("restore-result").innerHTML = "";
      document.getElementById("restore-status").textContent = "";
      _restoreParsed = null;
      restoreBtn.disabled = true;
      if (!file) {
        summary.innerHTML = "";
        return;
      }
      const parsed = parseBackup(await file.text());
      if (parsed.error) {
        summary.innerHTML = `<p class="text-rust-light text-sm">${escapeText(parsed.error)}</p>`;
        return;
      }
      _restoreParsed = parsed;
      renderRestoreSummary(file.name, parsed);
      restoreBtn.disabled = false;
    });
    restoreBtn.addEventListener("click", runRestore);
  }
}

/* --------------------------------------------------------------------------
   VERLAUF DER LETZTEN 30 TAGE (Übersicht)
   -------------------------------------------------------------------------- */
function loadDailyStats() {
  if (!document.getElementById("stats-chart")) return;
  fbDb.collection("stats").onSnapshot(
    (snap) => {
      const byDay = {};
      snap.docs.forEach((d) => {
        if (d.id.startsWith("day-")) byDay[d.id.slice(4)] = d.data();
      });
      renderDailyStats(byDay);
    },
    (err) => console.error(err)
  );
}

function renderDailyStats(byDay) {
  const chart = document.getElementById("stats-chart");
  const tiles = document.getElementById("stats-summary");
  if (!chart || !tiles) return;

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const key = calIso(calAddDays(new Date(), -i));
    const s = byDay[key] || {};
    days.push({ key, views: s.views || 0, bookingOpen: s.bookingOpen || 0, instagram: s.instagram || 0 });
  }
  const sum = (list, field) => list.reduce((n, d) => n + d[field], 0);
  const summary = [
    ["Aufrufe (7 Tage)", sum(days.slice(-7), "views")],
    ["Aufrufe (30 Tage)", sum(days, "views")],
    ["Buchungsfenster geöffnet (30 Tage)", sum(days, "bookingOpen")],
    ["Instagram-Klicks (30 Tage)", sum(days, "instagram")],
  ];
  tiles.innerHTML = summary
    .map(([label, value]) => `<div class="admin-card rounded-md p-4"><p class="text-xs text-paper-dim mb-1">${label}</p><p class="font-display text-2xl text-gold">${value.toLocaleString("de-DE")}</p></div>`)
    .join("");

  const max = Math.max(1, ...days.map((d) => d.views));
  chart.innerHTML =
    '<div class="stats-bars">' +
    days
      .map((d) => `<span class="stats-bar${d.views === 0 ? " is-empty" : ""}" style="height:${Math.max(3, Math.round((d.views / max) * 100))}%" title="${escapeAttr(calShort(d.key))}: ${d.views} Aufrufe"></span>`)
      .join("") +
    '</div><div class="stats-axis"><span>' + escapeText(calShort(days[0].key)) + "</span><span>heute</span></div>";
}

/* --------------------------------------------------------------------------
   FAQ (Häufige Fragen auf der Startseite)
   -------------------------------------------------------------------------- */
function loadFaqAdmin() {
  const container = document.getElementById("faq-admin-list");
  if (!container) return;
  fbDb.collection("faq").onSnapshot(
    (snapshot) => {
      if (snapshot.empty) {
        container.innerHTML = emptyStateHtml("Noch keine Fragen — der FAQ-Bereich bleibt auf der Startseite so lange ausgeblendet.");
        return;
      }
      const docs = snapshot.docs.slice().sort((a, b) => {
        const diff = bandOrderValue(a.data()) - bandOrderValue(b.data());
        if (diff !== 0) return diff;
        const ta = a.data().createdAt && a.data().createdAt.toMillis ? a.data().createdAt.toMillis() : 0;
        const tb = b.data().createdAt && b.data().createdAt.toMillis ? b.data().createdAt.toMillis() : 0;
        return ta - tb;
      });
      container.innerHTML = "";
      docs.forEach((doc) => container.appendChild(buildFaqRow(doc)));
    },
    (err) => {
      console.error(err);
      container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
    }
  );
}

function buildFaqRow(doc) {
  const f = doc.data();
  const row = document.createElement("article");
  row.className = "admin-card rounded-md p-4";
  renderView();
  return row;

  function renderView() {
    row.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-0.5">
            <p class="font-medium q-text"></p>
            <span class="badge badge-type order-text"></span>
          </div>
          <p class="text-xs text-paper-dim a-text"></p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button type="button" class="btn-admin-approve" data-edit>Bearbeiten</button>
          ${DELETE_BUTTON_HTML}
        </div>
      </div>`;
    row.querySelector(".q-text").textContent = f.question || "—";
    row.querySelector(".a-text").textContent = (f.answer || "").length > 140 ? f.answer.slice(0, 140) + " …" : f.answer || "";
    row.querySelector(".order-text").textContent = f.order === null || f.order === undefined || f.order === "" ? "ohne Nr." : `Nr. ${f.order}`;
    row.querySelector("[data-edit]").addEventListener("click", renderEdit);
    row.querySelector("[data-delete]").addEventListener("click", () => {
      if (confirm("Diese Frage wirklich löschen?")) doc.ref.delete().catch((err) => console.error(err));
    });
  }

  function renderEdit() {
    row.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
        <input type="text" class="edit-q sm:col-span-3 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Frage" value="${escapeAttr(f.question || "")}" />
        <input type="number" min="1" class="edit-order w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" placeholder="Reihenfolge" value="${escapeAttr(f.order === null || f.order === undefined ? "" : f.order)}" />
        <textarea class="edit-a sm:col-span-4 w-full rounded-sm px-3 py-2 text-sm bg-ink-2 border border-white/10 text-paper" rows="4" placeholder="Antwort"></textarea>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-admin-approve" data-save>Speichern</button>
        <button type="button" class="btn-admin-delete" data-cancel>Abbrechen</button>
      </div>`;
    row.querySelector(".edit-a").value = f.answer || "";
    row.querySelector("[data-cancel]").addEventListener("click", renderView);
    row.querySelector("[data-save]").addEventListener("click", () => {
      const question = row.querySelector(".edit-q").value.trim();
      const answer = row.querySelector(".edit-a").value.trim();
      if (!question || !answer) {
        alert("Bitte Frage und Antwort ausfüllen.");
        return;
      }
      const orderRaw = row.querySelector(".edit-order").value.trim();
      doc.ref
        .update({ question, answer, order: orderRaw === "" ? null : Number(orderRaw) })
        .catch((err) => {
          console.error(err);
          alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
        });
    });
  }
}

function initFaqForm() {
  const form = document.getElementById("faq-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const qInput = document.getElementById("faq-question-input");
    const aInput = document.getElementById("faq-answer-input");
    const oInput = document.getElementById("faq-order-input");
    const question = qInput.value.trim();
    const answer = aInput.value.trim();
    if (!question || !answer) {
      alert("Bitte Frage und Antwort ausfüllen.");
      return;
    }
    const orderRaw = oInput.value.trim();
    fbDb
      .collection("faq")
      .add({ question, answer, order: orderRaw === "" ? null : Number(orderRaw), createdAt: firebase.firestore.FieldValue.serverTimestamp() })
      .then(() => {
        [qInput, aInput, oInput].forEach((el) => (el.value = ""));
      })
      .catch((err) => {
        console.error(err);
        alert("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
      });
  });
}

/* --------------------------------------------------------------------------
   BENACHRICHTIGUNGEN BEI NEUEN ANFRAGEN
   --------------------------------------------------------------------------
   Solange der Admin-Bereich in einem Browser-Tab geöffnet ist (auch im
   Hintergrund), meldet er neue Anfragen: Zahl im Tab-Titel, Hinweis im
   Fenster, auf Wunsch ein leiser Signalton und eine Browser-Benachrichtigung.
   Bei geschlossener Seite oder aufs Handy ist das NICHT möglich — dafür bräuchte
   es einen Server, der Mitteilungen verschickt (bezahlter Firebase-Tarif).
   Die Einstellung "Signalton" wird nur in diesem Browser gemerkt.
   -------------------------------------------------------------------------- */
const ADMIN_BASE_TITLE = document.title;
const NOTIFY_SOUND_KEY = "wk_admin_sound";
let _knownBookingIds = null;
let _audioCtx = null;
const plural = (n, one, many) => (n === 1 ? one : many);

function updateTabTitle(count) {
  document.title = count > 0 ? `(${count}) ${ADMIN_BASE_TITLE}` : ADMIN_BASE_TITLE;
}

function soundEnabled() {
  try {
    return localStorage.getItem(NOTIFY_SOUND_KEY) !== "0";
  } catch (e) {
    return true;
  }
}

/* Zwei kurze, leise Töne — erzeugt im Browser, ganz ohne Audiodatei. */
function playAlertSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    _audioCtx = _audioCtx || new Ctx();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    const t = _audioCtx.currentTime;
    [[880, 0], [1175, 0.16]].forEach(([freq, delay]) => {
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.12, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.22);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.25);
    });
  } catch (e) {
    /* Browser erlaubt (noch) keinen Ton — dann bleibt es stumm */
  }
}

function showAdminToast(text, onClick) {
  let el = document.getElementById("admin-toast");
  if (!el) {
    el = document.createElement("button");
    el.type = "button";
    el.id = "admin-toast";
    el.className = "admin-toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.onclick = () => {
    el.classList.remove("is-visible");
    if (onClick) onClick();
  };
  el.classList.add("is-visible");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("is-visible"), 9000);
}

const recentOrPending = (ts) => !ts || !ts.toMillis || Date.now() - ts.toMillis() < 30 * 60 * 1000;

/* Erkennt Anfragen, die seit dem letzten Stand NEU dazugekommen sind. Die erste
   Lieferung beim Öffnen zählt nicht (sonst würde jedes Öffnen piepen). */
function handleNewBookings(docs) {
  const ids = new Set(docs.map((d) => d.id));
  if (_knownBookingIds === null) {
    _knownBookingIds = ids;
    return;
  }
  const fresh = docs.filter((d) => !_knownBookingIds.has(d.id) && (d.data().status || "neu") === "neu" && recentOrPending(d.data().createdAt));
  _knownBookingIds = ids;
  if (!fresh.length) return;

  const first = fresh[0].data();
  const text =
    fresh.length === 1
      ? `Neue Anfrage von ${first.from_name || "—"}${first.event_date ? ` · ${calShort(first.event_date)}` : ""}`
      : `${fresh.length} neue Anfragen`;
  if (soundEnabled()) playAlertSound();
  showAdminToast(text, () => goToBookings("neu"));
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification("Neue Buchungsanfrage", { body: text, tag: "wk-booking" });
      n.onclick = () => {
        window.focus();
        goToBookings("neu");
        n.close();
      };
    } catch (e) {
      /* manche Browser erlauben das nur über Service Worker — dann bleibt es beim Hinweis im Fenster */
    }
  }
}

function goToBookings(filter) {
  _bookingFilter = filter || "alle";
  document.querySelector('.admin-nav-item[data-view="buchungen"]')?.click();
  renderBookingFilters();
  applySearchFilter("bookings-search", "bookings-list");
}

function initNotifySettings() {
  const sound = document.getElementById("notify-sound");
  if (!sound || sound.dataset.bound) return;
  sound.dataset.bound = "1";
  sound.checked = soundEnabled();
  sound.addEventListener("change", () => {
    try {
      localStorage.setItem(NOTIFY_SOUND_KEY, sound.checked ? "1" : "0");
    } catch (e) {
      /* ohne Speicher gilt die Einstellung nur bis zum Neuladen */
    }
  });

  const btn = document.getElementById("notify-desktop-btn");
  const statusEl = document.getElementById("notify-status");
  const refresh = () => {
    if (!("Notification" in window)) {
      btn.disabled = true;
      btn.textContent = "Von diesem Browser nicht unterstützt";
    } else if (Notification.permission === "granted") {
      btn.disabled = true;
      btn.textContent = "Browser-Benachrichtigungen sind aktiv ✓";
    } else if (Notification.permission === "denied") {
      btn.disabled = true;
      btn.textContent = "Im Browser blockiert";
      statusEl.textContent = "Bitte in den Seiteneinstellungen des Browsers erlauben.";
    } else {
      btn.disabled = false;
      btn.textContent = "Browser-Benachrichtigungen aktivieren";
    }
  };
  btn.addEventListener("click", async () => {
    try {
      await Notification.requestPermission();
    } catch (e) {
      /* ignorieren */
    }
    refresh();
  });
  document.getElementById("notify-test-btn")?.addEventListener("click", () => {
    playAlertSound();
    showAdminToast("So meldet sich eine neue Anfrage.");
  });
  refresh();
}

/* --------------------------------------------------------------------------
   ÜBERFÄLLIG / BEANTWORTET
   --------------------------------------------------------------------------
   "Unbeantwortet" heißt: Status Neu oder In Bearbeitung und noch keine Antwort
   vermerkt. Eine Antwort wird vermerkt, sobald ihr in der Anfrage auf
   "Zusage / Absage / Rückfrage" klickt oder sie von Hand als beantwortet
   markiert (z. B. nach einem Telefonat).
   -------------------------------------------------------------------------- */
const OVERDUE_DAYS = 3;
const REPLY_LABELS = { zusage: "Zusage", absage: "Absage", rueckfrage: "Rückfrage", manuell: "von Hand markiert" };

function bookingAgeDays(b) {
  const ms = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : null;
  return ms === null ? 0 : Math.floor((Date.now() - ms) / 86400000);
}
function isOverdueBooking(b) {
  const s = b.status || "neu";
  return (s === "neu" || s === "bearbeitung") && !b.repliedAt && bookingAgeDays(b) >= OVERDUE_DAYS;
}

/* --------------------------------------------------------------------------
   "HEUTE ZU TUN" (Übersicht)
   -------------------------------------------------------------------------- */
let _pendingReviewCount = 0;

function nextShowFromCache() {
  const today = calIso(new Date());
  return _calShows.filter((s) => s.date && s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}
const daysUntil = (iso) => Math.round((calFromIso(iso) - calFromIso(calIso(new Date()))) / 86400000);

function renderTodayList() {
  const box = document.getElementById("today-list");
  if (!box) return;
  const nameList = (list) => list.slice(0, 3).map((b) => b.from_name || "—").join(", ") + (list.length > 3 ? " …" : "");
  const tasks = [];

  const fresh = _bookingsCache.filter((b) => (b.status || "neu") === "neu");
  if (fresh.length) tasks.push({ goto: "buchungen", filter: "neu", text: `${fresh.length} neue ${plural(fresh.length, "Anfrage", "Anfragen")}`, detail: nameList(fresh) });

  const overdue = _bookingsCache.filter(isOverdueBooking);
  if (overdue.length) {
    tasks.push({
      goto: "buchungen",
      filter: "ueberfaellig",
      warn: true,
      text: `${overdue.length} ${plural(overdue.length, "Anfrage", "Anfragen")} seit mehr als ${OVERDUE_DAYS} Tagen unbeantwortet`,
      detail: overdue.slice(0, 3).map((b) => `${b.from_name || "—"} (${bookingAgeDays(b)} Tage)`).join(", ") + (overdue.length > 3 ? " …" : ""),
    });
  }

  if (_pendingReviewCount) tasks.push({ goto: "bewertungen", text: `${_pendingReviewCount} ${plural(_pendingReviewCount, "Bewertung wartet", "Bewertungen warten")} auf Freigabe` });

  const todayIso = calIso(new Date());
  const cleanable = _bookingsCache.filter((b) => cleanupCandidate(b, todayIso, 30)).length;
  if (cleanable) tasks.push({ goto: "cleanup", text: `${cleanable} erledigte ${plural(cleanable, "Anfrage", "Anfragen")} zum Aufräumen`, detail: "älter als 30 Tage" });

  let html = tasks.length
    ? tasks
        .map(
          (t) =>
            `<button type="button" class="today-item${t.warn ? " today-item--warn" : ""}" data-goto="${t.goto}"${t.filter ? ` data-filter="${t.filter}"` : ""}>
               <span class="today-text">${escapeText(t.text)}</span>${t.detail ? `<span class="today-detail">${escapeText(t.detail)}</span>` : ""}
             </button>`
        )
        .join("")
    : '<p class="today-empty">&#10003; Alles erledigt — nichts Offenes.</p>';

  const next = nextShowFromCache();
  if (next) {
    const n = daysUntil(next.date);
    const when = n === 0 ? "heute" : n === 1 ? "morgen" : `in ${n} Tagen`;
    html += `<button type="button" class="today-item today-item--info" data-goto="kalender">
               <span class="today-text">Nächster Auftritt: ${escapeText(calPretty(next.date))}</span>
               <span class="today-detail">${escapeText([next.venue, next.city].filter(Boolean).join(", "))} · ${when}</span>
             </button>`;
  }
  box.innerHTML = html;
}

let _todayBound = false;
function initTodayList() {
  const box = document.getElementById("today-list");
  if (!box || _todayBound) return;
  _todayBound = true;
  box.addEventListener("click", (e) => {
    const item = e.target.closest("[data-goto]");
    if (!item) return;
    const target = item.dataset.goto;
    if (target === "buchungen") {
      goToBookings(item.dataset.filter);
    } else if (target === "cleanup") {
      goToBookings("alle");
      const details = document.getElementById("cleanup-details");
      if (details) {
        details.open = true;
        details.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      document.querySelector(`.admin-nav-item[data-view="${target}"]`)?.click();
    }
  });
}

/* --------------------------------------------------------------------------
   BUCHUNGSBESTÄTIGUNG (druckfertig / als PDF speichern)
   --------------------------------------------------------------------------
   Öffnet ein neues Fenster mit einem A4-Dokument. Die gelb hinterlegten Felder
   (Gage, Spielzeiten, Anzahlung …) könnt ihr dort vor dem Drucken ausfüllen;
   "Drucken / Als PDF speichern" öffnet den Druckdialog des Browsers — dort
   "Als PDF speichern" wählen. Der Text ist eine VORLAGE und sollte vor der
   Verwendung rechtlich geprüft werden.
   -------------------------------------------------------------------------- */
function buildConfirmationHtml(b) {
  const e = escapeText;
  const logoUrl = new URL("assets/img/logo-badge.png", location.href).href;
  const siteUrl = new URL("./", location.href).href;
  const dateText = b.event_date ? calPretty(b.event_date) : "";
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  const row = (label, value) => `<tr><th>${label}</th><td>${value}</td></tr>`;
  const fill = (ph, value = "") => `<span class="fill" contenteditable="true" data-ph="${e(ph)}">${e(value)}</span>`;
  const title = `Buchungsbestaetigung ${b.from_name || ""} ${b.event_date || ""}`.trim();

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" />
<title>${e(title)}</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11pt/1.45 Arial, Helvetica, sans-serif; color: #111; background: #fff; }
  .toolbar { position: sticky; top: 0; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 10px 18px; background: #14100c; color: #ece2cb; font-size: 13px; }
  .toolbar button { padding: 8px 14px; border: 0; border-radius: 3px; background: #a8462b; color: #fff; font-size: 13px; cursor: pointer; }
  .toolbar button.ghost { background: transparent; border: 1px solid #ece2cb55; color: #ece2cb; }
  .sheet { max-width: 175mm; margin: 0 auto; padding: 12mm 0 16mm; }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 2px solid #a8462b; padding-bottom: 10px; margin-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 56px; height: 56px; object-fit: contain; }
  .brand b { display: block; font-size: 17pt; letter-spacing: .02em; }
  .brand span { font-size: 9.5pt; color: #555; }
  .meta { text-align: right; font-size: 10pt; color: #444; }
  h1 { font-size: 19pt; margin: 0 0 4px; }
  h2 { font-size: 11.5pt; margin: 20px 0 4px; padding-bottom: 3px; border-bottom: 1px solid #bbb; text-transform: uppercase; letter-spacing: .05em; color: #a8462b; }
  table { width: 100%; border-collapse: collapse; }
  th { width: 36%; text-align: left; vertical-align: top; padding: 5px 10px 5px 0; font-weight: 600; color: #333; }
  td { padding: 5px 0; vertical-align: top; }
  .fill { display: inline-block; min-width: 55%; padding: 1px 4px; background: #fff7c2; border-bottom: 1px solid #bbb; }
  .fill.block { display: block; min-height: 3.2em; }
  .fill:empty::before { content: attr(data-ph); color: #999; }
  p { margin: 8px 0; }
  .sign { display: flex; gap: 14mm; margin-top: 22mm; }
  .sign div { flex: 1; border-top: 1px solid #333; padding-top: 4px; font-size: 9.5pt; color: #444; }
  .note { margin-top: 14px; padding: 8px 10px; background: #f3efe6; font-size: 9pt; color: #555; }
  @media print {
    .toolbar, .note { display: none; }
    .fill { background: none; border-bottom: 1px solid #999; }
    .fill:empty::before { content: ""; }
    .sheet { padding: 0; }
  }
</style></head>
<body>
<div class="toolbar">
  <button type="button" onclick="window.print()">Drucken / Als PDF speichern</button>
  <button type="button" class="ghost" onclick="window.close()">Schließen</button>
  <span>Gelb hinterlegte Felder könnt ihr hier noch ausfüllen oder ändern.</span>
</div>
<div class="sheet">
  <div class="head">
    <div class="brand"><img src="${e(logoUrl)}" alt="" /><div><b>Who Knows?</b><span>Rock · Blues · Country</span></div></div>
    <div class="meta">Buchungsbestätigung<br />Stand: ${e(today)}</div>
  </div>

  <h1>Buchungsbestätigung</h1>
  <p>Wir bestätigen die Buchung der Band <strong>Who Knows?</strong> für die folgende Veranstaltung.</p>

  <h2>Auftraggeber</h2>
  <table>
    ${row("Name", e(b.from_name || ""))}
    ${b.company ? row("Firma / Organisation", e(b.company)) : ""}
    ${b.from_email ? row("E-Mail", e(b.from_email)) : ""}
    ${b.phone ? row("Telefon", e(b.phone)) : ""}
  </table>

  <h2>Veranstaltung</h2>
  <table>
    ${row("Datum", e(dateText))}
    ${b.event_type ? row("Art der Veranstaltung", e(b.event_type)) : ""}
    ${row("Ort / Adresse", e(b.location || ""))}
    ${b.guests ? row("Erwartete Gäste", e(b.guests)) : ""}
  </table>

  <h2>Leistung</h2>
  <table>
    ${row("Spielzeiten / Setlänge", fill("z. B. 2 × 45 Min., 20:00–22:00 Uhr", b.set_length || ""))}
    ${row("Aufbau / Soundcheck ab", fill("z. B. 17:00 Uhr"))}
    ${row("Technik vor Ort", `<span class="fill block" contenteditable="true" data-ph="Bühne, Strom, PA …">${e(b.tech_requirements || "")}</span>`)}
  </table>

  <h2>Vergütung</h2>
  <table>
    ${row("Gage", fill("… €"))}
    ${row("Anzahlung", fill("… €, fällig bis …"))}
    ${row("Restzahlung", fill("fällig am / nach Veranstaltung"))}
    ${row("Zahlungsart", fill("z. B. Überweisung / bar"))}
  </table>

  <h2>Weitere Vereinbarungen</h2>
  <span class="fill block" contenteditable="true" data-ph="z. B. Verpflegung, Parkmöglichkeit, Ansprechperson vor Ort"></span>
  <p style="font-size:10pt;color:#444;margin-top:12px;">Es gelten die Allgemeinen Geschäftsbedingungen von Who Knows?, abrufbar unter ${e(siteUrl)} (Fußzeile „AGB“). Bei vereinbarten Zahlungs- oder Absagebedingungen gehen diese den AGB vor.</p>

  <div class="sign">
    <div>Ort, Datum, Unterschrift Auftraggeber</div>
    <div>Ort, Datum, Unterschrift Who Knows?</div>
  </div>

  <div class="note">Hinweis (wird nicht gedruckt): Das ist eine Vorlage. Bitte Text und Zahlungsbedingungen vor der ersten Verwendung rechtlich prüfen lassen.${b.budget ? ` Preisvorstellung laut Anfrage: ${e(b.budget)}.` : ""}</div>
</div>
</body></html>`;
}

function openBookingConfirmation(b) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Das Fenster wurde vom Browser blockiert. Bitte Pop-ups für diese Seite erlauben und noch einmal klicken.");
    return;
  }
  w.document.open();
  w.document.write(buildConfirmationHtml(b));
  w.document.close();
}

/* --------------------------------------------------------------------------
   ALTE ANFRAGEN AUFRÄUMEN
   --------------------------------------------------------------------------
   Erledigt heißt: abgesagt, zugesagt mit vergangenem Auftritt, oder nie
   entschieden mit vergangenem Datum. Gelöscht wird nur, was ihr auswählt —
   auf Wunsch nach einer Sicherungsdatei (im Format der Datensicherung, also
   wieder einspielbar). Termine unter "Termine" bleiben erhalten.
   -------------------------------------------------------------------------- */
const tsToIso = (ts) => (ts && ts.toMillis ? calIso(new Date(ts.toMillis())) : null);

function cleanupCandidate(b, todayIso, minDays) {
  const status = b.status || "neu";
  let ref = null;
  let reason = "";
  if (status === "zugesagt") {
    ref = b.event_date || null;
    reason = "zugesagt, Auftritt vorbei";
  } else if (status === "abgesagt") {
    ref = tsToIso(b.statusChangedAt) || tsToIso(b.createdAt);
    reason = "abgesagt";
  } else if (b.event_date) {
    ref = b.event_date;
    reason = "nie entschieden, Datum vorbei";
  }
  if (!ref) return null;
  const age = Math.round((calFromIso(todayIso) - calFromIso(ref)) / 86400000);
  const minAge = Math.max(minDays, status === "abgesagt" ? 0 : 1);
  return age >= minAge ? { ref, age, reason } : null;
}

let _cleanupDocs = [];

async function loadCleanup() {
  const list = document.getElementById("cleanup-list");
  if (!list) return;
  list.innerHTML = '<p class="text-paper-dim text-sm">Lädt …</p>';
  try {
    const snap = await fbDb.collection("bookings").get();
    _cleanupDocs = snap.docs;
    renderCleanup();
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
  }
}

function renderCleanup() {
  const list = document.getElementById("cleanup-list");
  if (!list) return;
  const minDays = Number(document.getElementById("cleanup-age").value);
  const todayIso = calIso(new Date());
  const rows = _cleanupDocs
    .map((d) => ({ d, c: cleanupCandidate(d.data(), todayIso, minDays) }))
    .filter((r) => r.c)
    .sort((a, b) => a.c.ref.localeCompare(b.c.ref));

  document.getElementById("cleanup-count").textContent = rows.length ? String(rows.length) : "";
  list.innerHTML = rows.length
    ? rows
        .map(({ d, c }) => {
          const b = d.data();
          const date = b.event_date ? calShort(b.event_date) : "ohne Datum";
          return `<label class="restore-row"><input type="checkbox" class="cleanup-check" value="${escapeAttr(d.id)}" />
            <span>${escapeText(b.from_name || "—")} · ${escapeText(date)} <span class="text-xs text-paper-dim">(${escapeText(c.reason)})</span></span>
            <span class="badge badge-type">${c.age} ${plural(c.age, "Tag", "Tage")}</span></label>`;
        })
        .join("")
    : '<p class="text-paper-dim text-sm">Nichts zum Aufräumen — alle Anfragen sind noch aktuell.</p>';
  updateCleanupButtons();
}

function updateCleanupButtons() {
  const any = document.querySelectorAll("#cleanup-list .cleanup-check:checked").length > 0;
  const del = document.getElementById("cleanup-delete");
  if (del) del.disabled = !any;
}

async function runCleanup() {
  const ids = [...document.querySelectorAll("#cleanup-list .cleanup-check:checked")].map((c) => c.value);
  if (!ids.length) return;
  if (!confirm(`${ids.length} ${plural(ids.length, "Anfrage", "Anfragen")} endgültig löschen?\n\nTermine unter „Termine“ bleiben erhalten.`)) return;

  const btn = document.getElementById("cleanup-delete");
  const statusEl = document.getElementById("cleanup-status");
  btn.disabled = true;
  const docs = _cleanupDocs.filter((d) => ids.includes(d.id));
  try {
    if (document.getElementById("cleanup-backup")?.checked) {
      statusEl.textContent = "Sicherungsdatei wird erstellt …";
      downloadJsonFile(
        {
          app: "who-knows-website",
          version: BACKUP_FORMAT_VERSION,
          exportedAt: new Date().toISOString(),
          collections: { bookings: docs.map((d) => ({ id: d.id, data: backupValue(d.data()) })) },
        },
        `who-knows-anfragen-vor-aufraeumen-${calIso(new Date())}.json`
      );
    }
    statusEl.textContent = "Lösche …";
    for (const d of docs) await d.ref.delete();
    statusEl.textContent = `${docs.length} ${plural(docs.length, "Anfrage", "Anfragen")} gelöscht ✓`;
    await loadCleanup();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Das Löschen hat nicht (vollständig) geklappt. Bitte erneut versuchen.";
    btn.disabled = false;
  }
}

let _cleanupBound = false;
function initCleanup() {
  const details = document.getElementById("cleanup-details");
  if (!details || _cleanupBound) return;
  _cleanupBound = true;
  details.addEventListener("toggle", () => {
    if (details.open) loadCleanup();
  });
  document.getElementById("cleanup-age")?.addEventListener("change", renderCleanup);
  document.getElementById("cleanup-list")?.addEventListener("change", updateCleanupButtons);
  document.getElementById("cleanup-select-all")?.addEventListener("click", () => {
    const boxes = [...document.querySelectorAll("#cleanup-list .cleanup-check")];
    const allOn = boxes.length > 0 && boxes.every((b) => b.checked);
    boxes.forEach((b) => (b.checked = !allOn));
    updateCleanupButtons();
  });
  document.getElementById("cleanup-delete")?.addEventListener("click", runCleanup);
}
