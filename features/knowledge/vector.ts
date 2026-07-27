/** Formats a raw embedding vector as a pgvector input literal, e.g. "[0.1,0.2,0.3]". */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((n) => n.toFixed(8)).join(",")}]`;
}
