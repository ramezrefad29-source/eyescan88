const fs = require('fs');

function inspectGlb(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Chunk 0 (JSON)
    const chunkLength = buffer.readUInt32LE(12);
    const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);
    
    console.log("\n--- Nodes & Meshes ---");
    if (gltf.nodes) {
      gltf.nodes.forEach((node, i) => {
        if (node.mesh !== undefined) {
          const mesh = gltf.meshes[node.mesh];
          console.log(`Node ${i} (${node.name}): Mesh ${node.mesh} (${mesh.name})`);
          if (node.translation) console.log(`  Translation: ${JSON.stringify(node.translation)}`);
          if (node.scale) console.log(`  Scale: ${JSON.stringify(node.scale)}`);
          if (node.rotation) console.log(`  Rotation: ${JSON.stringify(node.rotation)}`);
        }
      });
    }
  } catch (err) {
    console.error("Error parsing GLB:", err);
  }
}

inspectGlb("my_model_of_eye.glb");
