import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import Index from "./pages/Index";
import TryOn from "./pages/TryOn";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/tryon" element={<TryOn />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);