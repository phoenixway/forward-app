# 1. Створимо правильний webpack.renderer.config.js з виправленням проблеми global
cat > webpack.renderer.config.js << 'EOF'
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/renderer/renderer.ts',
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist/renderer'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
    }),
    new webpack.DefinePlugin({
      'global': 'globalThis',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist/renderer'),
    },
    port: 3000,
    hot: true,
    open: false,
  },
  node: {
    global: true,
  },
};
EOF

# 2. Оновимо main.ts для правильного завантаження в режимі розробки
cat > src/main/main.ts << 'EOF'
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
  });

  // Завантажуємо додаток
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null!;
  });

  // Додаємо обробник помилок
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Failed to load:', errorCode, errorDescription);
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
EOF

# 3. Спростимо renderer.ts для тестування
cat > src/renderer/renderer.ts << 'EOF'
// Імпорт стилів
import './styles.css';

// Простий тест
console.log('Renderer процес запущено!');

// Функція для перевірки готовності DOM
function init() {
  console.log('DOM готовий!');
  
  const app = document.getElementById('app');
  if (app) {
    console.log('Елемент app знайдено');
  } else {
    console.error('Елемент app не знайдено');
  }

  const versionBtn = document.getElementById('version-btn');
  const versionInfo = document.getElementById('version-info');

  if (versionBtn && versionInfo) {
    versionBtn.addEventListener('click', async () => {
      try {
        if (window.electronAPI && window.electronAPI.getAppVersion) {
          const version = await window.electronAPI.getAppVersion();
          versionInfo.textContent = `Версія застосунку: ${version}`;
        } else {
          versionInfo.textContent = 'API недоступне';
        }
      } catch (error) {
        console.error('Помилка отримання версії:', error);
        versionInfo.textContent = 'Помилка отримання версії';
      }
    });
  }
}

// Перевіряємо готовність DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
EOF

# 4. Оновимо HTML для додавання налагодження
cat > src/renderer/index.html << 'EOF'
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Electron App</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        #app {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        button {
            background-color: #007acc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background-color: #005a9e;
        }
        #version-info {
            margin-top: 10px;
            padding: 10px;
            background-color: #e8f4fd;
            border-radius: 4px;
            color: #2c5aa0;
        }
    </style>
</head>
<body>
    <div id="app">
        <h1>Привіт, Electron!</h1>
        <p>Це простий Electron застосунок з TypeScript та Webpack.</p>
        <button id="version-btn">Показати версію</button>
        <p id="version-info">Натисніть кнопку вище</p>
        <div id="debug-info">
            <h3>Налагодження:</h3>
            <p>Перевірте консоль розробника (F12)</p>
        </div>
    </div>
    <script>
        // Додаємо глобальну змінну для тестування
        window.global = window.globalThis || window;
        console.log('Global визначено:', typeof global !== 'undefined');
        console.log('HTML завантажено');
    </script>
</body>
</html>
EOF

echo "Файли оновлено для виправлення проблеми з global!"