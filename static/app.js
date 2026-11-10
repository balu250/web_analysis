const $ = (id) => document.getElementById(id);
let loading = false;

function percentage(value, total) {
  return total ? `${Math.round((value / total) * 100)}% of headlines` : "0% of headlines";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function render(data) {
  const { Positive: positive, Negative: negative, Neutral: neutral } = data.summary;
  const total = data.total;
  $("totalCount").textContent = total;
  $("positiveCount").textContent = positive;
  $("negativeCount").textContent = negative;
  $("neutralCount").textContent = neutral;
  $("positivePercent").textContent = percentage(positive, total);
  $("negativePercent").textContent = percentage(negative, total);
  $("neutralPercent").textContent = percentage(neutral, total);
  $("donutTotal").textContent = total;
  $("legendPositive").textContent = positive;
  $("legendNegative").textContent = negative;
  $("legendNeutral").textContent = neutral;
  const positiveEnd = total ? (positive / total) * 100 : 0;
  const negativeEnd = positiveEnd + (total ? (negative / total) * 100 : 0);
  $("donut").style.background = `conic-gradient(var(--positive) 0 ${positiveEnd}%, var(--negative) ${positiveEnd}% ${negativeEnd}%, var(--neutral) ${negativeEnd}% 100%)`;
  $("resultCount").textContent = `${total} ${total === 1 ? "story" : "stories"}`;
  $("resultLabel").textContent = data.keyword ? `for “${escapeHtml(data.keyword)}”` : "";
  const mood = positive >= negative && positive >= neutral ? "Positive energy leads the cycle." : negative > positive ? "A cautious tone shapes the cycle." : "A balanced tone shapes the cycle.";
  $("insightTitle").textContent = mood;
  $("insightText").textContent = total ? `${positive} positive, ${negative} negative and ${neutral} neutral stories are in your current view.` : "No headlines matched your search. Try another keyword.";
  $("newsBody").innerHTML = data.articles.length ? data.articles.map((article) => `
    <tr>
      <td><a class="headline-link" href="${escapeHtml(article.link)}" target="_blank" rel="noopener">${escapeHtml(article.headline)}</a><div class="published">${escapeHtml(article.publishedLabel)}</div></td>
      <td><span class="sentiment ${article.sentiment.toLowerCase()}">${article.sentiment}</span></td>
      <td class="score">${article.vaderScore > 0 ? "+" : ""}${article.vaderScore.toFixed(3)}</td>
      <td class="score">${article.textblobScore > 0 ? "+" : ""}${article.textblobScore.toFixed(3)}</td>
      <td><a class="open-link" href="${escapeHtml(article.link)}" target="_blank" rel="noopener" aria-label="Open story">↗</a></td>
    </tr>`).join("") : '<tr><td colspan="5" class="loading">No stories found for this keyword.</td></tr>';
  $("lastUpdated").textContent = `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

async function loadNews() {
  if (loading) return;
  loading = true;
  $("refreshButton").disabled = true;
  $("refreshButton").style.opacity = ".65";
  $("errorBanner").style.display = "none";
  try {
    const keyword = $("keywordInput").value.trim();
    const response = await fetch(`/api/news?keyword=${encodeURIComponent(keyword)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load news.");
    render(data);
  } catch (error) {
    $("errorBanner").textContent = error.message;
    $("errorBanner").style.display = "block";
  } finally {
    loading = false;
    $("refreshButton").disabled = false;
    $("refreshButton").style.opacity = "1";
  }
}

$("refreshButton").addEventListener("click", loadNews);
$("keywordInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadNews();
});
loadNews();
