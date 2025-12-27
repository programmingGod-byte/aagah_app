import React, { useEffect } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { LocationProvider } from './src/context/LocationContext';
import { UserProvider } from './src/context/UserContext';
import AppNavigator, { navigationRef } from './src/navigation';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

import SystemSetting from 'react-native-system-setting';
import { NativeModules } from 'react-native';

const { TorchModule } = NativeModules;
import alarmService from './src/services/alarmService';

// ... other imports ...

const App = () => {

    // Central helper to stop alarm and torch (wrapper)
    const stopEverything = () => {
        alarmService.stopAlarm();
    };

    useEffect(() => {
        // ... permission logic ...

        // Setup Channel
        // ... same setupNotificationChannel ...
        const setupNotificationChannel = async () => {
            await notifee.createChannel({
                id: 'flood_alerts',
                name: 'Flood Emergency Alerts',
                importance: AndroidImportance.HIGH,
                sound: 'default',
                vibration: true,
                vibrationPattern: [300, 500],
            });
        };
        setupNotificationChannel();

        return () => {
            stopEverything();
        };
    }, []);


    // Handle Cold Start (Notifee & FCM)
    useEffect(() => {
        const bootstrap = async () => {
            // Notifee
            const initialNotification = await notifee.getInitialNotification();
            if (initialNotification) {
                console.log('App opened from notification (Notifee)', initialNotification);
                stopEverything();
                setTimeout(() => {
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('Alerts');
                    }
                }, 1000);
            }

            // FCM
            const fcmInitial = await messaging().getInitialNotification();
            if (fcmInitial) {
                console.log('App opened from notification (FCM)', fcmInitial);
                stopEverything();
                setTimeout(() => {
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('Alerts');
                    }
                }, 1000);
            }
        };
        bootstrap();
    }, []);

    // Listen for notification clicks (Background -> Foreground)
    useEffect(() => {
        // FCM (Background)
        const unsubscribeFCM = messaging().onNotificationOpenedApp(remoteMessage => {
            console.log('App opened from background (FCM):', remoteMessage);
            stopEverything();
            if (navigationRef.isReady()) {
                navigationRef.navigate('Alerts');
            }
        });

        // Notifee (Foreground & Background Resumed)
        const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
            if (type === EventType.PRESS) {
                console.log('Notification clicked, stopping alarm (Notifee)');
                stopEverything();
                // Navigate to Alerts screen
                if (navigationRef.isReady()) {
                    navigationRef.navigate('Alerts');
                }
            }
        });

        return () => {
            unsubscribeFCM();
            unsubscribeNotifee();
        };
    }, []);

    useEffect(() => {
        // ... permissions ...
        const requestUserPermission = async () => {
            // ... existing permission code ...
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            }
            await messaging().requestPermission();
        };
        requestUserPermission();

        const getFCMToken = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const token = await messaging().getToken();
                    console.log("Admin Device Token:", token);
                    return token;
                } catch (error) {
                    console.warn(`Attempt ${i + 1} failed to get FCM token in App.js:`, error.message);
                    if (i === retries - 1) {
                        if (error.message && error.message.includes('SERVICE_NOT_AVAILABLE')) {
                            console.warn('App.js: Google Play Services unavailable or network issue. FCM Token sync skipped temporarily.');
                        } else {
                            console.log(error);
                        }
                    } else {
                        // Wait 2 seconds before retrying
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        };
        getFCMToken();

        // 3. Listen for Foreground Messages
        const unsubscribe = messaging().onMessage(async remoteMessage => {
            // Stop any existing alarm first
            stopEverything();

            // Use the Service!
            await alarmService.playAlarm();

            // Show Alert with Stop button
            Alert.alert(
                remoteMessage.notification?.title || 'River Alert',
                remoteMessage.notification?.body,
                [
                    {
                        text: 'STOP ALARM',
                        onPress: stopEverything,
                        style: 'cancel',
                    },
                ],
                { cancelable: false }
            );

            // Show system notification
            await notifee.displayNotification({
                title: remoteMessage.notification?.title || 'River Alert',
                body: remoteMessage.notification?.body,
                android: {
                    channelId: 'flood_alerts',
                    importance: AndroidImportance.HIGH,
                    vibrationPattern: [300, 500],
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        });

        return unsubscribe;
    }, []);

    // ...
    // ... code continues with return ...


    return (
        <UserProvider>
            <LocationProvider>
                <AppNavigator />
            </LocationProvider>
        </UserProvider>
    );
};

export default App;