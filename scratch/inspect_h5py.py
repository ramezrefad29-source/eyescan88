import h5py
import os
import json

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

print("Inspecting with h5py...")
if os.path.exists(h5_path):
    try:
        with h5py.File(h5_path, 'r') as f:
            print("Successfully opened with h5py!")
            print("Root keys:", list(f.keys()))
            
            # Print Keras model config if available
            if 'model_config' in f.attrs:
                print("\nModel Config found in attributes!")
                config = f.attrs['model_config']
                # h5py attributes are bytes, decode them
                if isinstance(config, bytes):
                    config = config.decode('utf-8')
                try:
                    config_dict = json.loads(config)
                    print("Class Name:", config_dict.get("class_name"))
                    # Find input shape
                    layers = config_dict.get("config", {}).get("layers", [])
                    for layer in layers:
                        if layer.get("class_name") in ["InputLayer", "Input"]:
                            print(f"Input shape: {layer.get('config', {}).get('batch_input_shape')}")
                            break
                except Exception as je:
                    print("Failed to parse JSON config:", je)
                    # Print first 200 chars of config
                    print(str(config)[:200])
                    
    except Exception as e:
        print(f"Failed to open with h5py: {e}")
else:
    print("full_retina_model.h5 does not exist")
