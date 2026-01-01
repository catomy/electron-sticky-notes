<template>
  <div class="note-editor" :style="editorStyle" @contextmenu.prevent="openColorMenu">
    <div class="titlebar">
      <div class="titlebar-left">
        <input
          v-model="noteData.title"
          class="title-input"
          placeholder="便签标题"
          @input="saveNote"
        />
      </div>
      <div class="titlebar-right">
        <button
          class="titlebar-btn"
          :class="{ active: noteData.alwaysOnTop }"
          @click.stop="toggleAlwaysOnTop"
          title="置顶"
        >
          📌
        </button>
        <button class="titlebar-btn" @click.stop="minimize" title="最小化">−</button>
        <button class="titlebar-btn close" @click.stop="close" title="关闭">×</button>
      </div>
    </div>

    <div class="editor-content">
      <div v-if="settings.style === 'todo'" class="todo-content">
        <div
          v-for="(item, index) in todoItems"
          :key="index"
          class="todo-item"
        >
          <input
            type="checkbox"
            v-model="item.checked"
            @change="saveNote"
            class="todo-checkbox"
          />
          <input
            v-model="item.text"
            class="todo-input"
            :style="contentStyle"
            placeholder="添加待办事项..."
            @input="saveNote"
          />
          <button class="todo-delete" @click="deleteTodoItem(index)" v-if="todoItems.length > 1">×</button>
        </div>
        <button class="add-todo-btn" @click="addTodoItem">+ 添加待办事项</button>
      </div>
      <textarea
        v-else
        v-model="noteData.content"
        class="content-textarea"
        :style="contentStyle"
        placeholder="在此输入便签内容..."
        @input="saveNote"
      ></textarea>
    </div>

    

    

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { Note } from '../types'

interface TodoItem {
  text: string
  checked: boolean
}

const noteId = window.electronAPI.getNoteId()
const note = ref<Note | null>(null)

const noteData = ref({
  title: '',
  content: '',
  color: '#ffff00',
  alwaysOnTop: false
})

const todoItems = ref<TodoItem[]>([{ text: '', checked: false }])

const settings = ref({
  width: 300,
  height: 400,
  opacity: 1,
  fontSize: 14,
  fontColor: '#333333',
  fontFamily: 'Microsoft YaHei',
  fontWeight: 'normal',
  fontStyle: 'normal',
  style: 'normal' as 'normal' | 'todo'
})

 

let saveTimeout: ReturnType<typeof setTimeout> | null = null

const editorStyle = computed(() => ({
  backgroundColor: noteData.value.color || '#ffff00',
  opacity: settings.value.opacity
}))

const contentStyle = computed(() => ({
  fontSize: `${settings.value.fontSize}px`,
  color: settings.value.fontColor,
  fontFamily: settings.value.fontFamily,
  fontWeight: settings.value.fontWeight,
  fontStyle: settings.value.fontStyle
}))

const loadNote = async () => {
  if (!noteId) return

  try {
    const allNotes = await window.electronAPI.getAllNotes()
    const currentNote = allNotes.find(n => n.id === noteId)

    if (currentNote) {
      note.value = currentNote
      noteData.value = {
        title: currentNote.title,
        content: currentNote.content,
        color: currentNote.color,
        alwaysOnTop: currentNote.alwaysOnTop
      }

      if (currentNote.style === 'todo' && currentNote.content) {
        try {
          todoItems.value = JSON.parse(currentNote.content)
        } catch {
          todoItems.value = [{ text: currentNote.content, checked: false }]
        }
      }
    }
  } catch (error) {
    console.error('Failed to load note:', error)
  }
}

const loadSettings = async () => {
  try {
    const savedSettings = await window.electronAPI.getSettings()
    settings.value = { ...settings.value, ...savedSettings }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

const saveNote = () => {
  if (!noteId) return

  if (settings.value.style === 'todo') {
    noteData.value.content = JSON.stringify(todoItems.value)
  }

  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(async () => {
    try {
      await window.electronAPI.updateNote(noteId, {
        title: noteData.value.title,
        content: noteData.value.content,
        color: noteData.value.color,
        style: settings.value.style
      })
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }, 500)
}

const openColorMenu = async () => {
  if (!noteId) return
  try {
    await window.electronAPI.showColorMenu(noteId)
  } catch {}
}

const toggleAlwaysOnTop = async () => {
  if (!noteId) return

  noteData.value.alwaysOnTop = !noteData.value.alwaysOnTop
  try {
    await window.electronAPI.setAlwaysOnTop(noteId, noteData.value.alwaysOnTop)
  } catch (error) {
    console.error('Failed to toggle always on top:', error)
  }
}

const minimize = async () => {
  if (!noteId) return
  try {
    await window.electronAPI.minimizeNoteWindow(noteId)
  } catch (error) {
    console.error('Failed to minimize:', error)
  }
}

const close = async () => {
  if (!noteId) return
  try {
    await window.electronAPI.closeNoteWindow(noteId)
  } catch (error) {
    console.error('Failed to close:', error)
  }
}

const deleteNote = async () => {
  if (!noteId) return
  try {
    await window.electronAPI.deleteNote(noteId)
  } catch (error) {
    console.error('Failed to delete note:', error)
  }
}


const addTodoItem = () => {
  todoItems.value.push({ text: '', checked: false })
  saveNote()
}

const deleteTodoItem = (index: number) => {
  if (todoItems.value.length > 1) {
    todoItems.value.splice(index, 1)
    saveNote()
  }
}

const changeStyle = async (style: 'normal' | 'todo') => {
  settings.value.style = style
  
  if (style === 'todo' && todoItems.value.length === 1 && !todoItems.value[0].text) {
    todoItems.value = [{ text: '', checked: false }]
  }
  
  saveNote()
}

onMounted(() => {
  loadNote()
  loadSettings()
  window.electronAPI.onNoteColorChanged((payload: any) => {
    if (payload?.id === noteId && payload?.color) {
      noteData.value.color = payload.color
      saveNote()
    }
  })
  window.electronAPI.onNoteStyleChanged((payload: any) => {
    if (payload?.id === noteId && payload?.style) {
      settings.value.style = payload.style
      if (payload.style === 'todo' && todoItems.value.length === 1 && !todoItems.value[0].text) {
        todoItems.value = [{ text: '', checked: false }]
      }
      saveNote()
    }
  })
})

onUnmounted(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
})
</script>

<style scoped>
.note-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: saturate(120%) contrast(105%);
}

.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: move;
  user-select: none;
  background: rgba(0, 0, 0, 0.06);
  -webkit-app-region: drag;
}

.titlebar-left {
  flex: 1;
  margin-right: 10px;
}

.title-input {
  width: 100%;
  font-size: 16px;
  font-weight: 700;
  background: transparent;
  color: #1f2937;
  outline: none;
  -webkit-app-region: no-drag;
}

.title-input::placeholder {
  color: rgba(0, 0, 0, 0.35);
}

.titlebar-right {
  display: flex;
  gap: 3px;
}

.titlebar-btn {
  width: 14px;
  height: 14px;
  border-radius: 6px;
  background: rgba(255,255,255,0.6);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  -webkit-app-region: no-drag;
}

.titlebar-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}

.titlebar-btn.active {
  background: rgba(0, 0, 0, 0.18);
}

.titlebar-btn.close:hover {
  background: #ef4444;
  color: #fff;
}

 

.editor-content {
  flex: 1;
  padding: 12px;
  overflow: hidden;
}

.content-textarea {
  width: 100%;
  height: 100%;
  font-size: 14px;
  line-height: 1.7;
  resize: none;
  background: transparent;
  color: #1f2937;
  outline: none;
  border: none;
}

.content-textarea::placeholder {
  color: rgba(0, 0, 0, 0.35);
}

.todo-content {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.todo-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.todo-input {
  flex: 1;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  outline: none;
  transition: border-color 0.2s;
}

.todo-input:focus {
  border-color: rgba(0, 0, 0, 0.22);
}

.todo-input::placeholder {
  color: rgba(0, 0, 0, 0.35);
}

.todo-delete {
  width: 12px;
  height: 12px;
  border: none;
  background: rgba(255,255,255,0.6);
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.todo-delete:hover {
  background: #ef4444;
  color: #fff;
}

.add-todo-btn {
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  border: 1px dashed rgba(0,0,0,0.2);
  background: transparent;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.add-todo-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}

 

</style>
