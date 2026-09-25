import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { playbackService } from './src/playbackService';
import App from './src/App';

TrackPlayer.registerPlaybackService(() => playbackService);

AppRegistry.registerComponent('zovibe', () => App);
AppRegistry.registerComponent('main', () => App);
