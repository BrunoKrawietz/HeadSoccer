function createField() {
    const width = 9.0;
    const depth = 2.6;
    const vertices = [
        -width / 2, -depth / 2, 0,
         width / 2, -depth / 2, 0,
         width / 2,  depth / 2, 0,
        -width / 2,  depth / 2, 0
    ];
    const normals = [0,0,1, 0,0,1, 0,0,1, 0,0,1];
    const texCoords = [0,0, 1,0, 1,1, 0,1];
    const indices = [0,1,2, 0,2,3];
    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

function createUnitCube() {
    const s = 0.5;
    const vertices = [
        // front
        -s,-s, s,  s,-s, s,  s, s, s, -s, s, s,
        // back
        -s, s,-s,  s, s,-s,  s,-s,-s, -s,-s,-s,
        // left
        -s,-s,-s, -s,-s, s, -s, s, s, -s, s,-s,
        // right
         s,-s, s,  s,-s,-s,  s, s,-s,  s, s, s,
        // top
        -s, s, s,  s, s, s,  s, s,-s, -s, s,-s,
        // bottom
        -s,-s,-s,  s,-s,-s,  s,-s, s, -s,-s, s
    ];
    const normals = [
        0,0,1, 0,0,1, 0,0,1, 0,0,1,
        0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
        -1,0,0, -1,0,0, -1,0,0, -1,0,0,
        1,0,0, 1,0,0, 1,0,0, 1,0,0,
        0,1,0, 0,1,0, 0,1,0, 0,1,0,
        0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0
    ];
    const indices = [
        0,1,2, 0,2,3,
        4,5,6, 4,6,7,
        8,9,10, 8,10,11,
        12,13,14, 12,14,15,
        16,17,18, 16,18,19,
        20,21,22, 20,22,23
    ];
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

function createCylinder(segments = 32) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];
    const radius = 0.5;
    const height = 1.0;

    for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const angle = u * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        vertices.push(x, y, height / 2, x, y, -height / 2);
        normals.push(x, y, 0, x, y, 0);
        texCoords.push(u, 0, u, 1);
    }

    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }

    const topCenter = vertices.length / 3;
    vertices.push(0, 0, height / 2);
    normals.push(0, 0, 1);
    texCoords.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
        const angle = i * Math.PI * 2 / segments;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        vertices.push(x, y, height / 2);
        normals.push(0, 0, 1);
        texCoords.push(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
    }
    for (let i = 0; i < segments; i++) indices.push(topCenter, topCenter + i + 1, topCenter + i + 2);

    const bottomCenter = vertices.length / 3;
    vertices.push(0, 0, -height / 2);
    normals.push(0, 0, -1);
    texCoords.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
        const angle = i * Math.PI * 2 / segments;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        vertices.push(x, y, -height / 2);
        normals.push(0, 0, -1);
        texCoords.push(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
    }
    for (let i = 0; i < segments; i++) indices.push(bottomCenter, bottomCenter + i + 2, bottomCenter + i + 1);

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

function createSphere(segments = 32, rings = 16) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];
    const radius = 0.5;

    for (let r = 0; r <= rings; r++) {
        const v = r / rings;
        const theta = v * Math.PI;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let s = 0; s <= segments; s++) {
            const u = s / segments;
            const phi = u * Math.PI * 2;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            const x = cosPhi * sinTheta;
            const y = sinPhi * sinTheta;
            const z = cosTheta;
            vertices.push(radius * x, radius * y, radius * z);
            normals.push(x, y, z);
            texCoords.push(u, 1 - v);
        }
    }

    for (let r = 0; r < rings; r++) {
        for (let s = 0; s < segments; s++) {
            const first = r * (segments + 1) + s;
            const second = first + segments + 1;
            indices.push(first, second, first + 1, second, second + 1, first + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

function createFieldLine() { return createUnitCube(); }
function createGoalPost() { return createUnitCube(); }
function createPlayerBody() { return createUnitCube(); }
function createPlayerHead() { return createSphere(32, 16); }
function createBall() { return createSphere(40, 20); }
function createPowerUp() { return createCylinder(32); }
function createShadowDisc() { return createCylinder(32); }
