import { Fragment } from "react";

const TOKEN = /<(sub|sup|b|i)>(.*?)<\/\1>|<br\s*\/?>/gi;

/**
 * Renders engine-supplied text that may contain <sub>, <sup>, <b>, <i> and <br> markup
 * (output labels, popup rows, the 3D model's hover text) as real React elements. Any other
 * text (including other tags) is rendered as plain text, so no HTML is ever injected.
 */
export function LabelText({ children }) {
  const text = typeof children === "string" ? children : "";
  if (!text) return children ?? null;
  const parts = [];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      const Tag = m[1].toLowerCase();
      parts.push(<Tag key={m.index}>{m[2]}</Tag>);
    } else {
      parts.push(<br key={m.index} />);
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}

export default LabelText;
