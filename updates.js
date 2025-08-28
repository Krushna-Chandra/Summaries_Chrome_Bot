const repos = [
  { owner: "Sangram03", repo: "Summaries_Chrome_Bot" },
];

const updatesBtn = document.getElementById("updates-btn");
const updateBadge = document.getElementById("update-badge");
const container = document.getElementById("updates-container");

updatesBtn.addEventListener("click", () => {
  container.innerHTML = "⏳ Checking for updates...";

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
    let updatesAvailable = false;

    releases.forEach(r => {
      // Replace with your extension's current version
      const currentVersion = "v1.0.0"; 
      if (r.version !== currentVersion) updatesAvailable = true;

      const updateCard = document.createElement("div");
      updateCard.className = "update-card";
      updateCard.style.display = "flex";
      updateCard.style.justifyContent = "space-between";
      updateCard.style.alignItems = "center";
      updateCard.style.padding = "10px";
      updateCard.style.marginBottom = "5px";
      updateCard.style.borderRadius = "6px";
      updateCard.style.background = "#f9f9f9";
      updateCard.innerHTML = `<b>🔄 ${r.name}</b>: Latest version <b>${r.version}</b>`;

      const btnDiv = document.createElement("div");

      const upgradeBtn = document.createElement("button");
      upgradeBtn.textContent = "Upgrade";
      upgradeBtn.style.background = "#4caf50";
      upgradeBtn.style.color = "#fff";
      upgradeBtn.style.border = "none";
      upgradeBtn.style.borderRadius = "4px";
      upgradeBtn.style.cursor = "pointer";
      upgradeBtn.style.marginRight = "5px";
      upgradeBtn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = r.url;
        link.download = `${r.repo}-${r.version}.zip`;
        link.click();

        const restartBtn = document.createElement("button");
        restartBtn.textContent = "Restart";
        restartBtn.style.background = "#2196f3";
        restartBtn.style.color = "#fff";
        restartBtn.style.border = "none";
        restartBtn.style.borderRadius = "4px";
        restartBtn.style.cursor = "pointer";
        restartBtn.style.marginLeft = "5px";
        restartBtn.addEventListener("click", () => chrome.runtime.reload());

        btnDiv.appendChild(restartBtn);
      });

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✖";
      closeBtn.style.background = "#f44336";
      closeBtn.style.color = "#fff";
      closeBtn.style.border = "none";
      closeBtn.style.borderRadius = "4px";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.marginLeft = "5px";
      closeBtn.addEventListener("click", () => updateCard.remove());

      btnDiv.appendChild(upgradeBtn);
      btnDiv.appendChild(closeBtn);
      updateCard.appendChild(btnDiv);

      container.prepend(updateCard);
    });

    // Show red badge if updates available
    updateBadge.style.display = updatesAvailable ? "block" : "none";
  }).catch(err => {
    container.innerHTML = "⚠️ Failed to fetch updates.";
    console.error(err);
  });
});
