"""
RetinaMNIST Model Training Script
==================================
Trains a ResNet18 model (transfer learning) on the RetinaMNIST dataset
for 5-class diabetic retinopathy classification.

Classes:
  0 = Normal
  1 = Mild DR
  2 = Moderate DR
  3 = Severe DR
  4 = Proliferative DR
"""

import os
import sys

# Fix encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from sklearn.metrics import classification_report, confusion_matrix
from PIL import Image

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "retinamnist_224.npz")
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "retina_model.pth")
SAMPLE_DIR = os.path.join(MODEL_DIR, "test_samples")
os.makedirs(SAMPLE_DIR, exist_ok=True)

NUM_CLASSES = 5
IMG_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 60
LEARNING_RATE = 1e-4
PATIENCE = 12  # Early stopping patience

CLASS_NAMES = [
    "Normal",
    "Mild DR",
    "Moderate DR",
    "Severe DR",
    "Proliferative DR"
]

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[INFO] Using device: {DEVICE}")


# ──────────────────────────────────────────────
# Dataset
# ──────────────────────────────────────────────
class RetinaMNISTDataset(Dataset):
    def __init__(self, images: np.ndarray, labels: np.ndarray, transform=None):
        self.images = images          # (N, 224, 224, 3) uint8
        self.labels = labels.flatten().astype(np.int64)  # (N,)
        self.transform = transform

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        img = self.images[idx]  # numpy HWC uint8
        label = self.labels[idx]

        # Convert to PIL Image for torchvision transforms
        img = Image.fromarray(img, mode="RGB")

        if self.transform:
            img = self.transform(img)

        return img, label


# ──────────────────────────────────────────────
# Transforms
# ──────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.5),
    transforms.RandomRotation(degrees=15),
    transforms.RandomAffine(degrees=0, translate=(0.05, 0.05), scale=(0.95, 1.05)),
    transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1, hue=0.02),
    # Note: Removing aggressive RandomPerspective and RandomErasing for medical fundus photos,
    # as erasing tiny lesions (hemorrhages/exudates) directly degrades diagnostic signals.
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


# ──────────────────────────────────────────────
# Build model
# ──────────────────────────────────────────────
def build_model():
    """ResNet18 with pretrained ImageNet weights, fine-tuned for 5 classes."""
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

    # Do not freeze early layers for high-precision medical imaging,
    # as retina fundus features are highly specific compared to ImageNet.
    # We will unfreeze all layers but use a smaller learning rate for backbone parameters.
    for param in model.parameters():
        param.requires_grad = True

    # Replace final FC layer
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(0.3),
        nn.Linear(256, NUM_CLASSES)
    )

    return model.to(DEVICE)


# ──────────────────────────────────────────────
# Compute class weights
# ──────────────────────────────────────────────
def compute_class_weights(labels):
    """Inverse frequency weighting with square root dampening to handle class imbalance stably."""
    counts = np.bincount(labels.flatten().astype(int), minlength=NUM_CLASSES)
    total = counts.sum()
    weights = total / (NUM_CLASSES * counts.astype(float))
    # Square root dampening (power 0.5) is extremely stable for medical classification,
    # preventing rare classes from overpowering normal/moderate classes and causing high false positives.
    weights = weights ** 0.5
    print(f"[INFO] Class counts: {counts}")
    print(f"[INFO] Class weights: {np.round(weights, 3)}")
    return torch.FloatTensor(weights).to(DEVICE)


# ──────────────────────────────────────────────
# Training
# ──────────────────────────────────────────────
def train():
    print("=" * 60)
    print("  RetinaMNIST Model Training")
    print("=" * 60)

    # Load data
    print("\n[1/5] Loading data...")
    train_imgs = np.load(os.path.join(DATA_DIR, "train_images.npy"))
    train_lbls = np.load(os.path.join(DATA_DIR, "train_labels.npy"))
    val_imgs = np.load(os.path.join(DATA_DIR, "val_images.npy"))
    val_lbls = np.load(os.path.join(DATA_DIR, "val_labels.npy"))
    test_imgs = np.load(os.path.join(DATA_DIR, "test_images.npy"))
    test_lbls = np.load(os.path.join(DATA_DIR, "test_labels.npy"))

    print(f"    Train: {train_imgs.shape[0]} images")
    print(f"    Val:   {val_imgs.shape[0]} images")
    print(f"    Test:  {test_imgs.shape[0]} images")

    # Datasets & Loaders
    train_ds = RetinaMNISTDataset(train_imgs, train_lbls, transform=train_transform)
    val_ds = RetinaMNISTDataset(val_imgs, val_lbls, transform=val_transform)
    test_ds = RetinaMNISTDataset(test_imgs, test_lbls, transform=val_transform)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0, pin_memory=False)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=False)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=False)

    # Build model
    print("\n[2/5] Building ResNet18 model (transfer learning)...")
    model = build_model()

    # Class weights
    class_weights = compute_class_weights(train_lbls)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    
    # Optimizer with differential learning rates
    # Higher LR for new layers, lower for pretrained
    fc_params = list(model.fc.parameters())
    backbone_params = [p for n, p in model.named_parameters() 
                       if not n.startswith("fc") and p.requires_grad]
    
    optimizer = optim.AdamW([
        {"params": backbone_params, "lr": LEARNING_RATE * 0.5},
        {"params": fc_params, "lr": LEARNING_RATE},
    ], weight_decay=1e-4)

    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2, eta_min=1e-6)

    # Training loop
    print(f"\n[3/5] Training for up to {NUM_EPOCHS} epochs (patience={PATIENCE})...\n")
    best_val_acc = 0.0
    best_epoch = 0
    epochs_no_improve = 0
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    start_time = time.time()

    for epoch in range(1, NUM_EPOCHS + 1):
        # ── Train ──
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * imgs.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(labels).sum().item()
            total += labels.size(0)

        train_loss = running_loss / total
        train_acc = correct / total

        # ── Validate ──
        model.eval()
        val_loss_sum = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss_sum += loss.item() * imgs.size(0)
                _, preds = outputs.max(1)
                val_correct += preds.eq(labels).sum().item()
                val_total += labels.size(0)

        val_loss = val_loss_sum / val_total
        val_acc = val_correct / val_total

        scheduler.step()

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        marker = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            epochs_no_improve = 0
            torch.save({
                "model_state_dict": model.state_dict(),
                "class_names": CLASS_NAMES,
                "num_classes": NUM_CLASSES,
                "img_size": IMG_SIZE,
                "best_val_acc": best_val_acc,
                "epoch": epoch,
            }, MODEL_PATH)
            marker = " * SAVED"
        else:
            epochs_no_improve += 1

        print(f"  Epoch {epoch:3d}/{NUM_EPOCHS} | "
              f"Train Loss: {train_loss:.4f}  Acc: {train_acc:.4f} | "
              f"Val Loss: {val_loss:.4f}  Acc: {val_acc:.4f}{marker}")

        if epochs_no_improve >= PATIENCE:
            print(f"\n  >> Early stopping at epoch {epoch} (no improvement for {PATIENCE} epochs)")
            break

    elapsed = time.time() - start_time
    print(f"\n  Training completed in {elapsed:.1f}s")
    print(f"  Best Val Accuracy: {best_val_acc:.4f} at epoch {best_epoch}")

    # ── Evaluate on Test Set ──
    print(f"\n[4/5] Evaluating on test set ({test_imgs.shape[0]} images)...")
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_preds = []
    all_labels = []
    all_probs = []

    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(DEVICE)
            outputs = model(imgs)
            probs = torch.softmax(outputs, dim=1)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)

    test_acc = (all_preds == all_labels).mean()
    print(f"\n  [OK] Test Accuracy: {test_acc:.4f} ({test_acc*100:.1f}%)")

    print("\n  Classification Report:")
    print("  " + "-" * 60)
    report = classification_report(all_labels, all_preds, target_names=CLASS_NAMES, digits=4)
    for line in report.split("\n"):
        print(f"  {line}")

    print("\n  Confusion Matrix:")
    cm = confusion_matrix(all_labels, all_preds)
    print(f"  {'':>20s}", end="")
    for name in CLASS_NAMES:
        print(f" {name[:8]:>8s}", end="")
    print()
    for i, row in enumerate(cm):
        print(f"  {CLASS_NAMES[i]:>20s}", end="")
        for val in row:
            print(f" {val:>8d}", end="")
        print()

    # ── Save some test samples as images for verification ──
    print(f"\n[5/5] Saving sample test images to {SAMPLE_DIR}...")
    np.random.seed(42)
    for class_id in range(NUM_CLASSES):
        idxs = np.where(test_lbls.flatten() == class_id)[0]
        chosen = np.random.choice(idxs, min(3, len(idxs)), replace=False)
        for j, idx in enumerate(chosen):
            img = Image.fromarray(test_imgs[idx])
            pred_label = CLASS_NAMES[all_preds[idx]]
            true_label = CLASS_NAMES[class_id]
            conf = all_probs[idx][all_preds[idx]]
            fname = f"class{class_id}_{true_label.replace(' ', '_')}_sample{j}_pred_{pred_label.replace(' ', '_')}_{conf:.2f}.png"
            img.save(os.path.join(SAMPLE_DIR, fname))

    print(f"  Saved {min(3, len(idxs)) * NUM_CLASSES} sample images")

    # Save accuracy info
    with open(os.path.join(MODEL_DIR, "training_info.txt"), "w", encoding="utf-8") as f:
        f.write(f"Test Accuracy: {test_acc:.4f}\n")
        f.write(f"Best Val Accuracy: {best_val_acc:.4f}\n")
        f.write(f"Best Epoch: {best_epoch}\n")
        f.write(f"Training Time: {elapsed:.1f}s\n")
        f.write(f"\nClassification Report:\n{report}\n")
        f.write(f"\nConfusion Matrix:\n{cm}\n")

    print("\n" + "=" * 60)
    print(f"  [OK] Model saved to: {MODEL_PATH}")
    print(f"  [OK] Test Accuracy: {test_acc*100:.1f}%")
    print("=" * 60)

    return test_acc


if __name__ == "__main__":
    train()
