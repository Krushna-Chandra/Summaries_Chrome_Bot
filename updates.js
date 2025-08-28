const repos = [
  { owner: "Sangram03", repo: "Summaries_Chrome_Bot" },
];

const container = document.getElementById("updates-container");

Promise.all(
  repos.map(r =>
    fetch(`https://api.github.com/repos/${r.owner}/${r.repo}/releases/latest`)
      .then(res => res.json())
      .then(data => ({
        name: `${r.owner}/${r.repo}`,
        version: data.tag_name,
        url: data.zipball_url
      }))
  )
).then(releases => {
  container.innerHTML = "";

  releases.forEach(r => {
    const updateCard = document.createElement("div");
    updateCard.className = "update-card";

    updateCard.innerHTML = `
      <b>${r.name}</b>: Latest version <b>${r.version}</b><br>
    `;

    const upgradeBtn = document.createElement("button");
    upgradeBtn.textContent = "Upgrade";
    upgradeBtn.className = "upgrade-btn";

    upgradeBtn.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = r.url;
      link.download = `${r.repo}-${r.version}.zip`;
      link.click();

      const restartBtn = document.createElement("button");
      restartBtn.textContent = "Restart Extension";
      restartBtn.className = "restart-btn";
      restartBtn.addEventListener("click", () => chrome.runtime.reload());
      updateCard.appendChild(restartBtn);
    });

    updateCard.appendChild(upgradeBtn);
    container.appendChild(updateCard);
  });

  // Add Close (Back Home) Button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "⬅ Back to Home";
  closeBtn.style.marginTop = "15px";
  closeBtn.style.background = "#f44336";
  closeBtn.style.color = "#fff";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "5px";
  closeBtn.style.padding = "8px 12px";
  closeBtn.style.cursor = "pointer";

  closeBtn.addEventListener("click", () => {
    window.close(); // closes this updates popup window
  });

  container.appendChild(closeBtn);
}).catch(err => {
  container.innerHTML = "⚠️ Failed to fetch updates.";
  console.error(err);
});
