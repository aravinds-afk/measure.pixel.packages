import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { IS_ARTIFACT } from "./lib/env.ts";

const Router = IS_ARTIFACT ? MemoryRouter : BrowserRouter;
import "./index.css";
import App from "./App.tsx";
import { AppProvider } from "./lib/app.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <AppProvider>
        <App />
      </AppProvider>
    </Router>
  </StrictMode>,
);
