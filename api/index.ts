/**
 * Vercel serverless entry — Express app handles /api/*
 * Rewrites in vercel.json forward /api/(.*) → /api
 */
import app from "../server/app.js";

export default app;
