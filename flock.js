var DEFAULT_BODIES = [
    body(0.2, 0.3),
    body(0.21, 0.15),
    body(0.35, 0.55),
    body(0.24, 0.41),
    body(0.51, 0.59),
    body(0.6, 0.2),
    body(0.7, 0.5),
    body(0.8, 0.2),
    body(0.9, 0.6)
]

function flock(initialBodies) {
    var ATTRACT_THRESHOLD_DIST = 0.5;
    var REPEL_THRESHOLD_DIST = 0.06;
    var REPEL_MULTIPLIER = 0.2;
    var ATTRACT_MULTIPLIER = 0.02;
    var ALIGN_MULTIPLIER = 0.008;
    var CENTER_MULTIPLIER = 0.01;
    var TARGET_SPEED = 0.1;
    var TARGET_SPEED_MULTIPLIER = 0.15;

    var _bodies = initialBodies || DEFAULT_BODIES;
    var _center = {x:0.5, y:0.5};

    function bodies() {
        return _bodies;
    }

    /**
     * Centers the flock on a new position.
     * X and Y should be in [0, 1]
     */
    function center(x, y) {
        _center = {x:x , y:y};
    }

    function tick(dt) {
        for (var i = 0; i < _bodies.length; i++) {
            _repel(i);
            _attract(i);
            _align(i);
            _targetPosition(i);
            _targetSpeed(i);
            _bodies[i].tick(dt);
        }
    }

    function _repel(idx) {
        var b1 = _bodies[idx];
        var dvx = 0;
        var dvy = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;
            
            var b2 = _bodies[j];
            var dist = _distance(b1, b2);
            if (dist >= REPEL_THRESHOLD_DIST) continue;
            var d = dist / REPEL_THRESHOLD_DIST;
            var mult = (1 - d*d); // max repulsion at zero dist

            dvx += REPEL_MULTIPLIER * mult * (b1.x() - b2.x());
            dvy += REPEL_MULTIPLIER * mult * (b1.y() - b2.y());
        }

        b1.vx(b1.vx() + dvx);
        b1.vy(b1.vy() + dvy);
    }

    function _attract(idx) {
        var b1 = _bodies[idx];
        var sum = {x: 0, y: 0};
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            sum.x += b2.x(); 
            sum.y += b2.y();
        }

        var centroid = {
            x: sum.x / (_bodies.length - 1),
            y: sum.y / (_bodies.length - 1),
        }
        b1.vx(b1.vx() + (centroid.x - b1.x()) * ATTRACT_MULTIPLIER);
        b1.vy(b1.vy() + (centroid.y - b1.y()) * ATTRACT_MULTIPLIER);
    }

    function _align(idx) {
        var b1 = _bodies[idx];
        var sum = {vx: 0, vy: 0};
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            sum.vx += b2.vx(); 
            sum.vy += b2.vy();
        }

        var avg = {
            vx: sum.vx / (_bodies.length - 1),
            vy: sum.vy / (_bodies.length - 1),
        }
        b1.vx(b1.vx() + (avg.vx - b1.vx()) * ALIGN_MULTIPLIER);
        b1.vy(b1.vy() + (avg.vy - b1.vy()) * ALIGN_MULTIPLIER);
    }

    function _targetPosition(idx) {
        var b1 = _bodies[idx];
        b1.vx(b1.vx() + (_center.x - b1.x()) * CENTER_MULTIPLIER);
        b1.vy(b1.vy() + (_center.y - b1.y()) * CENTER_MULTIPLIER);
    }

    function _targetSpeed(idx) {
        var b1 = _bodies[idx];
        var v = Math.sqrt(b1.vx()*b1.vx() + b1.vy()*b1.vy());
        var d = TARGET_SPEED - v;
        b1.vx(b1.vx() + b1.vx() / v * d * TARGET_SPEED_MULTIPLIER);
        b1.vy(b1.vy() + b1.vy() / v * d * TARGET_SPEED_MULTIPLIER);
    }

    function _distance(b1, b2) {
        var dx = b1.x() - b2.x();
        var dy = b1.y() - b2.y();
        return Math.sqrt(dx*dx + dy*dy);
    }
    
    return {
        tick: tick,
        center: center,
        bodies: bodies
    };
}

function body(x0, y0) {
    var _x = x0,
        _y = y0,
        _vx = 0,
        _vy = 0;

    function x() {
        return _x;
    }

    function y() {
        return _y;
    }

    function vx(val) {
        if (val === undefined) {
            return _vx;
        }
        _vx = val;
    }

    function vy(val) {
        if (val === undefined) {
            return _vy;
        }
        _vy = val;
    }

    function tick(dt) {
        _x += _vx * dt;
        _y += _vy * dt;
    }

    return {
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        tick: tick
    }
}
