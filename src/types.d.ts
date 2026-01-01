export interface Note {
  id: string
  title: string
  content: string
  color: string
  style: 'normal' | 'todo'
  position: {
    width: number
    height: number
    x?: number
    y?: number
  }
  alwaysOnTop: boolean
  createdAt: number
  updatedAt: number
}

export interface NoteSettings {
  width: number
  height: number
  opacity: number
  fontSize: number
  fontColor: string
  fontFamily: string
  fontWeight: string
  fontStyle: string
  style: 'normal' | 'todo'
}

export interface ElectronAPI {
  getAllNotes: () => Promise<Note[]>
  getNotes: () => Promise<Note[]>
  createNote: (noteData?: Partial<Note>) => Promise<Note>
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<Note | null>
  deleteNote: (noteId: string) => Promise<boolean>
  openNote: (noteId: string) => Promise<void>
  showMainWindow: () => Promise<void>
  openNoteWindow: (noteId: string) => Promise<void>
  closeNoteWindow: (noteId: string) => Promise<void>
  minimizeNoteWindow: (noteId: string) => Promise<void>
  restoreNoteWindow: (noteId: string) => Promise<void>
  toggleNoteWindow: (noteId: string) => Promise<void>
  setAlwaysOnTop: (noteId: string, flag: boolean) => Promise<void>
  getNoteId: () => string | null
  onNoteCreated: (callback: (note: Note) => void) => void
  getSettings: () => Promise<NoteSettings>
  updateSettings: (updates: Partial<NoteSettings>) => Promise<NoteSettings>
  applyWindowSettings: (noteId: string, settings: Partial<{ width: number; height: number; opacity: number }>) => Promise<void>
  showColorMenu: (noteId: string) => Promise<void>
  onNoteColorChanged: (callback: (payload: { id: string; color: string }) => void) => void
  onNoteStyleChanged: (callback: (payload: { id: string; style: 'normal' | 'todo' }) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
