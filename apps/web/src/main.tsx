import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { token } from "./api.js";

const t = token.read();
if (t === null) {
  document.getElementById("root")!.innerHTML =
    '<div class="app"><div class="error-state">No demo token. Open the URL printed by "jarvisd demo" including its ?token=... parameter.</div></div>';
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
