import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../lib/colors";
import { useNavigation } from '@react-navigation/native';


type Message = {
  id: string;
  sender: "ai" | "user";
  text: string;
};

const ChatbotScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hi! I'm Bachat AI — your private, on-device budgeting assistant. How can I help today?",
    },
  ]);

  const navigation = useNavigation();
  const handleBack = () => navigation.goBack();

  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "user", text: input.trim() },
    ]);

    // TODO: Add real on-device AI response logic later
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: "I'm still learning! Soon I'll analyze your spending locally and give smart suggestions.",
        },
      ]);
    }, 600);

    setInput("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>{"‹"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bachat AI</Text>
        </View>

        {/* Chat list */}
        <ScrollView
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} sender={msg.sender} text={msg.text} />
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything..."
            placeholderTextColor={colors.placeholder}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            activeOpacity={0.85}
            onPress={handleSend}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ChatBubble: React.FC<{ sender: "ai" | "user"; text: string }> = ({
  sender,
  text,
}) => {
  const isUser = sender === "user";

  return (
    <View
      style={[
        styles.bubbleWrapper,
        isUser ? styles.bubbleRight : styles.bubbleLeft,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarAi}>
          <Text style={styles.avatarAiText}>🤖</Text>
        </View>
      )}

      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.userBubbleText : styles.aiBubbleText,
          ]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  bubbleWrapper: {
    flexDirection: "row",
    marginBottom: 12,
    maxWidth: "92%",
  },
  bubbleLeft: {
    alignSelf: "flex-start",
  },
  bubbleRight: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  avatarAi: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarAiText: {
    fontSize: 16,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aiBubble: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  bubbleText: {
    fontSize: 14,
  },
  aiBubbleText: {
    color: colors.textPrimary,
  },
  userBubbleText: {
    color: "#FFFFFF",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    color: colors.textPrimary,
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
});

export default ChatbotScreen;
