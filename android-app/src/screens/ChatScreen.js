/**
 * ChatScreen - Main chat interface
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';

import {useSettings} from '../context/SettingsContext';
import {useChat} from '../context/ChatContext';
import {
  classifyQuery,
  chatStream,
  chat,
  getTierInfo,
  setBaseUrl,
  checkConnection,
} from '../services/apiService';

export default function ChatScreen() {
  const {settings} = useSettings();
  const {
    messages,
    addMessage,
    updateLastMessage,
    clearMessages,
    getTierHistory,
    addToTierHistory,
    saveCurrentConversation,
  } = useChat();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const flatListRef = useRef(null);

  useEffect(() => {
    setBaseUrl(settings.serverUrl);
    checkServerConnection();
  }, [settings.serverUrl]);

  const checkServerConnection = async () => {
    setConnectionStatus('checking');
    const isConnected = await checkConnection();
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to UI
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });
    scrollToBottom();

    try {
      // Determine tier and temperature
      let difficulty, temperature, reason;

      if (settings.forceMode !== 'auto') {
        difficulty = settings.forceMode;
        temperature = settings.fixedTemperature ?? 0.7;
        reason = `Forced: ${settings.forceMode}`;
      } else {
        const classification = await classifyQuery(userMessage, settings.routerModel);
        difficulty = classification.difficulty;
        temperature = settings.fixedTemperature ?? classification.temperature;
        reason = classification.reason;
      }

      const tierInfo = getTierInfo(difficulty, settings);
      setCurrentTier({...tierInfo, reason, temperature});

      // Add placeholder for AI response
      const aiMessageId = (Date.now() + 1).toString();
      addMessage({
        id: aiMessageId,
        role: 'assistant',
        content: '',
        tier: tierInfo,
        reason,
        temperature,
        timestamp: new Date().toISOString(),
      });
      scrollToBottom();

      // Get tier history and add user message
      const tierHistory = getTierHistory(difficulty);
      const messagesForApi = [...tierHistory, {role: 'user', content: userMessage}];
      addToTierHistory(difficulty, {role: 'user', content: userMessage});

      // Stream response
      let fullResponse = '';
      
      await chatStream(
        messagesForApi,
        tierInfo.model,
        temperature,
        (chunk, accumulated) => {
          fullResponse = accumulated;
          updateLastMessage(accumulated);
          scrollToBottom();
        },
        (finalResponse) => {
          addToTierHistory(difficulty, {role: 'assistant', content: finalResponse});
        },
        (error) => {
          throw error;
        },
      );
    } catch (error) {
      console.error('Chat error:', error);
      updateLastMessage(`❌ Error: ${error.message}\n\nMake sure Ollama is running and accessible at ${settings.serverUrl}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Chat',
      'Do you want to save this conversation before clearing?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear Without Saving',
          style: 'destructive',
          onPress: clearMessages,
        },
        {
          text: 'Save & Clear',
          onPress: async () => {
            await saveCurrentConversation();
            clearMessages();
          },
        },
      ],
    );
  };

  const renderMessage = ({item}) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}>
        {!isUser && item.tier && (
          <View style={[styles.tierBadge, {backgroundColor: item.tier.color}]}>
            <Text style={styles.tierText}>
              {item.tier.emoji} {item.tier.label} | temp={item.temperature?.toFixed(2)}
            </Text>
            {item.reason && (
              <Text style={styles.reasonText}>{item.reason}</Text>
            )}
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {isUser ? (
            <Text style={styles.userText}>{item.content}</Text>
          ) : item.content ? (
            <Markdown style={markdownStyles}>{item.content}</Markdown>
          ) : (
            <ActivityIndicator size="small" color="#6366f1" />
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>🎓 ABalancedTeacher</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={checkServerConnection} style={styles.headerButton}>
            <Icon
              name={connectionStatus === 'connected' ? 'cloud-done' : 'cloud-off'}
              size={24}
              color={connectionStatus === 'connected' ? '#22c55e' : '#ef4444'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
            <Icon name="delete-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.tierLegend}>
        <View style={[styles.legendItem, {backgroundColor: '#dcfce7'}]}>
          <Text style={{color: '#22c55e'}}>🚀 Fast</Text>
        </View>
        <View style={[styles.legendItem, {backgroundColor: '#fef3c7'}]}>
          <Text style={{color: '#eab308'}}>⚡ Good</Text>
        </View>
        <View style={[styles.legendItem, {backgroundColor: '#ede9fe'}]}>
          <Text style={{color: '#8b5cf6'}}>🧠 Strong</Text>
        </View>
      </View>

      {settings.forceMode !== 'auto' && (
        <View style={styles.forceModeIndicator}>
          <Text style={styles.forceModeText}>
            Mode: {settings.forceMode.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      {renderHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🦉</Text>
            <Text style={styles.emptyTitle}>Ask me anything!</Text>
            <Text style={styles.emptySubtitle}>
              The AI router will automatically select{'\n'}the best teacher and creativity level.
            </Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={2000}
          editable={!isLoading}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="send" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  tierLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  legendItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  forceModeIndicator: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  forceModeText: {
    color: '#92400e',
    fontWeight: '600',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  tierText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reasonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userText: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#1f2937',
  },
  sendButton: {
    backgroundColor: '#6366f1',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
});

const markdownStyles = {
  body: {
    color: '#1f2937',
    fontSize: 16,
  },
  heading1: {
    color: '#111827',
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  heading2: {
    color: '#1f2937',
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  code_inline: {
    backgroundColor: '#f3f4f6',
    color: '#be185d',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#1f2937',
    color: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fence: {
    backgroundColor: '#1f2937',
    color: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
  },
  link: {
    color: '#6366f1',
  },
  blockquote: {
    backgroundColor: '#f3f4f6',
    borderLeftColor: '#6366f1',
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginVertical: 8,
  },
};
