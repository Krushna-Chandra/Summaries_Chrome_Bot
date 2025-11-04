// -----------------------------
// Handle onInstall Event
// -----------------------------
chrome.runtime.onInstalled.addListener(() => {
  // Prompt the user to enter their Gemini API key on first install
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({ url: "options.html" });
    }
  });
});

// -----------------------------
// Centralized Message Listener
// -----------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // -------- Download PDF --------
    if (message.action === "downloadPDF" && message.url) {
      console.log("📥 PDF download requested:", message.url);

      chrome.downloads.download(
        {
          url: message.url,
          filename: message.filename || "summary.pdf",
          saveAs: true,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("❌ PDF Download Error:", chrome.runtime.lastError.message);
            safeResponse(sendResponse, { status: "error", message: chrome.runtime.lastError.message });
          } else {
            console.log("✅ PDF Download Started, ID:", downloadId);
            safeResponse(sendResponse, { status: "ok", id: downloadId });
          }
        }
      );

      return true; // Keep channel open for async callback
    }

    // -------- Download QR --------
    if (message.action === "downloadQR" && message.url) {
      console.log("📥 QR download requested:", message.filename || "ResultQRCode.png");

      chrome.downloads.download(
        {
          url: message.url,
          filename: message.filename || "ResultQRCode.png",
          saveAs: false,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("❌ QR Download Error:", chrome.runtime.lastError.message);
            safeResponse(sendResponse, { status: "error", message: chrome.runtime.lastError.message });
          } else {
            console.log("✅ QR Download Started, ID:", downloadId);
            safeResponse(sendResponse, { status: "ok", id: downloadId });
          }
        }
      );

      return true; // Keep channel open for async callback
    }
  } catch (err) {
    console.error("🚨 Unexpected error in message handler:", err);
    safeResponse(sendResponse, { status: "error", message: err.message });
  }

  // Default: No async operation → return false
  return false;
});

// -----------------------------
// Safe Response Helper
// -----------------------------
function safeResponse(sendResponse, data) {
  try {
    if (typeof sendResponse === "function") {
      sendResponse(data);
    } else {
      console.warn("⚠️ sendResponse not available");
    }
  } catch (e) {
    console.warn("⚠️ Response channel already closed:", e.message);
  }
}
