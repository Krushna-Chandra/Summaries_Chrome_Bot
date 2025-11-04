// Add this file to your extension
chrome.runtime.onInstalled.addListener(() => {
  // This will prompt the user to enter their API key on first install
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({
        url: "options.html",
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadPDF") {
    chrome.downloads.download({
      url: message.url,
      filename: "summary.pdf",
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download Error:", chrome.runtime.lastError.message);
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
      } else {
        sendResponse({ status: "ok", downloadId });
      }
    });
    return true; // keeps sendResponse async
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadQR" && message.url) {
    console.log("📥 Received download request:", message.filename);

    // Perform the download
    chrome.downloads.download(
      {
        url: message.url,
        filename: message.filename || "ResultQRCode.png",
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Download error:", chrome.runtime.lastError.message);
          // Respond safely inside try/catch — avoids port-closing issue
          try {
            sendResponse({ status: "error", error: chrome.runtime.lastError.message });
          } catch (e) {
            console.warn("Response channel already closed.");
          }
        } else {
          console.log("✅ Download started successfully, ID:", downloadId);
          try {
            sendResponse({ status: "ok", id: downloadId });
          } catch (e) {
            console.warn("Response channel already closed.");
          }
        }
      }
    );

    // 🚨 Crucial for Manifest V3: keep the channel open for async callback
    return true;
  }
});




