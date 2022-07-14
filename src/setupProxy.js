const { createProxyMiddleware } = require('http-proxy-middleware')


module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080', // CBAS Service
      changeOrigin: true
    })
  )
  app.use(
    '/status',
    createProxyMiddleware({
      target: 'http://localhost:8080', // CBAS Service
      changeOrigin: true
    })
  )
}
