const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'

// ポート番号を動的に設定
// 優先順位: 1. コマンドライン引数 --port, 2. 環境変数 PORT, 3. デフォルト 3000
const getPort = () => {
  // コマンドライン引数から --port を取得
  const args = process.argv.slice(2)
  const portIndex = args.findIndex(arg => arg === '--port')
  if (portIndex !== -1 && args[portIndex + 1]) {
    const portArg = parseInt(args[portIndex + 1], 10)
    if (!isNaN(portArg)) {
      return portArg
    }
  }
  
  // 環境変数 PORT を確認
  if (process.env.PORT) {
    const portEnv = parseInt(process.env.PORT, 10)
    if (!isNaN(portEnv)) {
      return portEnv
    }
  }
  
  // デフォルト値
  return 3000
}

const port = getPort()

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
  .on('error', (err) => {
    console.error(err)
    process.exit(1)
  })
})