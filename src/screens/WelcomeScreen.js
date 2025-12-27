import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5'; // Using FontAwesome5 for users icon
import ScreenWrapper from '../components/ScreenWrapper';
import Button from '../components/Button';
import { colors, spacing } from '../theme';

const WelcomeScreen = ({ navigation }) => {
    return (
        <ScreenWrapper gradient statusBarColor="transparent" barStyle="light-content">
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Icon name="user-friends" size={100} color={colors.white} />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Stay Safe</Text>
                    <Text style={styles.subtitle}>
                        Connect with community and{'\n'}emergency services.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, styles.activeDot]} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>

                    <Button
                        title="Continue"
                        onPress={() => navigation.navigate('Login')}
                        style={styles.button}
                        textStyle={styles.buttonText}
                    />
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: spacing.l,
        justifyContent: 'space-between',
    },
    iconContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: spacing.s,
    },
    subtitle: {
        fontSize: 18,
        color: colors.white,
        opacity: 0.9,
        lineHeight: 26,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    dotsContainer: {
        flexDirection: 'row',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginRight: spacing.s,
    },
    activeDot: {
        backgroundColor: colors.white,
    },
    button: {
        backgroundColor: colors.white,
        width: 120, // Approximate width
    },
    buttonText: {
        color: colors.primary, // This needs to be handled in Button component or override
    },
});

export default WelcomeScreen;
