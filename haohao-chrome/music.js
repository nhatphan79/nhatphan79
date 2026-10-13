// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🎵 Nhạc nền không lời cho Pomodoro: tự tạo bằng Web Audio, không tải file, không mạng, không bản quyền.
// Dùng: HHMusic.play('piano' | 'lofi' | 'rain' | 'waves' | 'brown', 0.5); HHMusic.setVol(0.3); HHMusic.stop();
(() => {
  let ac = null, master = null, cur = null, kind = '', vol = 0.5;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function ctx() {
    if (!ac) { ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination); }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  // tiếng ồn dựng sẵn (lặp lại 4 giây): white, pink, brown
  function noise(type) {
    const len = ac.sampleRate * 4, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
        else if (type === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
        else d[i] = w * 0.5;
      }
    }
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  }
  // vang giả lập (phòng rộng) cho piano, lofi
  function reverb(sec = 3.2) {
    const len = ac.sampleRate * sec, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const c = ac.createConvolver(); c.buffer = buf; return c;
  }
  const lfo = (freq, depth, target, base) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq; g.gain.value = depth;
    o.connect(g).connect(target); if (base !== undefined) target.value = base; o.start(); return o;
  };

  // mỗi kiểu trả về { out (node), stop() }
  const KINDS = {
    // 🌫️ Ồn nâu: trầm, đều, che tiếng ồn xung quanh
    brown() {
      const out = ac.createGain(); out.gain.value = 0.55;
      const n = noise('brown'), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
      n.connect(f).connect(out); n.start();
      return { out, stop: () => n.stop() };
    },
    // 🌧️ Mưa: tiếng mưa rào đều + hạt mưa lách tách
    rain() {
      const out = ac.createGain(); out.gain.value = 0.8;
      const n = noise('pink'), hp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), g = ac.createGain();
      hp.type = 'highpass'; hp.frequency.value = 500; lp.type = 'lowpass'; lp.frequency.value = 7000; g.gain.value = 0.55;
      n.connect(hp).connect(lp).connect(g).connect(out); n.start();
      const l = lfo(0.07, 0.12, g.gain, 0.55);
      const rumble = noise('brown'), rf = ac.createBiquadFilter(), rg = ac.createGain(); rf.type = 'lowpass'; rf.frequency.value = 200; rg.gain.value = 0.35;
      rumble.connect(rf).connect(rg).connect(out); rumble.start();
      const drop = () => {
        const t = ac.currentTime, len = 0.03, b = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
        const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), dg = ac.createGain(), pan = ac.createStereoPanner();
        s.buffer = b; bp.type = 'bandpass'; bp.frequency.value = rnd(1800, 5200); bp.Q.value = 2; dg.gain.value = rnd(0.05, 0.22); pan.pan.value = rnd(-0.9, 0.9);
        s.connect(bp).connect(dg).connect(pan).connect(out); s.start(t);
      };
      const tm = setInterval(() => { for (let k = 0, m = Math.floor(rnd(1, 5)); k < m; k++) setTimeout(drop, rnd(0, 120)); }, 120);
      return { out, stop: () => { clearInterval(tm); n.stop(); rumble.stop(); l.stop(); } };
    },
    // 🌊 Sóng biển: tiếng sóng dâng lên rút xuống chậm
    waves() {
      const out = ac.createGain(); out.gain.value = 1;
      const mk = (pan, period, delay) => {
        const n = noise('pink'), f = ac.createBiquadFilter(), g = ac.createGain(), p = ac.createStereoPanner();
        f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0; p.pan.value = pan;
        n.connect(f).connect(g).connect(p).connect(out); n.start();
        let alive = true;
        const swell = () => {
          if (!alive) return;
          const t = ac.currentTime, up = period * rnd(0.35, 0.5), down = period - up;
          g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
          g.gain.linearRampToValueAtTime(rnd(0.45, 0.7), t + up); g.gain.linearRampToValueAtTime(0.06, t + period);
          f.frequency.cancelScheduledValues(t); f.frequency.setValueAtTime(f.frequency.value, t);
          f.frequency.linearRampToValueAtTime(rnd(1400, 2200), t + up); f.frequency.linearRampToValueAtTime(500, t + up + down);
          setTimeout(swell, period * 1000 * rnd(0.95, 1.2));
        };
        setTimeout(swell, delay);
        return () => { alive = false; n.stop(); };
      };
      const a = mk(-0.5, 9, 0), b = mk(0.5, 11, 3500);
      return { out, stop: () => { a(); b(); } };
    },
    // 🎹 Piano thư giãn: nốt ngũ cung ngẫu nhiên, vang nhẹ, có nền hợp âm
    piano() {
      const out = ac.createGain(); out.gain.value = 8;
      const rv = reverb(3.5), wet = ac.createGain(), dry = ac.createGain(); wet.gain.value = 0.55; dry.gain.value = 0.6;
      const bus = ac.createGain(); bus.connect(dry).connect(out); bus.connect(rv).connect(wet).connect(out);
      const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];   // Am7 – Fmaj7 – Cmaj7 – G
      const scale = [69, 71, 72, 74, 76, 79, 81, 83, 84, 88];
      let ci = 0, alive = true;
      const note = (m, t, v, dur) => {
        const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
        o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = mtof(m); o2.frequency.value = mtof(m) * 2.001;
        lp.type = 'lowpass'; lp.frequency.value = 2400;
        const g2 = ac.createGain(); g2.gain.value = 0.25;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o1.connect(g); o2.connect(g2).connect(g); g.connect(lp).connect(bus);
        o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
      };
      const bar = () => {
        if (!alive) return;
        const t = ac.currentTime + 0.05, ch = chords[ci++ % chords.length], beat = 0.75;
        ch.forEach((m, k) => note(m, t + k * 0.06, 0.06, 6));                 // hợp âm rải nhẹ
        note(ch[0] - 12, t, 0.08, 6.5);                                       // nốt trầm
        for (let s = 0; s < 8; s++) if (Math.random() < 0.45) note(pick(scale), t + s * beat + rnd(0, 0.04), rnd(0.035, 0.07), rnd(2, 3.5));
      };
      bar(); const tm = setInterval(bar, 6000);
      return { out, stop: () => { alive = false; clearInterval(tm); } };
    },
    // 🎧 Lo-fi: hợp âm ấm, trống nhẹ, tiếng xè xè đĩa than
    lofi() {
      const out = ac.createGain(); out.gain.value = 1.2;
      const warm = ac.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 1800; warm.connect(out);
      const rv = reverb(2), wet = ac.createGain(); wet.gain.value = 0.3; rv.connect(wet).connect(out);
      const vinyl = noise('pink'), vh = ac.createBiquadFilter(), vg = ac.createGain(); vh.type = 'highpass'; vh.frequency.value = 3000; vg.gain.value = 0.05;
      vinyl.connect(vh).connect(vg).connect(out); vinyl.start();
      const chords = [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]];   // Dm9 – G7 – Cmaj7 – Am7
      const bpm = 72, beat = 60 / bpm; let bi = 0, alive = true;
      const kick = t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(out); o.start(t); o.stop(t + 0.32); };
      const snare = t => { const s = noise('white'), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8; g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); s.connect(bp).connect(g).connect(out); bp.connect(rv); s.start(t); s.stop(t + 0.2); };
      const hat = (t, v) => { const s = noise('white'), hp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 7000; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(hp).connect(g).connect(out); s.start(t); s.stop(t + 0.06); };
      const keys = (m, t, dur) => {
        const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = mtof(m); o2.frequency.value = mtof(m) * 1.003;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); o2.connect(g); g.connect(warm); g.connect(rv); o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
      };
      const bar = () => {
        if (!alive) return;
        const t = ac.currentTime + 0.05, ch = chords[bi++ % chords.length];
        ch.forEach((m, k) => keys(m, t + k * 0.03, beat * 4));
        keys(ch[0] - 12, t, beat * 4);
        for (let s = 0; s < 4; s++) {
          const sw = s * beat;
          if (s === 0 || (s === 2 && Math.random() < 0.6)) kick(t + sw);
          if (s === 1 || s === 3) snare(t + sw);
          hat(t + sw, 0.05); hat(t + sw + beat * 0.58, 0.03);       // nhịp swing
        }
      };
      bar(); const tm = setInterval(bar, beat * 4 * 1000);
      return { out, stop: () => { alive = false; clearInterval(tm); vinyl.stop(); } };
    }
  };

  function fadeTo(v, sec) { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + sec); }
  const curve = v => Math.pow(Math.max(0, Math.min(1, v)), 1.6) * 0.9;   // âm lượng theo tai nghe

  function stopNow(fade = 1.2) {
    if (!cur || !ac) { kind = ''; return; }
    const old = cur; cur = null; kind = '';
    fadeTo(0, fade);
    setTimeout(() => { try { old.stop(); old.out.disconnect(); } catch {} }, fade * 1000 + 100);
  }
  self.HHMusic = {
    KINDS: Object.keys(KINDS),
    play(k, v) {
      if (!KINDS[k]) return this.stop();
      if (v !== undefined) vol = v;
      ctx();
      if (k === kind && cur) { fadeTo(curve(vol), 0.4); return; }
      if (cur) { try { cur.stop(); cur.out.disconnect(); } catch {} cur = null; }
      cur = KINDS[k](); cur.out.connect(master); kind = k;
      master.gain.value = 0; fadeTo(curve(vol), 2);
    },
    setVol(v) { vol = v; if (ac && cur) fadeTo(curve(vol), 0.25); },
    stop(fade) { stopNow(fade); },
    get playing() { return kind; }
  };
})();
