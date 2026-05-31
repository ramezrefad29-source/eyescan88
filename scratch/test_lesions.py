import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
from PIL import Image
import numpy as np
import predict_server

# We will create a fake image that passes the retina validation
h, w = 400, 400
img_arr = np.zeros((h, w, 3), dtype=np.uint8)
img_arr[:, :, 0] = 180  # Red dominant
img_arr[:, :, 1] = 90   # Green
img_arr[:, :, 2] = 50   # Blue

# Add a bright optic disc region to simulate human eye structure (avoiding center)
cy, cx = h // 2, w // 2
y, x = np.ogrid[:h, :w]
disc_mask = (x - cx - 100)**2 + (y - cy)**2 <= 40**2
img_arr[disc_mask, 0] = 240
img_arr[disc_mask, 1] = 220
img_arr[disc_mask, 2] = 180

# Now add some simulated hemorrhages (dark spots in green channel, e.g., Green = 20, Red = 80)
# We want these spots to be larger than 3x3 to survive morphological opening
for i in range(5):
    hy, hx = cy + np.random.randint(-80, 80), cx + np.random.randint(-80, 80)
    hem_mask = (x - hx)**2 + (y - hy)**2 <= 6**2
    img_arr[hem_mask, 0] = 80  # Darker red
    img_arr[hem_mask, 1] = 15  # Dark spot in green channel (should be < bg_mean - 2.8*bg_std)
    img_arr[hem_mask, 2] = 10

# Now add some simulated exudates (bright spots in green channel, e.g., Green = 180, Red = 220)
for i in range(5):
    ey, ex = cy + np.random.randint(-80, 80), cx + np.random.randint(-80, 80)
    ex_mask = (x - ex)**2 + (y - ey)**2 <= 6**2
    img_arr[ex_mask, 0] = 230
    img_arr[ex_mask, 1] = 190  # Bright spot in green channel (should be > bg_mean + 3.5*bg_std)
    img_arr[ex_mask, 2] = 140

# Save image
img = Image.fromarray(img_arr)
img.save("scratch/test_lesions.png")

# Test CV analysis directly!
exudate_pct, hemorrhage_pct = predict_server.analyze_retina_features(img)
print("\n--- CV DETECTION RESULTS ---")
print(f"Exudate Area Pct: {exudate_pct:.4f}%")
print(f"Hemorrhage Area Pct: {hemorrhage_pct:.4f}%")
print(f"Total Lesion Area Pct: {exudate_pct + hemorrhage_pct:.4f}%")
