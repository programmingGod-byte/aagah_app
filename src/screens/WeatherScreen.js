import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useLocation } from '../context/LocationContext';
import WeatherWidget from '../components/WeatherWidget';
import { colors, spacing } from '../theme';

const WeatherScreen = () => {
    const { location } = useLocation();

    return (
        <ScreenWrapper style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {location ? (
                    <WeatherWidget latitude={location.latitude} longitude={location.longitude} />
                ) : (
                    <WeatherWidget latitude={null} longitude={null} /> // Will show loading or null
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.m,
        paddingTop: spacing.l,
    }
});

export default WeatherScreen;
