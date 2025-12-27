import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Dimensions, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors, spacing } from '../theme';
import { configureGoogleSignIn, signInWithGoogle } from '../services/auth';
import { useUser } from '../context/UserContext';
import LinearGradient from 'react-native-linear-gradient';
import { DEVICE_TYPE } from '@env';
import { verifyAdminLogin } from '../services/deviceService';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const { login } = useUser();

    // Admin Login States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        configureGoogleSignIn();
        console.log('DEVICE_TYPE:', DEVICE_TYPE);
    }, []);

    const handleGoogleLogin = async () => {
        const userInfo = await signInWithGoogle();
        if (userInfo) {
            console.log('User Info:', userInfo);
            const user = userInfo.data?.user || userInfo.user;
            // For Google Login, explicit isAdmin: false (unless configured otherwise, but based on request)
            // Actually deviceService.js register function handles the main logic, 
            // but we pass isAdmin here if context uses it immediately.
            // Based on user request "send isAdmin as false" for normal user.
            login({ email: user.email, ...user, isAdmin: false });
        }
    };

    const handleAdminLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setIsLoading(true);
        try {
            const result = await verifyAdminLogin(email, password);
            if (result && result.verified) {
                // Login Success
                login({ email: email, isAdmin: true, name: 'Admin' });
            } else {
                Alert.alert('Login Failed', result.message || 'Invalid credentials');
            }
        } catch (error) {
            Alert.alert('Error', 'Login failed. Please check network.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderLoginContent = () => {
        if (DEVICE_TYPE === 'admin') {
            return (
                <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>Admin Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter admin email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor="#999"
                    />

                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor="#999"
                    />

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleAdminLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Login as Admin</Text>
                        )}
                    </TouchableOpacity>
                </View>
            );
        } else {
            return (
                <View>
                    <Text style={styles.instructionText}>Sign in with Google to access real-time flood monitoring.</Text>
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                        activeOpacity={0.8}
                    >
                        <View style={styles.googleIconContainer}>
                            <Image
                                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png' }}
                                style={styles.googleIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Top Section with Gradient and Hero Image */}
                <LinearGradient
                    colors={['#43A047', '#2E7D32']}
                    style={styles.headerBackground}
                >
                    <View style={styles.heroContainer}>
                        <Image
                            source={require('../assets/app_logo.png')}
                            style={styles.heroImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.heroTitle}>AAGAH</Text>
                        <Text style={styles.heroSubtitle}>Stay Alert. Stay Safe.</Text>
                    </View>
                </LinearGradient>

                {/* Bottom Section with Login Action */}
                <View style={styles.bottomSection}>
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.welcomeText}>Welcome {DEVICE_TYPE === 'admin' ? 'Admin' : 'Back'}</Text>
                        {DEVICE_TYPE === 'admin' && <Text style={styles.instructionText}>Please sign in to manage alerts.</Text>}
                    </View>

                    {renderLoginContent()}

                    <Text style={styles.footerText}>
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
    },
    headerBackground: {
        height: Dimensions.get('window').height * 0.35,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    heroContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    heroImage: {
        width: 100,
        height: 100,
        marginBottom: spacing.s,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 2,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#E8F5E9',
        marginTop: 4,
        letterSpacing: 1,
    },
    bottomSection: {
        flex: 1,
        padding: spacing.l,
        justifyContent: 'center',
        paddingBottom: spacing.xl,
    },
    welcomeContainer: {
        marginTop: spacing.s,
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: spacing.l,
        lineHeight: 20,
        marginBottom: spacing.l,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        marginBottom: spacing.m,
    },
    googleIconContainer: {
        marginRight: 16,
    },
    googleIcon: {
        width: 24,
        height: 24,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
        marginRight: 24,
    },
    formContainer: {
        width: '100%',
    },
    inputLabel: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
        fontWeight: '600',
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    loginButton: {
        backgroundColor: '#2E7D32',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        elevation: 3,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footerText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 'auto',
    }
});

export default LoginScreen;
