// CINEMATIC AUDIO SYSTEM - Full, rich sounds

const audioCtxRef = { current: null };

function getAudioCtx() {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  return audioCtxRef.current;
}

function vib(pattern) {
  try { navigator?.vibrate?.(pattern); } catch(e) {}
}

// Audio level multipliers
function getVolumeMultiplier(audioLevel) {
  const levels = { off: 0, minimal: 0.4, normal: 1, maximum: 1.8 };
  return levels[audioLevel] || 1;
}

// Cinematic haptic feedback functions
export const haptic = {
  // Deep, punchy drop sound with bass
  drop: (audioLevel = 'normal') => {
    const vol = getVolumeMultiplier(audioLevel);
    if (vol === 0) return;
    
    vib(30);
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      
      // Deep bass thump
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = "sine";
      bass.frequency.setValueAtTime(80, t);
      bass.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      bassGain.gain.setValueAtTime(0.6 * vol, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(t);
      bass.stop(t + 0.25);
      
      // Mid punch
      const mid = ctx.createOscillator();
      const midGain = ctx.createGain();
      mid.type = "triangle";
      mid.frequency.value = 220;
      midGain.gain.setValueAtTime(0.3 * vol, t);
      midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      mid.connect(midGain);
      midGain.connect(ctx.destination);
      mid.start(t);
      mid.stop(t + 0.1);
      
      // High click for definition
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = "square";
      click.frequency.value = 1200;
      clickGain.gain.setValueAtTime(0.15 * vol, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(t);
      click.stop(t + 0.04);
    } catch(e) {}
  },

  // Rich, layered merge sound
  merge: (combo = 1, audioLevel = 'normal') => {
    const vol = getVolumeMultiplier(audioLevel);
    if (vol === 0) return;
    
    const pitch = 1 + (combo - 1) * 0.12;
    vib(40);
    
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      
      // Warm bass foundation
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = "sine";
      bass.frequency.setValueAtTime(110 * pitch, t);
      bass.frequency.exponentialRampToValueAtTime(130 * pitch, t + 0.15);
      bassGain.gain.setValueAtTime(0.4 * vol, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(t);
      bass.stop(t + 0.25);
      
      // Rich chord - three harmonics
      [330, 440, 550].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * pitch, t + i * 0.02);
        gain.gain.setValueAtTime((0.3 - i * 0.08) * vol, t + i * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25 + i * 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.02);
        osc.stop(t + 0.3 + i * 0.02);
      });
      
      // Shimmer on top
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(1760 * pitch, t + 0.05);
      shimmerGain.gain.setValueAtTime(0.15 * vol, t + 0.05);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmer.start(t + 0.05);
      shimmer.stop(t + 0.35);
    } catch(e) {}
  },

  // Epic chain combo sound
  chain: (combo = 1, audioLevel = 'normal') => {
    const vol = getVolumeMultiplier(audioLevel);
    if (vol === 0) return;
    
    const pitch = 1 + (combo - 1) * 0.15;
    vib([30, 20, 50]);
    
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      
      // Rising power chord
      const notes = [262, 330, 392, 523];
      notes.forEach((freq, i) => {
        const delay = i * 0.06;
        
        // Bass layer
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = "sawtooth";
        bass.frequency.setValueAtTime(freq * pitch * 0.5, t + delay);
        bassGain.gain.setValueAtTime(0.35 * vol, t + delay);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.3);
        bass.connect(bassGain);
        bassGain.connect(ctx.destination);
        bass.start(t + delay);
        bass.stop(t + delay + 0.35);
        
        // Bright layer
        const bright = ctx.createOscillator();
        const brightGain = ctx.createGain();
        bright.type = "sine";
        bright.frequency.setValueAtTime(freq * pitch * 2, t + delay);
        brightGain.gain.setValueAtTime(0.2 * vol, t + delay);
        brightGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.25);
        bright.connect(brightGain);
        brightGain.connect(ctx.destination);
        bright.start(t + delay);
        bright.stop(t + delay + 0.3);
      });
      
      // Crescendo sweep
      const sweep = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweep.type = "sine";
      sweep.frequency.setValueAtTime(400 * pitch, t);
      sweep.frequency.exponentialRampToValueAtTime(1600 * pitch, t + 0.25);
      sweepGain.gain.setValueAtTime(0.25 * vol, t);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      sweep.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweep.start(t);
      sweep.stop(t + 0.35);
    } catch(e) {}
  },

  // MASSIVE explosion sound
  explode: (combo = 1, audioLevel = 'normal') => {
    const vol = getVolumeMultiplier(audioLevel);
    if (vol === 0) return;
    
    const pitch = 1 + (combo - 1) * 0.1;
    vib([80, 30, 100, 30, 120]);
    
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      
      // HUGE sub-bass explosion
      const subBass = ctx.createOscillator();
      const subGain = ctx.createGain();
      subBass.type = "sine";
      subBass.frequency.setValueAtTime(40 * pitch, t);
      subBass.frequency.exponentialRampToValueAtTime(20 * pitch, t + 0.4);
      subGain.gain.setValueAtTime(0.8 * vol, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      subBass.connect(subGain);
      subGain.connect(ctx.destination);
      subBass.start(t);
      subBass.stop(t + 0.55);
      
      // Mid-range crack
      const crack = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crack.type = "sawtooth";
      crack.frequency.setValueAtTime(800 * pitch, t);
      crack.frequency.exponentialRampToValueAtTime(100 * pitch, t + 0.15);
      crackGain.gain.setValueAtTime(0.5 * vol, t);
      crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      crack.connect(crackGain);
      crackGain.connect(ctx.destination);
      crack.start(t);
      crack.stop(t + 0.25);
      
      // White noise explosion
      const noiseLen = 0.6;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const env = Math.pow(1 - i / data.length, 2.5);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(2000 * pitch, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(300 * pitch, t + noiseLen);
      noiseFilter.Q.value = 0.8;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5 * vol, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);
      
      // High sparkle debris
      for (let i = 0; i < 5; i++) {
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        const delay = 0.05 + i * 0.03;
        sparkle.type = "sine";
        sparkle.frequency.setValueAtTime(2000 + Math.random() * 1000, t + delay);
        sparkle.frequency.exponentialRampToValueAtTime(500, t + delay + 0.1);
        sparkleGain.gain.setValueAtTime(0.15 * vol, t + delay);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);
        sparkle.connect(sparkleGain);
        sparkleGain.connect(ctx.destination);
        sparkle.start(t + delay);
        sparkle.stop(t + delay + 0.2);
      }
    } catch(e) {}
  },

  // Cinematic rise
  rise: (audioLevel = 'normal') => {
    const vol = getVolumeMultiplier(audioLevel);
    if (vol === 0) return;
    
    vib([20, 10, 30, 10, 40]);
    
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      
      // Rumbling rise
      const rumble = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      rumble.type = "sawtooth";
      rumble.frequency.setValueAtTime(60, t);
      rumble.frequency.exponentialRampToValueAtTime(180, t + 0.4);
      rumbleGain.gain.setValueAtTime(0.3 * vol, t);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      rumble.connect(rumbleGain);
      rumbleGain.connect(ctx.destination);
      rumble.start(t);
      rumble.stop(t + 0.5);
      
      // Ascending tone
      const rise = ctx.createOscillator();
      const riseGain = ctx.createGain();
      rise.type = "sine";
      rise.frequency.setValueAtTime(200, t);
      rise.frequency.exponentialRampToValueAtTime(600, t + 0.3);
      riseGain.gain.setValueAtTime(0.25 * vol, t);
      riseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      rise.connect(riseGain);
      riseGain.connect(ctx.destination);
      rise.start(t);
      rise.stop(t + 0.4);
    } catch(e) {}
  },

  // Dramatic game over
  gameOver: (audioLevel = 'normal') => {
    const vol = getVolumeMultiplier(audioLevel);
    if (vol === 0) return;
    
    vib([150, 50, 150, 50, 300]);
    
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      
      // Descending dramatic chord
      const notes = [440, 330, 220, 110];
      notes.forEach((freq, i) => {
        const delay = i * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, t + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + delay + 0.4);
        gain.gain.setValueAtTime(0.35 * vol, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + delay);
        osc.stop(t + delay + 0.55);
      });
      
      // Final deep impact
      const impact = ctx.createOscillator();
      const impactGain = ctx.createGain();
      impact.type = "sine";
      impact.frequency.setValueAtTime(55, t + 0.5);
      impactGain.gain.setValueAtTime(0.7 * vol, t + 0.5);
      impactGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      impact.connect(impactGain);
      impactGain.connect(ctx.destination);
      impact.start(t + 0.5);
      impact.stop(t + 1.3);
    } catch(e) {}
  },

  // Smooth hold/swap sound
  hold: (audioLevel = 'normal') => {
    const vol = getVolumeMultiplier(audioLevel);
    if (vol === 0) return;
    
    vib([15, 15]);
    
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      
      // Smooth swap tone
      const tone1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      tone1.type = "sine";
      tone1.frequency.setValueAtTime(520, t);
      tone1.frequency.exponentialRampToValueAtTime(660, t + 0.12);
      gain1.gain.setValueAtTime(0.25 * vol, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      tone1.connect(gain1);
      gain1.connect(ctx.destination);
      tone1.start(t);
      tone1.stop(t + 0.18);
      
      const tone2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      tone2.type = "sine";
      tone2.frequency.setValueAtTime(440, t + 0.08);
      tone2.frequency.exponentialRampToValueAtTime(330, t + 0.2);
      gain2.gain.setValueAtTime(0.25 * vol, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
      tone2.connect(gain2);
      gain2.connect(ctx.destination);
      tone2.start(t + 0.08);
      tone2.stop(t + 0.26);
    } catch(e) {}
  },
};
