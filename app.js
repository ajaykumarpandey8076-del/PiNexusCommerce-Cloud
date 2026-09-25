
/* =========================================================
   PiNexusCommerce Cloud
   Frontend Application Logic
   Version 2.0.0
   ========================================================= */

"use strict";

/* =========================================================
   ELEMENTS
   ========================================================= */

const commerceQuery = document.getElementById("commerceQuery");
const userRole = document.getElementById("userRole");
const sourceLocation = document.getElementById("sourceLocation");
const destinationLocation = document.getElementById("destinationLocation");

const searchButton = document.getElementById("searchButton");

const understandingSection =
  document.getElementById("understandingSection");

const understandingLoading =
  document.getElementById("understandingLoading");

const understandingContent =
  document.getElementById("understandingContent");

const resultsSection =
  document.getElementById("resultsSection");

const resultsContainer =
  document.getElementById("resultsContainer");

const resultCount =
  document.getElementById("resultCount");

const analysisSection =
  document.getElementById("analysisSection");

const analysisYes =
  document.getElementById("analysisYes");

const analysisNo =
  document.getElementById("analysisNo");

const analysisResultSection =
  document.getElementById("analysisResultSection");

const analysisResult =
  document.getElementById("analysisResult");

const sourceGateway =
  document.getElementById("sourceGateway");

const originalWebsiteLink =
  document.getElementById("originalWebsiteLink");


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {
  query: "",
  role: "",
  source: "",
  destination: "",
  results: [],
  selectedResult: null
};


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}


function isValidHttpUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}


function getSourceName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Public Web Source";
  }
}


/* =========================================================
   UI HELPERS
   ========================================================= */

function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}


function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}


function setSearchLoading(isLoading) {
  if (!searchButton) return;

  searchButton.disabled = isLoading;

  if (isLoading) {
    searchButton.innerHTML =
      "<span>⏳</span> Searching real public sources...";
  } else {
    searchButton.innerHTML =
      "<span>🔎</span> Search Real Commerce Sources";
  }
}


function showUnderstandingLoading() {
  show(understandingSection);
  show(understandingLoading);

  if (understandingContent) {
    understandingContent.innerHTML = "";
  }
}


function hideUnderstandingLoading() {
  hide(understandingLoading);
}


/* =========================================================
   AI UNDERSTANDING
   ========================================================= */

function buildUnderstanding() {
  const query = cleanText(state.query);

  const roleText =
    state.role
      ? state.role
          .replace(/-/g, " ")
          .replace(/\b\w/g, letter => letter.toUpperCase())
      : "AI will determine from the requirement";

  const sourceText =
    state.source || "Not specified";

  const destinationText =
    state.destination || "Not specified";

  return `
    <div class="understanding-summary">

      <p>
        <strong>Requirement:</strong>
        ${escapeHtml(query)}
      </p>

      <p>
        <strong>Role:</strong>
        ${escapeHtml(roleText)}
      </p>

      <p>
        <strong>Source / Supplier Location:</strong>
        ${escapeHtml(sourceText)}
      </p>

      <p>
        <strong>Destination Market:</strong>
        ${escapeHtml(destinationText)}
      </p>

      <p>
        <strong>Research mode:</strong>
        Real public web sources only
      </p>

      <p>
        <strong>Reality rule:</strong>
        No invented suppliers, buyers, products, prices,
        stock or transactions.
      </p>

    </div>
  `;
}


/* =========================================================
   SEARCH REQUEST
   ========================================================= */

async function searchCommerceSources() {

  const query = cleanText(commerceQuery?.value);

  if (!query) {
    alert("Please enter what you want to buy, sell, source or research.");
    commerceQuery?.focus();
    return;
  }

  state.query = query;
  state.role = cleanText(userRole?.value);
  state.source = cleanText(sourceLocation?.value);
  state.destination = cleanText(destinationLocation?.value);

  state.results = [];
  state.selectedResult = null;

  hide(resultsSection);
  hide(analysisSection);
  hide(analysisResultSection);
  hide(sourceGateway);

  showUnderstandingLoading();

  setSearchLoading(true);

  try {

    /*
     * The server receives the search request.
     * API keys remain on the server.
     */

    const response = await fetch("/api/search-commerce", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        query: buildSearchQuery()
      })
    });


    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }


    if (!response.ok || !data?.ok) {

      throw new Error(
        data?.error ||
        "Commerce search could not be completed."
      );
    }


    state.results = Array.isArray(data.results)
      ? data.results.filter(
          item =>
            item &&
            isValidHttpUrl(item.url)
        )
      : [];


    renderUnderstanding();

    renderResults();


  } catch (error) {

    console.error(
      "PiNexusCommerce search error:",
      error
    );

    renderSearchError(
      error?.message ||
      "Something went wrong while searching."
    );

  } finally {

    hideUnderstandingLoading();

    setSearchLoading(false);
  }
}


/* =========================================================
   SEARCH QUERY BUILDER
   ========================================================= */

function buildSearchQuery() {

  const parts = [];

  parts.push(state.query);

  if (state.source) {
    parts.push(
      "source supplier location " +
      state.source
    );
  }

  if (state.destination) {
    parts.push(
      "destination market " +
      state.destination
    );
  }

  if (state.role) {
    parts.push(
      "commerce role " +
      state.role
    );
  }

  return parts.join(" ");
}


/* =========================================================
   UNDERSTANDING RENDER
   ========================================================= */

function renderUnderstanding() {

  show(understandingSection);

  hideUnderstandingLoading();

  if (!understandingContent) {
    return;
  }

  understandingContent.innerHTML =
    buildUnderstanding();
}


/* =========================================================
   RESULTS RENDER
   ========================================================= */

function renderResults() {

  show(resultsSection);

  if (resultCount) {
    resultCount.textContent =
      `${state.results.length} source` +
      (state.results.length === 1 ? "" : "s");
  }


  if (!resultsContainer) {
    return;
  }


  if (!state.results.length) {

    resultsContainer.innerHTML = `
      <div class="empty-message">

        <strong>No verified public source was returned.</strong>

        <p>
          PiNexusCommerce will not invent a supplier,
          buyer, product, price or business opportunity.
        </p>

        <p>
          Try a more specific requirement.
        </p>

      </div>
    `;

    hide(analysisSection);
    return;
  }


  resultsContainer.innerHTML =
    state.results
      .map((result, index) =>
        createResultCard(result, index)
      )
      .join("");


  attachResultButtons();

  show(analysisSection);
}


/* =========================================================
   RESULT CARD
   ========================================================= */

function createResultCard(result, index) {

  const title =
    cleanText(result.title) ||
    "Public Commerce Source";

  const snippet =
    cleanText(result.snippet) ||
    "No additional public description was returned.";

  const url =
    isValidHttpUrl(result.url)
      ? result.url
      : "";

  const sourceName =
    getSourceName(url);


  return `
    <article class="result-card">

      <div class="result-card-header">

        <span class="source-badge">
          PUBLIC SOURCE
        </span>

        <span class="result-number">
          #${index + 1}
        </span>

      </div>


      <h3>
        ${escapeHtml(title)}
      </h3>


      <p>
        ${escapeHtml(snippet)}
      </p>


      <div class="result-source">

        <strong>
          Source:
        </strong>

        ${escapeHtml(sourceName)}

      </div>


      <div class="result-actions">

        <button
          type="button"
          class="primary-button small-button result-open-button"
          data-index="${index}"
        >
          🌐 Open Original Website
        </button>

        <button
          type="button"
          class="secondary-button small-button result-select-button"
          data-index="${index}"
        >
          Select for Analysis
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   RESULT BUTTONS
   ========================================================= */

function attachResultButtons() {

  const openButtons =
    document.querySelectorAll(
      ".result-open-button"
    );


  const selectButtons =
    document.querySelectorAll(
      ".result-select-button"
    );


  openButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const index =
          Number(button.dataset.index);

        const result =
          state.results[index];

        if (!result) {
          return;
        }

        openOriginalWebsite(result);
      }
    );

  });


  selectButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const index =
          Number(button.dataset.index);

        const result =
          state.results[index];

        if (!result) {
          return;
        }

        selectResult(result);

      }
    );

  });
}


/* =========================================================
   ORIGINAL WEBSITE
   ========================================================= */

function openOriginalWebsite(result) {

  if (
    !result ||
    !isValidHttpUrl(result.url)
  ) {
    alert(
      "A verified original website URL is not available for this result."
    );

    return;
  }


  state.selectedResult = result;


  if (originalWebsiteLink) {

    originalWebsiteLink.href =
      result.url;

    show(sourceGateway);
  }


  window.open(
    result.url,
    "_blank",
    "noopener,noreferrer"
  );
}


/* =========================================================
   SELECT RESULT
   ========================================================= */

function selectResult(result) {

  state.selectedResult = result;

  if (originalWebsiteLink) {

    originalWebsiteLink.href =
      result.url;

    show(sourceGateway);
  }


  if (analysisResult) {

    analysisResult.innerHTML = `
      <div class="analysis-selected-source">

        <h3>
          Selected Public Source
        </h3>

        <p>
          <strong>
            ${escapeHtml(
              result.title || "Public Commerce Source"
            )}
          </strong>
        </p>

        <p>
          Source:
          ${escapeHtml(
            getSourceName(result.url)
          )}
        </p>

        <p>
          Detailed analysis can be requested
          using the analysis button below.
        </p>

      </div>
    `;
  }
}


/* =========================================================
   ANALYSIS
   ========================================================= */

function requestAnalysis() {

  show(analysisResultSection);


  const selected =
    state.selectedResult;


  if (!selected) {

    analysisResult.innerHTML = `
      <div class="empty-message">

        <h3>
          Select a public source first
        </h3>

        <p>
          Choose "Select for Analysis" on a
          search result.
        </p>

      </div>
    `;

    return;
  }


  /*
   * Important:
   * We do not invent commercial facts here.
   * A future AI analysis endpoint can be connected
   * to the selected real source.
   */

  analysisResult.innerHTML = `

    <div class="analysis-result-content">

      <h3>
        Analysis Request
      </h3>

      <p>
        <strong>Requirement:</strong>
        ${escapeHtml(state.query)}
      </p>

      <p>
        <strong>Selected source:</strong>
        ${escapeHtml(
          selected.title ||
          "Public Commerce Source"
        )}
      </p>

      <p>
        <strong>Website:</strong>
        ${escapeHtml(
          getSourceName(selected.url)
        )}
      </p>

      <hr>

      <p>
        The source is based on publicly returned
        search information.
      </p>

      <p>
        Detailed AI analysis will only use
        available public/user-provided information.
        It will not invent price, stock, supplier
        identity, market demand or transaction data.
      </p>

      <p class="small-note">
        Information may change. AI advises;
        you make the final decision.
      </p>

    </div>
  `;
}


/* =========================================================
   SEARCH ERROR
   ========================================================= */

function renderSearchError(message) {

  show(understandingSection);
  show(resultsSection);

  hide(analysisSection);
  hide(analysisResultSection);
  hide(sourceGateway);


  if (understandingContent) {

    understandingContent.innerHTML = `
      <div class="empty-message">

        <h3>
          Search could not be completed
        </h3>

        <p>
          ${escapeHtml(message)}
        </p>

      </div>
    `;
  }


  if (resultCount) {
    resultCount.textContent = "0 sources";
  }


  if (resultsContainer) {

    resultsContainer.innerHTML = `
      <div class="empty-message">

        <p>
          No result was displayed because
          the search service did not return
          verified data.
        </p>

      </div>
    `;
  }
}


/* =========================================================
   ANALYSIS BUTTONS
   ========================================================= */

if (analysisYes) {

  analysisYes.addEventListener(
    "click",
    requestAnalysis
  );
}


if (analysisNo) {

  analysisNo.addEventListener(
    "click",
    () => {

      hide(analysisResultSection);

    }
  );
}


/* =========================================================
   MAIN SEARCH BUTTON
   ========================================================= */

if (searchButton) {

  searchButton.addEventListener(
    "click",
    searchCommerceSources
  );
}


/* =========================================================
   KEYBOARD SUPPORT
   ========================================================= */

if (commerceQuery) {

  commerceQuery.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey)
      ) {

        event.preventDefault();

        searchCommerceSources();
      }

    }
  );
}


/* =========================================================
   ORIGINAL WEBSITE GATEWAY
   ========================================================= */

if (originalWebsiteLink) {

  originalWebsiteLink.addEventListener(
    "click",
    event => {

      const url =
        originalWebsiteLink.href;

      if (!isValidHttpUrl(url)) {

        event.preventDefault();

        alert(
          "No verified original website is available."
        );
      }

    }
  );
}


/* =========================================================
   STARTUP
   ========================================================= */

console.log(
  "PiNexusCommerce Cloud frontend loaded."
);

console.log(
  "Reality-first commerce gateway active."
);
