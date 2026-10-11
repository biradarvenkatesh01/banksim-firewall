# BankSim AI Firewall — Executive Abstract

### Problem Understanding
Modern conversational AI assistants are increasingly integrated into financial institutions to allow customers to check balances, review spending, and transfer funds using natural language. However, large language models (LLMs) are fundamentally vulnerable to prompt injection, jailbreaks, persona adoption, and adversarial manipulation. Because conversational banking turns untrusted user text into real-world money movement, an attacker who tricks an assistant into bypassing controls can initiate unauthorized wire transfers, drain customer savings, or leak confidential account records. In banking, safety cannot rely on probabilistic model alignment; it requires strict, provable guarantees.

### Strategy
BankSim introduces a zero-trust, blue-team defense architecture positioned directly between the user interface and the financial tool execution layer. Every user message and transaction memo is treated as untrusted and potentially hostile. The firewall routes incoming requests through an eight-station pipeline: enforcing strict input size contracts, canonicalizing text across three representations (normalizing Unicode, stripping invisible control glyphs, and reversing leet-speak obfuscation), applying deterministic pattern detectors across thirteen attack categories, and verifying financial guardrails such as daily spend caps and pre-registered payee accounts.

### Novelty
Our primary architectural insight is that **the language model advises, but never decides**. Many existing AI safety wrappers ask an LLM whether a prompt is safe—leaving the safety filter itself vulnerable to prompt injection. In BankSim, deterministic rule signatures hold executive authority. An optional secondary LLM classifier (powered by Groq) is strictly isolated using cryptographic nonce delimiters and hidden canary tokens, and mathematically operates under an add-only risk model: it can increase the threat score, but has zero authority to clear a detected violation or invoke tools.

### What the Prototype Demonstrates
The running prototype demonstrates a fully functional mock banking desk built with TypeScript and Next.js. Across a rigorous benchmark of 125 test vectors (102 main corpus cases: 71 attacks + 31 legitimate requests; plus 23 held-out validation scenarios: 16 attacks + 7 legitimate requests), the firewall achieves 100% attack detection (87/87 attacks blocked across both suites) and 100% legitimate request approval (38/38 benign transfers routed across both suites) with zero false positives. Every transaction produces an auditable, deterministic JSON docket explaining the exact risk score, evidence signals, and tool dispatch status.

---
- **Live Demo**: [https://banksim-firewall.vercel.app](https://banksim-firewall.vercel.app)
- **Architecture Deck**: [https://banksim-firewall.vercel.app/deck](https://banksim-firewall.vercel.app/deck)
- **Source Code**: [https://github.com/biradarvenkatesh01/banksim-firewall](https://github.com/biradarvenkatesh01/banksim-firewall)
