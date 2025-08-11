import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import { ClientAuth, InternalToolResponse } from "./tools/types.js";
import { buildDrive } from "./googleApi.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

function getClientAuth(authInfo: AuthInfo | undefined): ClientAuth {
  if (!authInfo) {
    throw new Error("No auth info provided (this should be handled by the auth middleware");
  }

  return {
    token: authInfo.token,
    clientId: authInfo.clientId,
    scopes: authInfo.scopes,
    expiresAt: authInfo.expiresAt!,
    subject: authInfo.extra?.sub as string,
  }
}

export async function buildServer() {
  const server = new Server(
    {
      name: "example-servers/gdrive",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {
          schemes: ["gdrive"], // Declare that we handle gdrive:/// URIs
          listable: true, // Support listing available resources
          readable: true, // Support reading resource contents
        },
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListResourcesRequestSchema, async (request, { authInfo }) => {
    const pageSize = 10;
    const params: any = {
      pageSize,
      fields: "nextPageToken, files(id, name, mimeType)",
    };

    if (request.params?.cursor) {
      params.pageToken = request.params.cursor;
    }

    const drive = await buildDrive(getClientAuth(authInfo));
    const res = await drive.files.list(params);
    const files = res.data.files!;

    return {
      resources: files.map((file) => ({
        uri: `gdrive:///${file.id}`,
        mimeType: file.mimeType,
        name: file.name,
      })),
      nextCursor: res.data.nextPageToken,
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request, { authInfo }) => {
    const fileId = request.params.uri.replace("gdrive:///", "");
    const readFileTool = tools[1]; // gdrive_read_file is the second tool
    const result = await readFileTool.handler(getClientAuth(authInfo), { fileId });

    // Extract the file contents from the tool response
    const fileContents = result.content[0].text.split("\n\n")[1]; // Skip the "Contents of file:" prefix

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/plain", // You might want to determine this dynamically
          text: fileContents,
        },
      ],
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async (request, { authInfo }) => {
    console.log("authInfo", request.method, authInfo);

    return {
      tools: tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    };
  });

  // Helper function to convert internal tool response to SDK format
  function convertToolResponse(response: InternalToolResponse) {
    return {
      _meta: {},
      content: response.content,
      isError: response.isError,
    };
  }

  server.setRequestHandler(CallToolRequestSchema, async (request, { authInfo }) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      throw new Error("Tool not found");
    }

    const result = await tool.handler(getClientAuth(authInfo), request.params.arguments as any);
    return convertToolResponse(result);
  });

  return server;
}
