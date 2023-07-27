import React from "react";
import ReactDOM from "react-dom/client";
import { Excalidraw } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div style={{ height: "100vh", width: "100vw" }}>
      <Excalidraw />
    </div>
  </React.StrictMode>
);
