import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import { getSessionToken } from '../utils/cookieUtils.js'
import { fileURLToPath } from 'url'
import { createMainWindow } from '../windows/windowCreation.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function setupExpressServer(store) {
  const expressApp = express()
  const port = 53340

  // Middleware for parsing JSON bodies
  expressApp.use(bodyParser.json())
  expressApp.use(cors())
  expressApp.use(express.static(path.join(__dirname, '../public')))

  // POST endpoint for handling login cookies
  expressApp.post('/login/cookies', handleLoginCookies(store))

  return expressApp.listen(port, () => {
    console.log(`Express app listening at http://localhost:${port}`)
  })
}

function handleLoginCookies(store) {
  return (req, res) => {
    console.log('LOGIN Received cookies:', req.body)
    const { cookies } = req.body
    const session_token = getSessionToken(cookies)
    console.log('Received cookies:', cookies, 'and session token:', session_token)

    if (cookies && session_token) {
      // Store cookies and session token in the store
      store.set('cookies', cookies)
      store.set('session_token', session_token)
      console.log('Cookies stored.', cookies, session_token)

      // Send a success message to the client
      res.send('Your Kick account has been successfully connected to Kichat. You can now open Kichat.')
      handleSuccessfulLogin() // Close the login window and open the main window
    } else {
      res.status(400).send('No cookies provided.')
      console.log('No cookies provided.')
    }
  }
}

function handleSuccessfulLogin() {
  if (global.loginWindow && !global.loginWindow.isDestroyed()) {
    global.loginWindow.close()
  }
  
  if (!global.mainWindow || global.mainWindow.isDestroyed()) {
    global.mainWindow = createMainWindow()
  } else {
    global.mainWindow.reload()
  }

  // Wait for a short time before closing the login window
  setTimeout(() => {
    if (global.loginWindow && !global.loginWindow.isDestroyed()) {
      global.loginWindow.close()
    }
  }, 500) // Wait for 500 milliseconds before closing the login window
}
