/* =========================================================
   Configuration lives in config.js (shared with the gate).
   ========================================================= */
const CONFIG = window.KK_CONFIG;

/* =========================================================
   Full-screen menu
   ========================================================= */
const menuToggle = document.querySelector(".menu-toggle");
const menu = document.getElementById("menu");

function setMenu(open) {
  menu.classList.toggle("open", open);
  menu.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.classList.toggle("menu-open", open);
}

menuToggle.addEventListener("click", () => setMenu(!menu.classList.contains("open")));

menu.addEventListener("click", (e) => {
  if (e.target.tagName === "A") setMenu(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

/* =========================================================
   Date display + countdown
   ========================================================= */
const weddingDate = new Date(CONFIG.WEDDING_DATE_ISO);

document.getElementById("hero-date").textContent = weddingDate.toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: CONFIG.TIMEZONE,
});

function updateCountdown() {
  const el = document.getElementById("countdown");
  const diffMs = weddingDate.getTime() - Date.now();
  if (diffMs <= 0) {
    el.textContent = "Today is the day";
    return;
  }
  const days = Math.floor(diffMs / 86_400_000);
  el.textContent = days === 1 ? "One day away" : `${days} days away`;
}
updateCountdown();
setInterval(updateCountdown, 60_000);

/* =========================================================
   RSVP form
   ========================================================= */
const form = document.getElementById("rsvp-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");
const guestsRow = document.getElementById("guests-row");
const dietaryRow = document.getElementById("dietary-row");
const guestsSelect = document.getElementById("guests");

// If the gate recognized this visitor, pre-fill their name and cap the
// guest count at what their household was invited with.
let recognizedGuest = null;
try {
  recognizedGuest = JSON.parse(sessionStorage.getItem(CONFIG.GUEST_STORAGE_KEY) || "null");
} catch (_) {}

if (recognizedGuest) {
  const nameInput = document.getElementById("name");
  if (nameInput && !nameInput.value) nameInput.value = recognizedGuest.name || "";

  const max = Number(recognizedGuest.maxGuests);
  if (guestsSelect && max >= 1) {
    Array.from(guestsSelect.options).forEach((opt) => {
      if (Number(opt.value) > max) opt.remove();
    });
    if (guestsSelect.options.length === 1) guestsRow.classList.add("hidden");
  }
}

// Hide guest-count/dietary fields when declining.
form.querySelectorAll('input[name="attending"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const declining = radio.value === "No" && radio.checked;
    guestsRow.classList.toggle("hidden", declining);
    dietaryRow.classList.toggle("hidden", declining);
  });
});

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "form-status" + (type ? ` ${type}` : "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  // Honeypot filled => likely a bot. Pretend success, do nothing.
  if (data.website) {
    setStatus("Thank you. Your reply has been received.", "success");
    form.reset();
    return;
  }
  delete data.website;

  if (data.attending === "No") {
    data.guests = "0";
    data.dietary = "";
  }

  if (recognizedGuest && recognizedGuest.party) data.party = recognizedGuest.party;

  submitBtn.disabled = true;
  setStatus("Sending\u2026");

  try {
    if (!CONFIG.APPS_SCRIPT_URL) {
      // Demo mode: no backend configured yet.
      console.info("[demo] RSVP payload:", data);
      await new Promise((r) => setTimeout(r, 600));
    } else {
      // A string body is sent as text/plain, which avoids a CORS preflight.
      // Apps Script web apps accept this and return a readable JSON response.
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown error");
    }

    setStatus("Thank you. Your reply has been received.", "success");
    form.reset();
    if (guestsSelect.options.length > 1) guestsRow.classList.remove("hidden");
    dietaryRow.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Please try again or email us directly.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
