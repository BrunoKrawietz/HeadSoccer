let gl;
let textureProgram;
let solidProgram;

let uniforms = { texture: {}, solid: {} };
let attributes = { texture: {}, solid: {} };

let gameState;
let camera;
let buffers = {};
let textures = {};

async function startHeadSoccer() {

    const canvas = document.getElementById('gameCanvas');
    gl = canvas.getContext('webgl', { antialias: true });

    if (!gl) {

        document.getElementById('webglError').classList.remove('hidden');
        document.getElementById('gameContainer').style.display = 'none';
        return;

    }

    resizeCanvas(canvas);
    window.addEventListener('resize', () => resizeCanvas(canvas));

    if (!SetupRenderingPrograms()) {

        console.error('Shader initialization failed.');
        return;

    }

    setupSceneBuffers();

    textures.field = createFieldTexture();
    textures.ball = createBallTexture();

    gameState = new GameState();
    camera = new Camera(canvas);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.035, 0.055, 0.09, 1.0);
    requestAnimationFrame(render);

}

function resizeCanvas(canvas) {

    const displayWidth = canvas.clientWidth || 1200;
    const displayHeight = canvas.clientHeight || 800;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {

        canvas.width = displayWidth;
        canvas.height = displayHeight;

    }

    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
}

function SetupRenderingPrograms() {

    const vsTexture = `
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_texCoord;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projMatrix;

        uniform mat3 u_normalMatrix;

        varying vec2 v_texCoord;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        void main() {

            vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);

            v_worldPosition = worldPos.xyz;
            v_normal = normalize(u_normalMatrix * a_normal);
            v_texCoord = a_texCoord;

            gl_Position = u_projMatrix * u_viewMatrix * worldPos;

        }`;

    const fsTexture = `
        precision mediump float;

        varying vec2 v_texCoord;
        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        uniform sampler2D u_texture;

        uniform vec3 u_cameraPosition;
        uniform vec3 u_lightPositions[5];

        uniform float u_lightIntensity;
        uniform float u_specularStrength;

        void main() {

            vec3 baseColor = texture2D(u_texture, v_texCoord).rgb;
            vec3 normal = normalize(v_normal);
            vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);
            vec3 color = baseColor * 0.42;

            for (int i = 0; i < 5; i++) {

                vec3 lightDir = normalize(u_lightPositions[i] - v_worldPosition);

                float distance = length(u_lightPositions[i] - v_worldPosition);
                float attenuation = 1.0 / (1.0 + 0.07 * distance + 0.025 * distance * distance);
                float diff = max(dot(normal, lightDir), 0.0);

                vec3 reflectDir = reflect(-lightDir, normal);

                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 36.0) * u_specularStrength;

                color += (baseColor * diff + vec3(spec)) * attenuation * u_lightIntensity;
            }

            gl_FragColor = vec4(color, 1.0);
        }`;

    textureProgram = buildShaderProgram(vsTexture, fsTexture);

    if (!textureProgram) return false;

    attributes.texture = {

        position: gl.getAttribLocation(textureProgram, 'a_position'),
        normal: gl.getAttribLocation(textureProgram, 'a_normal'),
        texCoord: gl.getAttribLocation(textureProgram, 'a_texCoord')

    };

    uniforms.texture = {

        modelMatrix: gl.getUniformLocation(textureProgram, 'u_modelMatrix'),
        viewMatrix: gl.getUniformLocation(textureProgram, 'u_viewMatrix'),
        projMatrix: gl.getUniformLocation(textureProgram, 'u_projMatrix'),
        normalMatrix: gl.getUniformLocation(textureProgram, 'u_normalMatrix'),

        texture: gl.getUniformLocation(textureProgram, 'u_texture'),

        cameraPosition: gl.getUniformLocation(textureProgram, 'u_cameraPosition'),
        lightPositions: [

            gl.getUniformLocation(textureProgram, 'u_lightPositions[0]'),
            gl.getUniformLocation(textureProgram, 'u_lightPositions[1]'),
            gl.getUniformLocation(textureProgram, 'u_lightPositions[2]'),
            gl.getUniformLocation(textureProgram, 'u_lightPositions[3]'),
            gl.getUniformLocation(textureProgram, 'u_lightPositions[4]')

        ],

        lightIntensity: gl.getUniformLocation(textureProgram, 'u_lightIntensity'),
        specularStrength: gl.getUniformLocation(textureProgram, 'u_specularStrength')

    };

    const vsSolid = `

        attribute vec3 a_position;
        attribute vec3 a_normal;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projMatrix;

        uniform mat3 u_normalMatrix;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        void main() {

            vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);

            v_worldPosition = worldPos.xyz;
            v_normal = normalize(u_normalMatrix * a_normal);

            gl_Position = u_projMatrix * u_viewMatrix * worldPos;
        }`;

    const fsSolid = `

        precision mediump float;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        uniform vec3 u_color;
        uniform vec3 u_cameraPosition;
        uniform vec3 u_lightPositions[5];
        uniform float u_lightIntensity;
        uniform float u_specularStrength;

        void main() {

            vec3 normal = normalize(v_normal);
            vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);
            vec3 color = u_color * 0.26;

            for (int i = 0; i < 5; i++) {

                vec3 lightDir = normalize(u_lightPositions[i] - v_worldPosition);

                float distance = length(u_lightPositions[i] - v_worldPosition);
                float attenuation = 1.0 / (1.0 + 0.08 * distance + 0.028 * distance * distance);
                float diff = max(dot(normal, lightDir), 0.0);

                vec3 reflectDir = reflect(-lightDir, normal);

                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 52.0) * u_specularStrength;
                color += (u_color * diff + vec3(spec)) * attenuation * u_lightIntensity;

            }

            gl_FragColor = vec4(color, 1.0);
        }`;

    solidProgram = buildShaderProgram(vsSolid, fsSolid);

    if (!solidProgram) return false;

    attributes.solid = {

        position: gl.getAttribLocation(solidProgram, 'a_position'),
        normal: gl.getAttribLocation(solidProgram, 'a_normal')

    };

    uniforms.solid = {

        modelMatrix: gl.getUniformLocation(solidProgram, 'u_modelMatrix'),
        viewMatrix: gl.getUniformLocation(solidProgram, 'u_viewMatrix'),
        projMatrix: gl.getUniformLocation(solidProgram, 'u_projMatrix'),
        normalMatrix: gl.getUniformLocation(solidProgram, 'u_normalMatrix'),

        color: gl.getUniformLocation(solidProgram, 'u_color'),

        cameraPosition: gl.getUniformLocation(solidProgram, 'u_cameraPosition'),
        lightPositions: [

            gl.getUniformLocation(solidProgram, 'u_lightPositions[0]'),
            gl.getUniformLocation(solidProgram, 'u_lightPositions[1]'),
            gl.getUniformLocation(solidProgram, 'u_lightPositions[2]'),
            gl.getUniformLocation(solidProgram, 'u_lightPositions[3]'),
            gl.getUniformLocation(solidProgram, 'u_lightPositions[4]')
        ],

        lightIntensity: gl.getUniformLocation(solidProgram, 'u_lightIntensity'),
        specularStrength: gl.getUniformLocation(solidProgram, 'u_specularStrength')
    };

    return true;
}

function buildShaderProgram(vsSource, fsSource) {

    const vertexShader = buildShaderSource(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = buildShaderSource(gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

        console.error('Unable to link shader program:', gl.getProgramInfoLog(program));
        return null;

    }

    return program;
}

function buildShaderSource(type, source) {

    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;

    }

    return shader;
}

function setupSceneBuffers() {

    buffers.field = uploadMesh(createFieldMesh());
    buffers.cube = uploadMesh(createBoxMesh());
    buffers.goalPost = uploadMesh(createGoalPostMesh());
    buffers.body = uploadMesh(createPlayerBodyMesh());
    buffers.head = uploadMesh(createPlayerHeadMesh());
    buffers.ball = uploadMesh(createBallMesh());
    buffers.powerUp = uploadMesh(createPowerUpMesh());

}

function uploadMesh(geometry) {

    const bufferSet = {

        vertices: gl.createBuffer(),
        indices: gl.createBuffer(),
        numIndices: geometry.indices.length

    };

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

    if (geometry.normals) {

        bufferSet.normals = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.normals);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);

    }

    if (geometry.textureCoordinates) {

        bufferSet.textureCoordinates = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.textureCoordinates);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.textureCoordinates, gl.STATIC_DRAW);

    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    return bufferSet;
}

function createTextureFromCanvas(canvas) {

    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    return texture;
}

function createFieldTexture() {

    const canvas = document.createElement('canvas');

    canvas.width = 2048;
    canvas.height = 1024;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#227a36';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 12; i++) {

        ctx.fillStyle = i % 2 === 0 ? '#2b9043' : '#1f7132';
        ctx.fillRect(i * canvas.width / 12, 0, canvas.width / 12, canvas.height);

    }

    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 14;

    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 18);
    ctx.lineTo(canvas.width / 2, canvas.height - 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 130, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 12;
    ctx.strokeRect(18, canvas.height / 2 - 215, 275, 430);
    ctx.strokeRect(canvas.width - 293, canvas.height / 2 - 215, 275, 430);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';

    for (let i = 0; i < 260; i++) {

        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 2, 10 + Math.random() * 16);

    }

    return createTextureFromCanvas(canvas);
}

function createBallTexture() {

    const canvas = document.createElement('canvas');

    canvas.width = 1024;
    canvas.height = 512;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 8;

    for (let x = -80; x < canvas.width + 80; x += 170) {

        for (let y = -70; y < canvas.height + 70; y += 145) {

            ctx.beginPath();

            for (let i = 0; i < 5; i++) {

                const angle = -Math.PI / 2 + i * 2 * Math.PI / 5;
                const px = x + Math.cos(angle) * 42;
                const py = y + Math.sin(angle) * 42;

                if (i === 0) ctx.moveTo(px, py);

                else ctx.lineTo(px, py);

            }

            ctx.closePath();
            ctx.fillStyle = '#111111';
            ctx.fill();
            ctx.stroke();

        }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;

    for (let x = 0; x <= canvas.width; x += 85) {

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + 45, canvas.height / 2, x, canvas.height);
        ctx.stroke();

    }

    return createTextureFromCanvas(canvas);
}

function render(currentTime) {

    if (!gameState || !camera) return;

    gameState.update(currentTime);
    camera.update(gameState);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const viewMatrix = camera.createViewMatrix();
    const projMatrix = camera.createProjectionMatrix();
    const lights = getLightPositions();
    const intensity = gameState.stadiumLightsOn ? 1.0 : 0.22;

    setupTextureProgram(viewMatrix, projMatrix, lights, intensity);

    // grass a lil bit higher --> preventss z fighting
    renderTexturedObject(
        buffers.field,
        compModelMatrix([0, 0, 0.012]),
        textures.field,
        0.12
    );

    renderTexturedObject(buffers.ball, gameState.ball.createModelMatrix(), textures.ball, 0.9);

    setupSolidProgram(viewMatrix, projMatrix, lights, intensity);

    renderArena();
    renderGoals();
    renderPlayer(gameState.player1, [0.92, 0.12, 0.13], [0.12, 0.05, 0.05]);
    renderPlayer(gameState.player2, [0.12, 0.30, 0.92], [0.03, 0.06, 0.18]);
    renderPowerUp();
    renderStadiumLights();

    requestAnimationFrame(render);

}

function getLightPositions() {

    const ball = gameState.ball.position;

    return [

        //floodlights in the afront
        [-3.6, -3.7, 4.2],
        [3.6, -3.7, 4.2],

        //floddlights in the back
        [-3.6, 3.7, 4.2],
        [3.6, 3.7, 4.2],

        //light near the ball
        [ball.x, -1.2, 3.2]

    ];
}

function setupTextureProgram(viewMatrix, projMatrix, lights, intensity) {

    gl.useProgram(textureProgram);
    gl.uniformMatrix4fv(uniforms.texture.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.texture.projMatrix, false, projMatrix);
    gl.uniform3f(uniforms.texture.cameraPosition, camera.position.x, camera.position.y, camera.position.z);
    lights.forEach((light, i) => gl.uniform3fv(uniforms.texture.lightPositions[i], light));
    gl.uniform1f(uniforms.texture.lightIntensity, intensity);

}

function setupSolidProgram(viewMatrix, projMatrix, lights, intensity) {

    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(uniforms.solid.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.solid.projMatrix, false, projMatrix);
    gl.uniform3f(uniforms.solid.cameraPosition, camera.position.x, camera.position.y, camera.position.z);
    lights.forEach((light, i) => gl.uniform3fv(uniforms.solid.lightPositions[i], light));
    gl.uniform1f(uniforms.solid.lightIntensity, intensity);

}

function compModelMatrix(translation, scale = [1, 1, 1], rotation = [0, 0, 0]) {

    const matrix = mat4.create();

    mat4.translate(matrix, matrix, translation);
    mat4.rotateX(matrix, matrix, rotation[0]);
    mat4.rotateY(matrix, matrix, rotation[1]);
    mat4.rotateZ(matrix, matrix, rotation[2]);
    mat4.scale(matrix, matrix, scale);

    return matrix;
}

function childTransform(parent, translation, scale = [1,1,1], rotation = [0,0,0]) {

    const matrix = mat4.clone(parent);

    mat4.translate(matrix, matrix, translation);
    mat4.rotateX(matrix, matrix, rotation[0]);
    mat4.rotateY(matrix, matrix, rotation[1]);
    mat4.rotateZ(matrix, matrix, rotation[2]);
    mat4.scale(matrix, matrix, scale);

    return matrix;
}

function renderArena() {

    const wallColor = [0.12, 0.18, 0.23];
    const lineColor = [0.95, 0.95, 0.95];

    renderObject(compModelMatrix([0, 1.42, 0.09], [9.25, 0.12, 0.18]), buffers.cube, wallColor, 0.25);
    renderObject(compModelMatrix([0, -1.42, 0.09], [9.25, 0.12, 0.18]), buffers.cube, wallColor, 0.25);
    // Lower the dark platform --> doesnt overlap anymore with grass
    renderObject(compModelMatrix([0, 0, -0.08], [9.25, 2.75, 0.04]), buffers.cube, [0.05, 0.20, 0.08], 0.08);

    renderObject(compModelMatrix([0, -1.33, 0.012], [0.035, 0.05, 0.024]), buffers.cube, lineColor, 0.05);
    renderObject(compModelMatrix([0, 0, 0.015], [0.04, 2.52, 0.03]), buffers.cube, lineColor, 0.05);

}

function renderGoals() {

    const a = gameState.arena;
    const postColor = [0.95, 0.95, 1.0];
    const boostedPostColor = [1.0, 0.78, 0.08];
    const netColor = [0.62, 0.72, 0.86];
    const post = 0.09;
    const goalY = 0.78;
    const leftGoalZ = gameState.getLeftGoalHeight();
    const rightGoalZ = gameState.getRightGoalHeight();
    const leftPostColor = gameState.player2.bigGoalTimer > 0 ? boostedPostColor : postColor;
    const rightPostColor = gameState.player1.bigGoalTimer > 0 ? boostedPostColor : postColor;

    // Left goal becomes bigger when respective powerup collected  by player 2
    renderObject(compModelMatrix([a.left, -goalY, leftGoalZ/2], [post, post, leftGoalZ]), buffers.goalPost, leftPostColor, 0.55);
    renderObject(compModelMatrix([a.left,  goalY, leftGoalZ/2], [post, post, leftGoalZ]), buffers.goalPost, leftPostColor, 0.55);
    renderObject(compModelMatrix([a.left, 0, leftGoalZ], [post, goalY*2 + post, post]), buffers.goalPost, leftPostColor, 0.55);
    renderObject(compModelMatrix([a.left - 0.34, 0, leftGoalZ/2], [post, goalY*2, leftGoalZ]), buffers.goalPost, netColor, 0.06);

    // Right goal becomes bigger when respective powerup collected  by player 1
    renderObject(compModelMatrix([a.right, -goalY, rightGoalZ/2], [post, post, rightGoalZ]), buffers.goalPost, rightPostColor, 0.55);
    renderObject(compModelMatrix([a.right,  goalY, rightGoalZ/2], [post, post, rightGoalZ]), buffers.goalPost, rightPostColor, 0.55);
    renderObject(compModelMatrix([a.right, 0, rightGoalZ], [post, goalY*2 + post, post]), buffers.goalPost, rightPostColor, 0.55);
    renderObject(compModelMatrix([a.right + 0.34, 0, rightGoalZ/2], [post, goalY*2, rightGoalZ]), buffers.goalPost, netColor, 0.06);
}

function renderPlayer(player, shirtColor, darkColor) {

    const root = mat4.create();

    mat4.translate(root, root, [player.position.x, 0, player.position.z + 0.05]);

    const walking = Math.sin(player.walkPhase) * 0.55;
    const kick = player.kickTimer > 0 ? -player.direction * 1.05 * Math.sin((player.kickTimer / 0.22) * Math.PI) : 0;
    const headBob = player.onGround ? Math.abs(Math.sin(player.walkPhase)) * 0.025 : 0.045;

    // Body and neck
    renderObject(childTransform(root, [0, 0, 0.58], [0.46, 0.30, 0.78]), buffers.body, shirtColor, 0.36);
    renderObject(childTransform(root, [0, 0, 0.99], [0.16, 0.16, 0.16]), buffers.head, [0.85, 0.58, 0.38], 0.22);

    // Oversized Head Soccer head
    const r = player.headRadius;
    const headCenterZ = 1.15 + headBob;
    renderObject(childTransform(root, [0, 0, headCenterZ], [r * 2, r * 2, r * 2]), buffers.head, [0.96, 0.72, 0.52], 0.38);

    // Eyes 
    const eyeZ = headCenterZ + 0.06;
    const eyeY = -r * 1.02;

    for (const eyeX of [-0.11, 0.11]) {

        renderObject(childTransform(root, [eyeX, eyeY, eyeZ], [0.075, 0.035, 0.075]), buffers.head, [1,1,1], 0.1);
        renderObject(childTransform(root, [eyeX + player.direction * 0.02, eyeY - 0.03, eyeZ], [0.035, 0.02, 0.035]), buffers.head, [0.02,0.02,0.02], 0.05);

    }

    renderObject(childTransform(root, [0, eyeY - 0.03, headCenterZ - 0.14], [0.16, 0.025, 0.035]), buffers.cube, [0.16,0.04,0.04], 0.05);

    // Arms

    const armSwing = -walking * 0.35;
    renderLimb(root, [-0.28, -0.04, 0.70], [0.10, 0.09, 0.50], armSwing, [0.96, 0.72, 0.52]);
    renderLimb(root, [0.28, -0.04, 0.70], [0.10, 0.09, 0.50], -armSwing, [0.96, 0.72, 0.52]);

    // Hierarchical animated legs: hip -> rotating leg -> attached foot.

    const leftAngle = walking + (player.direction < 0 ? kick : 0);
    const rightAngle = -walking + (player.direction > 0 ? kick : 0);


    // Raise the hips --> shoes not in grass anymore
    renderLeg(root, [-0.13, -0.07, 0.42], leftAngle, [0.96, 0.72, 0.52], [1, 1, 1], player.direction);
    renderLeg(root, [0.13, 0.07, 0.42], rightAngle, [0.96, 0.72, 0.52], [1, 1, 1], player.direction);
}

function renderLimb(root, hip, scale, angle, color) 
{
    const limb = mat4.clone(root);

    mat4.translate(limb, limb, hip);
    mat4.rotateY(limb, limb, angle);
    mat4.translate(limb, limb, [0, 0, -0.18]);
    mat4.scale(limb, limb, scale);

    renderObject(limb, buffers.cube, color, 0.22);

}

function renderLeg(root, hip, angle, pantsColor, shoeColor, direction) {

    const legBase = mat4.clone(root);
    mat4.translate(legBase, legBase, hip);
    mat4.rotateY(legBase, legBase, angle);

    // lower body geometry --> player visibly on the pitch
    const upperLeg = mat4.clone(legBase);

    mat4.translate(upperLeg, upperLeg, [0, 0, -0.15]);
    mat4.scale(upperLeg, upperLeg, [0.12, 0.12, 0.30]);

    renderObject(upperLeg, buffers.cube, pantsColor, 0.2);


    const foot = mat4.clone(legBase);

    mat4.translate(foot, foot, [direction * 0.07, 0, -0.36]);
    mat4.scale(foot, foot, [0.32, 0.16, 0.11]);

    renderObject(foot, buffers.cube, shoeColor, 0.32);
}

function renderPowerUp() {

    if (!gameState.powerUp) return;

    const p = gameState.powerUp;

    renderObject(p.createModelMatrix(), buffers.powerUp, [1.0, 0.78, 0.08], 0.9);

}

function renderStadiumLights() {

    const color = gameState.stadiumLightsOn ? [1.0, 0.92, 0.68] : [0.28, 0.28, 0.30];
    const frontY = -3.2;
    const backY = 3.2;

    for (const y of [frontY, backY]) {

        for (const x of [-3.6, 3.6]) {

            renderObject( compModelMatrix([x, y, 2.2], [0.10, 0.10, 3.0]), buffers.cube, [0.15, 0.16, 0.18], 0.2);

            renderObject( compModelMatrix([x, y, 3.85], [0.58, 0.18, 0.22]), buffers.cube, color, 1.0);

        }
    }
}

function renderTexturedObject(bufferSet, modelMatrix, texture, specularStrength = 0.3) {

    gl.useProgram(textureProgram);
    gl.uniformMatrix4fv(uniforms.texture.modelMatrix, false, modelMatrix);

    const normalMatrix = mat3.create();

    mat3.normalFromMat4(normalMatrix, modelMatrix);

    gl.uniformMatrix3fv(uniforms.texture.normalMatrix, false, normalMatrix);
    gl.uniform1f(uniforms.texture.specularStrength, specularStrength);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.texture.texture, 0);

    bindCommonBuffers(bufferSet, attributes.texture);

    if (attributes.texture.texCoord !== -1 && bufferSet.textureCoordinates) {

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.textureCoordinates);
        gl.vertexAttribPointer(attributes.texture.texCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributes.texture.texCoord);

    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.drawElements(gl.TRIANGLES, bufferSet.numIndices, gl.UNSIGNED_SHORT, 0);
}

function renderObject(modelMatrix, bufferSet, color, specularStrength = 0.35) {

    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(uniforms.solid.modelMatrix, false, modelMatrix);

    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelMatrix);

    gl.uniformMatrix3fv(uniforms.solid.normalMatrix, false, normalMatrix);
    gl.uniform3fv(uniforms.solid.color, color);
    gl.uniform1f(uniforms.solid.specularStrength, specularStrength);

    bindCommonBuffers(bufferSet, attributes.solid);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.drawElements(gl.TRIANGLES, bufferSet.numIndices, gl.UNSIGNED_SHORT, 0);

}

function bindCommonBuffers(bufferSet, attrs) {

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.vertices);
    gl.vertexAttribPointer(attrs.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrs.position);

    if (attrs.normal !== -1 && bufferSet.normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.normals);
        gl.vertexAttribPointer(attrs.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attrs.normal);
        
    }
}

window.addEventListener('load', () => startHeadSoccer().catch(error => console.error('Initialization failed:', error)));
