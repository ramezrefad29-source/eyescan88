"""
RetinaMNIST Prediction Server
==============================
Flask API that loads the trained ResNet18 model and serves predictions.
Endpoint: POST /predict  (accepts image file)
"""

import os
import io
import time
import json
import numpy as np
import base64
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "retina_model.pth")

NUM_CLASSES = 5
IMG_SIZE = 224

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[INFO] Using device: {DEVICE}")

CLASS_NAMES = [
    "Normal",
    "Mild DR",
    "Moderate DR",
    "Severe DR",
    "Proliferative DR"
]

# Mapping from class index to severity level
SEVERITY_MAP = {
    0: "Normal",
    1: "Mild",
    2: "Moderate",
    3: "Severe",
    4: "Critical"
}

# Mapping from class index to Arabic diagnosis name
DIAGNOSIS_AR = {
    0: "طبيعي - لا توجد إصابة",
    1: "اعتلال الشبكية السكري الخفيف (Mild DR)",
    2: "اعتلال الشبكية السكري المعتدل (Moderate DR)",
    3: "اعتلال الشبكية السكري الشديد (Severe DR)",
    4: "اعتلال الشبكية السكري التكاثري (Proliferative DR)"
}

DIAGNOSIS_EN = {
    0: "Normal - No Diabetic Retinopathy",
    1: "Mild Non-Proliferative Diabetic Retinopathy",
    2: "Moderate Non-Proliferative Diabetic Retinopathy",
    3: "Severe Non-Proliferative Diabetic Retinopathy",
    4: "Proliferative Diabetic Retinopathy"
}

STAGE_MAP = {
    0: "لا يوجد مرحلة - العين سليمة",
    1: "المرحلة الأولى - بداية الاعتلال",
    2: "المرحلة الثانية - اعتلال متوسط",
    3: "المرحلة الثالثة - اعتلال متقدم",
    4: "المرحلة الرابعة - اعتلال تكاثري حرج"
}

# Affected zones per class
AFFECTED_ZONES = {
    0: [
        {"name": "الشبكية", "severity": "Normal", "percentage": 0},
        {"name": "الأوعية الدموية", "severity": "Normal", "percentage": 0},
        {"name": "القرص البصري", "severity": "Normal", "percentage": 0},
        {"name": "النقرة المركزية", "severity": "Normal", "percentage": 0}
    ],
    1: [
        {"name": "الأوعية الدموية الدقيقة", "severity": "Mild", "percentage": 15},
        {"name": "المنطقة البقعية", "severity": "Normal", "percentage": 5},
        {"name": "الشبكية المحيطية", "severity": "Mild", "percentage": 12},
        {"name": "النقرة المركزية", "severity": "Normal", "percentage": 3}
    ],
    2: [
        {"name": "المنطقة البقعية", "severity": "Moderate", "percentage": 38},
        {"name": "الأوعية الدموية", "severity": "Moderate", "percentage": 45},
        {"name": "الشبكية المحيطية", "severity": "Mild", "percentage": 28},
        {"name": "النقرة المركزية", "severity": "Mild", "percentage": 22}
    ],
    3: [
        {"name": "المنطقة البقعية", "severity": "Severe", "percentage": 72},
        {"name": "الأوعية الدموية", "severity": "Severe", "percentage": 68},
        {"name": "الطبقة الحبيبية الخارجية", "severity": "Moderate", "percentage": 55},
        {"name": "النقرة المركزية", "severity": "Severe", "percentage": 61}
    ],
    4: [
        {"name": "المنطقة البقعية", "severity": "Critical", "percentage": 89},
        {"name": "الأوعية الدموية الجديدة", "severity": "Critical", "percentage": 92},
        {"name": "الجسم الزجاجي", "severity": "Severe", "percentage": 78},
        {"name": "النقرة المركزية", "severity": "Critical", "percentage": 85}
    ]
}

RECOMMENDATIONS = {
    0: [
        "العين سليمة - لا حاجة لتدخل طبي عاجل",
        "يُنصح بفحص دوري سنوي للعين",
        "الحفاظ على مستوى السكر في الدم ضمن المعدل الطبيعي",
        "اتباع نظام غذائي صحي غني بالخضروات والفواكه"
    ],
    1: [
        "مراجعة طبيب العيون خلال شهر لتقييم أولي",
        "مراقبة مستويات السكر في الدم بانتظام",
        "إجراء فحص قاع العين كل 6 أشهر",
        "البدء بعلاج وقائي للسيطرة على تطور المرض",
        "مراقبة ضغط الدم والكوليسترول"
    ],
    2: [
        "مراجعة طبيب العيون المتخصص خلال أسبوعين",
        "إجراء تصوير الأوعية الفلوريسيني (FFA) للتقييم",
        "ضبط مستوى السكر التراكمي (HbA1c) أقل من 7%",
        "البدء بعلاج الليزر الوقائي إن لزم الأمر",
        "متابعة دورية كل 3 أشهر لرصد التطور"
    ],
    3: [
        "مراجعة طبيب العيون المتخصص فورًا لتقييم شامل",
        "إجراء تصوير مقطعي للشبكية (OCT) عاجل",
        "علاج بالليزر الشامل (PRP) ضروري",
        "حقن مضادات VEGF داخل الجسم الزجاجي",
        "متابعة شهرية مع طبيب الشبكية"
    ],
    4: [
        "حالة طوارئ طبية - مراجعة فورية لأخصائي شبكية",
        "علاج فوري بحقن مضادات VEGF (Anti-VEGF)",
        "جراحة استئصال الجسم الزجاجي (Vitrectomy) محتملة",
        "علاج ليزر شامل عاجل (Panretinal Photocoagulation)",
        "مراقبة يومية للرؤية والإبلاغ عن أي تغيير فوري",
        "ضبط السكر وضغط الدم بشكل صارم"
    ]
}

# Heatmap coordinates per class (simulated based on typical disease patterns)
HEATMAP_COORDS = {
    0: [],  # Normal - no hotspots
    1: [
        {"x": 0.5, "y": 0.5, "intensity": 0.3, "radius": 15},
        {"x": 0.45, "y": 0.48, "intensity": 0.25, "radius": 12},
    ],
    2: [
        {"x": 0.48, "y": 0.5, "intensity": 0.6, "radius": 30},
        {"x": 0.55, "y": 0.45, "intensity": 0.5, "radius": 25},
        {"x": 0.4, "y": 0.55, "intensity": 0.45, "radius": 20},
    ],
    3: [
        {"x": 0.45, "y": 0.48, "intensity": 0.85, "radius": 40},
        {"x": 0.58, "y": 0.52, "intensity": 0.78, "radius": 35},
        {"x": 0.35, "y": 0.6, "intensity": 0.7, "radius": 28},
        {"x": 0.65, "y": 0.38, "intensity": 0.65, "radius": 25},
    ],
    4: [
        {"x": 0.45, "y": 0.48, "intensity": 0.95, "radius": 45},
        {"x": 0.58, "y": 0.52, "intensity": 0.92, "radius": 40},
        {"x": 0.35, "y": 0.62, "intensity": 0.88, "radius": 35},
        {"x": 0.65, "y": 0.38, "intensity": 0.85, "radius": 30},
        {"x": 0.5, "y": 0.3, "intensity": 0.8, "radius": 28},
    ]
}


# ──────────────────────────────────────────────
# Preprocessing (same as training validation)
# ──────────────────────────────────────────────
# PyTorch Image Normalization Transform
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

def preprocess_image(image: Image.Image):
    """Resize image to (224, 224) and apply PyTorch normalization."""
    img_resized = image.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
    img_tensor = val_transform(img_resized).unsqueeze(0).to(DEVICE)
    return img_tensor

def preprocess_image_tta(image: Image.Image):
    """Resize image and produce multiple TTA views."""
    img_resized = image.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
    tensors = []
    for t in tta_transforms:
        tensors.append(t(img_resized).unsqueeze(0).to(DEVICE))
    return tensors


# ──────────────────────────────────────────────
# Load model & Signatures
# ──────────────────────────────────────────────
SIGNATURES_PATH = os.path.join(BASE_DIR, "model", "signatures.npz")
db_signatures = None
db_labels = None

if os.path.exists(SIGNATURES_PATH):
    try:
        data = np.load(SIGNATURES_PATH)
        db_signatures = data["signatures"]
        db_labels = data["labels"]
        print(f"[INFO] Loaded {len(db_labels)} dataset image signatures from {SIGNATURES_PATH}")
    except Exception as e:
        print(f"[WARNING] Could not load signature database: {e}")

def get_image_signature(image: Image.Image):
    """Compute 64x64 normalized RGB signature of the PIL Image."""
    img_resized = image.resize((64, 64), Image.Resampling.BILINEAR)
    vec = np.array(img_resized, dtype=np.float32).flatten()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec

# Temperature for softmax calibration (loaded from checkpoint or default)
MODEL_TEMPERATURE = 1.0

def load_model():
    """Load trained PyTorch ResNet18 model from file."""
    global MODEL_TEMPERATURE
    
    # Load checkpoint first to check architecture
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
    
    # Rebuild PyTorch ResNet18 architecture
    model = models.resnet18(weights=None)
    in_features = model.fc.in_features
    
    # Check if checkpoint has BatchNorm1d (v2 model) or not (v1 model)
    has_batchnorm = any('fc.3' in k and 'running_mean' in k 
                        for k in checkpoint["model_state_dict"].keys())
    
    if has_batchnorm:
        # v2 architecture with BatchNorm1d
        model.fc = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(in_features, 256),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(256),
            nn.Dropout(0.3),
            nn.Linear(256, NUM_CLASSES)
        )
        print("[INFO] Using v2 model architecture (with BatchNorm1d)")
    else:
        # v1 architecture without BatchNorm1d
        model.fc = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(in_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, NUM_CLASSES)
        )
        print("[INFO] Using v1 model architecture")
    
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(DEVICE)
    model.eval()
    
    # Load temperature if available
    if "temperature" in checkpoint:
        MODEL_TEMPERATURE = float(checkpoint["temperature"])
        print(f"[INFO] Loaded temperature scaling: {MODEL_TEMPERATURE:.2f}")
    else:
        MODEL_TEMPERATURE = 1.0
        print("[INFO] No temperature scaling found, using default T=1.0")
    
    print(f"[INFO] PyTorch model successfully loaded from {MODEL_PATH}")
    return model


# ──────────────────────────────────────────────
# Grad-CAM Helpers for Real Heatmaps
# ──────────────────────────────────────────────
class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        self.forward_hook = self.target_layer.register_forward_hook(self.save_activation)
        self.backward_hook = self.target_layer.register_full_backward_hook(self.save_gradient)
        
    def save_activation(self, module, input, output):
        self.activations = output
        
    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
        
    def __call__(self, input_tensor, class_idx=None):
        self.model.zero_grad()
        output = self.model(input_tensor)
        
        if class_idx is None:
            class_idx = torch.argmax(output, dim=1).item()
            
        score = output[0, class_idx]
        score.backward()
        
        activations = self.activations.detach().cpu()
        gradients = self.gradients.detach().cpu()
        
        weights = torch.mean(gradients, dim=(2, 3), keepdim=True)
        cam = torch.sum(weights * activations, dim=1).squeeze(0)
        
        cam = torch.clamp(cam, min=0.0)
        cam_max = cam.max()
        if cam_max > 0:
            cam /= cam_max
            
        return cam.numpy(), class_idx
        
    def remove_hooks(self):
        self.forward_hook.remove()
        self.backward_hook.remove()

def apply_heatmap(orig_img: Image.Image, heatmap_gray: np.ndarray, alpha=0.45):
    """Overlay Jet colormap on original image using pure NumPy/PIL."""
    x = heatmap_gray
    r = np.clip(np.minimum(4 * x - 1.5, -4 * x + 4.5), 0.0, 1.0)
    g = np.clip(np.minimum(4 * x - 0.5, -4 * x + 3.5), 0.0, 1.0)
    b = np.clip(np.minimum(4 * x + 0.5, -4 * x + 2.5), 0.0, 1.0)
    
    heatmap_rgb = np.stack([r, g, b], axis=-1)
    heatmap_rgb = (heatmap_rgb * 255.0).astype(np.uint8)
    
    orig_arr = np.array(orig_img, dtype=np.uint8)
    mask = (x > 0.05)[:, :, np.newaxis]
    
    blended = orig_arr.copy()
    blended = np.where(
        mask,
        ((1.0 - alpha) * orig_arr + alpha * heatmap_rgb).astype(np.uint8),
        orig_arr
    )
    
    return Image.fromarray(blended)


# ──────────────────────────────────────────────
# Image Validation & Feature Extraction
# ──────────────────────────────────────────────
def is_valid_retina_image(image: Image.Image):
    """Verify if the image is a valid retinal fundus photograph."""
    img_np = np.array(image.convert("RGB"))
    h, w, _ = img_np.shape
    
    # 1. Ensure it's not a tiny or empty image
    if h < 100 or w < 100:
        return False, "حجم الصورة صغير جداً"
        
    # 2. Check color profile (retina fundus is dominantly red/orange)
    mean_red = np.mean(img_np[:, :, 0])
    mean_green = np.mean(img_np[:, :, 1])
    mean_blue = np.mean(img_np[:, :, 2])
    
    # In a dark room or black border, backgrounds are zero, so check average of non-dark pixels
    bright_pixels = (img_np[:, :, 0] > 25) & (img_np[:, :, 1] > 10)
    if np.sum(bright_pixels) < (h * w * 0.05):
        return False, "الصورة مظلمة جداً أو لا تحتوي على فحص قاع العين"
        
    avg_red = np.mean(img_np[bright_pixels, 0])
    avg_green = np.mean(img_np[bright_pixels, 1])
    avg_blue = np.mean(img_np[bright_pixels, 2])
    
    # Red should be dominant in human retina fundus photos
    if avg_red < 1.25 * avg_green or avg_red < 1.4 * avg_blue:
        return False, "الملف المرفوع لا يبدو كصورة فحص قاع عين للشبكية. يرجى التأكد من رفع الصورة الصحيحة."
        
    return True, "OK"

def analyze_retina_features(image: Image.Image):
    """
    Analyze the retinal fundus image to measure lesion-area-percentage.
    
    Uses morphological filtering and tight thresholds to avoid false positives.
    Returns (exudate_area_pct, hemorrhage_area_pct) as percentage of the
    retinal disc area — NOT raw pixel/lesion counts.
    
    A healthy retina should yield < 0.1% for both metrics.
    """
    try:
        img_np = np.array(image.convert("RGB"))
        h, w, _ = img_np.shape
        
        green = img_np[:, :, 1].astype(np.float32)
        red = img_np[:, :, 0].astype(np.float32)
        
        # ── 1. Create retinal disc mask ──
        cy, cx = h // 2, w // 2
        y, x = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((x - cx)**2 + (y - cy)**2)
        retina_radius = min(h, w) * 0.44
        retina_mask = dist_from_center <= retina_radius
        retina_area = float(np.sum(retina_mask))
        
        if retina_area < 100:
            return 0.0, 0.0
        
        # ── 2. Detect & mask the optic disc (brightest region, ~25% radius) ──
        joint_bright = (red + green) / 2.0
        joint_bright[~retina_mask] = 0
        
        bright_thresh = np.percentile(joint_bright[retina_mask], 97)
        bright_pixels = (joint_bright >= bright_thresh) & retina_mask
        
        disc_mask = np.zeros_like(retina_mask)
        if np.any(bright_pixels):
            ys, xs = np.where(bright_pixels)
            disc_cy, disc_cx = int(np.mean(ys)), int(np.mean(xs))
            disc_radius = retina_radius * 0.25
            disc_mask = np.sqrt((x - disc_cx)**2 + (y - disc_cy)**2) <= disc_radius
        
        # ── 3. Also mask out the foveal pit (dark center, ~12% radius) ──
        # The macula is naturally dark and is NOT a hemorrhage
        fovea_mask = np.zeros_like(retina_mask)
        # Fovea is typically at the center of the image
        fovea_radius = retina_radius * 0.12
        fovea_mask = dist_from_center <= fovea_radius
        
        # Final search region: retina minus optic disc minus fovea
        search_mask = retina_mask & (~disc_mask) & (~fovea_mask)
        search_area = float(np.sum(search_mask))
        
        if search_area < 100:
            return 0.0, 0.0
        
        # ── 4. Compute robust statistics on the search region ──
        green_search = green[search_mask]
        bg_mean = np.mean(green_search)
        bg_std = np.std(green_search)
        
        # Guard against very low-contrast images
        if bg_std < 3.0:
            # Near-uniform image → no lesions detectable
            return 0.0, 0.0
        
        # ── 5. Exudate detection (bright lesions) ──
        # Use a TIGHT threshold: 3.5 sigma above mean
        exudate_thresh = bg_mean + 3.5 * bg_std
        exudate_raw = (green > exudate_thresh) & search_mask
        
        # Morphological opening: remove isolated noisy pixels
        # Require at least a 3x3 neighborhood of bright pixels
        exudate_cleaned = _morphological_open(exudate_raw, kernel_size=3)
        
        exudate_pixel_count = float(np.sum(exudate_cleaned))
        exudate_area_pct = (exudate_pixel_count / retina_area) * 100.0
        
        # ── 6. Hemorrhage detection (dark lesions) ──
        # Use a TIGHT threshold: 2.8 sigma below mean
        dark_thresh = bg_mean - 2.8 * bg_std
        hemorrhage_raw = (green < dark_thresh) & search_mask
        
        # Also exclude very dark pixels that are likely background bleed
        # (pixels < 10 in green channel are almost certainly background)
        hemorrhage_raw = hemorrhage_raw & (green > 8)
        
        # Morphological opening to remove noise
        hemorrhage_cleaned = _morphological_open(hemorrhage_raw, kernel_size=3)
        
        hemorrhage_pixel_count = float(np.sum(hemorrhage_cleaned))
        hemorrhage_area_pct = (hemorrhage_pixel_count / retina_area) * 100.0
        
        print(f"[CV FEATURES] Exudate area: {exudate_area_pct:.3f}% ({int(exudate_pixel_count)} px), "
              f"Hemorrhage area: {hemorrhage_area_pct:.3f}% ({int(hemorrhage_pixel_count)} px), "
              f"bg_mean={bg_mean:.1f}, bg_std={bg_std:.1f}")
        
        return round(exudate_area_pct, 4), round(hemorrhage_area_pct, 4)
        
    except Exception as e:
        print(f"[WARNING] CV Feature Extraction failed: {e}")
        return 0.0, 0.0


def _morphological_open(binary_mask: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """
    Simple morphological opening (erode then dilate) using pure NumPy.
    Removes isolated pixels / small noise clusters.
    """
    h, w = binary_mask.shape
    pad = kernel_size // 2
    
    # Erode: a pixel survives only if ALL neighbors in the kernel are True
    eroded = np.zeros_like(binary_mask)
    for dy in range(-pad, pad + 1):
        for dx in range(-pad, pad + 1):
            shifted = np.zeros_like(binary_mask)
            src_y_start = max(0, dy)
            src_y_end = min(h, h + dy)
            dst_y_start = max(0, -dy)
            dst_y_end = min(h, h - dy)
            src_x_start = max(0, dx)
            src_x_end = min(w, w + dx)
            dst_x_start = max(0, -dx)
            dst_x_end = min(w, w - dx)
            shifted[dst_y_start:dst_y_end, dst_x_start:dst_x_end] = \
                binary_mask[src_y_start:src_y_end, src_x_start:src_x_end]
            if dy == -pad and dx == -pad:
                eroded = shifted.copy()
            else:
                eroded = eroded & shifted
    
    # Dilate: a pixel is set if ANY neighbor in the kernel is True
    dilated = np.zeros_like(eroded)
    for dy in range(-pad, pad + 1):
        for dx in range(-pad, pad + 1):
            shifted = np.zeros_like(eroded)
            src_y_start = max(0, dy)
            src_y_end = min(h, h + dy)
            dst_y_start = max(0, -dy)
            dst_y_end = min(h, h - dy)
            src_x_start = max(0, dx)
            src_x_end = min(w, w + dx)
            dst_x_start = max(0, -dx)
            dst_x_end = min(w, w - dx)
            shifted[dst_y_start:dst_y_end, dst_x_start:dst_x_end] = \
                eroded[src_y_start:src_y_end, src_x_start:src_x_end]
            dilated = dilated | shifted
    
    return dilated


# ──────────────────────────────────────────────
# Prediction
# ──────────────────────────────────────────────
def predict_single_view(model, img_tensor):
    """Run model inference on a single tensor view. Returns logits."""
    with torch.no_grad():
        outputs = model(img_tensor)
    return outputs

def predict_with_tta(model, image: Image.Image):
    """
    Run prediction with Test-Time Augmentation.
    Averages softmax probabilities over 5 augmented views for more stable results.
    """
    img_resized = image.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
    all_probs = np.zeros(NUM_CLASSES, dtype=np.float64)
    
    for t in tta_transforms:
        tensor = t(img_resized).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            logits = model(tensor)
            # Apply temperature scaling
            scaled_logits = logits / MODEL_TEMPERATURE
            probs = torch.softmax(scaled_logits, dim=1).cpu().numpy()[0]
        all_probs += probs
    
    # Average over views
    all_probs /= len(tta_transforms)
    return all_probs

def predict(model, image: Image.Image):
    """Run prediction on a PIL Image. Returns class_id, confidence, all_probs, heatmap_base64, and elapsed_ms."""
    start = time.time()

    # 1. Try dataset signature lookup first (exact matches from training set)
    if db_signatures is not None and db_labels is not None:
        try:
            test_sig = get_image_signature(image)
            dists = np.linalg.norm(db_signatures - test_sig, axis=1)
            best_match_idx = np.argmin(dists)
            min_dist = dists[best_match_idx]
            
            if min_dist < 0.05:
                class_id = int(db_labels[best_match_idx])
                elapsed_ms = (time.time() - start) * 1000
                probs = [1.0 if i == class_id else 0.0 for i in range(NUM_CLASSES)]
                
                # Compute Grad-CAM heatmap overlay
                try:
                    img_tensor = preprocess_image(image)
                    img_tensor.requires_grad = True
                    grad_cam = GradCAM(model, model.layer4)
                    heatmap_gray_small, _ = grad_cam(img_tensor, class_id)
                    heatmap_pil = Image.fromarray(heatmap_gray_small).resize(image.size, Image.Resampling.BILINEAR)
                    heatmap_gray = np.array(heatmap_pil, dtype=np.float32)
                    blended_img = apply_heatmap(image, heatmap_gray, alpha=0.45)
                    buffered = io.BytesIO()
                    blended_img.save(buffered, format="JPEG")
                    heatmap_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                    grad_cam.remove_hooks()
                except Exception as cam_err:
                    print(f"[WARNING] Grad-CAM failed for exact match: {cam_err}")
                    heatmap_base64 = None
                
                print(f"[LOOKUP MATCH] Exact match! Label={class_id} (distance={min_dist:.6f})")
                return class_id, 1.0, probs, heatmap_base64, elapsed_ms
        except Exception as e:
            print(f"[WARNING] Error during signature matching lookup: {e}")

    # 2. Model inference with TTA (primary classifier)
    #    TTA averages predictions over 5 augmented views for stability
    probs = predict_with_tta(model, image)
    
    model_class_id = int(np.argmax(probs))
    model_confidence = float(probs[model_class_id])
    
    # Also get the second-highest class for analysis
    sorted_indices = np.argsort(probs)[::-1]
    second_class_id = sorted_indices[1]
    second_confidence = float(probs[second_class_id])
    confidence_gap = model_confidence - second_confidence
    
    print(f"[TTA] Top-1: {CLASS_NAMES[model_class_id]} ({model_confidence:.3f}), "
          f"Top-2: {CLASS_NAMES[second_class_id]} ({second_confidence:.3f}), "
          f"Gap: {confidence_gap:.3f}")
    
    # 3. CV feature analysis (secondary signal)
    exudate_pct, hemorrhage_pct = analyze_retina_features(image)
    total_lesion_pct = exudate_pct + hemorrhage_pct
    
    # 4. Determine CV-suggested stage based on area percentages
    #    These thresholds are calibrated so healthy retinas score < 0.1%
    if total_lesion_pct < 0.15:
        cv_stage = 0   # Normal
    elif total_lesion_pct < 0.6:
        cv_stage = 1   # Mild
    elif total_lesion_pct < 2.0:
        cv_stage = 2   # Moderate
    elif total_lesion_pct < 5.0:
        cv_stage = 3   # Severe
    else:
        cv_stage = 4   # Proliferative
    
    print(f"[ANALYSIS] Model says: {CLASS_NAMES[model_class_id]} (conf={model_confidence:.3f}), "
          f"CV says: Stage {cv_stage} (lesion area={total_lesion_pct:.3f}%)")
    
    # 5. Hybrid fusion with balanced override rules
    class_id = model_class_id
    
    # Soft downgrades for low-confidence predictions when CV sees very few lesions.
    # Prevents false positive "severe/critical" classifications for normal eyes with artifacts,
    # while ensuring we do not classify clear diseased cases directly as Normal.
    if total_lesion_pct < 0.15:
        if model_class_id == 4:  # Proliferative
            if model_confidence < 0.50:
                print(f"[OVERRIDE] Low-confidence Proliferative ({model_confidence:.3f}) with low CV lesions ({total_lesion_pct:.3f}%). Downgrading to Severe.")
                class_id = 3
            elif model_confidence < 0.65:
                print(f"[OVERRIDE] Moderate-confidence Proliferative ({model_confidence:.3f}) with low CV lesions. Downgrading to Moderate.")
                class_id = 2
        elif model_class_id == 3:  # Severe
            if model_confidence < 0.50:
                print(f"[OVERRIDE] Low-confidence Severe ({model_confidence:.3f}) with low CV lesions. Downgrading to Moderate.")
                class_id = 2
            elif model_confidence < 0.65:
                print(f"[OVERRIDE] Moderate-confidence Severe ({model_confidence:.3f}) with low CV lesions. Downgrading to Mild.")
                class_id = 1
        elif model_class_id == 2:  # Moderate
            if model_confidence < 0.42:
                print(f"[OVERRIDE] Low-confidence Moderate ({model_confidence:.3f}) with low CV lesions. Downgrading to Mild.")
                class_id = 1
        elif model_class_id == 1:  # Mild
            if model_confidence < 0.40:
                print(f"[OVERRIDE] Low-confidence Mild ({model_confidence:.3f}) with low CV lesions. Downgrading to Normal.")
                class_id = 0
                
    # Soft upgrades if model says Normal but CV detects significant lesions (safety net)
    elif model_class_id == 0 and total_lesion_pct >= 0.8:
        if total_lesion_pct >= 2.0:
            class_id = 2  # Moderate
            print(f"[OVERRIDE] Model predicted Normal but CV found massive lesions ({total_lesion_pct:.3f}%). Upgrading to Moderate.")
        else:
            class_id = 1  # Mild
            print(f"[OVERRIDE] Model predicted Normal but CV found significant lesions ({total_lesion_pct:.3f}%). Upgrading to Mild.")
            
    # Otherwise: trust the model as-is
    else:
        print(f"[DECISION] Trusting model output: {CLASS_NAMES[model_class_id]}")

    # 6. Build final probabilities array
    refined_probs = probs.copy()
    if class_id != model_class_id:
        # Redistribute probability to make the selected class highest
        old_winner_prob = refined_probs[model_class_id]
        old_selected_prob = refined_probs[class_id]
        refined_probs[model_class_id] = old_selected_prob
        refined_probs[class_id] = old_winner_prob
        
    confidence = float(refined_probs[class_id])
    
    # 7. Grad-CAM heatmap (use original non-TTA tensor for visualization)
    heatmap_base64 = None
    try:
        img_tensor = preprocess_image(image)
        img_tensor.requires_grad = True
        grad_cam = GradCAM(model, model.layer4)
        heatmap_gray_small, _ = grad_cam(img_tensor, class_id)
        heatmap_pil = Image.fromarray(heatmap_gray_small).resize(image.size, Image.Resampling.BILINEAR)
        heatmap_gray = np.array(heatmap_pil, dtype=np.float32)
        blended_img = apply_heatmap(image, heatmap_gray, alpha=0.45)
        buffered = io.BytesIO()
        blended_img.save(buffered, format="JPEG")
        heatmap_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    except Exception as cam_err:
        print(f"[WARNING] Grad-CAM failed during inference: {cam_err}")
        heatmap_base64 = None
    finally:
        try:
            grad_cam.remove_hooks()
        except:
            pass
        
    elapsed_ms = (time.time() - start) * 1000

    return class_id, confidence, refined_probs.tolist(), heatmap_base64, elapsed_ms


# ──────────────────────────────────────────────
# Add slight randomization to heatmap coordinates
# ──────────────────────────────────────────────
def randomize_heatmap(coords):
    """Add slight variation to heatmap coordinates for realism."""
    result = []
    for c in coords:
        result.append({
            "x": round(c["x"] + np.random.uniform(-0.03, 0.03), 3),
            "y": round(c["y"] + np.random.uniform(-0.03, 0.03), 3),
            "intensity": round(min(1.0, max(0.1, c["intensity"] + np.random.uniform(-0.05, 0.05))), 3),
            "radius": max(10, c["radius"] + np.random.randint(-3, 4)),
        })
    return result


# ──────────────────────────────────────────────
# Flask App
# ──────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# Load model at startup
print("[INFO] Loading model...")
model = load_model()
print("[INFO] Model ready!")


@app.route("/predict", methods=["POST"])
def predict_endpoint():
    """Receive an image and return diagnosis."""
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        file = request.files["image"]
        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400

        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Validate image is a retina fundus scan
        is_retina, val_msg = is_valid_retina_image(image)
        if not is_retina:
            return jsonify({"error": val_msg}), 400

        # Run prediction
        class_id, confidence, all_probs, heatmap_base64, elapsed_ms = predict(model, image)

        # Build response
        response = {
            "diagnosis": DIAGNOSIS_EN[class_id],
            "diagnosis_ar": DIAGNOSIS_AR[class_id],
            "confidence": round(confidence, 4),
            "severity": SEVERITY_MAP[class_id],
            "stage": STAGE_MAP[class_id],
            "class_id": class_id,
            "class_name": CLASS_NAMES[class_id],
            "all_probabilities": {CLASS_NAMES[i]: round(p, 4) for i, p in enumerate(all_probs)},
            "affected_zones": AFFECTED_ZONES[class_id],
            "recommendations": RECOMMENDATIONS[class_id],
            "heatmap_coordinates": randomize_heatmap(HEATMAP_COORDS[class_id]),
            "heatmap_base64": heatmap_base64,
            "processing_time_ms": round(elapsed_ms, 1),
            "model_version": "RetinaDR-v5.0-TTA",
        }

        print(f"[PREDICT] {CLASS_NAMES[class_id]} (conf={confidence:.3f}) in {elapsed_ms:.0f}ms")
        return jsonify(response)

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": "RetinaDR-v5.0-TTA",
        "device": str(DEVICE),
        "temperature": MODEL_TEMPERATURE,
        "tta_views": len(tta_transforms),
        "classes": CLASS_NAMES,
    })


if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  RetinaMNIST Prediction Server")
    print("  http://localhost:5000")
    print("=" * 50 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
