document.getElementById("analyze-btn").addEventListener("click", () => {
  const videoURL = document.getElementById("video-url").value;
  const resultDiv = document.getElementById("result");

  if (!videoURL) {
    resultDiv.innerHTML = "<p style='color:red;'>Please enter a YouTube URL or upload a video file!</p>";
    return;
  }

  // Simulated summary
  resultDiv.innerHTML = `
    <h3>🎯 Video Summary</h3>
    <p>This video discusses AI tools that can automate summarization and transcription efficiently...</p>
  `;
});

document.getElementById("copy-summary").addEventListener("click", () => {
  const text = document.getElementById("result").innerText;
  navigator.clipboard.writeText(text);
  alert("Summary copied!");
});
