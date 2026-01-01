import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAllNotes: () => ipcRenderer.invoke('get-all-notes'),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  createNote: (noteData: any) => ipcRenderer.invoke('create-note', noteData),
  updateNote: (noteId: string, updates: any) => ipcRenderer.invoke('update-note', noteId, updates),
  deleteNote: (noteId: string) => ipcRenderer.invoke('delete-note', noteId),
  openNote: (noteId: string) => ipcRenderer.invoke('open-note', noteId),
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),

  openNoteWindow: (noteId: string) => ipcRenderer.invoke('open-note-window', noteId),
  closeNoteWindow: (noteId: string) => ipcRenderer.invoke('close-note-window', noteId),
  minimizeNoteWindow: (noteId: string) => ipcRenderer.invoke('minimize-note-window', noteId),
  restoreNoteWindow: (noteId: string) => ipcRenderer.invoke('restore-note-window', noteId),
  toggleNoteWindow: (noteId: string) => ipcRenderer.invoke('toggle-note-window', noteId),
  setAlwaysOnTop: (noteId: string, flag: boolean) => ipcRenderer.invoke('set-always-on-top', noteId, flag),

  getNoteId: () => {
    const params = new URLSearchParams(location.search)
    return params.get('id')
  },

  onNoteCreated: (callback: (note: any) => void) => {
    ipcRenderer.on('note-created', (_, note) => callback(note))
  },

  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (updates: any) => ipcRenderer.invoke('update-settings', updates),
  applyWindowSettings: (noteId: string, settings: any) => ipcRenderer.invoke('apply-window-settings', noteId, settings),
  showColorMenu: (noteId: string) => ipcRenderer.invoke('show-color-menu', noteId),
  onNoteColorChanged: (callback: (payload: any) => void) => {
    ipcRenderer.on('note-color-changed', (_, payload) => callback(payload))
  },
  onNoteStyleChanged: (callback: (payload: any) => void) => {
    ipcRenderer.on('note-style-changed', (_, payload) => callback(payload))
  }
})
