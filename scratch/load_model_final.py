import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
import keras
import h5py
import json
import numpy as np

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

print("=" * 60)
print("  Attempting to load full_retina_model.h5")
print("=" * 60)

# Approach 1: enable_unsafe_deserialization + compile=False
print("\n[Approach 1] enable_unsafe_deserialization...")
try:
    keras.config.enable_unsafe_deserialization()
    model = keras.models.load_model(h5_path, compile=False)
    print("SUCCESS with Approach 1!")
    model.summary()
    
    # Test inference
    test_input = np.random.rand(1, 512, 512, 3).astype(np.float32)
    output = model.predict(test_input, verbose=0)
    print(f"\nTest output shape: {output.shape}")
    print(f"Test output values: {output[0]}")
    print(f"Number of output classes: {output.shape[-1]}")
    exit(0)
except Exception as e:
    print(f"Failed: {e}")

# Approach 2: Use legacy tf.compat.v1 path
print("\n[Approach 2] tf.compat.v1.keras...")
try:
    import tensorflow.compat.v1.keras as legacy_keras
    model = legacy_keras.models.load_model(h5_path, compile=False)
    print("SUCCESS with Approach 2!")
    model.summary()
    exit(0)
except Exception as e:
    print(f"Failed: {e}")

# Approach 3: Reconstruct architecture manually and load weights
print("\n[Approach 3] Manual architecture reconstruction...")
try:
    # We know the architecture from the config:
    # Input(512,512,3) -> InceptionV3 -> BatchNorm -> Dropout -> 
    # 5xConv2D -> Multiply -> 2xGAP -> Lambda(rescale) -> Dropout -> Dense -> Dropout -> Dense
    
    # First, let's read the full config to get dense layer sizes
    with h5py.File(h5_path, 'r') as f:
        config = f.attrs['model_config']
        if isinstance(config, bytes):
            config = config.decode('utf-8')
        config_dict = json.loads(config)
        layers = config_dict.get("config", {}).get("layers", [])
        
        # Get dense layer configs
        for layer in layers:
            if layer.get("class_name") == "Dense":
                name = layer.get("name")
                units = layer.get("config", {}).get("units")
                activation = layer.get("config", {}).get("activation")
                print(f"  Dense layer '{name}': units={units}, activation={activation}")
        
        # Get Conv2D configs
        for layer in layers:
            if layer.get("class_name") == "Conv2D":
                name = layer.get("name")
                filters = layer.get("config", {}).get("filters")
                kernel = layer.get("config", {}).get("kernel_size")
                activation = layer.get("config", {}).get("activation")
                print(f"  Conv2D layer '{name}': filters={filters}, kernel={kernel}, activation={activation}")
        
        # Get Dropout configs
        for layer in layers:
            if layer.get("class_name") == "Dropout":
                name = layer.get("name")
                rate = layer.get("config", {}).get("rate")
                print(f"  Dropout layer '{name}': rate={rate}")
                
        # Get all inbound nodes to understand flow
        print("\n  Connectivity (inbound_nodes):")
        for layer in layers:
            name = layer.get("name")
            inbound = layer.get("inbound_nodes", [])
            if inbound:
                # Extract the connection names
                connections = []
                for node_group in inbound:
                    for conn in node_group:
                        if isinstance(conn, list) and len(conn) >= 1:
                            connections.append(conn[0])
                        elif isinstance(conn, str):
                            connections.append(conn)
                print(f"    {name} <- {connections}")
                
except Exception as e:
    print(f"Failed: {e}")
    import traceback
    traceback.print_exc()
