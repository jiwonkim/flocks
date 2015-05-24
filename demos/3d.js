$(document).ready(function() {
    var SCALE = 0.01;
    var NUM_BODIES = 200;
    var school = flock(
        NUM_BODIES,
        {
            neighborThresholdDist: 0.15,
            repulsionThresholdDist: 0.01,
            attraction: 0.001,
            dimensions: 3,
            overflow: OVERFLOW_SETTINGS.BIND
        }
    );
    $(window).keypress(function(evt) {
        if (evt.which === 32) { // the spacebar
            school.scatter(3);
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
            gl.clearColor(0, 0, 0, 0);
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
        vertexbuffer.itemSize = 3;
        vertexbuffer.numItems = NUM_BODIES * 3;
    }

    function draw() {
        var bodies = school.bodies();

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(pmatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
        mat4.identity(mvmatrix);

        // pass in matrices to shaders
        gl.uniformMatrix4fv(shaderProgram.pmatrix, false, pmatrix);
        gl.uniformMatrix4fv(shaderProgram.mvmatrix, false, mvmatrix);

        // compute vertices and bind as buffer data
        gl.bufferData(gl.ARRAY_BUFFER, getBufferData(bodies), gl.STATIC_DRAW);

        // pass in vertices to shaders
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);
        gl.vertexAttribPointer(shaderProgram.vertex, vertexbuffer.itemSize, gl.FLOAT, false, 0, 0);

        bodies.forEach(function(body, i) {
            gl.uniform4fv(shaderProgram.color, [0, 0, 0, getAlpha(body)]);
            gl.drawArrays(gl.TRIANGLES, i * 3, 3);
        });
    }

    function getBufferData(bodies) {
        var vertices = [];
        var positions = [];
        bodies.forEach(function(body) {
            var pos = getPosition(body);
            positions.push(pos);
            
            var triangleVertices = getVertices(body, pos);
            triangleVertices.forEach(function(vertex) {
                vertices.push(vertex[0]);
                vertices.push(vertex[1]);
                vertices.push(vertex[2]);
            });
        });
        return new Float32Array(vertices)
    }

    function getAlpha(body) {
        var z = -1.0 - body.z();
        var znear = -1;
        var zfar = -2;
        var alpha = -(z - zfar) / (zfar - znear);
        if (alpha > 1) return 1.;
        else if (alpha < 0) return 0.;
        return alpha;
    }

    function getPosition(body) {
        return vec3.fromValues(
            body.x() - 0.5,
            body.y() - 0.5,
            -1.0 - body.z()
        );
    }

    function getVertices(body, position) {
        var forward, right;
        forward = vec3.fromValues(body.vx(), body.vy(), body.vz());
        vec3.normalize(forward, forward);
        up = getUpVector(forward);

        // scale
        vec3.scale(forward, forward, SCALE * 1.5);
        vec3.scale(up, up, SCALE);

        var v0, v1, v2;
        v0 = vec3.create();
        v1 = vec3.create();
        v2 = vec3.create();

        // first vertex is position + forward vector
        vec3.add(v0, position, forward);

        // second vertex is position - forward vector + up vector
        vec3.subtract(v1, position, forward);
        vec3.add(v1, v1, up);

        // third vertex is position - forward vector - up vector
        vec3.subtract(v2, position, forward);
        vec3.subtract(v2, v2, up);

        return [v0, v1, v2];
    }

    function getUpVector(forward) {
        var worldUp = vec3.fromValues(0, 1, 0);

        var right = vec3.create();
        vec3.cross(right, forward, worldUp);
        vec3.normalize(right, right);

        var up = vec3.create();
        vec3.cross(up, right, forward);
        vec3.normalize(up, up);

        return up;
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
