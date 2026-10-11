# Security Policy — BankSim Blue-Team AI Firewall

## Threat Model Summary
BankSim is designed to defend automated banking AI systems from adversarial prompt manipulations, data theft, and fraudulent transactions.
The threat model assumes every input is untrusted, whether arriving via customer chat messages or transaction memo fields.

### Key Threat Vectors
1. **Direct & Indirect Prompt Injections:** Instructions designed to override system guidance or force tool invocation without authorization.
2. **Jailbreaks & DAN Personas:** Deceptive framing instructing the AI to disregard compliance policies.
3. **Roleplay & Impersonation:** Adversaries posing as bank officials, security auditors, or law enforcement to demand emergency disbursements.
4. **Memo-Based Secondary Injections:** Payload splitting where innocuous chat messages hide destructive instructions in financial transaction memos.
5. **Obfuscation & Evasion:** Unicode homoglyphs, zero-width joiners, leetspeak, spacing mutations, and multi-lingual evasion (e.g. Hinglish).
6. **Financial Fraud:** Exceeding per-transaction limits (₹50,000), daily caps (₹1,00,000), multi-payee transfers, or unregistered beneficiaries.

---

## Defense in Depth Architecture

BankSim operates an 8-stage zero-trust defense pipeline:

1. **Stage 0 — Input Contract:** Enforces strict size limits (500 chars message, 140 chars memo) and type validation. Reject early.
2. **Stage 1 — Canonicalization:** Generates multiple normalized representations (NFKC, zero-width stripping, leetspeak translation, homoglyph mapping, spacing collapse) to eliminate evasion tactics.
3. **Stage 2 — Signature Scan:** High-coverage deterministic regex detectors weighted via independent probabilistic noisy-OR scoring.
4. **Stage 3 — Intent Grammar:** Strict grammar parses genuine banking intents (`check_balance`, `transfer_money`) vs ambiguous requests.
5. **Stage 4 — Semantic Classifier:** Groq LLM second-opinion with strict schema validation and deterministic caching.
6. **Stage 5 — Risk Decision Engine:** Dynamic threshold evaluation with a strict fail-closed grey zone policy (scores 25–49 block by default).
7. **Stage 6 — Policy Engine:** Real-world banking rules (KYC registered payees, single counterparty, balance checks, transaction velocity).
8. **Stage 7 — Tool Gatekeeper:** Sandboxed execution only on fully approved verdicts. No tools execute if blocked.

---

## Secret Handling & Environment Configuration

- **Zero Hardcoded Secrets:** BankSim strictly prohibits hardcoding API keys or credentials.
- **Environment Variables:** All secrets (`GROQ_API_KEY`, `GROQ_MODEL`) are read dynamically from runtime environment variables.
- **Template Safety:** Only `.env.example` with empty template placeholders is committed to version control; `.env*` files are ignored in `.gitignore`.
- **Graceful Fallback:** If `GROQ_API_KEY` is absent, the engine falls back gracefully to high-precision deterministic rules mode without leaking errors or credentials.

---

## Reporting a Security Vulnerability

If you discover a vulnerability or bypass in BankSim:
1. Do not open public issues with exploit payloads.
2. Report the vulnerability privately to the maintainers or repository owner via GitHub security advisories.
3. Provide reproduction steps, including the exact input message, memo, and engine mode (`rules-only` or `rules+llm`).
4. We aim to acknowledge reports within 24 hours and patch critical firewall escapes with high priority.
