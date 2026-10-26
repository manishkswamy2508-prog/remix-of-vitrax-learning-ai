// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { Plus, MessageSquare, FolderKanban, BookOpen, Code2, Settings, ChevronLeft, ChevronRight, Search, Trash2, Layers, CircleHelp, Sparkles, X, Sun, Moon, MessagesSquare, LibraryBig, GalleryVerticalEnd, BrainCircuit, TerminalSquare, Rocket } from 'lucide-react';
import { useTheme } from '../lib/theme';
import type { MainView, Conversation } from '../types';

type ConnectionStatus = 'loading' | 'online' | 'unavailable';

interface SidebarProps {
  currentView: MainView;
  setCurrentView: (view: MainView) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenSettings: () => void;
  aiStatus: ConnectionStatus;
}

const NAV_ITEMS: { id: MainView; title: string; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', title: 'Chat', label: 'Chat', icon: MessagesSquare },
  { id: 'library', title: 'Sources and library', label: 'Library', icon: LibraryBig },
  { id: 'flashcards', title: 'Flashcard studio', label: 'Flashcards', icon: GalleryVerticalEnd },
  { id: 'quiz', title: 'Quiz studio', label: 'Quizzes', icon: BrainCircuit },
  { id: 'code', title: 'Code workspace', label: 'Code workspace', icon: TerminalSquare },
  { id: 'projects', title: 'Projects', label: 'Projects', icon: Rocket },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onToggleOpen,
  onOpenSettings,
  aiStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredConversations = useMemo(() => conversations.filter(conversation =>
    (conversation.title || 'Untitled conversation').toLowerCase().includes(searchQuery.toLowerCase())), [conversations, searchQuery]);
  const navigate = (view: MainView) => {
    setCurrentView(view);
    if (window.matchMedia('(max-width: 767px)').matches && isOpen) onToggleOpen();
  };

  return (
    <>
      {isOpen && <button className="sidebar-scrim md:hidden" onClick={onToggleOpen} aria-label="Close navigation" />}
      <aside className={`vitrax-sidebar ${isOpen ? 'vitrax-sidebar-open' : 'vitrax-sidebar-closed'}`} aria-label="Main navigation">
        <div className="sidebar-brand-row">
          <button onClick={() => navigate('chat')} className="sidebar-brand" title="VITRAX AI home">
            <span className="vitrax-mark"><span>V</span></span>
            {isOpen && <span className="sidebar-wordmark">VITRAX<span>AI</span><small>INTELLIGENCE STUDIO</small></span>}
          </button>
          <button onClick={onToggleOpen} className="sidebar-collapse" aria-label={isOpen ? 'Collapse navigation' : 'Expand navigation'} title={isOpen ? 'Collapse navigation' : 'Expand navigation'}>
            {isOpen ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
          </button>
        </div>

        <div className="sidebar-new-chat-wrap">
          <button onClick={onNewChat} className="sidebar-new-chat" title="Start a new conversation">
            <Plus size={16} />{isOpen && <span>New conversation</span>}
          </button>
        </div>

        <div className="sidebar-section-label">{isOpen ? 'WORKSPACE' : ''}</div>
        <nav className="sidebar-navigation">
          {NAV_ITEMS.map(({ id, title, label, icon: Icon }) => {
            const active = currentView === id || (id === 'code' && currentView === 'projects');
            return <button key={id} onClick={() => navigate(id)} title={title} aria-current={active ? 'page' : undefined} className={`sidebar-nav-item ${active ? 'sidebar-nav-active' : ''}`}>
              <span className={`nav-icon nav-icon-${id}`}><Icon size={15} strokeWidth={2.2} /></span>{isOpen && <span>{label}</span>}{active && isOpen && <i className="sidebar-active-indicator" />}
            </button>;
          })}
        </nav>

        {isOpen && <div className="sidebar-recents">
          <div className="sidebar-recents-heading"><span>RECENT CHATS</span><span>{conversations.length ? conversations.length : ''}</span></div>
          <label className="sidebar-search"><Search size={13} /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Find a conversation" /></label>
          <div className="sidebar-conversation-list">
            {filteredConversations.length === 0 ? <p className="sidebar-empty">{searchQuery ? 'No matching chats' : 'Your conversations will appear here.'}</p> : filteredConversations.slice(0, 80).map(conversation => (
              <button key={conversation.id} onClick={() => { onSelectConversation(conversation.id); if (window.matchMedia('(max-width: 767px)').matches) onToggleOpen(); }} className={`sidebar-conversation ${activeConversationId === conversation.id ? 'sidebar-conversation-active' : ''}`} title={conversation.title || 'Untitled conversation'}>
                <MessageSquare size={13} /><span>{conversation.title || 'Untitled conversation'}</span><i onClick={event => { event.stopPropagation(); onDeleteConversation(conversation.id); }} role="button" tabIndex={0} title="Delete conversation" aria-label="Delete conversation" onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.stopPropagation(); onDeleteConversation(conversation.id); } }}><Trash2 size={13} /></i>
              </button>
            ))}
          </div>
        </div>}

        <div className="sidebar-bottom">
          <div className={`sidebar-ai-status ${aiStatus}`} title={aiStatus === 'online' ? 'Live model catalog available' : aiStatus === 'loading' ? 'Checking model service' : 'Model service unavailable'}>
            <span className="status-dot" />{isOpen && <span>{aiStatus === 'online' ? 'Model service online' : aiStatus === 'loading' ? 'Checking AI service…' : 'AI service unavailable'}</span>}
            {isOpen && aiStatus === 'online' && <Sparkles size={13} className="ml-auto text-violet-200/75" />}
          </div>
          <ThemeToggle isOpen={isOpen} />
          <button onClick={onOpenSettings} className="sidebar-settings" title="Settings and model connection"><Settings size={16} />{isOpen && <span>Settings</span>}</button>
          {isOpen && <div className="sidebar-local-note">Conversations and sources are stored in this browser.</div>}
        </div>
      </aside>
    </>
  );
};

function ThemeToggle({ isOpen }: { isOpen: boolean }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button onClick={toggle} className="sidebar-settings theme-toggle" role="switch" aria-checked={!dark} aria-label="Toggle light mode" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <Moon size={16} /> : <Sun size={16} />}
      {isOpen && <span>{dark ? 'Dark mode' : 'Light mode'}</span>}
      {isOpen && <span className="theme-switch" data-on={!dark}><i /></span>}
    </button>
  );
}
