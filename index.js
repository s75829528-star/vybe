/**
 * VYBE's custom entry point.
 *
 * React Native Track Player needs its playback service registered before the
 * Expo Router entry module boots. `require` is intentional here: ES imports are
 * hoisted, which would evaluate the app before the service is registered.
 */
import TrackPlayer from 'react-native-track-player';

import { playbackService } from './src/features/player/playbackService';

TrackPlayer.registerPlaybackService(() => playbackService);

require('expo-router/entry');
