
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/resources.js
import fs from "fs/promises";
import path from "path";
async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-ID",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };
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
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    let filePath;
    let contentType = "application/json";
    const basePath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "..",
      "..",
      "public",
      "data"
    );
    switch (resourceType) {
      case "bible":
        filePath = path.join(basePath, "ruth", `${resourceId}.json`);
        break;
      case "fia":
        filePath = path.join(basePath, "ruth", "fia", resourceId);
        if (resourceId.endsWith(".jpg") || resourceId.endsWith(".jpeg")) {
          contentType = "image/jpeg";
        } else if (resourceId.endsWith(".png")) {
          contentType = "image/png";
        } else if (resourceId.endsWith(".json")) {
          contentType = "application/json";
        }
        break;
      case "uw":
        filePath = path.join(basePath, "ruth", "uw", `${resourceId}.json`);
        break;
      case "glossary":
        filePath = path.join(basePath, "glossary-defaults.json");
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid resource type" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
    }
    const data = await fs.readFile(filePath);
    return new Response(data, {
      headers: {
        ...headers,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("Resource API error:", error);
    if (error.code === "ENOENT") {
      return new Response(JSON.stringify({ error: "Resource not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Failed to load resource" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }
}
export {
  handler as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvcmVzb3VyY2VzLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgZnMgZnJvbSBcImZzL3Byb21pc2VzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcSkge1xuICAvLyBFbmFibGUgQ09SU1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZSwgWC1TZXNzaW9uLUlEXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiR0VULCBPUFRJT05TXCIsXG4gIH07XG5cbiAgLy8gSGFuZGxlIHByZWZsaWdodFxuICBpZiAocmVxLm1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiT0tcIiwgeyBoZWFkZXJzIH0pO1xuICB9XG5cbiAgaWYgKHJlcS5tZXRob2QgIT09IFwiR0VUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCk7XG4gICAgY29uc3QgcmVzb3VyY2VUeXBlID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJ0eXBlXCIpO1xuICAgIGNvbnN0IHJlc291cmNlSWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImlkXCIpO1xuXG4gICAgaWYgKCFyZXNvdXJjZVR5cGUgfHwgIXJlc291cmNlSWQpIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJNaXNzaW5nIHR5cGUgb3IgaWQgcGFyYW1ldGVyXCIgfSksIHtcbiAgICAgICAgc3RhdHVzOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4uaGVhZGVycywgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBmaWxlUGF0aDtcbiAgICBsZXQgY29udGVudFR5cGUgPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcblxuICAgIC8vIEluIE5ldGxpZnkgRnVuY3Rpb25zLCBmaWxlcyBhcmUgaW4gdGhlIGZ1bmN0aW9uIGJ1bmRsZVxuICAgIC8vIFVzZSByZWxhdGl2ZSBwYXRocyBmcm9tIHRoZSBmdW5jdGlvbiBkaXJlY3RvcnlcbiAgICBjb25zdCBiYXNlUGF0aCA9IHBhdGgucmVzb2x2ZShcbiAgICAgIHBhdGguZGlybmFtZShuZXcgVVJMKGltcG9ydC5tZXRhLnVybCkucGF0aG5hbWUpLFxuICAgICAgXCIuLlwiLFxuICAgICAgXCIuLlwiLFxuICAgICAgXCJwdWJsaWNcIixcbiAgICAgIFwiZGF0YVwiXG4gICAgKTtcblxuICAgIHN3aXRjaCAocmVzb3VyY2VUeXBlKSB7XG4gICAgICBjYXNlIFwiYmlibGVcIjpcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsIFwicnV0aFwiLCBgJHtyZXNvdXJjZUlkfS5qc29uYCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImZpYVwiOlxuICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihiYXNlUGF0aCwgXCJydXRoXCIsIFwiZmlhXCIsIHJlc291cmNlSWQpO1xuICAgICAgICAvLyBEZXRlcm1pbmUgY29udGVudCB0eXBlIGJhc2VkIG9uIGZpbGUgZXh0ZW5zaW9uXG4gICAgICAgIGlmIChyZXNvdXJjZUlkLmVuZHNXaXRoKFwiLmpwZ1wiKSB8fCByZXNvdXJjZUlkLmVuZHNXaXRoKFwiLmpwZWdcIikpIHtcbiAgICAgICAgICBjb250ZW50VHlwZSA9IFwiaW1hZ2UvanBlZ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc291cmNlSWQuZW5kc1dpdGgoXCIucG5nXCIpKSB7XG4gICAgICAgICAgY29udGVudFR5cGUgPSBcImltYWdlL3BuZ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc291cmNlSWQuZW5kc1dpdGgoXCIuanNvblwiKSkge1xuICAgICAgICAgIGNvbnRlbnRUeXBlID0gXCJhcHBsaWNhdGlvbi9qc29uXCI7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwidXdcIjpcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsIFwicnV0aFwiLCBcInV3XCIsIGAke3Jlc291cmNlSWR9Lmpzb25gKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiZ2xvc3NhcnlcIjpcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsIFwiZ2xvc3NhcnktZGVmYXVsdHMuanNvblwiKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiSW52YWxpZCByZXNvdXJjZSB0eXBlXCIgfSksIHtcbiAgICAgICAgICBzdGF0dXM6IDQwMCxcbiAgICAgICAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIGZpbGVcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZnMucmVhZEZpbGUoZmlsZVBhdGgpO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShkYXRhLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IGNvbnRlbnRUeXBlLFxuICAgICAgICBcIkNhY2hlLUNvbnRyb2xcIjogXCJwdWJsaWMsIG1heC1hZ2U9MzYwMFwiLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiUmVzb3VyY2UgQVBJIGVycm9yOlwiLCBlcnJvcik7XG5cbiAgICBpZiAoZXJyb3IuY29kZSA9PT0gXCJFTk9FTlRcIikge1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIlJlc291cmNlIG5vdCBmb3VuZFwiIH0pLCB7XG4gICAgICAgIHN0YXR1czogNDA0LFxuICAgICAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiRmFpbGVkIHRvIGxvYWQgcmVzb3VyY2VcIiB9KSwge1xuICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFBQSxPQUFPLFFBQVE7QUFDZixPQUFPLFVBQVU7QUFFakIsZUFBTyxRQUErQixLQUFLO0FBRXpDLFFBQU0sVUFBVTtBQUFBLElBQ2QsK0JBQStCO0FBQUEsSUFDL0IsZ0NBQWdDO0FBQUEsSUFDaEMsZ0NBQWdDO0FBQUEsRUFDbEM7QUFHQSxNQUFJLElBQUksV0FBVyxXQUFXO0FBQzVCLFdBQU8sSUFBSSxTQUFTLE1BQU0sRUFBRSxRQUFRLENBQUM7QUFBQSxFQUN2QztBQUVBLE1BQUksSUFBSSxXQUFXLE9BQU87QUFDeEIsV0FBTyxJQUFJLFNBQVMsc0JBQXNCLEVBQUUsUUFBUSxLQUFLLFFBQVEsQ0FBQztBQUFBLEVBQ3BFO0FBRUEsTUFBSTtBQUNGLFVBQU0sTUFBTSxJ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
