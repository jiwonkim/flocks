/*
var _settings
var _tempSettings

function settings(val, isTemporary) {
    returns settings if val === undefined
    if temporary, then populates currSettings
    else replaces the current settings
}

for every tick, the currSettings should linearly ease towards original settings


*/

var DEFAULT_SETTINGS = {
    neighborThresholdDist: 0.2,
    repulsionThresholdDist: 0.07,
    repulsion: 0.25,
    attraction: 0.01,
    alignment: 0.02,
    targetSpeed: 0.05,
    targetSpeedMultiplier: 0.15
}

function flock(numBodies, initialSettings) {
    var _settings = _initSettings(settings);
    var _tmpSettings = null;

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

    function scatter(strength, duration) {
        strength = strength || 2;
        duration = duration || 100;
        settings(
            {
                neighborThresholdDist: _getSetting('neighborThresholdDist') / strength,
                repulsionThresholdDist: _getSetting('repulsionThresholdDist') * strength,
                repulsion: _getSetting('repulsion') * strength,
                attraction: _getSetting('attraction') / strength,
                alignment: _getSetting('alignment') / strength
            },
            duration
        );
    }

    function tick(dt) {
        for (var i = 0; i < _bodies.length; i++) {
            _repulse(i);
            _attract(i);
            _align(i);
            _enforceBounds(i);
            _targetSpeed(i);
            _bodies[i].tick(dt);
        }
        if (_tmpSettings) {
            _decayTmpSettings();
        }
    }

    function settings(val, duration) {
        if (!duration) {
            settings = val;
            return;
        }
        _tmpSettings = {};
        $.each(val, function(k, v) {
            _tmpSettings[k] = {
                val: v,
                step: (_settings[k] - v) / duration
            };
        });
    }

    function _initSettings(val) {
        if (settings === undefined) {
            return DEFAULT_SETTINGS;
        }
        return {
            neighborThresholdDist: (
                val.neighborThresholdDist ||
                DEFAULT_SETTINGS.neighborThresholdDist
            ),
            repulsionThresholdDist: (
                val.repulsionThresholdDist ||
                DEFAULT_SETTINGS.repulsionThresholdDist
            ),
            repulsion: val.repulsion || DEFAULT_SETTINGS.repulsion,
            attraction: val.attraction || DEFAULT_SETTINGS.attraction,
            alignment: val.alignment || DEFAULT_SETTINGS.alignment,
            targetSpeed: val.targetSpeed || DEFAULT_SETTINGS.targetSpeed,
            targetSpeedMultiplier: (
                val.targetSpeedMultiplier ||
                DEFAULT_SETTINGS.targetSpeedMultiplier
            )
        }
    }

    function _decayTmpSettings() {
        var count = 0;
        var done = 0;
        $.each(_tmpSettings, function(key, setting) {
            count++;
            if (
                setting.step < 0 && setting.val <= _settings[key] ||
                setting.step > 0 && setting.val >= _settings[key]
            ) {
                done++;
            } else {
                setting.val += setting.step;
            }
        });
        if (count === done) {
            _tmpSettings = null;
        }
    }

    function _getSetting(key) {
        if (!_tmpSettings || !_tmpSettings[key]) {
            return _settings[key];
        }
        return _tmpSettings[key].val;
    }

    function _repulse(idx) {
        var threshold = _getSetting('repulsionThresholdDist');
        var repulsion = _getSetting('repulsion');

        var b1 = _bodies[idx];
        var dvx = 0;
        var dvy = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;
            
            var b2 = _bodies[j];
            var dist = _distance(b1, b2);
            if (dist >= threshold) continue;

            var d = dist / threshold;
            var mult = (1 - d*d); // max repulsion at zero dist

            dvx += repulsion * mult * (b1.x() - b2.x());
            dvy += repulsion * mult * (b1.y() - b2.y());
        }

        b1.vx(b1.vx() + dvx);
        b1.vy(b1.vy() + dvy);
    }

    function _attract(idx) {
        var threshold = _getSetting('neighborThresholdDist');
        var attraction = _getSetting('attraction');

        var b1 = _bodies[idx];
        var sum = {x: 0, y: 0};
        var neighborCount = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            if (_distance(b1, b2) > threshold) continue;

            neighborCount++;
            sum.x += b2.x(); 
            sum.y += b2.y();
        }
        if (neighborCount === 0) return;

        var centroid = {
            x: sum.x / neighborCount,
            y: sum.y / neighborCount
        }
        b1.vx(b1.vx() + (centroid.x - b1.x()) * attraction);
        b1.vy(b1.vy() + (centroid.y - b1.y()) * attraction);
    }

    function _align(idx) {
        var threshold = _getSetting('neighborThresholdDist');
        var alignment = _getSetting('alignment');

        var b1 = _bodies[idx];
        var sum = {vx: 0, vy: 0};
        var neighborCount = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            if (_distance(b1, b2) > threshold) continue;

            neighborCount++;
            sum.vx += b2.vx(); 
            sum.vy += b2.vy();
        }
        if (neighborCount === 0) return;

        var avg = {
            vx: sum.vx / neighborCount,
            vy: sum.vy / neighborCount
        }
        b1.vx(b1.vx() + (avg.vx - b1.vx()) * alignment);
        b1.vy(b1.vy() + (avg.vy - b1.vy()) * alignment);
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
        var d = _getSetting('targetSpeed') - v;

        var multiplier = _getSetting('targetSpeedMultiplier');
        b1.vx(b1.vx() + b1.vx() / v * d * multiplier);
        b1.vy(b1.vy() + b1.vy() / v * d * multiplier);
    }

    function _distance(b1, b2) {
        var dx = b1.x() - b2.x();
        var dy = b1.y() - b2.y();
        return Math.sqrt(dx*dx + dy*dy);
    }
    
    return {
        tick: tick,
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
