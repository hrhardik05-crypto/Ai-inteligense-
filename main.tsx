import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register service worker for Progressive Web App support
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
