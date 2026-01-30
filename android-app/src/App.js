/**
 * ABalancedTeacher - AI-Powered Three-Tier Teaching System
 * Main App Component with Navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import ChatScreen from './screens/ChatScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ChatStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#6366f1' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}>
            <Stack.Screen
                name="ChatMain"
                component={ChatScreen}
                options={{ title: '🎓 ABalancedTeacher' }}
            />
        </Stack.Navigator>
    );
}

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Chat') {
                        iconName = 'chat';
                    } else if (route.name === 'History') {
                        iconName = 'history';
                    } else if (route.name === 'Settings') {
                        iconName = 'settings';
                    }
                    return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            })}>
            <Tab.Screen name="Chat" component={ChatStack} />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: '#6366f1' },
                    headerTintColor: '#fff',
                    title: '📚 History',
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: '#6366f1' },
                    headerTintColor: '#fff',
                    title: '⚙️ Settings',
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    return (
        <SettingsProvider>
            <ChatProvider>
                <NavigationContainer>
                    <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
                    <MainTabs />
                </NavigationContainer>
            </ChatProvider>
        </SettingsProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
