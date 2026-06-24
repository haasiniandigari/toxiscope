#  TOXISCOPE — Toxic Comment Intelligence

A real-time social media toxic comment detector built with Machine Learning, FastAPI, and a live web interface.

##  About the Project

TOXISCOPE analyzes social media comments and instantly classifies them as **toxic** or **non-toxic**, along with a probability score.
Built as an end-to-end system — from model training to a live web application and Chrome extension.

##  Features

-  **Real-time Analysis** — instant toxic/clean verdict with probability score
-  **Batch Mode** — analyze multiple comments at once
-  **History Tab** — session log of all analyzed comments
-  **Analytics Tab** — live stats, toxic rate, distribution bar
-  **Chrome Extension** — detects toxic comments directly on YouTube and Twitter
-  **Dark Terminal UI** — monospace aesthetic with red/green verdict display

##  Model & Dataset

- **Dataset:** Jigsaw Toxic Comment Classification (Kaggle) — 1.6 lakh comments
- **Algorithm:** Logistic Regression with TF-IDF feature extraction
- **Evaluation Sample:** 5,000 comments

| Metric | Value |
|--------|-------|
| Accuracy | 92.4% |
| F1-Score | 0.88 |
| ROC-AUC | 0.96 |
| PR-AUC | 0.94 |
| Threshold | 0.50 |

##  Project Structure

toxic_comment_project/
│
├── backend.py          # FastAPI server — /predict endpoint
├── main.py             # Model training, evaluation, threshold tuning
├── index.html          # Web UI — 4 tabs (Analyze, Batch, History, Analytics)
├── style.css           # Dark terminal styling
├── script.js           # Frontend logic — API calls, verdict rendering
└── extension/
├── manifest.json   # Chrome extension config
├── content.js      # Injects badges on YouTube & Twitter
└── popup.html      # Extension popup UI

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.x |
| ML Framework | PyTorch, Transformers |
| Feature Extraction | TF-IDF |
| Algorithm | Logistic Regression |
| Backend | FastAPI + Uvicorn |
| Frontend | HTML, CSS, JavaScript |
| Data | Pandas, NumPy |
| Metrics | Scikit-learn |
| Browser Extension | Chrome Manifest V3 |

