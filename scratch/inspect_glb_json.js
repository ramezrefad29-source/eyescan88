const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/realistic_human_eye.glb');

try {
  const buffer = fs.readFileSync(filePath);
  
  // Read GLB header
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  console.log(`GLB Magic: 0x${magic.toString(16)} (expected: 0x46546c67)`);
  console.log(`GLB Version: ${version}`);
  console.log(`GLB Total Length: ${length} bytes`);
  
  // Read Chunk 0 (JSON)
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  
  console.log(`Chunk 0 Length: ${chunkLength} bytes`);
  console.log(`Chunk 0 Type: 0x${chunkType.toString(16)} (expected: 0x4e4f534a)`);
  
  if (chunkType === 0x4e4f534a) {
    const jsonBuffer = buffer.slice(20, 20 + chunkLength);
    const jsonStr = jsonBuffer.toString('utf8');
    const gltf = JSON.parse(jsonStr);
    
    console.log('\n--- GLTF Metadata ---');
    console.log('Generator:', gltf.asset ? gltf.asset.generator : 'unknown');
    console.log('Version:', gltf.asset ? gltf.asset.version : 'unknown');
    
    console.log('\n--- Scenes ---');
    console.log(JSON.stringify(gltf.scenes, null, 2));
    
    console.log('\n--- Nodes (first 10) ---');
    if (gltf.nodes) {
      gltf.nodes.slice(0, 10).forEach((node, idx) => {
        console.log(`Node ${idx}: Name = "${node.name || 'unnamed'}", Mesh = ${node.mesh !== undefined ? node.mesh : 'none'}, Children = ${node.children ? node.children.length : 0}`);
        if (node.translation) console.log(`  Translation: ${node.translation}`);
        if (node.rotation) console.log(`  Rotation: ${node.rotation}`);
        if (node.scale) console.log(`  Scale: ${node.scale}`);
      });
    }
    
    console.log('\n--- Meshes ---');
    if (gltf.meshes) {
      gltf.meshes.forEach((mesh, idx) => {
        console.log(`Mesh ${idx}: Name = "${mesh.name || 'unnamed'}"`);
        mesh.primitives.forEach((prim, pIdx) => {
          console.log(`  Primitive ${pIdx}: Mode = ${prim.mode !== undefined ? prim.mode : 4}, Attributes = ${JSON.stringify(prim.attributes)}`);
          if (prim.material !== undefined) console.log(`    Material Index: ${prim.material}`);
        });
      });
    }

    console.log('\n--- Accessors ---');
    if (gltf.accessors) {
      gltf.accessors.forEach((acc, idx) => {
        if (acc.min || acc.max) {
          console.log(`Accessor ${idx}: Type = ${acc.type}, ComponentType = ${acc.componentType}, Count = ${acc.count}`);
          if (acc.min) console.log(`  Min: ${JSON.stringify(acc.min)}`);
          if (acc.max) console.log(`  Max: ${JSON.stringify(acc.max)}`);
        }
      });
    }

    console.log('\n--- Materials ---');
    if (gltf.materials) {
      gltf.materials.forEach((mat, idx) => {
        console.log(`Material ${idx}: Name = "${mat.name || 'unnamed'}"`);
        if (mat.pbrMetallicRoughness) {
          console.log(`  Base Color Factor: ${mat.pbrMetallicRoughness.baseColorFactor}`);
          console.log(`  Metallic: ${mat.pbrMetallicRoughness.metallicFactor}, Roughness: ${mat.pbrMetallicRoughness.roughnessFactor}`);
        }
        if (mat.extensions) {
          console.log(`  Extensions: ${Object.keys(mat.extensions).join(', ')}`);
          console.log(`  Extension details: ${JSON.stringify(mat.extensions)}`);
        }
      });
    }
  } else {
    console.log('Chunk 0 is not JSON!');
  }
} catch (err) {
  console.error('Error reading GLB file:', err);
}
