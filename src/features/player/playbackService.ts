import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Headless playback service. Android keeps this alive while audio plays, so
 * lock-screen, notification, Bluetooth and headphone controls keep working when
 * the UI is backgrounded or the activity has been destroyed.
 */
export async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void TrackPlayer.pause();
    void TrackPlayer.seekTo(0);
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void TrackPlayer.skipToNext().catch(() => undefined);
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void TrackPlayer.getProgress()
      .then(async ({ position }) => {
        if (position > 3) {
          await TrackPlayer.seekTo(0);
        } else {
          await TrackPlayer.skipToPrevious();
        }
      })
      .catch(() => undefined);
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    void TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, (event) => {
    void TrackPlayer.getProgress().then(({ position }) =>
      TrackPlayer.seekTo(position + event.interval),
    );
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, (event) => {
    void TrackPlayer.getProgress().then(({ position }) =>
      TrackPlayer.seekTo(Math.max(0, position - event.interval)),
    );
  });
}
