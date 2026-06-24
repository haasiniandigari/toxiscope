# backend.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

app = FastAPI(title="Social Media Toxic Comment Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
tokenizer = None
model = None
device = None

@app.on_event("startup")
async def load_model():
    global tokenizer, model, device
    print("Loading toxicity model...")
    model_name = "unitary/unbiased-toxic-roberta"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    model.eval()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    print(f"Model loaded on {device}")

class PredictRequest(BaseModel):
    text: str

class PredictResponse(BaseModel):
    label: str
    probability: float
    emoji: str

def minimal_clean(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""
    return " ".join(text.split())

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    cleaned = minimal_clean(request.text)
    
    inputs = tokenizer(cleaned, return_tensors="pt", truncation=True, max_length=512, padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
        prob = torch.sigmoid(outputs.logits[:, 0]).item()
    
    label = "toxic" if prob > 0.5 else "non-toxic"
    emoji = "😡" if label == "toxic" else "🙂"
    
    return PredictResponse(
        label=label,
        probability=round(prob, 4),
        emoji=emoji
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)