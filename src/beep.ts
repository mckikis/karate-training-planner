/*
 * Beeps of the timer (Web Audio – no sound files).
 * iPhone plays sound only after a tap, so unlockAudio() is called from the Start button.
 * With the ring/silent switch on silent, iPhone does not play these sounds.
 */

let context: AudioContext | undefined

export function unlockAudio() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    context ??= new AudioCtx()
    if (context.state === 'suspended') context.resume().catch(() => {})
    // A silent tone makes iPhone allow sound for the rest of the session.
    tone(0, 0.01, 0)
  } catch {
    // no sound in this browser
  }
}

function tone(frequency: number, seconds: number, volume = 0.35) {
  if (!context) return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  const now = context.currentTime
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + seconds + 0.02)
}

/** 3, 2, 1 seconds before the end of a part. */
export function shortBeep() {
  tone(880, 0.15)
}

/** A part starts or ends. */
export function longBeep() {
  tone(1320, 1.2)
}

/** "Atoshi baraku" – 15 seconds before the end of the set: two beeps. */
export function atoshiBeep() {
  tone(990, 0.3)
  setTimeout(() => tone(990, 0.3), 380)
}

/** The whole timer has finished. */
export function finishBeep() {
  tone(1320, 0.5)
  setTimeout(() => tone(1320, 0.5), 600)
  setTimeout(() => tone(1760, 1), 1200)
}
