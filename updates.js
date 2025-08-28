const repos = [
  { owner: "Sangram03", repo: "Summaries_Chrome_Bot" },
];

const container = document.getElementById("updates-container");
const updatesBtn = document.getElementById("updates-btn");

// 🔴 Red dot
const redDot = document.createElement("span");
redDot.style.width = "8px";
redDot.style.height = "8px";
redDot.style.background = "red";
redDot.style.borderRadius = "50%";
redDot.style.display = "inline-block";
redDot.style.marginLeft = "6px";
redDot.style.verticalAlign = "middle";
redDot.style.visibility = "hidden";
updatesBtn.parentNode.appendChild(redDot);

// Current extension version
const currentVersion = chrome.runtime.getManifest().version;

Promise.all(
  repos.map(r =>
    fetch(`https://api.github.com/repos/${r.owner}/${r.repo}/releases`)
      .then(res => res.json())
      .then(data => ({
        name: `${r.owner}/${r.repo}`,
        releases: data.map(rel => ({
          version: rel.tag_name.replace(/^v/, ""),
          url: rel.zipball_url,
          body: rel.body,
          published: new Date(rel.published_at).toLocaleString()
        }))
      }))
  )
).then(repoData => {
  container.innerHTML = "";

  repoData.forEach(repo => {
    repo.releases.forEach((rel, index) => {
      // Show red dot if latest version is newer
      if (index === 0 && rel.version !== currentVersion) {
        redDot.style.visibility = "visible";
      }

      const updateCard = document.createElement("div");
      updateCard.className = "update-card";

      updateCard.innerHTML = `
        <b>${repo.name}</b><br>
        Version: <b>${rel.version}</b> (${rel.published})<br>
        <pre style="background:#f4f4f4;padding:8px;border-radius:5px;white-space:pre-wrap;">${rel.body || "No details"}</pre>
      `;

      const upgradeBtn = document.createElement("button");
      upgradeBtn.textContent = "Upgrade to " + rel.version;
      upgradeBtn.className = "upgrade-btn";

      upgradeBtn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = rel.url;
        link.download = `${repo.name}-${rel.version}.zip`;
        link.click();

        const restartBtn = document.createElement("button");
        restartBtn.textContent = "Restart Extension";
        restartBtn.className = "restart-btn";
        restartBtn.addEventListener("click", () => chrome.runtime.reload());
        updateCard.appendChild(restartBtn);

        // Hide red dot once updated
        redDot.style.visibility = "hidden";
      });

      updateCard.appendChild(upgradeBtn);
      container.appendChild(updateCard);
    });
  });

  // Back home button
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
    window.close();
  });

  container.appendChild(closeBtn);
}).catch(err => {
  container.innerHTML = "⚠️ Failed to fetch updates.";
  console.error(err);
});
