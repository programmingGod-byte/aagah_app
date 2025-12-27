import React, { use, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, FlatList, Alert, TextInput, ActivityIndicator, Linking, Image, Dimensions } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors, spacing } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useLocation } from '../context/LocationContext';
import { requestLocationPermission } from '../services/permissions';
import Geolocation from 'react-native-geolocation-service';
import { useTheme } from '../context/ThemeContext';
import { fetchDevices, addDevice, getDeviceInfo } from '../services/deviceService';
import { useUser } from '../context/UserContext';

const DashboardScreen = ({ navigation }) => {
    const { location, setLocation } = useLocation();
    const { user, logout } = useUser();
    // console.log(user);
    const { theme, isDarkMode } = useTheme();
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [customMachineId, setCustomMachineId] = useState('');
    const [machines, setMachines] = useState([]);
    const [myDevices, setMyDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(true);
    const [deviceInfo, setDeviceInfo] = useState(null);

    useEffect(() => {
        const fetchLocation = async () => {
            setIsLocating(true);
            const hasPermission = await requestLocationPermission();
            if (hasPermission) {
                Geolocation.getCurrentPosition(
                    (position) => {
                        console.log(position);
                        setLocation(position.coords.latitude, position.coords.longitude);
                        setIsLocating(false);
                    },
                    (error) => {
                        console.log(error.code, error.message);
                        setIsLocating(false);
                        Alert.alert('Location Error', 'Failed to get current location.');
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                );
            } else {
                setIsLocating(false);
                Alert.alert('Permission Denied', 'Location permission is required.');
            }
        };
        fetchLocation();
    }, []);

    useEffect(() => {
        const loadDevices = async () => {
            console.log('Dashboard: loadDevices triggered', { location, user: user ? user.email : 'null' });
            if (location && user?.email) {
                console.log('Dashboard: Fetching devices for:', user.email);
                setIsLoading(true);
                try {
                    const data = await fetchDevices(location.latitude, location.longitude, user.email);
                    console.log('Dashboard: fetchDevices success', data);
                    if (data.success) {
                        const uniqueDevices = new Set([
                            ...(data.nearby_device_ids || []),
                            ...(data.your_device_ids_nearby || [])
                        ]);
                        const allDevices = Array.from(uniqueDevices);
                        setMachines(allDevices);
                        setMyDevices(data.your_device_ids_nearby || []);

                        // Auto-select first device available (prioritize 'yours', then 'nearby')
                        if (!selectedMachine) {
                            if (data.your_device_ids_nearby?.length > 0) {
                                setSelectedMachine({ id: data.your_device_ids_nearby[0], name: 'Connected Machine' });
                            } else if (data.nearby_device_ids?.length > 0) {
                                setSelectedMachine({ id: data.nearby_device_ids[0], name: 'Connected Machine' });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch devices', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                console.log('Dashboard: Waiting for location or email...');
            }
        };
        loadDevices();
    }, [location, user]);

    useEffect(() => {
        const fetchInfo = async () => {
            if (selectedMachine?.id) {
                try {
                    const info = await getDeviceInfo(selectedMachine.id);
                    setDeviceInfo(info);
                } catch (err) {
                    console.log('Error fetching device info', err);
                }
            }
        };
        fetchInfo();
    }, [selectedMachine]);

    // ... existing handleAddMachine
    const handleAddMachine = async (machineId) => {
        console.log('Dashboard: handleAddMachine called with', machineId);
        if (!location || !user?.email) {
            console.log('Dashboard: handleAddMachine missing location/user', { location, user: user ? user.email : 'null' });
            Alert.alert('Error', 'Location or user info missing');
            return;
        }

        // Prevent adding duplicate devices
        if (myDevices.includes(machineId)) {
            Alert.alert('Device Already Added', `Device ${machineId} is already in your list.`);
            return;
        }

        try {
            console.log('Dashboard: calling addDevice API');
            const response = await addDevice(location.latitude, location.longitude, user.email, machineId);
            console.log('Dashboard: addDevice result', response);
            if (response.success || response.message) {
                setSelectedMachine({ id: machineId, name: 'Connected Machine' });
                setModalVisible(false);
                setCustomMachineId('');
                Alert.alert('Success', `Connected to ${machineId}`);
                // Refresh list to show new device immediately
                setMyDevices(prev => [...prev, machineId]);
            }
        } catch (error) {
            console.error('Dashboard: addDevice error', error);
            Alert.alert('Error', 'Failed to add device');
        }
    };

    const handleAddCustomMachine = () => {
        if (!customMachineId.trim()) {
            Alert.alert('Error', 'Please enter a Machine ID');
            return;
        }
        handleAddMachine(customMachineId);
    };

    return (
        <ScreenWrapper style={{ backgroundColor: theme.background }}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDarkMode ? '#1B5E20' : colors.primary }]}>
                {/* ... existing header content ... */}
                <View style={styles.headerLeft}>
                    <View style={styles.logoPlaceholder}>
                        <FontAwesome name="sun-o" size={24} color="#FFA500" />
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>AAGAH</Text>
                </View>

                <View style={styles.offlineToggle}>
                    <Text style={styles.offlineText}>OFFLINE</Text>
                </View>

                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>A</Text>
                    <View style={styles.statusDot} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Machine Management */}
                <View style={[styles.card, { backgroundColor: theme.card }, theme.shadow]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Machine Management</Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Icon name="add-circle" size={32} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {myDevices.length > 0 ? (
                        <View>
                            <Text style={{ color: theme.textSecondary, marginBottom: spacing.s, fontSize: 12 }}>YOUR DEVICES</Text>
                            {myDevices.map((deviceId) => (
                                <TouchableOpacity
                                    key={deviceId}
                                    style={[styles.machineItem, {
                                        borderBottomColor: theme.border,
                                        borderBottomWidth: 1,
                                        backgroundColor: theme.card
                                    }]}
                                    onPress={() => {
                                        setSelectedMachine({ id: deviceId, name: 'Connected Machine' });
                                        navigation.navigate('View Data', { deviceId: deviceId });
                                    }}
                                >
                                    <View>
                                        <Text style={[styles.machineName, { color: theme.text }]}>{deviceId}</Text>
                                        <Text style={[styles.machineId, { color: theme.textSecondary }]}>ID: {deviceId}</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: isDarkMode ? '#222' : '#FAFAFA' }]}>
                            {isLocating ? (
                                <>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>Acquiring Location...</Text>
                                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Please wait while we respond to your location</Text>
                                </>
                            ) : (
                                <>
                                    <Icon name="memory" size={40} color={theme.textSecondary} />
                                    <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                                        {selectedMachine ? "Machine Online" : "No machines added yet"}
                                    </Text>
                                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                                        {selectedMachine ? "Data receiving..." : "Click + to add your first machine"}
                                    </Text>
                                </>
                            )}
                        </View>
                    )}
                </View>

                {/* Emergency Dial Section */}
                <TouchableOpacity style={styles.emergencyContainer} onPress={() => Linking.openURL('tel:112')}>
                    <Text style={styles.emergencyText}>Dial 112 for Emergency</Text>
                    <View style={styles.phoneIconCircle}>
                        <Icon name="call" size={24} color="white" />
                    </View>
                </TouchableOpacity>


                <View style={styles.imageContainer}>
                    <Image
                        source={require('../assets/dos_donts.png')}
                        style={styles.infoImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Status Cards */}
                {/* ... existing status cards ... */}
                {/* Engagement Banner */}
                <View style={[styles.card, { backgroundColor: isDarkMode ? '#1B5E20' : colors.primary, alignItems: 'center', padding: spacing.l }]}>
                    <Icon name="verified-user" size={48} color="white" style={{ marginBottom: spacing.s }} />
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                        systems online
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                        Real-time monitoring active. Detecting potential risks.
                    </Text>
                </View>

            </ScrollView>

            {/* Add Machine Modal */}
            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.card }, theme.shadow]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Add Machine</Text>
                        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Select a device ID to connect</Text>

                        <FlatList
                            data={machines}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.machineItem, { borderBottomColor: theme.border }]}
                                    onPress={() => handleAddMachine(item)}
                                >
                                    <View>
                                        <Text style={[styles.machineName, { color: theme.text }]}>{item}</Text>
                                        <Text style={[styles.machineId, { color: theme.textSecondary }]}>ID: {item}</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={{ padding: 20, textAlign: 'center', color: theme.textSecondary }}>
                                    {isLoading ? "Searching nearby devices..." : "No devices found nearby."}
                                </Text>
                            }
                            style={styles.list}
                        />

                        {/* Custom Input Section */}
                        <View style={styles.customInputContainer}>
                            <Text style={[styles.orText, { color: theme.textSecondary }]}>OR ADD CUSTOM ID</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5', borderColor: theme.border }]}>
                                <TextInput
                                    style={[styles.textInput, { color: theme.text }]}
                                    placeholder="Enter Device ID"
                                    placeholderTextColor={theme.textSecondary}
                                    value={customMachineId}
                                    onChangeText={setCustomMachineId}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: colors.primary }]}
                                onPress={handleAddCustomMachine}
                            >
                                <Text style={styles.addButtonText}>Add Device</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScreenWrapper >
    );
};

const styles = StyleSheet.create({
    // ... existing styles ...
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.s,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    offlineToggle: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 12,
    },
    offlineText: {
        color: colors.white,
        fontSize: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 18,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4CAF50',
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderWidth: 1,
        borderColor: colors.white,
    },
    content: {
        padding: spacing.m,
    },
    card: {
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.m,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    machineSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.m,
    },
    machineText: {
        marginLeft: spacing.s,
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.l,
        borderRadius: 8,
    },
    emptyTitle: {
        fontSize: 16,
        marginTop: spacing.s,
    },
    emptySubtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.m,
    },
    statusCard: {
        width: '48%',
        padding: spacing.m,
        borderRadius: 12,
        minHeight: 120,
        justifyContent: 'space-between',
    },
    bgGreen: {
        backgroundColor: '#43A047',
    },
    bgLightGreen: {
        backgroundColor: '#66BB6A',
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusLabelLight: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    statusValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginVertical: spacing.s,
    },
    statusValueLight: {
        fontSize: 28,
        fontWeight: 'bold',
        marginVertical: spacing.s,
        color: 'white',
    },
    statusSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    statusSubLight: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
    // New Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.l,
    },
    modalContent: {
        width: '100%',
        borderRadius: 16,
        padding: spacing.l,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: spacing.s,
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: spacing.m,
    },
    list: {
        flexGrow: 0,
        marginBottom: spacing.m,
    },
    machineItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.m,
        borderBottomWidth: 1,
    },
    machineName: {
        fontSize: 16,
        fontWeight: '600',
    },
    machineId: {
        fontSize: 12,
        marginTop: 2,
    },
    customInputContainer: {
        marginTop: spacing.s,
        paddingTop: spacing.m,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    orText: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: spacing.m,
        opacity: 0.6,
    },
    inputWrapper: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: spacing.m,
        marginBottom: spacing.m,
    },
    textInput: {
        height: 48,
        fontSize: 16,
    },
    addButton: {
        paddingVertical: spacing.m,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    closeButton: {
        alignItems: 'center',
        padding: spacing.m,
        marginTop: spacing.s,
    },
    closeButtonText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    emergencyContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.m,
        marginBottom: spacing.m,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    emergencyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    phoneIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#D32F2F', // Red color
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: spacing.s,
        marginBottom: spacing.m,
        alignItems: 'center',
        elevation: 2,
    },
    infoImage: {
        width: '100%',
        height: 400, // Adjust height as needed
    }
});

export default DashboardScreen;
