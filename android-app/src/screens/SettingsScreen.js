/**
 * SettingsScreen - App configuration
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';

import {useSettings} from '../context/SettingsContext';
import {checkConnection, listModels, setBaseUrl} from '../services/apiService';

export default function SettingsScreen() {
  const {settings, updateSettings, resetSettings} = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [availableModels, setAvailableModels] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleCheckConnection = async () => {
    setIsChecking(true);
    setBaseUrl(localSettings.serverUrl);
    const connected = await checkConnection();
    setConnectionStatus(connected ? 'connected' : 'failed');

    if (connected) {
      const models = await listModels();
      setAvailableModels(models);
    } else {
      setAvailableModels([]);
    }
    setIsChecking(false);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    Alert.alert('Success', 'Settings saved successfully!');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetSettings();
            setLocalSettings({
              serverUrl: 'http://10.0.2.2:11434',
              routerModel: 'qwen2.5:1.5b',
              fastModel: 'quick-tutor',
              normalModel: 'balanced-tutor',
              strongModel: 'deep-tutor',
              forceMode: 'auto',
              fixedTemperature: null,
              darkMode: false,
            });
          },
        },
      ],
    );
  };

  const ForceModeButton = ({mode, label, emoji}) => (
    <TouchableOpacity
      style={[
        styles.forceModeButton,
        localSettings.forceMode === mode && styles.forceModeButtonActive,
      ]}
      onPress={() => setLocalSettings({...localSettings, forceMode: mode})}>
      <Text
        style={[
          styles.forceModeButtonText,
          localSettings.forceMode === mode && styles.forceModeButtonTextActive,
        ]}>
        {emoji} {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Connection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔌 Server Connection</Text>
        
        <Text style={styles.label}>Ollama Server URL</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, {flex: 1}]}
            value={localSettings.serverUrl}
            onChangeText={url => setLocalSettings({...localSettings, serverUrl: url})}
            placeholder="http://10.0.2.2:11434"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.checkButton}
            onPress={handleCheckConnection}
            disabled={isChecking}>
            {isChecking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="refresh" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusRow}>
          <Icon
            name={connectionStatus === 'connected' ? 'check-circle' : 'error'}
            size={20}
            color={connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'failed' ? '#ef4444' : '#9ca3af'}
          />
          <Text style={[
            styles.statusText,
            {color: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'failed' ? '#ef4444' : '#9ca3af'}
          ]}>
            {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'failed' ? 'Connection failed' : 'Not tested'}
          </Text>
        </View>

        {availableModels.length > 0 && (
          <View style={styles.modelsContainer}>
            <Text style={styles.modelsTitle}>Available Models:</Text>
            <Text style={styles.modelsList}>{availableModels.join(', ')}</Text>
          </View>
        )}

        <Text style={styles.hint}>
          💡 For Android Emulator use 10.0.2.2 instead of localhost.{'\n'}
          For physical device, use your computer's IP address.
        </Text>
      </View>

      {/* Model Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Model Configuration</Text>

        <Text style={styles.label}>Router Model</Text>
        <TextInput
          style={styles.input}
          value={localSettings.routerModel}
          onChangeText={v => setLocalSettings({...localSettings, routerModel: v})}
          placeholder="qwen2.5:1.5b"
        />

        <Text style={styles.label}>🚀 Fast Model</Text>
        <TextInput
          style={styles.input}
          value={localSettings.fastModel}
          onChangeText={v => setLocalSettings({...localSettings, fastModel: v})}
          placeholder="quick-tutor"
        />

        <Text style={styles.label}>⚡ Normal Model</Text>
        <TextInput
          style={styles.input}
          value={localSettings.normalModel}
          onChangeText={v => setLocalSettings({...localSettings, normalModel: v})}
          placeholder="balanced-tutor"
        />

        <Text style={styles.label}>🧠 Strong Model</Text>
        <TextInput
          style={styles.input}
          value={localSettings.strongModel}
          onChangeText={v => setLocalSettings({...localSettings, strongModel: v})}
          placeholder="deep-tutor"
        />
      </View>

      {/* Routing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔀 Routing Options</Text>

        <Text style={styles.label}>Force Model Selection</Text>
        <View style={styles.forceModeContainer}>
          <ForceModeButton mode="auto" label="Auto" emoji="🔀" />
          <ForceModeButton mode="fast" label="Fast" emoji="🚀" />
          <ForceModeButton mode="normal" label="Normal" emoji="⚡" />
          <ForceModeButton mode="strong" label="Strong" emoji="🧠" />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Override Temperature</Text>
          <Switch
            value={localSettings.fixedTemperature !== null}
            onValueChange={enabled =>
              setLocalSettings({
                ...localSettings,
                fixedTemperature: enabled ? 0.7 : null,
              })
            }
            trackColor={{false: '#d1d5db', true: '#c7d2fe'}}
            thumbColor={localSettings.fixedTemperature !== null ? '#6366f1' : '#f4f3f4'}
          />
        </View>

        {localSettings.fixedTemperature !== null && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Temperature: {localSettings.fixedTemperature.toFixed(2)}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={localSettings.fixedTemperature}
              onValueChange={v => setLocalSettings({...localSettings, fixedTemperature: v})}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#d1d5db"
              thumbTintColor="#6366f1"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelSmall}>Precise</Text>
              <Text style={styles.sliderLabelSmall}>Creative</Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Icon name="save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Icon name="restore" size={20} color="#ef4444" />
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ABalancedTeacher v1.0.0{'\n'}
          AI-Powered Three-Tier Teaching System
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modelsContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  modelsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  modelsList: {
    fontSize: 12,
    color: '#374151',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
    lineHeight: 18,
  },
  forceModeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  forceModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  forceModeButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  forceModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  forceModeButtonTextActive: {
    color: '#6366f1',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderContainer: {
    marginTop: 8,
  },
  slider: {
    height: 40,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    textAlign: 'center',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelSmall: {
    fontSize: 12,
    color: '#9ca3af',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
