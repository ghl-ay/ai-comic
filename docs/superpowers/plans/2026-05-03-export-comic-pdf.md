# 导出漫画 PDF 功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在漫画详情页添加导出按钮，点击后下载包含所有章节漫画图片的 PDF 文件。

**Architecture:** 使用 jspdf 库在前端生成 PDF，按钮放在 ComicDetail.vue 的预览按钮旁边，图片按章节顺序排列，每页一张。

**Tech Stack:** Vue 3, jspdf, Vuetify

---

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `web/package.json` | 修改 | 添加 jspdf 依赖 |
| `web/src/views/ComicDetail.vue` | 修改 | 添加导出按钮和 PDF 生成逻辑 |

---

### Task 1: 安装 jspdf 依赖

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: 安装 jspdf**

```bash
cd web && npm install jspdf
```

- [ ] **Step 2: 验证安装成功**

```bash
cd web && npm list jspdf
```

Expected: 显示 jspdf 版本号

---

### Task 2: 添加导出按钮和 PDF 生成功能

**Files:**
- Modify: `web/src/views/ComicDetail.vue`

- [ ] **Step 1: 添加 jspdf 导入**

在 `<script setup>` 顶部添加导入：

```javascript
import { jsPDF } from 'jspdf'
```

- [ ] **Step 2: 添加导出状态变量**

在现有 ref 变量后添加：

```javascript
const exporting = ref(false)
```

- [ ] **Step 3: 添加导出 PDF 函数**

在 `openPreview` 函数后添加：

```javascript
async function exportPdf() {
  const chaptersWithImages = comic.value.chapters?.filter(ch => ch.page_image) || []
  if (chaptersWithImages.length === 0) {
    showNoImageHint.value = true
    return
  }

  exporting.value = true
  try {
    const sortedChapters = [...chaptersWithImages].sort((a, b) => a.chapter_number - b.chapter_number)
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    for (let i = 0; i < sortedChapters.length; i++) {
      const chapter = sortedChapters[i]
      
      if (i > 0) {
        pdf.addPage()
      }

      try {
        const imgData = await loadImage(`/images/comics/${chapter.page_image}`)
        pdf.addImage(imgData, 'JPEG', 10, 10, 190, 277)
      } catch (e) {
        console.error(`加载图片失败: ${chapter.page_image}`, e)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    pdf.save(`${comic.value.title}-${today}.pdf`)
  } catch (e) {
    console.error('导出 PDF 失败', e)
    alert('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    img.onerror = reject
    img.src = url
  })
}
```

- [ ] **Step 4: 在模板中添加导出按钮**

在"预览漫画"按钮后（约第 30 行），添加导出按钮：

```vue
              <v-btn
                variant="outlined"
                color="primary"
                class="mr-2"
                @click="openPreview"
              >
                <v-icon left>mdi-book-open-page-variant</v-icon>
                预览漫画
              </v-btn>
              <v-btn
                variant="outlined"
                color="secondary"
                class="mr-2"
                @click="exportPdf"
                :loading="exporting"
              >
                <v-icon left>mdi-download</v-icon>
                导出漫画
              </v-btn>
```

- [ ] **Step 5: 验证功能正常**

```bash
cd web && npm run dev
```

打开漫画详情页，点击"导出漫画"按钮，验证：
- 无图片时显示提示
- 有图片时下载 PDF
- PDF 文件名格式正确
- PDF 内容顺序正确

- [ ] **Step 6: 提交代码**

```bash
git add web/package.json web/package-lock.json web/src/views/ComicDetail.vue
git commit -m "feat(web): 添加导出漫画 PDF 功能"
```
