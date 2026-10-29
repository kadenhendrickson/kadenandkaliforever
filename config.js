/* =========================================================
   Shared configuration. Loaded by both the gate and the site.
   ========================================================= */
window.KK_CONFIG = {
  // "Web app" URL from the Apps Script deployment (ends in /exec).
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwpsnPv-xVrRwvC_Z9_KgOBtrAjKzwmesN987-BMkcUbX0TKL1TXkYYiooCM8bxWSFKwA/exec",

  // Wedding date/time at the venue. Galena Lodge is in Mountain Time
  // (America/Boise; MDT in August = UTC-6).
  WEDDING_DATE_ISO: "2027-08-14T16:00:00-06:00",
  TIMEZONE: "America/Boise",

  // sessionStorage key holding the recognized guest, set by the gate.
  GUEST_STORAGE_KEY: "kk-guest",
};
