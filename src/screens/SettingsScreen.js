import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors, spacing } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser } from '../context/UserContext';
import { signOut } from '../services/auth'; // Import signOut

import { useTheme } from '../context/ThemeContext';

const SettingsScreen = ({ navigation }) => {
    const { user, logout } = useUser();
    const { isDarkMode, toggleTheme, theme } = useTheme();

    const handleSignOut = () => {
        logout();
        // Navigation is handled reactivity in AppNavigator
    };

    const renderSettingItem = ({ icon, title, subtitle, onPress, toggle }) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={onPress}
            disabled={!!toggle}
        >
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#333' : '#E8EAF6' }]}>
                    <Icon name={icon} size={24} color={theme.icon} />
                </View>
                <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
                    <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
                </View>
            </View>
            {toggle ? (
                <Switch
                    value={isDarkMode}
                    onValueChange={toggleTheme}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={isDarkMode ? "#2196F3" : "#f4f3f4"}
                />
            ) : (
                <Icon name="chevron-right" size={24} color={theme.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Settings</Text>
                <TouchableOpacity style={[styles.adminPanelButton, { backgroundColor: isDarkMode ? '#3e2723' : '#FFEBEE', borderColor: isDarkMode ? '#b71c1c' : '#FFCDD2' }]}>
                    <Icon name="admin-panel-settings" size={16} color="#D32F2F" />
                    <Text style={styles.adminPanelText}>Admin Panel</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                    Manage admin preferences and user requests
                </Text>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.profileIconContainer, { backgroundColor: isDarkMode ? '#333' : '#FFEBEE' }]}>
                        <MaterialCommunityIcons name="shield-account" size={32} color="#D32F2F" />
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.profileNameRow}>
                            <Text style={[styles.profileName, { color: theme.text }]}>Admin User</Text>
                            <View style={[styles.adminBadge, { backgroundColor: isDarkMode ? '#3e2723' : '#FFEBEE', borderColor: isDarkMode ? '#b71c1c' : '#FFCDD2' }]}>
                                <Text style={styles.adminBadgeText}>ADMIN</Text>
                            </View>
                        </View>
                        <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email || 'admin@aagah.com'}</Text>
                    </View>
                </View>

                {/* Settings Section */}
                <Text style={[styles.sectionHeader, { color: theme.text }]}>Settings</Text>

                <View style={styles.settingsList}>
                    {renderSettingItem({
                        icon: 'person-outline',
                        title: 'Profile Settings',
                        subtitle: 'Edit admin profile information'
                    })}

                    {renderSettingItem({
                        icon: 'palette',
                        title: 'Theme Settings',
                        subtitle: 'Change color mode',
                        toggle: true
                    })}

                    {renderSettingItem({
                        icon: 'notifications-none',
                        title: 'Notification Settings',
                        subtitle: 'Admin notification preferences'
                    })}
                </View>

                {/* Sign Out Button (Extra) */}
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: colors.white,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.black,
    },
    adminPanelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: spacing.m,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    adminPanelText: {
        color: '#D32F2F',
        fontWeight: 'bold',
        marginLeft: 4,
        fontSize: 12,
    },
    content: {
        padding: spacing.m,
    },
    description: {
        color: colors.gray,
        marginBottom: spacing.l,
        fontSize: 14,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5', // Or slight distinction needed? Image shows greyish card
        backgroundColor: '#EEEEEE',
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    profileIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FFEBEE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    profileInfo: {
        flex: 1,
    },
    profileNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.black,
        marginRight: spacing.s,
    },
    adminBadge: {
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    adminBadgeText: {
        color: '#D32F2F',
        fontSize: 10,
        fontWeight: 'bold',
    },
    profileEmail: {
        color: colors.gray,
        fontSize: 14,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.black,
        marginBottom: spacing.m,
    },
    settingsList: {
        backgroundColor: 'transparent',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        padding: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: spacing.m,
    },
    settingText: {
        justifyContent: 'center',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.black,
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 12,
        color: colors.gray,
    },
    signOutButton: {
        marginTop: spacing.xl,
        alignItems: 'center',
        padding: spacing.m,
    },
    signOutText: {
        color: '#D32F2F',
        fontWeight: 'bold',
    }
});

export default SettingsScreen;
