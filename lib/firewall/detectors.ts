/**
 * [2] Signature engine.
 * A table of weighted regex rules scanned over every canonical view of the message
 * and memo. Weights are combined with noisy-OR into a deterministic 0–100 risk score.
 *
 * MEMO IS DATA, NEVER INSTRUCTIONS: memos are scanned with every general rule PLUS a
 * stricter memo-only rule set (imperatives, markup, URLs, character allow-list).
 */
import type { AttackCategory, Signal, SignalField } from "./schema";
import { normalizeText, type NormalizedText, type ObfuscationFlag } from "./normalize";

export interface Rule {
  id: string;
  category: AttackCategory;
  label: string;
  weight: number;
  pattern: RegExp;
  /** "any" = message and memo; "memo" = memo only. */
  scope: "any" | "memo";
  /** Which views to scan. "text" = every view except squashed; "squashed" = letters-only view. */
  views: "text" | "squashed" | "nfkc";
}

const r = (
  id: string,
  category: AttackCategory,
  weight: number,
  label: string,
  pattern: RegExp,
  scope: Rule["scope"] = "any",
  views: Rule["views"] = "text",
): Rule => ({ id, category, weight, label, pattern, scope, views });

// Reusable fragments
const OVERRIDE_VERB = String.raw`(?:ignore|disregard|forget|skip|bypass|override|overlook|disable|turn\s+off|switch\s+off|circumvent|evade|get\s+around|neglect|abandon|discard|drop|(?:don'?t|do\s+not|never|not)\s+(?:follow|apply|check|enforce|respect|use))`;
const SECURITY_NOUN = String.raw`(?:firewalls?|filters?|guardrails?|guards?|safety|security(?!\s+deposit)|checks?|verification|validation|limits?|polic(?:y|ies)|rules?|restrictions?|protections?|fraud\s*(?:checks?|monitoring)?|monitoring|safeguards?|systems?|layers?|scanners?|ai|assistants?|instructions?|prompts?|guidelines?|directives?|constraints?|programming|training|niyam|hidayat)`;
const STAFF = String.raw`(?:rbi|reserve bank|system admin(?:istrator)?|admin(?:istrator)?|ceo|cto|developer|bank manager|branch manager|manager|security team|fraud (?:team|department)|compliance(?: officer| team)?|it (?:department|team)|police|cyber ?cell|government|income tax(?: department)?|auditor|owner|root|superuser|support team|head office)`;

export const RULES: readonly Rule[] = Object.freeze([
  // ---------------- PROMPT_INJECTION ----------------
  r("PI-001", "PROMPT_INJECTION", 0.92, "Instruction override (ignore/bypass security controls)",
    new RegExp(String.raw`\b${OVERRIDE_VERB}(?:\s+(?:karo|kar\s*do|karna))?\b(?:[^\w\n]+[\w'-]+){0,6}?[^\w\n]+\b${SECURITY_NOUN}\b|\b${SECURITY_NOUN}\b(?:[^\w\n]+[\w'-]+){0,4}?[^\w\n]+(?:ko\s+)?(?:\b${OVERRIDE_VERB}\b|mat\s+(?:laga(?:o|ye)|follow|dekh(?:o|ye))|hata\s*(?:do|o|ye))\b(?:\s+(?:karo|kar\s*do|karna|karein|kijiye|kar))?|\b(?:forget|disregard|ignore)\s+(?:everything|all)\s*(?:you\s+were\s+(?:told|instructed|given|taught)|that\s+was\s+said)?\b`)),
  r("PI-002", "PROMPT_INJECTION", 0.8, "Injected replacement instructions",
    /\b(?:new|updated|revised|real|actual|true|hidden|secret|override)\s+(?:system\s+)?(?:instructions?|prompt|rules|directives?|orders|task)\b\s*(?::|-|are|is)|\byour\s+(?:new|real|true)\s+(?:task|role|purpose|instructions?|job)\b/),
  r("PI-003", "PROMPT_INJECTION", 0.88, "Fake system/role tag",
    /\[\s*\/?\s*(?:system|sys|admin|developer|assistant|inst|root)\s*\]|<\s*\/?\s*(?:system|sys|admin|developer|assistant|root)\s*>|<\|?\s*im_(?:start|end)\s*\|?>|<<\s*\/?\s*sys\s*>>|(?:^|[\s.;!\]>])(?:system|sys|developer|admin|root|assistant)\s*(?:prompt|message|override|note|instruction|update)?\s*:|#{2,}\s*(?:system|instruction|new|admin)/),
  r("PI-004", "PROMPT_INJECTION", 0.75, "Claimed override/maintenance mode",
    /\b(?:security|safety|admin|god|root|sudo|maintenance|debug|override|test)\s+(?:override|mode|access|bypass)\s+(?:is\s+)?(?:enabled|activated|on|granted|engaged)\b|\boverride\s+(?:code|enabled|activated|authori[sz]ed)\b/),
  r("PI-005", "PROMPT_INJECTION", 0.6, "Conversation-boundary manipulation",
    /\b(?:end\s+of\s+(?:user\s+)?(?:input|message|prompt|conversation)|begin\s+(?:new\s+)?(?:system|admin)\s+(?:message|prompt|session))\b|\bthe\s+(?:above|previous)\s+(?:was|is)\s+(?:a\s+)?(?:test|fake|joke)\b/),
  r("PI-SQ1", "PROMPT_INJECTION", 0.9, "Instruction override (squashed letters)",
    /(?:ignore|disregard|forget|bypass|override|skip|disable|turnoff)(?:all|any|the|your)?(?:previous|prior|above|earlier|system|original)?(?:instructions?|rules|prompts?|guidelines|restrictions|firewalls?|guardrails?|filters?|safeguards?|checks?|limits?|security|safety)/,
    "any", "squashed"),

  // ---------------- JAILBREAK ----------------
  r("JB-001", "JAILBREAK", 0.92, "DAN / Do-Anything-Now jailbreak",
    /\bdo\s+anything\s+now\b|\b(?:you\s+are|you're|act\s+as|become|enable|activate|be)\s+(?:a\s+|now\s+)?dan\b|\bdan\s+(?:mode|prompt|has|can|is|will)\b/),
  r("JB-002", "JAILBREAK", 0.88, "Developer/god/unrestricted mode request",
    /\b(?:respond\s+in|enable|activate|use)?\s*(?:developer|dev|debug|god|admin|jailbreak|jailbroken|unrestricted|unfiltered|uncensored|evil|sudo|root|unlocked)\s+mode\b/),
  r("JB-003", "JAILBREAK", 0.8, "Request to disable safety controls",
    /\b(?:disable|turn\s+off|deactivate|remove|bypass|switch\s+off|lift|suspend|circumvent|get\s+around)\b.{0,25}\b(?:safety|security|filters?|guardrails?|restrictions?|checks?|verification|firewall|moderation|protections?|safeguards?|rules)\b/),
  r("JB-004", "JAILBREAK", 0.85, "Explicit jailbreak keyword", /\bjail\s*-?\s*break(?:ing|ed|s)?\b/),
  r("JB-005", "JAILBREAK", 0.85, "Claims of no restrictions / without guardrails",
    /\b(?:no|without|zero|free\s+(?:of|from)|beyond|drop)\s+(?:any\s+)?(?:restrictions?|limits?|rules|filters|boundaries|guidelines|censorship|limitations|constraints|ethics|guardrails?|safeguards?|safety(?:\s+layer)?)\b|\b(?:unrestricted|unfiltered|uncensored)\b/),
  r("JB-006", "JAILBREAK", 0.65, "Game / hypothetical framing to escape rules",
    /\blet'?s\s+play\s+a\s+game\b|\bhypothetical(?:ly)?\b.{0,50}\b(?:no|without|ignore)\b|\bfor\s+(?:educational|research)\s+purposes\b.{0,40}\b(?:bypass|hack|steal|transfer)\b/),
  r("JB-007", "JAILBREAK", 0.72, "Refusal suppression",
    /\b(?:never|don'?t|do\s+not|cannot|can'?t|must\s+not|will\s+not)\s+refuse\b|\bstay\s+in\s+character\b|\bopposite\s+mode\b|\banti-?gpt\b/),
  r("JB-008", "JAILBREAK", 0.88, "AI Persona without guardrails / unrestricted assistant",
    /\b(?:you\s+are|you're|act\s+as|become)\s+(?:a\s+|an\s+|my\s+)?(?:[\w-]+\s*,?\s*)?(?:an?\s+)?(?:ai|bot|assistant|model|agent|gpt)\s+(?:without|with\s+no|who\s+has\s+no|lacking)\s+(?:guardrails?|rules?|filters?|restrictions?|limits?|boundaries|ethics)\b|\b(?:you\s+are|you're)\s+my\s+unrestricted\s+(?:assistant|ai|bot|model|agent)\b|\bunrestricted\s+assistant\b/),
  r("JB-SQ1", "JAILBREAK", 0.85, "Jailbreak keyword (squashed letters)",
    /developermode|godmode|jailbreak|doanythingnow|danmode|unrestrictedmode/, "any", "squashed"),

  // ---------------- ROLEPLAY_ATTACK ----------------
  r("RP-001", "ROLEPLAY_ATTACK", 0.68, "Roleplay / persona instruction",
    /\b(?:pretend|imagine\s+(?:you|that\s+you)|role\s*-?\s*play|act\s+as|acting\s+as|behave\s+as|play\s+the\s+(?:role|part)|simulate\s+being|impersonate|you\s+will\s+be\s+playing)\b/),
  r("RP-002", "ROLEPLAY_ATTACK", 0.82, "Grandma / deceased-relative exploit",
    /\b(?:grand(?:ma|mother|pa|father)|granny|nani|dadi)\b.{0,100}\b(?:used\s+to|would|read|tell|sing|recite)\b|\b(?:deceased|late|dead)\s+(?:grand(?:ma|mother|pa|father)|mother|father|granny)\b/),
  r("RP-003", "ROLEPLAY_ATTACK", 0.62, "Persona reassignment",
    /\byou\s+are\s+now\b|\bfrom\s+now\s+on\b.{0,20}\b(?:you|your)\b|\bnamed\s+["']?\w+["']?\s+(?:that|who)\s+(?:never|always|can|has)\b|\byou\s+are\s+no\s+longer\b/),
  r("RP-004", "ROLEPLAY_ATTACK", 0.75, "Assign assistant a bank-staff role",
    /\b(?:as|you\s+are|you're|be|become)\s+(?:the|a|my)\s+(?:bank\s+|branch\s+)?(?:manager|admin(?:istrator)?|teller|banker|officer|ceo)\b.{0,40}\b(?:approve|authori[sz]e|allow|transfer|send|override|grant)\b/),
  r("RP-HI1", "ROLEPLAY_ATTACK", 0.72, "Hinglish persona reassignment (tum ab admin ho)",
    /\b(?:tum|aap|tu)\s+(?:ab|abhi|aaj\s+se)\s+(?:admin|manager|developer|malik|boss|bank\s+manager)\s+(?:ho|hai|hain|hoon)\b/),

  // ---------------- AUTHORITY_IMPERSONATION ----------------
  r("AU-001", "AUTHORITY_IMPERSONATION", 0.82, "Claims to be bank staff / regulator",
    new RegExp(String.raw`\b(?:i\s+am|i'm|this\s+is|speaking\s+as|on\s+behalf\s+of|message\s+from|order\s+from|orders\s+from|instruction\s+from|directive\s+from|notice\s+from)\s+(?:the\s+|a\s+|an\s+|your\s+)?(?:from\s+(?:the\s+|a\s+)?)?(?:bank'?s?\s+)?${STAFF}\b`)),
  r("AU-002", "AUTHORITY_IMPERSONATION", 0.75, "Privilege escalation request",
    /\b(?:grant|give|assign)\s+(?:me\s+)?(?:admin|root|elevated|full|superuser|unrestricted|manager)\s+(?:access|privileges?|rights|permissions?|control)\b|\b(?:admin|root|elevated|superuser)\s+(?:access|privileges?|rights)\b/),
  r("AU-003", "AUTHORITY_IMPERSONATION", 0.6, "Claims verified / privileged status",
    /\b(?:i\s+am|i'm|user\s+is|the\s+user\s+is)\s+(?:a\s+|an\s+)?(?:verified|authori[sz]ed|whitelisted|trusted|pre-?approved|privileged)\s+(?:admin|user|customer|employee|staff)\b|\b(?:rbi|government|police|court)\s+(?:order|mandate|directive)\b/),

  // ---------------- SOCIAL_ENGINEERING ----------------
  r("SE-001", "SOCIAL_ENGINEERING", 0.2, "Urgency pressure",
    /\b(?:urgent(?:ly)?|emergency|immediately|right\s+now|asap|life\s+or\s+death|hurry|jaldi)\b/),
  r("SE-002", "SOCIAL_ENGINEERING", 0.72, "Request to skip verification / checks",
    /\b(?:skip|bypass|avoid|ignore|no\s+need\s+(?:for|to)|don'?t|do\s+not|without)\s+(?:the\s+|any\s+|all\s+|doing\s+)?(?:verification|verify(?:ing)?|checks?|checking|otp|authentication|confirmation|security|validation|limits?|kyc|2fa|approval)\b/),
  r("SE-003", "SOCIAL_ENGINEERING", 0.66, "Claims prior approval",
    /\b(?:already|pre-?)\s*(?:approved|authori[sz]ed|verified|cleared|sanctioned)\b|\bhas\s+(?:been\s+)?(?:approved|authori[sz]ed)\s+by\b/),
  r("SE-004", "SOCIAL_ENGINEERING", 0.62, "Compromised-account / safe-account scam",
    /\b(?:account|funds?|money)\s+(?:is|are|has\s+been|have\s+been)\s+(?:compromised|hacked|at\s+risk|frozen|blocked)\b|\bsafe\s+account\b/),
  r("SE-005", "SOCIAL_ENGINEERING", 0.55, "Secrecy request",
    /\b(?:don'?t|do\s+not)\s+(?:tell|inform|notify|alert|log|record|report)\b|\bkeep\s+(?:this|it)\s+(?:secret|quiet|confidential|between\s+us)\b/),
  r("SE-006", "SOCIAL_ENGINEERING", 0.35, "Family-emergency pretext",
    /\b(?:son|daughter|mother|father|wife|husband|brother|sister|friend)\b.{0,40}\b(?:hospital|accident|kidnapp?ed|arrested|jail|stranded)\b/),

  // ---------------- DATA_EXFILTRATION ----------------
  r("DX-001", "DATA_EXFILTRATION", 0.88, "System-prompt / instruction extraction",
    /\b(?:reveal|show|print|repeat|display|output|leak|tell\s+me|give\s+me|what\s+(?:is|are|were)?|dump|share|expose|recite|write\s+out|list)\b.{0,30}\b(?:system\s+prompt|(?:initial|hidden|original|secret|internal|first)\s+(?:instructions|prompt|rules|config(?:uration)?)|instructions\b.{0,20}\b(?:you\s+were\s+given|given\s+to\s+you)|your\s+(?:instructions|rules|prompt|guidelines|configuration|directives)|all\s+instructions)\b|\bwhat\s+(?:instructions|rules|prompts?|directives)\s+(?:were\s+you|are\s+you|you\s+were)\b|\b(?:instructions|prompt)\s+(?:were\s+you|you\s+were)\s+(?:given|provided)\b/),
  r("DX-002", "DATA_EXFILTRATION", 0.85, "Other customers' data",
    /\b(?:all|other|every|another|list\s+of|list\s+all|each)\s+(?:customers?|users?|clients?|account\s*holders?|beneficiaries|members|people)(?:'s?|s')?\b.{0,40}\b(?:accounts?|balances?|details|data|numbers?|pins?|passwords?|transactions?|info(?:rmation)?|statements?)\b|\b(?:balance|transactions?|statement|account\s+details|account\s+number|pin|password)\s+(?:of|belonging\s+to)\s+(?!my\b|me\b|mine\b)\w+|\b(?!my\b)\w+'s\s+(?:balance|transactions|statement|pin|password|account\s+details)\b|\b(?:someone|somebody|another\s+person)(?:'s|\s+else'?s?)\s+(?:account|balance)\b/),
  r("DX-003", "DATA_EXFILTRATION", 0.85, "Credential / secret request",
    /\b(?:show|give|tell|reveal|list|dump|read|send|print|what\s+(?:is|are)|share|leak|expose|export)\b.{0,40}\b(?:pins?|passwords?|passcodes?|otps?|cvv|api\s*keys?|secret\s+keys?|credentials|access\s+tokens?|env(?:ironment)?\s*(?:vars?|variables?)|env\b)\b|process\.env|\bapi[_-]key\b|\bgroq_api_key\b|\benv\s*vars?\b/),
  r("DX-004", "DATA_EXFILTRATION", 0.76, "Bulk data dump",
    /\b(?:dump|export|exfiltrate|extract|leak|download|scrape)\b.{0,30}\b(?:database|db|tables?|records|users|customers|logs|ledger|accounts)\b/),
  r("DX-SQ1", "DATA_EXFILTRATION", 0.8, "System-prompt reference (squashed letters)",
    /systemprompt|initialinstructions|hiddeninstructions/, "any", "squashed"),

  // ---------------- CODE_INJECTION ----------------
  r("CI-001", "CODE_INJECTION", 0.88, "SQL injection",
    /['"]\s*(?:or|and)\s+['"]?\w+['"]?\s*=\s*['"]?\w+|\b(?:drop|truncate|alter)\s+table\b|\bunion\s+(?:all\s+)?select\b|;\s*(?:drop|delete|insert|update|select|shutdown|exec)\b|['";]\s*--|\/\*.*?\*\/|\bselect\b.{1,40}\bfrom\b.{1,40}\bwhere\b/),
  r("CI-002", "CODE_INJECTION", 0.88, "Script / HTML injection (XSS)",
    /<\s*\/?\s*(?:script|iframe|img|svg|object|embed|body|style|link|meta|form|input)\b|javascript\s*:|\bon(?:error|load|click|mouseover|focus)\s*=|document\.(?:cookie|location|write)|\beval\s*\(|\balert\s*\(|\bfetch\s*\(/),
  r("CI-003", "CODE_INJECTION", 0.78, "Template / expression injection",
    /\{\{.*?\}\}|\$\{[^}]*\}|<%.*?%>|\{%.*?%\}|#\{[^}]*\}/),
  r("CI-004", "CODE_INJECTION", 0.72, "Shell / command injection",
    /(?:;|&&|\|\|?)\s*(?:rm|cat|curl|wget|bash|sh|nc|powershell|python|node)\b|`[^`]+`|\$\([^)]*\)|\.\.\//),

  // ---------------- TOOL_HIJACKING ----------------
  r("TH-001", "TOOL_HIJACKING", 0.86, "Direct tool / function invocation",
    /\b(?:call|invoke|execute|run|trigger|fire|use)\s+(?:the\s+)?(?:[\w-]+[_\s])?(?:function|tool|api|endpoint|method|command|webhook)\b|\b(?:call|invoke|execute|run|trigger)\s+(?:the\s+)?(?:transfer|get_balance|get_history|send_money|payment)\b/),
  r("TH-002", "TOOL_HIJACKING", 0.78, "Internal tool / argument names",
    /\b(?:get_balance|get_history|transfer_funds|send_money|payee_id|amount_paise|tool_calls?|function_call|tool_name)\b|\btransfer\s*\(/),
  r("TH-003", "TOOL_HIJACKING", 0.86, "JSON tool-call payload",
    /["']?\s*(?:tool|function|name|action|tool_name|method)\s*["']?\s*:\s*["']?\s*(?:transfer|get_balance|get_history|send)/),
  r("TH-004", "TOOL_HIJACKING", 0.62, "Raw key=value arguments",
    /\b(?:amount|payee|recipient|account|to|dest(?:ination)?)\s*=\s*\S+/),

  // ---------------- TRANSACTION_MANIPULATION ----------------
  r("TM-001", "TRANSACTION_MANIPULATION", 0.82, "Splitting to evade limits",
    /\b(?:split|break|divide|spread|chunk)\b.{0,50}\b(?:into|across|in)\b.{0,30}\b(?:transfers?|transactions?|payments?|parts?|chunks?|instal(?:l)?ments?|pieces|batches)\b|\b(?:stay|keep|remain|be)\s+(?:it\s+)?(?:under|below|within)\s+(?:the\s+)?(?:limit|threshold|radar)\b|\b(?:avoid|evade|dodge|get\s+around)\s+(?:the\s+)?(?:limits?|detection|flags?|threshold|monitoring)\b/),
  r("TM-002", "TRANSACTION_MANIPULATION", 0.85, "Drain entire balance",
    /\b(?:send|transfer|move|pay|wire|bhej\w*)\b.{0,30}\b(?:all|entire|whole|full|every|complete)\s+(?:of\s+)?(?:my\s+|the\s+)?(?:balance|money|funds|savings|amount|rupees?)\b|\b(?:all|entire|whole|every)\s+(?:of\s+)?(?:my\s+)?(?:balance|money|funds|savings)\b.{0,30}\b(?:to|send|transfer|bhej\w*)\b|\bempty\s+(?:my|the)\s+account\b|\bdrain\b|\b(?:poora|pura|saara|sara|sab|saare)\s+(?:balance|paisa|paise|paisa)\b/),
  r("TM-003", "TRANSACTION_MANIPULATION", 0.78, "Repeated transfers",
    /\b(?:\d+|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|multiple|many|several)\s+times\b|\brepeat(?:edly)?\b.{0,30}\b(?:transfer|send|payment|this|it)\b|\b(?:every|each)\s+(?:minute|hour|second)\b|\bin\s+a\s+loop\b|\bkeep\s+(?:sending|transferring|paying)\b|\b\d+\s+baar\b/),
  r("TM-004", "TRANSACTION_MANIPULATION", 0.8, "Mass transfer to all contacts",
    /\b(?:to|send|transfer|pay)\b.{0,30}\b(?:all|every|each)\s+(?:of\s+)?(?:my\s+)?(?:contacts|payees|beneficiaries|recipients|friends|accounts)\b|\beveryone\s+in\s+my\b|\bsab\s*ko\b/),
  r("TM-005", "TRANSACTION_MANIPULATION", 0.82, "Limit change request",
    /\b(?:increase|raise|change|modify|set|remove|lift|update|double|bump|override|extend|disable|hatao|badhao)\b.{0,30}\b(?:limits?|caps?|thresholds?|ceiling)\b|\blimits?\s+(?:hatao|hata\s+do|badhao|badha\s+do|khatam|remove|hata|band)\b/),
  r("TM-SQ1", "TRANSACTION_MANIPULATION", 0.85, "Drain entire balance (squashed letters)",
    /(?:send|transfer|move|pay|wire)?all(?:my)?(?:balance|money|funds|savings)|emptyaccount|drainbalance/, "any", "squashed"),

  // ---------------- FRAUD_INDICATOR ----------------
  r("FR-001", "FRAUD_INDICATOR", 0.72, "Crypto destination",
    /\b(?:bitcoin|btc|crypto(?:currency)?|ethereum|usdt|tether|binance|metamask|monero|xmr|wallet\s+address)\b|\bbc1[a-z0-9]{20,60}\b|\b0x[a-f0-9]{40}\b/),
  r("FR-002", "FRAUD_INDICATOR", 0.72, "Offshore / laundering indicator",
    /\b(?:offshore|cayman|shell\s+compan(?:y|ies)|tax\s+haven|swiss\s+(?:bank\s+)?account|hawala|launder(?:ing)?)\b/),
  r("FR-003", "FRAUD_INDICATOR", 0.72, "Money-mule pattern",
    /\b(?:money\s+)?mules?\b|\breceiv\w*\s+(?:money|funds|payments?)\b.{0,50}\b(?:forward|pass\s+on|transfer\s+(?:it|them)\s+on)\b|\bforward\s+(?:it|the\s+money|the\s+funds|funds)\b/),
  r("FR-004", "FRAUD_INDICATOR", 0.6, "Prize / gift-card scam",
    /\b(?:gift\s*cards?|lottery|you\s+(?:have\s+)?won|claim\s+(?:your\s+)?prize|processing\s+fee)\b/),

  // ---------------- OUTPUT_MANIPULATION ----------------
  r("OM-001", "OUTPUT_MANIPULATION", 0.88, "Forged approval status",
    /\b(?:status|decision|verdict|result|approval)\b["'\s]*[:=]\s*["']?\s*(?:approved|allowed|safe|pass(?:ed)?|ok)\b/),
  r("OM-002", "OUTPUT_MANIPULATION", 0.86, "Forged risk score",
    /\brisk[_\s-]*(?:score|level|rating)?\b["'\s]*(?::|=|to|as|of|is|should\s+be)\s*["']?\s*(?:0|zero|low|none|minimal|nil)\b/),
  r("OM-003", "OUTPUT_MANIPULATION", 0.82, "Instruction to classify as safe",
    /\b(?:mark|flag|classify|label|treat|tag|consider|report|categori[sz]e|rate|set|return|output|respond|log)\b.{0,30}\b(?:as|with|to)\s+["']?(?:safe|benign|approved|legit(?:imate)?|clean|harmless|trusted|low[\s-]risk|non[\s-]?malicious)\b/),
  r("OM-004", "OUTPUT_MANIPULATION", 0.82, "References output-contract fields",
    /\bthreat[_\s-]?category\b|\brisk_score\b|\bis_attack\b|"status"|\bcategory\s*[:=]\s*["']?none\b/),
  r("OM-005", "OUTPUT_MANIPULATION", 0.62, "Dictates the response format",
    /\b(?:respond|reply|answer|output|return)\s+(?:only\s+)?(?:with|in)\s+(?:json|\{|"|the\s+following)/),
  r("OM-006", "OUTPUT_MANIPULATION", 0.82, "Blanket auto-approval",
    /\b(?:always|automatically|auto[-\s]?)\s*(?:approve|allow|accept|authori[sz]e)\b|\b(?:approve|allow|authori[sz]e)\s+(?:all|every|any|everything)\b|\b(?:approve|authori[sz]e)\s+(?:this|it|my|the)\b.{0,40}\b(?:without|no)\b/),

  // ---------------- Hinglish overrides ----------------
  r("PI-HI1", "PROMPT_INJECTION", 0.9, "Hinglish instruction override (rules ignore karo)",
    /\b(?:rules?|niyam|instructions?|guidelines?|restrictions?|checks?|hidayat|firewalls?|limits?|security|safety|monitoring)\s+(?:ko\s+)?(?:ignore|bhool|bhul|chhod|chod|todo|tod|skip|bypass|disable|hatao|turn\s*off)\s*(?:karo|kar\s+do|kardo|karke|jao|ja|do|de|dena|kar)?\b|\b(?:ignore|bhool|bhul)\s+(?:karo|jao|ja)\b/),
  r("PI-HI2", "PROMPT_INJECTION", 0.85, "Hinglish override (squashed letters)",
    /(?:rules|niyam|instructions|firewall|limits)(?:ko)?(?:ignore|bhool|bhul|skip|bypass)(?:karo|jao|kardo)/, "any", "squashed"),

  // ---------------- OBFUSCATION ----------------
  r("OB-001", "OBFUSCATION", 0.72, "Decode-and-follow instruction",
    /\b(?:decode|decrypt|deobfuscate|base64|rot13|hex|reverse|unscramble)\b.{0,40}\b(?:follow|execute|obey|run|do|comply|apply|perform|act\s+on)\b/),

  // ---------------- MEMO-ONLY (memo is data, never instructions) ----------------
  r("MI-001", "MEMO_INJECTION", 0.82, "Imperative aimed at the system inside memo",
    /\b(?:approve|approved|authori[sz]e|ignore|disregard|override|bypass|execute|whitelist|allow\s+this|unlock|grant|disable|enable|confirm\s+(?:this|transfer))\b/, "memo"),
  r("MI-002", "MEMO_INJECTION", 0.82, "Memo requests an additional transfer",
    /\b(?:also|then|and|plus|additionally|next|further|another)\s+(?:send|transfer|pay|wire|move|credit|bhej\w*|authori[sz]e)\b|\b(?:send|transfer|pay|wire|move|authori[sz]e)\s+(?:a\s+further\s+|another\s+)?(?:₹|rs\.?|inr)?\s*\d[\d,.]*\s*(?:k|lakh|rupees)?\s*(?:to|into)\b/, "memo"),
  r("MI-003", "MEMO_INJECTION", 0.85, "Memo addresses the AI / system",
    /\b(?:dear|hey|hi|hello|attention|note\s+to(?:\s+the)?|to\s+the)\s+(?:ai|assistant|bot|gpt|llm|model|system|firewall|agent|chatbot)\b|\b(?:ai|assistant|bot|system|model)\s*[,:]\s*(?:please|you|kindly|this|the|approve|ignore|override|authori[sz]e)/, "memo"),
  r("MI-004", "MEMO_INJECTION", 0.75, "Markup / JSON characters in memo",
    /[{}<>`\\|]|<!--.*?-->/, "memo", "nfkc"),
  r("MI-005", "MEMO_INJECTION", 0.68, "URL / link in memo",
    /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|ru|cn|tk|top|in|co|ly|me|app|site|link|click|info|biz)\b/, "memo", "nfkc"),
  r("MI-006", "MEMO_INJECTION", 0.55, "Encoded blob in memo",
    /[a-z0-9+/]{16,}={0,2}/i, "memo", "nfkc"),
]);

/** Characters allowed in a memo: letters, combining marks, digits, spaces, basic punctuation, emoji. */
const MEMO_SAFE_CHAR = /[\p{L}\p{M}\p{N}\p{Zs}.,'"\-\/&()#:!?₹+@%_\u200c\u200d\p{Extended_Pictographic}]/u;
// MI-004 handles markup chars; the allow-list rule flags anything else unusual (e.g. = ; $ [ ] ^ ~ *).
const MEMO_MARKUP = /[{}<>`\\|]/;

const FLAG_RULES: Record<ObfuscationFlag, { id: string; weight: number; label: string }> = {
  INVISIBLE_CHARACTERS: { id: "OB-INV", weight: 0.4, label: "Invisible / zero-width / bidi characters" },
  MIXED_SCRIPT_HOMOGLYPHS: { id: "OB-HOM", weight: 0.45, label: "Mixed-script homoglyphs (Cyrillic/Greek look-alikes)" },
  ENCODED_PAYLOAD: { id: "OB-ENC", weight: 0.4, label: "Embedded encoded payload (base64/hex/URL/escapes/entities)" },
  SPACED_CHARACTERS: { id: "OB-SPC", weight: 0.35, label: "Spaced-out letters to evade matching" },
  UNICODE_COMPATIBILITY_FORMS: { id: "OB-CMP", weight: 0.35, label: "Unicode compatibility forms (full-width / styled letters)" },
};

/** Category priority for tie-breaking (earlier = more severe). */
export const CATEGORY_PRIORITY: readonly AttackCategory[] = [
  "MEMO_INJECTION",
  "PROMPT_INJECTION",
  "OUTPUT_MANIPULATION",
  "TOOL_HIJACKING",
  "CODE_INJECTION",
  "JAILBREAK",
  "ROLEPLAY_ATTACK",
  "AUTHORITY_IMPERSONATION",
  "DATA_EXFILTRATION",
  "TRANSACTION_MANIPULATION",
  "FRAUD_INDICATOR",
  "SOCIAL_ENGINEERING",
  "OBFUSCATION",
];

function snippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 15);
  const end = Math.min(text.length, index + length + 15);
  let s = text.slice(start, end).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (s.length > 80) s = s.slice(0, 77) + "...";
  return (start > 0 ? "…" : "") + s + (end < text.length ? "…" : "");
}

export interface ScanInput {
  message: string;
  /** Explicit memo field and/or inline "memo: …" extracted from the message. */
  memos: string[];
}

export interface ScanResult {
  signals: Signal[];
  rule_risk: number;
  normalized: { message: NormalizedText; memos: NormalizedText[] };
}

function scanField(norm: NormalizedText, field: SignalField, isMemo: boolean): Signal[] {
  const signals: Signal[] = [];
  for (const rule of RULES) {
    if (rule.scope === "memo" && !isMemo) continue;
    const views =
      rule.views === "squashed"
        ? norm.views.filter((v) => v.name === "squashed")
        : rule.views === "nfkc"
          ? norm.views.filter((v) => v.name === "nfkc")
          : norm.views.filter((v) => v.name !== "squashed");
    for (const view of views) {
      const m = rule.pattern.exec(view.text);
      if (m) {
        let span: { start: number; end: number } | undefined;
        let via_view: string | undefined;

        // Match against original plain text (lowercased)
        const origLower = norm.original.toLowerCase();
        const origMatch = rule.pattern.exec(origLower);

        // A plain view match occurs when nfkc view matched AND original plain text matches
        if (view.name === "nfkc" && origMatch) {
          span = {
            start: origMatch.index,
            end: origMatch.index + origMatch[0].length,
          };
        } else {
          via_view = view.name;
        }

        signals.push({
          rule_id: rule.id,
          category: rule.category,
          label: rule.label,
          weight: rule.weight,
          field,
          view: view.name,
          evidence: snippet(view.text, m.index, m[0].length),
          ...(span ? { span } : {}),
          ...(via_view ? { via_view } : {}),
        });
        break; // first matching view is enough for this rule/field
      }
    }
  }

  for (const flag of norm.flags) {
    const f = FLAG_RULES[flag];
    signals.push({
      rule_id: f.id,
      category: isMemo ? "MEMO_INJECTION" : "OBFUSCATION",
      label: isMemo ? `Memo: ${f.label}` : f.label,
      weight: f.weight,
      field,
      view: "raw",
      evidence: flag,
      via_view: flag.toLowerCase(),
    });
  }

  if (isMemo) {
    const nfkc = norm.views.find((v) => v.name === "nfkc")?.text ?? "";
    const bad = Array.from(nfkc).filter((c) => !MEMO_SAFE_CHAR.test(c) && !MEMO_MARKUP.test(c));
    if (bad.length > 0) {
      signals.push({
        rule_id: "MI-007",
        category: "MEMO_INJECTION",
        label: "Characters outside the memo allow-list",
        weight: 0.5,
        field,
        view: "nfkc",
        evidence: `disallowed: ${[...new Set(bad)].slice(0, 8).join(" ")}`,
      });
    }
  }
  return signals;
}

/** Noisy-OR over unique rule ids (max weight per rule) → integer 0–100. */
export function combineRisk(signals: readonly Signal[]): number {
  const byRule = new Map<string, number>();
  for (const s of signals) byRule.set(s.rule_id, Math.max(byRule.get(s.rule_id) ?? 0, s.weight));
  let pSafe = 1;
  for (const id of [...byRule.keys()].sort()) pSafe *= 1 - byRule.get(id)!;
  return Math.max(0, Math.min(100, Math.round((1 - pSafe) * 100)));
}

/** The category that best describes the signal set. Memo-borne threats report MEMO_INJECTION. */
export function primaryCategory(signals: readonly Signal[]): AttackCategory | null {
  if (signals.length === 0) return null;
  const sorted = [...signals].sort(
    (a, b) =>
      b.weight - a.weight ||
      CATEGORY_PRIORITY.indexOf(a.category) - CATEGORY_PRIORITY.indexOf(b.category),
  );
  const top = sorted[0]!;
  if (top.field === "memo") return "MEMO_INJECTION";
  return top.category;
}

/**
 * Scans normalized message and memo fields against all deterministic threat signatures.
 *
 * @param input - Pre-extracted message and array of memo strings.
 * @returns ScanResult containing identified signals, aggregate noisy-OR rule risk (0–100), and normalized views.
 */
export function scan(input: ScanInput): ScanResult {
  const message = normalizeText(input.message);
  const memos = input.memos.map((m) => normalizeText(m));
  const signals: Signal[] = [
    ...scanField(message, "message", false),
    ...memos.flatMap((m) => scanField(m, "memo", true)),
  ];
  // Stable ordering: heaviest first, then rule id, then field.
  signals.sort(
    (a, b) => b.weight - a.weight || a.rule_id.localeCompare(b.rule_id) || a.field.localeCompare(b.field),
  );
  // Collapse duplicates (same rule in two memo segments).
  const unique = signals.filter(
    (s, i) => signals.findIndex((o) => o.rule_id === s.rule_id && o.field === s.field) === i,
  );
  return { signals: unique, rule_risk: combineRisk(unique), normalized: { message, memos } };
}
