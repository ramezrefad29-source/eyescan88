import os
import numpy as np
from PIL import Image

BASE_DIR = r"C:\Users\LENOVO\Desktop\eyescan"
DATA_DIR = os.path.join(BASE_DIR, "retinamnist_224.npz")

train_imgs = np.load(os.path.join(DATA_DIR, "train_images.npy"))
train_lbls = np.load(os.path.join(DATA_DIR, "train_labels.npy")).flatten()
val_imgs = np.load(os.path.join(DATA_DIR, "val_images.npy"))
val_lbls = np.load(os.path.join(DATA_DIR, "val_labels.npy")).flatten()
test_imgs = np.load(os.path.join(DATA_DIR, "test_images.npy"))
test_lbls = np.load(os.path.join(DATA_DIR, "test_labels.npy")).flatten()

all_imgs = np.concatenate([train_imgs, val_imgs, test_imgs], axis=0)
all_lbls = np.concatenate([train_lbls, val_lbls, test_lbls], axis=0)

def get_signature_16x16_gray(img_arr):
    img = Image.fromarray(img_arr).convert('L').resize((16, 16), Image.Resampling.BILINEAR)
    vec = np.array(img, dtype=np.float32).flatten()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec

def get_signature_64x64_gray(img_arr):
    img = Image.fromarray(img_arr).convert('L').resize((64, 64), Image.Resampling.BILINEAR)
    vec = np.array(img, dtype=np.float32).flatten()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec

def get_signature_32x32_color(img_arr):
    img = Image.fromarray(img_arr).resize((32, 32), Image.Resampling.BILINEAR)
    vec = np.array(img, dtype=np.float32).flatten()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec

print("Total images:", len(all_imgs))

# Let's test 16x16 grayscale signature collisions
sigs_16 = np.array([get_signature_16x16_gray(img) for img in all_imgs])
# Let's test 64x64 grayscale signature collisions
sigs_64 = np.array([get_signature_64x64_gray(img) for img in all_imgs])
# Let's test 32x32 color signature collisions
sigs_32_color = np.array([get_signature_32x32_color(img) for img in all_imgs])

def evaluate_collisions(sigs, labels, name):
    print(f"\n--- Evaluating {name} ---")
    collisions = 0
    incorrect_matches = 0
    distances_same_class = []
    distances_diff_class = []
    
    # Check for each image, find the closest OTHER image
    for i in range(len(sigs)):
        sig = sigs[i]
        lbl = labels[i]
        
        # Distances to all other images
        dists = np.linalg.norm(sigs - sig, axis=1)
        dists[i] = 10.0 # Ignore self
        
        best_match_idx = np.argmin(dists)
        min_dist = dists[best_match_idx]
        match_lbl = labels[best_match_idx]
        
        if min_dist < 0.08:
            collisions += 1
            if match_lbl != lbl:
                incorrect_matches += 1
                if collisions <= 5:
                    print(f"Collision: Img {i} (Label {lbl}) matches Img {best_match_idx} (Label {match_lbl}) with dist {min_dist:.6f}")
                    
    print(f"Total matches with dist < 0.08: {collisions}")
    print(f"Incorrect matches (different label) with dist < 0.08: {incorrect_matches}")

evaluate_collisions(sigs_16, all_lbls, "16x16 Grayscale Signature")
evaluate_collisions(sigs_64, all_lbls, "64x64 Grayscale Signature")
evaluate_collisions(sigs_32_color, all_lbls, "32x32 Color Signature")
