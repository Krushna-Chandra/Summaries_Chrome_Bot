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
// first Element
const blackblue = document.getElementById("black-blue");

blackblue.onclick = () => {
  document.body.style.background = 'linear-gradient(90deg,rgba(2, 0, 36, 1) 0%, rgba(9, 9, 121, 1) 35%, rgba(0, 212, 255, 1) 100%)';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.height = '300'; // full viewport height
};

// second element
const yellowgreen = document.getElementById("yellow-green");

yellowgreen.onclick = () => {
  document.body.style.background = 'linear-gradient(90deg, rgba(237, 221, 83, 1) 0%,rgba(42, 123, 155, 1) 35%, rgba(87, 199, 133, 1) 100%)';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.height = '300'; // full viewport height
};

//third element

const redpink = document.getElementById("red-pink");

redpink.onclick = ()=> {
  document.body.style.background = 'linear-gradient(90deg,rgba(131, 58, 180, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%)';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.height = '300';
}

  // last element
const blackred = document.getElementById("black-red");

blackred.onclick = () => {
  document.body.style.background = 'linear-gradient(-11deg, #9a0f0ff2 40%, #121213ed 62%)';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.height = '300'; // full viewport height
};

const checkbox = document.getElementById("checkbox");
const notchIcon = document.getElementById("notch");
const checkIcon = document.getElementById("check");

checkbox.addEventListener("click", () => {
  notchIcon.style.display = "none";
  checkIcon.style.opacity = "1";
});



