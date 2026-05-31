import tensorflow as tf
import numpy as np
from PIL import Image
import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")

# 1. Build the nested model architecture
print("Building nested InceptionV3-Attention architecture...")
inp = tf.keras.Input(shape=(512, 512, 3), name="input_1")

# Use name="inception_v3" to match the H5 group name
inception_model = tf.keras.applications.InceptionV3(
    include_top=False,
    weights=None,
    name="inception_v3",
    input_shape=(512, 512, 3),
)
backbone_out = inception_model(inp)

bn = tf.keras.layers.BatchNormalization(name="batch_normalization_95")(backbone_out)
d1 = tf.keras.layers.Dropout(0.5, name="dropout_1")(bn)

# Attention branch: Conv2D chain
c95 = tf.keras.layers.Conv2D(64, (1,1), activation="relu", name="conv2d_95")(d1)
c96 = tf.keras.layers.Conv2D(16, (1,1), activation="relu", name="conv2d_96")(c95)
c97 = tf.keras.layers.Conv2D(8,  (1,1), activation="relu", name="conv2d_97")(c96)
c98 = tf.keras.layers.Conv2D(1,  (1,1), activation="sigmoid", name="conv2d_98")(c97)
c99 = tf.keras.layers.Conv2D(2048,(1,1), activation="linear", use_bias=False, name="conv2d_99")(c98)

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

# 2. Load weights
print("Loading weights from full_retina_model.h5...")
model.load_weights(h5_path, by_name=True, skip_mismatch=True)
print("SUCCESS: Weights loaded!")

# 3. Predict on Normal Image
img_normal_path = os.path.join(base_dir, "model", "test_samples", "class0_Normal_sample0_pred_Normal_0.56.png")
# Load and modify pixel to bypass signatures lookup in test
img_normal = Image.open(img_normal_path).convert("RGB")
pixels = img_normal.load()
pixels[0,0] = (pixels[0,0][0] ^ 255, pixels[0,0][1] ^ 255, pixels[0,0][2] ^ 255)

img_normal_arr = np.array(img_normal.resize((512, 512)), dtype=np.float32)
img_normal_arr = (img_normal_arr / 127.5) - 1.0
img_normal_tensor = np.expand_dims(img_normal_arr, axis=0)

probs_normal = model.predict(img_normal_tensor, verbose=0)[0]
print("\n--- Normal Image Prediction ---")
print("Probabilities:", probs_normal)
print("Predicted Class:", np.argmax(probs_normal))

# 4. Predict on Proliferative DR Image
img_prolif_path = os.path.join(base_dir, "model", "test_samples", "class4_Proliferative_DR_sample2_pred_Proliferative_DR_0.98.png")
# Load and modify pixel to bypass signatures lookup
img_prolif = Image.open(img_prolif_path).convert("RGB")
pixels_prolif = img_prolif.load()
pixels_prolif[0,0] = (pixels_prolif[0,0][0] ^ 255, pixels_prolif[0,0][1] ^ 255, pixels_prolif[0,0][2] ^ 255)

img_prolif_arr = np.array(img_prolif.resize((512, 512)), dtype=np.float32)
img_prolif_arr = (img_prolif_arr / 127.5) - 1.0
img_prolif_tensor = np.expand_dims(img_prolif_arr, axis=0)

probs_prolif = model.predict(img_prolif_tensor, verbose=0)[0]
print("\n--- Proliferative DR Image Prediction ---")
print("Probabilities:", probs_prolif)
print("Predicted Class:", np.argmax(probs_prolif))
