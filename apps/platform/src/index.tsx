// ⚠️ Register all section components FIRST before any other setup
// This populates the component registry so reports can render immediately
import { registerAllSections } from "sections";
registerAllSections();

import * as ReactDOMClient from "react-dom/client";
import TagManager from "react-gtm-module";
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";

import App from "./App";

import "typeface-inter";
import "typeface-roboto-mono";
import "./index.scss";
import { getConfig } from "@ot/config";

const config = getConfig();

if (import.meta.env.MODE) {
  loadDevMessages();
  loadErrorMessages();
}

if (config.googleTagManagerID) {
  TagManager.initialize({ gtmId: config.googleTagManagerID });
}

const root = ReactDOMClient.createRoot(document.getElementById("root"));
root.render(<App />);
