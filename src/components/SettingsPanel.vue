<template>
  <div class="settings-panel" v-if="isOpen">
    <div class="settings-header">
      <h3>便签设置</h3>
      <button class="close-btn" @click="close">×</button>
    </div>

    <div class="settings-content">
      <div class="setting-group">
        <label>便签大小</label>
        <div class="size-inputs">
          <div class="input-group">
            <span>宽度</span>
            <input type="number" v-model.number="settings.width" min="200" max="800" @change="applySettings" />
            <span>px</span>
          </div>
          <div class="input-group">
            <span>高度</span>
            <input type="number" v-model.number="settings.height" min="200" max="1000" @change="applySettings" />
            <span>px</span>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <label>透明度: {{ Math.round(settings.opacity * 100) }}%</label>
        <input
          type="range"
          v-model.number="settings.opacity"
          min="0.3"
          max="1"
          step="0.05"
          @input="applySettings"
          class="range-slider"
        />
      </div>

      <div class="setting-group">
        <label>字体大小: {{ settings.fontSize }}px</label>
        <input
          type="range"
          v-model.number="settings.fontSize"
          min="12"
          max="24"
          step="1"
          @input="applySettings"
          class="range-slider"
        />
      </div>

      <div class="setting-group">
        <label>字体颜色</label>
        <div class="color-inputs">
          <input
            type="color"
            v-model="settings.fontColor"
            @change="applySettings"
            class="color-picker"
          />
          <input
            type="text"
            v-model="settings.fontColor"
            @change="applySettings"
            class="color-text"
          />
        </div>
      </div>

      <div class="setting-group">
        <label>字体类型</label>
        <select v-model="settings.fontFamily" @change="applySettings" class="font-select">
          <option value="Microsoft YaHei">微软雅黑</option>
          <option value="SimSun">宋体</option>
          <option value="SimHei">黑体</option>
          <option value="KaiTi">楷体</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
        </select>
      </div>

      <div class="setting-group">
        <label>便签风格</label>
        <select v-model="settings.style" @change="applySettings" class="style-select">
          <option value="normal">普通便签</option>
          <option value="todo">待办清单</option>
        </select>
      </div>

      <div class="setting-group">
        <label>字体样式</label>
        <div class="font-style-buttons">
          <button
            class="style-btn"
            :class="{ active: settings.fontWeight === 'bold' }"
            @click="toggleBold"
            title="加粗"
          >
            <strong>B</strong>
          </button>
          <button
            class="style-btn"
            :class="{ active: settings.fontStyle === 'italic' }"
            @click="toggleItalic"
            title="斜体"
          >
            <em>I</em>
          </button>
        </div>
      </div>

      <div class="setting-actions">
        <button class="reset-btn" @click="resetToDefault">恢复默认</button>
        <button class="apply-btn" @click="saveSettings">保存设置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

interface Settings {
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

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [settings: Settings]
  save: [settings: Settings]
}>()

const defaultSettings: Settings = {
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

const settings = reactive<Settings>({ ...defaultSettings })

onMounted(() => {
  loadSettings()
})

async function loadSettings() {
  try {
    const saved = await window.electronAPI.getSettings()
    Object.assign(settings, saved)
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
}

function applySettings() {
  emit('apply', { ...settings })
}

async function saveSettings() {
  try {
    await window.electronAPI.updateSettings(settings)
    emit('save', { ...settings })
    close()
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

function resetToDefault() {
  Object.assign(settings, defaultSettings)
  applySettings()
  saveSettings()
}

function toggleBold() {
  settings.fontWeight = settings.fontWeight === 'bold' ? 'normal' : 'bold'
  applySettings()
}

function toggleItalic() {
  settings.fontStyle = settings.fontStyle === 'italic' ? 'normal' : 'italic'
  applySettings()
}

function close() {
  emit('close')
}
</script>

<style scoped>
.settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.settings-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.settings-content {
  padding: 24px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.size-inputs {
  display: flex;
  gap: 12px;
}

.input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group span:first-child {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.input-group input[type="number"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.input-group input[type="number"]:focus {
  outline: none;
  border-color: #007bff;
}

.input-group span:last-child {
  font-size: 14px;
  color: #666;
}

.range-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: #e0e0e0;
  border-radius: 3px;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.color-inputs {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-picker {
  width: 48px;
  height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
}

.color-text {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.color-text:focus {
  outline: none;
  border-color: #007bff;
}

.font-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.font-select:focus {
  outline: none;
  border-color: #007bff;
}

.style-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.style-select:focus {
  outline: none;
  border-color: #007bff;
}

.font-style-buttons {
  display: flex;
  gap: 8px;
}

.style-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.style-btn:hover {
  background: #f5f5f5;
}

.style-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.setting-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

.reset-btn,
.apply-btn {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn {
  background: #f5f5f5;
  color: #333;
}

.reset-btn:hover {
  background: #e0e0e0;
}

.apply-btn {
  background: #007bff;
  color: white;
}

.apply-btn:hover {
  background: #0056b3;
}
</style>
