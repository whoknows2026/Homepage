/* ==========================================================================
   Who Knows? — Admin-Bereich — admin.js
   Steuert admin.html: Login (Firebase Auth) + Dashboard (Firestore-Daten).
   Läuft komplett clientseitig — der eigentliche Schutz der Daten passiert
   über die Firestore-Sicherheitsregeln (siehe README.md), nicht über dieses
   Skript. Ohne die dort beschriebenen Regeln kann JEDE Website mit eurer
   Firebase-Konfiguration eure Daten lesen, unabhängig vom Login hier.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const missingEl = document.getElementById("firebase-missing");
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const logoutBtn = document.getElementById("logout-btn");

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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");

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
  initSearchFilters();
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
  if (!dateStr) return { day: "–", month: "" };
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return { day: "–", month: "" };
  return {
    day: d.toLocaleDateString("de-DE", { day: "2-digit" }),
    month: d.toLocaleDateString("de-DE", { month: "short" }).replace(".", ""),
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

function loadBookings() {
  const container = document.getElementById("bookings-list");
  fbDb
    .collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot(
      (snapshot) => {
        document.getElementById("stat-bookings").textContent = snapshot.size;
        document.getElementById("subnav-count-bookings").textContent = `(${snapshot.size})`;

        if (snapshot.empty) {
          container.innerHTML = emptyStateHtml("Noch keine Buchungsanfragen.");
          return;
        }

        container.innerHTML = "";
        snapshot.forEach((doc) => {
          const b = doc.data();
          const dateChip = formatDateChip(b.event_date);
          const card = document.createElement("article");
          card.className = "admin-card rounded-md p-5";
          card.dataset.search = [b.from_name, b.company, b.location, b.event_date, b.event_type]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          card.innerHTML = `
            <div class="flex items-start gap-4 mb-4">
              <div class="avatar-circle">${initialsOf(b.from_name)}</div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                  <p class="font-medium truncate name-text"></p>
                  ${b.event_type ? `<span class="badge badge-type">${escapeText(b.event_type)}</span>` : ""}
                  ${isRecent(b.createdAt) ? '<span class="badge badge-new">Neu</span>' : ""}
                </div>
                <p class="text-xs text-paper-dim company-text"></p>
              </div>
              <div class="date-chip">
                <span class="date-chip-month">${dateChip.month}</span>
                <span class="date-chip-day">${dateChip.day}</span>
              </div>
              ${DELETE_BUTTON_HTML}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-3 details-grid"></div>
            <div class="quote-box message-box"></div>
            <p class="text-xs text-paper-dim mt-3 timestamp-text"></p>
          `;

          card.querySelector(".name-text").textContent = b.from_name || "—";
          card.querySelector(".company-text").textContent = b.company || "";

          const detailsGrid = card.querySelector(".details-grid");
          detailsGrid.innerHTML = [
            iconRow("email", "E-Mail", b.from_email ? `<a href="mailto:${escapeAttr(b.from_email)}">${escapeText(b.from_email)}</a>` : ""),
            iconRow("phone", "Telefon", b.phone ? `<a href="tel:${escapeAttr(b.phone)}">${escapeText(b.phone)}</a>` : ""),
            iconRow("location", "Location", escapeText(b.location)),
            iconRow("guests", "Gäste", escapeText(b.guests)),
            iconRow("clock", "Setlänge", escapeText(b.set_length)),
            iconRow("euro", "Budget", escapeText(b.budget)),
            iconRow("wrench", "Technik", escapeText(b.tech_requirements)),
          ].join("");

          const messageBox = card.querySelector(".message-box");
          if (b.message) {
            messageBox.textContent = b.message;
          } else {
            messageBox.remove();
          }

          card.querySelector(".timestamp-text").textContent = `Eingegangen am ${formatTimestamp(b.createdAt)}`;

          card.querySelector("[data-delete]").addEventListener("click", () => {
            if (confirm("Diese Buchungsanfrage wirklich löschen?")) {
              doc.ref.delete().catch((err) => console.error(err));
            }
          });

          container.appendChild(card);
        });

        applySearchFilter("bookings-search", "bookings-list");
      },
      (err) => {
        console.error(err);
        container.innerHTML = '<p class="text-rust-light text-sm">Konnte nicht geladen werden.</p>';
      }
    );
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
        document.getElementById("subnav-count-reviews").textContent = `(${snapshot.size})`;

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
    <p class="text-xs text-paper-dim timestamp-text"></p>
  `;
  card.querySelector(".name-text").textContent = r.name || "Anonym";
  card.querySelector(".stars").textContent = stars;
  const eventEl = card.querySelector(".event-name");
  if (eventEl) eventEl.textContent = r.eventName || "";
  card.querySelector(".comment-box").textContent = r.comment || "";
  card.querySelector(".timestamp-text").textContent = formatTimestamp(r.createdAt);

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
    card.classList.toggle("hidden", !matches);
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
