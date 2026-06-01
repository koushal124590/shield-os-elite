// ============================================
// SHIELD CHAT - ROE CLONE - DENSE PARTICLES
// ============================================

(function () {
    'use strict';

    var PARTICLE_COUNT = 80000;
    var currentSection = 0;
    var entered = false;
    var scrollLocked = false;

    // Section labels (like ROE's "THE LOOPERS", "THE KOWLOON" etc)
    var sectionLabels = [
        '"THE ENCRYPTED STATE"',
        '"ZERO KNOWLEDGE"',
        '"THE SWARM"',
        '"DEAD DROP"',
        '"PANIC PROTOCOL"',
        '"FREE COMMS"'
    ];

    // ---------- ATTACH CLICK HANDLER IMMEDIATELY ----------
    var splashEl = document.getElementById('splash');
    var mainUI = document.getElementById('main-ui');
    var scrollHint = document.getElementById('scroll-hint');
    var sectionLabel = document.getElementById('section-label');
    var sectionLabelText = document.getElementById('section-label-text');

    splashEl.addEventListener('click', function () {
        if (entered) return;
        entered = true;
        splashEl.classList.add('hidden');
        mainUI.classList.add('visible');
        // Show scroll hint and section label
        setTimeout(function () {
            scrollHint.classList.add('show');
            sectionLabel.classList.add('show');
        }, 1200);
        // Morph to first section shape
        setTimeout(function () { goToSection(0); }, 600);
    });

    console.log('[SHIELD] Click handler attached');

    // ---------- NAV DOTS ----------
    var dots = document.querySelectorAll('.dot');
    for (var d = 0; d < dots.length; d++) {
        (function (idx) {
            dots[idx].addEventListener('click', function () {
                if (!entered || scrollLocked) return;
                goToSection(idx);
            });
        })(d);
    }

    // ---------- SCROLL ----------
    window.addEventListener('wheel', function (e) {
        if (!entered || scrollLocked) return;
        if (e.deltaY > 30) moveSection(1);
        else if (e.deltaY < -30) moveSection(-1);
    }, { passive: true });

    function moveSection(dir) {
        var next = currentSection + dir;
        if (next < 0) next = 0;
        if (next > 5) next = 5;
        if (next !== currentSection) goToSection(next);
    }

    function goToSection(idx) {
        currentSection = idx;
        scrollLocked = true;

        var secs = document.querySelectorAll('.sec');
        for (var i = 0; i < secs.length; i++) {
            if (i === idx) secs[i].classList.add('active');
            else secs[i].classList.remove('active');
        }

        for (var j = 0; j < dots.length; j++) {
            if (j === idx) dots[j].classList.add('active');
            else dots[j].classList.remove('active');
        }

        // Update bottom label
        if (sectionLabelText) {
            sectionLabelText.textContent = sectionLabels[idx] || '';
        }

        morphTo(idx);
        setTimeout(function () { scrollLocked = false; }, 2000);
    }

    // ============================================
    // THREE.JS - DENSE PARTICLE SYSTEM
    // ============================================

    var scene, camera, renderer, points, geo, mat;
    var shapeArrays = [];
    var clock;
    var mouseX = 0, mouseY = 0;

    function initThree() {
        if (typeof THREE === 'undefined') {
            console.warn('[SHIELD] Three.js not loaded');
            return;
        }

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xf0f0f0, 0.035);

        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 8;

        var cvs = document.getElementById('canvas');
        renderer = new THREE.WebGLRenderer({
            canvas: cvs,
            alpha: true,
            antialias: false,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Generate all shape targets
        shapeArrays.push(makeVortex(PARTICLE_COUNT));      // 0: splash
        shapeArrays.push(makeInfinity(PARTICLE_COUNT));     // 1: section 0
        shapeArrays.push(makeSpheres(PARTICLE_COUNT));      // 2: section 1
        shapeArrays.push(makeNetwork(PARTICLE_COUNT));      // 3: section 2
        shapeArrays.push(makeWall(PARTICLE_COUNT));         // 4: section 3
        shapeArrays.push(makePillar(PARTICLE_COUNT));       // 5: section 4
        shapeArrays.push(makeImplosion(PARTICLE_COUNT));    // 6: section 5

        // Build geometry
        geo = new THREE.BufferGeometry();
        var pos = new Float32Array(shapeArrays[0]);
        var tgt = new Float32Array(shapeArrays[0]);
        var scales = new Float32Array(PARTICLE_COUNT);
        var alphas = new Float32Array(PARTICLE_COUNT);
        var delays = new Float32Array(PARTICLE_COUNT);

        for (var i = 0; i < PARTICLE_COUNT; i++) {
            scales[i] = 0.5 + Math.random() * 0.5;
            alphas[i] = 0.4 + Math.random() * 0.5;
            delays[i] = Math.random();
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aTarget', new THREE.BufferAttribute(tgt, 3));
        geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
        geo.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));

        mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorph: { value: 0 },
                uColor: { value: new THREE.Color(0x050505) },
                uSize: { value: 1.8 * renderer.getPixelRatio() }
            },
            vertexShader: [
                'attribute float aScale;',
                'attribute float aAlpha;',
                'attribute float aDelay;',
                'attribute vec3 aTarget;',
                'varying float vAlpha;',
                'uniform float uSize;',
                'uniform float uTime;',
                'uniform float uMorph;',
                'void main(){',
                '  vAlpha=aAlpha;',
                '  float p=clamp((uMorph-aDelay*0.4)/0.6,0.0,1.0);',
                '  float e=p<0.5?4.0*p*p*p:1.0-pow(-2.0*p+2.0,3.0)/2.0;',
                '  vec3 pos=mix(position,aTarget,e);',
                '  pos.x+=sin(uTime*0.5+pos.y*2.0)*0.015*aScale;',
                '  pos.y+=cos(uTime*0.5+pos.x*2.0)*0.015*aScale;',
                '  pos.z+=sin(uTime*0.3+pos.x*1.0)*0.008;',
                '  vec4 mv=modelViewMatrix*vec4(pos,1.0);',
                '  gl_PointSize=uSize*(6.0/-mv.z)*aScale;',
                '  gl_Position=projectionMatrix*mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uColor;',
                'varying float vAlpha;',
                'void main(){',
                '  gl_FragColor=vec4(uColor,vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        points = new THREE.Points(geo, mat);
        scene.add(points);

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('mousemove', function (e) {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        clock = new THREE.Clock();
        animate();
        console.log('[SHIELD] Three.js ready:', PARTICLE_COUNT, 'particles');
    }

    function animate() {
        requestAnimationFrame(animate);
        if (!points) return;

        var t = clock.getElapsedTime();
        mat.uniforms.uTime.value = t;

        // Vortex spin on splash, gentle drift after entering
        if (!entered) {
            points.rotation.z += 0.0015;
        } else {
            points.rotation.z += (0 - points.rotation.z) * 0.03;
            // Gentle continuous rotation for "alive" feeling
            points.rotation.y = Math.sin(t * 0.1) * 0.08;
            points.rotation.x = Math.cos(t * 0.08) * 0.04;
        }

        // Mouse parallax
        camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.04;
        camera.position.y += (mouseY * 0.4 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    function morphTo(sectionIdx) {
        if (!points || !geo || typeof gsap === 'undefined') return;

        var shapeIdx = sectionIdx + 1;
        var nextTarget = shapeArrays[shapeIdx];
        if (!nextTarget) return;

        var posArr = geo.attributes.position.array;
        var tgtArr = geo.attributes.aTarget.array;
        var delayArr = geo.attributes.aDelay.array;
        var curMorph = mat.uniforms.uMorph.value;
        var len = PARTICLE_COUNT * 3;

        for (var i = 0; i < len; i += 3) {
            var d = delayArr[i / 3];
            var p = (curMorph - d * 0.4) / 0.6;
            if (p < 0) p = 0; if (p > 1) p = 1;
            var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

            posArr[i] = posArr[i] + (tgtArr[i] - posArr[i]) * e;
            posArr[i + 1] = posArr[i + 1] + (tgtArr[i + 1] - posArr[i + 1]) * e;
            posArr[i + 2] = posArr[i + 2] + (tgtArr[i + 2] - posArr[i + 2]) * e;

            tgtArr[i] = nextTarget[i];
            tgtArr[i + 1] = nextTarget[i + 1];
            tgtArr[i + 2] = nextTarget[i + 2];
        }

        geo.attributes.position.needsUpdate = true;
        geo.attributes.aTarget.needsUpdate = true;
        mat.uniforms.uMorph.value = 0;

        gsap.to(mat.uniforms.uMorph, {
            value: 1,
            duration: 2.5,
            ease: 'power2.inOut'
        });
    }

    // ============================================
    // SHAPE GENERATORS — Tight, clean formations
    // ============================================

    function makeVortex(n) {
        var p = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            // Continuous swirling cloud — NOT distinct arms
            // Start with random position across the full viewport
            var x = (Math.random() - 0.5) * 28;
            var y = (Math.random() - 0.5) * 18;
            
            // Calculate distance from center
            var dist = Math.sqrt(x * x + y * y);
            
            // Apply twist rotation based on distance (closer = more twist)
            // This creates the natural hurricane/nebula swirl
            var twistAmount = 2.5 / (dist + 0.5);
            var angle = Math.atan2(y, x) + twistAmount;
            
            // Concentrate density at mid-range (ring-like density)
            var densityBias = Math.exp(-Math.pow((dist - 5) / 4, 2));
            if (Math.random() > densityBias * 0.7 + 0.3) {
                // Redistribute rejected particles to fill gaps
                var newDist = 2 + Math.pow(Math.random(), 0.8) * 10;
                angle = Math.random() * Math.PI * 2 + 2.0 / (newDist + 0.5);
                dist = newDist;
            }
            
            p[i * 3] = Math.cos(angle) * dist;
            p[i * 3 + 1] = Math.sin(angle) * dist;
            p[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        }
        return p;
    }

    function makeInfinity(n) {
        var p = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            if (Math.random() < 0.88) {
                var t = Math.random() * Math.PI * 2;
                var s = 5.5;
                var d = 1 + Math.sin(t) * Math.sin(t);
                var bx = s * Math.cos(t) / d;
                var by = s * Math.sin(t) * Math.cos(t) / d;
                // Thin tube volume around the path
                var vol = 0.8 * Math.pow(Math.random(), 0.7);
                var ax = Math.random() * Math.PI * 2;
                var ay = Math.random() * Math.PI * 2;
                p[i * 3] = bx + Math.cos(ax) * vol;
                p[i * 3 + 1] = by + Math.sin(ay) * vol;
                p[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
            } else {
                p[i * 3] = (Math.random() - 0.5) * 30;
                p[i * 3 + 1] = (Math.random() - 0.5) * 18;
                p[i * 3 + 2] = (Math.random() - 0.5) * 3;
            }
        }
        return p;
    }

    function makeSpheres(n) {
        var p = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            if (Math.random() < 0.85) {
                var side = Math.random() > 0.5 ? 1 : -1;
                var cx = side * 3;
                // Concentrate on shell surface
                var r = 2.0 + (Math.random() - 0.5) * 1.2;
                var th = Math.random() * Math.PI * 2;
                var ph = Math.acos(Math.random() * 2 - 1);
                p[i * 3] = cx + r * Math.sin(ph) * Math.cos(th);
                p[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
                p[i * 3 + 2] = r * Math.cos(ph);
            } else {
                p[i * 3] = (Math.random() - 0.5) * 30;
                p[i * 3 + 1] = (Math.random() - 0.5) * 18;
                p[i * 3 + 2] = (Math.random() - 0.5) * 3;
            }
        }
        return p;
    }

    function makeNetwork(n) {
        var p = new Float32Array(n * 3);
        // Pre-define cluster centers for structure
        var centers = [[-5,-1.5],[- 2.5,1.5],[0,-0.5],[2.5,1],[5,-1],[1,-2.5],[-3,0]];
        for (var i = 0; i < n; i++) {
            if (Math.random() < 0.7) {
                var ci = Math.floor(Math.random() * centers.length);
                var cx = centers[ci][0];
                var cy = centers[ci][1];
                var r = Math.pow(Math.random(), 0.8) * 1.0;
                var a = Math.random() * Math.PI * 2;
                p[i * 3] = cx + Math.cos(a) * r;
                p[i * 3 + 1] = cy + Math.sin(a) * r;
                p[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
            } else if (Math.random() < 0.5) {
                // Filament connecting two clusters
                var c1 = Math.floor(Math.random() * centers.length);
                var c2 = Math.floor(Math.random() * centers.length);
                var lerp = Math.random();
                p[i * 3] = centers[c1][0] + (centers[c2][0] - centers[c1][0]) * lerp + (Math.random() - 0.5) * 0.15;
                p[i * 3 + 1] = centers[c1][1] + (centers[c2][1] - centers[c1][1]) * lerp + (Math.random() - 0.5) * 0.15;
                p[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
            } else {
                p[i * 3] = (Math.random() - 0.5) * 30;
                p[i * 3 + 1] = (Math.random() - 0.5) * 18;
                p[i * 3 + 2] = (Math.random() - 0.5) * 3;
            }
        }
        return p;
    }

    function makeWall(n) {
        var p = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            if (Math.random() < 0.82) {
                // Dense rectangular particle wall with grid structure
                p[i * 3] = (Math.random() - 0.5) * 12;
                p[i * 3 + 1] = (Math.random() - 0.5) * 7;
                p[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
                // Horizontal scan lines
                if (Math.random() > 0.85) {
                    var lineY = (Math.floor(Math.random() * 8) - 4) * 0.9;
                    p[i * 3 + 1] = lineY + (Math.random() - 0.5) * 0.05;
                }
            } else {
                p[i * 3] = (Math.random() - 0.5) * 30;
                p[i * 3 + 1] = (Math.random() - 0.5) * 18;
                p[i * 3 + 2] = (Math.random() - 0.5) * 3;
            }
        }
        return p;
    }

    // Pillar/signpost shape
    function makePillar(n) {
        var p = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            var zone = Math.random();
            if (zone < 0.25) {
                // Vertical pole — tight
                p[i * 3] = (Math.random() - 0.5) * 0.2;
                p[i * 3 + 1] = (Math.random() - 0.5) * 12;
                p[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
            } else if (zone < 0.5) {
                // Top signboard — dense rectangle
                p[i * 3] = (Math.random() - 0.5) * 5;
                p[i * 3 + 1] = 2.5 + (Math.random() - 0.5) * 1.5;
                p[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
            } else if (zone < 0.7) {
                // Second signboard — angled
                var angle = 0.3;
                var lx = (Math.random() - 0.5) * 4;
                p[i * 3] = lx;
                p[i * 3 + 1] = 4.0 + lx * angle + (Math.random() - 0.5) * 0.8;
                p[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
            } else if (zone < 0.82) {
                // Small detail elements near top
                p[i * 3] = (Math.random() - 0.5) * 2;
                p[i * 3 + 1] = 5 + Math.random() * 1.5;
                p[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
            } else {
                // Ambient scatter
                p[i * 3] = (Math.random() - 0.5) * 30;
                p[i * 3 + 1] = (Math.random() - 0.5) * 18;
                p[i * 3 + 2] = (Math.random() - 0.5) * 3;
            }
        }
        return p;
    }

    function makeImplosion(n) {
        var p = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            if (Math.random() < 0.8) {
                // Dense core with exponential falloff
                var r = Math.pow(Math.random(), 3) * 2.5;
                var th = Math.random() * Math.PI * 2;
                var ph = Math.acos(Math.random() * 2 - 1);
                p[i * 3] = r * Math.sin(ph) * Math.cos(th);
                p[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
                p[i * 3 + 2] = r * Math.cos(ph);
            } else {
                // Streaks radiating outward
                var dir = Math.random() * Math.PI * 2;
                var dist = 2 + Math.random() * 12;
                p[i * 3] = Math.cos(dir) * dist;
                p[i * 3 + 1] = Math.sin(dir) * dist;
                p[i * 3 + 2] = (Math.random() - 0.5) * 1;
            }
        }
        return p;
    }

    // ============================================
    // BOOT
    // ============================================
    if (document.readyState === 'complete') {
        initThree();
    } else {
        window.addEventListener('load', initThree);
    }

})();
