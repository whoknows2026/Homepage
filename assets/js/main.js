/* ==========================================================================
   Who Knows? — Band-Website — main.js
   Reines Vanilla-JavaScript, keine Build-Tools nötig (läuft direkt auf
   GitHub Pages). Der Code ist in klar getrennte Abschnitte gegliedert:

   1) Mobile Navigation (Burger-Menü)
   2) Scroll-Reveal-Animationen
   3) Termine (Header-Hinweisleiste + Termine-Seite) <-- HIER Termine ergänzen
   4) Playlist / Audio-Player   <-- HIER Songs ergänzen (siehe Kommentar)
   5) Bildergalerie / Lightbox  <-- HIER Fotos ergänzen (siehe Kommentar)
   6) E-Mail-Versand via EmailJS <-- HIER eure Zugangsdaten eintragen
   7) Buchungs-Modal (öffnen/schließen)
   8) Bewertungen (öffentliches Formular + Live-Anzeige via Firebase)
   9) Besucherzähler (via Firebase) — Statistik im Admin-Bereich sichtbar
   10) Rechtliches-Modal (Impressum / Datenschutz / AGB) <-- HIER Texte anpassen
   11) "Nach oben"-Button
   12) Ladebildschirm (Preloader) <-- HIER Dauer anpassen (PRELOADER_DURATION_MS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initPreloader();
  initMobileNav();
  initScrollReveal();
  initShows();
  initAudioPlayer();
  initGallery();
  initReviewForm();
  loadApprovedReviews();
  logVisit();
  initLegalModal();
  initBookingModal();
  initScrollToTop();
  initSmoothAnchorClose(); // schließt das Mobile-Menü nach Klick auf Anker-Link
  setCurrentYear();
});

/* --------------------------------------------------------------------------
   1) MOBILE NAVIGATION
   -------------------------------------------------------------------------- */
function initMobileNav() {
  const toggleBtn = document.getElementById("nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  if (!toggleBtn || !mobileMenu) return;

  toggleBtn.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("flex");
    mobileMenu.classList.toggle("hidden");
    toggleBtn.classList.toggle("burger-open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });
}

function initSmoothAnchorClose() {
  const mobileMenu = document.getElementById("mobile-menu");
  const toggleBtn = document.getElementById("nav-toggle");
  if (!mobileMenu || !toggleBtn) return;

  mobileMenu.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      mobileMenu.classList.remove("flex");
      toggleBtn.classList.remove("burger-open");
      toggleBtn.setAttribute("aria-expanded", "false");
    });
  });
}

/* --------------------------------------------------------------------------
   2) SCROLL-REVEAL
   Jedes Element mit der Klasse "reveal" blendet sich sanft ein, sobald es
   in den sichtbaren Bereich scrollt. Respektiert "prefers-reduced-motion"
   automatisch, da wir dort in style.css alle Transitions verkürzen.
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealEls = document.querySelectorAll(".reveal");
  if (!revealEls.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------------
   3) TERMINE — kommende & vergangene Auftritte
   --------------------------------------------------------------------------
   NEUEN TERMIN HINZUFÜGEN: einfach einen weiteren Eintrag unten ergänzen.
   Sowohl der Hinweis-Streifen oben im Header ("Nächster Auftritt: …") als
   auch die Liste im Abschnitt "Termine" auf der Seite werden automatisch
   aus diesem einen Array erzeugt — ihr müsst nichts weiter anpassen.

   Felder:
   - date:  Datum im Format "JJJJ-MM-TT" (wichtig für die Sortierung/
            Unterscheidung kommend vs. vergangen)
   - venue: Name der Location
   - city:  Ort/Stadt
   - type:  Art der Veranstaltung (frei wählbar, z. B. "Festival")
   -------------------------------------------------------------------------- */
const shows = [
  { date: "2026-05-16", venue: "Raffas Scheune", city: "Brandoberndorf", type: "Live Gig" },
  { date: "2026-06-13", venue: "TSV Neukirchen", city: "Neukirchen", type: "Live Gig" },
  { date: "2026-08-08", venue: "Runde Ritzel", city: "Brandoberndorf", type: "Live Gig" },
  { date: "2026-09-11", venue: "Noise Lab", city: "Heuchelheim", type: "Live Gig" },
  { date: "2026-09-19", venue: "Raffas Scheune", city: "Brandoberndorf", type: "Live Gig" },
  { date: "2026-09-25", venue: "Blue Knights", city: "Ettingshausen", type: "Live Gig" },
];

function initShows() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = shows.filter((s) => s.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const past = shows.filter((s) => s.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));

  renderNextShowBar(upcoming[0]);
  renderShowsList("upcoming-shows-list", upcoming, { pastStyle: false });
  renderShowsList("past-shows-list", past, { pastStyle: true });
}

function formatShowDate(dateStr, short) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("de-DE", {
    weekday: short ? undefined : "short",
    day: "2-digit",
    month: short ? "2-digit" : "long",
    year: "numeric",
  });
}

function renderNextShowBar(nextShow) {
  const bar = document.getElementById("next-show-bar");
  const textEl = document.getElementById("next-show-text");
  if (!bar || !textEl || !nextShow) return; // keine anstehenden Termine -> Leiste bleibt ausgeblendet

  const isMobile = window.matchMedia("(max-width: 639px)").matches;
  const dateLabel = formatShowDate(nextShow.date, isMobile);
  textEl.textContent = `Nächster Auftritt: ${dateLabel} — ${nextShow.venue}, ${nextShow.city}`;
  bar.classList.remove("hidden");
  bar.classList.add("flex", "items-center", "justify-center");
}

function renderShowsList(containerId, list, { pastStyle }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<li class="text-paper-dim text-sm">${
      pastStyle ? "Noch keine vergangenen Auftritte hinterlegt." : "Aktuell sind keine Termine bestätigt — schaut bald wieder vorbei."
    }</li>`;
    return;
  }

  container.innerHTML = "";
  list.forEach((show) => {
    const li = document.createElement("li");
    li.className = `show-row rounded-md px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${
      pastStyle ? "show-row--past" : ""
    }`;
    li.innerHTML = `
      <div class="flex items-center gap-4 min-w-0">
        <span class="show-date font-display text-lg shrink-0"></span>
        <span class="min-w-0">
          <span class="block font-medium truncate venue-text"></span>
          <span class="block text-sm text-paper-dim truncate city-text"></span>
        </span>
      </div>
      <span class="show-type-badge text-xs px-3 py-1 rounded-sm shrink-0"></span>
    `;
    li.querySelector(".show-date").textContent = formatShowDate(show.date, false);
    li.querySelector(".venue-text").textContent = show.venue;
    li.querySelector(".city-text").textContent = show.city;
    li.querySelector(".show-type-badge").textContent = show.type || "";
    container.appendChild(li);
  });
}

/* --------------------------------------------------------------------------
   4) PLAYLIST / AUDIO-PLAYER
   --------------------------------------------------------------------------
   NEUE SONGS HINZUFÜGEN:
   1. MP3-Datei in den Ordner "assets/audio/" legen.
   2. Unten im Array "playlist" einen neuen Eintrag ergänzen
      (title, artist ist optional, src = Pfad zur Datei).
   Das war's — der Player baut die Track-Liste automatisch aus diesem
   Array auf, ihr müsst kein HTML von Hand anpassen.
   -------------------------------------------------------------------------- */
const playlist = [
  {
    title: "Funkenflug",
    duration: "3:42",
    src: "assets/audio/01-funkenflug.mp3",
  },
  {
    title: "Nachtschicht",
    duration: "4:05",
    src: "assets/audio/02-nachtschicht.mp3",
  },
  {
    title: "Stahl & Seide",
    duration: "3:18",
    src: "assets/audio/03-stahl-und-seide.mp3",
  },
  {
    title: "Letzte Bühne",
    duration: "4:51",
    src: "assets/audio/04-letzte-buehne.mp3",
  },
];

function initAudioPlayer() {
  const trackListEl = document.getElementById("track-list");
  const audioEl = document.getElementById("audio-element");
  const playBtn = document.getElementById("play-btn");
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");
  const progressBar = document.getElementById("progress-bar");
  const currentTimeEl = document.getElementById("current-time");
  const totalTimeEl = document.getElementById("total-time");
  const nowPlayingTitle = document.getElementById("now-playing-title");
  const prevBtn = document.getElementById("prev-track");
  const nextBtn = document.getElementById("next-track");
  const volumeBar = document.getElementById("volume-bar");
  const muteBtn = document.getElementById("mute-btn");
  const volumeIcon = document.getElementById("volume-icon");
  const muteIcon = document.getElementById("mute-icon");

  if (!trackListEl || !audioEl) return; // Player ist auf dieser Seite nicht vorhanden

  let currentIndex = 0;
  let lastVolume = 0.8; // Merkt sich die Lautstärke von vor dem Stummschalten

  audioEl.volume = volumeBar ? Number(volumeBar.value) / 100 : 0.8;

  // Track-Liste dynamisch aus dem "playlist"-Array rendern
  function renderTrackList() {
    trackListEl.innerHTML = "";
    playlist.forEach((track, index) => {
      const row = document.createElement("li");
      row.className = "track-row flex items-center justify-between gap-3 px-3 py-2.5";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-current", index === currentIndex ? "true" : "false");
      row.dataset.index = String(index);

      row.innerHTML = `
        <span class="flex items-center gap-3 min-w-0">
          <span class="track-number w-5 text-xs shrink-0">${String(index + 1).padStart(2, "0")}</span>
          <span class="truncate text-sm font-medium"></span>
        </span>
        <span class="text-xs text-[var(--color-paper-dim)] shrink-0">${track.duration || ""}</span>
      `;
      // Titel über textContent setzen (nicht Teil des obigen Template-
      // Strings), damit Sonderzeichen im Songtitel sicher escaped werden.
      row.querySelector(".truncate").textContent = track.title;

      row.addEventListener("click", () => loadTrack(index, true));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          loadTrack(index, true);
        }
      });

      trackListEl.appendChild(row);
    });
  }

  function loadTrack(index, autoplay) {
    currentIndex = (index + playlist.length) % playlist.length;
    const track = playlist[currentIndex];
    audioEl.src = track.src;
    nowPlayingTitle.textContent = track.title;

    [...trackListEl.children].forEach((row, i) => {
      row.setAttribute("aria-current", i === currentIndex ? "true" : "false");
    });

    if (autoplay) {
      audioEl.play().catch(() => {
        // Autoplay kann vom Browser blockiert werden — kein Problem,
        // der Nutzer kann dann manuell auf Play tippen.
      });
    }
  }

  function togglePlay() {
    if (!audioEl.src) {
      loadTrack(0, true);
      return;
    }
    if (audioEl.paused) {
      audioEl.play();
    } else {
      audioEl.pause();
    }
  }

  function formatTime(seconds) {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  playBtn?.addEventListener("click", togglePlay);
  prevBtn?.addEventListener("click", () => loadTrack(currentIndex - 1, true));
  nextBtn?.addEventListener("click", () => loadTrack(currentIndex + 1, true));

  audioEl.addEventListener("play", () => {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    playBtn.classList.add("is-playing");
    playBtn.setAttribute("aria-label", "Pause");
  });

  audioEl.addEventListener("pause", () => {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    playBtn.classList.remove("is-playing");
    playBtn.setAttribute("aria-label", "Abspielen");
  });

  audioEl.addEventListener("loadedmetadata", () => {
    // Rechts wird die VERBLEIBENDE Spielzeit angezeigt (zählt beim
    // Abspielen rückwärts) — direkt nach dem Laden entspricht das der
    // vollen Track-Länge.
    totalTimeEl.textContent = `-${formatTime(audioEl.duration)}`;
    progressBar.max = String(Math.floor(audioEl.duration) || 0);
  });

  audioEl.addEventListener("timeupdate", () => {
    currentTimeEl.textContent = formatTime(audioEl.currentTime);

    // Bugfix: früher wurde die rechte Zeitanzeige nur einmal beim Laden
    // gesetzt und blieb während der Wiedergabe stehen. Jetzt wird bei
    // jedem timeupdate die verbleibende Zeit (Restzeit) neu berechnet.
    const remaining = audioEl.duration - audioEl.currentTime;
    totalTimeEl.textContent = `-${formatTime(remaining)}`;

    if (!progressBar.matches(":active")) {
      progressBar.value = String(Math.floor(audioEl.currentTime));
    }
  });

  audioEl.addEventListener("ended", () => loadTrack(currentIndex + 1, true));

  progressBar?.addEventListener("input", () => {
    audioEl.currentTime = Number(progressBar.value);
  });

  /* Lautstärke-Regler: Schieberegler (0–100) steuert audioEl.volume (0–1).
     Der Stummschalt-Button merkt sich den zuletzt eingestellten Wert, damit
     ein erneuter Klick die Lautstärke wiederherstellt statt immer auf einen
     festen Wert zurückzuspringen. */
  function updateVolumeIcon() {
    if (!volumeIcon || !muteIcon) return;
    const isMuted = audioEl.muted || audioEl.volume === 0;
    volumeIcon.classList.toggle("hidden", isMuted);
    muteIcon.classList.toggle("hidden", !isMuted);
  }

  volumeBar?.addEventListener("input", () => {
    const vol = Number(volumeBar.value) / 100;
    audioEl.volume = vol;
    audioEl.muted = false;
    if (vol > 0) lastVolume = vol;
    updateVolumeIcon();
  });

  muteBtn?.addEventListener("click", () => {
    if (audioEl.muted || audioEl.volume === 0) {
      audioEl.muted = false;
      audioEl.volume = lastVolume || 0.8;
      if (volumeBar) volumeBar.value = String(Math.round(audioEl.volume * 100));
    } else {
      lastVolume = audioEl.volume;
      audioEl.muted = true;
    }
    updateVolumeIcon();
  });

  updateVolumeIcon();

  renderTrackList();
}

/* --------------------------------------------------------------------------
   5) BILDERGALERIE / LIGHTBOX
   --------------------------------------------------------------------------
   NEUE FOTOS HINZUFÜGEN: einfach einen weiteren <button class="gallery-item">
   Block in index.html (Abschnitt "BILDERGALERIE") ergänzen, mit passendem
   data-img (Pfad zur Bilddatei in assets/img/gallery/) und data-caption
   (Bildunterschrift). Dieses Skript liest die Kacheln automatisch aus dem
   DOM aus — hier muss nichts angepasst werden.
   -------------------------------------------------------------------------- */
function initGallery() {
  const items = Array.from(document.querySelectorAll(".gallery-item"));
  const lightbox = document.getElementById("gallery-lightbox");
  if (!items.length || !lightbox) return;

  const imageEl = document.getElementById("lightbox-image");
  const fallbackEl = document.getElementById("lightbox-fallback");
  const captionEl = document.getElementById("lightbox-caption");
  const closeBtns = lightbox.querySelectorAll("[data-close-lightbox]");
  const prevBtn = lightbox.querySelector("[data-prev-image]");
  const nextBtn = lightbox.querySelector("[data-next-image]");

  let currentIndex = 0;

  function showImage(index) {
    currentIndex = (index + items.length) % items.length;
    const item = items[currentIndex];
    const src = item.dataset.img;
    const caption = item.dataset.caption || "";

    captionEl.textContent = caption;

    // Falls die Bilddatei noch nicht existiert, zeigen wir einen Hinweis
    // statt eines kaputten Bild-Icons — sobald ihr die Datei ablegt,
    // erscheint sie beim nächsten Öffnen automatisch.
    imageEl.classList.add("hidden");
    fallbackEl.classList.remove("hidden");

    const probe = new Image();
    probe.onload = () => {
      if (currentIndex === (index + items.length) % items.length) {
        imageEl.src = src;
        imageEl.alt = caption;
        imageEl.classList.remove("hidden");
        fallbackEl.classList.add("hidden");
      }
    };
    probe.onerror = () => {
      /* Platzhalter bleibt sichtbar */
    };
    probe.src = src;
  }

  function openLightbox(index) {
    showImage(index);
    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    closeBtns[0]?.focus();
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    document.body.style.overflow = "";
  }

  items.forEach((item, index) => {
    item.addEventListener("click", () => openLightbox(index));
  });

  closeBtns.forEach((btn) => btn.addEventListener("click", closeLightbox));
  prevBtn?.addEventListener("click", () => showImage(currentIndex - 1));
  nextBtn?.addEventListener("click", () => showImage(currentIndex + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
  });
}

/* --------------------------------------------------------------------------
   6) E-MAIL-VERSAND ÜBER EMAILJS
   --------------------------------------------------------------------------
   GitHub Pages liefert nur statische Dateien aus — es gibt keinen eigenen
   Server, der E-Mails verschicken könnte. Die einfachste Lösung dafür ist
   ein externer Formular-/E-Mail-Service, der per JavaScript aus dem
   Browser heraus aufgerufen wird. Empfehlung: EmailJS (großzügige
   Gratis-Stufe, keine eigene Backend-Logik nötig).

   SO RICHTET IHR ES EIN (einmalig):
   1. Kostenlosen Account auf https://www.emailjs.com anlegen.
   2. Unter "Email Services" einen Dienst verbinden (z. B. Gmail) und die
      "Service ID" notieren.
   3. Unter "Email Templates" ein Template für die Buchungsanfrage
      erstellen, das die Felder {{from_name}}, {{from_email}}, {{phone}},
      {{event_date}}, {{location}}, {{event_type}}, {{message}},
      {{company}}, {{guests}}, {{tech_requirements}}, {{budget}} und
      {{set_length}} verwendet. "Template ID" notieren.
   4. Unter "Account" euren "Public Key" kopieren.
   5. Die drei Werte unten bei EMAILJS_CONFIG eintragen.
   6. In index.html das EmailJS-Script-Tag ist bereits eingebunden
      (siehe Kommentar dort). Fertig — das Buchungsformular sendet dann
      live E-Mails an rudolf.tobias1@web.de (im EmailJS-Template als
      Empfänger hinterlegen).

   Alternative Services (falls lieber gewünscht): Formspree, Web3Forms,
   Getform — das Grundprinzip (Public Key/Endpoint + Formular-POST) ist
   bei allen sehr ähnlich, ihr müsstet nur den Aufruf unten austauschen.
   -------------------------------------------------------------------------- */
const EMAILJS_CONFIG = {
  // TODO: eure eigenen Werte aus dem EmailJS-Dashboard eintragen
  publicKey: "DEIN_EMAILJS_PUBLIC_KEY",
  serviceId: "DEIN_EMAILJS_SERVICE_ID",
  bookingTemplateId: "DEIN_EMAILJS_TEMPLATE_ID_BUCHUNG",
};

function isEmailJsConfigured() {
  return (
    window.emailjs &&
    !EMAILJS_CONFIG.publicKey.startsWith("DEIN_") &&
    !EMAILJS_CONFIG.serviceId.startsWith("DEIN_")
  );
}

function sendViaEmailJs(templateId, formEl, onSuccess, onError) {
  if (!isEmailJsConfigured()) {
    // Solange noch keine echten Zugangsdaten eingetragen sind, geben wir
    // eine klare Entwickler-Hinweismeldung aus, statt einen kryptischen
    // Fehler zu werfen. Für Testzwecke wird der "Erfolgsfall" simuliert.
    console.warn(
      "[Who Knows?] EmailJS ist noch nicht konfiguriert. Bitte EMAILJS_CONFIG in assets/js/main.js ausfüllen. " +
        "Die Anfrage wurde NICHT wirklich versendet."
    );
    onSuccess();
    return;
  }

  window.emailjs
    .sendForm(EMAILJS_CONFIG.serviceId, templateId, formEl, EMAILJS_CONFIG.publicKey)
    .then(() => onSuccess())
    .catch((err) => onError(err));
}

/* --------------------------------------------------------------------------
   7) BUCHUNGS-MODAL
   -------------------------------------------------------------------------- */
function initBookingModal() {
  const modal = document.getElementById("booking-modal");
  const openBtns = document.querySelectorAll("[data-open-booking]");
  const closeBtns = modal ? modal.querySelectorAll("[data-close-booking]") : [];
  const form = document.getElementById("booking-form");

  if (!modal) return;

  function openModal() {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    // Fokus auf erstes Formularfeld für Tastatur-/Screenreader-Nutzer
    const firstField = modal.querySelector("input, select, textarea");
    firstField?.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  openBtns.forEach((btn) => btn.addEventListener("click", openModal));
  closeBtns.forEach((btn) => btn.addEventListener("click", closeModal));

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(); // Klick auf Backdrop schließt Modal
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const valid = validateForm(form);
    if (!valid) return;

    setFormLoading(form, true);
    saveFormToFirestore("bookings", form); // fürs Admin-Dashboard (parallel, unabhängig von E-Mail)
    sendViaEmailJs(
      EMAILJS_CONFIG.bookingTemplateId,
      form,
      () => {
        setFormLoading(form, false);
        form.reset();
        closeModal();
        showToast("Buchungsanfrage gesendet! Wir melden uns schnellstmöglich.");
      },
      (err) => {
        setFormLoading(form, false);
        console.error(err);
        showToast("Senden fehlgeschlagen. Bitte versucht es später erneut.", true);
      }
    );
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
  });
}

/* --------------------------------------------------------------------------
   GEMEINSAME VALIDIERUNGS-HELFER (für Buchungs- und Bewertungsformular)
   -------------------------------------------------------------------------- */
function validateForm(form) {
  let isValid = true;
  const requiredFields = form.querySelectorAll("[required]");

  requiredFields.forEach((field) => {
    const wrapper = field.closest(".form-field") || field;
    let fieldValid = true;

    if (field.type === "email") {
      fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
    } else if (field.type === "checkbox") {
      fieldValid = field.checked;
    } else if (field.type === "radio") {
      fieldValid = !!form.querySelector(`input[name="${field.name}"]:checked`);
    } else {
      fieldValid = field.value.trim().length > 0;
    }

    if (!fieldValid) {
      isValid = false;
      wrapper.classList.add("has-error");
    } else {
      wrapper.classList.remove("has-error");
    }
  });

  if (!isValid) {
    const firstError = form.querySelector(".has-error input, .has-error select, .has-error textarea");
    firstError?.focus();
  }

  return isValid;
}

function clearFieldError(field) {
  const wrapper = field.closest(".form-field") || field;
  if (!wrapper.classList.contains("has-error")) return;

  let stillInvalid = false;
  if (field.type === "email") {
    stillInvalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
  } else if (field.type === "checkbox") {
    stillInvalid = !field.checked;
  } else if (field.type === "radio") {
    const form = field.closest("form");
    stillInvalid = !form?.querySelector(`input[name="${field.name}"]:checked`);
  } else {
    stillInvalid = field.value.trim().length === 0;
  }

  if (!stillInvalid) wrapper.classList.remove("has-error");
}

function setFormLoading(form, isLoading) {
  const submitBtn = form.querySelector("[type='submit']");
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.dataset.originalText = submitBtn.dataset.originalText || submitBtn.textContent;
  submitBtn.textContent = isLoading ? "Wird gesendet…" : submitBtn.dataset.originalText;
}

/* --------------------------------------------------------------------------
   TOAST-BENACHRICHTIGUNG
   -------------------------------------------------------------------------- */
let toastTimeout;
function showToast(message, isError) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.style.borderColor = isError ? "var(--color-rust)" : "var(--color-gold)";
  toast.classList.add("is-visible");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 5000);
}

/* --------------------------------------------------------------------------
   FUSSZEILE: aktuelles Jahr automatisch einsetzen
   -------------------------------------------------------------------------- */
function setCurrentYear() {
  const el = document.getElementById("current-year");
  if (el) el.textContent = new Date().getFullYear();
}

/* --------------------------------------------------------------------------
   FIRESTORE-HELFER (gemeinsam genutzt von Kontakt-/Buchungsformular sowie
   Bewertungen). Schreibt nur, wenn Firebase konfiguriert ist (siehe
   assets/js/firebase-config.js) — sonst wird still übersprungen, damit die
   Seite ohne Firebase-Zugangsdaten trotzdem normal funktioniert.
   -------------------------------------------------------------------------- */
function saveFormToFirestore(collectionName, formEl) {
  if (!isFirebaseConfigured()) return;

  const data = Object.fromEntries(new FormData(formEl).entries());
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

  fbDb
    .collection(collectionName)
    .add(data)
    .catch((err) => console.error(`[Who Knows?] Firestore-Speichern (${collectionName}) fehlgeschlagen:`, err));
}

/* --------------------------------------------------------------------------
   8) BEWERTUNGEN — öffentliches Formular + Live-Anzeige
   --------------------------------------------------------------------------
   Ablauf: Besucher füllt das Formular unter "Was Veranstalter sagen" aus ->
   Eintrag landet in Firestore-Collection "reviews" mit approved:false ->
   Eintrag ist NUR im Admin-Bereich sichtbar -> nach Freigabe (Klick auf
   "Freigeben" im Admin-Dashboard) wird approved:true gesetzt -> ab dann
   erscheint die Bewertung automatisch hier auf der Seite (zusätzlich zu den
   fest hinterlegten Beispiel-Bewertungen im HTML).
   -------------------------------------------------------------------------- */
function initReviewForm() {
  const form = document.getElementById("review-form");
  const notice = document.getElementById("firebase-disabled-notice");
  if (!form) return;

  // Zeitpunkt merken, zu dem das Formular geladen wurde — Grundlage für
  // die Zeit-Falle weiter unten (siehe Kommentar dort).
  const formRenderedAt = Date.now();

  // Hinweis anzeigen, wenn Firebase noch nicht eingerichtet ist — aber die
  // Felder bleiben bedienbar (gleiches Verhalten wie beim Kontakt- und
  // Buchungsformular ohne EmailJS-Konfiguration): so lässt sich das
  // Formular jederzeit ausprobieren, statt ausgegraut zu wirken.
  if (!isFirebaseConfigured()) {
    notice?.classList.remove("hidden");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const valid = validateForm(form);
    if (!valid) return;

    const formData = new FormData(form);

    /* --------------------------------------------------------------------
       SPAM-SCHUTZ, zweistufig, ganz ohne externen Dienst (kein API-Key,
       keine zusätzliche Anmeldung nötig):

       1) Honeypot: ein für Menschen unsichtbares Feld ("website"). Bots,
          die automatisiert alle Formularfelder befüllen, tragen hier oft
          etwas ein — echte Besucher sehen und befüllen es nie.
       2) Zeit-Falle: wird das Formular schneller als in ~3 Sekunden nach
          dem Laden der Seite abgeschickt, ist das für einen echten
          Menschen unrealistisch (Name/Kommentar tippen braucht länger)
          und deutet auf ein automatisiertes Skript hin.

       In beiden Fällen wird NICHTS gespeichert, dem Absender aber
       trotzdem die normale Erfolgsmeldung gezeigt — so lernt ein Bot
       nicht, dass er erkannt wurde, und passt sein Verhalten nicht an.
       Das ist kein hundertprozentiger Schutz (ersetzt z. B. keine
       serverseitige Prüfung), reicht aber, um die große Mehrheit
       automatisierter Spam-Einsendungen abzufangen. Die sichtbare
       "Ich bin kein Roboter"-Checkbox (Pflichtfeld, siehe HTML) kommt
       obendrauf als dritte, für Besucher sichtbare Hürde.
       -------------------------------------------------------------------- */
    const honeypotFilled = Boolean(formData.get("website"));
    const submittedTooFast = Date.now() - formRenderedAt < 3000;

    if (honeypotFilled || submittedTooFast) {
      form.reset();
      showToast("Danke! Eure Bewertung wird nach kurzer Prüfung veröffentlicht.");
      return;
    }

    const review = {
      name: formData.get("name"),
      eventName: formData.get("eventName") || "",
      rating: Number(formData.get("rating")),
      comment: formData.get("comment"),
      approved: false,
    };

    setFormLoading(form, true);

    if (!isFirebaseConfigured()) {
      // Ohne Firebase-Zugangsdaten kann die Bewertung nicht gespeichert
      // werden. Damit das Formular beim Ausprobieren trotzdem nachvoll-
      // ziehbar reagiert, wird das dem Entwickler in der Konsole klar
      // gesagt; der Person, die das Formular ausfüllt, wird ehrlich
      // mitgeteilt, dass die Funktion noch nicht aktiv ist (statt eine
      // Erfolgsmeldung vorzutäuschen, die nie zu einer echten
      // veröffentlichten Bewertung führen würde).
      console.warn(
        "[Who Knows?] Firebase ist noch nicht konfiguriert (assets/js/firebase-config.js). " +
          "Die Bewertung wurde NICHT gespeichert."
      );
      setFormLoading(form, false);
      showToast("Bewertungen sind bald aktiv — danke für euer Verständnis!", true);
      return;
    }

    review.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    fbDb
      .collection("reviews")
      .add(review)
      .then(() => {
        setFormLoading(form, false);
        form.reset();
        showToast("Danke! Eure Bewertung wird nach kurzer Prüfung veröffentlicht.");
      })
      .catch((err) => {
        setFormLoading(form, false);
        console.error(err);
        showToast("Senden fehlgeschlagen. Bitte versucht es später erneut.", true);
      });
  });

  form.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
    field.addEventListener("change", () => clearFieldError(field));
  });
}

/** Lädt freigegebene Bewertungen aus Firestore und fügt sie vorne in das
 *  scrollbare Bewertungs-Grid ein (#review-scroll), im selben visuellen
 *  Stil wie die fest hinterlegten Beispiel-Bewertungen im HTML. Läuft live
 *  (onSnapshot) — neue Freigaben erscheinen ohne Neuladen der Seite. */
function loadApprovedReviews() {
  const scrollArea = document.getElementById("review-scroll");
  if (!scrollArea) return;

  // Ohne Firebase-Konfiguration gibt es keine Live-Daten — statt das Grid
  // einfach leer/kaputt wirken zu lassen, direkt den "keine Bewertungen"-
  // Hinweis anzeigen (identisch zum echten Leerstand weiter unten).
  if (!isFirebaseConfigured()) {
    scrollArea.innerHTML = reviewEmptyStateHtml();
    return;
  }

  fbDb
    .collection("reviews")
    .where("approved", "==", true)
    .orderBy("createdAt", "desc")
    .limit(12)
    .onSnapshot(
      (snapshot) => {
        scrollArea.innerHTML = "";

        if (snapshot.empty) {
          scrollArea.innerHTML = reviewEmptyStateHtml();
          return;
        }

        snapshot.forEach((doc) => {
          const review = doc.data();
          const stars = "★".repeat(review.rating || 0) + "☆".repeat(5 - (review.rating || 0));

          const figure = document.createElement("figure");
          figure.className = "review-card rounded-md p-6 pt-6";
          figure.innerHTML = `
            <div class="stars text-lg mb-3" aria-label="${review.rating} von 5 Sternen">${stars}</div>
            <blockquote class="text-paper-dim text-sm leading-relaxed mb-4"></blockquote>
            <figcaption class="text-sm">
              <span class="font-medium"></span>
              <span class="text-paper-dim"></span>
            </figcaption>
          `;
          // Texte über textContent setzen (nicht innerHTML), damit von
          // Besuchern eingegebene Inhalte niemals als HTML interpretiert
          // werden (Schutz vor Cross-Site-Scripting).
          figure.querySelector("blockquote").textContent = review.comment || "";
          figure.querySelector("figcaption .font-medium").textContent = review.name || "Anonym";
          figure.querySelector("figcaption .text-paper-dim").textContent = review.eventName
            ? ` — ${review.eventName}`
            : "";

          scrollArea.appendChild(figure);
        });
      },
      (err) => console.error("[Who Knows?] Bewertungen konnten nicht geladen werden:", err)
    );
}

/** Dezenter Hinweis, wenn (noch) keine einzige Bewertung freigegeben ist —
 *  füllt das Grid nicht mit Platzhalter-Beispielen, sondern sagt ehrlich,
 *  dass hier bald echte Bewertungen erscheinen. */
function reviewEmptyStateHtml() {
  return `
    <div class="col-span-full flex flex-col items-center gap-3 py-10 text-center text-paper-dim">
      <svg class="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
      </svg>
      <p class="text-sm">
        Aktuell sind noch keine Bewertungen vorhanden — seid die/der Erste
        und schreibt uns eure Erfahrung!
      </p>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   9) BESUCHERZÄHLER
   --------------------------------------------------------------------------
   Einfacher, ungefährer Zähler: pro Browser-Tab/Sitzung wird höchstens
   einmal hochgezählt (sessionStorage-Flag), damit ein Neuladen der Seite
   nicht ständig neue "Besuche" erzeugt. Der Zählerstand liegt in Firestore
   unter stats/visits und wird im Admin-Dashboard angezeigt.
   Hinweis: Ein rein clientseitiger Zähler lässt sich technisch versierten
   Personen gegenüber nicht hundertprozentig vor Manipulation schützen — für
   eine grobe Orientierung ("wie oft wurde die Seite aufgerufen") reicht er
   aber gut aus. Für belastbare Analytics empfiehlt sich zusätzlich ein
   dedizierter Dienst wie Plausible oder Google Analytics.
   -------------------------------------------------------------------------- */
function logVisit() {
  if (!isFirebaseConfigured()) return;
  if (sessionStorage.getItem("wk_visit_logged")) return;

  fbDb
    .collection("stats")
    .doc("visits")
    .set(
      {
        count: firebase.firestore.FieldValue.increment(1),
        lastVisitAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    .then(() => sessionStorage.setItem("wk_visit_logged", "1"))
    .catch((err) => console.error("[Who Knows?] Besucherzähler fehlgeschlagen:", err));
}

/* --------------------------------------------------------------------------
   10) RECHTLICHES-MODAL — Impressum / Datenschutz / AGB
   --------------------------------------------------------------------------
   WICHTIG — BITTE VOR VERÖFFENTLICHUNG LESEN:
   Die Texte unten sind ein Muster/Gerüst, angepasst an eine Band-Website
   mit Buchungsformular, Bewertungsfunktion und (optional) Firebase/EmailJS.
   Sie ersetzen KEINE Rechtsberatung. Alle [ECKIGE-KLAMMERN]-Platzhalter
   müssen durch eure echten Angaben ersetzt werden (verantwortliche Person,
   Adresse, Telefonnummer etc.) — ein Impressum ohne ladungsfähige Anschrift
   ist in Deutschland nicht rechtskonform. Lasst die Texte im Zweifel von
   einer Anwältin/einem Anwalt oder einem Dienst wie eRecht24 prüfen, bevor
   die Seite live geht — besonders die Datenschutzerklärung, da sie exakt
   zu den tatsächlich genutzten Diensten passen muss (z. B. wieder entfernen,
   falls ihr EmailJS oder Firebase am Ende doch nicht einsetzt).

   Texte anpassen: einfach den jeweiligen HTML-String unten bearbeiten.
   -------------------------------------------------------------------------- */
const LEGAL_CONTENT = {
  impressum: {
    title: "Impressum",
    html: `
      <div class="legal-callout">
        Muster-Impressum — bitte alle [Platzhalter] durch eure echten Angaben
        ersetzen. Ein Impressum ohne ladungsfähige Anschrift ist in
        Deutschland nicht zulässig.
      </div>

      <h3>Angaben gemäß § 5 TMG</h3>
      <p>
        [Name des/der Verantwortlichen, z. B. Bandleitung]<br />
        [Straße und Hausnummer]<br />
        [PLZ und Ort]
      </p>

      <h3>Kontakt</h3>
      <p>
        Telefon: [Telefonnummer einfügen]<br />
        E-Mail: <a href="mailto:rudolf.tobias1@web.de">rudolf.tobias1@web.de</a>
      </p>

      <h3>Umsatzsteuer-ID</h3>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: [falls
        vorhanden eintragen, sonst diesen Absatz entfernen]
      </p>

      <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
      <p>[Name, Anschrift wie oben]</p>

      <h3>EU-Streitschlichtung</h3>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr/</a>.
        Wir sind nicht verpflichtet und nicht bereit, an
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>

      <h3>Haftung für Inhalte</h3>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte
        auf dieser Website nach den allgemeinen Gesetzen verantwortlich.
        Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
        verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
        überwachen.
      </p>

      <h3>Haftung für Links</h3>
      <p>
        Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf
        deren Inhalte wir keinen Einfluss haben. Für die Inhalte der
        verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.
      </p>
    `,
  },

  datenschutz: {
    title: "Datenschutzerklärung",
    html: `
      <div class="legal-callout">
        Muster-Datenschutzerklärung — bitte an die tatsächlich genutzten
        Dienste anpassen (z. B. Abschnitte zu EmailJS/Firebase entfernen,
        falls ihr diese nicht einrichtet) und [Platzhalter] ausfüllen.
      </div>

      <h3>1. Verantwortlicher</h3>
      <p>
        [Name des/der Verantwortlichen]<br />
        [Straße und Hausnummer, PLZ und Ort]<br />
        E-Mail: <a href="mailto:rudolf.tobias1@web.de">rudolf.tobias1@web.de</a>
      </p>

      <h3>2. Hosting</h3>
      <p>
        Diese Website wird über GitHub Pages gehostet (GitHub Inc./GitHub
        B.V.). Beim Aufruf der Seite verarbeitet der Hosting-Anbieter
        automatisch technische Daten (z. B. IP-Adresse, Datum und Uhrzeit
        des Zugriffs, aufgerufene Seite, verwendeter Browser) in sogenannten
        Server-Logfiles. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an einer sicheren und funktionsfähigen
        Bereitstellung der Website).
      </p>

      <h3>3. Schriftarten (Google Fonts)</h3>
      <p>
        Diese Website bindet die Schriftarten „Anton“ und „Work Sans“ über
        Google Fonts ein. Dabei wird beim Aufruf der Seite eine Verbindung
        zu Servern von Google hergestellt, wobei die IP-Adresse des
        aufrufenden Endgeräts übertragen wird. Rechtsgrundlage ist Art. 6
        Abs. 1 lit. f DSGVO.
      </p>

      <h3>4. Kontakt- und Buchungsformular (EmailJS)</h3>
      <p>
        Über das Buchungsformular übermittelte Daten (z. B. Name, E-Mail,
        Telefonnummer, Angaben zur Veranstaltung) werden über den Dienst
        EmailJS verarbeitet und per E-Mail an uns weitergeleitet, um eure
        Anfrage zu bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
        DSGVO (Vertragsanbahnung).
      </p>

      <h3>5. Bewertungsfunktion &amp; Buchungsverwaltung (Firebase)</h3>
      <p>
        Sofern eingerichtet, nutzen wir Google Firebase (Google Ireland
        Limited bzw. Google LLC) zur Speicherung von Buchungs- und
        Kontaktanfragen, zur Verwaltung öffentlich abgegebener Bewertungen
        sowie für einen einfachen Besucherzähler und den Admin-Login. Freiwillig
        abgegebene Bewertungen (Name, Kommentar, Sternebewertung) werden vor
        Veröffentlichung geprüft. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
        und f DSGVO.
      </p>

      <h3>6. Speicherdauer</h3>
      <p>
        Personenbezogene Daten werden nur so lange gespeichert, wie es für
        die genannten Zwecke erforderlich ist oder gesetzliche
        Aufbewahrungsfristen dies vorschreiben.
      </p>

      <h3>7. Eure Rechte</h3>
      <p>
        Ihr habt jederzeit das Recht auf Auskunft, Berichtigung, Löschung
        oder Einschränkung der Verarbeitung eurer personenbezogenen Daten
        sowie ein Widerspruchsrecht gegen die Verarbeitung und ein Recht auf
        Datenübertragbarkeit. Zudem besteht ein Beschwerderecht bei einer
        Datenschutz-Aufsichtsbehörde. Wendet euch dazu gerne an die oben
        genannte E-Mail-Adresse.
      </p>
    `,
  },

  agb: {
    title: "Allgemeine Geschäftsbedingungen",
    html: `
      <div class="legal-callout">
        Muster-AGB für Buchungsanfragen — bitte an eure tatsächlichen
        Konditionen (Fristen, Prozentsätze, Zahlungsziele) anpassen und
        [Platzhalter] ausfüllen.
      </div>

      <h3>1. Geltungsbereich</h3>
      <p>
        Diese Bedingungen gelten für alle Buchungen von Live-Auftritten der
        Band Who Knows? über diese Website oder auf anderem Weg vereinbarte
        Engagements.
      </p>

      <h3>2. Anfrage &amp; Vertragsschluss</h3>
      <p>
        Eine über das Buchungsformular gesendete Anfrage ist zunächst
        unverbindlich. Ein Vertrag kommt erst durch unsere schriftliche
        Bestätigung (z. B. per E-Mail) zustande.
      </p>

      <h3>3. Leistungsumfang</h3>
      <p>
        Art, Dauer und Umfang des Auftritts (z. B. Setlänge, Spielzeiten,
        Anzahl der Musiker) werden individuell vereinbart und in der
        Buchungsbestätigung festgehalten.
      </p>

      <h3>4. Gage &amp; Zahlungsbedingungen</h3>
      <p>
        Die Höhe der Gage ergibt sich aus dem individuellen Angebot. [Bitte
        Zahlungsziel, ggf. Anzahlung und Zahlungsart ergänzen, z. B.:
        „50 % Anzahlung bei Vertragsschluss, Restzahlung am Veranstaltungstag
        in bar.“]
      </p>

      <h3>5. Rücktritt / Absage</h3>
      <p>
        Bei Absage durch den Auftraggeber gelten folgende Ausfallhonorare:
        [Beispiel: bis 8 Wochen vor dem Termin kostenfrei, danach gestaffelt
        bis zu 100 % der vereinbarten Gage bei kurzfristiger Absage — bitte
        eure Staffelung eintragen].
      </p>

      <h3>6. Technik &amp; Bühne vor Ort</h3>
      <p>
        Der Auftraggeber stellt die im Vorfeld abgestimmte Infrastruktur
        bereit (u. a. Stromanschluss, Bühnen-/Aufbaufläche, ggf. Zufahrt für
        den Bandtransport), sofern nicht anders vereinbart.
      </p>

      <h3>7. Höhere Gewalt</h3>
      <p>
        Bei Ereignissen höherer Gewalt (z. B. Krankheit, Unfall, behördliche
        Anordnungen), die einen Auftritt unmöglich machen, sind beide Seiten
        von der jeweiligen Leistungspflicht befreit; bereits erbrachte
        Anzahlungen werden anteilig erstattet bzw. auf einen Ersatztermin
        angerechnet.
      </p>

      <h3>8. Bild- und Tonaufnahmen</h3>
      <p>
        Die Band darf den Auftritt für eigene Promo- und
        Social-Media-Zwecke fotografisch und filmisch dokumentieren, sofern
        nicht ausdrücklich anders vereinbart.
      </p>

      <h3>9. Haftung</h3>
      <p>
        Wir haften im Rahmen der gesetzlichen Vorschriften. Für durch den
        Auftraggeber gestellte Technik oder Räumlichkeiten übernehmen wir
        keine Haftung.
      </p>

      <h3>10. Schlussbestimmungen</h3>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland. Sollte eine
        Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der
        übrigen Bestimmungen davon unberührt.
      </p>
    `,
  },
};

function initLegalModal() {
  const modal = document.getElementById("legal-modal");
  const titleEl = document.getElementById("legal-modal-title");
  const bodyEl = document.getElementById("legal-modal-body");
  const openButtons = document.querySelectorAll("[data-legal]");
  const closeButtons = modal ? modal.querySelectorAll("[data-close-legal]") : [];
  if (!modal || !titleEl || !bodyEl) return;

  function openLegal(key) {
    const content = LEGAL_CONTENT[key];
    if (!content) return;
    titleEl.textContent = content.title;
    bodyEl.innerHTML = content.html; // eigener, fest hinterlegter Inhalt — kein Nutzer-Input
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    closeButtons[0]?.focus();
  }

  function closeLegal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  openButtons.forEach((btn) => {
    btn.addEventListener("click", () => openLegal(btn.dataset.legal));
  });
  closeButtons.forEach((btn) => btn.addEventListener("click", closeLegal));

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeLegal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeLegal();
  });
}

/* --------------------------------------------------------------------------
   11) "NACH OBEN"-BUTTON
   --------------------------------------------------------------------------
   Bleibt durchgehend links unten fest auf dem Bildschirm stehen (siehe
   .scroll-top-btn in style.css) und scrollt beim Klick sanft zurück zum
   Seitenanfang. Respektiert "Bewegung reduzieren" (springt dann direkt
   nach oben statt zu scrollen).
   -------------------------------------------------------------------------- */
function initScrollToTop() {
  const btn = document.getElementById("scroll-top-btn");
  if (!btn) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
}

/* --------------------------------------------------------------------------
   12) LADEBILDSCHIRM (Preloader)
   --------------------------------------------------------------------------
   Füllt den Ladebalken innerhalb von PRELOADER_DURATION_MS (Standard: 2000
   = 2 Sekunden) und blendet den Ladebildschirm danach automatisch aus —
   die Homepage darunter ist zu diesem Zeitpunkt bereits fertig geladen und
   wird einfach sichtbar gemacht (kein Seitenwechsel, kein Neuladen).
   Dauer ändern: einfach die Zahl bei PRELOADER_DURATION_MS anpassen.
   -------------------------------------------------------------------------- */
const PRELOADER_DURATION_MS = 2000;

function initPreloader() {
  const preloader = document.getElementById("preloader");
  const barFill = document.getElementById("preloader-bar-fill");
  if (!preloader || !barFill) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.style.overflow = "hidden"; // während des Ladens nicht scrollbar

  function hidePreloader() {
    preloader.classList.add("is-hidden");
    document.body.style.overflow = "";
    // Nach Ende der Ausblend-Transition (siehe .preloader.is-hidden in
    // style.css, 0.5s) komplett aus dem Layout nehmen.
    setTimeout(() => {
      preloader.style.display = "none";
    }, 500);
  }

  if (prefersReducedMotion) {
    // Kein animierter Balken, kurzer, ruhiger Übergang statt 2 Sekunden
    // Warten mit bewegtem Inhalt.
    barFill.style.width = "100%";
    setTimeout(hidePreloader, 200);
    return;
  }

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const linearProgress = Math.min(elapsed / PRELOADER_DURATION_MS, 1);
    // Leichtes Ease-out, damit der Balken nicht stur linear, sondern mit
    // einem Hauch Schwung ausklingt.
    const eased = 1 - Math.pow(1 - linearProgress, 2);
    barFill.style.width = `${eased * 100}%`;

    if (linearProgress < 1) {
      requestAnimationFrame(step);
    } else {
      // Balken kurz bei 100% stehen lassen, bevor ausgeblendet wird —
      // wirkt sonst zu abrupt.
      setTimeout(hidePreloader, 150);
    }
  }

  requestAnimationFrame(step);
}
