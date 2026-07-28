import { DEFAULT_CONFIG, HoldRound } from "./engine.js";

const STORAGE_KEY = "hold-the-line-virtual-credits-v1";
const UINT32_RANGE = 4_294_967_296;
const root = document.documentElement;

const elements = {
  credits: document.querySelector("#credits"),
  elapsed: document.querySelector("#elapsed"),
  gameMessage: document.querySelector("#game-message"),
  history: document.querySelector("#history"),
  holdButton: document.querySelector("#hold-button"),
  holdHint: document.querySelector("#hold-hint"),
  holdLabel: document.querySelector("#hold-label"),
  multiplier: document.querySelector("#multiplier"),
  potentialReturn: document.querySelector("#potential-return"),
  reactorPanel: document.querySelector("#reactor-panel"),
  resetWallet: document.querySelector("#reset-wallet"),
  returnReadout: document.querySelector("#return-readout"),
  roundCount: document.querySelector("#round-count"),
  roundState: document.querySelector("#round-state"),
  signalLabel: document.querySelector("#signal-label"),
  signalTrack: document.querySelector("#signal-track"),
  stake: document.querySelector("#stake"),
  stakeOutput: document.querySelector("#stake-output"),
  stakePresets: [...document.querySelectorAll("[data-stake]")],
  tickRisk: document.querySelector("#tick-risk"),
};

let credits = loadCredits();
let selectedStake = Number(elements.stake.value);
let activeRound = null;
let activeState = null;
let animationFrame = 0;
let lastFrameTime = 0;
let tickAccumulator = 0;
let spaceHeld = false;
let history = [];
let totalRounds = 0;

function loadCredits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const stored = Number(raw);
      if (Number.isFinite(stored) && stored >= 0) {
        return stored;
      }
    }
  } catch {
    // Storage can be unavailable in privacy modes; the session still works.
  }
  return DEFAULT_CONFIG.startingCredits;
}

function saveCredits() {
  try {
    localStorage.setItem(STORAGE_KEY, String(credits));
  } catch {
    // Persistence is optional; gameplay remains available for this page load.
  }
}

function formatCredits(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatElapsed(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1).padStart(4, "0")}s`;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getRoundEntropy() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure browser randomness is unavailable.");
  }
  const words = new Uint32Array(2);
  globalThis.crypto.getRandomValues(words);
  return {
    seed: words[0],
    bustUniform: (words[1] + 0.5) / UINT32_RANGE,
  };
}

function warningBand(signal) {
  if (signal < 0.28) {
    return "Clear";
  }
  if (signal < 0.52) {
    return "Active";
  }
  if (signal < 0.74) {
    return "Unstable";
  }
  return "Critical";
}

function updateStake() {
  const affordableMaximum = Math.floor(
    Math.min(DEFAULT_CONFIG.maxStake, credits) / 5,
  ) * 5;
  const sliderMaximum = Math.max(DEFAULT_CONFIG.minStake, affordableMaximum);
  elements.stake.max = String(sliderMaximum);
  selectedStake = clamp(
    Number(elements.stake.value),
    DEFAULT_CONFIG.minStake,
    sliderMaximum,
  );
  elements.stake.value = String(selectedStake);

  const stakeProgress = sliderMaximum === DEFAULT_CONFIG.minStake
    ? 0
    : (selectedStake - DEFAULT_CONFIG.minStake) /
      (sliderMaximum - DEFAULT_CONFIG.minStake);
  elements.stake.style.setProperty(
    "--stake-progress",
    `${stakeProgress * 100}%`,
  );
  elements.stakeOutput.textContent = `${selectedStake} CR`;

  for (const button of elements.stakePresets) {
    const amount = Number(button.dataset.stake);
    button.classList.toggle("selected", amount === selectedStake);
    button.disabled = activeRound !== null || amount > credits;
  }

  if (activeRound === null) {
    elements.potentialReturn.textContent = `${formatCredits(selectedStake)} CR`;
    elements.returnReadout.textContent = `${
      formatCredits(selectedStake)
    } CR on release`;
  }
}

function setControlsLocked(locked) {
  elements.stake.disabled = locked;
  elements.resetWallet.disabled = locked;
  for (const button of elements.stakePresets) {
    button.disabled = locked || Number(button.dataset.stake) > credits;
  }
}

function setMessage(message, tone = "") {
  elements.gameMessage.textContent = message;
  elements.gameMessage.className = `game-message${tone ? ` ${tone}` : ""}`;
}

function renderState(state) {
  const signal = state?.warningSignal ?? 0.06;
  const heat = state?.heat ?? 0.06;
  const multiplier = state?.multiplier ?? 1;
  const risk = state?.tickHazardProbability ?? 0;
  const elapsed = state?.elapsedMs ?? 0;
  const returnValue = (state?.stake ?? selectedStake) * multiplier;
  const signalText = warningBand(signal);

  root.style.setProperty("--heat", heat.toFixed(4));
  root.style.setProperty("--signal", signal.toFixed(4));
  root.style.setProperty(
    "--multiplier-energy",
    clamp(
      (multiplier - 1) / (DEFAULT_CONFIG.maxMultiplier - 1),
      0,
      1,
    ).toFixed(4),
  );

  elements.multiplier.innerHTML = `${multiplier.toFixed(2)}<span>×</span>`;
  elements.elapsed.textContent = formatElapsed(elapsed);
  elements.tickRisk.textContent = `${(risk * 100).toFixed(2)}%`;
  elements.potentialReturn.textContent = `${formatCredits(returnValue)} CR`;
  elements.returnReadout.textContent = `${
    formatCredits(returnValue)
  } CR on release`;
  elements.signalLabel.textContent = signalText;
  elements.signalTrack.setAttribute(
    "aria-valuenow",
    String(Math.round(signal * 100)),
  );
  elements.signalTrack.setAttribute("aria-valuetext", signalText);
}

function updateWallet() {
  elements.credits.textContent = formatCredits(credits);
  updateStake();
}

function setRoundState(state, label) {
  elements.roundState.dataset.state = state;
  elements.roundState.textContent = label;
}

function beginHold() {
  if (activeRound !== null) {
    return;
  }
  if (credits < DEFAULT_CONFIG.minStake || selectedStake > credits) {
    setMessage(
      "Not enough virtual credits. Reset the wallet to continue.",
      "loss",
    );
    return;
  }

  let entropy;
  try {
    entropy = getRoundEntropy();
  } catch (error) {
    setMessage(error.message, "loss");
    return;
  }

  credits = Math.round((credits - selectedStake) * 100) / 100;
  saveCredits();
  activeRound = new HoldRound({
    stake: selectedStake,
    seed: entropy.seed,
    bustUniform: entropy.bustUniform,
  });
  activeState = activeRound.snapshot();

  setControlsLocked(true);
  elements.holdButton.classList.remove("busted");
  elements.holdButton.classList.add("holding");
  elements.holdLabel.textContent = "Holding";
  elements.holdHint.textContent = "Release now to bank";
  setRoundState("active", "Circuit live");
  setMessage("Read the pressure. Release whenever the return is enough.");
  updateWallet();
  renderState(activeState);

  tickAccumulator = 0;
  lastFrameTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(advanceRound);
}

function advanceRound(frameTime) {
  if (activeRound === null || activeState?.status !== "active") {
    return;
  }

  const frameDelta = clamp(frameTime - lastFrameTime, 0, 240);
  lastFrameTime = frameTime;
  tickAccumulator += frameDelta;

  while (
    tickAccumulator >= DEFAULT_CONFIG.tickMs &&
    activeState.status === "active"
  ) {
    activeState = activeRound.step();
    tickAccumulator -= DEFAULT_CONFIG.tickMs;
  }

  renderState(activeState);
  if (activeState.status === "active") {
    animationFrame = requestAnimationFrame(advanceRound);
  } else {
    finishRound(activeState);
  }
}

function releaseHold(reason = "input") {
  if (activeRound === null || activeState?.status !== "active") {
    return;
  }
  activeState = activeRound.cashOut();
  finishRound(activeState, reason);
}

function finishRound(state, reason = "result") {
  if (activeRound === null) {
    return;
  }

  cancelAnimationFrame(animationFrame);
  credits = Math.round((credits + state.payout) * 100) / 100;
  saveCredits();
  totalRounds += 1;
  history.unshift(state);
  history = history.slice(0, 5);

  activeRound = null;
  activeState = state;
  elements.holdButton.classList.remove("holding", "busted");
  elements.holdLabel.textContent = "Hold again";
  elements.holdHint.textContent = "Release to bank";
  setControlsLocked(false);

  if (state.status === "busted") {
    elements.holdButton.classList.add("busted");
    setRoundState("busted", "Circuit broken");
    setMessage(
      `Busted at ${state.multiplier.toFixed(2)}×. The ${
        formatCredits(state.stake)
      } CR stake was lost.`,
      "loss",
    );
  } else if (state.status === "maxed") {
    setRoundState("maxed", "Maximum banked");
    setMessage(
      `Hard cap reached. ${
        formatCredits(state.payout)
      } CR was banked automatically.`,
      "win",
    );
  } else {
    setRoundState("cashed", "Return banked");
    const visibilityNote = reason === "visibility"
      ? " The run was banked when the page lost focus."
      : "";
    setMessage(
      `Banked ${formatCredits(state.payout)} CR at ${
        state.multiplier.toFixed(2)
      }×.${visibilityNote}`,
      "win",
    );
  }

  renderState(state);
  updateWallet();
  renderHistory();
}

function renderHistory() {
  elements.roundCount.textContent = `${totalRounds} ${
    totalRounds === 1 ? "round" : "rounds"
  }`;
  elements.history.replaceChildren();

  if (history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-history";
    empty.textContent = "Your last five outcomes will appear here.";
    elements.history.append(empty);
    return;
  }

  for (const state of history) {
    const item = document.createElement("li");
    const won = state.status !== "busted";
    const delta = state.payout - state.stake;

    const result = document.createElement("span");
    result.className = `history-result${won ? "" : " loss"}`;
    result.textContent = won ? "✓" : "×";

    const main = document.createElement("span");
    main.className = "history-main";
    const multiplier = document.createElement("strong");
    multiplier.textContent = `${state.multiplier.toFixed(2)}×`;
    const stake = document.createElement("small");
    stake.textContent = `${formatCredits(state.stake)} CR stake`;
    main.append(multiplier, stake);

    const change = document.createElement("span");
    change.className = `history-delta${delta < 0 ? " loss" : ""}`;
    change.textContent = `${delta >= 0 ? "+" : ""}${formatCredits(delta)}`;

    item.append(result, main, change);
    elements.history.append(item);
  }
}

elements.stake.addEventListener("input", updateStake);

for (const button of elements.stakePresets) {
  button.addEventListener("click", () => {
    elements.stake.value = button.dataset.stake;
    updateStake();
  });
}

elements.resetWallet.addEventListener("click", () => {
  if (activeRound !== null) {
    return;
  }
  credits = DEFAULT_CONFIG.startingCredits;
  history = [];
  totalRounds = 0;
  saveCredits();
  setRoundState("idle", "System ready");
  setMessage("Wallet reset. Choose a stake, then hold the control.");
  renderState(null);
  renderHistory();
  updateWallet();
});

elements.holdButton.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  elements.holdButton.setPointerCapture(event.pointerId);
  beginHold();
});

elements.holdButton.addEventListener("pointerup", (event) => {
  event.preventDefault();
  releaseHold();
});

elements.holdButton.addEventListener("pointercancel", () => {
  releaseHold();
});

document.addEventListener("keydown", (event) => {
  if (
    event.code !== "Space" ||
    event.repeat ||
    event.target instanceof HTMLInputElement
  ) {
    return;
  }
  event.preventDefault();
  spaceHeld = true;
  beginHold();
});

document.addEventListener("keyup", (event) => {
  if (event.code !== "Space" || !spaceHeld) {
    return;
  }
  event.preventDefault();
  spaceHeld = false;
  releaseHold();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    releaseHold("visibility");
  }
});

window.addEventListener("pagehide", () => {
  releaseHold("visibility");
});

updateWallet();
renderState(null);
renderHistory();
