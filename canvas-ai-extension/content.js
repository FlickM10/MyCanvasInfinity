// content.js
console.log("[Canvas AI Assistant content.js] loaded");

function parseDueDate(rawText) {
  if (!rawText) return null;
  let text = rawText.replace(/^Due\s*/i, "").trim();
  let parsed = Date.parse(text);
  if (!isNaN(parsed)) return new Date(parsed).toISOString();
  const year = new Date().getFullYear();
  parsed = Date.parse(`${text} ${year}`);
  return isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function scrapeAssignments() {
  const assignments = [];

  // Grab each To Do sidebar item
  document.querySelectorAll(".ToDoSidebarItem__Title").forEach(item => {
    const link = item.querySelector("a");
    const title = link?.textContent.trim() || "Untitled";

    // Course name and due date may be in sibling elements — adjust as needed
    const container = item.closest("li, div"); // climb up to wrapper
    const course = container?.querySelector(".ToDoSidebarItem__Course")?.textContent.trim() || "";
    const rawDueText = container?.querySelector(".ToDoSidebarItem__Date")?.textContent.trim() || null;

    assignments.push({
      title,
      details: course,
      rawDueText,
      due: parseDueDate(rawDueText),
      url: link?.href || null
    });
  });

  console.log("[Canvas AI Assistant content.js] scraped", assignments.length, "assignments");

  if (assignments.length) {
    chrome.runtime.sendMessage({ type: "ASSIGNMENT_DATA", data: assignments });
    chrome.storage.local.set({ assignments });
  }
}

// Run once on load
scrapeAssignments();

// Watch for dynamic changes (Canvas often lazy‑loads To Do items)
const observer = new MutationObserver(() => scrapeAssignments());
observer.observe(document.body, { childList: true, subtree: true });