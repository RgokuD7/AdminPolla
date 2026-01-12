import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "@/App";
import PublicTurnsView from "@/components/PublicTurnsView";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/view/:id" element={<PublicTurnsView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);