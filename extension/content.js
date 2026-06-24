console.log("TOXISCOPE RUNNING!");

async function analyzeSingleComment(el) {
  if (el.dataset.analyzed) return;
  el.dataset.analyzed = "true";

  const text = el.innerText.trim();
  if (!text || text.length < 3) return;

  try {
    const res = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });

    const data = await res.json();
    const isToxic = data.label === "toxic";

    const badge = document.createElement("span");
    badge.textContent = isToxic ? " 🔴 TOXIC" : " 🟢 CLEAN";
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "bold";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "4px";
    badge.style.marginLeft = "6px";
    badge.style.background = isToxic ? "#ff000033" : "#00ff0022";
    badge.style.color = isToxic ? "#ff4444" : "#44ff44";
    badge.style.border = isToxic
      ? "1px solid #ff4444"
      : "1px solid #44ff44";

    el.appendChild(badge);
    console.log("Analyzed:", text.slice(0, 30), "→", data.label);

  } catch(e) {
    console.log("Backend error - is it running?", e.message);
  }
}

function analyzeAll() {
  // YouTube comment selector
  const ytComments = document.querySelectorAll(
    '#content-text'
  );

  // Twitter/X selector
  const tweets = document.querySelectorAll(
    '[data-testid="tweetText"]'
  );

  console.log("YouTube comments found:", ytComments.length);
  console.log("Tweets found:", tweets.length);

  ytComments.forEach(el => analyzeSingleComment(el));
  tweets.forEach(el => analyzeSingleComment(el));
}

// Run after page loads
setTimeout(analyzeAll, 3000);
setTimeout(analyzeAll, 6000);
setTimeout(analyzeAll, 10000);

// Keep scanning for new comments
setInterval(analyzeAll, 8000);