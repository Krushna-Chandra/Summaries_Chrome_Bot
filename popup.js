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
document.addEventListener("DOMContentLoaded", () => {
  if (typeof initVoiceSystem === "function") initVoiceSystem();
  if (typeof restoreBackgroundOnLoad === "function") restoreBackgroundOnLoad();
  if (typeof attachEventListeners === "function") attachEventListeners();
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
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", () => saveFile("PDF"));
  if (copyLinkBtn) copyLinkBtn.addEventListener("click", copyLink);
}

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
// Enhanced star generation with different sizes and animations
const starsContainer = document.getElementById('stars');

// Create variety of stars
function createStars() {
  const starCount = 80; // More stars for richer effect
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    
    // Random star types
    const random = Math.random();
    if (random < 0.5) {
      star.className = 'star small';
    } else if (random < 0.8) {
      star.className = 'star medium';
    } else {
      star.className = 'star large';
    }
    
    // Add pulse effect to some stars
    if (Math.random() > 0.7) {
      star.classList.add('pulse');
    }
    
    // Random position
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    
    // Random animation delay for organic feel
    star.style.animationDelay = Math.random() * 5 + 's';
    
    // Random colors for some stars (purple/blue tints)
    if (Math.random() > 0.85) {
      const colors = [
        'rgba(147, 112, 219, 0.9)', // Purple
        'rgba(135, 206, 250, 0.9)', // Light blue
        'rgba(255, 192, 203, 0.9)'  // Pink
      ];
      star.style.background = colors[Math.floor(Math.random() * colors.length)];
    }
    
    starsContainer.appendChild(star);
  }
}

// Create shooting stars effect
function createShootingStar() {
  const shootingStar = document.createElement('div');
  shootingStar.style.position = 'absolute';
  shootingStar.style.width = '100px';
  shootingStar.style.height = '2px';
  shootingStar.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)';
  shootingStar.style.top = Math.random() * 50 + '%';
  shootingStar.style.left = '-100px';
  shootingStar.style.transform = 'rotate(-45deg)';
  shootingStar.style.boxShadow = '0 0 10px rgba(255,255,255,0.8)';
  shootingStar.style.pointerEvents = 'none';
  shootingStar.style.zIndex = '1';
  
  starsContainer.appendChild(shootingStar);
  
  // Animate across screen
  let pos = -100;
  const animation = setInterval(() => {
    pos += 8;
    shootingStar.style.left = pos + 'px';
    
    if (pos > 500) {
      clearInterval(animation);
      shootingStar.remove();
    }
  }, 16);
}

// Initialize stars
createStars();

// Random shooting stars
setInterval(() => {
  if (Math.random() > 0.7) {
    createShootingStar();
  }
}, 3000);
// add new pages
  document.getElementById("articleBtn").onclick = function() {
    window.location.href = "aiarticlesum.html";
  };

  document.getElementById("videoBtn").onclick = function() {
    window.location.href = "aivideosum.html";
  };

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

function copyLink() {
  const dummyLink = "https://example.com/share";
  navigator.clipboard.writeText(dummyLink).then(() => alert("Link copied!")).catch((err) => alert("Copy failed: " + err));
}

// --------------- Background + restore stuff (kept) ---------------
document.getElementById("close-btn").onclick = () => { window.close(); };


document.addEventListener("DOMContentLoaded", () => {
  let currentBackground = "";
  let savedBackground = "";

  // 🧩 Elements
  const body = document.body;
  const bgGradient = document.querySelector(".bg-gradient");
  const notch = document.getElementById("notch");
  const check = document.getElementById("check");

  // 🎨 Theme definitions
  const themes = {
    "white-black": {
      bodyBg: "linear-gradient(-11deg, #121212, #1c1c1cf2 37%, #2c2c2eed 76%, #0a0a0a)",
      gradientBg: "radial-gradient(circle at 50% 120%, #1c1c1c 0%, #0a0a0a 50%, #000 100%)"
    },
    "black-blue": {
      bodyBg: "linear-gradient(90deg, rgba(2,0,36,1) 0%, rgba(9,9,121,1) 35%, rgba(0,212,255,1) 100%)",
      gradientBg: "radial-gradient(circle at 50% 120%, #000022 0%, #000033 50%, #000044 100%)"
    },
    "yellow-green": {
      bodyBg: "linear-gradient(to left, rgb(16, 193, 16), rgb(214, 228, 5))",
      gradientBg: "radial-gradient(circle at 50% 120%, #d4fc79 0%, #96e6a1 50%, #0a0a1f 100%)"
    },
    "red-pink": {
      bodyBg: "linear-gradient(to right, rgb(227, 58, 11), rgb(225, 10, 222))",
      gradientBg: "radial-gradient(circle at 50% 120%, #ff758c 0%, #ff7eb3 50%, #0a0a1f 100%)"
    },
    "black-red": {
      bodyBg: "linear-gradient(-11deg, #9a0f0ff2 40%, #121213ed 62%)",
      gradientBg: "radial-gradient(circle at 50% 120%, #2c0b0e 0%, #0a0a1f 50%, #000 100%)"
    }
  };

  // 🌈 Apply theme

  function applyTheme(themeKey) {
    const theme = themes[themeKey];
    if (!theme) return;
    body.style.background = theme.bodyBg;
    if (bgGradient) bgGradient.style.background = theme.gradientBg;
    currentBackground = themeKey;
  }

  // 🔄 Update icons

  function updateIcons(showNotch, showCheck) {
    if (notch) notch.style.display = showNotch ? "block" : "none";
    if (check) check.style.opacity = showCheck ? "1" : "0";
  }

  // 💾 Save theme

  function saveTheme(themeKey) {
    chrome.storage.local.set({ customBackground: themeKey }, () => {
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError);
        return;
      }
      savedBackground = themeKey;
      updateIcons(false, true);
    });
  }

  // 🔁 Restore saved theme
  function restoreThemeOnLoad() {
    chrome.storage.local.get("customBackground", (result) => {
      const savedKey = result.customBackground;
      if (savedKey && themes[savedKey]) {
        applyTheme(savedKey);
        savedBackground = savedKey;
        updateIcons(false, true);
      } else {
        const defaultKey = "white-black";
        applyTheme(defaultKey);
        saveTheme(defaultKey);
        savedBackground = defaultKey;
        updateIcons(false, true);
      }
    });
  }

  // 🎨 When theme button is clicked → Apply it, show notch (unsaved)
  Object.keys(themes).forEach(themeKey => {
    const btn = document.getElementById(themeKey);
    if (btn) {
      btn.addEventListener("click", () => {
        applyTheme(themeKey);
        updateIcons(true, false);
      });
    }
  });

  // ✅ Click on check → Save the current background
  if (check) {
    check.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentBackground && currentBackground !== savedBackground) {
        saveTheme(currentBackground);
      }
    });
  }

  // 🚀 Initialize
  restoreThemeOnLoad();
});












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
      document.getElementById("download-pdf")?.click();
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
});


// ------------------------------------------------------------------------

// ------------------------------------------------------------------------
