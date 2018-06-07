import wepy from 'wepy'

const host = 'http://larabbs.test/api'

/* 请求方法封装 */
const request = async (options, showLoading = true) => {
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }

  if (showLoading) wepy.showLoading({title: '加载中'})

  options.url = host + '/' + options.url

  let response = await wepy.request(options)

  if (showLoading) wepy.hideLoading()

  if (response.statusCode === 500) {
    wepy.showModal({
      title: '提示',
      content: '服务器错误，请联系管理员或重试'
    })
  }

  return response
}

/* 登录逻辑封装 */
const login = async (params = {}) => {
  let loginData = await wepy.login()

  params.code = loginData.code

  let authResponse = await request({
    url: 'weapp/authorizations',
    data: params,
    method: 'POST'
  })

  if (authResponse.statusCode === 201) {
    wepy.setStorageSync('access_token', authResponse.data.access_token)
    wepy.setStorageSync('access_token_expired_at', new Date().getTime() + authResponse.data.expires_in * 1000)
  }

  return authResponse
}

/* 刷新Token封装 */
const refreshToken = async (accessToken) => {
  let refreshResponse = await request({
    url: host + '/' + 'authorizations/current',
    method: 'PUT',
    header: {
      'Authorization': 'Bearer ' + accessToken
    }
  })

  if (refreshResponse.statusCode === 200) {
    wepy.setStorageSync('access_token', refreshResponse.data.access_token)
    wepy.setStorageSync('access_token_expired_at', new Date().getTime() + refreshResponse.data.expires_in * 1000)
  }

  return refreshResponse
}
/* 自动获取access token */
const getToken = async (options) => {
  let accessToken = wepy.getStorageSync('access_token')
  let expiredAt = wepy.getStorageSync('access_token_expired_at')

  if (accessToken && new Date().getTime() > expiredAt) {
    let refreshResponse = await refreshToken(accessToken)
    if (refreshResponse.statusCode === 200) {
      accessToken = refreshResponse.data.access_token
    } else {
      let authResponse = await login()
      if (authResponse.statusCode === 201) {
        accessToken = authResponse.data.access_token
      }
    }
  }

  return accessToken
}

/* 需要登录的请求 */
const authRequest = async (options, showLoading = true) => {
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }

  let accessToken = await getToken()

  let header = options.header || {}
  header.Authorization = 'Bearer ' + accessToken
  options.header = header

  return request(options, showLoading)
}

/* 退出登录 */
const logout = async (params = {}) => {
  let accessToken = wepy.getStorageSync('access_token')

  let logoutResponse = await wepy.request({
    url: host + '/' + 'authorizations/current',
    method: 'DELETE',
    header: {
      'Authorization': 'Bearer ' + accessToken
    }
  })

  if (logoutResponse.statusCode === 204) wepy.clearStorage()

  return logoutResponse
}

export default {
  request, login, refreshToken, authRequest, logout
}
