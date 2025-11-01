// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("assignments");
  const analyzeBtn = document.getElementById("analyzeBtn");

  // Show loading state
  container.innerHTML = "<p>Loading assignments...</p>";

  // --- Helper: render assignments with AI analysis ---
  async function analyzeAndRender(assignments) {
    container.innerHTML = ""; // clear loading

    if (!assignments || !assignments.length) {
      container.innerHTML = "<p>No assignments found.</p>";
      return;
    }

    for (const a of assignments) {
      const card = document.createElement("div");
      card.className = "assignment-card";
      card.innerHTML = `
        <h3>${a.title}</h3>
        <p><strong>Due:</strong> ${a.due || a.rawDueText || "—"}</p>
        <p><em>Fetching details...</em></p>
      `;
      container.appendChild(card);

      try {
        // Ask background to fetch full assignment details + AI analysis
        const result = await chrome.runtime.sendMessage({
          type: "FETCH_AND_ANALYZE_ASSIGNMENT",
          assignment: a
        });

        card.innerHTML = `
          <h3>${a.title}</h3>
          <p><strong>Due:</strong> ${a.due || a.rawDueText || "—"}</p>
          <p><strong>Summary:</strong> ${result.summary}</p>
          <p><strong>Classification:</strong> ${result.classification}</p>
          <p><strong>Priority:</strong> ${result.priority}</p>
        `;
      } catch (err) {
        console.error("AI analysis failed:", err);
        card.innerHTML += `<p style="color:red;">Analysis failed</p>`;
      }
    }
  }

  // --- Always check storage first ---
  chrome.storage.local.get("assignments", (result) => {
    if (result.assignments && result.assignments.length) {
      analyzeAndRender(result.assignments);
    }
  });

  // --- Also listen for live messages from content.js ---
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "ASSIGNMENT_DATA") {
      analyzeAndRender(msg.data);
    }
  });

  // --- Manual trigger (Analyze button) ---
  analyzeBtn.addEventListener("click", () => {
    chrome.storage.local.get("assignments", (result) => {
      if (result.assignments && result.assignments.length) {
        analyzeAndRender(result.assignments);
      } else {
        container.innerHTML = "<p>No assignments available to analyze.</p>";
      }
    });
  });
});