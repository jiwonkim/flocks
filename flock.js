var DEFAULT_BODIES = [
    body(0.1, 0.1),
    body(0.2, 0.2),
    body(0.3, 0.3),
    body(0.4, 0.4),
    body(0.5, 0.5),
    body(0.6, 0.6),
    body(0.7, 0.7),
    body(0.8, 0.8),
    body(0.9, 0.9)
]

function flock(initialBodies) {
    var ATTRACT_THRESHOLD_DIST = 0.5;
    var REPELL_THRESHOLD_DIST = 0.1;
    var REPELL_MULTIPLIER = 0.01;
    var ATTRACT_MULTIPLIER = 0.01;
    var ALIGN_MULTIPLIER = 0.01;
    var _bodies = initialBodies || DEFAULT_BODIES;

    function bodies() {
        return _bodies;
    }

    function tick(dt) {
        for (var i = 0; i < _bodies.length; i++) {
            _repell(i);
            _attract(i);
            _align(i);
            _bodies[i].tick(dt);
        }
    }

    function _repell(idx) {
        var b1 = _bodies[idx];
        var dvx = 0;
        var dvy = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;
            
            var b2 = _bodies[j];
            var dist = _distance(b1, b2);
            if (dist >= REPELL_THRESHOLD_DIST) continue;

            dvx += REPELL_MULTIPLIER * (b1.x() - b2.x());
            dvy += REPELL_MULTIPLIER * (b1.y() - b2.y());
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

    function _distance(b1, b2) {
        var dx = b1.x() - b2.x();
        var dy = b1.y() - b2.y();
        return Math.sqrt(dx*dx + dy*dy);
    }
    
    return {
        tick: tick,
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
