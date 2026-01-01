import { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import * as path from 'path'
import { Database } from './database'

let mainWindow: BrowserWindow | null = null
let noteWindows: Map<string, BrowserWindow> = new Map()
let tray: Tray | null = null
const db = new Database()
let isQuitting = false

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
function getAppIcon() {
  const candidates = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../assets/icon.png')
  ]
  for (const p of candidates) {
    const img = nativeImage.createFromPath(p)
    if (!img.isEmpty()) return img
  }
  const placeholder = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsSAAALEgHS3X78AAAA' +
    'GXRFWHRTb2Z0d2FyZQBwYWludC5uZXQgNC4xLjVhQz7uAAABTElEQVR4Xu3aMQ7CMAxF0R0F0mYg' +
    'jWw3QkJmIYQpR5pHkJHkqI7nRr5VqJkJc5m7Jv2wQ4a0Q3P8r2wW2s+WwCkGk7w0kF3Cj+Ww1b3G' +
    'H8c8k3q9g6QwQ2B8LhYwZCkJmGm3VfU7b7gkYyqYwYwYwYwYwYwYwYwYwYwYwYwYy+JmHthF0bqk' +
    'd5bqkTpvwqG2vC6Fbp2iQxYwYxYwYxYwYxYwYxYwYxYwYxYwYxYwYxYwYxYwYxYwYwYwoKzCkqZ0' +
    'YwYwYwYwYwYwYwYwYwYwYwYwYwYwYwYwYwYwYwYx8Q0ox1V9mYwYwYwYwYwYwYwYwYwYwYwYwYwY' +
    'wYwYwYwYwYwYwYwYwYwYwYwYwYwZgA9JrI9rT6q8AAAAAElFTkSuQmCC'
  )
  return placeholder.isEmpty() ? nativeImage.createEmpty() : placeholder
}
async function shrinkToTaskbar(win: BrowserWindow) {
  try {
    if (win.isMinimized()) {
      win.restore()
    }
    const display = screen.getPrimaryDisplay()
    const area = display.workArea
    const start = win.getBounds()
    const targetW = 10
    const targetH = 10
    const endX = area.x + area.width - targetW
    const endY = area.y + area.height - targetH
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const w = Math.max(Math.floor(start.width + t * (targetW - start.width)), 10)
      const h = Math.max(Math.floor(start.height + t * (targetH - start.height)), 10)
      const x = Math.floor(start.x + t * (endX - start.x))
      const y = Math.floor(start.y + t * (endY - start.y))
      win.setBounds({ x, y, width: w, height: h })
      await sleep(16)
    }
  } catch {}
}

function createMainWindow() {
  const display = screen.getPrimaryDisplay()
  const area = display.workArea
  const targetWidth = Math.floor(area.width / 2)
  const targetHeight = Math.floor(area.height / 2)
  const targetX = area.x + Math.floor((area.width - targetWidth) / 2)
  const targetY = area.y + Math.floor((area.height - targetHeight) / 2)
  
  mainWindow = new BrowserWindow({
    width: targetWidth,
    height: targetHeight,
    x: targetX,
    y: targetY,
    icon: getAppIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '便签列表',
    backgroundColor: '#f5f5f5'
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:8888/')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  try {
    const icon = getAppIcon()
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          } else {
            createMainWindow()
          }
        }
      },
      {
        label: '新建便签',
        click: () => {
          const note = db.createNote({})
          if (mainWindow) {
            mainWindow.webContents.send('note-created', note)
          }
          createNoteWindow(note.id)
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
    
    tray.setToolTip('便签应用')
    tray.setContextMenu(contextMenu)
    
    tray.on('click', async () => {
      let allWindowsVisible = true
      
      // Check if all windows are visible
      for (const win of noteWindows.values()) {
        if (!win.isVisible() || win.isMinimized()) {
          allWindowsVisible = false
          break
        }
      }

      if (allWindowsVisible && noteWindows.size > 0) {
        // Hide all windows
        for (const win of noteWindows.values()) {
          win.hide()
        }
      } else {
        // Show all windows
        for (const win of noteWindows.values()) {
          if (win.isMinimized()) {
            win.restore()
          }
          win.show()
          win.setSkipTaskbar(false) // Ensure it shows in taskbar when restored
        }
        
        // Also show all notes that might not have windows yet (if we implement persistence fully)
        // For now, we just restore existing windows.
        // If no windows exist, maybe we should create one? Or just do nothing?
        // Let's create one if none exist, acting like "open app"
        if (noteWindows.size === 0) {
           const allNotes = await db.getAllNotes()
           if (allNotes.length > 0) {
             allNotes.forEach((note: any) => createNoteWindow(note.id))
           } else {
             // If no notes at all, create a new one
             const note = db.createNote({})
             if (mainWindow) {
                mainWindow.webContents.send('note-created', note)
             }
             createNoteWindow(note.id)
           }
        }
      }
    })
  } catch (error) {
    console.error('Failed to create tray:', error)
  }
}

function createNoteWindow(noteId: string) {
  // Check if window already exists
  if (noteWindows.has(noteId)) {
    const existingWindow = noteWindows.get(noteId)!
    if (!existingWindow.isDestroyed()) {
      existingWindow.focus()
      return existingWindow
    } else {
      // Remove destroyed window from map
      noteWindows.delete(noteId)
    }
  }

  const note = db.getNote(noteId)
  if (!note) {
    console.error('Note not found:', noteId)
    return null
  }

  const { width = 150, height = 200, x, y } = note.position || {}

  const noteWindow = new BrowserWindow({
    width,
    height,
    x: x !== undefined ? x : undefined,
    y: y !== undefined ? y : undefined,
    icon: getAppIcon(),
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: false,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: note.color || '#ffff00',
    title: note.title || '便签'
  })

  let windowClosing = false

  if (isDev) {
    noteWindow.loadURL(`http://localhost:8888/note.html?id=${noteId}`)
    // noteWindow.webContents.openDevTools()
  } else {
    noteWindow.loadFile(path.join(__dirname, '../dist/note.html'), {
      search: `?id=${noteId}`
    })
  }

  noteWindow.setAlwaysOnTop(note.alwaysOnTop || false)

  noteWindow.on('close', (event) => {
    if (windowClosing) {
      return
    }
    windowClosing = true
    
    event.preventDefault()
    
    try {
      if (!noteWindow.isDestroyed()) {
        const bounds = noteWindow.getBounds()
        db.updateNotePosition(noteId, {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y
        })
      }
    } catch (error) {
      console.error('Failed to save window position:', error)
    }
    
    noteWindows.delete(noteId)
    
    if (!noteWindow.isDestroyed()) {
      noteWindow.destroy()
    }
  })

  noteWindow.on('closed', () => {
    windowClosing = true
    noteWindows.delete(noteId)
  })

  noteWindow.on('moved', () => {
    const bounds = noteWindow.getBounds()
    db.updateNotePosition(noteId, {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    })
  })

  noteWindow.on('resized', () => {
    const bounds = noteWindow.getBounds()
    db.updateNotePosition(noteId, {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    })
  })

  noteWindows.set(noteId, noteWindow)
  return noteWindow
}

// IPC handlers
ipcMain.handle('get-all-notes', async () => {
  return db.getAllNotes()
})

ipcMain.handle('create-note', async (_, noteData) => {
  const note = db.createNote(noteData)
  return note
})

ipcMain.handle('update-note', async (_, noteId: string, updates: any) => {
  return db.updateNote(noteId, updates)
})

ipcMain.handle('delete-note', async (_, noteId: string) => {
  if (noteWindows.has(noteId)) {
    const win = noteWindows.get(noteId)!
    if (!win.isDestroyed()) {
      await shrinkToTaskbar(win)
      win.close()
    }
  }
  return db.deleteNote(noteId)
})

ipcMain.handle('open-note', async (_, noteId: string) => {
  createNoteWindow(noteId)
})

ipcMain.handle('open-note-window', async (_, noteId: string) => {
  createNoteWindow(noteId)
})

ipcMain.handle('set-always-on-top', async (_, noteId: string, flag: boolean) => {
  if (noteWindows.has(noteId)) {
    const win = noteWindows.get(noteId)!
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(flag)
      db.updateNote(noteId, { alwaysOnTop: flag })
    }
  }
})

ipcMain.handle('close-note-window', async (_, noteId: string) => {
  const win = noteWindows.get(noteId)
  if (win && !win.isDestroyed()) {
    win.close()
  } else {
    noteWindows.delete(noteId)
  }
})

ipcMain.handle('minimize-note-window', async (_, noteId: string) => {
  if (noteWindows.has(noteId)) {
    const win = noteWindows.get(noteId)!
    if (!win.isDestroyed()) {
      win.minimize()
    }
  }
})

ipcMain.handle('restore-note-window', async (_, noteId: string) => {
  if (noteWindows.has(noteId)) {
    const win = noteWindows.get(noteId)!
    if (!win.isDestroyed()) {
      win.restore()
      win.focus()
    }
  }
})

ipcMain.handle('toggle-note-window', async (_, noteId: string) => {
  if (noteWindows.has(noteId)) {
    const win = noteWindows.get(noteId)!
    if (!win.isDestroyed()) {
      if (win.isMinimized()) {
        win.restore()
        win.focus()
      } else {
        win.minimize()
      }
    }
  }
})

// IPC handler for getting notes (for NoteList)
ipcMain.handle('get-notes', async () => {
  return db.getAllNotes()
})

// IPC handlers for settings
ipcMain.handle('get-settings', async () => {
  return db.getSettings()
})

ipcMain.handle('update-settings', async (_, updates: any) => {
  const newSettings = db.updateSettings(updates)
  for (const [, win] of noteWindows.entries()) {
    if (win && !win.isDestroyed()) {
      if (typeof newSettings.width === 'number' && typeof newSettings.height === 'number') {
        win.setSize(newSettings.width, newSettings.height)
      }
      if (typeof newSettings.opacity === 'number') {
        win.setOpacity(newSettings.opacity)
      }
    }
  }
  return newSettings
})

ipcMain.handle('apply-window-settings', async (_, noteId: string, settings: any) => {
  if (noteWindows.has(noteId)) {
    const win = noteWindows.get(noteId)!
    if (!win.isDestroyed()) {
      // Update window size
      if (settings.width && settings.height) {
        win.setSize(settings.width, settings.height)
      }
      
      // Update window opacity
      if (settings.opacity) {
        win.setOpacity(settings.opacity)
      }
    }
  }
})

ipcMain.handle('show-color-menu', async (_, noteId: string) => {
  const palette: Array<{ name: string; color: string }> = [
    { name: '黄色', color: '#ffff00' },
    { name: '橙色', color: '#ffa500' },
    { name: '绿色', color: '#90ee90' },
    { name: '天蓝', color: '#87ceeb' },
    { name: '粉红', color: '#ffb6c1' },
    { name: '淡紫', color: '#dda0dd' },
    { name: '小麦色', color: '#f5deb3' },
    { name: '卡其色', color: '#f0e68c' }
  ]
  const note = db.getNote(noteId)
  const win = noteWindows.get(noteId)
  const colorMenuItems: MenuItemConstructorOptions[] = palette.map(({ name, color }) => ({
    label: name,
    type: 'radio',
    checked: note?.color === color,
    click: () => {
      db.updateNote(noteId, { color })
      const w = noteWindows.get(noteId)
      if (w && !w.isDestroyed()) {
        try {
          w.setBackgroundColor(color)
          w.webContents.send('note-color-changed', { id: noteId, color })
        } catch {}
      }
    }
  }))
  const styleMenuItems: MenuItemConstructorOptions[] = [
    {
      label: '普通',
      type: 'radio',
      checked: note?.style === 'normal',
      click: () => {
        db.updateNote(noteId, { style: 'normal' })
        const w = noteWindows.get(noteId)
        if (w && !w.isDestroyed()) {
          try {
            w.webContents.send('note-style-changed', { id: noteId, style: 'normal' })
          } catch {}
        }
      }
    },
    {
      label: '待办',
      type: 'radio',
      checked: note?.style === 'todo',
      click: () => {
        db.updateNote(noteId, { style: 'todo' })
        const w = noteWindows.get(noteId)
        if (w && !w.isDestroyed()) {
          try {
            w.webContents.send('note-style-changed', { id: noteId, style: 'todo' })
          } catch {}
        }
      }
    }
  ]
  const menu = Menu.buildFromTemplate([
    { label: '颜色', submenu: colorMenuItems },
    { label: '样式', submenu: styleMenuItems }
  ])
  try {
    menu.popup({ window: win })
  } catch {}
})

ipcMain.handle('show-main-window', async () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createMainWindow()
  }
})

app.whenReady().then(() => {
  createMainWindow()
  createTray()

  // Register global shortcuts
  const ret = globalShortcut.register('CommandOrControl+N', () => {
    // Create new note
    const note = db.createNote({})
    if (mainWindow) {
      mainWindow.webContents.send('note-created', note)
    }
    createNoteWindow(note.id)
  })

  if (!ret) {
    console.error('Global shortcut registration failed')
  }

  const retClose = globalShortcut.register('CommandOrControl+W', () => {
    // Close focused window
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.close()
    }
  })

  if (!retClose) {
    console.error('Global shortcut registration failed for close')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll()
})
