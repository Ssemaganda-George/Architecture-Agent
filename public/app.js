const promptInput = document.getElementById("prompt");
const runBtn = document.getElementById("run-btn");
const runText = document.getElementById("run-text");
const output = document.getElementById("output");
const modeTitle = document.getElementById("mode-title");
const modeSubtitle = document.getElementById("mode-subtitle");
const statusBadge = document.getElementById("status-badge");
const statusText = document.getElementById("status-text");
const navItems = document.querySelectorAll(".nav-item");
const standardView = document.getElementById("standard-view");
const corpusView = document.getElementById("corpus-view");
const chatView = document.getElementById("chat-view");
const chatMessages = document.getElementById("chat-messages");
const chatEmpty = document.getElementById("chat-empty");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatSuggestions = document.getElementById("chat-suggestions");
const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const uploadProgress = document.getElementById("upload-progress");
const uploadProgressFill = document.getElementById("upload-progress-fill");
const uploadProgressText = document.getElementById("upload-progress-text");
const tryExampleBtn = document.getElementById("try-example-btn");
const hamburgerBtn = document.getElementById("hamburger-btn");
const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const pinInput = document.getElementById("pin-input");
const pinSubmitBtn = document.getElementById("pin-submit-btn");

let pinVerified = false;
const REQUIRED_PIN = "julie";

let currentMode = "chat";
let initialized = false;
let chatHistory = [];

const modeTitles = {
  brief: "Project Brief",
  concept: "Concept Design",
  space: "Space Plan",
  boq: "Bill of Quantities",
  cost: "Cost Estimate",
  suppliers: "Suppliers",
  structure: "Structure",
  workflow: "Workflow",
  corpus: "Dataset",
  chat: "Chat",
};

const modeDescriptions = {
  brief: "Project brief",
  concept: "Concept design",
  space: "Space plan",
  boq: "Bill of quantities",
  cost: "Cost estimate",
  suppliers: "Supplier recommendations",
  structure: "Structural suggestions",
  workflow: "Workflow results",
  corpus: "Dataset",
  chat: "Chat",
};

const pipelineModes = ["brief", "concept", "space", "boq", "cost"];

const promptPlaceholders = {
  brief: "Describe your project, for example: I need a modern 4-bedroom family home on a 50x100 ft plot with a budget of UGX 250 million.",
  concept: "Describe the project and desired style, for example: 4-bedroom bungalow with sustainable materials.",
  space: "Describe your space requirements, for example: Open-plan living, 4 bedrooms, 3 bathrooms.",
  boq: "Describe the project for a detailed Bill of Quantities.",
  cost: "Describe the project and budget constraints.",
  suppliers: "Describe materials needed, for example: Cement, steel, roofing sheets.",
  structure: "Describe the building requirements for structural advice.",
  workflow: "Run the full workflow. Describe the project to generate all deliverables.",
  chat: "",
};

function setStatus(state, text) {
  statusBadge.className = "status-badge " + (state === "ready" ? "ready" : "");
  statusText.textContent = text;
}

function setLoading(isLoading, isChat = false) {
  if (isChat) {
    chatSendBtn.disabled = isLoading;
  } else {
    runBtn.disabled = isLoading;
    promptInput.disabled = isLoading;
  }
  if (isLoading) {
    if (isChat) {
      chatSendBtn.innerHTML = "<span class=\"spinner\"></span>";
    } else {
      runText.innerHTML = "<span class=\"spinner\"></span> Running...";
    }
  } else {
    if (isChat) {
      chatSendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    } else {
      runText.textContent = "Run";
    }
  }
}

function showLoadingSkeleton() {
  output.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:16px;color:var(--text-secondary);">
      <span class="spinner-dark"></span>
      <span>Generating... usually takes 15-30s</span>
    </div>
    <div class="loading-skeleton">
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-short"></div>
    </div>`;
}

function scrollToOutput() {
  output.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError(message) {
  output.innerHTML = `<div class="error-message">Error: ${message}</div>`;
}

function renderJson(data, title) {
  const json = JSON.stringify(data, null, 2);
  return `<div class="component-title">${title || "Result"}</div><pre style="background:#f8fafc;padding:12px;border-radius:8px;overflow:auto;font-size:12px;border:1px solid #e2e8f0;">${escapeHtml(json)}</pre>`;
}

function renderProjectBrief(data) {
  let html = `<div class="component-title">Project Brief</div>`;
  html += `<div class="brief-grid">`;
  html += renderField("Summary", data.projectSummary);
  html += renderField("Building Type", data.buildingType);
  html += renderField("Bedrooms", data.bedrooms);
  html += renderField("Style", data.style);
  html += renderField("Budget", data.budget);
  html += renderField("Plot Size", data.plotSize);
  html += renderField("Climate", data.climate);
  html += renderField("Orientation", data.orientation);
  html += `</div>`;
  html += renderList("Sustainability Recommendations", data.sustainabilityRecommendations);
  html += renderList("Target Users", data.targetUsers);
  html += renderList("Constraints", data.constraints);
  return html;
}

function renderConcept(data) {
  let html = `<div class="component-title">Concept Design</div>`;
  html += `<div class="section-grid">`;
  html += renderField("Concept Statement", data.conceptStatement);
  html += renderField("Design Philosophy", data.designPhilosophy);
  html += `</div>`;
  html += renderList("Material Recommendations", data.materialRecommendations);
  html += renderList("Color Palette", data.colorPalette);
  html += `<div class="section-grid">`;
  html += renderField("Elevation Ideas", data.elevationIdeas);
  html += renderField("Roof Recommendation", data.roofRecommendation);
  html += renderField("Interior Concept", data.interiorConcept);
  html += `</div>`;
  return html;
}

function renderSpace(data) {
  let html = `<div class="component-title">Space Plan</div>`;
  html += `<div class="section-grid">`;
  html += renderField("Floor Plan Summary", data.floorPlanSummary);
  html += renderField("Room Relationships", data.roomRelationships);
  html += renderField("Circulation Strategy", data.circulationStrategy);
  html += renderField("Layout Recommendations", data.layoutRecommendations);
  html += renderField("Area Schedule", data.areaSchedule);
  html += `</div>`;
  return html;
}

function renderBOQ(data) {
  let html = `<div class="component-title">Bill of Quantities</div>`;
  if (!Array.isArray(data) || data.length === 0) {
    return html + '<div class="empty-state">No items found.</div>';
  }

  let items = data;
  if (items.length === 1 && items[0].category === "General") {
    const raw = String(items[0].item || "").trim();
    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].category) {
          items = parsed.map((it) => ({
            category: String(it.category ?? ""),
            item: String(it.item ?? ""),
            quantity: String(it.quantity ?? ""),
            unit: String(it.unit ?? ""),
            rate: it.rate != null ? String(it.rate) : undefined,
            amount: it.amount != null ? String(it.amount) : undefined,
            notes: it.notes != null ? String(it.notes) : undefined,
          }));
        }
      } catch {
        // keep original single item
      }
    }
  }

  html += `<div class="table-wrapper"><table><thead><tr><th>Category</th><th>Item</th><th>Qty</th><th>Unit</th><th>Rate (UGX)</th><th>Amount (UGX)</th></tr></thead><tbody>`;
  let totalAmount = 0;
  items.forEach((item) => {
    const itemText = String(item.item ?? "");
    let itemCell;
    if ((itemText.startsWith("{") && itemText.endsWith("}")) || (itemText.startsWith("[") && itemText.endsWith("]"))) {
      try {
        const parsed = JSON.parse(itemText);
        itemCell = `<pre style="background:#f8fafc;padding:8px;border-radius:6px;overflow:auto;font-size:11px;border:1px solid #e2e8f0;margin:0;">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
      } catch {
        itemCell = escapeHtml(itemText);
      }
    } else {
      itemCell = escapeHtml(itemText);
    }
    const amountVal = Number(item.amount ?? 0);
    if (!Number.isNaN(amountVal)) {
      totalAmount += amountVal;
    }
    html += `<tr><td>${escapeHtml(item.category)}</td><td>${itemCell}</td><td class="num">${escapeHtml(item.quantity)}</td><td>${escapeHtml(item.unit)}</td><td class="num">${escapeHtml(item.rate ?? "")}</td><td class="num">${escapeHtml(item.amount ?? "")}</td></tr>`;
  });
  html += `<tr class="total-row"><td colspan="5">Total</td><td class="num">${totalAmount.toLocaleString()}</td></tr>`;
  html += "</tbody></table></div>";
  return html;
}

function renderCost(data) {
  let html = `<div class="component-title">Cost Estimate</div>`;
  html += `<div class="cost-hero">`;
  html += `<div class="cost-total">${escapeHtml(data.totalCost)} <span class="cost-currency">${escapeHtml(data.currency)}</span></div>`;
  html += `</div>`;
  html += `<div class="cost-breakdown">`;
  html += renderCostRow("Labour", data.labour);
  html += renderCostRow("Materials", data.materials);
  html += renderCostRow("Equipment", data.equipment);
  html += renderCostRow("Transport", data.transport);
  html += renderCostRow("Professional Fees", data.professionalFees);
  html += renderCostRow("Contingency", data.contingency);
  html += `</div>`;
  if (data.assumptions) {
    html += `<div class="component-section"><div class="component-section-title">Assumptions</div><p>${escapeHtml(data.assumptions)}</p></div>`;
  }
  return html;
}

function renderCostRow(label, value) {
  const display = value === undefined || value === null || value === "" ? "—" : escapeHtml(String(value));
  return `<div class="cost-row"><span class="cost-label">${escapeHtml(label)}</span><span class="cost-value">${display}</span></div>`;
}

function renderSuppliers(data) {
  let html = `<div class="component-title">Suppliers</div>`;
  if (!Array.isArray(data) || data.length === 0) {
    return html + '<div class="empty-state">No recommendations found.</div>';
  }
  html += `<div class="table-wrapper"><table><thead><tr><th>Category</th><th>Supplier</th><th>Price</th><th>Location</th><th>Availability</th></tr></thead><tbody>`;
  data.forEach((item) => {
    html += `<tr><td>${escapeHtml(item.materialCategory)}</td><td>${escapeHtml(item.supplierName)}</td><td>${escapeHtml(item.price)}</td><td>${escapeHtml(item.location)}</td><td>${escapeHtml(item.availability)}</td></tr>`;
  });
  html += "</tbody></table></div>";
  return html;
}

function renderStructure(data) {
  let html = `<div class="component-title">Structural Suggestions</div>`;
  html += `<div class="section-grid">`;
  html += renderField("Foundation", data.foundation);
  html += renderField("Slab Thickness", data.slabThickness);
  html += renderField("Column Sizes", data.columnSizes);
  html += renderField("Beam Sizes", data.beamSizes);
  html += renderField("Roof Framing", data.roofFraming);
  html += renderField("Disclaimer", data.disclaimer);
  html += `</div>`;
  return html;
}

function renderWorkflow(data) {
  let html = `<div class="component-title">Workflow Results</div>`;
  if (Array.isArray(data.files) && data.files.length > 0) {
    html += `<div class="file-list">`;
    data.files.forEach((file) => {
      html += `<div class="file-item">${escapeHtml(file)}</div>`;
    });
    html += `</div>`;
  } else {
    html += '<div class="empty-state">Workflow complete. Files not reported.</div>';
  }
  return html;
}

function renderField(label, value) {
  let content;
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    content = '<div class="empty-state">Not specified</div>';
  } else if (typeof value === "object") {
    content = `<pre style="background:#f8fafc;padding:12px;border-radius:8px;overflow:auto;font-size:12px;border:1px solid #e2e8f0;">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  } else {
    const trimmed = String(value).trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        content = `<pre style="background:#f8fafc;padding:12px;border-radius:8px;overflow:auto;font-size:12px;border:1px solid #e2e8f0;">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
      } catch {
        content = escapeHtml(trimmed);
      }
    } else {
      content = escapeHtml(trimmed);
    }
  }
  return `<div class="component-section"><div class="component-section-title">${escapeHtml(label)}</div><p>${content}</p></div>`;
}

function renderList(label, value) {
  if (!Array.isArray(value) || value.length === 0) {
    return renderField(label, value);
  }
  const items = value.map((v) => {
    if (typeof v === "object") {
      return `<li><pre style="background:#f8fafc;padding:8px;border-radius:6px;overflow:auto;font-size:12px;border:1px solid #e2e8f0;margin:0;">${escapeHtml(JSON.stringify(v, null, 2))}</pre></li>`;
    }
    const trimmed = String(v).trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return `<li><pre style="background:#f8fafc;padding:8px;border-radius:6px;overflow:auto;font-size:12px;border:1px solid #e2e8f0;margin:0;">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre></li>`;
      } catch {
        return `<li>${escapeHtml(trimmed)}</li>`;
      }
    }
    return `<li>${escapeHtml(trimmed)}</li>`;
  }).join("");
  return `<div class="component-section"><div class="component-section-title">${escapeHtml(label)}</div><ul>${items}</ul></div>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeLLMOutput(text) {
  if (!text) return text;
  return text
    .replace(/<environment_details[^>]*>[\s\S]*?<\/environment_details>\s*/g, "")
    .replace(/<environment_details[^>]*>[\s\S]*/g, "")
    .trim();
}

function sanitizeResult(obj) {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return sanitizeLLMOutput(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeResult);
  }
  if (typeof obj === "object") {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      out[key] = sanitizeResult(value);
    }
    return out;
  }
  return obj;
}

function renderMarkdown(text) {
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const htmlLines = [];
  let inCodeBlock = false;
  let inList = false;
  let listType = "";

  const closeList = () => {
    if (inList) {
      htmlLines.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = "";
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlLines.push("</code></pre>");
        inCodeBlock = false;
      } else {
        closeList();
        htmlLines.push("<pre><code>");
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      htmlLines.push(escapeHtml(line.replace(/^ /, "")));
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      htmlLines.push("<br />");
      continue;
    }

    const listMatch = trimmed.match(/^(\*|\-|\d+\.)\s+(.*)$/);
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (!listMatch && headerMatch) {
      closeList();
      const level = headerMatch[1].length;
      htmlLines.push(`<h${level}>${formatInline(headerMatch[2])}</h${level}>`);
      continue;
    }
    if (listMatch) {
      const marker = listMatch[1];
      const content = formatInline(listMatch[2]);
      if (!inList || listType !== (marker.match(/^\d/) ? "ol" : "ul")) {
        closeList();
        listType = marker.match(/^\d/) ? "ol" : "ul";
        htmlLines.push(listType === "ol" ? "<ol>" : "<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${content}</li>`);
      continue;
    }

    closeList();
    htmlLines.push(`<p>${formatInline(trimmed)}</p>`);
  }

  closeList();
  return htmlLines.join("");
}

function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function clearChat() {
  chatMessages.innerHTML = "";
  chatHistory = [];
  appendWelcomeMessage();
}

function appendWelcomeMessage() {
  const welcome = document.createElement("div");
  welcome.className = "chat-message assistant";
  welcome.innerHTML = `<div class="chat-avatar">AA</div><div class="chat-bubble">${renderMarkdown("👋 Hello! I'm your **Architect Agent**. I can help you with:\n\n• **Design ideas** — concept, space planning, and layouts\n• **Construction guidance** — materials, costs, and regulations\n• **Project planning** — BOQ, timelines, and budgeting\n\nTry asking me anything, or pick a suggestion below!")}</div>`;
  chatMessages.appendChild(welcome);
}

function appendChatBubble(role, text) {
  if (chatEmpty) {
    chatEmpty.remove();
  }
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = role === "user" ? "You" : "AA";
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.innerHTML = role === "error" ? escapeHtml(text) : renderMarkdown(sanitizeLLMOutput(text));
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatLoading(isLoading) {
  setLoading(isLoading, true);
  if (isLoading) {
    const typing = document.createElement("div");
    typing.className = "chat-message assistant";
    typing.id = "typing-indicator";
    typing.innerHTML = `<div class="chat-avatar">AA</div><div class="chat-bubble typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function setUploadProgress(pct, text) {
  uploadProgress.style.display = pct >= 0 ? "block" : "none";
  uploadProgressFill.style.width = `${pct}%`;
  uploadProgressText.textContent = text || `${Math.round(pct)}%`;
}

function showUploadResult(message, type) {
  const el = document.getElementById("upload-result");
  if (!el) return;
  el.textContent = message;
  el.className = "upload-result " + (type || "");
  el.style.display = message ? "block" : "none";
}

async function uploadFileInChunks(file, opts = {}) {
  // chunk size in bytes (approx). Keep small enough to avoid server payload limits.
  const chunkSize = opts.chunkSize || 50 * 1024; // 50KB
  const total = Math.ceil(file.size / chunkSize);
  let sent = 0;
  setUploadProgress(0, `0 / ${total}`);
  for (let i = 0; i < total; i++) {
    const start = i * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const blob = file.slice(start, end);
    const text = await blob.text();
    const payload = { text, source: file.name, collection: opts.collection || "space_data", chunk_index: i, total_chunks: total };
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // attempt to read response body (may be partial)
      const json = await res.json().catch(() => ({}));
      sent = i + 1;
      setUploadProgress((sent / total) * 100, `${sent} / ${total}`);
      if (!res.ok) {
        throw new Error(json.error || `Chunk ${i} failed with status ${res.status}`);
      }
    } catch (err) {
      setUploadProgress((sent / total) * 100, `Failed at chunk ${i}: ${err.message}`);
      throw err;
    }
  }
  setUploadProgress(100, `Uploaded ${total}/${total}`);
  // let server finish processing briefly
  await new Promise((r) => setTimeout(r, 200));
}

function removeLastAssistantBubble() {
  const typing = document.getElementById("typing-indicator");
  if (typing) {
    typing.remove();
    return;
  }
  const messages = chatMessages.querySelectorAll(".chat-message.assistant");
  const last = messages[messages.length - 1];
  if (last && last.querySelector(".chat-bubble")?.textContent === "Thinking...") {
    last.remove();
  }
}

async function init() {
  try {
    setStatus("", "Initializing...");
    const res = await fetch("/api/init", { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to initialize agent");
    }
    initialized = true;
    setStatus("ready", "Ready");
    appendWelcomeMessage();
  } catch (error) {
    setStatus("", "Error");
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (currentMode !== "chat") {
      output.innerHTML = `
        <div class="error-message" style="padding: 20px; border-radius: 12px; background: #fef2f2; border: 1px solid #fecaca;">
          <div style="font-weight: 700; color: #991b1b; margin-bottom: 12px; font-size: 16px;">⚠️ Initialization Failed</div>
          <div style="color: #991b1b; line-height: 1.6; margin-bottom: 16px;">${escapeHtml(errorMessage)}</div>
          <div style="color: #991b1b; font-size: 13px; background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #fecaca;">
            <strong>Common fixes:</strong><br>
            1. Check that environment variables are set in your hosting dashboard<br>
            2. Verify your API key is valid and has available credits<br>
            3. Ensure the model name is correct for your provider<br>
            4. Check the service logs for detailed error messages
          </div>
        </div>
      `;
    } else {
      const welcome = document.createElement("div");
      welcome.className = "chat-message error";
      welcome.innerHTML = `
        <div class="chat-avatar">!</div>
        <div class="chat-bubble">
          <div style="font-weight: 700; margin-bottom: 8px;">⚠️ Initialization Failed</div>
          <div style="margin-bottom: 12px;">${escapeHtml(errorMessage)}</div>
          <div style="font-size: 12px; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #fecaca;">
            <strong>Common fixes:</strong><br>
            1. Check environment variables in hosting dashboard<br>
            2. Verify API key is valid with credits<br>
            3. Check model name is correct<br>
            4. Review service logs
          </div>
        </div>
      `;
      if (chatEmpty) chatEmpty.remove();
      chatMessages.appendChild(welcome);
    }
  }
}

async function runStandard() {
  if (!initialized) {
    showError("Agent not initialized yet. Please wait.");
    return;
  }
  const text = promptInput.value.trim();
  if (!text) {
    showError("Please enter a project description.");
    return;
  }
  setLoading(true);
  output.innerHTML = "";
  showLoadingSkeleton();
  try {
    let res;
    if (currentMode === "brief") {
      res = await fetch(`/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } else {
      res = await fetch(`/api/${currentMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    }
    const result = sanitizeResult(await res.json());
    if (!res.ok) {
      showError(result.error || "Request failed");
      return;
    }
    switch (currentMode) {
      case "brief": {
        output.innerHTML = "";
        output.innerHTML += renderProjectBrief(result.brief || result);
        output.innerHTML += `<div class="component-title">Concept</div>${renderConcept(result.concept)}`;
        output.innerHTML += `<div class="download-actions"><button class="btn btn-secondary" id="download-concept">Download Concept (Excel)</button></div>`;
        output.innerHTML += `<div class="component-title">Space Plan</div>${renderSpace(result.spacePlan)}`;
        output.innerHTML += `<div class="download-actions"><button class="btn btn-secondary" id="download-dxf-brief">Download DXF (ArchiCAD)</button></div>`;
        output.innerHTML += `<div class="component-title">BOQ</div>${renderBOQ(result.boq)}`;
        output.innerHTML += `<div class="download-actions"><button class="btn btn-secondary" id="download-boq">Download BOQ (Excel)</button></div>`;
        output.innerHTML += `<div class="component-title">Cost Estimate</div>${renderCost(result.cost)}`;
        setTimeout(() => {
          const dc = document.getElementById("download-concept");
          if (dc) dc.addEventListener("click", () => downloadExcel("/api/download/concept", { concept: result.concept }, "concept.xlsx"));
          const dxf = document.getElementById("download-dxf-brief");
          if (dxf) dxf.addEventListener("click", () => downloadExcel("/api/download/dxf", { spacePlan: result.spacePlan }, "floorplan.dxf"));
          const db = document.getElementById("download-boq");
          if (db) db.addEventListener("click", () => downloadExcel("/api/download/boq", { boq: result.boq }, "boq.xlsx"));
        }, 100);
        break;
      }
      case "concept":
        output.innerHTML = renderConcept(result);
        output.innerHTML += `<div class="download-actions"><button class="btn btn-secondary" id="download-concept">Download Concept (Excel)</button></div>`;
        setTimeout(() => {
          const dc = document.getElementById("download-concept");
          if (dc) dc.addEventListener("click", () => downloadExcel("/api/download/concept", { concept: result }, "concept.xlsx"));
        }, 100);
        break;
      case "space":
        output.innerHTML = renderSpace(result);
        output.innerHTML += `<div class="download-actions"><button class="btn btn-secondary" id="download-dxf">Download DXF (ArchiCAD)</button></div>`;
        setTimeout(() => {
          const dxf = document.getElementById("download-dxf");
          if (dxf) dxf.addEventListener("click", () => downloadExcel("/api/download/dxf", { spacePlan: result }, "floorplan.dxf"));
        }, 100);
        break;
      case "boq":
        output.innerHTML = renderBOQ(result);
        output.innerHTML += `<div class="download-actions"><button class="btn btn-secondary" id="download-boq">Download BOQ (Excel)</button></div>`;
        setTimeout(() => {
          const dxf = document.getElementById("download-dxf-brief");
          if (dxf) dxf.addEventListener("click", () => downloadExcel("/api/download/dxf", { spacePlan: result.spacePlan }, "floorplan.dxf"));
          const db = document.getElementById("download-boq");
          if (db) db.addEventListener("click", () => downloadExcel("/api/download/boq", { boq: result }, "boq.xlsx"));
        }, 100);
        break;
      case "cost":
        output.innerHTML = renderCost(result);
        break;
      case "suppliers":
        output.innerHTML = renderSuppliers(result);
        break;
      case "structure":
        output.innerHTML = renderStructure(result);
        break;
      case "workflow":
        output.innerHTML = renderWorkflow(result);
        break;
      default:
        output.innerHTML = renderJson(result, "Result");
    }
    scrollToOutput();
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

async function downloadExcel(endpoint, payload, filename) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(e.message || "Download failed");
  }
}

async function runChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  autoResizeChatInput();
  appendChatBubble("user", text);
  chatHistory.push({ role: "user", text });
  
  if (chatSuggestions) {
    chatSuggestions.classList.add("hidden");
  }
  
  setChatLoading(true);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, history: chatHistory.slice(0, -1) }),
    });
    const result = sanitizeResult(await res.json());
    removeLastAssistantBubble();
    if (!res.ok) {
      appendChatBubble("error", result.error || "Request failed");
      return;
    }
    const reply = result.text || JSON.stringify(result);
    appendChatBubble("assistant", reply);
    chatHistory.push({ role: "assistant", text: reply });
  } catch (error) {
    removeLastAssistantBubble();
    appendChatBubble("error", error.message);
  } finally {
    setChatLoading(false);
    chatInput.focus();
  }
}

function switchMode(mode) {
  if (currentMode === mode) return;
  currentMode = mode;
  modeTitle.textContent = modeTitles[mode] || mode;
  const path = mode === "chat" ? "/" : `/${mode}`;
  window.history.pushState({ mode }, "", path);
  
  const step = pipelineModes.indexOf(mode);
  if (step >= 0) {
    modeSubtitle.textContent = `Step ${step + 1} of 5 — ${modeDescriptions[mode]}`;
  } else {
    modeSubtitle.textContent = modeDescriptions[mode] || "";
  }

  document.querySelectorAll(".nav-step").forEach((el, idx) => {
    const isActive = pipelineModes[idx] === mode;
    el.classList.toggle("active", isActive);
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  document.querySelectorAll(".quick-access-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  if (mode === "chat") {
    standardView.classList.add("hidden");
    corpusView.classList.add("hidden");
    chatView.classList.remove("hidden");
    if (!initialized) {
      setStatus("", "Initializing...");
    }
    promptInput.value = "";
    output.innerHTML = '<div class="empty-state">Your results will appear here.</div>';
    if (chatSuggestions) {
      chatSuggestions.classList.remove("hidden");
    }
  } else if (mode === "corpus") {
    standardView.classList.add("hidden");
    chatView.classList.add("hidden");
    corpusView.classList.remove("hidden");
    promptInput.value = "";
    output.innerHTML = '<div class="empty-state">Your results will appear here.</div>';
  } else {
    chatView.classList.add("hidden");
    corpusView.classList.add("hidden");
    standardView.classList.remove("hidden");
    promptInput.placeholder = promptPlaceholders[mode] || promptPlaceholders.brief;
    promptInput.focus();
  }
}

function routeFromPath() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const mode = path || "chat";
  if (mode && modeTitles[mode]) {
    switchMode(mode);
  }
}

function autoResizeChatInput() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    if (mode) {
      window.history.pushState({ mode }, "", `/${mode}`);
      switchMode(mode);
    }
  });
});

runBtn.addEventListener("click", runStandard);
chatSendBtn.addEventListener("click", runChat);

if (chatSuggestions) {
  chatSuggestions.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt;
      if (prompt) {
        chatInput.value = prompt;
        runChat();
      }
    });
  });
}

if (tryExampleBtn) {
  tryExampleBtn.addEventListener("click", () => {
    promptInput.value = "I want to construct a 6-floor parking garage with 100 cars per floor, car ramps, and a car elevator.";
    promptInput.focus();
  });
}

uploadBtn.addEventListener("click", async () => {
  if (!pinVerified) {
    showUploadResult("Please enter the PIN first.", "error");
    return;
  }
  const f = fileInput.files && fileInput.files[0];
  if (!f) {
    showUploadResult("Please choose a file to upload (.txt/.md)", "error");
    return;
  }
  uploadBtn.disabled = true;
  fileInput.disabled = true;
  showUploadResult("Uploading...", "");
  try {
    await uploadFileInChunks(f, { chunkSize: 50 * 1024, collection: "space_data" });
    showUploadResult(`Upload complete: ${f.name}`, "success");
  } catch (e) {
    showUploadResult("Upload failed: " + (e.message || e), "error");
  } finally {
    uploadBtn.disabled = false;
    fileInput.disabled = false;
    setTimeout(() => setUploadProgress(-1), 1500);
  }
});

if (pinSubmitBtn && pinInput) {
  pinSubmitBtn.addEventListener("click", () => {
    const val = (pinInput.value || "").trim().toLowerCase();
    if (val === REQUIRED_PIN) {
      pinVerified = true;
      pinInput.classList.remove("pin-error");
      uploadBtn.classList.remove("upload-btn-disabled");
      showUploadResult("PIN verified. You can now upload files.", "success");
      pinInput.value = "";
    } else {
      pinVerified = false;
      showUploadResult("Incorrect PIN. Access denied.", "error");
    }
  });
}

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    runStandard();
  }
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    runChat();
  }
});

chatInput.addEventListener("input", autoResizeChatInput);

function openMobileMenu() {
  if (mobileMenuOverlay) {
    mobileMenuOverlay.classList.add("open");
  }
}

function closeMobileMenu() {
  if (mobileMenuOverlay) {
    mobileMenuOverlay.classList.remove("open");
  }
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener("click", openMobileMenu);
}

if (mobileMenuClose) {
  mobileMenuClose.addEventListener("click", closeMobileMenu);
}

if (mobileMenuOverlay) {
  mobileMenuOverlay.addEventListener("click", (e) => {
    if (e.target === mobileMenuOverlay) {
      closeMobileMenu();
    }
  });
}

document.querySelectorAll(".mobile-menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const mode = item.dataset.mode;
    if (mode) {
      window.history.pushState({ mode }, "", `/${mode}`);
      switchMode(mode);
    }
    closeMobileMenu();
  });
});

document.querySelectorAll(".quick-access-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    if (mode) {
      const path = mode === "chat" ? "/" : `/${mode}`;
      window.history.pushState({ mode }, "", path);
      switchMode(mode);
    }
  });
});

window.addEventListener("popstate", () => {
  routeFromPath();
});

routeFromPath();

init();
