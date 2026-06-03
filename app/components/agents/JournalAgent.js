"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Folder, Tag, Plus, FileText, Calendar, MoreVertical, Check, Trash2, Edit3, Eye, Search, Maximize2 } from "lucide-react";
import { getJournalFolders, createJournalFolder, getJournalNotes, saveJournalNote, deleteJournalNote } from "../../actions";

function n(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const raw = String(value).trim();
  const negative = raw.includes("-") || (raw.includes("(") && raw.includes(")"));
  const digits = raw.replace(/[^0-9.]/g, "");
  if (!digits) return fallback;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : fallback;
}
function pnlColor(v) { return n(v) >= 0 ? "text-emerald-400" : "text-rose-400"; }
const fmtMoneyLocal = (v) => { const x = n(v); return `${x >= 0 ? "+" : "-"}$${Math.abs(x).toFixed(2)}`; };
const fmtPctLocal = (v) => { return `${(n(v) * 100).toFixed(1)}%`; };

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const btnClass = (isActive) =>
    `p-1.5 rounded transition ${isActive ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-slate-900/50 p-2">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))}>
        <span className="font-bold">B</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))}>
        <span className="italic">I</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive("underline"))}>
        <span className="underline">U</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))}>
        <span className="line-through">S</span>
      </button>
      
      <div className="mx-1 h-5 w-px bg-slate-700" />
      
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive("heading", { level: 1 }))}>
        H1
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))}>
        H2
      </button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))}>
        • List
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))}>
        1. List
      </button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive("blockquote"))}>
        Quote
      </button>
      
      <div className="mx-1 h-5 w-px bg-slate-700" />
      
      <input
        type="color"
        onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
        value={editor.getAttributes("textStyle").color || "#ffffff"}
        className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
      />
      
      <div className="mx-1 h-5 w-px bg-slate-700" />
      
      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))}>
        Left
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))}>
        Center
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))}>
        Right
      </button>
    </div>
  );
};

export function JournalAgent({ weeks = [] }) {
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState("all");
  const [activeNoteId, setActiveNoteId] = useState(null);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // Auto-save logic could go here, or we use a manual save button
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[400px] p-6 text-slate-200",
      }
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedFolders = await getJournalFolders();
    const loadedNotes = await getJournalNotes();
    setFolders(loadedFolders);
    setNotes(loadedNotes);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const f = await createJournalFolder(newFolderName.trim());
    setFolders([...folders, f]);
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  useEffect(() => {
    if (activeNote && editor) {
      editor.commands.setContent(activeNote.content || "");
      setNoteTitle(activeNote.title);
      setNoteDate(activeNote.date || "");
    }
  }, [activeNoteId, editor]);

  const handleCreateNote = async () => {
    const newNote = {
      title: "Untitled Note",
      content: "<p></p>",
      folderId: activeFolderId === "all" ? null : activeFolderId,
      date: new Date().toISOString().split("T")[0]
    };
    const saved = await saveJournalNote(newNote);
    setNotes([saved, ...notes]);
    setActiveNoteId(saved.id);
    setIsEditingNote(true);
  };

  const handleSaveNote = async () => {
    if (!activeNoteId || !editor) return;
    setIsSaving(true);
    const content = editor.getHTML();
    const updated = await saveJournalNote({
      id: activeNoteId,
      title: noteTitle,
      content,
      date: noteDate,
      folderId: activeNote?.folderId
    });
    setNotes(notes.map(n => n.id === activeNoteId ? updated : n));
    setIsSaving(false);
  };
  
  const handleDeleteNote = async (id) => {
    if (!confirm("Delete this note?")) return;
    await deleteJournalNote(id);
    setNotes(notes.filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const applyTemplate = (type) => {
    if (!editor) return;
    let template = "";
    if (type === "pre") {
      template = `
        <h2>☀️ Pre-Market Watchlist</h2>
        <p><strong>SPY:</strong> Watching key levels for inflection.</p>
        <p><strong>BTC:</strong> Trend continuation likely.</p>
        <p><em>Mindset:</em> Patient, waiting for A+ setups.</p>
      `;
    } else if (type === "post") {
      template = `
        <h2>🌙 Post-Session Thoughts</h2>
        <h3>What mistakes I made and how can I improve:</h3>
        <ul><li>Took a trade out of boredom</li></ul>
        <h3>What I did right:</h3>
        <ul><li>Cut my loss quickly on trade #2</li></ul>
      `;
    }
    editor.commands.setContent(editor.getHTML() + template);
  };

  const filteredNotes = activeFolderId === "all" 
    ? notes 
    : notes.filter(n => n.folderId === activeFolderId);

  // Stats Integration
  const linkedWeek = weeks.find(w => w.trades?.some(t => t.dateTime?.startsWith(noteDate)));
  const linkedTrades = linkedWeek?.trades?.filter(t => t.dateTime?.startsWith(noteDate)) || [];
  const pnl = linkedTrades.reduce((s, t) => s + n(t.pnl), 0);
  const wins = linkedTrades.filter(t => n(t.pnl) > 0).length;
  const winRate = linkedTrades.length ? wins / linkedTrades.length : 0;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
      
      {/* 1. Left Sidebar - Folders */}
      <div className="w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Folders
            <button onClick={() => setIsCreatingFolder(!isCreatingFolder)} className="hover:text-amber-400">
              <Plus size={14} />
            </button>
          </div>
          
          {isCreatingFolder && (
            <div className="mb-3 flex gap-2">
              <input 
                type="text" 
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="New folder..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200 outline-none focus:border-amber-500"
                onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
              />
              <button onClick={handleCreateFolder} className="rounded-xl bg-amber-500/20 px-2 text-amber-400 hover:bg-amber-500/40">
                <Check size={14} />
              </button>
            </div>
          )}

          <div className="space-y-1">
            <button 
              onClick={() => setActiveFolderId("all")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${activeFolderId === "all" ? "bg-amber-500/10 text-amber-400" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
            >
              <Folder size={16} /> All Notes
            </button>
            {folders.map(f => (
              <button 
                key={f.id}
                onClick={() => setActiveFolderId(f.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${activeFolderId === f.id ? "bg-amber-500/10 text-amber-400" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
              >
                <Folder size={16} /> {f.name}
              </button>
            ))}
          </div>

          <div className="mt-8 mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Tags
          </div>
          <div className="space-y-1 text-sm text-slate-500 px-3">
            <span className="flex items-center gap-2"><Tag size={12}/> FOMC</span>
            <span className="flex items-center gap-2"><Tag size={12}/> Mistakes</span>
            <span className="flex items-center gap-2"><Tag size={12}/> Review</span>
          </div>
        </div>
      </div>

      {/* 2. Middle List - Notes */}
      <div className="flex w-72 flex-col border-r border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <button 
            onClick={handleCreateNote}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
          >
            <Plus size={16} /> New Note
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No notes found.</div>
          ) : (
            filteredNotes.map(n => (
              <div 
                key={n.id}
                onClick={() => setActiveNoteId(n.id)}
                className={`group cursor-pointer rounded-2xl border p-3 transition ${activeNoteId === n.id ? "border-amber-500/50 bg-amber-500/5" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-bold text-slate-200 line-clamp-1">{n.title || "Untitled Note"}</div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <Calendar size={10} /> {n.date || n.updatedAt.split("T")[0]}
                </div>
                <div className="mt-2 text-xs text-slate-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: n.content.replace(/<[^>]*>?/gm, ' ') || "No content" }} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Right Editor */}
      <div className="flex flex-1 flex-col bg-slate-950">
        {activeNote ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex flex-1 items-center gap-4">
                <input 
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="bg-transparent text-2xl font-black text-slate-100 outline-none placeholder:text-slate-700 flex-1"
                  placeholder="Note Title"
                />
                <input 
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-300 outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveNote} className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-400 transition hover:bg-amber-500/20">
                  {isSaving ? "Saving..." : "Save Note"}
                </button>
              </div>
            </div>

            {/* Trading Stats Context Panel */}
            {noteDate && linkedTrades.length > 0 && (
              <div className="border-b border-slate-800 bg-slate-900/30 px-6 py-4">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Trading Stats for {noteDate}</div>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-xs text-slate-400">Net P&L</div>
                    <div className={`text-xl font-black ${pnlColor(pnl)}`}>{fmtMoneyLocal(pnl)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total Trades</div>
                    <div className="text-xl font-black text-slate-200">{linkedTrades.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Win Rate</div>
                    <div className="text-xl font-black text-amber-400">{fmtPctLocal(winRate)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Rich Text Editor Body */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <MenuBar editor={editor} />
              
              <div className="flex gap-2 px-6 py-2 border-b border-slate-800/50 bg-slate-900/20">
                <span className="text-xs font-semibold text-slate-500 my-auto uppercase tracking-wider">Templates:</span>
                <button onClick={() => applyTemplate('pre')} className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition">☀️ Pre-Market</button>
                <button onClick={() => applyTemplate('post')} className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition">🌙 Post-Session</button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-950">
                <EditorContent editor={editor} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <FileText size={48} className="mb-4 opacity-20" />
            <div className="text-xl font-black text-slate-400">No Note Selected</div>
            <div className="mt-2 text-sm">Select a note from the list or create a new one to start journaling.</div>
          </div>
        )}
      </div>
    </div>
  );
}
