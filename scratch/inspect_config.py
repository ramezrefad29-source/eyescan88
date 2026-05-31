import h5py
import os
import json
import tensorflow as tf

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

print("Inspecting Keras config attribute and trying to reconstruct model...")
if os.path.exists(h5_path):
    try:
        with h5py.File(h5_path, 'r') as f:
            if 'model_config' in f.attrs:
                config = f.attrs['model_config']
                if isinstance(config, bytes):
                    config = config.decode('utf-8')
                
                config_dict = json.loads(config)
                print("Model Class:", config_dict.get("class_name"))
                
                # Try to load model from config
                try:
                    # Strip out optimizer/compile configs to avoid pickle errors
                    model = tf.keras.models.model_from_json(config)
                    print("SUCCESS: Reconstructed model architecture from JSON config!")
                    model.summary()
                except Exception as e_json:
                    print(f"Failed to load from JSON: {e_json}")
                    
                # Let's print the layers to see where the Lambda layer is!
                print("\nLayers in config:")
                layers = config_dict.get("config", {}).get("layers", [])
                for i, layer in enumerate(layers):
                    cname = layer.get("class_name")
                    name = layer.get("name")
                    print(f"  Layer {i}: Name={name}, Class={cname}")
                    if cname == "Lambda":
                        print(f"    Lambda layer config: {layer.get('config')}")
                        
    except Exception as e:
        print(f"Error: {e}")
else:
    print("full_retina_model.h5 does not exist")
