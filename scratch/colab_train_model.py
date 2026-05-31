#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
====================================================================
 RetinaScan AI — RetinaMNIST Training Script (Universal)
 Works on Google Colab, Windows, Mac, Linux — Zero Config Needed
 Solves Class Imbalance (the reason model always predicts "Normal")
====================================================================

 HOW TO USE (Google Colab):
 1. Upload this .py file AND the "retinamnist_224.npz" folder to Colab
 2. In a code cell run:   !pip install torch torchvision scikit-learn matplotlib
 3. In a code cell run:   !python colab_train_model.py
 4. Download "retina_model_best.pth" when done

 HOW TO USE (Local PC):
 1. Put this .py file in the SAME folder as "retinamnist_224.npz"
 2. Run:  python colab_train_model.py
====================================================================
"""

import os
import sys
import glob
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from sklearn.metrics import classification_report, f1_score, confusion_matrix
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend (works on servers too)
import matplotlib.pyplot as plt

# =====================================================================
# 1. AUTO-DETECT DATASET PATH (works on ANY machine)
# =====================================================================
def find_dataset():
    """
    Searches for the retinamnist_224.npz folder automatically.
    Checks these locations in order:
      1. Same directory as this script
      2. Current working directory
      3. Google Colab /content/
      4. Parent directory
      5. User's Desktop
      6. Deep search in common locations
    """
    # The key file we look for inside the dataset folder
    KEY_FILE = "train_images.npy"
    
    # Candidate base directories to search
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cwd = os.getcwd()
    
    search_dirs = [
        script_dir,                                          # next to this .py file
        cwd,                                                 # current working directory
        "/content",                                          # Google Colab default
        os.path.join(script_dir, ".."),                      # parent of script
        os.path.join(cwd, ".."),                             # parent of cwd
        os.path.expanduser("~/Desktop"),                     # user's Desktop
        os.path.expanduser("~"),                             # user's Home
    ]
    
    # Common dataset folder names
    folder_names = [
        "retinamnist_224.npz",
        "retinamnist_224",
        "retinamnist",
        "dataset",
        "data",
    ]
    
    print("[*] Searching for dataset...")
    
    for base in search_dirs:
        if not os.path.isdir(base):
            continue
            
        # Check if KEY_FILE is directly in base (flat structure)
        if os.path.isfile(os.path.join(base, KEY_FILE)):
            print(f"[OK] Found dataset at: {base}")
            return base
        
        # Check named subfolders
        for name in folder_names:
            candidate = os.path.join(base, name)
            if os.path.isdir(candidate) and os.path.isfile(os.path.join(candidate, KEY_FILE)):
                print(f"[OK] Found dataset at: {candidate}")
                return candidate
    
    # Last resort: walk the script directory tree (max 3 levels deep)
    for base in [script_dir, cwd]:
        for root, dirs, files in os.walk(base):
            depth = root.replace(base, '').count(os.sep)
            if depth > 3:
                continue
            if KEY_FILE in files:
                print(f"[OK] Found dataset at: {root}")
                return root
    
    # Nothing found
    print("\n[ERROR] Could not find the dataset automatically!")
    print("   Please make sure the folder 'retinamnist_224.npz' is in")
    print("   the same directory as this script, or in /content/ on Colab.")
    print(f"\n   Script location: {script_dir}")
    print(f"   Working dir:     {cwd}")
    sys.exit(1)


# =====================================================================
# 2. CONFIGURATION
# =====================================================================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = 32
EPOCHS = 15
LEARNING_RATE = 1e-4
NUM_CLASSES = 5  # 0=Normal, 1=Mild, 2=Moderate, 3=Severe, 4=Proliferative

print("=" * 60)
print("  RetinaScan AI - Model Training")
print("=" * 60)
print(f"  Device: {device}")
if torch.cuda.is_available():
    print(f"  GPU:    {torch.cuda.get_device_name(0)}")
else:
    print("  [!] WARNING: No GPU detected. Training will be slow.")
    print("    On Colab: Runtime > Change runtime type > T4 GPU")
print("=" * 60)

DATA_DIR = find_dataset()


# =====================================================================
# 3. DATASET CLASS
# =====================================================================
class RetinaDataset(Dataset):
    def __init__(self, images_path, labels_path, transform=None):
        self.images = np.load(images_path)
        self.labels = np.load(labels_path).squeeze()
        self.transform = transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img = self.images[idx]
        label = int(self.labels[idx])

        # Ensure 3 channels (RGB) for pretrained models
        if len(img.shape) == 2:
            img = np.stack([img, img, img], axis=-1)
        elif img.shape[-1] == 1:
            img = np.concatenate([img, img, img], axis=-1)

        if self.transform:
            img = self.transform(img)
        else:
            img = torch.tensor(img, dtype=torch.float32).permute(2, 0, 1) / 255.0

        return img, label


# =====================================================================
# 4. DATA AUGMENTATION (Critical for medical retinal images)
# =====================================================================
train_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.5),
    transforms.RandomRotation(degrees=25),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


# =====================================================================
# 5. LOAD DATA + SOLVE CLASS IMBALANCE
# =====================================================================
def load_data():
    train_dataset = RetinaDataset(
        os.path.join(DATA_DIR, "train_images.npy"),
        os.path.join(DATA_DIR, "train_labels.npy"),
        transform=train_transform
    )
    val_dataset = RetinaDataset(
        os.path.join(DATA_DIR, "val_images.npy"),
        os.path.join(DATA_DIR, "val_labels.npy"),
        transform=val_transform
    )
    test_dataset = RetinaDataset(
        os.path.join(DATA_DIR, "test_images.npy"),
        os.path.join(DATA_DIR, "test_labels.npy"),
        transform=val_transform
    )

    labels = train_dataset.labels
    class_counts = np.bincount(labels, minlength=NUM_CLASSES)

    print(f"\n[DATA] Training samples: {len(labels)}")
    print(f"[DATA] Validation samples: {len(val_dataset)}")
    print(f"[DATA] Test samples: {len(test_dataset)}")
    print("\n--- Class Distribution (THIS is why model predicts 'Normal' always) ---")
    stage_names = ["Normal", "Mild", "Moderate", "Severe", "Proliferative"]
    for i, count in enumerate(class_counts):
        bar = "#" * int(count / max(class_counts) * 30)
        print(f"  Stage {i} ({stage_names[i]:>14}): {count:>5} samples ({count/len(labels)*100:5.1f}%) {bar}")

    # ──────────────────────────────────────────────────────────
    # FIX #1: WeightedRandomSampler
    #   Forces every training batch to contain EQUAL representation
    #   of all classes. Without this, model sees 80% Normal images
    #   and learns the shortcut of always predicting Normal.
    # ──────────────────────────────────────────────────────────
    class_weights = 1.0 / class_counts.astype(np.float64)
    sample_weights = np.array([class_weights[l] for l in labels])
    sampler = torch.utils.data.WeightedRandomSampler(
        weights=torch.from_numpy(sample_weights).double(),
        num_samples=len(sample_weights),
        replacement=True
    )

    # ──────────────────────────────────────────────────────────
    # FIX #2: Weighted Cross Entropy Loss
    #   Makes misclassifying a rare "Severe" case 10x more costly
    #   than misclassifying a common "Normal" case.
    # ──────────────────────────────────────────────────────────
    loss_weights = len(labels) / (NUM_CLASSES * class_counts.astype(np.float64))
    loss_weights_tensor = torch.FloatTensor(loss_weights).to(device)
    print(f"\n[WEIGHTS] Loss weights (higher = model pays more attention):")
    for i, w in enumerate(loss_weights):
        print(f"  Stage {i} ({stage_names[i]:>14}): {w:.3f}x")

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, sampler=sampler, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    return train_loader, val_loader, test_loader, loss_weights_tensor


# =====================================================================
# 6. MODEL (ResNet34 Transfer Learning)
# =====================================================================
def build_model():
    print("\n[MODEL] Loading pretrained ResNet34...")
    model = models.resnet34(weights=models.ResNet34_Weights.DEFAULT)

    # Freeze early layers (keep general visual features from ImageNet)
    for param in list(model.parameters())[:-15]:
        param.requires_grad = False

    # Replace final classifier for our 5 retinopathy stages
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Linear(num_features, 256),
        nn.ReLU(),
        nn.Dropout(0.4),
        nn.Linear(256, NUM_CLASSES)
    )

    return model.to(device)


# =====================================================================
# 7. TRAINING LOOP
# =====================================================================
def train_model(model, train_loader, val_loader, loss_weights):
    criterion = nn.CrossEntropyLoss(weight=loss_weights)
    optimizer = optim.Adam(model.fc.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=2, factor=0.5)

    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": [], "val_f1": []}
    best_val_f1 = 0.0
    save_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "retina_model_best.pth")

    print("\n>>> Training started...\n")
    for epoch in range(EPOCHS):
        # --- Train ---
        model.train()
        train_loss, correct, total = 0.0, 0, 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        t_loss = train_loss / total
        t_acc = correct / total

        # --- Validate ---
        model.eval()
        val_loss, correct, total = 0.0, 0, 0
        all_preds, all_labels = [], []

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        v_loss = val_loss / total
        v_acc = correct / total
        v_f1 = f1_score(all_labels, all_preds, average='macro', zero_division=0)

        scheduler.step(v_loss)

        history["train_loss"].append(t_loss)
        history["val_loss"].append(v_loss)
        history["train_acc"].append(t_acc)
        history["val_acc"].append(v_acc)
        history["val_f1"].append(v_f1)

        saved = ""
        if v_f1 > best_val_f1:
            best_val_f1 = v_f1
            torch.save(model.state_dict(), save_path)
            saved = " << SAVED BEST >>"

        print(f"  Epoch {epoch+1:>2}/{EPOCHS} | "
              f"T.Loss {t_loss:.4f} | T.Acc {t_acc*100:5.1f}% | "
              f"V.Loss {v_loss:.4f} | V.Acc {v_acc*100:5.1f}% | "
              f"F1 {v_f1:.4f}{saved}")

    print(f"\n[DONE] Training complete! Best F1: {best_val_f1:.4f}")
    print(f"[SAVE] Model saved to: {save_path}")
    return history, save_path


# =====================================================================
# 8. EVALUATION ON TEST SET
# =====================================================================
def evaluate_model(model, test_loader, model_path):
    print("\n" + "=" * 60)
    print("  FINAL EVALUATION ON INDEPENDENT TEST SET")
    print("=" * 60)

    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())

    names = ["Normal", "Mild", "Moderate", "Severe", "Proliferative"]
    print("\n" + classification_report(all_labels, all_preds, target_names=names, zero_division=0))

    cm = confusion_matrix(all_labels, all_preds)
    print("Confusion Matrix:")
    print(cm)


# =====================================================================
# 9. PLOT TRAINING CURVES
# =====================================================================
def plot_history(history):
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))

    axes[0].plot(history["train_loss"], label="Train", color="#00D4FF")
    axes[0].plot(history["val_loss"], label="Val", color="#FF4757")
    axes[0].set_title("Loss"); axes[0].legend()

    axes[1].plot(history["train_acc"], label="Train", color="#00D4FF")
    axes[1].plot(history["val_acc"], label="Val", color="#FF4757")
    axes[1].set_title("Accuracy"); axes[1].legend()

    axes[2].plot(history["val_f1"], label="Val F1 (Macro)", color="#00C9A7", linewidth=2)
    axes[2].set_title("F1-Score (key metric)"); axes[2].legend()

    for ax in axes:
        ax.set_xlabel("Epoch"); ax.grid(alpha=0.3)

    plot_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "training_curves.png")
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)
    print(f"\n[PLOT] Curves saved to: {plot_path}")


# =====================================================================
# 10. RUN EVERYTHING
# =====================================================================
if __name__ == "__main__":
    train_loader, val_loader, test_loader, loss_weights = load_data()
    model = build_model()
    history, model_path = train_model(model, train_loader, val_loader, loss_weights)
    evaluate_model(model, test_loader, model_path)
    plot_history(history)

    print("\n" + "=" * 60)
    print("  ALL DONE!")
    print(f"  Send 'retina_model_best.pth' to integrate with the website")
    print("=" * 60)
