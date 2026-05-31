import h5py
import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

with h5py.File(h5_path, 'r') as f:
    # Let's explore the keys in the h5 file to see how weights are structured
    print("Top-level keys:", list(f.keys()))
    
    # Keras models store weights in 'model_weights' or under layer names
    # Let's find 'conv2d_99'
    def print_structure(name, obj):
        if isinstance(obj, h5py.Dataset):
            if 'conv2d_99' in name or 'dense_2' in name:
                print(f"Dataset: {name}, Shape: {obj.shape}")
                
    f.visititems(print_structure)
