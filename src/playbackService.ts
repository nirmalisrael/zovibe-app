/**
 * RNTP requires this to be registered from index.js (Android headless task / iOS bootstrap).
 * Remote media events are handled in `PlaybackRemoteControls` in the main React tree **after**
 * `setupPlayer()`, so controls reliably reach the same JS context as your UI and Zustand.
 */
export async function playbackService(): Promise<void> {
  // Intentionally empty — see PlaybackRemoteControls.tsx
}
