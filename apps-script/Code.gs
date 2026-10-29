/**
 * Wedding backend — Google Apps Script
 *
 * Two jobs:
 *   1. RSVP submissions  → appended to the "RSVPs" tab.
 *   2. Guest lookup      → checks a typed name against the "Guests" tab so the
 *                          site can let invitees in without a password.
 *
 * Setup (already done once; repeated here for reference):
 *   1. In the Google Sheet, Extensions → Apps Script. Replace the code with this file.
 *   2. Run `setup` once from the editor (authorize when prompted).
 *   3. Deploy → New deployment → Web app, Execute as Me, Who has access: Anyone.
 *   4. Copy the Web app URL into APPS_SCRIPT_URL in config.js.
 *
 * Every later change to this file requires:
 *   Deploy → Manage deployments → pencil icon → Version: New version → Deploy.
 *
 * The "Guests" tab needs these header names in row 1 (order does not matter):
 *   First Name | Last Name | Party Name | Maximum Guests | Aliases
 * Aliases is optional: comma-separated alternate names, e.g. "Bob Smith, Robert J Smith".
 */

const RSVP_SHEET_NAME = "RSVPs";
const GUESTS_SHEET_NAME = "Guests";
const TIMEZONE = "America/Boise";
const GUEST_CACHE_SECONDS = 300;

const RSVP_HEADERS = [
  "Timestamp (MT)",
  "Name",
  "Email",
  "Attending",
  "Guests",
  "Dietary",
  "Message",
  "Party",
];

/* ================================================================
   Entry points
   ================================================================ */

function setup() {
  const sheet = getRsvpSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(RSVP_HEADERS);
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    ensureRsvpHeaders_(sheet);
  }
  // Touch the guests sheet so a missing tab is obvious during setup.
  getGuestsSheet_();
}

function doGet() {
  return json_({ ok: true, message: "Wedding endpoint is live." });
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    if (body.action === "lookup") return handleLookup_(body);
    return handleRsvp_(body);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ================================================================
   Guest lookup
   ================================================================ */

function handleLookup_(body) {
  const raw = String(body.name || "");
  const query = normalizeName_(raw);
  if (!query) return json_({ ok: true, found: false });

  const guests = getGuests_();

  // 1. Exact match on "first last" or any alias.
  let match = guests.find((g) => g.keys.indexOf(query) !== -1);

  // 2. Loose match: first and last tokens of the input match a guest's
  //    first and last name (tolerates middle names and initials).
  if (!match) {
    const tokens = query.split(" ");
    if (tokens.length >= 2) {
      const first = tokens[0];
      const last = tokens[tokens.length - 1];
      match = guests.find((g) => g.first === first && g.last === last);
    }
  }

  // 3. Spacing-insensitive match: "o brien" vs "obrien", "mary ann" vs "maryann".
  if (!match) {
    const squashed = squash_(query);
    match = guests.find((g) => g.keys.some((k) => squash_(k) === squashed));
  }

  if (!match) return json_({ ok: true, found: false });

  const partyMembers = match.party
    ? guests.filter((g) => g.party === match.party).map((g) => g.display)
    : [match.display];

  return json_({
    ok: true,
    found: true,
    name: match.display,
    party: match.party,
    maxGuests: match.maxGuests,
    partyMembers: partyMembers,
  });
}

function getGuests_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("guests");
  if (cached) return JSON.parse(cached);

  const sheet = getGuestsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const header = values[0].map((h) => normalizeName_(h));
  const col = (name) => header.indexOf(name);
  const iFirst = col("first name");
  const iLast = col("last name");
  const iParty = col("party name");
  const iMax = col("maximum guests");
  const iAliases = col("aliases");

  if (iFirst === -1 || iLast === -1) {
    throw new Error('Guests tab needs "First Name" and "Last Name" columns.');
  }

  const guests = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const firstRaw = String(row[iFirst] || "").trim();
    const lastRaw = String(row[iLast] || "").trim();
    if (!firstRaw && !lastRaw) continue;

    const first = normalizeName_(firstRaw);
    const last = normalizeName_(lastRaw);
    const keys = [normalizeName_(firstRaw + " " + lastRaw)];

    if (iAliases !== -1 && row[iAliases]) {
      String(row[iAliases])
        .split(/[,;\n]/)
        .map((a) => normalizeName_(a))
        .filter(Boolean)
        .forEach((a) => keys.push(a));
    }

    const maxRaw = iMax !== -1 ? Number(row[iMax]) : NaN;

    guests.push({
      first: first,
      last: last,
      display: (firstRaw + " " + lastRaw).trim(),
      party: iParty !== -1 ? String(row[iParty] || "").trim() : "",
      maxGuests: isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 1,
      keys: keys,
    });
  }

  cache.put("guests", JSON.stringify(guests), GUEST_CACHE_SECONDS);
  return guests;
}

/**
 * Lowercase, strip accents, remove apostrophes, turn any other
 * non-letter into a space, collapse whitespace.
 * "José O'Brien-Smith" → "jose obrien smith".
 */
function normalizeName_(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2018\u2019\u02bc`]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "mary ann smith" → "maryannsmith", for comparing regardless of spacing. */
function squash_(s) {
  return String(s || "").replace(/\s+/g, "");
}

/* ================================================================
   RSVP
   ================================================================ */

function handleRsvp_(body) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const attending = String(body.attending || "").trim();

    if (!name || !email || !attending) {
      return json_({ ok: false, error: "Missing required fields." });
    }

    const sheet = getRsvpSheet_();
    ensureRsvpHeaders_(sheet);

    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([
      timestamp,
      name,
      email,
      attending,
      String(body.guests || ""),
      String(body.dietary || ""),
      String(body.message || ""),
      String(body.party || ""),
    ]);

    return json_({ ok: true });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/** Adds any RSVP header that is missing from row 1 (e.g. "Party" added later). */
function ensureRsvpHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  RSVP_HEADERS.forEach((h) => {
    if (existing.indexOf(h) === -1) {
      const colIndex = existing.length + 1;
      sheet.getRange(1, colIndex, 1, 1).setValue(h).setFontWeight("bold");
      existing.push(h);
    }
  });
}

/* ================================================================
   Helpers
   ================================================================ */

function getRsvpSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RSVP_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(RSVP_SHEET_NAME);
  return sheet;
}

function getGuestsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GUESTS_SHEET_NAME);
  if (sheet) return sheet;

  // Fall back to any tab whose header row has First Name and Last Name.
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    if (s.getLastRow() === 0) continue;
    const header = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map((h) => normalizeName_(h));
    if (header.indexOf("first name") !== -1 && header.indexOf("last name") !== -1) return s;
  }
  throw new Error('No "' + GUESTS_SHEET_NAME + '" tab found. Create one with First Name, Last Name, Party Name, Maximum Guests, Aliases.');
}

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (_) {
      // Fall through to form-encoded parameters.
    }
  }
  return (e && e.parameter) || {};
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
