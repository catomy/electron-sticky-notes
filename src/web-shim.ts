import { v4 as uuidv4 } from 'uuid'

// 定义类型以避免循环依赖
interface Note {
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

interface NoteSettings {
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

if (typeof (window as any).electronAPI === 'undefined') {
  console.log('Running in web mode (Vercel), initializing mock Electron API')
  
  const LOCAL_STORAGE_KEY = 'sticky-notes-data'
  
  const getDB = () => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (data) return JSON.parse(data)
    return {
      notes: [],
      settings: {
        width: 300,
        height: 400,
        opacity: 1,
        fontSize: 14,
        fontColor: '#333333',
        fontFamily: 'Microsoft YaHei',
        fontWeight: 'normal',
        fontStyle: 'normal',
        style: 'normal'
      }
    }
  }
  
  const saveDB = (data: any) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  }

  // 简单的事件发布订阅
  const listeners: Record<string, Function[]> = {}
  const emit = (event: string, data: any) => {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(data))
    }
  }

  (window as any).electronAPI = {
    getAllNotes: async () => {
      const db = getDB()
      return db.notes
    },
    createNote: async (data: Partial<Note>) => {
      const db = getDB()
      const now = Date.now()
      const newNote: Note = {
        id: uuidv4(),
        title: '',
        content: '',
        color: '#ffff00',
        style: 'normal',
        position: { width: 150, height: 200, x: 100, y: 100 },
        alwaysOnTop: false,
        createdAt: now,
        updatedAt: now,
        ...data
      }
      db.notes.unshift(newNote)
      saveDB(db)
      emit('note-created', newNote)
      return newNote
    },
    updateNote: async (id: string, updates: any) => {
      const db = getDB()
      const index = db.notes.findIndex((n: Note) => n.id === id)
      if (index !== -1) {
        db.notes[index] = { ...db.notes[index], ...updates, updatedAt: Date.now() }
        saveDB(db)
        emit('note-updated', db.notes[index])
        return db.notes[index]
      }
      return null
    },
    deleteNote: async (id: string) => {
      const db = getDB()
      db.notes = db.notes.filter((n: Note) => n.id !== id)
      saveDB(db)
      emit('note-deleted', id)
      return true
    },
    getNote: async (id: string) => {
      const db = getDB()
      return db.notes.find((n: Note) => n.id === id)
    },
    saveSettings: async (settings: NoteSettings) => {
      const db = getDB()
      db.settings = settings
      saveDB(db)
      return true
    },
    getSettings: async () => {
      const db = getDB()
      return db.settings
    },
    // Alias getNotes to getAllNotes for compatibility
    getNotes: async () => {
      const db = getDB()
      return db.notes
    },
    openNote: async (id: string) => {
       window.open(`/note.html?id=${id}`, '_blank', 'width=300,height=400,menubar=no,toolbar=no,location=no,status=no')
    },
    onNoteCreated: (callback: any) => {
      if (!listeners['note-created']) listeners['note-created'] = []
      listeners['note-created'].push((_event: any, note: any) => callback(note)) // Adapt signature
    },
    onNoteUpdated: (callback: any) => {
      if (!listeners['note-updated']) listeners['note-updated'] = []
      listeners['note-updated'].push((_event: any, note: any) => callback(note))
    },
    onNoteDeleted: (callback: any) => {
      if (!listeners['note-deleted']) listeners['note-deleted'] = []
      listeners['note-deleted'].push((_event: any, id: string) => callback(id))
    },
    showColorMenu: async () => {
        alert('Web版暂不支持右键菜单，请在设置中修改')
    },
    togglePin: async () => console.log('Web版不支持置顶'),
    closeWindow: async () => console.log('Web版不支持关闭窗口'),
    minimizeWindow: async () => console.log('Web版不支持最小化'),
    showContextMenu: async () => console.log('Web版不支持上下文菜单')
  }
}
