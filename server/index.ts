import { serve } from "@hono/node-server";
import { app } from "./app";
import { serveStatic } from "./static";
import express from "express";
import { createServer } from "http";

export function log(message: string, source = "hono") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const port = parseInt(process.env.PORT || "5000", 10);

async function main() {
  if (process.env.NODE_ENV === "production") {
    // Production: Use Hono's node-server directly for API + static files
    const expressApp = express();
    const httpServer = createServer(expressApp);
    
    // Serve static files first
    serveStatic(expressApp);
    
    // Fallback to Hono for API routes
    expressApp.use(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);
      
      // Build headers
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          headers.set(key, Array.isArray(value) ? value[0] : value);
        }
      }
      
      // Collect body for non-GET requests
      const chunks: Buffer[] = [];
      
      await new Promise<void>((resolve) => {
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", resolve);
      });
      
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
      
      try {
        const response = await app.fetch(
          new Request(url.toString(), {
            method: req.method || "GET",
            headers,
            body: body && req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
          })
        );
        
        res.status(response.status);
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== "content-encoding" && key.toLowerCase() !== "transfer-encoding") {
            res.setHeader(key, value);
          }
        });
        
        const responseBody = await response.arrayBuffer();
        res.end(Buffer.from(responseBody));
      } catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
    
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
    });
  } else {
    // Development: Use Express for Vite + Hono for API
    const expressApp = express();
    const httpServer = createServer(expressApp);
    
    // API routes via Hono - must come before Vite middleware
    expressApp.use("/api", async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);
      url.pathname = "/api" + url.pathname;
      
      // Build headers
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          headers.set(key, Array.isArray(value) ? value[0] : value);
        }
      }
      
      // Collect raw body for all requests (needed for multipart)
      const chunks: Buffer[] = [];
      
      await new Promise<void>((resolve) => {
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", resolve);
      });
      
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
      
      try {
        const response = await app.fetch(
          new Request(url.toString(), {
            method: req.method || "GET",
            headers,
            body: body && req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
          })
        );
        
        res.status(response.status);
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== "content-encoding" && key.toLowerCase() !== "transfer-encoding") {
            res.setHeader(key, value);
          }
        });
        
        const responseBody = await response.arrayBuffer();
        res.end(Buffer.from(responseBody));
      } catch (error) {
        console.error("Error handling API request:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
    
    // Setup Vite dev server for frontend (handles everything else)
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, expressApp);
    
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
    });
  }
}

main().catch(console.error);
