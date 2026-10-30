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
  if (header) header.classList.toggle("menu-is-open", open);
}

menuToggle.addEventListener("click", () => setMenu(!menu.classList.contains("open")));

menu.addEventListener("click", (e) => {
  if (e.target.tagName === "A") setMenu(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

/* =========================================================
   Our Story: read more / read less
   ========================================================= */
document.querySelectorAll("[data-story-toggle]").forEach((toggle) => {
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!panel) return;
  toggle.addEventListener("click", () => {
    const open = !panel.classList.contains("is-open");
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    if (open) panel.removeAttribute("inert"); else panel.setAttribute("inert", "");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Read less" : "Read more";
    if (!open) toggle.scrollIntoView({ block: "center", behavior: "smooth" });
  });
});

/* =========================================================
   Date display + countdown
   ========================================================= */
const weddingDate = new Date(CONFIG.WEDDING_DATE_ISO);

// The hero shows the date as "08 . 14 . 27"; keep the full date in a tooltip.
const heroDateEl = document.getElementById("hero-date");
if (heroDateEl) {
  heroDateEl.title = weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CONFIG.TIMEZONE,
  });
}

/* =========================================================
   Header: transparent over the photo hero, solid after scrolling
   ========================================================= */
const header = document.querySelector(".site-header");
const hero = document.querySelector(".hero-photo");
if (header && hero) {
  const update = () => {
    const past = window.scrollY > hero.offsetHeight - header.offsetHeight;
    header.classList.toggle("over-hero", !past);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function updateCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;
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
   RSVP form (only on pages that have one)
   ========================================================= */
const form = document.getElementById("rsvp-form");
if (form) initRsvp();

function initRsvp() {
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");
const nameInput = document.getElementById("name");
const partyBlock = document.getElementById("party-block");
const soloBlock = document.getElementById("solo-block");
const guestsRow = document.getElementById("guests-row");
const guestsSelect = document.getElementById("guests");
const dietaryRow = document.getElementById("dietary-row");

// The gate stores the recognized guest (name, party, maxGuests, partyMembers).
let recognizedGuest = null;
try {
  recognizedGuest = JSON.parse(sessionStorage.getItem(CONFIG.GUEST_STORAGE_KEY) || "null");
} catch (_) {}

const partyMembers = (recognizedGuest && Array.isArray(recognizedGuest.partyMembers))
  ? recognizedGuest.partyMembers.filter(Boolean)
  : [];
const maxGuests = recognizedGuest ? Math.max(1, Number(recognizedGuest.maxGuests) || 1) : 1;
const extraSeats = recognizedGuest ? Math.max(0, maxGuests - partyMembers.length) : 0;
const partyMode = Boolean(recognizedGuest) && (partyMembers.length > 1 || extraSeats > 0);

// Previous replies for this party, returned by the gate lookup.
const replies = (recognizedGuest && Array.isArray(recognizedGuest.replies)) ? recognizedGuest.replies : [];
const hasReplied = replies.length > 0;
const replyFor = (memberName) => replies.find((r) => r.member === memberName) || null;
const ownReply = recognizedGuest ? (replyFor(recognizedGuest.name) || replies[0] || null) : null;

function formatReplyDate(stamp) {
  // Stamps are usually "2026-10-29 12:00:00" (Mountain Time), but Sheets may
  // hand back a full date string if the cell was auto-converted to a date.
  const raw = String(stamp || "");
  let d = new Date(raw.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, "$1T$2"));
  if (isNaN(d)) d = new Date(raw);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

// Pre-fill shared fields from the previous reply, if any.
if (ownReply) {
  const emailInput = document.getElementById("email");
  const dietaryInput = document.getElementById("dietary");
  const messageInput = document.getElementById("message");
  if (emailInput && !emailInput.value) emailInput.value = ownReply.email || "";
  if (dietaryInput && !dietaryInput.value) dietaryInput.value = ownReply.dietary || "";
  if (messageInput && !messageInput.value) messageInput.value = ownReply.message || "";
}
if (hasReplied) submitBtn.textContent = "Update reply";

if (recognizedGuest && nameInput && !nameInput.value) {
  nameInput.value = recognizedGuest.name || "";
}

/* ---------- Party mode: one reply per person ---------- */
function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function memberRow(name, index, checkedByDefault) {
  const prev = replyFor(name);
  const checked = prev ? true : checkedByDefault;
  const yes = prev && prev.attending === "Yes" ? "checked" : "";
  const no = prev && prev.attending === "No" ? "checked" : "";
  const when = prev ? formatReplyDate(prev.updated) : "";
  const note = prev ? `<span class="party-note">Replied${when ? " " + when : ""}</span>` : "";
  return `
    <li class="party-member" data-member="${index}">
      <label class="choice party-name">
        <input type="checkbox" name="member" value="${index}" ${checked ? "checked" : ""} />
        <span>${name}</span>
        ${note}
      </label>
      <div class="choices party-answer">
        <label class="choice">
          <input type="radio" name="attending-${index}" value="Yes" ${yes} />
          <span>Accepts</span>
        </label>
        <label class="choice">
          <input type="radio" name="attending-${index}" value="No" ${no} />
          <span>Declines</span>
        </label>
      </div>
    </li>`;
}

function extraRow(index, prefill) {
  const value = prefill ? ` value="${String(prefill).replace(/"/g, "&quot;")}"` : "";
  return `
    <li class="party-member party-extra" data-extra="${index}">
      <div class="field">
        <label for="extra-${index}" class="caps">Additional guest</label>
        <input type="text" id="extra-${index}" name="extra-${index}"${value} placeholder="Full name, if bringing someone" />
      </div>
    </li>`;
}

if (partyMode) {
  soloBlock.remove();

  const mine = recognizedGuest.name;
  const rows = partyMembers.map((n, i) => memberRow(n, i, n === mine)).join("");
  const previousExtras = replies.filter((r) => r.additional && !r.member).map((r) => r.name);
  const extras = Array.from({ length: extraSeats }, (_, i) => extraRow(i, previousExtras[i])).join("");
  const help = hasReplied
    ? "You’ve already replied. Change anything below and send it again."
    : "Tick everyone you are answering for, then let us know for each.";

  partyBlock.innerHTML = `
    <fieldset class="field party">
      <legend class="caps">Replying for</legend>
      <p class="party-help">${help}</p>
      <ul class="party-list">${rows}${extras}</ul>
    </fieldset>`;
  partyBlock.hidden = false;

  // Only checked members need an answer.
  function syncMember(li) {
    const on = li.querySelector('input[name="member"]').checked;
    li.classList.toggle("is-off", !on);
    li.querySelectorAll('input[type="radio"]').forEach((r) => {
      r.disabled = !on;
      if (!on) r.checked = false;
    });
  }
  partyBlock.querySelectorAll(".party-member[data-member]").forEach((li) => {
    syncMember(li);
    li.querySelector('input[name="member"]').addEventListener("change", () => syncMember(li));
  });
} else {
  // Solo mode: hide the guest-count dropdown when the party is one.
  if (recognizedGuest && guestsSelect) {
    Array.from(guestsSelect.options).forEach((opt) => {
      if (Number(opt.value) > maxGuests) opt.remove();
    });
    if (guestsSelect.options.length === 1) guestsRow.classList.add("hidden");
  }
  form.querySelectorAll('input[name="attending"]').forEach((radio) => {
    radio.required = true;
    radio.addEventListener("change", () => {
      const declining = radio.value === "No" && radio.checked;
      const singleSeat = guestsSelect.options.length <= 1;
      guestsRow.classList.toggle("hidden", declining || singleSeat);
      dietaryRow.classList.toggle("hidden", declining);
    });
  });

  // Restore a previous single reply.
  if (ownReply) {
    const prevRadio = form.querySelector(`input[name="attending"][value="${ownReply.attending}"]`);
    if (prevRadio) {
      prevRadio.checked = true;
      prevRadio.dispatchEvent(new Event("change"));
    }
    if (guestsSelect && ownReply.guests) {
      const opt = Array.from(guestsSelect.options).find((o) => o.value === String(ownReply.guests));
      if (opt) opt.selected = true;
    }
    const note = document.createElement("p");
    note.className = "party-help";
    note.textContent = `You replied${ownReply.updated ? " on " + formatReplyDate(ownReply.updated) : ""}. Change anything below and send it again.`;
    soloBlock.prepend(note);
  }
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "form-status" + (type ? ` ${type}` : "");
}

/* ---------- Build the payload ---------- */
function collectParty() {
  const responses = [];
  let problem = null;

  partyBlock.querySelectorAll(".party-member[data-member]").forEach((li) => {
    const index = Number(li.dataset.member);
    const on = li.querySelector('input[name="member"]').checked;
    if (!on) return;
    const answer = li.querySelector(`input[name="attending-${index}"]:checked`);
    if (!answer) {
      problem = problem || `Please let us know whether ${partyMembers[index]} accepts or declines.`;
      return;
    }
    responses.push({ name: partyMembers[index], attending: answer.value });
  });

  partyBlock.querySelectorAll(".party-member[data-extra] input").forEach((input) => {
    const name = input.value.trim();
    if (name) responses.push({ name, attending: "Yes", additional: true });
  });

  if (!problem && responses.length === 0) problem = "Please tick at least one person to reply for.";
  return { responses, problem };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const fields = Object.fromEntries(new FormData(form).entries());

  // Honeypot filled => likely a bot. Pretend success, do nothing.
  if (fields.website) {
    setStatus("Thank you. Your reply has been received.", "success");
    form.reset();
    return;
  }

  let payload;
  if (partyMode) {
    const { responses, problem } = collectParty();
    if (problem) {
      setStatus(problem, "error");
      return;
    }
    payload = {
      action: "rsvp",
      submittedBy: fields.name,
      email: fields.email,
      party: recognizedGuest.party || "",
      dietary: fields.dietary || "",
      message: fields.message || "",
      responses,
    };
  } else {
    payload = {
      action: "rsvp",
      name: fields.name,
      email: fields.email,
      attending: fields.attending,
      guests: fields.attending === "No" ? "0" : (fields.guests || "1"),
      dietary: fields.attending === "No" ? "" : (fields.dietary || ""),
      message: fields.message || "",
      party: (recognizedGuest && recognizedGuest.party) || "",
    };
  }

  submitBtn.disabled = true;
  setStatus("Sending…");

  try {
    if (!CONFIG.APPS_SCRIPT_URL) {
      console.info("[demo] RSVP payload:", payload);
      await new Promise((r) => setTimeout(r, 600));
    } else {
      // A string body is sent as text/plain, which avoids a CORS preflight.
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown error");
    }

    const count = partyMode ? payload.responses.length : 1;
    const verb = hasReplied ? "updated" : "received";
    setStatus(count > 1 ? `Thank you. Your replies for ${count} people have been ${verb}.` : `Thank you. Your reply has been ${verb}.`, "success");
    submitBtn.disabled = true;
    submitBtn.textContent = hasReplied ? "Updated" : "Sent";
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Please try again or reach out to Kaden or Kali.", "error");
    submitBtn.disabled = false;
  }
});
}
