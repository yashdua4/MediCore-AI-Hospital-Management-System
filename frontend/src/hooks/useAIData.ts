import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export function useAiConversationsQuery(role?: string) {
  return useQuery({
    queryKey: ['ai-conversations', role],
    queryFn: async () => {
      const { data } = await apiClient.get('/ai/conversations', { params: { role } });
      return data.data || [];
    },
  });
}

export function useAiConversationDetailsQuery(conversationId: string | null) {
  return useQuery({
    queryKey: ['ai-conversation-details', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data } = await apiClient.get(`/ai/conversations/${conversationId}`);
      return data.data;
    },
    enabled: !!conversationId,
  });
}

export function useAiSendMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, prompt }: { conversationId?: string; prompt: string }) => {
      const { data } = await apiClient.post('/ai/conversations', { conversationId, prompt });
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (data?.conversation?.id) {
        queryClient.invalidateQueries({ queryKey: ['ai-conversation-details', data.conversation.id] });
      }
    },
  });
}

export function useAiDeleteConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/ai/conversations/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

export function useAiFeedbackMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
      rating,
      comment,
    }: {
      conversationId: string;
      messageId: string | null;
      rating: number;
      comment?: string;
    }) => {
      const { data } = await apiClient.post(`/ai/conversations/${conversationId}/feedback`, {
        messageId,
        rating,
        comment,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-telemetry'] });
    },
  });
}

export function useAiTelemetryQuery() {
  return useQuery({
    queryKey: ['ai-telemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/ai/telemetry');
      return data.data;
    },
  });
}
