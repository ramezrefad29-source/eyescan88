import h5py
import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

print("Listing all weight groups inside full_retina_model.h5...")
with h5py.File(h5_path, 'r') as f:
    if 'model_weights' in f:
        weights_group = f['model_weights']
        print(f"Total weight keys at root of model_weights: {list(weights_group.keys())}")
        
        # Let's count total datasets and print them
        datasets = []
        def visitor(name, obj):
            if isinstance(obj, h5py.Dataset):
                datasets.append((name, obj.shape))
        weights_group.visititems(visitor)
        
        print(f"\nTotal datasets in model_weights: {len(datasets)}")
        print("\nFirst 30 datasets:")
        for name, shape in datasets[:30]:
            print(f"  {name}: {shape}")
            
        print("\nLast 20 datasets:")
        for name, shape in datasets[-20:]:
            print(f"  {name}: {shape}")
    else:
        print("No model_weights key found!")
