/* =====================================================================
   main —— 游戏主控：循环 / 交互 / 状态机 / 粒子
   ===================================================================== */
(function () {
  'use strict';

  var cvs = document.getElementById('stage');
  var ctx = cvs.getContext('2d');

  var CAT_X = 640, CAT_Y = 520, CAT_S = 0.8;
  var cat = window.TomCat.create({ x: CAT_X, y: CAT_Y, scale: CAT_S });

  var mouthV = { x: CAT_X, y: CAT_Y - 346 * CAT_S };
  var eyesV = { x: CAT_X, y: CAT_Y - 414 * CAT_S };
  var bubbleV = { x: CAT_X, y: CAT_Y - 500 * CAT_S - 12 };

  var vw = 0, vh = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
  var view = { px: 0, py: 0, targetPx: 0, targetPy: 0 };
  var pointer = { x: -999, y: -999, inside: false };

  var app = {
    t: 0, last: 0, state: 'boot',
    seq: 0, pitch: 6, level: 0,
    spoke: false, silence: 0, recStart: 0,
    bubbleUntil: 0, idleNext: 6, hintUntil: 0
  };

  var particles = [];

  /* ---------------- 小工具 ---------------- */

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function raf() { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); }

  function begin() { app.seq++; app.state = 'busy'; return app.seq; }
  function wait(ms, my) {
    return new Promise(function (r) {
      setTimeout(function () { r(my === app.seq); }, ms);
    });
  }
  function tween(ms, fn, my) {
    return new Promise(function (res) {
      var t0 = performance.now();
      (function step() {
        if (my !== app.seq) return res(false);
        var p = Math.min(1, (performance.now() - t0) / ms);
        fn(p, p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        if (p < 1) requestAnimationFrame(step); else res(true);
      })();
    });
  }
  function toScreen(vx, vy) { return { x: ox + vx * scale, y: oy + vy * scale }; }
  function toVirtual(sx, sy) { return { x: (sx - ox) / scale, y: (sy - oy) / scale }; }

  /* ---------------- 尺寸 / 视口 ---------------- */

  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = Math.floor(vw * dpr);
    cvs.height = Math.floor(vh * dpr);
    cvs.style.width = vw + 'px';
    cvs.style.height = vh + 'px';

    var dock = document.getElementById('dock');
    var dockH = dock ? dock.offsetHeight + 40 : 160;

    scale = Math.max(vw / window.Scene.W, vh / window.Scene.H);
    ox = (vw - window.Scene.W * scale) / 2;
    oy = (vh - window.Scene.H * scale) / 2;

    // 保证汤姆猫的脚不会被下方道具栏挡住
    var feet = oy + CAT_Y * scale;
    var maxFeet = vh - dockH * 0.5 - 30;
    if (feet > maxFeet) oy -= (feet - maxFeet);

    placeBubble();
  }
  window.addEventListener('resize', resize);

  /* ---------------- 对话框 ---------------- */

  var bubbleEl = document.getElementById('bubble');
  var bubbleTextEl = document.getElementById('bubbleText');
  var bubbleT = 0;

  function say(text, ms) {
    bubbleTextEl.textContent = text;
    bubbleEl.classList.remove('show');
    void bubbleEl.offsetWidth;              // 触发重排以重播动画
    bubbleEl.classList.add('show');
    bubbleT = performance.now() + (ms || 2200);
  }
  function hideBubble() {
    bubbleEl.classList.remove('show');
    bubbleT = 0;
  }

  function placeBubble() {
    var p = toScreen(bubbleV.x, bubbleV.y);
    // 猫的头顶在画布上的高度
    bubbleEl.style.left = p.x + 'px';
    bubbleEl.style.top = p.y + 'px';
  }

  /* ---------------- 粒子 ---------------- */

  function spawn(o) {
    particles.push({
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      g: o.g === undefined ? 0 : o.g,
      life: o.life || 0.8, max: o.life || 0.8,
      r: o.r || 5, color: o.color || '#fff',
      type: o.type || 'dot', rot: o.rot || 0, vr: o.vr || 0
    });
  }

  function dustLike(x, y, n, scale) {
    for (var i = 0; i < n; i++) {
      spawn({
        x: x + rnd(-26, 26), y: y + rnd(-14, 6),
        vx: rnd(-70, 70) * scale, vy: rnd(-90, -20) * scale,
        g: 40, life: rnd(0.5, 0.95), r: rnd(6, 15), color: '#cfbfa6', type: 'dust'
      });
    }
  }
  function crumbs(n) {
    for (var i = 0; i < n; i++) {
      spawn({
        x: mouthV.x + rnd(-16, 16), y: mouthV.y + rnd(-6, 14),
        vx: rnd(-130, 130), vy: rnd(-90, 30), g: 900,
        life: rnd(0.7, 1.2), r: rnd(3.5, 7.5),
        color: Math.random() < 0.5 ? '#e0b06a' : '#a9713f',
        type: 'crumb', rot: rnd(0, 6.28), vr: rnd(-8, 8)
      });
    }
  }
  function spray(n) {
    for (var i = 0; i < n; i++) {
      spawn({
        x: mouthV.x + rnd(-14, 14), y: mouthV.y + rnd(-8, 8),
        vx: rnd(-420, 420), vy: rnd(-320, 180), g: 320,
        life: rnd(0.4, 0.8), r: rnd(2, 5), color: 'rgba(228,246,255,.95)', type: 'dot'
      });
    }
  }
  function tears(n) {
    for (var i = 0; i < n; i++) {
      var d = Math.random() < 0.5 ? -1 : 1;
      spawn({
        x: eyesV.x + d * 26, y: eyesV.y + 4,
        vx: d * rnd(80, 260), vy: rnd(-260, -80), g: 1100,
        life: rnd(0.6, 1.0), r: rnd(5, 9), color: '#8fd6ff', type: 'tear'
      });
    }
  }
  function hearts(n) {
    for (var i = 0; i < n; i++) {
      spawn({
        x: mouthV.x + rnd(-60, 60), y: mouthV.y + rnd(-20, 20),
        vx: rnd(-40, 40), vy: rnd(-120, -60), g: -20,
        life: rnd(1.0, 1.6), r: rnd(10, 18), color: '#ff5f86', type: 'heart',
        rot: rnd(-0.4, 0.4), vr: rnd(-1.5, 1.5)
      });
    }
  }
  function stars(n) {
    for (var i = 0; i < n; i++) {
      spawn({
        x: CAT_X + rnd(-160, 160), y: CAT_Y - rnd(120, 400),
        vx: rnd(-40, 40), vy: rnd(-70, -20),
        life: rnd(0.7, 1.2), r: rnd(8, 16), color: '#ffd166', type: 'star',
        rot: rnd(0, 6.28), vr: rnd(-4, 4)
      });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'dust') { p.r += 26 * dt; p.vx *= 0.98; }
    }
  }

  function drawParticles(c) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = clamp(p.life / p.max, 0, 1);
      c.save();
      c.globalAlpha = a;
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      if (p.type === 'heart') {
        c.fillStyle = p.color;
        c.beginPath();
        c.moveTo(0, p.r * 0.35);
        c.bezierCurveTo(p.r, -p.r * 0.5, p.r * 0.45, -p.r, 0, -p.r * 0.45);
        c.bezierCurveTo(-p.r * 0.45, -p.r, -p.r, -p.r * 0.5, 0, p.r * 0.35);
        c.fill();
      } else if (p.type === 'star') {
        c.fillStyle = p.color;
        c.beginPath();
        for (var k = 0; k < 8; k++) {
          var ang = k * Math.PI / 4;
          var rad = (k % 2 === 0) ? p.r : p.r * 0.38;
          var fx = Math.cos(ang) * rad, fy = Math.sin(ang) * rad;
          if (k === 0) c.moveTo(fx, fy); else c.lineTo(fx, fy);
        }
        c.closePath(); c.fill();
      } else if (p.type === 'crumb') {
        c.fillStyle = p.color;
        c.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
      } else if (p.type === 'tear') {
        c.fillStyle = p.color;
        c.beginPath();
        c.moveTo(0, -p.r);
        c.quadraticCurveTo(p.r, p.r * 0.4, 0, p.r);
        c.quadraticCurveTo(-p.r, p.r * 0.4, 0, -p.r);
        c.fill();
      } else if (p.type === 'dust') {
        c.fillStyle = p.color;
        c.beginPath(); c.arc(0, 0, p.r, 0, 6.283); c.fill();
      } else {
        c.fillStyle = p.color;
        c.beginPath(); c.arc(0, 0, p.r, 0, 6.283); c.fill();
      }
      c.restore();
    }
  }

  /* ---------------- 交互动作 ---------------- */

  function idleAfter(my) {
    if (my === app.seq) app.state = 'idle';
  }

  // 抓痒痒：大笑
  function actTickle() {
    var my = begin();
    cat.s.pose = 'tickle';
    cat.s.face = 'idle';
    cat.s.feather.on = true;
    cat.s.broom.on = false;
    cat.s.cake.on = false;
    window.TomAudio.pop();
    say('诶？你要干嘛～', 1500);
    return wait(650, my).then(function (ok) {
      if (!ok) return;
      say('哈哈哈哈！痒！痒死啦！', 3200);
      var i = 0;
      function beat() {
        if (my !== app.seq) return;
        if (i >= 6) {
          cat.s.face = 'happy';
          cat.s.targetMouth = 0.35;
          cat.s.feather.on = false;
          window.TomAudio.meow();
          say('呼～笑死我了，肚子都疼了！', 2400);
          return wait(2200, my).then(function (ok2) {
            if (!ok2) return;
            hearts(6);
            return wait(700, my).then(function () {
              resetCat();
              idleAfter(my);
            });
          });
        }
        cat.s.face = 'laugh';
        cat.s.targetMouth = 0.85 - (i % 2) * 0.45;
        window.TomAudio.laugh(i);
        tears(3);
        if (i === 2) stars(4);
        i++;
        return wait(215, my).then(beat);
      }
      return beat();
    });
  }

  // 扫地 → 打喷嚏
  function actSweep() {
    var my = begin();
    cat.s.pose = 'sweep';
    cat.s.face = 'idle';
    cat.s.broom.on = true;
    cat.s.broom.swing = 0;
    cat.s.feather.on = false;
    cat.s.cake.on = false;
    window.TomAudio.pop();
    say('扫地咯～灰尘飞起来啦！', 2600);

    var i = 0;
    function stroke() {
      if (my !== app.seq) return;
      if (i >= 7) return wait(260, my).then(buildUp);
      i++;
      cat.s.broom.swing += 1.35;
      window.TomAudio.swish();
      var bx = CAT_X + (-178 + Math.sin(cat.s.broom.swing) * 92) * CAT_S;
      var by = CAT_Y + (-26) * CAT_S;
      dustLike(bx, by, 5, 1);
      return wait(310, my).then(stroke);
    }
    function buildUp() {
      if (my !== app.seq) return;
      cat.s.face = 'sneeze';
      cat.s.broom.on = false;
      cat.s.pose = 'idle';
      say('啊…啊……阿……', 1500);
      return wait(950, my).then(bump);
    }
    function bump() {
      if (my !== app.seq) return;
      cat.s.face = 'sneeze';
      return wait(420, my).then(sneezeOut);
    }
    function sneezeOut() {
      if (my !== app.seq) return;
      cat.s.face = 'achoo';
      cat.s.targetMouth = 1;
      cat.s.impulse = 1;
      window.TomAudio.sneeze();
      spray(26);
      say('阿———嚏！！！', 1900);
      dustLike(CAT_X, CAT_Y - 60, 8, 1.4);
      return wait(520, my).then(function (ok) {
        if (!ok) return;
        cat.s.targetMouth = 0;
        cat.s.impulse = 0.35;
        return wait(700, my).then(function (ok2) {
          if (!ok2) return;
          cat.s.face = 'happy';
          window.TomAudio.meow();
          say('不好意思…灰尘太多啦～', 2300);
          return wait(1500, my).then(function (ok3) {
            if (!ok3) return;
            resetCat();
            idleAfter(my);
          });
        });
      });
    }
    return stroke();
  }

  // 蛋糕：吃东西
  function actEat() {
    var my = begin();
    cat.s.pose = 'eat';
    cat.s.face = 'idle';
    cat.s.broom.on = false;
    cat.s.feather.on = false;
    cat.s.cake.on = true;
    cat.s.cake.bites = 0;
    cat.s.cake.s = 0.55;
    cat.s.cake.rot = -0.5;
    cat.s.cake.plate = true;
    cat.s.cake.x = -330;
    cat.s.cake.y = -296;
    window.TomAudio.pop();
    say('哇！蛋糕！我最爱吃蛋糕啦！', 2600);

    return wait(280, my).then(function (ok) {
      if (!ok) return;
      return tween(760, function (p, e) {
        cat.s.cake.x = -330 + e * 330;
        cat.s.cake.y = -296 - Math.sin(p * Math.PI) * 70;
        cat.s.cake.rot = -0.5 * (1 - p);
        cat.s.cake.s = 0.55 + e * 0.45;
      }, my);
    }).then(function (ok) {
      if (!ok) return;
      cat.s.face = 'eat';
      window.TomAudio.lick();
      say('看起来好好吃…啊呜～', 1600);
      return wait(700, my);
    }).then(function (ok) {
      if (!ok) return;
      var i = 0;
      function chomp() {
        if (my !== app.seq) return;
        if (i >= 3) {
          cat.s.cake.on = false;
          cat.s.targetMouth = 0.12;
          window.TomAudio.yum();
          return wait(500, my).then(function (ok2) {
            if (!ok2) return;
            window.TomAudio.burp();
            cat.s.face = 'happy';
            cat.s.impulse = 0.5;
            cat.s.pose = 'idle';
            hearts(5); stars(3);
            say('嗯～～真好吃！谢谢你！❤', 2600);
            return wait(1900, my).then(function (ok3) {
              if (!ok3) return;
              resetCat();
              idleAfter(my);
            });
          });
        }
        cat.s.targetMouth = 1;
        window.TomAudio.bite(i);
        crumbs(7);
        i++;
        return wait(200, my).then(function (ok2) {
          if (!ok2) return;
          cat.s.targetMouth = 0.06;
          cat.s.cake.bites = i;
          cat.s.cake.s = 1 - i * 0.19;
          cat.s.cake.x += 8;
          cat.s.cake.rot += 0.12;
          return wait(520, my).then(chomp);
        });
      }
      return chomp();
    });
  }

  function resetCat() {
    cat.s.face = 'idle';
    cat.s.pose = 'idle';
    cat.s.targetMouth = 0;
    cat.s.impulse = 0;
    cat.s.broom.on = false;
    cat.s.cake.on = false;
    cat.s.feather.on = false;
  }

  function actMeow() {
    var my = begin();
    resetCat();
    window.TomAudio.meow(Math.random() < 0.5);
    cat.s.face = 'happy';
    cat.s.targetMouth = 0.55;
    hearts(4);
    say(['喵～', '喵呜～你好呀！', '摸摸头，好舒服～', '喵喵喵！'][(Math.random() * 4) | 0], 2000);
    return wait(420, my).then(function (ok) {
      if (!ok) return;
      cat.s.targetMouth = 0.1;
      return wait(500, my);
    }).then(function (ok) {
      if (!ok) return;
      return wait(900, my);
    }).then(function () {
      resetCat();
      idleAfter(my);
    });
  }

  /* ---------------- 麦克风流程 ---------------- */

  function setMicUI(on) {
    var mic = document.getElementById('btnMic');
    var label = document.getElementById('micLabel');
    var meter = document.getElementById('meter');
    if (on) {
      mic.classList.add('rec');
      label.textContent = '点击结束';
      meter.classList.add('on');
    } else {
      mic.classList.remove('rec');
      label.textContent = '点我说话';
      meter.classList.remove('on');
      meter.firstElementChild.style.width = '0%';
    }
  }

  function startListen() {
    if (app.state === 'listen') return;
    if (app.state === 'talk') { window.TomAudio.stopPlay(); }
    window.TomAudio.stopPlay();
    app.state = 'think';
    return window.TomAudio.startRecording().then(function (r) {
      if (!r.ok) {
        app.state = 'idle';
        window.TomAudio.hmm();
        say('麦克风打不开：' + r.message, 4200);
        return;
      }
      app.state = 'listen';
      app.recStart = performance.now();
      app.spoke = false;
      app.silence = 0;
      resetCat();
      cat.s.face = 'listen';
      setMicUI(true);
      say('我在听～快跟我说句话吧！', 2400);
    });
  }

  function stopListen() {
    if (app.state !== 'listen') return Promise.resolve();
    app.state = 'think';
    setMicUI(false);
    return window.TomAudio.stopRecording().then(function (raw) {
      var buf = window.TomAudio.trimAndNormalize(raw);
      if (!buf) {
        cat.s.face = 'idle';
        window.TomAudio.hmm();
        say('咦？我没听见声音…再说一次吧！', 2600);
        app.state = 'idle';
        return;
      }
      say('让我学一学你的声音…', 1200);
      return raf().then(raf).then(function () {
        var voice = window.TomAudio.buildVoice(buf, app.pitch);
        return raf().then(function () {
          cat.s.face = 'talk';
          cat.s.mouthSpeed = 26;
          app.state = 'talk';
          window.TomAudio.play(voice, function () {
            cat.s.face = 'idle';
            cat.s.targetMouth = 0;
            cat.s.mouthSpeed = 20;
            app.state = 'idle';
            if (Math.random() < 0.6) {
              cat.s.face = 'happy';
              say(['嘿嘿，我学会啦！', '你说什么？我鹦鹉学舌～', '再说一句嘛！', '像不像你的声音？'][(Math.random() * 4) | 0], 1900);
              setTimeout(function () {
                if (app.state === 'idle') { cat.s.face = 'idle'; }
              }, 1900);
            }
          }, function (lv) {
            cat.s.targetMouth = clamp(0.1 + lv * 7.5, 0, 1);
          });
        });
      });
    });
  }

  function toggleMic() {
    if (app.state === 'listen') return stopListen();
    if (app.state === 'busy') return;
    return startListen();
  }

  /* ---------------- 主循环 ---------------- */

  function frame(now) {
    var dt = Math.min(0.05, (now - app.last) / 1000 || 0.016);
    app.last = now;
    app.t += dt;

    // 视差（缓动）
    view.px += (view.targetPx - view.px) * Math.min(1, dt * 4);
    view.py += (view.targetPy - view.py) * Math.min(1, dt * 4);

    // 让汤姆猫看着鼠标（小球被拍过就优先看小球）
    var lookV;
    var ballFresh = (now - window.Scene.ball.hitAt) < 2200;
    if (ballFresh) {
      lookV = { x: window.Scene.ball.x, y: window.Scene.ball.y };
    } else if (pointer.inside) {
      lookV = toVirtual(pointer.x, pointer.y);
    } else {
      lookV = { x: CAT_X + Math.sin(app.t * 0.6) * 260, y: CAT_Y - 300 };
    }
    var gx = clamp((lookV.x - CAT_X) / 260, -1, 1);
    var gy = clamp((lookV.y - (CAT_Y - 340)) / 240, -1, 1);
    if (app.state === 'talk') { gx = 0; gy = 0; }

    window.Scene.update(dt);
    cat.update(dt, app.t, { look: { x: gx, y: gy } });
    updateParticles(dt);

    // 录音状态检测
    if (app.state === 'listen') {
      var lv = window.TomAudio.getLevel();
      app.level = lv;
      var bar = document.getElementById('meter').firstElementChild;
      bar.style.width = Math.min(100, lv * 420) + '%';
      if (lv > 0.035) { app.spoke = true; app.silence = 0; }
      else if (app.spoke) { app.silence += dt; }
      var el = (performance.now() - app.recStart) / 1000;
      if ((app.spoke && app.silence > 1.4) || el > 14) stopListen();
    }

    // 空闲时偶尔卖个萌
    if (app.state === 'idle') {
      app.idleNext -= dt;
      if (app.idleNext <= 0) {
        app.idleNext = rnd(9, 18);
        var lines = ['喵～', '有人在吗？', '别看我，我会害羞的！', '我最喜欢吃蛋糕啦！', '要不要听我唱歌？喵～'];
        window.TomAudio.meow(Math.random() < 0.5);
        say(lines[(Math.random() * lines.length) | 0], 1800);
        cat.s.face = 'happy';
        setTimeout(function () { if (app.state === 'idle') cat.s.face = 'idle'; }, 1400);
      }
    }

    // 气泡超时
    if (bubbleT && now > bubbleT) { hideBubble(); }

    // 提示条自动隐藏
    if (app.hintUntil && now > app.hintUntil) {
      document.getElementById('hint').classList.add('hide');
      app.hintUntil = 0;
    }

    render();
    requestAnimationFrame(frame);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    window.Scene.draw(ctx, app.t, view);
    cat.draw(ctx);
    drawParticles(ctx);
    ctx.restore();
  }

  /* ---------------- 交互绑定 ---------------- */

  function onPointerMove(e) {
    var p = e.touches ? e.touches[0] : e;
    if (!p) return;
    pointer.x = p.clientX;
    pointer.y = p.clientY;
    pointer.inside = true;
    view.targetPx = (p.clientX / vw - 0.5) * 2;
    view.targetPy = (p.clientY / vh - 0.5) * 2;
  }

  function hitTest(sx, sy) {
    var v = toVirtual(sx, sy);
    var b = window.Scene.ball;
    var bd = Math.hypot(v.x - b.x, v.y - b.y);
    if (bd < b.r + 22) return { type: 'ball' };
    // 猫：用几个圆做粗略碰撞
    var parts = [
      { x: CAT_X, y: CAT_Y - 392 * CAT_S, ry: 120 * CAT_S, rx: 132 * CAT_S },  // 头
      { x: CAT_X, y: CAT_Y - 218 * CAT_S, ry: 140 * CAT_S, rx: 118 * CAT_S },  // 身体
      { x: CAT_X, y: CAT_Y - 70 * CAT_S, rx: 110 * CAT_S, ry: 90 * CAT_S }
    ];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var dx = (v.x - p.x) / p.rx, dy = (v.y - p.y) / p.ry;
      if (dx * dx + dy * dy <= 1) return { type: 'cat' };
    }
    return { type: 'none' };
  }

  function onCanvasClick(e) {
    var sx = e.clientX, sy = e.clientY;
    var hit = hitTest(sx, sy);
    if (hit.type === 'ball') {
      window.Scene.pokeBall();
      window.TomAudio.pop();
      if (app.state === 'idle') {
        cat.s.face = 'happy';
        say('哇！皮球跳起来了！', 1500);
        setTimeout(function () { if (app.state === 'idle') cat.s.face = 'idle'; }, 1400);
      }
    } else if (hit.type === 'cat') {
      if (app.state === 'listen' || app.state === 'busy') return;
      actMeow();
    }
  }

  function bind() {
    cvs.addEventListener('mousemove', onPointerMove);
    cvs.addEventListener('touchmove', function (e) { onPointerMove(e); }, { passive: true });
    cvs.addEventListener('touchstart', function (e) { onPointerMove(e); }, { passive: true });
    cvs.addEventListener('mouseleave', function () { pointer.inside = false; });
    cvs.addEventListener('click', onCanvasClick);

    // 道具按钮
    var props = document.querySelectorAll('.prop');
    for (var i = 0; i < props.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          if (app.state === 'listen') {
            window.TomAudio.hmm();
            say('先点一下麦克风结束录音哦～', 1800);
            return;
          }
          var act = btn.dataset.act;
          if (act === 'sweep') actSweep();
          else if (act === 'eat') actEat();
          else if (act === 'tickle') actTickle();
          else actMeow();
        });
      })(props[i]);
    }

    // 麦克风：点一下开始 / 再点一下结束；按住说话也可以
    var mic = document.getElementById('btnMic');
    mic.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (app.state === 'listen' && (performance.now() - app.recStart) > 800) { stopListen(); return; }
      toggleMic();
    });
    window.addEventListener('pointerup', function () {
      if (app.state === 'listen' && (performance.now() - app.recStart) > 900) stopListen();
    });

    // 变声滑杆
    var pitch = document.getElementById('pitch');
    var pitchVal = document.getElementById('pitchVal');
    pitch.addEventListener('input', function () {
      app.pitch = parseInt(pitch.value, 10);
      pitchVal.textContent = (app.pitch > 0 ? '+' : '') + app.pitch;
      window.TomAudio.pop();
    });

    // 退出
    document.getElementById('btnExit').addEventListener('click', doExit);
    document.getElementById('btnAgain').addEventListener('click', function () {
      document.getElementById('bye').classList.add('hide');
      app.state = 'idle';
      resetCat();
      window.TomAudio.ensure();
    });

    // 键盘
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (e.key === '1') actSweep();
      else if (e.key === '2') actEat();
      else if (e.key === '3') actTickle();
      else if (e.key === '4') actMeow();
      else if (e.code === 'Space') { e.preventDefault(); if (app.state !== 'busy') toggleMic(); }
      else if (e.key === 'Escape') doExit();
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      }
    });

    // 开始
    document.getElementById('btnStart').addEventListener('click', function () {
      window.TomAudio.ensure();
      document.getElementById('gate').classList.add('hide');
      app.state = 'idle';
      app.hintUntil = performance.now() + 9000;
      window.TomAudio.meow();
      cat.s.face = 'happy';
      say('你好！我是汤姆猫，跟我说话吧！', 3000);
      setTimeout(function () { if (app.state === 'idle') cat.s.face = 'idle'; }, 2600);
    });

    // 环境提示
    if (!window.TomAudio.isSecure()) {
      document.getElementById('gateNote').textContent =
        '⚠️ 当前环境无法使用麦克风，请用 http://localhost:8000 或 https 打开本页面';
    }
  }

  function doExit() {
    try {
      window.TomAudio.stopPlay();
      if (window.TomAudio.isRecording()) window.TomAudio.stopRecording();
    } catch (err) { }
    setMicUI(false);
    hideBubble();
    document.getElementById('bye').classList.remove('hide');
    try { window.close(); } catch (err) { }
  }

  /* ---------------- 启动 ---------------- */

  function boot() {
    resize();
    bind();
    app.last = performance.now();
    app.state = 'boot';
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
