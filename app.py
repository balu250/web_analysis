from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any

import requests
from xml.etree import ElementTree
from flask import Flask, jsonify, render_template, request
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


app = Flask(__name__)
analyzer = SentimentIntensityAnalyzer()
RSS_URL = "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
HEADERS = {"User-Agent": "Mozilla/5.0 (Sentiment News Analysis)"}


def format_date(value: str) -> str:
    """Return a short, readable date while preserving an unknown value."""
    try:
        parsed = parsedate_to_datetime(value)
        return parsed.astimezone(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    except (TypeError, ValueError, OverflowError):
        return value or "Unknown date"


def score_headline(headline: str) -> dict[str, Any]:
    vader_score = analyzer.polarity_scores(headline)["compound"]
    textblob_score = TextBlob(headline).sentiment.polarity
    if vader_score >= 0.05:
        sentiment = "Positive"
    elif vader_score <= -0.05:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"
    return {
        "vaderScore": round(vader_score, 3),
        "textblobScore": round(textblob_score, 3),
        "sentiment": sentiment,
    }


def collect_news() -> list[dict[str, Any]]:
    response = requests.get(RSS_URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    root = ElementTree.fromstring(response.content)
    articles: list[dict[str, Any]] = []
    for item in root.findall(".//item"):
        headline = item.findtext("title", default="").strip()
        pub_date = item.findtext("pubDate", default="").strip()
        article = {
            "headline": headline,
            "link": item.findtext("link", default="").strip(),
            "published": pub_date,
            "publishedLabel": format_date(pub_date),
        }
        article.update(score_headline(headline))
        articles.append(article)
    return articles


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/news")
def news():
    keyword = request.args.get("keyword", "").strip()
    try:
        articles = collect_news()
        if keyword:
            articles = [
                article
                for article in articles
                if keyword.casefold() in article["headline"].casefold()
            ]
        counts = {sentiment: 0 for sentiment in ("Positive", "Negative", "Neutral")}
        for article in articles:
            counts[article["sentiment"]] += 1
        return jsonify(
            {
                "articles": articles,
                "summary": counts,
                "total": len(articles),
                "keyword": keyword,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
        )
    except requests.RequestException as error:
        return jsonify({"error": f"Unable to fetch news right now: {error}"}), 502
    except Exception:
        app.logger.exception("News analysis failed")
        return jsonify({"error": "News analysis failed. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=True)
