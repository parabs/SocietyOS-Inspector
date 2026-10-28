import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  StickyNote,
  Pin,
  Trash2,
  Search,
  ArrowRight,
  Landmark,
  FileCheck2,
  BarChart3,
  Tag,
  AlertCircle,
  Filter,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { AuditNote, AuditModuleKey } from '../../types';
import { Badge } from '../common/Badge';

interface AuditQuickNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModuleFilter: 'all' | AuditModuleKey;
  setActiveModuleFilter: (filter: 'all' | AuditModuleKey) => void;
}

export const AuditQuickNotesDrawer: React.FC<AuditQuickNotesDrawerProps> = ({
  isOpen,
  onClose,
  activeModuleFilter,
  setActiveModuleFilter,
}) => {
  const {
    auditNotes,
    addAuditNote,
    deleteAuditNote,
    togglePinAuditNote,
    setCurrentScreen,
  } = useVerification();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [newModuleId, setNewModuleId] = useState<AuditModuleKey>('opening-balances');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTag, setNewTag] = useState('Discrepancy');
  const [newAuthor, setNewAuthor] = useState('Sachin Parab (Lead Auditor)');
  const [errorMsg, setErrorMsg] = useState('');

  // Keep form's module aligned with active filter if user opens form while filtered
  const handleOpenCreate = () => {
    if (activeModuleFilter !== 'all') {
      setNewModuleId(activeModuleFilter);
    }
    setIsCreating(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMsg('Please enter a note title.');
      return;
    }
    if (!newContent.trim()) {
      setErrorMsg('Please enter note contents.');
      return;
    }

    const moduleTitleMap: Record<AuditModuleKey, string> = {
      'opening-balances': 'Opening Balance Verification',
      'transaction-verification': 'Transaction Verification',
      'monthly-reconciliation': 'Monthly Reconciliation',
    };

    addAuditNote({
      moduleId: newModuleId,
      moduleTitle: moduleTitleMap[newModuleId],
      title: newTitle.trim(),
      content: newContent.trim(),
      priority: newPriority,
      tag: newTag.trim() || undefined,
      author: newAuthor.trim() || 'Auditor',
      isPinned: false,
    });

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setErrorMsg('');
    setIsCreating(false);
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return auditNotes.filter((note) => {
      if (activeModuleFilter !== 'all' && note.moduleId !== activeModuleFilter) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = note.title.toLowerCase().includes(q);
        const matchContent = note.content.toLowerCase().includes(q);
        const matchAuthor = note.author.toLowerCase().includes(q);
        const matchTag = note.tag?.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAuthor && !matchTag) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Pinned notes come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [auditNotes, activeModuleFilter, searchQuery]);

  // Counts per module
  const counts = useMemo(() => {
    return {
      all: auditNotes.length,
      'opening-balances': auditNotes.filter((n) => n.moduleId === 'opening-balances').length,
      'transaction-verification': auditNotes.filter((n) => n.moduleId === 'transaction-verification').length,
      'monthly-reconciliation': auditNotes.filter((n) => n.moduleId === 'monthly-reconciliation').length,
    };
  }, [auditNotes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <StickyNote className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Auditor Quick Notes
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {auditNotes.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Working observations &amp; audit notes by module
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Module Filter Pills */}
          <div className="p-3 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setActiveModuleFilter('all')}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeModuleFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>All Modules</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeModuleFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setActiveModuleFilter('opening-balances')}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeModuleFilter === 'opening-balances'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Landmark className="w-3 h-3" />
                <span>Opening Balances</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeModuleFilter === 'opening-balances' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts['opening-balances']}
                </span>
              </button>

              <button
                onClick={() => setActiveModuleFilter('transaction-verification')}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeModuleFilter === 'transaction-verification'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileCheck2 className="w-3 h-3" />
                <span>Transactions</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeModuleFilter === 'transaction-verification' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts['transaction-verification']}
                </span>
              </button>

              <button
                onClick={() => setActiveModuleFilter('monthly-reconciliation')}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeModuleFilter === 'monthly-reconciliation'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>Reconciliation</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeModuleFilter === 'monthly-reconciliation' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts['monthly-reconciliation']}
                </span>
              </button>
            </div>
          </div>

          {/* Search Bar & Add Button */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes by keyword, tag, author..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (isCreating) {
                  setIsCreating(false);
                } else {
                  handleOpenCreate();
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isCreating
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
              }`}
            >
              {isCreating ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </>
              )}
            </button>
          </div>

          {/* New Note Form */}
          {isCreating && (
            <form onSubmit={handleSaveNote} className="p-4 bg-blue-50/60 border-b border-blue-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-blue-200/60">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-blue-600" />
                  New Audit Note
                </span>
                <span className="text-[10px] text-blue-600 font-medium">Auto-saves to browser storage</span>
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Audit Module *
                  </label>
                  <select
                    value={newModuleId}
                    onChange={(e) => setNewModuleId(e.target.value as AuditModuleKey)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="opening-balances">Opening Balances</option>
                    <option value="transaction-verification">Transaction Verification</option>
                    <option value="monthly-reconciliation">Monthly Reconciliation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low / General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Note Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Lift AMC GST tax invoice missing for Jul 2018"
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Observation &amp; Notes *
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  placeholder="Record working paper observations, specific voucher numbers, vendor details, or items pending committee explanation..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tag / Category
                  </label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g., Missing Voucher, Discrepancy"
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Auditor Name
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Auditor Name"
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Tag presets */}
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                <span className="font-semibold text-slate-400">Presets:</span>
                {['Discrepancy', 'Missing Voucher', 'Passbook Match', 'Sampling', 'Committee Query'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewTag(tag)}
                    className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  Save Quick Note
                </button>
              </div>
            </form>
          )}

          {/* Notes List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredNotes.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <StickyNote className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-slate-700">No Quick Notes Found</div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {searchQuery
                    ? `No notes matched query "${searchQuery}".`
                    : activeModuleFilter !== 'all'
                    ? `No notes added yet for ${activeModuleFilter}. Click "Add Note" above to attach a working paper note.`
                    : 'No auditor notes created yet. Click "Add Note" to record observations.'}
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  + Add First Note
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isOpening = note.moduleId === 'opening-balances';
                const isTxn = note.moduleId === 'transaction-verification';
                const isRecon = note.moduleId === 'monthly-reconciliation';

                return (
                  <div
                    key={note.id}
                    className={`rounded-xl border transition-all duration-200 p-4 relative group ${
                      note.isPinned
                        ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Top Row: Module Badge, Priority, Pinned, Actions */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Module Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOpening
                              ? 'bg-blue-100 text-blue-800'
                              : isTxn
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {isOpening && <Landmark className="w-3 h-3" />}
                          {isTxn && <FileCheck2 className="w-3 h-3" />}
                          {isRecon && <BarChart3 className="w-3 h-3" />}
                          <span>{note.moduleTitle}</span>
                        </span>

                        {/* Priority Badge */}
                        <Badge
                          variant={note.priority === 'High' ? 'high' : note.priority === 'Medium' ? 'medium' : 'low'}
                          label={note.priority}
                          showIcon={false}
                          className="px-1.5 py-0 text-[10px]"
                        />

                        {/* Tag */}
                        {note.tag && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            <Tag className="w-2.5 h-2.5" />
                            {note.tag}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons: Pin, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePinAuditNote(note.id)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            note.isPinned
                              ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                          }`}
                          title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                        >
                          <Pin className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => deleteAuditNote(note.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Title */}
                    <h3 className="font-bold text-xs text-slate-900 mb-1.5">
                      {note.title}
                    </h3>

                    {/* Note Content */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">
                      {note.content}
                    </p>

                    {/* Bottom Metadata & Jump Link */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <User className="w-3 h-3 text-slate-400" />
                          {note.author}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {note.timestamp}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          setCurrentScreen(note.moduleId);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer hover:underline"
                      >
                        <span>Open Module</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredNotes.length}</strong> of {auditNotes.length} notes
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 font-semibold rounded-md text-slate-700 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
