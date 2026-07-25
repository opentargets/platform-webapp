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
        // still normalizing everywhere studyLocusId is present. Note: this does NOT
        // fix the separate stale-UI/refetch-loop bug when navigating between two
        // credible sets - that traces to PlatformApiProvider's useQuery interaction
        // with React Router's transitions and needs its own dedicated investigation.
        CredibleSet: {
          keyFields: (obj, { readField }) => {
            const studyLocusId = readField("studyLocusId", obj as any);
            return studyLocusId ? `CredibleSet:${studyLocusId}` : false;
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
