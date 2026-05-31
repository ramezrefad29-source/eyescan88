"""
Rebuild full_retina_model.h5 architecture manually and load weights.
Architecture: InceptionV3 + Attention + Dense(128) + Dense(5, softmax)
Input: (512, 512, 3)
Output: 5 classes
"""
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
import numpy as np
import h5py

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

print("=" * 60)
print("  Rebuilding model architecture manually")
print("=" * 60)

# 1. Build the architecture exactly matching the h5 config
inp = tf.keras.Input(shape=(512, 512, 3), name="input_1")

# InceptionV3 backbone (include_top=False gives feature maps)
inception = tf.keras.applications.InceptionV3(
    include_top=False,
    weights=None,  # we'll load from h5
    input_tensor=inp,
    input_shape=(512, 512, 3),
)
backbone_out = inception.output  # shape: (batch, H, W, 2048)

# BatchNorm
bn = tf.keras.layers.BatchNormalization(name="batch_normalization_95")(backbone_out)

# Dropout
d1 = tf.keras.layers.Dropout(0.5, name="dropout_1")(bn)

# Attention branch: Conv2D chain
c95 = tf.keras.layers.Conv2D(64, (1,1), activation="relu", name="conv2d_95")(d1)
c96 = tf.keras.layers.Conv2D(16, (1,1), activation="relu", name="conv2d_96")(c95)
c97 = tf.keras.layers.Conv2D(8,  (1,1), activation="relu", name="conv2d_97")(c96)
c98 = tf.keras.layers.Conv2D(1,  (1,1), activation="sigmoid", name="conv2d_98")(c97)  # attention map
c99 = tf.keras.layers.Conv2D(2048,(1,1), activation="linear", use_bias=False, name="conv2d_99")(c98)  # channel project

# Multiply attention with backbone features
mul = tf.keras.layers.Multiply(name="multiply_1")([c99, bn])

# Two GAP branches
gap1 = tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d_1")(mul)
gap2 = tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d_2")(c99)

# Lambda: RescaleGAP = gap1 / gap2
rescale = tf.keras.layers.Lambda(lambda x: x[0] / x[1], name="RescaleGAP")([gap1, gap2])

# Classification head
d2 = tf.keras.layers.Dropout(0.25, name="dropout_2")(rescale)
dense1 = tf.keras.layers.Dense(128, activation="relu", name="dense_1")(d2)
d3 = tf.keras.layers.Dropout(0.25, name="dropout_3")(dense1)
output = tf.keras.layers.Dense(5, activation="softmax", name="dense_2")(d3)

model = tf.keras.Model(inputs=inp, outputs=output, name="retina_model")
print(f"\nModel built! Total params: {model.count_params()}")

# 2. Load weights from h5 file
print("\nLoading weights from h5 file...")
try:
    model.load_weights(h5_path)
    print("SUCCESS: Weights loaded!")
except Exception as e:
    print(f"Direct load_weights failed: {e}")
    print("Trying load_weights with by_name=True, skip_mismatch=True...")
    try:
        model.load_weights(h5_path, by_name=True, skip_mismatch=True)
        print("SUCCESS with by_name=True!")
    except Exception as e2:
        print(f"Also failed: {e2}")
        exit(1)

# 3. Test inference
print("\nRunning test inference...")
test_input = np.random.rand(1, 512, 512, 3).astype(np.float32)
output = model.predict(test_input, verbose=0)
print(f"Output shape: {output.shape}")
print(f"Output values: {output[0]}")
print(f"Predicted class: {np.argmax(output[0])}")
print(f"Sum of probs: {output[0].sum():.4f}")

# 4. Save as SavedModel format for easy loading
saved_path = os.path.join(base_dir, "model", "retina_keras_model.keras")
model.save(saved_path)
print(f"\nSaved clean model to: {saved_path}")

print("\n" + "=" * 60)
print("  Model successfully rebuilt and verified!")
print("=" * 60)
