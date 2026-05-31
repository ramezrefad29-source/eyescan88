import os
import numpy as np
from PIL import Image
import io

BASE_DIR = r"C:\Users\LENOVO\Desktop\eyescan"
DATA_DIR = os.path.join(BASE_DIR, "retinamnist_224.npz")

train_imgs = np.load(os.path.join(DATA_DIR, "train_images.npy"))
train_lbls = np.load(os.path.join(DATA_DIR, "train_labels.npy")).flatten()

def get_signature_32x32_color(img_arr):
    img = Image.fromarray(img_arr).resize((32, 32), Image.Resampling.BILINEAR)
    vec = np.array(img, dtype=np.float32).flatten()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec

def get_signature_64x64_color(img_arr):
    img = Image.fromarray(img_arr).resize((64, 64), Image.Resampling.BILINEAR)
    vec = np.array(img, dtype=np.float32).flatten()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec

print("Evaluating 50 samples...")
same_dists_32 = []
same_dists_64 = []
other_dists_32 = []
other_dists_64 = []

# Build database signatures
sigs_32 = np.array([get_signature_32x32_color(img) for img in train_imgs])
sigs_64 = np.array([get_signature_64x64_color(img) for img in train_imgs])

for i in range(50):
    img_arr = train_imgs[i]
    img = Image.fromarray(img_arr)
    
    # Save as JPEG and reload
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    buf.seek(0)
    img_jpeg = Image.open(buf).convert('RGB')
    img_jpeg_arr = np.array(img_jpeg)
    
    # Signatures
    sig_32_jpeg = get_signature_32x32_color(img_jpeg_arr)
    sig_64_jpeg = get_signature_64x64_color(img_jpeg_arr)
    
    # Distance to itself (original)
    dist_32_self = np.linalg.norm(sigs_32[i] - sig_32_jpeg)
    dist_64_self = np.linalg.norm(sigs_64[i] - sig_64_jpeg)
    same_dists_32.append(dist_32_self)
    same_dists_64.append(dist_64_self)
    
    # Distances to all others
    dists_32_all = np.linalg.norm(sigs_32 - sig_32_jpeg, axis=1)
    dists_32_all[i] = 10.0 # ignore self
    min_dist_32_other = np.min(dists_32_all)
    other_dists_32.append(min_dist_32_other)
    
    dists_64_all = np.linalg.norm(sigs_64 - sig_64_jpeg, axis=1)
    dists_64_all[i] = 10.0 # ignore self
    min_dist_64_other = np.min(dists_64_all)
    other_dists_64.append(min_dist_64_other)

print("\n--- 32x32 Color Signature ---")
print(f"Self distance (after JPEG): max={max(same_dists_32):.6f}, mean={np.mean(same_dists_32):.6f}")
print(f"Other distance (closest different image): min={min(other_dists_32):.6f}, mean={np.mean(other_dists_32):.6f}")

print("\n--- 64x64 Color Signature ---")
print(f"Self distance (after JPEG): max={max(same_dists_64):.6f}, mean={np.mean(same_dists_64):.6f}")
print(f"Other distance (closest different image): min={min(other_dists_64):.6f}, mean={np.mean(other_dists_64):.6f}")
