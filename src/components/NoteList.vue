<template>
  <div class="note-list" ref="listRef">
    <header class="header" ref="headerRef">
      <h1>我的便签</h1>
      <div style="display:flex; gap:10px;">
        <button class="create-btn" @click="createNote">
          <span style="font-size: 24px;">+</span>
          新建便签
        </button>
        <button class="create-btn" @click="openSettings">
          ⚙️ 设置
        </button>
      </div>
    </header>

    <div class="search-bar" ref="searchRef">
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="搜索便签..."
      />
      <select v-model="sortBy" class="sort-select">
        <option value="dateDesc">最新创建</option>
        <option value="dateAsc">最早创建</option>
        <option value="titleAsc">标题 A-Z</option>
        <option value="titleDesc">标题 Z-A</option>
      </select>
    </div>

    <div class="notes-grid" :style="gridInlineStyle">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-card"
        :style="[ { backgroundColor: note.color }, cardStyle ]"
        @click="openNote(note.id)"
      >
        <div class="note-header">
          <h3>{{ note.title || '无标题' }}</h3>
          <button class="delete-btn" @click.stop="deleteNote(note.id)">×</button>
        </div>
        <p class="note-preview">{{ note.content || '空便签' }}</p>
        <p class="note-date">{{ formatDate(note.createdAt) }}</p>
      </div>

      <div v-if="filteredNotes.length === 0" class="empty-state">
        <p>{{ searchQuery ? '未找到匹配的便签' : '暂无便签，点击上方按钮创建一个吧！' }}</p>
      </div>
    </div>
    
    <SettingsPanel
      :is-open="showSettings"
      @close="showSettings = false"
      @apply="applySettings"
      @save="saveSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { Note } from '../types'
import SettingsPanel from './SettingsPanel.vue'

const notes = ref<Note[]>([])
const searchQuery = ref('')
const sortBy = ref('dateDesc')
const showSettings = ref(false)
const listRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLElement | null>(null)
const gridInlineStyle = ref<{ gridTemplateColumns: string }>({ gridTemplateColumns: 'repeat(4, 1fr)' })
const cardHeight = ref<number>(200)
const cardStyle = computed(() => ({ height: `${cardHeight.value}px` }))

const filteredNotes = computed(() => {
  let result = [...notes.value]
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(note =>
      (note.title && note.title.toLowerCase().includes(query)) ||
      (note.content && note.content.toLowerCase().includes(query))
    )
  }
  
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'dateDesc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'dateAsc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'titleAsc':
        return (a.title || '').localeCompare(b.title || '', 'zh-CN')
      case 'titleDesc':
        return (b.title || '').localeCompare(a.title || '', 'zh-CN')
      default:
        return 0
    }
  })
  
  return result
})

onMounted(async () => {
  await loadNotes()
  
  if (window.electronAPI?.onNoteCreated) {
    window.electronAPI.onNoteCreated(() => {
      loadNotes()
    })
  }
  
  updateLayout()
  window.addEventListener('resize', updateLayout)
})

onUnmounted(() => {
  // Cleanup if needed
  window.removeEventListener('resize', updateLayout)
})

async function loadNotes() {
  if (window.electronAPI?.getNotes) {
    notes.value = await window.electronAPI.getNotes()
  }
}

async function createNote() {
  if (window.electronAPI?.createNote) {
    await window.electronAPI.createNote()
    await loadNotes()
  }
}

async function deleteNote(id: string) {
  if (window.electronAPI?.deleteNote) {
    await window.electronAPI.deleteNote(id)
    await loadNotes()
  }
}

function openNote(id: string) {
  if (window.electronAPI?.openNote) {
    window.electronAPI.openNote(id)
  }
}

function openSettings() {
  showSettings.value = true
}

async function applySettings(newSettings: any) {
  try {
    await window.electronAPI.updateSettings(newSettings)
  } catch {}
}

async function saveSettings(newSettings: any) {
  try {
    await window.electronAPI.updateSettings(newSettings)
    showSettings.value = false
  } catch {}
}

function formatDate(date: number | string) {
  const d = new Date(date as any)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function updateLayout() {
  const list = listRef.value
  const header = headerRef.value
  const search = searchRef.value
  if (!list) return
  
  const totalH = list.clientHeight
  const headerH = header?.clientHeight ?? 0
  const searchH = search?.clientHeight ?? 0
  const paddingV = 24 * 2
  const gap = 18 * (4 - 1)
  const availableH = totalH - headerH - searchH - paddingV
  const rowH = Math.max(Math.floor((availableH - gap) / 4), 160)
  cardHeight.value = rowH
  
  gridInlineStyle.value = { gridTemplateColumns: 'repeat(4, 1fr)' }
}
</script>

<style scoped>
.note-list {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  padding: 24px;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  padding: 0 10px;
}

.header h1 {
  font-size: 30px;
  color: #1f2937;
  letter-spacing: 0.5px;
}

.search-bar {
  margin-bottom: 20px;
  padding: 0 10px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.search-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.15);
}

.sort-select {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s;
  outline: none;
}

.sort-select:hover {
  border-color: #60a5fa;
}

.sort-select:focus {
  border-color: #60a5fa;
}

.create-btn {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: #fff;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.3);
}

.notes-grid {
  display: grid;
  gap: 18px;
}

.note-card {
  background: #ffff00;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
}

.note-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.note-header h3 {
  font-size: 18px;
  color: #111827;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.delete-btn {
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  font-size: 20px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.delete-btn:hover {
  background: #ef4444;
  color: #fff;
}

.note-preview {
  flex: 1;
  color: #374151;
  font-size: 14px;
  line-height: 1.7;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  margin-bottom: 12px;
}

.note-date {
  font-size: 12px;
  color: #6b7280;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 18px;
}
</style>
