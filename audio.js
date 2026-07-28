/**
 * Procedural Web Audio for Hold the Line.
 *
 * The continuous sound follows actual engine heat and warning state. No audio
 * assets, remote modules, or prerecorded samples are required.
 */

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function holdAudioParameter(parameter, time) {
  const heldValue = parameter.value;
  if (typeof parameter.cancelAndHoldAtTime === "function") {
    parameter.cancelAndHoldAtTime(time);
    return;
  }

  // Read before cancelling: cancelScheduledValues() may restore the value from
  // before an active ramp, which creates an audible discontinuity.
  parameter.cancelScheduledValues(time);
  parameter.setValueAtTime(heldValue, time);
}

export function holdAudioParameters(state = {}) {
  const heat = clamp(finiteOr(state.heat, 0), 0, 1);
  const signal = clamp(finiteOr(state.warningSignal, heat), 0, 1);
  const multiplier = clamp(finiteOr(state.multiplier, 1), 1, 8);
  const pitchLift = Math.log2(multiplier) * 9;

  return Object.freeze({
    droneFrequency: 58 + heat * 54 + pitchLift,
    overtoneFrequency: 119 + heat * 126 + pitchLift * 2,
    filterFrequency: 320 + signal ** 2 * 2_100,
    pulseFrequency: 0.9 + signal * 5.3,
    pulseDepth: 0.008 + signal * 0.022,
    masterGain: 0.038 + heat * 0.018,
  });
}

function setSmooth(parameter, value, now, timeConstant = 0.055) {
  holdAudioParameter(parameter, now);
  parameter.setTargetAtTime(value, now, timeConstant);
}

export class ProceduralAudio {
  #context = null;
  #enabled;
  #roundNodes = null;
  #roundToken = 0;

  constructor(enabled = true) {
    this.#enabled = Boolean(enabled);
  }

  get enabled() {
    return this.#enabled;
  }

  async setEnabled(enabled) {
    this.#enabled = Boolean(enabled);
    if (!this.#enabled) {
      this.stop();
      return;
    }
    await this.#unlock();
  }

  async #unlock() {
    if (!this.#enabled) {
      return null;
    }
    if (this.#context === null) {
      if (typeof globalThis.AudioContext !== "function") {
        return null;
      }
      this.#context = new globalThis.AudioContext();
    }
    if (this.#context.state === "suspended") {
      await this.#context.resume();
    }
    return this.#context;
  }

  async start(state) {
    if (!this.#enabled) {
      return;
    }

    const token = ++this.#roundToken;
    const context = await this.#unlock();
    if (
      context === null ||
      token !== this.#roundToken ||
      !this.#enabled
    ) {
      return;
    }

    this.#stopRoundNodes(0.015, false);
    const now = context.currentTime;
    const parameters = holdAudioParameters(state);

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(parameters.masterGain, now + 0.08);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(parameters.filterFrequency, now);
    filter.Q.setValueAtTime(1.2, now);

    const drone = context.createOscillator();
    drone.type = "triangle";
    drone.frequency.setValueAtTime(parameters.droneFrequency, now);

    const overtone = context.createOscillator();
    overtone.type = "sawtooth";
    overtone.frequency.setValueAtTime(parameters.overtoneFrequency, now);
    const overtoneGain = context.createGain();
    overtoneGain.gain.setValueAtTime(0.09, now);

    const pulse = context.createOscillator();
    pulse.type = "sine";
    pulse.frequency.setValueAtTime(parameters.pulseFrequency, now);
    const pulseDepth = context.createGain();
    pulseDepth.gain.setValueAtTime(parameters.pulseDepth, now);

    drone.connect(filter);
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(master);
    pulse.connect(pulseDepth);
    pulseDepth.connect(master.gain);
    master.connect(context.destination);

    drone.start(now);
    overtone.start(now);
    pulse.start(now);

    this.#roundNodes = {
      drone,
      filter,
      master,
      overtone,
      overtoneGain,
      pulse,
      pulseDepth,
    };
  }

  update(state) {
    if (!this.#enabled || this.#context === null || this.#roundNodes === null) {
      return;
    }
    const now = this.#context.currentTime;
    const parameters = holdAudioParameters(state);
    const nodes = this.#roundNodes;

    setSmooth(nodes.drone.frequency, parameters.droneFrequency, now);
    setSmooth(nodes.overtone.frequency, parameters.overtoneFrequency, now);
    setSmooth(nodes.filter.frequency, parameters.filterFrequency, now, 0.08);
    setSmooth(nodes.pulse.frequency, parameters.pulseFrequency, now, 0.08);
    setSmooth(nodes.pulseDepth.gain, parameters.pulseDepth, now, 0.08);
    setSmooth(nodes.master.gain, parameters.masterGain, now, 0.08);
  }

  stop() {
    this.#roundToken += 1;
    this.#stopRoundNodes(0.045, false);
  }

  finish(status, state) {
    this.#roundToken += 1;
    this.#stopRoundNodes(0.045, false);
    if (
      !this.#enabled ||
      this.#context === null ||
      this.#context.state !== "running"
    ) {
      return;
    }

    if (status === "busted") {
      this.#playBust();
    } else if (status === "maxed") {
      this.#playSequence([330, 440, 554, 659], 0.1, "triangle");
    } else {
      const base = clamp(
        220 + Math.log2(finiteOr(state?.multiplier, 1)) * 55,
        220,
        390,
      );
      this.#playSequence([base, base * 1.25, base * 1.5], 0.085, "sine");
    }
  }

  #stopRoundNodes(fadeSeconds, invalidateToken = true) {
    if (invalidateToken) {
      this.#roundToken += 1;
    }
    if (this.#context === null || this.#roundNodes === null) {
      return;
    }

    const nodes = this.#roundNodes;
    this.#roundNodes = null;
    const now = this.#context.currentTime;
    holdAudioParameter(nodes.master.gain, now);
    nodes.master.gain.exponentialRampToValueAtTime(
      0.0001,
      now + fadeSeconds,
    );
    nodes.drone.stop(now + fadeSeconds + 0.02);
    nodes.overtone.stop(now + fadeSeconds + 0.02);
    nodes.pulse.stop(now + fadeSeconds + 0.02);
  }

  #playSequence(frequencies, stepSeconds, type) {
    const context = this.#context;
    if (context === null) {
      return;
    }
    const start = context.currentTime + 0.025;

    frequencies.forEach((frequency, index) => {
      const noteStart = start + index * stepSeconds;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.055, noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        noteStart + stepSeconds * 1.8,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + stepSeconds * 1.9);
    });
  }

  #playBust() {
    const context = this.#context;
    if (context === null) {
      return;
    }
    const now = context.currentTime;

    const drop = context.createOscillator();
    drop.type = "sawtooth";
    drop.frequency.setValueAtTime(120, now);
    drop.frequency.exponentialRampToValueAtTime(34, now + 0.32);
    const dropGain = context.createGain();
    dropGain.gain.setValueAtTime(0.075, now);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    drop.connect(dropGain);
    dropGain.connect(context.destination);
    drop.start(now);
    drop.stop(now + 0.35);

    const length = Math.floor(context.sampleRate * 0.22);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(780, now);
    noiseFilter.Q.setValueAtTime(0.7, now);
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.04, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(context.destination);
    noise.start(now);
  }
}
