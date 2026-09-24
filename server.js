const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

const GOOGLE_CLOUD_PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT_ID || "pinexuscommerce-search";

const GOOGLE_CLOUD_LOCATION =
  process.env.GOOGLE_CLOUD_LOCATION || "global";

const GOOGLE_CLOUD_ENGINE_ID =
  process.env.GOOGLE_CLOUD_ENGINE_ID || "";

const GOOGLE_CLOUD_API_KEY =
  process.env.GOOGLE_CLOUD_API_KEY || "";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve the public website
app.use(express.static(path.join(__dirname, "public")));

/**
 * Basic health check
 */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "PiNexusCommerce-Cloud",
    version: "2.0.0",
    service: "commerce-research",
    googleCloudConfigured: Boolean(
      GOOGLE_CLOUD_PROJECT_ID &&
      GOOGLE_CLOUD_ENGINE_ID &&
      GOOGLE_CLOUD_API_KEY
    )
  });
});

/**
 * Google Cloud Agent Search / Discovery Engine
 *
 * Uses searchLite for public website search.
 * API key remains server-side.
 */
app.post("/api/search-commerce", async (req, res) => {
  try {
    const query =
      typeof req.body?.query === "string"
        ? req.body.query.trim()
        : "";

    if (!query) {
      return res.status(400).json({
        ok: false,
        error: "Please enter what you want to search."
      });
    }

    if (!GOOGLE_CLOUD_ENGINE_ID || !GOOGLE_CLOUD_API_KEY) {
      return res.status(503).json({
        ok: false,
        error:
          "Google Cloud Search is not configured yet. The application is ready, but the Google Cloud credentials and Search Engine ID still need to be connected."
      });
    }

    const servingConfig =
      `projects/${GOOGLE_CLOUD_PROJECT_ID}` +
      `/locations/${GOOGLE_CLOUD_LOCATION}` +
      `/collections/default_collection` +
      `/engines/${GOOGLE_CLOUD_ENGINE_ID}` +
      `/servingConfigs/default_search`;

    const endpoint =
      `https://discoveryengine.googleapis.com/v1/` +
      `${servingConfig}:searchLite` +
      `?key=${encodeURIComponent(GOOGLE_CLOUD_API_KEY)}`;

    const googleResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        pageSize: 10
      })
    });

    const googleData = await googleResponse.json();

    if (!googleResponse.ok) {
      const googleMessage =
        googleData?.error?.message ||
        "Google Cloud Search returned an error.";

      return res.status(502).json({
        ok: false,
        error: googleMessage
      });
    }

    const rawResults = Array.isArray(googleData?.results)
      ? googleData.results
      : [];

    const results = rawResults
      .map((item) => {
        const data = item?.document?.derivedStructData || {};
        const structData = item?.document?.structData || {};

        const link =
          data?.link ||
          data?.url ||
          structData?.link ||
          structData?.url ||
          "";

        const title =
          data?.title ||
          structData?.title ||
          item?.document?.id ||
          "Untitled result";

        const snippet =
          data?.snippet ||
          structData?.snippet ||
          data?.description ||
          structData?.description ||
          "";

        return {
          title: String(title),
          url: typeof link === "string" ? link : "",
          snippet: String(snippet),
          sourceType: link
            ? "PUBLIC SOURCE"
            : "SEARCH RESULT"
        };
      })
      .filter((item) => item.url);

    return res.json({
      ok: true,
      query,
      resultCount: results.length,
      results
    });
  } catch (error) {
    console.error("Commerce search error:", error);

    return res.status(500).json({
      ok: false,
      error:
        "Something went wrong while processing the commerce search."
    });
  }
});

/**
 * Keep the main website available
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `PiNexusCommerce-Cloud running on port ${PORT}`
  );
});
