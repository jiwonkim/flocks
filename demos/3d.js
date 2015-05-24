$(document).ready(function() {
    /* Constants */
    var SCALE = 0.01;
    var NUM_BODIES = 200;

    /* Variables */
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

    var canvas, gl;
    canvas = document.getElementById('flock-canvas');
    gl = canvas.getContext("webgl");

    var mvmatrix, pmatrix;
    mvmatrix = mat4.create();
    pmatrix = mat4.create();

    var vertexbuffer, shaderProgram;

    /* Register Event Handlers */
    $(window).keypress(function(evt) {
        if (evt.which === 32) { // the spacebar
            school.scatter(3);
            return false; // disable scroll
        }
        if (evt.which === 103) { // the 'g' key
            school.gather();
            return;
        }
        
    });

    /* Init GL-related stuff */
    initGL();
    initShaders();
    initBuffer();

    /* Start animating */
    requestAnimationFrame(frame);

    function frame() {
        school.tick(0.1);
        draw();
        requestAnimationFrame(frame);
    }

    function initGL() {
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.DEPTH_TEST);
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
    }

    function initBuffer() {
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
