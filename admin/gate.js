/* =========================================================
   Preview gate (client-side, intentionally light)

   Everything on GitHub Pages is public, so this only keeps the
   in-progress site away from people who stumble on the URL. The
   password itself is not stored here, only its SHA-256 hash.

   To change the password, run:
     python3 -c "import hashlib; print(hashlib.sha256(input().encode()).hexdigest())"
   type the new password, press Enter, and paste the output below.
   ========================================================= */
(() => {
  const PASSWORD_SHA256 = "fc747b4d14d8d5fff7a41491f4f5763aa1ff68a8d1cb8377319495cfe045db1e";
  const STORAGE_KEY = "kk-preview-unlocked";

  const gate = document.getElementById("gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-password");
  const status = document.getElementById("gate-status");

  function unlock() {
    document.body.classList.remove("locked");
    gate.remove();
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  if (sessionStorage.getItem(STORAGE_KEY) === "1") {
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
