
const form = document.getElementById("analysisForm");
const sourceCode = document.getElementById("sourceCode");
const language = document.getElementById("language");
const codeFile = document.getElementById("codeFile");

let history = [];
let latestReport = null;

// Illustrative reference code for the frontend demo.
// Replace this with backend comparison against submitted projects.
const sampleCode = `
public class Main {
  public static void main(String[] args) {
    int a = 10;
    int b = 20;
    int sum = a + b;
    System.out.println(sum);
  }
}
`;

sourceCode.addEventListener("input", () => {
  document.getElementById("charCount").textContent =
    sourceCode.value.length + " characters";
});

codeFile.addEventListener("change", async () => {
  const file = codeFile.files[0];
  if (!file) return;

  try {
    sourceCode.value = await file.text();
    sourceCode.dispatchEvent(new Event("input"));
    document.getElementById("analysisName").value =
      file.name.replace(/\.[^.]+$/, "");
  } catch {
    alert("Unable to read this file.");
  }
});

document.getElementById("clearBtn").addEventListener("click", () => {
  sourceCode.value = "";
  sourceCode.dispatchEvent(new Event("input"));
  codeFile.value = "";
});

function tokenize(code) {
  // Demo tokenization: removes comments and whitespace, then
  // compares identifier, number and operator tokens.
  const cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/#.*$/gm, " ");

  return cleaned.match(
    /[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|=>|[^\s]/g
  ) || [];
}

function similarityScore(first, second) {
  const a = new Set(tokenize(first));
  const b = new Set(tokenize(second));

  if (a.size === 0 || b.size === 0) return 0;

  let common = 0;
  for (const token of a) {
    if (b.has(token)) common++;
  }

  return Math.round(100 * common / (a.size + b.size - common));
}

function getStatus(score) {
  if (score >= 70) return "High similarity";
  if (score >= 40) return "Medium similarity";
  return "Low similarity";
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const code = sourceCode.value.trim();

  if (!code) {
    alert("Please paste or upload your source code first.");
    sourceCode.focus();
    return;
  }

  const name =
    document.getElementById("analysisName").value.trim() ||
    "Untitled Analysis";

  // Frontend demonstration only; this does not query a real database.
  const score = similarityScore(code, sampleCode);
  const status = getStatus(score);

  latestReport = {
    name,
    language: language.value,
    score,
    status,
    date: new Date().toLocaleString(),
    code
  };

  history.unshift(latestReport);

  document.getElementById("emptyState").hidden = true;
  document.getElementById("resultContent").hidden = false;
  document.getElementById("scoreText").textContent = score + "%";
  document.getElementById("scoreBar").style.width = score + "%";
  document.getElementById("resultBadge").textContent = status;

  document.getElementById("resultDescription").textContent =
    `The submitted code has an estimated ${score}% token similarity ` +
    `to the built-in reference sample. This is a demonstration result, ` +
    `not a plagiarism verdict.`;

  document.getElementById("codePreview").textContent =
    code.slice(0, 5000) + (code.length > 5000 ? "\n...preview truncated" : "");

  updateDashboard();
  renderHistory();

  document.getElementById("results").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

function updateDashboard() {
  document.getElementById("totalAnalyses").textContent = history.length;

  document.getElementById("highCount").textContent =
    history.filter(item => item.score >= 70).length;

  const average = history.length
    ? Math.round(history.reduce((sum, item) => sum + item.score, 0)
        / history.length)
    : 0;

  document.getElementById("averageScore").textContent = average + "%";
}

function renderHistory() {
  const tbody = document.getElementById("historyBody");

  if (history.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-cell">No analyses recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = history.map(item => `
    <tr>
      <td>${escapeHTML(item.name)}</td>
      <td>${escapeHTML(item.language)}</td>
      <td><strong>${item.score}%</strong></td>
      <td>${escapeHTML(item.date)}</td>
      <td>${escapeHTML(item.status)}</td>
    </tr>
  `).join("");
}

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  if (!history.length) return;

  if (confirm("Clear all analysis history for this session?")) {
    history = [];
    updateDashboard();
    renderHistory();
  }
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  if (!latestReport) return;

  const report = [
    "CODEGUARD AI - DEMO SIMILARITY REPORT",
    "=====================================",
    `Name: ${latestReport.name}`,
    `Language: ${latestReport.language}`,
    `Similarity: ${latestReport.score}%`,
    `Status: ${latestReport.status}`,
    `Date: ${latestReport.date}`,
    "",
    "Submitted Code:",
    latestReport.code,
    "",
    "Note: This is a frontend demo score, not proof of plagiarism."
  ].join("\n");

  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "similarity-report.txt";
  link.click();

  URL.revokeObjectURL(url);
});