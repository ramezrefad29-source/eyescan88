import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

print("Inspecting Keras Model with compile=False and safe_mode=False...")
try:
    import tensorflow as tf
    model = tf.keras.models.load_model(h5_path, compile=False, safe_mode=False)
    print("SUCCESS: Loaded model with compile=False and safe_mode=False!")
    print("\nInput layers:")
    for layer in model.inputs:
        print(f"  Name: {layer.name}, Shape: {layer.shape}, Dtype: {layer.dtype}")
    
    print("\nOutput layers:")
    for layer in model.outputs:
        print(f"  Name: {layer.name}, Shape: {layer.shape}, Dtype: {layer.dtype}")
        
except Exception as e:
    print(f"Failed to inspect Keras model: {e}")
