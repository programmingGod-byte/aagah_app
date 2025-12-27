const base = {
    primary: '#43A047', // Green
    secondary: '#81C784',
    danger: '#F44336',
    success: '#4CAF50',
    gradientStart: '#66BB6A',
    gradientEnd: '#43A047',
};

export const lightColors = {
    ...base,
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    icon: '#1A237E',
    inputBackground: '#F0F0F0',
    shadow: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18, // Reduced opacity
        shadowRadius: 1.0,
    }
};

export const darkColors = {
    ...base,
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#333333',
    icon: '#BBDEFB',
    inputBackground: '#2C2C2C',
    shadow: {
        elevation: 0, // No elevation in dark mode usually looks better
        shadowColor: 'transparent',
        borderWidth: 1, // Use border instead of shadow for separation
        borderColor: '#333333',
    }
};

export const colors = lightColors; // Default export for backwards compatibility if needed during migration


export const fonts = {
    regular: 'System', // Use system font for now
    bold: 'System',
    medium: 'System',
};

export const spacing = {
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
};
