import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Using MaterialIcons
import { colors, spacing } from '../theme';

const Input = ({ placeholder, value, onChangeText, secureTextEntry, iconName, type = 'text' }) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    return (
        <View style={styles.container}>
            {iconName && <Icon name={iconName} size={20} color={colors.gray} style={styles.icon} />}
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={isSecure}
                placeholderTextColor={colors.gray}
                autoCapitalize="none"
            />
            {secureTextEntry && (
                <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.eyeIcon}>
                    <Icon name={isSecure ? 'visibility-off' : 'visibility'} size={20} color={colors.gray} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: spacing.m,
        height: 50,
        marginVertical: spacing.s,
        backgroundColor: colors.white,
    },
    input: {
        flex: 1,
        height: '100%',
        color: colors.black,
        marginLeft: spacing.s,
    },
    icon: {
        marginRight: spacing.s,
    },
    eyeIcon: {
        padding: 4,
    },
});

export default Input;
