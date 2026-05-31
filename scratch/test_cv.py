import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
from PIL import Image
import numpy as np
import predict_server

# Re-init model
predict_server.model = predict_server.load_model()

# We will create a fake image that passes the retina validation:
# A valid retina image needs:
# 1. h >= 100, w >= 100
# 2. red channel dominant: avg_red >= 1.25 * avg_green and avg_red >= 1.4 * avg_blue
# Let's create an image with red channel = 180, green = 100, blue = 80, plus some random noise.
h, w = 224, 224
img_arr = np.zeros((h, w, 3), dtype=np.uint8)
img_arr[:, :, 0] = 180  # Red
img_arr[:, :, 1] = 100  # Green
img_arr[:, :, 2] = 80   # Blue

# Add a bright optic disc region to simulate human eye structure
cy, cx = h // 2, w // 2
y, x = np.ogrid[:h, :w]
disc_mask = (x - cx - 40)**2 + (y - cy)**2 <= 20**2
img_arr[disc_mask, 0] = 230
img_arr[disc_mask, 1] = 210
img_arr[disc_mask, 2] = 150

# Save image
img = Image.fromarray(img_arr)
img.save("scratch/test_retina.png")

# Run prediction!
print("\n--- RUNNING PREDICT ---")
class_id, confidence, refined_probs, heatmap_base64, elapsed_ms = predict_server.predict(predict_server.model, img)
print("\nRESULT:")
print(f"Final Class ID: {class_id} ({predict_server.CLASS_NAMES[class_id]})")
print(f"Confidence: {confidence:.4f}")
print(f"Refined Probs: {np.round(refined_probs, 4)}")
