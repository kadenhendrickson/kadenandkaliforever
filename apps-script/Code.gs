/**
 * Wedding backend — Google Apps Script
 *
 * Two jobs:
 *   1. RSVP submissions  → appended to the "RSVPs" tab, one row per person.
 *                          A guest may reply for their whole party in one go.
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
  "Submitted By",
  "Last Updated",
];

const ADDITIONAL_SUFFIX = " (additional guest)";

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
    replies: findReplies_(match.party, partyMembers),
  });
}

/**
 * Latest RSVP row for each person in the party (or for the named members
 * when there is no party). Returns [{ member, name, additional, attending,
 * guests, email, dietary, message, updated }], one per person.
 */
function findReplies_(party, members) {
  const table = getRsvpTable_();
  const partyKey = normalizeName_(party);
  const memberKeys = members.map((m) => normalizeName_(m));
  const latest = {};

  table.rows.forEach((row) => {
    const rowParty = normalizeName_(row[table.col["Party"]]);
    const rawName = String(row[table.col["Name"]] || "");
    const additional = rawName.indexOf(ADDITIONAL_SUFFIX) !== -1;
    const nameKey = normalizeName_(rawName.replace(ADDITIONAL_SUFFIX, ""));
    if (!nameKey) return;

    const memberIndex = memberKeys.indexOf(nameKey);
    const inParty = partyKey ? rowParty === partyKey : memberIndex !== -1;
    if (!inParty) return;

    // Later rows win, so the last matching row is the current one.
    latest[nameKey] = {
      member: memberIndex !== -1 ? members[memberIndex] : null,
      name: rawName.replace(ADDITIONAL_SUFFIX, ""),
      additional: additional,
      attending: String(row[table.col["Attending"]] || ""),
      guests: String(row[table.col["Guests"]] || ""),
      email: String(row[table.col["Email"]] || ""),
      dietary: String(row[table.col["Dietary"]] || ""),
      message: String(row[table.col["Message"]] || ""),
      updated: String(row[table.col["Last Updated"]] || row[table.col["Timestamp (MT)"]] || ""),
    };
  });

  return Object.keys(latest).map((k) => latest[k]);
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

/**
 * Accepts either shape and upserts one row per person: if a row already
 * exists for that name (and party), it is overwritten and "Last Updated"
 * set; otherwise a new row is appended.
 *
 *  Party reply:
 *    { submittedBy, email, party, dietary, message,
 *      responses: [{ name, attending: "Yes"|"No", additional?: true }, ...] }
 *
 *  Single reply (fallback form):
 *    { name, email, attending, guests, dietary, message, party }
 */
function handleRsvp_(body) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const email = String(body.email || "").trim();
    const dietary = String(body.dietary || "");
    const message = String(body.message || "");
    const party = String(body.party || "");
    const now = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    let people = [];
    let submittedBy;

    if (Array.isArray(body.responses)) {
      submittedBy = String(body.submittedBy || "").trim();
      if (!submittedBy || !email) return json_({ ok: false, error: "Missing required fields." });
      body.responses.forEach((r) => {
        const name = String((r && r.name) || "").trim();
        const attending = String((r && r.attending) || "").trim();
        if (!name || !attending) return;
        people.push({
          name: name + (r.additional ? ADDITIONAL_SUFFIX : ""),
          attending: attending,
          guests: attending === "Yes" ? "1" : "0",
        });
      });
      if (people.length === 0) return json_({ ok: false, error: "No responses provided." });
    } else {
      const name = String(body.name || "").trim();
      const attending = String(body.attending || "").trim();
      if (!name || !email || !attending) return json_({ ok: false, error: "Missing required fields." });
      submittedBy = name;
      people.push({ name: name, attending: attending, guests: String(body.guests || "") });
    }

    const table = getRsvpTable_();
    const partyKey = normalizeName_(party);
    let updated = 0;
    let created = 0;

    people.forEach((p) => {
      const nameKey = normalizeName_(p.name.replace(ADDITIONAL_SUFFIX, ""));

      // Find the most recent existing row for this person.
      let existingIndex = -1;
      table.rows.forEach((row, i) => {
        const rowName = normalizeName_(String(row[table.col["Name"]] || "").replace(ADDITIONAL_SUFFIX, ""));
        const rowParty = normalizeName_(row[table.col["Party"]]);
        if (rowName !== nameKey) return;
        if (partyKey && rowParty && rowParty !== partyKey) return;
        existingIndex = i;
      });

      const values = {
        "Name": p.name,
        "Email": email,
        "Attending": p.attending,
        "Guests": p.guests,
        "Dietary": dietary,
        "Message": message,
        "Party": party,
        "Submitted By": submittedBy,
        "Last Updated": now,
      };

      if (existingIndex !== -1) {
        const row = table.rows[existingIndex].slice();
        Object.keys(values).forEach((h) => { row[table.col[h]] = values[h]; });
        table.sheet.getRange(existingIndex + 2, 1, 1, row.length).setValues([row]);
        table.rows[existingIndex] = row;
        updated++;
      } else {
        const row = table.header.map(() => "");
        row[table.col["Timestamp (MT)"]] = now;
        Object.keys(values).forEach((h) => { row[table.col[h]] = values[h]; });
        table.sheet.appendRow(row);
        table.rows.push(row);
        created++;
      }
    });

    return json_({ ok: true, rows: people.length, updated: updated, created: created });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/** Reads the RSVPs tab into { sheet, header, col (header → index), rows }. */
function getRsvpTable_() {
  const sheet = getRsvpSheet_();
  ensureRsvpHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const col = {};
  header.forEach((h, i) => { col[h] = i; });
  const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  return { sheet: sheet, header: header, col: col, rows: rows };
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
