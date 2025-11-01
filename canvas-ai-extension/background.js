// background.js
console.log("[Canvas AI Assistant] background.js loaded");

let lmSession = null; // reuse a single session

// Replace with your Canvas domain + token
const CANVAS_DOMAIN = "https://yourcanvasdomain";
const API_TOKEN = "YOUR_CANVAS_API_TOKEN";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Canvas AI Assistant] Extension installed");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ANALYZE_ASSIGNMENT") {
    handleAnalysis(msg.text, msg.due).then(sendResponse);
    return true; // async
  }

  if (msg.type === "FETCH_AND_ANALYZE_ASSIGNMENT") {
    (async () => {
      try {
        const { assignment } = msg;

        // --- Check cache first ---
        const cacheKey = `assignment_${assignment.id}`;
        const cached = await getFromCache(cacheKey);
        if (cached) {
          console.log("[Canvas AI Assistant] Using cached analysis for", assignment.id);
          sendResponse(cached);
          return;
        }

        // --- Fetch details + analyze ---
        const details = await fetchAssignmentDetails(
          assignment.courseId,
          assignment.id,
          API_TOKEN
        );
        const plainText = stripHTML(details.description || "");
        const analysis = await handleAnalysis(plainText, details.due);
        const priority = computePriority(analysis.classification, details.due);

        const result = {
          summary: analysis.summary,
          classification: analysis.classification,
          priority,
          id: assignment.id
        };

        // --- Cache result ---
        await saveToCache(cacheKey, result);

        sendResponse(result);
      } catch (err) {
        console.error("[Canvas AI Assistant] FETCH_AND_ANALYZE failed:", err);
        sendResponse({
          summary: "Error fetching/analysis",
          classification: "normal",
          priority: "N/A"
        });
      }
    })();
    return true; // async
  }
});

// --- Cache helpers ---
function getFromCache(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (res) => {
      resolve(res[key] || null);
    });
  });
}

function saveToCache(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// --- Fetch assignment details from Canvas API ---
async function fetchAssignmentDetails(courseId, assignmentId, token) {
  const url = `${CANVAS_DOMAIN}/api/v1/courses/${courseId}/assignments/${assignmentId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Failed to fetch assignment details");
  const data = await response.json();
  return {
    id: data.id,
    title: data.name,
    due: data.due_at,
    description: data.description || ""
  };
}

function stripHTML(html) {
  return html.replace(/<[^>]+>/g, "").trim();
}

function computePriority(classification, due) {
  if (!due) return "Medium";
  const dueDate = new Date(due);
  const now = new Date();
  const diffDays = (dueDate - now) / (1000 * 60 * 60 * 24);

  if (diffDays <= 2) return "High (due soon)";
  if (classification === "hard" || classification === "lengthy") return "High";
  if (diffDays <= 7) return "Medium";
  return "Low";
}

// --- Prompt API session management ---
async function getSession() {
  if (typeof LanguageModel === "undefined") {
    console.error("[Canvas AI Assistant] LanguageModel is undefined (API not exposed).");
    return null;
  }

  let availability;
  try {
    availability = await LanguageModel.availability({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }]
    });
    console.log("[Canvas AI Assistant] availability():", availability);
  } catch (e) {
    console.error("[Canvas AI Assistant] availability() threw:", e);
    return null;
  }

  if (availability === "unavailable") {
    console.warn("[Canvas AI Assistant] Model unavailable. Check flags or Origin Trial.");
    return null;
  }

  if (lmSession) return lmSession;

  try {
    console.log("[Canvas AI Assistant] Creating session…");
    lmSession = await LanguageModel.create({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          console.log(`[Canvas AI Assistant] Download progress: ${(e.loaded * 100).toFixed(1)}%`);
        });
      }
    });
    console.log("[Canvas AI Assistant] Session created:", !!lmSession);
    return lmSession;
  } catch (e) {
    console.error("[Canvas AI Assistant] create() failed:", e);
    return null;
  }
}

// --- AI analysis ---
async function handleAnalysis(text, due) {
  let summary = "AI not available";
  let classification = "normal";

  try {
    const session = await getSession();
    if (!session) {
      return { summary, classification };
    }

    // Summarize
    const sumPrompt = [
      { role: "system", content: "You are a helpful assistant that summarizes assignments." },
      { role: "user", content: `Summarize this assignment in 2 concise sentences:\n\n${text}` }
    ];
    console.log("[Canvas AI Assistant] Prompting for summary…");
    const sumResult = await session.prompt(sumPrompt);
    summary = typeof sumResult === "string" ? sumResult.trim() : String(sumResult ?? "").trim();

    // Classify difficulty
    const classPrompt = [
      { role: "system", content: "You classify assignment difficulty." },
      { role: "user", content: `Classify difficulty as exactly one of: easy, normal, hard, or lengthy.\n\n${text}` }
    ];
    console.log("[Canvas AI Assistant] Prompting for classification…");
    const classResult = await session.prompt(classPrompt);
    const lc = String(classResult ?? "").toLowerCase();
    classification =
      lc.includes("hard") ? "hard" :
      lc.includes("lengthy") ? "lengthy" :
      lc.includes("easy") ? "easy" : "normal";

    console.log("[Canvas AI Assistant] Analysis complete:", { summary, classification });
  } catch (err) {
    console.error("[Canvas AI Assistant] Prompt API error:", err);
    summary = "Error summarizing";
    classification = "normal";
  }

  return { summary, classification };
}