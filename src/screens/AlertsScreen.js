import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors, spacing } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DatePicker from 'react-native-date-picker';

import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { useUser } from '../context/UserContext';
import { fetchAlerts, resolveAlert, getDeviceInfo, deleteAlert, createAlert, fetchDevices } from '../services/deviceService';
import { TextInput } from 'react-native';

import { DEVICE_TYPE } from '@env';

const AlertsScreen = () => {
    const { theme, isDarkMode } = useTheme();
    const { location } = useLocation();
    const { user } = useUser();

    const [loading, setLoading] = useState(false);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [pastAlerts, setPastAlerts] = useState([]);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(DEVICE_TYPE === 'admin' ? 'active' : 'past'); // 'active' or 'past'

    // Filter State
    const [filterDate, setFilterDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [resolving, setResolving] = useState(false);

    const loadAlerts = useCallback(async () => {
        if (!location) {
            setError("Location not available");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await fetchAlerts(location.latitude, location.longitude);
            if (data && data.alerts) {
                // Process alerts to fix depth values
                const processedAlerts = await Promise.all(data.alerts.map(async (alert) => {
                    // Check for "reported depth of X" pattern
                    const depthMatch = alert.alert_message ? alert.alert_message.match(/reported depth of ([\d.]+) exceeding/i) : null;

                    if (depthMatch) {
                        const reportedDepth = parseFloat(depthMatch[1]);
                        if (!isNaN(reportedDepth) && alert.device_id) {
                            try {
                                const info = await getDeviceInfo(alert.device_id);
                                if (info && info.depth) {
                                    const totalDepth = parseFloat(info.depth);
                                    if (!isNaN(totalDepth)) {
                                        const waterLevel = totalDepth - reportedDepth;
                                        // Update the message with the calculated value
                                        alert.alert_message = `Current water level is ${waterLevel.toFixed(2)}m (Reported Depth: ${reportedDepth}m)`;
                                    }
                                }
                            } catch (e) {
                                console.error(`Failed to fetch info for ${alert.device_id}`, e);
                            }
                        }
                    }
                    return alert;
                }));

                // Filter active alerts: must be active AND alert_id must match user email
                const active = processedAlerts.filter(a => a.isActive);
                const past = processedAlerts.filter(a => !a.isActive);
                setActiveAlerts(active);
                setPastAlerts(past);
            } else {
                setActiveAlerts([]);
                setPastAlerts([]);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load alerts");
        } finally {
            setLoading(false);
        }
    }, [location, user]);

    useEffect(() => {
        if (location) {
            loadAlerts();
        }
    }, [location, loadAlerts]);

    const handleAlertPress = (item) => {
        if (item.isActive) {
            setSelectedAlert(item);
            setModalVisible(true);
        }
    };

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [alertToDelete, setAlertToDelete] = useState(null);
    const [countdown, setCountdown] = useState(10);
    const [deleting, setDeleting] = useState(false);

    // Timer effect
    useEffect(() => {
        let timer;
        if (deleteModalVisible && countdown > 0 && !deleting) {
            timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (deleteModalVisible && countdown === 0 && !deleting) {
            // Time's up, auto-delete
            performDelete();
        }
        return () => clearTimeout(timer);
    }, [deleteModalVisible, countdown, deleting]);

    const handleDeletePress = (item) => {
        setAlertToDelete(item);
        setCountdown(10);
        setDeleteModalVisible(true);
    };

    const performDelete = async () => {
        if (!alertToDelete) return;
        setDeleting(true);
        try {
            await deleteAlert(alertToDelete.alert_id, alertToDelete.alert_timestamp);
            Alert.alert("Success", "Alert deleted.");
            loadAlerts(); // Refresh list
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to delete alert.");
        } finally {
            setDeleting(false);
            setDeleteModalVisible(false);
            setAlertToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteModalVisible(false);
        setAlertToDelete(null);
        setCountdown(10); // Reset
    };

    // Create Alert State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [userDevices, setUserDevices] = useState([]);
    const [selectedDeviceForAlert, setSelectedDeviceForAlert] = useState(null);
    const [newAlertTitle, setNewAlertTitle] = useState('');
    const [newAlertMessage, setNewAlertMessage] = useState('');
    const [creatingAlert, setCreatingAlert] = useState(false);

    useEffect(() => {
        if (createModalVisible && user && location) {
            loadUserDevices();
        }
    }, [createModalVisible, user, location]);

    const loadUserDevices = async () => {
        try {
            const data = await fetchDevices(location.latitude, location.longitude, user.email);
            if (data && data.success) {
                const uniqueDevices = new Set([
                    ...(data.your_device_ids_nearby || []),
                    ...(data.nearby_device_ids || [])
                ]);
                const allDevices = Array.from(uniqueDevices);
                setUserDevices(allDevices);
            }
        } catch (e) {
            console.error("Failed to load devices", e);
            Alert.alert("Error", "Failed to load device list.");
        }
    };

    const handleCreateAlert = async () => {
        if (!selectedDeviceForAlert || !newAlertTitle || !newAlertMessage) {
            Alert.alert("Error", "Please fill all fields and select a device.");
            return;
        }

        setCreatingAlert(true);
        try {
            // Fetch device info to get location
            const deviceInfo = await getDeviceInfo(selectedDeviceForAlert);
            // Fallback to user location if device info fails or doesn't have location
            const deviceLat = deviceInfo?.latitude || location.latitude;
            const deviceLng = deviceInfo?.longitude || location.longitude;

            const payload = {
                admin_email: user.email,
                alert_title: newAlertTitle,
                alert_message: newAlertMessage,
                device_id: selectedDeviceForAlert,
                isActive: true,
                isAdmin: true,
                latitude: deviceLat,
                longitude: deviceLng,
                action: "create"
            };

            await createAlert(payload);
            Alert.alert("Success", "Alert created successfully.");
            setCreateModalVisible(false);
            setNewAlertTitle('');
            setNewAlertMessage('');
            setSelectedDeviceForAlert(null);
            loadAlerts(); // Refresh list
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to create alert.");
        } finally {
            setCreatingAlert(false);
        }
    };

    const confirmResolve = async () => {
        if (!selectedAlert || !location) return;

        setResolving(true);
        try {
            // Need alert_id which should be in the item from the API response
            const response = await resolveAlert(selectedAlert.alert_id, selectedAlert.device_id, selectedAlert.alert_timestamp, location.latitude, location.longitude);
            console.log("Resolve response:", response);
            setModalVisible(false);
            setSelectedAlert(null);
            loadAlerts(); // Refresh list
            Alert.alert("Success", "Alert has been resolved.");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to resolve alert.");
        } finally {
            setResolving(false);
        }
    };

    const getFilteredPastAlerts = () => {
        return pastAlerts.filter(alert => {
            const alertDate = new Date(alert.alert_timestamp);
            return (
                alertDate.getDate() === filterDate.getDate() &&
                alertDate.getMonth() === filterDate.getMonth() &&
                alertDate.getFullYear() === filterDate.getFullYear()
            );
        });
    };

    const renderAlertItem = (item, isActive) => (
        <TouchableOpacity
            key={item.device_id + item.alert_timestamp}
            activeOpacity={isActive ? 0.7 : 1}
            onPress={() => isActive && handleAlertPress(item)}
        >
            <View style={[styles.alertCard, { backgroundColor: theme.card, borderColor: isActive ? '#ef5350' : theme.border }, theme.shadow]}>
                <View style={styles.alertHeader}>
                    <View style={[styles.alertBadge, { backgroundColor: isActive ? '#ffebee' : theme.surface }]}>
                        <Icon name={isActive ? "warning" : "history"} size={20} color={isActive ? '#d32f2f' : theme.textSecondary} />
                        <Text style={[styles.alertType, { color: isActive ? '#d32f2f' : theme.textSecondary }]}>{(item.alert_type || 'Alert').replace('_', ' ')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.alertTime, { color: theme.textSecondary, marginRight: 10 }]}>
                            {new Date(item.alert_timestamp).toLocaleString()}
                        </Text>
                        <TouchableOpacity onPress={() => handleDeletePress(item)} style={{ padding: 4 }}>
                            <Icon name="delete" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {item.alert_title && (
                    <Text style={[styles.alertTitle, { color: theme.text }]}>{item.alert_title}</Text>
                )}
                {item.alert_message && (
                    <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>{item.alert_message}</Text>
                )}

                <Text style={[styles.alertDetails, { color: theme.text }]}>{item.alert_details}</Text>

                <View style={styles.alertFooter}>
                    <View style={styles.infoRow}>
                        <Icon name="location-on" size={16} color={theme.textSecondary} />
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>Dist: {item.distance_km ? item.distance_km.toFixed(2) : 0} km</Text>
                    </View>
                </View>
                {isActive && (
                    <Text style={{ color: '#d32f2f', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>Tap to resolve</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const filteredPast = getFilteredPastAlerts();

    return (
        <ScreenWrapper style={{ backgroundColor: theme.background }}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card }, theme.shadow]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Alerts</Text>
                <View style={{ flexDirection: 'row' }}>
                    {DEVICE_TYPE === 'admin' && (
                        <TouchableOpacity style={[styles.iconButton, { marginRight: 10 }]} onPress={() => setCreateModalVisible(true)}>
                            <Icon name="add-circle-outline" size={28} color={theme.text} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.iconButton} onPress={loadAlerts}>
                        <Icon name="refresh" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ... [Summary and Tabs remain same] ... */}

            <View style={{ paddingHorizontal: spacing.m, paddingTop: spacing.m }}>
                <View style={styles.summaryContainer}>
                    {/* ... [Summary content] ... */}
                    {DEVICE_TYPE === 'admin' && (
                        <View style={[styles.summaryBox, { backgroundColor: theme.card, borderColor: '#ef5350' }, theme.shadow]}>
                            <Text style={[styles.summaryCount, { color: '#ef5350' }]}>{activeAlerts.length}</Text>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Active Alerts</Text>
                        </View>
                    )}
                    <View style={[styles.summaryBox, { backgroundColor: theme.card, borderColor: theme.border }, theme.shadow]}>
                        <Text style={[styles.summaryCount, { color: theme.text }]}>{pastAlerts.length}</Text>
                        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Past Alerts</Text>
                    </View>
                </View>

                {/* Tab Bar - Conditional */}
                {DEVICE_TYPE === 'admin' && (
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'active' && { borderBottomColor: colors.primary }]}
                            onPress={() => setActiveTab('active')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'active' ? colors.primary : theme.textSecondary }]}>
                                Active Alerts
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'past' && { borderBottomColor: colors.primary }]}
                            onPress={() => setActiveTab('past')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'past' ? colors.primary : theme.textSecondary }]}>
                                Past Alerts
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>


            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAlerts} />}
            >
                {/* ... [List Content] ... */}
                {!location && (
                    <View style={styles.centerInfo}>
                        <Text style={{ color: theme.text }}>Waiting for location...</Text>
                    </View>
                )}

                {loading && !activeAlerts.length && !pastAlerts.length && (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                )}

                {error && (
                    <View style={styles.centerInfo}>
                        <Text style={{ color: '#ef5350' }}>{error}</Text>
                        <TouchableOpacity onPress={loadAlerts} style={{ marginTop: 10 }}>
                            <Text style={{ color: colors.primary }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && !error && activeTab === 'active' && (
                    <View style={{ flex: 1 }}>
                        {activeAlerts.length > 0 ? (
                            activeAlerts.map(item => renderAlertItem(item, true))
                        ) : (
                            <View style={styles.emptyState}>
                                <Icon name="check-circle" size={48} color="#4CAF50" />
                                <Text style={[styles.emptySectionText, { color: theme.textSecondary }]}>No active alerts</Text>
                            </View>
                        )}
                    </View>
                )}

                {!loading && !error && activeTab === 'past' && (
                    <View style={{ flex: 1 }}>
                        {/* Date Filter */}
                        <TouchableOpacity
                            style={[styles.dateFilterBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Icon name="event" size={20} color={theme.text} />
                            <Text style={[styles.dateFilterText, { color: theme.text }]}>
                                Filter: {filterDate.toLocaleDateString()}
                            </Text>
                            <Icon name="arrow-drop-down" size={24} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {filteredPast.length > 0 ? (
                            filteredPast.map(item => renderAlertItem(item, false))
                        ) : (
                            <View style={styles.emptyState}>
                                <Icon name="history" size={48} color={theme.textSecondary} />
                                <Text style={[styles.emptySectionText, { color: theme.textSecondary }]}>No alerts for this date</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <DatePicker
                modal
                open={showDatePicker}
                date={filterDate}
                mode="date"
                onConfirm={(date) => {
                    setShowDatePicker(false);
                    setFilterDate(date);
                }}
                onCancel={() => {
                    setShowDatePicker(false);
                }}
            />

            {/* Resolve Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Resolve Alert?</Text>
                        <Text style={[styles.modalText, { color: theme.textSecondary }]}>
                            Are you sure you want to mark this alert as resolved?
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1 }]}
                                onPress={() => setModalVisible(false)}
                                disabled={resolving}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={confirmResolve}
                                disabled={resolving}
                            >
                                {resolving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff' }}>Yes, Resolve</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                transparent={true}
                visible={deleteModalVisible}
                animationType="slide"
                onRequestClose={cancelDelete}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Icon name="warning" size={30} color="#FF9800" />
                            <Text style={[styles.modalTitle, { color: theme.text, marginLeft: 10, marginBottom: 0 }]}>Deleting Alert</Text>
                        </View>

                        <Text style={[styles.modalText, { color: theme.textSecondary, marginBottom: 10 }]}>
                            This alert will be permanently deleted.
                        </Text>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 20 }}>
                            Auto-deleting in {countdown}s
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1 }]}
                                onPress={cancelDelete}
                                disabled={deleting}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#d32f2f' }]}
                                onPress={performDelete}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff' }}>Yes, Delete Now</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Create Alert Modal */}
            <Modal
                transparent={true}
                visible={createModalVisible}
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card, maxHeight: '90%' }]}>
                        <ScrollView>
                            <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 20 }]}>Create Custom Alert</Text>

                            <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>Select Device:</Text>
                            <ScrollView style={{ maxHeight: 150, marginBottom: 16, borderWidth: 1, borderColor: theme.border, borderRadius: 8 }}>
                                {userDevices.map((deviceId, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            padding: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: theme.border,
                                            backgroundColor: selectedDeviceForAlert === deviceId ? theme.surface : 'transparent'
                                        }}
                                        onPress={() => setSelectedDeviceForAlert(deviceId)}
                                    >
                                        <Text style={{ color: theme.text }}>{deviceId}</Text>
                                    </TouchableOpacity>
                                ))}
                                {userDevices.length === 0 && (
                                    <Text style={{ padding: 12, color: theme.textSecondary, fontStyle: 'italic' }}>No devices found</Text>
                                )}
                            </ScrollView>

                            <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>Alert Title:</Text>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    borderRadius: 8,
                                    padding: 12,
                                    color: theme.text,
                                    marginBottom: 16,
                                    backgroundColor: theme.background
                                }}
                                placeholder="Enter title"
                                placeholderTextColor={theme.textSecondary}
                                value={newAlertTitle}
                                onChangeText={setNewAlertTitle}
                            />

                            <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>Alert Message:</Text>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    borderRadius: 8,
                                    padding: 12,
                                    color: theme.text,
                                    marginBottom: 24,
                                    backgroundColor: theme.background,
                                    textAlignVertical: 'top',
                                    minHeight: 80
                                }}
                                placeholder="Enter message"
                                placeholderTextColor={theme.textSecondary}
                                value={newAlertMessage}
                                onChangeText={setNewAlertMessage}
                                multiline
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1 }]}
                                    onPress={() => setCreateModalVisible(false)}
                                    disabled={creatingAlert}
                                >
                                    <Text style={{ color: theme.text }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                    onPress={handleCreateAlert}
                                    disabled={creatingAlert}
                                >
                                    {creatingAlert ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={{ color: '#fff' }}>Create</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    iconButton: {
        padding: 4,
    },
    content: {
        padding: spacing.m,
        paddingBottom: spacing.xl,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.m,
        gap: spacing.m,
    },
    summaryBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.m,
        borderRadius: 12,
        borderWidth: 1,
    },
    summaryCount: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    alertCard: {
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.m,
        borderWidth: 1,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    alertBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    alertType: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    alertTime: {
        fontSize: 12,
    },
    alertDetails: {
        fontSize: 16,
        marginBottom: spacing.s,
        lineHeight: 22,
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        marginTop: 8,
    },
    alertMessage: {
        fontSize: 14,
        marginBottom: 8,
    },
    alertFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        marginLeft: 4,
    },
    centerInfo: {
        alignItems: 'center',
        padding: 20,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        opacity: 0.7
    },
    emptySectionText: {
        marginTop: 16,
        fontSize: 16,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 12,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: spacing.s,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Date Filter Styles
    dateFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: spacing.m,
    },
    dateFilterText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    }
});

export default AlertsScreen;
