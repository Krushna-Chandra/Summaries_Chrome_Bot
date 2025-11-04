// popup.js (updated) ---------------------------------------------------------

// --- Helpers / Globals ---
const LANG_DEFAULT = "en-US"; // fallback language for TTS & prompt usage

// A short mapping for human-readable names if you want to use elsewhere
const LANG_LABELS = {
  "auto": "Auto-detect",
  "en-US": "English (en-US)",
  "hi-IN": "हिन्दी / Hindi (hi-IN)",
  "or-IN": "Odia",
  "es-ES": "Español (es-ES)",
  "fr-FR": "Français (fr-FR)",
  "de-DE": "Deutsch (de-DE)",
  "pt-BR": "Português (pt-BR)",
  "zh-CN": "中文 / Chinese (zh-CN)",
  "ar-SA": "العربية / Arabic (ar-SA)",
  "ru-RU": "Русский / Russian (ru-RU)"
};

// Wait for DOM
window.addEventListener("DOMContentLoaded", () => {
  initVoiceSystem();
  restoreBackgroundOnLoad();
  attachEventListeners();
});

// --------------- Language + Voice selection ---------------
let availableVoices = [];
let chosenVoice = null;

function initVoiceSystem() {
  // Load voices
  function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices() || [];
  }
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

// pick a voice best matching the langCode (e.g. "hi-IN" or "hi")
function pickVoiceForLang(langCode) {
  if (!langCode || langCode === "auto") return null;
  // match exact or startsWith
  const exact = availableVoices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
  if (exact) return exact;
  const prefix = langCode.split("-")[0];
  return availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix.toLowerCase())) || null;
}

// --------------- Attach event listeners ---------------
function attachEventListeners() {
  // Original handlers (kept)
  document.getElementById("summarize").addEventListener("click", onSummarizeClick);
  document.getElementById("speak-btn").addEventListener("click", onSpeakClick);
  document.getElementById("copy-btn").addEventListener("click", onCopyClick);
  document.getElementById("history-btn").addEventListener("click", loadHistory);
  // existing auto-stop logic for speech
  ["options","summarize", "copy-btn", "share-btn", "summary-type","history-btn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        if (isSpeaking) stopSpeaking();
      });
    }
  });

  // share menu handlers (preserved)
  const shareBtn = document.getElementById("share-btn");
  const shareMenu = document.getElementById("share-menu");
  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    shareMenu.style.display = shareMenu.style.display === "block" ? "none" : "block";
  });
  document.addEventListener("click", () => {
    shareMenu.style.display = "none";
  });
  document.querySelectorAll(".share-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const platform = btn.dataset.platform;
      const resultText = document.getElementById("result")?.innerText?.trim() || "";
      const encodedText = encodeURIComponent(resultText);
      const shareUrl = encodeURIComponent(window.location.href); // optional
      if (!resultText) { alert("No result to share!"); return; }
      switch(platform) {
        case "whatsapp": window.open(`https://wa.me/?text=${encodedText}`, "_blank"); break;
        case "twitter": window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank"); break;
        case "facebook": window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${encodedText}`, "_blank"); break;
        case "linkedin": window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}&summary=${encodedText}`, "_blank"); break;
        case "copy": navigator.clipboard.writeText(resultText).then(()=>alert("Result copied to clipboard!")).catch(err=>alert("Copy failed: "+err)); break;
      }
      shareMenu.style.display = "none";
    });
  });

  // dropdown / download handlers (preserved)
  const dropdownBtn = document.getElementById("dropdownBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const angleIcon = document.getElementById("angleIcon");
  dropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
    if (dropdownMenu.classList.contains("show")) {
      angleIcon.classList.remove("fa-angle-down");
      angleIcon.classList.add("fa-angle-up");
    } else {
      angleIcon.classList.remove("fa-angle-up");
      angleIcon.classList.add("fa-angle-down");
    }
  });
  document.addEventListener("click", (event) => {
    if (!dropdownMenu.contains(event.target) && !dropdownBtn.contains(event.target)) {
      dropdownMenu.classList.remove("show");
      angleIcon.classList.remove("fa-angle-up");
      angleIcon.classList.add("fa-angle-down");
    }
  });

  const downloadPdfBtn = document.getElementById("downloadPdfBtn");

  if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", () => saveFile("PDF"));

}


function generateQRCode() {
  const qrContainer = document.getElementById("qrcodeContainer");
  qrContainer.innerHTML = ""; // Clear old QR if any

  const currentURL = window.location.href; // You can replace this with any link or text

  new QRCode(qrContainer, {
    text: currentURL,
    width: 150,
    height: 150,
    colorDark: "#000000",
    colorLight: "transparent", // transparent background for all themes
    correctLevel: QRCode.CorrectLevel.H
  });

  qrContainer.style.display = "block"; // make it visible
}

// Attach to your existing button

// --------------- Summarize (main) ---------------
async function onSummarizeClick() {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  const summaryType = document.getElementById("summary-type").value;
  const language = document.getElementById("language-select")?.value || "auto"; // user choice

  // Get API key
  chrome.storage.sync.get(["geminiApiKey"], async (result) => {
    if (!result.geminiApiKey) {
      resultDiv.innerHTML = "API key not found. Please set your API key in the extension options.";
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (res) => {
        if (!res || !res.text) {
          resultDiv.innerText = "Could not extract article text from this page.";
          return;
        }

        try {
  const summary = await getGeminiSummary(res.text, summaryType, result.geminiApiKey, language);
  resultDiv.innerText = summary;

  // ✅ Save to history
  saveSummaryToHistory(tab, summary, summaryType);
} catch (error) {
  resultDiv.innerText = `Error: ${error.message || "Failed to generate summary."}`;
}

      });
    });
  });
}

// --------------- Gemini call (with language instruction) ---------------
async function getGeminiSummary(text, summaryType, apiKey, language) {
  const maxLength = 20000;
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  let basePrompt;
  switch (summaryType) {
    case "brief":
      basePrompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
      break;
    case "detailed":
      basePrompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
      break;
    case "bullets":
      basePrompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- " (dash followed by a space). Do not use asterisks or other bullet symbols, only use the dash. Keep each point concise and focused on a single key insight from the article:\n\n${truncatedText}`;
      break;
    default:
      basePrompt = `Summarize the following article:\n\n${truncatedText}`;
      break;
  }
  

  // Language instruction: if "auto", we ask the model to keep same language as source.
  let languageInstruction = "";
  if (!language || language === "auto") {
    languageInstruction = `\n\nPlease respond in the same language as the article (do not translate).`;
  } else {
    // language has a BCP-47 code like "hi-IN" or "en-US". We'll give a plain-language name if possible.
    const langLabel = LANG_LABELS[language] || language;
    languageInstruction = `\n\nPlease respond in ${langLabel}.`;
  }

  const prompt = basePrompt + languageInstruction;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        })
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary available.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}

// --------------- Save Summary to History ---------------
async function saveSummaryToHistory(tab, summary, type) {
  const entry = {
    url: tab.url,
    title: tab.title,
    summary: summary,
    type: type,
    timestamp: new Date().toISOString()
  };

  chrome.storage.local.get(["summaryHistory"], (data) => {
    const history = data.summaryHistory || [];
    history.unshift(entry);
    if (history.length > 20) history.pop();
    chrome.storage.local.set({ summaryHistory: history });
  });
}


// --------------- Load History ---------------
let showingHistory = false; // 👈 track if history is being shown
let lastSummaryContent = ""; // 👈 keep the last summary text
function loadHistory() {
  const resultDiv = document.getElementById("result");

  if (showingHistory) {
    // 👈 Already showing history → restore last summary or default message
    resultDiv.innerHTML =
      lastSummaryContent ||
      "Select a summary type and click ' 👆🏻 Summarize This Page' to generate a summary.";
    showingHistory = false;
    return;
  }

  // 👇 Save current content before overwriting with history
  lastSummaryContent = resultDiv.innerHTML;

  chrome.storage.local.get(["summaryHistory"], (data) => {
    const history = data.summaryHistory || [];
    if (history.length === 0) {
      resultDiv.innerHTML = "<p><i>No saved summaries yet.</i></p>";
    } else {
      resultDiv.innerHTML = `
        <button id="clear-history-btn" style="
          background:#b33a3a;
          color:white;
          padding:6px 10px;
          border:none;
          border-radius:6px;
          font-size:12px;
          margin-bottom:10px;
          cursor:pointer;
        ">🗑️ Clear History</button>
        ${history.map(item => `
          <div class="history-item" style="margin-bottom:10px; padding:10px; background:#2a2a2a; border-radius:8px; border:1px solid #444;">
            <b style="color:#ffd700;">${item.title || "Untitled"}</b><br>
            <small style="color:#bbb;">${new Date(item.timestamp).toLocaleString()}</small>
            <div style="white-space:pre-wrap;margin-top:6px;">
              ${item.summary}
            </div>
            <a href="${item.url}" target="_blank" style="color:#4da6ff; font-size:12px;">🔗 Open Page</a>
          </div>
        `).join("")}
      `;

      // ✅ Attach listener to clear button
      document.getElementById("clear-history-btn").addEventListener("click", () => {
        chrome.storage.local.remove("summaryHistory", () => {
          // Show cleared message
          resultDiv.innerHTML = "<p><i>History cleared.</i></p>";

          // 🚨 Reset lastSummaryContent to startup message
          lastSummaryContent =
            "Select a summary type and click ' 👆🏻 Summarize This Page' to generate a summary.";
        });
      });
    }

    showingHistory = true; // 👈 now in history mode
  });
}


// --------------- Copy ---------------
function onCopyClick() {
  const summaryText = document.getElementById("result").innerText;
  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard.writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copied!";
        setTimeout(() => { copyBtn.innerText = originalText; }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
}


// --------------- Text-to-Speech ---------------
let isSpeaking = false;
let currentUtterance = null;

function stopSpeaking() {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  const voiceBtn = document.getElementById("speak-btn");
  if (voiceBtn) {
    voiceBtn.innerHTML = '<i class="fa-solid fa-volume-high" style="color: black;"></i> Speaker';
  }
}

// 🔊 Helper: Chunked speech for Hindi (and long text)
function speakText(text, lang = "hi-IN") {
  if (!("speechSynthesis" in window)) {
    alert("Sorry, your browser does not support Text-to-Speech.");
    return;
  }

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();

  // Pick a Hindi-supported voice (fallback to default if not found)
  let voice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith("hi")) || voices[0];

  // Break text into smaller chunks for Hindi (avoid silent failure on long text)
  const chunkSize = 250;
  const chunks = text.match(new RegExp('.{1,' + chunkSize + '}(\\s|$)', 'g'));

  chunks.forEach(chunk => {
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.voice = voice;
    utter.lang = lang;
    synth.speak(utter);
  });
}

async function onSpeakClick() {
  const voiceBtn = document.getElementById("speak-btn");
  const summaryText = document.getElementById("result").innerText;
  if (!summaryText || summaryText.trim() === "") return;

  const selectedLang = document.getElementById("language-select")?.value || "auto";
  const langCode = (selectedLang === "auto") ? detectLanguageCodeFromText(summaryText) || LANG_DEFAULT : selectedLang;
  const summaryType = document.getElementById("summary-type").value;

  if (!isSpeaking) {
    stopSpeaking(); // reset before speaking

    // ✅ Special case: Hindi + detailed summary → chunked speak
    if (summaryType === "detailed" && langCode === "hi-IN") {
      speakText(summaryText, "hi-IN");
      isSpeaking = true;
      voiceBtn.innerHTML = '<i class="fa-solid fa-stop" style="color: black;"></i> Stop';
      return;
    }

    // ✅ Normal TTS for all other cases
    currentUtterance = new SpeechSynthesisUtterance(summaryText);
    currentUtterance.lang = langCode;

    // pick a voice if available that matches the selected language (or detected)
    const v = pickVoiceForLang(langCode);
    if (v) {
      currentUtterance.voice = v;
      chosenVoice = v;
    }

    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    currentUtterance.onend = () => stopSpeaking();

    window.speechSynthesis.speak(currentUtterance);
    isSpeaking = true;
    voiceBtn.innerHTML = '<i class="fa-solid fa-stop" style="color: black;"></i> Stop';
  } else {
    stopSpeaking();
  }
}

// VERY simple language detection fallback (not perfect) — just checks for Devanagari letters for Hindi
function detectLanguageCodeFromText(text) {
  if (!text || text.length < 10) return null;
  // Quick heuristics:
  if (/[ॐअ-ह]/.test(text)) return "hi-IN";            // Devanagari -> Hindi/Nepali (we choose hi-IN)
  if (/[а-яА-ЯЁё]/.test(text)) return "ru-RU";       // Cyrillic
  if (/[一-龥]/.test(text)) return "zh-CN";          // CJK Han
  if (/[¿¡]/.test(text)) return "es-ES";             // Spanish punctuation hint
  // default: English
  return "en-US";
}

// --------------- PDF / save (kept the same) ---------------
async function saveFile(type) {
  const resultDiv = document.getElementById("result");
  if (!resultDiv || !resultDiv.innerText.trim()) {
    alert("No content to save!");
    return;
  }
  if (type === "PDF") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("AI Summary", 10, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const textLines = doc.splitTextToSize(resultDiv.innerText, 180);
    doc.text(textLines, 10, 30);
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    chrome.runtime.sendMessage({ action: "downloadPDF", url: pdfUrl }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Message error:", chrome.runtime.lastError.message);
        return;
      }
      if (response?.status === "ok") {
        console.log("Download started");
      } else {
        console.error("Download failed", response);
      }
    });
  }
}

const copyLinkBtn = document.getElementById("copyLinkBtn");

if (copyLinkBtn) {
  copyLinkBtn.addEventListener("click", generateAndDownloadQR);
}

async function generateAndDownloadQR() {
  const resultDiv = document.getElementById("result");

  // ✅ Validate input
  if (!resultDiv || !resultDiv.innerText.trim()) {
    alert("No result found to generate QR!");
    return;
  }

  let textToEncode = resultDiv.innerText.trim();

  // ✅ Limit text length to prevent overflow
  const maxLength = 600; // safe limit for most QR levels
  if (textToEncode.length > maxLength) {
    console.warn(`QR text too long (${textToEncode.length}). Trimming...`);
    textToEncode = textToEncode.slice(0, maxLength) + "...";
  }

  // 🧱 Create a hidden temporary container
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "fixed";
  tempDiv.style.top = "-9999px";
  document.body.appendChild(tempDiv);

  try {
    // 🌀 Generate QR
    new QRCode(tempDiv, {
      text: textToEncode,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff", // solid white for better contrast
      correctLevel: QRCode.CorrectLevel.L, // lower correction = higher capacity
    });
  } catch (err) {
    console.error("QR generation failed:", err);
    alert("Failed to generate QR code. Try shortening the text.");
    tempDiv.remove();
    return;
  }

  // Wait for QR to finish rendering
  await new Promise((res) => setTimeout(res, 500));

  const canvas = tempDiv.querySelector("canvas");
  if (!canvas) {
    console.error("❌ QR canvas not found!");
    tempDiv.remove();
    return;
  }

  // 🎨 Convert QR to blob
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    console.error("Failed to create QR Blob");
    tempDiv.remove();
    return;
  }

  const qrUrl = URL.createObjectURL(blob);

  // 🧾 Ask background script to auto-download
  chrome.runtime.sendMessage(
    { action: "downloadQR", url: qrUrl, filename: "ResultQRCode.png" },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("⚠️ Message error:", chrome.runtime.lastError.message);
      } else if (response?.status === "ok") {
        console.log("✅ QR code downloaded automatically!");
      } else {
        console.error("❌ QR download failed:", response);
      }

      // 🧹 Cleanup
      URL.revokeObjectURL(qrUrl);
      tempDiv.remove();
    }
  );
}


// --------------- Background + restore stuff (kept) ---------------
document.getElementById("close-btn").onclick = () => { window.close(); };
document.getElementById("back-btn").addEventListener("click", () => {
  window.history.back();
});

let currentBackground = "";
const checkbox = document.getElementById("checkbox");
const notchIcon = document.getElementById("notch");
const checkIcon = document.getElementById("check");
const checkButton = document.getElementById("check");

function applyBackground(bg, height) {
  document.body.style.background = bg;
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.height = '350px';
  document.body.style.minHeight = '350px';
  if (notchIcon) notchIcon.style.display = "block";
  if (checkIcon) checkIcon.style.opacity = "0";
}

const whiteblack = document.getElementById("white-black");
if (whiteblack) whiteblack.onclick = () => { currentBackground = 'linear-gradient(-11deg, #1c1c1cf2 37%, #2c2c2eed 76%)'; applyBackground(currentBackground,'350px'); };
const blackblue = document.getElementById("black-blue");
if (blackblue) blackblue.onclick = () => { currentBackground = 'linear-gradient(90deg, rgba(2, 0, 36, 1) 0%, rgba(9, 9, 121, 1) 35%, rgba(0, 212, 255, 1) 100%)'; applyBackground(currentBackground,'350px'); };
const redpink = document.getElementById("red-pink");
if (redpink) redpink.onclick = () => { currentBackground = 'linear-gradient(90deg, rgba(131, 58, 180, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%)'; applyBackground(currentBackground,'350px'); };
const blackred = document.getElementById("black-red");
if (blackred) blackred.onclick = () => { currentBackground = 'linear-gradient(-11deg, #9a0f0ff2 40%, #121213ed 62%)'; applyBackground(currentBackground,'350px'); };
const yellowgreen = document.getElementById("yellow-green");
if (yellowgreen) yellowgreen.onclick = () => { currentBackground = 'linear-gradient(to left, rgb(16, 193, 16), rgb(214, 228, 5))'; applyBackground(currentBackground,'350px'); };

if (checkButton) {
  checkButton.onclick = (e) => {
    e.preventDefault();
    if (currentBackground) {
      localStorage.setItem('customBackground', currentBackground);
      if (notchIcon) notchIcon.style.display = "none";
      if (checkIcon) checkIcon.style.opacity = "1";
    }
  };
}

function restoreBackgroundOnLoad() {
  const savedBg = localStorage.getItem('customBackground');
  if (savedBg) {
    currentBackground = savedBg;
    applyBackground(savedBg, '350px');
  }
}

if (checkbox) {
  checkbox.addEventListener("click", () => {
    if (notchIcon) notchIcon.style.display = "none";
    if (checkIcon) checkIcon.style.opacity = "1";
  });
}

// updates popup
document.getElementById("updates-btn").addEventListener("click", () => {
  chrome.windows.create({ url: "updates.html", type: "popup", width: 420, height: 320 });
});

// dropdown buttons & other console-preserved code remain intact
// ---------------- Font Size Controls ----------------
let currentFontSize;

function applyFontSize() {
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.style.fontSize = currentFontSize + "px";

    // Also apply to all child elements (history items, etc.)
    resultDiv.querySelectorAll("*").forEach(el => {
      el.style.fontSize = currentFontSize + "px";
    });
  }
}

// Grab the initial computed font size of #result when popup loads
window.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    const computedSize = window.getComputedStyle(resultDiv).fontSize;
    currentFontSize = parseInt(computedSize, 10); // set as baseline
  }

  // Attach increase/decrease listeners here
  const incBtn = document.getElementById("increase-font");
  const decBtn = document.getElementById("decrease-font");

  if (incBtn) {
    incBtn.addEventListener("click", () => {
      currentFontSize += 2;
      applyFontSize();
    });
  }

  if (decBtn) {
    decBtn.addEventListener("click", () => {
      if (currentFontSize > 8) {
        currentFontSize -= 2;
        applyFontSize();
      }
    });
  }
});
// ------------------------------------------------------------------------

// ---------------- Voice Assistant ----------------

function speakFeedback(message, lang = "en-US") {
const utter = new SpeechSynthesisUtterance(message);
utter.lang = lang;
window.speechSynthesis.speak(utter);
}
let recognition;
let listening = false;

function initVoiceAssistant() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("❌ Speech Recognition is not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    listening = true;
    document.getElementById("voice-btn").innerHTML = "🎤 Listening...";
  };

  recognition.onend = () => {
    listening = false;
    document.getElementById("voice-btn").innerHTML =
      '<i class="fa-solid fa-microphone" style="color:black;"></i> Voice';
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      alert("⚠️ Microphone access is blocked. Please allow mic access:\n\n1. Go to Chrome Settings → Privacy and security → Site Settings.\n2. Find your extension under 'View permissions and data stored'.\n3. Enable Microphone.");
    } else {
      alert("Speech recognition error: " + event.error);
    }
  };

  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript.toLowerCase().trim();
    console.log("🎤 Heard:", command);

    // --- Summarize ---
    if (
      command.includes("summarize") || command.includes("summarise") ||
      command.includes("summary") || command.includes("shorten") ||
      command.includes("make summary") || command.includes("create summary")
    ) {
      document.getElementById("summarize")?.click();
      setTimeout(() => speakFeedback("Summary generated."), 1200);

    // --- Copy Summary ---
    } else if (
      command.includes("copy") || command.includes("clipboard") ||
      command.includes("duplicate") || command.includes("save text")
    ) {
      document.getElementById("copy-btn")?.click();
      setTimeout(() => speakFeedback("Summary copied to clipboard."), 500);

    // --- Copy Link / Share Link ---
    } else if (
      command.includes("copy link") || command.includes("share link") ||
      command.includes("link") || command.includes("copy url")
    ) {
      document.querySelector('[data-platform="copy"]')?.click();
      setTimeout(() => speakFeedback("Link copied to clipboard."), 500);

    // --- History ---
    } else if (
      command.includes("history") || command.includes("previous") ||
      command.includes("old") || command.includes("past") ||
      command.includes("last")
    ) {
      document.getElementById("history-btn")?.click();
      setTimeout(() => speakFeedback("Here is your history."), 500);

    // --- Speak / Read ---
    } else if (
      command.includes("speak") || command.includes("read") ||
      command.includes("say") || command.includes("narrate") ||
      command.includes("voice") || command.includes("read aloud")
    ) {
      document.getElementById("speak-btn")?.click();
      setTimeout(() => speakFeedback("Reading summary aloud."), 500);

    // --- Stop / Pause ---
    } else if (
      command.includes("stop") || command.includes("pause") ||
      command.includes("quiet") || command.includes("silence") ||
      command.includes("end reading")
    ) {
      document.getElementById("speak-btn")?.click();
      setTimeout(() => speakFeedback("Stopped reading."), 500);

    // --- Share Menu ---
    } else if (
      command.includes("share") || command.includes("send") ||
      command.includes("forward") || command.includes("post") ||
      command.includes("broadcast")
    ) {
      document.getElementById("share-btn")?.click();
      setTimeout(() => speakFeedback("Share menu opened."), 500);

    // --- Download PDF ---
    } else if (
      command.includes("download") || command.includes("pdf") ||
      command.includes("save file") || command.includes("export")
    ) {
      document.getElementById("downloadPdfBtn")?.click();
      setTimeout(() => speakFeedback("PDF downloaded successfully."), 1200);

    // --- Increase Font ---
    } else if (
      command.includes("increase") || command.includes("bigger") ||
      command.includes("zoom in") || command.includes("enlarge") ||
      command.includes("grow text") || command.includes("make large")
    ) {
      document.getElementById("increase-font")?.click();
      setTimeout(() => speakFeedback("Text size increased."), 500);

    // --- Decrease Font ---
    } else if (
      command.includes("decrease") || command.includes("smaller") ||
      command.includes("zoom out") || command.includes("shrink") ||
      command.includes("reduce text") || command.includes("make small")
    ) {
      document.getElementById("decrease-font")?.click();
      setTimeout(() => speakFeedback("Text size decreased."), 500);

    // --- Change Language ---
    } else if (command.includes("language")) {
      const langSelect = document.getElementById("language-select");
      if (langSelect) {
        langSelect.click();
        setTimeout(() => speakFeedback("Language menu opened. Please select a language."), 500);
      }

    // --- Change Summary Type ---
    } else if (command.includes("brief")) {
      document.getElementById("summary-type").value = "brief";
      document.getElementById("summary-type").dispatchEvent(new Event("change"));
      setTimeout(() => speakFeedback("Summary type set to brief."), 500);

    } else if (command.includes("detailed") || command.includes("long")) {
      document.getElementById("summary-type").value = "detailed";
      document.getElementById("summary-type").dispatchEvent(new Event("change"));
      setTimeout(() => speakFeedback("Summary type set to detailed."), 500);

    } else if (command.includes("bullet") || command.includes("points")) {
      document.getElementById("summary-type").value = "bullets";
      document.getElementById("summary-type").dispatchEvent(new Event("change"));
      setTimeout(() => speakFeedback("Summary type set to bullet points."), 500);
      // ✅ ADDED: Command to go back to the previous page
    } else if (command.includes("back") || command.includes("go back") || command.includes("previous")) {
      speakFeedback("Going back.");
      // We add a small delay so the user can hear the feedback before the page changes
      setTimeout(() => {
        document.getElementById("back-btn")?.click();
        try{ window.history.back(); }catch(e){/*ignore*/}
      }, 600);

    // ✅ ADDED: Command to close the extension window
    } else if (command.includes("close") || command.includes("exit")) {
      speakFeedback("Closing.");
      // Delay allows the feedback to be heard before the window disappears
      setTimeout(() => {
        document.getElementById("close-btn")?.click();
      }, 500);

      
    // --- Unknown ---
    } else {
      speakFeedback("Sorry, I didn’t understand that command.");
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initVoiceAssistant();
  const voiceBtn = document.getElementById("voice-btn");
  if (voiceBtn && recognition) {
    voiceBtn.addEventListener("click", () => {
      if (listening) {
        recognition.stop();
      } else {
        try {
          recognition.start(); // will trigger mic prompt if not granted yet
        } catch (err) {
          console.error("Failed to start recognition:", err);
          alert("⚠️ Could not start voice recognition. Please check microphone settings.");
        }
      }
    });
  }
  document.body.classList.add('page-loaded'); 
});


// ------------------------------------------------------------------------

// ------------------------------------------------------------------------

const toggleBtn = document.getElementById('toggleBtn');
const panel = document.getElementById('sidePanel');
let open = false;


// Hover to show temporarily
toggleBtn.addEventListener('mouseenter', () => {
  panel.classList.add('active');
});

panel.addEventListener('mouseenter', () => {
  panel.classList.add('active');
});

panel.addEventListener('mouseleave', () => {
  if (!open) panel.classList.remove('active');
});

toggleBtn.addEventListener('mouseleave', () => {
  if (!open) panel.classList.remove('active');
});



