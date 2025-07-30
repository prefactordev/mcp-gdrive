#!/usr/bin/env node

import { buildServer } from "./mcpServer.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getValidCredentials, setupTokenRefresh } from "./auth.js";

async function startStdioServer() {
  try {
    console.error("Starting server");
    const server = await buildServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

async function start() {
  // Add this line to force authentication at startup
  // This will trigger the auth flow if no valid credentials exist
  await getValidCredentials();
  // Set up periodic token refresh that never prompts for auth
  setupTokenRefresh();

  await startStdioServer();
}

// Start server immediately
start().catch(console.error);
