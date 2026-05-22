// API base URL is now driven by Vite env:
//   VITE_BASE_URL=http://127.0.0.1:8000/
// defined in frontend/.env (not hard-coded here).
// Fallback: current origin if env is not set.
const rawBase = import.meta.env.VITE_BASE_URL;
console.log(rawBase);
let apiBase = `${window.location.origin}/`;

if (window.location.port === "5173") {
  apiBase = `${window.location.protocol}//${window.location.hostname}:8000/`;
}

if (typeof rawBase === "string" && rawBase && rawBase !== "undefined") {
  apiBase = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
}

export { apiBase };
