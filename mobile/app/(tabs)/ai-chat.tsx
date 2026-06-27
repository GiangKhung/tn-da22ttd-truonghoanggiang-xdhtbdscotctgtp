import { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { sendAiChatMessage, type ChatMessage } from '@/api/public';

const SUGGESTIONS = [
  'Bao lâu thì cần bảo dưỡng định kỳ?',
  'Xe kêu két két khi phanh là bị sao?',
  'Xe xả khói đen có nguy hiểm không?',
  'Giá dịch vụ đồng sơn tại gara thế nào?',
];

function renderParsedContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let isBullet = false;
    let cleanLine = line;
    
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      isBullet = true;
      cleanLine = line.trim().replace(/^[-*]\s+/, '');
    }

    const parts = cleanLine.split('**');
    const renderedParts = parts.map((part, partIdx) => {
      const isBold = partIdx % 2 === 1;
      return (
        <Text
          key={partIdx}
          style={isBold ? { fontWeight: '700', color: colors.text } : {}}
        >
          {part}
        </Text>
      );
    });

    return (
      <Text key={lineIdx} style={styles.contentText}>
        {isBullet && <Text style={styles.bulletSymbol}>• </Text>}
        {renderedParts}
      </Text>
    );
  });
}

export default function AiChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Dạ, Gara Trường Phát xin chào anh/chị!\n\nEm là Trợ lý ảo AI được huấn luyện để chẩn đoán các sự cố xe ô tô và tư vấn các gói dịch vụ sửa chữa, bảo dưỡng tại Gara.\n\nAnh/chị đang gặp vấn đề gì với xế yêu của mình ạ?',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    setInputText('');
    const newMessages = [...messages, { role: 'user', content: text } as ChatMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Send chat history (excluding welcome message if it's too long, but we send everything)
      const res = await sendAiChatMessage(newMessages);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply } as ChatMessage,
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Dạ, hệ thống tư vấn đang gặp lỗi kết nối tạm thời. Anh/chị vui lòng thử lại sau hoặc gọi hotline **0909 123 456** để nhận tư vấn trực tiếp nhanh nhất ạ!',
        } as ChatMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* Bot Info Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Trợ lý AI Trường Phát</Text>
          <Text style={styles.headerSubtitle}>Tự động chẩn đoán & Báo giá nhanh</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperBot]}>
              {!isUser && (
                <View style={styles.msgAvatar}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>AI</Text>
                </View>
              )}
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                {isUser ? (
                  <Text style={styles.bubbleUserText}>{item.content}</Text>
                ) : (
                  <View style={{ gap: 2 }}>
                    {renderParsedContent(item.content)}
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubbleWrapper, styles.bubbleWrapperBot]}>
              <View style={styles.msgAvatar}>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>AI</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleBot, styles.bubbleLoading]}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.loadingText}>AI đang chẩn đoán...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Suggestions Box */}
      {messages.length === 1 && !loading && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Câu hỏi thường gặp:</Text>
          <View style={styles.chipsWrapper}>
            {SUGGESTIONS.map((s, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleSend(s.replace(/^[^a-zA-Z0-9\s]+\s+/, ''))}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Chat Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Nhập câu hỏi của bạn (VD: thay dầu bao nhiêu tiền...)"
          placeholderTextColor={colors.textSubtle}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend(inputText)}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.sendBtnText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(197, 168, 128, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: { fontSize: 12, color: colors.accent, fontWeight: '700' },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  messageList: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    maxWidth: '85%',
    gap: spacing.sm,
  },
  bubbleWrapperUser: {
    alignSelf: 'flex-end',
  },
  bubbleWrapperBot: {
    alignSelf: 'flex-start',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    flexShrink: 1,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderBottomRightRadius: 2,
  },
  bubbleBot: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderBottomLeftRadius: 2,
  },
  bubbleUserText: {
    fontSize: 14,
    color: colors.primaryFg,
    lineHeight: 20,
  },
  contentLineWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2.5,
  },
  bulletSymbol: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  contentText: {
    fontSize: 13.5,
    color: '#f1f5f9',
    lineHeight: 19.5,
    marginVertical: 2,
  },
  bubbleLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  chipText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: colors.primaryFg,
    fontSize: 13,
    fontWeight: '700',
  },
});
