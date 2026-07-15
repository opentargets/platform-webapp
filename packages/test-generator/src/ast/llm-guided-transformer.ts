/**
 * LLM-Guided AST Transformer
 * 
 * This module applies data-testid attributes to React components using AST transformations
 * guided by LLM-generated suggestions. The LLM provides intelligent reasoning about which
 * elements need test IDs, while the AST ensures reliable, accurate code modifications.
 */

import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { parseCode, generateCode } from './parser';
import { hasDataTestId, addDataTestId, getJSXElementName, getStringAttribute } from './jsx-utils';

/**
 * A structured suggestion from the LLM for adding a data-testid
 */
export interface LLMTestIdSuggestion {
  /** File name (e.g., "Body", "BodyContent") */
  file: string;
  /** JSX element/component name (e.g., "Link", "Box", "TableCell") */
  elementName: string;
  /** The data-testid value to add */
  testId: string;
  /** Why this element needs a testid */
  reason: string;
  /** Attributes to match for disambiguation */
  matchAttributes?: Record<string, string>;
  /** If element is the Nth occurrence (1-based) */
  occurrence?: number;
  /** Parent element name for disambiguation */
  parentElement?: string;
}

/**
 * Result of applying a single suggestion
 */
export interface SuggestionApplicationResult {
  suggestion: LLMTestIdSuggestion;
  applied: boolean;
  reason: string;
}

/**
 * Result of applying all suggestions to a file
 */
export interface FileTransformResult {
  /** The transformed code */
  code: string;
  /** Whether any changes were made */
  modified: boolean;
  /** Results for each suggestion */
  results: SuggestionApplicationResult[];
  /** Number of test IDs successfully applied */
  applied: number;
  /** Number of suggestions that couldn't be applied */
  failed: number;
}

/**
 * Check if a JSX element matches the given attributes
 */
function matchesAttributes(
  element: t.JSXElement,
  matchAttributes: Record<string, string>
): boolean {
  const attrs = element.openingElement.attributes;
  
  for (const [attrName, expectedValue] of Object.entries(matchAttributes)) {
    let found = false;
    
    for (const attr of attrs) {
      if (!t.isJSXAttribute(attr)) continue;
      if (!t.isJSXIdentifier(attr.name)) continue;
      if (attr.name.name !== attrName) continue;
      
      // Handle boolean attributes (e.g., external={true} or just "external")
      if (expectedValue === 'true' || expectedValue === true.toString()) {
        // Check for boolean true: external, external={true}
        if (attr.value === null) {
          // <Link external /> - attribute without value means true
          found = true;
          break;
        }
        if (t.isJSXExpressionContainer(attr.value) && 
            t.isBooleanLiteral(attr.value.expression) && 
            attr.value.expression.value === true) {
          found = true;
          break;
        }
      }
      
      // Handle string values
      if (t.isStringLiteral(attr.value) && attr.value.value === expectedValue) {
        found = true;
        break;
      }
      
      // Handle JSX expression containers with string literals
      if (t.isJSXExpressionContainer(attr.value) && 
          t.isStringLiteral(attr.value.expression) && 
          attr.value.expression.value === expectedValue) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get the parent JSX element name from the path
 */
function getParentElementName(path: NodePath<t.JSXElement>): string | null {
  let parentPath: NodePath | null = path.parentPath;
  
  // Walk up to find parent JSX element
  while (parentPath) {
    if (parentPath.isJSXElement()) {
      return getJSXElementName(parentPath.node as t.JSXElement);
    }
    parentPath = parentPath.parentPath;
  }
  
  return null;
}

/**
 * Apply LLM-generated test ID suggestions to a source file using AST
 * 
 * @param code - The source code to transform
 * @param suggestions - Array of suggestions (filtered to this file)
 * @param options - Transform options
 * @returns Transform result with modified code and application status
 */
export function applyTestIdSuggestions(
  code: string,
  suggestions: LLMTestIdSuggestion[],
  options: { verbose?: boolean; dryRun?: boolean } = {}
): FileTransformResult {
  const { verbose = false, dryRun = false } = options;
  
  if (suggestions.length === 0) {
    return {
      code,
      modified: false,
      results: [],
      applied: 0,
      failed: 0,
    };
  }
  
  const ast = parseCode(code);
  const results: SuggestionApplicationResult[] = [];
  
  // Track occurrences of each element name
  const occurrenceCounters = new Map<string, number>();
  
  // Track which suggestions have been applied
  const appliedSuggestions = new Set<number>();
  
  // Find and process matching elements
  traverse(ast as t.Node, {
    JSXElement(path) {
      const node = path.node;
      const elementName = getJSXElementName(node);
      
      if (!elementName) return;
      
      // Increment occurrence counter for this element name
      const currentOccurrence = (occurrenceCounters.get(elementName) || 0) + 1;
      occurrenceCounters.set(elementName, currentOccurrence);
      
      // Skip if already has data-testid
      if (hasDataTestId(node)) return;
      
      // Find matching suggestions
      for (let i = 0; i < suggestions.length; i++) {
        if (appliedSuggestions.has(i)) continue;
        
        const suggestion = suggestions[i];
        
        // Check element name match
        if (suggestion.elementName !== elementName) continue;
        
        // Check parent element if specified
        if (suggestion.parentElement) {
          const parentName = getParentElementName(path);
          if (parentName !== suggestion.parentElement) continue;
        }
        
        // Check occurrence if specified
        if (suggestion.occurrence && suggestion.occurrence !== currentOccurrence) {
          continue;
        }
        
        // Check attribute matching if specified
        if (suggestion.matchAttributes && 
            !matchesAttributes(node, suggestion.matchAttributes)) {
          continue;
        }
        
        // All conditions match - apply the test ID
        if (!dryRun) {
          addDataTestId(node, suggestion.testId);
        }
        
        appliedSuggestions.add(i);
        
        if (verbose) {
          console.log(`      Applied: ${suggestion.testId} to <${elementName}>`);
        }
        
        results.push({
          suggestion,
          applied: true,
          reason: 'Successfully matched and applied',
        });
        
        // Only apply one suggestion per element
        break;
      }
    },
  });
  
  // Report suggestions that weren't applied
  for (let i = 0; i < suggestions.length; i++) {
    if (!appliedSuggestions.has(i)) {
      const suggestion = suggestions[i];
      
      if (verbose) {
        console.log(`      Failed: Could not find matching element for ${suggestion.testId}`);
      }
      
      results.push({
        suggestion,
        applied: false,
        reason: `Could not find <${suggestion.elementName}> matching the specified criteria`,
      });
    }
  }
  
  const applied = results.filter(r => r.applied).length;
  const failed = results.filter(r => !r.applied).length;
  
  return {
    code: dryRun ? code : generateCode(ast),
    modified: applied > 0 && !dryRun,
    results,
    applied,
    failed,
  };
}

/**
 * Apply suggestions to multiple files
 */
export function applyTestIdSuggestionsToFiles(
  sources: Record<string, string>,
  suggestions: LLMTestIdSuggestion[],
  options: { verbose?: boolean; dryRun?: boolean } = {}
): Map<string, FileTransformResult> {
  const results = new Map<string, FileTransformResult>();
  
  // Group suggestions by file
  const suggestionsByFile = new Map<string, LLMTestIdSuggestion[]>();
  for (const suggestion of suggestions) {
    const existing = suggestionsByFile.get(suggestion.file) || [];
    existing.push(suggestion);
    suggestionsByFile.set(suggestion.file, existing);
  }
  
  // Process each file
  for (const [fileName, fileSuggestions] of suggestionsByFile) {
    const source = sources[fileName];
    
    if (!source) {
      // File not found - mark all suggestions as failed
      results.set(fileName, {
        code: '',
        modified: false,
        results: fileSuggestions.map(s => ({
          suggestion: s,
          applied: false,
          reason: `Source file "${fileName}" not found`,
        })),
        applied: 0,
        failed: fileSuggestions.length,
      });
      continue;
    }
    
    const result = applyTestIdSuggestions(source, fileSuggestions, options);
    results.set(fileName, result);
  }
  
  return results;
}
