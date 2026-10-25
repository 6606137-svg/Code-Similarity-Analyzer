const form = document.getElementById("compareForm");
const fileInputs = [
    document.getElementById("file1"),
    document.getElementById("file2")
];

const compareBtn = document.getElementById("compareBtn");
const statusMessage = document.getElementById("statusMessage");
const selectedCount = document.getElementById("selectedCount");
const analysisStatus = document.getElementById("analysisStatus");
const statusDetail = document.getElementById("statusDetail");

const API_URL = "http://127.0.0.1:5000/api/compare";
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB preview limit

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function getLanguage(filename) {
    const extension = filename.split(".").pop().toLowerCase();

    const languages = {
        py: "Python",
        java: "Java",
        c: "C",
        cpp: "C++",
        h: "C/C++ Header",
        hpp: "C++ Header",
        js: "JavaScript",
        ts: "TypeScript",
        txt: "Plain text",
        go: "Go",
        php: "PHP",
        rb: "Ruby",
        cs: "C#",
        html: "HTML",
        css: "CSS"
    };

    return languages[extension] || "Source code";
}

function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

function updateSelectedCount() {
    const count = fileInputs.filter(
        input => input.files && input.files.length > 0
    ).length;

    selectedCount.textContent = count + " / 2";
}

function showError(message) {
    analysisStatus.textContent = "Error";
    statusDetail.textContent = "Analysis unsuccessful";
    setStatus(message, "error");
}

async function previewFile(input, index) {
    const file = input.files[0];
    const number = index + 1;

    const nameElement = document.getElementById(
        `file${number}Name`
    );
    const sizeElement = document.getElementById(
        `file${number}Size`
    );
    const languageElement = document.getElementById(
        `file${number}Language`
    );
    const previewElement = document.getElementById(
        `preview${number}`
    );

    if (!file) {
        nameElement.textContent = "No file selected";
        sizeElement.textContent = "--";
        languageElement.textContent = "Plain text";
        previewElement.textContent =
            "Select a file to preview its source code.";
        updateSelectedCount();
        return;
    }

    nameElement.textContent = file.name;
    sizeElement.textContent = formatSize(file.size);
    languageElement.textContent = getLanguage(file.name);

    updateSelectedCount();

    if (file.size === 0) {
        previewElement.textContent = "The selected file is empty.";
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        previewElement.textContent =
            "File exceeds the 1 MB preview limit. " +
            "The original file can still be submitted for analysis.";
        return;
    }

    try {
        const content = await file.text();

        // textContent displays source code as text, not executable HTML.
        previewElement.textContent = content;
    } catch {
        previewElement.textContent =
            "Unable to read the selected file.";
    }
}

fileInputs.forEach((input, index) => {
    input.addEventListener("change", async () => {
        await previewFile(input, index);

        document.getElementById("resultContent").hidden = true;
        document.getElementById("emptyResults").hidden = false;
        document.getElementById("latestSimilarity").textContent = "--";

        analysisStatus.textContent = "Ready";
        statusDetail.textContent = "Run a new comparison";
        setStatus("Files updated. Analyze to get a new result.");
    });
});

form.addEventListener("submit", async event => {
    event.preventDefault();

    const firstFile = fileInputs[0].files[0];
    const secondFile = fileInputs[1].files[0];

    if (!firstFile || !secondFile) {
        setStatus("Please select both source code files.", "error");
        return;
    }

    if (firstFile.size === 0 || secondFile.size === 0) {
        setStatus("Empty files cannot be analyzed.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file1", firstFile);
    formData.append("file2", secondFile);

    compareBtn.disabled = true;
    compareBtn.textContent = "Analyzing...";
    analysisStatus.textContent = "Running";
    statusDetail.textContent = "Waiting for backend";
    setStatus("Sending files to the Flask backend...");

    document.getElementById("resultContent").hidden = true;
    document.getElementById("emptyResults").hidden = false;
    document.getElementById("latestSimilarity").textContent = "--";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            throw new Error(
                "Backend did not return JSON. Check the API route."
            );
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                `Backend returned HTTP ${response.status}.`
            );
        }

        // This frontend expects a numeric "similarity" field.
        // Match this field to the actual response from app.py.
        const similarity = Number(data.similarity);

        if (
            data.similarity === undefined ||
            data.similarity === null ||
            data.similarity === "" ||
            !Number.isFinite(similarity) ||
            similarity < 0 ||
            similarity > 100
        ) {
            throw new Error(
                "The backend response has no valid similarity score. " +
                "Check the JSON returned by app.py."
            );
        }

        document.getElementById("resultPercentage").textContent =
            similarity.toFixed(2) + "%";

        document.getElementById("latestSimilarity").textContent =
            similarity.toFixed(2) + "%";

        document.getElementById("resultMessage").textContent =
            typeof data.message === "string"
                ? data.message
                : "Backend comparison completed.";

        document.getElementById("resultBar").style.width =
            similarity + "%";

        // Show optional backend details without executing returned content.
        const extraFields = Object.keys(data).filter(
            key => !["similarity", "message"].includes(key)
        );

        const extraResults = document.getElementById("extraResults");
        const extraResultsText =
            document.getElementById("extraResultsText");

        if (extraFields.length > 0) {
            const details = {};

            extraFields.forEach(key => {
                details[key] = data[key];
            });

            extraResultsText.textContent =
                JSON.stringify(details, null, 2);

            extraResults.hidden = false;
        } else {
            extraResults.hidden = true;
            extraResultsText.textContent = "";
        }

        document.getElementById("emptyResults").hidden = true;
        document.getElementById("resultContent").hidden = false;

        analysisStatus.textContent = "Completed";
        statusDetail.textContent = "Backend result received";
        setStatus("Analysis completed successfully.", "success");

        document.getElementById("results").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        showError(error.message);
    } finally {
        compareBtn.disabled = false;
        compareBtn.innerHTML = "<span>⇄</span> Analyze Similarity";
    }
});

updateSelectedCount();