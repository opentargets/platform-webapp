export interface ParsedGene {
  symbol: string;
  globalScore: number;
}

export interface ParseResult {
  genes: ParsedGene[];
  errors: string[];
}

export function parseGeneList(raw: string): ParseResult {
  const genes: ParsedGene[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>(); // symbol → index in genes[]

  const lines = raw.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    // Split on tab first, then any whitespace
    const parts = line.includes("\t") ? line.split("\t") : line.split(/\s+/);

    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: expected "symbol<tab>score", got "${line}"`);
      continue;
    }

    const symbol = parts[0].trim();
    const scoreRaw = parts[1].trim();
    const score = parseFloat(scoreRaw);

    if (!symbol) {
      errors.push(`Line ${i + 1}: empty symbol`);
      continue;
    }

    if (!isFinite(score)) {
      errors.push(`Line ${i + 1}: invalid score "${scoreRaw}" for symbol "${symbol}"`);
      continue;
    }

    const existingIdx = seen.get(symbol.toUpperCase());
    if (existingIdx !== undefined) {
      // Last occurrence wins
      genes[existingIdx] = { symbol, globalScore: score };
    } else {
      seen.set(symbol.toUpperCase(), genes.length);
      genes.push({ symbol, globalScore: score });
    }
  }

  return { genes, errors };
}

export function genesToText(genes: ParsedGene[]): string {
  return genes.map(g => `${g.symbol}\t${g.globalScore}`).join("\n");
}
