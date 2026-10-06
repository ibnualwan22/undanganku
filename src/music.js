// A gentle original arpeggio, synthesized locally for the demo template.
export function createMusic(onStateChange = () => {}) {
  let context, master, timer, playing = false, wanted = false, step = 0, nextNote = 0;
  const chords = [[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67]];
  function note(midi, when, volume) {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (const [harmonic, level] of [[1,1],[2,0.17],[3,0.05]]) {
      const osc = context.createOscillator(); const envelope = context.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency * harmonic;
      envelope.gain.setValueAtTime(0, when);
      envelope.gain.linearRampToValueAtTime(volume * level, when + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + 2.8);
      osc.connect(envelope); envelope.connect(master); osc.start(when); osc.stop(when + 3);
      osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
    }
  }
  function schedule() {
    while (nextNote < context.currentTime + 0.3) {
      const chord = chords[Math.floor(step / 8) % chords.length];
      note(chord[[0,1,2,3,2,1,2,1][step % 8]], nextNote, 0.14);
      if (step % 8 === 0) note(chord[0] - 12, nextNote, 0.1);
      nextNote += 0.48; step++;
    }
  }
  function syncState() {
    const running = wanted && context.state === 'running';
    if (running && !playing) {
      nextNote = context.currentTime + 0.05; schedule(); timer = setInterval(schedule, 100);
    } else if (!running) clearInterval(timer);
    playing = running;
    onStateChange(playing);
  }
  return { async start() {
    wanted = true;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio unavailable');
      context = new AudioContext(); master = context.createGain(); master.gain.value = 0.4; master.connect(context.destination);
      context.addEventListener('statechange', syncState);
    }
    // Unlike media.play(), resume() may stay pending when autoplay is blocked.
    // Reject this attempt promptly; a real click can resume the same context.
    const resumed = context.resume();
    if (context.state !== 'running' && !navigator.userActivation?.isActive) {
      void resumed.catch(() => {});
      throw new DOMException('Waiting for user interaction', 'NotAllowedError');
    }
    await resumed; syncState();
  }, pause() {
    wanted = false; clearInterval(timer); playing = false;
    void context?.suspend().catch(() => {});
    onStateChange(false);
  } };
}
