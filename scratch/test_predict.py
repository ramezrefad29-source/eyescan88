import requests
import os
import json

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
img_path = os.path.join(base_dir, "model", "test_samples", "class0_Normal_sample0_pred_Normal_0.56.png")
url = "http://localhost:5000/predict"

try:
    with open(img_path, "rb") as f:
        files = {"image": f}
        r = requests.post(url, files=files)
        
    print(f"Status Code: {r.status_code}")
    if r.status_code == 200:
        res_json = r.json()
        out_path = os.path.join(base_dir, "scratch", "response.json")
        with open(out_path, "w", encoding="utf-8") as out_f:
            json.dump(res_json, out_f, indent=2, ensure_ascii=False)
        print(f"Response written to: {out_path}")
    else:
        print(f"Error Response: {r.text}")
except Exception as e:
    print(f"Request failed: {e}")
