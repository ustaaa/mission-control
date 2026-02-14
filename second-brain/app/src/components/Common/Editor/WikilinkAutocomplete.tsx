import { observer } from 'mobx-react-lite';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/trpc';
import { Icon } from '@/components/Common/Iconify/icons';
import { ScrollShadow } from '@heroui/react';

interface WikilinkAutocompleteProps {
  editorElement: HTMLElement | null;
  onInsert: (text: string) => void;
}

interface NoteResult {
  id: number;
  content: string;
}

function getFirstLine(content: string): string {
  const line = content.split('\n')[0] || '';
  return line.replace(/^#+\s*/, '').trim();
}

export const WikilinkAutocomplete = observer(({ editorElement, onInsert }: WikilinkAutocompleteProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchNotes = useCallback(async (searchText: string) => {
    try {
      const notes = await api.notes.list.mutate({
        searchText: searchText || ' ',
        page: 1,
        size: 8,
        type: 1, // notes only
      });
      setResults(notes.map((n: any) => ({ id: n.id, content: n.content })));
      setSelectedIndex(0);
    } catch (e) {
      console.error('Wikilink search failed:', e);
    }
  }, []);

  useEffect(() => {
    if (!editorElement) return;

    const handleInput = () => {
      const textarea = editorElement.querySelector('.vditor-ir .vditor-reset') as HTMLElement
        || editorElement.querySelector('.vditor-sv .vditor-reset') as HTMLElement
        || editorElement.querySelector('textarea') as HTMLTextAreaElement;

      if (!textarea) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textContent = range.startContainer.textContent || '';
      const cursorPos = range.startOffset;

      // Look back from cursor for [[
      const textBeforeCursor = textContent.slice(0, cursorPos);
      const bracketIdx = textBeforeCursor.lastIndexOf('[[');

      if (bracketIdx !== -1) {
        // Check no ]] between [[ and cursor
        const between = textBeforeCursor.slice(bracketIdx + 2);
        if (!between.includes(']]')) {
          const searchQuery = between;
          setQuery(searchQuery);
          setIsVisible(true);

          // Get position for popup
          const rect = range.getBoundingClientRect();
          const editorRect = editorElement.getBoundingClientRect();
          setPosition({
            top: rect.bottom - editorRect.top + 4,
            left: rect.left - editorRect.left,
          });

          // Debounced search
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => searchNotes(searchQuery), 200);
          return;
        }
      }

      setIsVisible(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          insertWikilink(getFirstLine(selected.content));
        }
      } else if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    editorElement.addEventListener('input', handleInput);
    editorElement.addEventListener('keydown', handleKeyDown, true);

    return () => {
      editorElement.removeEventListener('input', handleInput);
      editorElement.removeEventListener('keydown', handleKeyDown, true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editorElement, isVisible, results, selectedIndex, searchNotes]);

  const insertWikilink = (title: string) => {
    // The onInsert callback will handle replacing [[query with [[title]]
    onInsert(title);
    setIsVisible(false);
    setQuery('');
    setResults([]);
  };

  if (!isVisible || results.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-content1 border border-divider rounded-lg shadow-lg overflow-hidden min-w-[250px] max-w-[400px]"
      style={{ top: position.top, left: position.left }}
    >
      <ScrollShadow className="max-h-[240px]">
        {results.map((note, idx) => {
          const title = getFirstLine(note.content);
          const preview = note.content.split('\n').slice(1, 3).join(' ').slice(0, 80).trim();
          return (
            <button
              key={note.id}
              className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors
                ${idx === selectedIndex ? 'bg-primary/10' : 'hover:bg-hover'}`}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => insertWikilink(title)}
            >
              <span className="text-sm font-medium truncate">{title || 'Untitled'}</span>
              {preview && (
                <span className="text-xs text-foreground/40 truncate">{preview}</span>
              )}
            </button>
          );
        })}
      </ScrollShadow>
      <div className="px-3 py-1.5 border-t border-divider bg-content2/50 flex items-center gap-2 text-xs text-foreground/30">
        <Icon icon="mdi:keyboard-return" width="12" height="12" />
        <span>select</span>
        <Icon icon="mdi:arrow-up-down" width="12" height="12" className="ml-2" />
        <span>navigate</span>
      </div>
    </div>
  );
});
