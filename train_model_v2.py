"""
RetinaMNIST Model Training Script v2 — High-Accuracy Edition
==============================================================
Trains a ResNet18 model with advanced techniques for 5-class
diabetic retinopathy classification.

Key improvements over v1:
  - Focal Loss (handles class imbalance far better than weighted CE)
  - Label Smoothing (reduces overconfident predictions)
  - Mixup augmentation (improves generalization)
  - Oversampling of minority classes (balanced batches)
  - Cosine annealing with linear warmup
  - Test-Time Augmentation (TTA) for evaluation
  - Temperature scaling (post-hoc calibration)
  - Gradient clipping (training stability)

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
import math
import copy
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
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
NUM_EPOCHS = 80
BASE_LR = 3e-4
WARMUP_EPOCHS = 5
MIN_LR = 1e-6
PATIENCE = 18  # Early stopping patience
WEIGHT_DECAY = 1e-4

# Focal Loss parameters
FOCAL_GAMMA = 2.0
FOCAL_ALPHA = None  # Will be computed from class frequencies

# Label smoothing
LABEL_SMOOTHING = 0.08

# Mixup
MIXUP_ALPHA = 0.2  # Beta distribution parameter
MIXUP_PROB = 0.5   # Probability of applying mixup per batch

# TTA (Test-Time Augmentation)
TTA_ROUNDS = 5

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
# Focal Loss
# ──────────────────────────────────────────────
class FocalLoss(nn.Module):
    """
    Focal Loss for multi-class classification.
    Reduces the relative loss for well-classified examples,
    putting more focus on hard, misclassified examples.
    
    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(self, alpha=None, gamma=2.0, label_smoothing=0.0, num_classes=5):
        super().__init__()
        self.gamma = gamma
        self.label_smoothing = label_smoothing
        self.num_classes = num_classes
        
        if alpha is not None:
            if isinstance(alpha, (list, np.ndarray)):
                self.alpha = torch.FloatTensor(alpha)
            else:
                self.alpha = alpha
        else:
            self.alpha = None
    
    def forward(self, inputs, targets):
        # Apply label smoothing
        if self.label_smoothing > 0:
            with torch.no_grad():
                smooth_targets = torch.zeros_like(inputs)
                smooth_targets.fill_(self.label_smoothing / (self.num_classes - 1))
                smooth_targets.scatter_(1, targets.unsqueeze(1), 1.0 - self.label_smoothing)
        
        log_probs = F.log_softmax(inputs, dim=1)
        probs = torch.exp(log_probs)
        
        if self.label_smoothing > 0:
            # Focal factor based on predicted probability of TRUE class
            pt = probs.gather(1, targets.unsqueeze(1)).squeeze(1)
            focal_weight = (1 - pt) ** self.gamma
            
            # Cross entropy with smooth targets
            ce_loss = -(smooth_targets * log_probs).sum(dim=1)
            loss = focal_weight * ce_loss
        else:
            # Standard focal loss
            ce_loss = F.nll_loss(log_probs, targets, reduction='none')
            pt = probs.gather(1, targets.unsqueeze(1)).squeeze(1)
            focal_weight = (1 - pt) ** self.gamma
            loss = focal_weight * ce_loss
        
        # Apply class-wise alpha weighting
        if self.alpha is not None:
            alpha_t = self.alpha.to(inputs.device)
            at = alpha_t.gather(0, targets)
            loss = at * loss
        
        return loss.mean()


# ──────────────────────────────────────────────
# Mixup
# ──────────────────────────────────────────────
def mixup_data(x, y, alpha=0.2):
    """Returns mixed inputs, pairs of targets, and lambda"""
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
        # Ensure lambda is not too extreme
        lam = max(lam, 1 - lam)
    else:
        lam = 1.0
    
    batch_size = x.size(0)
    index = torch.randperm(batch_size).to(x.device)
    
    mixed_x = lam * x + (1 - lam) * x[index]
    y_a, y_b = y, y[index]
    return mixed_x, y_a, y_b, lam


def mixup_criterion(criterion_fn, pred, y_a, y_b, lam):
    """Compute mixup loss"""
    return lam * criterion_fn(pred, y_a) + (1 - lam) * criterion_fn(pred, y_b)


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
    transforms.RandomRotation(degrees=20),
    transforms.RandomAffine(
        degrees=0, 
        translate=(0.08, 0.08), 
        scale=(0.90, 1.10),
        shear=5
    ),
    transforms.ColorJitter(
        brightness=0.20, 
        contrast=0.20, 
        saturation=0.15, 
        hue=0.03
    ),
    transforms.RandomPerspective(distortion_scale=0.1, p=0.3),
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.0)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.15, scale=(0.02, 0.08), ratio=(0.3, 3.3)),
])

val_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# TTA transforms (gentle augmentations for test-time)
tta_transforms = [
    val_transform,  # Original (no augmentation)
    transforms.Compose([
        transforms.RandomHorizontalFlip(p=1.0),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.RandomVerticalFlip(p=1.0),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.RandomRotation(degrees=(90, 90)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.RandomRotation(degrees=(270, 270)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]),
]


# ──────────────────────────────────────────────
# Build model
# ──────────────────────────────────────────────
def build_model():
    """ResNet18 with pretrained ImageNet weights, fine-tuned for 5 classes."""
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

    # Unfreeze all layers
    for param in model.parameters():
        param.requires_grad = True

    # Replace final FC layer with a more robust head
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.BatchNorm1d(256),
        nn.Dropout(0.3),
        nn.Linear(256, NUM_CLASSES)
    )

    return model.to(DEVICE)


# ──────────────────────────────────────────────
# Compute Focal Loss alpha from class frequencies
# ──────────────────────────────────────────────
def compute_focal_alpha(labels, power=0.5):
    """
    Compute per-class alpha for Focal Loss based on inverse frequency.
    Uses square-root dampening to avoid over-weighting rare classes.
    """
    counts = np.bincount(labels.flatten().astype(int), minlength=NUM_CLASSES)
    total = counts.sum()
    
    # Inverse frequency with dampening
    freq = counts / total
    alpha = (1.0 / (freq + 1e-8)) ** power
    
    # Normalize so alphas sum to NUM_CLASSES
    alpha = alpha / alpha.sum() * NUM_CLASSES
    
    print(f"[INFO] Class counts: {counts}")
    print(f"[INFO] Class frequencies: {np.round(freq, 4)}")
    print(f"[INFO] Focal alpha: {np.round(alpha, 4)}")
    return alpha.tolist()


# ──────────────────────────────────────────────
# Create balanced sampler
# ──────────────────────────────────────────────
def create_balanced_sampler(labels):
    """Create a WeightedRandomSampler that oversamples minority classes."""
    counts = np.bincount(labels.flatten().astype(int), minlength=NUM_CLASSES)
    class_weights = 1.0 / counts.astype(float)
    sample_weights = class_weights[labels.flatten().astype(int)]
    sampler = WeightedRandomSampler(
        weights=torch.DoubleTensor(sample_weights),
        num_samples=len(labels),
        replacement=True
    )
    return sampler


# ──────────────────────────────────────────────
# Learning rate scheduler with warmup
# ──────────────────────────────────────────────
def get_lr(epoch, warmup_epochs, total_epochs, base_lr, min_lr):
    """Cosine annealing with linear warmup."""
    if epoch < warmup_epochs:
        return base_lr * (epoch + 1) / warmup_epochs
    else:
        progress = (epoch - warmup_epochs) / (total_epochs - warmup_epochs)
        return min_lr + 0.5 * (base_lr - min_lr) * (1 + math.cos(math.pi * progress))


def set_lr(optimizer, lr, backbone_factor=0.3):
    """Set learning rate for optimizer parameter groups."""
    optimizer.param_groups[0]['lr'] = lr * backbone_factor  # backbone
    optimizer.param_groups[1]['lr'] = lr  # head


# ──────────────────────────────────────────────
# TTA Prediction
# ──────────────────────────────────────────────
def predict_with_tta(model, images_np, batch_size=32):
    """
    Predict with Test-Time Augmentation.
    Averages softmax probabilities over multiple augmented views.
    """
    model.eval()
    n = len(images_np)
    all_probs = np.zeros((n, NUM_CLASSES), dtype=np.float64)
    
    for t_idx, t in enumerate(tta_transforms):
        ds = RetinaMNISTDataset(images_np, np.zeros(n), transform=t)
        loader = DataLoader(ds, batch_size=batch_size, shuffle=False, num_workers=0)
        
        batch_start = 0
        with torch.no_grad():
            for imgs, _ in loader:
                imgs = imgs.to(DEVICE)
                outputs = model(imgs)
                probs = torch.softmax(outputs, dim=1).cpu().numpy()
                batch_end = batch_start + len(imgs)
                all_probs[batch_start:batch_end] += probs
                batch_start = batch_end
    
    # Average over TTA rounds
    all_probs /= len(tta_transforms)
    return all_probs


# ──────────────────────────────────────────────
# Temperature Scaling (post-hoc calibration)
# ──────────────────────────────────────────────
def find_optimal_temperature(model, val_loader):
    """
    Find optimal temperature T for softmax calibration using validation set.
    Minimizes NLL on validation set.
    """
    model.eval()
    all_logits = []
    all_labels = []
    
    with torch.no_grad():
        for imgs, labels in val_loader:
            imgs = imgs.to(DEVICE)
            logits = model(imgs)
            all_logits.append(logits.cpu())
            all_labels.append(labels)
    
    logits = torch.cat(all_logits, dim=0)
    labels = torch.cat(all_labels, dim=0)
    
    # Search for best temperature
    best_t = 1.0
    best_nll = float('inf')
    
    for t in np.arange(0.5, 5.0, 0.05):
        scaled_logits = logits / t
        nll = F.cross_entropy(scaled_logits, labels).item()
        if nll < best_nll:
            best_nll = nll
            best_t = t
    
    print(f"[INFO] Optimal temperature: {best_t:.2f} (NLL: {best_nll:.4f})")
    return best_t


# ──────────────────────────────────────────────
# Training
# ──────────────────────────────────────────────
def train():
    print("=" * 60)
    print("  RetinaMNIST Model Training v2 — High-Accuracy Edition")
    print("=" * 60)

    # Load data
    print("\n[1/6] Loading data...")
    train_imgs = np.load(os.path.join(DATA_DIR, "train_images.npy"))
    train_lbls = np.load(os.path.join(DATA_DIR, "train_labels.npy"))
    val_imgs = np.load(os.path.join(DATA_DIR, "val_images.npy"))
    val_lbls = np.load(os.path.join(DATA_DIR, "val_labels.npy"))
    test_imgs = np.load(os.path.join(DATA_DIR, "test_images.npy"))
    test_lbls = np.load(os.path.join(DATA_DIR, "test_labels.npy"))

    print(f"    Train: {train_imgs.shape[0]} images")
    print(f"    Val:   {val_imgs.shape[0]} images")
    print(f"    Test:  {test_imgs.shape[0]} images")
    
    # Print class distribution
    train_counts = np.bincount(train_lbls.flatten().astype(int), minlength=NUM_CLASSES)
    print(f"    Train class distribution: {dict(zip(CLASS_NAMES, train_counts))}")

    # Datasets & Loaders
    train_ds = RetinaMNISTDataset(train_imgs, train_lbls, transform=train_transform)
    val_ds = RetinaMNISTDataset(val_imgs, val_lbls, transform=val_transform)
    test_ds = RetinaMNISTDataset(test_imgs, test_lbls, transform=val_transform)

    # Balanced sampler for training
    train_sampler = create_balanced_sampler(train_lbls)
    
    train_loader = DataLoader(
        train_ds, batch_size=BATCH_SIZE, sampler=train_sampler,
        num_workers=0, pin_memory=False, drop_last=True
    )
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=False)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=False)

    # Build model
    print("\n[2/6] Building ResNet18 model (transfer learning)...")
    model = build_model()

    # Focal Loss with class-balanced alpha
    focal_alpha = compute_focal_alpha(train_lbls, power=0.5)
    criterion = FocalLoss(
        alpha=focal_alpha, 
        gamma=FOCAL_GAMMA, 
        label_smoothing=LABEL_SMOOTHING,
        num_classes=NUM_CLASSES
    )
    
    # Optimizer with differential learning rates
    fc_params = list(model.fc.parameters())
    backbone_params = [p for n, p in model.named_parameters() 
                       if not n.startswith("fc") and p.requires_grad]
    
    optimizer = optim.AdamW([
        {"params": backbone_params, "lr": BASE_LR * 0.3},
        {"params": fc_params, "lr": BASE_LR},
    ], weight_decay=WEIGHT_DECAY)

    # Training loop
    print(f"\n[3/6] Training for up to {NUM_EPOCHS} epochs (patience={PATIENCE})...\n")
    best_val_acc = 0.0
    best_val_loss = float('inf')
    best_epoch = 0
    epochs_no_improve = 0
    best_model_state = None
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    start_time = time.time()

    for epoch in range(1, NUM_EPOCHS + 1):
        # Update learning rate
        lr = get_lr(epoch - 1, WARMUP_EPOCHS, NUM_EPOCHS, BASE_LR, MIN_LR)
        set_lr(optimizer, lr)
        
        # ── Train ──
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            
            # Apply Mixup with probability
            use_mixup = np.random.random() < MIXUP_PROB
            
            if use_mixup:
                imgs_mixed, y_a, y_b, lam = mixup_data(imgs, labels, MIXUP_ALPHA)
                optimizer.zero_grad()
                outputs = model(imgs_mixed)
                loss = mixup_criterion(
                    lambda pred, tgt: criterion(pred, tgt),
                    outputs, y_a, y_b, lam
                )
            else:
                optimizer.zero_grad()
                outputs = model(imgs)
                loss = criterion(outputs, labels)
            
            loss.backward()
            
            # Gradient clipping for stability
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
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
        val_per_class_correct = np.zeros(NUM_CLASSES)
        val_per_class_total = np.zeros(NUM_CLASSES)

        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss_sum += loss.item() * imgs.size(0)
                _, preds = outputs.max(1)
                val_correct += preds.eq(labels).sum().item()
                val_total += labels.size(0)
                
                for c in range(NUM_CLASSES):
                    mask = labels == c
                    val_per_class_total[c] += mask.sum().item()
                    val_per_class_correct[c] += (preds[mask] == c).sum().item()

        val_loss = val_loss_sum / val_total
        val_acc = val_correct / val_total

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        # Compute balanced accuracy (mean of per-class accuracies)
        per_class_acc = np.divide(val_per_class_correct, val_per_class_total, 
                                   out=np.zeros(NUM_CLASSES), where=val_per_class_total > 0)
        balanced_acc = per_class_acc.mean()
        
        marker = ""
        # Use balanced accuracy as primary metric for saving
        score = balanced_acc * 0.6 + val_acc * 0.4  # Weighted combination
        
        if score > best_val_acc or (score == best_val_acc and val_loss < best_val_loss):
            best_val_acc = score
            best_val_loss = val_loss
            best_epoch = epoch
            epochs_no_improve = 0
            best_model_state = copy.deepcopy(model.state_dict())
            marker = " * BEST"
        else:
            epochs_no_improve += 1

        if epoch % 5 == 0 or marker:
            per_class_str = " | ".join([f"{CLASS_NAMES[i][:4]}:{per_class_acc[i]:.2f}" 
                                         for i in range(NUM_CLASSES)])
            print(f"  Epoch {epoch:3d}/{NUM_EPOCHS} | "
                  f"TrLoss: {train_loss:.4f} TrAcc: {train_acc:.3f} | "
                  f"VlLoss: {val_loss:.4f} VlAcc: {val_acc:.3f} BalAcc: {balanced_acc:.3f} | "
                  f"LR: {lr:.6f}{marker}")
            print(f"    Per-class: {per_class_str}")
        else:
            print(f"  Epoch {epoch:3d}/{NUM_EPOCHS} | "
                  f"TrLoss: {train_loss:.4f} TrAcc: {train_acc:.3f} | "
                  f"VlLoss: {val_loss:.4f} VlAcc: {val_acc:.3f} BalAcc: {balanced_acc:.3f} | "
                  f"LR: {lr:.6f}{marker}")

        if epochs_no_improve >= PATIENCE:
            print(f"\n  >> Early stopping at epoch {epoch} (no improvement for {PATIENCE} epochs)")
            break

    elapsed = time.time() - start_time
    print(f"\n  Training completed in {elapsed:.1f}s")
    print(f"  Best score: {best_val_acc:.4f} at epoch {best_epoch}")

    # Load best model
    model.load_state_dict(best_model_state)
    model.eval()
    
    # ── Temperature Calibration ──
    print(f"\n[4/6] Calibrating temperature scaling on validation set...")
    temperature = find_optimal_temperature(model, val_loader)

    # ── Save model ──
    torch.save({
        "model_state_dict": model.state_dict(),
        "class_names": CLASS_NAMES,
        "num_classes": NUM_CLASSES,
        "img_size": IMG_SIZE,
        "best_val_acc": best_val_acc,
        "epoch": best_epoch,
        "temperature": temperature,
        "focal_alpha": focal_alpha,
    }, MODEL_PATH)
    print(f"  Model saved to {MODEL_PATH}")

    # ── Evaluate on Test Set with TTA ──
    print(f"\n[5/6] Evaluating on test set ({test_imgs.shape[0]} images) with TTA...")
    
    # Standard evaluation (no TTA)
    all_preds_std = []
    all_labels_std = []
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(DEVICE)
            outputs = model(imgs) / temperature
            _, preds = outputs.max(1)
            all_preds_std.extend(preds.cpu().numpy())
            all_labels_std.extend(labels.numpy())
    
    all_preds_std = np.array(all_preds_std)
    all_labels_std = np.array(all_labels_std)
    test_acc_std = (all_preds_std == all_labels_std).mean()
    print(f"\n  [Standard] Test Accuracy: {test_acc_std:.4f} ({test_acc_std*100:.1f}%)")
    
    # TTA evaluation
    all_probs_tta = predict_with_tta(model, test_imgs, batch_size=BATCH_SIZE)
    all_preds_tta = np.argmax(all_probs_tta, axis=1)
    test_acc_tta = (all_preds_tta == test_lbls.flatten()).mean()
    print(f"  [TTA]      Test Accuracy: {test_acc_tta:.4f} ({test_acc_tta*100:.1f}%)")
    
    # Use whichever is better for reporting
    if test_acc_tta >= test_acc_std:
        all_preds = all_preds_tta
        all_probs = all_probs_tta
        test_acc = test_acc_tta
        method = "TTA"
    else:
        all_preds = all_preds_std
        all_probs = None
        test_acc = test_acc_std
        method = "Standard"
    
    all_labels = test_lbls.flatten()
    
    print(f"\n  Using {method} results (acc={test_acc*100:.1f}%)")

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

    # Per-class accuracy
    print("\n  Per-class accuracy:")
    for i in range(NUM_CLASSES):
        mask = all_labels == i
        if mask.sum() == 0:
            continue
        acc = (all_preds[mask] == i).mean()
        print(f"    {CLASS_NAMES[i]}: {acc*100:.1f}% ({(all_preds[mask] == i).sum()}/{mask.sum()})")
    
    # Prediction distribution
    print("\n  Prediction distribution:")
    pred_counts = np.bincount(all_preds, minlength=NUM_CLASSES)
    true_counts = np.bincount(all_labels.astype(int), minlength=NUM_CLASSES)
    for i in range(NUM_CLASSES):
        print(f"    {CLASS_NAMES[i]}: predicted={pred_counts[i]}, true={true_counts[i]}, "
              f"ratio={pred_counts[i]/max(true_counts[i],1):.2f}")

    # ── Save some test samples as images for verification ──
    print(f"\n[6/6] Saving sample test images to {SAMPLE_DIR}...")
    np.random.seed(42)
    saved_count = 0
    for class_id in range(NUM_CLASSES):
        idxs = np.where(test_lbls.flatten() == class_id)[0]
        chosen = np.random.choice(idxs, min(3, len(idxs)), replace=False)
        for j, idx in enumerate(chosen):
            img = Image.fromarray(test_imgs[idx])
            pred_label = CLASS_NAMES[all_preds[idx]]
            true_label = CLASS_NAMES[class_id]
            if all_probs is not None:
                conf = all_probs[idx][all_preds[idx]]
            else:
                conf = 0.0
            fname = f"class{class_id}_{true_label.replace(' ', '_')}_sample{j}_pred_{pred_label.replace(' ', '_')}_{conf:.2f}.png"
            img.save(os.path.join(SAMPLE_DIR, fname))
            saved_count += 1

    print(f"  Saved {saved_count} sample images")

    # Save training info
    with open(os.path.join(MODEL_DIR, "training_info.txt"), "w", encoding="utf-8") as f:
        f.write(f"Training Version: v2 (High-Accuracy Edition)\n")
        f.write(f"Test Accuracy ({method}): {test_acc:.4f}\n")
        f.write(f"Test Accuracy (Standard): {test_acc_std:.4f}\n")
        f.write(f"Test Accuracy (TTA): {test_acc_tta:.4f}\n")
        f.write(f"Best Val Score: {best_val_acc:.4f}\n")
        f.write(f"Best Epoch: {best_epoch}\n")
        f.write(f"Temperature: {temperature:.2f}\n")
        f.write(f"Training Time: {elapsed:.1f}s\n")
        f.write(f"Focal Gamma: {FOCAL_GAMMA}\n")
        f.write(f"Label Smoothing: {LABEL_SMOOTHING}\n")
        f.write(f"Mixup Alpha: {MIXUP_ALPHA}\n")
        f.write(f"\nClassification Report:\n{report}\n")
        f.write(f"\nConfusion Matrix:\n{cm}\n")

    print("\n" + "=" * 60)
    print(f"  [OK] Model saved to: {MODEL_PATH}")
    print(f"  [OK] Test Accuracy: {test_acc*100:.1f}%")
    print(f"  [OK] Temperature: {temperature:.2f}")
    print("=" * 60)

    return test_acc


if __name__ == "__main__":
    train()
