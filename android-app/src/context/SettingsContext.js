/**
 * Settings Context - Global settings management
 */

import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  serverUrl: 'http://10.0.2.2:11434', // Android emulator localhost
  routerModel: 'qwen2.5:1.5b',
  fastModel: 'quick-tutor',
  normalModel: 'balanced-tutor',
  strongModel: 'deep-tutor',
  forceMode: 'auto', // 'auto', 'fast', 'normal', 'strong'
  fixedTemperature: null, // null = AI decides, or 0.0-1.0
  darkMode: false,
};

export function SettingsProvider({children}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('settings');
      if (stored) {
        setSettings({...DEFAULT_SETTINGS, ...JSON.parse(stored)});
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setLoaded(true);
  };

  const updateSettings = async (newSettings) => {
    const updated = {...settings, ...newSettings};
    setSettings(updated);
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await AsyncStorage.removeItem('settings');
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{settings, updateSettings, resetSettings, loaded}}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
