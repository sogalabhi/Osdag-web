/**
 * Runs before every test file. The component tests (`*.test.jsx`) ask for the jsdom environment with
 * `// @vitest-environment jsdom`; the rest of the suite runs in node and gets nothing from this file.
 *
 * jsdom lacks a few browser APIs that Ant Design and react-select read while rendering.
 */
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);

  window.matchMedia ??= (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  window.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};

  // Ant Design measures with getComputedStyle(el, pseudoElement), which jsdom does not implement.
  const { getComputedStyle } = window;
  window.getComputedStyle = (element) => getComputedStyle(element);
}
