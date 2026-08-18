import { createApolloClient } from "ui";
import { getConfig } from "@ot/config";

export const apolloClient = createApolloClient(getConfig());
