/* =====================================================================
   TomAudio —— 麦克风录音 + 变声播放 + 音效合成
   纯 Web Audio API 实现，零外部音频文件（所有音效都是现场合成的）
   ===================================================================== */
window.TomAudio = (function () {
  'use strict';

  var A = {
    ctx: null, master: null, noiseBuf: null,
    stream: null, rec: null, chunks: [], spData: null, spNode: null,
    analyser: null, dataArr: null, sink: null,
    recording: false, playing: null
  };

  /* ---------------- 基础 ---------------- */

  function ensure() {
    if (!A.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.95;
      A.master.connect(A.ctx.destination);
    }
    if (A.ctx.state === 'suspended') { A.ctx.resume(); }
    return A.ctx;
  }

  function noise() {
    var c = A.ctx;
    if (!A.noiseBuf) {
      var n = Math.floor(c.sampleRate * 1.2);
      A.noiseBuf = c.createBuffer(1, n, c.sampleRate);
      var d = A.noiseBuf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource();
    s.buffer = A.noiseBuf; s.loop = true;
    return s;
  }

  // 一个小工具：把若干节点串起来
  function chain() {
    for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]);
    return arguments[arguments.length - 1];
  }

  function env(g, t0, atk, peak, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  /* ---------------- 音效（全部合成） ---------------- */

  function pop() {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(760, t);
    o.frequency.exponentialRampToValueAtTime(1250, t + 0.09);
    env(g, t, 0.008, 0.16, 0.13);
    chain(o, g, A.master);
    o.start(t); o.stop(t + 0.15);
  }

  // 扫地：唰——
  function swish() {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var n = noise(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(420, t);
    f.frequency.linearRampToValueAtTime(2600, t + 0.16);
    f.frequency.linearRampToValueAtTime(500, t + 0.34);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.12);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.36);
    chain(n, f, g, A.master);
    n.start(t); n.stop(t + 0.4);
  }

  // 打喷嚏：先吸气，再“阿嚏！”
  function sneeze() {
    var c = ensure(); if (!c) return;
    var t0 = c.currentTime;

    var n1 = noise(), f1 = c.createBiquadFilter(), g1 = c.createGain();
    f1.type = 'bandpass'; f1.Q.value = 1.4;
    f1.frequency.setValueAtTime(360, t0);
    f1.frequency.linearRampToValueAtTime(1500, t0 + 0.42);
    g1.gain.setValueAtTime(0.0001, t0);
    g1.gain.linearRampToValueAtTime(0.12, t0 + 0.38);
    g1.gain.linearRampToValueAtTime(0.0001, t0 + 0.5);
    chain(n1, f1, g1, A.master);
    n1.start(t0); n1.stop(t0 + 0.55);

    var t1 = t0 + 0.52;
    var n2 = noise(), f2 = c.createBiquadFilter(), g2 = c.createGain();
    f2.type = 'highpass';
    f2.frequency.setValueAtTime(1100, t1);
    f2.frequency.exponentialRampToValueAtTime(220, t1 + 0.32);
    g2.gain.setValueAtTime(0.0001, t1);
    g2.gain.linearRampToValueAtTime(0.62, t1 + 0.016);
    g2.gain.exponentialRampToValueAtTime(0.001, t1 + 0.34);
    chain(n2, f2, g2, A.master);
    n2.start(t1); n2.stop(t1 + 0.4);

    var o = c.createOscillator(), og = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(320, t1);
    o.frequency.exponentialRampToValueAtTime(85, t1 + 0.26);
    env(og, t1, 0.014, 0.26, 0.3);
    chain(o, og, A.master);
    o.start(t1); o.stop(t1 + 0.34);
  }

  // 大笑：哈哈哈（每一声稍微不同）
  function laugh(i) {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var base = 240 - i * 9 + (Math.random() * 22 - 11);
    var g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 2.4; f.frequency.value = 700 + i * 40;
    var o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.setValueAtTime(base * 1.16, t);
    o1.frequency.exponentialRampToValueAtTime(base, t + 0.13);
    o2.frequency.setValueAtTime(base * 0.5, t);
    o2.frequency.exponentialRampToValueAtTime(base * 0.45, t + 0.13);
    var g2 = c.createGain(); g2.gain.value = 0.35;
    chain(o1, f); chain(o2, g2, f);
    env(g, t, 0.012, 0.2, 0.17);
    chain(f, g, A.master);
    o1.start(t); o2.start(t); o1.stop(t + 0.2); o2.stop(t + 0.2);
  }

  // 咬一口：咔嚓
  function bite(i) {
    var c = ensure(); if (!c) return;
    var t0 = c.currentTime;
    for (var k = 0; k < 3; k++) {
      var t = t0 + k * 0.055;
      var n = noise(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'highpass'; f.frequency.value = 1400 + k * 500;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22 - k * 0.05, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      chain(n, f, g, A.master);
      n.start(t); n.stop(t + 0.06);
    }
    var o = c.createOscillator(), og = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(180 - i * 12, t0);
    o.frequency.exponentialRampToValueAtTime(120, t0 + 0.16);
    env(og, t0, 0.02, 0.12, 0.2);
    chain(o, og, A.master);
    o.start(t0); o.stop(t0 + 0.22);
  }

  // 好吃～（嗯~）
  function yum() {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(190, t);
    o.frequency.linearRampToValueAtTime(230, t + 0.25);
    o.frequency.linearRampToValueAtTime(150, t + 0.6);
    f.type = 'lowpass'; f.frequency.value = 1200;
    env(g, t, 0.06, 0.22, 0.7);
    chain(o, f, g, A.master);
    o.start(t); o.stop(t + 0.72);
  }

  // 喵～
  function meow(high) {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var f0 = high ? 640 : 470;
    var o = c.createOscillator(), o2 = c.createOscillator();
    var f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'triangle';
    o.frequency.setValueAtTime(f0 * 0.72, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.55, t + 0.13);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.85, t + 0.5);
    o2.frequency.setValueAtTime(f0 * 0.5, t);
    o2.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.5);
    var g2 = c.createGain(); g2.gain.value = 0.4;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(2400, t + 0.2);
    f.frequency.linearRampToValueAtTime(1000, t + 0.55);
    env(g, t, 0.05, 0.2, 0.6);
    chain(o, f); chain(o2, g2, f); chain(f, g, A.master);
    o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6);
  }

  // 疑问/没听清
  function hmm() {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t);
    o.frequency.linearRampToValueAtTime(420, t + 0.2);
    o.frequency.linearRampToValueAtTime(300, t + 0.42);
    f.type = 'lowpass'; f.frequency.value = 1400;
    env(g, t, 0.03, 0.18, 0.48);
    chain(o, f, g, A.master);
    o.start(t); o.stop(t + 0.5);
  }

  // 舔嘴唇
  function lick() {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var n = noise(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(600, t);
    f.frequency.linearRampToValueAtTime(2200, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.06);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.26);
    chain(n, f, g, A.master);
    n.start(t); n.stop(t + 0.3);
  }

  // 打嗝/满足
  function burp() {
    var c = ensure(); if (!c) return;
    var t = c.currentTime;
    var o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    f.type = 'lowpass'; f.frequency.value = 700;
    env(g, t, 0.02, 0.3, 0.36);
    chain(o, f, g, A.master);
    o.start(t); o.stop(t + 0.4);
  }

  /* ---------------- 麦克风录音 ---------------- */

  function errText(e) {
    var n = (e && e.name) || '';
    if (n === 'NotAllowedError' || n === 'SecurityError')
      return '麦克风权限被拒绝了，请点击地址栏的🔒图标允许麦克风';
    if (n === 'NotFoundError' || n === 'DevicesNotFoundError')
      return '没有找到麦克风设备';
    if (n === 'NotReadableError' || n === 'TrackStartError')
      return '麦克风被其它程序占用了，请先关闭其它录音软件';
    if (!navigator.mediaDevices)
      return '当前页面不是安全环境，请用 http://localhost 或 https 打开';
    return (e && e.message) || '未知错误';
  }

  function isSecure() {
    return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function startRecording() {
    var c = ensure();
    if (!c) return Promise.resolve({ ok: false, message: '这个浏览器不支持 Web Audio' });
    if (A.recording) return Promise.resolve({ ok: true });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      return Promise.resolve({ ok: false, message: '当前环境不能用麦克风，请用 http://localhost:8000 打开页面' });

    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    }).then(function (stream) {
      A.stream = stream;
      A.chunks = [];

      var src = c.createMediaStreamSource(stream);
      A.analyser = c.createAnalyser();
      A.analyser.fftSize = 1024;
      A.analyser.smoothingTimeConstant = 0.55;
      A.dataArr = new Float32Array(A.analyser.fftSize);
      src.connect(A.analyser);
      // 静音接地：保证 AnalyserNode 会被浏览器持续处理，但不会播出声音（避免啸叫）
      A.sink = c.createGain(); A.sink.gain.value = 0;
      A.analyser.connect(A.sink); A.sink.connect(A.master);

      if (window.MediaRecorder) {
        var cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
        var mime = '';
        for (var i = 0; i < cands.length; i++) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cands[i])) { mime = cands[i]; break; }
        }
        try {
          A.rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 })
                       : new MediaRecorder(stream);
        } catch (e) { A.rec = new MediaRecorder(stream); }
        A.rec.ondataavailable = function (e) { if (e.data && e.data.size) A.chunks.push(e.data); };
        A.rec.start(100);
      } else {
        // 老浏览器兜底：ScriptProcessor 采集 PCM
        A.spData = [];
        A.spNode = c.createScriptProcessor(4096, 1, 1);
        A.spNode.onaudioprocess = function (e) {
          if (!A.recording) return;
          A.spData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };
        src.connect(A.spNode);
        var zero = c.createGain(); zero.gain.value = 0;
        A.spNode.connect(zero); zero.connect(A.master);
      }

      A.recording = true;
      return { ok: true, mime: A.rec ? A.rec.mimeType : 'pcm' };
    }).catch(function (e) {
      return { ok: false, message: errText(e), name: e && e.name };
    });
  }

  function stopStream() {
    if (A.stream) {
      A.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      A.stream = null;
    }
    if (A.spNode) { try { A.spNode.disconnect(); } catch (e) {} A.spNode.onaudioprocess = null; A.spNode = null; }
    if (A.sink) { try { A.sink.disconnect(); } catch (e) {} A.sink = null; }
    if (A.analyser) { try { A.analyser.disconnect(); } catch (e) {} A.analyser = null; }
    A.dataArr = null;
  }

  function stopRecording() {
    if (!A.recording) return Promise.resolve(null);
    A.recording = false;
    var c = A.ctx;

    if (A.rec) {
      var rec = A.rec;
      return new Promise(function (resolve) {
        var done = false;
        var finish = function () {
          if (done) return; done = true;
          var blob = new Blob(A.chunks, { type: (A.chunks[0] && A.chunks[0].type) || 'audio/webm' });
          A.chunks = []; A.rec = null; stopStream();
          if (!blob.size) return resolve(null);
          blob.arrayBuffer().then(function (ab) {
            c.decodeAudioData(ab, function (buf) { resolve(buf); }, function () { resolve(null); });
          }).catch(function () { resolve(null); });
        };
        rec.onstop = finish;
        rec.onerror = finish;
        try { rec.stop(); } catch (e) { finish(); }
        setTimeout(finish, 1200); // 保险
      });
    }

    // PCM 兜底
    var out = null;
    if (A.spData && A.spData.length) {
      var total = 0, i;
      for (i = 0; i < A.spData.length; i++) total += A.spData[i].length;
      out = c.createBuffer(1, total, c.sampleRate);
      var ch = out.getChannelData(0), off = 0;
      for (i = 0; i < A.spData.length; i++) { ch.set(A.spData[i], off); off += A.spData[i].length; }
    }
    A.spData = null;
    stopStream();
    return Promise.resolve(out);
  }

  function getLevel() {
    if (!A.analyser || !A.dataArr) return 0;
    A.analyser.getFloatTimeDomainData(A.dataArr);
    var s = 0;
    for (var i = 0; i < A.dataArr.length; i++) s += A.dataArr[i] * A.dataArr[i];
    return Math.sqrt(s / A.dataArr.length);
  }

  /* ---------------- 处理录音：裁剪 + 归一化 ---------------- */

  function trimAndNormalize(buffer, opts) {
    if (!buffer) return null;
    opts = opts || {};
    var minDur = opts.minDur || 0.12;
    var peakThr = opts.peakThr || 0.008;
    var c = ensure(); if (!c) return null;
    var chs = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length;
    if (len < sr * minDur) return null;
    var data = [], i, ch;
    for (ch = 0; ch < chs; ch++) data.push(buffer.getChannelData(ch));

    var peak = 0;
    for (ch = 0; ch < chs; ch++) {
      var d = data[ch];
      for (i = 0; i < len; i++) { var v = d[i] < 0 ? -d[i] : d[i]; if (v > peak) peak = v; }
    }
    if (peak < peakThr) return null;

    var thr = Math.max(0.012, peak * 0.07);
    var s = 0, e = len - 1, found, k;
    found = false;
    for (; s < len && !found; s++) for (k = 0; k < chs; k++) if (Math.abs(data[k][s]) > thr) { found = true; break; }
    found = false;
    for (; e > s && !found; e--) for (k = 0; k < chs; k++) if (Math.abs(data[k][e]) > thr) { found = true; break; }
    var pad = Math.floor(sr * 0.06);
    s = Math.max(0, s - pad); e = Math.min(len - 1, e + pad);
    var n = e - s + 1;
    if (n < sr * minDur) return null;

    var out = c.createBuffer(chs, n, sr);
    var gain = Math.min(4, 0.92 / peak);
    var fade = Math.max(1, Math.floor(sr * 0.012));
    for (ch = 0; ch < chs; ch++) {
      var src = data[ch], dst = out.getChannelData(ch);
      for (i = 0; i < n; i++) {
        var val = src[s + i] * gain;
        if (i < fade) val *= i / fade;
        if (i > n - fade) val *= (n - i) / fade;
        dst[i] = val > 1 ? 1 : (val < -1 ? -1 : val);
      }
    }
    return out;
  }

  /* ---------------- 变声器：SOLA 时间伸缩 + 重采样 = 保时长变调 ---------------- */

  function hann(n) {
    var w = new Float32Array(n);
    for (var i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
    return w;
  }

  // 把 x 拉长 factor 倍（音高不变），用同步叠加(SOLA)减少断裂感
  function sola(x, factor, sr) {
    var win = Math.max(128, Math.round(sr * 0.03));
    var Hs = Math.max(16, Math.round(win / 4));           // 合成步长
    var Ha = Math.max(1, Math.round(Hs / factor));        // 分析步长
    var search = Math.min(256, Math.round(sr * 0.005));   // 最大搜索范围
    var seed = Math.max(64, Math.round(sr * 0.006));      // 相关比较长度
    var outLen = Math.ceil(x.length * factor) + win + 2;
    var out = new Float32Array(outLen);
    var wsum = new Float32Array(outLen);
    var w = hann(win);
    var ana = 0, syn = 0, prevAna = -1;
    var i, k, d, s, best, bestScore, sc;

    while (syn + win < outLen && ana + win < x.length) {
      if (prevAna >= 0) {
        // 分析位置尽量贴近 syn / factor，再在附近寻找与“已经合成好的波形”
        // 最相似的位置 —— 这就是 SOLA 同步叠加，能避免断裂感
        var target = Math.max(0, Math.round(syn / factor));
        if (target + seed >= x.length) break;
        best = target; bestScore = -Infinity;
        var dmin = Math.max(-search, -target);
        var dmax = Math.min(search, x.length - 1 - seed - target);
        for (d = dmin; d <= dmax; d += 8) {          // 粗搜
          var p = target + d;
          sc = 0;
          for (k = 0; k < seed; k += 4) sc += x[p + k] * out[syn + k];
          if (sc > bestScore) { bestScore = sc; best = p; }
        }
        var fine = best;
        for (d = -7; d <= 7; d++) {
          var p2 = fine + d;
          if (p2 < 0 || p2 + seed >= x.length) continue;
          if (p2 < target + dmin || p2 > target + dmax) continue;
          sc = 0;
          for (k = 0; k < seed; k += 2) sc += x[p2 + k] * out[syn + k];
          if (sc > bestScore) { bestScore = sc; best = p2; }
        }
        ana = best;
      } else {
        ana = 0;
      }
      for (k = 0; k < win; k++) {
        var xs = (ana + k < x.length) ? x[ana + k] : 0;
        out[syn + k] += xs * w[k];
        wsum[syn + k] += w[k];
      }
      prevAna = ana;
      syn += Hs;
    }
    // 归一化窗叠加
    for (i = 0; i < outLen; i++) {
      if (wsum[i] > 1e-4) out[i] /= wsum[i];
    }
    return out;
  }

  function buildVoice(buffer, semitones) {
    if (!buffer) return null;
    var c = ensure(); if (!c) return null;
    var n = buffer.length, sr = buffer.sampleRate, chs = buffer.numberOfChannels;
    var factor = Math.pow(2, (semitones || 0) / 12);
    var mono = new Float32Array(n), i, ch;
    if (chs === 1) {
      mono.set(buffer.getChannelData(0));
    } else {
      for (ch = 0; ch < chs; ch++) {
        var d = buffer.getChannelData(ch);
        for (i = 0; i < n; i++) mono[i] += d[i] / chs;
      }
    }
    var out = c.createBuffer(1, n, sr);
    var dst = out.getChannelData(0);

    if (Math.abs(factor - 1) < 0.001) { dst.set(mono); return out; }

    var st = sola(mono, factor, sr);
    // 重采样回原长度：音高 × factor，时长不变 —— 就是“变声器”
    for (i = 0; i < n; i++) {
      var p = i * factor, i0 = p | 0, fr = p - i0;
      var a = st[i0] || 0, b = st[i0 + 1] || 0;
      dst[i] = a + (b - a) * fr;
    }
    // 轻度平滑，把颗粒感磨掉
    var prev = dst[0];
    for (i = 1; i < n - 1; i++) {
      var sm = 0.25 * prev + 0.5 * dst[i] + 0.25 * dst[i + 1];
      prev = dst[i]; dst[i] = sm;
    }
    var fade = Math.max(1, Math.floor(sr * 0.008));
    for (i = 0; i < fade; i++) { dst[i] *= i / fade; dst[n - 1 - i] *= i / fade; }
    return out;
  }

  /* ---------------- 播放（带实时电平，用来驱动嘴型） ---------------- */

  function play(buffer, onEnd, onLevelFn) {
    var c = ensure(); if (!c || !buffer) { if (onEnd) onEnd(); return null; }
    var src = c.createBufferSource();
    src.buffer = buffer;
    var a = c.createAnalyser(); a.fftSize = 512; a.smoothingTimeConstant = 0.4;
    var g = c.createGain(); g.gain.value = 1;
    var arr = new Float32Array(a.fftSize);
    chain(src, g, a, A.master);
    var raf = 0, alive = true;
    if (onLevelFn) {
      (function tick() {
        if (!alive) return;
        a.getFloatTimeDomainData(arr);
        var s = 0;
        for (var i = 0; i < arr.length; i++) s += arr[i] * arr[i];
        onLevelFn(Math.sqrt(s / arr.length));
        raf = requestAnimationFrame(tick);
      })();
    }
    src.onended = function () {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      if (onLevelFn) onLevelFn(0);
      try { g.disconnect(); a.disconnect(); } catch (e) {}
      if (onEnd) onEnd();
    };
    src.start(0);
    A.playing = {
      stop: function () { try { src.stop(0); } catch (e) {} }
    };
    return A.playing;
  }

  function stopPlay() {
    if (A.playing) { try { A.playing.stop(); } catch (e) {} A.playing = null; }
  }

  /* ---------------- 对外接口 ---------------- */
  return {
    ensure: ensure,
    isSecure: isSecure,
    startRecording: startRecording,
    stopRecording: stopRecording,
    getLevel: getLevel,
    isRecording: function () { return A.recording; },
    trimAndNormalize: trimAndNormalize,
    buildVoice: buildVoice,
    play: play,
    stopPlay: stopPlay,
    errText: errText,
    // 音效
    pop: pop, swish: swish, sneeze: sneeze, laugh: laugh, bite: bite,
    yum: yum, meow: meow, hmm: hmm, lick: lick, burp: burp
  };
})();
