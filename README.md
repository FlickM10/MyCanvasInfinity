# MyCanvasInfinity
MyCanvasInfinity is a Chrome extension that transforms the Canvas LMS into a smart, AI-powered productivity dashboard. Instead of forcing students to dig through cluttered course pages, it automatically extracts assignments in real time, analyzes their urgency, and presents them in a clean, conversational interface.
## Inspiration
As students, we constantly juggle multiple assignments, deadlines, and priorities across platforms. Canvas, while powerful, often buries important tasks in cluttered dashboards. We wanted a tool that doesn’t just list assignments but actually thinks with us—an assistant that highlights what matters most, when it matters most. That’s how MyCanvasInfinity was born: a Chrome extension that transforms Canvas into a smart dashboard.

## What it does
- Extracts assignments in real time from Canvas pages.
- Analyzes urgency and importance using built-in AI (Gemini Nano), assigning priority scores.
- Summarizes assignments in plain language so you know what’s expected at a glance.
- Caching & sorting: Keeps performance smooth and ensures urgent tasks always float to the top.

## How we built it
Extension Architecture :-
- Structured as a standard Chrome extension with manifest.json (v3) defining permissions, background service worker, content scripts, and popup UI.
- Used modular JavaScript files (content.js, popup.js, background.js) to keep scraping, AI calls, and UI rendering isolated and restart-safe.
- Implemented message passing between content scripts and the popup via chrome.runtime.sendMessage and chrome.runtime.onMessage for real-time updates.

Assignment Extraction (content.js) :-
- Injected into Canvas LMS pages to parse DOM elements containing assignment titles, due dates, and links.
- Used robust CSS selectors with fallback strategies to handle different Canvas layouts.
- Normalized extracted data into a JSON structure:

json
  
    {

    "title": "Assignment 3: Machine Learning",
  
    "dueDate": "2025-11-02T23:59:00",
  
    "course": "CS 6051",
  
    "status": "upcoming"
  
    }

- Added console logging at each stage for validation and debugging.


AI Integration (background.js) :-

-Registered for Chrome’s Prompt API (Origin Trial) to enable built-in AI calls.

-Sent extracted assignment JSON to the AI model for:

 -Priority classification (urgent, medium, low).
 
 -Natural-language summaries of assignment requirements.
 
  -Explanations of why an assignment was marked urgent.
  
-Implemented graceful fallbacks: if AI failed, the extension defaulted to rule-based heuristics (e.g., due date proximity).

Caching & Performance
- Used chrome.storage.local to cache assignment data and AI results.
- Implemented a time-to-live (TTL) system so cached results expired after a set interval, balancing freshness with performance.
- Deduplicated assignments by unique Canvas IDs to avoid repeated entries when navigating between pages.

Popup UI (popup.html + popup.css + popup.js) :-

-Designed a chat-style interface:

  -Assignments displayed as rounded chat bubbles.
  
  -Color-coded priority badges (red/yellow/green) rendered as pill-shaped spans.
  
  - Hover effects and subtle shadows for hierarchy.
  - 
-Added sorting logic in popup.js so urgent tasks always appear at the top.

-Implemented “typing indicator” animation to simulate AI analysis in progress, making the UI feel conversational.

Debugging & Validation:-
-Iteratively tested against live Canvas courses to ensure selectors worked across different instructors’ layouts.
-Logged every stage of the pipeline (extraction → AI call → caching → rendering) to the console for reproducibility.
-Stress-tested with multiple courses and dozens of assignments to confirm stability.

## Challenges we ran into
Canvas variability: Different course layouts sometimes broke extraction logic, requiring resilient selectors and multiple fallback strategies to ensure assignments were consistently captured.

API integration: Adapting quickly to evolving Chrome Prompt API specs, while also building graceful fallbacks when AI calls failed or returned incomplete results.

UI polish under time pressure: Transforming the popup from a plain list into a delightful, chat-style interface with bubbles, badges, and animations—without sacrificing responsiveness or performance.

Debugging in real-world conditions: Testing against live Canvas data meant handling missing due dates, duplicate entries, and navigation quirks that only appeared in production.

Canvas API limitations: We couldn’t obtain authorization to use the official Canvas API token, which would have allowed direct fetching of assignment details. Instead, we engineered a DOM-scraping approach combined with AI summarization, which worked but required extra resilience and creativity.

CORS restrictions: Even when experimenting with direct API calls, strict Cross-Origin Resource Sharing (CORS) policies blocked requests from the extension to Canvas endpoints. This forced us to rethink our architecture—shifting more logic into content scripts (which inherit the page’s origin) and avoiding direct background-to-API calls. It was a crash course in browser security models and how extensions must work within them.

## Accomplishments that we're proud of
- Built a fully working extension that transforms Canvas into a smart assistant.
- Designed a playful, engaging UI that makes productivity feel less like a chore.
- Achieved real-time AI-powered prioritization inside a browser extension.
- Iterated rapidly with hands-on debugging and validation, ensuring reliability.

## What we learned
- How to design restart-safe, modular pipelines for browser extensions.
- The importance of UI metaphors—a chat-style interface can completely change how users feel about productivity tools.
- How to adapt quickly to new APIs and browser environments.
- That playfulness and polish matter just as much as backend efficiency for user adoption.

## What's next for MyCanvasInfinity
- Deeper AI insights: Natural-language explanations of why an assignment is high priority.
- Cross-platform support: Extending beyond Canvas to other LMS platforms.
- Customization: Letting users tweak priority rules, colors, and UI themes.
- Collaboration features: Shared dashboards for study groups or project teams.
