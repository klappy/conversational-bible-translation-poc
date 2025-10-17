
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/resources.js
import fs from "fs/promises";
import path from "path";
async function handler(req, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
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
    switch (resourceType) {
      case "bible":
        filePath = path.join(process.cwd(), "public", "data", "ruth", `${resourceId}.json`);
        break;
      case "fia":
        filePath = path.join(process.cwd(), "public", "data", "ruth", "fia", resourceId);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvcmVzb3VyY2VzLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgZnMgZnJvbSBcImZzL3Byb21pc2VzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcSwgY29udGV4dCkge1xuICAvLyBFbmFibGUgQ09SU1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZVwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIkdFVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIkdFVFwiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk1ldGhvZCBub3QgYWxsb3dlZFwiLCB7IHN0YXR1czogNDA1LCBoZWFkZXJzIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuICAgIGNvbnN0IHJlc291cmNlVHlwZSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwidHlwZVwiKTtcbiAgICBjb25zdCByZXNvdXJjZUlkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJpZFwiKTtcblxuICAgIGlmICghcmVzb3VyY2VUeXBlIHx8ICFyZXNvdXJjZUlkKSB7XG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiTWlzc2luZyB0eXBlIG9yIGlkIHBhcmFtZXRlclwiIH0pLCB7XG4gICAgICAgIHN0YXR1czogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBsZXQgZmlsZVBhdGg7XG4gICAgbGV0IGNvbnRlbnRUeXBlID0gXCJhcHBsaWNhdGlvbi9qc29uXCI7XG5cbiAgICBzd2l0Y2ggKHJlc291cmNlVHlwZSkge1xuICAgICAgY2FzZSBcImJpYmxlXCI6XG4gICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwicHVibGljXCIsIFwiZGF0YVwiLCBcInJ1dGhcIiwgYCR7cmVzb3VyY2VJZH0uanNvbmApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJmaWFcIjpcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCJwdWJsaWNcIiwgXCJkYXRhXCIsIFwicnV0aFwiLCBcImZpYVwiLCByZXNvdXJjZUlkKTtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGNvbnRlbnQgdHlwZSBiYXNlZCBvbiBmaWxlIGV4dGVuc2lvblxuICAgICAgICBpZiAocmVzb3VyY2VJZC5lbmRzV2l0aChcIi5qcGdcIikgfHwgcmVzb3VyY2VJZC5lbmRzV2l0aChcIi5qcGVnXCIpKSB7XG4gICAgICAgICAgY29udGVudFR5cGUgPSBcImltYWdlL2pwZWdcIjtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNvdXJjZUlkLmVuZHNXaXRoKFwiLnBuZ1wiKSkge1xuICAgICAgICAgIGNvbnRlbnRUeXBlID0gXCJpbWFnZS9wbmdcIjtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNvdXJjZUlkLmVuZHNXaXRoKFwiLmpzb25cIikpIHtcbiAgICAgICAgICBjb250ZW50VHlwZSA9IFwiYXBwbGljYXRpb24vanNvblwiO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInV3XCI6XG4gICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwicHVibGljXCIsIFwiZGF0YVwiLCBcInJ1dGhcIiwgXCJ1d1wiLCBgJHtyZXNvdXJjZUlkfS5qc29uYCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImdsb3NzYXJ5XCI6XG4gICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwicHVibGljXCIsIFwiZGF0YVwiLCBcImdsb3NzYXJ5LWRlZmF1bHRzLmpzb25cIik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludmFsaWQgcmVzb3VyY2UgdHlwZVwiIH0pLCB7XG4gICAgICAgICAgc3RhdHVzOiA0MDAsXG4gICAgICAgICAgaGVhZGVyczogeyAuLi5oZWFkZXJzLCBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBSZWFkIHRoZSBmaWxlXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGZzLnJlYWRGaWxlKGZpbGVQYXRoKTtcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoZGF0YSwge1xuICAgICAgaGVhZGVyczoge1xuICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBjb250ZW50VHlwZSxcbiAgICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwicHVibGljLCBtYXgtYWdlPTM2MDBcIixcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIlJlc291cmNlIEFQSSBlcnJvcjpcIiwgZXJyb3IpO1xuXG4gICAgaWYgKGVycm9yLmNvZGUgPT09IFwiRU5PRU5UXCIpIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJSZXNvdXJjZSBub3QgZm91bmRcIiB9KSwge1xuICAgICAgICBzdGF0dXM6IDQwNCxcbiAgICAgICAgaGVhZGVyczogeyAuLi5oZWFkZXJzLCBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkZhaWxlZCB0byBsb2FkIHJlc291cmNlXCIgfSksIHtcbiAgICAgIHN0YXR1czogNTAwLFxuICAgICAgaGVhZGVyczogeyAuLi5oZWFkZXJzLCBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgIH0pO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBQUEsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBRWpCLGVBQU8sUUFBK0IsS0FBSyxTQUFTO0FBRWxELFFBQU0sVUFBVTtBQUFBLElBQ2QsK0JBQStCO0FBQUEsSUFDL0IsZ0NBQWdDO0FBQUEsSUFDaEMsZ0NBQWdDO0FBQUEsRUFDbEM7QUFHQSxNQUFJLElBQUksV0FBVyxXQUFXO0FBQzVCLFdBQU8sSUFBSSxTQUFTLE1BQU0sRUFBRSxRQUFRLENBQUM7QUFBQSxFQUN2QztBQUVBLE1BQUksSUFBSSxXQUFXLE9BQU87QUFDeEIsV0FBTyxJQUFJLFNBQVMsc0JBQXNCLEVBQUUsUUFBUSxLQUFLLFFBQVEsQ0FBQztBQUFBLEVBQ3BFO0FBRUEsTUFBSTtBQUNGLFVBQU0sTUFBTSxJQUFJLElBQUksSUFBSSxHQUFHO0FBQzNCLFVBQU0sZUFBZSxJQUFJLGFBQWEsSUFBSSxNQUFNO0FBQ2hELFVBQU0sYUFBYSxJQUFJLGFBQWEsSUFBSSxJQUFJO0FBRTVDLFFBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZO0FBQ2hDLGFBQU8sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLE9BQU8sK0JBQStCLENBQUMsR0FBRztBQUFBLFFBQzdFLFFBQVE7QUFBQSxRQUNSLFNBQVMsRUFBRSxHQUFHLFNBQVMsZ0JBQWdCLG1CQUFtQjtBQUFBLE1BQzVELENBQUM7QUFBQSxJQUNIO0FBRUEsUUFBSTtBQUNKLFFBQUksY0FBYztBQUVsQixZQUFRLGNBQWM7QUFBQSxNQUNwQixLQUFLO0FBQ0gsbUJBQVcsS0FBSyxLQUFLLFFBQVEsSUFBSSxHQUFHLFVBQVUsUUFBUSxRQUFRLEdBQUcsVUFBVSxPQUFPO0FBQ2xGO0FBQUEsTUFDRixLQUFLO0FBQ0gsbUJBQVcsS0FBSyxLQUFLLFFBQVEsSUFBSSxHQUFHLFVBQVUsUUFBUSxRQUFRLE9BQU8sVUFBVTtBQUUvRSxZQUFJLFdBQVcsU0FBUyxNQUFNLEtBQUssV0FBVyxTQUFTLE9BQU8sR0FBRztBQUMvRCx3QkFBYztBQUFBLFFBQ2hCLFdBQVcsV0FBVyxTQUFTLE1BQU0sR0FBRztBQUN0Qyx3QkFBYztBQUFBLFFBQ2hCLFdBQVcsV0FBVyxTQUFTLE9BQU8sR0FBRztBQUN2Qyx3QkFBYztBQUFBLFFBQ2hCO0FBQ0E7QUFBQSxNQUNGLEtBQUs7QUFDSCxtQkFBVyxLQUFLLEtBQUssUUFBUSxJQUFJLEdBQUcsVUFBVSxRQUFRLFFBQVEsTUFBTSxHQUFHLFVBQVUsT0FBTztBQUN4RjtBQUFBLE1BQ0YsS0FBSztBQUNILG1CQUFXLEtBQUssS0FBSyxRQUFRLElBQUksR0FBRyxVQUFVLFFBQVEsd0JBQXdCO0FBQzlFO0FBQUEsTUFDRjtBQUNFLGVBQU8sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLE9BQU8sd0JBQXdCLENBQUMsR0FBRztBQUFBLFVBQ3RFLFFBQVE7QUFBQSxVQUNSLFNBQVMsRUFBRSxHQUFHLFNBQVMsZ0JBQWdCLG1CQUFtQjtBQUFBLFFBQzVELENBQUM7QUFBQSxJQUNMO0FBR0EsVUFBTSxPQUFPLE1BQU0sR0FBRyxTQUFTLFFBQVE7QUFFdkMsV0FBTyxJQUFJLFNBQVMsTUFBTTtBQUFBLE1BQ3hCLFNBQVM7QUFBQSxRQUNQLEdBQUc7QUFBQSxRQUNILGdCQUFnQjtBQUFBLFFBQ2hCLGlCQUFpQjtBQUFBLE1BQ25CO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sdUJBQXVCLEtBQUs7QUFFMUMsUUFBSSxNQUFNLFNBQVMsVUFBVTtBQUMzQixhQUFPLElBQUksU0FBUyxLQUFLLFVBQVUsRUFBRSxPQUFPLHFCQUFxQixDQUFDLEdBQUc7QUFBQSxRQUNuRSxRQUFRO0FBQUEsUUFDUixTQUFTLEVBQUUsR0FBRyxTQUFTLGdCQUFnQixtQkFBbUI7QUFBQSxNQUM1RCxDQUFDO0FBQUEsSUFDSDtBQUVBLFdBQU8sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLE9BQU8sMEJBQTBCLENBQUMsR0FBRztBQUFBLE1BQ3hFLFFBQVE7QUFBQSxNQUNSLFNBQVMsRUFBRSxHQUFHLFNBQVMsZ0JBQWdCLG1CQUFtQjtBQUFBLElBQzVELENBQUM7QUFBQSxFQUNIO0FBQ0Y7IiwKICAibmFtZXMiOiBbXQp9Cg==
