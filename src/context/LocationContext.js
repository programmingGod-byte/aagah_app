import React, { createContext, useState, useContext } from 'react';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const [location, setLocation] = useState(null); // { latitude, longitude }
    const [permissionStatus, setPermissionStatus] = useState('undetermined');

    const updateLocation = (lat, lng) => {
        setLocation({ latitude: lat, longitude: lng });
    };

    return (
        <LocationContext.Provider
            value={{
                location,
                setLocation: updateLocation,
                permissionStatus,
                setPermissionStatus
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => useContext(LocationContext);
