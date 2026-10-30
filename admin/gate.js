/* =========================================================
   Guest gate (client-side, intentionally light)

   Visitors type their name. The Apps Script checks it against the
   "Guests" tab of the spreadsheet and answers yes or no, so the guest
   list never lives in this public repo. Anyone who guesses an
   invitee's name gets in; this keeps out strangers, not adversaries.

   The site markup sits inside <template id="site">, which browsers
   never render, so nothing is on screen until a name is recognized.
   On unlock the template is stamped into the page and app.js loads.

   On localhost the gate unlocks immediately. Add ?gate to the URL to
   force it on locally for testing.
   ========================================================= */
(() => {
  const CONFIG = window.KK_CONFIG;
  const APP_SCRIPT = "/app.js?v=20261030g";
  const UNLOCK_KEY = "kk-preview-unlocked";

  const gate = document.getElementById("gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-name");
  const button = document.getElementById("gate-submit");
  const status = document.getElementById("gate-status");
  const loading = document.getElementById("gate-loading");
  const loadingText = document.getElementById("gate-loading-text");
  const template = document.getElementById("site");

  /* ---------- Loading state: a heartbeat and a few playful lines ---------- */
  const LOADING_LINES = [
    "Checking the guest list…",
    "Checking it twice…",
    "Dusting off the good china…",
    "Saving you a seat…",
    "Telling the band you’re here…",
  ];
  let loadingTimer = null;

  function startLoading() {
    status.textContent = "";
    status.className = "form-status";
    status.hidden = true;
    button.hidden = true;
    loading.hidden = false;
    let i = 0;
    loadingText.textContent = LOADING_LINES[0];
    loadingText.classList.add("is-in");
    loadingTimer = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length;
      loadingText.classList.remove("is-in");
      setTimeout(() => {
        loadingText.textContent = LOADING_LINES[i];
        loadingText.classList.add("is-in");
      }, 250);
    }, 1600);
  }

  function stopLoading() {
    clearInterval(loadingTimer);
    loadingTimer = null;
    loading.hidden = true;
    status.hidden = false;
    button.hidden = false;
  }

  /* ---------- Welcome card shown once after a successful check ---------- */
  const WELCOMED_KEY = "kk-welcomed";

  function firstName(full) {
    return String(full || "").trim().split(/\s+/)[0] || "friend";
  }

  function showWelcome(guest) {
    if (sessionStorage.getItem(WELCOMED_KEY) === "1") return;
    sessionStorage.setItem(WELCOMED_KEY, "1");

    const name = firstName(guest.name);
    const others = Array.isArray(guest.partyMembers) && guest.partyMembers.length > 1;

    const wrap = document.createElement("div");
    wrap.className = "welcome";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "welcome-title");
    wrap.innerHTML = `
      <div class="welcome-backdrop"></div>
      <div class="welcome-card">
        <p class="caps label">Kaden <span class="brand-and">and</span> Kali</p>
        <h2 id="welcome-title" class="display">Hi, ${name}.</h2>
        <p class="welcome-text">
          We love you, and we are so excited for you${others ? " and yours" : ""} to join us
          in the mountains next August. Thank you for being part of our story.
        </p>
        <p class="welcome-heart" aria-hidden="true">&#9825;</p>
        <button type="button" class="button button-ink" id="welcome-close">Can’t wait</button>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("welcome-open");

    const close = () => {
      wrap.classList.add("is-leaving");
      document.body.classList.remove("welcome-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(() => wrap.remove(), 350);
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };

    wrap.querySelector("#welcome-close").addEventListener("click", close);
    wrap.querySelector(".welcome-backdrop").addEventListener("click", close);
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => {
      wrap.classList.add("is-open");
      wrap.querySelector("#welcome-close").focus();
    });
  }

  function unlock() {
    document.body.appendChild(template.content.cloneNode(true));
    template.remove();
    gate.remove();
    document.body.classList.remove("locked");
    document.title = document.title.replace(/\s*·\s*Preview$/, "");

    const script = document.createElement("script");
    script.src = APP_SCRIPT;
    document.body.appendChild(script);
  }

  function setStatus(text, isError) {
    status.textContent = text;
    status.className = "form-status" + (isError ? " error" : "");
  }

  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
  const isLocal = LOCAL_HOSTS.includes(location.hostname) || location.hostname.endsWith(".localhost");
  const forceGate = new URLSearchParams(location.search).has("gate");

  if ((isLocal && !forceGate) || sessionStorage.getItem(UNLOCK_KEY) === "1") {
    unlock();
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;

    button.disabled = true;
    startLoading();

    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "lookup", name }),
      });
      const data = await res.json();

      if (!data.ok || typeof data.found !== "boolean") {
        throw new Error(data.error || "Unexpected response");
      }

      if (data.found) {
        const guest = {
          name: data.name,
          party: data.party,
          maxGuests: data.maxGuests,
          partyMembers: data.partyMembers,
          replies: data.replies || [],
        };
        sessionStorage.setItem(UNLOCK_KEY, "1");
        sessionStorage.setItem(CONFIG.GUEST_STORAGE_KEY, JSON.stringify(guest));
        stopLoading();
        unlock();
        showWelcome(guest);
      } else {
        stopLoading();
        setStatus(
          "We couldn’t find that name, sorry. Try another spelling, or your full first and last name as written on your invitation. " +
          "If you’re still having trouble, reach out to Kaden or Kali and we’ll get you in.",
          false
        );
        input.select();
        button.disabled = false;
      }
    } catch (err) {
      console.error(err);
      stopLoading();
      setStatus("Something went wrong on our end. Please try again in a moment.", true);
      button.disabled = false;
    }
  });
})();
