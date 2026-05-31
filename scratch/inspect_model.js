const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'realistic_human_eye.glb');

try {
  const buffer = fs.readFileSync(filePath);
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);

  if (chunkType === 0x4e4f534a) {
    const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);
    
    console.log('Materials list:');
    console.log(JSON.stringify(gltf.materials, null, 2));

    console.log('\nMeshes list:');
    console.log(JSON.stringify(gltf.meshes, null, 2));
  }
} catch (err) {
  console.error('Error:', err);
}
