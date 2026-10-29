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
  const APP_SCRIPT = "../app.js?v=20261029";
  const UNLOCK_KEY = "kk-preview-unlocked";

  const gate = document.getElementById("gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-name");
  const button = document.getElementById("gate-submit");
  const status = document.getElementById("gate-status");
  const template = document.getElementById("site");

  function unlock() {
    document.body.appendChild(template.content.cloneNode(true));
    template.remove();
    gate.remove();
    document.body.classList.remove("locked");
    document.title = "Kali & Kaden";

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
    setStatus("One moment…");

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
        sessionStorage.setItem(UNLOCK_KEY, "1");
        sessionStorage.setItem(CONFIG.GUEST_STORAGE_KEY, JSON.stringify({
          name: data.name,
          party: data.party,
          maxGuests: data.maxGuests,
          partyMembers: data.partyMembers,
        }));
        unlock();
      } else {
        setStatus("We couldn’t find that name. Try your full name as it appears on your invitation.", true);
        input.select();
        button.disabled = false;
      }
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong on our end. Please try again in a moment.", true);
      button.disabled = false;
    }
  });
})();
