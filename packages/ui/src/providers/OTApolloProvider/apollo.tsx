import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from } from "@apollo/client";
import { Config } from "@ot/config";

export const createApolloClient = (config: Config) => {
  const httpLink = new HttpLink({
    uri: config.urlApi,
  });

  const errorLink = new ApolloLink((operation, forward) => {
    return forward(operation).map(response => {
      if (response.errors) {
        response.errors.forEach(error => {
          console.error(`GraphQL Error: ${error.message}`);
        });
      }
      return response;
    });
  });

  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache({
      possibleTypes: {
        EntityUnionType: ["Target", "Drug", "Disease", "Variant", "Gwas"],
      },
      typePolicies: {
        ScoredComponent: {
          keyFields: ["componentId", "score"],
        },
        Indications: {
          keyFields: [],
        },
        MechanismsOfAction: {
          keyFields: [],
        },
        Hallmarks: {
          keyFields: [],
        },
        AlleleFrequency: {
          keyFields: ["populationName"],
        },
        InSilicoPredictor: {
          keyFields: ["method"],
        },
        // CredibleSet has no `id`/`_id` field, so Apollo can't auto-normalize it -
        // every query touching Query.credibleSet(studyLocusId) collided in the same
        // embedded field-level cache slot instead of a shared entity, causing the
        // "cache data may be lost" merge warning. Some queries (e.g. GWASColocQuery's
        // root `credibleSet` result) don't select studyLocusId at that level, so a
        // function is used instead of a plain keyFields array - it falls back to
        // Apollo's default (embedded) behavior for those instead of throwing, while
        // still normalizing everywhere studyLocusId is present.
        CredibleSet: {
          keyFields: (obj, { readField }) => {
            const studyLocusId = readField("studyLocusId", obj as any);
            return studyLocusId ? `CredibleSet:${studyLocusId}` : false;
          },
          // Each credibleSet widget's Summary fragment selects a shallow/count-only
          // version of its own field (e.g. `colocalisation(...) { count }`), while its
          // full Body query selects a deep version with different args - genuinely
          // different, arg-keyed cache entries on the same normalized entity, not real
          // collisions, but Apollo warns without an explicit merge policy to prove it.
          fields: {
            colocalisation: { merge: true },
            locus: { merge: true },
            l2GPredictions: { merge: true },
          },
        },
        // Same pattern as CredibleSet.colocalisation/l2GPredictions above:
        // EnhancerToGenePredictionsSummaryFragment selects `variant.enhancerToGenes {
        // count }` while EnhancerToGenePredictionsQuery selects the full paginated rows.
        Variant: {
          fields: {
            enhancerToGenes: { merge: true },
          },
        },
      },
    }),
    headers: { "OT-Platform": "true" },
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });
};
