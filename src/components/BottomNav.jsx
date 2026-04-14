import { Home, BookOpen, MessageCircle, PenLine, User } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Home', Icon: Home },
  { id: 'flashcards', label: 'Learn', Icon: BookOpen },
  { id: 'conversation', label: 'Chat', Icon: MessageCircle },
  { id: 'journal', label: 'Journal', Icon: PenLine },
  { id: 'profile', label: 'Profile', Icon: User },
];

export default function BottomNav({ currentPage, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bottom-nav-item ${currentPage === id ? 'active' : ''}`}
          onClick={() => onNavigate(id)}
        >
          <Icon size={22} strokeWidth={currentPage === id ? 2.5 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
