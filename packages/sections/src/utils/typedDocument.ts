import type { TypedDocumentNode } from "@apollo/client";

/**
 * Attaches the generated result and variables types (packages/ot-constants/src/types)
 * to a `.gql` import so that `useQuery`, `client.query` and the tables infer them.
 *
 * The cast goes through `unknown` on purpose: apps/platform resolves graphql 15 while
 * the packages resolve graphql 16, so the two `DocumentNode` types are not assignable
 * to each other even though the runtime object is the same.
 */
export function typedDocument<TData, TVariables = Record<string, never>>(
  document: unknown
): TypedDocumentNode<TData, TVariables> {
  return document as TypedDocumentNode<TData, TVariables>;
}
