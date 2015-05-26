var OVERFLOW_SETTINGS = {
    BIND: 'bind',
    WRAP: 'wrap',
    BOUNCE: 'bounce'
}
var DEFAULT_SETTINGS = {
    neighborThresholdDist: 0.2,
    repulsionThresholdDist: 0.05,
    repulsion: 0.2,
    attraction: 0.01,
    alignment: 0.01,
    targetSpeed: 0.05,
    targetSpeedMultiplier: 0.15,
    dimensions: 2,
    overflow: OVERFLOW_SETTINGS.BIND
}

/**
 * @param {number} numBodies
 * @param {Object=} initialSettings
 */
function flock(numBodies, initialSettings) {
    var _settings = _initSettings(initialSettings);
    var _tmpSettings = null;
    var _fascination = null;
    var _abomination = null;

    // Create bodies at random initial positions and no velocity
    var _bodies = [];
    for (var i = 0; i < numBodies; i++) {
        _bodies.push(body(
            Math.random(),
            _settings.dimensions > 1 ? Math.random() : 0,
            _settings.dimensions > 2 ? Math.random() : 0
        ));
    }

    // then give them a central push by calling gather on the flock
    gather();


    /** Public Methods **/

    /** 
     * Returns the list of bodies that belong to the flock
     */
    function bodies() {
        return _bodies;
    }

    /**
     * Scatter the flock away from each other.
     * @param {number=} strength - a larger number will scatter the flock more abruptly
     * @param {number=} duration - # ticks the scattering effect will last for
     */
    function scatter(strength, duration) {
        strength = strength || 2;
        duration = duration || 100;
        settings(
            {
                neighborThresholdDist: _settings.neighborThresholdDist / strength,
                repulsionThresholdDist: _settings.repulsionThresholdDist * strength,
                repulsion: _settings.repulsion * strength,
                attraction: _settings.attraction / strength,
                alignment: _settings.alignment / strength
            },
            duration
        );
    }

    /**
     * Gather the flock towards each other.
     * @param {number=} strength - a larger number will gather the flock more abruptly and more tightly
     * @param {number=} duration - # ticks the gathering effect will last for
     */
    function gather(strength, duration) {
        strength = strength || 2;
        duration = duration || 1000;
        settings(
            {
                neighborThresholdDist: _settings.neighborThresholdDist * strength,
                repulsionThresholdDist: _settings.repulsionThresholdDist / strength,
                repulsion: _settings.repulsion / strength,
                attraction: _settings.attraction * strength,
                alignment: _settings.alignment / strength
            },
            duration
        );
    }

    /**
     * Make the flock gear towards a certain point
     * @param {number} x
     * @param {number} y
     * @param {number=} strength
     * @param {number=} duration
     */
    function seek(x, y, strength, duration) {
        if (strength === undefined) {
            strength = 2;
        }
        if (duration === undefined) {
            duration = 1000;
        }
        _fascination = {
            x: x, 
            y: y,
            strength: strength,
            decay: -strength / duration
        };
    }

    /**
     * Make the flock gear away from a certain point
     * @param {number} x
     * @param {number} y
     * @param {number=} strength
     * @param {number=} duration
     */
    function flee(x, y, strength, duration) {
        if (strength === undefined) {
            strength = 2;
        }
        if (duration === undefined) {
            duration = 1000;
        }
        _abomination = {
            x: x, 
            y: y,
            strength: strength,
            decay: -strength / duration
        };
    }

    /**
     * Update the entire flock's position and velocity
     * @param {number} dt - the change in time
     */
    function tick(dt) {
        for (var i = 0; i < _bodies.length; i++) {
            _handleOverflow(i);

            _repulse(i);
            _attract(i);
            _align(i);

            _seek(i);
            _flee(i);

            _targetSpeed(i);

            _bodies[i].tick(dt);
        }
        if (_tmpSettings) {
            _decayTmpSettings();
        }
    }

    /** 
     * If no value is given, it's a getter that returns the flocks' settings.
     * If no duration is given, then replace the settings with the given value.
     * If duration is given, then the given settings are temporary.
     * @param {Object=} val
     * @param {number=} duration
     */
    function settings(val, duration) {
        if (val === undefined) {
            return _settings;
        }
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

    /** Private Methods **/

    /** 
     * Create the settings for the flock with the given values.
     * Use default values for missing keys.
     * @param {Object} val - settings
     */
    function _initSettings(val) {
        if (val === undefined) {
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
            ),
            dimensions: (val.dimensions || DEFAULT_SETTINGS.dimensions),
            overflow: (val.overflow || DEFAULT_SETTINGS.overflow),
        }
    }

    /**
     * Temporary settings should decay towards the original settings
     * with each tick. When all temporary settings are back to the
     * original values, we remove temporary settings and go back to
     * the original settings.
     */
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

    /**
     * Grab the current setting for the given key.
     * @param {string} key - the setting to grab
     */
    function _getSetting(key) {
        if (!_tmpSettings || !_tmpSettings[key]) {
            return _settings[key];
        }
        return _tmpSettings[key].val;
    }

    /**
     *
     */
    function _handleOverflow(idx) {
        var b = _bodies[idx];
        if (_inBounds(b)) {
            return;
        }

        var overflow = _getSetting('overflow');
        if (overflow === OVERFLOW_SETTINGS.WRAP) {
            b.x((1 + b.x()) % 1);
            b.y((1 + b.y()) % 1);
            b.z((1 + b.z()) % 1);
        } else if (overflow === OVERFLOW_SETTINGS.BIND) {
            var diff = [0.5 - b.x(), 0.5 - b.y(), 0.5 - b.z()];
            b.vx(b.vx() + diff[0] * 0.001);
            b.vy(b.vy() + diff[1] * 0.001);
            b.vz(b.vz() + diff[2] * 0.001);
            
        } else if (overflow === OVERFLOW_SETTINGS.BOUNCE) {
            if (b.x() > 1 && b.vx() > 0) {
                b.vx(-b.vx());
            }
            if (b.y() > 1 && b.vy() > 0) {
                b.vy(-b.vy());
            }
            if (b.z() > 1 && b.vz() > 0) {
                b.vz(-b.vz());
            }
        }
    }

    function _inBounds(body) {
        return (
            body.x() >= 0 && body.x() <= 1 &&
            body.y() >= 0 && body.y() <= 1 &&
            body.z() >= 0 && body.z() <= 1
        );
    }

    /**
     * Repulse the given body away from its neighbors.
     * @param {number} idx - the index of the body
     */
    function _repulse(idx) {
        var threshold = _getSetting('repulsionThresholdDist');
        var repulsion = _getSetting('repulsion');

        var b1 = _bodies[idx];
        var dv = {x: 0, y: 0, z: 0};
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;
            
            var b2 = _bodies[j];
            var dist = _distance(b1, b2);
            if (dist >= threshold) continue;

            var d = dist / threshold;
            var mult = (1 - d*d); // max repulsion at zero dist

            dv.x += repulsion * mult * (b1.x() - b2.x());
            dv.y += repulsion * mult * (b1.y() - b2.y());
            dv.z += repulsion * mult * (b1.z() - b2.z());
        }

        b1.vx(b1.vx() + dv.x);
        b1.vy(b1.vy() + dv.y);
        b1.vz(b1.vz() + dv.z);
    }

    /**
     * Attract the given body towards its neighbors.
     * @param {number} idx - the index of the body
     */
    function _attract(idx) {
        var threshold = _getSetting('neighborThresholdDist');
        var attraction = _getSetting('attraction');

        var b1 = _bodies[idx];
        var sum = {x: 0, y: 0, z: 0};
        var neighborCount = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            if (_distance(b1, b2) > threshold) continue;

            neighborCount++;
            sum.x += b2.x(); 
            sum.y += b2.y();
            sum.z += b2.z();
        }
        if (neighborCount === 0) return;

        var centroid = {
            x: sum.x / neighborCount,
            y: sum.y / neighborCount,
            z: sum.z / neighborCount
        }
        b1.vx(b1.vx() + (centroid.x - b1.x()) * attraction);
        b1.vy(b1.vy() + (centroid.y - b1.y()) * attraction);
        b1.vz(b1.vz() + (centroid.z - b1.z()) * attraction);
    }

    /**
     * Align the given body with its neighbors.
     * @param {number} idx - the index of the body
     */
    function _align(idx) {
        var threshold = _getSetting('neighborThresholdDist');
        var alignment = _getSetting('alignment');

        var b1 = _bodies[idx];
        var sum = {vx: 0, vy: 0, vz: 0};
        var neighborCount = 0;
        for (var j = 0; j < _bodies.length; j++) {
            if (j === idx) continue;

            var b2 = _bodies[j];
            if (_distance(b1, b2) > threshold) continue;

            neighborCount++;
            sum.vx += b2.vx(); 
            sum.vy += b2.vy();
            sum.vz += b2.vz();
        }
        if (neighborCount === 0) return;

        var avg = {
            vx: sum.vx / neighborCount,
            vy: sum.vy / neighborCount,
            vz: sum.vz / neighborCount
        }
        b1.vx(b1.vx() + (avg.vx - b1.vx()) * alignment);
        b1.vy(b1.vy() + (avg.vy - b1.vy()) * alignment);
        b1.vz(b1.vz() + (avg.vz - b1.vz()) * alignment);
    }

    /**
     * Gear the given body towards a set fascination, if any.
     * @param {number} idx - the index of the body
     */
    function _seek(idx) {
        if (!_fascination) {
            return;
        }
        if (_fascination.strength < 0) {
            _fascination = null;
            return;
        }

        var body = _bodies[idx];
        var dvx = (_fascination.x - body.x()) * 0.01 * _fascination.strength;
        var dvy = (_fascination.y - body.y()) * 0.01 * _fascination.strength;
        var dvz = (_fascination.z - body.z()) * 0.01 * _fascination.strength;
        body.vx(body.vx() + dvx);
        body.vy(body.vy() + dvy);
        body.vz(body.vz() + dvz);

        _fascination.strength += _fascination.decay;
    }

    /**
     * Gear the given body away from a set abomination, if any.
     * @param {number} idx - the index of the body
     */
    function _flee(idx) {
        if (!_abomination) {
            return;
        }
        if (_abomination.strength < 0) {
            _abomination = null;
            return;
        }

        var body = _bodies[idx];
        var dvx = (body.x() - _abomination.x) * 0.01 * _abomination.strength;
        var dvy = (body.y() - _abomination.y) * 0.01 * _abomination.strength;
        var dvz = (body.z() - _abomination.z) * 0.01 * _abomination.strength;
        body.vx(body.vx() + dvx);
        body.vy(body.vy() + dvy);
        body.vz(body.vz() + dvz);

        _abomination.strength += _abomination.decay;
    }

    /**
     * Make the given body converge towards a target speed.
     * @param {number} idx - the index of the body
     */
    function _targetSpeed(idx) {
        var b1 = _bodies[idx];
        var v = Math.sqrt(b1.vx()*b1.vx() + b1.vy()*b1.vy() + b1.vz()*b1.vz());
        if (v === 0) {
            return;
        }
        var d = _getSetting('targetSpeed') - v;

        var multiplier = _getSetting('targetSpeedMultiplier');
        b1.vx(b1.vx() + b1.vx() / v * d * multiplier);
        b1.vy(b1.vy() + b1.vy() / v * d * multiplier);
        b1.vz(b1.vz() + b1.vz() / v * d * multiplier);
    }

    /**
     * Compute the distance between two bodies
     * @param {body} b1
     * @param {body} b2
     */
    function _distance(b1, b2) {
        var dx = b1.x() - b2.x();
        var dy = b1.y() - b2.y();
        var dz = b1.z() - b2.z();
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    return {
        // actions
        tick: tick,
        scatter: scatter,
        gather: gather,
        seek: seek,
        flee: flee,

        // getters & setters
        bodies: bodies,
        settings: settings
    };
}

/**
 * Represents a single body in the flock.
 * Keeps track of its own velocity and position.
 * @param {number} x0 - the initial x pos [0, 1]
 * @param {number} y0 - the initial y pos [0, 1]
 */
function body(x0, y0, z0) {
    var _x = x0,
        _y = y0,
        _z = z0,
        _vx = 0,
        _vy = 0,
        _vz = 0;

    function x(val) {
        if (val === undefined) {
            return _x;
        }
        _x = val;
    }

    function y(val) {
        if (val === undefined) {
            return _y;
        }
        _y = val;
    }

    function z(val) {
        if (val === undefined) {
            return _z;
        }
        _z = val;
    }

    function vx(val) {
        if (val === undefined) {
            return _vx;
        }
        if (isNaN(val)) {
            throw 'vx is NaN';
        }
        _vx = val;
    }

    function vy(val) {
        if (val === undefined) {
            return _vy;
        }
        if (isNaN(val)) {
            throw 'vy is NaN';
        }
        _vy = val;
    }

    function vz(val) {
        if (val === undefined) {
            return _vz;
        }
        if (isNaN(val)) {
            throw 'vy is NaN';
        }
        _vz = val;
    }

    function tick(dt) {
        _x += _vx * dt;
        _y += _vy * dt;
        _z += _vz * dt;
    }

    return {
        x: x,
        y: y,
        z: z,
        vx: vx,
        vy: vy,
        vz: vz,
        tick: tick
    }
}
