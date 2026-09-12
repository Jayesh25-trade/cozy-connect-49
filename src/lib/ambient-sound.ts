// Synthetic ambient sound generator using Web Audio API.
// 100% offline, zero network requests, ultra-lightweight.

export type SoundMode = "off" | "rain" | "fire" | "lofi";

let ctx: AudioContext | null = null;
let activeNodes: { stop: () => void }[] = [];
let currentMode: SoundMode = "off";

function getAudioContext(): AudioContext {
  if (!ctx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function stopAmbientSound() {
  activeNodes.forEach((n) => {
    try {
      n.stop();
    } catch {
      /* ignore */
    }
  });
  activeNodes = [];
  currentMode = "off";
}

export function setAmbientSound(mode: SoundMode) {
  stopAmbientSound();
  if (mode === "off") return;

  try {
    const ac = getAudioContext();
    currentMode = mode;

    if (mode === "rain") {
      // Pink/Brown noise generator for cozy rain sound
      const bufferSize = 2 * ac.sampleRate;
      const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i]!;
      }

      const whiteNoise = ac.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, ac.currentTime);

      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.12, ac.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      whiteNoise.start();

      activeNodes.push({
        stop: () => {
          whiteNoise.stop();
          whiteNoise.disconnect();
          filter.disconnect();
          gain.disconnect();
        },
      });
    } else if (mode === "fire") {
      // Low rumble + random crackle pops for cozy fireplace
      const bufferSize = 2 * ac.sampleRate;
      const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ac.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, ac.currentTime);

      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.18, ac.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      noise.start();

      // Random crackle pop interval
      const interval = setInterval(() => {
        if (currentMode !== "fire") {
          clearInterval(interval);
          return;
        }
        if (Math.random() > 0.4) {
          try {
            const osc = ac.createOscillator();
            const popGain = ac.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(150 + Math.random() * 300, ac.currentTime);
            popGain.gain.setValueAtTime(0.08, ac.currentTime);
            popGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);

            osc.connect(popGain);
            popGain.connect(ac.destination);
            osc.start();
            osc.stop(ac.currentTime + 0.06);
          } catch {
            /* ignore */
          }
        }
      }, 180);

      activeNodes.push({
        stop: () => {
          clearInterval(interval);
          noise.stop();
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        },
      });
    } else if (mode === "lofi") {
      // Gentle soft warm synth pad chord (Cmaj7 / Am9)
      const frequencies = [261.63, 329.63, 392.0, 493.88]; // C4, E4, G4, B4
      const masterGain = ac.createGain();
      masterGain.gain.setValueAtTime(0.06, ac.currentTime);
      masterGain.connect(ac.destination);

      const oscs: OscillatorNode[] = [];
      frequencies.forEach((freq) => {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ac.currentTime);
        osc.connect(masterGain);
        osc.start();
        oscs.push(osc);
      });

      activeNodes.push({
        stop: () => {
          oscs.forEach((o) => {
            try {
              o.stop();
              o.disconnect();
            } catch {
              /* ignore */
            }
          });
          masterGain.disconnect();
        },
      });
    }
  } catch {
    /* Web Audio API blocked or disabled */
  }
}

export function playHeartChime() {
  try {
    const ac = getAudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ac.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ac.currentTime + 0.15); // G5

    gain.gain.setValueAtTime(0.08, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start();
    osc.stop(ac.currentTime + 0.25);
  } catch {
    /* ignore */
  }
}
