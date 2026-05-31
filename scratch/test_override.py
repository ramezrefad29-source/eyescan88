import requests
from PIL import Image
import io
import numpy as np

img_path = r"c:\Users\LENOVO\Desktop\eyescan\model\test_samples\class4_Proliferative_DR_sample0_pred_Proliferative_DR_0.83.png"
img = Image.open(img_path)

img_arr = np.array(img).copy()
val = int(img_arr[0, 0, 0])
img_arr[0, 0, 0] = val + 1 if val < 255 else 254
img_mod = Image.fromarray(img_arr)

buf = io.BytesIO()
img_mod.save(buf, format="PNG")
buf.seek(0)

res = requests.post("http://localhost:5000/predict", files={"image": ("test_mod.png", buf, "image/png")})
print("STATUS CODE:", res.status_code)
print("RESPONSE:", res.json())
