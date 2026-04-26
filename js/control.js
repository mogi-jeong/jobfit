// 잡핏 관제 시스템 (전광판) — 별도 창 control.html
// 진행중 공고의 출근율 현황을 실시간으로 모니터링
// 권한 시뮬 드롭다운: 마스터/1급은 전체, 2급은 담당 근무지만

(function(){
  const main    = document.getElementById('board-main');
  const clockEl = document.getElementById('board-clock');
  const dateEl  = document.getElementById('board-clock-date');
  const simInput   = document.getElementById('board-sim-time');
  const simResetBtn= document.getElementById('board-sim-reset');
  const adminSelect= document.getElementById('board-admin-select');

  const state = {
    simTime: null,           // 'HH:MM' 또는 null
    adminId: 'adm_master',   // 시뮬 관리자 ID
  };

  // ─── 권한 필터 ────────────────────────────────────────────
  function currentAdmin() { return admins.find(a => a.id === state.adminId) || admins[0]; }
  function visibleSiteIds(adm) {
    if (!adm) return [];
    if (adm.role === 'master' || adm.role === 'admin1') {
      return Object.values(worksites).flatMap(p => p.sites.map(s => s.id));
    }
    return adm.sites || [];
  }
  function jobVisibleTo(j, adm) {
    return visibleSiteIds(adm).includes(j.siteId);
  }

  // ─── 시계 / 시뮬 ────────────────────────────────────────
  function simNowStr() {
    if (state.simTime) return state.simTime;
    const d = new Date();
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function tickClock() {
    if (state.simTime) {
      clockEl.textContent = state.simTime + ':00';
      dateEl.textContent = TODAY + ' (시뮬)';
    } else {
      const d = new Date();
      clockEl.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
      dateEl.textContent = TODAY;
    }
  }

  // ─── 관리자 드롭다운 ─────────────────────────────────────
  function populateAdminDropdown() {
    adminSelect.innerHTML = admins.filter(a => a.active).map(a => {
      const roleLabel = a.role === 'master' ? '마스터' : a.role === 'admin1' ? '1급' : '2급';
      const siteCount = (a.role === 'master' || a.role === 'admin1') ? '전체' : `${a.sites.length}곳`;
      return `<option value="${a.id}" ${a.id === state.adminId ? 'selected' : ''}>${a.name} · ${roleLabel} (${siteCount})</option>`;
    }).join('');
  }

  // ─── 메인 렌더 ───────────────────────────────────────────
  function render() {
    tickClock();
    renderBoard();
  }

  // ─── 도넛 헬퍼 (전광판용 — 다크 배경) ────────────────────
  function boardDonut(sum, size, thick) {
    const segments = [
      { value: sum.출근, color: '#22C55E' },
      { value: sum.지각, color: '#F59E0B' },
      { value: sum.결근, color: '#EF4444' },
      { value: sum.대기, color: '#64748B' },
    ];
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    const center = size / 2;
    const r = (size - thick) / 2;
    const circ = 2 * Math.PI * r;
    let paths = `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${thick}"/>`;
    if (total > 0) {
      let offset = 0;
      segments.forEach(seg => {
        if (seg.value === 0) return;
        const len = (seg.value / total) * circ;
        paths += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thick}"
          stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
          stroke-dashoffset="${(-offset).toFixed(2)}"
          transform="rotate(-90 ${center} ${center})"/>`;
        offset += len;
      });
    }
    const attended = sum.출근 + sum.지각 + sum.결근;
    const rate = attended > 0 ? Math.round((sum.출근 + sum.지각) / attended * 100) : null;
    return { svg: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`, rate };
  }

  // ─── 시각 기준 상태 판정 (오늘 공고를 시간으로 세분화) ───────
  function hhmmToMin(hhmm) { const [h,m] = hhmm.split(':').map(Number); return h*60 + m; }
  // 오늘 공고의 시각 기준 effective status: 'pending' | 'expired' | 'open' | 'progress' | 'done'
  function effectiveStatus(j) {
    if (j.pending) return jobStatus(j);     // 'pending' 또는 'expired'
    if (j.date !== TODAY) return jobStatus(j); // 과거/미래는 기존 로직
    const nowMin = hhmmToMin(simNowStr());
    const startMin = hhmmToMin(j.start);
    const rawEndMin = hhmmToMin(j.end);
    // 야간(자정 넘음): 종료 < 시작 → 종료에 +24h
    const endMin = rawEndMin < startMin ? rawEndMin + 24*60 : rawEndMin;
    // 현재 시각이 시작 시각보다 훨씬 앞쪽이고 야간 공고면 = 아직 시작 전
    if (nowMin < startMin) return 'open';
    if (nowMin < endMin)   return 'progress';
    return 'done';
  }

  // 시각 기준 done 공고의 경우 출근자들의 checkout 시뮬 (퇴근율 계산용)
  function boardAttendance(j) {
    const base = getAttendance(j.id);
    if (j.date !== TODAY) return base; // 과거 공고는 기존 로직으로 충분
    const eff = effectiveStatus(j);
    if (eff !== 'done') return base;
    // 시각 기준 종료된 오늘 공고 — 출근/지각자의 약 90%가 퇴근 완료로 시뮬
    const seed = [...j.id].reduce((s, c) => s + c.charCodeAt(0), 0);
    return base.map((a, i) => {
      if ((a.status === '출근' || a.status === '지각') && !a.checkout) {
        const r = (seed + i * 13) % 100;
        if (r < 90) return { ...a, checkout: j.end };
      }
      return a;
    });
  }

  // 상태별 도넛 데이터 계산 (구인율/출근율/퇴근율)
  function boardRateFor(j) {
    const eff = effectiveStatus(j);
    const att = boardAttendance(j);
    const sum = { 출근: 0, 지각: 0, 결근: 0, 대기: 0 };
    att.forEach(a => sum[a.status]++);
    const checkedOut = att.filter(a => a.checkout).length;
    const attended = sum.출근 + sum.지각 + sum.결근;
    const worked = sum.출근 + sum.지각;

    if (eff === 'open') {
      // 구인율 = (앱 신청 + 외부 구인) / 모집인원
      const ex = extCount(j);
      const filled = j.apply + ex;
      const rate = j.cap > 0 ? Math.round(filled / j.cap * 100) : 0;
      return {
        eff, rate, label: '구인율',
        segments: [
          { value: j.apply, color: '#2563EB' },
          { value: ex, color: '#14B8A6' },
          { value: Math.max(0, j.cap - filled), color: '#64748B' },
        ],
        sum, att, checkedOut, filled, ex,
      };
    }
    if (eff === 'progress') {
      // 출근율 = (출근+지각) / 확정 출석자
      const rate = attended > 0 ? Math.round(worked / attended * 100) : null;
      return {
        eff, rate, label: '출근율',
        segments: [
          { value: sum.출근, color: '#22C55E' },
          { value: sum.지각, color: '#F59E0B' },
          { value: sum.결근, color: '#EF4444' },
          { value: sum.대기, color: '#64748B' },
        ],
        sum, att, checkedOut,
      };
    }
    // done — 퇴근율 = 퇴근 완료 / 출근한 사람
    const rate = worked > 0 ? Math.round(checkedOut / worked * 100) : null;
    return {
      eff, rate, label: '퇴근율',
      segments: [
        { value: checkedOut, color: '#22C55E' },
        { value: Math.max(0, worked - checkedOut), color: '#F59E0B' },
        { value: sum.결근, color: '#EF4444' },
      ],
      sum, att, checkedOut, worked,
    };
  }

  function boardDonutFromSegments(segments, size, thick) {
    const center = size / 2;
    const r = (size - thick) / 2;
    const circ = 2 * Math.PI * r;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    let paths = `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${thick}"/>`;
    if (total > 0) {
      let offset = 0;
      segments.forEach(seg => {
        if (seg.value === 0) return;
        const len = (seg.value / total) * circ;
        paths += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thick}"
          stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
          stroke-dashoffset="${(-offset).toFixed(2)}"
          transform="rotate(-90 ${center} ${center})"/>`;
        offset += len;
      });
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
  }

  // 상태별 카드 렌더
  function renderJobCard(j) {
    const site = findSite(j.siteId);
    const info = boardRateFor(j);
    const { eff, rate, label, segments, sum, checkedOut } = info;

    // 구인 긴급 여부
    const urgent = isRecruitUrgent(j);

    // 좌측 테두리 색상
    let cls = 'no-data';
    if (eff === 'done') cls = 'done-card';
    else if (eff === 'progress') {
      if (rate !== null) cls = rate >= 85 ? 'high-rate' : rate >= 65 ? 'mid-rate' : 'low-rate';
    }
    else { // open
      cls = info.rate >= 85 ? 'open-full' : info.rate >= 50 ? 'open-mid' : 'open-low';
    }
    if (urgent) cls += ' urgent-recruit';

    // 상태 뱃지
    const statusBadge = {
      done:     `<span class="board-status-badge done">종료</span>`,
      progress: `<span class="board-status-badge progress">진행중</span>`,
      open:     urgent
        ? `<span class="board-status-badge urgent">⚠ 구인 긴급</span>`
        : (j.recruitClosed
            ? `<span class="board-status-badge closed-manual">✓ 구인 완료 (수동)</span>`
            : `<span class="board-status-badge open">모집중</span>`),
    }[eff];

    // 외부 구인 인원 배지 (모든 상태에서 노출)
    const ex = extCount(j);
    const extBadge = ex > 0 ? `<span class="board-status-badge ext">🏷 외부 +${ex}</span>` : '';

    const svg = boardDonutFromSegments(segments, 120, 14);

    // 상태별 4수치 영역
    let numsHtml = '';
    if (eff === 'progress') {
      numsHtml = `
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#22C55E;"></span>출근</span><span class="board-card-num-val" style="color:#22C55E;">${sum.출근}</span></div>
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#F59E0B;"></span>지각</span><span class="board-card-num-val" style="color:#F59E0B;">${sum.지각}</span></div>
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#EF4444;"></span>결근</span><span class="board-card-num-val" style="color:#EF4444;">${sum.결근}</span></div>
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#64748B;"></span>대기</span><span class="board-card-num-val" style="color:#94A3B8;">${sum.대기}</span></div>
      `;
    } else if (eff === 'done') {
      const notYet = Math.max(0, info.worked - checkedOut);
      numsHtml = `
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#22C55E;"></span>퇴근 완료</span><span class="board-card-num-val" style="color:#22C55E;">${checkedOut}</span></div>
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#F59E0B;"></span>퇴근 미처리</span><span class="board-card-num-val" style="color:#F59E0B;">${notYet}</span></div>
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#EF4444;"></span>결근</span><span class="board-card-num-val" style="color:#EF4444;">${sum.결근}</span></div>
        <div class="board-card-num"><span class="board-card-num-label">📊 출근자</span><span class="board-card-num-val">${info.worked}</span></div>
      `;
    } else { // open
      const ex = info.ex || 0;
      const filled = info.filled || j.apply;
      const remain = Math.max(0, j.cap - filled);
      numsHtml = `
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#2563EB;"></span>앱 신청</span><span class="board-card-num-val" style="color:#60A5FA;">${j.apply}</span></div>
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#14B8A6;"></span>외부 구인</span><span class="board-card-num-val" style="color:#2DD4BF;">${ex}</span></div>
        <div class="board-card-num"><span class="board-card-num-label"><span class="board-card-num-dot" style="background:#64748B;"></span>잔여</span><span class="board-card-num-val" style="color:#94A3B8;">${remain}</span></div>
        <div class="board-card-num"><span class="board-card-num-label">⏰ 시작까지</span><span class="board-card-num-val" style="color:#60A5FA;">${minutesUntilStart(j)}</span></div>
      `;
    }

    const footHtml = eff === 'open'
      ? `<span>시작 <strong>${j.start}</strong></span><span>담당 <strong>${j.contact || '-'}</strong></span>`
      : eff === 'progress'
        ? `<span>확정 <strong>${sum.출근 + sum.지각 + sum.결근 + sum.대기}명</strong></span><span>담당 <strong>${j.contact || '-'}</strong></span>`
        : `<span>종료 <strong>${j.end}</strong></span><span>담당 <strong>${j.contact || '-'}</strong></span>`;

    // 구인 긴급 경고 배너 (open + 12h 내 미충원)
    const urgentHtml = urgent ? `
      <div class="board-urgent-banner">
        <div class="board-urgent-text">⚠ <strong>시작 ${minutesUntilStart(j)} 전 · 미충원 ${Math.max(0, j.cap - j.apply)}명</strong></div>
        <button class="board-urgent-btn" onclick="event.stopPropagation(); window.__boardMarkRecruitDone('${j.id}')">✓ 구인 완료</button>
      </div>
    ` : '';

    return `
      <div class="board-card ${cls}" onclick="window.__boardOpenJob('${j.id}')" title="클릭 시 공고 상세로 이동">
        <div class="board-card-head">
          <div>
            <div class="board-card-title">${site.site.name} ${statusBadge}${extBadge}</div>
            <div class="board-card-partner">${site.partner} · ${j.slot}</div>
          </div>
          <div class="board-card-time">${j.start}~${j.end}</div>
        </div>
        ${urgentHtml}
        <div class="board-card-donut-row">
          <div class="board-card-donut" style="width:120px; height:120px;">
            ${svg}
            <div class="board-card-donut-center">
              <div class="board-card-donut-pct">${rate !== null ? rate + '%' : '—'}</div>
              <div class="board-card-donut-label">${label}</div>
            </div>
          </div>
          <div class="board-card-nums">${numsHtml}</div>
        </div>
        <div class="board-card-foot">${footHtml}</div>
      </div>
    `;
  }

  function minutesUntilStart(j) {
    const nowMin = hhmmToMin(simNowStr());
    const startMin = hhmmToMin(j.start);
    const diff = startMin - nowMin;
    if (diff < 0) return '-';
    const h = Math.floor(diff / 60), m = diff % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}분`;
  }

  // 구인 긴급 — 12h 이내 시작 + 미충원 + 수동 구인완료 표시 안 된 공고
  function minutesUntilStartRaw(j) {
    const nowMin = hhmmToMin(simNowStr());
    const startMin = hhmmToMin(j.start);
    return startMin - nowMin;
  }
  function extCount(j) { return Array.isArray(j.externalWorkers) ? j.externalWorkers.length : 0; }
  function effApply(j) { return j.apply + extCount(j); }

  function isRecruitUrgent(j) {
    if (effectiveStatus(j) !== 'open') return false;
    if (effApply(j) >= j.cap) return false;      // 외부 구인 포함하여 다 참
    if (j.recruitClosed) return false;            // 수동 구인완료 처리됨
    const rem = minutesUntilStartRaw(j);
    return rem > 0 && rem <= POLICY.URGENT_RECRUIT_MIN; // 12h 이내
  }

  // ─── 메인 보드 ───────────────────────────────────────────
  function renderBoard() {
    const adm = currentAdmin();
    const scope = adm.role === 'master' || adm.role === 'admin1'
      ? `전 근무지 (${visibleSiteIds(adm).length}곳)`
      : `담당 ${adm.sites.length}곳: ${adm.sites.map(sid => findSite(sid)?.site.name).filter(Boolean).join(', ')}`;

    // 오늘 공고 전체 (권한 필터 + 모집 대기/만료 제외 — 알바생 노출 안 된 공고는 관제 대상 아님)
    const todayJobs = jobs.filter(j => j.date === TODAY && !j.pending && jobVisibleTo(j, adm));

    // 상태별 분류
    const doneJobs = todayJobs.filter(j => effectiveStatus(j) === 'done')
      .sort((a, b) => (a.end || '').localeCompare(b.end || '')); // 먼저 끝난 것부터
    const progJobs = todayJobs.filter(j => effectiveStatus(j) === 'progress')
      .sort((a, b) => (a.end || '').localeCompare(b.end || '')); // 곧 끝날 것부터
    const openJobs = todayJobs.filter(j => effectiveStatus(j) === 'open')
      .sort((a, b) => (a.start || '').localeCompare(b.start || '')); // 곧 시작할 것부터

    // 집계 — No-show 수와 구인 긴급 건수
    const totals = { 출근: 0, 지각: 0, 결근: 0, 대기: 0 };
    [...doneJobs, ...progJobs].forEach(j => {
      const att = boardAttendance(j);
      att.forEach(a => totals[a.status]++);
    });
    const urgentCount = openJobs.filter(j => isRecruitUrgent(j)).length;

    const summaryHtml = `
      <div class="board-summary-bar">
        <div class="board-summary-metric info">
          <div class="board-summary-metric-body">
            <div class="board-summary-metric-label">📅 모집중</div>
            <div class="board-summary-metric-sub">${urgentCount > 0 ? `⚠ 12h 이내 미충원 <strong>${urgentCount}</strong>건` : '여유'}</div>
          </div>
          <div class="board-summary-metric-value">${openJobs.length}<span class="board-summary-metric-unit">건</span></div>
        </div>
        <div class="board-summary-metric warn">
          <div class="board-summary-metric-body">
            <div class="board-summary-metric-label">🔴 진행중</div>
            <div class="board-summary-metric-sub">근무 중</div>
          </div>
          <div class="board-summary-metric-value">${progJobs.length}<span class="board-summary-metric-unit">건</span></div>
        </div>
        <div class="board-summary-metric ok">
          <div class="board-summary-metric-body">
            <div class="board-summary-metric-label">✅ 종료</div>
            <div class="board-summary-metric-sub">완료</div>
          </div>
          <div class="board-summary-metric-value">${doneJobs.length}<span class="board-summary-metric-unit">건</span></div>
        </div>
        <div class="board-summary-metric bad">
          <div class="board-summary-metric-body">
            <div class="board-summary-metric-label">🚨 No-show</div>
            <div class="board-summary-metric-sub">${totals.결근 > 0 ? '긴급 대응' : '정상'}</div>
          </div>
          <div class="board-summary-metric-value">${totals.결근}<span class="board-summary-metric-unit">명</span></div>
        </div>
      </div>
    `;

    // 그룹 섹션 헬퍼
    function groupSection(title, jobs, emptyMsg, emoji) {
      if (jobs.length === 0) return '';
      return `
        <div class="board-group">
          <div class="board-group-title">
            <span>${emoji} ${title} <span class="board-group-count">${jobs.length}건</span></span>
          </div>
          <div class="board-grid">
            ${jobs.map(renderJobCard).join('')}
          </div>
        </div>
      `;
    }

    const groupsHtml = (doneJobs.length + progJobs.length + openJobs.length) === 0
      ? `<div class="board-placeholder">
          <div class="board-placeholder-icon">📡</div>
          <div class="board-placeholder-title">오늘 공고가 없습니다</div>
          <div class="board-placeholder-desc">${adm.role === 'admin2' ? '담당 근무지에 오늘 공고가 없습니다' : ''}</div>
        </div>`
      : `
        ${groupSection('모집중 · 구인율', openJobs, '모집 공고 없음', '📅')}
        ${groupSection('진행중 · 출근율', progJobs, '진행 공고 없음', '🔴')}
        ${groupSection('종료된 공고 · 퇴근율', doneJobs, '종료 공고 없음', '✅')}
      `;

    main.innerHTML = `
      <div class="board-scope">
        <div>🔒 <strong>${adm.name}</strong> 권한 기준 · ${scope}</div>
        <div class="board-scope-tag">${adm.role === 'master' ? 'MASTER' : adm.role === 'admin1' ? 'ADMIN 1' : 'ADMIN 2'}</div>
      </div>
      ${summaryHtml}
      <div class="board-grid-title">
        <div>
          <h2>📋 오늘 공고 현황 <span style="color:#60A5FA; font-weight:500;">${todayJobs.length}건</span></h2>
          <div class="board-grid-title-sub">시각 기준 분류 · 모집 ${openJobs.length} → 진행 ${progJobs.length} → 종료 ${doneJobs.length}</div>
        </div>
        <div class="board-grid-title-sub">기준 시각 · ${simNowStr()}</div>
      </div>
      ${groupsHtml}
    `;
  }

  // ─── 핸들러 ──────────────────────────────────────────────
  window.__boardRefresh = function() { render(); };
  window.__boardMarkRecruitDone = function(jobId) {
    const j = findJob(jobId); if (!j) return;
    const site = findSite(j.siteId);
    if (!confirm(`${site.site.name} (${j.slot} ${j.start}~${j.end}) 공고를 구인 완료로 처리합니다.\n\n미충원 ${Math.max(0, j.cap - j.apply)}명은 관리자가 개별 연락으로 채운 상태로 간주됩니다.\n긴급 경고가 사라집니다.`)) return;
    setRecruitClosed(jobId, true);
    render();
  };

  // 카드 클릭 → 공고 상세로 이동 (관리자 웹 창에서)
  window.__boardOpenJob = function(jobId) {
    const opener = window.opener;
    if (opener && !opener.closed && typeof opener.__gotoJobDetail === 'function') {
      try { opener.focus(); opener.__gotoJobDetail(jobId); return; } catch(e) {}
    }
    // opener가 없거나 접근 불가 → 새 창으로 SPA 열기
    window.open('index.html#job=' + jobId, 'jobfit-admin');
  };

  simInput.addEventListener('change', () => { state.simTime = simInput.value || null; render(); });
  simResetBtn.addEventListener('click', () => { state.simTime = null; simInput.value = ''; render(); });
  adminSelect.addEventListener('change', () => { state.adminId = adminSelect.value; render(); });

  // ─── 초기화 + 주기 갱신 ─────────────────────────────────
  populateAdminDropdown();
  setInterval(tickClock, 1000);
  setInterval(render, 30 * 1000);  // 30초 자동 갱신
  render();
})();
