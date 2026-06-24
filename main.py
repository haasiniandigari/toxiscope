# main.py
# Toxic Comment Predictor — using unitary/unbiased-toxic-roberta

import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix,
    roc_auc_score, average_precision_score,
    precision_recall_curve
)

import matplotlib.pyplot as plt
import seaborn as sns

from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# ─── 1. Load pre-trained model & tokenizer ───────────────────────────────
print("Loading pre-trained toxicity model...")
model_name = "unitary/unbiased-toxic-roberta"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
model.eval()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
print(f"Model loaded on {device}\n")

# ─── 2. Minimal cleaning ────────────────────────────────────────────────
def minimal_clean(text):
    if pd.isna(text) or not isinstance(text, str):
        return ""
    return " ".join(text.split())


# ─── 3. Batch inference function (fast) ─────────────────────────────────
def get_toxicity_probs_batch(comments, batch_size=32):
    """Process multiple comments at once."""
    cleaned = [minimal_clean(c) for c in comments]
    probs = []
    
    for i in range(0, len(cleaned), batch_size):
        batch = cleaned[i:i + batch_size]
        inputs = tokenizer(batch, return_tensors="pt", truncation=True, 
                          max_length=512, padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
            batch_probs = torch.sigmoid(outputs.logits[:, 0]).cpu().numpy()
        
        probs.extend(batch_probs)
    
    return probs


# ─── 4. Load data ───────────────────────────────────────────────────────
print("Loading dataset for evaluation...")
df = pd.read_csv("train.csv", usecols=["comment_text", "toxic"])

print(f"Dataset shape: {df.shape}")
print(f"Toxic ratio: {df['toxic'].mean():.3%}\n")

df["clean_text"] = df["comment_text"].apply(minimal_clean)


# ─── 5. Evaluate on a sample ────────────────────────────────────────────
print("Running evaluation on a random sample of 5000 comments...")

sample_df = df.sample(n=5000, random_state=42).copy()

# Use batch inference for speed
sample_df["pred_prob"] = get_toxicity_probs_batch(sample_df["clean_text"].tolist(), batch_size=64)
sample_df["pred_label"] = (sample_df["pred_prob"] > 0.5).astype(int)

y_true = sample_df["toxic"].values
y_pred = sample_df["pred_label"].values
y_prob = sample_df["pred_prob"].values

print("\nEvaluation on 5,000-sample subset:")
print(classification_report(y_true, y_pred, digits=3))

acc = accuracy_score(y_true, y_pred)
roc = roc_auc_score(y_true, y_prob)
pr_auc = average_precision_score(y_true, y_prob)

print(f"Accuracy : {acc:.1%}")
print(f"ROC-AUC  : {roc:.4f}")
print(f"PR-AUC   : {pr_auc:.4f}")

# Confusion matrix
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=["Non-toxic", "Toxic"],
            yticklabels=["Non-toxic", "Toxic"])
plt.xlabel("Predicted")
plt.ylabel("True")
plt.title("Confusion Matrix — unbiased-toxic-roberta")
plt.tight_layout()
plt.show()


# ─── 6. Calibration & best threshold ────────────────────────────────────
print("\nCalibrating probabilities and finding best threshold...")
from sklearn.calibration import CalibratedClassifierCV

calibrator = CalibratedClassifierCV(cv="prefit")
calibrator.fit(y_prob.reshape(-1, 1), y_true)

# Find best F1 threshold
prec, rec, thresh = precision_recall_curve(y_true, y_prob)
f1_scores = 2 * (prec * rec) / (prec + rec + 1e-8)
best_idx = np.argmax(f1_scores)
best_threshold = thresh[best_idx] if len(thresh) > best_idx else 0.5

print(f"Best F1 threshold: {best_threshold:.3f}")


# ─── 7. Save predictions and metadata ───────────────────────────────────
import json

sample_df[["clean_text", "toxic", "pred_prob", "pred_label"]].to_parquet("predictions.parquet")

metadata = {
    "model_name": model_name,
    "best_threshold": float(best_threshold),
    "calibrated": True,
    "roc_auc": float(roc),
    "pr_auc": float(pr_auc)
}

with open("model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("Saved: predictions.parquet + model_metadata.json")


# ─── 8. Interactive prediction with best threshold ──────────────────────
def predict_toxicity(comment):
    cleaned = minimal_clean(comment)
    prob = get_toxicity_probs_batch([cleaned])[0]          # batch of 1
    calibrated_prob = calibrator.predict_proba([[prob]])[0][1]
    
    label = "toxic" if calibrated_prob > best_threshold else "non-toxic"
    emoji = "😡" if label == "toxic" else "🙂"
    
    return label, calibrated_prob, emoji


print("\n" + "="*70)
print("Interactive mode ready. Type 'quit' or 'exit' to stop.")
print("Model: unitary/unbiased-toxic-roberta")
print("="*70)

while True:
    user_input = input("\nComment: ").strip()
    if user_input.lower() in ["quit", "exit", "q"]:
        print("Goodbye 👋")
        break

    if not user_input:
        continue

    label, prob, emoji = predict_toxicity(user_input)
    print(f"→ {label.upper()}   ({prob:.1%} toxic probability)  {emoji}")