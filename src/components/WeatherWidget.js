import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchWeatherData, fetchLocationName, getWeatherDescription } from '../services/weatherService';
import { colors, spacing } from '../theme';

const WeatherWidget = ({ latitude, longitude }) => {
    const [weatherData, setWeatherData] = useState(null);
    const [locationName, setLocationName] = useState('Locating...');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (latitude && longitude) {
                setLoading(true);
                try {
                    const [weather, location] = await Promise.all([
                        fetchWeatherData(latitude, longitude),
                        fetchLocationName(latitude, longitude)
                    ]);
                    setWeatherData(weather);
                    setLocationName(location);
                } catch (error) {
                    console.error("Widget Load Error", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [latitude, longitude]);

    if (!latitude || !longitude) return null;

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loadingText}>Loading Weather...</Text>
            </View>
        );
    }

    if (!weatherData) return null;

    const current = weatherData.current_weather;
    const hourly = weatherData.hourly;
    const daily = weatherData.daily;

    // Helper to get icon name
    const getIconName = (code) => {
        if (code === 0) return 'weather-sunny';
        if (code > 0 && code <= 3) return 'weather-partly-cloudy';
        if (code >= 45 && code <= 48) return 'weather-fog';
        if (code >= 51 && code <= 67) return 'weather-rainy';
        if (code >= 71 && code <= 77) return 'weather-snowy';
        if (code >= 80 && code <= 82) return 'weather-pouring';
        if (code >= 95) return 'weather-lightning';
        return 'weather-cloudy';
    };

    // Format current time
    const updatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Filter next 24 hours
    const currentHourIndex = hourly.time.findIndex(t => new Date(t) >= new Date());
    const nextHours = hourly.time.slice(currentHourIndex, currentHourIndex + 24).map((time, index) => ({
        time,
        temp: hourly.temperature_2m[currentHourIndex + index],
        code: hourly.weathercode[currentHourIndex + index]
    }));

    // Daily Forecast
    const dailyForecast = daily.time.map((time, index) => ({
        time,
        max: daily.temperature_2m_max[index],
        min: daily.temperature_2m_min[index],
        code: daily.weathercode[index]
    }));

    return (
        <LinearGradient
            colors={['#43A047', '#2E7D32']} // Green Gradient
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.locationName} numberOfLines={2}>{locationName}</Text>
                    <View style={styles.updateRow}>
                        <MaterialIcons name="location-pin" size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.updateTime}>Updated On {updatedTime}</Text>
                    </View>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity>
                        <MaterialIcons name="search" size={24} color="#fff" style={{ marginRight: 15 }} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <MaterialIcons name="my-location" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Current Weather */}
            <View style={styles.currentWeather}>
                <View>
                    <Text style={styles.temperature}>{current.temperature}°</Text>
                    <Text style={styles.condition}>{getWeatherDescription(current.weathercode)}</Text>
                    <View style={styles.minMaxRow}>
                        <MaterialIcons name="arrow-upward" size={16} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.minMaxText}>{daily.temperature_2m_max[0]}°</Text>
                        <MaterialIcons name="arrow-downward" size={16} color="rgba(255,255,255,0.8)" style={{ marginLeft: 10 }} />
                        <Text style={styles.minMaxText}>{daily.temperature_2m_min[0]}°</Text>
                    </View>
                </View>
                <Icon name={getIconName(current.weathercode)} size={100} color="#FFD700" style={styles.mainIcon} />
            </View>

            {/* Hourly Forecast */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Hourly Forecast</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyList}>
                    {nextHours.map((item, index) => (
                        <View key={index} style={styles.hourlyItem}>
                            <Text style={styles.hourlyTime}>
                                {new Date(item.time).getHours()}:00
                            </Text>
                            <Icon name={getIconName(item.code)} size={24} color="#FFD700" style={{ marginVertical: 8 }} />
                            <Text style={styles.hourlyTemp}>{item.temp}°</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Daily Forecast */}
            <View style={[styles.sectionContainer, { borderBottomWidth: 0 }]}>
                <Text style={styles.sectionTitle}>Daily Forecast</Text>
                {dailyForecast.slice(0, 5).map((item, index) => (
                    <View key={index} style={styles.dailyItem}>
                        <Text style={styles.dayName}>
                            {new Date(item.time).toLocaleDateString('en-US', { weekday: 'long' })}
                        </Text>
                        <View style={styles.dailyIconRow}>
                            <Icon name={getIconName(item.code)} size={20} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.dailyCondition}>
                                {getWeatherDescription(item.code).split(':')[0]}
                            </Text>
                        </View>
                        <View style={styles.dailyTemps}>
                            <Text style={styles.maxTemp}>{item.max}°</Text>
                            <Text style={styles.minTemp}> | {item.min}°</Text>
                        </View>
                    </View>
                ))}
            </View>

        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 5,
        overflow: 'hidden'
    },
    loadingContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1976D2'
    },
    loadingText: {
        color: 'white',
        marginTop: 10
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    locationName: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4
    },
    updateRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    updateTime: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginLeft: 4
    },
    headerIcons: {
        flexDirection: 'row'
    },
    currentWeather: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
    },
    temperature: {
        color: 'white',
        fontSize: 64,
        fontWeight: '300'
    },
    condition: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 20,
        marginBottom: 8
    },
    minMaxRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    minMaxText: {
        color: 'white',
        fontSize: 14,
        marginLeft: 2
    },
    mainIcon: {
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4
    },
    sectionContainer: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 8
    },
    hourlyList: {
        flexDirection: 'row'
    },
    hourlyItem: {
        alignItems: 'center',
        marginRight: 25
    },
    hourlyTime: {
        color: 'white',
        fontSize: 14
    },
    hourlyTemp: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },
    dailyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    dayName: {
        color: 'white',
        width: 100,
        fontSize: 15
    },
    dailyIconRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    dailyCondition: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginLeft: 6
    },
    dailyTemps: {
        flexDirection: 'row',
        width: 80,
        justifyContent: 'flex-end'
    },
    maxTemp: {
        color: '#FFD700',
        fontSize: 15,
        fontWeight: 'bold'
    },
    minTemp: {
        color: '#81D4FA',
        fontSize: 15
    }
});

export default WeatherWidget;
