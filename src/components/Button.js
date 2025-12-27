import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../theme';

const Button = ({ title, onPress, loading, variant = 'primary', style }) => {
    const isPrimary = variant === 'primary';
    const isOutline = variant === 'outline';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isPrimary && styles.primary,
                isOutline && styles.outline,
                style
            ]}
            onPress={onPress}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? colors.white : colors.primary} />
            ) : (
                <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textOutline]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: spacing.s,
        width: '100%',
    },
    primary: {
        backgroundColor: colors.black, // Login screen shows black button for "Continue"
    },
    outline: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
    textPrimary: {
        color: colors.white,
    },
    textOutline: {
        color: colors.black,
    },
});

export default Button;
