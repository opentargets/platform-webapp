/**
 * Git utilities for detecting file changes
 */

import { execSync } from 'child_process';

/**
 * Execute a shell command and return the output
 */
export function exec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

/**
 * File change status from git diff
 */
export interface FileChanges {
  added: string[];
  modified: string[];
  deleted: string[];
  renamed: string[];
}

/**
 * Get the list of changed files in the PR compared to base branch
 */
export function getChangedFiles(baseBranch = 'main'): FileChanges {
  const diffOutput = exec(`git diff --name-status ${baseBranch}...HEAD`);

  const result: FileChanges = {
    added: [],
    modified: [],
    deleted: [],
    renamed: [],
  };

  if (!diffOutput) {
    return result;
  }

  const lines = diffOutput.split('\n').filter(Boolean);

  for (const line of lines) {
    const [status, ...fileParts] = line.split('\t');
    const filePath = fileParts.join('\t');

    switch (status) {
      case 'A':
        result.added.push(filePath);
        break;
      case 'M':
        result.modified.push(filePath);
        break;
      case 'D':
        result.deleted.push(filePath);
        break;
      default:
        if (status.startsWith('R')) {
          result.renamed.push(filePath);
        }
    }
  }

  return result;
}

/**
 * Get only new/added files (convenience function)
 */
export function getNewFiles(baseBranch = 'main'): { added: string[]; modified: string[] } {
  const changes = getChangedFiles(baseBranch);
  return { added: changes.added, modified: changes.modified };
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(): string {
  return exec('git rev-parse --abbrev-ref HEAD');
}

/**
 * Check if we're in a git repository
 */
export function isGitRepository(): boolean {
  return exec('git rev-parse --is-inside-work-tree') === 'true';
}
