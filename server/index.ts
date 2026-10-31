import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 3001);
const dist = path.join(root, "dist");

app.use(express.static(dist));

app.listen(PORT, () => {
  console.log(`[kamis] API http://127.0.0.1:${PORT}`);
});
