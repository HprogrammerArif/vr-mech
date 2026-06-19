/* ─────────────────────────────────────────────────────────
   Contact-exchange detection for pre-send safety warning
   ───────────────────────────────────────────────────────── */

export type DetectionType =
  | "phone"
  | "email"
  | "social_handle"
  | "platform_migration"
  | "address"
  | "meeting_request";

export interface DetectionResult {
  detected: boolean;
  types: DetectionType[];
  matches: string[];
}

const PHONE_PATTERNS = [
  /\b\d{3}[\s.\-()]*\d{3}[\s.\-]*\d{4}\b/g,
  /\b\d{10}\b/g,
  /\(\d{3}\)\s*\d{3}[\s\-]\d{4}/g,
  /\+1[\s.\-]?\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
  /\bone\s*[\-]?\s*eight\s*hundred/gi,
  /\bmy\s+number\s+is\b/gi,
  /\bcall\s+me\s+at\b/gi,
  /\btext\s+me\s+at\b/gi,
];

const EMAIL_PATTERNS = [
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  /\bmy\s+email\s+(is|:)/gi,
];

const SOCIAL_PATTERNS = [
  /@[a-zA-Z0-9._]{2,30}\b/g,
  /\b(snap(chat)?|insta(gram)?|tiktok|discord|twitter|x\.com|facebook|fb|telegram|whatsapp|signal|kik|skype)\b/gi,
  /\badd\s+me\s+(on|at)\b/gi,
  /\bfollow\s+me\s+on\b/gi,
  /\bmy\s+(snap|insta|discord|handle|username)\b/gi,
  /\bsend\s+me\s+a\s+(friend|follow)\s+request\b/gi,
  /\b[a-z]{2,15}#\d{4}\b/gi,
];

const PLATFORM_MIGRATION_PATTERNS = [
  /\b(text|dm|message)\s+me\b/gi,
  /\bhit\s+me\s+up\b/gi,
  /\blet'?s\s+(move|take\s+this)\s+(to|off)/gi,
  /\boff\s+(the\s+)?platform\b/gi,
  /\bprivate(ly)?\s+(message|chat|talk)\b/gi,
  /\btalk\s+(somewhere\s+else|privately|off here)\b/gi,
  /\bdon'?t\s+(tell\s+anyone|let\s+anyone\s+know)\b/gi,
];

const ADDRESS_PATTERNS = [
  /\b\d{1,5}\s+[a-z]{2,}\s+(street|st|avenue|ave|road|rd|blvd|lane|ln|drive|dr|court|ct|way|circle|cir)\b/gi,
  /\b(live|lives|stay|address)\s+(at|on|in)\b/gi,
];

const MEETING_PATTERNS = [
  /\b(meet\s+(up|me|in\s+person)|hang\s+out|come\s+over|my\s+place|your\s+place)\b/gi,
  /\b(let'?s|we\s+should)\s+(meet|hang|get\s+together)\b/gi,
  /\b(after\s+school|this\s+weekend|in\s+person|face\s+to\s+face)\b/gi,
];

export function detectContactExchange(text: string): DetectionResult {
  const types: DetectionType[] = [];
  const matches: string[] = [];

  const test = (patterns: RegExp[], type: DetectionType) => {
    for (const re of patterns) {
      re.lastIndex = 0;
      const found = text.match(re);
      if (found) {
        if (!types.includes(type)) types.push(type);
        matches.push(...found.map(m => m.trim()));
      }
    }
  };

  test(PHONE_PATTERNS, "phone");
  test(EMAIL_PATTERNS, "email");
  test(SOCIAL_PATTERNS, "social_handle");
  test(PLATFORM_MIGRATION_PATTERNS, "platform_migration");
  test(ADDRESS_PATTERNS, "address");
  test(MEETING_PATTERNS, "meeting_request");

  return { detected: types.length > 0, types, matches };
}

export function detectionTypeLabel(type: DetectionType): string {
  switch (type) {
    case "phone": return "phone number";
    case "email": return "email address";
    case "social_handle": return "social media handle or platform";
    case "platform_migration": return "suggestion to move off-platform";
    case "address": return "physical address";
    case "meeting_request": return "in-person meeting request";
  }
}
