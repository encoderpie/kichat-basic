import 'core-js/stable/index.js'
import 'regenerator-runtime/runtime.js'
import { app, BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import { setupExpressServer } from './server/expressServer.js'
import {
  createLoginWindow,
  createMainWindow,
} from './windows/windowCreation.js'
import { setupIpcHandlers } from './ipc/ipcHandlers.js'
import {
  connectToChannels,
  disconnectFromChannel,
  sendMessageToChannel,
} from './channels/channelOperations.js'
import { setupPusher } from './pusher/pusherSetup.js'

let isQuitting = false
global.mainWindow = null
global.loginWindow = null

const store = new Store()
const server = setupExpressServer(store)

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  if (!isQuitting) {
    app.quit()
  }
})

app.disableHardwareAcceleration()
app.whenReady().then(initializeApp)
app.on('activate', handleActivate)
app.on('before-quit', handleBeforeQuit)
app.on('window-all-closed', handleWindowAllClosed)
app.on('will-quit', handleWillQuit)

ipcMain.on('app-closed', () => app.exit(0))

function initializeApp() {
  const cookies = store.get('cookies')
  if (cookies) {
    global.mainWindow = createMainWindow()
  } else {
    global.loginWindow = createLoginWindow()
  }

  const pusher = setupPusher(global.mainWindow)
  setupIpcHandlers(
    ipcMain,
    connectToChannels,
    disconnectFromChannel,
    sendMessageToChannel,
    pusher
  )
}

function handleActivate() {
  // If no windows are open, create a new window: for macOS
  if (BrowserWindow.getAllWindows().length === 0) {
    initializeApp()
  }
}

function handleBeforeQuit(event) {
  if (!isQuitting) {
    event.preventDefault()
    isQuitting = true
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('app-closing')
    } else {
      app.quit()
    }
  }
}

function handleWindowAllClosed() {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}

function handleWillQuit() {
  if (server) {
    server.close()
  }
}