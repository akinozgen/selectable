/** Safe DOM builders — no innerHTML for user data (XSS-safe by default). */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Applies a template result (Node or string) as the content of `target`. */
export function setContent(target: HTMLElement, content: Node | string): void {
  target.textContent = "";
  if (typeof content === "string") target.textContent = content;
  else target.appendChild(content);
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(pathD: string, cls: string, strokeWidth = 1.5): SVGSVGElement {
  const s = document.createElementNS(SVG_NS, "svg");
  s.setAttribute("viewBox", "0 0 16 16");
  s.setAttribute("fill", "none");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("class", cls);
  const p = document.createElementNS(SVG_NS, "path");
  p.setAttribute("d", pathD);
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", String(strokeWidth));
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  s.appendChild(p);
  return s;
}

export const icons = {
  chevron: () => svg("M4 6l4 4 4-4", "sl-chevron-svg"),
  check: () => svg("M3 8.5l3.5 3.5L13 5", "sl-check", 1.75),
  cross: () => svg("M4.5 4.5l7 7M11.5 4.5l-7 7", "sl-cross-svg"),
  search: () =>
    svg("M11 11l3 3M12.5 7a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z", "sl-search-svg"),
  spinner: () => {
    const s = document.createElementNS(SVG_NS, "svg");
    s.setAttribute("viewBox", "0 0 16 16");
    s.setAttribute("fill", "none");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("class", "sl-spinner-svg");
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", "8");
    c.setAttribute("cy", "8");
    c.setAttribute("r", "6");
    c.setAttribute("stroke", "currentColor");
    c.setAttribute("stroke-width", "1.5");
    c.setAttribute("stroke-linecap", "round");
    c.setAttribute("stroke-dasharray", "28");
    c.setAttribute("stroke-dashoffset", "20");
    s.appendChild(c);
    return s;
  },
};

let uid = 0;
export function nextId(prefix: string): string {
  return `${prefix}-${++uid}`;
}
