import fs from "fs/promises";
import path from "path";

export default async function handler(req, context) {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    const url = new URL(req.url);
    const resourceType = url.searchParams.get("type");
    const resourceId = url.searchParams.get("id");

    if (!resourceType || !resourceId) {
      return new Response(JSON.stringify({ error: "Missing type or id parameter" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    let filePath;
    let contentType = "application/json";

    switch (resourceType) {
      case "bible":
        filePath = path.join(process.cwd(), "public", "data", "ruth", `${resourceId}.json`);
        break;
      case "fia":
        filePath = path.join(process.cwd(), "public", "data", "ruth", "fia", resourceId);
        // Determine content type based on file extension
        if (resourceId.endsWith(".jpg") || resourceId.endsWith(".jpeg")) {
          contentType = "image/jpeg";
        } else if (resourceId.endsWith(".png")) {
          contentType = "image/png";
        } else if (resourceId.endsWith(".json")) {
          contentType = "application/json";
        }
        break;
      case "uw":
        filePath = path.join(process.cwd(), "public", "data", "ruth", "uw", `${resourceId}.json`);
        break;
      case "glossary":
        filePath = path.join(process.cwd(), "public", "data", "glossary-defaults.json");
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid resource type" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
    }

    // Read the file
    const data = await fs.readFile(filePath);

    return new Response(data, {
      headers: {
        ...headers,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Resource API error:", error);

    if (error.code === "ENOENT") {
      return new Response(JSON.stringify({ error: "Resource not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed to load resource" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}
