import { serve } from "bun";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import fs from "fs";
import path from "path";
import index from "../index.html";

const app = new Hono();

const logSchema = z.object({
  message: z.string(),
});

app.post(
  "/api/log",
  zValidator("json", logSchema),
  async (c) => {
    const { message } = c.req.valid("json");
    const logMessage = `${new Date().toISOString()}: ${message}\n`;

    try {
      const logPath = path.join(process.cwd(), "client-debug.log");
      fs.appendFileSync(logPath, logMessage);
      return c.json({ success: true });
    } catch (err) {
      console.error("Failed to write to log file:", err);
      return c.json({ success: false, error: "Failed to write log" }, 500);
    }
  }
);

serve({
  hostname: "0.0.0.0",
  port: 3001,
  development: true,
  routes: {
    "/": index,
    "/api/*": app.fetch,
    "/rose.png": Bun.file("public/rose.png"),
    "/tulip.png": Bun.file("public/tulip.png"),
    "/cornflower.png": Bun.file("public/cornflower.png"),
    "/gardenia.png": Bun.file("public/gardenia.png"),
    "/dandelion.png": Bun.file("public/dandelion.png"),
    "/data.csv": Bun.file("public/data.csv"),
    "/email-image.png": Bun.file("public/email-image.png"),
  },
});

console.log("Server running on http://0.0.0.0:3001");
