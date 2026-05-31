const fs = require('fs');
const path = require('path');

function readGlb(filePath) {
  console.log(`\n=========================================`);
  console.log(`Reading GLB: ${path.basename(filePath)}`);
  console.log(`=========================================`);
  
  const buffer = fs.readFileSync(filePath);
  
  // Read GLB header
  const magic = buffer.toString('utf8', 0, 4);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  if (magic !== 'glTF') {
    console.error('Not a valid GLB file');
    return;
  }
  
  // Read Chunk 0 (JSON)
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.toString('utf8', 16, 20);
  
  if (chunkType !== 'JSON') {
    console.error('First chunk is not JSON');
    return;
  }
  
  const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
  const gltf = JSON.parse(jsonStr);
  
  console.log(`Nodes count: ${gltf.nodes ? gltf.nodes.length : 0}`);
  console.log(`Meshes count: ${gltf.meshes ? gltf.meshes.length : 0}`);
  console.log(`Materials count: ${gltf.materials ? gltf.materials.length : 0}`);
  
  console.log('\n--- Materials: ---');
  if (gltf.materials) {
    gltf.materials.forEach((mat, idx) => {
      console.log(`Material [${idx}]: "${mat.name || 'unnamed'}"`);
    });
  } else {
    console.log('No materials found');
  }

  console.log('\n--- Meshes & Nodes: ---');
  if (gltf.nodes) {
    gltf.nodes.forEach((node, idx) => {
      if (node.name) {
        console.log(`Node [${idx}]: "${node.name}" (mesh: ${node.mesh !== undefined ? node.mesh : 'none'})`);
      }
    });
  }
}

const publicDir = 'c:/Users/LENOVO/Desktop/eyescan/public';
readGlb(path.join(publicDir, 'realistic_human_eye.glb'));
readGlb(path.join(publicDir, 'my_model_of_eye.glb'));
