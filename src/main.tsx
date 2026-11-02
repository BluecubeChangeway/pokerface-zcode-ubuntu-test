import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { MotionConfig } from "framer-motion";

import { App } from "./app/App";
import { UIProviders } from "./app/providers/UIProviders";
import "./styles/main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
      <UIProviders>
        <App />
      </UIProviders>
    </MotionConfig>
  </StrictMode>
);