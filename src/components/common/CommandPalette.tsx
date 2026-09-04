/**
 * FloZ ECA — Command Palette (Cmd/Ctrl+K)
 * Fast keyboard-first pro-tool launcher for CAD workspace switching and actions.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { siteConfig } from '../../config/siteConfig';
import {
  Search,
  Cpu,
  Layers,
  Box,
  Activity,
  Calculator,
  FileCode,
  LayoutDashboard,
  ShieldCheck,
  Download,
  Plus,
  Upload,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Info,
  Terminal,
  X,
  Package,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Workspace' | 'Project' | 'Tool' | 'System';
  shortcut?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(q))
    );
  }, [commands, query]);

  // Keep selection within bounds
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, filteredCommands.length - 1)));
  }, [filteredCommands.length]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-theme-modalBackdrop select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-cad-panel border border-cad-border rounded-sm shadow-2xl overflow-hidden flex flex-col text-cad-text animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="h-10 px-3 border-b border-cad-border bg-cad-header flex items-center gap-2.5">
          <Search size={14} className="text-cad-textMuted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a CAD workspace or command (e.g. PCB, DRC, SPICE, Gerber)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-xs text-cad-inputText font-mono placeholder:text-cad-textMuted outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded-xs bg-cad-subpanel border border-cad-border text-[10px] font-mono text-cad-textMuted">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 text-xs">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-cad-textMuted text-xs font-mono">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-2.5 py-1.5 rounded-xs flex items-center justify-between cursor-pointer transition-colors duration-fast ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'hover:bg-cad-surfaceHover text-cad-text'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={14}
                      className={isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}
                    />
                    <span>{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded-xs border ${
                        isSelected
                          ? 'border-white/30 text-white/90 bg-white/10'
                          : 'border-cad-border text-cad-textMuted bg-cad-subpanel'
                      }`}
                    >
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono px-1 py-0.2 rounded-xs border ${
                          isSelected
                            ? 'border-white/30 text-white bg-white/15'
                            : 'border-cad-border text-cad-textMuted bg-cad-subpanel'
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="h-7 px-3 bg-cad-header border-t border-cad-border flex items-center justify-between text-[10px] font-mono text-cad-textMuted">
          <span>Navigate with ↑ ↓ · Select with ↵</span>
          <span>FloZ ECA v{siteConfig.version}</span>
        </div>
      </div>
    </div>
  );
};
