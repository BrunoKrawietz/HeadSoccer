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

        document.addEventListener('keydown', (event) => {

            if (event.key === '1') this.SideView();
            if (event.key === '2') this.TopView();
            if (event.key === '3') this.StadiumView();

        });
    }

    SideView() {

        this.mode = 'side';
        this.position = { x: 0, y: -8.2, z: 1.65 };
        this.target = { x: 0, y: 0, z: 1.0 };
        this.up = { x: 0, y: 0, z: 1 };

    }

    TopView() {

        this.mode = 'top';
        this.position = { x: 0, y: -0.04, z: 8.5 };
        this.target = { x: 0, y: 0, z: 0 };
        this.up = { x: 0, y: 1, z: 0 };

    }

    // initial view
    StadiumView() {

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

    createViewMatrix() {

        const ViewMatrix = mat4.create();
        mat4.lookAt(

            ViewMatrix,
            [this.position.x, this.position.y, this.position.z],
            [this.target.x, this.target.y, this.target.z],
            [this.up.x, this.up.y, this.up.z]

        );

        return ViewMatrix;
    }

    createProjectionMatrix() {

        const ProjectionMatrix = mat4.create();
        const aspectRatio = this.canvas.width / this.canvas.height;
        mat4.perspective(ProjectionMatrix, Math.PI / 4, aspectRatio, 0.1, 100.0);
        return ProjectionMatrix;

    }
}
