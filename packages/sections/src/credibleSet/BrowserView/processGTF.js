// parseGTFChr.js
import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import path from 'path';

// === CONFIG ===
const GTF_FILE = "/Users/gmcneill/projects/ensembl-data/Homo_sapiens.GRCh38.115.gtf.gz"; // downloaded GTF
const OUTPUT_DIR = './packages/sections/src/credibleSet/BrowserView/genesByChromosome/';

// Create output directory if missing
// if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// --- Helper: parse GTF attributes ---
function parseAttributes(attrStr) {
  const attrs = {};
  attrStr.split(';').forEach(a => {
    const [key, value] = a.trim().split(' ');
    if (key && value) {
      attrs[key] = value.replace(/"/g, '');
    }
  });
  return attrs;
}

// --- Data container ---
const chromosomes = {}; // { chr1: { ENSGxxx: {...} }, chr2: {...}, ... }

// --- Stream and parse gzipped GTF ---
const fileStream = fs.createReadStream(GTF_FILE).pipe(zlib.createGunzip(''));
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

rl.on('line', line => {
  if (!line || line.startsWith('#')) return;

  const cols = line.split('\t');
  if (cols.length !== 9) return;

  const [chr, source, feature, start, end, score, strand, frame, attrStr] = cols;
  const attr = parseAttributes(attrStr);

  // Only process main features
  if (!['gene', 'transcript', 'exon'].includes(feature)) return;

  // Initialize chromosome container
  if (!chromosomes[chr]) chromosomes[chr] = {};

  // --- Gene ---
  if (feature === 'gene') {
    const geneId = attr.gene_id;
    const geneBiotype = attr.gene_biotype || 'unknown';
    const geneName = attr.gene_name || attr.gene_symbol || null;

    chromosomes[chr][geneId] = {
      id: geneId,
      name: geneName,
      start: parseInt(start),
      end: parseInt(end),
      strand: strand === '+' ? 1 : -1,
      biotype: geneBiotype,
      // Temporary containers to select a representative transcript
      _exonsByT: {}, // transcriptId -> [{ start, end }]
      _best: null,   // { prio, id }
      exons: []
    };
  }

  // --- Transcript ---
  if (feature === 'transcript') {
    const geneId = attr.gene_id;
    const transcriptId = attr.transcript_id;
    const tag = attr.tag || '';

    // Heuristic priority: appris_principal (2) > basic (1) > others (0)
    const priority = tag.includes('appris_principal') ? 2 : (tag.includes('basic') ? 1 : 0);

    const g = chromosomes[chr]?.[geneId];
    if (g) {
      const prev = g._best || { prio: -1, id: null };
      if (priority > prev.prio) g._best = { prio: priority, id: transcriptId };
    }
  }

  // --- Exon ---
  if (feature === 'exon') {
    const geneId = attr.gene_id;
    const transcriptId = attr.transcript_id;

    const g = chromosomes[chr]?.[geneId];
    if (g) {
      if (!g._exonsByT[transcriptId]) g._exonsByT[transcriptId] = [];
      g._exonsByT[transcriptId].push({
        start: parseInt(start),
        end: parseInt(end)
      });
    }
  }
});

// --- When done, write per-chromosome JSON ---
rl.on('close', () => {
  console.log('Finished parsing GTF. Writing JSON files...');

  Object.entries(chromosomes).forEach(([chr, genesObj]) => {
    // Finalize each gene: choose best transcript (by tag priority, fallback to longest), and flatten exons
    for (const g of Object.values(genesObj)) {
      if (!g._best) {
        // Fallback: choose the longest transcript by total exon length
        let bestId = null;
        let bestLen = -1;
        for (const [tid, exs] of Object.entries(g._exonsByT)) {
          const len = exs.reduce((s, e) => s + (e.end - e.start + 1), 0);
          if (len > bestLen) { bestLen = len; bestId = tid; }
        }
        if (bestId) g._best = { prio: 0, id: bestId };
      }

      g.exons = g._best && g._exonsByT[g._best.id] ? g._exonsByT[g._best.id] : [];
      delete g._exonsByT;
      delete g._best;
    }

    // Convert to array and sort by start ascending
    const genesArray = Object.values(genesObj);
    genesArray.sort((a, b) => a.start - b.start);

    // Write JSON
    const outPath = path.join(OUTPUT_DIR, `chr${chr}.json`);
    fs.writeFileSync(outPath, JSON.stringify(genesArray, null, 2));

    console.log(`Saved ${outPath} (${genesArray.length} genes)`);
  });

  console.log('All chromosomes processed!');
});