# 06 — AI Architecture

## 1. Abstraction layer (§33)

```ts
// lib/ai/types.ts — application code imports ONLY from here
export interface AIProvider {
  complete(req: CompletionRequest): Promise<CompletionResult>;
  stream(req: CompletionRequest): AsyncIterable<CompletionChunk>;
  structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>; // zod schema in, typed out
  readonly capabilities: { vision: boolean; longContext: boolean; structuredOutput: boolean };
}

export interface DocumentAnalysisProvider {
  extractText(file: FileRef): Promise<{ text: string; pages: PageText[]; usedOcr: boolean }>;
  analyzeDocument(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult>;
}

export interface EmailProvider   { send(msg: OutboundEmail): Promise<{ id: string; raw: unknown }> }
export interface StorageProvider { putSigned(...): …; getSignedUrl(path, ttl): …; move(...): …; }
export interface MalwareScanProvider { scan(path: string): Promise<'clean'|'infected'|'error'> }
export interface SignatureProvider   { capture(...) / verify(...) }
```

Adapters live in `lib/ai/providers/{anthropic,openai,mock}`. Selection is env-driven (`AI_PROVIDER`, `AI_MODEL_*` per feature) so a feature can run on a cheaper model without a code change. The `mock` provider returns fixtures and is the default in tests and CI — **no test ever calls a real model**.

Per-feature model routing (`config/ai.ts`): `document_analysis` (vision-capable), `lesson_generator`, `assistant`, `narration` (cheap, deterministic-ish, low temperature for reports and briefs).

## 2. Document analysis pipeline (§8)

```
FileRef → validate(mime, size, magic bytes)
        → text layer present? ──yes──► extract text (pdf-parse)
                              └──no───► rasterize pages → OCR (Tesseract adapter) → vision model pass
        → analyzeDocument(text, pageImages, contextHints)
              contextHints = family's student names/DOBs/grades, subjects, academic years,
                             active compliance rule titles  ← constrains hallucination
        → structured output, zod-validated, per-field confidence
        → persist document_ai_analysis + ai_suggestions
```

Structured contract (superset of §8's example, versioned as `document_analysis.v1`):
```json
{
  "document_type": "math_assessment",
  "type_confidence": 0.92,
  "student": { "value": "Lucas", "matched_student_id": "uuid|null", "confidence": 0.88 },
  "date": { "value": "2026-09-03", "confidence": 0.8 },
  "academic_year": "2026-2027",
  "subject": "math",
  "skills": [{ "name": "multiplication", "matched_skill_id": "uuid|null", "confidence": 0.9 }],
  "provider_or_teacher": null,
  "evaluator": null,
  "signatures_detected": false,
  "important_dates": [{ "label": "evaluation_due", "date": "2027-08-22" }],
  "score": { "earned": 18, "possible": 22, "percentage": 82, "confidence": 0.86 },
  "summary": "…",
  "category": "assessment",
  "missing_information": ["student last name", "evaluator signature"],
  "recommended_actions": ["add_to_portfolio", "update_skill_map"],
  "recommended_location": "Academics > Assessments",
  "overall_confidence": 0.87,
  "unreadable_regions": []
}
```

Hard rules:
- **The original file is never modified.** Extraction lives in `document_ai_analysis`; the file is content-addressed by `sha256`.
- **Nothing is auto-applied.** Every extraction becomes `ai_suggestions` rows (Spine 2).
- If a page is unreadable, the field is `null` with an entry in `unreadable_regions`. Fabricating a plausible value is a **release-blocking bug**, asserted against blank/garbled fixtures in `tests/ai`.
- Student matching only proposes students the *uploader already has access to*; the context hints are built from the permission-scoped query, so cross-family leakage is structurally impossible.

## 3. Confidence & disclosure UX (§39)

| Band | Threshold | UI behavior |
|---|---|---|
| High | ≥0.85 | Pre-filled; "I believe this is an Annual Evaluation (92% confidence). Please confirm." |
| Medium | 0.60–0.85 | Pre-filled with amber verify chips on uncertain fields |
| Low | <0.60 | Nothing pre-filled; "I couldn't confidently identify this document." + manual classification |
| Official docs | any | Always explicit confirmation, never one-click for evaluations/NOI/credentials |

Every AI-produced surface renders `<AIDisclosure>` — a standard component stating that content is AI-generated and must be reviewed. Status system includes `ai_suggested` and `user_confirmed` as distinct, visible states (§35).

## 4. AI Assistant (§28)

Architecture: **permission-scoped tool calling**, not free-form SQL and not a vector store over everything.

```
user prompt
  → build AssistantContext { userId, role, activeContext, studentIds: app.my_student_ids(), orgId }
  → model with a fixed tool set; every tool takes scope from AssistantContext, never from the prompt
  → tools execute against the *user-scoped* Supabase client (RLS applies a second time)
  → response streamed with citations (each claim links to the record that produced it)
  → ai_interactions row records permission_scope, tokens, cost
```

Tool catalog (each with a zod input schema and a role allowlist):
`get_student_summary` · `list_today_schedule` · `list_needs_attention` · `get_skill_map` ·
`list_recent_portfolio` · `get_compliance_status` · `list_missing_documents` · `search_documents` ·
`generate_lesson` · `summarize_progress` · `list_students_needing_review` (org) ·
`list_incomplete_lesson_plans` (org) · `list_upcoming_evaluations` (org) · `group_students_by_level` (teacher) ·
`propose_suggestion` (writes to `ai_suggestions` — the **only** write tool the assistant has).

Guardrails:
- The assistant has **no write access** to domain tables. It can only propose.
- `studentIds` is injected server-side. A prompt saying "show me all students in the district" returns only the caller's scope; the tool physically cannot widen it.
- Prompt-injection defense: document text and message bodies are passed inside clearly delimited untrusted blocks with instructions that content within is data, never instruction. Tool results are similarly delimited.
- Refusal domains: medical/psychological diagnosis, legal advice, and any statement that a family "is compliant." The system prompt and a post-generation regex/classifier check both enforce this; violations are logged.
- Per-tenant budgets from `ai_usage_counters`; on exhaustion the assistant degrades to deterministic views rather than failing hard.

## 5. Prompt management & evaluation

- Prompts are versioned modules (`lib/ai/prompts/v1/document_classify.ts`) with the version stored on every `ai_interactions` and `document_ai_analysis` row. A regression is always traceable to a prompt version.
- `tests/ai/golden/` holds ~40 de-identified fixture documents (evaluations, worksheets, assessments, receipts, handwritten pages, a deliberately blank scan, a rotated photo). CI asserts classification accuracy ≥ target, and **zero fabrication** on the blank/garbled fixtures.
- `ai_suggestions` acceptance/rejection rate per `kind` is the production quality metric, surfaced in `/admin/ai/evals`.

## 6. Cost, latency, safety operations
- Document analysis is asynchronous (job queue) with an optimistic "Analyzing…" state; the UI never blocks on a model call.
- Streaming for assistant and lesson generation; hard timeout 60s, then a graceful partial result.
- Every call logged to `ai_interactions` with cost; per-org monthly budget with soft (warn) and hard (block) limits.
- PII minimization: prompts send preferred names and initials rather than full legal names + DOB wherever the task does not require them; document text is sent as-is because it must be, and that is disclosed in the privacy policy and gated by the `ai_processing` consent.
