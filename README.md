# 工会积分系统

微信小程序 - 游戏工会任务积分管理系统

## 功能

- 管理员发布日常/活动任务
- 成员打卡或上传截图完成任务
- 管理员审核截图（支持批量通过）
- 积分商城兑换现金/游戏物品
- 积分排行榜

## 开发

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入项目目录 `guild-points/`
3. 在 `project.config.json` 填写 AppID
4. 在 `miniprogram/app.js` 填写云开发环境 ID
5. 在云开发控制台创建数据库集合: users, tasks, submissions, rewards, exchanges
6. 右键各云函数目录 → "上传并部署: 云端安装依赖"

## 角色

- 会长: 全部权限
- 管理员: 发布任务、审核、处理兑换
- 成员: 完成任务、兑换商品
