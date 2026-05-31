"""
Quick diagnostic script to understand model bias.
Loads the current model and checks prediction distribution on test set.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "retina_model.pth")
DATA_DIR = os.path.join(BASE_DIR, "retinamnist_224.npz")

NUM_CLASSES = 5
CLASS_NAMES = ["Normal", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

val_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def load_model():
    model = models.resnet18(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(0.3),
        nn.Linear(256, NUM_CLASSES)
    )
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(DEVICE)
    model.eval()
    return model

print("[INFO] Loading model...")
model = load_model()
print("[INFO] Loading test data...")

test_imgs = np.load(os.path.join(DATA_DIR, "test_images.npy"))
test_lbls = np.load(os.path.join(DATA_DIR, "test_labels.npy")).flatten()

print(f"[INFO] Test set: {len(test_lbls)} images")
print(f"[INFO] True label distribution:")
for i in range(NUM_CLASSES):
    count = np.sum(test_lbls == i)
    print(f"  Class {i} ({CLASS_NAMES[i]}): {count} images ({count/len(test_lbls)*100:.1f}%)")

# Run inference on ALL test images
print("\n[INFO] Running inference on all test images...")
all_preds = []
all_confs = []
all_probs = []

with torch.no_grad():
    for idx in range(len(test_imgs)):
        img = Image.fromarray(test_imgs[idx], mode="RGB")
        tensor = val_transform(img).unsqueeze(0).to(DEVICE)
        output = model(tensor)
        probs = torch.softmax(output, dim=1).cpu().numpy()[0]
        pred = np.argmax(probs)
        all_preds.append(pred)
        all_confs.append(probs[pred])
        all_probs.append(probs)

all_preds = np.array(all_preds)
all_confs = np.array(all_confs)

print(f"\n[RESULT] Prediction distribution (what model outputs):")
for i in range(NUM_CLASSES):
    count = np.sum(all_preds == i)
    print(f"  Class {i} ({CLASS_NAMES[i]}): {count} predictions ({count/len(all_preds)*100:.1f}%)")

# Per-class accuracy
print(f"\n[RESULT] Per-class accuracy:")
for i in range(NUM_CLASSES):
    mask = test_lbls == i
    if mask.sum() == 0:
        continue
    acc = (all_preds[mask] == i).mean()
    # Where do misclassified ones go?
    misclassified = all_preds[mask & (all_preds != i)]
    if len(misclassified) > 0:
        misc_counts = np.bincount(misclassified, minlength=NUM_CLASSES)
        misc_str = ", ".join([f"{CLASS_NAMES[j]}:{misc_counts[j]}" for j in range(NUM_CLASSES) if misc_counts[j] > 0])
    else:
        misc_str = "none"
    print(f"  Class {i} ({CLASS_NAMES[i]}): {acc*100:.1f}% correct | Misclassified as: {misc_str}")

# Check: What does model predict for NORMAL images specifically?
print(f"\n[CRITICAL] Normal images (class 0) analysis:")
normal_mask = test_lbls == 0
normal_preds = all_preds[normal_mask]
normal_confs = all_confs[normal_mask]
for i in range(NUM_CLASSES):
    count = np.sum(normal_preds == i)
    if count > 0:
        avg_conf = np.mean(all_confs[normal_mask & (all_preds == i)])
        print(f"  Normal images predicted as {CLASS_NAMES[i]}: {count} ({count/len(normal_preds)*100:.1f}%) avg_conf={avg_conf:.3f}")

# Average confidence analysis
print(f"\n[INFO] Average confidence by predicted class:")
for i in range(NUM_CLASSES):
    mask = all_preds == i
    if mask.sum() > 0:
        avg_conf = all_confs[mask].mean()
        print(f"  Predicted {CLASS_NAMES[i]}: avg confidence = {avg_conf:.3f}")

# Check the raw logit bias
print(f"\n[INFO] Average softmax probabilities across ALL test images:")
all_probs_arr = np.array(all_probs)
avg_probs = all_probs_arr.mean(axis=0)
for i in range(NUM_CLASSES):
    print(f"  {CLASS_NAMES[i]}: {avg_probs[i]:.4f}")

print("\nDone!")
