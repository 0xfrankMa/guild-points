// pages.js - All 6 page render functions for the guild points mobile web app SPA
// Relies on globals from app.js: api, navigate, route, showToast, showConfirm, showPrompt,
// getToken, setToken, clearToken, uploadFile, $, $$

// Page 1: Login (#login)
route('#login', async (app) => {
  // If already has token, redirect to home
  if (getToken()) { navigate('#home'); return }

  // Read invite code from URL query param ?invite=XXX
  const urlParams = new URLSearchParams(window.location.search)
  const preInvite = urlParams.get('invite') || ''

  app.innerHTML = `
    <div class="login-page">
      <div class="logo-section">
        <div class="capybara-avatar">
          <span>🦫</span>
          <span class="capybara-crown">👑</span>
        </div>
        <span class="app-title">工会积分</span>
        <span class="app-subtitle">完成任务 · 收集积分 · 赢取奖励</span>
      </div>
      <div class="tab-bar">
        <div class="tab active" data-tab="join">🏰 加入工会</div>
        <div class="tab" data-tab="create">⚔️ 创建工会</div>
      </div>
      <div class="card" id="join-form">
        <div class="input-group">
          <label class="label">🔑 邀请码</label>
          <input class="input" id="invite-code" placeholder="输入工会邀请码" value="${preInvite}">
        </div>
        <div class="input-group">
          <label class="label">🎮 游戏昵称</label>
          <input class="input" id="join-nickname" placeholder="输入你的游戏内昵称">
        </div>
        <button class="btn" id="btn-join">加入工会 🚀</button>
      </div>
      <div class="card" id="create-form" style="display:none">
        <div class="input-group">
          <label class="label">🔐 激活码</label>
          <input class="input" id="activation-code" placeholder="输入激活码">
        </div>
        <div class="input-group">
          <label class="label">🏰 工会名称</label>
          <input class="input" id="guild-name" placeholder="输入工会名称">
        </div>
        <div class="input-group">
          <label class="label">🎮 会长游戏昵称</label>
          <input class="input" id="create-nickname" placeholder="输入你的游戏内昵称">
        </div>
        <button class="btn" id="btn-create">创建工会 ⚔️</button>
      </div>
    </div>`

  // Tab switching
  app.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      app.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const isJoin = tab.dataset.tab === 'join'
      app.querySelector('#join-form').style.display = isJoin ? '' : 'none'
      app.querySelector('#create-form').style.display = isJoin ? 'none' : ''
    }
  })

  app.querySelector('#btn-join').onclick = async () => {
    const inviteCode = app.querySelector('#invite-code').value.trim()
    const nickname = app.querySelector('#join-nickname').value.trim()
    if (!inviteCode || !nickname) { showToast('请填写完整信息'); return }
    try {
      const res = await api('POST', '/api/guild/join', { inviteCode, nickname })
      setToken(res.token)
      showToast('加入成功!')
      setTimeout(() => navigate('#home'), 500)
    } catch(e) { showToast(e.message) }
  }

  app.querySelector('#btn-create').onclick = async () => {
    const activationCode = app.querySelector('#activation-code').value.trim()
    const name = app.querySelector('#guild-name').value.trim()
    const nickname = app.querySelector('#create-nickname').value.trim()
    if (!activationCode || !name || !nickname) { showToast('请填写完整信息'); return }
    try {
      const res = await api('POST', '/api/guild/create', { name, nickname, activationCode })
      setToken(res.token)
      showToast('创建成功! 邀请码: ' + res.inviteCode)
      setTimeout(() => navigate('#home'), 1500)
    } catch(e) { showToast(e.message) }
  }
})

// Page 2: Home (#home)
route('#home', async (app) => {
  const [profileRes, tasksRes] = await Promise.all([
    api('GET', '/api/profile'),
    api('GET', '/api/tasks')
  ])
  const user = profileRes.user
  const tasks = tasksRes.tasks || []
  const isAdmin = user.role === 'master' || user.role === 'admin'

  app.innerHTML = `
    <div class="page">
      <div class="points-card">
        <div style="position:absolute;right:16px;top:16px;font-size:40px;opacity:0.2;">🦫</div>
        <div style="position:relative;">
          <span class="points-label">💰 我的积分</span>
          <span class="points-value">${user.points || 0}</span>
        </div>
        <div class="stats-row" style="margin-top:16px;margin-bottom:0;">
          <div style="flex:1;"><span style="font-size:20px;font-weight:bold;">${user.total_earned||0}</span><br><span class="points-label">⬆️ 累计获得</span></div>
          <div style="flex:1;"><span style="font-size:20px;font-weight:bold;">${user.total_spent||0}</span><br><span class="points-label">⬇️ 累计消费</span></div>
        </div>
      </div>
      <div class="quick-actions">
        <div class="action-btn" onclick="navigate('#shop')"><span class="action-icon">🎁</span><span>积分商城</span></div>
        <div class="action-btn" onclick="navigate('#profile')"><span class="action-icon">🦫</span><span>我的</span></div>
        ${isAdmin ? '<div class="action-btn" onclick="navigate(\'#admin\')"><span class="action-icon">🛡️</span><span>管理</span></div>' : ''}
      </div>
      <div class="section-title">📋 今日任务 <span style="font-weight:normal;font-size:13px;color:var(--text-light);">${tasks.length} 个任务</span></div>
      ${tasks.length === 0 ? '<div class="empty"><div style="font-size:48px;">🦫💤</div><div>今天还没有任务哦~</div></div>' :
        tasks.map(t => `
          <div class="task-card" onclick="navigate('#task/${t.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="task-title">${t.title}</span>
              <span class="task-points">+${t.points} ⭐</span>
            </div>
            <div class="task-meta">
              <span class="tag ${t.verify_type}">${t.verify_type === 'screenshot' ? '📸 需截图' : '✅ 打卡'}</span>
              ${!t.can_submit ? '<span class="tag" style="background:#E8F5E9;color:#4CAF50;">✅ 已完成</span>' : ''}
            </div>
          </div>`).join('')}
    </div>`
})

// Page 3: Task Detail (#task/:id)
route('#task/:id', async (app, taskId) => {
  const [tasksRes, subsRes] = await Promise.all([
    api('GET', '/api/tasks'),
    api('GET', '/api/tasks/' + taskId + '/submissions')
  ])
  const task = (tasksRes.tasks || []).find(t => t.id === taskId)
  if (!task) { app.innerHTML = '<div class="page"><div class="empty">任务不存在</div></div>'; return }
  const submissions = subsRes.submissions || []

  app.innerHTML = `
    <div class="page">
      <div style="margin-bottom:16px;"><a href="#home" style="color:var(--primary-dark);text-decoration:none;">← 返回</a></div>
      <div class="card">
        <div style="font-size:20px;font-weight:bold;margin-bottom:12px;">${task.title}</div>
        ${task.description ? '<div style="color:var(--text-light);margin-bottom:16px;">' + task.description + '</div>' : ''}
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border);">
          <span style="color:var(--text-light);">⭐ 奖励积分</span><span style="color:#FF8C00;font-weight:bold;">+${task.points}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border);">
          <span style="color:var(--text-light);">🔍 验证方式</span><span>${task.verify_type === 'screenshot' ? '📸 上传截图' : '✅ 自助打卡'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border);">
          <span style="color:var(--text-light);">📊 今日完成</span><span>${task.my_submissions_today || 0} / ${task.max_completions}</span>
        </div>
      </div>
      ${task.can_submit ? `
        <div id="submit-section">
          ${task.verify_type === 'screenshot' ? `
            <div class="screenshot-upload" id="upload-area">
              <div id="preview" style="display:none;"><img id="preview-img" style="width:100%;border-radius:12px;"><div style="text-align:center;margin-top:8px;color:var(--text-light);font-size:13px;">点击更换</div></div>
              <div id="upload-placeholder"><div style="font-size:48px;">📸</div><div style="color:var(--text-light);">点击上传截图</div></div>
              <input type="file" id="file-input" accept="image/*" style="display:none;">
            </div>` : ''}
          <button class="btn" id="btn-submit">${task.verify_type === 'screenshot' ? '提交截图 🚀' : '完成打卡 ✅'}</button>
        </div>` :
        (task.my_submissions_today >= task.max_completions ? '<div class="card" style="background:linear-gradient(135deg,#81C784,#4CAF50);color:#fff;text-align:center;font-weight:500;">🎉 今日任务已完成！</div>' : '')}
      ${submissions.length > 0 ? '<div class="section-title" style="margin-top:20px;">📝 提交记录</div>' : ''}
      ${submissions.map(s => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--text-light);">${s.created_at || ''}</span>
          <span class="sub-status ${s.status}">${s.status === 'pending' ? '⏳ 待审核' : s.status === 'approved' ? '✅ 已通过' : '❌ 已拒绝'}</span>
        </div>`).join('')}
    </div>`

  // File upload handling
  const fileInput = app.querySelector('#file-input')
  const uploadArea = app.querySelector('#upload-area')
  let selectedFile = null

  if (uploadArea) {
    uploadArea.onclick = () => fileInput.click()
    fileInput.onchange = (e) => {
      selectedFile = e.target.files[0]
      if (selectedFile) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          app.querySelector('#preview-img').src = ev.target.result
          app.querySelector('#preview').style.display = ''
          app.querySelector('#upload-placeholder').style.display = 'none'
        }
        reader.readAsDataURL(selectedFile)
      }
    }
  }

  const btnSubmit = app.querySelector('#btn-submit')
  if (btnSubmit) {
    btnSubmit.onclick = async () => {
      if (task.verify_type === 'screenshot' && !selectedFile) {
        showToast('请先上传截图'); return
      }
      btnSubmit.disabled = true
      btnSubmit.textContent = '提交中...'
      try {
        let screenshotUrl = null
        if (selectedFile) {
          btnSubmit.textContent = '上传中...'
          screenshotUrl = await uploadFile(selectedFile)
        }
        const res = await api('POST', '/api/tasks/' + taskId + '/submit', { screenshotUrl })
        const msg = res.status === 'approved' ? '打卡成功! 积分已到账' : '提交成功! 等待管理员审核'
        showToast(msg)
        setTimeout(() => navigate('#task/' + taskId), 1000)
      } catch(e) {
        showToast(e.message)
        btnSubmit.disabled = false
        btnSubmit.textContent = task.verify_type === 'screenshot' ? '提交截图 🚀' : '完成打卡 ✅'
      }
    }
  }
})

// Page 4: Shop (#shop)
route('#shop', async (app) => {
  const res = await api('GET', '/api/rewards')
  const rewards = res.rewards || []
  const myPoints = res.myPoints || 0

  app.innerHTML = `
    <div class="page">
      <div style="margin-bottom:16px;"><a href="#home" style="color:var(--primary-dark);text-decoration:none;">← 返回</a></div>
      <div class="card" style="text-align:center;">
        <span style="color:var(--text-light);font-size:13px;">💰 我的积分</span>
        <span style="font-size:32px;font-weight:bold;display:block;color:var(--primary);">${myPoints}</span>
      </div>
      <div class="section-title">🎁 兑换商品</div>
      ${rewards.length === 0 ? '<div class="empty">暂无商品~</div>' :
        rewards.map(r => `
          <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:500;">${r.type === 'cash' ? '💰' : '🎮'} ${r.name}</div>
              <div style="font-size:13px;color:var(--text-light);">${r.cost} 积分 | 库存: ${r.stock === -1 ? '无限' : r.stock}</div>
            </div>
            <button class="btn btn-small btn-exchange" data-id="${r.id}" ${myPoints < r.cost || r.stock === 0 ? 'disabled style="opacity:0.5;"' : ''}>${myPoints < r.cost ? '积分不足' : '兑换'}</button>
          </div>`).join('')}
    </div>`

  app.querySelectorAll('.btn-exchange:not([disabled])').forEach(btn => {
    btn.onclick = async () => {
      const ok = await showConfirm('确认兑换', '确定要兑换这个商品吗？')
      if (!ok) return
      try {
        await api('POST', '/api/rewards/' + btn.dataset.id + '/exchange')
        showToast('兑换成功!')
        setTimeout(() => navigate('#shop'), 500)
      } catch(e) { showToast(e.message) }
    }
  })
})

// Page 5: Profile (#profile)
route('#profile', async (app) => {
  const [profileRes, settingsRes] = await Promise.all([
    api('GET', '/api/profile'),
    api('GET', '/api/guild/settings')
  ])
  const user = profileRes.user
  const isAdmin = user.role === 'master' || user.role === 'admin'
  const slogan = settingsRes.checkin_slogan || '膜拜嫂子看黑山'
  const today = new Date().toISOString().slice(0, 10)
  const checkedIn = user.last_checkin === today
  const roleLabels = { master: '会长', admin: '管理员', member: '成员' }

  let membersHtml = ''
  if (isAdmin) {
    try {
      const membersRes = await api('GET', '/api/members')
      const rankings = (membersRes.members || []).sort((a,b) => b.total_earned - a.total_earned).slice(0, 20)
      membersHtml = `
        <div class="section-title" style="margin-top:20px;">🏆 积分排行</div>
        <div class="rank-list">
          ${rankings.map((m, i) => `
            <div class="rank-item">
              <span class="rank-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
              <span class="rank-name">${m.nickname}</span>
              <span class="rank-points">${m.total_earned} ⭐</span>
            </div>`).join('')}
        </div>`
    } catch(e) {}
  }

  app.innerHTML = `
    <div class="page">
      <div style="margin-bottom:16px;"><a href="#home" style="color:var(--primary-dark);text-decoration:none;">← 返回</a></div>
      <div class="points-card" style="display:flex;align-items:center;gap:16px;position:relative;">
        ${user.avatar_url ? '<img src="' + user.avatar_url + '" style="width:56px;height:56px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);">' : '<div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:32px;border:2px solid rgba(255,255,255,0.4);">🦫</div>'}
        <div style="flex:1;">
          <div style="font-size:20px;font-weight:bold;" id="display-name">${user.nickname}</div>
          <div style="font-size:13px;opacity:0.7;">${roleLabels[user.role] || '成员'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:28px;font-weight:bold;">${user.points || 0}</div>
          <div style="font-size:12px;opacity:0.7;">⭐ 积分</div>
        </div>
      </div>

      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:12px;color:var(--text-light);">🎮 游戏昵称</div>
          <div style="font-weight:500;">${user.nickname}</div>
        </div>
        <button class="btn btn-small btn-secondary" id="btn-edit-name">修改</button>
      </div>

      <div class="checkin-card" style="background:linear-gradient(135deg,var(--card),#FFF3D6);border:1px solid var(--border);border-radius:12px;padding:0;margin-bottom:16px;overflow:hidden;">
        <div class="checkin-main" id="btn-checkin" style="padding:16px;cursor:pointer;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:32px;">${checkedIn ? '🙏' : '🦫'}</span>
            <div>
              <div class="checkin-title">${slogan}</div>
              <div class="checkin-desc">${checkedIn ? '今日已膜拜 +1积分' : '每日膜拜获得1积分'}</div>
            </div>
          </div>
          <div style="text-align:center;">
            ${user.checkin_streak > 0 ? '<div style="font-size:11px;color:var(--primary);margin-bottom:4px;">连续' + user.checkin_streak + '天</div>' : ''}
            <span class="checkin-btn ${checkedIn ? 'done' : ''}">${checkedIn ? '已膜拜' : '膜拜'}</span>
          </div>
        </div>
        ${isAdmin ? '<div style="border-top:1px solid var(--border);padding:8px;text-align:center;background:rgba(245,166,35,0.06);cursor:pointer;" id="btn-edit-slogan"><span style="font-size:12px;color:var(--text-light);">✏️ 修改词条</span></div>' : ''}
      </div>

      <div class="stats-row">
        <div class="stat-card"><span class="stat-num">${user.total_earned || 0}</span><span class="stat-label">⬆️ 累计获得</span></div>
        <div class="stat-card"><span class="stat-num">${user.total_spent || 0}</span><span class="stat-label">⬇️ 累计消费</span></div>
      </div>

      ${membersHtml}

      <div class="invite-card" style="margin-top:20px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:24px;">📨</span>
          <span style="font-weight:bold;font-size:16px;">邀请好友加入</span>
        </div>
        <div class="invite-code-box" style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--text-light);margin-bottom:4px;">工会邀请码</div>
          <div style="font-size:24px;font-weight:bold;letter-spacing:4px;color:var(--primary-dark);">${user.invite_code || '---'}</div>
        </div>
        <button class="btn" id="btn-copy-invite" style="width:100%;">复制邀请链接</button>
      </div>

      <div class="danger-zone">
        <button class="btn btn-danger" id="btn-leave">退出工会</button>
      </div>
    </div>`

  // Edit nickname
  app.querySelector('#btn-edit-name').onclick = async () => {
    const name = await showPrompt('修改游戏昵称', user.nickname)
    if (name && name.trim()) {
      try {
        await api('PUT', '/api/profile/nickname', { nickname: name.trim() })
        showToast('修改成功')
        navigate('#profile')
      } catch(e) { showToast(e.message) }
    }
  }

  // Checkin
  app.querySelector('#btn-checkin').onclick = async () => {
    if (checkedIn) { showToast('今天已经膜拜过了'); return }
    try {
      const res = await api('POST', '/api/checkin')
      showToast('膜拜成功! +1积分, 连续' + res.streak + '天')
      setTimeout(() => navigate('#profile'), 500)
    } catch(e) { showToast(e.message) }
  }

  // Edit slogan
  const btnSlogan = app.querySelector('#btn-edit-slogan')
  if (btnSlogan) {
    btnSlogan.onclick = async () => {
      const val = await showPrompt('修改膜拜词条', slogan)
      if (val && val.trim()) {
        try {
          await api('PUT', '/api/guild/slogan', { slogan: val.trim() })
          showToast('修改成功')
          navigate('#profile')
        } catch(e) { showToast(e.message) }
      }
    }
  }

  // Copy invite link
  app.querySelector('#btn-copy-invite').onclick = async () => {
    const link = window.location.origin + '?invite=' + (user.invite_code || '') + '#login'
    try {
      await navigator.clipboard.writeText(link)
      showToast('邀请链接已复制')
    } catch(e) {
      showToast(link)
    }
  }

  // Leave guild
  app.querySelector('#btn-leave').onclick = async () => {
    const msg = user.role === 'master' ? '你是会长，退出将解散工会或需先移交会长。确定？' : '退出后积分将清零，确定？'
    const ok = await showConfirm('确认退出工会', msg)
    if (!ok) return
    try {
      await api('POST', '/api/guild/leave')
      clearToken()
      showToast('已退出工会')
      navigate('#login')
    } catch(e) { showToast(e.message) }
  }
})

// Page 6: Admin (#admin)
route('#admin', async (app) => {
  let currentTab = 'publish'

  async function render() {
    app.innerHTML = `
      <div class="page">
        <div style="margin-bottom:16px;"><a href="#home" style="color:var(--primary-dark);text-decoration:none;">← 返回</a></div>
        <div class="admin-header card" style="background:linear-gradient(135deg,#FFF3D6,#FFE8B8);display:flex;align-items:center;gap:12px;">
          <span style="font-size:32px;">🛡️</span>
          <div><div style="font-weight:bold;font-size:18px;">管理后台</div><div style="font-size:12px;color:var(--text-light);">管理你的工会王国</div></div>
        </div>
        <div class="tab-bar">
          <div class="tab ${currentTab==='publish'?'active':''}" data-tab="publish">📜 发布</div>
          <div class="tab ${currentTab==='review'?'active':''}" data-tab="review">🔍 审核</div>
          <div class="tab ${currentTab==='rewards'?'active':''}" data-tab="rewards">🎁 商品</div>
          <div class="tab ${currentTab==='members'?'active':''}" data-tab="members">👥 成员</div>
        </div>
        <div id="tab-content"></div>
      </div>`

    app.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        currentTab = tab.dataset.tab
        render()
      }
    })

    const content = app.querySelector('#tab-content')

    if (currentTab === 'publish') {
      content.innerHTML = `
        <div class="card">
          <div class="input-group"><label class="label">任务标题 *</label><input class="input" id="task-title" placeholder="如：完成XX副本3次"></div>
          <div class="input-group"><label class="label">任务描述</label><textarea class="input" id="task-desc" placeholder="详细说明任务要求（可选）" rows="3" style="resize:none;"></textarea></div>
          <div class="form-row">
            <div class="input-group"><label class="label">奖励积分 *</label><input class="input" id="task-points" type="number" placeholder="积分数"></div>
            <div class="input-group"><label class="label">最多完成次数</label><input class="input" id="task-max" type="number" placeholder="默认1"></div>
          </div>
          <div class="input-group">
            <label class="label">验证方式</label>
            <div class="tab-bar" id="verify-type">
              <div class="tab active" data-type="self_check">✅ 自助打卡</div>
              <div class="tab" data-type="screenshot">📸 上传截图</div>
            </div>
          </div>
          <button class="btn" id="btn-publish">发布任务</button>
        </div>
        <div id="existing-tasks"><div class="loading">加载中...</div></div>`

      // Load existing tasks
      try {
        const tasksRes = await api('GET', '/api/tasks')
        const tasks = tasksRes.tasks || []
        const tasksEl = content.querySelector('#existing-tasks')
        if (tasks.length === 0) {
          tasksEl.innerHTML = ''
        } else {
          tasksEl.innerHTML = '<div class="section-title" style="margin-top:16px;">已发布任务</div>' + tasks.map(t => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:500;">${t.title}</div>
                <div style="font-size:12px;color:var(--text-light);">${t.verify_type === 'screenshot' ? '📸 截图' : '✅ 打卡'} · +${t.points}积分</div>
              </div>
              <button class="btn btn-small btn-danger btn-del-task" data-id="${t.id}">删除</button>
            </div>`).join('')
          tasksEl.querySelectorAll('.btn-del-task').forEach(btn => {
            btn.onclick = async () => {
              const ok = await showConfirm('删除任务', '确定删除此任务？已完成的用户积分不受影响。')
              if (!ok) return
              try {
                await api('DELETE', '/api/tasks/' + btn.dataset.id)
                showToast('已删除')
                render()
              } catch(e) { showToast(e.message) }
            }
          })
        }
      } catch(e) {}

      let verifyType = 'self_check'
      content.querySelectorAll('#verify-type .tab').forEach(t => {
        t.onclick = () => {
          content.querySelectorAll('#verify-type .tab').forEach(x => x.classList.remove('active'))
          t.classList.add('active')
          verifyType = t.dataset.type
        }
      })

      content.querySelector('#btn-publish').onclick = async () => {
        const title = content.querySelector('#task-title').value.trim()
        const points = parseInt(content.querySelector('#task-points').value) || 0
        if (!title || points <= 0) { showToast('请填写标题和积分'); return }
        try {
          await api('POST', '/api/tasks', {
            title,
            description: content.querySelector('#task-desc').value.trim(),
            points,
            verifyType,
            maxCompletions: parseInt(content.querySelector('#task-max').value) || 1,
            daily: false
          })
          showToast('发布成功!')
          content.querySelector('#task-title').value = ''
          content.querySelector('#task-desc').value = ''
          content.querySelector('#task-points').value = ''
          content.querySelector('#task-max').value = ''
        } catch(e) { showToast(e.message) }
      }

    } else if (currentTab === 'review') {
      try {
        const res = await api('GET', '/api/review')
        const subs = res.submissions || []
        content.innerHTML = subs.length === 0 ? '<div class="empty">没有待审核的提交~</div>' : `
          <button class="btn" id="btn-batch" style="margin-bottom:16px;">批量通过全部 (${subs.length})</button>
          ${subs.map(s => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="font-weight:500;">${s.user_nickname || '未知'}</span>
                <span style="color:var(--text-light);font-size:13px;">${s.task_title || ''} +${s.task_points || 0}</span>
              </div>
              ${s.screenshot_url ? '<img src="' + s.screenshot_url + '" style="width:100%;border-radius:8px;margin-bottom:8px;">' : ''}
              <div style="display:flex;gap:8px;">
                <button class="btn btn-small btn-approve" data-id="${s.id}" style="flex:1;background:linear-gradient(135deg,#81C784,#4CAF50);color:#fff;border-color:#388E3C;">通过</button>
                <button class="btn btn-small btn-reject" data-id="${s.id}" style="flex:1;" >拒绝</button>
              </div>
            </div>`).join('')}`

        if (subs.length > 0) {
          content.querySelector('#btn-batch').onclick = async () => {
            const ok = await showConfirm('批量通过', '确定通过全部 ' + subs.length + ' 条提交？')
            if (!ok) return
            try {
              await api('POST', '/api/review/batch-approve', { ids: subs.map(s => s.id) })
              showToast('已全部通过!')
              render()
            } catch(e) { showToast(e.message) }
          }
        }

        content.querySelectorAll('.btn-approve').forEach(btn => {
          btn.onclick = async () => {
            try {
              await api('POST', '/api/review/' + btn.dataset.id + '/approve')
              showToast('已通过')
              render()
            } catch(e) { showToast(e.message) }
          }
        })

        content.querySelectorAll('.btn-reject').forEach(btn => {
          btn.onclick = async () => {
            const reason = await showPrompt('拒绝原因', '')
            if (reason === null) return
            try {
              await api('POST', '/api/review/' + btn.dataset.id + '/reject', { reason })
              showToast('已拒绝')
              render()
            } catch(e) { showToast(e.message) }
          }
        })
      } catch(e) { content.innerHTML = '<div class="empty">' + e.message + '</div>' }

    } else if (currentTab === 'rewards') {
      try {
        const [rewardsRes, exchangesRes] = await Promise.all([
          api('GET', '/api/rewards'),
          api('GET', '/api/exchanges/pending')
        ])
        const rewards = rewardsRes.rewards || []
        const exchanges = exchangesRes.exchanges || []

        content.innerHTML = `
          <div class="card">
            <div style="font-weight:bold;margin-bottom:12px;">添加商品</div>
            <div class="form-row">
              <div class="input-group"><input class="input" id="reward-name" placeholder="商品名称"></div>
              <div class="input-group"><input class="input" id="reward-cost" type="number" placeholder="积分"></div>
            </div>
            <div class="form-row">
              <div class="input-group">
                <div class="tab-bar" id="reward-type" style="margin-bottom:0;">
                  <div class="tab active" data-type="cash">现金</div>
                  <div class="tab" data-type="game_item">游戏物品</div>
                </div>
              </div>
              <div class="input-group"><input class="input" id="reward-stock" type="number" placeholder="库存"></div>
            </div>
            <button class="btn btn-small" id="btn-add-reward">添加</button>
          </div>
          ${exchanges.length > 0 ? '<div class="section-title">待发放 (' + exchanges.length + ')</div>' + exchanges.map(ex => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
              <div><span style="font-weight:500;">${ex.user_nickname}</span> <span style="color:var(--text-light);font-size:13px;">兑换: ${ex.reward_name}</span></div>
              <button class="btn btn-small btn-fulfill" data-id="${ex.id}" style="background:linear-gradient(135deg,#81C784,#4CAF50);color:#fff;border-color:#388E3C;">已发放</button>
            </div>`).join('') : ''}
          <div class="section-title">商品列表</div>
          ${rewards.map(r => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
              <div><div style="font-weight:500;">${r.name}</div><div style="font-size:13px;color:var(--text-light);">${r.cost}积分 | 库存:${r.stock === -1 ? '无限' : r.stock}</div></div>
              <button class="btn btn-small btn-toggle-reward" data-id="${r.id}" data-status="${r.status}">${r.status === 'active' ? '下架' : '上架'}</button>
            </div>`).join('')}`

        let rewardType = 'cash'
        content.querySelectorAll('#reward-type .tab').forEach(t => {
          t.onclick = () => {
            content.querySelectorAll('#reward-type .tab').forEach(x => x.classList.remove('active'))
            t.classList.add('active')
            rewardType = t.dataset.type
          }
        })

        content.querySelector('#btn-add-reward').onclick = async () => {
          const name = content.querySelector('#reward-name').value.trim()
          const cost = parseInt(content.querySelector('#reward-cost').value)
          const stock = content.querySelector('#reward-stock').value.trim()
          if (!name || !cost) { showToast('请填写名称和积分'); return }
          try {
            await api('POST', '/api/rewards', { name, type: rewardType, cost, stock: stock ? parseInt(stock) : -1 })
            showToast('添加成功')
            render()
          } catch(e) { showToast(e.message) }
        }

        content.querySelectorAll('.btn-fulfill').forEach(btn => {
          btn.onclick = async () => {
            try {
              await api('POST', '/api/exchanges/' + btn.dataset.id + '/fulfill')
              showToast('已标记发放')
              render()
            } catch(e) { showToast(e.message) }
          }
        })

        content.querySelectorAll('.btn-toggle-reward').forEach(btn => {
          btn.onclick = async () => {
            const newStatus = btn.dataset.status === 'active' ? 'hidden' : 'active'
            try {
              await api('PUT', '/api/rewards/' + btn.dataset.id, { status: newStatus })
              render()
            } catch(e) { showToast(e.message) }
          }
        })
      } catch(e) { content.innerHTML = '<div class="empty">' + e.message + '</div>' }

    } else if (currentTab === 'members') {
      try {
        const res = await api('GET', '/api/members')
        const members = res.members || []
        const profileRes = await api('GET', '/api/profile')
        const isMaster = profileRes.user.role === 'master'

        content.innerHTML = members.map(m => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:500;">${m.nickname}</span>
              <span class="tag" style="background:${m.role === 'master' ? '#FFE8B8' : m.role === 'admin' ? '#E8F5E9' : '#f5f5f5'};color:var(--text-light);">${m.role === 'master' ? '会长' : m.role === 'admin' ? '管理员' : '成员'}</span>
            </div>
            <div style="font-size:13px;color:var(--text-light);margin-bottom:8px;">积分: ${m.points} | 累计: ${m.total_earned}</div>
            ${m.role !== 'master' && isMaster ? `
              <div style="display:flex;gap:8px;">
                <button class="btn btn-small btn-secondary btn-toggle-admin" data-id="${m.id}" data-role="${m.role}">${m.role === 'admin' ? '取消管理' : '设为管理'}</button>
                <button class="btn btn-small btn-danger btn-remove" data-id="${m.id}" data-name="${m.nickname}">移除</button>
              </div>` : ''}
          </div>`).join('')

        content.querySelectorAll('.btn-toggle-admin').forEach(btn => {
          btn.onclick = async () => {
            const newRole = btn.dataset.role === 'admin' ? 'member' : 'admin'
            try {
              await api('PUT', '/api/members/' + btn.dataset.id + '/role', { role: newRole })
              showToast('修改成功')
              render()
            } catch(e) { showToast(e.message) }
          }
        })

        content.querySelectorAll('.btn-remove').forEach(btn => {
          btn.onclick = async () => {
            const ok = await showConfirm('移除成员', '确定要移除 ' + btn.dataset.name + '？')
            if (!ok) return
            try {
              await api('DELETE', '/api/members/' + btn.dataset.id)
              showToast('已移除')
              render()
            } catch(e) { showToast(e.message) }
          }
        })
      } catch(e) { content.innerHTML = '<div class="empty">' + e.message + '</div>' }
    }
  }

  await render()
})
