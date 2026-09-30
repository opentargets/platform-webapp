export { formatReference, orderReferences, citationMarker } from "../citations";

export const figLabel = (n: number): string => `Fig. ${n}`;
export const tableLabel = (n: number, supplementary = false): string => `Table ${supplementary ? "S" : ""}${n}`;

/** Paper section numbers: chapters "1", "2"; H2 "1.1" (or "1" with no chapter yet); H3 one level deeper. */
export class SectionNumbering {
  private chapter = 0;
  private h2 = 0;
  private h3 = 0;

  nextChapter(): string {
    this.chapter += 1;
    this.h2 = 0;
    this.h3 = 0;
    return String(this.chapter);
  }

  nextHeading(level: 2 | 3): string {
    if (level === 2 || this.h2 === 0) {
      this.h2 += 1;
      this.h3 = 0;
      if (level === 2) return this.join(this.h2);
    }
    this.h3 += 1;
    return this.join(this.h2, this.h3);
  }

  get chapters(): number {
    return this.chapter;
  }

  private join(...parts: number[]): string {
    return (this.chapter > 0 ? [this.chapter, ...parts] : parts).join(".");
  }
}

export class Counter {
  private n = 0;
  next(): number {
    this.n += 1;
    return this.n;
  }
  get value(): number {
    return this.n;
  }
}

export const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};
