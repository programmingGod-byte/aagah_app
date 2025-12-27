import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme';
import messaging from '@react-native-firebase/messaging';
import { registerDeviceToken } from '../services/deviceService';

// Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AlertsScreen from '../screens/AlertsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ViewDataScreen from '../screens/ViewDataScreen';
import AddOtherScreen from '../screens/AddOtherScreen';
import AdminManagementScreen from '../screens/AdminManagementScreen';
import CustomDrawerContent from './CustomDrawerContent';
import { DEVICE_TYPE, SUPER_ADMIN_EMAIL } from '@env';

// Contexts
import { ThemeProvider } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useLocation } from '../context/LocationContext';
import { ActivityIndicator, View } from 'react-native';

export const navigationRef = createNavigationContainerRef();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

import WeatherScreen from '../screens/WeatherScreen';

// ... other imports ...

// ... inside MainTabNavigator ...
const MainTabNavigator = () => {
    const { user } = useUser();

    // Check if current user is super admin
    const isSuperAdmin = DEVICE_TYPE === 'admin' && user?.email === SUPER_ADMIN_EMAIL;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName;
                    if (route.name === 'Dashboard') iconName = 'dashboard';
                    else if (route.name === 'Weather') iconName = 'cloud';
                    else if (route.name === 'Alerts') iconName = 'notifications';
                    else if (route.name === 'Settings') iconName = 'settings';
                    else if (route.name === 'Admin') iconName = 'admin-panel-settings';
                    return <Icon name={iconName} size={size} color={color} />;
                },
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Weather" component={WeatherScreen} />
            {isSuperAdmin && (
                <Tab.Screen name="Admin" component={AdminManagementScreen} />
            )}
            <Tab.Screen name="Alerts" component={AlertsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

const DrawerNavigator = () => {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveBackgroundColor: '#f4f4f4',
                drawerActiveTintColor: colors.primary,
                drawerInactiveTintColor: '#333',
                drawerLabelStyle: {
                    marginLeft: -10,
                    fontSize: 15,
                },
            }}
        >
            <Drawer.Screen
                name="Home"
                component={MainTabNavigator}
                options={{
                    drawerIcon: ({ color }) => (
                        <MaterialCommunityIcons name="home-outline" size={22} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="View Data"
                component={ViewDataScreen}
                options={{
                    drawerIcon: ({ color }) => (
                        <MaterialCommunityIcons name="database" size={22} color={color} />
                    ),
                }}
            />

        </Drawer.Navigator>
    );
};

const AppNavigator = () => {
    const { user, isLoading } = useUser();
    const { location } = useLocation();

    React.useEffect(() => {
        const getFCMToken = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await messaging().getToken();
                } catch (error) {
                    console.warn(`Attempt ${i + 1} failed to get FCM token:`, error.message);
                    if (i === retries - 1) throw error;
                    // Wait 2 seconds before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        };

        const registerToken = async () => {
            if (user && user.email && location) {
                try {
                    const token = await getFCMToken();
                    await registerDeviceToken(
                        token,
                        user.email,
                        location?.latitude,
                        location?.longitude
                    );
                } catch (error) {
                    if (error.message && error.message.includes('SERVICE_NOT_AVAILABLE')) {
                        console.warn('Google Play Services unavailable or network issue. FCM Token sync skipped temporarily.');
                    } else {
                        console.error('Failed to sync device token after retries:', error);
                    }
                }
            }
        };
        registerToken();
    }, [user, location]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ThemeProvider>
            <NavigationContainer ref={navigationRef}>
                {user ? (
                    <DrawerNavigator />
                ) : (
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="Welcome" component={WelcomeScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                    </Stack.Navigator>
                )}
            </NavigationContainer>
        </ThemeProvider>
    );
};

export default AppNavigator;
