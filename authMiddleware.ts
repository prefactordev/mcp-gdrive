import { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

interface AuthMiddlewareOptions {
  mcpPath: string;
}

interface RequestWithToken extends Request {
  auth?: AuthInfo;
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

const MCP_AUTH_ISSUER = process.env.MCP_AUTH_ISSUER!;
const AUTH_ISSUER = process.env.AUTH_ISSUER!;
const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID!;
const AUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET!;

async function fetchAuthorizationServerDiscoveryDocument(issuer: string) {
  const response = await fetch(addWellKnownPrefix(issuer, "oauth-authorization-server"));

  if (response.ok) {
    return response.json();
  } else {
    throw new Error(`Failed to fetch authorization server discovery document: ${response.statusText}`);
  }
}

export async function exchangeToken(subjectToken: string, audience: string) {
  const discovery = await fetchAuthorizationServerDiscoveryDocument(AUTH_ISSUER);
  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: AUTH_CLIENT_ID,
      client_secret: AUTH_CLIENT_SECRET,
      audience,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: subjectToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token"
    })
  });

  if (response.ok) {
    return response.json();
  } else {
    console.log(await response.json());

    throw new Error(`Failed to exchange token`);
  }
}

export function authMiddleware(options: AuthMiddlewareOptions) {
  async function handleMcpRequest(req: RequestWithToken, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        const bearerToken = match[1];
        const jwtData = await validateJWT(bearerToken);

        req.auth = {
          token: bearerToken,
          clientId: jwtData.azp as string,
          scopes: ((jwtData.scope ?? "") as string).split(" "),
          expiresAt: jwtData.exp,
          resource: new URL(getFullUrl(req)),
          extra: {
            sub: jwtData.sub
          }
        };

        console.log("MCP auth info", req.auth);

        next();
      }
    } else {
      const fullUrl = getFullUrl(req);

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

  async function handleAuthorizationServerRequest(req: RequestWithToken, res: Response, next: NextFunction) {
    try {
      const data = await fetchAuthorizationServerDiscoveryDocument(MCP_AUTH_ISSUER);
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch authorization server discovery document", error);
      res.status(500).send("Failed to fetch authorization server metadata");
    }
  }

  async function validateJWT(token: string) {
    const discovery = await fetchAuthorizationServerDiscoveryDocument(MCP_AUTH_ISSUER);
    const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));

    const { payload } = await jwtVerify(token, jwks, {
      issuer: discovery.issuer
    });

    return payload;
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
