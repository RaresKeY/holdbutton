import { holdAudioParameters } from "../audio.js";

function assert(condition, message = "assertion failed") {
  if (!condition) {
    throw new Error(message);
  }
}

Deno.test("hold audio parameters remain finite at malformed boundaries", () => {
  const parameters = holdAudioParameters({
    heat: Number.POSITIVE_INFINITY,
    warningSignal: -4,
    multiplier: 99,
  });

  for (const value of Object.values(parameters)) {
    assert(Number.isFinite(value));
    assert(value >= 0);
  }
});

Deno.test("higher heat raises pitch, brightness, pulse, and gain", () => {
  const calm = holdAudioParameters({
    heat: 0.1,
    warningSignal: 0.1,
    multiplier: 1.2,
  });
  const critical = holdAudioParameters({
    heat: 0.9,
    warningSignal: 0.9,
    multiplier: 1.2,
  });

  assert(critical.droneFrequency > calm.droneFrequency);
  assert(critical.overtoneFrequency > calm.overtoneFrequency);
  assert(critical.filterFrequency > calm.filterFrequency);
  assert(critical.pulseFrequency > calm.pulseFrequency);
  assert(critical.pulseDepth > calm.pulseDepth);
  assert(critical.masterGain > calm.masterGain);
});

Deno.test("the rising multiplier contributes a smaller pitch lift", () => {
  const start = holdAudioParameters({
    heat: 0.5,
    warningSignal: 0.5,
    multiplier: 1,
  });
  const late = holdAudioParameters({
    heat: 0.5,
    warningSignal: 0.5,
    multiplier: 8,
  });

  assert(late.droneFrequency > start.droneFrequency);
  assert(late.overtoneFrequency > start.overtoneFrequency);
  assert(late.filterFrequency === start.filterFrequency);
});
