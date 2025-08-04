import { Request, Response, NextFunction } from "express";

interface AuthMiddlewareOptions {
  mcpPath: string;
}

interface RequestWithToken extends Request {
  bearerToken?: string;
}

function getFullUrl(req: Request) {
  return `${req.protocol}://${req.host}${req.url}`;
}

function fullUrl(req: Request, path: string) {
  const urlObj = new URL(getFullUrl(req));
  urlObj.pathname = path;
  return urlObj.toString();
}

function addWellKnownPrefix(url: string, name: string) {
  const urlObj = new URL(url);
  urlObj.pathname = `/.well-known/${name}${urlObj.pathname}`;
  return urlObj.toString();
}

export function authMiddleware(options: AuthMiddlewareOptions) {
  function handleMcpRequest(req: RequestWithToken, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        req.bearerToken = match[1];
        next();
      }
    } else {
      const fullUrl = getFullUrl(req);

      console.error(`Unauthorized request: ${fullUrl}`);
      res
        .status(401)
        .header("WWW-Authenticate", `Bearer resource_metadata=${addWellKnownPrefix(fullUrl, "oauth-protected-resource")}`)
        .send("Unauthorized");
    }
  }

  function handleResourceMetadataRequest(req: RequestWithToken, res: Response, next: NextFunction) {
    res.json({
      resource: fullUrl(req, options.mcpPath),
      authorization_servers: [
        fullUrl(req, "/")
      ]
    })
  }

  const MCP_AUTH_ISSUER = process.env.MCP_AUTH_ISSUER!;

  async function handleAuthorizationServerRequest(req: RequestWithToken, res: Response, next: NextFunction) {
    const response = await fetch(addWellKnownPrefix(MCP_AUTH_ISSUER, "oauth-authorization-server"));

    if (response.ok) {
      const data = await response.json();
      console.log("Authorization server metadata fetched successfully", data);
      res.json(data);
    } else {
      res.status(500).send("Failed to fetch authorization server metadata");
    }
  }

  return (req: RequestWithToken, res: Response, next: NextFunction) => {
    if (req.url === options.mcpPath) {
      handleMcpRequest(req, res, next);
    } else if (req.url === `/.well-known/oauth-protected-resource${options.mcpPath}`) {
      handleResourceMetadataRequest(req, res, next);
    } else if (req.url === `/.well-known/oauth-authorization-server`) {
      handleAuthorizationServerRequest(req, res, next);
    } else {
      next();
    }
  };
}
