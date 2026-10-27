/* =========================================================
   Preview gate (client-side, intentionally light)

   Everything on GitHub Pages is public, so this only keeps the
   in-progress site away from people who stumble on the URL. The
   password itself is not stored here, only its SHA-256 hash.

   The site markup sits inside <template id="site">, which browsers
   never render, so nothing is on screen until the password matches.
   On unlock the template is stamped into the page and app.js loads.
   On localhost the gate unlocks immediately so local development
   never needs the password.

   To change the password, run:
     python3 -c "import hashlib; print(hashlib.sha256(input().encode()).hexdigest())"
   type the new password, press Enter, and paste the output below.
   ========================================================= */
(() => {
  const PASSWORD_SHA256 = "fc747b4d14d8d5fff7a41491f4f5763aa1ff68a8d1cb8377319495cfe045db1e";
  const STORAGE_KEY = "kk-preview-unlocked";
  const APP_SCRIPT = "../app.js?v=20261026b";

  const gate = document.getElementById("gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-password");
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

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Local development: no password. Anything served from localhost or a
  // loopback address unlocks immediately.
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
  const isLocal = LOCAL_HOSTS.includes(location.hostname) || location.hostname.endsWith(".localhost");

  if (isLocal || sessionStorage.getItem(STORAGE_KEY) === "1") {
    unlock();
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const attempt = input.value;
    if (!attempt) return;

    const hash = await sha256Hex(attempt);
    if (hash === PASSWORD_SHA256) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      unlock();
    } else {
      status.textContent = "That isn’t it. Try again.";
      status.className = "form-status error";
      input.select();
    }
  });
})();
