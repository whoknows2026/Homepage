/* ==========================================================================
   Who Knows? — Band-Website — main.js
   Reines Vanilla-JavaScript, keine Build-Tools nötig (läuft direkt auf
   GitHub Pages). Der Code ist in klar getrennte Abschnitte gegliedert:

   1) Mobile Navigation (Burger-Menü)
   2) Scroll-Reveal-Animationen
   3) Termine (Header-Hinweisleiste + Termine-Seite) <-- HIER Termine ergänzen
   3b) Auftrittsorte ("Schon aufgetreten bei") — verwaltbar im Admin-Bereich
   4) Playlist / Audio-Player   <-- verwaltbar im Admin-Bereich (Firebase)
   5) Bildergalerie / Lightbox  <-- HIER Fotos ergänzen (siehe Kommentar)
   6) Anfragen-Ablage (nur Datenbank, kein E-Mail-Versand)
   7) Buchungs-Modal (öffnen/schließen)
   8) Bewertungen (öffentliches Formular + Live-Anzeige via Firebase)
   9) Besucherzähler (via Firebase) — Statistik im Admin-Bereich sichtbar
   10) Rechtliches-Modal (Impressum / Datenschutz / AGB) <-- HIER Texte anpassen
   11) "Nach oben"-Button
   12) Ladebildschirm (Preloader) <-- HIER Dauer anpassen (PRELOADER_DURATION_MS)
   13) "Seite teilen"-Button
   14) Hero-Parallax
   15) Sanftes Scrollen bei Anker-Links
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initPreloader();
  initMobileNav();
  initScrollReveal();
  initShows();
  loadVenues();
  loadBlockedDates();
  loadSiteSettings();
  loadFaq();
  initClickTracking();
  loadAnnouncement();
  loadBandMembers();
  initAudioPlayer();
  initGallery();
  loadGallery();
  loadVideos();
  initReviewForm();
  loadApprovedReviews();
  logVisit();
  initLegalModal();
  initBookingModal();
  initScrollToTop();
  initSmoothAnchors();
  initShareButton();
  initHeroParallax();
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
   Sobald Firebase eingerichtet ist, verwaltet ihr Termine bequem im
   Admin-Bereich unter "Termine" (hinzufügen, bearbeiten, löschen) — die
   Liste unten dient dann nur noch als Startzustand/Fallback, solange
   Firebase nicht konfiguriert ist. Sowohl der Hinweis-Streifen oben im
   Header ("Nächster Auftritt: …") als auch die Liste im Abschnitt
   "Termine" auf der Seite werden automatisch aus den Daten erzeugt.

   Felder je Termin:
   - date:  Datum im Format "JJJJ-MM-TT" (wichtig für die Sortierung/
            Unterscheidung kommend vs. vergangen)
   - venue: Name der Location
   - city:  Ort/Stadt
   - type:  Art der Veranstaltung (frei wählbar, z. B. "Festival")
   -------------------------------------------------------------------------- */
let shows = [
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

  // Live-Termine aus Firebase laden (überschreibt bei Erfolg die
  // Beispiel-Termine von oben) — verwaltbar im Admin-Bereich unter
  // "Termine". Nur einmal abonnieren, nicht bei jedem initShows()-Aufruf
  // erneut (sonst würden sich Snapshot-Listener aufsummieren).
  if (isFirebaseConfigured() && !initShows.subscribed) {
    initShows.subscribed = true;
    fbDb
      .collection("shows")
      .onSnapshot(
        (snapshot) => {
          if (snapshot.empty) return; // Beispiel-Termine bleiben stehen, bis eigene gepflegt sind
          shows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          document.dispatchEvent(new Event("wk:shows-updated")); // Buchungs-Kalender neu zeichnen
          initShows();
        },
        (err) => console.error("[Who Knows?] Termine konnten nicht geladen werden:", err)
      );
  }
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
  textEl.textContent = `Nächster Auftritt: ${dateLabel} — ${[nextShow.venue, nextShow.city].filter(Boolean).join(", ")}`;

  // Countdown-Chip: zeigt, wie lange es noch bis zum nächsten Auftritt ist.
  // Wird jedes Mal neu aufgebaut, damit bei Termin-Änderungen nichts
  // Altes stehen bleibt.
  const link = textEl.parentElement;
  link?.querySelector(".countdown-chip")?.remove();
  const countdownLabel = daysUntilLabel(nextShow.date);
  if (countdownLabel && link) {
    const chip = document.createElement("span");
    chip.className = "countdown-chip";
    chip.textContent = countdownLabel;
    textEl.insertAdjacentElement("afterend", chip);
  }

  bar.classList.remove("hidden");
  bar.classList.add("flex", "items-center", "justify-center");
}

/** "heute" / "morgen" / "noch 12 Tage" — gibt null zurück, wenn das Datum
 *  fehlt oder in der Vergangenheit liegt. */
function daysUntilLabel(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays < 0) return null;
  if (diffDays === 0) return "heute!";
  if (diffDays === 1) return "morgen!";
  return `noch ${diffDays} Tage`;
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
      <span class="flex items-center gap-3 shrink-0">
        <span class="show-type-badge text-xs px-3 py-1 rounded-sm"></span>
      </span>
    `;
    li.querySelector(".show-date").textContent = formatShowDate(show.date, false);
    li.querySelector(".venue-text").textContent = show.venue;
    li.querySelector(".city-text").textContent = show.city;
    li.querySelector(".show-type-badge").textContent = show.type || "";

    // "Zum Kalender hinzufügen" nur bei kommenden Terminen anbieten —
    // bei vergangenen ergibt es keinen Sinn.
    if (!pastStyle) {
      const calBtn = document.createElement("button");
      calBtn.type = "button";
      calBtn.className = "btn-ghost text-xs px-3 py-1.5 rounded-sm inline-flex items-center gap-1.5";
      calBtn.innerHTML = `
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 4h-1V3a1 1 0 1 0-2 0v1H8V3a1 1 0 0 0-2 0v1H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14zm0-12H5V6h14z"/></svg>
        <span>Kalender</span>
      `;
      calBtn.setAttribute("aria-label", `Termin ${show.venue} zum Kalender hinzufügen`);
      calBtn.addEventListener("click", () => downloadCalendarEvent(show));
      li.querySelector(".flex.items-center.gap-3.shrink-0").appendChild(calBtn);
    }

    container.appendChild(li);
  });
}

/* --------------------------------------------------------------------------
   "ZUM KALENDER HINZUFÜGEN"
   --------------------------------------------------------------------------
   Erzeugt eine .ics-Datei (Standard-Kalenderformat) direkt im Browser und
   startet den Download — funktioniert mit Apple Kalender, Google Kalender,
   Outlook usw., ganz ohne externen Dienst oder Server. Da wir keine
   Uhrzeiten pflegen, wird der Termin als Ganztagestermin angelegt.
   -------------------------------------------------------------------------- */
function downloadCalendarEvent(show) {
  if (!show || !show.date) return;

  const start = show.date.replace(/-/g, ""); // JJJJMMTT
  const endDate = new Date(`${show.date}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1); // DTEND ist bei Ganztagesterminen exklusiv
  const end = endDate.toISOString().slice(0, 10).replace(/-/g, "");

  // Zeilenumbrüche in Freitexten maskieren, damit die .ics-Datei gültig bleibt
  const esc = (str) => String(str || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Who Knows//Termine//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${start}-${Math.random().toString(36).slice(2)}@who-knows`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(`Who Knows? live — ${show.venue}`)}`,
    `LOCATION:${esc([show.venue, show.city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(`${show.type || "Live Gig"} mit Who Knows?`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `who-knows-${show.date}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------------------
   3b) AUFTRITTSORTE ("Schon aufgetreten bei")
   --------------------------------------------------------------------------
   Komplett dynamisch, keine Beispiel-Platzhalter mehr: die Sektion bleibt
   per Default ausgeblendet ("hidden" im HTML) und erscheint erst, sobald
   mindestens ein Ort in der Firestore-Collection "venues" existiert —
   verwaltbar im Admin-Bereich unter "Auftrittsorte", kein manuelles
   HTML-Bearbeiten mehr nötig. Ohne Firebase-Konfiguration bleibt die
   Sektion dauerhaft ausgeblendet.
   -------------------------------------------------------------------------- */
function loadVenues() {
  const section = document.getElementById("venues-section");
  const container = document.getElementById("venue-logos");
  if (!section || !container || !isFirebaseConfigured()) return; // Sektion bleibt ausgeblendet (siehe "hidden" im HTML)

  fbDb
    .collection("venues")
    .orderBy("name")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          section.classList.add("hidden");
          return;
        }

        section.classList.remove("hidden");
        container.innerHTML = "";
        snapshot.forEach((doc) => {
          const venue = doc.data();
          const chip = document.createElement("div");
          chip.className = "logo-placeholder h-12 w-32 rounded-sm text-xs";
          chip.textContent = venue.name || "";
          container.appendChild(chip);
        });
      },
      (err) => console.error("[Who Knows?] Auftrittsorte konnten nicht geladen werden:", err)
    );
}

/* --------------------------------------------------------------------------
   4) PLAYLIST / AUDIO-PLAYER
   --------------------------------------------------------------------------
   ZWEI WEGE, NEUE SONGS ZU ERGÄNZEN:

   A) Über den Admin-Bereich (empfohlen, sobald Firebase eingerichtet ist):
      Im Dashboard unter "Playlist" Titel, Dauer und Dateiname eintragen.
      Erscheint automatisch hier auf der Seite, ganz ohne Code-Änderung.
      WICHTIG: Die eigentliche MP3-Datei muss trotzdem manuell unter
      assets/audio/ ins Repository hochgeladen werden — der Admin-Bereich
      kann auf einer reinen GitHub-Pages-Seite keine Dateien hochladen,
      nur die Titel-Liste (Text) verwalten.

   B) Direkt im Code (funktioniert auch ohne Firebase):
      1. MP3-Datei in den Ordner "assets/audio/" legen.
      2. Unten im Array "playlist" einen neuen Eintrag ergänzen
         (title, duration, src = Pfad zur Datei).
      Diese Liste ist zugleich der Startzustand/Fallback, solange in
      Firestore noch keine eigene Playlist gepflegt wurde bzw. solange
      Firebase nicht konfiguriert ist.
   -------------------------------------------------------------------------- */
let playlist = [];

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
  const miniEl = document.getElementById("mini-player");
  const miniPlayBtn = document.getElementById("mini-play");
  const miniPlayIcon = document.getElementById("mini-play-icon");
  const miniPauseIcon = document.getElementById("mini-pause-icon");
  const miniTitleBtn = document.getElementById("mini-title");
  const miniNextBtn = document.getElementById("mini-next");
  const miniCloseBtn = document.getElementById("mini-close");
  const miniFill = document.getElementById("mini-progress-fill");

  if (!trackListEl || !audioEl) return; // Player ist auf dieser Seite nicht vorhanden

  let currentIndex = 0;
  let hasStarted = false; // wurde schon ein Song gestartet?
  let miniDismissed = false; // Mini-Player vom Besucher weggeklickt?
  let playerInView = true; // ist der große Player gerade im Bild?
  let lastVolume = 0.8; // Merkt sich die Lautstärke von vor dem Stummschalten

  audioEl.volume = volumeBar ? Number(volumeBar.value) / 100 : 0.8;

  // Track-Liste dynamisch aus dem "playlist"-Array rendern
  function renderTrackList() {
    trackListEl.innerHTML = "";

    if (playlist.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "px-3 py-6 text-center text-xs text-paper-dim";
      emptyLi.textContent = "Noch keine Songs hinterlegt.";
      trackListEl.appendChild(emptyLi);
      return;
    }

    playlist.forEach((track, index) => {
      const row = document.createElement("li");
      row.className = "track-row flex items-center justify-between gap-3 px-3 py-2.5";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-current", hasStarted && index === currentIndex ? "true" : "false");
      row.dataset.index = String(index);

      row.innerHTML = `
        <span class="flex items-center gap-3 min-w-0">
          <span class="track-number w-5 text-xs shrink-0">${String(index + 1).padStart(2, "0")}</span><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
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
    if (playlist.length === 0) return; // keine Songs hinterlegt — nichts abzuspielen
    currentIndex = (index + playlist.length) % playlist.length;
    const track = playlist[currentIndex];
    audioEl.src = track.src;
    nowPlayingTitle.textContent = track.title;
    if (miniTitleBtn) miniTitleBtn.textContent = track.title;
    hasStarted = true;
    document.body.classList.add("has-track");

    [...trackListEl.children].forEach((row, i) => {
      row.setAttribute("aria-current", i === currentIndex ? "true" : "false");
    });
    updateMini();

    if (autoplay) {
      audioEl.play().catch(() => {
        // Autoplay kann vom Browser blockiert werden — kein Problem,
        // der Nutzer kann dann manuell auf Play tippen.
      });
    }
  }

  function togglePlay() {
    if (playlist.length === 0) return; // keine Songs hinterlegt — Button bleibt wirkungslos
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
    // Equalizer-Balken tanzen (siehe .is-audio-playing in style.css) + Mini-Player
    document.body.classList.add("is-audio-playing", "has-track");
    hasStarted = true;
    miniDismissed = false;
    // SVG-Elemente kennen die Eigenschaft ".hidden" nicht — daher das Attribut direkt setzen.
    miniPlayIcon?.toggleAttribute("hidden", true);
    miniPauseIcon?.toggleAttribute("hidden", false);
    miniPlayBtn?.setAttribute("aria-label", "Pause");
    updateMini();
  });

  audioEl.addEventListener("pause", () => {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    playBtn.classList.remove("is-playing");
    playBtn.setAttribute("aria-label", "Abspielen");
    document.body.classList.remove("is-audio-playing");
    miniPlayIcon?.toggleAttribute("hidden", false);
    miniPauseIcon?.toggleAttribute("hidden", true);
    miniPlayBtn?.setAttribute("aria-label", "Abspielen");
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
    if (miniFill && audioEl.duration) miniFill.style.transform = `scaleX(${Math.min(1, audioEl.currentTime / audioEl.duration)})`;

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

  /* Mini-Player: erscheint als schwebende Leiste, sobald ein Song gestartet
     wurde UND der große Player nicht mehr im Bild ist — so lässt sich die
     Musik beim Weiterscrollen steuern, ohne zurückspringen zu müssen. */
  function updateMini() {
    if (!miniEl) return;
    const show = hasStarted && !miniDismissed && !playerInView;
    miniEl.classList.toggle("is-visible", show);
    miniEl.setAttribute("aria-hidden", show ? "false" : "true");
    miniEl.inert = !show;
  }

  const playerPanel = document.querySelector("#media .player-panel");
  if (playerPanel && "IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        playerInView = entry.isIntersecting;
        updateMini();
      },
      { threshold: 0 }
    ).observe(playerPanel);
  }

  miniPlayBtn?.addEventListener("click", togglePlay);
  miniNextBtn?.addEventListener("click", () => loadTrack(currentIndex + 1, true));
  miniCloseBtn?.addEventListener("click", () => {
    miniDismissed = true;
    updateMini();
  });
  miniTitleBtn?.addEventListener("click", () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("media")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  });

  renderTrackList();

  /* Live-Playlist aus Firebase laden (überschreibt bei Erfolg die
     Beispiel-Songs von oben im Array) — verwaltbar im Admin-Bereich unter
     "Playlist". Ohne Firebase-Konfiguration oder solange dort noch keine
     eigenen Songs gepflegt wurden, bleibt die feste Beispiel-Playlist
     aktiv, damit der Player nie leer/kaputt wirkt. */
  if (isFirebaseConfigured()) {
    fbDb
      .collection("songs")
      .orderBy("createdAt", "asc")
      .onSnapshot(
        (snapshot) => {
          if (snapshot.empty) return;
          playlist = snapshot.docs.map((doc) => {
            const song = doc.data();
            return {
              title: song.title || "Ohne Titel",
              duration: song.duration || "",
              src: `assets/audio/${song.filename || ""}`,
            };
          });
          renderTrackList();
        },
        (err) => console.error("[Who Knows?] Playlist konnte nicht geladen werden:", err)
      );
  }
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
  const lightbox = document.getElementById("gallery-lightbox");
  const grid = document.getElementById("gallery-grid");
  if (!lightbox) return;

  const imageEl = document.getElementById("lightbox-image");
  const fallbackEl = document.getElementById("lightbox-fallback");
  const captionEl = document.getElementById("lightbox-caption");
  const closeBtns = lightbox.querySelectorAll("[data-close-lightbox]");
  const prevBtn = lightbox.querySelector("[data-prev-image]");
  const nextBtn = lightbox.querySelector("[data-next-image]");

  let currentIndex = 0;

  /* Die Kacheln werden bei jedem Zugriff frisch aus dem DOM gelesen statt
     einmalig beim Start eingefroren — nur so funktioniert die Lightbox
     auch mit Bildern, die erst später aus Firestore nachgeladen werden
     (siehe loadGallery unten). */
  function getItems() {
    return Array.from(document.querySelectorAll(".gallery-item"));
  }

  function showImage(index) {
    const items = getItems();
    if (!items.length) return;
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

  /* Ein einziger Listener auf dem Grid statt je einem pro Kachel
     (Event-Delegation) — greift damit automatisch auch bei später
     eingefügten Kacheln. */
  grid?.addEventListener("click", (e) => {
    const item = e.target.closest(".gallery-item");
    if (!item) return;
    const index = getItems().indexOf(item);
    if (index >= 0) openLightbox(index);
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
   5b) GALERIE-BILDER AUS FIREBASE
   --------------------------------------------------------------------------
   Verwaltbar im Admin-Bereich unter "Galerie & Videos". Solange dort nichts
   gepflegt ist (oder ohne Firebase-Konfiguration), bleiben die fest im HTML
   hinterlegten Fotos stehen.

   Hinweis zum Bild selbst: Die Datei muss weiterhin im Repository liegen
   (assets/img/gallery/...) ODER als vollständige Web-Adresse angegeben
   werden — eine reine GitHub-Pages-Seite kann keine Datei-Uploads
   entgegennehmen. Im Admin-Bereich wird deshalb nur der Pfad/Link plus
   Bildunterschrift und Größe verwaltet.
   -------------------------------------------------------------------------- */
function loadGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid || !isFirebaseConfigured()) return;

  fbDb
    .collection("gallery")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) return; // Beispiel-Fotos im HTML bleiben stehen
        grid.innerHTML = "";

        snapshot.forEach((doc) => {
          const item = doc.data();
          const btn = document.createElement("button");
          btn.type = "button";
          // "size" steuert, wie groß die Kachel im Raster erscheint
          const sizeClass =
            item.size === "hoch"
              ? "row-span-2"
              : item.size === "breit"
              ? "sm:col-span-2"
              : "";
          btn.className = `gallery-item ${sizeClass} rounded-md overflow-hidden relative group`;
          btn.dataset.img = item.src || "";
          btn.dataset.caption = item.caption || "";

          const img = document.createElement("img");
          img.src = item.src || "";
          img.alt = item.caption || "Foto der Band";
          img.loading = "lazy";
          btn.appendChild(img);

          grid.appendChild(btn);
        });
      },
      (err) => console.error("[Who Knows?] Galerie konnte nicht geladen werden:", err)
    );
}

/* --------------------------------------------------------------------------
   5c) LIVE-VIDEOS AUS FIREBASE
   --------------------------------------------------------------------------
   Komplett über den Admin-Bereich verwaltbar — hier wird nur ein
   YouTube-Link gespeichert, keine Datei. Der Bereich bleibt ausgeblendet,
   solange kein Video hinterlegt ist.
   -------------------------------------------------------------------------- */
function loadVideos() {
  const block = document.getElementById("video-block");
  const grid = document.getElementById("video-grid");
  if (!block || !grid || !isFirebaseConfigured()) return;

  fbDb
    .collection("videos")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          block.classList.add("hidden");
          return;
        }

        grid.innerHTML = "";
        snapshot.forEach((doc) => {
          const video = doc.data();
          const videoId = extractYouTubeId(video.url || "");
          if (!videoId) return;

          const wrapper = document.createElement("div");
          const frame = document.createElement("div");
          frame.className = "video-frame rounded-md overflow-hidden";

          const iframe = document.createElement("iframe");
          iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
          iframe.title = video.title || "Who Knows? — Live-Video";
          iframe.loading = "lazy";
          iframe.allow =
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
          iframe.allowFullscreen = true;

          frame.appendChild(iframe);
          wrapper.appendChild(frame);

          if (video.title) {
            const caption = document.createElement("p");
            caption.className = "text-sm text-paper-dim mt-2";
            caption.textContent = video.title;
            wrapper.appendChild(caption);
          }

          grid.appendChild(wrapper);
        });

        block.classList.toggle("hidden", grid.children.length === 0);
      },
      (err) => console.error("[Who Knows?] Videos konnten nicht geladen werden:", err)
    );
}

/** Zieht die Video-ID aus allen gängigen YouTube-Adressformaten
 *  (youtube.com/watch?v=..., youtu.be/..., /embed/..., /shorts/...) oder
 *  akzeptiert eine direkt eingegebene ID. Gibt null zurück, wenn nichts
 *  Brauchbares erkannt wurde. */
function extractYouTubeId(input) {
  const value = String(input).trim();
  if (!value) return null;

  // Bereits eine reine ID (11 Zeichen, keine Sonderzeichen außer - und _)
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
   6) ANFRAGEN-ABLAGE
   --------------------------------------------------------------------------
   Buchungsanfragen werden ausschließlich in der Datenbank (Firestore)
   gespeichert und erscheinen im Admin-Bereich unter "Buchungsanfragen" (mit
   rotem Zähler in der Menüleiste). Es gibt bewusst KEINEN E-Mail-Versand und
   keinen externen Mail-Dienst. Wer später Benachrichtigungen per Mail
   möchte, kann das separat nachrüsten.
   -------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   7) BUCHUNGS-MODAL
   -------------------------------------------------------------------------- */
function initBookingModal() {
  const modal = document.getElementById("booking-modal");
  const openBtns = document.querySelectorAll("[data-open-booking]");
  const closeBtns = modal ? modal.querySelectorAll("[data-close-booking]") : [];
  const form = document.getElementById("booking-form");
  const wizard = form ? initBookingWizard(form) : null;
  let bookingOpenedAt = 0; // Zeitpunkt des Öffnens — für die Zeit-Falle (Spam-Schutz)

  if (!modal) return;

  function openModal() {
    if (!bookingOpenedAt) bookingOpenedAt = Date.now();
    countEvent("bookingOpen");
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    // Kalender aktualisieren (Terminliste kann sich geändert haben) und Fokus
    // für Tastatur-/Screenreader-Nutzer auf das erste Eingabeelement setzen.
    if (wizard) wizard.onOpen();
    else modal.querySelector("input, select, textarea")?.focus();
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
    // Mehrstufiges Formular: Absenden/Enter in Schritt 1–2 bedeutet "Weiter".
    if (wizard && !wizard.isLastStep()) {
      wizard.next();
      return;
    }
    const valid = wizard ? wizard.validateAll() : validateForm(form);
    if (!valid) return;

    /* SPAM-SCHUTZ (ohne externen Dienst), zwei Stufen:
       1) Honeypot: das unsichtbare Feld "website" ist befüllt -> Bot.
       2) Zeit-Falle: drei Formularschritte in unter 4 Sekunden auszufüllen
          ist für Menschen unrealistisch.
       In beiden Fällen wird NICHTS gespeichert oder gesendet, dem Absender
       aber die normale Erfolgsmeldung gezeigt — so merkt ein Bot nicht, dass
       er erkannt wurde. Das schützt vor Skripten, die das Formular auf der
       Seite bedienen. Direkte Schreibversuche auf die Datenbank fängt dieser
       Schutz NICHT ab — dafür sind die Firestore-Regeln (README, Abschnitt
       9.3) da. */
    const honeypotFilled = Boolean(form.elements.website && form.elements.website.value);
    const tooFast = Date.now() - bookingOpenedAt < 4000;
    if (honeypotFilled || tooFast) {
      form.reset();
      wizard?.reset();
      bookingOpenedAt = 0;
      closeModal();
      showToast("Buchungsanfrage gesendet! Wir melden uns schnellstmöglich.");
      return;
    }

    setFormLoading(form, true);
    // Die Anfrage wird nur in der Datenbank gespeichert (kein E-Mail-Versand) und
    // erscheint im Admin-Bereich. Die Erfolgsmeldung kommt erst, wenn das
    // Speichern wirklich geklappt hat — sonst bleibt das Formular mit allen
    // Eingaben offen und es gibt eine Fehlermeldung.
    saveFormToFirestore("bookings", form)
      .then(() => {
        setFormLoading(form, false);
        form.reset();
        wizard?.reset();
        bookingOpenedAt = 0;
        closeModal();
        showToast("Buchungsanfrage gesendet! Wir melden uns schnellstmöglich.");
      })
      .catch((err) => {
        setFormLoading(form, false);
        console.error(err);
        showToast("Senden fehlgeschlagen. Bitte versucht es später erneut.", true);
      });
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
  if (!isFirebaseConfigured()) return Promise.reject(new Error("Firebase ist nicht konfiguriert."));

  const data = Object.fromEntries(new FormData(formEl).entries());
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  delete data.website; // Honeypot-Feld (Spam-Schutz) gehört nie in die Datenbank

  // Buchungsanfragen starten im Admin-Bereich immer mit dem Status "neu"
  // (Workflow: neu -> in Bearbeitung -> zugesagt/abgesagt), damit sie sich
  // dort direkt einsortieren lassen.
  if (collectionName === "bookings") {
    data.status = "neu";
  }

  return fbDb
    .collection(collectionName)
    .add(data)
    .catch((err) => {
      console.error(`[Who Knows?] Firestore-Speichern (${collectionName}) fehlgeschlagen:`, err);
      throw err; // der Aufrufer zeigt dem Besucher eine Fehlermeldung
    });
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
  // Felder bleiben bedienbar, damit das Formular nicht ausgegraut wirkt.
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

          // Öffentliche Antwort der Band (im Admin-Bereich unter
          // "Bewertungen" verfasst) — wie bei Google-Rezensionen direkt
          // unter der Bewertung, optisch leicht abgesetzt.
          if (review.adminReply) {
            const reply = document.createElement("div");
            reply.className = "review-reply";
            reply.innerHTML = `
              <span class="review-reply-label">Antwort von Who Knows?</span>
              <p class="review-reply-text"></p>
            `;
            reply.querySelector(".review-reply-text").textContent = review.adminReply;
            figure.appendChild(reply);
          }

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
  countEvent("views"); // Tageszähler (siehe Abschnitt 20)
  // Bewusst OHNE Merker im Browser: Jeder Seitenaufruf zählt einmal. So wird
  // beim Besucher nichts gespeichert (kein Einwilligungsthema). Preis dafür:
  // erneutes Laden der Seite zählt mit — die Zahl ist also ein Näherungswert
  // für Aufrufe, nicht für einzelne Personen.

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
    .catch((err) => console.error("[Who Knows?] Besucherzähler fehlgeschlagen:", err));
}

/* --------------------------------------------------------------------------
   10) RECHTLICHES-MODAL — Impressum / Datenschutz / AGB
   --------------------------------------------------------------------------
   WICHTIG — BITTE LESEN:
   Die Texte unten sind an das angepasst, was diese Website tatsächlich tut
   (Stand siehe LEGAL_STAND). Sie sind ein sorgfältig erstelltes Muster und
   ersetzen KEINE Rechtsberatung — lasst sie im Zweifel von einer Anwältin
   bzw. einem Anwalt oder einem Dienst wie eRecht24 prüfen.

   Persönliche Angaben (Name, Anschrift) stehen NUR in LEGAL_OWNER direkt
   unter diesem Kommentar und werden automatisch in Impressum und
   Datenschutzerklärung eingesetzt. Solange dort noch eckige Klammern
   stehen, ist das Impressum unvollständig — ein Impressum ohne
   ladungsfähige Anschrift ist in Deutschland nicht zulässig.

   AKTUELL HALTEN: Sobald ihr einen neuen Dienst einbindet, ein
   Formularfeld ergänzt oder etwas einbettet (Videos, Karten, Analyse,
   Social-Plugins), muss die Datenschutzerklärung angepasst werden. Eine
   Checkliste steht in der README (Abschnitt 7b). Danach LEGAL_STAND
   aktualisieren.
   -------------------------------------------------------------------------- */
const LEGAL_STAND = "Oktober 2026";
const LEGAL_OWNER = {
  name: "[Vor- und Nachname der verantwortlichen Person]",
  street: "[Straße und Hausnummer]",
  city: "[PLZ und Ort]",
  email: "info@who-knows-coverband.de",
};

const LEGAL_CONTENT = {
  impressum: {
    title: "Impressum",
    get html() {
      return `
      <h3>Angaben gemäß § 5 DDG</h3>
      <p>
        ${LEGAL_OWNER.name}<br />
        ${LEGAL_OWNER.street}<br />
        ${LEGAL_OWNER.city}
      </p>

      <h3>Kontakt</h3>
      <p>
        E-Mail: <a href="mailto:${LEGAL_OWNER.email}">${LEGAL_OWNER.email}</a><br />
        Ihr erreicht uns außerdem jederzeit über das Buchungsformular auf
        dieser Website.
      </p>

      <h3>Verantwortlich für den Inhalt</h3>
      <p>
        Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV ist die oben
        genannte Person.
      </p>

      <h3>Verbraucherstreitbeilegung</h3>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>

      <h3>Haftung für Inhalte</h3>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
        auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
        §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
        verpflichtet, übermittelte oder gespeicherte fremde Informationen
        (z. B. Bewertungen von Besucherinnen und Besuchern) zu überwachen
        oder nach Umständen zu forschen, die auf eine rechtswidrige
        Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung
        der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben
        hiervon unberührt. Eine diesbezügliche Haftung ist erst ab dem
        Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
        Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese
        Inhalte umgehend.
      </p>

      <h3>Haftung für Links</h3>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter (z. B. zu
        unserem Instagram-Profil), auf deren Inhalte wir keinen Einfluss
        haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
        Anbieter oder Betreiber verantwortlich. Zum Zeitpunkt der Verlinkung
        waren keine Rechtsverstöße erkennbar. Bei Bekanntwerden von
        Rechtsverletzungen entfernen wir derartige Links umgehend.
      </p>

      <h3>Urheberrecht</h3>
      <p>
        Die von uns erstellten Inhalte und Werke auf diesen Seiten (Texte,
        Fotos, Logo, Gestaltung) unterliegen dem deutschen Urheberrecht.
        Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
        Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der
        schriftlichen Zustimmung der jeweiligen Rechteinhaber. Beiträge
        Dritter (z. B. Bewertungen) sind als solche erkennbar.
      </p>

      <p class="legal-stand">Stand: ${LEGAL_STAND}</p>
    `;
    },
  },

  datenschutz: {
    title: "Datenschutzerklärung",
    get html() {
      return `
      <h3>1. Verantwortlicher</h3>
      <p>
        ${LEGAL_OWNER.name}<br />
        ${LEGAL_OWNER.street}, ${LEGAL_OWNER.city}<br />
        E-Mail: <a href="mailto:${LEGAL_OWNER.email}">${LEGAL_OWNER.email}</a>
      </p>

      <h3>2. Überblick</h3>
      <p>
        Wir verarbeiten personenbezogene Daten nur, soweit das für den
        Betrieb dieser Website und die Bearbeitung eurer Anfragen
        erforderlich ist. Wir setzen keine Analyse- oder Tracking-Dienste
        (z. B. Google Analytics) und keine Werbe-Cookies ein.
      </p>

      <h3>3. Hosting (GitHub Pages) und Server-Logfiles</h3>
      <p>
        Diese Website wird über GitHub Pages gehostet (GitHub Inc., USA,
        bzw. GitHub B.V., Niederlande). Beim Aufruf verarbeitet der
        Hosting-Anbieter automatisch technische Daten (z. B. IP-Adresse,
        Datum und Uhrzeit des Zugriffs, aufgerufene Seite, Browser) in
        Server-Logfiles. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an einer sicheren und funktionsfähigen
        Bereitstellung der Website). Die Verbindung ist per TLS
        verschlüsselt.
      </p>

      <h3>4. Schriftarten (Google Fonts)</h3>
      <p>
        Diese Website lädt die Schriftarten „Anton“ und „Work Sans“ von
        Servern von Google (Google Ireland Limited, Gordon House, Barrow
        Street, Dublin 4, Irland). Dabei stellt euer Browser eine Verbindung
        zu Google her und übermittelt dabei unter anderem eure IP-Adresse.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (einheitliche,
        ansprechende Darstellung der Website).
      </p>

      <h3>5. Externe Programmbibliotheken (CDN)</h3>
      <p>
        Für Darstellung und Funktion lädt die Website Programmbibliotheken
        von externen Servern: das Layout-Framework Tailwind CSS
        (cdn.tailwindcss.com) sowie die Firebase-Bibliotheken von Google
        (gstatic.com). Beim Laden wird jeweils eure IP-Adresse an den
        jeweiligen Betreiber übermittelt; das ist technisch erforderlich,
        damit die Dateien ausgeliefert werden können. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h3>6. Datenbank für Inhalte und Besucherzähler (Google Firebase)</h3>
      <p>
        Inhalte wie Termine, Bandmitglieder, Galerie, Playlist,
        Auftrittsorte, freigegebene Bewertungen und Ankündigungen laden wir
        aus einer Datenbank von Google Firebase (Google Ireland Limited
        bzw. Google LLC, USA). Beim Aufruf der Website verbindet sich euer
        Browser dazu mit Servern von Google; dabei wird eure IP-Adresse
        übertragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an einer aktuellen und einfach pflegbaren
        Website).
      </p>
      <p>
        Außerdem zählen wir Seitenaufrufe mit einfachen Zählern: Bei jedem
        Aufruf wird ein Gesamtzähler und ein Tageszähler um eins erhöht.
        Zusätzlich zählen wir pro Tag, wie oft das Buchungsfenster geöffnet
        und unser Instagram-Link angeklickt wird. In unserer Datenbank
        werden dabei nur diese Zahlen und das Datum gespeichert — weder eure
        IP-Adresse noch weitere Angaben zu eurer Person —, und es wird
        nichts in eurem Browser abgelegt. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. f DSGVO (berechtigtes Interesse an einer anonymen
        Reichweitenmessung).
      </p>

      <h3>7. Speicherung im Browser</h3>
      <p>
        Diese Website setzt keine Cookies. Den Sitzungsspeicher
        (sessionStorage) eures Browsers nutzt sie nur, wenn ihr einen
        Hinweisbanner (z. B. eine Ankündigung) mit dem × schließt: Dann
        wird für diese Sitzung vermerkt, dass er nicht erneut erscheinen
        soll; der Eintrag wird gelöscht, sobald ihr den Browser-Tab
        schließt. Die eingesetzten Firebase-Bibliotheken können außerdem
        technisch notwendige Daten im Browser ablegen.
      </p>

      <h3>8. Buchungsanfragen</h3>
      <p>
        Über das Buchungsformular erheben wir die Angaben, die ihr eingebt:
        Name, ggf. Firma bzw. Organisation, E-Mail-Adresse, ggf.
        Telefonnummer sowie Angaben zur Veranstaltung (Datum, Art, Ort,
        Gästezahl, gewünschte Spieldauer, Budget, Technik, Nachricht).
        Pflichtfelder sind markiert; ohne diese Angaben können wir eure
        Anfrage nicht bearbeiten.
      </p>
      <p>
        Die Angaben werden ausschließlich in unserer Firebase-Datenbank
        (Google) gespeichert, auf die nur wir Zugriff haben; dort können wir
        intern einen Bearbeitungsstatus und Notizen ergänzen. Ein
        automatischer E-Mail-Versand findet nicht statt. Zweck ist die
        Bearbeitung eurer Anfrage und gegebenenfalls die Vertragsanbahnung.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, für die interne
        Organisation Art. 6 Abs. 1 lit. f DSGVO. Eine Weitergabe an sonstige
        Dritte erfolgt nicht. Zum Schutz vor automatisiertem Spam nutzen wir
        ein unsichtbares Feld und eine Zeitprüfung; dafür werden keine
        zusätzlichen personenbezogenen Daten gespeichert.
      </p>

      <h3>9. Bewertungen</h3>
      <p>
        Besucherinnen und Besucher können auf dieser Website eine Bewertung
        abgeben. Dabei erheben wir den Namen (frei wählbar — ein Vorname oder
        Pseudonym genügt), optional den Anlass bzw. die Veranstaltung, die
        Sternebewertung und den Kommentar. Die Angaben werden in unserer
        Firebase-Datenbank (Google) gespeichert und von uns geprüft. Erst
        nach unserer Freigabe werden Name, Anlass, Sterne und Kommentar
        öffentlich auf der Website angezeigt; wir können öffentlich darauf
        antworten. Rechtsgrundlage ist eure Einwilligung (Art. 6 Abs. 1
        lit. a DSGVO) durch das Absenden des Formulars. Ihr könnt sie
        jederzeit mit Wirkung für die Zukunft widerrufen und die Löschung
        eurer Bewertung verlangen — eine E-Mail an die oben genannte Adresse
        genügt.
      </p>
      <p>
        Zum Schutz vor automatisiertem Spam nutzen wir bei diesem Formular
        ein unsichtbares Feld, eine Zeitprüfung und ein Ankreuzfeld („Ich
        bin kein Roboter“); dafür werden keine zusätzlichen
        personenbezogenen Daten gespeichert.
      </p>

      <h3>10. Eingebettete Videos (YouTube)</h3>
      <p>
        Sofern auf dieser Website Videos eingebunden sind (Bereich „Live
        erleben“), nutzen wir YouTube im erweiterten Datenschutzmodus
        (youtube-nocookie.com; Google Ireland Limited). Beim Laden des
        Videos stellt euer Browser eine Verbindung zu Servern von
        YouTube/Google her; dabei wird unter anderem eure IP-Adresse
        übermittelt. Nach Angaben von Google speichert YouTube im
        erweiterten Modus erst bei der Wiedergabe Informationen über
        Besucherinnen und Besucher. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. f DSGVO. Der Bereich erscheint nur, solange ein Video
        hinterlegt ist.
      </p>

      <h3>11. Link zu Instagram</h3>
      <p>
        Auf dieser Website verlinken wir unser Instagram-Profil (Meta
        Platforms Ireland Limited, Merrion Road, Dublin 4, Irland). Es
        handelt sich um einen einfachen Link, nicht um ein eingebettetes
        Plugin: Beim bloßen Aufruf unserer Seite werden keine Daten an
        Instagram übertragen. Erst wenn ihr auf das Symbol klickt, verlasst
        ihr unsere Website, und es gelten die Datenschutzbestimmungen von
        Instagram bzw. Meta.
      </p>

      <h3>12. Verwaltungsbereich (Login)</h3>
      <p>
        Der Verwaltungsbereich dieser Website ist ausschließlich für
        Mitglieder der Band bestimmt. Für die Anmeldung werden
        E-Mail-Adresse und Passwort über Firebase Authentication (Google)
        verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Schutz
        der Verwaltungsdaten vor unbefugtem Zugriff).
      </p>

      <h3>13. Empfänger und Übermittlung in Drittländer</h3>
      <p>
        Empfänger eurer Daten sind — je nach Funktion — die genannten
        Dienstleister: GitHub (Hosting), Google (Schriftarten, Firebase, ggf.
        YouTube) und Tailwind Labs (Programmbibliothek). Einige
        dieser Anbieter verarbeiten Daten auch in den USA oder anderen
        Drittländern. Soweit erforderlich, stützt sich die Übermittlung auf
        einen Angemessenheitsbeschluss der EU-Kommission (EU-US Data Privacy
        Framework) oder auf EU-Standardvertragsklauseln.
      </p>

      <h3>14. Speicherdauer</h3>
      <p>
        Wir speichern personenbezogene Daten nur so lange, wie es für die
        genannten Zwecke erforderlich ist. Buchungsanfragen löschen wir,
        sobald die Anfrage erledigt ist und keine gesetzlichen
        Aufbewahrungspflichten (z. B. handels- und steuerrechtlich)
        entgegenstehen. Bewertungen bleiben bis zu einem Widerruf bzw.
        Löschwunsch veröffentlicht. Server-Logfiles speichert der
        Hosting-Anbieter nach seinen eigenen Vorgaben. Der Besucherzähler
        speichert keine personenbezogenen Daten.
      </p>

      <h3>15. Eure Rechte</h3>
      <p>
        Ihr habt das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung
        (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung
        (Art. 18) und Datenübertragbarkeit (Art. 20). Ihr könnt der
        Verarbeitung auf Grundlage berechtigter Interessen jederzeit
        widersprechen (Art. 21) und eine erteilte Einwilligung jederzeit mit
        Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Wendet euch dazu
        an die oben genannte E-Mail-Adresse. Außerdem habt ihr das Recht,
        euch bei einer Datenschutz-Aufsichtsbehörde zu beschweren — z. B.
        bei der für euren Wohnort zuständigen oder, je nach Sitz der
        verantwortlichen Person, beim Hessischen Beauftragten für
        Datenschutz und Informationsfreiheit (datenschutz.hessen.de).
      </p>
      <p>
        Eine automatisierte Entscheidungsfindung einschließlich Profiling
        findet nicht statt.
      </p>

      <p class="legal-stand">Stand: ${LEGAL_STAND}</p>
    `;
    },
  },

  agb: {
    title: "Allgemeine Geschäftsbedingungen",
    get html() {
      return `
      <h3>1. Geltungsbereich</h3>
      <p>
        Diese Bedingungen gelten für alle Buchungen von Live-Auftritten der
        Band Who Knows? (nachfolgend „wir“) durch Verbraucher und
        Unternehmer (nachfolgend „Auftraggeber“) — gleich ob über diese
        Website oder auf anderem Weg vereinbart.
      </p>

      <h3>2. Anfrage &amp; Vertragsschluss</h3>
      <p>
        Eine über das Buchungsformular gesendete Anfrage ist zunächst
        unverbindlich. Ein Vertrag kommt erst durch unsere Bestätigung in
        Textform (z. B. per E-Mail) zustande.
      </p>

      <h3>3. Leistungsumfang</h3>
      <p>
        Art, Dauer und Umfang des Auftritts (z. B. Setlänge, Spielzeiten,
        Anzahl der Musiker) werden individuell vereinbart und in der
        Buchungsbestätigung festgehalten.
      </p>

      <h3>4. Gage &amp; Zahlung</h3>
      <p>
        Die Höhe der Gage und die Zahlungsmodalitäten (z. B. Anzahlung,
        Fälligkeit, Zahlungsart) ergeben sich aus dem individuellen Angebot
        bzw. der Buchungsbestätigung.
      </p>

      <h3>5. Absage durch den Auftraggeber</h3>
      <p>
        Sagt der Auftraggeber den Auftritt ab, richtet sich ein etwaiges
        Ausfallhonorar nach der Vereinbarung im Angebot bzw. in der
        Buchungsbestätigung. Fehlt eine solche Vereinbarung, gelten die
        gesetzlichen Regelungen. Dem Auftraggeber bleibt der Nachweis
        unbenommen, dass uns kein oder ein wesentlich geringerer Schaden
        entstanden ist.
      </p>

      <h3>6. Kein Widerrufsrecht bei festem Termin</h3>
      <p>
        Bei Verträgen mit Verbrauchern über Dienstleistungen im
        Zusammenhang mit Freizeitbetätigungen, die für einen bestimmten
        Zeitpunkt oder Zeitraum vorgesehen sind, besteht nach § 312g Abs. 2
        Nr. 9 BGB kein gesetzliches Widerrufsrecht.
      </p>

      <h3>7. Technik &amp; Bühne vor Ort</h3>
      <p>
        Der Auftraggeber stellt die im Vorfeld abgestimmte Infrastruktur
        bereit (u. a. Stromanschluss, Bühnen-/Aufbaufläche, ggf. Zufahrt für
        den Bandtransport), sofern nicht anders vereinbart.
      </p>

      <h3>8. GEMA</h3>
      <p>
        Die gegebenenfalls erforderliche Anmeldung der Veranstaltung bei der
        GEMA sowie die Zahlung der dafür anfallenden Vergütung obliegen dem
        Auftraggeber, sofern nicht ausdrücklich etwas anderes vereinbart
        ist. Auf Wunsch stellen wir die Titelfolge (Musikfolge) zur
        Verfügung.
      </p>

      <h3>9. Ausfall und höhere Gewalt</h3>
      <p>
        Fällt ein Auftritt aus Gründen aus, die wir nicht zu vertreten haben
        (z. B. Krankheit oder Unfall von Bandmitgliedern, höhere Gewalt,
        behördliche Anordnungen), informieren wir den Auftraggeber
        unverzüglich und bemühen uns um einen Ersatztermin oder gleichwertigen
        Ersatz. Ist beides nicht möglich, werden beide Seiten von ihren
        Leistungspflichten frei; bereits geleistete Zahlungen werden erstattet
        bzw. auf einen Ersatztermin angerechnet.
      </p>

      <h3>10. Bild- und Tonaufnahmen</h3>
      <p>
        Die Band darf den Auftritt für eigene Promo- und
        Social-Media-Zwecke fotografisch und filmisch dokumentieren, sofern
        nicht ausdrücklich anders vereinbart.
      </p>

      <h3>11. Haftung</h3>
      <p>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie
        bei Verletzung von Leben, Körper oder Gesundheit. Bei leicht
        fahrlässiger Verletzung wesentlicher Vertragspflichten ist unsere
        Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt;
        im Übrigen ist die Haftung bei leichter Fahrlässigkeit
        ausgeschlossen. Für vom Auftraggeber gestellte Technik und
        Räumlichkeiten sowie für die Sicherheit am Veranstaltungsort ist der
        Auftraggeber verantwortlich. Gesetzliche Haftungsvorschriften, die
        zwingend gelten, bleiben unberührt.
      </p>

      <h3>12. Datenschutz</h3>
      <p>
        Informationen zur Verarbeitung personenbezogener Daten findet ihr in
        unserer Datenschutzerklärung.
      </p>

      <h3>13. Schlussbestimmungen</h3>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland. Nebenabreden und
        Änderungen bedürfen der Textform. Sollte eine Bestimmung dieser AGB
        unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen
        davon unberührt; es gelten insoweit die gesetzlichen Vorschriften.
      </p>

      <p class="legal-stand">Stand: ${LEGAL_STAND}</p>
    `;
    },
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
    // Seite erst wieder scrollbar machen, wenn dahinter kein Buchungsfenster
    // (von dem aus die Datenschutzerklärung geöffnet worden sein kann) offen ist.
    const bookingModal = document.getElementById("booking-modal");
    if (!bookingModal || bookingModal.classList.contains("hidden")) {
      document.body.style.overflow = "";
    }
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

/* --------------------------------------------------------------------------
   13) "SEITE TEILEN"-BUTTON
   --------------------------------------------------------------------------
   Nutzt auf Smartphones das native Teilen-Menü (WhatsApp, Instagram, …)
   über die Web-Share-API. Wo die nicht verfügbar ist (die meisten
   Desktop-Browser), wird die Adresse stattdessen in die Zwischenablage
   kopiert und das per Toast bestätigt.
   -------------------------------------------------------------------------- */
function initShareButton() {
  const btn = document.getElementById("share-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const shareData = {
      title: "Who Knows? — Live-Band für Rock, Blues & Country",
      text: "Sechsköpfige Live-Band aus Brandoberndorf — schaut mal rein!",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Abbruch durch die Person ist kein Fehler — still ignorieren.
        if (err.name !== "AbortError") console.error(err);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link kopiert — jetzt einfach einfügen und teilen!");
    } catch (err) {
      console.error(err);
      showToast("Link konnte nicht kopiert werden.", true);
    }
  });
}

/* --------------------------------------------------------------------------
   14) HERO-PARALLAX
   --------------------------------------------------------------------------
   Bewegt das Hintergrundfoto im Hero beim Scrollen minimal langsamer als
   den Text davor — erzeugt Tiefe, ohne aufdringlich zu wirken. Wird
   komplett übersprungen, wenn "Bewegung reduzieren" aktiv ist oder auf
   kleinen Touch-Geräten (dort kostet es nur Performance und fällt kaum
   auf). Läuft über requestAnimationFrame, damit das Scrollen flüssig
   bleibt.
   -------------------------------------------------------------------------- */
function initHeroParallax() {
  const hero = document.getElementById("top");
  const heroImg = document.querySelector("#top > img[aria-hidden='true']");
  if (!hero || !heroImg) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallScreen = window.matchMedia("(max-width: 767px)").matches;
  if (prefersReducedMotion || isSmallScreen) return;

  // Bild leicht vergrößern, damit beim Verschieben unten kein Rand entsteht
  heroImg.style.transform = "scale(1.08)";

  let ticking = false;

  function update() {
    ticking = false;
    const offset = window.scrollY;
    // Nur rechnen, solange der Hero-Bereich überhaupt noch im Bild ist
    if (offset > hero.offsetHeight) return;
    heroImg.style.transform = `translate3d(0, ${offset * 0.25}px, 0) scale(1.08)`;
  }

  function onScroll() {
    if (ticking) return;
    window.requestAnimationFrame(update);
    ticking = true;
  }

  /* "will-change" nur setzen, solange der Hero sichtbar ist: sonst hält der
     Browser das große Hintergrundbild dauerhaft in einer eigenen
     Grafikebene vor, was den Rest der Seite beim Scrollen ausbremst. Der
     Observer steuert bewusst NUR diese Optimierung — die Parallax-Berechnung
     selbst hängt nicht von ihm ab, damit sie auch dann zuverlässig läuft,
     wenn der erste Observer-Callback verzögert eintrifft. */
  const observer = new IntersectionObserver(
    ([entry]) => {
      heroImg.style.willChange = entry.isIntersecting ? "transform" : "auto";
    },
    { threshold: 0 }
  );
  observer.observe(hero);

  window.addEventListener("scroll", onScroll, { passive: true });
  update(); // Startzustand sofort setzen
}

/* --------------------------------------------------------------------------
   15) SANFTES SCROLLEN BEI ANKER-LINKS
   --------------------------------------------------------------------------
   Ersetzt das früher global gesetzte CSS "scroll-behavior: smooth" (siehe
   Kommentar in style.css, Abschnitt "GRUNDLAGEN"): Dort wurde jeder
   Scroll-Vorgang animiert — auch Pfeiltasten und Mausrad —, was sich träge
   angefühlt hat. Jetzt wird nur noch beim Klick auf Menü-/Anker-Links sanft
   gescrollt, normales Scrollen bleibt direkt und reaktionsschnell.
   -------------------------------------------------------------------------- */
function initSmoothAnchors() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href").slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      history.replaceState(null, "", `#${targetId}`);
    });
  });
}


/* --------------------------------------------------------------------------
   16) ANKÜNDIGUNGS-BANNER
   --------------------------------------------------------------------------
   Liest das Dokument settings/announcement aus Firestore ({ text, active })
   und zeigt es als auffälligen Streifen ganz oben. Verwaltet wird es im
   Admin-Bereich unter "Übersicht". Schließt ein Besucher den Banner mit dem
   ×, bleibt er für diese Sitzung zu — bei geändertem Text erscheint er
   wieder. Die Höhe des Banners wird als CSS-Variable --announcement-h
   bereitgestellt, damit Hero-Abstand und Anker-Sprünge (siehe style.css)
   nicht unter der fixierten Kopfzeile verschwinden.
   -------------------------------------------------------------------------- */
function loadAnnouncement() {
  const bar = document.getElementById("announcement-bar");
  const textEl = document.getElementById("announcement-text");
  const closeBtn = document.getElementById("announcement-close");
  if (!bar || !textEl || !isFirebaseConfigured()) return;

  const STORAGE_KEY = "wk_announcement_dismissed";
  let currentText = "";

  function updateOffset() {
    const h = bar.classList.contains("is-visible") ? bar.offsetHeight : 0;
    document.documentElement.style.setProperty("--announcement-h", `${h}px`);
  }

  closeBtn?.addEventListener("click", () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, currentText);
    } catch (e) {
      /* Speicher nicht verfügbar — Banner schließt sich trotzdem */
    }
    bar.classList.remove("is-visible");
    updateOffset();
  });

  window.addEventListener("resize", updateOffset);

  fbDb
    .collection("settings")
    .doc("announcement")
    .onSnapshot(
      (doc) => {
        const data = doc.exists ? doc.data() : null;
        const text = data && data.active ? String(data.text || "").trim() : "";
        currentText = text;

        let dismissed = "";
        try {
          dismissed = sessionStorage.getItem(STORAGE_KEY) || "";
        } catch (e) {
          /* ignorieren */
        }

        if (!text || dismissed === text) {
          bar.classList.remove("is-visible");
        } else {
          textEl.textContent = text;
          bar.classList.add("is-visible");
        }
        updateOffset();
      },
      (err) => console.error("[Who Knows?] Ankündigung konnte nicht geladen werden:", err)
    );
}


/* --------------------------------------------------------------------------
   17) BANDMITGLIEDER AUS FIREBASE
   --------------------------------------------------------------------------
   Verwaltbar im Admin-Bereich unter "Band" (Name, Rolle, Text, Foto-Pfad,
   Reihenfolge). Sobald dort mindestens ein Mitglied steht, ersetzt diese
   Liste die fest im HTML eingebauten Karten komplett; solange nichts
   gepflegt ist (oder ohne Firebase), bleiben die eingebauten stehen.
   Foto: Pfad zu einer Datei im Repository (z. B. assets/img/band/tim.jpg)
   oder eine vollständige Web-Adresse; ohne Foto erscheinen die Initialen.
   -------------------------------------------------------------------------- */
function loadBandMembers() {
  const grid = document.getElementById("band-grid");
  if (!grid || !isFirebaseConfigured()) return;

  // Sortierung: erst nach "order" (kleinste zuerst, ohne Angabe ganz ans
  // Ende), bei Gleichstand nach Anlage-Zeitpunkt.
  function orderValue(m) {
    const n = Number(m.order);
    return m.order === null || m.order === undefined || m.order === "" || !Number.isFinite(n) ? 999 : n;
  }
  function createdValue(m) {
    return m.createdAt && m.createdAt.toMillis ? m.createdAt.toMillis() : 0;
  }

  fbDb.collection("band").onSnapshot(
    (snapshot) => {
      if (snapshot.empty) return; // fest eingebaute Karten bleiben stehen

      const members = snapshot.docs
        .map((doc) => doc.data())
        .sort((a, b) => orderValue(a) - orderValue(b) || createdValue(a) - createdValue(b));

      grid.innerHTML = "";
      members.forEach((m) => {
        const article = document.createElement("article");
        // Bewusst ohne "reveal"-Klasse: nachträglich eingefügte Karten
        // würden vom Scroll-Observer nicht mehr erfasst und unsichtbar bleiben.
        article.className = "member-card rounded-md p-6";

        const initials = String(m.name || "?").trim().slice(0, 2).toUpperCase();
        const photoWrap = document.createElement("div");
        photoWrap.className =
          "member-photo w-full aspect-[4/5] rounded-md mb-5 overflow-hidden flex items-center justify-center";

        function showInitials() {
          photoWrap.innerHTML = "";
          photoWrap.classList.add("text-paper-dim", "font-display", "text-3xl");
          photoWrap.textContent = initials;
        }

        if (m.photo) {
          const img = document.createElement("img");
          img.src = m.photo;
          img.alt = `Porträt von ${m.name || "Bandmitglied"}`;
          img.className = "w-full h-full object-contain";
          img.loading = "lazy";
          img.onerror = showInitials; // falscher Pfad -> Initialen statt kaputtem Bild
          photoWrap.appendChild(img);
        } else {
          showInitials();
        }
        article.appendChild(photoWrap);

        if (m.role) {
          const role = document.createElement("span");
          role.className = "role-tag text-xs px-3 py-1 rounded-sm mb-3";
          role.textContent = m.role;
          article.appendChild(role);
        }

        const name = document.createElement("h3");
        name.className = "font-display text-2xl mb-2";
        name.textContent = m.name || "";
        article.appendChild(name);

        if (m.bio) {
          const bio = document.createElement("p");
          bio.className = "text-paper-dim text-sm leading-relaxed";
          bio.textContent = m.bio;
          article.appendChild(bio);
        }

        grid.appendChild(article);
      });
    },
    (err) => console.error("[Who Knows?] Bandmitglieder konnten nicht geladen werden:", err)
  );
}

/* --------------------------------------------------------------------------
   18) BUCHUNGSFORMULAR IN SCHRITTEN + KALENDER
   --------------------------------------------------------------------------
   Das Formular ist in drei Schritte geteilt (Termin → Details → Kontakt) mit
   Fortschrittsbalken. Jeder Schritt wird einzeln geprüft; beim Absenden
   werden zur Sicherheit noch einmal alle Schritte kontrolliert.

   Im Kalender sind gesperrt: vergangene Tage, heute und alle Tage, an denen
   laut Terminliste (Admin → Termine) schon ein Auftritt steht. Das Datum
   landet im versteckten Feld "event_date" (Format JJJJ-MM-TT) — damit
   funktionieren E-Mail-Versand und Admin-Bereich unverändert.
   -------------------------------------------------------------------------- */
function initBookingWizard(form) {
  const stepEls = Array.from(form.querySelectorAll(".booking-step"));
  const indicators = Array.from(form.querySelectorAll("[data-step-indicator]"));
  const barFill = document.getElementById("booking-bar-fill");
  const backBtn = document.getElementById("booking-back");
  const nextBtn = document.getElementById("booking-next");
  const submitBtn = document.getElementById("booking-submit");
  const summaryEl = document.getElementById("booking-summary");
  const dateInput = document.getElementById("booking-date");
  const calEl = document.getElementById("booking-calendar");
  const total = stepEls.length;
  if (!total || !dateInput || !calEl) return null;

  let current = 0;
  const calendar = initBookingCalendar(calEl, dateInput, () => clearFieldError(dateInput));

  function prettyDate(isoStr) {
    const [y, m, d] = isoStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("de-DE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function updateSummary() {
    if (!summaryEl) return;
    const type = form.elements.event_type ? form.elements.event_type.value : "";
    const loc = form.elements.location ? form.elements.location.value.trim() : "";
    const parts = [dateInput.value ? `Euer Wunschtermin: ${prettyDate(dateInput.value)}` : "", type, loc];
    summaryEl.textContent = parts.filter(Boolean).join(" · ");
  }

  function focusFirst() {
    if (current === 0) {
      calendar.focus();
      return;
    }
    stepEls[current].querySelector("input:not([type=hidden]), select, textarea")?.focus();
  }

  function goTo(index, opts = {}) {
    current = Math.max(0, Math.min(total - 1, index));
    stepEls.forEach((el, i) => { el.hidden = i !== current; });
    indicators.forEach((li, i) => {
      li.classList.toggle("is-active", i === current);
      li.classList.toggle("is-done", i < current);
      if (i === current) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    if (barFill) barFill.style.width = `${((current + 1) / total) * 100}%`;
    if (backBtn) backBtn.hidden = current === 0;
    if (nextBtn) nextBtn.hidden = current === total - 1;
    if (submitBtn) submitBtn.hidden = current !== total - 1;
    if (current === total - 1) updateSummary();

    // Einblend-Animation des Schritts neu starten
    const el = stepEls[current];
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";

    form.closest(".modal-panel")?.scrollTo({ top: 0 });
    if (opts.focus !== false) focusFirst();
  }

  function next() {
    if (!validateForm(stepEls[current])) {
      if (current === 0 && !dateInput.value) calendar.focus();
      return false;
    }
    goTo(current + 1);
    return true;
  }

  function validateAll() {
    for (let i = 0; i < total; i++) {
      if (!validateForm(stepEls[i])) {
        goTo(i, { focus: false });
        validateForm(stepEls[i]); // nochmal, damit das Feld jetzt (sichtbar) den Fokus bekommt
        if (i === 0 && !dateInput.value) calendar.focus();
        return false;
      }
    }
    return true;
  }

  nextBtn?.addEventListener("click", next);
  backBtn?.addEventListener("click", () => goTo(current - 1));

  // Enter in einem Eingabefeld soll in Schritt 1–2 "Weiter" bedeuten, nicht Absenden.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && current < total - 1) {
      e.preventDefault();
      next();
    }
  });

  // Ändert sich die Terminliste, während das Fenster offen ist, Kalender neu zeichnen.
  document.addEventListener("wk:shows-updated", () => calendar.render());

  goTo(0, { focus: false });

  return {
    isLastStep: () => current === total - 1,
    next,
    validateAll,
    onOpen() { calendar.render(); focusFirst(); },
    reset() {
      dateInput.value = "";
      calendar.reset();
      goTo(0, { focus: false });
    },
  };
}

function initBookingCalendar(calEl, dateInput, onPick) {
  const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const MAX_MONTHS_AHEAD = 24;

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const minDate = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return addDays(t, 1); }; // frühestens morgen

  let view = new Date(minDate().getFullYear(), minDate().getMonth(), 1);
  let focusIso = null;

  // Nicht buchbar sind Tage mit einem Auftritt (Admin → Termine) und alle
  // Tage, die im Admin unter "Kalender" gesperrt wurden. Besucher sehen nur
  // "nicht verfügbar" — nie den Grund.
  function takenMap() {
    const showDates = new Set();
    shows.forEach((s) => { if (s && s.date) showDates.add(s.date); });
    return { has: (key) => showDates.has(key) || blockedRanges.some((r) => key >= r.from && key <= r.to) };
  }

  function render() {
    const taken = takenMap();
    const min = minDate();
    const todayKey = iso(addDays(min, -1));
    const y = view.getFullYear();
    const m = view.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7; // Woche beginnt am Montag

    // Ein inzwischen vergebenes Datum darf nicht ausgewählt bleiben.
    if (dateInput.value && taken.has(dateInput.value)) dateInput.value = "";
    const sel = dateInput.value;

    const inView = (key) => { const d = fromIso(key); return d.getFullYear() === y && d.getMonth() === m; };
    let tabKey = focusIso && inView(focusIso) ? focusIso : sel && inView(sel) ? sel : null;
    if (!tabKey) {
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m, d);
        if (dt >= min && !taken.has(iso(dt))) { tabKey = iso(dt); break; }
      }
    }
    if (!tabKey) tabKey = iso(new Date(y, m, 1));

    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
    const maxMonth = new Date(min.getFullYear(), min.getMonth() + MAX_MONTHS_AHEAD, 1);

    calEl.innerHTML = "";

    const head = document.createElement("div");
    head.className = "cal-head";
    head.innerHTML = `
      <button type="button" class="cal-nav" data-cal-nav="-1" aria-label="Vorheriger Monat"${view <= minMonth ? " disabled" : ""}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <span class="cal-title" aria-live="polite">${MONTHS[m]} ${y}</span>
      <button type="button" class="cal-nav" data-cal-nav="1" aria-label="Nächster Monat"${view >= maxMonth ? " disabled" : ""}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
      </button>`;
    calEl.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "cal-grid";
    WEEKDAYS.forEach((w) => {
      const s = document.createElement("span");
      s.className = "cal-dow";
      s.textContent = w;
      grid.appendChild(s);
    });
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement("span"));

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d);
      const key = iso(dt);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-day";
      btn.textContent = String(d);
      btn.dataset.date = key;
      btn.tabIndex = key === tabKey ? 0 : -1;
      const label = `${d}. ${MONTHS[m]} ${y}`;

      if (dt < min) {
        btn.setAttribute("aria-disabled", "true");
        btn.setAttribute("aria-label", `${label}, nicht verfügbar`);
      } else if (taken.has(key)) {
        btn.classList.add("is-taken");
        btn.setAttribute("aria-disabled", "true");
        btn.setAttribute("aria-label", `${label}, nicht verfügbar`);
        btn.title = "Nicht verfügbar";
      } else {
        btn.setAttribute("aria-label", label);
      }
      if (key === sel) { btn.classList.add("is-selected"); btn.setAttribute("aria-pressed", "true"); }
      if (key === todayKey) btn.classList.add("is-today");
      grid.appendChild(btn);
    }
    calEl.appendChild(grid);

    const foot = document.createElement("div");
    foot.className = "cal-foot";
    const selText = document.createElement("p");
    selText.className = "cal-selected";
    selText.textContent = sel
      ? `Gewählt: ${fromIso(sel).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
      : "Bitte wählt einen freien Tag.";
    foot.appendChild(selText);
    const legend = document.createElement("p");
    legend.className = "cal-legend";
    legend.innerHTML = '<span><i class="cal-key cal-key--sel"></i> Euer Wunschtermin</span><span><i class="cal-key cal-key--taken"></i> Nicht verfügbar</span>';
    foot.appendChild(legend);
    calEl.appendChild(foot);
  }

  function pick(key) {
    dateInput.value = key;
    focusIso = key;
    render();
    onPick?.();
    calEl.querySelector(".cal-day.is-selected")?.focus();
  }

  function focusDate(dt) {
    const min = minDate();
    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
    const maxEnd = new Date(min.getFullYear(), min.getMonth() + MAX_MONTHS_AHEAD + 1, 0);
    if (dt < minMonth || dt > maxEnd) return;
    focusIso = iso(dt);
    view = new Date(dt.getFullYear(), dt.getMonth(), 1);
    render();
    calEl.querySelector(`.cal-day[data-date="${focusIso}"]`)?.focus();
  }

  calEl.addEventListener("click", (e) => {
    const day = e.target.closest(".cal-day");
    if (day) {
      if (day.getAttribute("aria-disabled") === "true") return;
      pick(day.dataset.date);
      return;
    }
    const nav = e.target.closest("[data-cal-nav]");
    if (nav && !nav.disabled) {
      view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.calNav), 1);
      focusIso = null;
      render();
    }
  });

  calEl.addEventListener("keydown", (e) => {
    const day = e.target.closest(".cal-day");
    if (!day) return;
    const cur = fromIso(day.dataset.date);
    const dow = (cur.getDay() + 6) % 7;
    let target = null;
    switch (e.key) {
      case "ArrowLeft": target = addDays(cur, -1); break;
      case "ArrowRight": target = addDays(cur, 1); break;
      case "ArrowUp": target = addDays(cur, -7); break;
      case "ArrowDown": target = addDays(cur, 7); break;
      case "Home": target = addDays(cur, -dow); break;
      case "End": target = addDays(cur, 6 - dow); break;
      case "PageUp": target = new Date(cur.getFullYear(), cur.getMonth() - 1, cur.getDate()); break;
      case "PageDown": target = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()); break;
      default: return;
    }
    e.preventDefault();
    focusDate(target);
  });

  render();

  return {
    render,
    focus() { calEl.querySelector('.cal-day[tabindex="0"]')?.focus(); },
    reset() {
      view = new Date(minDate().getFullYear(), minDate().getMonth(), 1);
      focusIso = null;
      render();
    },
  };
}


/* --------------------------------------------------------------------------
   19) GESPERRTE TAGE FÜR DAS BUCHUNGSFORMULAR
   --------------------------------------------------------------------------
   Liest die im Admin-Bereich unter "Kalender" gepflegten Sperren (Collection
   "blocked": { from, to }, bis einschließlich). Bewusst NUR die Datumsangaben:
   der interne Grund liegt in einer eigenen, nicht öffentlichen Collection.
   -------------------------------------------------------------------------- */
let blockedRanges = [];

function loadBlockedDates() {
  if (!isFirebaseConfigured()) return;
  fbDb.collection("blocked").onSnapshot(
    (snapshot) => {
      blockedRanges = snapshot.docs
        .map((doc) => doc.data())
        .filter((r) => r.from && r.to)
        .map((r) => ({ from: r.from, to: r.to }));
      document.dispatchEvent(new Event("wk:shows-updated")); // Buchungs-Kalender neu zeichnen
    },
    (err) => console.error("[Who Knows?] Gesperrte Tage konnten nicht geladen werden:", err)
  );
}

/* --------------------------------------------------------------------------
   20) ZÄHLER PRO TAG (Aufrufe, Buchungsfenster, Instagram)
   --------------------------------------------------------------------------
   Schreibt anonyme Tageszahlen nach stats/day-JJJJ-MM-TT ({ date, views,
   bookingOpen, instagram }) — nur Zahlen, keine IP-Adresse, nichts im
   Browser. Im Admin-Bereich als Verlauf (Übersicht) sichtbar. Die
   Firestore-Regeln erlauben Besuchern nur ein Hochzählen um 1.
   -------------------------------------------------------------------------- */
function countEvent(field) {
  if (!isFirebaseConfigured()) return;
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  fbDb
    .collection("stats")
    .doc(`day-${date}`)
    .set({ date, [field]: firebase.firestore.FieldValue.increment(1) }, { merge: true })
    .catch((err) => console.error("[Who Knows?] Tageszähler fehlgeschlagen:", err));
}

/* Klicks auf Elemente mit data-track="instagram" zählen (z. B. die beiden
   Instagram-Icons in der Kopfzeile). */
function initClickTracking() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (el) countEvent(el.dataset.track);
  });
}

/* --------------------------------------------------------------------------
   21) SEITEN-EINSTELLUNGEN AUS DEM ADMIN-BEREICH
   --------------------------------------------------------------------------
   Liest settings/site: Impressums-Angaben (Name, Anschrift, E-Mail), den
   Instagram-Link und drei Texte der Startseite. Leere Felder bedeuten: die
   im Code/HTML hinterlegte Standardvariante bleibt. Die Startseite ist
   beim Laden noch vom Ladebildschirm verdeckt, ein kurzes Umspringen der
   Texte fällt deshalb nicht auf.
   -------------------------------------------------------------------------- */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadSiteSettings() {
  if (!isFirebaseConfigured()) return;
  const ownerDefaults = { ...LEGAL_OWNER };
  const textTargets = { heroClaim: "hero-claim", heroText: "hero-text", bandIntro: "band-intro" };
  Object.values(textTargets).forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.dataset.default === undefined) el.dataset.default = el.textContent.trim();
  });

  fbDb
    .collection("settings")
    .doc("site")
    .onSnapshot(
      (doc) => {
        const s = doc.exists ? doc.data() : {};

        // Impressum / Datenschutzerklärung (HTML-escaped, da als HTML eingefügt)
        LEGAL_OWNER.name = s.ownerName ? escapeHtml(s.ownerName) : ownerDefaults.name;
        LEGAL_OWNER.street = s.ownerStreet ? escapeHtml(s.ownerStreet) : ownerDefaults.street;
        LEGAL_OWNER.city = s.ownerCity ? escapeHtml(s.ownerCity) : ownerDefaults.city;
        LEGAL_OWNER.email = s.contactEmail ? escapeHtml(s.contactEmail) : ownerDefaults.email;

        // Instagram-Link: nur https-Adressen übernehmen (kein "javascript:" o. Ä.)
        if (typeof s.instagramUrl === "string" && /^https:\/\//i.test(s.instagramUrl)) {
          document.querySelectorAll('a[data-track="instagram"]').forEach((a) => (a.href = s.instagramUrl));
        }

        // Texte der Startseite (als reiner Text, nie als HTML)
        Object.entries(textTargets).forEach(([key, id]) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.textContent = s[key] ? s[key] : el.dataset.default;
        });
      },
      (err) => console.error("[Who Knows?] Einstellungen konnten nicht geladen werden:", err)
    );
}

/* --------------------------------------------------------------------------
   22) HÄUFIGE FRAGEN (FAQ)
   --------------------------------------------------------------------------
   Im Admin-Bereich unter "FAQ" pflegbar. Der Bereich auf der Startseite
   bleibt ausgeblendet, solange keine Frage existiert. Zusätzlich wird für
   Suchmaschinen automatisch "FAQPage"-Markup erzeugt.
   -------------------------------------------------------------------------- */
function loadFaq() {
  const section = document.getElementById("faq");
  const list = document.getElementById("faq-list");
  const footerLink = document.getElementById("faq-footer-link");
  if (!section || !list || !isFirebaseConfigured()) return;

  const orderValue = (m) => {
    const n = Number(m.order);
    return m.order === null || m.order === undefined || m.order === "" || !Number.isFinite(n) ? 999 : n;
  };
  const createdValue = (m) => (m.createdAt && m.createdAt.toMillis ? m.createdAt.toMillis() : 0);

  fbDb.collection("faq").onSnapshot(
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data())
        .filter((i) => i.question && i.answer)
        .sort((a, b) => orderValue(a) - orderValue(b) || createdValue(a) - createdValue(b));

      let ld = document.getElementById("faq-jsonld");
      if (items.length === 0) {
        section.classList.add("hidden");
        footerLink?.classList.add("hidden");
        ld?.remove();
        return;
      }

      list.innerHTML = "";
      items.forEach((item) => {
        const details = document.createElement("details");
        details.className = "faq-item";
        const summary = document.createElement("summary");
        summary.textContent = item.question;
        const answer = document.createElement("div");
        answer.className = "faq-answer";
        String(item.answer)
          .split(/\n+/)
          .filter(Boolean)
          .forEach((line) => {
            const p = document.createElement("p");
            p.textContent = line;
            answer.appendChild(p);
          });
        details.appendChild(summary);
        details.appendChild(answer);
        list.appendChild(details);
      });
      section.classList.remove("hidden");
      footerLink?.classList.remove("hidden");

      if (!ld) {
        ld = document.createElement("script");
        ld.type = "application/ld+json";
        ld.id = "faq-jsonld";
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((i) => ({
          "@type": "Question",
          name: i.question,
          acceptedAnswer: { "@type": "Answer", text: i.answer },
        })),
      });
    },
    (err) => console.error("[Who Knows?] FAQ konnte nicht geladen werden:", err)
  );
}
