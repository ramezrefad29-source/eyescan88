import numpy as np
import os

db_dir = r"c:\Users\LENOVO\Desktop\eyescan\retinamnist_224.npz"

train_images_path = os.path.join(db_dir, "train_images.npy")
train_labels_path = os.path.join(db_dir, "train_labels.npy")
val_images_path = os.path.join(db_dir, "val_images.npy")
val_labels_path = os.path.join(db_dir, "val_labels.npy")

print("--- RetinaMNIST Dataset Analysis ---")

if os.path.exists(train_images_path) and os.path.exists(train_labels_path):
    train_images = np.load(train_images_path)
    train_labels = np.load(train_labels_path)
    val_images = np.load(val_images_path)
    val_labels = np.load(val_labels_path)
    
    print(f"Training Images shape: {train_images.shape} (Type: {train_images.dtype})")
    print(f"Training Labels shape: {train_labels.shape} (Type: {train_labels.dtype})")
    print(f"Validation Images shape: {val_images.shape}")
    print(f"Validation Labels shape: {val_labels.shape}")
    
    # Check classes distribution
    unique_train, counts_train = np.unique(train_labels, return_counts=True)
    unique_val, counts_val = np.unique(val_labels, return_counts=True)
    
    print("\n[Class Distribution in Training Set]")
    for c, cnt in zip(unique_train, counts_train):
        pct = (cnt / len(train_labels)) * 100
        print(f"  Class {c} (Stage {c}): {cnt} samples ({pct:.2f}%)")
        
    print("\n[Class Distribution in Validation Set]")
    for c, cnt in zip(unique_val, counts_val):
        pct = (cnt / len(val_labels)) * 100
        print(f"  Class {c} (Stage {c}): {cnt} samples ({pct:.2f}%)")
else:
    print("NumPy files not found in target path.")
