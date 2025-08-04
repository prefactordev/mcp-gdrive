#!/usr/bin/env node

import { buildServer } from "./mcpServer.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getValidCredentials, setupTokenRefresh } from "./auth.js";
import express, { Request, Response } from "express";
import { authMiddleware } from "./authMiddleware.js";

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

function buildExpressApp() {
  const app = express();

  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.use(express.json());
  app.use(authMiddleware({ mcpPath: '/mcp' }));

  app.post('/mcp', async (req: Request, res: Response) => {
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.

    try {
      const server = await buildServer();
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on('close', () => {
        console.log('Request closed');
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // SSE notifications not supported in stateless mode
  app.get('/mcp', async (req: Request, res: Response) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    }));
  });

  // Session termination not needed in stateless mode
  app.delete('/mcp', async (req: Request, res: Response) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    }));
  });

  return app;



}

async function startHttpServer() {
  // Start the server
  const PORT = 3000;

  const app = buildExpressApp();

  app.listen(PORT, (error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
  });
}

async function start(http: boolean) {
  // Add this line to force authentication at startup
  // This will trigger the auth flow if no valid credentials exist
  await getValidCredentials();
  // Set up periodic token refresh that never prompts for auth
  setupTokenRefresh();

  if (http) {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

// Start server immediately
start(true).catch(console.error);
