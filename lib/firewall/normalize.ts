/**
 * [1] Canonicalisation.
 * Attackers hide instructions behind Unicode tricks and encodings. Instead of
 * picking one "normal form", we produce several VIEWS of the same text and every
 * detector scans all of them. A rule only has to match one view to fire.
 */

export type ObfuscationFlag =
  | "INVISIBLE_CHARACTERS"
  | "MIXED_SCRIPT_HOMOGLYPHS"
  | "ENCODED_PAYLOAD"
  | "SPACED_CHARACTERS"
  | "UNICODE_COMPATIBILITY_FORMS";

export interface TextView {
  /** e.g. "nfkc", "homoglyph", "leet", "despaced", "reversed", "squashed", "decoded:base64" */
  name: string;
  text: string;
}

export interface NormalizedText {
  original: string;
  /** Cleaned, NFKC, lower-cased, homoglyph-mapped, whitespace-collapsed. Used by the parser. */
  canonical: string;
  views: TextView[];
  flags: ObfuscationFlag[];
  decoded: { kind: string; text: string }[];
}

// ---------------------------------------------------------------------------
// Character classes
// ---------------------------------------------------------------------------

const ZWNJ = 0x200c;
const ZWJ = 0x200d;

/** Zero-width, bidi-control, invisible-filler and formatting code points. */
function isInvisible(cp: number): boolean {
  return (
    (cp >= 0x200b && cp <= 0x200f) || // ZWSP, ZWNJ, ZWJ, LRM, RLM
    (cp >= 0x202a && cp <= 0x202e) || // bidi embeddings/overrides
    (cp >= 0x2060 && cp <= 0x2064) || // word joiner, invisible operators
    (cp >= 0x2066 && cp <= 0x2069) || // bidi isolates
    cp === 0xfeff || // BOM / ZWNBSP
    cp === 0x00ad || // soft hyphen
    cp === 0x034f || // combining grapheme joiner
    cp === 0x180e || // Mongolian vowel separator
    cp === 0x115f ||
    cp === 0x1160 ||
    cp === 0x3164 ||
    cp === 0xffa0 || // Hangul fillers
    (cp >= 0xe0000 && cp <= 0xe007f) // Unicode "tag" characters (ASCII smuggling)
  );
}

function isControl(cp: number): boolean {
  return (
    (cp <= 0x1f && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d) || (cp >= 0x7f && cp <= 0x9f)
  );
}

function isVariationSelector(cp: number): boolean {
  return (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);
}

/** Indic scripts (Devanagari … Malayalam/Sinhala) where ZWJ/ZWNJ are legitimate. */
function isIndic(cp: number | undefined): boolean {
  return cp !== undefined && cp >= 0x0900 && cp <= 0x0dff;
}

const HOMOGLYPHS: Record<string, string> = {
  // Cyrillic
  а: "a", в: "b", е: "e", ё: "e", о: "o", р: "p", с: "c", у: "y", х: "x", ѕ: "s",
  і: "i", ї: "i", ј: "j", ԁ: "d", һ: "h", ӏ: "l", ԛ: "q", ԝ: "w", к: "k", м: "m",
  н: "h", т: "t", ь: "b", ү: "y", ɡ: "g",
  // Greek
  α: "a", β: "b", γ: "y", ε: "e", η: "n", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p",
  τ: "t", υ: "u", χ: "x", ω: "w", ς: "s", σ: "o",
  // Latin look-alikes
  ı: "i", ȷ: "j", ʟ: "l", ɴ: "n", ʀ: "r", ꜱ: "s",
};

function isCyrillicOrGreek(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x0370 && cp <= 0x03ff) || (cp >= 0x0400 && cp <= 0x052f);
}

const LEET: Record<string, string> = {
  "1": "i", "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s",
};

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

interface CleanResult {
  text: string;
  invisible: boolean;
  tagPayload: string;
}

/** Remove invisible / control characters, keeping ZWJ/ZWNJ between Indic letters. */
function stripInvisible(input: string): CleanResult {
  const cps = Array.from(input).map((c) => c.codePointAt(0) ?? 0);
  let out = "";
  let invisible = false;
  let tagPayload = "";
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    if ((cp === ZWJ || cp === ZWNJ) && isIndic(cps[i - 1]) && isIndic(cps[i + 1])) {
      out += String.fromCodePoint(cp);
      continue;
    }
    if (cp >= 0xe0020 && cp <= 0xe007e) {
      tagPayload += String.fromCharCode(cp - 0xe0000);
      invisible = true;
      continue;
    }
    if (isInvisible(cp)) {
      invisible = true;
      continue;
    }
    if (isVariationSelector(cp)) continue; // emoji presentation selectors: harmless
    if (isControl(cp)) {
      invisible = true;
      out += " ";
      continue;
    }
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d) {
      out += " ";
      continue;
    }
    out += String.fromCodePoint(cp);
  }
  return { text: out, invisible, tagPayload };
}

/** True if a character's NFKC form is a plain ASCII letter/digit (full-width, math bold, circled…). */
function hasCompatibilityForms(input: string): boolean {
  for (const ch of input) {
    if (/[\x00-\x7f]/.test(ch)) continue;
    const n = ch.normalize("NFKC");
    if (n !== ch && /^[A-Za-z0-9]+$/.test(n)) return true;
  }
  return false;
}

function mapHomoglyphs(input: string): { text: string; mixed: boolean } {
  let mixed = false;
  const tokens = input.split(/(\s+)/);
  const mapped = tokens.map((tok) => {
    if (!/[\u0370-\u052f\u0131\u0237\u029f\u0274\u0280\ua731\u0261]/.test(tok)) return tok;
    const chars = Array.from(tok);
    const hasLatin = chars.some((c) => /[a-z]/.test(c));
    const foreign = chars.filter((c) => isCyrillicOrGreek(c));
    const allMappable = foreign.every((c) => HOMOGLYPHS[c] !== undefined);
    const out = chars.map((c) => HOMOGLYPHS[c] ?? c).join("");
    if (foreign.some((c) => HOMOGLYPHS[c] !== undefined) && (hasLatin || (allMappable && chars.length >= 3))) {
      mixed = true;
    }
    return out;
  });
  return { text: mapped.join(""), mixed };
}

function leetDecode(input: string): string {
  return input
    .split(/(\s+)/)
    .map((tok) => {
      if (!/[a-z]/.test(tok) || !/[013457@$]/.test(tok)) return tok;
      return Array.from(tok)
        .map((c) => LEET[c] ?? c)
        .join("");
    })
    .join("");
}

/** Collapse runs of single letters separated by space/dot/dash/underscore/star: "i g n o r e" → "ignore". */
function despace(input: string): { text: string; collapsed: boolean } {
  let collapsed = false;
  const text = input.replace(/(?<![a-z])(?:[a-z][ ._\-*·]){1,}[a-z](?![a-z])/g, (m) => {
    const letters = m.replace(/[^a-z]/g, "");
    if (letters.length >= 2) collapsed = true;
    return letters;
  });
  return { text, collapsed };
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Embedded-encoding decoders
// ---------------------------------------------------------------------------

/** Heuristic: decoded bytes look like human text (mostly printable, has words). */
export function looksLikeText(s: string): boolean {
  if (s.length < 4) return false;
  const chars = Array.from(s);
  const printable = chars.filter((c) => /[\p{L}\p{N}\p{P}\p{Zs}\p{S}]/u.test(c)).length;
  if (printable / chars.length < 0.9) return false;
  if (chars.some((c) => c === "\ufffd")) return false;
  const letters = (s.match(/\p{L}/gu) ?? []).length;
  return letters >= 4 && letters / chars.length >= 0.5;
}

function decodeBase64(input: string): string[] {
  const out: string[] = [];
  const re = /[A-Za-z0-9+/_-]{12,}={0,2}/g;
  for (const m of input.match(re) ?? []) {
    if (/^\d+$/.test(m)) continue; // account numbers etc.
    if (/^[a-z]+$/i.test(m)) continue; // plain words
    const std = m.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    if (std.length % 4 === 1) continue;
    const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
    try {
      const decoded = Buffer.from(padded, "base64").toString("utf8");
      if (looksLikeText(decoded)) out.push(decoded);
    } catch {
      /* not base64 */
    }
  }
  return out;
}

function decodeHex(input: string): string[] {
  const out: string[] = [];
  const candidates: string[] = [];
  // \x69\x67… or 0x69 0x67…
  for (const m of input.match(/(?:\\x[0-9a-f]{2}){4,}/gi) ?? []) candidates.push(m.replace(/\\x/gi, ""));
  for (const m of input.match(/(?:0x[0-9a-f]{2}[\s,]*){4,}/gi) ?? [])
    candidates.push(m.replace(/0x|[\s,]/gi, ""));
  // space-separated byte pairs "69 67 6e 6f"
  for (const m of input.match(/(?:\b[0-9a-f]{2}\b\s+){4,}\b[0-9a-f]{2}\b/gi) ?? [])
    candidates.push(m.replace(/\s+/g, ""));
  // contiguous hex blobs
  for (const m of input.match(/(?:0x)?[0-9a-f]{12,}/gi) ?? []) {
    const h = m.replace(/^0x/i, "");
    if (/^\d+$/.test(h)) continue;
    if (h.length % 2 === 0) candidates.push(h);
  }
  for (const h of candidates) {
    try {
      const decoded = Buffer.from(h, "hex").toString("utf8");
      if (looksLikeText(decoded)) out.push(decoded);
    } catch {
      /* ignore */
    }
  }
  return out;
}

function decodeUrl(input: string): string[] {
  if (!/%[0-9a-f]{2}/i.test(input)) return [];
  let decoded: string;
  try {
    decoded = decodeURIComponent(input.replace(/\+/g, " "));
  } catch {
    decoded = input.replace(/%([0-9a-f]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  }
  return decoded !== input && looksLikeText(decoded) ? [decoded] : [];
}

function decodeUnicodeEscapes(input: string): string[] {
  if (!/\\u\{?[0-9a-f]{2,6}\}?/i.test(input)) return [];
  const decoded = input
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (_, h: string) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, h: string) => safeFromCodePoint(parseInt(h, 16)));
  return decoded !== input && looksLikeText(decoded) ? [decoded] : [];
}

const NAMED_ENTITIES: Record<string, string> = {
  lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " ", sol: "/", colon: ":",
  lpar: "(", rpar: ")", lbrace: "{", rbrace: "}", equals: "=",
};

function decodeHtmlEntities(input: string): string[] {
  if (!/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(input)) return [];
  const decoded = input
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => safeFromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n: string) => NAMED_ENTITIES[n.toLowerCase()] ?? m);
  return decoded !== input && looksLikeText(decoded) ? [decoded] : [];
}

function safeFromCodePoint(cp: number): string {
  return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
}

function decodeAll(input: string): { kind: string; text: string }[] {
  const results: { kind: string; text: string }[] = [];
  const decoders: [string, (s: string) => string[]][] = [
    ["base64", decodeBase64],
    ["hex", decodeHex],
    ["url", decodeUrl],
    ["unicode_escape", decodeUnicodeEscapes],
    ["html_entity", decodeHtmlEntities],
  ];
  // Two rounds to catch one level of nesting (e.g. URL-encoded base64).
  let frontier = [{ kind: "", text: input }];
  for (let round = 0; round < 2; round++) {
    const next: { kind: string; text: string }[] = [];
    for (const item of frontier) {
      for (const [kind, fn] of decoders) {
        for (const text of fn(item.text)) {
          const fullKind = item.kind ? `${item.kind}>${kind}` : kind;
          if (!results.some((r) => r.text === text)) {
            results.push({ kind: fullKind, text });
            next.push({ kind: fullKind, text });
          }
        }
      }
    }
    frontier = next;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function basicCanonical(s: string): { text: string; invisible: boolean; tagPayload: string } {
  const nfkc = s.normalize("NFKC");
  const cleaned = stripInvisible(nfkc);
  return {
    text: collapseWhitespace(cleaned.text.toLowerCase()),
    invisible: cleaned.invisible,
    tagPayload: cleaned.tagPayload,
  };
}

/**
 * Normalizes untrusted text across multiple defensive views (NFKC, homoglyphs, leetspeak, despaced, base64/hex decode).
 *
 * @param original - Raw input text from message or memo.
 * @returns NormalizedText containing canonical representation, multi-view variants, and detected obfuscation flags.
 */
export function normalizeText(original: string): NormalizedText {
  const flags = new Set<ObfuscationFlag>();
  const views: TextView[] = [];
  const addView = (name: string, text: string) => {
    if (text && !views.some((v) => v.text === text)) views.push({ name, text });
  };

  if (hasCompatibilityForms(original)) flags.add("UNICODE_COMPATIBILITY_FORMS");

  const base = basicCanonical(original);
  if (base.invisible) flags.add("INVISIBLE_CHARACTERS");
  addView("nfkc", base.text);

  const homo = mapHomoglyphs(base.text);
  if (homo.mixed) flags.add("MIXED_SCRIPT_HOMOGLYPHS");
  const canonical = homo.text;
  addView("homoglyph", canonical);

  const leet = leetDecode(canonical);
  addView("leet", leet);

  const spaced = despace(leet);
  if (spaced.collapsed) flags.add("SPACED_CHARACTERS");
  addView("despaced", spaced.text);

  addView("reversed", Array.from(canonical).reverse().join(""));

  // Decode embedded payloads from the raw text (before lower-casing breaks base64).
  const rawClean = stripInvisible(original.normalize("NFKC")).text;
  const decoded = decodeAll(rawClean);
  if (base.tagPayload && looksLikeText(base.tagPayload)) {
    decoded.push({ kind: "unicode_tags", text: base.tagPayload });
  }
  if (decoded.length > 0) flags.add("ENCODED_PAYLOAD");
  for (const d of decoded) {
    const dn = mapHomoglyphs(basicCanonical(d.text).text).text;
    addView(`decoded:${d.kind}`, dn);
    addView(`decoded:${d.kind}+leet`, leetDecode(dn));
  }

  // Letters-only view of everything (catches "i.g.n.o.r.e" / "ign-ore" style splits).
  addView("squashed", spaced.text.replace(/[^a-z]/g, ""));

  return { original, canonical, views, flags: [...flags], decoded };
}
