import os
import numpy as np
import tensorflow as tf
from PIL import Image

# Use same env variables as predict_server
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

BASE_DIR = r"c:\Users\LENOVO\Desktop\eyescan"
MODEL_PATH = os.path.join(BASE_DIR, "model", "retina_keras_model.keras")
TEST_SAMPLES_DIR = os.path.join(BASE_DIR, "model", "test_samples")

print("Loading Keras model from:", MODEL_PATH)
tf.keras.config.enable_unsafe_deserialization()
model = tf.keras.models.load_model(MODEL_PATH, compile=False)
print("Model loaded successfully!")

def preprocess_image(image: Image.Image):
    img_resized = image.resize((512, 512), Image.Resampling.BILINEAR)
    img_arr = np.array(img_resized, dtype=np.float32)
    img_arr = (img_arr / 127.5) - 1.0
    return np.expand_dims(img_arr, axis=0)

# Find 3 sample images of different classes
samples = os.listdir(TEST_SAMPLES_DIR)
samples = [s for s in samples if s.endswith(".png")]

print("\n--- Running predictions on samples ---")
for sample in samples[:5]:
    path = os.path.join(TEST_SAMPLES_DIR, sample)
    img = Image.open(path).convert("RGB")
    
    # 1. Prediction using signature database (bypassed for this test by adding small noise to pixel)
    # 2. Prediction using model inference
    img_tensor = preprocess_image(img)
    probs = model.predict(img_tensor, verbose=0)[0]
    pred_class = np.argmax(probs)
    print(f"File: {sample}")
    print(f"  Probs: {probs}")
    print(f"  Pred Class: {pred_class} ({['Normal', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR'][pred_class]})")
