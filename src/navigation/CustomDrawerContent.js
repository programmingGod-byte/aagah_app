import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../theme';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

const CustomDrawerContent = (props) => {
    const { user, logout } = useUser();
    const { theme, isDarkMode } = useTheme();

    const handleSignOut = async () => {
        await logout();
    };

    const openWebsite = () => {
        Linking.openURL('https://climmatech.com');
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>

            {/* Header Section with Gradient */}
            <LinearGradient
                colors={isDarkMode ? ['#1B5E20', '#2E7D32'] : ['#43A047', '#66BB6A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.userInfoSection}>
                    <View style={styles.avatarContainer}>
                        {user?.photo ? (
                            <Image
                                source={{ uri: user.photo }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>
                                {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={styles.name} numberOfLines={1}>{user?.name || 'Hello, User'}</Text>
                        <Text style={styles.email} numberOfLines={1}>{user?.email || 'user@example.com'}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Drawer Items Scroller */}
            <DrawerContentScrollView
                {...props}
                contentContainerStyle={{ paddingTop: spacing.m }}
                style={styles.drawerScrollView}
            >
                <DrawerItemList {...props} />

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Additional Items */}
                <DrawerItem
                    label="Alerts"
                    onPress={() => props.navigation.navigate('Alerts')} // Direct navigation if possible, or via Home stack
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="bell-outline" color={color} size={size} />
                    )}
                    labelStyle={styles.drawerItemLabel}
                    activeTintColor={colors.primary}
                    inactiveTintColor={theme.text}
                />
                <DrawerItem
                    label="Need Help?"
                    onPress={openWebsite}
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="help-circle-outline" color={color} size={size} />
                    )}
                    labelStyle={styles.drawerItemLabel}
                    activeTintColor={colors.primary}
                    inactiveTintColor={theme.text}
                />
                <DrawerItem
                    label="Our Website"
                    onPress={openWebsite}
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="web" color={color} size={size} />
                    )}
                    labelStyle={styles.drawerItemLabel}
                    activeTintColor={colors.primary}
                    inactiveTintColor={theme.text}
                />
            </DrawerContentScrollView>

            {/* Bottom Section */}
            <View style={[styles.bottomSection, { borderTopColor: theme.border }]}>
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton} activeOpacity={0.7}>
                    <View style={styles.signOutItem}>
                        <MaterialCommunityIcons name="logout" size={22} color="#F44336" />
                        <Text style={[styles.signOutText, { color: '#F44336' }]}>Sign Out</Text>
                    </View>
                </TouchableOpacity>
                <Text style={[styles.versionText, { color: theme.textSecondary }]}>v1.0.0 • Climmatech</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerGradient: {
        padding: spacing.l,
        paddingTop: spacing.xl * 1.5, // Status bar formatting
        paddingBottom: spacing.l + spacing.s,
    },
    userInfoSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
        // Shadow for avatar
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    userDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    email: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    drawerScrollView: {
        flex: 1,
    },
    drawerItemLabel: {
        marginLeft: -10,
        fontSize: 15,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginVertical: spacing.s,
        marginHorizontal: spacing.m,
        opacity: 0.5,
    },
    bottomSection: {
        padding: spacing.m,
        paddingBottom: spacing.l,
        borderTopWidth: 1,
    },
    signOutButton: {
        paddingVertical: spacing.s,
        marginBottom: spacing.s,
        marginLeft: spacing.s,
    },
    signOutItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    signOutText: {
        fontSize: 16,
        marginLeft: spacing.m,
        fontWeight: '600',
    },
    versionText: {
        fontSize: 11,
        textAlign: 'center',
        marginTop: spacing.s,
        opacity: 0.5,
    }
});

export default CustomDrawerContent;
