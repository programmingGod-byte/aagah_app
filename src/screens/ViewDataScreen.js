import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Dimensions, Alert, ActivityIndicator } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { fetchDeviceData, getDeviceInfo, fetchDeviceMedia } from '../services/deviceService';
import RNFS from 'react-native-fs';
import DatePicker from 'react-native-date-picker';
import { Linking, Image, Modal, TouchableOpacity, } from 'react-native';
import Video from 'react-native-video';
import { DEVICE_TYPE } from '@env';

const screenWidth = Dimensions.get('window').width;

const ViewDataScreen = ({ route }) => {
    const { deviceId } = route.params || {};
    const { theme, isDarkMode } = useTheme();
    const [connectedDevice, setConnectedDevice] = useState(deviceId || 'riverbot-005');
    const [inputValue, setInputValue] = useState(deviceId || 'riverbot-005');
    console.log('DEBUG: DEVICE_TYPE from env is:', DEVICE_TYPE);
    const [isConnected, setIsConnected] = useState(true);
    const [deviceBaseDepth, setDeviceBaseDepth] = useState(null);

    const [deviceInfo, setDeviceInfo] = useState(null);

    // Depth Data State
    const [depthData, setDepthData] = useState(null);
    const [isDepthLoading, setIsDepthLoading] = useState(false);
    const [depthTimeRange, setDepthTimeRange] = useState('1 day');
    const [depthStartDate, setDepthStartDate] = useState(new Date(Date.now() - 86400000));
    const [depthEndDate, setDepthEndDate] = useState(new Date());
    const [depthTooltip, setDepthTooltip] = useState(null);

    // Velocity Data State
    const [velocityData, setVelocityData] = useState(null);
    const [isVelocityLoading, setIsVelocityLoading] = useState(false);
    const [velocityTimeRange, setVelocityTimeRange] = useState('1 day');
    const [velocityStartDate, setVelocityStartDate] = useState(new Date(Date.now() - 86400000));
    const [velocityEndDate, setVelocityEndDate] = useState(new Date());
    const [velocityTooltip, setVelocityTooltip] = useState(null);

    // Media Data State
    const [mediaData, setMediaData] = useState([]);
    const [isMediaLoading, setIsMediaLoading] = useState(false);
    const [mediaType, setMediaType] = useState('image');
    const [mediaDate, setMediaDate] = useState(new Date());
    const [selectedVideo, setSelectedVideo] = useState(null);

    // Date Picker State
    const [pickerMode, setPickerMode] = useState(null);
    const [showDepthCustom, setShowDepthCustom] = useState(false);
    const [showVelocityCustom, setShowVelocityCustom] = useState(false);

    useEffect(() => {
        // Initial connect if device ID exists
        handleConnect();
    }, []);

    useEffect(() => {
        // Reload chart data when parameters change
        if (isConnected) loadDepthData();
    }, [connectedDevice, depthTimeRange, depthStartDate, depthEndDate, deviceBaseDepth, isConnected]);

    useEffect(() => {
        if (isConnected) loadVelocityData();
    }, [connectedDevice, velocityTimeRange, velocityStartDate, velocityEndDate, isConnected]);

    const handleConnect = async () => {
        if (inputValue.trim()) {
            const devId = inputValue.trim();
            setConnectedDevice(devId);
            setIsConnected(true);

            // Fetch device info to get total depth base value and other details
            try {
                const info = await getDeviceInfo(devId);
                console.log('Device Info:', info);
                setDeviceInfo(info);
                if (info && info.depth) {
                    setDeviceBaseDepth(parseFloat(info.depth));
                } else {
                    setDeviceBaseDepth(null);
                }
            } catch (err) {
                console.error("Failed to fetch device info", err);
                setDeviceBaseDepth(null);
                setDeviceInfo(null);
            }
        }
    };

    const formatDate = (date) => date.toISOString().split('T')[0];

    const loadDepthData = async () => {
        if (!connectedDevice) return;
        setIsDepthLoading(true);
        try {
            const sDate = formatDate(depthStartDate);
            const eDate = formatDate(depthEndDate);
            const raw = await fetchDeviceData(connectedDevice, 'depth', sDate, eDate);
            const processed = processChartData(raw, 'depth', depthTimeRange, deviceBaseDepth);
            setDepthData(processed);
        } catch (error) {
            console.error(error);
        } finally {
            setIsDepthLoading(false);
        }
    };

    const loadVelocityData = async () => {
        if (!connectedDevice) return;
        setIsVelocityLoading(true);
        try {
            const sDate = formatDate(velocityStartDate);
            const eDate = formatDate(velocityEndDate);
            const raw = await fetchDeviceData(connectedDevice, 'velocity_radar', sDate, eDate);
            const processed = processChartData(raw, 'mean_velocity', velocityTimeRange);
            setVelocityData(processed);
        } catch (error) {
            console.error(error);
        } finally {
            setIsVelocityLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected) loadMediaData();
    }, [connectedDevice, mediaDate, mediaType, isConnected]);

    const loadMediaData = async () => {
        if (!connectedDevice) return;
        setIsMediaLoading(true);
        try {
            const year = mediaDate.getFullYear().toString();
            // Month is 0-indexed in JS, but usually APIs expect 1-indexed. The user example showed "12" for December.
            const month = (mediaDate.getMonth() + 1).toString().padStart(2, '0');
            const day = mediaDate.getDate().toString().padStart(2, '0');

            console.log(`Fetching media for ${year}-${month}-${day} type: ${mediaType}`);
            const data = await fetchDeviceMedia(connectedDevice, year, month, day, mediaType);

            // The API returns a list of objects or empty list
            setMediaData(data || []);
        } catch (error) {
            console.error(error);
            setMediaData([]);
        } finally {
            setIsMediaLoading(false);
        }
    };

    const processChartData = (data, valueKey, range, baseDepth = null) => {
        if (!data || data.length === 0) return null;

        const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Sampling for performance
        const targetPoints = 40;
        const samplingRate = Math.ceil(sorted.length / targetPoints);
        const sampled = sorted.filter((_, index) => index % samplingRate === 0);

        return {
            labels: sampled.map((d, index) => {
                // Show label only for ~4-5 points total to keep it clean
                const total = sampled.length;
                const showInterval = Math.floor(total / 4);

                if (index === 0 || index === total - 1 || index % showInterval === 0) {
                    const date = new Date(d.timestamp);
                    return `${date.getMonth() + 1}/${date.getDate()}`; // Just Date (MM/DD)
                }
                return '';
            }),
            datasets: [{
                data: sampled.map(d => {
                    let val = parseFloat(d[valueKey]);

                    // CALCULATION LOGIC:
                    // If calculating Depth and baseDepth is available: Calculated = Base - Sensor
                    if (valueKey === 'depth' && baseDepth !== null && !isNaN(baseDepth)) {
                        val = baseDepth - val;
                    }

                    return val;
                }),
                color: (opacity = 1) => `rgba(67, 160, 71, ${opacity})`, // Green (#43A047)
                strokeWidth: 3
            }],
            // Store original data AND calculated data for reference/tooltip
            originalData: sampled.map(d => {
                let val = parseFloat(d[valueKey]);
                if (valueKey === 'depth' && baseDepth !== null && !isNaN(baseDepth)) {
                    val = baseDepth - val;
                }
                return {
                    ...d,
                    calculatedValue: val // Store the value we plotted
                };
            })
        };
    };

    const handleTimeRangeChange = (type, range) => {
        const end = new Date();
        let start = new Date();

        if (range === '1 day') start.setDate(end.getDate() - 1);
        else if (range === '3 days') start.setDate(end.getDate() - 3);
        else if (range === '1 week') start.setDate(end.getDate() - 7);

        if (type === 'depth') {
            setDepthTimeRange(range);
            if (range === 'Custom') {
                setShowDepthCustom(true);
                return;
            }
            setShowDepthCustom(false);
            setDepthStartDate(start);
            setDepthEndDate(end);
        } else {
            setVelocityTimeRange(range);
            if (range === 'Custom') {
                setShowVelocityCustom(true);
                return;
            }
            setShowVelocityCustom(false);
            setVelocityStartDate(start);
            setVelocityEndDate(end);
        }
    };

    const exportCSV = async (type) => {
        const data = type === 'depth' ? depthData : velocityData;
        if (!data?.originalData) {
            Alert.alert('No Data', `No ${type} data to export.`);
            return;
        }

        const header = `Timestamp,${type === 'depth' ? 'Calculated Depth' : 'Velocity'}\n`;
        let csvContent = header;

        data.originalData.forEach(item => {
            const val = item.calculatedValue; // Use the value we calculated
            csvContent += `${item.timestamp},${val},\n`;
        });

        const path = `${RNFS.DownloadDirectoryPath}/${type}_data_${connectedDevice}_${Date.now()}.csv`;

        try {
            await RNFS.writeFile(path, csvContent, 'utf8');
            Alert.alert('Success', `Saved to: ${path}`);
        } catch (error) {
            const docPath = `${RNFS.DocumentDirectoryPath}/${type}_data_${connectedDevice}.csv`;
            try {
                await RNFS.writeFile(docPath, csvContent, 'utf8');
                Alert.alert('Success', `Saved to Documents`);
            } catch (err) {
                console.error(err);
                Alert.alert('Error', 'Failed to save CSV');
            }
        }
    };

    const chartConfig = {
        backgroundGradientFrom: '#FFFFFF',
        backgroundGradientTo: '#FFFFFF',
        color: (opacity = 1) => `rgba(67, 160, 71, ${opacity})`, // Green (#43A047)
        strokeWidth: 3,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
        decimalPlaces: 2,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        propsForDots: { r: "0", strokeWidth: "0" },
        propsForBackgroundLines: {
            strokeWidth: 0, // REMOVE GRID LINES as requested
            stroke: "transparent"
        },
        fillShadowGradient: '#66BB6A', // Lighter green for gradient
        fillShadowGradientOpacity: 0.2,
    };

    const renderTooltip = (tooltipData) => {
        if (!tooltipData) return null;

        return (
            <View style={{
                position: 'absolute',
                top: tooltipData.y - 60, // Above the point
                left: Math.max(10, Math.min(screenWidth - 120, tooltipData.x - 50)), // Constraint within screen
                backgroundColor: '#222',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 8,
                zIndex: 100,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                minWidth: 100
            }}>
                {tooltipData.date && (
                    <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4, fontWeight: '500' }}>
                        {tooltipData.date}
                    </Text>
                )}
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                    {tooltipData.value}
                    {tooltipData.type === 'depth' ? 'm' : ' m/s'}
                </Text>

                {/* Tooltip Arrow */}
                <View style={{
                    position: 'absolute',
                    bottom: -6,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 6,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: '#222',
                }} />
            </View>
        );
    };

    const TimeRangeSelector = ({ type, currentRange, showCustom, startDate, endDate }) => (
        <View style={styles.card}>
            <View style={styles.timeRangeHeader}>
                <Text style={styles.cardTitle}>Time Range</Text>
            </View>
            <View style={styles.segmentedControl}>
                {['1 day', '3 days', '1 week', 'Custom'].map(range => (
                    <TouchableOpacity
                        key={range}
                        onPress={() => handleTimeRangeChange(type, range)}
                        style={[
                            styles.segmentBtn,
                            currentRange === range && styles.segmentBtnActive
                        ]}
                    >
                        <Text style={[
                            styles.segmentText,
                            currentRange === range && styles.segmentTextActive
                        ]}>{range}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {showCustom && (
                <View style={styles.customDateContainer}>
                    <TouchableOpacity onPress={() => setPickerMode(`${type}Start`)} style={styles.dateInputBtn}>
                        <Icon name="date-range" size={20} color="#666" style={{ marginRight: 8 }} />
                        <Text style={styles.dateInputText}>{startDate.toLocaleDateString()}</Text>
                        <Text style={styles.dateInputLabel}>Start</Text>
                    </TouchableOpacity>
                    <View style={{ width: 16 }} />
                    <TouchableOpacity onPress={() => setPickerMode(`${type}End`)} style={styles.dateInputBtn}>
                        <Icon name="date-range" size={20} color="#666" style={{ marginRight: 8 }} />
                        <Text style={styles.dateInputText}>{endDate.toLocaleDateString()}</Text>
                        <Text style={styles.dateInputLabel}>End</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );



    return (
        <ScreenWrapper style={{ backgroundColor: isDarkMode ? '#000000' : '#F5F7FA' }}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.logoCircle}>
                        <Text style={{ fontSize: 16 }}>☀️</Text>
                    </View>
                    <Text style={styles.headerTitle}>AAGAH</Text>
                    <View style={styles.safeBadge}>
                        <Text style={styles.safeText}>SAFE</Text>
                    </View>
                </View>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>A</Text>
                    <View style={styles.avatarDot} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Machine Selection Card */}
                {/* Machine Selection Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Device Connection</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, { backgroundColor: '#F0F2F5', color: '#555' }]}
                            value={inputValue}
                            editable={false}
                            placeholder="Device ID"
                            placeholderTextColor="#999"
                        />
                        {/* Display Current Depth instead of Connect Button */}
                        <View style={styles.currentDepthContainer}>
                            <Text style={styles.currentDepthLabel}>Current Depth</Text>
                            <Text style={styles.currentDepthValue}>
                                {depthData?.originalData?.length > 0
                                    ? `${depthData.originalData[depthData.originalData.length - 1].calculatedValue?.toFixed(2)}m`
                                    : '--'}
                            </Text>
                        </View>
                    </View>

                    <View style={{ marginTop: 4, marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>
                            Last Updated: {depthData?.originalData?.length > 0
                                ? new Date(depthData.originalData[depthData.originalData.length - 1].timestamp).toLocaleString()
                                : 'N/A'}
                        </Text>
                    </View>

                    {isConnected && (
                        <View style={styles.successMessage}>
                            <Icon name="check-circle" size={18} color="#4CAF50" />
                            <Text style={styles.successText}>Connected: <Text style={{ fontWeight: 'bold' }}>{connectedDevice}</Text></Text>
                        </View>
                    )}

                    {/* Device Location Info */}
                    {deviceInfo && (
                        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="location-on" size={16} color="#666" />
                            <Text style={{ marginLeft: 4, color: '#444' }}>
                                Location: {deviceInfo.latitude}, {deviceInfo.longitude} ({deviceInfo.owner_name})
                            </Text>
                        </View>
                    )}
                </View>

                {/* Status Cards */}
                <View style={styles.statusRow}>
                    <View style={[styles.statusCard, {
                        backgroundColor: (deviceInfo?.safety_score * 100) < 30 ? '#b71c1c' : // Extreme Danger
                            (deviceInfo?.safety_score * 100) < 50 ? '#ef5350' : // Warning
                                (deviceInfo?.safety_score * 100) < 80 ? '#ff9800' : // Watch
                                    '#43A047' // Safe
                    }]}>
                        <Text style={styles.statusLabelLight}>Status</Text>
                        <Text style={styles.statusValueLight}>{
                            (deviceInfo?.safety_score * 100) < 30 ? 'EXTREME' :
                                (deviceInfo?.safety_score * 100) < 50 ? 'WARNING' :
                                    (deviceInfo?.safety_score * 100) < 80 ? 'WATCH' : 'SAFE'
                        }</Text>
                        <Text style={styles.statusSubLight}>
                            {(deviceInfo?.safety_score * 100) < 30 ? 'Immediate Action Req.' :
                                (deviceInfo?.safety_score * 100) < 50 ? 'High Risk Level' :
                                    (deviceInfo?.safety_score * 100) < 80 ? 'Monitor Closely' : 'System Secure'}
                        </Text>
                    </View>
                    <View style={[styles.statusCard, { backgroundColor: '#66BB6A' }]}>
                        <Text style={styles.statusLabelLight}>Safety Score</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={styles.statusValueLight}>{deviceInfo ? Math.round(parseFloat(deviceInfo.safety_score) * 100) : '--'}</Text>
                            <Text style={styles.statusSubLight}>/100</Text>
                        </View>
                        <Text style={styles.statusSubLight}>
                            {deviceInfo ? (
                                (deviceInfo.safety_score * 100) < 30 ? 'Critical Condition' :
                                    (deviceInfo.safety_score * 100) < 50 ? 'Poor Condition' :
                                        (deviceInfo.safety_score * 100) < 80 ? 'Fair Condition' : 'Optimal Conditions'
                            ) : 'No Data'}
                        </Text>
                    </View>
                </View>

                {/* DEPTH SECTION */}
                {DEVICE_TYPE === 'admin' && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Water Level Analysis</Text>
                            <TouchableOpacity onPress={() => exportCSV('depth')} style={styles.exportButton}>
                                <Icon name="cloud-download" size={20} color="#2E7D32" />
                                <Text style={styles.exportText}>CSV</Text>
                            </TouchableOpacity>
                        </View>

                        <TimeRangeSelector
                            type="depth"
                            currentRange={depthTimeRange}
                            showCustom={showDepthCustom}
                            startDate={depthStartDate}
                            endDate={depthEndDate}
                        />

                        <View style={styles.card}>
                            {isDepthLoading ? (
                                <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 40 }} />
                            ) : depthData ? (
                                <View>
                                    {renderTooltip(depthTooltip)}
                                    <LineChart
                                        data={depthData}
                                        width={screenWidth - 48} // card padding (16*2) + margin (16)
                                        height={240}
                                        chartConfig={chartConfig}
                                        bezier
                                        xLabelsOffset={5}
                                        onDataPointClick={({ value, x, y, index }) => {
                                            const pointData = depthData.originalData[index];
                                            const dateLabel = pointData ? new Date(pointData.timestamp).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';

                                            setDepthTooltip({ value: value.toFixed(2), x, y, date: dateLabel, type: 'depth' });
                                        }}
                                        style={styles.chartStyle}
                                    />
                                    <Text style={styles.chartSubtitle}>{depthData?.originalData?.length || 0} Measurement Points</Text>
                                </View>
                            ) : (
                                <Text style={styles.noDataText}>No Data Available</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* VELOCITY SECTION */}
                {DEVICE_TYPE === 'admin' && (
                    <View style={[styles.sectionContainer, { marginTop: 24 }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Velocity Analysis</Text>
                            <TouchableOpacity onPress={() => exportCSV('velocity')} style={styles.exportButton}>
                                <Icon name="cloud-download" size={20} color="#2E7D32" />
                                <Text style={styles.exportText}>CSV</Text>
                            </TouchableOpacity>
                        </View>

                        <TimeRangeSelector
                            type="velocity"
                            currentRange={velocityTimeRange}
                            showCustom={showVelocityCustom}
                            startDate={velocityStartDate}
                            endDate={velocityEndDate}
                        />

                        <View style={styles.card}>
                            {isVelocityLoading ? (
                                <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 40 }} />
                            ) : velocityData ? (
                                <View>
                                    {renderTooltip(velocityTooltip)}
                                    <LineChart
                                        data={velocityData}
                                        width={screenWidth - 48}
                                        height={240}
                                        chartConfig={chartConfig}
                                        bezier
                                        xLabelsOffset={5}
                                        onDataPointClick={({ value, x, y, index }) => {
                                            const pointData = velocityData.originalData[index];
                                            const dateLabel = pointData ? new Date(pointData.timestamp).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';

                                            setVelocityTooltip({ value: value.toFixed(2), x, y, date: dateLabel, type: 'velocity' });
                                        }}
                                        style={styles.chartStyle}
                                    />
                                    <Text style={styles.chartSubtitle}>{velocityData?.originalData?.length || 0} Measurement Points</Text>
                                </View>
                            ) : (
                                <Text style={styles.noDataText}>No Data Available</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* MEDIA SECTION */}
                <View style={[styles.sectionContainer, { marginTop: 24 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Device Media</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            {/* Date Selector */}
                            <TouchableOpacity
                                onPress={() => setPickerMode('mediaDate')}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#F5F7FA',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginRight: 8,
                                    borderWidth: 1,
                                    borderColor: '#E0E0E0',
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                }}
                            >
                                <Icon name="date-range" size={20} color="#666" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#333', fontWeight: '500' }}>
                                    {mediaDate.toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>

                            {/* Type Selector */}
                            <View style={{
                                flex: 1,
                                flexDirection: 'row',
                                backgroundColor: '#F5F7FA',
                                borderRadius: 8,
                                padding: 4,
                                marginLeft: 8
                            }}>
                                <TouchableOpacity
                                    onPress={() => setMediaType('image')}
                                    style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: mediaType === 'image' ? '#White' : 'transparent',
                                        borderRadius: 6,
                                        elevation: mediaType === 'image' ? 2 : 0,
                                        backgroundColor: mediaType === 'image' ? '#FFF' : 'transparent'
                                    }}
                                >
                                    <Text style={{
                                        color: mediaType === 'image' ? '#43A047' : '#666',
                                        fontWeight: mediaType === 'image' ? 'bold' : 'normal'
                                    }}>Image</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setMediaType('video')}
                                    style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 6,
                                        elevation: mediaType === 'video' ? 2 : 0,
                                        backgroundColor: mediaType === 'video' ? '#FFF' : 'transparent'
                                    }}
                                >
                                    <Text style={{
                                        color: mediaType === 'video' ? '#43A047' : '#666',
                                        fontWeight: mediaType === 'video' ? 'bold' : 'normal'
                                    }}>Video</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Media Grid */}
                        {isMediaLoading ? (
                            <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 40 }} />
                        ) : mediaData && mediaData.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                {mediaData.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => mediaType === 'video' ? setSelectedVideo(item.url) : Linking.openURL(item.url)}
                                        style={{
                                            width: '48%',
                                            aspectRatio: 1,
                                            marginBottom: 12,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            backgroundColor: '#eee',
                                            position: 'relative'
                                        }}
                                    >
                                        {mediaType === 'image' ? (
                                            <Image
                                                source={{ uri: item.url }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
                                                <Icon name="play-circle-outline" size={48} color="white" />
                                                <Text style={{ color: 'white', marginTop: 8, fontSize: 10, textAlign: 'center' }}>{item.filename}</Text>
                                            </View>
                                        )}
                                        <View style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            backgroundColor: 'rgba(0,0,0,0.6)',
                                            padding: 4
                                        }}>
                                            <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>
                                                {item.recorded_at_ist ? item.recorded_at_ist.split(' ')[1] + ' ' + item.recorded_at_ist.split(' ')[2] : (item.timestamp || 'Unknown')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                <Icon name="perm-media" size={48} color="#ccc" />
                                <Text style={styles.noDataText}>No Media Found</Text>
                            </View>
                        )}
                    </View>
                </View>

            </ScrollView>

            <DatePicker
                modal
                open={pickerMode === 'depthStart'}
                date={depthStartDate}
                mode="date"
                onConfirm={(date) => { setPickerMode(null); setDepthStartDate(date); }}
                onCancel={() => setPickerMode(null)}
            />
            <DatePicker
                modal
                open={pickerMode === 'depthEnd'}
                date={depthEndDate}
                mode="date"
                onConfirm={(date) => { setPickerMode(null); setDepthEndDate(date); }}
                onCancel={() => setPickerMode(null)}
            />
            <DatePicker
                modal
                open={pickerMode === 'velocityStart'}
                date={velocityStartDate}
                mode="date"
                onConfirm={(date) => { setPickerMode(null); setVelocityStartDate(date); }}
                onCancel={() => setPickerMode(null)}
            />
            <DatePicker
                modal
                open={pickerMode === 'velocityEnd'}
                date={velocityEndDate}
                mode="date"
                onConfirm={(date) => { setPickerMode(null); setVelocityEndDate(date); }}
                onCancel={() => setPickerMode(null)}
            />
            <DatePicker
                modal
                open={pickerMode === 'mediaDate'}
                date={mediaDate}
                mode="date"
                onConfirm={(date) => { setPickerMode(null); setMediaDate(date); }}
                onCancel={() => setPickerMode(null)}
            />

            <Modal
                visible={!!selectedVideo}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedVideo(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }}
                        onPress={() => setSelectedVideo(null)}
                    >
                        <Icon name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {selectedVideo && (
                        <Video
                            source={{ uri: selectedVideo }}
                            style={{ width: '100%', height: 300 }}
                            controls={true}
                            resizeMode="contain"
                            onEnd={() => console.log('Video ended')}
                            onError={(e) => console.error('Video error:', e)}
                        />
                    )}
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#43A047',
        elevation: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
        marginRight: 10,
    },
    safeBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    safeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        elevation: 2,
    },
    avatarText: {
        color: '#43A047',
        fontWeight: 'bold',
        fontSize: 16,
    },
    avatarDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4CAF50',
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    content: {
        padding: 16,
        paddingBottom: 50,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        borderRadius: 10,
        paddingHorizontal: 16,
        height: 50, // Slightly taller
        marginRight: 10,
        color: '#333',
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    // New Styles for Current Depth Display
    currentDepthContainer: {
        height: 50,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'flex-end',
        backgroundColor: '#E8F5E9', // Light Green background
        borderRadius: 10,
        minWidth: 100,
    },
    currentDepthLabel: {
        fontSize: 10,
        color: '#2E7D32',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    currentDepthValue: {
        fontSize: 18,
        color: '#1B5E20',
        fontWeight: 'bold',
    },
    // Styles for removed Connect Button kept in case rollback needed, or can be removed.
    connectButton: {
        backgroundColor: '#43A047',
        paddingHorizontal: 20,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        elevation: 2,
    },
    connectText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
    successMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        padding: 8,
    },
    successText: {
        color: '#4CAF50',
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '500',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statusCard: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        minHeight: 120,
        justifyContent: 'space-between',
        elevation: 4,
    },
    statusLabelLight: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusValueLight: {
        color: 'white',
        fontSize: 28,
        fontWeight: '800',
        marginVertical: 4,
    },
    statusSubLight: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '500',
    },
    sectionContainer: {
        marginTop: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    exportText: {
        color: '#2E7D32',
        fontWeight: '600',
        fontSize: 12,
        marginLeft: 6,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F5F7FA',
        borderRadius: 12,
        padding: 4,
        marginBottom: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentBtnActive: {
        backgroundColor: '#FFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        color: '#666',
        fontSize: 13,
        fontWeight: '500',
    },
    segmentTextActive: {
        color: '#2E7D32',
        fontWeight: '700',
    },
    customDateContainer: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateInputBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        padding: 10,
        position: 'relative',
    },
    dateInputText: {
        color: '#333',
        fontSize: 13,
        fontWeight: '500',
    },
    dateInputLabel: {
        position: 'absolute',
        top: -8,
        left: 10,
        backgroundColor: 'white',
        paddingHorizontal: 4,
        fontSize: 10,
        color: '#999',
    },
    chartStyle: {
        marginVertical: 8,
        borderRadius: 16,
    },
    chartSubtitle: {
        textAlign: 'center',
        color: '#999',
        fontSize: 11,
        marginTop: 4,
    },
    noDataText: {
        textAlign: 'center',
        padding: 30,
        color: '#666',
        fontSize: 14,
    }
});

export default ViewDataScreen;
