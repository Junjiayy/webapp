import wepy from 'wepy'
import api from '@/utils/api'
import util from '@/utils/util'

export default class ReplyMixin extends wepy.mixin {
  config = {
    enablePullDownRefresh: true
  }

  data = {
    replies: [],
    noMoreData: false,
    isLoading: false,
    page: 1
  }

  methods = {
    async deleteReply(topicId, replyId) {
      let res = await wepy.showModal({
        title: '确认删除',
        content: '您确认删除该回复吗',
        confirmText: '删除',
        cancelText: '取消'
      })

      if (!res.confirm) return

      try {
        let deleteResponse = await api.authRequest({
          url: 'topics/' + topicId + '/replies/' + replyId,
          method: 'DELETE'
        })

        if (deleteResponse.statusCode === 204) {
          wepy.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 2000
          })

          this.replies = this.replies.filter((reply) => reply.id !== replyId)
          this.$apply()
        }

        return deleteResponse
      } catch (err) {
        console.log(err)
        wepy.showModal({
          title: '提示',
          content: '服务器错误，请联系管理员'
        })
      }
    }
  }

  async getReplies(reset = false) {
    try {
      let repliesResponse = await api.request({
        url: this.requestData.url,
        data: {
          page: this.page,
          include: this.requestData.include || 'user'
        }
      })

      if (repliesResponse.statusCode === 200) {
        let replies = repliesResponse.data.data
        let user = await this.$parent.getCurrentUser()

        replies.forEach((reply) => {
          reply.can_delete = this.canDelete(user, reply)
          reply.created_at_diff = util.diffForHumans(reply.created_at)
        })

        this.replies = reset ? replies : this.replies.concat(replies)

        let pagination = repliesResponse.data.meta.pagination
        if (pagination.current_page === pagination.total_pages) {
          this.noMoreData = true
        }
        this.$apply()
      }

      return repliesResponse
    } catch (err) {
      console.log(err)
      wepy.showModal({
        title: '提示',
        content: '服务器错误，请联系管理员'
      })
    }
  }

  canDelete(user, reply) {
    if (!user) return false
    return (reply.user_id === user.id)
  }

  async onPullDownRefresh() {
    this.noMoreData = false
    this.page = 1
    await this.getReplies(true)
    wepy.stopPullDownRefresh()
  }

  async onReachBottom() {
    if (this.noMoreData || this.isLoading) return
    this.isLoading = true
    this.page = this.page + 1
    await this.getReplies()
    this.isLoading = false
    this.$apply()
  }
}
