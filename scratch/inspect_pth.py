import torch
import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
pth_path = os.path.join(base_dir, "model", "retina_model.pth")

print("Checking retina_model.pth...")
if os.path.exists(pth_path):
    print(f"File size: {os.path.getsize(pth_path)} bytes")
    try:
        checkpoint = torch.load(pth_path, map_location="cpu")
        print("SUCCESS: Loaded retina_model.pth with PyTorch!")
        print("Keys:")
        print(list(checkpoint.keys()))
        if "best_val_acc" in checkpoint:
            print(f"  best_val_acc: {checkpoint['best_val_acc']:.4f}")
        if "epoch" in checkpoint:
            print(f"  epoch: {checkpoint['epoch']}")
    except Exception as e:
        print(f"Failed to load: {e}")
else:
    print("retina_model.pth does not exist")
