import { create } from 'zustand';

interface AiState {
  activeConversationId: string | null;
  searchQuery: string;
  setActiveConversationId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  resetStore: () => void;
}

export const useAiStore = create<AiState>((set) => ({
  activeConversationId: null,
  searchQuery: '',
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetStore: () => set({ activeConversationId: null, searchQuery: '' }),
}));
