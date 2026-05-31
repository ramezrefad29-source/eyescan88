import tensorflow as tf
import numpy as np
import h5py
import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
h5_path = os.path.join(base_dir, "full_retina_model.h5")
keras_model_path = os.path.join(base_dir, "model", "retina_keras_model.keras")

# 1. Load the manual architecture
print("Building architecture...")
inp = tf.keras.Input(shape=(512, 512, 3), name="input_1")
inception = tf.keras.applications.InceptionV3(
    include_top=False,
    weights=None,
    input_tensor=inp,
    input_shape=(512, 512, 3),
)
bn = tf.keras.layers.BatchNormalization(name="batch_normalization_95")(inception.output)
d1 = tf.keras.layers.Dropout(0.5, name="dropout_1")(bn)
c95 = tf.keras.layers.Conv2D(64, (1,1), activation="relu", name="conv2d_95")(d1)
c96 = tf.keras.layers.Conv2D(16, (1,1), activation="relu", name="conv2d_96")(c95)
c97 = tf.keras.layers.Conv2D(8,  (1,1), activation="relu", name="conv2d_97")(c96)
c98 = tf.keras.layers.Conv2D(1,  (1,1), activation="sigmoid", name="conv2d_98")(c97)
c99 = tf.keras.layers.Conv2D(2048,(1,1), activation="linear", use_bias=False, name="conv2d_99")(c98)
mul = tf.keras.layers.Multiply(name="multiply_1")([c99, bn])
gap1 = tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d_1")(mul)
gap2 = tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d_2")(c99)
rescale = tf.keras.layers.Lambda(lambda x: x[0] / x[1], name="RescaleGAP")([gap1, gap2])
d2 = tf.keras.layers.Dropout(0.25, name="dropout_2")(rescale)
dense1 = tf.keras.layers.Dense(128, activation="relu", name="dense_1")(d2)
d3 = tf.keras.layers.Dropout(0.25, name="dropout_3")(dense1)
output = tf.keras.layers.Dense(5, activation="softmax", name="dense_2")(d3)

model = tf.keras.Model(inputs=inp, outputs=output, name="retina_model")

# Get a reference weight before loading
inception_first_conv = model.get_layer("inception_v3").layers[1]
print(f"Backbone first layer name: {inception_first_conv.name}")
w_before = inception_first_conv.get_weights()[0][0,0,0,:5]
print("Weight before loading:", w_before)

# Load weights by name
print("\nLoading weights by name...")
model.load_weights(h5_path, by_name=True, skip_mismatch=True)

w_after = inception_first_conv.get_weights()[0][0,0,0,:5]
print("Weight after loading:", w_after)

# Check if weights changed
if np.allclose(w_before, w_after):
    print("\nWARNING: Backbone weights did NOT change! They were not loaded!")
else:
    print("\nSUCCESS: Backbone weights changed! They were loaded successfully!")
    
# Let's inspect the h5 weights directly for comparison
with h5py.File(h5_path, 'r') as f:
    h5_w = f['model_weights/inception_v3/conv2d/kernel:0'][0,0,0,:5]
    print("Weight directly in h5:", h5_w)
    if np.allclose(w_after, h5_w):
        print("Model weight matches H5 weight exactly!")
    else:
        print("Model weight does NOT match H5 weight!")
