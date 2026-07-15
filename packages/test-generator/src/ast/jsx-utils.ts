/**
 * JSX element utilities for AST manipulation
 */

import * as t from '@babel/types';

/**
 * Check if a JSX element already has a data-testid attribute
 */
export function hasDataTestId(jsxElement: t.JSXElement): boolean {
  const attributes = jsxElement.openingElement.attributes || [];
  return attributes.some(
    (attr) =>
      t.isJSXAttribute(attr) &&
      t.isJSXIdentifier(attr.name) &&
      attr.name.name === 'data-testid'
  );
}

/**
 * Add a data-testid attribute to a JSX element
 */
export function addDataTestId(jsxElement: t.JSXElement, testId: string): boolean {
  if (hasDataTestId(jsxElement)) {
    return false;
  }

  const newAttribute = t.jsxAttribute(
    t.jsxIdentifier('data-testid'),
    t.stringLiteral(testId)
  );

  jsxElement.openingElement.attributes.unshift(newAttribute);
  return true;
}

/**
 * Get the name of a JSX element
 */
export function getJSXElementName(jsxElement: t.JSXElement): string | null {
  const openingElement = jsxElement.openingElement;
  if (t.isJSXIdentifier(openingElement.name)) {
    return openingElement.name.name;
  } else if (t.isJSXMemberExpression(openingElement.name)) {
    const obj = openingElement.name.object;
    if (t.isJSXIdentifier(obj)) {
      return `${obj.name}.${openingElement.name.property.name}`;
    }
  }
  return null;
}

/**
 * Check if element has a specific prop/attribute
 */
export function hasAttribute(jsxElement: t.JSXElement, attrName: string): boolean {
  const attributes = jsxElement.openingElement.attributes || [];
  return attributes.some(
    (attr) =>
      t.isJSXAttribute(attr) &&
      t.isJSXIdentifier(attr.name) &&
      attr.name.name === attrName
  );
}

/**
 * Get the value of a string attribute
 */
export function getStringAttribute(
  jsxElement: t.JSXElement,
  attrName: string
): string | null {
  const attributes = jsxElement.openingElement.attributes || [];
  for (const attr of attributes) {
    if (
      t.isJSXAttribute(attr) &&
      t.isJSXIdentifier(attr.name) &&
      attr.name.name === attrName
    ) {
      if (t.isStringLiteral(attr.value)) {
        return attr.value.value;
      }
    }
  }
  return null;
}
