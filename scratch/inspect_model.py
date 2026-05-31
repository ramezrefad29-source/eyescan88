import torch
import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

print("Checking full_retina_model.h5 with weights_only=False...")
try:
    data = torch.load(h5_path, map_location="cpu", weights_only=False)
    print("SUCCESS: Loaded full_retina_model.h5 with PyTorch (weights_only=False)!")
    print(f"Object type: {type(data)}")
    if isinstance(data, dict):
        print(f"Keys: {list(data.keys())}")
except Exception as e:
    print(f"Failed to load with weights_only=False: {e}")

print("\nTrying to load with tensorflow/keras...")
try:
    import tensorflow as tf
    model = tf.keras.models.load_model(h5_path)
    print("SUCCESS: Loaded full_retina_model.h5 with Keras/TensorFlow!")
    model.summary()
except Exception as e:
    print(f"Failed to load with Keras: {e}")
