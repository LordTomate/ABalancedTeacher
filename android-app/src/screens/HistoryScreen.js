/**
 * HistoryScreen - View and manage saved conversations
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';

import {useChat} from '../context/ChatContext';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const {savedConversations, loadConversation, deleteConversation, clearAllConversations} = useChat();

  const handleLoadConversation = (id) => {
    loadConversation(id);
    navigation.navigate('Chat');
  };

  const handleDelete = (id, title) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConversation(id),
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all saved conversations. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: clearAllConversations,
        },
      ],
    );
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderConversation = ({item}) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleLoadConversation(item.id)}>
      <View style={styles.conversationContent}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.conversationMeta}>
          {item.messages.length} messages • {formatDate(item.timestamp)}
        </Text>
        {item.messages[item.messages.length - 1] && (
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.messages[item.messages.length - 1].content}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.title)}>
        <Icon name="delete-outline" size={24} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {savedConversations.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {savedConversations.length} saved conversation{savedConversations.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={savedConversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={savedConversations.length === 0 ? styles.emptyContainer : null}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Icon name="history" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No saved conversations</Text>
            <Text style={styles.emptySubtitle}>
              Your conversation history will appear here.{'\n'}
              Save conversations from the chat screen.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  clearAllText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  conversationMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  deleteButton: {
    padding: 8,
  },
});
