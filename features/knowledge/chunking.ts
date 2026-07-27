export interface TextChunk {
  index: number;
  content: string;
  /** Rough estimate (chars / 4) — good enough to size embedding batches, not an exact tokenizer count. */
  tokenCount: number;
}

export interface ChunkingOptions {
  maxChars?: number;
  overlapChars?: number;
}

const DEFAULT_MAX_CHARS = 1800;
const DEFAULT_OVERLAP_CHARS = 200;

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function splitIntoSentences(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
  return sentences ? sentences.map((s) => s.trim()).filter(Boolean) : [paragraph];
}

/** Splits an oversized paragraph into pieces no larger than maxChars, breaking on sentence boundaries where possible. */
function splitOversizedParagraph(paragraph: string, maxChars: number): string[] {
  const sentences = splitIntoSentences(paragraph);
  const pieces: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length > maxChars && buffer) {
      pieces.push(buffer);
      buffer = sentence;
    } else {
      buffer = candidate;
    }
    // A single sentence longer than maxChars must still be hard-split.
    while (buffer.length > maxChars) {
      pieces.push(buffer.slice(0, maxChars));
      buffer = buffer.slice(maxChars);
    }
  }
  if (buffer) pieces.push(buffer);
  return pieces;
}

/**
 * Greedily groups paragraphs into chunks up to maxChars, carrying the tail of
 * each chunk into the next as overlap so retrieved passages keep surrounding context.
 */
export function chunkText(text: string, options: ChunkingOptions = {}): TextChunk[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const rawParagraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const paragraphs = rawParagraphs.flatMap((p) =>
    p.length > maxChars ? splitOversizedParagraph(p, maxChars) : [p],
  );

  const chunks: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && buffer) {
      chunks.push(buffer);
      const overlap = buffer.slice(Math.max(0, buffer.length - overlapChars));
      buffer = `${overlap}\n\n${paragraph}`;
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) chunks.push(buffer);

  return chunks.map((content, index) => ({
    index,
    content,
    tokenCount: estimateTokenCount(content),
  }));
}
