import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

import alarmService from './src/services/alarmService';

// This handles notifications when the app is closed or in the background
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    // Start Alarm (Sound + Torch + Volume)
    await alarmService.playAlarm();
    return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);