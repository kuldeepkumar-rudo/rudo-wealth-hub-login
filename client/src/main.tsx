import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./utils/registerServiceWorker";

import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
        <App />
    </HelmetProvider>
);

// Register service worker for PWA functionality
registerServiceWorker();
