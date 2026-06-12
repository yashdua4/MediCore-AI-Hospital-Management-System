import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  History,
  Plus,
  Trash2,
  Search,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  AlertTriangle,
  Brain,
  Pill,
  Heart,
  Calendar,
  DollarSign,
  Activity,
  User,
  ChevronRight,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAiStore } from '../../store/aiStore';
import {
  useAiConversationsQuery,
  useAiConversationDetailsQuery,
  useAiSendMessageMutation,
  useAiDeleteConversationMutation,
  useAiFeedbackMutation
} from '../../hooks/useAIData';
import {
  usePatientsQuery,
  usePatientProfileQuery,
  useDoctorsQuery,
  useAppointmentsQuery,
  useIpdTelemetryQuery,
  useEmergencyDashboardQuery
} from '../../hooks/useDashboardData';

export const AICopilot: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || 'PATIENT';

  const { activeConversationId, searchQuery, setActiveConversationId, setSearchQuery, resetStore } = useAiStore();

  const [promptText, setPromptText] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, 'up' | 'down'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- QUERY HOOKS ---
  const { data: conversations = [], isLoading: loadingConversations } = useAiConversationsQuery(role);
  const { data: activeChat, isLoading: loadingDetails } = useAiConversationDetailsQuery(activeConversationId);

  const sendMessageMutation = useAiSendMessageMutation();
  const deleteConversationMutation = useAiDeleteConversationMutation();
  const feedbackMutation = useAiFeedbackMutation();

  // --- SMART CONTEXT DATA EXTRACTION ---
  const { data: patientsData } = usePatientsQuery();
  const activePatientId = useMemo(() => {
    if (!patientsData || !patientsData.patients) return undefined;
    return patientsData.patients.find((p: any) => p.userId === user?.id)?.id;
  }, [patientsData, user]);

  const { data: patientProfile } = usePatientProfileQuery(activePatientId);

  const { data: doctorsData } = useDoctorsQuery();
  const activeDoctorId = useMemo(() => {
    if (!doctorsData || !doctorsData.doctors) return undefined;
    return doctorsData.doctors.find((d: any) => d.userId === user?.id)?.id;
  }, [doctorsData, user]);

  const { data: doctorAppointments } = useAppointmentsQuery(
    activeDoctorId ? { doctorId: activeDoctorId } : {}
  );

  const { data: ipdTelemetry } = useIpdTelemetryQuery();
  const { data: emergencyDashboard } = useEmergencyDashboardQuery();

  // --- AUTO SCROLL ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, sendMessageMutation.isPending]);

  // --- SEARCH FILTER ---
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c: any) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // --- SUBMIT MESSAGE ---
  const handleSend = async (textToSend?: string) => {
    const finalPrompt = textToSend || promptText;
    if (!finalPrompt.trim()) return;

    setPromptText('');
    try {
      const result = await sendMessageMutation.mutateAsync({
        conversationId: activeConversationId || undefined,
        prompt: finalPrompt
      });

      if (!activeConversationId && result?.conversation?.id) {
        setActiveConversationId(result.conversation.id);
      }
    } catch (err) {
      console.error('Failed to submit prompt:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- FEEDBACK ---
  const handleFeedback = (messageId: string, rating: 1 | -1) => {
    if (!activeConversationId) return;
    feedbackMutation.mutate({
      conversationId: activeConversationId,
      messageId,
      rating
    });
    setFeedbackSubmitted((prev) => ({
      ...prev,
      [messageId]: rating === 1 ? 'up' : 'down'
    }));
  };

  // --- DELETE CONVERSATION ---
  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat history?')) {
      try {
        await deleteConversationMutation.mutateAsync(id);
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    }
  };

  // --- ROLE CONFIGURATIONS ---
  const roleConfig = useMemo(() => {
    switch (role) {
      case 'DOCTOR':
      case 'EMERGENCY_DOCTOR':
      case 'TRAUMA_SURGEON':
        return {
          title: 'Clinical AI Copilot',
          subtitle: 'SOAP Note generator, patient history summaries, and abnormal lab value explaining.',
          icon: <Brain className="h-5 w-5 text-emerald-500 animate-pulse" />,
          glowClass: 'shadow-emerald-500/10 border-emerald-500/20',
          prompts: [
            { text: 'Summarize patient history', label: 'History Summary' },
            { text: 'Suggest treatment plan for Hypertension', label: 'Guidelines Plan' },
            { text: 'Explain abnormal laboratory results', label: 'Lab Analysis' }
          ]
        };
      case 'NURSE':
        return {
          title: 'Nursing Care Assistant',
          subtitle: 'Shift handovers logs, patient vitals tracking, and medication administration checks.',
          icon: <Heart className="h-5 w-5 text-rose-500 animate-pulse" />,
          glowClass: 'shadow-rose-500/10 border-rose-500/20',
          prompts: [
            { text: 'Show active inpatients in the ward census', label: 'Ward Occupancy' },
            { text: 'Show medication shift schedule', label: 'Meds Schedule' }
          ]
        };
      case 'SUPER_ADMIN':
      case 'HOSPITAL_ADMIN':
      case 'BILLING_EXEC':
      case 'ACCOUNTANT':
        return {
          title: 'Operations Intelligence Copilot',
          subtitle: 'Billing ledger analysis, operational bed occupancies, and staffing metrics.',
          icon: <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />,
          glowClass: 'shadow-violet-500/10 border-violet-500/20',
          prompts: [
            { text: 'Show revenue and financial summary', label: 'Revenue Insights' },
            { text: 'Show hospital occupancy insights', label: 'Bed Analytics' },
            { text: 'Show busiest departments', label: 'Operations Efficiency' }
          ]
        };
      default:
        return {
          title: 'Patient Health Companion',
          subtitle: 'Explain active prescriptions, query vitals records, or analyze basic symptoms.',
          icon: <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />,
          glowClass: 'shadow-emerald-400/10 border-emerald-400/20',
          prompts: [
            { text: 'Explain my prescription', label: 'Explain Meds' },
            { text: 'Show my latest vitals summary', label: 'My Vitals' },
            { text: 'Check my pending bills', label: 'Pending Statements' }
          ]
        };
    }
  }, [role]);

  // --- RENDER CUSTOM MARKDOWN MARKDOWN PARSER ---
  const renderMarkdown = (content: string) => {
    let html = content;

    // Disclaimer parsing
    html = html.replace(
      /\*Disclaimer: (.*?)\*/gi,
      `<div class="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-650 dark:text-amber-500 rounded-xl text-[10px] leading-relaxed font-semibold flex gap-2 items-start shrink-0 select-none">
        <span class="p-0.5 bg-amber-500 text-slate-950 rounded text-[8px] font-bold tracking-wider select-none uppercase shrink-0 mt-0.5">Disclaimer</span>
        <span>$1</span>
      </div>`
    );

    // Headings
    html = html.replace(/### (.*?)\n/g, '<h3 class="text-sm font-bold text-slate-900 dark:text-white mt-4 mb-1 border-b border-slate-100 dark:border-slate-800 pb-1">$1</h3>');
    html = html.replace(/#### (.*?)\n/g, '<h4 class="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">$1</h4>');

    // Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');

    // Bullet points
    html = html.replace(/- (.*?)\n/g, '<li class="ml-4 list-disc text-xs text-slate-600 dark:text-slate-350">$1</li>');
    html = html.replace(/((?:<li.*?>.*?<\/li>)+)/gs, '<ul class="space-y-1 my-2">$1</ul>');

    // Numbered lists
    html = html.replace(/\d+\. (.*?)\n/g, '<li class="ml-4 list-decimal text-xs text-slate-600 dark:text-slate-350">$1</li>');
    html = html.replace(/((?:<li class=".*list-decimal.*?>.*?<\/li>)+)/gs, '<ol class="space-y-1.5 my-2">$1</ol>');

    // Line breaks
    html = html.replace(/\n/g, '<br/>');

    return (
      <div
        className="text-xs leading-relaxed space-y-1 text-slate-700 dark:text-slate-300 font-sans"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] -mt-2 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 overflow-hidden font-sans relative">
      
      {/* 1. CHAT HISTORY SIDEBAR */}
      <aside
        className={`w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col shrink-0 transition-transform duration-300 z-20 absolute lg:relative lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 h-full w-80 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Consultation History</span>
          </div>
          <button
            onClick={() => {
              setActiveConversationId(null);
              setMobileSidebarOpen(false);
            }}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            title="Start New Session"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* History Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs placeholder-slate-400 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {loadingConversations ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-6 text-slate-400 dark:text-slate-500 text-xs">No active sessions found.</div>
          ) : (
            filteredConversations.map((c: any) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConversationId(c.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between group transition-all ${
                  activeConversationId === c.id
                    ? 'bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800/80 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${activeConversationId === c.id ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="truncate">{c.title}</span>
                </div>
                <Trash2
                  onClick={(e) => handleDeleteChat(c.id, e)}
                  className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1.5"
                />
              </button>
            ))
          )}
        </div>

        {/* Mobile close button */}
        {mobileSidebarOpen && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute top-4 right-[-3rem] p-2 bg-slate-900 text-white rounded-r-lg lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </aside>

      {/* 2. MAIN CHAT WINDOW */}
      <section className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden relative">
        {/* Chat Header */}
        <header className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {roleConfig.icon}
              <div>
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white leading-none">
                  {roleConfig.title}
                </h2>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Active Clinical Copilot Engine
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Active Session
            </div>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {loadingDetails ? (
            <div className="flex flex-col gap-6 justify-center items-center h-full text-slate-400 dark:text-slate-500 animate-pulse">
              <Brain className="h-10 w-10 text-emerald-500 animate-spin duration-300" />
              <span className="text-xs">Accessing EMR Clinical context...</span>
            </div>
          ) : !activeConversationId && (!activeChat || activeChat.messages.length === 0) ? (
            /* Prompt Library UI (Empty State) */
            <div className="max-w-2xl mx-auto h-full flex flex-col justify-center py-8">
              <div className="text-center space-y-3 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner shadow-emerald-500/5">
                  <Brain className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-800 dark:text-white">
                  How can I assist your clinical workflow today?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 px-6 leading-relaxed max-w-lg mx-auto">
                  {roleConfig.subtitle} Ask any medical queries connected to patient charts, active prescriptions, billing ledgers, or symptom checks.
                </p>
              </div>

              {/* Prompt Chips Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
                {roleConfig.prompts.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => handleSend(p.text)}
                    className="p-3 text-left border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition group flex items-start justify-between gap-3 shadow-sm hover:shadow-md"
                  >
                    <div>
                      <span className="block text-[10px] font-bold text-emerald-500 mb-0.5 tracking-wider uppercase">
                        {p.label}
                      </span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug group-hover:text-slate-900 dark:group-hover:text-white">
                        {p.text}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition shrink-0 self-center" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Chat Messages */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeChat?.messages.map((msg: any) => {
                const isAI = msg.sender === 'AI';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAI && (
                      <div className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                        <Brain className="h-4 w-4" />
                      </div>
                    )}
                    <div className="space-y-1.5 max-w-[85%]">
                      <div
                        className={`p-4 rounded-2xl text-xs border ${
                          isAI
                            ? 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-850 text-slate-800 dark:text-slate-200 shadow-sm'
                            : 'bg-emerald-600 border-emerald-500 dark:border-emerald-600/80 text-white shadow-md shadow-emerald-500/5'
                        }`}
                      >
                        {isAI ? renderMarkdown(msg.content) : <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>}
                      </div>

                      {/* AI Accuracy Feedback Row */}
                      {isAI && (
                        <div className="flex items-center gap-3 px-1 text-[10px] text-slate-400 font-medium">
                          <span>Was this accurate?</span>
                          <div className="flex gap-1.5">
                            <button
                              disabled={feedbackSubmitted[msg.id] !== undefined}
                              onClick={() => handleFeedback(msg.id, 1)}
                              className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                                feedbackSubmitted[msg.id] === 'up' ? 'text-emerald-500 bg-emerald-500/10' : 'hover:text-slate-600 dark:hover:text-slate-350'
                              }`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              disabled={feedbackSubmitted[msg.id] !== undefined}
                              onClick={() => handleFeedback(msg.id, -1)}
                              className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                                feedbackSubmitted[msg.id] === 'down' ? 'text-rose-500 bg-rose-500/10' : 'hover:text-slate-600 dark:hover:text-slate-350'
                              }`}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {!isAI && (
                      <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {sendMessageMutation.isPending && (
                <div className="flex gap-4 justify-start">
                  <div className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center shrink-0 animate-pulse">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shadow-sm">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce duration-600" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce duration-600" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce duration-600" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <footer className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-2 focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition shadow-sm">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask clinical diagnostics or explain lab results..."
                rows={1}
                className="w-full bg-transparent border-0 outline-none text-xs text-slate-700 dark:text-slate-300 placeholder-slate-450 dark:placeholder-slate-500 py-2.5 px-3 resize-none focus:ring-0"
              />
              <div className="flex justify-between items-center px-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[9px] text-slate-400 font-medium">Shift+Enter for newline</span>
                <button
                  onClick={() => handleSend()}
                  disabled={!promptText.trim() || sendMessageMutation.isPending}
                  className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 rounded-xl transition flex items-center justify-center shadow-md shadow-emerald-500/10"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="text-center text-[9px] text-slate-400 leading-snug">
              MediCore AI assistant generates answers querying EMR charts. Verify all metrics in ledger logs.
            </p>
          </div>
        </footer>
      </section>

      {/* 3. RIGHT CONTEXT PANEL */}
      <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-4 overflow-y-auto shrink-0 hidden xl:block">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Activity className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Active Workspace Context</h3>
        </div>

        {/* Dynamic Context Panels by User Role */}
        {role === 'PATIENT' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Patient Profile</span>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm mt-1">
                {patientProfile ? `${patientProfile.firstName} ${patientProfile.lastName}` : 'Guest'}
              </h4>
              <div className="text-[10px] text-slate-500 mt-1 space-y-1">
                <div>DOB: {patientProfile?.dob ? new Date(patientProfile.dob).toLocaleDateString() : '—'}</div>
                <div>Gender: {patientProfile?.gender || '—'}</div>
                <div>Blood Group: {patientProfile?.bloodGroup || '—'}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Conditions</span>
              <div className="mt-2 space-y-1.5">
                {patientProfile?.conditions?.length > 0 ? (
                  patientProfile.conditions.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">{c.severity}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400">No active chronic conditions.</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Drug Allergies</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patientProfile?.allergies?.length > 0 ? (
                  patientProfile.allergies.map((a: any) => (
                    <span key={a.id} className="px-2 py-0.5 rounded-lg text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20">
                      {a.allergen} ({a.severity})
                    </span>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400">No known drug allergies (NKA).</div>
                )}
              </div>
            </div>
          </div>
        )}

        {(role === 'DOCTOR' || role === 'EMERGENCY_DOCTOR' || role === 'TRAUMA_SURGEON') && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Clinical Load Statistics</span>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] text-slate-450 font-semibold block">Today's Slots</span>
                  <span className="text-xl font-bold font-display text-slate-800 dark:text-white block mt-0.5">
                    {doctorAppointments?.length || 0} Appts
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] text-slate-450 font-semibold block">Critical Alerts</span>
                  <span className="text-xl font-bold font-display text-rose-500 block mt-0.5 animate-pulse">
                    {emergencyDashboard?.activeAlerts?.length || 0} Code
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase">My Consultation Slots</span>
              <div className="mt-3 space-y-2">
                {doctorAppointments && doctorAppointments.length > 0 ? (
                  doctorAppointments.slice(0, 4).map((a: any) => (
                    <div key={a.id} className="p-2 border border-slate-100 dark:border-slate-850 rounded-lg text-[10px] space-y-0.5 bg-slate-50/50 dark:bg-slate-950/20">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{a.time}</span>
                        <span className="text-[9px] font-semibold text-slate-400">{a.status}</span>
                      </div>
                      <div className="text-slate-500 truncate">
                        Patient: {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Guest Patient'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400">No slots scheduled for today.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {role === 'NURSE' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Active Inpatients</span>
                <span className="text-base font-bold font-display text-slate-850 dark:text-white mt-0.5">
                  {ipdTelemetry?.totalAdmissionsCount || 0} Admitted
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ward Bed Utilizations</span>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Occupied beds:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{ipdTelemetry?.occupiedBedsCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available beds:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{ipdTelemetry?.availableBedsCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {(role === 'SUPER_ADMIN' || role === 'HOSPITAL_ADMIN') && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Activity className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Inpatient Admissions</span>
                <span className="text-base font-bold font-display text-slate-850 dark:text-white mt-0.5">
                  {ipdTelemetry?.totalAdmissionsCount || 0} Cases
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Active Emergency Cases</span>
                <span className="text-base font-bold font-display text-slate-850 dark:text-white mt-0.5">
                  {emergencyDashboard?.activeCasesCount || 0} Active
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
