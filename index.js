import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import { playbackService } from './src/playbackService';
import App from './src/App';

TrackPlayer.registerPlaybackService(() => playbackService);

registerRootComponent(App);
