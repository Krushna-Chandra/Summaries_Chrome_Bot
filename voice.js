const searchBtn = document.getElementById("voice-assistant"); // ✅ fixed
const copyBtn = document.getElementById("copy-btn");
const speakBtn = document.getElementById("speak-btn");
const shareBtn = document.getElementById("share-btn");
const summarizeBtn = document.getElementById("summarize"); 
const historyBtn = document.getElementById("history-btn");

searchBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    searchBtn.innerHTML = '<i class="fa-solid fa-microphone"></i><span> Listening...</span>';

    recognition.onerror = () => {
      searchBtn.innerHTML = '<i class="fa-solid fa-microphone" style="color: rgb(154, 22, 22);"></i> Voice Search';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log("🎤 Heard:", transcript);

      if (transcript.includes("copy")) {
        copyBtn?.click();
      } else if (transcript.includes("speaker")) {
        speakBtn?.click();
      } else if (transcript.includes("summarize")) {
        summarizeBtn?.click();
      } else if (transcript.includes("share")) {
        shareBtn?.click();
      } else if (transcript.includes("history")) {
        historyBtn?.click();
      } else {
        // fallback: search on Google
        window.open("https://www.google.com/search?q=" + encodeURIComponent(transcript), "_blank");
      }

      searchBtn.innerHTML = '<i class="fa-solid fa-microphone" style="color: rgb(154, 22, 22);"></i> Voice Search';
    };

    recognition.onend = () => {
      searchBtn.innerHTML = '<i class="fa-solid fa-microphone" style="color: rgb(154, 22, 22);"></i> Voice Search';
    };
  } else {
    // Fallback: search summary text
    const text = document.getElementById("result")?.innerText || "";
    if (text.trim()) {
      window.open("https://www.google.com/search?q=" + encodeURIComponent(text), "_blank");
    } else {
      alert("No summary or voice input available.");
    }
  }
});
