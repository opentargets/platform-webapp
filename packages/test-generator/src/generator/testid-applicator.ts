/**
 * Data-testid application to widget source files
 */

import * as fs from 'fs';
import { WidgetInfo, TestGeneratorConfig } from '../types';
import { analyzeDataTestIds, DataTestIdAnalysis } from './analyzer';

export interface DataTestIdResult {
  applied: number;
  failed: number;
  files: string[];
  method: 'llm' | 'none';
  analysis?: DataTestIdAnalysis;
}

/**
 * Apply a single code change to a source string
 */
function applyCodeChange(
  source: string,
  original: string,
  modified: string
): { success: boolean; result: string } {
  // Normalize whitespace for comparison (but preserve in output)
  const normalizedSource = source.replace(/\s+/g, ' ');
  const normalizedOriginal = original.replace(/\s+/g, ' ');
  
  if (source.includes(original)) {
    // Exact match
    return { success: true, result: source.replace(original, modified) };
  }
  
  if (normalizedSource.includes(normalizedOriginal)) {
    // Whitespace-normalized match - need to find actual position
    // Try with trimmed lines
    const originalLines = original.split('\n').map(l => l.trim()).filter(Boolean);
    const sourceLines = source.split('\n');
    
    for (let i = 0; i < sourceLines.length; i++) {
      const trimmedSourceLine = sourceLines[i].trim();
      if (trimmedSourceLine.includes(originalLines[0])) {
        // Found potential match start, try to apply
        const startIdx = source.indexOf(trimmedSourceLine.includes(originalLines[0]) ? sourceLines[i].trim() : originalLines[0]);
        if (startIdx !== -1) {
          // Simple replacement on the line
          const newSource = source.replace(sourceLines[i], sourceLines[i].replace(
            originalLines[0],
            modified.split('\n').map(l => l.trim()).filter(Boolean)[0] || modified
          ));
          if (newSource !== source) {
            return { success: true, result: newSource };
          }
        }
      }
    }
  }
  
  return { success: false, result: source };
}

/**
 * Apply data-testids to widget source files using LLM analysis
 */
export async function applyDataTestIds(
  widget: WidgetInfo,
  config: TestGeneratorConfig
): Promise<DataTestIdResult> {
  if (config.skipDataTestIds) {
    return { applied: 0, failed: 0, files: [], method: 'none' };
  }

  // Get LLM analysis for data-testid suggestions
  const analysis = await analyzeDataTestIds(widget, config);
  
  if (!analysis.codeChanges || analysis.codeChanges.length === 0) {
    if (config.verbose) {
      console.log('    No data-testid changes suggested by LLM');
      if (analysis.reasoning) {
        console.log(`    Reasoning: ${analysis.reasoning}`);
      }
    }
    return { applied: 0, failed: 0, files: [], method: 'llm', analysis };
  }

  const modifiedFiles: string[] = [];
  let applied = 0;
  let failed = 0;

  // Group changes by file
  const changesByFile = new Map<string, typeof analysis.codeChanges>();
  for (const change of analysis.codeChanges) {
    const existing = changesByFile.get(change.file) || [];
    existing.push(change);
    changesByFile.set(change.file, existing);
  }

  // Apply changes to each file
  for (const [fileName, changes] of changesByFile) {
    const sourcePath = widget.sourcePaths?.[fileName];
    if (!sourcePath) {
      if (config.verbose) {
        console.log(`    Warning: Cannot find source path for ${fileName}`);
      }
      failed += changes.length;
      continue;
    }

    let source = widget.sources?.[fileName];
    if (!source) {
      try {
        source = fs.readFileSync(sourcePath, 'utf-8');
      } catch {
        if (config.verbose) {
          console.log(`    Warning: Cannot read ${sourcePath}`);
        }
        failed += changes.length;
        continue;
      }
    }

    let modified = false;
    let currentSource = source;

    for (const change of changes) {
      const { success, result } = applyCodeChange(currentSource, change.original, change.modified);
      
      if (success) {
        currentSource = result;
        modified = true;
        applied++;
        if (config.verbose) {
          console.log(`    Applied: ${change.description}`);
        }
      } else {
        failed++;
        if (config.verbose) {
          console.log(`    Failed to apply: ${change.description}`);
          console.log(`      Original not found: ${change.original.substring(0, 50)}...`);
        }
      }
    }

    if (modified && !config.dryRun) {
      fs.writeFileSync(sourcePath, currentSource);
      modifiedFiles.push(sourcePath);
      
      // Update widget sources with new code
      if (widget.sources) {
        widget.sources[fileName] = currentSource;
      }
    }
  }

  return {
    applied,
    failed,
    files: modifiedFiles,
    method: 'llm',
    analysis,
  };
}
