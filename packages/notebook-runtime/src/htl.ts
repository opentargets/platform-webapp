/**
 * Tiny htl-style tagged templates: `html\`<p>${x}</p>\`` and `svg\`<g>…</g>\``.
 * Interpolated strings/numbers are escaped as text; DOM nodes (and arrays of
 * either) are inserted as-is. Returns the single root node, or a fragment.
 */

const MARK = "\u0000ot-slot-";

const escapeText = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Slot = unknown;

const stringify = (value: Slot): string | null => {
  if (value === null || value === undefined || value === false) return "";
  if (typeof value === "string") return escapeText(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return escapeText(String(value));
  }
  return null;
};

const isNode = (value: unknown): value is Node => typeof Node !== "undefined" && value instanceof Node;

const build = (namespace: "html" | "svg") =>
  (strings: TemplateStringsArray, ...values: Slot[]): Node => {
    const nodes: Node[] = [];
    let markup = "";
    strings.forEach((chunk, i) => {
      markup += chunk;
      if (i >= values.length) return;
      const value = values[i];
      const text = stringify(value);
      if (text !== null) {
        markup += text;
        return;
      }
      const list = Array.isArray(value) ? value : [value];
      const parts: string[] = [];
      list.forEach((item) => {
        const itemText = stringify(item);
        if (itemText !== null) {
          parts.push(itemText);
        } else if (isNode(item)) {
          parts.push(`<!--${MARK}${nodes.length}-->`);
          nodes.push(item);
        } else {
          parts.push(escapeText(String(item)));
        }
      });
      markup += parts.join("");
    });

    let root: Element | DocumentFragment;
    if (namespace === "svg") {
      const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      wrapper.innerHTML = markup;
      root = wrapper;
    } else {
      const template = document.createElement("template");
      template.innerHTML = markup;
      root = template.content;
    }

    // Replace slot comments with the real nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    const comments: Comment[] = [];
    for (let c = walker.nextNode(); c; c = walker.nextNode()) comments.push(c as Comment);
    comments.forEach((comment) => {
      const match = comment.data.match(new RegExp(`^${MARK}(\\d+)$`));
      if (match) comment.replaceWith(nodes[Number(match[1])]);
    });

    const children = Array.from(root.childNodes).filter(
      (n) => n.nodeType !== Node.TEXT_NODE || (n.textContent ?? "").trim() !== ""
    );
    if (children.length === 1) return children[0];
    if (namespace === "svg") {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      children.forEach((child) => g.appendChild(child));
      return g;
    }
    const fragment = document.createDocumentFragment();
    children.forEach((child) => fragment.appendChild(child));
    return fragment;
  };

export const html = build("html");
export const svg = build("svg");
