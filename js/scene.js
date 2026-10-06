/* =====================================================================
   Scene —— 客厅场景（全部用 Canvas 画出来，无图片资源）
   虚拟坐标系：1280 x 720，地板线 y = 520
   支持视差（鼠标/触摸移动时整间屋子会跟着动）+ 可点击的小球
   ===================================================================== */
window.Scene = (function () {
  'use strict';

  var W = 1280, H = 720, FLOOR = 520;

  var clouds = [
    { x: 0, y: 108, s: 1.0, sp: 7 },
    { x: 150, y: 168, s: 0.66, sp: 12 },
    { x: 265, y: 78, s: 0.86, sp: 5 }
  ];

  var motes = [];
  for (var i = 0; i < 30; i++) {
    motes.push({
      x: Math.random() * W, y: 70 + Math.random() * 420,
      r: 1 + Math.random() * 2.4, sp: 8 + Math.random() * 20, ph: Math.random() * 6.283
    });
  }

  // 会自己弹来弹去的小球（汤姆猫的眼睛会盯着它）
  var ball = { x: 920, y: 300, vx: 130, vy: 0, r: 26, spin: 0, hitAt: -99 };

  function update(dt) {
    // 小球物理
    ball.vy += 1100 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.spin += ball.vx * dt * 0.045;
    var groundY = FLOOR + 42;
    if (ball.y + ball.r > groundY) {
      ball.y = groundY - ball.r;
      ball.vy = -Math.max(340, Math.abs(ball.vy) * 0.86);
      ball.hitAt = performance.now();
    }
    if (ball.x - ball.r < 330) { ball.x = 330 + ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > 980) { ball.x = 980 - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (Math.abs(ball.vx) < 60) ball.vx = ball.vx >= 0 ? 60 : -60;
  }

  function pokeBall() {
    ball.vy = -760;
    ball.vx += (Math.random() * 120 - 60);
    ball.hitAt = performance.now();
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawWall(ctx, t, px, py) {
    var g = ctx.createLinearGradient(0, -300, 0, FLOOR);
    g.addColorStop(0, '#cfe6f7');
    g.addColorStop(0.6, '#e2f0fb');
    g.addColorStop(1, '#eef6fc');
    ctx.fillStyle = g;
    ctx.fillRect(-700 + px * 2, -500 + py * 2, W + 1400, FLOOR + 500);

    // 墙纸竖条纹
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    for (var x = -700; x < W + 700; x += 96) {
      ctx.fillRect(x + px * 2, -500 + py * 2, 34, FLOOR + 500);
    }
    ctx.restore();

    // 阳光光柱
    ctx.save();
    ctx.globalAlpha = 0.16;
    var lg = ctx.createLinearGradient(120, 100, 720, 620);
    lg.addColorStop(0, '#fff8d8');
    lg.addColorStop(1, 'rgba(255,248,216,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(150 + px * 4, 110 + py * 4);
    ctx.lineTo(430 + px * 4, 110 + py * 4);
    ctx.lineTo(830, 640);
    ctx.lineTo(300, 640);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWindow(ctx, t, px, py) {
    var x = 96 + px * 5, y = 84 + py * 5, w = 340, h = 300;
    ctx.save();
    // 窗台
    ctx.fillStyle = '#f4f8fb';
    rr(ctx, x - 22, y + h, w + 44, 26, 10); ctx.fill();
    ctx.fillStyle = '#d8e4ee';
    rr(ctx, x - 22, y + h + 20, w + 44, 10, 5); ctx.fill();

    // 窗外天空
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.clip();
    var sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#8ecdf2');
    sky.addColorStop(0.7, '#c9e9fb');
    sky.addColorStop(1, '#eaf7ff');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    // 太阳
    ctx.save();
    ctx.globalAlpha = 0.9;
    var sg = ctx.createRadialGradient(x + 258, y + 66, 6, x + 258, y + 66, 70);
    sg.addColorStop(0, '#fff9c4');
    sg.addColorStop(0.45, '#ffe888');
    sg.addColorStop(1, 'rgba(255,232,136,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(x + 258, y + 66, 70, 0, 6.283); ctx.fill();
    ctx.restore();

    // 飘动的云
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var cx = x + ((c.x + t * c.sp) % (w + 160)) - 80;
      var cy = y + c.y * 0.85;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 22 * c.s, 0, 6.283);
      ctx.arc(cx + 26 * c.s, cy + 6 * c.s, 17 * c.s, 0, 6.283);
      ctx.arc(cx - 26 * c.s, cy + 7 * c.s, 14 * c.s, 0, 6.283);
      ctx.arc(cx + 6 * c.s, cy - 14 * c.s, 16 * c.s, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }

    // 远处小山
    ctx.fillStyle = 'rgba(150,205,180,.65)';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + 90, y + h - 96, x + 190, y + h);
    ctx.quadraticCurveTo(x + 260, y + h - 60, x + w, y + h);
    ctx.closePath(); ctx.fill();

    // 一只飞过的小鸟
    var bx = x + 60 + ((t * 34) % (w + 120));
    var by = y + 60 + Math.sin(t * 1.6) * 12;
    ctx.strokeStyle = 'rgba(60,80,100,.7)';
    ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    var flap = Math.sin(t * 9) * 6;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by + flap); ctx.quadraticCurveTo(bx, by - 4, bx + 10, by + flap);
    ctx.stroke();
    ctx.restore();

    // 窗框
    ctx.strokeStyle = '#fdfefe';
    ctx.lineWidth = 12;
    rr(ctx, x + 6, y + 6, w - 12, h - 12, 6); ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 6); ctx.lineTo(x + w / 2, y + h - 6);
    ctx.moveTo(x + 6, y + h * 0.5); ctx.lineTo(x + w - 6, y + h * 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#dbe6ee'; ctx.lineWidth = 4;
    rr(ctx, x, y, w, h, 10); ctx.stroke();

    // 窗帘（会轻轻飘）
    ctx.save();
    ctx.fillStyle = '#ffc9a3';
    var wave = Math.sin(t * 0.9) * 6;
    ctx.beginPath();
    ctx.moveTo(x - 46, y - 24);
    ctx.quadraticCurveTo(x - 26 + wave, y + 140, x - 40 + wave * 1.4, y + h);
    ctx.lineTo(x - 6, y + h);
    ctx.lineTo(x - 6, y - 24);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(x - 34, y - 24);
    ctx.quadraticCurveTo(x - 16 + wave, y + 140, x - 28 + wave * 1.4, y + h);
    ctx.lineTo(x - 14, y + h);
    ctx.lineTo(x - 14, y - 24);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawClock(ctx, t, px, py) {
    var cx = 660 + px * 7, cy = 152 + py * 6, r = 46;
    ctx.save();
    ctx.fillStyle = 'rgba(20,50,70,.16)';
    ctx.beginPath(); ctx.arc(cx + 3, cy + 5, r, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#8fb2c7'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
    // 刻度
    ctx.strokeStyle = '#b9cfdd'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12));
      ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      ctx.stroke();
    }
    var now = new Date();
    var hh = (now.getHours() % 12) + now.getMinutes() / 60;
    var mm = now.getMinutes() + now.getSeconds() / 60;
    ctx.strokeStyle = '#3d6275'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hh * Math.PI / 6 - Math.PI / 2) * (r * 0.5), cy + Math.sin(hh * Math.PI / 6 - Math.PI / 2) * (r * 0.5));
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(mm * Math.PI / 30 - Math.PI / 2) * (r * 0.72), cy + Math.sin(mm * Math.PI / 30 - Math.PI / 2) * (r * 0.72));
    ctx.stroke();
    ctx.fillStyle = '#e2502c';
    ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function drawPicture(ctx, t, px, py) {
    var x = 862 + px * 8, y = 130 + py * 7, w = 250, h = 158;
    ctx.save();
    ctx.fillStyle = 'rgba(20,50,70,.14)';
    rr(ctx, x + 5, y + 7, w, h, 10); ctx.fill();
    ctx.fillStyle = '#f6e6cf';
    rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = '#c9a276'; ctx.lineWidth = 9;
    rr(ctx, x + 5, y + 5, w - 10, h - 10, 8); ctx.stroke();
    ctx.save();
    rr(ctx, x + 14, y + 14, w - 28, h - 28, 6); ctx.clip();
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#bfe4f7'); g.addColorStop(1, '#ffe9c4');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8fc9a6';
    ctx.beginPath();
    ctx.moveTo(x, y + h - 30);
    ctx.quadraticCurveTo(x + 70, y + h - 90, x + 130, y + h - 30);
    ctx.quadraticCurveTo(x + 190, y + h - 78, x + w, y + h - 30);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath(); ctx.arc(x + w - 52, y + 42, 17, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawSofa(ctx, t, px, py) {
    var x = 846 + px * 11, baseY = FLOOR + 62, w = 430, h = 168;
    ctx.save();
    // 阴影
    ctx.fillStyle = 'rgba(30,60,80,.16)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, baseY + 16, w * 0.52, 26, 0, 0, 6.283); ctx.fill();
    // 靠背
    ctx.fillStyle = '#5fa5a0';
    rr(ctx, x + 26, baseY - h - 96, w - 52, 122, 30); ctx.fill();
    // 坐垫
    ctx.fillStyle = '#74bcb5';
    rr(ctx, x, baseY - h + 30, w, 70, 26); ctx.fill();
    // 底座
    ctx.fillStyle = '#57a19b';
    rr(ctx, x + 20, baseY - 74, w - 40, 76, 18); ctx.fill();
    // 扶手
    ctx.fillStyle = '#66b0aa';
    rr(ctx, x - 16, baseY - h - 6, 74, 150, 30); ctx.fill();
    rr(ctx, x + w - 58, baseY - h - 6, 74, 150, 30); ctx.fill();
    // 抱枕
    ctx.fillStyle = '#ffd166';
    ctx.save();
    ctx.translate(x + 108, baseY - h + 26);
    ctx.rotate(-0.16 + Math.sin(t * 0.8) * 0.012);
    rr(ctx, -46, -46, 92, 92, 20); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f4a3a3';
    ctx.save();
    ctx.translate(x + w - 118, baseY - h + 30);
    ctx.rotate(0.14);
    rr(ctx, -44, -44, 88, 88, 18); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawPlant(ctx, t, px, py) {
    var bx = 196 + px * 9, by = FLOOR + 44;
    ctx.save();
    ctx.fillStyle = 'rgba(30,60,80,.16)';
    ctx.beginPath(); ctx.ellipse(bx + 10, by + 8, 74, 20, 0, 0, 6.283); ctx.fill();
    // 花盆
    ctx.fillStyle = '#d98a63';
    ctx.beginPath();
    ctx.moveTo(bx - 52, by - 84); ctx.lineTo(bx + 52, by - 84);
    ctx.lineTo(bx + 38, by); ctx.lineTo(bx - 38, by);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c1744f';
    rr(ctx, bx - 58, by - 96, 116, 22, 10); ctx.fill();
    // 叶子
    var leaves = [[-52, -170, -0.5], [46, -186, 0.5], [-14, -224, -0.15], [22, -212, 0.3], [-72, -128, -0.9], [70, -140, 0.95]];
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i];
      var sway = Math.sin(t * 1.1 + i) * 0.05;
      ctx.save();
      ctx.translate(bx + L[0], by - 96 + L[1] * 0.001);
      ctx.rotate(L[2] + sway);
      ctx.fillStyle = i % 2 ? '#3f9a5f' : '#4cb06d';
      ctx.beginPath();
      ctx.ellipse(0, L[1] * 0, 26, L[1] < -180 ? 34 : 46, 0, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,70,40,.28)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 40); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBooks(ctx, t, px, py) {
    var x = 420 + px * 10, by = FLOOR + 30;
    var cols = ['#e2705a', '#4f9ec4', '#f0b44a'];
    for (var i = 0; i < 3; i++) {
      ctx.save();
      ctx.fillStyle = 'rgba(30,60,80,.14)';
      ctx.beginPath(); ctx.ellipse(x + 42, by + 8, 60, 16, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = cols[i];
      var bw = 92 - i * 8, bh = 22;
      rr(ctx, x + i * 4, by - (i + 1) * bh, bw, bh, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      rr(ctx, x + i * 4 + 8, by - (i + 1) * bh + 6, bw - 20, 4, 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawFloor(ctx, t, px, py) {
    var g = ctx.createLinearGradient(0, FLOOR, 0, H + 300);
    g.addColorStop(0, '#d8ab7c');
    g.addColorStop(0.35, '#cfa073');
    g.addColorStop(1, '#b8865b');
    ctx.fillStyle = g;
    ctx.fillRect(-800, FLOOR + py * 2, W + 1600, 900);

    // 踢脚线
    ctx.fillStyle = '#f2f6f9';
    ctx.fillRect(-800, FLOOR - 18 + py * 2, W + 1600, 20);
    ctx.fillStyle = 'rgba(150,175,195,.55)';
    ctx.fillRect(-800, FLOOR + 2 + py * 2, W + 1600, 4);

    // 木地板缝隙（近大远小）
    ctx.strokeStyle = 'rgba(140,95,58,.35)';
    ctx.lineWidth = 3;
    for (var i = 0; i <= 14; i++) {
      var t2 = i / 14;
      var y = FLOOR + 6 + Math.pow(t2, 1.7) * 260;
      ctx.beginPath();
      ctx.moveTo(-800, y);
      ctx.lineTo(W + 800, y);
      ctx.stroke();
    }
    for (var j = -6; j <= 18; j++) {
      var x0 = 640 + (j * 150 - 640) * 1.0;
      ctx.beginPath();
      ctx.moveTo(x0, FLOOR + 6);
      ctx.lineTo(640 + (x0 - 640) * 2.4, FLOOR + 266);
      ctx.stroke();
    }

    // 地毯
    ctx.save();
    ctx.translate(640 + px * 2, FLOOR + 96);
    ctx.fillStyle = '#e2718d';
    ctx.beginPath(); ctx.ellipse(0, 0, 430, 108, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#f08fa6';
    ctx.beginPath(); ctx.ellipse(0, 0, 392, 92, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#ffe0e8'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(0, 0, 340, 74, 0, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, 0, 250, 52, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
  }

  function drawMotes(ctx, t, px, py) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var x = ((m.x + t * m.sp) % (W + 200)) - 100 + px * 3;
      var y = m.y + Math.sin(t * 0.9 + m.ph) * 16 + py * 3;
      ctx.globalAlpha = 0.22 + 0.22 * Math.sin(t * 1.4 + m.ph);
      ctx.beginPath(); ctx.arc(x, y, m.r, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  function drawBall(ctx, t, px, py) {
    var x = ball.x + px * 14, y = ball.y + py * 12;
    ctx.save();
    ctx.fillStyle = 'rgba(20,50,70,.2)';
    ctx.beginPath();
    ctx.ellipse(ball.x, FLOOR + 42, 30 - (FLOOR + 42 - ball.y) * 0.03, 9, 0, 0, 6.283);
    ctx.fill();
    ctx.translate(x, y);
    ctx.rotate(ball.spin);
    ctx.fillStyle = '#e8564a';
    ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff4e6';
    ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, ball.r * 0.62, -0.9, 0.9); ctx.fill();
    ctx.strokeStyle = 'rgba(120,40,30,.4)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(-ball.r * 0.4, -ball.r * 0.42, ball.r * 0.22, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function draw(ctx, t, view) {
    var px = view.px, py = view.py;
    drawWall(ctx, t, px, py);
    drawWindow(ctx, t, px, py);
    drawClock(ctx, t, px, py);
    drawPicture(ctx, t, px, py);
    drawFloor(ctx, t, px, py);
    drawBooks(ctx, t, px, py);
    drawPlant(ctx, t, px, py);
    drawSofa(ctx, t, px, py);
    drawBall(ctx, t, px, py);
    drawMotes(ctx, t, px, py);
  }

  return {
    W: W, H: H, FLOOR: FLOOR,
    update: update,
    draw: draw,
    ball: ball,
    pokeBall: pokeBall
  };
})();
