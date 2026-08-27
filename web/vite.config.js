import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  // 开发服务器配置
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7001',
        changeOrigin: true,
      },
      '/images': {
        target: 'http://127.0.0.1:7001',
        changeOrigin: true,
        bypass(request) {
          if (request.url.startsWith('/images/styles/')) return request.url;
        },
      },
    },
  },
  
  // 构建配置
  build: {
    // 输出目录
    outDir: resolve(__dirname, '../server/app/public'),
    emptyOutDir: true,
    
    // 静态资源目录
    assetsDir: 'assets',
    
    // 代码分割
    rollupOptions: {
      output: {
        // 手动分割代码块
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-vuetify': ['vuetify'],
          'vendor-utils': ['axios', 'jspdf'],
        },
        
        // 文件命名规则
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // Source Map 配置
    sourcemap: false,
    
    // CSS 代码分割
    cssCodeSplit: true,
    
    // 资源内联阈值 (4KB)
    assetsInlineLimit: 4096,
  },
  
  // CSS 配置
  css: {
    // CSS 模块配置
    modules: {
      localsConvention: 'camelCase',
    },
  },
  
  // 优化配置
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'vuetify'],
  },
})
