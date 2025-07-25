document.addEventListener("DOMContentLoaded", () => {
  // Load saved API key if it exists
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      document.getElementById("api-key").value = result.geminiApiKey;
    }
  });

  // Save API key when button is clicked
  document.getElementById("save-button").addEventListener("click", () => {
    const apiKey = document.getElementById("api-key").value.trim();

    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        const successMessage = document.getElementById("success-message");
        successMessage.style.display = "block";

        // Close the tab after a short delay
        setTimeout(() => {
          // Try to close the window directly
          window.close();

          // Fallback for Chrome Extensions to close tab
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.remove(tabs[0].id);
            }
          });
        }, 1000);
      });
    }
  });
});

