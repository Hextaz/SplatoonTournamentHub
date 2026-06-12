import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function handleProxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  let pathStr = resolvedParams.path.join("/");
  if (pathStr.startsWith("api/")) {
    pathStr = pathStr.replace("api/", "");
  }

  const url = new URL(request.url);
  const botApiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:8080";
  const botApiSecret = process.env.BOT_API_SECRET;

  if (!botApiSecret) {
    console.error("BOT_API_SECRET is missing");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const targetUrl = `${botApiUrl}/api/${pathStr}${url.search}`;

  try {
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${botApiSecret}`);

    // Transmit the Discord user identity for requireGuildAdmin middleware.
    // This is needed because BOT_API_SECRET doesn't carry user identity.
    const discordId = (session.user as any)?.id || "";
    if (discordId) {
      headers.set("X-Discord-User-Id", discordId);
    }

    // Extract guildId from query params or request body and forward it.
    // The requireGuildAdmin middleware reads this header as fallback.
    const guildIdFromQuery = url.searchParams.get("guildId");
    if (guildIdFromQuery) {
      headers.set("X-Guild-Id", guildIdFromQuery);
    } else if (["POST", "PUT", "PATCH"].includes(request.method)) {
      // Try to extract guildId from JSON body for forwarding
      try {
        const clonedReq = request.clone();
        const textBody = await clonedReq.text();
        if (textBody) {
          const bodyObj = JSON.parse(textBody);
          if (bodyObj.guildId) {
            headers.set("X-Guild-Id", bodyObj.guildId);
          }
        }
      } catch {
        // Body not JSON or no guildId — that's OK, downstream may reject
      }
    }

    // Prevent forwarding hostile headers that could break proxying
    headers.delete("host");
    headers.delete("connection");

    const reqInit: RequestInit = {
      method: request.method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      const clonedReq = request.clone();
      const textBody = await clonedReq.text();
      if (textBody) {
        reqInit.body = textBody;
      }
    }

    const res = await fetch(targetUrl, reqInit);

    const contentType = res.headers.get("content-type");
    let json;

    if (contentType?.includes("application/json")) {
      json = await res.json();
    } else {
      const text = await res.text();
      json = { _rawText: text };
    }

    return new NextResponse(JSON.stringify(json), {
      status: res.status,
      statusText: res.statusText,
      headers: { "Content-Type": contentType || "application/json" }
    });
  } catch (error: any) {
    console.error(`Proxy Error to ${targetUrl}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
