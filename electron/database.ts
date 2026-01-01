import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import * as path from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

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

interface DatabaseSchema {
  notes: Note[]
  settings: NoteSettings
}

export class Database {
  private db: Low<DatabaseSchema>
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'notes.json')
    const adapter = new JSONFile<DatabaseSchema>(dbPath)
    this.db = new Low(adapter, {
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
    })
    this.initPromise = this.init()
  }

  private async init() {
    await this.db.read()
    if (this.db.data === null) {
      this.db.data = {
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
      await this.db.write()
    }
    this.initialized = true
  }

  private async ensureInit() {
    if (!this.initialized && this.initPromise) {
      await this.initPromise
    }
  }

  async getAllNotes(): Promise<Note[]> {
    await this.ensureInit()
    return this.db.data.notes.sort((a, b) => b.createdAt - a.createdAt)
  }

  getNote(id: string): Note | undefined {
    return this.db.data?.notes.find(n => n.id === id)
  }

  createNote(data: Partial<Note> = {}): Note {
    if (!this.db.data) {
      this.db.data = {
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

    const palette = ['#ffff00', '#ffa500', '#90ee90', '#87ceeb', '#ffb6c1', '#dda0dd', '#f5deb3', '#f0e68c']
    const index = this.db.data.notes.length % palette.length
    const defaultColor = palette[index]

    const note: Note = {
      id: uuidv4(),
      title: data?.title || '新便签',
      content: data?.content || '',
      color: data?.color || defaultColor,
      style: data?.style || 'normal',
      position: data?.position || { width: 150, height: 200 },
      alwaysOnTop: data?.alwaysOnTop || false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.db.data.notes.push(note)
    this.db.write()
    return note
  }

  updateNote(id: string, updates: Partial<Note>): Note | null {
    if (!this.db.data) return null

    const index = this.db.data.notes.findIndex(n => n.id === id)
    if (index === -1) return null

    this.db.data.notes[index] = {
      ...this.db.data.notes[index],
      ...updates,
      updatedAt: Date.now()
    }

    this.db.write()
    return this.db.data.notes[index]
  }

  updateNotePosition(id: string, position: { width: number; height: number; x?: number; y?: number }) {
    if (!this.db.data) return

    const note = this.db.data.notes.find(n => n.id === id)
    if (note) {
      note.position = { ...note.position, ...position }
      note.updatedAt = Date.now()
      this.db.write()
    }
  }

  deleteNote(id: string): boolean {
    if (!this.db.data) return false

    const index = this.db.data.notes.findIndex(n => n.id === id)
    if (index === -1) return false

    this.db.data.notes.splice(index, 1)
    this.db.write()
    return true
  }

  getSettings(): NoteSettings {
    if (!this.db.data) {
      return {
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
    return this.db.data.settings
  }

  updateSettings(updates: Partial<NoteSettings>): NoteSettings {
    const defaultSettings: NoteSettings = {
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

    if (!this.db.data) {
      this.db.data = {
        notes: [],
        settings: defaultSettings
      }
    }

    this.db.data.settings = {
      ...this.db.data.settings,
      ...updates
    }

    this.db.write()
    return this.db.data.settings
  }
}
