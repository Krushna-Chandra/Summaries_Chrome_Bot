document.getElementById("summarize").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  const summaryType = document.getElementById("summary-type").value;

  // Get API key from storage
  chrome.storage.sync.get(["geminiApiKey"], async (result) => {
    if (!result.geminiApiKey) {
      resultDiv.innerHTML =
        "API key not found. Please set your API key in the extension options.";
      
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (res) => {
          if (!res || !res.text) {
            resultDiv.innerText =
              "Could not extract article text from this page.";
            return;
          }

          try {
            const summary = await getGeminiSummary(
              res.text,
              summaryType,
              result.geminiApiKey
            );
            resultDiv.innerText = summary;
          } catch (error) {
            resultDiv.innerText = `Error: ${
              error.message || "Failed to generate summary."
            }`;
          }
        }
      );
    });
  });
});

// ==================== Voice Control ====================
let isSpeaking = false;
let currentUtterance = null;

function stopSpeaking() {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  const voiceBtn = document.getElementById("speak-btn");
  if (voiceBtn) {
    voiceBtn.innerHTML = '<i class="fa-solid fa-volume-high" style="color: black;"></i> speak';
  }
}

document.getElementById("speak-btn").addEventListener("click", () => {
  const voiceBtn = document.getElementById("speak-btn");
  const summaryText = document.getElementById("result").innerText;

  if (!summaryText || summaryText.trim() === "") return;

  if (!isSpeaking) {
    stopSpeaking(); // reset before speaking
    currentUtterance = new SpeechSynthesisUtterance(summaryText);
    currentUtterance.lang = "en-US";
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
});

// Auto-stop when other controls are used
["options","summarize", "copy-btn", "share-btn", "summary-type"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", () => {
      if (isSpeaking) stopSpeaking();
    });
  }
});
// ==================== Voice Control ====================



document.getElementById("copy-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result").innerText;

  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;

        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
});


document.getElementById("share-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result")?.innerText?.trim();

  if (summaryText) {
    const encodedText = encodeURIComponent(summaryText);
    const shareUrl = window.location.href;

    // Choose a platform: WhatsApp, Twitter, Facebook, etc.
    const platforms = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${encodedText}`,
    };

    // Example: open Twitter share in new tab
    window.open(platforms.twitter, "_blank");
  }
});

async function getGeminiSummary(text, summaryType, apiKey) {
  // Truncate very long texts to avoid API limits (typically around 30K tokens)
  const maxLength = 20000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  let prompt;
  switch (summaryType) {
    case "brief":
      prompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
      break;
    case "detailed":
      prompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
      break;
    case "bullets":
      prompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- " (dash followed by a space). Do not use asterisks or other bullet symbols, only use the dash. Keep each point concise and focused on a single key insight from the article:\n\n${truncatedText}`;
      break;
    default:
      prompt = `Summarize the following article:\n\n${truncatedText}`;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No summary available."
    );
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}


 document.getElementById("close-btn").onclick = () => {
    window.close();
  };
let currentBackground = ""; // store latest applied background

// Icons
const checkbox = document.getElementById("checkbox");
const notchIcon = document.getElementById("notch");
const checkIcon = document.getElementById("check"); // renamed to avoid conflict with "check" button
const checkButton = document.getElementById("check"); // actual save button

// Apply background and reset checkbox visuals
function applyBackground(bg, height) {
  document.body.style.background = bg;
  document.body.style.backgroundRepeat = 'no-repeat';
  // document.body.style.height = height;
  document.body.style.height = '350px'; // instead of 350px
  document.body.style.minHeight = '350px';

  // Reset checkbox spinner and check icon state
  if (notchIcon) notchIcon.style.display = "block";
  if (checkIcon) checkIcon.style.opacity = "0";
}

// Gradient buttons
const whiteblack = document.getElementById("white-black");
whiteblack.onclick = () => {
  currentBackground = 'linear-gradient(-11deg, #1c1c1cf2 37%, #2c2c2eed 76%)';
  applyBackground(currentBackground, '350px');
};

const blackblue = document.getElementById("black-blue");
blackblue.onclick = () => {
  currentBackground = 'linear-gradient(90deg, rgba(2, 0, 36, 1) 0%, rgba(9, 9, 121, 1) 35%, rgba(0, 212, 255, 1) 100%)';
  applyBackground(currentBackground, '350px');
};

const redpink = document.getElementById("red-pink");
redpink.onclick = () => {
  currentBackground = 'linear-gradient(90deg, rgba(131, 58, 180, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%)';
  applyBackground(currentBackground, '350px');
};

const blackred = document.getElementById("black-red");
blackred.onclick = () => {
  currentBackground = 'linear-gradient(-11deg, #9a0f0ff2 40%, #121213ed 62%)';
  applyBackground(currentBackground, '350px');
};

const yellowgreen = document.getElementById("yellow-green");
yellowgreen.onclick = () => {
  currentBackground = 'linear-gradient(to left, rgb(16, 193, 16), rgb(214, 228, 5))';
  applyBackground(currentBackground, '350px');
};

// Save background on "check" button click
checkButton.onclick = (e) => {
  e.preventDefault();
  if (currentBackground) {
    localStorage.setItem('customBackground', currentBackground);

    // Show check icon as confirmation
    if (notchIcon) notchIcon.style.display = "none";
    if (checkIcon) checkIcon.style.opacity = "1";
  }
};

// Restore background on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedBg = localStorage.getItem('customBackground');
  if (savedBg) {
    currentBackground = savedBg;
    applyBackground(savedBg, '350px');
  }
});

// Checkbox spinner control
checkbox.addEventListener("click", () => {
  if (notchIcon) notchIcon.style.display = "none";
  if (checkIcon) checkIcon.style.opacity = "1";
});


// updates option working conditions
 const repos = [
    { owner: "Sangram03", repo: "Summaries_Chrome_Bot" },
  ];

  document.getElementById("updates-btn").addEventListener("click", () => {
    const container = document.getElementById("updates-container");
    container.innerHTML = "⏳ Checking for updates...";

    Promise.all(
      repos.map(r =>
        fetch(`https://api.github.com/repos/${r.owner}/${r.repo}/releases/latest`)
          .then(res => res.json())
          .then(data => ({
            name: `${r.owner}/${r.repo}`,
            version: data.tag_name,
            url: data.html_url
          }))
      )
    ).then(releases => {
      container.innerHTML = "<b>🔄 Extension Updates:</b><br>";
      releases.forEach(r => {
        container.innerHTML += `✅ ${r.name}: Latest <b>${r.version}</b> → 
          <a href="${r.url}" target="_blank">Download</a><br>`;
      });
    }).catch(err => {
      container.innerHTML = "⚠️ Failed to fetch updates.";
      console.error(err);
    });
  });