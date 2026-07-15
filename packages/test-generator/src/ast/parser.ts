/**
 * AST parsing utilities using recast and @babel/parser
 */

import * as recast from 'recast';
import * as babelParser from '@babel/parser';

/**
 * Custom parser for recast that uses @babel/parser
 */
const babelParserForRecast = {
  parse(source: string) {
    return babelParser.parse(source, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
      ],
      tokens: true,
    });
  },
};

/**
 * Parse source code into an AST
 */
export function parseCode(code: string): recast.types.ASTNode {
  return recast.parse(code, {
    parser: babelParserForRecast,
  });
}

/**
 * Generate code from AST, preserving original formatting where possible
 */
export function generateCode(ast: recast.types.ASTNode): string {
  return recast.print(ast).code;
}
