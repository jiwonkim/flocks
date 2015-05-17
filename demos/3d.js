$(document).ready(function() {
    var SCALE = 0.01;
    var school = flock(
        200,
        {dimensions: 3, overflow: OVERFLOW_SETTINGS.BIND}
    );
    $(window).keypress(function(evt) {
        if (evt.which === 32) { // the spacebar
            school.scatter(2);
            return;
        }
        if (evt.which === 103) { // the 'g' key
            school.gather();
            return;
        }
        
    });

    var canvas = document.getElementById('3d-canvas');
    var gl;

    var mvmatrix = mat4.create();
    var mvstack = [];

    var pmatrix = mat4.create();

    var vertexbuffer;
    var shaderProgram;

    initGL(canvas);
    initShaders();
    initBuffers();
    requestAnimationFrame(frame);

    function frame() {
        school.tick(0.1);
        draw();
        requestAnimationFrame(frame);
    }

    function initGL(canvas) {
        try {
            gl = canvas.getContext("webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.enable(gl.DEPTH_TEST);
        } catch (e) {
        }
        if (!gl) {
            alert("Could not initialise WebGL, sorry :-(");
        }
    }

    function initShaders() {
        var fragmentShader = getShader(gl, "shader-fs");
        var vertexShader = getShader(gl, "shader-vs");

        // Register some code to run in the GPU
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        // set them as current shaders
        gl.useProgram(shaderProgram);

        // register some variable names in the shaders
        shaderProgram.vertex = gl.getAttribLocation(shaderProgram, "vertex");
        gl.enableVertexAttribArray(shaderProgram.vertex);

        shaderProgram.pmatrix = gl.getUniformLocation(shaderProgram, "pmatrix");
        shaderProgram.mvmatrix = gl.getUniformLocation(shaderProgram, "mvmatrix");
        shaderProgram.color = gl.getUniformLocation(shaderProgram, "color_in");
    }

    function initBuffers() {
        vertexbuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);
        var vertices = [
            -1.0,  1.0,  0.0,
             2.0,  0.0,  0.0,
            -1.0, -1.0,  0.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        vertexbuffer.itemSize = 3;
        vertexbuffer.numItems = 3;
    }

    function draw() {
        var bodies = school.bodies();

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(pmatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
        mat4.identity(mvmatrix);

        for (var i = 0; i < bodies.length; i++) {
            pushMatrix();

            var body = bodies[i];
            var pos = translate(body);
            rotate(body);
            mat4.scale(mvmatrix, mvmatrix, [SCALE, SCALE, SCALE]);

            // pass in vertices to shaders
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);
            gl.vertexAttribPointer(shaderProgram.vertex, vertexbuffer.itemSize, gl.FLOAT, false, 0, 0);

            // pass in matrices to shaders
            gl.uniformMatrix4fv(shaderProgram.pmatrix, false, pmatrix);
            gl.uniformMatrix4fv(shaderProgram.mvmatrix, false, mvmatrix);

            var znear = -1;
            var zfar = -2;
            var alpha = -(pos.z - zfar) / (zfar - znear);
            gl.uniform4fv(shaderProgram.color, [alpha, alpha, alpha, 1.]);

            // render
            gl.drawArrays(gl.TRIANGLES, 0, vertexbuffer.numItems);

            popMatrix();
        }
    }

    function translate(body) {
        var pos = {
            x: body.x() - 0.5,
            y: body.y() - 0.5,
            z: -1.0 - body.z()
        }
        mat4.translate(mvmatrix, mvmatrix, [pos.x, pos.y, pos.z]);
        return pos;
    }

    // make the body point in the direction it's going
    function rotate(body) {
        // make the body point in the right direction in the z = 0 plane
        mat4.rotate(mvmatrix, mvmatrix, Math.atan2(-body.vy(), body.vx()), [0, 0, -1]);

        // then make the body points in the right direction in the x = 0 plane
        mat4.rotate(mvmatrix, mvmatrix, Math.atan2(-body.vy(), body.vz()), [-1, 0, 0]);

        // then make the body points in the right direction in the y = 0 plane
        //mat4.rotate(mvmatrix, Math.atan2(-body.vz(), body.vx()), [0, -1, 0]);
    }

    function pushMatrix() {
        mvstack.push(mat4.clone(mvmatrix));
    }

    function popMatrix() {
        if (mvstack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvmatrix = mvstack.pop();
    }

    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }
});
