import React from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';

import { useTheme } from '../context/ThemeContext';

const ScreenWrapper = ({ children, style, gradient, statusBarColor = 'transparent' }) => {
    const { theme, isDarkMode } = useTheme();
    const Container = gradient ? LinearGradient : View;
    const containerProps = gradient
        ? { colors: [colors.gradientStart, colors.gradientEnd], style: styles.gradient }
        : { style: [styles.container, { backgroundColor: theme.background }] };

    const barStyle = isDarkMode ? 'light-content' : 'dark-content';

    return (
        <Container {...containerProps}>
            <StatusBar translucent backgroundColor={statusBarColor} barStyle={barStyle} />
            <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
                {children}
            </SafeAreaView>
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    bgWhite: {
        backgroundColor: colors.white,
    },
    safeArea: {
        flex: 1,
    },
});

export default ScreenWrapper;
