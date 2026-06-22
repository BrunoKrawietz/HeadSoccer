


function calculateNormals(vertices, indices) {
    const normals = new Array(vertices.length).fill(0);
    // For each triangle in the model...
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i+1] * 3;
        const i2 = indices[i+2] * 3;

        const v1 = [vertices[i0], vertices[i0+1], vertices[i0+2]];
        const v2 = [vertices[i1], vertices[i1+1], vertices[i1+2]];
        const v3 = [vertices[i2], vertices[i2+1], vertices[i2+2]];

        // Calculate the normal of the triangle's surface (using cross product)
        const a = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
        const b = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
        const normal = [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];

        // Add this normal to all three vertices of the triangle
        for (let j = 0; j < 3; j++) {
            normals[i0 + j] += normal[j];
            normals[i1 + j] += normal[j];
            normals[i2 + j] += normal[j];
        }
    }
    // Normalize all the resulting vertex normals
    for (let i = 0; i < normals.length; i += 3) {
        const n = [normals[i], normals[i+1], normals[i+2]];
        const len = Math.sqrt(n[0]*n[0] + n[1]*n[1] + n[2]*n[2]);
        if (len > 0) {
            normals[i] = n[0] / len;
            normals[i+1] = n[1] / len;
            normals[i+2] = n[2] / len;
        }
    }
    return new Float32Array(normals);
}


async function loadOBJ(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load OBJ: ${response.statusText}`);
    const text = await response.text();

    const positions = [];
    const finalVertices = [];
    const vertexMap = new Map();
    const indices = [];

    const lines = text.split('\n');
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const type = parts.shift();
        if (type === 'v') {
            positions.push(parts.map(parseFloat));
        } else if (type === 'f') {
            for (let i = 0; i < 3; i++) {
                const facePart = parts[i];
                if (vertexMap.has(facePart)) {
                    indices.push(vertexMap.get(facePart));
                } else {
                    const [posIdx] = facePart.split('/').map(s => parseInt(s, 10));
                    const position = positions[posIdx - 1];
                    finalVertices.push(...position);
                    const newIndex = vertexMap.size;
                    vertexMap.set(facePart, newIndex);
                    indices.push(newIndex);
                }
            }
        }
    }
    
    // Convert to Float32Array before calculating normals
    const finalVerticesArray = new Float32Array(finalVertices);
    // MODIFIED: Calculate our own fresh normals instead of trusting the file
    const finalNormals = calculateNormals(finalVerticesArray, indices);

    return {
        vertices: finalVerticesArray,
        normals: finalNormals,
        indices: new Uint16Array(indices)
    };
}
