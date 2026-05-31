import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np

BASE_DIR = r"c:\Users\LENOVO\Desktop\eyescan"
MODEL_PATH = os.path.join(BASE_DIR, "model", "retina_model.pth")
TEST_SAMPLES_DIR = os.path.join(BASE_DIR, "model", "test_samples")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", DEVICE)

# 1. Rebuild PyTorch model architecture (same as in train_model.py)
print("Building ResNet18 model...")
model = models.resnet18(weights=None)
in_features = model.fc.in_features
model.fc = nn.Sequential(
    nn.Dropout(0.4),
    nn.Linear(in_features, 256),
    nn.ReLU(inplace=True),
    nn.Dropout(0.3),
    nn.Linear(256, 5)
)

print("Loading PyTorch model state dict from:", MODEL_PATH)
checkpoint = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
model.load_state_dict(checkpoint["model_state_dict"])
model = model.to(DEVICE)
model.eval()
print("PyTorch model loaded successfully!")

# Define transforms
val_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# Find sample images
samples = os.listdir(TEST_SAMPLES_DIR)
samples = [s for s in samples if s.endswith(".png")]

print("\n--- Running predictions on samples with PyTorch ---")
for sample in samples:
    path = os.path.join(TEST_SAMPLES_DIR, sample)
    img = Image.open(path).convert("RGB")
    
    # Preprocess
    img_tensor = val_transform(img).unsqueeze(0).to(DEVICE)
    
    with torch.no_grad():
        outputs = model(img_tensor)
        probs = torch.softmax(outputs, dim=1).cpu().numpy()[0]
        pred_class = np.argmax(probs)
        
    print(f"File: {sample}")
    print(f"  Probs: {probs}")
    print(f"  Pred Class: {pred_class} ({['Normal', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR'][pred_class]})")
