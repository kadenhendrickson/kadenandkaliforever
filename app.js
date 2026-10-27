/* =========================================================
   CONFIG — edit these values
   ========================================================= */
const CONFIG = {
  // Paste the "Web app" URL from your Apps Script deployment here.
  // Leave empty to run the form in demo mode (logs to console, no network).
  APPS_SCRIPT_URL: "",

  // Wedding date/time. Everyone is on the US West Coast, so this is
  // interpreted in America/Los_Angeles (PDT in June = UTC-7).
  WEDDING_DATE_ISO: "2027-06-12T16:00:00-07:00",
  TIMEZONE: "America/Los_Angeles",
};

/* =========================================================
   Mobile nav
   ========================================================= */
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.getElementById("nav-links");

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
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
    el.textContent = "Today's the day!";
    return;
  }
  const days = Math.floor(diffMs / 86_400_000);
  el.textContent = days === 1 ? "1 day to go" : `${days} days to go`;
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
    setStatus("Thank you! Your RSVP has been received.", "success");
    form.reset();
    return;
  }
  delete data.website;

  if (data.attending === "No") {
    data.guests = "0";
    data.dietary = "";
  }

  submitBtn.disabled = true;
  setStatus("Sending…");

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

    setStatus("Thank you! Your RSVP has been received.", "success");
    form.reset();
    guestsRow.classList.remove("hidden");
    dietaryRow.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Please try again or email us directly.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
