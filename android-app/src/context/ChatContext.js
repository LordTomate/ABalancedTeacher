/**
 * Chat Context - Manages chat history and conversations
 */

import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatContext = createContext();

export function ChatProvider({children}) {
  // Separate histories for each tier
  const [histories, setHistories] = useState({
    fast: [],
    normal: [],
    strong: [],
  });

  // Current conversation (displayed in UI)
  const [messages, setMessages] = useState([]);
  
  // Saved conversations for history view
  const [savedConversations, setSavedConversations] = useState([]);

  useEffect(() => {
    loadSavedConversations();
  }, []);

  const loadSavedConversations = async () => {
    try {
      const stored = await AsyncStorage.getItem('conversations');
      if (stored) {
        setSavedConversations(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const updateLastMessage = (content) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content,
      };
      return updated;
    });
  };

  const clearMessages = () => {
    setMessages([]);
    setHistories({fast: [], normal: [], strong: []});
  };

  const getTierHistory = (tier) => histories[tier] || [];

  const addToTierHistory = (tier, message) => {
    setHistories(prev => ({
      ...prev,
      [tier]: [...(prev[tier] || []), message],
    }));
  };

  const saveCurrentConversation = async (title = null) => {
    if (messages.length === 0) return;

    const conversation = {
      id: Date.now().toString(),
      title: title || messages[0]?.content?.substring(0, 50) || 'Conversation',
      messages: [...messages],
      timestamp: new Date().toISOString(),
    };

    const updated = [conversation, ...savedConversations];
    setSavedConversations(updated);

    try {
      await AsyncStorage.setItem('conversations', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const loadConversation = (id) => {
    const conversation = savedConversations.find(c => c.id === id);
    if (conversation) {
      setMessages(conversation.messages);
    }
  };

  const deleteConversation = async (id) => {
    const updated = savedConversations.filter(c => c.id !== id);
    setSavedConversations(updated);

    try {
      await AsyncStorage.setItem('conversations', JSON.stringify(updated));
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const clearAllConversations = async () => {
    setSavedConversations([]);
    try {
      await AsyncStorage.removeItem('conversations');
    } catch (error) {
      console.error('Error clearing conversations:', error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        updateLastMessage,
        clearMessages,
        histories,
        getTierHistory,
        addToTierHistory,
        savedConversations,
        saveCurrentConversation,
        loadConversation,
        deleteConversation,
        clearAllConversations,
      }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
