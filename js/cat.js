/* =====================================================================
   TomCat —— 会说话的汤姆猫（纯 Canvas 路径绘制，没有任何图片）
   坐标：原点在“两脚之间的地面”，y 轴向上为负
   表情 face : idle | talk | listen | happy | laugh | sneeze | achoo | eat
   姿势 pose : idle | sweep | eat | tickle
   ===================================================================== */
window.TomCat = (function () {
  'use strict';

  var COL = {
    fur: '#a3b1bf', fur2: '#93a2b1', furDark: '#7c8b9a',
    light: '#f4f8fb', belly: '#e9f0f7',
    ear: '#f0a5ae', earDark: '#dc8b96',
    nose: '#c9868f',
    mouth: '#4a3137', tongue: '#f0778a', teeth: '#ffffff',
    sclera: '#ffffff', iris: '#5fb6dd', irisDark: '#2d7fa8', pupil: '#2b3037',
    stripe: '#6d7b89',
    line: 'rgba(72,88,104,.35)'
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function create(opts) {
    opts = opts || {};
    var st = {
      t: 0,
      face: 'idle',
      pose: 'idle',
      mouth: 0, targetMouth: 0, mouthSpeed: 20,
      blink: 1, blinkT: 2.4, blinking: false, blinkP: 0,
      squint: 0, squintTarget: 0,
      gaze: { x: 0, y: 0 }, gazeT: { x: 0, y: 0 },
      headTilt: 0, headBob: 0,
      bodyRot: 0, bounceY: 0, squash: 1,
      impulse: 0,
      tail: 0, earTwitch: 0, earT: 3,
      blush: 0, sweat: 0,
      broom: { on: false, swing: 0 },
      cake: { on: false, x: -300, y: -300, s: 1, rot: -0.35, bites: 0, plate: true },
      feather: { on: false, x: 0, y: -250, phase: 0 },
      breath: 0
    };

    /* ---------------- 每帧更新 ---------------- */

    function update(dt, t, input) {
      st.t = t;
      st.breath = Math.sin(t * 1.7) * 0.5 + 0.5;

      // 眨眼
      st.blinkT -= dt;
      if (!st.blinking && st.blinkT <= 0) {
        st.blinking = true; st.blinkP = 0;
        st.blinkT = 2 + Math.random() * 4.5;
      }
      if (st.blinking) {
        st.blinkP += dt / 0.14;
        if (st.blinkP >= 1) { st.blinking = false; st.blinkP = 0; }
      }
      st.blink = st.blinking ? (st.blinkP < 0.5 ? 1 - st.blinkP * 2 : (st.blinkP - 0.5) * 2) : 1;

      // 耳朵抽动
      st.earT -= dt;
      if (st.earT <= 0) { st.earT = 2.5 + Math.random() * 6; st.earTwitch = 1; }
      st.earTwitch = Math.max(0, st.earTwitch - dt * 2.2);

      // 视线
      if (input && input.look) {
        st.gazeT.x = Math.max(-1, Math.min(1, input.look.x));
        st.gazeT.y = Math.max(-1, Math.min(1, input.look.y));
      }
      st.gaze.x += (st.gazeT.x - st.gaze.x) * Math.min(1, dt * 6);
      st.gaze.y += (st.gazeT.y - st.gaze.y) * Math.min(1, dt * 6);

      // 嘴
      st.mouth += (st.targetMouth - st.mouth) * Math.min(1, dt * st.mouthSpeed);

      // 各种表情的默认姿态
      st.squint = st.squint + ((st.squintTarget || 0) - st.squint) * Math.min(1, dt * 8);
      st.squintTarget = 0;

      st.headBob += (0 - st.headBob) * Math.min(1, dt * 9);

      var bobY = 0, rot = 0, tilt = 0;
      if (st.face === 'idle') {
        bobY = Math.sin(t * 1.9) * 3 - 1;
        tilt = Math.sin(t * 0.7) * 0.03;
        st.squintTarget = 0;
      } else if (st.face === 'talk') {
        bobY = Math.sin(t * 6.5) * 3.4;
        st.headBob = Math.sin(t * 13) * 2.2;
        rot = Math.sin(t * 3.2) * 0.018;
      } else if (st.face === 'listen') {
        bobY = Math.sin(t * 2.4) * 2.4;
        tilt = 0.06 + Math.sin(t * 1.6) * 0.05;
        st.squintTarget = 0;
      } else if (st.face === 'happy') {
        bobY = -Math.abs(Math.sin(t * 5)) * 9;
        st.squintTarget = 0.85;
        tilt = Math.sin(t * 5) * 0.07;
      } else if (st.face === 'laugh') {
        bobY = -Math.abs(Math.sin(t * 11)) * 16;
        rot = Math.sin(t * 11) * 0.05;
        tilt = Math.sin(t * 11 + 0.7) * 0.13;
        st.squintTarget = 1;
      } else if (st.face === 'sneeze') {
        bobY = Math.sin(t * 1.5) * 2;
        tilt = -0.2;
        st.squintTarget = 0.55;
      } else if (st.face === 'achoo') {
        st.squintTarget = 1;
        tilt = 0.12;
      } else if (st.face === 'eat') {
        bobY = Math.sin(t * 4) * 2;
        st.squintTarget = 0.5;
      }

      st.bounceY += (bobY - st.bounceY) * Math.min(1, dt * 12);
      st.bodyRot += (rot - st.bodyRot) * Math.min(1, dt * 10);
      st.headTilt += (tilt - st.headTilt) * Math.min(1, dt * 8);

      // 冲击（打喷嚏、蹦跳）
      st.impulse *= Math.pow(0.0008, dt);
      if (st.impulse > 0.001) {
        st.bodyRot += st.impulse * 0.34;
        st.bounceY -= st.impulse * 26;
        st.squash = 1 - st.impulse * 0.12;
      } else {
        st.impulse = 0;
        st.squash += (1 - st.squash) * Math.min(1, dt * 9);
      }

      // 尾巴
      var wag = 0.26 + st.breath * 0.1;
      if (st.face === 'laugh' || st.face === 'happy') wag += 0.5;
      if (st.face === 'listen') wag += 0.2;
      st.tail = Math.sin(t * 2.1) * wag;

      // 笑的时候耳朵往后
      if (st.face === 'laugh' || st.face === 'achoo') { /* 画的时候处理 */ }

      // 扫把摆动由主控驱动
      if (st.feather.on) st.feather.phase += dt * 9;
    }

    /* ---------------- 手的落点 ---------------- */

    function hands() {
      var t = st.t;
      if (st.pose === 'sweep') {
        var g = broomGeom();
        var pt = function (f) {
          return { x: g.x0 + (g.x1 - g.x0) * f, y: g.y0 + (g.y1 - g.y0) * f };
        };
        return { L: pt(0.28), R: pt(0.62), Lside: -1, Rside: 1 };
      }
      if (st.pose === 'eat') {
        return {
          L: { x: -104, y: -252 + st.mouth * 10 }, R: { x: 118, y: -214 }, Lside: -1, Rside: 1
        };
      }
      if (st.pose === 'tickle') {
        return {
          L: { x: -158, y: -232 + Math.sin(t * 8) * 9 }, R: { x: 158, y: -232 + Math.cos(t * 7) * 9 },
          Lside: -1, Rside: 1
        };
      }
      // idle / talk：胳膊自然垂在身体两侧
      var g2 = Math.sin(t * 2.2) * 3;
      return {
        L: { x: -150 + g2, y: -146 }, R: { x: 150 - g2, y: -146 }, Lside: -1, Rside: 1
      };
    }

    // 扫把：一根从手到地面的杆子，刷头始终贴着地板来回扫
    function broomGeom() {
      var s = Math.sin(st.broom.swing);
      return {
        x0: -34 + s * 12, y0: -296,
        x1: -178 + s * 92, y1: -40
      };
    }

    var SHOULDER = { L: { x: -98, y: -272 }, R: { x: 98, y: -272 } };

    function arm(ctx, s, h, side) {
      var mx = (s.x + h.x) / 2, my = (s.y + h.y) / 2;
      var dx = h.x - s.x, dy = h.y - s.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var k = 30 * side;
      var ex = mx + nx * k, ey = my + ny * k;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // 先画一圈深色，形成描边，让胳膊不会与身体糊在一起
      ctx.strokeStyle = COL.line;
      ctx.lineWidth = 41;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(ex, ey, h.x, h.y); ctx.stroke();
      ctx.strokeStyle = COL.fur;
      ctx.lineWidth = 34;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(ex, ey, h.x, h.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(ex, ey, h.x, h.y); ctx.stroke();
      // 手掌（浅色）
      ctx.fillStyle = COL.light;
      ctx.beginPath(); ctx.arc(h.x, h.y, 18, 0, 6.283); ctx.fill();
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 18, 0, 6.283); ctx.stroke();
      ctx.restore();
    }

    /* ---------------- 身体各部分 ---------------- */

    function tail(ctx) {
      var w = st.tail;
      // 尾巴从身体左后方伸出，向左侧 curl，绝不压到身体和头
      var ex = -246 + w * 52, ey = -336 - w * 26;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // 描边
      ctx.beginPath();
      ctx.moveTo(-92, -136);
      ctx.bezierCurveTo(-212, -128, -300, -216, ex, ey);
      ctx.lineWidth = 47; ctx.strokeStyle = COL.line; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-92, -136);
      ctx.bezierCurveTo(-212, -128, -300, -216, ex, ey);
      ctx.lineWidth = 42; ctx.strokeStyle = COL.fur; ctx.stroke();
      ctx.save();
      ctx.setLineDash([10, 50]);
      ctx.lineDashOffset = 24;
      ctx.lineWidth = 42; ctx.strokeStyle = COL.stripe;
      ctx.stroke();
      ctx.restore();
      // 白色尾尖
      ctx.beginPath();
      ctx.arc(ex, ey, 21, 0, 6.283);
      ctx.fillStyle = COL.light; ctx.fill();
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }

    function legs(ctx) {
      var o = Math.sin(st.t * 1.9) * 1.6;
      drawLeg(ctx, -74, o);
      drawLeg(ctx, 22, -o);
    }

    function drawLeg(ctx, x, o) {
      ctx.save();
      ctx.fillStyle = COL.fur;
      rr(ctx, x, -148, 56, 150, 26); ctx.fill();
      // 脚掌
      ctx.fillStyle = COL.light;
      ctx.beginPath();
      ctx.ellipse(x + 28, -16 + o * 0.35, 44, 22, 0, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x + 28, -16 + o * 0.35, 44, 22, 0, 0, 6.283); ctx.stroke();
      // 脚趾
      ctx.strokeStyle = 'rgba(120,140,160,.55)'; ctx.lineWidth = 2.4;
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 28 + i * 17, -30 + o * 0.35);
        ctx.lineTo(x + 28 + i * 19, -6 + o * 0.35);
        ctx.stroke();
      }
      ctx.restore();
    }

    function body(ctx) {
      var sq = st.squash;
      ctx.save();
      ctx.translate(0, -218);
      ctx.scale(1 + (1 - sq) * 0.5, sq);
      ctx.translate(0, 218);
      // 肚子
      ctx.fillStyle = COL.fur;
      ctx.beginPath(); ctx.ellipse(0, -218, 118, 132, 0, 0, 6.283); ctx.fill();
      // 肚皮
      ctx.fillStyle = COL.belly;
      ctx.beginPath(); ctx.ellipse(0, -196, 76, 102, 0, 0, 6.283); ctx.fill();
      // 身上的斑纹
      ctx.strokeStyle = COL.stripe; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-104, -262); ctx.quadraticCurveTo(-84, -272, -58, -276);
      ctx.moveTo(104, -262); ctx.quadraticCurveTo(84, -272, 58, -276);
      ctx.stroke();
      // 描边
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, -218, 118, 132, 0, 0, 6.283); ctx.stroke();
      ctx.restore();
    }

    function head(ctx) {
      ctx.save();
      ctx.translate(0, -392 + st.headBob);
      ctx.rotate(st.headTilt);
      ctx.scale(1.09, 1.09);   // 脑袋大一点更可爱

      // 耳朵
      ear(ctx, -96, -74, -0.42 - st.earTwitch * 0.1, -1);
      ear(ctx, 96, -74, 0.42 + st.earTwitch * 0.1, 1);

      // 头
      ctx.fillStyle = COL.fur;
      ctx.beginPath(); ctx.ellipse(0, 0, 132, 114, 0, 0, 6.283); ctx.fill();
      // 腮帮子
      ctx.beginPath(); ctx.ellipse(-92, 52, 46, 42, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(92, 52, 46, 42, 0, 0, 6.283); ctx.fill();

      // 头顶的斑纹
      ctx.save();
      ctx.strokeStyle = COL.stripe; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-30, -104); ctx.quadraticCurveTo(-24, -76, -8, -66);
      ctx.moveTo(4, -108); ctx.quadraticCurveTo(8, -78, 22, -68);
      ctx.moveTo(40, -104); ctx.quadraticCurveTo(46, -80, 58, -72);
      ctx.stroke();
      ctx.restore();

      // 描边
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 132, 114, 0, 0, 6.283); ctx.stroke();

      eyes(ctx);
      muzzle(ctx);
      ctx.restore();
    }

    function ear(ctx, x, y, rot, side) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = COL.fur;
      ctx.beginPath();
      ctx.moveTo(-40, 26);
      ctx.quadraticCurveTo(-38, -66, 4, -84);
      ctx.quadraticCurveTo(42, -46, 38, 24);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = COL.ear;
      ctx.beginPath();
      ctx.moveTo(-20, 16);
      ctx.quadraticCurveTo(-20, -42, 2, -56);
      ctx.quadraticCurveTo(24, -32, 22, 14);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function eyes(ctx) {
      var happy = st.face === 'laugh' || st.face === 'happy' || st.squint > 0.55;
      drawEye(ctx, -56, -22, happy);
      drawEye(ctx, 56, -22, happy);
      // 眉毛
      ctx.save();
      ctx.strokeStyle = 'rgba(80,95,112,.85)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      var by = -78 + (st.face === 'listen' ? -8 : 0);
      var brow = 0;
      if (st.face === 'sneeze') { brow = 0.5; by += 14; }
      if (st.face === 'achoo') { brow = 0.9; by += 16; }
      if (st.face === 'laugh' || st.face === 'happy') { brow = -0.35; by -= 4; }
      ctx.beginPath();
      ctx.moveTo(-86, by + brow * 12); ctx.quadraticCurveTo(-56, by - 10, -30, by + brow * 4);
      ctx.moveTo(86, by + brow * 12); ctx.quadraticCurveTo(56, by - 10, 30, by + brow * 4);
      ctx.stroke();
      ctx.restore();
    }

    function drawEye(ctx, x, y, happy) {
      var g = st.gaze;
      ctx.save();
      ctx.translate(x, y);
      if (happy) {
        ctx.strokeStyle = COL.pupil; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-32, 12); ctx.quadraticCurveTo(0, -30, 32, 12);
        ctx.stroke();
        ctx.restore();
        return;
      }
      var wide = st.face === 'listen' ? 1.1 : 1;
      var open = Math.max(0.06, Math.min(1, st.blink)) * (1 - st.squint * 0.75);
      var R = 42 * wide, ry = R * open;
      ctx.beginPath(); ctx.ellipse(0, 0, R, ry, 0, 0, 6.283);
      ctx.fillStyle = COL.sclera; ctx.fill();
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.4; ctx.stroke();

      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0, R, ry, 0, 0, 6.283); ctx.clip();
      var ix = g.x * 11, iy = g.y * 8;
      var ir = 22 * (wide > 1 ? 0.88 : 1);
      ctx.fillStyle = COL.iris;
      ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(40,90,120,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 6.283); ctx.stroke();
      ctx.fillStyle = COL.pupil;
      ctx.beginPath(); ctx.arc(ix, iy + 1, ir * 0.46, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ix - 7, iy - 9, 8, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(ix + 9, iy + 10, 4.5, 0, 6.283); ctx.fill();
      ctx.restore();

      // 下眼睑
      if (st.squint > 0.05) {
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 0, R, ry, 0, 0, 6.283); ctx.clip();
        ctx.fillStyle = COL.fur;
        ctx.fillRect(-R - 2, ry * 0.55, R * 2 + 4, R);
        ctx.restore();
      }
      ctx.restore();
    }

    function muzzle(ctx) {
      var my = 50;
      ctx.save();
      // 白口鼻
      ctx.fillStyle = COL.light;
      ctx.beginPath(); ctx.ellipse(-34, my, 46, 38, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(34, my, 46, 38, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, my + 18, 62, 44, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(150,170,190,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, my + 18, 62, 44, 0, 0, 6.283); ctx.stroke();

      // 鼻子
      ctx.fillStyle = COL.nose;
      ctx.beginPath();
      ctx.moveTo(-19, my - 26);
      ctx.quadraticCurveTo(0, my - 38, 19, my - 26);
      ctx.quadraticCurveTo(6, my + 2, 0, my + 2);
      ctx.quadraticCurveTo(-6, my + 2, -19, my - 26);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.ellipse(-6, my - 24, 5, 3, -0.4, 0, 6.283); ctx.fill();

      mouth(ctx, my + 6);
      whiskers(ctx, my + 4);
      ctx.restore();
    }

    function mouth(ctx, y) {
      var m = Math.max(0, Math.min(1, st.mouth));
      ctx.save();
      if (m < 0.05) {
        ctx.strokeStyle = COL.mouth; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-30, y - 6);
        ctx.quadraticCurveTo(-15, y + 16, 0, y - 2);
        ctx.quadraticCurveTo(15, y + 16, 30, y - 6);
        ctx.stroke();
      } else {
        var w = 40 + m * 42, h = 8 + m * 58;
        ctx.beginPath();
        ctx.moveTo(-w, y - 8);
        ctx.quadraticCurveTo(0, y - 20 - m * 8, w, y - 8);
        ctx.quadraticCurveTo(0, y + h * 1.55, -w, y - 8);
        ctx.closePath();
        ctx.fillStyle = COL.mouth; ctx.fill();
        ctx.save();
        ctx.clip();
        // 舌头
        ctx.fillStyle = COL.tongue;
        ctx.beginPath();
        ctx.ellipse(0, y + h * 0.92, w * 0.72, h * 0.62, 0, 0, 6.283);
        ctx.fill();
        // 上牙
        ctx.fillStyle = COL.teeth;
        ctx.fillRect(-w * 0.5, y - 12, w * 0.3, 11);
        ctx.fillRect(w * 0.2, y - 12, w * 0.3, 11);
        ctx.restore();
        ctx.strokeStyle = 'rgba(60,40,45,.5)'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-w, y - 8);
        ctx.quadraticCurveTo(0, y - 20 - m * 8, w, y - 8);
        ctx.quadraticCurveTo(0, y + h * 1.55, -w, y - 8);
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }

    function whiskers(ctx, y) {
      var w = Math.sin(st.t * 1.4) * 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(110,128,146,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      var sides = [-1, 1];
      for (var s = 0; s < 2; s++) {
        var d = sides[s];
        for (var i = 0; i < 3; i++) {
          var a = (-0.34 + i * 0.32) * d;
          var x0 = d * 60, y0 = y - 12 + i * 15;
          var len = 78 + i * 6;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(
            x0 + d * len * 0.55, y0 + Math.sin(a) * len * 0.5 + w,
            x0 + d * len, y0 + Math.sin(a) * len + w * 2
          );
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    /* ---------------- 道具 ---------------- */

    function broom(ctx) {
      var g = broomGeom();
      ctx.save();
      ctx.lineCap = 'round';
      // 木杆（深色打底 = 描边）
      ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 19;
      ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1); ctx.stroke();
      ctx.strokeStyle = '#cf9558'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1); ctx.stroke();
      // 刷头（刷毛朝下，跟着摆动歪一点）
      ctx.translate(g.x1, g.y1);
      ctx.rotate(Math.sin(st.broom.swing) * 0.34);
      ctx.fillStyle = '#c98f52';
      rr(ctx, -36, -16, 72, 28, 9); ctx.fill();
      ctx.fillStyle = '#e0b06a';
      rr(ctx, -33, -13, 66, 24, 8); ctx.fill();
      ctx.fillStyle = '#c99a4e';
      for (var i = 0; i < 9; i++) {
        var x = -30 + i * 7.5;
        ctx.save();
        ctx.translate(x, 8);
        ctx.rotate((i - 4) * 0.06 + Math.sin(st.t * 15 + i) * 0.04);
        rr(ctx, -3.2, 0, 6.4, 34 + (i % 3) * 7, 3); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function cake(ctx) {
      var c = st.cake;
      if (!c.on) return;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.scale(c.s, c.s);
      // 盘子
      if (c.plate) {
        ctx.fillStyle = '#eef3f8';
        ctx.beginPath(); ctx.ellipse(0, 62, 92, 20, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#cfdae4';
        ctx.beginPath(); ctx.ellipse(0, 66, 92, 16, 0, 0, 6.283); ctx.fill();
      }
      // 蛋糕体（带被咬出的缺口）
      var w = 88, h = 76;
      var biteArc = function (bites) {
        var br = Math.min(w * 0.6, h * (0.3 + bites * 0.18));
        ctx.arc(w + br * 0.5, -h * 0.05 + br * 0.1, br, -Math.PI / 2, Math.PI / 2, true);
      };
      ctx.beginPath();
      ctx.moveTo(-w, h);
      ctx.lineTo(-w, -h * 0.14);
      ctx.quadraticCurveTo(0, -h * 0.78, w, -h * 0.14);
      if (c.bites > 0) biteArc(c.bites);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = '#ffe0ab'; ctx.fill();
      ctx.save();
      ctx.clip();
      // 央层：奶油 + 巧克力
      ctx.fillStyle = '#ff9fb4';
      ctx.fillRect(-w, h * 0.16, w * 2, h * 0.26);
      ctx.fillStyle = '#7d4a2b';
      ctx.fillRect(-w, h * 0.58, w * 2, h * 0.44);
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.fillRect(-w, h * 0.16, w * 2, 5);
      ctx.restore();
      // 描边
      ctx.strokeStyle = 'rgba(150,110,70,.55)'; ctx.lineWidth = 3;
      ctx.stroke();
      // 顶部奶油（带波浪边，允许溢出蛋糕体）
      ctx.beginPath();
      ctx.moveTo(-w, -h * 0.08);
      ctx.quadraticCurveTo(0, -h * 0.86, w, -h * 0.08);
      ctx.quadraticCurveTo(w * 0.74, h * 0.02, w * 0.5, -h * 0.16);
      ctx.quadraticCurveTo(w * 0.26, -h * 0.34, 0, -h * 0.14);
      ctx.quadraticCurveTo(-w * 0.26, -h * 0.34, -w * 0.5, -h * 0.16);
      ctx.quadraticCurveTo(-w * 0.74, h * 0.02, -w, -h * 0.08);
      ctx.closePath();
      ctx.fillStyle = '#ffaec4'; ctx.fill();
      ctx.strokeStyle = 'rgba(190,110,140,.5)'; ctx.lineWidth = 2.5; ctx.stroke();
      // 小樱桃
      if (c.bites < 2) {
        ctx.strokeStyle = '#5d8f4a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -h * 0.74); ctx.quadraticCurveTo(8, -h * 0.92, 20, -h * 0.96); ctx.stroke();
        ctx.fillStyle = '#e8433f';
        ctx.beginPath(); ctx.arc(0, -h * 0.62, 16, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.arc(-5, -h * 0.68, 5, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }

    function feather(ctx) {
      var f = st.feather;
      if (!f.on) return;
      var wig = Math.sin(f.phase) * 16;
      ctx.save();
      ctx.translate(f.x + wig * 0.4, f.y + Math.sin(f.phase * 1.3) * 10);
      ctx.rotate(0.5 + Math.sin(f.phase) * 0.35);
      // 手柄
      ctx.strokeStyle = '#c98f52'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(0, 0); ctx.stroke();
      // 羽毛
      ctx.fillStyle = '#ffd6e2';
      ctx.beginPath(); ctx.ellipse(-30, 0, 52, 26, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffe9f0';
      ctx.beginPath(); ctx.ellipse(-24, -6, 40, 16, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(210,150,175,.7)'; ctx.lineWidth = 2;
      for (var i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-60, 0);
        ctx.lineTo(-12, i * 8);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---------------- 总绘制 ---------------- */

    function draw(ctx) {
      var S = opts.scale || 0.8;
      var ox = opts.x, oy = opts.y;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(S, S);

      // 影子
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#2b4a5f';
      var sh = 1 - Math.min(0.4, (-st.bounceY) / 90);
      ctx.beginPath(); ctx.ellipse(0, 6 - st.bounceY * 0.06, 168 * sh, 34 * sh, 0, 0, 6.283); ctx.fill();
      ctx.restore();

      // 以地面附近为轴心做站姿旋转
      ctx.save();
      ctx.translate(0, -46);
      ctx.rotate(st.bodyRot);
      ctx.translate(0, 46);
      ctx.translate(0, st.bounceY);

      tail(ctx);
      legs(ctx);
      body(ctx);

      var h = hands();
      arm(ctx, SHOULDER.L, h.L, h.Lside);
      arm(ctx, SHOULDER.R, h.R, h.Rside);

      if (st.broom.on) broom(ctx);
      head(ctx);
      cake(ctx);
      feather(ctx);

      ctx.restore();
      ctx.restore();
    }

    return {
      s: st,
      update: update,
      draw: draw,
      hands: hands
    };
  }

  return { create: create, COL: COL };
})();
