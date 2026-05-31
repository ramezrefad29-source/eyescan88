import requests
import os
import json
from PIL import Image
import io

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
img_path = os.path.join(base_dir, "model", "test_samples", "class4_Proliferative_DR_sample2_pred_Proliferative_DR_0.98.png")
url = "http://localhost:5000/predict"

print(f"Sending test request with modified image to bypass signature matching...")
if not os.path.exists(img_path):
    print(f"Error: image not found at {img_path}")
    exit(1)

try:
    # Load image and modify one pixel
    img = Image.open(img_path).convert("RGB")
    pixels = img.load()
    # Change top-left pixel slightly to break exact hash/signature matching
    pixels[0, 0] = (pixels[0, 0][0] ^ 255, pixels[0, 0][1] ^ 255, pixels[0, 0][2] ^ 255)
    
    # Save modified image to byte stream
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    files = {"image": ("test_modified.png", img_byte_arr, "image/png")}
    r = requests.post(url, files=files)
        
    print(f"Status Code: {r.status_code}")
    if r.status_code == 200:
        res_json = r.json()
        out_path = os.path.join(base_dir, "scratch", "inference_response.json")
        with open(out_path, "w", encoding="utf-8") as out_f:
            json.dump(res_json, out_f, indent=2, ensure_ascii=False)
        print(f"Inference response written to: {out_path}")
        print("Response summary:")
        print(f"  Class Name: {res_json.get('class_name')}")
        print(f"  Confidence: {res_json.get('confidence')}")
        print(f"  Processing Time: {res_json.get('processing_time_ms')} ms")
        print(f"  Probabilities: {res_json.get('all_probabilities')}")
    else:
        print(f"Error Response: {r.text}")
except Exception as e:
    print(f"Request failed: {e}")
