import { useEffect, useRef, useState } from 'react';
import { BookOpen, Code2 } from 'lucide-react';
import Lesson from './Lesson.jsx';
import Ide from './Ide.jsx';
import { visit } from '../lib/store.js';

const SPLIT_KEY = 'skill-issue:split';

export default function LessonPage({ lesson }) {
  const ideRef = useRef(null);
  const scrollRef = useRef(null);
  const tabs = [
    ...lesson.exercises.map((ex, i) => ({ key: ex.id, label: `Ex ${i + 1}`, exercise: ex })),
    { key: 'scratch', label: 'Scratch' },
  ];
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const [mobileView, setMobileView] = useState('lesson');
  const [split, setSplit] = useState(() => {
    try {
      return Number(localStorage.getItem(SPLIT_KEY)) || 50;
    } catch {
      return 50;
    }
  });

  useEffect(() => {
    visit(lesson.id);
    document.title = `${lesson.title} · skill::issue`;
  }, [lesson]);

  const startDrag = (e) => {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    const rect = container.getBoundingClientRect();
    const move = (ev) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(72, Math.max(30, pct)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('dragging');
      setSplit((s) => {
        try {
          localStorage.setItem(SPLIT_KEY, String(Math.round(s)));
        } catch {
          /* ignore */
        }
        return s;
      });
    };
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className={`lesson-page show-${mobileView}`} style={{ '--split': `${split}%` }}>
      <div className="lesson-scroll" ref={scrollRef}>
        <Lesson
          lesson={lesson}
          activeKey={activeKey}
          onRunExample={(code) => {
            setMobileView('code');
            ideRef.current?.loadAndRun('scratch', code);
          }}
          onOpenExercise={(key) => {
            setActiveKey(key);
            setMobileView('code');
          }}
        />
      </div>
      <div className="split-handle" onPointerDown={startDrag} role="separator" aria-orientation="vertical" title="Drag to resize" />
      <div className="ide-pane">
        <Ide ref={ideRef} tabs={tabs} activeKey={activeKey} onSelect={setActiveKey} />
      </div>
      <div className="mobile-switch">
        <button className={mobileView === 'lesson' ? 'active' : ''} onClick={() => setMobileView('lesson')}>
          <BookOpen size={16} /> Lesson
        </button>
        <button className={mobileView === 'code' ? 'active' : ''} onClick={() => setMobileView('code')}>
          <Code2 size={16} /> Code
        </button>
      </div>
    </div>
  );
}
