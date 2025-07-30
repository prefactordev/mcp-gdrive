#!/usr/bin/env node

import server, { ensureAuth } from "./mcpServer.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupTokenRefresh } from "./auth.js";

async function startServer() {
  try {
    console.error("Starting server");

    // Add this line to force authentication at startup
    await ensureAuth(); // This will trigger the auth flow if no valid credentials exist

    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Set up periodic token refresh that never prompts for auth
    setupTokenRefresh();
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Start server immediately
startServer().catch(console.error);
