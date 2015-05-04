function flock(numBodies) {
    var NEIGHBOR_THRESHOLD_DIST = 0.2;
    var REPEL_THRESHOLD_DIST = 0.07;

    var REPEL_MULTIPLIER = 0.25;
    var ATTRACT_MULTIPLIER = 0.01;
    var ALIGN_MULTIPLIER = 0.02;

    var TARGET_SPEED = 0.05;
    var TARGET_SPEED_MULTIPLIER = 0.15;

    var _scatter = 0;
    var _scatterSince = 0;

    // Create bodies at random initial positions and no velocity
    var _bodies = [];
    for (var i = 0; i < numBodies; i++) {
        _bodies.push(body(Math.random(), Math.random()));
    }

    // Initial center is midpoint in flock-space (x [0, 1], y [0, 1])
    var _center = {x:0.5, y:0.5};

    /** 
     * Returns the list of bodies that belong to the flock
     */
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

    function scatter(count, strength) {
        for (var i = 0; i < _bodies.length; i++) {
            _repel(i, strength);
        }
        _scatter += count;
    }

    function tick(dt) {
        for (var i = 0; i < _bodies.length; i++) {
            if (_scatter > _scatterSince) {
               _scatterSince++;
            } else {
                _scatter = _scatterSince = 0;
            }
            _repel(i);
            _attract(i);
            _align(i);
            _enforceBounds(i);
            _targetSpeed(i);
            _bodies[i].tick(dt);
        }
    }

    function _repel(idx, strength) {
        if (strength === undefined) {
            strength = 1.;
        }
        if (_scatter > 0) {
            strength *= _scatterSince / _scatter;
        }

        var b1 = _bodies[idx];
        var dvx = 0;
        var dvy = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;
            
            var b2 = _bodies[j];
            var dist = _distance(b1, b2);
            if (dist >= REPEL_THRESHOLD_DIST * strength) continue;

            var d = dist / (REPEL_THRESHOLD_DIST * strength);
            var mult = (1 - d*d); // max repulsion at zero dist

            dvx += REPEL_MULTIPLIER * strength * mult * (b1.x() - b2.x());
            dvy += REPEL_MULTIPLIER * strength * mult * (b1.y() - b2.y());
        }

        b1.vx(b1.vx() + dvx);
        b1.vy(b1.vy() + dvy);
    }

    function _attract(idx) {
        var strength = _scatter > 0 ? _scatterSince / _scatter : 1.;

        var b1 = _bodies[idx];
        var sum = {x: 0, y: 0};
        var neighborCount = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            var dist = _distance(b1, b2);
            if (dist > NEIGHBOR_THRESHOLD_DIST) continue;

            neighborCount++;
            sum.x += b2.x(); 
            sum.y += b2.y();
        }
        if (neighborCount === 0) return;

        var centroid = {
            x: sum.x / neighborCount,
            y: sum.y / neighborCount
        }
        b1.vx(b1.vx() + (centroid.x - b1.x()) * strength * ATTRACT_MULTIPLIER);
        b1.vy(b1.vy() + (centroid.y - b1.y()) * strength * ATTRACT_MULTIPLIER);
    }

    function _align(idx) {
        var strength = _scatter > 0 ? _scatterSince / _scatter : 1.;
        var b1 = _bodies[idx];
        var sum = {vx: 0, vy: 0};
        var neighborCount = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            var dist = _distance(b1, b2);
            if (dist > NEIGHBOR_THRESHOLD_DIST) continue;

            neighborCount++;
            sum.vx += b2.vx(); 
            sum.vy += b2.vy();
        }
        if (neighborCount === 0) return;

        var avg = {
            vx: sum.vx / neighborCount,
            vy: sum.vy / neighborCount
        }
        b1.vx(b1.vx() + (avg.vx - b1.vx()) * strength * ALIGN_MULTIPLIER);
        b1.vy(b1.vy() + (avg.vy - b1.vy()) * strength * ALIGN_MULTIPLIER);
    }

    function _enforceBounds(idx) {
        var body = _bodies[idx];
        if (body.x() < 0) {
            body.vx(body.vx() + 0.005);
        } else if (body.x() > 1) {
            body.vx(body.vx() - 0.005);
        } 

        if (body.y() < 0) {
            body.vy(body.vy() + 0.005);
        } else if (body.y() > 1) {
            body.vy(body.vy() - 0.005);
        }
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
        scatter: scatter,
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
