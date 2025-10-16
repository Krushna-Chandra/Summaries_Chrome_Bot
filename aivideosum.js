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
// Add this code to your aivideosum.js file

// Logic for the close button
document.getElementById("close-btn").addEventListener("click", () => {
  // This command closes the extension's popup window
  window.close();
});

// Logic for the back button
document.getElementById("back-btn").addEventListener("click", () => {
  // This command navigates to the previous page in the browser's history
  window.history.back();
});
