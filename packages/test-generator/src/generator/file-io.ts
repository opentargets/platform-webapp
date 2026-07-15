/**
 * File I/O utilities for loading examples and writing generated files
 */

import * as fs from 'fs';
import * as path from 'path';
import { WidgetInfo, TestGeneratorConfig, DEFAULT_CONFIG } from '../types';

export interface Examples {
  interactor: string;
  interactorOntology: string;
  test: string;
  fixtures: string;
}

/**
 * Load example files for few-shot learning
 */
export function loadExamples(config: TestGeneratorConfig): Examples {
  const examples: Examples = {
    interactor: '',
    interactorOntology: '',
    test: '',
    fixtures: '',
  };

  const basePath = config.interactorOutputPath || DEFAULT_CONFIG.interactorOutputPath;
  const testBasePath = config.testOutputPath || DEFAULT_CONFIG.testOutputPath;
  const fixturesPath = config.fixturesPath || DEFAULT_CONFIG.fixturesPath;

  const paths = {
    interactor: path.join(basePath, 'KnownDrugs/knownDrugsSection.ts'),
    interactorOntology: path.join(basePath, 'Ontology/ontologySection.ts'),
    test: path.join(testBasePath, 'drug/drugIndications.spec.ts'),
    fixtures: fixturesPath,
  };

  for (const [key, filePath] of Object.entries(paths)) {
    if (fs.existsSync(filePath)) {
      examples[key as keyof Examples] = fs.readFileSync(filePath, 'utf-8');
    }
  }

  return examples;
}

/**
 * Write generated files to disk
 */
export function writeGeneratedFiles(
  widget: WidgetInfo,
  interactorCode: string,
  testCode: string,
  config: TestGeneratorConfig
): { interactorPath: string; testPath: string } {
  const interactorDir = path.join(
    config.interactorOutputPath || DEFAULT_CONFIG.interactorOutputPath,
    widget.name
  );
  const testDir = path.join(
    config.testOutputPath || DEFAULT_CONFIG.testOutputPath,
    widget.entity
  );

  if (!config.dryRun) {
    if (!fs.existsSync(interactorDir)) {
      fs.mkdirSync(interactorDir, { recursive: true });
    }
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  }

  const interactorFileName = `${widget.name.charAt(0).toLowerCase() + widget.name.slice(1)}Section.ts`;
  const interactorPath = path.join(interactorDir, interactorFileName);
  const testFileName = `${widget.name.toLowerCase()}.spec.ts`;
  const testPath = path.join(testDir, testFileName);

  if (!config.dryRun) {
    fs.writeFileSync(interactorPath, interactorCode);
    fs.writeFileSync(testPath, testCode);
  }

  return { interactorPath, testPath };
}
