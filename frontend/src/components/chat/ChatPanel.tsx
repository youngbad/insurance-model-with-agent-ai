import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, TextField, IconButton, Typography, Paper, CircularProgress,
  Divider, Tooltip, Avatar, Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from '../../hooks/useSession';
import { streamChat, getBulkSuggestions } from '../../services/api';
import type { ChatMessage } from '../../types';

const STARTER_MESSAGES = [
  "What is a good loss ratio for my industry?",
  "Explain my risk score",
  "How can I reduce my premium?",
  "What risk categories apply to manufacturing?",
];

export default function ChatPanel() {
  const {
    sessionId,
    chatMessages,
    addChatMessage,
    updateLastAssistantMessage,
    generalInfo,
    setGeneralInfo,
    setHistoricalExperience,
    setExposure,
  } = useSession();

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !sessionId || isStreaming) return;
      setInput('');

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: text.trim(),
      };
      addChatMessage(userMsg);

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
      };
      addChatMessage(assistantMsg);

      let accumulated = '';
      setIsStreaming(true);

      abortRef.current = streamChat(
        sessionId,
        text.trim(),
        (chunk) => {
          accumulated += chunk;
          updateLastAssistantMessage(accumulated);
        },
        () => {
          setIsStreaming(false);
        },
        (err) => {
          updateLastAssistantMessage(`Error: ${err}`);
          setIsStreaming(false);
        }
      );
    },
    [sessionId, isStreaming, addChatMessage, updateLastAssistantMessage]
  );

  const handleSuggestAll = useCallback(async () => {
    if (!sessionId) return;
    setIsSuggesting(true);
    try {
      const suggestions = await getBulkSuggestions(sessionId, {
        industry: generalInfo.industry,
      });
      suggestions.forEach((s) => {
        if (s.suggested_value === null) return;
        const fieldMapping: Record<string, () => void> = {
          loss_ratio: () => setHistoricalExperience({ loss_ratio: s.suggested_value as number }),
          claim_frequency: () => setHistoricalExperience({ claim_frequency: s.suggested_value as number }),
          past_claims_count: () => setHistoricalExperience({ past_claims_count: s.suggested_value as number }),
          operational_complexity_score: () => setExposure({ operational_complexity_score: s.suggested_value as number }),
          locations: () => setExposure({ locations: s.suggested_value as number }),
          assets_value: () => setExposure({ assets_value: s.suggested_value as number }),
        };
        fieldMapping[s.field]?.();
      });

      const industry = generalInfo.industry || 'general industry';
      const summaryMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `✅ I've filled in ${suggestions.filter((s) => s.suggested_value !== null).length} field suggestions based on ${industry} benchmarks. Review and adjust as needed before saving.`,
      };
      addChatMessage(summaryMsg);
    } catch (err) {
      console.error('Bulk suggest error:', err);
    }
    setIsSuggesting(false);
  }, [sessionId, generalInfo, addChatMessage, setHistoricalExperience, setExposure]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
    const isUser = msg.role === 'user';
    return (
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'flex-start',
          flexDirection: isUser ? 'row-reverse' : 'row',
          mb: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            flexShrink: 0,
          }}
        >
          {isUser ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
        </Avatar>
        <Paper
          elevation={0}
          sx={{
            maxWidth: '85%',
            px: 1.5,
            py: 1,
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
            borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
          }}
        >
          {isUser ? (
            <Typography variant="body2">{msg.content}</Typography>
          ) : (
            <Box sx={{ fontSize: '0.875rem', '& p': { margin: '4px 0' }, '& code': { bgcolor: 'rgba(0,0,0,0.08)', px: 0.5, borderRadius: 0.5 } }}>
              {msg.content ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption">Thinking...</Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon color="secondary" />
          <Typography variant="subtitle1" fontWeight="bold">AI Insurance Assistant</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Ask me anything about insurance risk, your inputs, or for suggestions.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Tooltip title="Auto-fill form fields with AI-suggested values based on your industry">
            <Chip
              icon={isSuggesting ? <CircularProgress size={14} /> : <AutoFixHighIcon fontSize="small" />}
              label="Suggest All Values"
              onClick={handleSuggestAll}
              color="secondary"
              variant="outlined"
              size="small"
              clickable
              disabled={isSuggesting}
            />
          </Tooltip>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {chatMessages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <SmartToyIcon sx={{ fontSize: 48, color: 'secondary.light', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Hi! I'm your insurance AI assistant.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Try asking:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
              {STARTER_MESSAGES.map((msg) => (
                <Chip
                  key={msg}
                  label={msg}
                  onClick={() => sendMessage(msg)}
                  variant="outlined"
                  size="small"
                  sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}
        {chatMessages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            multiline
            maxRows={4}
            placeholder="Ask a question or request help..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <IconButton
            color="primary"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
