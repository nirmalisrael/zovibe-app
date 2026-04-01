import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { usePlayerStore } from '../../store/playerStore';
import { skipToNextInQueue, skipToPreviousInQueue } from '../../player/queueSkip';

const DEDUP_MS = 500;

/**
 * Lock screen / notification / BT / Control Center.
 * Some RN + TurboModule setups deliver `remote-play` / `remote-pause` via
 * NativeEventEmitter but not `remote-next` / `remote-previous`; we also listen
 * on DeviceEventEmitter (same bus as emitDeviceEvent on Android).
 */
export function PlaybackRemoteControls() {
  useEffect(() => {
    const setPlaying = (v: boolean) => usePlayerStore.getState().setIsPlaying(v);

    let lastNext = 0;
    let lastPrev = 0;

    const onRemoteNext = () => {
      debugger;
      const t = Date.now();
      if (t - lastNext < DEDUP_MS) return;
      lastNext = t;
      void skipToNextInQueue();
    };

    const onRemotePrevious = () => {
      const t = Date.now();
      if (t - lastPrev < DEDUP_MS) return;
      lastPrev = t;
      void skipToPreviousInQueue();
    };

    const onRemoteSkip = (payload: { index?: number } | null | undefined) => {
      if (payload != null && typeof payload.index === 'number' && !Number.isNaN(payload.index)) {
        void TrackPlayer.skip(payload.index);
        return;
      }
      onRemoteNext();
    };

    const subs: { remove: () => void }[] = [
      TrackPlayer.addEventListener(Event.RemotePlay, () => {
        void TrackPlayer.play().then(() => setPlaying(true));
      }),
      TrackPlayer.addEventListener(Event.RemotePause, () => {
        void TrackPlayer.pause().then(() => setPlaying(false));
      }),
      TrackPlayer.addEventListener(Event.RemotePlayPause, () => {
        void (async () => {
          console.log('RemotePlayPause');
          debugger;
          const s = await TrackPlayer.getPlaybackState();
          if (s.state === State.Playing) {
            await TrackPlayer.pause();
            setPlaying(false);
          } else {
            await TrackPlayer.play();
            setPlaying(true);
          }
        })();
      }),
      TrackPlayer.addEventListener(Event.RemoteNext, onRemoteNext),
      TrackPlayer.addEventListener(Event.RemotePrevious, onRemotePrevious),
      TrackPlayer.addEventListener(Event.RemoteSkip, (e) => onRemoteSkip(e)),
      TrackPlayer.addEventListener(Event.RemoteSeek, (e) => {
        void TrackPlayer.seekTo(e.position);
      }),
      TrackPlayer.addEventListener(Event.RemoteStop, () => {
        void TrackPlayer.reset().then(() => {
          usePlayerStore.getState().setQueue([], 0);
          setPlaying(false);
        });
      }),
    ];

    subs.push(
      DeviceEventEmitter.addListener('remote-next', onRemoteNext),
      DeviceEventEmitter.addListener('remote-previous', onRemotePrevious),
      DeviceEventEmitter.addListener('remote-skip', onRemoteSkip)
    );

    return () => subs.forEach((s) => s.remove());
  }, []);

  return null;
}
