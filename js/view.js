class Camera {

    // initial position of camera
    constructor(canvas) {
        this.canvas = canvas;
        this.position = { x: 0, y: -8.6, z: 5.6 };
        this.target = { x: 0, y: 0, z: 0.6 };
        this.up = { x: 0, y: 0, z: 1 };
        this.mode = 'stadium';
        this.setupControls();
    }

    // switch to other camera views
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') this.setSideView();
            if (e.key === '2') this.setTopView();
            if (e.key === '3') this.setStadiumView();
        });
    }

    // side view
    setSideView() {
        this.mode = 'side';
        this.position = { x: 0, y: -8.2, z: 1.65 };
        this.target = { x: 0, y: 0, z: 1.0 };
        this.up = { x: 0, y: 0, z: 1 };
    }

    // top view
    setTopView() {
        this.mode = 'top';
        this.position = { x: 0, y: -0.04, z: 8.5 };
        this.target = { x: 0, y: 0, z: 0 };
        this.up = { x: 0, y: 1, z: 0 };
    }

    // initial view
    setStadiumView() {
        this.mode = 'stadium';
        this.position = { x: 0, y: -8.6, z: 5.6 };
        this.target = { x: 0, y: 0, z: 0.6 };
        this.up = { x: 0, y: 0, z: 1 };
    }

    update(gameState) {
        if (!gameState || this.mode !== 'stadium') return;
        const ballX = gameState.ball.position.x;
        this.target.x = ballX * 0.18;
        this.position.x = ballX * 0.08;
    }

    getViewMatrix() {
        const viewMatrix = mat4.create();
        mat4.lookAt(
            viewMatrix,
            [this.position.x, this.position.y, this.position.z],
            [this.target.x, this.target.y, this.target.z],
            [this.up.x, this.up.y, this.up.z]
        );
        return viewMatrix;
    }

    getProjectionMatrix() {
        const projMatrix = mat4.create();
        const aspectRatio = this.canvas.width / this.canvas.height;
        mat4.perspective(projMatrix, Math.PI / 4, aspectRatio, 0.1, 100.0);
        return projMatrix;
    }
}
