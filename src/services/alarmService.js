
import { NativeModules } from 'react-native';
import SystemSetting from 'react-native-system-setting';

// We added playAlarm/stopAlarm to TorchModule
const { TorchModule } = NativeModules;

const playAlarm = async () => {
    // 1. Maximize Volume
    try {
        await SystemSetting.setVolume(1, { type: 'music' });
        await SystemSetting.setVolume(1, { type: 'notification' });
    } catch (e) {
        console.log('Volume error:', e);
    }

    // 2. Play Alarm (Native handles Sound + Torch)
    if (TorchModule) {
        // Native Module will handle the looping and torch
        TorchModule.playAlarm();
    } else {
        console.warn('TorchModule not linked');
    }
};

const stopAlarm = () => {
    if (TorchModule) {
        TorchModule.stopAlarm();
    }
};

export default {
    playAlarm,
    stopAlarm
};
