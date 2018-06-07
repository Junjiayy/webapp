import wepy from 'wepy'

const host = 'http://larabbs.test/api'

const request = async (options, showLoading = true) => {
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }

  showLoading && wepy.showLoading({title: '加载中'})

  options.url = host + '/' + options.url

  let response = await wepy.request(options)

  showLoading && wepy.hideLoading()

  if (response.statusCode === 500) {
    wepy.showModal({
      title: '提示',
      content: '服务器错误，请联系管理员或重试'
    })
  }

  return response
}

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

export default {
  request,login
}
