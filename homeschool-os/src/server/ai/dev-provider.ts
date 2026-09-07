import 'server-only';
import {
  type AIProvider,
  type DocumentTextProvider,
  type DocumentVisionProvider,
  type ExtractedText,
  type ExtractionRequest,
  type ExtractionResult,
  type ProviderOutcome,
  type ProviderUsage,
  type StructuredExtractionProvider,
  PROMPT_VERSION,
  buildExtractionPrompt,
  parseExtraction,
} from './providers';

/**
 * The development provider.
 *
 * It calls no vendor and costs nothing, and it is NOT a stub that returns a
 * canned answer. It reads the real bytes, applies real rules, and returns
 * per-field confidences that vary with what it could actually find - so the
 * whole pipeline (strategy choice, fencing, parsing, per-field review, cost
 * recording, retry) is exercised end to end without a network call.
 *
 * That matters more than it sounds. The interesting failures in this pipeline
 * are ours, not the model's: a field that should be null and isn't, a
 * suggestion that overwrites human data, an injection that changes behaviour, a
 * document analysed before it was scanned. All of those reproduce here.
 *
 * WHAT IT DOES NOT DO: guess. If the text does not say the date, the date is
 * null. A dev adapter that invented plausible values would make every test
 * green and every one of them meaningless.
 */

const PROVIDER = 'dev';
const MODEL = 'dev-extractor-1';

function usage(started: number, inputUnits: number, outputUnits: number): ProviderUsage {
  return {
    provider: PROVIDER,
    model: MODEL,
    inputUnits,
    outputUnits,
    estimatedCostUsd: 0, // local work; a real adapter computes from its rate card
    latencyMs: Date.now() - started,
  };
}

/** Pull the readable ASCII/Latin-1 runs out of arbitrary bytes. */
function readableText(bytes: Uint8Array, limit = 200_000): string {
  const raw = Buffer.from(bytes.slice(0, limit)).toString('latin1');
  const runs = raw.match(/[\x20-\x7E][\x20-\x7E\s]{3,}/g) ?? [];
  return runs.join('\n').replace(/\s+\n/g, '\n').trim();
}

class DevTextProvider implements DocumentTextProvider {
  readonly name = PROVIDER;
  async extractText(bytes: Uint8Array): Promise<ProviderOutcome<ExtractedText>> {
    const started = Date.now();
    const text = readableText(bytes);
    if (text.length === 0) {
      return {
        ok: false,
        error: 'no text layer could be read',
        retryable: false,
        usage: usage(started, bytes.byteLength, 0),
      };
    }
    return {
      ok: true,
      value: { text, pages: 1, pageConfidences: [0.9] },
      usage: usage(started, bytes.byteLength, text.length),
    };
  }
}

class DevVisionProvider implements DocumentVisionProvider {
  readonly name = PROVIDER;
  async readImage(bytes: Uint8Array): Promise<ProviderOutcome<ExtractedText>> {
    const started = Date.now();
    // A real vision model reads pixels. This one reads any text embedded in the
    // file, which is what the test fixtures carry, and reports a lower
    // confidence than the text path because that is honestly what an OCR pass
    // deserves.
    const text = readableText(bytes);
    return {
      ok: true,
      value: { text, pages: 1, pageConfidences: [text.length > 40 ? 0.7 : 0.3] },
      usage: usage(started, bytes.byteLength, text.length),
    };
  }
}

/* -------------------------------------------------------------------------- */

const SUBJECT_HINTS: [RegExp, string][] = [
  [/\b(fraction|multiplication|division|equation|geometry|decimal|arithmetic|math)\b/i, 'Math'],
  [/\b(reading|comprehension|novel|chapter|vocabulary|spelling|phonics)\b/i, 'Language Arts'],
  [/\b(science|experiment|hypothesis|photosynthesis|ecosystem|planet)\b/i, 'Science'],
  [/\b(history|geography|civics|constitution|timeline)\b/i, 'Social Studies'],
  [/\b(art|drawing|painting|sculpture)\b/i, 'Art'],
];

const TOPIC_HINTS: [RegExp, string][] = [
  [/\bequivalent fractions?\b/i, 'Equivalent Fractions'],
  [/\bcompar(e|ing) fractions?\b/i, 'Comparing Fractions'],
  [/\blong division\b/i, 'Long Division'],
  [/\bphotosynthesis\b/i, 'Photosynthesis'],
  [/\breading response\b/i, 'Reading Response'],
];

/** Words that make a document an official record rather than schoolwork. */
const OFFICIAL_HINTS =
  /\b(annual evaluation|evaluation report|certificate of|district|superintendent|official transcript|assessment report|standardized test)\b/i;

class DevStructuredProvider implements StructuredExtractionProvider {
  readonly name = PROVIDER;
  readonly promptVersion = PROMPT_VERSION;

  async extractFields(request: ExtractionRequest): Promise<ProviderOutcome<ExtractionResult>> {
    const started = Date.now();

    // Built and measured even though this adapter does not send it anywhere:
    // the prompt is part of what we are testing, and its size is what a real
    // provider would bill for.
    const prompt = buildExtractionPrompt(request);
    const promptSize = prompt.system.length + prompt.user.length;

    const text = request.documentText;
    if (text.trim().length === 0) {
      return {
        ok: false,
        error: 'nothing legible to extract from',
        retryable: false,
        usage: usage(started, promptSize, 0),
      };
    }

    const raw: {
      fields: Record<string, unknown>;
      possibleSkills: unknown[];
      unreadable: string[];
    } = { fields: {}, possibleSkills: [], unreadable: [] };

    const say = (key: string, value: unknown, confidence: number, evidence?: string) => {
      raw.fields[key] = { value, confidence, ...(evidence ? { evidence } : {}) };
    };

    const isOfficial = OFFICIAL_HINTS.test(text);

    // --- document kind ------------------------------------------------------
    if (isOfficial) {
      // Observable classification only. Nothing here says the document is
      // sufficient, accepted, valid or compliant - those are not observations
      // and no amount of confidence would make them so.
      say('document_kind', 'evaluation', 0.62, 'official-record vocabulary on the page');
      say('portfolio_kind', null, 0);
    } else {
      say('document_kind', 'student_work', 0.78, 'schoolwork layout');
      say('portfolio_kind', 'worksheet', 0.6);
    }

    // --- subject / topic ----------------------------------------------------
    const subject = SUBJECT_HINTS.find(([re]) => re.test(text));
    if (subject) {
      const known = request.context.subjectNames.find(
        (s) => s.toLowerCase() === subject[1].toLowerCase(),
      );
      say('subject', known ?? subject[1], known ? 0.86 : 0.64,
          `subject vocabulary matched "${subject[0].source.slice(0, 40)}"`);
    } else {
      say('subject', null, 0);
      raw.unreadable.push('subject');
    }

    const topic = TOPIC_HINTS.find(([re]) => re.test(text));
    if (topic) say('topic', topic[1], 0.81, 'topic named on the page');
    else { say('topic', null, 0); raw.unreadable.push('topic'); }

    // --- title --------------------------------------------------------------
    const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 3);
    if (topic) say('title', `${topic[1]} Practice`, 0.7, 'built from the topic on the page');
    else if (firstLine) say('title', firstLine.slice(0, 120), 0.45, 'first legible line');
    else say('title', null, 0);

    // --- date: only if the page actually carries one ------------------------
    const date = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
      ?? text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
    if (date) say('date', date[0], 0.74, `date printed on the page: "${date[0]}"`);
    else { say('date', null, 0); raw.unreadable.push('date'); }

    // --- a written name is TEXT, never an identity --------------------------
    const name = text.match(/\bName:\s*([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)/);
    if (name?.[1]) {
      say('student_name_if_visible', name[1], 0.55,
          'a name is written on the page; matching it to an account is a human decision');
    } else {
      say('student_name_if_visible', null, 0);
    }

    // --- curriculum references, only when literally printed -----------------
    const lesson = text.match(/\bLesson\s+([0-9]{1,3}(?:\.[0-9]{1,2})?)\b/i);
    say('lesson_number_if_visible', lesson?.[1] ?? null, lesson ? 0.8 : 0,
        lesson ? `"${lesson[0]}" printed on the page` : undefined);

    const course = request.context.enrolledCourses.find((c) =>
      text.toLowerCase().includes(c.name.toLowerCase()));
    say('course_name_if_visible', course?.name ?? null, course ? 0.72 : 0,
        course ? 'the course name is printed on the page' : undefined);
    say('curriculum_name_if_visible', course?.provider ?? null, course ? 0.6 : 0);

    const unit = text.match(/\bUnit\s+([A-Za-z0-9]{1,20})\b/i);
    say('unit_name_if_visible', unit?.[1] ?? null, unit ? 0.6 : 0);

    const assignment = text.match(/\bAssignment\s+([A-Za-z0-9.\-]{1,20})\b/i);
    say('assignment_name_if_visible', assignment?.[1] ?? null, assignment ? 0.6 : 0);

    const grade = text.match(/\bGrade\s+(\d{1,2})\b/i);
    say('grade_level_if_explicit', grade?.[1] ?? null, grade ? 0.7 : 0);

    const score = text.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/) ?? text.match(/\bScore:\s*(\d{1,3})%?/i);
    say('score_if_explicit', score?.[0] ?? null, score ? 0.75 : 0);

    say('short_portfolio_description',
        topic ? `Practice with ${topic[1].toLowerCase()}.` : null, topic ? 0.55 : 0);

    const keywords = [...new Set(
      (text.toLowerCase().match(/\b[a-z]{5,}\b/g) ?? []).slice(0, 200),
    )].slice(0, 8);
    say('keywords', keywords.length ? keywords : null, keywords.length ? 0.4 : 0);

    // --- possible skills ----------------------------------------------------
    // Matched against the skills WE track, by name and alias. Never invented.
    for (const skill of request.context.knownSkills) {
      const needle = skill.name.toLowerCase();
      const core = needle.replace(/^(understand|recognize|identify|generate|compare)\s+/i, '');
      if (text.toLowerCase().includes(core.slice(0, 24))) {
        raw.possibleSkills.push({
          name: skill.name,
          confidence: 0.6,
          evidence: 'the page uses the language of this skill',
        });
      }
    }

    const parsed = parseExtraction(raw);
    return {
      ok: true,
      value: parsed,
      usage: usage(started, promptSize, JSON.stringify(raw).length),
    };
  }
}

class DevAIProvider implements AIProvider {
  readonly name = PROVIDER;
  text = new DevTextProvider();
  vision = new DevVisionProvider();
  structured = new DevStructuredProvider();
}

/**
 * No provider. Nothing is analysed, nothing is suggested, nothing is charged.
 *
 * This is the DEFAULT, and it is the same principle as the null scanner: with
 * nothing configured the product does not pretend to have thought about a file.
 * Documents sit at analysis_status = 'not_requested' and the UI says nothing.
 */
class NullAIProvider implements AIProvider {
  readonly name = 'none';
}

export function getAIProvider(): AIProvider {
  switch (process.env.AI_PROVIDER) {
    case 'dev':
      return new DevAIProvider();
    // A real vendor adapter is added here and implements the same interfaces.
    // Nothing above this function learns its name.
    default:
      return new NullAIProvider();
  }
}
