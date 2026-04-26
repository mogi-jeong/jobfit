// 잡핏(JobFit) 관리자 웹 — 앱 로직
// 헬퍼 함수 · 페이지 렌더 함수 · 이벤트 핸들러 · 초기화
// 데이터는 js/data.js 에서 로드됨 (worksites · jobs · workers · ...)

(function(){
  const main = document.getElementById('jf-main-content');
  const navItems = document.querySelectorAll('.jf-nav-item');


  // findSite · addMin · donutSvg · pointRewardFor · attendanceDonut · getAttendance · attendanceSummary
  // → 공용 헬퍼는 data.js 에 정의됨 (control.html 에서도 공유)

  // 카카오맵의 getArea() 함수는 지구 곡률을 반영한 면적을 반환함
  // fallback용 수동 계산 (Spherical Excess Formula)
  function computeArea(latlngs) {
    if (latlngs.length < 3) return 0;
    let area = 0;
    const R = 6378137;
    for (let i = 0, len = latlngs.length; i < len; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % len];
      const lat1 = p1.lat !== undefined ? (typeof p1.lat === 'function' ? p1.lat() : p1.lat) : p1[0];
      const lng1 = p1.lng !== undefined ? (typeof p1.lng === 'function' ? p1.lng() : p1.lng) : (p1.La !== undefined ? p1.La : p1[1]);
      const lat2 = p2.lat !== undefined ? (typeof p2.lat === 'function' ? p2.lat() : p2.lat) : p2[0];
      const lng2 = p2.lng !== undefined ? (typeof p2.lng === 'function' ? p2.lng() : p2.lng) : (p2.La !== undefined ? p2.La : p2[1]);
      area += (lng2 - lng1) * Math.PI / 180 *
              (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
    }
    return Math.abs(area * R * R / 2);
  }

  function renderMapError() {
    const host = location.hostname || '(빈 호스트 — file:// 로 열었을 가능성)';
    const proto = location.protocol;
    const isFile = proto === 'file:';
    return `
      <div class="map-error" style="text-align:left; line-height:1.7;">
        <strong>카카오맵 API를 불러오지 못했습니다.</strong><br>
        현재 접속: <code>${proto}//${host}</code><br><br>
        ${isFile
          ? '⚠ <b>file:// 로 열고 있어요.</b> 카카오 JS SDK는 file:// 에서 동작하지 않습니다.<br>VSCode <b>Live Server</b> 확장을 켜거나 <code>python -m http.server 5500</code> 으로 열어주세요.'
          : `⚠ <b>${host}</b> 도메인이 카카오 개발자 콘솔에 등록되어 있지 않을 수 있습니다.<br>등록된 도메인: <code>localhost</code>, <code>127.0.0.1:5500</code>, <code>mogi-jeong.github.io</code>`
        }
      </div>
    `;
  }

  function pointInPolygon(lat, lng, vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][1], yi = vs[i][0];
      const xj = vs[j][1], yj = vs[j][0];
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function renderList() {
    const total = Object.values(worksites).reduce((sum, p) => sum + p.sites.length, 0);
    const noGps = Object.values(worksites).flatMap(p => p.sites).filter(s => !s.gps).length;
    const active = Object.values(worksites).flatMap(p => p.sites).filter(s => s.activeJobs > 0).length;

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">근무지 관리</div>
          <div class="jf-subtitle">마스터 전용 · 파트너사 · 근무지 계층 관리</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('sites')">엑셀</button>
          <button onclick="window.__partnerAdd()">+ 파트너사 추가</button>
          <button class="btn-primary" onclick="window.__wsAddSite()">+ 근무지 추가</button>
        </div>
      </div>

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">전체 근무지</div><div class="jf-metric-value">${total}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 곳</span></div><div class="jf-metric-hint">3개 파트너사</div></div>
        <div class="jf-metric"><div class="jf-metric-label">GPS 영역 미설정</div><div class="jf-metric-value" style="color:${noGps>0?'#EF4444':'#16A34A'};">${noGps}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 곳</span></div><div class="jf-metric-hint" style="color:${noGps>0?'#EF4444':'#16A34A'};">${noGps>0?'공고 등록 불가 상태':'모두 설정 완료'}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">오늘 진행 중</div><div class="jf-metric-value">${active}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 곳</span></div><div class="jf-metric-hint">공고 활성화된 근무지</div></div>
        <div class="jf-metric"><div class="jf-metric-label">통근버스 운영</div><div class="jf-metric-value">${Object.values(worksites).flatMap(p=>p.sites).filter(s=>s.bus).length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 곳</span></div><div class="jf-metric-hint">택배 허브 전체</div></div>
      </div>
    `;

    if (noGps > 0) {
      html += `<div class="ws-warn-box">⚠ GPS 영역이 설정되지 않은 근무지 ${noGps}곳이 있습니다. 해당 근무지는 공고 등록 및 알바생 출근 체크가 불가능하니 먼저 영역을 설정해주세요.</div>`;
    }

    Object.keys(worksites).forEach((key, idx) => {
      const p = worksites[key];
      const openClass = idx === 0 ? 'open' : '';
      html += `
        <div class="ws-partner ${openClass}" data-partner="${key}">
          <div class="ws-partner-head" onclick="window.__wsToggle('${key}')">
            <div class="ws-partner-title">
              <span class="ws-chevron">▶</span>
              <span>${p.name}</span>
              <span class="ws-partner-count">${p.sites.length}곳</span>
            </div>
            <div class="ws-actions">
              <button onclick="event.stopPropagation(); window.__partnerEdit('${key}')" style="font-size:11px; padding:5px 10px; height:auto;">파트너사 설정</button>
            </div>
          </div>
          <div class="ws-partner-body">
      `;
      p.sites.forEach(s => {
        const busLabel = s.bus ? '🚌 운영' : '─';
        const gpsLabel = s.gps 
          ? `<span class="ws-gps-ok"><span class="ws-dot" style="background:#22C55E;"></span>설정 완료</span>`
          : `<span class="ws-gps-no"><span class="ws-dot" style="background:#EF4444;"></span>미설정</span>`;
        html += `
          <div class="ws-site-row" onclick="window.__wsDetail('${s.id}')">
            <div>
              <div class="ws-site-name">${s.name}</div>
              <div class="ws-site-sub">${s.addr}</div>
            </div>
            <div>${gpsLabel}</div>
            <div class="ws-col-muted">${s.contact}</div>
            <div class="ws-col-muted">${busLabel}</div>
            <div class="ws-col-muted">${s.activeJobs > 0 ? '진행 중 ' + s.activeJobs + '건' : '-'}</div>
            <div class="ws-action-btns" onclick="event.stopPropagation()">
              <button onclick="window.__wsGps('${s.id}')">GPS 편집</button>
              <button onclick="window.__wsDetail('${s.id}')">상세 →</button>
            </div>
          </div>
        `;
      });
      html += `</div></div>`;
    });

    main.innerHTML = html;
  }

  function renderDetail(siteId) {
    const found = findSite(siteId);
    if (!found) return;
    const s = found.site;

    main.innerHTML = `
      <span class="jf-back" onclick="window.__wsBack()">← 근무지 목록으로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">${s.name} <span class="ws-mini-tag" style="vertical-align: middle;">${found.partner}</span></div>
          <div class="jf-subtitle">${s.addr}</div>
        </div>
        <div class="ws-actions">
          <button onclick="window.__wsGps('${s.id}')">GPS 영역 편집</button>
          <button onclick="window.__wsEditInfo('${s.id}')">정보 수정</button>
          <button onclick="window.__wsDelete('${s.id}')" class="btn-danger">삭제</button>
        </div>
      </div>

      <div class="ws-detail-grid">
        <div>
          <div class="jf-panel" style="margin-bottom: 12px;">
            <div class="ws-section-title">기본 정보</div>
            <div class="ws-info-row"><div class="ws-info-label">파트너사</div><div class="ws-info-val">${found.partner}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">근무지명</div><div class="ws-info-val">${s.name}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">주소</div><div class="ws-info-val">${s.addr}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">GPS 좌표</div><div class="ws-info-val" style="font-family: 'SF Mono', Monaco, monospace; font-size: 12px;">${s.lat}, ${s.lng}</div></div>
          </div>

          <div class="jf-panel" style="margin-bottom: 12px;">
            <div class="ws-section-title">담당자 연락처 <span class="ws-mini-tag">알바생 공개</span></div>
            <div class="ws-info-row"><div class="ws-info-label">근무지 대표</div><div class="ws-info-val">${s.contact}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">관리자 1등급</div><div class="ws-info-val">${s.manager1}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">관리자 2등급</div><div class="ws-info-val">${s.manager2}</div></div>
          </div>

          <div class="jf-panel" style="margin-bottom: 12px;">
            <div class="ws-section-title">근무 조건</div>
            <div class="ws-info-row"><div class="ws-info-label">기본 일급</div><div class="ws-info-val">${s.wage.toLocaleString()}원</div></div>
            <div class="ws-info-row"><div class="ws-info-label">주휴수당</div><div class="ws-info-val">${s.holiday} 시 지급</div></div>
            <div class="ws-info-row"><div class="ws-info-label">통근버스</div><div class="ws-info-val">${s.bus ? '운영 중 · <a onclick="window.__wsBusGuide(\''+s.id+'\')" style="color:#2563EB; cursor:pointer; text-decoration:underline;">탑승 가이드</a>' : '없음'}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">주 근무일 제한</div><div class="ws-info-val">${found.partnerKey==='convention'?'제한 없음':'파트너사 기준 주 4일'}</div></div>
            ${found.partnerKey==='convention' ? `<div class="ws-info-row"><div class="ws-info-label">지하철 가이드</div><div class="ws-info-val"><a onclick="window.__wsSubwayGuide(\'${s.id}\')" style="color:#2563EB; cursor:pointer; text-decoration:underline;">경로 안내 보기</a> <span style="font-size:11px; color:#6B7684;">(N17 이월)</span></div></div>` : ''}
          </div>

          <div class="jf-panel">
            <div class="ws-section-title">이력 & 통계</div>
            <div class="ws-stat-row">
              <div><strong>${s.activeJobs}</strong>건 진행 중</div>
              <div><strong>${Math.round(Math.random()*30+20)}</strong>건 이번 달</div>
              <div>평균 출근율 <strong>${Math.round(Math.random()*10+85)}%</strong></div>
              <div>No-show <strong>${Math.round(Math.random()*5)}</strong>명</div>
            </div>
          </div>
        </div>

        <div>
          <div class="jf-panel" style="margin-bottom: 12px;">
            <div class="ws-section-title">GPS 영역 ${s.gps ? '<span class="ws-gps-ok"><span class="ws-dot" style="background:#22C55E;"></span>설정됨</span>' : '<span class="ws-gps-no"><span class="ws-dot" style="background:#EF4444;"></span>미설정</span>'}</div>
            <div id="ws-detail-map" style="width: 100%; height: 260px; border-radius: 8px; border: 0.5px solid rgba(0,0,0,0.1); margin-bottom: 10px; overflow: hidden;"></div>
            ${s.gps ? `<div class="ws-stat-row" style="padding: 4px 0;"><div>꼭짓점 <strong>${s.vertices}개</strong></div><div>면적 <strong>${s.area.toLocaleString()} ㎡</strong></div></div>` : '<div style="font-size: 12px; color: #6B7684; padding: 4px 0;">영역이 설정되지 않아 공고 등록이 불가합니다.</div>'}
            <button onclick="window.__wsGps('${s.id}')" class="btn-primary" style="width: 100%; margin-top: 10px; height: 38px; font-size: 13px;">${s.gps ? '영역 편집' : '영역 설정하기'}</button>
          </div>

          <div class="jf-panel">
            <div class="ws-section-title">연결된 템플릿</div>
            <div style="font-size: 12px; color: #6B7684; padding: 6px 0;">
              근로계약서<br/><span style="color: #111827; font-weight: 500; font-size: 13px;">${found.partnerKey === 'convention' ? '웨딩홀 기본 계약서' : '택배 허브 표준 계약서'}</span>
            </div>
            <div style="font-size: 12px; color: #6B7684; padding: 6px 0;">
              안전교육<br/><span style="color: #111827; font-weight: 500; font-size: 13px;">${found.partnerKey === 'convention' ? '웨딩홀 안전수칙' : '물류센터 안전교육'}</span>
            </div>
            <button onclick="window.__navGoto('jobs'); setTimeout(() => window.__jobsTab('template'), 50);" style="width: 100%; margin-top: 10px; font-size: 12px; height: 34px;">템플릿 관리 →</button>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const mapEl = document.getElementById('ws-detail-map');
      if (!mapEl) return;
      if (window.__kakaoLoadFailed || typeof kakao === 'undefined' || !kakao.maps) {
        mapEl.innerHTML = renderMapError();
        return;
      }
      kakao.maps.load(() => {
        const map = new kakao.maps.Map(mapEl, {
          center: new kakao.maps.LatLng(s.lat, s.lng),
          level: 3
        });
        new ResizeObserver(() => map.relayout()).observe(mapEl);

        if (s.gps && s.polygon.length > 0) {
          const path = s.polygon.map(p => new kakao.maps.LatLng(p[0], p[1]));
          new kakao.maps.Polygon({
            map: map,
            path: path,
            strokeWeight: 2,
            strokeColor: '#1B3A6B',
            strokeOpacity: 1,
            fillColor: '#2563EB',
            fillOpacity: 0.2
          });
          // 컨테이너 크기 확정 후 relayout 한 뒤 bounds 적용
          requestAnimationFrame(() => {
            map.relayout();
            const bounds = new kakao.maps.LatLngBounds();
            path.forEach(p => bounds.extend(p));
            map.setBounds(bounds);
          });
        } else {
          new kakao.maps.Marker({
            position: new kakao.maps.LatLng(s.lat, s.lng),
            map: map
          });
          requestAnimationFrame(() => {
            map.relayout();
            map.setCenter(new kakao.maps.LatLng(s.lat, s.lng));
          });
        }
      });
    }, 100);
  }

  function renderGpsEditor(siteId) {
    const found = findSite(siteId);
    if (!found) return;
    const s = found.site;

    main.innerHTML = `
      <span class="jf-back" onclick="window.__wsDetail('${s.id}')">← ${s.name} 상세로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">GPS 영역 설정 <span class="ws-mini-tag" style="vertical-align: middle;">${s.name}</span></div>
          <div class="jf-subtitle">지도를 클릭해 꼭짓점을 찍어 영역을 그립니다. 알바생은 이 영역 안에서만 출근 버튼을 누를 수 있습니다.</div>
        </div>
      </div>

      <div class="ws-gps-toolbar">
        <button id="gps-finish" disabled>영역 완성</button>
        <button id="gps-clear">초기화</button>
        <button id="gps-simulate" disabled>출근 시뮬레이션</button>
        <button id="gps-save" disabled class="btn-primary">저장</button>
        <span id="gps-sim-badge" style="margin-left: auto; align-self: center; font-size: 12px; padding: 4px 10px; border-radius: 6px; background: #F3F4F6; color: #6B7684;">준비 중</span>
      </div>

      <div style="position: relative;">
        <div id="gps-map" style="width: 100%; height: calc(100vh - 360px); min-height: 420px; border-radius: 8px; border: 0.5px solid rgba(0,0,0,0.1); overflow: hidden;"></div>

        <div id="addr-search-box" style="position: absolute; top: 10px; right: 10px; width: 300px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.15); z-index: 10; overflow: hidden;">
          <div id="addr-header" style="padding: 8px 12px; background: #1B3A6B; color: #fff; font-size: 12px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
            <span>🔍 주소·장소 검색</span>
            <span id="addr-toggle" style="font-size: 16px; line-height: 1;">−</span>
          </div>
          <div id="addr-body">
            <div style="padding: 10px; border-bottom: 0.5px solid rgba(0,0,0,0.08);">
              <div style="display: flex; gap: 6px;">
                <input id="addr-input" type="text" placeholder="주소 또는 건물명 검색" style="flex: 1; height: 36px; font-size: 13px;" />
                <button id="addr-btn" style="padding: 0 14px; height: 36px; font-size: 12px;" class="btn-primary">검색</button>
              </div>
              <div style="font-size: 11px; color: #6B7684; margin-top: 6px;">예: 경기 광주시 도척면, 테헤란로 152, CJ대한통운 곤지암</div>
            </div>
            <div id="addr-results" style="max-height: 300px; overflow-y: auto; display: none;"></div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px;">
        <div class="jf-metric"><div class="jf-metric-label">꼭짓점</div><div class="jf-metric-value" id="gps-vcount">${s.gps ? s.vertices : 0}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">면적 (㎡)</div><div class="jf-metric-value" id="gps-area">${s.gps ? s.area.toLocaleString() : '—'}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">현재 모드</div><div class="jf-metric-value" id="gps-mode" style="font-size: 15px;">${s.gps ? '잠금' : '편집'}</div></div>
      </div>
    `;

    setTimeout(() => {
      const mapEl = document.getElementById('gps-map');
      if (window.__kakaoLoadFailed || typeof kakao === 'undefined' || !kakao.maps) {
        mapEl.innerHTML = renderMapError();
        return;
      }

      kakao.maps.load(() => {
        const map = new kakao.maps.Map(mapEl, {
          center: new kakao.maps.LatLng(s.lat, s.lng),
          level: 2
        });

        // 컨테이너 크기가 확정된 뒤 타일 재계산 (반만 렌더되는 문제 방지)
        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(new kakao.maps.LatLng(s.lat, s.lng));
        });
        // 창 크기 변경 대응
        const resizeObs = new ResizeObserver(() => map.relayout());
        resizeObs.observe(mapEl);

        let vertices = s.polygon.map(p => [p[0], p[1]]);
        let markers = [];
        let polyline = null;
        let polygon = null;
        let worker = null;
        let mode = vertices.length >= 3 ? 'locked' : 'edit';

        const btnFinish = document.getElementById('gps-finish');
        const btnClear = document.getElementById('gps-clear');
        const btnSim = document.getElementById('gps-simulate');
        const btnSave = document.getElementById('gps-save');
        const modeEl = document.getElementById('gps-mode');
        const badge = document.getElementById('gps-sim-badge');

        function redraw() {
          markers.forEach(m => m.setMap(null));
          markers = [];
          if (polyline) { polyline.setMap(null); polyline = null; }
          if (polygon) { polygon.setMap(null); polygon = null; }

          const path = vertices.map(v => new kakao.maps.LatLng(v[0], v[1]));

          if (mode === 'edit') {
            vertices.forEach(v => {
              const m = new kakao.maps.CustomOverlay({
                position: new kakao.maps.LatLng(v[0], v[1]),
                content: '<div style="width:12px; height:12px; background:#2563EB; border:2px solid #1B3A6B; border-radius:50%; margin:-6px 0 0 -6px;"></div>',
                yAnchor: 0,
                xAnchor: 0
              });
              m.setMap(map);
              markers.push(m);
            });
            if (vertices.length >= 2) {
              polyline = new kakao.maps.Polyline({
                map: map,
                path: path,
                strokeWeight: 2,
                strokeColor: '#2563EB',
                strokeOpacity: 0.8,
                strokeStyle: 'shortdash'
              });
            }
            modeEl.textContent = '편집';
          } else if (mode === 'locked' || mode === 'simulate') {
            polygon = new kakao.maps.Polygon({
              map: map,
              path: path,
              strokeWeight: 2,
              strokeColor: '#1B3A6B',
              strokeOpacity: 1,
              fillColor: '#2563EB',
              fillOpacity: 0.2
            });
            modeEl.textContent = mode === 'simulate' ? '시뮬레이션' : '잠금';
          }

          btnFinish.disabled = !(mode === 'edit' && vertices.length >= 3);
          btnSim.disabled = mode === 'edit';
          btnSave.disabled = mode === 'edit';
          document.getElementById('gps-vcount').textContent = vertices.length;
          document.getElementById('gps-area').textContent = vertices.length >= 3 ? Math.round(computeArea(vertices)).toLocaleString() : '—';
        }

        kakao.maps.event.addListener(map, 'click', (e) => {
          const lat = e.latLng.getLat();
          const lng = e.latLng.getLng();
          if (mode === 'edit') {
            vertices.push([lat, lng]);
            redraw();
          } else if (mode === 'simulate') {
            if (worker) worker.setMap(null);
            const inside = pointInPolygon(lat, lng, vertices);
            const color = inside ? '#22C55E' : '#EF4444';
            worker = new kakao.maps.CustomOverlay({
              position: e.latLng,
              content: '<div style="width:20px; height:20px; background:'+color+'; border:3px solid #fff; border-radius:50%; margin:-10px 0 0 -10px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
              yAnchor: 0,
              xAnchor: 0
            });
            worker.setMap(map);
            badge.textContent = inside ? '✓ 출근 가능 (영역 안)' : '✕ 출근 불가 (영역 밖)';
            badge.className = inside ? 'inside' : 'outside';
          }
        });

        btnFinish.addEventListener('click', () => {
          mode = 'locked';
          redraw();
          if (polygon) {
            const bounds = new kakao.maps.LatLngBounds();
            vertices.forEach(v => bounds.extend(new kakao.maps.LatLng(v[0], v[1])));
            map.setBounds(bounds);
          }
        });
        btnClear.addEventListener('click', () => {
          vertices = [];
          mode = 'edit';
          if (worker) { worker.setMap(null); worker = null; }
          badge.textContent = '준비 중';
          badge.className = '';
          badge.style.background = '#F3F4F6';
          badge.style.color = '#6B7684';
          redraw();
        });
        btnSim.addEventListener('click', () => {
          mode = 'simulate';
          btnSim.textContent = '시뮬레이션 중';
          badge.textContent = '지도 클릭으로 알바생 위치 테스트';
          badge.style.background = '#DBEAFE';
          badge.style.color = '#1E40AF';
          redraw();
        });
        btnSave.addEventListener('click', () => {
          s.polygon = vertices.map(v => [v[0], v[1]]);
          s.vertices = vertices.length;
          s.area = Math.round(computeArea(vertices));
          s.gps = true;
          alert(s.name + ' GPS 영역이 저장되었습니다.\n꼭짓점 ' + s.vertices + '개 / 면적 ' + s.area.toLocaleString() + '㎡\n\n실제 앱에서는 Supabase의 worksites 테이블 polygon 컬럼(JSONB)에 저장됩니다.');
          renderDetail(s.id);
        });

        // 주소 검색 기능
        const addrInput = document.getElementById('addr-input');
        const addrBtn = document.getElementById('addr-btn');
        const addrResults = document.getElementById('addr-results');
        const ps = new kakao.maps.services.Places();
        const geocoder = new kakao.maps.services.Geocoder();

        function searchAddress() {
          const keyword = addrInput.value.trim();
          if (!keyword) return;

          addrResults.innerHTML = '<div style="padding: 14px; font-size: 12px; color: #6B7684; text-align: center;">검색 중...</div>';
          addrResults.style.display = 'block';

          ps.keywordSearch(keyword, (places, placesStatus) => {
            let resultsHtml = '';
            let hasResults = false;

            if (placesStatus === kakao.maps.services.Status.OK && places.length > 0) {
              hasResults = true;
              resultsHtml += '<div style="padding: 8px 12px; font-size: 11px; font-weight: 500; color: #6B7684; background: #F9FAFB;">장소 검색 결과</div>';
              places.slice(0, 5).forEach(p => {
                resultsHtml += `
                  <div class="addr-item" data-lat="${p.y}" data-lng="${p.x}" style="padding: 10px 12px; cursor: pointer; border-bottom: 0.5px solid rgba(0,0,0,0.06); font-size: 12px;">
                    <div style="font-weight: 500; color: #111827; margin-bottom: 2px;">${p.place_name}</div>
                    <div style="color: #6B7684; font-size: 11px;">${p.road_address_name || p.address_name}</div>
                    ${p.category_group_name ? '<div style="color: #2563EB; font-size: 10px; margin-top: 2px;">' + p.category_group_name + '</div>' : ''}
                  </div>
                `;
              });
            }

            geocoder.addressSearch(keyword, (addresses, addrStatus) => {
              if (addrStatus === kakao.maps.services.Status.OK && addresses.length > 0) {
                hasResults = true;
                resultsHtml += '<div style="padding: 8px 12px; font-size: 11px; font-weight: 500; color: #6B7684; background: #F9FAFB;">주소 검색 결과</div>';
                addresses.slice(0, 5).forEach(a => {
                  resultsHtml += `
                    <div class="addr-item" data-lat="${a.y}" data-lng="${a.x}" style="padding: 10px 12px; cursor: pointer; border-bottom: 0.5px solid rgba(0,0,0,0.06); font-size: 12px;">
                      <div style="font-weight: 500; color: #111827; margin-bottom: 2px;">${a.address_name}</div>
                      ${a.road_address ? '<div style="color: #6B7684; font-size: 11px;">[도로명] ' + a.road_address.address_name + '</div>' : ''}
                    </div>
                  `;
                });
              }

              if (!hasResults) {
                resultsHtml = '<div style="padding: 14px; font-size: 12px; color: #6B7684; text-align: center;">검색 결과가 없습니다.</div>';
              }

              addrResults.innerHTML = resultsHtml;

              document.querySelectorAll('.addr-item').forEach(item => {
                item.addEventListener('click', () => {
                  const lat = parseFloat(item.getAttribute('data-lat'));
                  const lng = parseFloat(item.getAttribute('data-lng'));
                  map.setCenter(new kakao.maps.LatLng(lat, lng));
                  map.setLevel(2);
                  addrResults.style.display = 'none';
                  addrInput.value = '';
                });
                item.addEventListener('mouseenter', () => item.style.background = '#F5F7FA');
                item.addEventListener('mouseleave', () => item.style.background = '');
              });
            });
          });
        }

        addrBtn.addEventListener('click', searchAddress);
        addrInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); searchAddress(); }
        });
        document.addEventListener('click', (e) => {
          const box = document.getElementById('addr-search-box');
          if (box && !box.contains(e.target)) {
            addrResults.style.display = 'none';
          }
        });

        // 주소 검색 박스 접기/펼치기
        const addrHeader = document.getElementById('addr-header');
        const addrBody = document.getElementById('addr-body');
        const addrToggle = document.getElementById('addr-toggle');
        let addrCollapsed = false;
        addrHeader.addEventListener('click', () => {
          addrCollapsed = !addrCollapsed;
          addrBody.style.display = addrCollapsed ? 'none' : 'block';
          addrToggle.textContent = addrCollapsed ? '+' : '−';
        });

        redraw();
      });
    }, 100);
  }

  // ───────────────────────────────────────────────────────
  // 문의 페이지
  // ───────────────────────────────────────────────────────
  const inqState = {
    search: '',
    category: '',
    status: '',  // '' / pending / answered
  };
  const CAT_LABEL = { general: '일반', bug: '앱버그', point: '포인트/결제', account: '계정' };
  const CAT_STYLE = {
    general: 'background:#F3F4F6; color:#374151;',
    bug:     'background:#FEE2E2; color:#991B1B;',
    point:   'background:#DBEAFE; color:#1E40AF;',
    account: 'background:#FEF3C7; color:#92400E;',
  };

  function renderInquiries() {
    const q = inqState.search.trim().toLowerCase();
    let list = inquiries.filter(it => {
      if (q && !(it.title.toLowerCase().includes(q) || it.body.toLowerCase().includes(q))) return false;
      if (inqState.category && inqState.category !== it.category) return false;
      if (inqState.status && inqState.status !== it.status) return false;
      return true;
    });
    list = list.sort((a, b) => {
      // pending 먼저, 같은 상태는 최신순
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

    const pending = inquiries.filter(it => it.status === 'pending').length;
    const answered = inquiries.filter(it => it.status === 'answered').length;
    const weekAgo = new Date(TODAY); weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStr = weekAgo.toISOString().slice(0, 10);
    const thisWeek = inquiries.filter(it => it.createdAt >= weekStr).length;

    // 평균 응답 시간 (시간 단위)
    const answeredWithTimes = inquiries.filter(it => it.status === 'answered');
    let avgResp = '-';
    if (answeredWithTimes.length > 0) {
      const total = answeredWithTimes.reduce((s, it) => {
        const c = new Date(it.createdAt.replace(' ', 'T'));
        const a = new Date(it.answeredAt.replace(' ', 'T'));
        return s + (a - c) / 3600000;
      }, 0);
      avgResp = (total / answeredWithTimes.length).toFixed(1) + 'h';
    }

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">문의</div>
          <div class="jf-subtitle">알바생 문의 접수 및 답변 처리</div>
        </div>
      </div>

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">미답변</div><div class="jf-metric-value" style="color:${pending>0?'#EF4444':'#111827'};">${pending}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">${pending>0?'답변 필요':'모두 처리됨'}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">답변 완료</div><div class="jf-metric-value">${answered}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">전체 누적</div></div>
        <div class="jf-metric"><div class="jf-metric-label">이번 주 신규</div><div class="jf-metric-value">${thisWeek}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">최근 7일</div></div>
        <div class="jf-metric"><div class="jf-metric-label">평균 응답 시간</div><div class="jf-metric-value">${avgResp}</div><div class="jf-metric-hint">접수 → 답변</div></div>
      </div>

      <div class="jobs-filters">
        <div class="jf-search"><input type="text" placeholder="제목 · 내용 검색" value="${inqState.search}" oninput="window.__inqSearch(this.value)" /></div>
        <select onchange="window.__inqFilter('status', this.value)">
          <option value="">전체 상태</option>
          <option value="pending"  ${inqState.status==='pending'?'selected':''}>미답변</option>
          <option value="answered" ${inqState.status==='answered'?'selected':''}>답변완료</option>
        </select>
        <select onchange="window.__inqFilter('category', this.value)">
          <option value="">전체 구분</option>
          <option value="general" ${inqState.category==='general'?'selected':''}>일반</option>
          <option value="bug"     ${inqState.category==='bug'?'selected':''}>앱버그</option>
          <option value="point"   ${inqState.category==='point'?'selected':''}>포인트/결제</option>
          <option value="account" ${inqState.category==='account'?'selected':''}>계정</option>
        </select>
        ${(inqState.search || inqState.category || inqState.status) ? `<button onclick="window.__inqClearFilter()" style="font-size:12px;">필터 초기화</button>` : ''}
        <div style="margin-left:auto; font-size:12px; color:#6B7684; align-self:center;">${list.length}건 표시</div>
      </div>
    `;

    if (list.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">💬</div><div class="jf-placeholder-title">조건에 맞는 문의가 없습니다</div></div>`;
    } else {
      const gridCols = '0.7fr 2fr 1fr 1fr 0.8fr';
      html += `
        <div class="jf-table">
          <div class="jf-table-head" style="grid-template-columns:${gridCols};">
            <div>구분</div>
            <div>제목</div>
            <div>작성자</div>
            <div>작성일</div>
            <div>상태</div>
          </div>
      `;
      list.forEach(it => {
        const w = findWorker(it.workerId);
        const stStyle = it.status === 'pending'
          ? 'background:#FEF3C7; color:#92400E;'
          : 'background:#DCFCE7; color:#166534;';
        html += `
          <div class="jf-table-row" style="grid-template-columns:${gridCols};" onclick="window.__inqDetail('${it.id}')">
            <div><span class="apv-badge" style="${CAT_STYLE[it.category]}">${CAT_LABEL[it.category]}</span></div>
            <div>
              <div style="font-weight:500; color:#111827;">${it.title}</div>
              <div style="font-size:11px; color:#6B7684; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${it.body}</div>
            </div>
            <div>
              <div style="font-size:13px;">${w ? w.name : '-'}</div>
              <div style="font-family:'SF Mono',Monaco,monospace; font-size:11px; color:#6B7684;">${w ? w.phone : ''}</div>
            </div>
            <div style="font-size:12px; color:#6B7684;">${it.createdAt}</div>
            <div><span class="apv-badge" style="${stStyle}">${it.status === 'pending' ? '미답변' : '답변완료'}</span></div>
          </div>
        `;
      });
      html += '</div>';
    }

    main.innerHTML = html;
  }

  function renderInquiryDetail(inqId) {
    const it = findInquiry(inqId); if (!it) return;
    const w = findWorker(it.workerId);

    main.innerHTML = `
      <span class="jf-back" onclick="window.__inqBack()">← 문의 목록으로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">${it.title}</div>
          <div class="jf-subtitle">
            <span class="apv-badge" style="${CAT_STYLE[it.category]}">${CAT_LABEL[it.category]}</span>
            · 작성자 ${w ? w.name + ' (' + w.phone + ')' : '-'} · ${it.createdAt}
          </div>
        </div>
        <div>
          ${it.status === 'answered'
            ? '<span class="apv-badge" style="background:#DCFCE7; color:#166534; font-size:13px; padding:6px 14px;">답변완료</span>'
            : '<span class="apv-badge" style="background:#FEF3C7; color:#92400E; font-size:13px; padding:6px 14px;">미답변</span>'}
        </div>
      </div>

      <div class="jf-panel" style="margin-bottom: 12px;">
        <div class="ws-section-title">문의 내용</div>
        <div style="padding: 12px; background: #F9FAFB; border-radius: 8px; font-size: 13px; line-height: 1.7; white-space: pre-wrap;">${it.body}</div>
      </div>

      <div class="jf-panel">
        <div class="ws-section-title">
          답변
          ${it.status === 'answered' ? `<span style="font-size:11px; color:#6B7684; font-weight:400;">${it.answeredBy} · ${it.answeredAt}</span>` : ''}
        </div>
        ${it.status === 'answered' ? `
          <div style="padding: 12px; background: #F0F9FF; border-left: 3px solid #2563EB; border-radius: 4px; font-size: 13px; line-height: 1.7; white-space: pre-wrap; margin-bottom: 12px;">${it.answer}</div>
          <div style="display:flex; gap:6px;">
            <button onclick="window.__inqEdit('${it.id}')">답변 수정</button>
            <button class="btn-danger" onclick="window.__inqReopen('${it.id}')">답변 삭제 / 재접수</button>
          </div>
        ` : `
          <textarea id="inq-answer-text" placeholder="답변을 입력하세요. 저장 시 알바생에게 알림이 발송됩니다." style="width:100%; min-height:140px; padding:12px; border:0.5px solid rgba(0,0,0,0.15); border-radius:8px; font-family:inherit; font-size:13px; line-height:1.6; resize:vertical;"></textarea>
          <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:10px;">
            <button onclick="window.__inqBack()">취소</button>
            <button class="btn-primary" onclick="window.__inqAnswer('${it.id}')">답변 저장 & 알림 발송</button>
          </div>
        `}
      </div>
    `;
  }

  window.__inqSearch = function(val) { inqState.search = val; renderInquiries(); };
  window.__inqFilter = function(key, val) { inqState[key] = val; renderInquiries(); };
  window.__inqClearFilter = function() { inqState.search = ''; inqState.category = ''; inqState.status = ''; renderInquiries(); };
  window.__inqDetail = function(id) { renderInquiryDetail(id); };
  window.__inqBack = function() { renderInquiries(); };
  window.__inqAnswer = function(id) {
    const it = findInquiry(id); if (!it) return;
    const textarea = document.getElementById('inq-answer-text');
    const answer = (textarea?.value || '').trim();
    if (!answer) { alert('답변 내용을 입력해주세요.'); return; }
    it.status = 'answered';
    it.answer = answer;
    it.answeredBy = '테스트(마스터)';
    it.answeredAt = TODAY + ' ' + new Date().toTimeString().slice(0,5);
    alert('답변이 저장되었고 알바생에게 알림이 발송되었습니다.');
    renderInquiryDetail(id);
  };
  window.__inqEdit = function(id) {
    const it = findInquiry(id); if (!it) return;
    promptModal({
      title: '문의 답변 수정',
      subtitle: esc(it.title || ''),
      fields: [{ key: 'answer', label: '답변', type: 'textarea', required: true, value: it.answer, placeholder: '답변 내용을 입력하세요' }],
      submitLabel: '저장',
      onSubmit: (vals) => {
        it.answer = vals.answer;
        it.answeredAt = nowStamp();
        renderInquiryDetail(id);
      },
    });
  };
  window.__inqReopen = function(id) {
    const it = findInquiry(id); if (!it) return;
    if (!confirm('답변을 삭제하고 미답변 상태로 되돌리시겠습니까?')) return;
    it.status = 'pending'; it.answer = ''; it.answeredBy = ''; it.answeredAt = '';
    renderInquiryDetail(id);
  };

  // ───────────────────────────────────────────────────────
  // 관리자 계정
  // ───────────────────────────────────────────────────────
  const adminState = {
    search: '',
    role: '',     // '' / master / admin1 / admin2
    active: '',   // '' / yes / no
  };
  const ROLE_LABEL = { master: '마스터', admin1: '관리자 1등급', admin2: '관리자 2등급' };
  const ROLE_STYLE = {
    master:  'background:#1B3A6B; color:#fff;',
    admin1:  'background:#DBEAFE; color:#1E40AF;',
    admin2:  'background:#F3F4F6; color:#374151;',
  };

  // ───────────────────────────────────────────────────────
  // 감사로그(Audit Log) 페이지 — 마스터 전용
  // ───────────────────────────────────────────────────────
  const auditState = {
    search:   '',
    category: '',  // '' / application / warning / negotiation / gps / point / job / site / admin / notification / external
    range:    '7d', // 7d / 30d / 90d / all
  };

  function renderAuditLog() {
    const q = auditState.search.trim().toLowerCase();
    const today = new Date(TODAY);
    const cutoff = (() => {
      if (auditState.range === 'all') return null;
      const days = { '7d': 7, '30d': 30, '90d': 90 }[auditState.range] || 7;
      const d = new Date(today); d.setDate(d.getDate() - days + 1);
      return d.toISOString().slice(0, 10);
    })();

    const filtered = auditLogs.filter(log => {
      if (auditState.category && log.category !== auditState.category) return false;
      if (cutoff && log.at.slice(0, 10) < cutoff) return false;
      if (q) {
        const blob = (log.target + ' ' + log.summary + ' ' + log.by).toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    // 카테고리별 카운트 (현재 기간 + 검색어 기준 — 카테고리 필터는 미적용)
    const baseList = auditLogs.filter(log => {
      if (cutoff && log.at.slice(0, 10) < cutoff) return false;
      if (q) {
        const blob = (log.target + ' ' + log.summary + ' ' + log.by).toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    const catCounts = {};
    baseList.forEach(l => { catCounts[l.category] = (catCounts[l.category] || 0) + 1; });

    const rangeBtns = [
      { v: '7d',  label: '최근 7일'  },
      { v: '30d', label: '최근 30일' },
      { v: '90d', label: '최근 90일' },
      { v: 'all', label: '전체'       },
    ].map(r => `<button class="login-role-btn ${auditState.range===r.v?'active':''}" onclick="window.__audSet('range','${r.v}')">${r.label}</button>`).join('');

    const catChips = [
      { v: '', label: '전체' },
      ...Object.keys(AUDIT_CATEGORIES).map(k => ({ v: k, label: AUDIT_CATEGORIES[k].label })),
    ].map(c => {
      const active = auditState.category === c.v;
      const count = c.v ? (catCounts[c.v] || 0) : baseList.length;
      const meta = c.v ? AUDIT_CATEGORIES[c.v] : null;
      return `<button class="login-role-btn ${active?'active':''}" onclick="window.__audSet('category','${c.v}')" style="height:30px; font-size:12px; padding:0 12px; ${active?'':'border-color:rgba(0,0,0,0.12);'}">${meta?meta.icon+' ':''}${c.label} <span style="opacity:0.6; font-weight:400;">${count}</span></button>`;
    }).join('');

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">감사로그</div>
          <div class="jf-subtitle">관리자 액션 통합 추적 · 마스터 전용 · 분쟁 시 근거 자료</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('audit')">엑셀 다운로드</button>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:14px; align-items:center; flex-wrap:wrap;">
        <div class="jf-search" style="flex:0 0 280px;">
          <input type="text" placeholder="대상/요약/관리자 검색" value="${esc(auditState.search)}" oninput="window.__audSearch(this.value)" />
        </div>
        <div style="display:inline-flex; gap:4px; border:0.5px solid rgba(0,0,0,0.12); border-radius:8px; padding:3px;">
          ${rangeBtns}
        </div>
        ${(auditState.search || auditState.category || auditState.range !== '7d') ? `<button onclick="window.__audClear()" style="font-size:12px;">초기화</button>` : ''}
        <span style="margin-left:auto; font-size:12px; color:#6B7684;">${filtered.length}건 (전체 ${auditLogs.length}건)</span>
      </div>

      <div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">${catChips}</div>
    `;

    if (filtered.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">📋</div><div class="jf-placeholder-title">조건에 맞는 로그가 없습니다</div><div class="jf-placeholder-desc">기간이나 카테고리를 변경해보세요.</div></div>`;
    } else {
      // 날짜별 그룹핑
      const byDate = {};
      filtered.forEach(log => {
        const d = log.at.slice(0, 10);
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(log);
      });
      const dates = Object.keys(byDate).sort().reverse();

      dates.forEach(d => {
        const items = byDate[d];
        const label = d === TODAY ? '오늘' : d === addDays(TODAY, -1) ? '어제' : d;
        html += `
          <div style="margin-bottom: 18px;">
            <div style="font-size:12px; color:#6B7684; font-weight:500; margin-bottom:8px; padding-left:4px;">
              📅 ${label} <span style="color:#9CA3AF; font-weight:400; margin-left:6px;">${d} · ${items.length}건</span>
            </div>
            <div class="jf-panel" style="padding: 0;">
              ${items.map((log, i) => {
                const meta = AUDIT_CATEGORIES[log.category] || { label: log.category, icon: '·', color: '#6B7684' };
                const time = log.at.slice(11);
                const roleLabel = ROLE_LABEL[log.byRole] || log.byRole;
                const roleStyle = ROLE_STYLE[log.byRole] || ROLE_STYLE.admin2;
                const isLast = i === items.length - 1;
                return `
                  <div style="display:grid; grid-template-columns: 56px 130px 1fr 160px; gap: 14px; padding: 14px 18px; align-items:center; ${isLast?'':'border-bottom:0.5px solid rgba(0,0,0,0.05);'}">
                    <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px; color:#6B7684;">${time}</div>
                    <div>
                      <span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; padding:3px 8px; border-radius:4px; background:${meta.color}1A; color:${meta.color}; font-weight:500;">
                        ${meta.icon} ${meta.label}
                      </span>
                    </div>
                    <div style="min-width:0;">
                      <div style="font-size:13px; color:#111827; font-weight:500;">${esc(log.target)}</div>
                      ${log.summary ? `<div style="font-size:12px; color:#6B7684; margin-top:2px; line-height:1.5;">${esc(log.summary)}</div>` : ''}
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:12px; color:#111827; font-weight:500;">${esc(log.by)}</div>
                      <span style="display:inline-block; margin-top:2px; padding:1px 6px; border-radius:3px; font-size:10px; ${roleStyle}">${roleLabel}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });
    }

    main.innerHTML = html;
  }

  function addDays(dateStr, n) {
    const d = new Date(dateStr); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  window.__audSearch = function(val) { auditState.search = val; renderAuditLog(); };
  window.__audSet = function(key, val) { auditState[key] = val; renderAuditLog(); };
  window.__audClear = function() { auditState.search = ''; auditState.category = ''; auditState.range = '7d'; renderAuditLog(); };

  // N6 — 강제 업데이트 / 점검 모드 (시스템 설정)
  // 마스터 전용 · 알바생 앱 진입 시 차단/공지
  const systemSettings = {
    maintenanceMode: false,
    maintenanceMessage: '서버 점검 중입니다. 잠시 후 다시 시도해주세요.',
    maintenanceEstimatedEnd: '2026-04-24 04:00',
    minAppVersion: '1.0.0',      // 이 버전 미만은 강제 업데이트
    currentAppVersion: '1.3.2',  // 최신 릴리스
  };

  function renderSystemSettingsCard() {
    const s = systemSettings;
    return `
      <div class="jf-panel" style="margin-bottom: 16px; border-left: 3px solid #8B5CF6;">
        <div class="ws-section-title">
          <span>⚙ 시스템 설정 <span style="font-size:11px; color:#6B7684; font-weight:400;">(N6 이월 · 마스터 전용)</span></span>
          <button onclick="window.__sysSettingsPreview()" style="font-size:11px; height:28px; padding:0 10px;">📱 알바생 앱 미리보기</button>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06);">
              <div>
                <div style="font-size:13px; font-weight:500; color:#111827;">점검 모드</div>
                <div style="font-size:11px; color:#6B7684; margin-top:2px;">ON 시 알바생 앱 진입 차단 · 공지 노출</div>
              </div>
              <label class="jf-toggle">
                <input type="checkbox" ${s.maintenanceMode?'checked':''} onchange="window.__sysToggle('maintenanceMode', this.checked)">
                <span class="jf-toggle-switch"></span>
                <span class="jf-toggle-text" style="color:${s.maintenanceMode?'#EF4444':'#6B7684'}; font-weight:500;">${s.maintenanceMode?'점검 중':'정상 운영'}</span>
              </label>
            </div>
            <div style="padding: 10px 0;">
              <div style="font-size: 12px; color: #6B7684; margin-bottom: 4px;">공지 메시지</div>
              <textarea rows="2" onchange="window.__sysSet('maintenanceMessage', this.value)" style="width:100%; padding:8px 10px; border: 0.5px solid rgba(0,0,0,0.15); border-radius: 6px; font-size:12px; font-family: inherit; resize: vertical;" ${s.maintenanceMode?'':'disabled'}>${s.maintenanceMessage}</textarea>
            </div>
            <div style="padding: 6px 0;">
              <div style="font-size: 12px; color: #6B7684; margin-bottom: 4px;">예상 종료 시각</div>
              <input type="datetime-local" value="${s.maintenanceEstimatedEnd.replace(' ', 'T')}" onchange="window.__sysSet('maintenanceEstimatedEnd', this.value.replace('T',' '))" style="width: 100%;" ${s.maintenanceMode?'':'disabled'}/>
            </div>
          </div>
          <div>
            <div style="padding: 8px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06);">
              <div style="font-size:13px; font-weight:500; color:#111827; margin-bottom: 4px;">앱 버전 관리 (강제 업데이트)</div>
              <div style="font-size:11px; color:#6B7684;">최소 버전 미만은 앱 실행 시 강제 업데이트 유도</div>
            </div>
            <div style="padding: 10px 0;">
              <div style="font-size: 12px; color: #6B7684; margin-bottom: 4px;">현재 최신 릴리스</div>
              <input type="text" value="${s.currentAppVersion}" onchange="window.__sysSet('currentAppVersion', this.value)" style="max-width:180px;" />
            </div>
            <div style="padding: 6px 0;">
              <div style="font-size: 12px; color: #6B7684; margin-bottom: 4px;">강제 업데이트 최소 버전</div>
              <input type="text" value="${s.minAppVersion}" onchange="window.__sysSet('minAppVersion', this.value)" style="max-width:180px;" />
            </div>
            <div style="padding: 10px 12px; background: #F3E8FF; border-radius: 6px; font-size: 11px; color: #6B21A8; line-height: 1.6; margin-top: 8px;">
              💡 현재 <code style="background:#fff; padding:1px 6px; border-radius:3px; font-family:'SF Mono',Monaco,monospace; color:#6B21A8;">${s.minAppVersion}</code> 미만 버전 사용자는 앱 실행 시 스토어 이동 안내 노출. 예고 없이 변경 시 대량 민원 가능 — <b>최소 24시간 전 공지</b> 권장.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.__sysToggle = function(key, val) { systemSettings[key] = val; renderAdmins(); };
  window.__sysSet    = function(key, val) { systemSettings[key] = val; };
  window.__sysSettingsPreview = function() { showMaintenancePreviewModal(); };

  function showMaintenancePreviewModal() {
    document.querySelectorAll('.jf-modal-overlay.sys-preview').forEach(el => el.remove());
    const s = systemSettings;
    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay sys-preview';
    const nowH = new Date().getHours(), nowM = new Date().getMinutes();
    const timeStr = String(nowH).padStart(2,'0') + ':' + String(nowM).padStart(2,'0');
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 720px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">📱 알바생 앱 진입 시 노출 화면</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="mobile-preview-wrap">
            <div class="mobile-frame">
              <div class="mobile-screen">
                <div class="mobile-status-bar"><span class="mp-time">${timeStr}</span><span class="mp-icons">📶 📡 🔋</span></div>
                <div class="mobile-app-body" style="padding: 40px 20px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                  ${s.maintenanceMode ? `
                    <div style="font-size:56px; margin-bottom:14px;">🔧</div>
                    <div style="font-size:16px; font-weight:600; color:#111827; margin-bottom:10px;">점검 안내</div>
                    <div style="font-size:12px; color:#374151; line-height:1.7; margin-bottom:18px;">${(s.maintenanceMessage||'').replace(/\n/g,'<br>')}</div>
                    <div style="background:#F3F4F6; padding:10px 14px; border-radius:8px; font-size:11px; color:#6B7684; width:100%;">
                      <div>예상 종료</div>
                      <div style="color:#111827; font-weight:600; font-family:'SF Mono',Monaco,monospace; margin-top:3px;">${s.maintenanceEstimatedEnd}</div>
                    </div>
                    <button style="margin-top:16px; background:#2563EB; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:12px; font-weight:500;">다시 시도</button>
                  ` : `
                    <div style="font-size:56px; margin-bottom:14px;">🚀</div>
                    <div style="font-size:16px; font-weight:600; color:#111827; margin-bottom:10px;">새 버전 업데이트</div>
                    <div style="font-size:12px; color:#374151; line-height:1.7; margin-bottom:18px;">
                      잡핏 앱 최신 버전 <b>${s.currentAppVersion}</b>으로<br>업데이트 후 사용해주세요.<br>
                      <span style="color:#9CA3AF; font-size:11px;">* 최소 필요 버전 ${s.minAppVersion}</span>
                    </div>
                    <button style="background:#2563EB; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:12px; font-weight:500; width:100%;">스토어에서 업데이트</button>
                    <div style="margin-top:18px; padding:10px 12px; background:#FEF3C7; border-radius:8px; font-size:10px; color:#92400E; line-height:1.5;">
                      ※ 이 화면은 <b>최소 버전 미만</b> 사용자에게만 노출됩니다.<br>
                      점검 모드가 꺼져있으면 정상 사용자는 홈으로 진입.
                    </div>
                  `}
                </div>
                <div class="mobile-home-ind"></div>
              </div>
            </div>
            <div class="mobile-preview-info">
              <h4>${s.maintenanceMode ? '점검 모드 화면' : '강제 업데이트 화면 (시뮬)'}</h4>
              <ul>
                <li><b>점검 모드 ON</b> — 모든 알바생 앱 진입 차단 (관리자 웹은 정상 접근)</li>
                <li><b>공지 메시지</b>와 <b>예상 종료 시각</b>이 함께 노출</li>
                <li><b>다시 시도</b> 버튼은 서버에 setting 상태를 재조회</li>
              </ul>
              <h4 style="margin-top:14px;">강제 업데이트</h4>
              <ul>
                <li>설치 버전이 <code>minAppVersion</code> 미만이면 이 화면 노출</li>
                <li><b>스토어로 이동</b>하여 업데이트 유도 (스킵 불가)</li>
                <li>최신 버전 사용자는 영향 없음</li>
              </ul>
              <div style="margin-top:12px; padding:10px 12px; background:#FEF3C7; border-radius:8px; font-size:11px; color:#92400E;">
                ⚠ <b>N6 이월 안건</b> — 실제 구현 시기·도입 여부는 개발자+사장님 협의 대기 중
              </div>
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:14px; padding-top:14px; border-top: 0.5px solid rgba(0,0,0,0.08); justify-content:flex-end;">
            <button class="btn-primary" onclick="this.closest('.jf-modal-overlay').remove()">닫기</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function renderAdmins() {
    const q = adminState.search.trim().toLowerCase();
    let list = admins.filter(a => {
      if (q && !(a.name.toLowerCase().includes(q) || a.phone.includes(q))) return false;
      if (adminState.role && adminState.role !== a.role) return false;
      if (adminState.active === 'yes' && !a.active) return false;
      if (adminState.active === 'no'  && a.active) return false;
      return true;
    });
    const ROLE_ORDER = { master: 0, admin1: 1, admin2: 2 };
    list = list.sort((a, b) => (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) || a.name.localeCompare(b.name, 'ko'));

    const masterCount = admins.filter(a => a.role === 'master').length;
    const a1Count = admins.filter(a => a.role === 'admin1' && a.active).length;
    const a2Count = admins.filter(a => a.role === 'admin2' && a.active).length;
    const inactiveCount = admins.filter(a => !a.active).length;

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">관리자 계정</div>
          <div class="jf-subtitle">마스터 · 1등급 · 2등급 3단계 권한 관리</div>
        </div>
        <div class="ws-actions">
          <button class="btn-primary" onclick="window.__admAdd()">+ 관리자 추가</button>
        </div>
      </div>

      ${renderSystemSettingsCard()}

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">마스터</div><div class="jf-metric-value">${masterCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">사장님 전용</div></div>
        <div class="jf-metric"><div class="jf-metric-label">관리자 1등급</div><div class="jf-metric-value">${a1Count}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">전 근무지 · 부재 대비</div></div>
        <div class="jf-metric"><div class="jf-metric-label">관리자 2등급</div><div class="jf-metric-value">${a2Count}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">근무지 단위 담당</div></div>
        <div class="jf-metric"><div class="jf-metric-label">비활성</div><div class="jf-metric-value" style="color:${inactiveCount>0?'#6B7684':'#111827'};">${inactiveCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">로그인 차단됨</div></div>
      </div>

      <div class="jobs-filters">
        <div class="jf-search"><input type="text" placeholder="이름 · 전화번호 검색" value="${adminState.search}" oninput="window.__admSearch(this.value)" /></div>
        <select onchange="window.__admFilter('role', this.value)">
          <option value="">전체 등급</option>
          <option value="master" ${adminState.role==='master'?'selected':''}>마스터</option>
          <option value="admin1" ${adminState.role==='admin1'?'selected':''}>관리자 1등급</option>
          <option value="admin2" ${adminState.role==='admin2'?'selected':''}>관리자 2등급</option>
        </select>
        <select onchange="window.__admFilter('active', this.value)">
          <option value="">활성/비활성</option>
          <option value="yes" ${adminState.active==='yes'?'selected':''}>활성만</option>
          <option value="no"  ${adminState.active==='no'?'selected':''}>비활성만</option>
        </select>
        ${(adminState.search || adminState.role || adminState.active) ? `<button onclick="window.__admClearFilter()" style="font-size:12px;">필터 초기화</button>` : ''}
        <div style="margin-left:auto; font-size:12px; color:#6B7684; align-self:center;">${list.length}명 표시</div>
      </div>
    `;

    if (list.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">👥</div><div class="jf-placeholder-title">조건에 맞는 관리자가 없습니다</div></div>`;
    } else {
      const gridCols = '1.4fr 1.1fr 1fr 1.8fr 1fr 0.8fr';
      html += `
        <div class="jf-table">
          <div class="jf-table-head" style="grid-template-columns:${gridCols};">
            <div>이름</div>
            <div>전화번호</div>
            <div>등급</div>
            <div>담당 근무지</div>
            <div>최근 로그인</div>
            <div style="text-align:right;">액션</div>
          </div>
      `;
      list.forEach(a => {
        const siteNames = a.role === 'admin2'
          ? (a.sites.length === 0
              ? '<span style="color:#F59E0B;">⚠ 미배정</span>'
              : a.sites.map(sid => findSite(sid)?.site.name || sid).join(', '))
          : '<span style="color:#6B7684;">전 근무지</span>';
        html += `
          <div class="jf-table-row" style="grid-template-columns:${gridCols};" onclick="window.__admDetail('${a.id}')">
            <div class="worker-name">
              ${a.name}
              ${!a.active ? '<span class="apv-badge" style="background:#F3F4F6; color:#6B7684; font-size:10px; padding:2px 6px;">비활성</span>' : ''}
            </div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px; color:#6B7684;">${a.phone}</div>
            <div><span class="apv-badge" style="${ROLE_STYLE[a.role]}">${ROLE_LABEL[a.role]}</span></div>
            <div style="font-size:12px;">${siteNames}</div>
            <div style="font-size:12px; color:#6B7684;">${a.lastLogin}</div>
            <div style="text-align:right;"><span style="color:#2563EB; font-size:12px;">상세 →</span></div>
          </div>
        `;
      });
      html += '</div>';
    }

    main.innerHTML = html;
  }

  function renderAdminDetail(adminId) {
    const a = findAdmin(adminId); if (!a) return;
    const allSites = Object.values(worksites).flatMap(p => p.sites.map(s => ({ ...s, partnerKey: Object.keys(worksites).find(k => worksites[k].sites.includes(s)) })));
    const isAdmin2 = a.role === 'admin2';
    const canManage = a.role !== 'master'; // 마스터 본인은 권한 편집 불가 (UI상)

    const siteCheckboxes = isAdmin2
      ? Object.keys(worksites).map(pk => {
          const partner = worksites[pk];
          return `
            <div style="padding: 8px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06);">
              <div style="font-size: 12px; font-weight: 500; color: #111827; margin-bottom: 6px;">${partner.name}</div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                ${partner.sites.map(s => `
                  <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                    <input type="checkbox" value="${s.id}" ${a.sites.includes(s.id)?'checked':''} onchange="window.__admToggleSite('${a.id}','${s.id}', this.checked)">
                    ${s.name}
                  </label>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')
      : '';

    main.innerHTML = `
      <span class="jf-back" onclick="window.__admBack()">← 관리자 목록으로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">${a.name} <span class="apv-badge" style="${ROLE_STYLE[a.role]} vertical-align:middle; margin-left:8px;">${ROLE_LABEL[a.role]}</span></div>
          <div class="jf-subtitle">${a.phone} · 가입 ${a.joinedAt} (생성자: ${a.createdBy})</div>
        </div>
        <div class="ws-actions">
          ${canManage ? `<button onclick="window.__admToggleActive('${a.id}')">${a.active ? '비활성화' : '활성화'}</button>` : ''}
          ${canManage ? `<button class="btn-danger" onclick="window.__admDelete('${a.id}')">계정 삭제</button>` : '<span style="font-size:12px; color:#6B7684;">마스터 계정은 편집 불가</span>'}
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="jf-panel">
          <div class="ws-section-title">권한 범위</div>
          ${a.role === 'master' ? `
            <div style="font-size: 13px; line-height: 1.8;">
              ✓ 전체 관리 권한<br>
              ✓ 관리자 계정 관리 (생성 · 삭제 · 등급 변경)<br>
              ✓ 근무지 등록 / GPS 영역 설정<br>
              ✓ 협의대상 해제 <strong style="color:#2563EB;">(마스터 전용)</strong><br>
              ✓ 계약서 / 안전교육 템플릿 등록<br>
              ✓ 포인트 출금 승인 / 회수
            </div>
          ` : a.role === 'admin1' ? `
            <div style="font-size: 13px; line-height: 1.8;">
              ✓ 전 근무지 접근 (사장님 부재 대비)<br>
              ✓ 관리자 2등급 계정 관리 (생성 · 담당 배정)<br>
              ✓ 공고 등록 / 수정<br>
              ✓ 신청 승인 / 경고 부여 / 해제<br>
              ✓ 계약서 / 안전교육 템플릿 등록<br>
              ✗ 협의대상 해제 (마스터 전용)
            </div>
          ` : `
            <div style="font-size: 13px; line-height: 1.8;">
              ✓ 담당 근무지만 접근 (복수 파트너사 교차 가능)<br>
              ✓ 공고 등록 / 수정 (담당 근무지)<br>
              ✓ 신청 승인 (담당 근무지)<br>
              ✓ 경고 부여 · 해제 (담당 근무지)<br>
              ✓ 관제 시스템 (전 근무지 열람 — 등급 무관)<br>
              ✗ 협의대상 해제 (마스터 전용)<br>
              ✗ 근무지 등록 / 템플릿 등록
            </div>
          `}
        </div>

        <div class="jf-panel">
          <div class="ws-section-title">담당 근무지
            ${isAdmin2 ? `<span style="font-size:11px; color:#6B7684; font-weight:400;">체크박스로 배정 (자동 저장)</span>` : ''}
          </div>
          ${isAdmin2
            ? (siteCheckboxes || '<div style="padding:20px 0; text-align:center; color:#6B7684;">근무지가 등록되지 않았습니다.</div>')
            : '<div style="padding:14px; background:#F5F7FA; border-radius:8px; font-size:13px;"><strong>전 근무지 접근</strong><br><span style="color:#6B7684; font-size:12px;">1등급 이상은 모든 근무지에 자동 권한 부여</span></div>'
          }
        </div>

        <div class="jf-panel" style="grid-column: span 2;">
          <div class="ws-section-title">로그인 이력 <span style="font-size:11px; color:#6B7684; font-weight:400;">최근 5건 (mock)</span></div>
          <div class="tl">
            <div class="tl-item ok"><div class="tl-date">${a.lastLogin}</div><div class="tl-title">로그인 성공</div><div class="tl-sub">카카오 로그인 + 전화번호 인증 (2FA) · Web</div></div>
            <div class="tl-item ok"><div class="tl-date">2026-04-22 14:20</div><div class="tl-title">로그인 성공</div><div class="tl-sub">카카오 로그인 · Web</div></div>
            <div class="tl-item ok"><div class="tl-date">2026-04-21 09:15</div><div class="tl-title">로그인 성공</div><div class="tl-sub">카카오 로그인 · Mobile App</div></div>
          </div>
        </div>
      </div>
    `;
  }

  window.__admSearch = function(val) { adminState.search = val; renderAdmins(); };
  window.__admFilter = function(key, val) { adminState[key] = val; renderAdmins(); };
  window.__admClearFilter = function() { adminState.search = ''; adminState.role = ''; adminState.active = ''; renderAdmins(); };
  window.__admDetail = function(id) { renderAdminDetail(id); };
  window.__admBack = function() { renderAdmins(); };
  const adminFormState = {
    name: '', phone: '', role: 'admin2', sites: [],
  };
  window.__admAdd = function() {
    Object.assign(adminFormState, { name: '', phone: '', role: 'admin2', sites: [] });
    renderAdminAddModal();
  };
  function renderAdminAddModal() {
    document.querySelectorAll('.jf-modal-overlay.admin-add').forEach(el => el.remove());
    const f = adminFormState;

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay admin-add';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 560px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">+ 새 관리자 추가</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="jf-form-row">
            <div class="jf-form-label">이름<span class="req">*</span></div>
            <input type="text" placeholder="실명 입력" value="${f.name}" oninput="adminFormState.name = this.value" style="max-width:220px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">전화번호<span class="req">*</span></div>
            <input type="tel" placeholder="010-XXXX-XXXX" value="${f.phone}" oninput="adminFormState.phone = this.value" style="max-width:220px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">등급<span class="req">*</span></div>
            <div style="display:flex; gap:6px;">
              <button class="login-role-btn ${f.role==='admin1'?'active':''}" onclick="adminFormState.role='admin1'; adminFormState.sites=[]; renderAdminAddModal();">관리자 1등급</button>
              <button class="login-role-btn ${f.role==='admin2'?'active':''}" onclick="adminFormState.role='admin2'; renderAdminAddModal();">관리자 2등급</button>
            </div>
          </div>
          <div class="jf-form-row top">
            <div class="jf-form-label"></div>
            <div style="font-size:11px; color:#6B7684; background:#F5F7FA; padding:10px 12px; border-radius:8px;">
              ${f.role === 'admin1'
                ? '✓ 전 근무지 접근 권한<br>✓ 2등급 계정 관리 가능<br>✗ 협의대상 해제 (마스터 전용)'
                : '✓ 담당 근무지 한정 접근<br>✓ 경고 부여 / 해제 (담당 근무지)<br>✓ 관제 시스템 전 근무지 열람 (등급 무관)<br>✗ 근무지 등록 / 템플릿 등록'}
            </div>
          </div>
          ${f.role === 'admin2' ? `
            <div class="jf-form-row top" style="padding-top:14px;">
              <div class="jf-form-label">담당 근무지<span class="req">*</span></div>
              <div style="max-height: 260px; overflow-y: auto; border: 0.5px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 8px 12px;">
                ${Object.keys(worksites).map(pk => `
                  <div style="padding: 6px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06);">
                    <div style="font-size: 12px; font-weight: 500; color: #111827; margin-bottom: 6px;">${worksites[pk].name}</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                      ${worksites[pk].sites.map(s => `
                        <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                          <input type="checkbox" value="${s.id}" ${f.sites.includes(s.id)?'checked':''} onchange="window.__admFormToggleSite('${s.id}', this.checked)">
                          ${s.name}
                        </label>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="jf-form-hint" style="margin-top:6px;">복수 파트너사 교차 배정 가능 · 선택 ${f.sites.length}곳</div>
            </div>
          ` : ''}
          <div style="display:flex; gap:8px; margin-top: 20px; padding-top:14px; border-top: 0.5px solid rgba(0,0,0,0.08);">
            <button onclick="this.closest('.jf-modal-overlay').remove()">취소</button>
            <div style="flex:1;"></div>
            <button class="btn-primary" onclick="window.__admFormSubmit()">관리자 추가</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  window.__admFormToggleSite = function(siteId, checked) {
    if (checked && !adminFormState.sites.includes(siteId)) adminFormState.sites.push(siteId);
    if (!checked) adminFormState.sites = adminFormState.sites.filter(s => s !== siteId);
  };
  window.__admFormSubmit = function() {
    const f = adminFormState;
    if (!f.name.trim()) { alert('이름을 입력해주세요'); return; }
    if (!f.phone.trim()) { alert('전화번호를 입력해주세요'); return; }
    if (f.role === 'admin2' && f.sites.length === 0) {
      if (!confirm('담당 근무지가 배정되지 않았습니다. 계정은 생성되지만 아무 근무지에도 접근할 수 없습니다. 계속하시겠습니까?')) return;
    }
    const id = 'adm_' + String(admins.length + 1).padStart(3, '0');
    admins.push({
      id, name: f.name, phone: f.phone, role: f.role,
      sites: [...f.sites], active: true,
      lastLogin: '-', joinedAt: TODAY, createdBy: '테스트(마스터)',
    });
    logAudit({
      category: 'admin', action: 'create',
      target: f.name + ' (' + ROLE_LABEL[f.role] + ')',
      targetId: id,
      summary: f.role === 'admin2' ? '담당 근무지 ' + f.sites.length + '곳 배정' : '전 근무지 권한',
    });
    alert(`${f.name} (${ROLE_LABEL[f.role]}) 관리자 추가 완료.${f.role === 'admin2' ? `\n담당 근무지 ${f.sites.length}곳 배정됨.` : ''}`);
    document.querySelectorAll('.jf-modal-overlay.admin-add').forEach(el => el.remove());
    renderAdmins();
  };
  window.__admToggleActive = function(id) {
    const a = findAdmin(id); if (!a) return;
    if (!confirm(`${a.name} 님 계정을 ${a.active ? '비활성화' : '활성화'}하시겠습니까?`)) return;
    a.active = !a.active;
    logAudit({
      category: 'admin', action: 'toggle',
      target: a.name + ' (' + ROLE_LABEL[a.role] + ')',
      targetId: id,
      summary: '계정 ' + (a.active ? '활성화' : '비활성화'),
    });
    renderAdminDetail(id);
  };
  window.__admDelete = function(id) {
    const a = findAdmin(id); if (!a) return;
    if (a.role === 'master') { alert('마스터 계정은 삭제할 수 없습니다.'); return; }
    if (!confirm(`${a.name} 님 계정을 삭제합니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) return;
    const idx = admins.indexOf(a); if (idx >= 0) admins.splice(idx, 1);
    logAudit({
      category: 'admin', action: 'delete',
      target: a.name + ' (' + ROLE_LABEL[a.role] + ')',
      targetId: id,
      summary: '계정 영구 삭제',
    });
    alert('계정 삭제 완료.');
    renderAdmins();
  };
  window.__admToggleSite = function(adminId, siteId, checked) {
    const a = findAdmin(adminId); if (!a) return;
    if (checked && !a.sites.includes(siteId)) a.sites.push(siteId);
    if (!checked) a.sites = a.sites.filter(s => s !== siteId);
  };

  // ───────────────────────────────────────────────────────
  // 홈 대시보드
  // ───────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────
  // 이상감지 — 운영 인사이트
  // 결근률 급증 / 협의대상 급증 / 출금 실패 다발 / 미충원 임박 / 응답 지연
  // ───────────────────────────────────────────────────────
  function computeAnomalies() {
    const out = [];
    const dayOffset = (n) => {
      const d = new Date(TODAY); d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const sevenDaysAgo  = dayOffset(-6);   // 최근 7일 (오늘 포함)
    const thirtyDaysAgo = dayOffset(-29);  // 최근 30일

    // 1. 근무지별 결근률 급증 (최근 7일 vs 그 이전 23일)
    const aggregate = (arr) => {
      let attended = 0, absent = 0;
      arr.forEach(j => {
        const sum = attendanceSummary(j.id);
        attended += sum.출근 + sum.지각 + sum.결근;
        absent += sum.결근;
      });
      return attended > 0 ? { rate: absent / attended, n: attended } : null;
    };
    Object.values(worksites).flatMap(p => p.sites).forEach(site => {
      const recent = jobs.filter(j => j.siteId === site.id && j.date >= sevenDaysAgo && j.date <= TODAY && jobStatus(j) !== 'open');
      const past   = jobs.filter(j => j.siteId === site.id && j.date >= thirtyDaysAgo && j.date < sevenDaysAgo);
      const r = aggregate(recent);
      const p = aggregate(past);
      if (r && p && r.n >= 5 && r.rate >= 0.10 && r.rate >= p.rate * 1.5 && (r.rate - p.rate) >= 0.04) {
        out.push({
          severity: 'high', icon: '📉', title: '결근률 급증',
          text: `<strong>${site.name}</strong> 최근 7일 결근률 <strong>${(r.rate*100).toFixed(0)}%</strong> · 이전 ${(p.rate*100).toFixed(0)}%`,
          hint: `샘플 ${r.n}건 · 출결 검토 필요`,
          action: '관제 →', goto: 'control',
        });
      }
    });

    // 2. 협의대상 등록 급증 (최근 7일 신규 ≥ 3)
    const recentNeg = negotiations.filter(n => n.registeredAt && n.registeredAt >= sevenDaysAgo);
    if (recentNeg.length >= 3) {
      out.push({
        severity: 'mid', icon: '🚫', title: '협의대상 급증',
        text: `최근 7일 신규 협의대상 <strong>${recentNeg.length}명</strong>`,
        hint: '경고 부여 기준/사유 점검 권장',
        action: '협의대상 →', goto: 'negotiation',
      });
    }

    // 3. 출금 실패 다발 (최근 30일 ≥ 2건)
    const recentFail = pointTxs.filter(t => t.status === 'failed' && t.processedAt && t.processedAt.slice(0,10) >= thirtyDaysAgo);
    if (recentFail.length >= 2) {
      const total = recentFail.reduce((s, t) => s + t.amount, 0);
      out.push({
        severity: 'mid', icon: '💸', title: '출금 실패 다발',
        text: `최근 30일 실패 <strong>${recentFail.length}건</strong> · 합계 ${total.toLocaleString()}P`,
        hint: '계좌번호 검증/안내 강화 필요',
        action: '포인트 →', goto: 'points',
      });
    }

    // 4. 시작 임박 미충원 공고 (3일 이내 시작 · 충원률 < 60%)
    const horizon = dayOffset(3);
    const undersold = jobs.filter(j => j.date >= TODAY && j.date <= horizon && (j.apply / j.cap) < 0.6 && jobStatus(j) !== 'done');
    if (undersold.length > 0) {
      out.push({
        severity: 'high', icon: '⚠', title: '미충원 임박 공고',
        text: `<strong>${undersold.length}건</strong> · 시작 3일 이내 충원률 60% 미만`,
        hint: '긴급 구인 알림/외부 구인 검토',
        action: '공고 →', goto: 'jobs',
      });
    }

    // 5. 응답 지연 신청 (6h 이상 미처리 — 정책 위반)
    // TODAY 기준의 "현재 시각" — appDwell 와 동일 로직
    const nowD = new Date();
    const [ty, tm, td] = TODAY.split('-').map(Number);
    const nowMs = new Date(ty, tm - 1, td, nowD.getHours(), nowD.getMinutes()).getTime();
    const overdue = applications.filter(a => {
      if (a.status !== 'pending' || !a.appliedAt) return false;
      const parts = a.appliedAt.split(' ');
      if (parts.length < 2) return false;
      const appliedMs = new Date(parts[0] + 'T' + parts[1] + ':00').getTime();
      const dwellMin = (nowMs - appliedMs) / 60000;
      return dwellMin > POLICY.APPROVAL_LIMIT_MIN;
    });
    if (overdue.length > 0) {
      out.push({
        severity: 'high', icon: '⏱', title: '응답 지연 신청',
        text: `<strong>${overdue.length}건</strong>의 신청이 ${POLICY.APPROVAL_LIMIT_MIN/60}시간 초과 미처리`,
        hint: 'SLA 위반 — 즉시 검토',
        action: '신청 승인 →', goto: 'approval',
      });
    }

    return out;
  }

  function renderHome() {
    // 집계
    const todayStr = TODAY;
    const weekAgo = new Date(TODAY); weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    const todayJobs = jobs.filter(j => j.date === todayStr);
    const todayProgress = todayJobs.filter(j => jobStatus(j) === 'progress').length;
    const openJobs = jobs.filter(j => jobStatus(j) === 'open').length;
    const weekJobs = jobs.filter(j => j.date >= weekAgoStr && j.date <= todayStr).length;
    const pending = applications.filter(a => a.status === 'pending');
    const pendingUrgent = pending.filter(a => a.reason === 'neg' || a.reason === 'warn3').length;
    const pendingAll = pending.length;
    const negCount = negotiations.length;
    const warnHoldCount = workers.filter(w => w.warnings >= 1 && !w.negotiation).length;
    const pointPending = pointTxs.filter(t => t.type === 'withdraw' && t.status === 'pending');
    const pointPendingAmt = pointPending.reduce((s, t) => s + t.amount, 0);
    const pointFailed = pointTxs.filter(t => t.status === 'failed').length;
    const noGpsSites = Object.values(worksites).flatMap(p => p.sites).filter(s => !s.gps);
    const wlWaiting = waitlist.filter(w => w.status === 'waiting').length;
    const wlPendingCount = waitlist.filter(w => w.status === 'pending_accept').length;
    const reopenedJobs = jobs.filter(j => j.reopened).length;

    // 오늘 출결 집계
    let todayOk = 0, todayLate = 0, todayNo = 0, todayWait = 0;
    todayJobs.forEach(j => {
      const s = attendanceSummary(j.id);
      todayOk += s.출근; todayLate += s.지각; todayNo += s.결근; todayWait += s.대기;
    });
    const todayTotal = todayOk + todayLate + todayNo;
    const todayRate = todayTotal > 0 ? Math.round((todayOk + todayLate) / todayTotal * 100) + '%' : '-';

    // 최근 활동 로그 (처리된 신청 + 포인트 + 협의대상 등록 mix)
    const activities = [];
    applications.forEach(a => {
      if (a.processedAt) {
        const w = findWorker(a.workerId); const j = findJob(a.jobId); const s = findSite(j.siteId);
        activities.push({
          at: a.processedAt,
          icon: a.status === 'approved' ? '✓' : '✕',
          color: a.status === 'approved' ? '#22C55E' : '#EF4444',
          text: `${w.name} 님 신청 ${a.status === 'approved' ? '승인' : '거절'} — ${s.site.name} ${j.date} ${j.slot}`,
          by: a.processedBy,
        });
      }
    });
    pointTxs.forEach(t => {
      if (t.processedAt) {
        const w = findWorker(t.workerId);
        if (t.type === 'withdraw') {
          activities.push({
            at: t.processedAt,
            icon: t.status === 'done' ? '💰' : '⚠',
            color: t.status === 'done' ? '#2563EB' : '#EF4444',
            text: `${w.name} 님 출금 ${t.status === 'done' ? '완료' : '실패'} — ${t.amount.toLocaleString()}P`,
            by: t.processedBy,
          });
        } else if (t.type === 'deduct') {
          activities.push({
            at: t.requestedAt,
            icon: '⊖',
            color: '#F59E0B',
            text: `${w.name} 님 포인트 차감 — ${Math.abs(t.amount).toLocaleString()}P (${t.reason})`,
            by: t.processedBy,
          });
        }
      }
    });
    negotiations.forEach(n => {
      activities.push({
        at: n.registeredAt,
        icon: '⚠',
        color: '#EF4444',
        text: `${n.name} 협의대상 등록 — ${n.sub}`,
        by: n.registeredBy,
      });
    });
    activities.sort((a, b) => b.at.localeCompare(a.at));
    const recent = activities.slice(0, 10);

    // 알림 박스
    const alerts = [];
    if (noGpsSites.length > 0) alerts.push({ type: 'warn', text: `GPS 영역 미설정 근무지 ${noGpsSites.length}곳 — 해당 근무지는 공고 등록 불가`, goto: 'worksite' });
    if (pendingUrgent > 0) alerts.push({ type: 'danger', text: `협의대상/경고3회 신청 ${pendingUrgent}건 대기 중 — 직접 검토 필요`, goto: 'approval' });
    if (pointFailed > 0) alerts.push({ type: 'danger', text: `출금 실패 ${pointFailed}건 — 재처리 필요`, goto: 'points' });
    if (wlPendingCount > 0) alerts.push({ type: 'warn', text: `대기열 수락 대기 중 ${wlPendingCount}명 — 타이머 진행 중`, goto: 'jobs-waitlist' });
    if (reopenedJobs > 0) alerts.push({ type: 'warn', text: `REOPENED 공고 ${reopenedJobs}건 — 대기열 소진 후 재모집 상태`, goto: 'jobs-waitlist' });

    // 이상감지 — 최근 7일 운영 인사이트
    const anomalies = computeAnomalies();

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">안녕하세요, 테스트 마스터님 👋</div>
          <div class="jf-subtitle">${TODAY} · 오늘도 좋은 하루 보내세요</div>
        </div>
        <div class="ws-actions">
          <button class="btn-primary" onclick="window.__navGoto('jobs')">+ 새 공고 등록</button>
          <button onclick="window.__navGoto('approval')">신청 승인 (${pendingAll})</button>
          <button onclick="window.__notifAll()">📣 알림 발송</button>
        </div>
      </div>

      ${alerts.length > 0 ? alerts.map(a =>
        `<div class="ws-warn-box" style="${a.type==='danger'?'background:#FEE2E2; color:#991B1B; border-left-color:#EF4444;':''} cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="window.__navGoto('${a.goto}')">
          <span>${a.type === 'danger' ? '⚠' : 'ℹ'} ${a.text}</span>
          <span style="font-size:12px; opacity:0.7;">바로가기 →</span>
        </div>`
      ).join('') : ''}

      ${anomalies.length > 0 ? `
        <div class="jf-panel" style="margin-bottom: 14px; padding: 14px 16px; border-left: 3px solid #EF4444; background: linear-gradient(180deg, #FFFBFB 0%, #fff 60%);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:13px; font-weight:500; color:#991B1B; display:flex; align-items:center; gap:6px;">
              🚨 이상감지 <span style="font-size:11px; color:#6B7684; font-weight:400;">최근 7~30일 운영 인사이트 · ${anomalies.length}건</span>
            </div>
            <a href="javascript:void(0)" onclick="window.__navGoto('audit')" style="font-size:11px; color:#2563EB; text-decoration:none;">감사로그 →</a>
          </div>
          <div style="display:grid; grid-template-columns: repeat(${Math.min(anomalies.length, 3)}, 1fr); gap: 10px;">
            ${anomalies.slice(0, 6).map(an => {
              const sevColor = an.severity === 'high' ? '#EF4444' : '#F59E0B';
              const sevBg    = an.severity === 'high' ? '#FEE2E2' : '#FEF3C7';
              return `
                <div onclick="window.__navGoto('${an.goto}')" style="cursor:pointer; padding:12px 14px; background:${sevBg}; border-radius:8px; border:0.5px solid ${sevColor}40; transition:transform 0.1s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:4px;">
                    <div style="font-size:12px; font-weight:500; color:${sevColor}; display:flex; align-items:center; gap:5px;">
                      ${an.icon} ${an.title}
                    </div>
                    <span style="font-size:10px; color:${sevColor}; opacity:0.8;">${an.action}</span>
                  </div>
                  <div style="font-size:12px; color:#374151; line-height:1.5;">${an.text}</div>
                  <div style="font-size:10px; color:#6B7684; margin-top:4px;">${an.hint}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="jf-metric-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 12px;">
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__openControlBoard()">
          <div class="jf-metric-label">오늘 진행 중</div>
          <div class="jf-metric-value" style="color:#22C55E;">${todayProgress}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div>
          <div class="jf-metric-hint">관제 시스템 →</div>
        </div>
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('approval')">
          <div class="jf-metric-label">승인 대기</div>
          <div class="jf-metric-value" style="color:${pendingAll>0?'#EF4444':'#111827'};">${pendingAll}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div>
          <div class="jf-metric-hint">${pendingUrgent>0 ? '🚨 협의대상/경고 '+pendingUrgent+'건 포함' : '신청 승인 →'}</div>
        </div>
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('jobs')">
          <div class="jf-metric-label">모집 중 공고</div>
          <div class="jf-metric-value" style="color:#2563EB;">${openJobs}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div>
          <div class="jf-metric-hint">이번 주 총 ${weekJobs}건</div>
        </div>
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('points')">
          <div class="jf-metric-label">출금 대기</div>
          <div class="jf-metric-value" style="color:${pointPending.length>0?'#F59E0B':'#111827'};">${pointPending.length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div>
          <div class="jf-metric-hint">${pointPendingAmt.toLocaleString()}P · 반자동 처리</div>
        </div>
      </div>

      <div class="jf-metric-grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__openControlBoard()">
          <div class="jf-metric-label">오늘 출근율</div>
          <div class="jf-metric-value">${todayRate}</div>
          <div class="jf-metric-hint">🟢 ${todayOk} · 🟡 ${todayLate} · 🔴 ${todayNo}</div>
        </div>
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('workers')">
          <div class="jf-metric-label">전체 근무자</div>
          <div class="jf-metric-value">${workers.length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div>
          <div class="jf-metric-hint">경고 보유 ${warnHoldCount}명</div>
        </div>
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('negotiation')">
          <div class="jf-metric-label">협의대상</div>
          <div class="jf-metric-value" style="color:${negCount>0?'#EF4444':'#16A34A'};">${negCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div>
          <div class="jf-metric-hint">해제는 마스터 전용</div>
        </div>
        <div class="jf-metric" style="cursor:pointer; ${wlPendingCount>0?'border-left: 3px solid #F59E0B;':''}" onclick="window.__navGoto('jobs-waitlist')">
          <div class="jf-metric-label">대기열</div>
          <div class="jf-metric-value" style="color:${wlPendingCount>0?'#F59E0B':'#111827'};">
            ${wlWaiting + wlPendingCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span>
          </div>
          <div class="jf-metric-hint">
            ${wlPendingCount > 0 ? `⏱ 수락 대기 <strong style="color:#F59E0B;">${wlPendingCount}명</strong> · 대기 ${wlWaiting}명` : `대기 중 ${wlWaiting}명${reopenedJobs > 0 ? ' · REOPENED ' + reopenedJobs : ''}`}
          </div>
        </div>
      </div>

      <div class="jf-metric-grid" style="grid-template-columns: 1fr 3fr; gap: 12px; margin-top: 12px;">
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('worksite')">
          <div class="jf-metric-label">근무지</div>
          <div class="jf-metric-value">${Object.values(worksites).reduce((s,p)=>s+p.sites.length,0)}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 곳</span></div>
          <div class="jf-metric-hint">${noGpsSites.length>0 ? 'GPS 미설정 '+noGpsSites.length+'곳' : '전체 GPS 설정 완료'}</div>
        </div>
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('stats')">
          <div class="jf-metric-label">통계 리포트 바로가기</div>
          <div class="jf-metric-hint" style="margin-top:8px;">
            파트너사별 출근율 · 근무지 랭킹 · 주간 트렌드 · 시간대별 분포 등 경영 지표 한눈에 →
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 12px; margin-top: 20px;">
        <div class="jf-panel">
          <div class="ws-section-title">오늘 진행 중인 공고
            <span style="font-size:11px; color:#6B7684; font-weight:400;">시작 임박순 · ${todayJobs.length}건</span>
          </div>
          ${todayJobs.length === 0
            ? '<div style="padding:20px 0; text-align:center; color:#6B7684; font-size:13px;">오늘 예정된 공고가 없습니다.</div>'
            : todayJobs.sort((a,b) => (a.start||'').localeCompare(b.start||'')).map(j => {
                const site = findSite(j.siteId); const st = jobStatus(j); const sum = attendanceSummary(j.id);
                const stColor = { open:'#2563EB', closed:'#F59E0B', progress:'#22C55E', done:'#6B7684' }[st];
                return `
                  <div onclick="window.__gotoJobDetail('${j.id}');" style="padding: 10px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06); cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div>
                      <div style="font-weight:500; font-size:13px;">${site.site.name} <span style="color:#6B7684; font-weight:400; font-size:12px;">${site.partner}</span></div>
                      <div style="font-size:12px; color:#6B7684; margin-top:2px;">${j.slot} ${j.start}~${j.end} · 모집 ${j.apply}/${j.cap}</div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <span style="font-size:11px; color:#166534;">🟢${sum.출근}</span>
                      <span style="font-size:11px; color:#92400E;">🟡${sum.지각}</span>
                      <span style="font-size:11px; color:#991B1B;">🔴${sum.결근}</span>
                      <span class="jobs-status" style="background:${stColor}22; color:${stColor};">${STATUS_LABEL[st]}</span>
                    </div>
                  </div>
                `;
              }).join('')}
        </div>

        <div class="jf-panel">
          <div class="ws-section-title">최근 활동 <span style="font-size:11px; color:#6B7684; font-weight:400;">최근 ${recent.length}건</span></div>
          ${recent.length === 0
            ? '<div style="padding:20px 0; text-align:center; color:#6B7684; font-size:13px;">최근 활동이 없습니다.</div>'
            : recent.map(a => `
              <div style="display:flex; gap:10px; padding: 8px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06); font-size:12px;">
                <span style="color:${a.color}; font-weight:500; width:16px; text-align:center; flex-shrink:0;">${a.icon}</span>
                <div style="flex:1;">
                  <div style="color:#111827;">${a.text}</div>
                  <div style="color:#6B7684; font-size:11px; margin-top:2px;">${a.at} · ${a.by}</div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>

      <div class="jf-panel" style="margin-top: 14px; border-left: 3px solid #8B5CF6;">
        <div class="ws-section-title">
          <span>🎬 데모 가이드 <span style="font-size:11px; color:#6B7684; font-weight:400;">개발자 인계용 · 시연 흐름</span></span>
          <span style="font-size:11px; color:#6B7684;">기준일 ${TODAY} 고정</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div style="padding:12px 14px; background:#F0FDFA; border-radius:8px; font-size:12px; line-height:1.7;">
            <div style="font-weight:500; color:#0F766E; margin-bottom:4px;">⏰ 관제 시뮬 시각 추천</div>
            <div style="color:#374151;">
              <code style="background:#fff; padding:1px 5px; border-radius:3px; font-size:11px;">09:00</code> 새벽 종료·오전 진행·모집 多<br>
              <code style="background:#fff; padding:1px 5px; border-radius:3px; font-size:11px;">15:30</code> 종료/진행/모집 균등 (기본 데모)<br>
              <code style="background:#fff; padding:1px 5px; border-radius:3px; font-size:11px;">22:30</code> 야간 시작 직후 진행 多
            </div>
          </div>
          <div style="padding:12px 14px; background:#F0F9FF; border-radius:8px; font-size:12px; line-height:1.7;">
            <div style="font-weight:500; color:#1E40AF; margin-bottom:4px;">📋 핵심 테스트 흐름</div>
            <div style="color:#374151;">
              1. 공고 상세 → 외부 구인 +1 → 관제 카드 반영<br>
              2. 신청 승인에서 거절 사유 모달<br>
              3. 퇴근 승인에서 GPS 승인 (포인트 자동 지급)<br>
              4. 관제에서 구인 완료 → 공고 마감 전환
            </div>
          </div>
          <div style="padding:12px 14px; background:#FEF3C7; border-radius:8px; font-size:12px; line-height:1.7;">
            <div style="font-weight:500; color:#92400E; margin-bottom:4px;">🔒 권한 시뮬 (관제 창)</div>
            <div style="color:#374151;">
              상단 드롭다운에서 <strong>박담당(2급)</strong> 선택 →<br>
              담당 근무지 (용인·군포_l) 만 보이는지 확인
            </div>
          </div>
          <div style="padding:12px 14px; background:#F3E8FF; border-radius:8px; font-size:12px; line-height:1.7;">
            <div style="font-weight:500; color:#6B21A8; margin-bottom:4px;">📊 데이터 풍부도</div>
            <div style="color:#374151; font-family:'SF Mono',Monaco,monospace; font-size:11px;">
              공고 ${jobs.length}건 · 신청 ${applications.length.toLocaleString()}건<br>
              포인트 ${pointTxs.length}트랜잭션 · GPS ${gpsRequests.length}건<br>
              문의 ${inquiries.length}건 · 워커 ${workers.length}명 · 관리자 ${admins.length}명
            </div>
          </div>
        </div>
      </div>
    `;

    main.innerHTML = html;
  }

  // 네비 항목 프로그램적으로 전환
  window.__navGoto = function(page) {
    // 특수 라우트 처리
    if (page === 'jobs-waitlist') {
      jobsState.tab = 'waitlist';
      const item = document.querySelector('.jf-nav-item[data-page="jobs"]');
      if (item) item.click();
      return;
    }
    const item = document.querySelector('.jf-nav-item[data-page="' + page + '"]');
    if (item) item.click();
  };

  // ───────────────────────────────────────────────────────
  // 관제 시스템 (SPA 내부 렌더) — 공고별 실시간 출결 / 자동 퇴근 / GPS 미검증 승인
  // 별도 창이 아니라 메인 SPA 콘텐츠 영역 안에서 표시됨
  // ───────────────────────────────────────────────────────
  const ctrlState = {
    partnerKey: '',
    siteId: '',
    slot: '',
    dateRange: 'today',  // today / week / past / all
    simTime: null,       // 'HH:MM' 또는 null(실시간)
    view: 'list',        // list / detail
    detailJobId: null,
  };

  // 시뮬 시각 / 시간 계산
  function ctrlSimNowStr() {
    if (ctrlState.simTime) return ctrlState.simTime;
    const d = new Date();
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function ctrlHhmmToMin(hhmm) { const [h,m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function ctrlJobEndMinutesFromStart(j) {
    const s = ctrlHhmmToMin(j.start), e = ctrlHhmmToMin(j.end);
    return e >= s ? e - s : (24 * 60 - s) + e;
  }
  function ctrlMinutesPastEnd(j) {
    if (j.date !== TODAY) return null;
    const now = ctrlHhmmToMin(ctrlSimNowStr());
    const startM = ctrlHhmmToMin(j.start);
    const endOffset = ctrlJobEndMinutesFromStart(j);
    const endM = startM + endOffset;
    let nowAdj = now;
    if (endM > 24 * 60 && now < startM) nowAdj = now + 24 * 60;
    return nowAdj - endM;
  }
  // 자동 퇴근 한도 — POLICY.AUTO_CHECKOUT_MIN 참조 (로컬 alias)
  const AUTO_CK_LIMIT_MIN = POLICY.AUTO_CHECKOUT_MIN;
  function ctrlWorkerAutoStatus(j, a) {
    if (a.status === '결근' || a.status === '대기') return { state: 'skip', label: '-' };
    if (a.checkout) return { state: 'done', label: a.checkout };
    const past = ctrlMinutesPastEnd(j);
    if (past === null || past < 0) return { state: 'active', label: '근무 중' };
    const remain = AUTO_CK_LIMIT_MIN - past;
    if (remain <= 0) return { state: 'settled', label: '자동 처리됨' };
    const hh = Math.floor(remain / 60), mm = remain % 60;
    const st = remain <= 60 ? 'critical' : 'pending';
    return { state: st, label: `자동퇴근 ${hh}:${String(mm).padStart(2,'0')}`, remain };
  }
  function ctrlJobAutoSummary(j) {
    const past = ctrlMinutesPastEnd(j);
    if (past === null || past < 0) return { state: 'active', pending: 0, label: null };
    const attend = getAttendance(j.id);
    const pending = attend.filter(a => !a.checkout && a.status !== '결근' && a.status !== '대기').length;
    if (pending === 0) return { state: 'none', pending: 0, label: null };
    if (past >= AUTO_CK_LIMIT_MIN) return { state: 'settled', pending, label: `${pending}명 자동 처리됨` };
    const remain = AUTO_CK_LIMIT_MIN - past;
    const hh = Math.floor(remain / 60), mm = remain % 60;
    const st = remain <= 60 ? 'critical' : 'pending';
    return { state: st, pending, label: `퇴근 미처리 ${pending}명 · 자동 ${hh}:${String(mm).padStart(2,'0')} 남음`, remain };
  }
  function ctrlBannerSummary() {
    const today = jobs.filter(j => j.date === TODAY);
    const pendingJobs = [];
    let criticalCount = 0;
    let settledJobs = 0;
    today.forEach(j => {
      const s = ctrlJobAutoSummary(j);
      if (s.state === 'pending' || s.state === 'critical') {
        pendingJobs.push({ job: j, summary: s });
        if (s.state === 'critical') criticalCount++;
      }
      if (s.state === 'settled') settledJobs++;
    });
    return { pendingJobs, criticalCount, settledJobs };
  }

  // GPS 미검증 퇴근 승인
  function pendingGpsReqs() { return gpsRequests.filter(g => g.status === 'pending'); }
  function processedGpsReqs() { return gpsRequests.filter(g => g.status !== 'pending'); }
  function gpsReqForWorkerJob(workerId, jobId) {
    return gpsRequests.find(g => g.status === 'pending' && g.workerId === workerId && g.jobId === jobId);
  }
  function distSeverity(d) {
    if (d <= 100) return { cls: 'low',  label: '근접' };
    if (d <= 300) return { cls: 'mid',  label: '중간' };
    return                { cls: 'high', label: '과도' };
  }
  function renderGpsPanelForJob(jobId) {
    const pending = pendingGpsReqs().filter(g => g.jobId === jobId);
    if (pending.length === 0) return '';
    return renderGpsPanelHtml(pending);
  }
  function renderGpsPanelHtml(listArg) {
    const pending = listArg || pendingGpsReqs();
    if (pending.length === 0) return '';
    const rows = pending.map(g => {
      const w = findWorker(g.workerId); if (!w) return '';
      const j = findJob(g.jobId);       if (!j) return '';
      const site = findSite(j.siteId);
      const reward = pointRewardFor(j);
      const sev = distSeverity(g.distance);
      const warnHtml = w.warnings > 0 ? `<span class="warn-pill warn-${w.warnings}">경고 ${w.warnings}</span>` : '';
      const negHtml = w.negotiation ? '<span class="neg-pill">협의대상</span>' : '';
      return `
        <div class="gps-req-row">
          <div class="gps-req-worker">
            <div class="gps-req-worker-name">${w.name} ${warnHtml} ${negHtml}</div>
            <div class="gps-req-worker-sub">${w.phone}</div>
          </div>
          <div>
            <div class="gps-req-job-title">${site.site.name} <span style="font-size:11px; color:#6B7684; font-weight:400;">${site.partner}</span></div>
            <div class="gps-req-job-sub">${j.date} · ${j.slot} ${j.start}~${j.end} · 제출 ${g.submittedAt}</div>
          </div>
          <div class="gps-req-reason" title="${esc(g.reason)}">${esc(g.reason)}</div>
          <div class="gps-req-dist">
            <div class="gps-req-dist-badge ${sev.cls}"><strong>${g.distance}m</strong><span>영역 밖 · ${sev.label}</span></div>
          </div>
          <div class="gps-req-actions">
            <button class="btn-approve" onclick="window.__ctrlGpsApprove('${g.id}')" title="승인 시 ${reward.toLocaleString()}P 지급">승인</button>
            <button class="btn-reject"  onclick="window.__ctrlGpsDeny('${g.id}')">반려</button>
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="gps-panel">
        <div class="gps-panel-head">
          <div class="gps-panel-title">🛰 GPS 미검증 퇴근 승인 대기 <span class="gps-panel-count">${pending.length}</span></div>
          <div>
            <a class="gps-panel-link" onclick="window.__ctrlGpsHistory()">처리 이력 (${processedGpsReqs().length}건) →</a>
          </div>
        </div>
        ${rows}
        <div style="margin-top:10px; padding-top:10px; border-top: 0.5px solid rgba(0,0,0,0.06); font-size: 11px; color: #6B7684;">
          승인 시 <strong>잡핏 포인트 자동 지급</strong> (시간대별 보상) · 반려 시 퇴근은 기록되나 포인트 미지급
        </div>
      </div>
    `;
  }

  // 시계/자동 갱신 — 관제 페이지 떠있을 때만 DOM 존재 여부로 판단 (없으면 타이머 자동 중단)
  // 시계 + 자동 재렌더 타이머 (퇴근 승인 페이지에서 사용)
  let ctrlTickTimer = null;
  let ctrlAutoRenderTimer = null;
  function ctrlStopTimers() {
    if (ctrlTickTimer)      { clearInterval(ctrlTickTimer);      ctrlTickTimer = null; }
    if (ctrlAutoRenderTimer){ clearInterval(ctrlAutoRenderTimer); ctrlAutoRenderTimer = null; }
  }
  function ctrlStartTimers(renderFn) {
    ctrlStopTimers();
    ctrlTickTimer = setInterval(() => {
      const el = document.getElementById('ctrl-clock');
      if (!el) { ctrlStopTimers(); return; }
      const d = new Date();
      el.textContent = TODAY + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
    }, 1000);
    if (typeof renderFn === 'function') {
      ctrlAutoRenderTimer = setInterval(() => {
        if (!document.getElementById('ctrl-clock')) { ctrlStopTimers(); return; }
        renderFn();
      }, 30 * 1000);
    }
  }

  function renderContractModal(jobId, workerId) {
    const j = findJob(jobId); if (!j) return;
    const w = findWorker(workerId); if (!w) return;
    const site = findSite(j.siteId);
    const filename = `${j.date.replace(/-/g,'')}_${site.site.name}_${w.name}.pdf`;
    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay';
    overlay.innerHTML = `
      <div class="jf-modal" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">📄 ${filename}</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div style="padding: 20px; background: #F9FAFB; border-radius: 8px; border: 0.5px solid rgba(0,0,0,0.08); font-size: 13px; line-height: 1.8;">
            <div style="text-align:center; font-size:18px; font-weight:500; margin-bottom:14px;">단기 근로계약서</div>
            <div><strong>근로자:</strong> ${w.name} (${w.phone})</div>
            <div><strong>근무지:</strong> ${site.partner} — ${site.site.name}</div>
            <div><strong>주소:</strong> ${site.site.addr}</div>
            <div><strong>근무일:</strong> ${j.date}</div>
            <div><strong>근무시간:</strong> ${j.slot} ${j.start} ~ ${j.end}</div>
            <div><strong>${j.wageType}:</strong> ${j.wage.toLocaleString()}원</div>
            <div><strong>담당자:</strong> ${j.contact}</div>
            <div style="margin-top:10px; padding-top:10px; border-top: 0.5px dashed rgba(0,0,0,0.15); color:#6B7684; font-size:12px;">
              ※ 실제 앱에서는 Supabase Storage의 계약서 PDF 파일이 렌더됩니다.
            </div>
          </div>
          <div style="margin-top: 16px; padding: 16px; background: #fff; border: 0.5px solid rgba(0,0,0,0.08); border-radius: 8px;">
            <div style="font-size: 12px; color: #6B7684; margin-bottom: 8px;">전자 서명</div>
            <svg width="100%" height="90" viewBox="0 0 300 90" style="background:#FAFBFC; border: 0.5px dashed rgba(0,0,0,0.1); border-radius:4px;">
              <path d="M 30 60 Q 50 20, 70 50 T 110 55 Q 130 30, 150 55 T 195 50 Q 220 40, 240 65 Q 255 70, 270 50" fill="none" stroke="#1B3A6B" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <div style="font-size: 11px; color: #6B7684; margin-top: 6px;">서명 일시: ${j.date} ${j.start} · 서명자: ${w.name}</div>
          </div>
          <div style="display:flex; gap:8px; margin-top: 16px;">
            <button onclick="alert('PDF 다운로드는 추후 구현')" style="flex:1;">PDF 다운로드</button>
            <button class="btn-primary" onclick="this.closest('.jf-modal-overlay').remove()" style="flex:1;">닫기</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // 계약서 모달 — 공고 상세 알바생 명단에서 호출
  window.__ctrlContract = function(jobId, workerId) { renderContractModal(jobId, workerId); };

  // 시뮬 시각 입력 (퇴근 승인 페이지에서 사용)
  window.__ctrlSimSet = function(val) { ctrlState.simTime = val || null; const active = document.querySelector('.jf-nav-item.active'); if (active && active.getAttribute('data-page') === 'gpsapproval') renderGpsApproval(); };
  window.__ctrlSimReset = function() { ctrlState.simTime = null; const active = document.querySelector('.jf-nav-item.active'); if (active && active.getAttribute('data-page') === 'gpsapproval') renderGpsApproval(); };

  // 관제 시스템 (전광판) — 별도 창으로 control.html 오픈
  window.__openControlBoard = function() {
    window.open('control.html', 'jobfit-control', 'noopener');
  };

  // 홈/공고 상세에서 공고별 출결 화면 바로가기 → 공고 관리 공고 상세로 이동
  window.__gotoJobDetail = function(jobId) {
    window.__navGoto('jobs');
    setTimeout(() => window.__jobsDetail(jobId), 50);
  };

  // ─── Generic Prompt Modal — prompt() 대체 ────────────────
  // fields: [{key, label, type='text'|'textarea'|'select', required, placeholder, options?, value?, hint?}]
  // onSubmit(values) — return false 면 닫지 않음
  function promptModal({ title, subtitle, fields, onSubmit, submitLabel='확인', cancelLabel='취소', danger=false }) {
    document.querySelectorAll('.jf-modal-overlay.prompt-modal').forEach(el => el.remove());
    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay prompt-modal';
    const fieldsHtml = fields.map((f, i) => {
      const id = 'pm-field-' + i;
      const reqMark = f.required ? '<span class="req">*</span>' : '';
      let input;
      if (f.type === 'textarea') {
        input = `<textarea id="${id}" rows="3" placeholder="${esc(f.placeholder||'')}" style="width:100%; padding:8px 10px; border:0.5px solid rgba(0,0,0,0.15); border-radius:6px; font-family:inherit; resize:vertical;">${esc(f.value||'')}</textarea>`;
      } else if (f.type === 'select') {
        input = `<select id="${id}" style="max-width:280px;">${(f.options||[]).map(o => `<option value="${esc(o.value)}" ${o.value===f.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;
      } else {
        input = `<input type="${f.type||'text'}" id="${id}" value="${esc(f.value||'')}" placeholder="${esc(f.placeholder||'')}" style="max-width:380px; width:100%;">`;
      }
      return `
        <div class="jf-form-row top" style="grid-template-columns: 100px 1fr; padding: 8px 0;">
          <div class="jf-form-label">${esc(f.label)}${reqMark}</div>
          <div>
            ${input}
            ${f.hint ? `<div style="font-size:11px; color:#6B7684; margin-top:4px;">${esc(f.hint)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 520px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">${esc(title)}</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          ${subtitle ? `<div style="font-size:12px; color:#6B7684; margin-bottom:14px; line-height:1.6;">${subtitle}</div>` : ''}
          ${fieldsHtml}
          <div style="display:flex; gap:8px; margin-top:18px; padding-top:14px; border-top:0.5px solid rgba(0,0,0,0.08); justify-content:flex-end;">
            <button data-pm-cancel>${esc(cancelLabel)}</button>
            <button class="${danger?'btn-reject':'btn-primary'}" data-pm-submit>${esc(submitLabel)}</button>
          </div>
        </div>
      </div>
    `;
    function getValues() {
      const vals = {};
      fields.forEach((f, i) => {
        const el = document.getElementById('pm-field-' + i);
        vals[f.key] = el ? el.value.trim() : '';
      });
      return vals;
    }
    overlay.querySelector('[data-pm-cancel]').addEventListener('click', () => overlay.remove());
    overlay.querySelector('[data-pm-submit]').addEventListener('click', () => {
      const vals = getValues();
      // 필수 검증
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (f.required && !vals[f.key]) {
          alert((f.label || '필수') + ' 항목을 입력해주세요.');
          return;
        }
      }
      const result = onSubmit(vals);
      if (result !== false) overlay.remove();
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('pm-field-0')?.focus(), 50);
  }

  // GPS 승인/반려 모달 (helper 사용)
  function showGpsReviewModal(action, g, w, j) {
    const reward = pointRewardFor(j);
    const isApprove = action === 'approve';
    promptModal({
      title: isApprove ? `✓ GPS 미검증 퇴근 승인` : `✗ GPS 미검증 퇴근 반려`,
      subtitle: `<strong>${esc(w.name)}</strong> · ${esc(findSite(j.siteId)?.site.name || '')} · ${j.date} ${j.slot}<br>` +
                (isApprove
                  ? `잡핏 포인트 <strong>${reward.toLocaleString()}P</strong> 지급 예정`
                  : `포인트 미지급 · 퇴근 자체는 기록으로 남음`),
      fields: [
        { key: 'note', label: isApprove ? '메모' : '반려 사유', type: 'textarea',
          required: !isApprove, placeholder: isApprove ? '승인 근거나 후속 조치 (선택)' : '필수 — 알바생에게 통보됨' },
      ],
      submitLabel: isApprove ? `승인 (${reward.toLocaleString()}P 지급)` : '반려',
      danger: !isApprove,
      onSubmit: (vals) => {
        if (isApprove) {
          const r = approveGpsRequest(g.id, vals.note, '테스트(마스터)');
          if (r) { refreshAfterGpsChange(); alert(`✓ ${r.worker.name} 님에게 ${r.reward.toLocaleString()}P 지급되었습니다.\n(보유 ${r.worker.points.toLocaleString()}P)`); }
        } else {
          denyGpsRequest(g.id, vals.note, '테스트(마스터)');
          refreshAfterGpsChange();
          alert(`${w.name} 님의 GPS 미검증 퇴근이 반려되었습니다.\n사유: ${vals.note}\n포인트 지급 없음.`);
        }
      },
    });
  }

  // GPS 승인 — 포인트 지급 + 상태 기록
  window.__ctrlGpsApprove = function(id) {
    const g = findGpsReq(id); if (!g || g.status !== 'pending') return;
    const w = findWorker(g.workerId); const j = findJob(g.jobId);
    if (!w || !j) return;
    showGpsReviewModal('approve', g, w, j);
  };
  window.__ctrlGpsDeny = function(id) {
    const g = findGpsReq(id); if (!g || g.status !== 'pending') return;
    const w = findWorker(g.workerId); const j = findJob(g.jobId);
    if (!w || !j) return;
    showGpsReviewModal('deny', g, w, j);
  };

  // GPS 상태 변경 후 현재 페이지를 판단하여 적절히 재렌더 + 뱃지 갱신
  function refreshAfterGpsChange() {
    updateGpsBadge();
    const active = document.querySelector('.jf-nav-item.active');
    const page = active ? active.getAttribute('data-page') : null;
    if (page === 'gpsapproval') renderGpsApproval();
    else if (page === 'control') ctrlDoRender();
  }
  window.__ctrlGpsHistory = function() {
    document.querySelectorAll('.jf-modal-overlay.gps-hist').forEach(el => el.remove());
    const processed = processedGpsReqs().sort((a, b) => (b.reviewedAt || '').localeCompare(a.reviewedAt || ''));
    const rowsHtml = (list) => list.length === 0
      ? '<div style="padding:30px 0; text-align:center; color:#6B7684; font-size:13px;">해당 항목이 없습니다.</div>'
      : list.map(g => {
          const w = findWorker(g.workerId); const j = findJob(g.jobId);
          if (!w || !j) return '';
          const site = findSite(j.siteId);
          return `
            <div class="gps-hist-row">
              <div>
                <div style="font-weight:500; color:#111827;">${w.name}</div>
                <div style="font-size:11px; color:#6B7684; font-family:'SF Mono',Monaco,monospace;">${w.phone}</div>
                <div style="margin-top:4px;"><span class="gps-hist-status ${g.status}">${g.status === 'approved' ? '✓ 승인' : '✗ 반려'}</span></div>
              </div>
              <div>
                <div style="font-weight:500; color:#111827;">${site.site.name}</div>
                <div style="color:#6B7684; font-size:11px; margin-top:2px;">${j.date} · ${j.slot} ${j.start}~${j.end}</div>
                <div style="color:#6B7684; font-size:11px; margin-top:2px;">영역 밖 ${g.distance}m · 제출 ${g.submittedAt}</div>
              </div>
              <div>
                <div style="color:#374151; line-height:1.5;">${esc(g.reason)}</div>
                ${g.adminNote ? `<div style="margin-top:6px; padding:6px 8px; background:#F9FAFB; border-radius:4px; color:#6B7684; font-size:11px; line-height:1.5;">관리자 메모: ${esc(g.adminNote)}</div>` : ''}
              </div>
              <div style="text-align:right;">
                <div style="color:#111827; font-size:11px;">${g.reviewedBy || '-'}</div>
                <div style="color:#6B7684; font-size:11px; margin-top:2px; font-family:'SF Mono',Monaco,monospace;">${g.reviewedAt || '-'}</div>
              </div>
            </div>
          `;
        }).join('');
    const approvedList = processed.filter(g => g.status === 'approved');
    const deniedList = processed.filter(g => g.status === 'denied');
    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay gps-hist';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 840px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">🛰 GPS 미검증 퇴근 처리 이력 · 총 ${processed.length}건</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="gps-hist-tabs">
            <div class="gps-hist-tab active" data-tab="all" onclick="window.__ctrlGpsHistTab('all')">전체 (${processed.length})</div>
            <div class="gps-hist-tab" data-tab="approved" onclick="window.__ctrlGpsHistTab('approved')">승인 (${approvedList.length})</div>
            <div class="gps-hist-tab" data-tab="denied" onclick="window.__ctrlGpsHistTab('denied')">반려 (${deniedList.length})</div>
          </div>
          <div id="gps-hist-body">${rowsHtml(processed)}</div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    window.__ctrlGpsHistTab = function(tab) {
      document.querySelectorAll('.gps-hist-tab').forEach(el => el.classList.toggle('active', el.getAttribute('data-tab') === tab));
      const filtered = tab === 'all' ? processed : tab === 'approved' ? approvedList : deniedList;
      document.getElementById('gps-hist-body').innerHTML = rowsHtml(filtered);
    };
  };

  // ───────────────────────────────────────────────────────
  // 포인트 페이지
  // ───────────────────────────────────────────────────────
  const pointState = {
    tab: 'request', // request / history / deduct
  };

  function pointTabsHtml() {
    const pendingCount = pointTxs.filter(t => t.type === 'withdraw' && t.status === 'pending').length;
    const tabs = [
      { id: 'request', label: '출금 요청' + (pendingCount > 0 ? ` (${pendingCount})` : '') },
      { id: 'history', label: '출금 이력' },
      { id: 'deduct',  label: '회수 로그' },
    ];
    return `<div class="jf-tabs">${tabs.map(t =>
      `<div class="jf-tab ${pointState.tab === t.id ? 'active' : ''}" onclick="window.__ptTab('${t.id}')">${t.label}</div>`
    ).join('')}</div>`;
  }

  function renderPoints() {
    const pendingW = pointTxs.filter(t => t.type === 'withdraw' && t.status === 'pending');
    const pendingAmount = pendingW.reduce((s, t) => s + t.amount, 0);
    const thisMonth = TODAY.slice(0, 7);
    const paidThisMonth = pointTxs.filter(t => t.type === 'withdraw' && t.status === 'done' && t.processedAt && t.processedAt.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0);
    const todayProcessed = pointTxs.filter(t => t.type === 'withdraw' && t.processedAt && t.processedAt.startsWith(TODAY)).length;
    const failedCount = pointTxs.filter(t => t.status === 'failed').length;

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">포인트</div>
          <div class="jf-subtitle">출금 요청 처리 · 회수 로그 · 반자동 처리 (1차 출시)</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('points')">엑셀</button>
        </div>
      </div>

      ${pointTabsHtml()}

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">대기 중 요청</div><div class="jf-metric-value" style="color:${pendingW.length>0?'#F59E0B':'#111827'};">${pendingW.length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">총 ${pendingAmount.toLocaleString()}P</div></div>
        <div class="jf-metric"><div class="jf-metric-label">오늘 처리</div><div class="jf-metric-value">${todayProcessed}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">완료 + 실패</div></div>
        <div class="jf-metric"><div class="jf-metric-label">이번 달 포인트 출금</div><div class="jf-metric-value">${paidThisMonth.toLocaleString()}<span style="font-size:13px; color:#6B7684; font-weight:400;"> P</span></div><div class="jf-metric-hint">${thisMonth} 출금 완료 기준</div></div>
        <div class="jf-metric"><div class="jf-metric-label">출금 실패</div><div class="jf-metric-value" style="color:${failedCount>0?'#EF4444':'#16A34A'};">${failedCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">${failedCount>0?'재처리 필요':'모두 정상'}</div></div>
      </div>

      <div class="ws-warn-box">ℹ 1차 출시는 <strong>반자동 처리</strong>입니다. 마스터가 인터넷뱅킹으로 직접 이체 후 "처리 완료" 버튼을 클릭해주세요. 토스 자동 이체는 본 계약 범위 외(전자금융업 등록 후 별도 진행).</div>
    `;

    if (pointState.tab === 'request')  html += renderPointWithdraws(pendingW);
    if (pointState.tab === 'history')  html += renderPointHistory();
    if (pointState.tab === 'deduct')   html += renderPointDeduct();

    main.innerHTML = html;
  }

  function renderPointWithdraws(list) {
    if (list.length === 0) {
      return `<div class="jf-placeholder"><div class="jf-placeholder-icon">✅</div><div class="jf-placeholder-title">대기 중인 출금 요청이 없습니다</div><div class="jf-placeholder-desc">알바생이 요청하면 여기에 표시됩니다. 최초 3만P부터 1만P 단위로 요청 가능.</div></div>`;
    }
    const sorted = [...list].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    const gridCols = '1.3fr 1fr 1.6fr 1fr 1fr';
    let html = `
      <div class="jf-table">
        <div class="jf-table-head" style="grid-template-columns:${gridCols};">
          <div>알바생</div>
          <div>요청 포인트</div>
          <div>입금 계좌</div>
          <div>요청 일시</div>
          <div style="text-align:right;">처리</div>
        </div>
    `;
    sorted.forEach(t => {
      const w = findWorker(t.workerId);
      html += `
        <div class="jf-table-row" style="grid-template-columns:${gridCols}; cursor:default;">
          <div>
            <div class="worker-name">${w.name}</div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:11px; color:#6B7684; margin-top:2px;">${w.phone}</div>
          </div>
          <div><strong style="font-size:15px; color:#2563EB;">${t.amount.toLocaleString()}</strong><span style="color:#6B7684; font-size:12px;"> P</span></div>
          <div>
            <div style="font-size:13px; font-weight:500;">${t.bank}</div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px; color:#111827; margin-top:3px;">${t.account}</div>
            <button onclick="window.__ptCopy('${t.bank} ${t.account}')" style="font-size:10px; height:22px; padding:0 8px; margin-top:3px;">계좌 복사</button>
          </div>
          <div style="font-size:12px; color:#6B7684;">${t.requestedAt}</div>
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button onclick="window.__ptFail('${t.id}')" style="font-size:11px; height:32px; padding:0 12px; color:#EF4444;">출금 실패</button>
            <button class="btn-primary" onclick="window.__ptDone('${t.id}')" style="font-size:11px; height:32px; padding:0 14px;">처리 완료</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  function renderPointHistory() {
    const list = pointTxs.filter(t => t.type === 'withdraw' && t.status !== 'pending')
      .sort((a, b) => (b.processedAt || '').localeCompare(a.processedAt || ''));
    if (list.length === 0) {
      return `<div class="jf-placeholder"><div class="jf-placeholder-icon">📜</div><div class="jf-placeholder-title">출금 이력이 없습니다</div></div>`;
    }
    const gridCols = '1.3fr 1fr 1.6fr 1.2fr 0.8fr';
    let html = `
      <div class="jf-table">
        <div class="jf-table-head" style="grid-template-columns:${gridCols};">
          <div>알바생</div>
          <div>금액</div>
          <div>입금 계좌</div>
          <div>처리 정보</div>
          <div>상태</div>
        </div>
    `;
    list.forEach(t => {
      const w = findWorker(t.workerId);
      const stStyle = t.status === 'done' ? 'background:#DCFCE7; color:#166534;' : 'background:#FEE2E2; color:#991B1B;';
      const stLabel = t.status === 'done' ? '완료' : '실패';
      html += `
        <div class="jf-table-row" style="grid-template-columns:${gridCols}; cursor:default;">
          <div>
            <div class="worker-name">${w.name}</div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:11px; color:#6B7684; margin-top:2px;">${w.phone}</div>
          </div>
          <div><strong>${t.amount.toLocaleString()}</strong><span style="color:#6B7684; font-size:12px;"> P</span></div>
          <div>
            <div style="font-size:12px;">${t.bank}</div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:11px; color:#6B7684; margin-top:2px;">${t.account}</div>
          </div>
          <div style="font-size:12px;">
            <div>처리 ${t.processedAt || '-'}</div>
            <div style="color:#6B7684; font-size:11px; margin-top:2px;">${t.processedBy || ''}</div>
            ${t.failReason ? '<div style="color:#EF4444; font-size:11px; margin-top:3px;">' + t.failReason + '</div>' : ''}
          </div>
          <div><span class="apv-badge" style="${stStyle}">${stLabel}</span></div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  function renderPointDeduct() {
    const list = pointTxs.filter(t => t.type === 'deduct')
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    if (list.length === 0) {
      return `<div class="jf-placeholder"><div class="jf-placeholder-icon">📋</div><div class="jf-placeholder-title">회수 내역이 없습니다</div></div>`;
    }
    const gridCols = '1.3fr 1fr 2fr 1fr 0.8fr';
    let html = `
      <div class="jf-table">
        <div class="jf-table-head" style="grid-template-columns:${gridCols};">
          <div>알바생</div>
          <div>차감 포인트</div>
          <div>사유</div>
          <div>일시</div>
          <div>처리자</div>
        </div>
    `;
    list.forEach(t => {
      const w = findWorker(t.workerId);
      const isAuto = t.processedBy === '시스템';
      html += `
        <div class="jf-table-row" style="grid-template-columns:${gridCols}; cursor:default;">
          <div>
            <div class="worker-name">${w.name}</div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:11px; color:#6B7684; margin-top:2px;">${w.phone}</div>
          </div>
          <div><strong style="color:#EF4444;">${t.amount.toLocaleString()}</strong><span style="color:#6B7684; font-size:12px;"> P</span></div>
          <div style="font-size:12px;">${t.reason}</div>
          <div style="font-size:12px; color:#6B7684;">${t.requestedAt}</div>
          <div><span class="apv-badge" style="${isAuto ? 'background:#DBEAFE; color:#1E40AF;' : 'background:#F3F4F6; color:#374151;'}">${t.processedBy}</span></div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  window.__ptTab = function(id) { pointState.tab = id; renderPoints(); };
  window.__ptCopy = function(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('복사됨: ' + text));
    } else {
      alert('복사: ' + text);
    }
  };
  window.__ptDone = function(id) {
    const t = findTx(id); if (!t) return;
    const w = findWorker(t.workerId);
    if (!confirm(`${w.name} 님에게 ${t.amount.toLocaleString()}P (${t.bank} ${t.account}) 이체를 완료하셨나요?\n\n처리 완료를 누르면 알바생의 보유 포인트에서 차감되고 완료 알림이 발송됩니다.`)) return;
    t.status = 'done';
    t.processedAt = TODAY + ' ' + new Date().toTimeString().slice(0,5);
    t.processedBy = '테스트(마스터)';
    w.points = Math.max(w.points - t.amount, 0);
    logAudit({
      category: 'point', action: 'done',
      target: w.name,
      targetId: id,
      summary: t.amount.toLocaleString() + 'P 출금 완료 — ' + (t.bank || '') + ' ' + (t.account || ''),
    });
    alert(`${w.name} 님 출금 ${t.amount.toLocaleString()}P 처리 완료.`);
    renderPoints();
  };
  window.__ptFail = function(id) {
    const t = findTx(id); if (!t) return;
    const w = findWorker(t.workerId);
    promptModal({
      title: '출금 처리 실패 기록',
      subtitle: `<strong>${esc(w.name)}</strong> · ${t.amount.toLocaleString()}P · ${esc(t.bank || '')} ${esc(t.account || '')}`,
      fields: [{ key: 'reason', label: '실패 사유', type: 'textarea', required: true, placeholder: '예: 계좌번호 오류, 은행 점검 중 등', hint: '알바생에게 알림 발송됨 · 포인트는 차감 안 됨' }],
      submitLabel: '실패 처리',
      danger: true,
      onSubmit: (vals) => {
        t.status = 'failed';
        t.processedAt = nowStamp();
        t.processedBy = '테스트(마스터)';
        t.failReason = vals.reason;
        logAudit({
          category: 'point', action: 'failed',
          target: w.name,
          targetId: id,
          summary: t.amount.toLocaleString() + 'P 실패 — ' + vals.reason,
        });
        alert('출금 실패 로그 저장됨. 알바생에게 알림 발송.\n포인트는 차감되지 않음. 재요청을 기다려주세요.');
        renderPoints();
      },
    });
  };

  // ───────────────────────────────────────────────────────
  // 협의대상 페이지
  // ───────────────────────────────────────────────────────
  const negState = {
    search: '',
    reason: '',  // '' / auto / manual / rematch
  };

  function renderNegotiation() {
    const q = negState.search.trim().toLowerCase();
    const thisMonth = TODAY.slice(0, 7); // '2026-04'

    let list = negotiations.filter(n => {
      if (q && !(n.name.toLowerCase().includes(q) || n.phone.includes(q))) return false;
      if (negState.reason && negState.reason !== n.reason) return false;
      return true;
    });
    list = list.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));

    const totalN = negotiations.length;
    const thisMonthN = negotiations.filter(n => n.registeredAt.startsWith(thisMonth)).length;
    const autoN = negotiations.filter(n => n.reason === 'auto').length;
    const rematchN = negotiations.filter(n => n.reason === 'rematch').length;

    const REASON_LABEL = { auto: '경고 3회 자동', manual: '수동 등록', rematch: '재가입 매칭' };
    const REASON_STYLE = {
      auto:    'background:#FEE2E2; color:#991B1B;',
      manual:  'background:#F3F4F6; color:#374151;',
      rematch: 'background:#DBEAFE; color:#1E40AF;',
    };

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">협의대상</div>
          <div class="jf-subtitle">전화번호 기반 관리 · 해제는 마스터 전용</div>
        </div>
        <div class="ws-actions">
          <button onclick="window.__negAdd()">+ 수동 등록</button>
          <button onclick="renderHistory('negotiation','negotiation')">등록/해제 이력</button>
        </div>
      </div>

      <div class="ws-warn-box">ℹ 협의대상 유저의 신청은 <strong>시간 무관 관리자 승인</strong>이 필요합니다. 영구 차단은 없으며, 마스터가 해제하면 정상 상태로 복귀합니다.</div>

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">전체 협의대상</div><div class="jf-metric-value" style="color:${totalN>0?'#EF4444':'#111827'};">${totalN}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">전화번호 기준</div></div>
        <div class="jf-metric"><div class="jf-metric-label">이번 달 신규</div><div class="jf-metric-value">${thisMonthN}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">${thisMonth} 기준</div></div>
        <div class="jf-metric"><div class="jf-metric-label">경고 3회 자동</div><div class="jf-metric-value">${autoN}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">시스템 자동 등록</div></div>
        <div class="jf-metric"><div class="jf-metric-label">재가입 매칭</div><div class="jf-metric-value">${rematchN}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">과거 번호 자동 감지</div></div>
      </div>

      <div class="jobs-filters">
        <div class="jf-search"><input type="text" placeholder="이름 · 전화번호 검색" value="${negState.search}" oninput="window.__negSearch(this.value)" /></div>
        <select onchange="window.__negFilter('reason', this.value)">
          <option value="">전체 등록 사유</option>
          <option value="auto"    ${negState.reason==='auto'?'selected':''}>경고 3회 자동</option>
          <option value="manual"  ${negState.reason==='manual'?'selected':''}>수동 등록</option>
          <option value="rematch" ${negState.reason==='rematch'?'selected':''}>재가입 매칭</option>
        </select>
        ${(negState.search || negState.reason) ? `<button onclick="window.__negClearFilter()" style="font-size:12px;">필터 초기화</button>` : ''}
        <div style="margin-left:auto; font-size:12px; color:#6B7684; align-self:center;">${list.length}명 표시</div>
      </div>
    `;

    if (list.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">✅</div><div class="jf-placeholder-title">${negotiations.length === 0 ? '협의대상이 없습니다' : '조건에 맞는 협의대상이 없습니다'}</div><div class="jf-placeholder-desc">${negotiations.length === 0 ? '모든 알바생이 정상 상태입니다.' : '검색어/필터를 변경해보세요.'}</div></div>`;
    } else {
      const gridCols = '1.2fr 1.1fr 1.6fr 1.2fr 0.9fr 1.1fr';
      html += `
        <div class="jf-table">
          <div class="jf-table-head" style="grid-template-columns:${gridCols};">
            <div>이름</div>
            <div>전화번호</div>
            <div>등록 사유</div>
            <div>마지막 근무지</div>
            <div>등록일</div>
            <div style="text-align:right;">액션</div>
          </div>
      `;
      list.forEach(n => {
        const linked = n.workerId ? findWorker(n.workerId) : null;
        html += `
          <div class="jf-table-row" style="grid-template-columns:${gridCols}; cursor:default;">
            <div class="worker-name">
              ${n.name}
              ${!linked ? '<span class="apv-badge" style="background:#F3F4F6; color:#6B7684; font-size:10px; padding:2px 6px;">번호만</span>' : ''}
            </div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px; color:#6B7684;">${n.phone}</div>
            <div>
              <span class="apv-badge" style="${REASON_STYLE[n.reason]}">${REASON_LABEL[n.reason]}</span>
              <div style="font-size:11px; color:#6B7684; margin-top:3px;">${n.sub}</div>
            </div>
            <div style="font-size:12px;">
              <div>${n.lastSite}</div>
              <div style="color:#6B7684; font-size:11px; margin-top:2px;">${n.lastDate}</div>
            </div>
            <div style="font-size:12px; color:#6B7684;">
              <div>${n.registeredAt}</div>
              <div style="font-size:11px; color:#9CA3AF;">${n.registeredBy}</div>
            </div>
            <div style="display:flex; gap:6px; justify-content:flex-end;">
              ${linked ? `<button onclick="window.__wrkDetail('${linked.id}')" style="font-size:11px; height:30px; padding:0 10px;">상세</button>` : ''}
              <button class="btn-primary" onclick="window.__negRelease('${n.id}')" style="font-size:11px; height:30px; padding:0 10px;">해제 (마스터)</button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    main.innerHTML = html;
  }

  window.__negSearch = function(val) { negState.search = val; renderNegotiation(); };
  window.__negFilter = function(key, val) { negState[key] = val; renderNegotiation(); };
  window.__negClearFilter = function() { negState.search = ''; negState.reason = ''; renderNegotiation(); };
  window.__negAdd = function() {
    promptModal({
      title: '협의대상 수동 등록',
      subtitle: '전화번호로 등록 · 기존 근무자와 자동 매칭됩니다 · 해제는 마스터 전용',
      fields: [
        { key: 'phone',  label: '전화번호', type: 'tel',      required: true, placeholder: '010-0000-0000' },
        { key: 'reason', label: '등록 사유', type: 'textarea', required: true, placeholder: '예: 무단결근 반복, 외부 신고 접수 등' },
      ],
      submitLabel: '등록',
      onSubmit: (vals) => {
        const phone = vals.phone;
        const reason = vals.reason;
        const id = 'n' + String(negotiations.length + 1).padStart(3, '0');
        const matched = workers.find(w => w.phone === phone);
        if (matched) {
          matched.negotiation = true;
          matched.warnings = Math.max(matched.warnings, POLICY.WARN_LIMIT);
        }
        negotiations.push({
          id, phone,
          name: matched ? matched.name : '(수동 등록 · 번호만)',
          registeredAt: TODAY,
          reason: 'manual',
          sub: reason,
          lastSite: matched ? '(근무자 이력 참조)' : '-',
          lastDate: matched ? matched.lastWorked : '-',
          workerId: matched ? matched.id : null,
          registeredBy: '테스트(마스터)',
        });
        logAudit({
          category: 'negotiation', action: 'manual',
          target: matched ? matched.name : phone,
          targetId: id,
          summary: '수동 등록 — ' + reason + (matched ? '' : ' (미가입 번호)'),
        });
        alert('협의대상 등록 완료.\n전화번호: ' + phone + '\n' + (matched ? '기존 근무자 ' + matched.name + ' 님과 자동 매칭됨.' : '미가입 전화번호로 등록됨.'));
        renderNegotiation();
      },
    });
  };
  window.__negRelease = function(id) {
    const n = findNeg(id); if (!n) return;
    if (!confirm(`${n.name} (${n.phone}) 님의 협의대상을 해제합니다. (마스터 전용)\n\n• 경고 카운트가 0으로 초기화됩니다\n• 정상 상태로 복귀합니다\n\n계속하시겠습니까?`)) return;
    if (n.workerId) {
      const w = findWorker(n.workerId);
      if (w) { w.negotiation = false; w.warnings = 0; }
    }
    const idx = negotiations.indexOf(n);
    if (idx >= 0) negotiations.splice(idx, 1);
    logAudit({
      category: 'negotiation', action: 'release',
      target: n.name,
      targetId: id,
      summary: '협의대상 해제 (마스터 권한) · 전화번호 ' + n.phone,
    });
    alert(`${n.name} 님의 협의대상 해제 완료.`);
    renderNegotiation();
  };

  // ───────────────────────────────────────────────────────
  // 근무자 관리 페이지
  // ───────────────────────────────────────────────────────
  const workerState = {
    search: '',
    status: '',      // '' / normal / warn / neg / new / noshow
    sort: 'recent',  // recent / name / warn / total
  };

  function renderWorkers() {
    const q = workerState.search.trim().toLowerCase();
    const WEEK_AGO = new Date(TODAY); WEEK_AGO.setDate(WEEK_AGO.getDate() - 7);
    const weekAgoStr = WEEK_AGO.toISOString().slice(0, 10);

    // 필터
    let list = workers.filter(w => {
      if (q && !(w.name.toLowerCase().includes(q) || w.phone.includes(q))) return false;
      if (workerState.status === 'normal' && (w.warnings > 0 || w.negotiation)) return false;
      if (workerState.status === 'warn'   && !(w.warnings >= 1 && w.warnings < 3)) return false;
      if (workerState.status === 'neg'    && !w.negotiation) return false;
      if (workerState.status === 'new'    && w.total > 10) return false;
      if (workerState.status === 'noshow' && w.noshow === 0) return false;
      return true;
    });

    // 정렬
    const sorters = {
      recent: (a, b) => b.lastWorked.localeCompare(a.lastWorked),
      name:   (a, b) => a.name.localeCompare(b.name, 'ko'),
      warn:   (a, b) => b.warnings - a.warnings || b.noshow - a.noshow,
      total:  (a, b) => b.total - a.total,
    };
    list = list.sort(sorters[workerState.sort]);

    // 메트릭
    const totalW = workers.length;
    const activeWeek = workers.filter(w => w.lastWorked >= weekAgoStr).length;
    const warnHold = workers.filter(w => w.warnings >= 1 && !w.negotiation).length;
    const negCount = workers.filter(w => w.negotiation).length;

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">근무자 관리</div>
          <div class="jf-subtitle">전체 알바생 · 경고 이력 · 포인트 현황</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('workers')">엑셀</button>
        </div>
      </div>

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">전체 근무자</div><div class="jf-metric-value">${totalW}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">등록된 알바생</div></div>
        <div class="jf-metric"><div class="jf-metric-label">이번 주 활동</div><div class="jf-metric-value">${activeWeek}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">최근 7일 근무</div></div>
        <div class="jf-metric"><div class="jf-metric-label">경고 누적</div><div class="jf-metric-value" style="color:${warnHold>0?'#F59E0B':'#111827'};">${warnHold}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">경고 1~2회 보유</div></div>
        <div class="jf-metric"><div class="jf-metric-label">협의대상</div><div class="jf-metric-value" style="color:${negCount>0?'#EF4444':'#16A34A'};">${negCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">해제는 마스터 전용</div></div>
      </div>

      <div class="jobs-filters">
        <div class="jf-search"><input type="text" placeholder="이름 · 전화번호 검색" value="${workerState.search}" oninput="window.__wrkSearch(this.value)" /></div>
        <select onchange="window.__wrkFilter('status', this.value)">
          <option value="">전체 상태</option>
          <option value="normal" ${workerState.status==='normal'?'selected':''}>정상</option>
          <option value="warn"   ${workerState.status==='warn'?'selected':''}>경고 1~2회</option>
          <option value="neg"    ${workerState.status==='neg'?'selected':''}>협의대상</option>
          <option value="new"    ${workerState.status==='new'?'selected':''}>신규 (10회 미만)</option>
          <option value="noshow" ${workerState.status==='noshow'?'selected':''}>No-show 있음</option>
        </select>
        <select onchange="window.__wrkFilter('sort', this.value)">
          <option value="recent" ${workerState.sort==='recent'?'selected':''}>최근 근무순</option>
          <option value="name"   ${workerState.sort==='name'?'selected':''}>이름순</option>
          <option value="warn"   ${workerState.sort==='warn'?'selected':''}>경고 많은 순</option>
          <option value="total"  ${workerState.sort==='total'?'selected':''}>누적 근무순</option>
        </select>
        ${(workerState.search || workerState.status) ? `<button onclick="window.__wrkClearFilter()" style="font-size:12px;">필터 초기화</button>` : ''}
        <div style="margin-left:auto; font-size:12px; color:#6B7684; align-self:center;">${list.length}명 표시</div>
      </div>
    `;

    if (list.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">👤</div><div class="jf-placeholder-title">조건에 맞는 근무자가 없습니다</div><div class="jf-placeholder-desc">검색어나 필터를 변경해주세요.</div></div>`;
    } else {
      const gridCols = '1.6fr 1.1fr 0.7fr 0.7fr 0.6fr 0.9fr 0.9fr 0.6fr';
      html += `
        <div class="jf-table">
          <div class="jf-table-head" style="grid-template-columns:${gridCols};">
            <div>이름</div>
            <div>전화번호</div>
            <div>누적 근무</div>
            <div>경고</div>
            <div>No-show</div>
            <div>포인트</div>
            <div>최근 근무</div>
            <div></div>
          </div>
      `;
      list.forEach(w => {
        const warnCls = `warn-${Math.min(w.warnings, 3)}`;
        const warnText = w.warnings > 0 ? `${w.warnings}회` : '없음';
        html += `
          <div class="jf-table-row" style="grid-template-columns:${gridCols};" onclick="window.__wrkDetail('${w.id}')">
            <div class="worker-name">
              ${w.name}
              ${w.negotiation ? '<span class="apv-badge apv-badge-neg" style="font-size:10px; padding:2px 6px;">협의대상</span>' : ''}
              ${w.total < 10 ? '<span class="apv-badge" style="background:#DBEAFE; color:#1E40AF; font-size:10px; padding:2px 6px;">신규</span>' : ''}
            </div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px; color:#6B7684;">${w.phone}</div>
            <div><strong>${w.total}</strong><span style="color:#6B7684; font-size:11px;">회</span></div>
            <div><span class="warn-pill ${warnCls}">${warnText}</span></div>
            <div style="color:${w.noshow>0?'#EF4444':'#6B7684'};">${w.noshow}</div>
            <div>${w.points.toLocaleString()}P</div>
            <div style="color:#6B7684; font-size:12px;">${w.lastWorked}</div>
            <div style="text-align:right;"><span style="color:#2563EB; font-size:12px;">상세 →</span></div>
          </div>
        `;
      });
      html += `</div>`;
    }

    main.innerHTML = html;
  }

  function renderWorkerDetail(workerId) {
    const w = findWorker(workerId);
    if (!w) return;

    // 이 근무자의 최근 신청/근무 이력 (샘플 데이터에서 추출)
    const myApps = applications.filter(a => a.workerId === workerId);

    // 경고 이력 — 실제 warnLog (있으면) + 과거 mock 보강
    const warnHistory = [];
    // 실제 부여 기록 (최신순)
    if (w.warnLog && w.warnLog.length > 0) {
      w.warnLog.forEach(log => {
        const siteInfo = log.siteId ? (findSite(log.siteId)?.site.name || '') : '';
        const parts = [log.reason];
        if (siteInfo) parts.push(siteInfo);
        if (log.by) parts.push('관리자: ' + log.by);
        if (log.memo) parts.push('메모: ' + log.memo);
        const title = log.count >= 3 ? `경고 3회 누적 → 협의대상 자동 등록` : `경고 ${log.count}회 부여`;
        warnHistory.push({ date: log.date, type: log.count >= 3 ? 'neg' : 'warn', title, sub: parts.join(' · ') });
      });
    }
    // 과거 mock 보강 (실제 로그보다 적은 만큼만 채움)
    const loggedCount = (w.warnLog || []).length;
    const mockPool = [
      { date: '2026-03-15', type: 'warn', title: '경고 1회 부여', sub: '무단결근 · CJ대한통운 곤지암 MegaHub · 관리자: 김관리' },
      { date: '2026-02-20', type: 'warn', title: '경고 2회 부여', sub: '12시간 이내 취소 · 컨벤션 L타워 · 관리자: 한담당' },
      { date: '2026-01-28', type: 'neg', title: '경고 3회 누적 → 협의대상 자동 등록', sub: '지각 · 롯데택배 진천 MegaHub · 관리자: 박관리' },
    ];
    for (let i = loggedCount; i < w.warnings; i++) {
      if (mockPool[i]) warnHistory.push(mockPool[i]);
    }
    if (warnHistory.length === 0) warnHistory.push({ date: w.joinedAt, type: 'ok', title: '가입', sub: '경고 이력 없음 · 모범 근무자' });

    main.innerHTML = `
      <span class="jf-back" onclick="window.__wrkBack()">← 근무자 목록으로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">${w.name}
            ${w.negotiation ? '<span class="apv-badge apv-badge-neg" style="vertical-align:middle; margin-left:8px;">협의대상</span>' : ''}
          </div>
          <div class="jf-subtitle">${w.phone} · 가입 ${w.joinedAt}</div>
        </div>
        <div class="ws-actions">
          ${w.negotiation
            ? '<button class="btn-primary" onclick="window.__wrkNegRelease(\'' + w.id + '\')">협의대상 해제 (마스터)</button>'
            : '<button onclick="window.__wrkWarnAdd(\'' + w.id + '\')">경고 부여</button>'}
          <button onclick="window.__notifWorker('${w.id}')">알림 발송</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <div class="jf-metric"><div class="jf-metric-label">누적 근무</div><div class="jf-metric-value">${w.total}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 회</span></div></div>
        <div class="jf-metric"><div class="jf-metric-label">경고</div><div class="jf-metric-value" style="color:${w.warnings>0?'#F59E0B':'#111827'};">${w.warnings}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 회</span></div><div class="jf-metric-hint">${w.warnings>=3?'3회 누적 — 협의대상':'3회 누적 시 협의대상'}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">No-show</div><div class="jf-metric-value" style="color:${w.noshow>0?'#EF4444':'#111827'};">${w.noshow}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 회</span></div></div>
        <div class="jf-metric"><div class="jf-metric-label">보유 포인트</div><div class="jf-metric-value">${w.points.toLocaleString()}<span style="font-size:13px; color:#6B7684; font-weight:400;"> P</span></div><div class="jf-metric-hint">${w.points>=30000?'출금 가능':'3만P 이상 출금 가능'}</div></div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="jf-panel">
          <div class="ws-section-title">경고 · 협의대상 이력</div>
          <div class="tl">
            ${warnHistory.map(h => `
              <div class="tl-item ${h.type}">
                <div class="tl-date">${h.date}</div>
                <div class="tl-title">${h.title}</div>
                <div class="tl-sub">${h.sub}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="jf-panel">
          <div class="ws-section-title">최근 신청 이력 <span style="font-size:11px; color:#6B7684; font-weight:400;">최근 ${myApps.length}건</span></div>
          ${myApps.length === 0
            ? '<div style="padding:20px 0; text-align:center; color:#6B7684; font-size:12px;">신청 이력이 없습니다.</div>'
            : myApps.map(a => {
                const j = findJob(a.jobId); const s = findSite(j.siteId);
                const stColor = { pending: '#F59E0B', approved: '#22C55E', rejected: '#EF4444' }[a.status];
                const stLabel = { pending: '대기 중', approved: '승인', rejected: '거절' }[a.status];
                return `
                  <div style="padding: 10px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06); font-size: 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-weight:500; color:#111827;">${s.site.name}</span>
                      <span style="color:${stColor}; font-size:11px; font-weight:500;">● ${stLabel}</span>
                    </div>
                    <div style="color:#6B7684; margin-top:3px;">${j.date} · ${j.slot} ${j.start}~${j.end}</div>
                    <div style="color:#9CA3AF; font-size:11px; margin-top:2px;">신청 ${a.appliedAt}${a.rejectReason ? ' · 거절 사유: ' + a.rejectReason : ''}</div>
                  </div>
                `;
              }).join('')}
        </div>

        <div class="jf-panel" style="grid-column: span 2;">
          <div class="ws-section-title">즐겨찾기 · 선호 근무지</div>
          ${w.favParts.length === 0
            ? '<div style="padding:10px 0; color:#6B7684; font-size:12px;">설정된 즐겨찾기가 없습니다.</div>'
            : '<div style="display:flex; gap:6px; padding: 4px 0;">' + w.favParts.map(k => `<span class="ws-mini-tag">${worksites[k].name}</span>`).join('') + '</div>'
          }
        </div>
      </div>
    `;
  }

  window.__wrkSearch = function(val) { workerState.search = val; renderWorkers(); };
  window.__wrkFilter = function(key, val) { workerState[key] = val; renderWorkers(); };
  window.__wrkClearFilter = function() { workerState.search = ''; workerState.status = ''; renderWorkers(); };
  window.__wrkDetail = function(id) { renderWorkerDetail(id); };
  window.__notifWorker = function(id) {
    const w = findWorker(id); if (!w) return;
    showNotificationModal([{ id: w.id, name: w.name, phone: w.phone, type: 'worker' }]);
  };
  window.__notifAll = function() { showNotificationModal([]); };
  window.__wrkBack = function() { renderWorkers(); };
  // 경고 부여 사유 5종 (관리자 재량 판단)
  const WARN_REASONS = [
    { key: '12h_cancel', label: '12시간 이내 취소', desc: '근무 시작 12시간 이내에 신청을 취소' },
    { key: 'late',       label: '지각',              desc: '출근 시간 이후 도착' },
    { key: 'noshow',     label: '무단결근',          desc: '연락 없이 결근 (No-show)' },
    { key: 'noreply',    label: '무응답',            desc: '근무 관련 연락에 응답 없음' },
    { key: 'gps_fail',   label: 'GPS 미검증',        desc: '근무지 GPS 영역 밖에서 출퇴근 처리' },
  ];

  window.__wrkWarnAdd = function(id) {
    const w = findWorker(id); if (!w) return;
    if (w.negotiation) {
      alert(`${w.name} 님은 이미 협의대상 상태입니다.\n해제는 마스터 권한으로 협의대상 페이지에서 처리하세요.`);
      return;
    }
    showWarnAddModal(w);
  };

  function showWarnAddModal(w) {
    document.querySelectorAll('.jf-modal-overlay.warn-add').forEach(el => el.remove());
    const nextCount = Math.min(w.warnings + 1, 3);
    const willEscalate = nextCount >= 3;

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay warn-add';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 520px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">⚠ ${w.name} 님에게 경고 부여</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div style="font-size:12px; color:#6B7684; margin-bottom:14px;">
            현재 경고 <b style="color:#111827;">${w.warnings}회</b> · 부여 후 <b style="color:${willEscalate?'#EF4444':'#92400E'};">${nextCount}회</b>
            ${willEscalate ? ' · <b style="color:#EF4444;">3회 누적 → 협의대상 자동 등록</b>' : ''}
          </div>
          <div class="ws-section-title" style="margin-bottom:10px;">경고 사유 선택 <span style="font-size:11px; color:#EF4444; font-weight:400;">* 필수</span></div>
          <div class="warn-reason-list">
            ${WARN_REASONS.map(r => `
              <label class="warn-reason-item">
                <input type="radio" name="warnReason" value="${r.label}">
                <div>
                  <div class="warn-reason-title">${r.label}</div>
                  <div class="warn-reason-sub">${r.desc}</div>
                </div>
              </label>
            `).join('')}
          </div>
          <div class="jf-form-row top" style="padding-top:14px;">
            <div class="jf-form-label">관련 근무지</div>
            <select id="warnSiteId" style="max-width:260px;">
              <option value="">선택 안 함</option>
              ${Object.keys(worksites).flatMap(pk => worksites[pk].sites.map(s => `<option value="${s.id}">${worksites[pk].name} · ${s.name}</option>`)).join('')}
            </select>
          </div>
          <div class="jf-form-row top">
            <div class="jf-form-label">메모 <span style="font-size:11px; color:#6B7684; font-weight:400;">(선택)</span></div>
            <input type="text" id="warnMemo" placeholder="구체적 상황 (예: 출근 20분 지각)" />
          </div>
          ${willEscalate ? '<div class="warn-reason-warn">경고 부여 시 즉시 협의대상으로 자동 등록되며, 해제는 <b>마스터 전용</b>입니다.</div>' : ''}
          <div style="display:flex; gap:8px; margin-top: 20px; padding-top:14px; border-top: 0.5px solid rgba(0,0,0,0.08);">
            <button onclick="this.closest('.jf-modal-overlay').remove()">취소</button>
            <div style="flex:1;"></div>
            <button class="btn-primary" onclick="window.__wrkWarnConfirm('${w.id}')">경고 부여</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  window.__wrkWarnConfirm = function(id) {
    const w = findWorker(id); if (!w) return;
    const picked = document.querySelector('input[name="warnReason"]:checked');
    if (!picked) { alert('경고 사유를 선택하세요.'); return; }
    const reason = picked.value;
    const siteId = document.getElementById('warnSiteId')?.value || '';
    const memo = (document.getElementById('warnMemo')?.value || '').trim();

    const result = addWorkerWarning(id, reason, siteId, memo, '마스터(테스트)');
    document.querySelector('.jf-modal-overlay.warn-add')?.remove();

    if (result?.escalated) {
      alert(`⚠ 경고 ${POLICY.WARN_LIMIT}회 누적 — ${w.name} 님이 협의대상으로 자동 등록되었습니다.\n사유: ${reason}\n해제는 마스터 권한이 필요합니다.`);
    } else {
      alert(`${w.name} 님에게 경고 ${w.warnings}회가 부여되었습니다.\n사유: ${reason}`);
    }
    renderWorkerDetail(id);
  };
  window.__wrkNegRelease = function(id) {
    const w = findWorker(id); if (!w) return;
    if (!confirm(`${w.name} 님의 협의대상 상태를 해제합니다. (마스터 전용)\n경고 카운트도 초기화됩니다. 계속하시겠습니까?`)) return;
    releaseNegotiation(id);
    alert(`${w.name} 님의 협의대상 해제 및 경고 초기화 완료.`);
    renderWorkerDetail(id);
  };

  // ───────────────────────────────────────────────────────
  // 신청 승인 페이지
  // ───────────────────────────────────────────────────────
  const apvState = {
    partnerKey: '',
    siteId: '',
    reason: '',    // '' / urgent / warn3 / neg
  };

  function updateApprovalBadge() {
    const pending = applications.filter(a => a.status === 'pending').length;
    const navItem = document.querySelector('.jf-nav-item[data-page="approval"]');
    if (!navItem) return;
    const existing = navItem.querySelector('span[data-role="badge"]');
    if (pending > 0) {
      if (existing) {
        existing.textContent = pending;
      } else {
        const sp = document.createElement('span');
        sp.setAttribute('data-role', 'badge');
        sp.style.cssText = 'margin-left:auto; background:#EF4444; color:#fff; font-size:10px; padding:1px 6px; border-radius:8px;';
        sp.textContent = pending;
        navItem.appendChild(sp);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  function updateWaitlistBadge() {
    const pending = waitlist.filter(w => w.status === 'pending_accept').length;
    const navItem = document.querySelector('.jf-nav-item[data-page="waitlistapv"]');
    if (!navItem) return;
    const existing = navItem.querySelector('span[data-role="wl-badge"]');
    if (pending > 0) {
      if (existing) existing.textContent = pending;
      else {
        const sp = document.createElement('span');
        sp.setAttribute('data-role', 'wl-badge');
        sp.style.cssText = 'margin-left:auto; background:#F59E0B; color:#fff; font-size:10px; padding:1px 6px; border-radius:8px;';
        sp.textContent = pending;
        navItem.appendChild(sp);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  function updateGpsBadge() {
    const pending = gpsRequests.filter(g => g.status === 'pending').length;
    const navItem = document.querySelector('.jf-nav-item[data-page="gpsapproval"]');
    if (!navItem) return;
    const existing = navItem.querySelector('span[data-role="gps-badge"]');
    if (pending > 0) {
      if (existing) existing.textContent = pending;
      else {
        const sp = document.createElement('span');
        sp.setAttribute('data-role', 'gps-badge');
        sp.style.cssText = 'margin-left:auto; background:#8B5CF6; color:#fff; font-size:10px; padding:1px 6px; border-radius:8px;';
        sp.textContent = pending;
        navItem.appendChild(sp);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  // 퇴근 승인 (GPS 미검증) 전용 페이지
  function renderGpsApproval() {
    const pending = pendingGpsReqs();
    const processed = processedGpsReqs();
    const approvedToday = processed.filter(g => g.status === 'approved' && (g.reviewedAt || '').startsWith(TODAY)).length;
    const deniedToday = processed.filter(g => g.status === 'denied' && (g.reviewedAt || '').startsWith(TODAY)).length;

    // 거리 분포
    const nearCount = pending.filter(g => g.distance <= 100).length;
    const midCount = pending.filter(g => g.distance > 100 && g.distance <= 300).length;
    const farCount = pending.filter(g => g.distance > 300).length;

    // 자동 퇴근 미처리 배너 (관제에서 이전)
    const bs = ctrlBannerSummary();
    let autoBannerHtml = '';
    if (bs.pendingJobs.length > 0) {
      const critical = bs.criticalCount > 0;
      const earliest = bs.pendingJobs
        .filter(p => p.summary.remain !== undefined)
        .sort((a, b) => a.summary.remain - b.summary.remain)[0];
      const earliestLabel = earliest
        ? `가장 임박: <strong>${findSite(earliest.job.siteId).site.name}</strong> (${earliest.summary.label})`
        : '';
      autoBannerHtml = `
        <div class="auto-ck-banner ${critical ? 'critical' : 'alert'}">
          <div class="auto-ck-icon">${critical ? '🚨' : '🔔'}</div>
          <div class="auto-ck-text">
            <strong>${bs.pendingJobs.length}개 공고</strong>에 퇴근 미처리자가 있습니다${critical ? ' · 1시간 이내 자동 처리 예정' : ''}.
            <div class="auto-ck-meta">${earliestLabel}</div>
          </div>
          <div class="auto-ck-next">5분 단위 자동 확인</div>
        </div>
      `;
    } else if (bs.settledJobs > 0) {
      autoBannerHtml = `
        <div class="auto-ck-banner info">
          <div class="auto-ck-icon">✓</div>
          <div class="auto-ck-text">오늘 퇴근 미처리는 없음. 종료+6h 경과 공고 ${bs.settledJobs}건은 자동 처리되었습니다.</div>
        </div>
      `;
    }

    // 퇴근 미처리 공고별 요약 (상세는 공고 관리 → 공고 상세)
    const autoListHtml = bs.pendingJobs.length > 0 ? `
      <div class="jf-panel" style="margin-bottom: 14px; padding: 14px 16px; border-left: 3px solid #F97316;">
        <div class="ws-section-title">
          <span>⏱ 자동 퇴근 대기 공고 <span style="font-size:11px; color:#6B7684; font-weight:400;">종료+6h 경과 시 자동 퇴근 처리</span></span>
        </div>
        ${bs.pendingJobs.map(({ job: j, summary: s }) => {
          const site = findSite(j.siteId);
          const cls = s.state === 'critical' ? 'critical' : 'pending';
          return `
            <div style="display:grid; grid-template-columns: 1.5fr 1fr 1.2fr auto; gap:12px; padding:10px 0; border-bottom:0.5px solid rgba(0,0,0,0.06); align-items:center; font-size:13px;">
              <div>
                <div style="font-weight:500; color:#111827;">${site.site.name}</div>
                <div style="font-size:11px; color:#6B7684; margin-top:2px;">${site.partner} · ${j.slot} ${j.start}~${j.end}</div>
              </div>
              <div style="color:#991B1B; font-weight:500;">퇴근 미처리 ${s.pending}명</div>
              <div><span class="ctrl-roster-auto ${cls}">${s.state === 'critical' ? '🚨' : '⏱'} ${s.label.replace(/.*자동 /, '자동 ')}</span></div>
              <div><button onclick="window.__gotoJobDetail('${j.id}')" style="font-size:11px; padding:5px 10px; height:auto;">공고 상세 →</button></div>
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    // 시뮬 시각 + 시계
    const simTimeVal = ctrlState.simTime || '';
    const d = new Date();
    const liveClock = TODAY + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');

    main.innerHTML = `
      <div class="jf-header">
        <div>
          <div class="jf-title">퇴근 승인 <span style="font-size:12px; color:#6B7684; font-weight:400;">(GPS 미검증 + 자동 퇴근 대기)</span></div>
          <div class="jf-subtitle">GPS 영역 밖 퇴근 요청 · 퇴근 미처리 자동 처리(종료+6h) · 시뮬 시각 ${ctrlSimNowStr()}</div>
        </div>
        <div class="ctrl-header-tools">
          <span id="ctrl-clock" class="ctrl-clock">${liveClock}</span>
          <div class="ctrl-sim-group">
            <span style="font-size:11px; color:#6B7684;">시뮬 시각</span>
            <input type="time" step="60" value="${simTimeVal}" onchange="window.__ctrlSimSet(this.value)">
            <button onclick="window.__ctrlSimReset()" style="height:28px; padding:0 8px; font-size:11px;">실시간</button>
          </div>
          <button onclick="window.__ctrlGpsHistory()">처리 이력 (${processed.length}건)</button>
        </div>
      </div>

      ${autoBannerHtml}

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">GPS 대기</div><div class="jf-metric-value" style="color:${pending.length>0?'#8B5CF6':'#111827'};">${pending.length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">${pending.length>0?'즉시 검토 필요':'모두 처리됨'}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">자동 퇴근 대기</div><div class="jf-metric-value" style="color:${bs.pendingJobs.length>0?'#F97316':'#111827'};">${bs.pendingJobs.length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">종료+6h 경과 전</div></div>
        <div class="jf-metric"><div class="jf-metric-label">오늘 승인</div><div class="jf-metric-value" style="color:#22C55E;">${approvedToday}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">포인트 지급 완료</div></div>
        <div class="jf-metric"><div class="jf-metric-label">오늘 반려</div><div class="jf-metric-value" style="color:#EF4444;">${deniedToday}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">포인트 미지급</div></div>
      </div>

      ${autoListHtml}

      ${pending.length > 0 ? `
        <div class="jf-panel" style="padding: 12px 14px; margin-bottom: 14px; border-left: 3px solid #8B5CF6; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
          <div style="color:#374151;">📍 GPS 대기 거리 분포 — <strong style="color:#166534;">근접 ${nearCount}건</strong> · <strong style="color:#92400E;">중간 ${midCount}건</strong> · <strong style="color:#991B1B;">과도 ${farCount}건</strong></div>
          <div style="font-size:11px; color:#6B7684;">승인 시 시간대별 포인트 자동 지급 · 반려 시 포인트 미지급</div>
        </div>
      ` : ''}

      ${pending.length === 0
        ? '<div class="jf-placeholder"><div class="jf-placeholder-icon">🛰</div><div class="jf-placeholder-title">대기 중인 퇴근 승인 요청이 없습니다</div><div class="jf-placeholder-desc">GPS 영역 밖 퇴근 요청이 들어오면 여기에 표시됩니다.</div></div>'
        : renderGpsPanelHtml(pending)}
    `;

    updateGpsBadge();
    ctrlStartTimers(renderGpsApproval);
  }

  // N19 — 신청 대기 시간 계산 (대기 6시간 초과 시 경고)
  // simulated now = TODAY + 실제 wall-clock 시·분
  // 신청 승인 6h 초과 — POLICY.APPROVAL_LIMIT_MIN 참조
  const APV_DWELL_LIMIT_MIN = POLICY.APPROVAL_LIMIT_MIN;
  function appDwell(a) {
    const parts = (a.appliedAt || '').split(' ');
    if (parts.length < 2) return { totalMin: 0, over: false, h: 0, m: 0, futureData: true };
    const [d, t] = parts;
    const appliedMs = new Date(d + 'T' + t + ':00').getTime();
    const now = new Date();
    const [ty, tm, td] = TODAY.split('-').map(Number);
    const nowMs = new Date(ty, tm - 1, td, now.getHours(), now.getMinutes()).getTime();
    const totalMin = Math.floor((nowMs - appliedMs) / 60000);
    if (totalMin < 0) return { totalMin: 0, over: false, h: 0, m: 0, futureData: true };
    return { totalMin, over: totalMin > APV_DWELL_LIMIT_MIN, h: Math.floor(totalMin / 60), m: totalMin % 60, futureData: false };
  }

  function renderApproval() {
    const pending = applications.filter(a => a.status === 'pending');
    const today = TODAY;
    const processedToday = applications.filter(a =>
      a.status !== 'pending' && a.processedAt && a.processedAt.startsWith(today)
    ).length;
    const urgentCount = pending.filter(a => a.reason === 'urgent').length;
    const negCount = pending.filter(a => a.reason === 'neg').length;
    const warnCount = pending.filter(a => a.reason === 'warn3').length;
    const overLimitCount = pending.filter(a => appDwell(a).over).length;  // N19 6h 초과

    // 파트너사/근무지 옵션 (공고의 siteId 기준)
    const partnerOpts = Object.keys(worksites).map(k =>
      `<option value="${k}" ${apvState.partnerKey === k ? 'selected' : ''}>${worksites[k].name}</option>`).join('');
    const siteOpts = (() => {
      const sites = apvState.partnerKey
        ? worksites[apvState.partnerKey].sites
        : Object.values(worksites).flatMap(p => p.sites);
      return sites.map(s => `<option value="${s.id}" ${apvState.siteId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    })();

    // 필터 적용
    const filtered = pending.filter(a => {
      if (apvState.reason === 'overlimit') {
        if (!appDwell(a).over) return false;
      } else if (apvState.reason && apvState.reason !== a.reason) {
        return false;
      }
      const j = findJob(a.jobId); if (!j) return false;
      const site = findSite(j.siteId); if (!site) return false;
      if (apvState.partnerKey && apvState.partnerKey !== site.partnerKey) return false;
      if (apvState.siteId && apvState.siteId !== j.siteId) return false;
      return true;
    });

    // 우선순위 정렬: 6h 초과 > 협의대상 > 경고3회 > 12h이내, 동순위는 신청시간 오래된 것 우선
    const reasonPriority = { neg: 1, warn3: 2, urgent: 3, normal: 4 };
    const sorted = [...filtered].sort((a, b) => {
      const aOver = appDwell(a).over ? 0 : 5;
      const bOver = appDwell(b).over ? 0 : 5;
      return (aOver + (reasonPriority[a.reason] ?? 9)) - (bOver + (reasonPriority[b.reason] ?? 9))
        || a.appliedAt.localeCompare(b.appliedAt);
    });

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">신청 승인</div>
          <div class="jf-subtitle">대기 중인 알바생 신청을 검토하고 승인/거절합니다</div>
        </div>
        <div class="ws-actions">
          <button onclick="renderHistory('approval','approval')">처리 이력</button>
        </div>
      </div>

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">대기 중</div><div class="jf-metric-value" style="color:${pending.length>0?'#EF4444':'#111827'};">${pending.length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">${pending.length>0?'승인 대기 최대 6시간':'모두 처리됨'}</div></div>
        <div class="jf-metric" ${overLimitCount>0?'style="cursor:pointer; background:#FEF2F2;" onclick="window.__apvFilter(\'reason\',\'overlimit\')" title="클릭 시 6h 초과만 필터"':''}><div class="jf-metric-label">⚠ 6h 초과</div><div class="jf-metric-value" style="color:${overLimitCount>0?'#EF4444':'#111827'};">${overLimitCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">${overLimitCount>0?'N19 이월 — 즉시 검토 필요':'정상 운영'}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">협의대상 / 경고3회</div><div class="jf-metric-value" style="color:#EF4444;">${negCount + warnCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">협의대상 ${negCount} · 경고 ${warnCount}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">오늘 처리 완료</div><div class="jf-metric-value">${processedToday}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">12h 이내 ${urgentCount}건 · 승인+거절 합계</div></div>
      </div>

      ${overLimitCount > 0
        ? `<div class="ws-warn-box" style="background:#FEE2E2; color:#991B1B; border-left-color:#EF4444;">🚨 <b>6시간 초과 신청 ${overLimitCount}건</b> — 처리 방침은 <b>N19 이월 안건</b>으로 사장님 결정 대기 중입니다. 잠정적으로 1등급/마스터가 직접 검토해주세요.</div>`
        : pending.length > 0 && pending.some(a => a.reason === 'neg' || a.reason === 'warn3')
          ? `<div class="ws-warn-box">⚠ 협의대상 또는 경고 3회 이상 누적 알바생의 신청이 있습니다. 마스터/관리자가 직접 검토해주세요.</div>`
          : ''}

      <div class="jobs-filters">
        <select onchange="window.__apvFilter('partnerKey', this.value)">
          <option value="">전체 파트너사</option>${partnerOpts}
        </select>
        <select onchange="window.__apvFilter('siteId', this.value)">
          <option value="">전체 근무지</option>${siteOpts}
        </select>
        <select onchange="window.__apvFilter('reason', this.value)">
          <option value="">전체 사유</option>
          <option value="overlimit" ${apvState.reason==='overlimit'?'selected':''}>⚠ 6시간 초과 (N19)</option>
          <option value="neg"       ${apvState.reason==='neg'?'selected':''}>협의대상</option>
          <option value="warn3"     ${apvState.reason==='warn3'?'selected':''}>경고 3회 이상</option>
          <option value="urgent"    ${apvState.reason==='urgent'?'selected':''}>12시간 이내</option>
        </select>
        ${(apvState.partnerKey||apvState.siteId||apvState.reason) ? `<button onclick="window.__apvClearFilter()" style="font-size:12px;">필터 초기화</button>` : ''}
      </div>
    `;

    if (sorted.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">✅</div><div class="jf-placeholder-title">${pending.length === 0 ? '대기 중인 신청이 없습니다' : '조건에 맞는 신청이 없습니다'}</div><div class="jf-placeholder-desc">${pending.length === 0 ? '자동 승인 대상이 아닌 신청만 여기에 표시됩니다.' : '필터를 변경해보세요.'}</div></div>`;
    } else {
      html += `<div class="apv-list">`;
      sorted.forEach(a => {
        const w = findWorker(a.workerId);
        const j = findJob(a.jobId);
        const site = findSite(j.siteId);
        const cardCls = a.reason === 'neg' ? 'neg' : (a.reason === 'urgent' || a.reason === 'warn3') ? 'urgent' : '';

        const badges = [];
        if (a.reason === 'neg')    badges.push('<span class="apv-badge apv-badge-neg">협의대상</span>');
        if (a.reason === 'warn3')  badges.push('<span class="apv-badge apv-badge-warn">경고 3회 이상</span>');
        if (a.reason === 'urgent') badges.push('<span class="apv-badge apv-badge-urgent">12h 이내</span>');

        const noshow = w.noshow > 0 ? `<span style="color:#EF4444;">No-show ${w.noshow}</span>` : '<span>No-show 0</span>';
        const warnStat = w.warnings > 0 ? `<span style="color:#EF4444;">경고 <strong>${w.warnings}</strong></span>` : `<span>경고 <strong>0</strong></span>`;

        // N19 — 신청 대기 시간 배지 (6h 초과 시 빨간 에스컬레이션)
        const dwell = appDwell(a);
        const dwellHtml = dwell.futureData
          ? '<span class="apv-dwell">대기 0m</span>'
          : `<span class="apv-dwell ${dwell.over ? 'over' : dwell.totalMin > 4*60 ? 'warn' : ''}">
              ${dwell.over ? '⚠' : '⏱'} 대기 ${dwell.h}h ${dwell.m}m
            </span>`;
        const overClass = dwell.over ? ' over-limit' : '';

        if (dwell.over) badges.push('<span class="apv-badge apv-badge-warn">⚠ 6h 초과</span>');

        html += `
          <div class="apv-card ${cardCls}${overClass}">
            <div class="apv-worker">
              <div class="apv-worker-name">
                ${w.name}
                ${w.negotiation ? '<span class="apv-badge apv-badge-neg" style="font-size:10px; padding:2px 6px;">협의대상</span>' : ''}
              </div>
              <div class="apv-worker-phone">${w.phone}</div>
              <div class="apv-worker-stat">누적 근무 <strong>${w.total}</strong>회 · ${warnStat} · ${noshow}</div>
            </div>
            <div class="apv-job">
              <div class="apv-job-title">${site.site.name} <span class="ws-mini-tag" style="font-size:10px;">${site.partner}</span></div>
              <div class="apv-job-sub">${j.date} · ${j.slot} ${j.start}~${j.end}</div>
              <div class="apv-job-sub">${j.wageType} ${j.wage.toLocaleString()}원 · 모집 ${j.apply}/${j.cap}</div>
              <div class="apv-job-sub">신청 ${a.appliedAt} ${dwellHtml}</div>
              ${dwell.over ? `
                <div style="margin-top:6px; padding:6px 10px; background:#FEE2E2; color:#991B1B; border-radius:6px; font-size:11px; font-weight:500;">
                  ⚠ 6시간 초과 — 처리 방침 <b>미확정 (N19 이월)</b> · 1등급/마스터 검토 필요
                </div>` : ''}
            </div>
            <div class="apv-badges">${badges.join('')}</div>
            <div class="apv-actions">
              <button class="btn-reject" onclick="window.__apvReject('${a.id}')">거절</button>
              <button class="btn-approve" onclick="window.__apvApprove('${a.id}')">승인</button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    main.innerHTML = html;
  }

  window.__apvFilter = function(key, val) {
    apvState[key] = val;
    if (key === 'partnerKey') apvState.siteId = '';
    renderApproval();
  };
  window.__apvClearFilter = function() {
    apvState.partnerKey = ''; apvState.siteId = ''; apvState.reason = '';
    renderApproval();
  };
  window.__apvApprove = function(appId) {
    const a = findApp(appId); if (!a) return;
    const w = findWorker(a.workerId);
    const j = findJob(a.jobId);
    const site = findSite(j.siteId);
    if (!confirm(`${w.name} (${w.phone}) 님의 신청을 승인하시겠습니까?\n\n근무지: ${site.site.name}\n일시: ${j.date} ${j.slot} ${j.start}~${j.end}`)) return;
    a.status = 'approved';
    a.processedAt = TODAY + ' ' + new Date().toTimeString().slice(0,5);
    a.processedBy = '테스트(마스터)';
    j.apply = Math.min(j.apply + 1, j.cap); // 공고 모집인원 업데이트
    logAudit({
      category: 'application', action: 'approve',
      target: w.name + ' / ' + site.site.name + ' ' + j.date + ' ' + j.slot,
      targetId: appId,
      summary: a.reason ? '플래그: ' + a.reason : '정상 승인',
    });
    updateApprovalBadge();
    renderApproval();
  };
  window.__apvReject = function(appId) {
    const a = findApp(appId); if (!a) return;
    const w = findWorker(a.workerId); const j = findJob(a.jobId);
    const site = j ? findSite(j.siteId) : null;
    promptModal({
      title: '신청 거절',
      subtitle: `<strong>${esc(w.name)}</strong> · ${site ? esc(site.site.name) : ''} ${j ? j.date+' '+j.slot : ''}`,
      fields: [{ key: 'reason', label: '거절 사유', type: 'textarea', required: true, placeholder: '알바생에게 알림으로 발송됩니다', hint: '예: 협의대상 이력 / 주 4일 초과 / 시간대 중복 등' }],
      submitLabel: '거절',
      danger: true,
      onSubmit: (vals) => {
        a.status = 'rejected';
        a.processedAt = nowStamp();
        a.processedBy = '테스트(마스터)';
        a.rejectReason = vals.reason;
        logAudit({
          category: 'application', action: 'reject',
          target: w.name + (site ? ' / ' + site.site.name + ' ' + j.date + ' ' + j.slot : ''),
          targetId: appId,
          summary: '사유: ' + vals.reason,
        });
        updateApprovalBadge();
        renderApproval();
      },
    });
  };

  // ───────────────────────────────────────────────────────
  // 공고 관리 페이지
  // ───────────────────────────────────────────────────────
  const jobsState = {
    tab: 'list',           // list / create / template
    partnerKey: '',        // 파트너사 필터
    siteId: '',            // 근무지 필터
    status: '',            // 상태 필터
    slot: '',              // 시간대 필터
    selectedDate: '',      // '' = 전체, 'YYYY-MM-DD' = 해당 날짜만
    calYear: 2026,
    calMonth: 4,           // 1~12
  };

  function jobsTabsHtml() {
    const tabs = [
      { id: 'list',     label: '공고 리스트' },
      { id: 'create',   label: '공고 등록' },
      { id: 'template', label: '템플릿 관리' },
    ];
    return `<div class="jf-tabs">${tabs.map(t =>
      `<div class="jf-tab ${jobsState.tab === t.id ? 'active' : ''}" onclick="window.__jobsTab('${t.id}')">${t.label}</div>`
    ).join('')}</div>`;
  }

  function renderJobs() {
    if (jobsState.tab === 'list')     renderJobsList();
    if (jobsState.tab === 'create')   renderJobsCreate();
    if (jobsState.tab === 'waitlist') { jobsState.tab = 'list'; renderJobsList(); } // 하위 호환
    if (jobsState.tab === 'template') renderJobsTemplate();
  }

  // 대기열 승인 — 독립 페이지 (renderJobsWaitlist 재사용)
  function renderWaitlistApv() { renderJobsWaitlist(); }

  function renderJobsList() {
    // 캘린더용 — 날짜 외 모든 필터 적용 (캘린더는 선택 가능한 모든 날짜 표시)
    const filteredForCal = jobs.filter(j => {
      const st = jobStatus(j);
      if (jobsState.status && jobsState.status !== st) return false;
      if (jobsState.slot && jobsState.slot !== j.slot) return false;
      const site = findSite(j.siteId);
      if (!site) return false;
      if (jobsState.partnerKey && jobsState.partnerKey !== site.partnerKey) return false;
      if (jobsState.siteId && jobsState.siteId !== j.siteId) return false;
      return true;
    });

    // 리스트용 — 캘린더 필터 + 선택 날짜
    const filtered = jobsState.selectedDate
      ? filteredForCal.filter(j => j.date === jobsState.selectedDate)
      : filteredForCal;

    // 메트릭 (전체 공고 기준)
    const total = jobs.length;
    const progress = jobs.filter(j => jobStatus(j) === 'progress').length;
    const open = jobs.filter(j => jobStatus(j) === 'open').length;
    const closed = jobs.filter(j => jobStatus(j) === 'closed').length;
    // 이번 주 등록: 간단히 지난 7일 내에 '생성됨'이라 가정 (샘플 데이터에는 생성일 없으므로 최근 날짜 공고 수로 대체)
    const thisWeek = jobs.filter(j => {
      const d = new Date(j.date); const today = new Date(TODAY);
      const diff = (today - d) / 86400000;
      return diff >= -7 && diff <= 7;
    }).length;

    // 파트너사/근무지 옵션
    const partnerOpts = Object.keys(worksites).map(k =>
      `<option value="${k}" ${jobsState.partnerKey === k ? 'selected' : ''}>${worksites[k].name}</option>`).join('');
    const siteOpts = (() => {
      const sites = jobsState.partnerKey
        ? worksites[jobsState.partnerKey].sites
        : Object.values(worksites).flatMap(p => p.sites);
      return sites.map(s => `<option value="${s.id}" ${jobsState.siteId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    })();

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">공고 관리</div>
          <div class="jf-subtitle">파트너사 · 근무지 기준 공고 등록 및 관리</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('jobs')">엑셀</button>
          <button class="btn-primary" onclick="window.__jobsTab('create')">+ 새 공고 등록</button>
        </div>
      </div>

      ${jobsTabsHtml()}

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">진행 중</div><div class="jf-metric-value">${progress}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">오늘 근무 중인 공고</div></div>
        <div class="jf-metric"><div class="jf-metric-label">모집 중</div><div class="jf-metric-value" style="color:#2563EB;">${open}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">신청 받는 중</div></div>
        <div class="jf-metric"><div class="jf-metric-label">마감</div><div class="jf-metric-value" style="color:#92400E;">${closed}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">모집 완료 · 시작 전</div></div>
        <div class="jf-metric"><div class="jf-metric-label">이번 주 공고</div><div class="jf-metric-value">${thisWeek}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">최근 ±7일 기준</div></div>
      </div>

      <div class="jobs-filters">
        <select onchange="window.__jobsFilter('partnerKey', this.value)">
          <option value="">전체 파트너사</option>${partnerOpts}
        </select>
        <select onchange="window.__jobsFilter('siteId', this.value)">
          <option value="">전체 근무지</option>${siteOpts}
        </select>
        <select onchange="window.__jobsFilter('status', this.value)">
          <option value="">전체 상태</option>
          <option value="progress" ${jobsState.status==='progress'?'selected':''}>진행중</option>
          <option value="open"     ${jobsState.status==='open'?'selected':''}>모집중</option>
          <option value="closed"   ${jobsState.status==='closed'?'selected':''}>마감</option>
          <option value="done"     ${jobsState.status==='done'?'selected':''}>종료</option>
        </select>
        <select onchange="window.__jobsFilter('slot', this.value)">
          <option value="">전체 시간대</option>
          <option value="주간" ${jobsState.slot==='주간'?'selected':''}>주간</option>
          <option value="야간" ${jobsState.slot==='야간'?'selected':''}>야간</option>
          <option value="새벽" ${jobsState.slot==='새벽'?'selected':''}>새벽</option>
          <option value="웨딩" ${jobsState.slot==='웨딩'?'selected':''}>웨딩</option>
        </select>
        ${(jobsState.partnerKey||jobsState.siteId||jobsState.status||jobsState.slot) ? `<button onclick="window.__jobsClearFilter()" style="font-size:12px;">필터 초기화</button>` : ''}
      </div>
    `;

    // 좌:캘린더 + 우:리스트 분할 레이아웃
    html += `<div class="jobs-split">
      <div class="jobs-cal-side">${renderJobsCalendar(filteredForCal)}</div>
      <div class="jobs-list-side">${renderJobsListSection(filtered)}</div>
    </div>`;

    main.innerHTML = html;
  }

  function renderJobsListSection(filtered) {
    const sel = jobsState.selectedDate;
    let head = '';
    if (sel) {
      const d = new Date(sel);
      const dowKor = ['일','월','화','수','목','금','토'][d.getDay()];
      const isToday = sel === TODAY;
      head = `
        <div class="jobs-list-head">
          <div class="jobs-list-head-title">
            <span style="color:#6B7684;">선택된 날짜:</span>
            <span class="jobs-date-chip">
              📅 ${sel.slice(5)} (${dowKor}) ${isToday ? '· 오늘' : ''}
              <button onclick="window.__jobsClearDate()" title="전체 보기">✕</button>
            </span>
            <span style="color:#6B7684; font-size:12px;">${filtered.length}건</span>
          </div>
          <button onclick="window.__jobsClearDate()" style="font-size:12px;">전체 날짜 보기</button>
        </div>
      `;
    } else {
      head = `
        <div class="jobs-list-head">
          <div class="jobs-list-head-title">
            <span>📋 전체 공고</span>
            <span style="color:#6B7684; font-size:12px;">${filtered.length}건</span>
          </div>
          <span style="font-size:11px; color:#6B7684;">← 캘린더에서 날짜를 클릭하면 해당 일자만 표시</span>
        </div>
      `;
    }

    if (filtered.length === 0) {
      return head + `<div class="jf-placeholder"><div class="jf-placeholder-icon">📋</div><div class="jf-placeholder-title">조건에 맞는 공고가 없습니다</div><div class="jf-placeholder-desc">${sel ? '다른 날짜를 선택하거나 ' : ''}필터를 변경하거나 새 공고를 등록해주세요.</div></div>`;
    }

    // 날짜 오름차순, 같은 날짜는 시간대 순서
    const slotOrder = { 새벽: 0, 주간: 1, 야간: 2, 웨딩: 3 };
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date) || (slotOrder[a.slot]||9) - (slotOrder[b.slot]||9));
    let body = `<div class="jobs-grid">`;
    sorted.forEach(j => {
      const site = findSite(j.siteId);
      const st = jobStatus(j);
      const pct = Math.round((j.apply / j.cap) * 100);
      const wlCount = currentWaitCount(j.id);
      const wlPending = waitlist.filter(w => w.jobId === j.id && w.status === 'pending_accept').length;
      body += `
        <div class="jobs-card" onclick="window.__jobsDetail('${j.id}')">
          <div class="jobs-card-head">
            <div>
              <div class="jobs-card-title">${site.site.name}</div>
              <div class="jobs-card-sub">${site.partner} · ${j.slot} ${j.start}~${j.end}</div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
              <span class="jobs-status jobs-status-${st}">${STATUS_LABEL[st]}</span>
              ${j.reopened ? '<span class="wl-reopened" style="font-size:10px; padding:2px 6px;">REOPENED</span>' : ''}
              ${wlPending > 0 ? `<span class="wl-badge wl-badge-pending">수락 대기 ${wlPending}</span>` : (wlCount > 0 ? `<span class="wl-badge">대기 ${wlCount}</span>` : '')}
            </div>
          </div>
          <div class="jobs-card-row"><span>날짜</span><strong>${j.date}</strong></div>
          <div class="jobs-card-row"><span>${j.wageType}</span><strong>${j.wage.toLocaleString()}원</strong></div>
          <div class="jobs-card-row"><span>담당자</span><strong>${j.contact}</strong></div>
          <div class="jobs-progress-bar"><div class="jobs-progress-bar-fill" style="width:${pct}%;"></div></div>
          <div class="jobs-progress-label"><span>모집 ${j.apply} / ${j.cap}명${wlCount > 0 ? ` · 대기 ${wlCount}/${maxWaitCap(j)}` : ''}</span><span>${pct}%</span></div>
          <div class="jobs-card-foot" onclick="event.stopPropagation()">
            <button onclick="window.__jobsDetail('${j.id}')">신청자</button>
            <button onclick="window.__jobsDuplicate('${j.id}')" title="이 공고를 복제">📋 복제</button>
            <button onclick="window.__jobEdit('${j.id}')">수정</button>
          </div>
        </div>
      `;
    });
    body += `</div>`;
    return head + body;
  }

  function renderJobsCalendar(filtered) {
    const y = jobsState.calYear, m = jobsState.calMonth;
    const first = new Date(y, m - 1, 1);
    const firstDow = first.getDay(); // 0=일
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    // 날짜별 공고 집계
    const byDate = {};
    filtered.forEach(j => {
      if (!byDate[j.date]) byDate[j.date] = [];
      byDate[j.date].push(j);
    });

    const dows = ['일','월','화','수','목','금','토'];
    const dowHtml = dows.map((d, i) => `<div class="jobs-cal-dow" style="color:${i===0?'#EF4444':i===6?'#2563EB':'#6B7684'};">${d}</div>`).join('');

    let daysHtml = '';
    cells.forEach((d, idx) => {
      if (d === null) {
        daysHtml += `<div class="jobs-cal-day empty"></div>`;
        return;
      }
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayJobs = byDate[dateStr] || [];
      const isToday = dateStr === TODAY;
      const isSelected = jobsState.selectedDate === dateStr;
      const dow = idx % 7;
      const numClass = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';
      const statusColors = { open:'#2563EB', progress:'#22C55E', closed:'#F59E0B', done:'#9CA3AF' };
      const dots = dayJobs.slice(0, 6).map(j =>
        `<span class="jobs-cal-day-dot" style="background:${statusColors[jobStatus(j)]};"></span>`).join('');
      daysHtml += `
        <div class="jobs-cal-day ${dayJobs.length > 0 ? 'has-jobs' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
             onclick="window.__jobsCalDay('${dateStr}')">
          <div class="jobs-cal-day-num ${numClass}">${d}</div>
          ${dots ? `<div class="jobs-cal-day-dots">${dots}</div>` : ''}
          ${dayJobs.length > 0 ? `<div class="jobs-cal-day-count">${dayJobs.length}건</div>` : ''}
        </div>
      `;
    });

    return `
      <div class="jobs-cal">
        <div class="jobs-cal-head">
          <div class="jobs-cal-month">${y}년 ${m}월</div>
          <div class="jobs-cal-nav">
            <button onclick="window.__jobsCalMove(-1)">‹</button>
            <button onclick="window.__jobsCalMove(0)">오늘</button>
            <button onclick="window.__jobsCalMove(1)">›</button>
          </div>
        </div>
        <div class="jobs-cal-grid">${dowHtml}${daysHtml}</div>
        <div style="margin-top:14px; padding-top:12px; border-top:0.5px solid rgba(0,0,0,0.08); display:flex; gap:14px; font-size:11px; color:#6B7684;">
          <span><span class="jobs-cal-day-dot" style="background:#22C55E; display:inline-block; margin-right:4px;"></span>진행중</span>
          <span><span class="jobs-cal-day-dot" style="background:#2563EB; display:inline-block; margin-right:4px;"></span>모집중</span>
          <span><span class="jobs-cal-day-dot" style="background:#F59E0B; display:inline-block; margin-right:4px;"></span>마감</span>
          <span><span class="jobs-cal-day-dot" style="background:#9CA3AF; display:inline-block; margin-right:4px;"></span>종료</span>
        </div>
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────
  // 관리자 로그인 화면
  // ───────────────────────────────────────────────────────
  const loginState = {
    role: 'master',          // master / admin1 / admin2
    kakaoDone: false,
    phone: '',
    codeSent: false,
    code: '',
    timer: 0,
    timerInterval: null,
  };

  function renderLoginOverlay() {
    // 기존 오버레이가 있으면 제거
    document.querySelectorAll('.login-overlay').forEach(el => el.remove());

    const l = loginState;
    const need2FA = l.role === 'master' || l.role === 'admin1';
    const canSubmit = l.kakaoDone && (!need2FA || (l.codeSent && l.code.length === 6));

    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
      <div class="login-card">
        <div class="login-brand">
          <div class="login-brand-name">잡핏 JobFit</div>
          <div class="login-brand-sub">관리자 웹 · 알바생 앱과 분리된 별도 서비스</div>
          <div class="login-brand-badge">관리자 전용</div>
        </div>

        <div class="login-section">
          <div class="login-label">로그인 등급 선택 <span style="color:#9CA3AF; font-weight:400;">(데모)</span></div>
          <div class="login-role-picker">
            <button class="login-role-btn ${l.role==='master'?'active':''}" onclick="window.__loginRole('master')">마스터</button>
            <button class="login-role-btn ${l.role==='admin1'?'active':''}" onclick="window.__loginRole('admin1')">관리자 1등급</button>
            <button class="login-role-btn ${l.role==='admin2'?'active':''}" onclick="window.__loginRole('admin2')">관리자 2등급</button>
          </div>
        </div>

        <div class="login-section">
          <div class="login-label">
            <span class="login-step-num ${l.kakaoDone ? 'done' : 'active'}">${l.kakaoDone ? '✓' : '1'}</span>
            카카오 로그인
          </div>
          <button class="login-kakao ${l.kakaoDone ? 'done' : ''}" onclick="window.__loginKakao()">
            ${l.kakaoDone
              ? '✓ 카카오 계정 인증 완료'
              : '<span style="font-size:16px;">💬</span> 카카오로 시작하기'}
          </button>
        </div>

        ${need2FA ? `
          <div class="login-section">
            <div class="login-label">
              <span class="login-step-num ${l.kakaoDone ? (l.codeSent && l.code.length === 6 ? 'done' : 'active') : ''}">${l.codeSent && l.code.length === 6 ? '✓' : '2'}</span>
              전화번호 인증 <span style="color:#EF4444; font-weight:400;">(2FA)</span>
            </div>
            <div class="login-phone-row">
              <input type="tel" placeholder="010-XXXX-XXXX" value="${l.phone}" oninput="window.__loginPhoneInput(this.value)" ${!l.kakaoDone ? 'disabled' : ''} />
              <button class="btn-primary" onclick="window.__loginSendCode()" ${!l.kakaoDone || !l.phone ? 'disabled' : ''}>
                ${l.codeSent ? '재발송' : '인증번호 발송'}
              </button>
            </div>
            ${l.codeSent ? `
              <div style="margin-top: 10px;">
                <input class="login-code" type="text" placeholder="● ● ● ● ● ●" maxlength="6" value="${l.code}" oninput="window.__loginCodeInput(this.value)" />
                ${l.timer > 0 ? `<div class="login-timer">남은 시간 ${Math.floor(l.timer/60)}:${String(l.timer%60).padStart(2,'0')}</div>` : '<div class="login-timer">인증번호 만료</div>'}
              </div>
            ` : ''}
          </div>
        ` : `
          <div class="login-section" style="padding: 10px 12px; background: #F5F7FA; border-radius: 8px; font-size: 11px; color: #6B7684;">
            ℹ 관리자 2등급은 카카오 로그인만으로 접근 가능합니다. (2FA 미적용 — N18 이월 안건)
          </div>
        `}

        <button class="btn-primary login-submit" onclick="window.__loginSubmit()" ${!canSubmit ? 'disabled' : ''}>
          ${canSubmit ? '관리자 웹 입장' : '위 단계를 완료해주세요'}
        </button>

        <div class="login-footer">
          이 화면은 <strong>데모용 프로토타입</strong>입니다.<br>
          실제 앱에서는 카카오 SDK 연동 + Supabase Auth로 구현됩니다.<br>
          <span style="color:#9CA3AF;">v0.4 · JobFit Admin Web</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function startLoginTimer() {
    loginState.timer = 180;
    if (loginState.timerInterval) clearInterval(loginState.timerInterval);
    loginState.timerInterval = setInterval(() => {
      loginState.timer--;
      if (loginState.timer <= 0) { clearInterval(loginState.timerInterval); loginState.timerInterval = null; }
      // timer 갱신만을 위한 부분 리렌더 (간단히 전체 재렌더)
      const overlay = document.querySelector('.login-overlay');
      if (overlay) renderLoginOverlay();
    }, 1000);
  }

  window.__loginRole = function(role) {
    loginState.role = role;
    renderLoginOverlay();
  };
  window.__loginKakao = function() {
    if (loginState.kakaoDone) return;
    // 시뮬레이션: 0.4초 뒤 인증 성공
    setTimeout(() => {
      loginState.kakaoDone = true;
      alert('카카오 로그인 성공 (시뮬레이션)\n실제 앱에서는 카카오 SDK를 통해 사용자 정보를 받아옵니다.');
      renderLoginOverlay();
    }, 400);
  };
  window.__loginPhoneInput = function(val) {
    loginState.phone = val;
    // 재렌더 안 함 (input focus 유지)
  };
  window.__loginSendCode = function() {
    if (!loginState.phone) return;
    loginState.codeSent = true;
    loginState.code = '';
    startLoginTimer();
    alert(`${loginState.phone} 로 인증번호 발송 (시뮬레이션)\n아무 6자리 숫자를 입력하세요.`);
    renderLoginOverlay();
  };
  window.__loginCodeInput = function(val) {
    loginState.code = val.replace(/\D/g, '').slice(0, 6);
    if (loginState.code.length === 6) renderLoginOverlay(); // 제출 버튼 활성화용
  };
  window.__loginSubmit = function() {
    const l = loginState;
    const need2FA = l.role === 'master' || l.role === 'admin1';
    if (!l.kakaoDone) { alert('카카오 로그인을 먼저 완료해주세요'); return; }
    if (need2FA && (!l.codeSent || l.code.length !== 6)) { alert('전화번호 인증을 완료해주세요'); return; }

    const roleLabel = { master: '마스터', admin1: '관리자 1등급', admin2: '관리자 2등급' }[l.role];
    alert(`${roleLabel} 로 로그인되었습니다.\n\n(데모: 실제 권한 적용은 UI 전체 재구성이 필요해 생략)`);

    // 사이드바 배지/이름 업데이트
    const badge = document.querySelector('.jf-user-badge');
    if (badge) {
      badge.textContent = roleLabel;
      badge.style.background = l.role === 'master' ? '#1B3A6B' : l.role === 'admin1' ? '#2563EB' : '#6B7684';
    }

    // 오버레이 제거, 상태 초기화
    if (l.timerInterval) { clearInterval(l.timerInterval); l.timerInterval = null; }
    document.querySelectorAll('.login-overlay').forEach(el => el.remove());
    Object.assign(loginState, { kakaoDone: false, phone: '', codeSent: false, code: '', timer: 0 });
  };
  window.__logout = function() {
    if (!confirm('로그아웃하시겠습니까?')) return;
    Object.assign(loginState, { role: 'master', kakaoDone: false, phone: '', codeSent: false, code: '', timer: 0 });
    renderLoginOverlay();
  };

  // ───────────────────────────────────────────────────────
  // 근무지 추가 wizard
  // ───────────────────────────────────────────────────────
  const siteFormState = {
    step: 1,
    partnerKey: '',
    siteName: '',
    address: '',
    lat: 37.5665, lng: 126.9780,
    bus: false,
    wage: 100000,
    wageType: '일급',
    holiday: '주 4일 만근',
    contact: '',
    manager1: '',
    manager2: '',
  };

  function renderSiteWizard() {
    const f = siteFormState;
    const steps = [
      { n: 1, label: '기본 정보' },
      { n: 2, label: '주소 & GPS' },
      { n: 3, label: '근무 조건 & 담당자' },
      { n: 4, label: '확인 & 등록' },
    ];
    const stepperHtml = `
      <div class="jf-stepper">
        ${steps.map(s => `
          <div class="jf-step ${f.step === s.n ? 'active' : (f.step > s.n ? 'done' : '')}">
            <div class="jf-step-num">${f.step > s.n ? '✓' : s.n}</div>
            <div class="jf-step-label">${s.label}</div>
          </div>
        `).join('')}
      </div>
    `;

    const partnerOpts = Object.keys(worksites).map(k =>
      `<option value="${k}" ${f.partnerKey===k?'selected':''}>${worksites[k].name}</option>`).join('');

    let body = '';
    if (f.step === 1) {
      body = `
        <div class="jf-panel">
          <div class="ws-section-title">Step 1. 파트너사 & 근무지 기본 정보</div>
          <div class="jf-form-row">
            <div class="jf-form-label">파트너사<span class="req">*</span></div>
            <div>
              <select onchange="window.__swfSet('partnerKey', this.value)" style="max-width:300px;">
                <option value="">선택하세요</option>${partnerOpts}
              </select>
              <div class="jf-form-hint">새 파트너사 추가는 별도 화면에서 가능합니다.</div>
            </div>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">근무지명<span class="req">*</span></div>
            <div>
              <input type="text" placeholder="예: 곤지암 MegaHub" value="${f.siteName}" oninput="window.__swfSet('siteName', this.value)" style="max-width:300px;" />
              <div class="jf-form-hint">알바생 앱에는 파트너사명과 함께 노출됩니다.</div>
            </div>
          </div>
        </div>
      `;
    } else if (f.step === 2) {
      body = `
        <div class="jf-panel">
          <div class="ws-section-title">Step 2. 주소 입력 & GPS 좌표</div>
          <div class="jf-form-row">
            <div class="jf-form-label">도로명 주소<span class="req">*</span></div>
            <div style="max-width:500px;">
              <div style="display:flex; gap:6px;">
                <input id="swf-addr-input" type="text" placeholder="주소 검색 (예: 경기 광주시 도척면)" value="${f.address}" style="flex:1;" />
                <button class="btn-primary" onclick="window.__swfSearchAddr()">카카오맵 검색</button>
              </div>
              <div class="jf-form-hint">검색 후 목록에서 선택하면 좌표가 자동 입력됩니다.</div>
              <div id="swf-addr-results" style="max-height: 200px; overflow-y: auto; margin-top: 6px; border-radius: 8px;"></div>
            </div>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">GPS 좌표</div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px;">
              ${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}
              <span class="jf-form-hint" style="display:block; margin-top:4px;">정확한 영역은 등록 후 "GPS 영역 편집" 에서 다각형으로 설정합니다.</span>
            </div>
          </div>
          <div id="swf-preview-map" style="width:100%; height: 280px; border-radius: 8px; border: 0.5px solid rgba(0,0,0,0.1); overflow: hidden; margin-top: 12px;"></div>
        </div>
      `;
    } else if (f.step === 3) {
      body = `
        <div class="jf-panel">
          <div class="ws-section-title">Step 3. 근무 조건 & 담당자</div>
          <div class="jf-form-row">
            <div class="jf-form-label">기본 알바비<span class="req">*</span></div>
            <div style="display:flex; gap:8px; align-items:center;">
              <select onchange="window.__swfSet('wageType', this.value)">
                <option value="일급" ${f.wageType==='일급'?'selected':''}>일급</option>
                <option value="시급" ${f.wageType==='시급'?'selected':''}>시급</option>
              </select>
              <input type="number" value="${f.wage}" step="1000" onchange="window.__swfSet('wage', parseInt(this.value)||0)" style="width:140px;" />
              <span style="font-size:13px; color:#6B7684;">원 (기본값 · 공고 등록 시 조정 가능)</span>
            </div>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">주휴수당 조건</div>
            <input type="text" placeholder="예: 주 4일 만근, 주 2일 출근" value="${f.holiday}" oninput="window.__swfSet('holiday', this.value)" style="max-width:260px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">통근버스</div>
            <label class="jf-toggle">
              <input type="checkbox" ${f.bus?'checked':''} onchange="window.__swfSet('bus', this.checked)">
              <span class="jf-toggle-switch"></span>
              <span class="jf-toggle-text">운영 중${f.bus ? '' : ' (미운영)'}</span>
            </label>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">근무지 대표 연락처<span class="req">*</span></div>
            <input type="tel" placeholder="010-XXXX-XXXX — 알바생에게 공개" value="${f.contact}" oninput="window.__swfSet('contact', this.value)" style="max-width:220px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">관리자 1등급 담당</div>
            <input type="text" placeholder="예: 김관리" value="${f.manager1}" oninput="window.__swfSet('manager1', this.value)" style="max-width:220px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">관리자 2등급 담당</div>
            <input type="text" placeholder="예: 이담당" value="${f.manager2}" oninput="window.__swfSet('manager2', this.value)" style="max-width:220px;" />
          </div>
        </div>
      `;
    } else {
      // Step 4
      const partnerName = f.partnerKey ? worksites[f.partnerKey].name : '-';
      body = `
        <div class="jf-panel">
          <div class="ws-section-title">Step 4. 입력 내용 확인</div>
          <div class="ws-info-row"><div class="ws-info-label">파트너사</div><div class="ws-info-val">${partnerName}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">근무지명</div><div class="ws-info-val">${f.siteName}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">주소</div><div class="ws-info-val">${f.address || '-'}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">GPS 좌표</div><div class="ws-info-val" style="font-family:'SF Mono',Monaco,monospace; font-size:12px;">${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">기본 알바비</div><div class="ws-info-val">${f.wage.toLocaleString()}원 / ${f.wageType}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">주휴수당</div><div class="ws-info-val">${f.holiday}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">통근버스</div><div class="ws-info-val">${f.bus ? '🚌 운영' : '미운영'}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">대표 연락처</div><div class="ws-info-val">${f.contact || '-'}</div></div>
          <div class="ws-info-row"><div class="ws-info-label">담당 관리자</div><div class="ws-info-val">1등급: ${f.manager1 || '-'} / 2등급: ${f.manager2 || '-'}</div></div>
        </div>

        <div class="ws-warn-box" style="margin-top: 14px;">
          ℹ 등록 후 <strong>GPS 영역 편집</strong> 화면으로 이동합니다. 다각형으로 영역을 그리지 않으면 해당 근무지는 공고 등록 불가 상태로 표시됩니다.
        </div>
      `;
    }

    main.innerHTML = `
      <span class="jf-back" onclick="window.__swfCancel()">← 근무지 관리로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">근무지 추가</div>
          <div class="jf-subtitle">마스터 전용 · ${f.step}/4 단계</div>
        </div>
      </div>
      ${stepperHtml}
      ${body}

      <div style="display:flex; justify-content:space-between; gap:8px; margin-top: 20px; padding-top:16px; border-top:0.5px solid rgba(0,0,0,0.08);">
        <button onclick="window.__swfCancel()" style="color:#EF4444;">취소</button>
        <div style="display:flex; gap:8px;">
          ${f.step > 1 ? '<button onclick="window.__swfPrev()">← 이전</button>' : ''}
          ${f.step < 4
            ? '<button class="btn-primary" onclick="window.__swfNext()">다음 →</button>'
            : '<button class="btn-primary" onclick="window.__swfSubmit()">근무지 등록</button>'}
        </div>
      </div>
    `;

    // Step 2 지도 로드
    if (f.step === 2) {
      setTimeout(() => {
        const mapEl = document.getElementById('swf-preview-map');
        if (!mapEl) return;
        if (window.__kakaoLoadFailed || typeof kakao === 'undefined' || !kakao.maps) {
          mapEl.innerHTML = renderMapError();
          return;
        }
        kakao.maps.load(() => {
          const map = new kakao.maps.Map(mapEl, { center: new kakao.maps.LatLng(f.lat, f.lng), level: 3 });
          const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(f.lat, f.lng), map });
          requestAnimationFrame(() => {
            map.relayout();
            map.setCenter(new kakao.maps.LatLng(f.lat, f.lng));
          });
          new ResizeObserver(() => map.relayout()).observe(mapEl);
          // 검색결과 클릭 시 재중심
          window.__swfMap = map; window.__swfMarker = marker;
        });
      }, 100);
    }
  }

  window.__swfSet = function(key, val) {
    siteFormState[key] = val;
    // 파트너사 바뀌었을 때 근무지명 자동 제안 등은 생략
  };
  window.__swfPrev = function() { if (siteFormState.step > 1) { siteFormState.step--; renderSiteWizard(); } };
  window.__swfNext = function() {
    const f = siteFormState;
    const errs = [];
    if (f.step === 1) {
      if (!f.partnerKey) errs.push('파트너사를 선택해주세요');
      if (!f.siteName.trim()) errs.push('근무지명을 입력해주세요');
    } else if (f.step === 2) {
      if (!f.address.trim()) errs.push('주소를 입력해주세요 (검색 후 선택 권장)');
    } else if (f.step === 3) {
      if (!f.contact.trim()) errs.push('대표 연락처를 입력해주세요');
      if (f.wage <= 0) errs.push('알바비 금액을 확인해주세요');
    }
    if (errs.length > 0) { alert('확인 필요:\n• ' + errs.join('\n• ')); return; }
    f.step++;
    renderSiteWizard();
  };
  window.__swfCancel = function() {
    if (!confirm('근무지 추가를 취소합니다. 입력 내용은 사라집니다.')) return;
    Object.assign(siteFormState, { step: 1, partnerKey: '', siteName: '', address: '', lat: 37.5665, lng: 126.9780, bus: false, wage: 100000, wageType: '일급', holiday: '주 4일 만근', contact: '', manager1: '', manager2: '' });
    renderList();
  };
  window.__swfSearchAddr = function() {
    const input = document.getElementById('swf-addr-input');
    const resultsEl = document.getElementById('swf-addr-results');
    const keyword = input.value.trim();
    if (!keyword) return;
    if (typeof kakao === 'undefined' || !kakao.maps) { resultsEl.innerHTML = '<div class="map-error">카카오맵 API 로딩 실패</div>'; return; }

    resultsEl.innerHTML = '<div style="padding:14px; font-size:12px; color:#6B7684; text-align:center;">검색 중...</div>';
    kakao.maps.load(() => {
      const ps = new kakao.maps.services.Places();
      const geocoder = new kakao.maps.services.Geocoder();
      let html = '', found = false;

      ps.keywordSearch(keyword, (places, status) => {
        if (status === kakao.maps.services.Status.OK && places.length > 0) {
          found = true;
          html += '<div style="padding:6px 10px; font-size:11px; font-weight:500; color:#6B7684; background:#F9FAFB;">장소 검색</div>';
          places.slice(0, 4).forEach(p => {
            html += `
              <div class="addr-item" data-lat="${p.y}" data-lng="${p.x}" data-addr="${p.road_address_name || p.address_name}" style="padding:9px 12px; cursor:pointer; border-bottom:0.5px solid rgba(0,0,0,0.06); font-size:12px;">
                <div style="font-weight:500;">${p.place_name}</div>
                <div style="color:#6B7684; font-size:11px;">${p.road_address_name || p.address_name}</div>
              </div>
            `;
          });
        }
        geocoder.addressSearch(keyword, (addrs, st2) => {
          if (st2 === kakao.maps.services.Status.OK && addrs.length > 0) {
            found = true;
            html += '<div style="padding:6px 10px; font-size:11px; font-weight:500; color:#6B7684; background:#F9FAFB;">주소 검색</div>';
            addrs.slice(0, 4).forEach(a => {
              html += `
                <div class="addr-item" data-lat="${a.y}" data-lng="${a.x}" data-addr="${a.address_name}" style="padding:9px 12px; cursor:pointer; border-bottom:0.5px solid rgba(0,0,0,0.06); font-size:12px;">
                  <div>${a.address_name}</div>
                </div>
              `;
            });
          }
          if (!found) html = '<div style="padding:14px; font-size:12px; color:#6B7684; text-align:center;">검색 결과가 없습니다.</div>';
          resultsEl.innerHTML = html;
          resultsEl.querySelectorAll('.addr-item').forEach(item => {
            item.addEventListener('click', () => {
              const lat = parseFloat(item.dataset.lat), lng = parseFloat(item.dataset.lng);
              siteFormState.lat = lat; siteFormState.lng = lng; siteFormState.address = item.dataset.addr;
              resultsEl.innerHTML = '';
              renderSiteWizard();
            });
            item.addEventListener('mouseenter', () => item.style.background = '#F5F7FA');
            item.addEventListener('mouseleave', () => item.style.background = '');
          });
        });
      });
    });
  };
  window.__swfSubmit = function() {
    const f = siteFormState;
    const newId = f.siteName.replace(/\s+/g, '_').toLowerCase().slice(0, 20) + '_' + Date.now().toString(36).slice(-4);
    const newSite = {
      id: newId, name: f.siteName, addr: f.address,
      lat: f.lat, lng: f.lng, bus: f.bus,
      wage: f.wage, holiday: f.holiday, gps: false,
      vertices: 0, area: 0, contact: f.contact,
      manager1: f.manager1 || '-', manager2: f.manager2 || '-',
      polygon: [], activeJobs: 0,
    };
    worksites[f.partnerKey].sites.push(newSite);
    worksites[f.partnerKey].count = worksites[f.partnerKey].sites.length;
    alert(`근무지 "${f.siteName}" 등록 완료!\n\n이제 GPS 영역을 설정해야 공고 등록이 가능합니다.\n다음 화면에서 다각형으로 영역을 그려주세요.`);
    // 폼 초기화
    Object.assign(siteFormState, { step: 1, partnerKey: '', siteName: '', address: '', lat: 37.5665, lng: 126.9780, bus: false, wage: 100000, wageType: '일급', holiday: '주 4일 만근', contact: '', manager1: '', manager2: '' });
    renderGpsEditor(newId);
  };

  // 공고 상세 페이지
  function renderJobDetail(jobId) {
    const j = findJob(jobId); if (!j) return;
    const site = findSite(j.siteId);
    const st = jobStatus(j);
    const stColor = { open:'#2563EB', closed:'#F59E0B', progress:'#22C55E', done:'#6B7684' }[st];
    if (!Array.isArray(j.externalWorkers)) j.externalWorkers = [];
    const ext = j.externalWorkers;
    const effApply = j.apply + ext.length;  // 외부 구인 인원 포함 총 구인
    const pct = Math.round((effApply / j.cap) * 100);
    const reward = pointRewardFor(j);
    const sum = attendanceSummary(jobId);
    const attend = getAttendance(jobId);

    // 이 공고의 신청자 (applications에서 추출)
    const myApps = applications.filter(a => a.jobId === jobId);

    main.innerHTML = `
      <span class="jf-back" onclick="window.__jobsBackToList()">← 공고 리스트로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">
            ${site.site.name}
            <span class="ws-mini-tag" style="vertical-align:middle;">${site.partner}</span>
            <span class="jobs-status jobs-status-${st}" style="margin-left:8px; font-size:13px; padding:4px 12px; vertical-align:middle;">${STATUS_LABEL[st]}</span>
            ${j.reopened ? '<span class="wl-reopened" style="margin-left:6px; vertical-align:middle;">REOPENED</span>' : ''}
          </div>
          <div class="jf-subtitle">${j.date} · ${j.slot} ${j.start}~${j.end} · 공고 ID ${j.id}</div>
        </div>
        <div class="ws-actions">
          <button onclick="window.__jobEdit('${j.id}')">수정</button>
          <button onclick="window.__jobsDuplicate('${j.id}')">복제</button>
          <button onclick="window.__jobsDelete('${j.id}')" class="btn-danger" ${st!=='open'&&st!=='closed'?'disabled':''}>삭제</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px;">
        <!-- 좌측: 공고 정보 & 신청자 -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="jf-panel">
            <div class="ws-section-title">공고 정보</div>
            <div class="ws-info-row"><div class="ws-info-label">근무지</div><div class="ws-info-val">${site.site.name} <span style="color:#6B7684; font-weight:400; font-size:12px;">${site.site.addr}</span></div></div>
            <div class="ws-info-row"><div class="ws-info-label">근무 일자</div><div class="ws-info-val">${j.date} <span style="color:#6B7684; font-weight:400;">(${'일월화수목금토'[new Date(j.date).getDay()]})</span></div></div>
            <div class="ws-info-row"><div class="ws-info-label">시간대</div><div class="ws-info-val">${j.slot} ${j.start} ~ ${j.end}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">알바비</div><div class="ws-info-val">${j.wage.toLocaleString()}원 / ${j.wageType} <span style="color:#9CA3AF; font-weight:400; font-size:11px;">(${site.partner} 직접 지급)</span></div></div>
            <div class="ws-info-row"><div class="ws-info-label">잡핏 포인트</div><div class="ws-info-val" style="color:#2563EB;">+${reward.toLocaleString()} P <span style="color:#9CA3AF; font-weight:400; font-size:11px;">중계 보상 · 출근 완료 시 자동 지급</span></div></div>
            <div class="ws-info-row"><div class="ws-info-label">담당자</div><div class="ws-info-val">${j.contact || '-'}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">옵션</div><div class="ws-info-val" style="font-weight:400; font-size:12px;">
              ${j.contract ? '<span class="apv-badge" style="background:#DBEAFE; color:#1E40AF; margin-right:4px;">계약서</span>' : ''}
              ${j.safety ? '<span class="apv-badge" style="background:#DCFCE7; color:#166534; margin-right:4px;">안전교육</span>' : ''}
            </div></div>
          </div>

          <div class="jf-panel">
            <div class="ws-section-title">
              신청자 목록
              <span style="font-size:11px; color:#6B7684; font-weight:400;">${myApps.length}건 신청 · ${myApps.filter(a=>a.status==='approved').length}명 승인</span>
            </div>
            ${myApps.length === 0
              ? '<div style="padding:20px 0; text-align:center; color:#6B7684; font-size:13px;">아직 신청자가 없습니다.</div>'
              : myApps.map(a => {
                  const w = findWorker(a.workerId);
                  const stColor = { pending: '#F59E0B', approved: '#22C55E', rejected: '#EF4444' }[a.status];
                  const stLabel = { pending: '대기', approved: '승인', rejected: '거절' }[a.status];
                  return `
                    <div style="display:grid; grid-template-columns: 1.2fr 1fr auto auto; gap:10px; align-items:center; padding:10px 0; border-bottom:0.5px solid rgba(0,0,0,0.06);">
                      <div>
                        <div style="font-weight:500; font-size:13px;">${w.name}
                          ${w.negotiation ? '<span class="apv-badge apv-badge-neg" style="font-size:10px; padding:2px 6px;">협의대상</span>' : ''}
                        </div>
                        <div style="font-family:'SF Mono',Monaco,monospace; font-size:11px; color:#6B7684;">${w.phone}</div>
                      </div>
                      <div style="font-size:11px; color:#6B7684;">
                        경고 ${w.warnings} · 누적 ${w.total}회${a.rejectReason ? '<br>거절 사유: ' + a.rejectReason : ''}
                      </div>
                      <div style="color:${stColor}; font-size:12px; font-weight:500;">● ${stLabel}</div>
                      <div style="font-size:11px; color:#9CA3AF;">${a.appliedAt}</div>
                    </div>
                  `;
                }).join('')}
          </div>

          <div class="jf-panel" style="border-left: 3px solid #14B8A6;">
            <div class="ws-section-title">
              <span>🏷 외부 구인 인원 <span style="font-size:11px; color:#6B7684; font-weight:400;">관리자 직접 등록 · ${ext.length}명 · 포인트 미지급</span></span>
              <button onclick="window.__extAdd('${j.id}')" style="font-size:12px; padding:4px 10px; height:auto;">+ 인원 추가</button>
            </div>
            <div style="font-size:11px; color:#0F766E; background:#F0FDFA; padding:8px 10px; border-radius:6px; margin-bottom:10px; line-height:1.5;">
              💡 앱을 통하지 않고 관리자가 개별 연락으로 채운 인원 · <strong>구인 수 +1 반영</strong> · 출결은 현장 체크로 수기 관리 · 포인트·경고·협의대상 시스템 적용 안 됨
            </div>
            ${ext.length === 0
              ? '<div style="padding:14px 0; text-align:center; color:#6B7684; font-size:12px;">아직 등록된 외부 구인 인원이 없습니다.</div>'
              : `
                <div class="jf-table-head" style="grid-template-columns: 1.1fr 1fr 1.4fr 0.9fr auto; padding: 10px 12px;">
                  <div>이름</div>
                  <div>전화번호</div>
                  <div>메모</div>
                  <div>현장 출석</div>
                  <div></div>
                </div>
                ${ext.map(ex => `
                  <div style="display:grid; grid-template-columns: 1.1fr 1fr 1.4fr 0.9fr auto; gap:10px; padding:10px 12px; align-items:center; font-size:13px; border-bottom:0.5px solid rgba(0,0,0,0.06);">
                    <div style="font-weight:500;">${esc(ex.name)}</div>
                    <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px; color:#6B7684;">${esc(ex.phone)}</div>
                    <div style="font-size:11px; color:#6B7684;">${ex.note ? esc(ex.note) : '-'}</div>
                    <div>
                      <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; padding:4px 10px; background:${ex.attended?'#DCFCE7':'#F3F4F6'}; color:${ex.attended?'#166534':'#6B7684'}; border-radius:6px; font-weight:500;">
                        <input type="checkbox" ${ex.attended?'checked':''} onchange="window.__extToggleAttended('${j.id}','${ex.id}')" style="accent-color:#22C55E;">
                        ${ex.attended ? '✓ 출석' : '미출석'}
                      </label>
                    </div>
                    <button onclick="window.__extRemove('${j.id}','${ex.id}')" style="font-size:11px; padding:4px 8px; height:auto; color:#EF4444;">삭제</button>
                  </div>
                `).join('')}
              `}
          </div>
        </div>

        <!-- 우측: 모집 현황 & 출결 -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="jf-panel">
            <div class="ws-section-title">모집 현황</div>
            <div style="font-size: 28px; font-weight: 500; color: #111827; text-align: center; padding: 14px 0;">
              ${effApply}<span style="color:#6B7684; font-size:16px;"> / ${j.cap}명</span>
            </div>
            <div class="jobs-progress-bar" style="height:8px;"><div class="jobs-progress-bar-fill" style="width:${Math.min(100, pct)}%;"></div></div>
            <div class="jobs-progress-label"><span>달성률</span><span><strong style="color:#2563EB;">${pct}%</strong></span></div>
            ${ext.length > 0 ? `
              <div style="margin-top:10px; padding:8px 10px; background:#F0FDFA; border-radius:6px; font-size:11px; color:#0F766E; display:flex; justify-content:space-between;">
                <span>앱 신청 <strong>${j.apply}</strong>명</span>
                <span>🏷 외부 구인 <strong>${ext.length}</strong>명</span>
              </div>
            ` : ''}
            <div style="margin-top:14px; padding-top:12px; border-top: 0.5px solid rgba(0,0,0,0.06); font-size: 12px; color: #6B7684;">
              ${st === 'open' ? '모집 중 · 신청 가능'
                : st === 'closed' ? (j.recruitClosed ? '✓ 수동 구인 완료 · 앱 신청 차단' : '정원 마감 · 시작 대기')
                : st === 'progress' ? '근무 진행 중'
                : '종료됨'}
            </div>
            ${j.recruitClosed ? `
              <div style="margin-top:8px; padding:8px 10px; background:#FEF3C7; border-radius:6px; font-size:11px; color:#92400E; display:flex; justify-content:space-between; align-items:center;">
                <span>⚠ 관제에서 수동 구인 완료 처리됨</span>
                <button onclick="window.__jobRecruitReopen('${j.id}')" style="font-size:11px; padding:3px 8px; height:auto; color:#92400E; background:rgba(255,255,255,0.6); border-color:rgba(146,64,14,0.3);">취소</button>
              </div>
            ` : ''}
          </div>

          ${st === 'progress' || st === 'done' ? `
            <div class="jf-panel">
              <div class="ws-section-title">출결 요약</div>
              <div style="display:flex; gap:14px; align-items:center; margin-top:6px;">
                ${attendanceDonut(sum, 110, 13)}
                <div class="ctrl-donut-legend" style="flex:1;">
                  <div><span class="ctrl-donut-dot" style="background:#22C55E;"></span>출근<strong>${sum.출근}</strong></div>
                  <div><span class="ctrl-donut-dot" style="background:#F59E0B;"></span>지각<strong>${sum.지각}</strong></div>
                  <div><span class="ctrl-donut-dot" style="background:#EF4444;"></span>결근<strong>${sum.결근}</strong></div>
                  <div><span class="ctrl-donut-dot" style="background:#D1D5DB;"></span>대기<strong>${sum.대기}</strong></div>
                </div>
              </div>
              <div style="margin-top:10px; padding-top:10px; border-top: 0.5px solid rgba(0,0,0,0.06); font-size: 11px; color: #6B7684; text-align:center;">하단 명단에서 개별 확인</div>
            </div>
          ` : ''}

          <div class="jf-panel">
            <div class="ws-section-title">공유</div>
            <div style="font-size: 12px; color: #6B7684; margin-bottom: 8px;">알바생 앱 공고 링크</div>
            <div style="display:flex; gap:6px;">
              <input readonly value="jobfit://jobs/${j.id}" style="flex:1; font-family:'SF Mono',Monaco,monospace; font-size:12px;" />
              <button onclick="window.__ptCopy('jobfit://jobs/${j.id}')" style="font-size:12px;">복사</button>
            </div>
          </div>
        </div>
      </div>

      ${(st === 'progress' || st === 'done') ? `
        <div class="jf-panel" style="margin-top: 14px;">
          <div class="ws-section-title">
            출결 명단 <span style="font-size:11px; color:#6B7684; font-weight:400;">이름 클릭 시 계약서 + 서명 확인 · 🛰 배지는 퇴근 승인 대기 (해당 메뉴에서 처리)</span>
          </div>
          <div class="jf-table-head" style="grid-template-columns: 30px 1.5fr 1fr 1fr 0.9fr auto; padding: 10px 12px;">
            <div></div>
            <div>이름</div>
            <div>출근 시각</div>
            <div>퇴근 시각</div>
            <div>상태</div>
            <div></div>
          </div>
          <div class="ctrl-roster">
            ${attend.map(a => {
              const dotCls = { 출근:'dot-ok', 지각:'dot-late', 결근:'dot-no', 대기:'dot-wait' }[a.status];
              const stClr = { 출근:'#166534', 지각:'#92400E', 결근:'#991B1B', 대기:'#6B7684' }[a.status];
              const gpsReq = gpsRequests.find(g => g.status === 'pending' && g.workerId === a.worker.id && g.jobId === j.id);
              const gpsBadge = gpsReq ? `<span class="gps-roster-badge" title="${gpsReq.reason.replace(/"/g,'&quot;')}">🛰 GPS 대기 ${gpsReq.distance}m</span>` : '';
              return `
                <div class="ctrl-roster-row" onclick="window.__ctrlContract('${j.id}','${a.worker.id}')">
                  <div><span class="ctrl-roster-dot ${dotCls}"></span></div>
                  <div>
                    <div style="font-weight:500;">${a.worker.name}${gpsBadge}</div>
                    <div style="font-size:11px; color:#6B7684; font-family:'SF Mono',Monaco,monospace;">${a.worker.phone}</div>
                  </div>
                  <div style="font-size:12px; color:${a.checkin ? '#111827' : '#D1D5DB'};">${a.checkin || '-'}</div>
                  <div style="font-size:12px; color:${a.checkout ? '#111827' : '#D1D5DB'};">${a.checkout || '-'}</div>
                  <div style="color:${stClr}; font-size:12px; font-weight:500;">${a.status}</div>
                  <div style="text-align:right; color:#2563EB; font-size:12px;">📄 계약서</div>
                </div>
              `;
            }).join('')}
            ${ext.length > 0 ? ext.map(ex => `
              <div class="ctrl-roster-row" style="background: #F0FDFA;">
                <div><span class="ctrl-roster-dot" style="background:${ex.attended ? '#22C55E' : '#D1D5DB'};"></span></div>
                <div>
                  <div style="font-weight:500;">${esc(ex.name)}<span class="ext-badge" style="margin-left:6px;">🏷 외부</span></div>
                  <div style="font-size:11px; color:#6B7684; font-family:'SF Mono',Monaco,monospace;">${esc(ex.phone)}</div>
                </div>
                <div style="font-size:12px; color:#D1D5DB;">-</div>
                <div style="font-size:12px; color:#D1D5DB;">-</div>
                <div style="color:${ex.attended ? '#166534' : '#6B7684'}; font-size:12px; font-weight:500;">${ex.attended ? '✓ 출석' : '미출석'}</div>
                <div style="text-align:right; color:#9CA3AF; font-size:11px;">${ex.note ? '📝' : ''}</div>
              </div>
            `).join('') : ''}
          </div>
          ${st === 'done' && (sum.출근 + sum.지각) > 0 ? `
            <div style="margin-top:14px; padding-top:12px; border-top:0.5px solid rgba(0,0,0,0.08); display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#6B7684;">잡핏 포인트 총 지급 <span style="font-size:11px;">(${sum.출근 + sum.지각}명 × ${reward.toLocaleString()}P · 외부 구인 인원 제외)</span></span>
              <strong style="color:#2563EB;">${((sum.출근 + sum.지각) * reward).toLocaleString()} P</strong>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${renderJobWaitlistSection(j.id)}
    `;
  }

  // 공고 수정 폼 — 단일 공고 편집
  const jobEditState = { jobId: null, draft: null };

  function renderJobEdit(jobId) {
    const j = findJob(jobId); if (!j) return;
    if (jobEditState.jobId !== jobId) {
      jobEditState.jobId = jobId;
      jobEditState.draft = { ...j };  // 깊은 복사 (플랫 객체니까 얕은 복사로 충분)
    }
    const d = jobEditState.draft;
    const site = findSite(d.siteId);
    const reward = pointRewardFor(d);

    main.innerHTML = `
      <span class="jf-back" onclick="window.__jobsDetail('${jobId}')">← 공고 상세로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">공고 수정</div>
          <div class="jf-subtitle">${site.site.name} · ${site.partner} · 공고 ID ${jobId}</div>
        </div>
        <div class="ws-actions">
          <button onclick="window.__jobsDetail('${jobId}')">취소</button>
          <button class="btn-primary" onclick="window.__jobEditSave()">저장</button>
        </div>
      </div>

      <div class="jf-panel">
        <div class="ws-section-title">공고 정보</div>
        <div class="jf-form-row">
          <div class="jf-form-label">근무지</div>
          <div style="font-size:13px;">${site.site.name} <span style="color:#6B7684; font-weight:400;">(변경 불가 — 복제 후 새 공고 등록)</span></div>
        </div>
        <div class="jf-form-row">
          <div class="jf-form-label">날짜<span class="req">*</span></div>
          <input type="date" value="${d.date}" onchange="jobEditState.draft.date=this.value" style="max-width:200px;" />
        </div>
        <div class="jf-form-row">
          <div class="jf-form-label">시간대<span class="req">*</span></div>
          <div style="display:flex; gap:8px;">
            <select onchange="jobEditState.draft.slot=this.value; renderJobEdit('${jobId}')">
              <option ${d.slot==='주간'?'selected':''}>주간</option>
              <option ${d.slot==='야간'?'selected':''}>야간</option>
              <option ${d.slot==='새벽'?'selected':''}>새벽</option>
              <option ${d.slot==='웨딩'?'selected':''}>웨딩</option>
            </select>
            <input type="time" value="${d.start}" onchange="jobEditState.draft.start=this.value" style="width:130px;" />
            <span style="align-self:center;">~</span>
            <input type="time" value="${d.end}" onchange="jobEditState.draft.end=this.value" style="width:130px;" />
          </div>
        </div>
        <div class="jf-form-row">
          <div class="jf-form-label">모집 인원<span class="req">*</span></div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="number" min="1" value="${d.cap}" onchange="jobEditState.draft.cap=parseInt(this.value)||1" style="width:100px;" />
            <span style="font-size:12px; color:#6B7684;">명 (현재 ${d.apply}명 확정 — 모집인원을 ${d.apply}명 미만으로 줄일 수 없음)</span>
          </div>
        </div>
        <div class="jf-form-row">
          <div class="jf-form-label">알바비<span class="req">*</span></div>
          <div style="display:flex; gap:8px; align-items:center;">
            <select onchange="jobEditState.draft.wageType=this.value">
              <option value="일급" ${d.wageType==='일급'?'selected':''}>일급</option>
              <option value="시급" ${d.wageType==='시급'?'selected':''}>시급</option>
            </select>
            <input type="number" step="1000" value="${d.wage}" onchange="jobEditState.draft.wage=parseInt(this.value)||0" style="width:140px;" />
            <span style="font-size:13px; color:#6B7684;">원 <span style="color:#9CA3AF; font-size:11px;">(${site.partner} 직접 지급)</span></span>
          </div>
        </div>
        <div class="jf-form-row">
          <div class="jf-form-label">잡핏 포인트</div>
          <div style="font-size:13px; color:#2563EB;">+${reward.toLocaleString()} P <span style="color:#9CA3AF; font-size:11px; font-weight:400;">시간대별 자동 산정 (주간 2,000P · 야간 2,500P · 새벽 3,000P · 웨딩 2,500P)</span></div>
        </div>
        <div class="jf-form-row">
          <div class="jf-form-label">담당자 전화번호<span class="req">*</span></div>
          <input type="tel" value="${d.contact || ''}" onchange="jobEditState.draft.contact=this.value" style="max-width:220px;" />
        </div>
        <div class="jf-form-row top" style="padding-top:14px;">
          <div class="jf-form-label">옵션</div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <label class="jf-toggle">
              <input type="checkbox" ${d.contract?'checked':''} onchange="jobEditState.draft.contract=this.checked">
              <span class="jf-toggle-switch"></span>
              <span class="jf-toggle-text">근로계약서 사용</span>
            </label>
            <label class="jf-toggle">
              <input type="checkbox" ${d.safety?'checked':''} onchange="jobEditState.draft.safety=this.checked">
              <span class="jf-toggle-switch"></span>
              <span class="jf-toggle-text">안전교육 자료 노출</span>
            </label>
          </div>
        </div>
      </div>

      ${d.apply > 0 ? `
        <div class="ws-warn-box" style="margin-top: 14px;">
          ⚠ 이 공고에 ${d.apply}명이 이미 확정되었습니다. 날짜/시간대 변경 시 <strong>확정된 알바생에게 자동 알림이 발송</strong>됩니다.
        </div>
      ` : ''}

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top: 20px; padding-top:16px; border-top:0.5px solid rgba(0,0,0,0.08);">
        <button onclick="window.__jobsDetail('${jobId}')">취소</button>
        <button class="btn-primary" onclick="window.__jobEditSave()">변경사항 저장</button>
      </div>
    `;
  }

  window.__jobEditSave = function() {
    const j = findJob(jobEditState.jobId); if (!j) return;
    const d = jobEditState.draft;
    if (!d.date || !d.start || !d.end) { alert('날짜/시간을 확인해주세요'); return; }
    if (d.cap < d.apply) { alert(`이미 확정된 ${d.apply}명보다 모집 인원을 적게 설정할 수 없습니다.`); return; }
    if (d.wage <= 0) { alert('알바비 금액을 확인해주세요'); return; }
    if (!d.contact || !d.contact.trim()) { alert('담당자 전화번호를 입력해주세요'); return; }

    // 기존 공고 객체에 변경사항 반영
    Object.assign(j, d);
    const site = findSite(j.siteId);
    logAudit({
      category: 'job', action: 'edit',
      target: (site?.site.name || '') + ' ' + j.date + ' ' + j.slot,
      targetId: j.id,
      summary: '모집 ' + j.cap + '명 · ' + j.wage.toLocaleString() + '원' + (j.apply > 0 ? ' · 확정 ' + j.apply + '명에게 변경 알림 발송' : ''),
    });
    const changeNotify = j.apply > 0 ? '\n\n확정 알바생 ' + j.apply + '명에게 변경 알림이 발송되었습니다.' : '';
    alert('공고 수정 완료.' + changeNotify);
    jobEditState.jobId = null; jobEditState.draft = null;
    renderJobDetail(j.id);
  };

  window.__jobsBackToList = function() { jobsState.tab = 'list'; renderJobs(); };
  window.__jobsDuplicate = function(jobId) {
    const j = findJob(jobId); if (!j) return;
    const newId = 'j' + String(jobs.length + 1).padStart(3, '0');
    // 내일 날짜로 복제
    const tomorrow = new Date(TODAY); tomorrow.setDate(tomorrow.getDate() + 1);
    const newDate = tomorrow.toISOString().slice(0, 10);
    jobs.push({ ...j, id: newId, date: newDate, apply: 0 });
    const site = findSite(j.siteId);
    logAudit({
      category: 'job', action: 'duplicate',
      target: (site?.site.name || '') + ' ' + newDate + ' ' + j.slot,
      targetId: newId,
      summary: '원본 ' + jobId + ' → ' + newId + ' (' + newDate + ')',
    });
    alert(`공고 복제 완료 (${newId}, 날짜: ${newDate})\n필요시 수정 탭에서 편집해주세요.`);
    renderJobDetail(newId);
  };
  window.__jobsDelete = function(jobId) {
    const j = findJob(jobId); if (!j) return;
    if (!confirm('이 공고를 삭제합니다. 신청자가 있는 경우 거절 알림이 발송됩니다. 계속하시겠습니까?')) return;
    const idx = jobs.indexOf(j); if (idx >= 0) jobs.splice(idx, 1);
    const site = findSite(j.siteId);
    logAudit({
      category: 'job', action: 'delete',
      target: (site?.site.name || '') + ' ' + j.date + ' ' + j.slot,
      targetId: jobId,
      summary: '모집 ' + j.cap + '명 · 신청 ' + j.apply + '명 · 삭제 시점에 자동 거절 알림 발송',
    });
    alert('공고 삭제 완료.');
    jobsState.tab = 'list';
    renderJobs();
  };

  // 공고 등록 폼 상태
  const jobFormState = {
    partnerKey: '',
    siteId: '',
    title: '',
    description: '',
    dates: [],  // 선택된 날짜 배열 'YYYY-MM-DD'
    slots: [    // 시간대 슬롯 (같은 날짜에 여러 개 가능)
      { slot: '주간', start: '07:00', end: '15:00', cap: 30, wageType: '일급', wage: 110000 },
    ],
    contact: '',
    useContract: true,
    useSafety: true,
    showHolidayPopup: true,
    calYear: 2026,
    calMonth: 4,
  };

  function renderJobsCreate() {
    const f = jobFormState;
    const siteOpts = f.partnerKey
      ? worksites[f.partnerKey].sites.map(s => `<option value="${s.id}" ${f.siteId===s.id?'selected':''}>${s.name}</option>`).join('')
      : '';
    const partnerOpts = Object.keys(worksites).map(k =>
      `<option value="${k}" ${f.partnerKey===k?'selected':''}>${worksites[k].name}</option>`).join('');

    const tpls = loadJobTemplates();
    main.innerHTML = `
      <div class="jf-header">
        <div>
          <div class="jf-title">공고 관리</div>
          <div class="jf-subtitle">새 공고 등록 — 달력에서 날짜를 선택하고 시간대별로 등록합니다</div>
        </div>
        <div class="ws-actions">
          <button onclick="window.__jfCancel()">취소</button>
          <button class="btn-primary" onclick="window.__jfSubmit()">공고 등록</button>
        </div>
      </div>
      ${jobsTabsHtml()}

      <div class="jf-panel" style="margin-bottom: 14px; border-left: 3px solid #2563EB; padding: 14px 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:13px; font-weight:500; color:#111827;">📌 즐겨쓰는 템플릿</span>
            <span style="font-size:11px; color:#6B7684;">자주 쓰는 패턴(근무지·시간대·인원·금액)을 저장해 한 번에 불러오기</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button onclick="window.__jtSaveCurrent()" style="font-size:12px;">💾 현재 입력값을 템플릿으로 저장</button>
          </div>
        </div>
        ${tpls.length === 0 ? `
          <div style="margin-top:10px; padding:14px 16px; background:#F9FAFB; border-radius:8px; font-size:12px; color:#6B7684; text-align:center;">
            저장된 템플릿이 없습니다. 자주 등록하는 패턴을 저장해두면 다음에 클릭 한 번으로 불러올 수 있습니다.
          </div>
        ` : `
          <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
            ${tpls.map(t => {
              const partner = worksites[t.partnerKey];
              const site = partner?.sites.find(s => s.id === t.siteId);
              const slotInfo = (t.slots || []).map(s => s.slot + ' ' + s.start + '~' + s.end + ' ' + s.cap + '명').join(' / ');
              return `
                <div style="background:#F0F9FF; border:0.5px solid #BFDBFE; border-radius:8px; padding:8px 10px 8px 12px; display:flex; align-items:center; gap:10px; cursor:pointer; min-width:0;" onclick="window.__jtApply('${t.id}')" title="클릭하여 폼에 적용">
                  <div style="min-width:0;">
                    <div style="font-size:12px; font-weight:500; color:#1E40AF;">${esc(t.name)}</div>
                    <div style="font-size:10px; color:#6B7684; margin-top:1px;">${esc((site?site.name:'-') + (slotInfo?' · '+slotInfo:''))}</div>
                  </div>
                  <button onclick="event.stopPropagation(); window.__jtDelete('${t.id}')" style="background:transparent; border:0; color:#EF4444; font-size:14px; height:auto; padding:0 4px; cursor:pointer; line-height:1;" title="삭제">×</button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <!-- 기본 정보 -->
        <div class="jf-panel" style="grid-column: span 2;">
          <div class="ws-section-title">기본 정보</div>
          <div class="jf-form-row">
            <div class="jf-form-label">파트너사<span class="req">*</span></div>
            <select style="max-width:260px;" onchange="window.__jfSet('partnerKey', this.value)">
              <option value="">선택하세요</option>${partnerOpts}
            </select>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">근무지<span class="req">*</span></div>
            <select style="max-width:260px;" onchange="window.__jfSet('siteId', this.value)" ${f.partnerKey?'':'disabled'}>
              <option value="">${f.partnerKey ? '선택하세요' : '파트너사 먼저 선택'}</option>${siteOpts}
            </select>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">공고 제목</div>
            <input type="text" placeholder="비워두면 근무지명 자동 사용 (예: CJ대한통운 곤지암 MegaHub)" value="${f.title}" oninput="window.__jfSet('title', this.value)" style="max-width:520px;" />
          </div>
          <div class="jf-form-row top">
            <div class="jf-form-label">모집 내용 / 상세 설명</div>
            <div>
              <textarea rows="4" placeholder="근무 내용, 준비물, 주의사항 등을 입력하세요..." oninput="window.__jfSet('description', this.value)">${f.description}</textarea>
              <div class="jf-form-hint">알바생 앱의 공고 상세 페이지에 그대로 노출됩니다.</div>
            </div>
          </div>
        </div>

        <!-- 일정 선택 -->
        <div class="jf-panel">
          <div class="ws-section-title">
            일정 선택<span class="req" style="color:#EF4444;">*</span>
            <span style="font-size:11px; color:#6B7684; font-weight:400;">달력 클릭으로 복수 선택 · ${f.dates.length}일 선택됨</span>
          </div>
          ${renderFormCalendar()}
          ${f.dates.length > 0 ? `
            <div class="form-date-chips">
              ${f.dates.sort().map(d => `
                <span class="form-date-chip">
                  ${d.slice(5)} <span style="color:#6B7684;">(${'일월화수목금토'[new Date(d).getDay()]})</span>
                  <button onclick="window.__jfRemoveDate('${d}')">×</button>
                </span>
              `).join('')}
              <button onclick="window.__jfClearDates()" style="font-size:11px; padding:4px 10px; height:auto;">전체 해제</button>
            </div>
          ` : '<div class="jf-form-hint">날짜를 선택해주세요. 공고는 선택한 각 날짜마다 동일하게 등록됩니다.</div>'}
        </div>

        <!-- 시간대 & 인원 -->
        <div class="jf-panel">
          <div class="ws-section-title">
            시간대 & 인원<span class="req" style="color:#EF4444;">*</span>
            <span style="font-size:11px; color:#6B7684; font-weight:400;">같은 근무지·날짜에 시간대 여러 개 등록 가능</span>
          </div>
          <div class="form-slot-row form-slot-head">
            <div>시간대</div><div>시작</div><div>종료</div><div>모집</div><div>급여 유형</div><div>금액</div><div></div>
          </div>
          ${f.slots.map((s, i) => `
            <div class="form-slot-row">
              <select onchange="window.__jfSlot(${i}, 'slot', this.value)">
                <option ${s.slot==='주간'?'selected':''}>주간</option>
                <option ${s.slot==='야간'?'selected':''}>야간</option>
                <option ${s.slot==='새벽'?'selected':''}>새벽</option>
                <option ${s.slot==='웨딩'?'selected':''}>웨딩</option>
              </select>
              <input type="time" value="${s.start}" onchange="window.__jfSlot(${i}, 'start', this.value)" />
              <input type="time" value="${s.end}" onchange="window.__jfSlot(${i}, 'end', this.value)" />
              <input type="number" value="${s.cap}" min="1" onchange="window.__jfSlot(${i}, 'cap', parseInt(this.value)||1)" />
              <select onchange="window.__jfSlot(${i}, 'wageType', this.value)">
                <option value="일급" ${s.wageType==='일급'?'selected':''}>일급</option>
                <option value="시급" ${s.wageType==='시급'?'selected':''}>시급</option>
              </select>
              <input type="number" value="${s.wage}" step="1000" onchange="window.__jfSlot(${i}, 'wage', parseInt(this.value)||0)" />
              <button onclick="window.__jfRemoveSlot(${i})" ${f.slots.length<=1?'disabled':''} style="font-size:11px; padding:0 8px; height:30px; color:#EF4444;">삭제</button>
            </div>
          `).join('')}
          <div style="margin-top:10px;">
            <button onclick="window.__jfAddSlot()" style="font-size:12px;">+ 시간대 추가</button>
          </div>
          <div class="jf-form-hint" style="margin-top:10px;">
            ※ 잡핏 포인트 보상(자동): 주간 2,000P · 야간 2,500P · 새벽 3,000P · 웨딩 2,500P — 알바비는 파트너사가 직접 지급
          </div>
        </div>

        <!-- 옵션 -->
        <div class="jf-panel" style="grid-column: span 2;">
          <div class="ws-section-title">옵션 설정</div>
          <div class="jf-form-row">
            <div class="jf-form-label">담당자 전화번호<span class="req">*</span></div>
            <input type="tel" placeholder="010-XXXX-XXXX — 알바생에게 공개됨" value="${f.contact}" oninput="window.__jfSet('contact', this.value)" style="max-width:260px;" />
          </div>
          <div class="jf-form-row top" style="padding-top:14px;">
            <div class="jf-form-label">추가 옵션</div>
            <div style="display:flex; flex-direction:column; gap:14px;">
              <div>
                <label class="jf-toggle">
                  <input type="checkbox" ${f.useContract?'checked':''} onchange="window.__jfSet('useContract', this.checked)">
                  <span class="jf-toggle-switch"></span>
                  <span class="jf-toggle-text"><strong>근로계약서 사용</strong></span>
                </label>
                <div class="jf-toggle-sub">알바생 앱에서 전자서명 후 근무 시작. 계약서 PDF는 자동 생성됨 ([날짜]_[공고명]_[알바생명].pdf)</div>
              </div>
              <div>
                <label class="jf-toggle">
                  <input type="checkbox" ${f.useSafety?'checked':''} onchange="window.__jfSet('useSafety', this.checked)">
                  <span class="jf-toggle-switch"></span>
                  <span class="jf-toggle-text"><strong>안전교육 자료 노출</strong></span>
                </label>
                <div class="jf-toggle-sub">근무지별로 다른 자료 사용 — 템플릿 관리 탭에서 업로드</div>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <label class="jf-toggle">
                    <input type="checkbox" ${f.showHolidayPopup?'checked':''} onchange="window.__jfSet('showHolidayPopup', this.checked)">
                    <span class="jf-toggle-switch"></span>
                    <span class="jf-toggle-text"><strong>주휴수당 안내 팝업</strong></span>
                  </label>
                  <button type="button" onclick="window.__jfHolidayPreview()" style="font-size:11px; height:28px; padding:0 10px;">📱 미리보기</button>
                </div>
                <div class="jf-toggle-sub">신청 시 이번 주 N회 만근 상태에 따라 자동 안내 — CJ/롯데 4회, 컨벤션 2일</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top: 20px; padding-top:16px; border-top:0.5px solid rgba(0,0,0,0.08);">
        <button onclick="window.__jfCancel()">취소</button>
        <button onclick="window.__jfDraftSave()">임시저장</button>
        <button onclick="window.__jfDraftLoad()">임시본 불러오기</button>
        <button class="btn-primary" onclick="window.__jfSubmit()">공고 등록</button>
      </div>
    `;
  }

  function renderFormCalendar() {
    const f = jobFormState;
    const y = f.calYear, m = f.calMonth;
    const first = new Date(y, m - 1, 1);
    const firstDow = first.getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const todayDate = new Date(TODAY);
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const dows = ['일','월','화','수','목','금','토'];
    const dowHtml = dows.map((d, i) =>
      `<div class="jobs-cal-dow" style="color:${i===0?'#EF4444':i===6?'#2563EB':'#6B7684'};">${d}</div>`).join('');

    let daysHtml = '';
    cells.forEach((d, idx) => {
      if (d === null) { daysHtml += `<div class="jobs-cal-day empty"></div>`; return; }
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayDate = new Date(dateStr);
      const isPast = dayDate < todayDate;
      const isToday = dateStr === TODAY;
      const isSelected = f.dates.includes(dateStr);
      const dow = idx % 7;
      const numClass = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';
      const cellCls = `form-cal-day ${isSelected ? 'selected' : ''} ${isPast ? 'past' : 'has-jobs'} ${isToday ? 'today' : ''}`;
      daysHtml += `
        <div class="jobs-cal-day ${cellCls}" ${!isPast ? `onclick="window.__jfToggleDate('${dateStr}')"` : ''}>
          <div class="jobs-cal-day-num ${numClass}">${d}</div>
        </div>
      `;
    });

    return `
      <div class="jobs-cal-head" style="margin-top:10px;">
        <div class="jobs-cal-month">${y}년 ${m}월</div>
        <div class="jobs-cal-nav">
          <button onclick="window.__jfCalMove(-1)">‹</button>
          <button onclick="window.__jfCalMove(0)">이번 달</button>
          <button onclick="window.__jfCalMove(1)">›</button>
        </div>
      </div>
      <div class="jobs-cal-grid">${dowHtml}${daysHtml}</div>
    `;
  }

  // 공고 폼 핸들러
  window.__jfSet = function(key, val) {
    jobFormState[key] = val;
    if (key === 'partnerKey') jobFormState.siteId = '';
    renderJobsCreate();
  };
  window.__jfToggleDate = function(dateStr) {
    const idx = jobFormState.dates.indexOf(dateStr);
    if (idx >= 0) jobFormState.dates.splice(idx, 1);
    else jobFormState.dates.push(dateStr);
    renderJobsCreate();
  };
  window.__jfRemoveDate = function(dateStr) {
    jobFormState.dates = jobFormState.dates.filter(d => d !== dateStr);
    renderJobsCreate();
  };
  window.__jfClearDates = function() {
    if (!confirm('선택한 날짜를 모두 해제하시겠습니까?')) return;
    jobFormState.dates = [];
    renderJobsCreate();
  };
  window.__jfCalMove = function(dir) {
    if (dir === 0) {
      const t = new Date(TODAY);
      jobFormState.calYear = t.getFullYear();
      jobFormState.calMonth = t.getMonth() + 1;
    } else {
      jobFormState.calMonth += dir;
      if (jobFormState.calMonth < 1) { jobFormState.calMonth = 12; jobFormState.calYear--; }
      if (jobFormState.calMonth > 12) { jobFormState.calMonth = 1; jobFormState.calYear++; }
    }
    renderJobsCreate();
  };
  window.__jfAddSlot = function() {
    jobFormState.slots.push({ slot: '주간', start: '07:00', end: '15:00', cap: 20, wageType: '일급', wage: 100000 });
    renderJobsCreate();
  };
  window.__jfRemoveSlot = function(idx) {
    if (jobFormState.slots.length <= 1) return;
    jobFormState.slots.splice(idx, 1);
    renderJobsCreate();
  };
  window.__jfSlot = function(idx, key, val) {
    if (jobFormState.slots[idx]) jobFormState.slots[idx][key] = val;
  };
  window.__jfDraftSave = function() {
    try {
      localStorage.setItem('jobfit_job_draft', JSON.stringify(jobFormState));
      alert('임시저장 완료.\n이 브라우저에서 "임시본 불러오기"로 복원 가능합니다.');
    } catch(e) {
      alert('저장 실패: ' + e.message);
    }
  };
  window.__jfDraftLoad = function() {
    try {
      const raw = localStorage.getItem('jobfit_job_draft');
      if (!raw) { alert('저장된 임시본이 없습니다.'); return; }
      const d = JSON.parse(raw);
      Object.assign(jobFormState, d);
      alert('임시본을 불러왔습니다.');
      renderJobsCreate();
    } catch(e) {
      alert('불러오기 실패: ' + e.message);
    }
  };
  window.__jfCancel = function() {
    if (!confirm('작성 중인 내용이 사라집니다. 취소하시겠습니까?')) return;
    Object.assign(jobFormState, {
      partnerKey: '', siteId: '', title: '', description: '',
      dates: [],
      slots: [{ slot: '주간', start: '07:00', end: '15:00', cap: 30, wageType: '일급', wage: 110000 }],
      contact: '', useContract: true, useSafety: true, showHolidayPopup: true,
    });
    jobsState.tab = 'list';
    renderJobs();
  };

  // 주휴수당 팝업 미리보기 — 알바생 앱에서 실제 어떻게 보이는지 모바일 프레임으로 시뮬
  // 파트너사에 따라 규칙 상이: 컨벤션=이번 주 2일째 · CJ/롯데=이번 주 4일 만근 안내
  const HOLIDAY_SCENARIOS = [
    { key: 'cj_3of4',      partner: 'CJ대한통운',   site: 'CJ대한통운 곤지암 MegaHub',  done: 3, need: 4, sub: '이번 주 이미 3일 출근 · 1일만 더 하면 만근!' },
    { key: 'cj_2of4',      partner: 'CJ대한통운',   site: 'CJ대한통운 이천 MpHub',      done: 2, need: 4, sub: '이번 주 2일 출근 · 4일 만근 시 주휴수당 대상' },
    { key: 'lotte_3of4',   partner: '롯데택배',     site: '롯데택배 진천 MegaHub',       done: 3, need: 4, sub: '이번 주 이미 3일 출근 · 1일만 더 하면 만근!' },
    { key: 'conv_1of2',    partner: '컨벤션',       site: 'L타워 웨딩홀',                done: 1, need: 2, sub: '이번 주 1일 근무 완료 · 이 공고까지 하면 2일 = 주휴수당 대상' },
    { key: 'conv_0of2',    partner: '컨벤션',       site: 'W힐스 웨딩홀',                done: 0, need: 2, sub: '이번 주 첫 근무 · 한 번 더 하면 주휴수당 대상' },
  ];

  let holidayPreviewScenario = 'cj_3of4';

  window.__jfHolidayPreview = function() {
    holidayPreviewScenario = 'cj_3of4';
    renderHolidayPreviewModal();
  };

  function renderHolidayPreviewModal() {
    document.querySelectorAll('.jf-modal-overlay.holiday-preview').forEach(el => el.remove());
    const sc = HOLIDAY_SCENARIOS.find(s => s.key === holidayPreviewScenario) || HOLIDAY_SCENARIOS[0];
    const nowH = new Date().getHours(), nowM = new Date().getMinutes();
    const timeStr = String(nowH).padStart(2,'0') + ':' + String(nowM).padStart(2,'0');

    const dotsHtml = Array.from({ length: sc.need }, (_, i) => {
      if (i < sc.done) return `<div class="mp-hp-dot done">✓</div>`;
      if (i === sc.done) return `<div class="mp-hp-dot current">${i + 1}</div>`;
      return `<div class="mp-hp-dot">${i + 1}</div>`;
    }).join('');

    const nextIsLast = sc.done + 1 >= sc.need;
    const titleTxt = nextIsLast ? '🎉 주휴수당 대상 공고!' : '주휴수당 안내';
    const subTxt = nextIsLast
      ? `이 공고를 신청하면 <strong>이번 주 ${sc.need}${sc.partner === '컨벤션' ? '일' : '회'} 만근</strong>이 되어<br>주휴수당 지급 대상이 됩니다.`
      : `이 공고를 신청하면 <strong>이번 주 ${sc.done + 1}${sc.partner === '컨벤션' ? '일' : '회'}</strong>이 됩니다.<br>${sc.need}${sc.partner === '컨벤션' ? '일' : '회'} 만근 시 주휴수당 대상.`;

    const pickerHtml = HOLIDAY_SCENARIOS.map(s =>
      `<button class="${s.key === sc.key ? 'active' : ''}" onclick="window.__jfHolidayScenario('${s.key}')">${s.partner} ${s.done}/${s.need}</button>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay holiday-preview';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 880px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">📱 주휴수당 안내 팝업 미리보기</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="preview-scenario-picker">
            <span style="font-size:12px; color:#6B7684; align-self:center; margin-right:4px;">시나리오:</span>
            ${pickerHtml}
          </div>
          <div class="mobile-preview-wrap">
            <div class="mobile-frame">
              <div class="mobile-screen">
                <div class="mobile-status-bar">
                  <span class="mp-time">${timeStr}</span>
                  <span class="mp-icons">📶 📡 🔋</span>
                </div>
                <div class="mobile-app-header">
                  <div class="mobile-app-header-title">공고 상세</div>
                  <div class="mobile-app-header-sub">${sc.site}</div>
                </div>
                <div class="mobile-app-body">
                  <div style="background:#fff; border-radius:10px; padding:12px; font-size:11px; color:#6B7684; line-height:1.6;">
                    <div style="color:#111827; font-weight:600; font-size:12px; margin-bottom:6px;">${sc.site}</div>
                    📅 2026-04-25 (토) · 주간 07:00~15:00<br>
                    💰 일급 115,000원 · 포인트 2,000P<br>
                    👥 모집 15 / 30명
                  </div>
                  <div class="mp-dim">
                    <div class="mp-sheet">
                      <div class="mp-handle"></div>
                      <div class="mp-hp-icon">🗓</div>
                      <div class="mp-hp-title">${titleTxt}</div>
                      <div class="mp-hp-subtitle">${subTxt}</div>
                      <div class="mp-hp-progress">
                        <div class="mp-hp-dots">${dotsHtml}</div>
                        <div class="mp-hp-progress-label">이번 주 <strong>${sc.done}${sc.partner === '컨벤션' ? '일' : '회'} 완료</strong> · <strong>${sc.need}${sc.partner === '컨벤션' ? '일' : '회'} 만근</strong>까지 ${sc.need - sc.done}${sc.partner === '컨벤션' ? '일' : '회'} 남음</div>
                      </div>
                      <div class="mp-hp-info">
                        <strong>주휴수당이란?</strong><br>
                        근로기준법에 따라 1주 소정근로일을 개근한 경우, 파트너사에서 <strong>추가 1일분의 임금</strong>을 지급합니다.<br>
                        ※ 실제 지급은 <strong>${sc.partner}</strong>에서 직접 처리 (잡핏 포인트와 별개)
                      </div>
                      <div class="mp-hp-actions">
                        <button class="mp-hp-btn-cancel">나중에</button>
                        <button class="mp-hp-btn-ok">확인하고 신청</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="mobile-home-ind"></div>
              </div>
            </div>
            <div class="mobile-preview-info">
              <h4>규칙 · 이 팝업이 뜨는 조건</h4>
              <ul>
                <li><b>CJ대한통운 · 롯데택배</b>: 이번 주 0~3회 출근 상태에서 신청 시 (4회 만근 기준)</li>
                <li><b>컨벤션 (L타워 · W힐스)</b>: 이번 주 0~1일 출근 상태에서 신청 시 (2일 만근 기준)</li>
                <li>만근 이후에는 <b>팝업이 뜨지 않음</b> (이미 주휴수당 확정)</li>
                <li>근무 시작일이 <code>월요일~일요일</code> 주간 기준으로 계산됨</li>
              </ul>
              <h4 style="margin-top:14px;">이 팝업의 목적</h4>
              <ul>
                <li>알바생이 <b>만근까지 얼마나 남았는지</b> 직관적으로 확인</li>
                <li>주휴수당이 <b>파트너사 직접 지급</b>임을 명확히 안내 (잡핏 책임 아님)</li>
                <li>"확인하고 신청" 탭 시 정상 신청 플로우로 진행</li>
              </ul>
              <div style="margin-top:14px; padding:10px 12px; background:#EFF6FF; border-radius:8px; font-size:11px; color:#1E40AF;">
                💡 이 팝업은 <b>이 토글이 ON인 공고</b>에서만 노출됩니다. OFF로 등록된 공고에는 팝업 없이 바로 신청 확인창으로 넘어갑니다.
              </div>
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:14px; padding-top:14px; border-top: 0.5px solid rgba(0,0,0,0.08); justify-content:flex-end;">
            <button class="btn-primary" onclick="this.closest('.jf-modal-overlay').remove()">닫기</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  window.__jfHolidayScenario = function(key) {
    holidayPreviewScenario = key;
    renderHolidayPreviewModal();
  };

  // ─── 즐겨쓰는 템플릿 (localStorage) ────────────────────────
  const JT_STORAGE_KEY = 'jobpit_job_templates';
  function loadJobTemplates() {
    try {
      const raw = localStorage.getItem(JT_STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveJobTemplates(list) {
    try { localStorage.setItem(JT_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  window.__jtSaveCurrent = function() {
    const f = jobFormState;
    if (!f.partnerKey || !f.siteId) { alert('파트너사와 근무지를 먼저 선택해주세요.'); return; }
    if (!f.slots || f.slots.length === 0) { alert('시간대를 1개 이상 입력해주세요.'); return; }
    promptModal({
      title: '템플릿 저장',
      subtitle: '자주 쓰는 공고 패턴을 저장해 두면 다음에 클릭 한 번으로 불러옵니다.',
      fields: [{ key: 'name', label: '템플릿 이름', type: 'text', required: true, placeholder: '예: 곤지암 야간 12명' }],
      submitLabel: '저장',
      onSubmit: (vals) => {
        const list = loadJobTemplates();
        list.unshift({
          id: 'jt_' + Date.now(),
          name: vals.name.trim(),
          partnerKey: f.partnerKey,
          siteId: f.siteId,
          contact: f.contact,
          useContract: f.useContract,
          useSafety: f.useSafety,
          showHolidayPopup: f.showHolidayPopup,
          slots: JSON.parse(JSON.stringify(f.slots)),
          savedAt: TODAY,
        });
        // 최대 10개까지만
        saveJobTemplates(list.slice(0, 10));
        alert('템플릿 저장 완료: ' + vals.name);
        renderJobsCreate();
      },
    });
  };
  window.__jtApply = function(id) {
    const list = loadJobTemplates();
    const t = list.find(x => x.id === id); if (!t) return;
    Object.assign(jobFormState, {
      partnerKey: t.partnerKey,
      siteId: t.siteId,
      contact: t.contact || jobFormState.contact,
      useContract:      t.useContract !== undefined ? t.useContract : jobFormState.useContract,
      useSafety:        t.useSafety !== undefined ? t.useSafety : jobFormState.useSafety,
      showHolidayPopup: t.showHolidayPopup !== undefined ? t.showHolidayPopup : jobFormState.showHolidayPopup,
      slots: JSON.parse(JSON.stringify(t.slots || [])),
    });
    renderJobsCreate();
  };
  window.__jtDelete = function(id) {
    if (!confirm('이 템플릿을 삭제합니다.')) return;
    const list = loadJobTemplates().filter(x => x.id !== id);
    saveJobTemplates(list);
    renderJobsCreate();
  };

  window.__jfSubmit = function() {
    const f = jobFormState;
    // 유효성 검사
    const errors = [];
    if (!f.partnerKey) errors.push('파트너사를 선택해주세요');
    if (!f.siteId) errors.push('근무지를 선택해주세요');
    if (f.dates.length === 0) errors.push('날짜를 1개 이상 선택해주세요');
    if (f.slots.length === 0) errors.push('시간대를 1개 이상 추가해주세요');
    if (!f.contact.trim()) errors.push('담당자 전화번호를 입력해주세요');
    f.slots.forEach((s, i) => {
      if (!s.start || !s.end) errors.push(`${i+1}번째 시간대의 시작/종료 시간을 입력해주세요`);
      if (s.cap < 1) errors.push(`${i+1}번째 시간대의 모집 인원을 확인해주세요`);
      if (s.wage <= 0) errors.push(`${i+1}번째 시간대의 금액을 확인해주세요`);
    });
    if (errors.length > 0) {
      alert('다음 항목을 확인해주세요:\n\n• ' + errors.join('\n• '));
      return;
    }
    // 공고 생성: 선택한 각 날짜 × 각 시간대 = 공고 여러 개
    const site = findSite(f.siteId);
    let created = 0;
    f.dates.forEach(date => {
      f.slots.forEach(s => {
        const newId = 'j' + String(jobs.length + created + 1).padStart(3, '0');
        jobs.push({
          id: newId, siteId: f.siteId,
          date, slot: s.slot, start: s.start, end: s.end,
          cap: s.cap, apply: 0, wage: s.wage, wageType: s.wageType,
          contact: f.contact, contract: f.useContract, safety: f.useSafety,
        });
        logAudit({
          category: 'job', action: 'create',
          target: site.site.name + ' ' + date + ' ' + s.slot,
          targetId: newId,
          summary: '모집 ' + s.cap + '명 · ' + s.wage.toLocaleString() + '원 · ' + s.start + '~' + s.end + (f.useContract?' · 계약서':'') + (f.useSafety?' · 안전교육':''),
        });
        created++;
      });
    });
    alert(`공고 ${created}건 등록 완료!\n\n근무지: ${site.site.name}\n날짜 ${f.dates.length}일 × 시간대 ${f.slots.length}개\n\n담당자: ${f.contact}\n계약서: ${f.useContract?'ON':'OFF'} / 안전교육: ${f.useSafety?'ON':'OFF'} / 주휴수당 팝업: ${f.showHolidayPopup?'ON':'OFF'}`);
    // 폼 초기화 + 리스트 탭 이동
    Object.assign(jobFormState, {
      partnerKey: '', siteId: '', title: '', description: '',
      dates: [],
      slots: [{ slot: '주간', start: '07:00', end: '15:00', cap: 30, wageType: '일급', wage: 110000 }],
      contact: '', useContract: true, useSafety: true, showHolidayPopup: true,
    });
    jobsState.tab = 'list';
    renderJobs();
  };

  const tplState = { filter: '' };  // '' / contract / safety

  function renderJobsTemplate() {
    const filtered = tplState.filter
      ? templates.filter(t => t.type === tplState.filter)
      : templates;
    const contractCount = templates.filter(t => t.type === 'contract').length;
    const safetyCount = templates.filter(t => t.type === 'safety').length;
    const totalInUse = templates.reduce((s, t) => s + t.inUse, 0);

    const TYPE_LABEL = { contract: '근로계약서', safety: '안전교육' };
    const TYPE_STYLE = {
      contract: 'background:#DBEAFE; color:#1E40AF;',
      safety:   'background:#DCFCE7; color:#166534;',
    };

    main.innerHTML = `
      <div class="jf-header">
        <div>
          <div class="jf-title">공고 관리</div>
          <div class="jf-subtitle">근로계약서 · 안전교육 템플릿 관리 <span style="font-size:11px; color:#9CA3AF;">(마스터 / 관리자 1등급 전용)</span></div>
        </div>
        <div class="ws-actions">
          <button class="btn-primary" onclick="window.__tplUpload()">+ 템플릿 업로드</button>
        </div>
      </div>
      ${jobsTabsHtml()}

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">전체 템플릿</div><div class="jf-metric-value">${templates.length}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 개</span></div><div class="jf-metric-hint">활성 템플릿</div></div>
        <div class="jf-metric"><div class="jf-metric-label">근로계약서</div><div class="jf-metric-value">${contractCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 개</span></div><div class="jf-metric-hint">파트너사별</div></div>
        <div class="jf-metric"><div class="jf-metric-label">안전교육</div><div class="jf-metric-value">${safetyCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 개</span></div><div class="jf-metric-hint">근무지별 차등 가능</div></div>
        <div class="jf-metric"><div class="jf-metric-label">연결된 공고</div><div class="jf-metric-value">${totalInUse}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">현재 사용 중</div></div>
      </div>

      <div class="jobs-filters">
        <div class="jobs-view-toggle">
          <button class="${tplState.filter===''?'active':''}" onclick="window.__tplFilter('')">전체 (${templates.length})</button>
          <button class="${tplState.filter==='contract'?'active':''}" onclick="window.__tplFilter('contract')">근로계약서 (${contractCount})</button>
          <button class="${tplState.filter==='safety'?'active':''}" onclick="window.__tplFilter('safety')">안전교육 (${safetyCount})</button>
        </div>
      </div>

      ${filtered.length === 0
        ? `<div class="jf-placeholder"><div class="jf-placeholder-icon">📄</div><div class="jf-placeholder-title">해당 유형의 템플릿이 없습니다</div><div class="jf-placeholder-desc">상단 "+ 템플릿 업로드" 버튼으로 등록하세요.</div></div>`
        : `<div class="jobs-grid" style="grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));">
            ${filtered.map(t => {
              const partnerNames = t.partnerKeys.map(k => worksites[k].name).join(', ');
              const siteNames = t.siteIds && t.siteIds.length > 0
                ? t.siteIds.map(sid => findSite(sid)?.site.name || sid).join(', ')
                : '전체';
              return `
                <div class="jobs-card" style="cursor:default;">
                  <div class="jobs-card-head">
                    <div style="display:flex; gap:10px; align-items:center;">
                      <div style="width:40px; height:48px; background:#FEE2E2; color:#991B1B; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; flex-shrink:0;">PDF</div>
                      <div>
                        <div class="jobs-card-title">${t.name}</div>
                        <div class="jobs-card-sub">${t.fileName} · ${t.fileSize}</div>
                      </div>
                    </div>
                    <span class="apv-badge" style="${TYPE_STYLE[t.type]}">${TYPE_LABEL[t.type]}</span>
                  </div>
                  <div class="jobs-card-row"><span>버전</span><strong>${t.version}</strong></div>
                  <div class="jobs-card-row"><span>파트너사</span><strong>${partnerNames}</strong></div>
                  <div class="jobs-card-row"><span>근무지</span><strong style="font-size:12px;">${siteNames}</strong></div>
                  <div class="jobs-card-row"><span>사용 중 공고</span><strong style="color:${t.inUse>0?'#2563EB':'#6B7684'};">${t.inUse}건</strong></div>
                  <div class="jobs-card-row"><span>업로드</span><strong style="font-size:11px; color:#6B7684;">${t.uploadedAt} · ${t.uploadedBy}</strong></div>
                  <div class="jobs-card-foot">
                    <button onclick="window.__tplPreview('${t.id}')">미리보기</button>
                    <button onclick="window.__tplNewVersion('${t.id}')">새 버전</button>
                    <button onclick="window.__tplDelete('${t.id}')" style="color:#EF4444;">삭제</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>`
      }

      <div class="ws-warn-box" style="margin-top: 14px;">
        ℹ 새 버전 업로드 시 이전 버전은 <strong>자동 보관</strong>됩니다. 이미 등록된 공고는 기존 버전 계약서를 유지하며, 이후 등록 공고부터 새 버전이 적용됩니다.
      </div>
    `;
  }

  window.__tplFilter = function(val) { tplState.filter = val; renderJobsTemplate(); };
  window.__tplUpload = function() {
    const partnerOpts = Object.keys(worksites).map(k => ({ value: k, label: worksites[k].name }));
    promptModal({
      title: '+ 새 템플릿 업로드',
      subtitle: '실제 앱에서는 PDF 파일 드래그 앤 드롭 업로드 UI 제공',
      fields: [
        { key: 'name', label: '이름', type: 'text', required: true, placeholder: '예: CJ 안성 신규 안전교육 v1' },
        { key: 'type', label: '유형', type: 'select', required: true, value: 'contract',
          options: [{value:'contract',label:'근로계약서'},{value:'safety',label:'안전교육'}] },
        { key: 'partner', label: '파트너사', type: 'text', required: true,
          placeholder: 'cj,lotte (쉼표 구분)', hint: '복수 적용 시 쉼표로 · 사용 가능: ' + Object.keys(worksites).join(', ') },
      ],
      submitLabel: '업로드',
      onSubmit: (vals) => {
        const partnerKeys = vals.partner.split(',').map(s => s.trim()).filter(k => worksites[k]);
        if (partnerKeys.length === 0) { alert('유효한 파트너사 키를 입력해주세요.'); return false; }
        const id = 't' + String(templates.length + 1).padStart(3, '0');
        templates.push({
          id, type: vals.type, name: vals.name,
          partnerKeys, siteIds: [],
          version: 'v1.0',
          uploadedAt: TODAY,
          fileName: vals.name.replace(/\s+/g, '_').toLowerCase() + '_v10.pdf',
          fileSize: Math.floor(Math.random() * 2000) + 'KB',
          inUse: 0,
          uploadedBy: '테스트(마스터)',
        });
        alert('템플릿 "' + vals.name + '" 업로드 완료.\n\n(실제 앱에서는 PDF 파일 드래그 앤 드롭 업로드 UI 제공)');
        renderJobsTemplate();
      },
    });
  };
  window.__tplPreview = function(id) {
    const t = findTemplate(id); if (!t) return;
    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay';
    overlay.innerHTML = `
      <div class="jf-modal" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">📄 ${t.fileName}</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div style="padding: 24px; background: #F9FAFB; border-radius: 8px; border: 0.5px solid rgba(0,0,0,0.08); min-height: 300px;">
            <div style="text-align:center; font-size:18px; font-weight:500; margin-bottom:18px;">${t.name}</div>
            <div style="text-align:center; color:#9CA3AF; font-size: 12px; padding: 60px 0;">
              📄 PDF 미리보기 영역<br><br>
              실제 앱에서는 Supabase Storage에 저장된<br>PDF 파일이 iframe/viewer로 렌더링됩니다.<br><br>
              <span style="font-family:'SF Mono',Monaco,monospace; color:#6B7684;">${t.fileName} (${t.fileSize})</span>
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top: 14px;">
            <button onclick="alert('다운로드는 실제 앱에서 구현')" style="flex:1;">다운로드</button>
            <button class="btn-primary" onclick="this.closest('.jf-modal-overlay').remove()" style="flex:1;">닫기</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };
  window.__tplNewVersion = function(id) {
    const t = findTemplate(id); if (!t) return;
    if (!confirm(`"${t.name}" 의 새 버전을 업로드합니다.\n현재 버전 ${t.version}은 자동 보관되며, 기존 공고에 계속 적용됩니다. 계속하시겠습니까?`)) return;
    const parts = t.version.replace('v', '').split('.');
    const newVer = 'v' + parts[0] + '.' + (parseInt(parts[1]) + 1);
    t.version = newVer;
    t.uploadedAt = TODAY;
    t.uploadedBy = '테스트(마스터)';
    alert(`"${t.name}" ${newVer} 로 업데이트 완료.\n\n이후 등록되는 공고부터 새 버전이 적용됩니다.`);
    renderJobsTemplate();
  };
  window.__tplDelete = function(id) {
    const t = findTemplate(id); if (!t) return;
    if (t.inUse > 0) { alert(`이 템플릿을 사용 중인 공고가 ${t.inUse}건 있습니다.\n먼저 공고들을 종료하거나 다른 템플릿으로 교체해주세요.`); return; }
    if (!confirm(`"${t.name}" 템플릿을 삭제합니다. 계속하시겠습니까?`)) return;
    const idx = templates.indexOf(t); if (idx >= 0) templates.splice(idx, 1);
    alert('템플릿 삭제 완료.');
    renderJobsTemplate();
  };

  // 공고 관리 전역 핸들러
  window.__jobsTab = function(id) { jobsState.tab = id; renderJobs(); };
  // __jobsView 는 v0.6 토글 유지용 (현재는 항상 분할 뷰) — 외부 호출 호환
  window.__jobsView = function() { renderJobsList(); };
  window.__jobsFilter = function(key, val) {
    jobsState[key] = val;
    if (key === 'partnerKey') jobsState.siteId = ''; // 파트너사 바뀌면 근무지 리셋
    renderJobsList();
  };
  window.__jobsClearFilter = function() {
    jobsState.partnerKey = ''; jobsState.siteId = ''; jobsState.status = ''; jobsState.slot = '';
    renderJobsList();
  };
  window.__jobsCalMove = function(dir) {
    if (dir === 0) {
      const t = new Date(TODAY);
      jobsState.calYear = t.getFullYear();
      jobsState.calMonth = t.getMonth() + 1;
    } else {
      jobsState.calMonth += dir;
      if (jobsState.calMonth < 1) { jobsState.calMonth = 12; jobsState.calYear--; }
      if (jobsState.calMonth > 12) { jobsState.calMonth = 1; jobsState.calYear++; }
    }
    renderJobsList();
  };
  window.__jobsDetail = function(id) { renderJobDetail(id); };

  // ─── 외부 구인 인원 관리 ────────────────────────────────
  // 관리자가 앱 외부에서 개별 연락으로 채운 인원 · 포인트/경고/협의대상 시스템 적용 X
  const extFormState = { jobId: null };

  window.__extAdd = function(jobId) {
    extFormState.jobId = jobId;
    showExtAddModal();
  };

  function showExtAddModal() {
    document.querySelectorAll('.jf-modal-overlay.ext-add').forEach(el => el.remove());
    const j = findJob(extFormState.jobId); if (!j) return;
    const site = findSite(j.siteId);
    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay ext-add';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 480px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">🏷 외부 구인 인원 추가</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div style="background:#F0FDFA; padding:10px 12px; border-radius:8px; font-size:11px; color:#0F766E; margin-bottom:14px; line-height:1.6;">
            <strong>${site.site.name}</strong> · ${j.date} ${j.slot} ${j.start}~${j.end}<br>
            앱을 통하지 않고 직접 연락으로 구인한 인원을 등록합니다. 포인트 지급·경고·협의대상 시스템은 적용되지 않습니다.
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">이름<span class="req">*</span></div>
            <input type="text" id="ext-name" placeholder="실명 입력" style="max-width:220px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">전화번호<span class="req">*</span></div>
            <input type="tel" id="ext-phone" placeholder="010-XXXX-XXXX" style="max-width:220px;" />
          </div>
          <div class="jf-form-row top">
            <div class="jf-form-label">메모 <span style="font-size:11px; color:#6B7684; font-weight:400;">(선택)</span></div>
            <input type="text" id="ext-note" placeholder="예: 사장님 지인 소개 · 현장 요청 등" />
          </div>
          <div style="display:flex; gap:8px; margin-top: 20px; padding-top:14px; border-top: 0.5px solid rgba(0,0,0,0.08); justify-content:flex-end;">
            <button onclick="this.closest('.jf-modal-overlay').remove()">취소</button>
            <button class="btn-primary" onclick="window.__extAddSubmit()">추가</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('ext-name')?.focus(), 50);
  }

  window.__extAddSubmit = function() {
    const j = findJob(extFormState.jobId); if (!j) return;
    const name  = (document.getElementById('ext-name')?.value || '').trim();
    const phone = (document.getElementById('ext-phone')?.value || '').trim();
    const note  = (document.getElementById('ext-note')?.value || '').trim();
    if (!name)  { alert('이름을 입력하세요.'); return; }
    if (!phone) { alert('전화번호를 입력하세요.'); return; }
    if (!/^[\d\-\s]{9,}$/.test(phone)) { alert('전화번호 형식을 확인하세요.'); return; }
    addExternalWorker(j.id, name, phone, note, '테스트(마스터)');
    document.querySelector('.jf-modal-overlay.ext-add')?.remove();
    renderJobDetail(j.id);
  };

  window.__extToggleAttended = function(jobId, extId) {
    if (toggleExternalAttended(jobId, extId)) renderJobDetail(jobId);
  };

  window.__extRemove = function(jobId, extId) {
    const j = findJob(jobId); if (!j || !j.externalWorkers) return;
    const ex = j.externalWorkers.find(e => e.id === extId); if (!ex) return;
    if (!confirm(`${ex.name} 님을 외부 구인 인원에서 삭제합니다.\n출결 기록도 함께 사라집니다.`)) return;
    if (removeExternalWorker(jobId, extId)) renderJobDetail(jobId);
  };

  // 수동 구인 완료 취소 — 공고를 다시 모집중으로 되돌림
  window.__jobRecruitReopen = function(jobId) {
    const j = findJob(jobId); if (!j) return;
    const site = findSite(j.siteId);
    if (!confirm(`${site.site.name} 공고의 수동 구인 완료를 취소하고 모집중 상태로 되돌립니다.\n\n계속하시겠습니까?`)) return;
    setRecruitClosed(jobId, false);
    renderJobDetail(j.id);
  };
  window.__jobEdit = function(id) { renderJobEdit(id); };
  window.__jobsCalDay = function(dateStr) {
    // 같은 날짜 다시 클릭 시 토글로 해제
    if (jobsState.selectedDate === dateStr) {
      jobsState.selectedDate = '';
    } else {
      jobsState.selectedDate = dateStr;
    }
    renderJobsList();
  };
  window.__jobsClearDate = function() {
    jobsState.selectedDate = '';
    renderJobsList();
  };

  window.__wsToggle = function(key) {
    const el = document.querySelector('.ws-partner[data-partner="' + key + '"]');
    if (el) el.classList.toggle('open');
  };
  window.__wsDetail = function(id) { renderDetail(id); };
  window.__wsGps = function(id) { renderGpsEditor(id); };
  window.__wsBack = function() { renderList(); };

  // N17 — 통근버스 탑승 가이드 (택배 허브 대상)
  // 실제 경로 데이터는 아직 없음 · 프로토타입용 시뮬 경로
  const BUS_GUIDES = {
    gonjiam:   { origin: '판교역 7번 출구', dep: '06:00', arr: '06:45', stops: ['판교역', '분당수서IC', '광주JC', '곤지암 허브'], contact: '010-1234-0001' },
    yongin:    { origin: '강남역 10번 출구', dep: '06:15', arr: '07:00', stops: ['강남역', '양재IC', '경부고속도로', '용인 허브'], contact: '010-1234-0002' },
    gunpo_a:   { origin: '금정역 2번 출구', dep: '06:30', arr: '07:00', stops: ['금정역', '군포IC', '부곡동'], contact: '010-1234-0003' },
    gunpo_b:   { origin: '금정역 2번 출구', dep: '06:30', arr: '07:05', stops: ['금정역', '금정동'], contact: '010-1234-0004' },
    icheon:    { origin: '판교역 7번 출구', dep: '05:45', arr: '06:50', stops: ['판교역', '곤지암IC', '이천IC', '부발 허브'], contact: '010-1234-0005' },
    anseong:   { origin: '수원역 5번 출구', dep: '06:00', arr: '07:10', stops: ['수원역', '동탄IC', '안성IC', '공도 허브'], contact: '010-1234-0006' },
    jincheon:  { origin: '오송역 1번 출구', dep: '06:30', arr: '07:15', stops: ['오송역', '청주IC', '진천IC', '이월 허브'], contact: '010-1234-0007' },
    namyangju: { origin: '도농역 2번 출구', dep: '06:15', arr: '07:00', stops: ['도농역', '가평IC', '화도읍'], contact: '010-1234-0008' },
    gunpo_l:   { origin: '금정역 4번 출구', dep: '06:30', arr: '07:00', stops: ['금정역', '당정동'], contact: '010-1234-0009' },
  };
  const SUBWAY_GUIDES = {
    ltower: { station: '삼성역', line: '2호선', exit: '4번', walk: '도보 8분', detail: '4번 출구 → 직진 300m → 우측 L타워 로비' },
    whills: { station: '서초역', line: '2호선', exit: '6번', walk: '도보 5분', detail: '6번 출구 → 서초대로 방향 150m → W힐스 입구' },
  };

  window.__wsBusGuide = function(siteId) {
    const found = findSite(siteId); if (!found) return;
    const g = BUS_GUIDES[siteId];
    if (!g) { alert('해당 근무지의 버스 가이드 데이터가 등록되지 않았습니다.'); return; }
    showTransitGuideModal({
      kind: 'bus',
      title: `🚌 ${found.site.name} · 통근버스 탑승 가이드`,
      site: found,
      data: g,
    });
  };
  window.__wsSubwayGuide = function(siteId) {
    const found = findSite(siteId); if (!found) return;
    const g = SUBWAY_GUIDES[siteId];
    if (!g) { alert('해당 근무지의 지하철 가이드 데이터가 등록되지 않았습니다.'); return; }
    showTransitGuideModal({
      kind: 'subway',
      title: `🚇 ${found.site.name} · 지하철 경로 가이드`,
      site: found,
      data: g,
    });
  };

  function showTransitGuideModal({ kind, title, site, data }) {
    document.querySelectorAll('.jf-modal-overlay.transit-guide').forEach(el => el.remove());
    const nowH = new Date().getHours(), nowM = new Date().getMinutes();
    const timeStr = String(nowH).padStart(2,'0') + ':' + String(nowM).padStart(2,'0');

    const phoneBody = kind === 'bus' ? `
      <div style="background:#EFF6FF; padding:14px; border-radius:10px; margin-bottom:10px;">
        <div style="font-size:10px; color:#1E40AF; font-weight:500;">🚌 통근버스</div>
        <div style="font-size:13px; color:#111827; font-weight:600; margin-top:4px;">${data.origin} → ${site.site.name}</div>
        <div style="display:flex; justify-content:space-between; margin-top:10px;">
          <div>
            <div style="font-size:10px; color:#6B7684;">출발</div>
            <div style="font-size:14px; font-weight:600; color:#2563EB; font-family:'SF Mono',Monaco,monospace;">${data.dep}</div>
          </div>
          <div style="align-self:center; color:#9CA3AF;">→</div>
          <div style="text-align:right;">
            <div style="font-size:10px; color:#6B7684;">도착</div>
            <div style="font-size:14px; font-weight:600; color:#111827; font-family:'SF Mono',Monaco,monospace;">${data.arr}</div>
          </div>
        </div>
      </div>
      <div class="app-section-title">경로</div>
      <div class="app-card">
        ${data.stops.map((st, i) => `
          <div style="display:flex; align-items:center; gap:10px; padding: 5px 0;">
            <div style="width:20px; height:20px; border-radius:50%; background:${i===0?'#2563EB':i===data.stops.length-1?'#22C55E':'#E5E7EB'}; color:${i===0||i===data.stops.length-1?'#fff':'#6B7684'}; font-size:10px; display:flex; align-items:center; justify-content:center; font-weight:600;">${i+1}</div>
            <div style="flex:1; font-size:11px; color:#111827; ${i===0||i===data.stops.length-1?'font-weight:600;':''}">${st}</div>
          </div>
          ${i < data.stops.length-1 ? '<div style="width:1px; height:12px; background:#E5E7EB; margin-left:10px;"></div>' : ''}
        `).join('')}
      </div>
      <div class="app-section-title">탑승 안내</div>
      <div class="app-card" style="font-size:10px; color:#6B7684; line-height:1.6;">
        • 출발 5분 전까지 도착<br>
        • 신분증 없이 <b>잡핏 앱 QR</b>로 탑승 확인<br>
        • 지각·불참 시 통근버스 담당에게 연락
      </div>
      <button style="background:#2563EB; color:#fff; border:none; border-radius:8px; padding:10px; font-size:11px; width:100%; margin-top:8px; font-weight:500;">📞 담당자 ${data.contact}</button>
    ` : `
      <div style="background:#F3E8FF; padding:14px; border-radius:10px; margin-bottom:10px;">
        <div style="font-size:10px; color:#6B21A8; font-weight:500;">🚇 가장 가까운 역</div>
        <div style="font-size:13px; color:#111827; font-weight:600; margin-top:4px;">${data.station} (${data.line})</div>
        <div style="font-size:11px; color:#6B7684; margin-top:6px;">${data.exit} 출구 · ${data.walk}</div>
      </div>
      <div class="app-section-title">상세 경로</div>
      <div class="app-card" style="font-size:11px; color:#374151; line-height:1.8;">
        ${data.detail}
      </div>
      <div class="app-section-title">참고</div>
      <div class="app-card" style="font-size:10px; color:#6B7684; line-height:1.6;">
        • 웨딩홀 공고는 <b>통근버스 운영 없음</b><br>
        • 도착 시간 여유있게 (30분 전 권장)<br>
        • 길 찾기는 카카오맵/네이버지도 연동
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay transit-guide';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 780px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">${title}</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="mobile-preview-wrap">
            <div class="mobile-frame">
              <div class="mobile-screen">
                <div class="mobile-status-bar"><span class="mp-time">${timeStr}</span><span class="mp-icons">📶 📡 🔋</span></div>
                <div class="mobile-app-header">
                  <div class="mobile-app-header-title">${kind === 'bus' ? '통근버스 가이드' : '지하철 가이드'}</div>
                  <div class="mobile-app-header-sub">${site.site.name}</div>
                </div>
                <div class="mobile-app-body">${phoneBody}</div>
                <div class="mobile-home-ind"></div>
              </div>
            </div>
            <div class="mobile-preview-info">
              <h4>${kind === 'bus' ? '통근버스 가이드 (관리자 참고)' : '지하철 경로 가이드 (관리자 참고)'}</h4>
              <ul>
                ${kind === 'bus' ? `
                  <li><b>출발지</b> · ${data.origin}</li>
                  <li><b>출발 시각</b> · ${data.dep} → <b>도착</b> ${data.arr}</li>
                  <li><b>경유 정거장</b> · ${data.stops.length}개소</li>
                  <li><b>담당 연락처</b> · ${data.contact}</li>
                ` : `
                  <li><b>가까운 역</b> · ${data.station} (${data.line})</li>
                  <li><b>출구</b> · ${data.exit}</li>
                  <li><b>소요 시간</b> · ${data.walk}</li>
                `}
              </ul>
              <div style="margin-top:12px; padding:10px 12px; background:#F3E8FF; border-radius:8px; font-size:11px; color:#6B21A8;">
                💡 <b>N17 이월 안건</b> — 알바생 앱에서 이 화면을 자동 노출 (공고 상세 → "가이드 보기" 버튼).<br>
                정적 데이터로 시뮬 중 · 실제 구현 시 카카오맵/네이버지도 API 연동 검토
              </div>
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:14px; padding-top:14px; border-top: 0.5px solid rgba(0,0,0,0.08); justify-content:flex-end;">
            <button class="btn-primary" onclick="this.closest('.jf-modal-overlay').remove()">닫기</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  window.__partnerAdd = function() { renderPartnerForm('add'); };
  window.__partnerEdit = function(key) { renderPartnerForm('edit', key); };

  // 근무지 정보 수정 모달
  const siteEditState = { siteId: null };
  window.__wsEditInfo = function(siteId) {
    const found = findSite(siteId); if (!found) return;
    siteEditState.siteId = siteId;
    renderSiteEditModal();
  };
  // 근무지 필드 세팅 (string/number/boolean 구분)
  window.__wsSetField = function(siteId, field, val, kind) {
    const found = findSite(siteId); if (!found) return;
    if (kind === 'number') found.site[field] = parseInt(val) || 0;
    else if (kind === 'bool') found.site[field] = val;
    else found.site[field] = val;
  };
  window.__wsToggleBus = function(siteId, checked) {
    const found = findSite(siteId); if (!found) return;
    found.site.bus = checked;
    renderSiteEditModal();
  };
  function renderSiteEditModal() {
    document.querySelectorAll('.jf-modal-overlay.site-edit').forEach(el => el.remove());
    const found = findSite(siteEditState.siteId); if (!found) return;
    const s = found.site;

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay site-edit';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 560px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">근무지 정보 수정 <span style="font-size:12px; color:#6B7684; font-weight:400; margin-left:6px;">${found.partner}</span></div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="jf-form-row">
            <div class="jf-form-label">근무지명<span class="req">*</span></div>
            <input type="text" value="${s.name}" oninput="window.__wsSetField('${s.id}','name',this.value)" style="max-width:260px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">주소<span class="req">*</span></div>
            <input type="text" value="${s.addr}" oninput="window.__wsSetField('${s.id}','addr',this.value)" style="max-width:360px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">GPS 좌표</div>
            <div style="font-family:'SF Mono',Monaco,monospace; font-size:12px; color:#6B7684;">${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}
              <span class="jf-form-hint" style="display:block; margin-top:4px;">영역 수정은 "GPS 영역 편집"에서 진행</span>
            </div>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">기본 알바비<span class="req">*</span></div>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="number" value="${s.wage}" step="1000" onchange="window.__wsSetField('${s.id}','wage',this.value,'number')" style="width:140px;" />
              <span style="font-size:13px; color:#6B7684;">원 (공고 등록 시 조정 가능)</span>
            </div>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">주휴수당 조건</div>
            <input type="text" value="${s.holiday}" onchange="window.__wsSetField('${s.id}','holiday',this.value)" style="max-width:260px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">통근버스</div>
            <label class="jf-toggle">
              <input type="checkbox" ${s.bus?'checked':''} onchange="window.__wsToggleBus('${s.id}', this.checked)">
              <span class="jf-toggle-switch"></span>
              <span class="jf-toggle-text">운영 중${s.bus ? '' : ' (미운영)'}</span>
            </label>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">대표 연락처<span class="req">*</span></div>
            <input type="tel" value="${s.contact}" onchange="window.__wsSetField('${s.id}','contact',this.value)" style="max-width:220px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">관리자 1등급 담당</div>
            <input type="text" value="${s.manager1 || ''}" onchange="window.__wsSetField('${s.id}','manager1',this.value)" style="max-width:220px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">관리자 2등급 담당</div>
            <input type="text" value="${s.manager2 || ''}" onchange="window.__wsSetField('${s.id}','manager2',this.value)" style="max-width:220px;" />
          </div>
          <div style="display:flex; gap:8px; margin-top: 20px; padding-top:14px; border-top:0.5px solid rgba(0,0,0,0.08);">
            <button onclick="this.closest('.jf-modal-overlay').remove()">취소</button>
            <div style="flex:1;"></div>
            <button class="btn-primary" onclick="window.__wsEditSave()">저장</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  window.__wsEditSave = function() {
    alert('근무지 정보 저장 완료.');
    document.querySelectorAll('.jf-modal-overlay.site-edit').forEach(el => el.remove());
    renderDetail(siteEditState.siteId);
  };
  window.__wsDelete = function(siteId) {
    const found = findSite(siteId); if (!found) return;
    const s = found.site;
    const activeJobsCount = jobs.filter(j => j.siteId === siteId && ['open','closed','progress'].includes(jobStatus(j))).length;
    if (activeJobsCount > 0) {
      alert(`"${s.name}"을 삭제할 수 없습니다.\n진행 중 또는 모집 중인 공고가 ${activeJobsCount}건 있습니다.\n\n먼저 해당 공고들을 종료하거나 삭제해주세요.`);
      return;
    }
    if (!confirm(`"${s.name}" 근무지를 삭제합니다.\n\n• 과거 공고/근무 이력은 유지됩니다\n• GPS 영역 데이터는 삭제됩니다\n• 이 작업은 되돌릴 수 없습니다\n\n계속하시겠습니까?`)) return;
    // worksites에서 제거
    const partnerKey = found.partnerKey;
    worksites[partnerKey].sites = worksites[partnerKey].sites.filter(x => x.id !== siteId);
    worksites[partnerKey].count = worksites[partnerKey].sites.length;
    alert('삭제 완료.');
    renderList();
  };

  // ───────────────────────────────────────────────────────
  // 대기열 시스템
  // ───────────────────────────────────────────────────────
  let _waitlistTimersInitialized = false;
  let _waitlistTickerStarted = false;

  function initWaitlistTimers() {
    if (_waitlistTimersInitialized) return;
    _waitlistTimersInitialized = true;
    const now = Date.now();
    waitlist.forEach(w => {
      if (w.status === 'pending_accept' && w._initialRemainingSec) {
        w.offeredAt = now;
        w.offerDeadline = now + w._initialRemainingSec * 1000;
        delete w._initialRemainingSec;
      }
    });
  }

  function formatRemaining(ms) {
    if (ms <= 0) return '00:00';
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // 수락 제한시간 산정 — 24h+ 남음 → 2시간 / 24h 이내 → 30분
  function getOfferDurationMs(job) {
    const workStart = new Date(job.date + 'T' + job.start + ':00').getTime();
    const hoursUntilWork = (workStart - Date.now()) / 3600000;
    return hoursUntilWork > 24 ? 2 * 3600000 : 30 * 60000;
  }

  function maxWaitCap(job) { return job ? job.cap * 2 : 0; }
  function currentWaitCount(jobId) { return waitlist.filter(w => w.jobId === jobId && ['waiting','pending_accept'].includes(w.status)).length; }
  function nextWaitOrder(jobId) {
    const max = waitlist.filter(w => w.jobId === jobId).reduce((m, w) => Math.max(m, w.order || 0), 0);
    return max + 1;
  }

  // 다음 대기자에게 자리 제안 · 없으면 공고 REOPENED
  function offerNextSeat(jobId) {
    const j = findJob(jobId); if (!j) return null;
    const candidates = waitlist
      .filter(w => w.jobId === jobId && w.status === 'waiting')
      .sort((a, b) => a.order - b.order);
    if (candidates.length === 0) {
      j.reopened = true; // 다시 일반 모집
      return null;
    }
    const w = candidates[0];
    w.status = 'pending_accept';
    w.offeredAt = Date.now();
    w.offerDeadline = Date.now() + getOfferDurationMs(j);
    return w;
  }

  function handleAcceptOffer(wlId) {
    const w = findWl(wlId); if (!w || w.status !== 'pending_accept') return;
    const j = findJob(w.jobId); if (!j) return;
    w.status = 'accepted';
    w.respondedAt = formatNow();
    j.apply = Math.min(j.cap, j.apply + 1);
    j.reopened = false;
    const worker = findWorker(w.workerId);
    alert(`${worker?.name || ''} 님이 자리 수락 → 확정 완료 (시뮬레이션)\n\n공고 모집 상태: ${j.apply}/${j.cap}`);
  }

  // byUser=true면 알바생이 직접 거절, false면 시간초과 자동거절
  function handleRejectOffer(wlId, byUser) {
    const w = findWl(wlId); if (!w || w.status !== 'pending_accept') return;
    w.status = byUser ? 'declined' : 'auto_rejected';
    w.respondedAt = formatNow();
    // 다음 대기자에게 자동 제안
    offerNextSeat(w.jobId);
  }

  // 시뮬레이션: 확정자 1명 취소 → 대기열 가동
  function simulateCancellation(jobId) {
    const j = findJob(jobId); if (!j) return;
    if (j.apply <= 0) { alert('취소할 확정자가 없습니다.'); return; }
    j.apply = j.apply - 1;
    // 대기자가 있으면 자동 제안
    const w = offerNextSeat(jobId);
    if (w) {
      const worker = findWorker(w.workerId);
      alert(`[시뮬레이션] 확정자 1명 취소\n→ 대기 1번 ${worker?.name} 님에게 자리 제안 (타이머 시작)`);
    } else {
      alert('[시뮬레이션] 확정자 1명 취소\n→ 대기자 없음 → 일반 모집 재개 (REOPENED)');
    }
  }

  function formatNow() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' +
           String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  // 전역 1초 타이머 — 만료 체크 + 타이머 UI 업데이트
  function startWaitlistTicker() {
    if (_waitlistTickerStarted) return;
    _waitlistTickerStarted = true;
    setInterval(() => {
      const now = Date.now();
      let anyExpired = false;

      // 만료 체크
      waitlist.forEach(w => {
        if (w.status === 'pending_accept' && w.offerDeadline && now >= w.offerDeadline) {
          handleRejectOffer(w.id, false);
          anyExpired = true;
        }
      });

      // 타이머 텍스트 업데이트 (경량)
      document.querySelectorAll('[data-wl-timer]').forEach(el => {
        const id = el.getAttribute('data-wl-timer');
        const w = findWl(id);
        if (!w || !w.offerDeadline || w.status !== 'pending_accept') return;
        const remaining = Math.max(0, w.offerDeadline - now);
        el.textContent = formatRemaining(remaining);
        if (remaining < 10 * 60000) el.classList.add('urgent');
        else el.classList.remove('urgent');
      });

      // 원형 프로그레스 업데이트
      document.querySelectorAll('[data-wl-ring]').forEach(el => {
        const id = el.getAttribute('data-wl-ring');
        const w = findWl(id);
        if (!w || !w.offerDeadline || !w.offeredAt || w.status !== 'pending_accept') return;
        const total = w.offerDeadline - w.offeredAt;
        const remaining = Math.max(0, w.offerDeadline - now);
        const progress = total > 0 ? remaining / total : 0;
        const circ = parseFloat(el.getAttribute('data-circ') || '0');
        el.setAttribute('stroke-dashoffset', (1 - progress) * circ);
        if (remaining < 10 * 60000) el.classList.add('urgent');
        else el.classList.remove('urgent');
      });

      // 상태 변경이 있었으면 해당 페이지 재렌더
      if (anyExpired) {
        if (document.querySelector('.wl-page-marker')) renderJobsWaitlist();
        const detailMarker = document.querySelector('.wl-detail-marker');
        if (detailMarker) {
          const jid = detailMarker.getAttribute('data-job-id');
          if (jid) renderJobDetail(jid);
        }
        // 홈 대시보드 재렌더는 생략 (사용자가 이동하면 자동 갱신)
      }
    }, 1000);
  }

  // 원형 타이머 SVG 생성
  function renderTimerRing(wlId, size) {
    size = size || 56;
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const w = findWl(wlId);
    const remaining = w && w.offerDeadline ? Math.max(0, w.offerDeadline - Date.now()) : 0;
    const total = w && w.offerDeadline && w.offeredAt ? w.offerDeadline - w.offeredAt : 1;
    const progress = remaining / total;
    const urgent = remaining < 10 * 60000;
    return `
      <div class="wl-timer-wrap" style="width:${size}px; height:${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle class="wl-ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
          <circle class="wl-ring-fill ${urgent?'urgent':''}" cx="${size/2}" cy="${size/2}" r="${r}"
            stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${((1-progress)*circ).toFixed(2)}"
            data-wl-ring="${wlId}" data-circ="${circ.toFixed(2)}"/>
        </svg>
        <div class="wl-timer-text ${urgent?'urgent':''}" data-wl-timer="${wlId}">${formatRemaining(remaining)}</div>
      </div>
    `;
  }

  // 공고 관리 대기열 탭 렌더
  function renderJobsWaitlist() {
    // 대기자가 있는 공고 그룹핑
    const jobIds = [...new Set(waitlist.map(w => w.jobId))];
    const grouped = jobIds.map(jid => {
      const j = findJob(jid);
      if (!j) return null;
      const entries = waitlist.filter(w => w.jobId === jid).sort((a, b) => a.order - b.order);
      return { job: j, entries };
    }).filter(Boolean).sort((a, b) => a.job.date.localeCompare(b.job.date));

    // 메트릭
    const totalWaiting = waitlist.filter(w => w.status === 'waiting').length;
    const totalPending = waitlist.filter(w => w.status === 'pending_accept').length;
    const reopenedCount = jobs.filter(j => j.reopened).length;
    const fullJobs = jobs.filter(j => ['closed','progress'].includes(jobStatus(j)) && j.apply >= j.cap).length;

    let html = `
      <span class="wl-page-marker" style="display:none;"></span>
      <div class="jf-header">
        <div>
          <div class="jf-title">대기열 승인</div>
          <div class="jf-subtitle">FULL 공고 대기열 · 자리 제안 타이머 · REOPENED 관리</div>
        </div>
      </div>

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">대기 중</div><div class="jf-metric-value">${totalWaiting}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">순번만 받은 상태</div></div>
        <div class="jf-metric"><div class="jf-metric-label">수락 대기 중</div><div class="jf-metric-value" style="color:${totalPending>0?'#F59E0B':'#111827'};">${totalPending}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명</span></div><div class="jf-metric-hint">타이머 실행 중</div></div>
        <div class="jf-metric"><div class="jf-metric-label">REOPENED</div><div class="jf-metric-value" style="color:${reopenedCount>0?'#EF4444':'#16A34A'};">${reopenedCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">대기열 소진 후 재모집</div></div>
        <div class="jf-metric"><div class="jf-metric-label">FULL 공고</div><div class="jf-metric-value">${fullJobs}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">모집 완료 상태</div></div>
      </div>

      <div class="ws-warn-box" style="background:#F0F9FF; color:#1E40AF; border-left-color:#2563EB;">
        ℹ 자리 제안 수락 제한시간: 근무 <strong>24h 전</strong> 신청은 <strong>2시간</strong>, <strong>24h 이내</strong>는 <strong>30분</strong>. 시간 초과 시 자동 거절 → 다음 대기자에게 이관.
      </div>
    `;

    if (grouped.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">🪑</div><div class="jf-placeholder-title">대기열이 비어있습니다</div><div class="jf-placeholder-desc">FULL 공고에 알바생이 대기 신청하면 여기에 표시됩니다.</div></div>`;
    } else {
      grouped.forEach(({ job, entries }) => {
        const site = findSite(job.siteId);
        const activeCount = entries.filter(e => ['waiting','pending_accept'].includes(e.status)).length;
        const capBadge = job.apply >= job.cap ? `<span class="wl-badge">FULL ${job.apply}/${job.cap}</span>` : `<span class="wl-badge" style="background:#DBEAFE; color:#1E40AF;">모집 중 ${job.apply}/${job.cap}</span>`;
        const reopenedBadge = job.reopened ? '<span class="wl-reopened">REOPENED</span>' : '';

        html += `
          <div class="wl-group">
            <div class="wl-group-head">
              <div style="flex:1;">
                <div class="wl-group-title">
                  ${site.site.name}
                  ${capBadge}
                  ${reopenedBadge}
                </div>
                <div class="wl-group-sub">${site.partner} · ${job.date} · ${job.slot} ${job.start}~${job.end} · 대기 한도 ${currentWaitCount(job.id)}/${maxWaitCap(job)}명</div>
              </div>
              <div style="display:flex; gap:6px;">
                <button onclick="window.__wlSimCancel('${job.id}')" style="font-size:11px; padding:5px 10px; height:auto;" title="확정자 1명 취소 시뮬레이션">▶ 시뮬: 취소 1명</button>
                <button onclick="window.__jobsDetail('${job.id}')" style="font-size:11px; padding:5px 10px; height:auto;">공고 상세 →</button>
              </div>
            </div>
            <div class="wl-group-body">
              ${entries.map(e => renderWaitlistRow(e)).join('')}
            </div>
          </div>
        `;
      });
    }

    main.innerHTML = html;
  }

  function renderWaitlistRow(entry) {
    const w = findWorker(entry.workerId);
    if (!w) return '';
    const STATUS_LBL = {
      waiting: '대기 중',
      pending_accept: '수락 대기 중',
      accepted: '수락 완료',
      auto_rejected: '시간 초과 · 자동 거절',
      declined: '거절',
    };
    const orderCls = entry.order === 1 ? 'order1' : (entry.status === 'pending_accept' ? 'pending' : '');

    let centerCell = '';
    if (entry.status === 'pending_accept' && entry.offerDeadline) {
      centerCell = `
        <div style="display:flex; gap:10px; align-items:center;">
          ${renderTimerRing(entry.id, 48)}
          <div style="font-size:11px; color:#6B7684;">
            <div>제안 ${entry.offeredAt ? new Date(entry.offeredAt).toTimeString().slice(0,5) : '-'}</div>
            <div>기한 <strong style="color:#F59E0B;">${formatRemaining(Math.max(0, entry.offerDeadline - Date.now()))}</strong> 남음</div>
          </div>
        </div>
      `;
    } else if (entry.status === 'accepted') {
      centerCell = `<span style="font-size:11px; color:#16A34A;">✓ ${entry.respondedAt}</span>`;
    } else if (['declined','auto_rejected'].includes(entry.status)) {
      centerCell = `<span style="font-size:11px; color:#6B7684;">${entry.respondedAt || '-'}</span>`;
    } else {
      centerCell = `<span style="font-size:11px; color:#6B7684;">대기 중</span>`;
    }

    let actionCell = '';
    if (entry.status === 'pending_accept') {
      actionCell = `
        <div style="display:flex; gap:4px;">
          <button class="btn-approve" onclick="window.__wlAccept('${entry.id}')" style="font-size:11px; height:30px; padding:0 12px;">수락</button>
          <button class="btn-reject" onclick="window.__wlDecline('${entry.id}')" style="font-size:11px; height:30px; padding:0 12px;">거절</button>
        </div>
      `;
    } else if (entry.status === 'waiting') {
      actionCell = `<button onclick="window.__wlOfferNow('${entry.id}')" style="font-size:11px; height:30px; padding:0 10px;" title="이 대기자에게 바로 자리 제안">제안</button>`;
    } else {
      actionCell = `<span style="font-size:11px; color:#9CA3AF;">-</span>`;
    }

    return `
      <div class="wl-row ${entry.status}">
        <div class="wl-order ${orderCls}">${entry.order}</div>
        <div>
          <div style="font-weight:500;">${w.name}
            ${w.negotiation ? '<span class="apv-badge apv-badge-neg" style="font-size:10px; padding:2px 6px; margin-left:4px;">협의대상</span>' : ''}
          </div>
          <div style="font-family:'SF Mono',Monaco,monospace; font-size:11px; color:#6B7684;">${w.phone}</div>
        </div>
        <div style="font-size:12px; color:#6B7684;">
          <div>대기 등록</div>
          <div style="color:#111827;">${entry.joinedAt}</div>
        </div>
        <div>${centerCell}</div>
        <div><span class="wl-status wl-st-${entry.status}">${STATUS_LBL[entry.status]}</span></div>
        <div>${actionCell}</div>
      </div>
    `;
  }

  // 공고 상세에 붙는 대기열 섹션
  function renderJobWaitlistSection(jobId) {
    const j = findJob(jobId); if (!j) return '';
    const entries = waitlist.filter(w => w.jobId === jobId).sort((a, b) => a.order - b.order);
    const active = entries.filter(e => ['waiting','pending_accept'].includes(e.status)).length;
    const pending = entries.filter(e => e.status === 'pending_accept').length;

    return `
      <span class="wl-detail-marker" style="display:none;" data-job-id="${jobId}"></span>
      <div class="jf-panel" style="margin-top: 14px;">
        <div class="ws-section-title" style="display:flex; align-items:center; gap:10px;">
          <span>대기열</span>
          ${entries.length === 0
            ? '<span style="font-size:11px; color:#6B7684; font-weight:400;">대기자 없음</span>'
            : `<span style="font-size:11px; color:#6B7684; font-weight:400;">총 ${entries.length}명 · 활성 ${active}명 · 한도 ${currentWaitCount(j.id)}/${maxWaitCap(j)}</span>`}
          ${pending > 0 ? `<span class="wl-badge wl-badge-pending">수락 대기 중 ${pending}</span>` : ''}
          ${j.reopened ? '<span class="wl-reopened">REOPENED</span>' : ''}
          <div style="margin-left:auto; display:flex; gap:6px;">
            <button onclick="window.__wlSimCancel('${j.id}')" style="font-size:11px; padding:4px 10px; height:auto;" title="확정자 1명이 취소한 것처럼 시뮬레이션">▶ 취소 시뮬</button>
          </div>
        </div>
        ${entries.length === 0
          ? '<div style="padding:20px 0; text-align:center; color:#6B7684; font-size:12px;">이 공고는 아직 대기자가 없습니다.<br><span style="font-size:11px;">FULL 상태에서 알바생이 대기 신청하면 여기에 표시됩니다.</span></div>'
          : '<div style="margin: 0 -18px;">' + entries.map(e => renderWaitlistRow(e)).join('') + '</div>'}
      </div>
    `;
  }

  window.__wlAccept = function(wlId) {
    handleAcceptOffer(wlId);
    // 현재 페이지 재렌더
    if (document.querySelector('.wl-page-marker')) renderJobsWaitlist();
    const dm = document.querySelector('.wl-detail-marker');
    if (dm) renderJobDetail(dm.getAttribute('data-job-id'));
  };
  window.__wlDecline = function(wlId) {
    const w = findWl(wlId); if (!w) return;
    if (!confirm('이 알바생이 자리를 거절한 것으로 처리합니다. (시뮬레이션)\n→ 다음 대기자에게 자동 이관됩니다.')) return;
    handleRejectOffer(wlId, true);
    if (document.querySelector('.wl-page-marker')) renderJobsWaitlist();
    const dm = document.querySelector('.wl-detail-marker');
    if (dm) renderJobDetail(dm.getAttribute('data-job-id'));
  };
  window.__wlOfferNow = function(wlId) {
    const w = findWl(wlId); if (!w) return;
    // 현재 pending_accept 인 사람이 있으면 경고
    const existing = waitlist.find(x => x.jobId === w.jobId && x.status === 'pending_accept');
    if (existing) { alert('이미 수락 대기 중인 대기자가 있습니다. 먼저 그 건을 처리해주세요.'); return; }
    if (w.status !== 'waiting') { alert('대기 중 상태인 알바생에게만 제안 가능합니다.'); return; }
    const j = findJob(w.jobId); if (!j) return;
    // 바로 자리 제안 (시뮬레이션 — 실제는 공석 생겼을 때만)
    if (j.apply >= j.cap) {
      if (!confirm('현재 공고가 FULL 상태입니다. 관리자 임의로 대기자에게 자리를 제안합니다. 계속하시겠습니까?')) return;
      j.apply = Math.max(0, j.apply - 1); // 임의로 자리 하나 비움
    }
    w.status = 'pending_accept';
    w.offeredAt = Date.now();
    w.offerDeadline = Date.now() + getOfferDurationMs(j);
    if (document.querySelector('.wl-page-marker')) renderJobsWaitlist();
    const dm = document.querySelector('.wl-detail-marker');
    if (dm) renderJobDetail(dm.getAttribute('data-job-id'));
  };
  window.__wlSimCancel = function(jobId) {
    if (!confirm('[시뮬레이션] 이 공고의 확정자 1명이 취소한 상황을 재현합니다.\n→ apply 수가 1 줄어들고, 대기자가 있으면 1번에게 자동 자리 제안됩니다.')) return;
    simulateCancellation(jobId);
    if (document.querySelector('.wl-page-marker')) renderJobsWaitlist();
    const dm = document.querySelector('.wl-detail-marker');
    if (dm) renderJobDetail(dm.getAttribute('data-job-id'));
  };

  // ───────────────────────────────────────────────────────
  // 통계 리포트 페이지
  // ───────────────────────────────────────────────────────
  const statsState = {
    view: 'daily',       // daily / monthly / yearly
    period: 'month',     // daily 뷰에서만 사용: week / month / quarter / all
  };

  function statsDateRange() {
    const today = new Date(TODAY);
    let start = new Date(TODAY);
    if (statsState.period === 'week')    start.setDate(today.getDate() - 6);
    if (statsState.period === 'month')   start.setDate(today.getDate() - 29);
    if (statsState.period === 'quarter') start.setDate(today.getDate() - 89);
    if (statsState.period === 'all')     start = new Date('2020-01-01');
    return { startStr: start.toISOString().slice(0,10), endStr: TODAY };
  }

  function renderStats() {
    if (statsState.view === 'monthly') return renderStatsMonthly();
    if (statsState.view === 'yearly')  return renderStatsYearly();
    return renderStatsDaily();
  }

  function statsTabsHtml() {
    const tabs = [
      { id: 'daily',   label: '일별' },
      { id: 'monthly', label: '월별' },
      { id: 'yearly',  label: '연간' },
    ];
    return `<div class="jf-tabs">${tabs.map(t =>
      `<div class="jf-tab ${statsState.view === t.id ? 'active' : ''}" onclick="window.__statsView('${t.id}')">${t.label}</div>`
    ).join('')}</div>`;
  }

  function renderStatsDaily() {
    const { startStr, endStr } = statsDateRange();
    const periodJobs = jobs.filter(j => j.date >= startStr && j.date <= endStr);

    // ─── 핵심 KPI ───
    const totalJobs = periodJobs.length;
    let totalWorks = 0, totalOk = 0, totalLate = 0, totalNo = 0;
    periodJobs.forEach(j => {
      const sum = attendanceSummary(j.id);
      totalOk += sum.출근; totalLate += sum.지각; totalNo += sum.결근;
    });
    totalWorks = totalOk + totalLate + totalNo;
    const avgRate = totalWorks > 0 ? Math.round((totalOk + totalLate) / totalWorks * 100) : 0;
    // 총 포인트 지급 — 기간 내 'done' 상태 공고의 (출근+지각) × reward 합
    let totalPoints = 0;
    periodJobs.filter(j => jobStatus(j) === 'done').forEach(j => {
      const sum = attendanceSummary(j.id);
      totalPoints += (sum.출근 + sum.지각) * pointRewardFor(j);
    });
    // 총 알바비 (파트너사 직접 지급 · 참고용)
    let totalWage = 0;
    periodJobs.filter(j => jobStatus(j) === 'done').forEach(j => {
      const sum = attendanceSummary(j.id);
      totalWage += (sum.출근 + sum.지각) * j.wage;
    });

    // ─── 파트너사별 집계 ───
    const partnerStats = {};
    Object.keys(worksites).forEach(k => {
      partnerStats[k] = { name: worksites[k].name, jobs: 0, works: 0, ok: 0, late: 0, no: 0, points: 0 };
    });
    periodJobs.forEach(j => {
      const site = findSite(j.siteId); if (!site) return;
      const p = partnerStats[site.partnerKey];
      p.jobs++;
      const sum = attendanceSummary(j.id);
      p.ok += sum.출근; p.late += sum.지각; p.no += sum.결근;
      if (jobStatus(j) === 'done') p.points += (sum.출근 + sum.지각) * pointRewardFor(j);
    });
    Object.values(partnerStats).forEach(p => { p.works = p.ok + p.late + p.no; p.rate = p.works > 0 ? Math.round((p.ok + p.late) / p.works * 100) : 0; });
    const maxPartnerJobs = Math.max(1, ...Object.values(partnerStats).map(p => p.jobs));

    // ─── 근무지 출근율 랭킹 TOP 5 (기간 내 works >= 3인 것만) ───
    const siteStats = [];
    Object.values(worksites).forEach(p => p.sites.forEach(s => {
      let sok = 0, slate = 0, sno = 0, sjobs = 0;
      periodJobs.filter(j => j.siteId === s.id).forEach(j => {
        const sum = attendanceSummary(j.id);
        sok += sum.출근; slate += sum.지각; sno += sum.결근; sjobs++;
      });
      const works = sok + slate + sno;
      if (works >= 3) siteStats.push({ id: s.id, name: s.name, partner: p.name, rate: Math.round((sok + slate) / works * 100), jobs: sjobs, works });
    }));
    const topSites = siteStats.sort((a, b) => b.rate - a.rate).slice(0, 5);
    const bottomSites = siteStats.sort((a, b) => a.rate - b.rate).slice(0, 3);

    // ─── 시간대별 분포 ───
    const slotDist = { 주간: 0, 야간: 0, 새벽: 0, 웨딩: 0 };
    periodJobs.forEach(j => { if (slotDist[j.slot] !== undefined) slotDist[j.slot]++; });
    const slotSegs = [
      { value: slotDist.주간, color: '#2563EB' },
      { value: slotDist.야간, color: '#1B3A6B' },
      { value: slotDist.새벽, color: '#F59E0B' },
      { value: slotDist.웨딩, color: '#EF4444' },
    ];
    const slotTotal = Object.values(slotDist).reduce((s, n) => s + n, 0);

    // ─── 주간 트렌드 (최근 7일, week 모드가 아니어도 고정 7일) ───
    const trendDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(TODAY); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayJobs = jobs.filter(j => j.date === ds);
      const dayWorks = dayJobs.reduce((s, j) => {
        const su = attendanceSummary(j.id);
        return s + su.출근 + su.지각 + su.결근;
      }, 0);
      trendDays.push({
        date: ds.slice(5), jobs: dayJobs.length, works: dayWorks,
        dow: '일월화수목금토'[d.getDay()],
      });
    }
    const maxTrend = Math.max(1, ...trendDays.map(d => d.works));

    main.innerHTML = `
      <div class="jf-header">
        <div>
          <div class="jf-title">통계 리포트</div>
          <div class="jf-subtitle">기간: ${startStr} ~ ${endStr} · 마스터 · 관리자 1등급 전용</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('jobs')">엑셀 다운로드</button>
        </div>
      </div>

      ${statsTabsHtml()}

      <div class="jobs-filters">
        <div class="jobs-view-toggle">
          <button class="${statsState.period==='week'?'active':''}"    onclick="window.__statsPeriod('week')">이번 주</button>
          <button class="${statsState.period==='month'?'active':''}"   onclick="window.__statsPeriod('month')">최근 30일</button>
          <button class="${statsState.period==='quarter'?'active':''}" onclick="window.__statsPeriod('quarter')">최근 90일</button>
          <button class="${statsState.period==='all'?'active':''}"     onclick="window.__statsPeriod('all')">전체</button>
        </div>
      </div>

      <!-- KPI 4개 -->
      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">총 공고</div><div class="jf-metric-value">${totalJobs}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">기간 내 등록</div></div>
        <div class="jf-metric"><div class="jf-metric-label">총 근무</div><div class="jf-metric-value">${totalWorks}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 명·건</span></div><div class="jf-metric-hint">출석 + 결근 합계</div></div>
        <div class="jf-metric"><div class="jf-metric-label">평균 출근율</div><div class="jf-metric-value" style="color:${avgRate>=90?'#22C55E':avgRate>=75?'#F59E0B':'#EF4444'};">${avgRate}%</div><div class="jf-metric-hint">🟢 ${totalOk} · 🟡 ${totalLate} · 🔴 ${totalNo}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">총 포인트 지급</div><div class="jf-metric-value" style="color:#2563EB;">${totalPoints.toLocaleString()}<span style="font-size:13px; color:#6B7684; font-weight:400;"> P</span></div><div class="jf-metric-hint">알바비 (${(totalWage/10000).toFixed(0)}만원, 파트너사 직접 지급)</div></div>
      </div>

      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; margin-bottom: 14px;">
        <!-- 파트너사별 공고 수 -->
        <div class="jf-panel">
          <div class="ws-section-title">파트너사별 공고 수 <span style="font-size:11px; color:#6B7684; font-weight:400;">기간 내 등록 공고</span></div>
          ${Object.values(partnerStats).map(p => `
            <div class="stat-chart-row">
              <div class="stat-chart-label">${p.name}</div>
              <div class="stat-chart-track"><div class="stat-chart-fill" style="width:${(p.jobs/maxPartnerJobs*100).toFixed(1)}%;"></div></div>
              <div class="stat-chart-value">${p.jobs}건</div>
            </div>
          `).join('')}
        </div>

        <!-- 시간대 분포 도넛 -->
        <div class="jf-panel">
          <div class="ws-section-title">시간대별 공고 분포</div>
          <div style="display:flex; gap:18px; align-items:center; justify-content:center; margin-top:8px;">
            <div class="ctrl-donut-wrap" style="width:140px; height:140px;">
              ${donutSvg(slotSegs, 140, 16)}
              <div class="ctrl-donut-center">
                <div class="ctrl-donut-pct">${slotTotal}</div>
                <div class="ctrl-donut-label">건</div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:12px;">
              <div><span class="ctrl-donut-dot" style="background:#2563EB;"></span> 주간 <strong>${slotDist.주간}</strong></div>
              <div><span class="ctrl-donut-dot" style="background:#1B3A6B;"></span> 야간 <strong>${slotDist.야간}</strong></div>
              <div><span class="ctrl-donut-dot" style="background:#F59E0B;"></span> 새벽 <strong>${slotDist.새벽}</strong></div>
              <div><span class="ctrl-donut-dot" style="background:#EF4444;"></span> 웨딩 <strong>${slotDist.웨딩}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 파트너사별 출근율 -->
      <div class="jf-panel" style="margin-bottom: 14px;">
        <div class="ws-section-title">파트너사별 출근율 & 포인트 지급</div>
        ${Object.values(partnerStats).map(p => `
          <div class="stat-chart-row">
            <div class="stat-chart-label">${p.name}</div>
            <div class="stat-chart-track">
              <div class="stat-chart-fill ${p.rate>=90?'green':p.rate>=75?'':'amber'}" style="width:${p.rate}%;"></div>
            </div>
            <div class="stat-chart-value">${p.rate}% <span style="color:#9CA3AF; font-weight:400; font-size:11px;">(${p.works}명)</span></div>
          </div>
        `).join('')}
        <div style="margin-top:14px; padding-top:12px; border-top:0.5px solid rgba(0,0,0,0.06); display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; font-size:12px;">
          ${Object.values(partnerStats).map(p => `
            <div style="padding:10px 12px; background:#F9FAFB; border-radius:8px;">
              <div style="color:#6B7684; font-size:11px;">${p.name} 포인트 지급</div>
              <div style="color:#2563EB; font-weight:500; font-size:15px; margin-top:3px;">${p.points.toLocaleString()} P</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
        <!-- 출근율 TOP 5 -->
        <div class="jf-panel">
          <div class="ws-section-title">출근율 TOP 5 근무지 <span style="font-size:11px; color:#6B7684; font-weight:400;">근무 3명+ 기준</span></div>
          ${topSites.length === 0
            ? '<div style="padding:14px 0; text-align:center; color:#6B7684; font-size:12px;">데이터 부족 (기간 내 출석 3명 이상 근무지 없음)</div>'
            : topSites.map((s, i) => `
                <div class="stat-rank-row">
                  <div class="stat-rank-num ${i===0?'top1':i===1?'top2':i===2?'top3':''}">${i+1}</div>
                  <div>
                    <div style="font-weight:500;">${s.name}</div>
                    <div style="font-size:11px; color:#6B7684;">${s.partner} · ${s.works}명 근무</div>
                  </div>
                  <div style="font-weight:500; color:#22C55E;">${s.rate}%</div>
                </div>
              `).join('')}
        </div>

        <!-- 관리 필요 근무지 BOTTOM 3 -->
        <div class="jf-panel">
          <div class="ws-section-title">관리 필요 근무지 <span style="font-size:11px; color:#6B7684; font-weight:400;">출근율 낮은 순</span></div>
          ${bottomSites.length === 0
            ? '<div style="padding:14px 0; text-align:center; color:#6B7684; font-size:12px;">데이터 부족</div>'
            : bottomSites.map(s => `
                <div class="stat-rank-row" style="border-left: 3px solid #EF4444;">
                  <div style="width:24px;"></div>
                  <div>
                    <div style="font-weight:500;">${s.name}</div>
                    <div style="font-size:11px; color:#6B7684;">${s.partner} · ${s.works}명 근무</div>
                  </div>
                  <div style="font-weight:500; color:${s.rate<70?'#EF4444':'#F59E0B'};">${s.rate}%</div>
                </div>
              `).join('')}
          ${bottomSites.length > 0 ? '<div style="font-size:11px; color:#6B7684; margin-top:10px; padding-top:10px; border-top:0.5px solid rgba(0,0,0,0.06);">💡 협의대상 확인 · 공지사항 발송 · 담당자 리뷰 권장</div>' : ''}
        </div>
      </div>

      <!-- 최근 7일 트렌드 -->
      <div class="jf-panel">
        <div class="ws-section-title">최근 7일 근무 추이 <span style="font-size:11px; color:#6B7684; font-weight:400;">일자별 근무(출결 합계) 수</span></div>
        <div class="stat-trend-row">
          ${trendDays.map(d => `
            <div class="stat-trend-col">
              <div class="stat-trend-val">${d.works}</div>
              <div class="stat-trend-bar" style="height: ${(d.works / maxTrend) * 130}px; ${d.works===maxTrend ? 'background:#1E40AF;' : ''}"></div>
              <div class="stat-trend-date">${d.date}<br><span style="color:${d.dow==='일'?'#EF4444':d.dow==='토'?'#2563EB':'#9CA3AF'};">(${d.dow})</span></div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:14px; display:flex; gap:20px; font-size:12px; color:#6B7684;">
          <span>📊 일 평균 근무 <strong style="color:#111827;">${Math.round(trendDays.reduce((s,d)=>s+d.works,0) / 7)}</strong>건</span>
          <span>📈 최대 <strong style="color:#111827;">${maxTrend}</strong>건</span>
          <span>📅 공고 수 합계 <strong style="color:#111827;">${trendDays.reduce((s,d)=>s+d.jobs,0)}</strong>건</span>
        </div>
      </div>
    `;
  }

  window.__statsPeriod = function(p) { statsState.period = p; renderStats(); };
  window.__statsView = function(v) { statsState.view = v; renderStats(); };

  // 월별 뷰 — 최근 12개월 집계
  function renderStatsMonthly() {
    // 최근 12개월 범위
    const [ty, tm] = TODAY.split('-').map(Number);
    const months = [];
    for (let i = 11; i >= 0; i--) {
      let y = ty, m = tm - i;
      while (m < 1) { m += 12; y--; }
      months.push({ year: y, month: m, ym: `${y}-${String(m).padStart(2,'0')}` });
    }
    // 월별 집계
    const monthStats = months.map(mm => {
      const mjobs = jobs.filter(j => j.date.startsWith(mm.ym));
      let ok = 0, late = 0, no = 0, points = 0, wage = 0;
      mjobs.forEach(j => {
        const sum = attendanceSummary(j.id);
        ok += sum.출근; late += sum.지각; no += sum.결근;
        if (jobStatus(j) === 'done') {
          points += (sum.출근 + sum.지각) * pointRewardFor(j);
          wage   += (sum.출근 + sum.지각) * j.wage;
        }
      });
      const works = ok + late + no;
      const rate = works > 0 ? Math.round((ok + late) / works * 100) : null;
      return { ...mm, jobs: mjobs.length, works, ok, late, no, rate, points, wage };
    });
    const maxJobs = Math.max(1, ...monthStats.map(m => m.jobs));

    // 총계 (최근 12개월)
    const totalJobs = monthStats.reduce((s, m) => s + m.jobs, 0);
    const totalWorks = monthStats.reduce((s, m) => s + m.works, 0);
    const totalOk = monthStats.reduce((s, m) => s + m.ok + m.late, 0);
    const avgRate = totalWorks > 0 ? Math.round(totalOk / totalWorks * 100) : 0;
    const totalPoints = monthStats.reduce((s, m) => s + m.points, 0);
    const totalWage = monthStats.reduce((s, m) => s + m.wage, 0);

    main.innerHTML = `
      <div class="jf-header">
        <div>
          <div class="jf-title">통계 리포트</div>
          <div class="jf-subtitle">월별 집계 · 최근 12개월 (${monthStats[0].ym} ~ ${monthStats[11].ym}) · 마스터 · 1등급 전용</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('jobs')">엑셀 다운로드</button>
        </div>
      </div>

      ${statsTabsHtml()}

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">12개월 공고</div><div class="jf-metric-value">${totalJobs}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">월 평균 ${Math.round(totalJobs/12)}건</div></div>
        <div class="jf-metric"><div class="jf-metric-label">평균 출근율</div><div class="jf-metric-value" style="color:${avgRate>=85?'#22C55E':avgRate>=65?'#F59E0B':'#EF4444'};">${avgRate}%</div><div class="jf-metric-hint">월별 가중 평균</div></div>
        <div class="jf-metric"><div class="jf-metric-label">총 포인트 지급</div><div class="jf-metric-value" style="color:#2563EB;">${totalPoints.toLocaleString()}<span style="font-size:13px; color:#6B7684; font-weight:400;"> P</span></div><div class="jf-metric-hint">잡핏 중계 보상</div></div>
        <div class="jf-metric"><div class="jf-metric-label">총 알바비</div><div class="jf-metric-value">${Math.round(totalWage/10000).toLocaleString()}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 만원</span></div><div class="jf-metric-hint">파트너사 직접 지급 합계</div></div>
      </div>

      <div class="jf-panel" style="margin-bottom:16px;">
        <div class="ws-section-title">월별 공고 건수 + 출근율</div>
        <div style="display:grid; grid-template-columns: repeat(12, 1fr); gap:6px; margin-top:16px; align-items:end; height:200px;">
          ${monthStats.map(m => {
            const h = m.jobs > 0 ? Math.max(8, (m.jobs / maxJobs) * 180) : 2;
            const rateColor = m.rate === null ? '#E5E7EB' : m.rate >= 85 ? '#22C55E' : m.rate >= 65 ? '#F59E0B' : '#EF4444';
            return `
              <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                <div style="font-size:10px; color:#111827; font-weight:500;">${m.jobs}</div>
                <div style="width:100%; height:${h}px; background:${rateColor}; border-radius:4px 4px 0 0; min-height:2px; position:relative;" title="${m.ym} · 공고 ${m.jobs}건 · 출근율 ${m.rate!==null?m.rate+'%':'-'}"></div>
                <div style="font-size:10px; color:${m.ym.slice(0,7) === TODAY.slice(0,7) ? '#2563EB':'#6B7684'}; font-weight:${m.ym.slice(0,7) === TODAY.slice(0,7) ? '600':'400'};">${m.ym.slice(5)}월</div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:12px; padding-top:10px; border-top:0.5px solid rgba(0,0,0,0.06); font-size:11px; color:#6B7684; display:flex; gap:14px;">
          <span><span style="display:inline-block; width:10px; height:10px; background:#22C55E; border-radius:2px; vertical-align:middle;"></span> ≥85% 우수</span>
          <span><span style="display:inline-block; width:10px; height:10px; background:#F59E0B; border-radius:2px; vertical-align:middle;"></span> 65-85% 보통</span>
          <span><span style="display:inline-block; width:10px; height:10px; background:#EF4444; border-radius:2px; vertical-align:middle;"></span> &lt;65% 주의</span>
          <span><span style="display:inline-block; width:10px; height:10px; background:#E5E7EB; border-radius:2px; vertical-align:middle;"></span> 데이터 없음</span>
        </div>
      </div>

      <div class="jf-panel">
        <div class="ws-section-title">월별 상세 집계</div>
        <div class="jf-table-head" style="grid-template-columns: 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr 1fr 1fr; padding: 10px 12px;">
          <div>월</div>
          <div>공고 수</div>
          <div>근무</div>
          <div>출근</div>
          <div>지각</div>
          <div>결근</div>
          <div>출근율</div>
          <div>포인트 지급</div>
        </div>
        ${monthStats.slice().reverse().map(m => `
          <div class="jf-table-row" style="grid-template-columns: 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr 1fr 1fr; cursor:default;">
            <div style="font-weight:500;">${m.ym}</div>
            <div>${m.jobs}건</div>
            <div>${m.works}회</div>
            <div style="color:#166534;">${m.ok}</div>
            <div style="color:#92400E;">${m.late}</div>
            <div style="color:#991B1B;">${m.no}</div>
            <div style="font-weight:500; color:${m.rate===null?'#9CA3AF':m.rate>=85?'#22C55E':m.rate>=65?'#F59E0B':'#EF4444'};">${m.rate !== null ? m.rate + '%' : '-'}</div>
            <div style="color:#2563EB;">${m.points.toLocaleString()} P</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 연간 뷰 — 최근 5년 집계
  function renderStatsYearly() {
    const [ty] = TODAY.split('-').map(Number);
    const years = [];
    for (let i = 4; i >= 0; i--) years.push(ty - i);

    const yearStats = years.map(y => {
      const yjobs = jobs.filter(j => j.date.startsWith(`${y}-`));
      let ok = 0, late = 0, no = 0, points = 0, wage = 0;
      yjobs.forEach(j => {
        const sum = attendanceSummary(j.id);
        ok += sum.출근; late += sum.지각; no += sum.결근;
        if (jobStatus(j) === 'done') {
          points += (sum.출근 + sum.지각) * pointRewardFor(j);
          wage   += (sum.출근 + sum.지각) * j.wage;
        }
      });
      const works = ok + late + no;
      const rate = works > 0 ? Math.round((ok + late) / works * 100) : null;
      return { year: y, jobs: yjobs.length, works, ok, late, no, rate, points, wage };
    });
    const maxYearJobs = Math.max(1, ...yearStats.map(y => y.jobs));

    const totalJobs = yearStats.reduce((s, y) => s + y.jobs, 0);
    const totalWorks = yearStats.reduce((s, y) => s + y.works, 0);
    const totalOk = yearStats.reduce((s, y) => s + y.ok + y.late, 0);
    const avgRate = totalWorks > 0 ? Math.round(totalOk / totalWorks * 100) : 0;
    const totalPoints = yearStats.reduce((s, y) => s + y.points, 0);
    const totalWage = yearStats.reduce((s, y) => s + y.wage, 0);

    main.innerHTML = `
      <div class="jf-header">
        <div>
          <div class="jf-title">통계 리포트</div>
          <div class="jf-subtitle">연간 집계 · 최근 5년 (${years[0]} ~ ${years[4]}) · 마스터 · 1등급 전용</div>
        </div>
        <div class="ws-actions">
          <button onclick="showExcelModal('jobs')">엑셀 다운로드</button>
        </div>
      </div>

      ${statsTabsHtml()}

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">5년 누적 공고</div><div class="jf-metric-value">${totalJobs}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">연 평균 ${Math.round(totalJobs/5)}건</div></div>
        <div class="jf-metric"><div class="jf-metric-label">평균 출근율</div><div class="jf-metric-value" style="color:${avgRate>=85?'#22C55E':avgRate>=65?'#F59E0B':'#EF4444'};">${avgRate}%</div><div class="jf-metric-hint">연도별 가중 평균</div></div>
        <div class="jf-metric"><div class="jf-metric-label">총 포인트 지급</div><div class="jf-metric-value" style="color:#2563EB;">${totalPoints.toLocaleString()}<span style="font-size:13px; color:#6B7684; font-weight:400;"> P</span></div><div class="jf-metric-hint">잡핏 중계 보상</div></div>
        <div class="jf-metric"><div class="jf-metric-label">총 알바비</div><div class="jf-metric-value">${Math.round(totalWage/10000).toLocaleString()}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 만원</span></div><div class="jf-metric-hint">파트너사 직접 지급 합계</div></div>
      </div>

      <div class="jf-panel" style="margin-bottom:16px;">
        <div class="ws-section-title">연도별 공고 건수 + 출근율</div>
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:14px; margin-top:16px; align-items:end; height:220px;">
          ${yearStats.map(y => {
            const h = y.jobs > 0 ? Math.max(12, (y.jobs / maxYearJobs) * 200) : 4;
            const rateColor = y.rate === null ? '#E5E7EB' : y.rate >= 85 ? '#22C55E' : y.rate >= 65 ? '#F59E0B' : '#EF4444';
            return `
              <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <div style="font-size:14px; color:#111827; font-weight:600;">${y.jobs}건</div>
                <div style="width:70%; height:${h}px; background:${rateColor}; border-radius:6px 6px 0 0; min-height:4px;" title="${y.year} · 공고 ${y.jobs}건 · 출근율 ${y.rate!==null?y.rate+'%':'-'}"></div>
                <div style="font-size:12px; color:${y.year === ty ? '#2563EB':'#6B7684'}; font-weight:${y.year === ty ? '600':'500'};">${y.year}</div>
                <div style="font-size:11px; color:${y.rate===null?'#9CA3AF':y.rate>=85?'#22C55E':y.rate>=65?'#F59E0B':'#EF4444'};">${y.rate !== null ? y.rate + '%' : '-'}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="jf-panel">
        <div class="ws-section-title">연도별 상세 집계</div>
        <div class="jf-table-head" style="grid-template-columns: 0.6fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr 0.8fr 1fr 1fr; padding: 10px 12px;">
          <div>연도</div>
          <div>공고 수</div>
          <div>근무</div>
          <div>출근</div>
          <div>지각</div>
          <div>결근</div>
          <div>출근율</div>
          <div>포인트 지급</div>
          <div>알바비 지급</div>
        </div>
        ${yearStats.slice().reverse().map(y => `
          <div class="jf-table-row" style="grid-template-columns: 0.6fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr 0.8fr 1fr 1fr; cursor:default;">
            <div style="font-weight:500;">${y.year}</div>
            <div>${y.jobs}건</div>
            <div>${y.works}회</div>
            <div style="color:#166534;">${y.ok}</div>
            <div style="color:#92400E;">${y.late}</div>
            <div style="color:#991B1B;">${y.no}</div>
            <div style="font-weight:500; color:${y.rate===null?'#9CA3AF':y.rate>=85?'#22C55E':y.rate>=65?'#F59E0B':'#EF4444'};">${y.rate !== null ? y.rate + '%' : '-'}</div>
            <div style="color:#2563EB;">${y.points.toLocaleString()} P</div>
            <div>${Math.round(y.wage/10000).toLocaleString()}만원</div>
          </div>
        `).join('')}
      </div>

      <div class="jf-panel" style="margin-top:16px; background:#EFF6FF; border-color:#BFDBFE;">
        <div style="font-size:12px; color:#1E40AF; line-height:1.7;">
          💡 <strong>참고:</strong> 현재 프로토타입 샘플 데이터는 2026년 4월에 집중되어 있어 이전 월/연도는 데이터가 없을 수 있습니다.
          실제 Supabase 연동 후에는 전체 운영 이력이 자동 집계됩니다.
        </div>
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────
  // 알바생 앱 미리보기 — 5개 탭 (홈 · 공고 · 내근무 · 포인트 · 프로필)
  // 디자인 레퍼런스 용도 — 실제 Flutter 앱 재구현 시 이 흐름을 기반으로
  // ───────────────────────────────────────────────────────
  const appPreviewState = {
    tab: 'home',      // home / jobs / mywork / points / profile
    workerId: 'w007', // 시뮬 알바생: 한지민 (근무 이력 풍부, 62회, 132,000P)
  };

  function renderAppPreview() {
    const w = findWorker(appPreviewState.workerId) || workers[0];
    const tabs = [
      { key: 'home',    icon: '🏠', label: '홈' },
      { key: 'jobs',    icon: '📋', label: '공고' },
      { key: 'mywork',  icon: '📅', label: '내근무' },
      { key: 'points',  icon: '💰', label: '포인트' },
      { key: 'profile', icon: '👤', label: '프로필' },
    ];

    const workerPicker = workers.slice(0, 10).map(ww =>
      `<option value="${ww.id}" ${ww.id === appPreviewState.workerId ? 'selected' : ''}>${ww.name} (${ww.phone.slice(-4)} · ${ww.total}회 · ${ww.points.toLocaleString()}P${ww.negotiation ? ' · 협의대상' : ''})</option>`
    ).join('');

    main.innerHTML = `
      <div class="jf-header">
        <div>
          <div class="jf-title">📱 알바생 앱 미리보기</div>
          <div class="jf-subtitle">디자인 레퍼런스 — 실제 Flutter 앱 재구현 시 흐름 참고용 · 시뮬 사용자 선택 가능</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span style="font-size:12px; color:#6B7684;">시뮬 사용자:</span>
          <select onchange="window.__apSet('workerId', this.value)" style="min-width: 300px;">
            ${workerPicker}
          </select>
        </div>
      </div>

      <div class="ap-tabs">
        ${tabs.map(t => `
          <div class="ap-tab ${appPreviewState.tab === t.key ? 'active' : ''}" onclick="window.__apTab('${t.key}')">
            <span>${t.icon}</span>${t.label}
          </div>
        `).join('')}
      </div>

      <div class="ap-layout">
        <div class="ap-phone-col">
          <div class="mobile-frame">
            <div class="mobile-screen">
              ${renderPhoneScreen(w)}
            </div>
          </div>
        </div>
        <div class="ap-info-panel">
          ${renderAppPreviewInfo(w)}
        </div>
      </div>
    `;
  }

  function phoneStatusBar() {
    const d = new Date();
    const tt = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    return `
      <div class="mobile-status-bar">
        <span class="mp-time">${tt}</span>
        <span class="mp-icons">📶 📡 🔋</span>
      </div>
    `;
  }

  function phoneBottomNav(active) {
    const items = [
      { key: 'home',    icon: '🏠', label: '홈' },
      { key: 'jobs',    icon: '🔍', label: '공고' },
      { key: 'mywork',  icon: '📅', label: '내근무' },
      { key: 'points',  icon: '💰', label: '포인트' },
      { key: 'profile', icon: '👤', label: 'MY' },
    ];
    return `
      <div class="app-bottom-nav">
        ${items.map(i => `
          <div class="app-bnav-item ${i.key === active ? 'active' : ''}" onclick="window.__apTab('${i.key}')">
            <div class="app-bnav-icon">${i.icon}</div>
            <div>${i.label}</div>
          </div>
        `).join('')}
      </div>
      <div class="mobile-home-ind"></div>
    `;
  }

  function renderPhoneScreen(w) {
    const t = appPreviewState.tab;
    if (t === 'home')    return renderApHome(w);
    if (t === 'jobs')    return renderApJobs(w);
    if (t === 'mywork')  return renderApMyWork(w);
    if (t === 'points')  return renderApPoints(w);
    if (t === 'profile') return renderApProfile(w);
    return renderApHome(w);
  }

  // ─── 앱 미리보기 데이터 계산 헬퍼 ──────────────────────────
  // 디자인 변경 시 render*는 갈아엎어도 이 함수들은 그대로 유지

  // 특정 알바생의 신청 목록 (job/site 정보 주입)
  function apWorkerApps(w) {
    return applications
      .filter(a => a.workerId === w.id)
      .map(a => {
        const job = findJob(a.jobId);
        const site = job ? findSite(job.siteId) : null;
        return { ...a, job, site };
      })
      .filter(a => a.job && a.site);
  }

  // 예정/진행중/완료 분류
  function apBucketApps(w) {
    const all = apWorkerApps(w);
    const pending  = all.filter(a => a.status === 'pending').sort((x, y) => x.job.date.localeCompare(y.job.date));
    const upcoming = all.filter(a => a.status === 'approved' && a.job.date > TODAY).sort((x, y) => x.job.date.localeCompare(y.job.date));
    const today    = all.filter(a => a.status === 'approved' && a.job.date === TODAY);
    const rejected = all.filter(a => a.status === 'rejected').sort((x, y) => y.job.date.localeCompare(x.job.date));
    return { pending, upcoming, today, rejected, all };
  }

  // 완료된 근무 (attendance 시뮬 기반 · 과거 공고 중 실제로 출근/지각한 건)
  function apWorkerCompletedJobs(w, limit = 20) {
    const done = jobs.filter(j => j.date < TODAY).sort((a, b) => b.date.localeCompare(a.date));
    const mine = [];
    for (const j of done) {
      if (mine.length >= limit) break;
      const att = getAttendance(j.id);
      const me = att.find(a => a.worker.id === w.id);
      if (me && (me.status === '출근' || me.status === '지각')) {
        mine.push({ job: j, site: findSite(j.siteId), status: me.status, checkin: me.checkin, checkout: me.checkout, reward: pointRewardFor(j) });
      }
    }
    return mine;
  }

  // 이번 달 적립 포인트 합계
  // 과거 공고 출근 적립 + pointTxs 의 reward 트랜잭션 (GPS 승인 등)
  function apThisMonthEarnings(w) {
    const monthPrefix = TODAY.slice(0, 7);  // 'YYYY-MM'
    let total = 0;
    jobs.forEach(j => {
      if (j.date >= TODAY || !j.date.startsWith(monthPrefix)) return;
      const att = getAttendance(j.id);
      const me = att.find(a => a.worker.id === w.id);
      if (me && (me.status === '출근' || me.status === '지각')) total += pointRewardFor(j);
    });
    pointTxs.forEach(t => {
      if (t.workerId !== w.id || t.type !== 'reward') return;
      const when = t.requestedAt || t.processedAt || '';
      if (when.startsWith(monthPrefix)) total += t.amount;
    });
    return total;
  }

  // 근처 추천 공고 (알바생 즐겨찾기 파트너사 기반 · fallback 전체)
  function apRecommendedJobs(w, limit = 2) {
    const openJobs = jobs.filter(j => j.date >= TODAY && jobStatus(j) === 'open');
    const favorites = w.favParts && w.favParts.length > 0
      ? openJobs.filter(j => w.favParts.includes(findSite(j.siteId)?.partnerKey))
      : [];
    const pool = favorites.length >= limit ? favorites : openJobs;
    return pool.slice(0, limit).map(j => ({ job: j, site: findSite(j.siteId), reward: pointRewardFor(j) }));
  }

  function renderApHome(w) {
    // 데이터 — 디자인 바뀌어도 이 블록은 유지
    const recommended = apRecommendedJobs(w, 2);
    const buckets = apBucketApps(w);
    const thisWeekWork = [...buckets.today, ...buckets.upcoming].slice(0, 3);

    const nearbyHtml = recommended.map(({ job: j, site: s, reward }) => `
      <div class="app-card">
        <div class="app-card-title">${s.site.name}</div>
        <div class="app-card-meta">
          <span class="app-chip">${j.slot}</span>
          ${j.date} · ${j.start}~${j.end}<br>
          일급 ${j.wage.toLocaleString()}원 · 포인트 ${reward.toLocaleString()}P<br>
          모집 ${j.apply}/${j.cap}명
        </div>
      </div>
    `).join('');

    const thisWeekHtml = thisWeekWork.length === 0
      ? '<div class="app-card" style="text-align:center; color:#9CA3AF; font-size:11px;">예정된 근무가 없습니다</div>'
      : thisWeekWork.map(a => {
          const chipCls = a.status === 'approved' ? 'app-chip-ok' : 'app-chip-warn';
          const chipLabel = a.status === 'approved' ? '승인됨' : '승인 대기';
          return `
            <div class="app-card">
              <div class="app-card-title">${a.site.site.name}</div>
              <div class="app-card-meta">
                <span class="app-chip ${chipCls}">${chipLabel}</span>
                ${a.job.date} · ${a.job.slot} ${a.job.start}~${a.job.end}<br>
                ${a.site.site.bus ? '통근버스 운영' : '통근버스 없음'} · 담당 ${a.job.contact || '-'}
              </div>
            </div>
          `;
        }).join('');

    return `
      ${phoneStatusBar()}
      <div class="mobile-app-header">
        <div class="mobile-app-header-title">안녕하세요, ${w.name}님 👋</div>
        <div class="mobile-app-header-sub">오늘도 화이팅! · ${TODAY}</div>
      </div>
      <div class="mobile-app-body">
        <div class="app-big-point">
          <div class="app-big-point-label">보유 포인트</div>
          <div class="app-big-point-value">${w.points.toLocaleString()} P</div>
          <div class="app-big-point-hint">${w.points >= POLICY.POINT_MIN_WITHDRAW ? '✓ 출금 가능' : `3만P 달성까지 ${(POLICY.POINT_MIN_WITHDRAW - w.points).toLocaleString()}P 남음`}</div>
        </div>
        <div class="app-section-title">📍 근처 추천 공고</div>
        ${nearbyHtml || '<div class="app-card" style="text-align:center; color:#9CA3AF; font-size:11px;">추천 공고가 없습니다</div>'}
        <div class="app-section-title" style="margin-top: 14px;">📅 이번 주 근무 예정 ${thisWeekWork.length > 0 ? `<span style="color:#2563EB;">(${thisWeekWork.length})</span>` : ''}</div>
        ${thisWeekHtml}
      </div>
      ${phoneBottomNav('home')}
    `;
  }

  function renderApJobs(w) {
    const list = jobs.filter(j => j.date >= TODAY && jobStatus(j) === 'open').slice(0, 4);
    const rows = list.map(j => {
      const s = findSite(j.siteId);
      const reward = pointRewardFor(j);
      return `
        <div class="app-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div class="app-card-title">${s.site.name}</div>
            <span class="app-chip">${j.slot}</span>
          </div>
          <div class="app-card-meta" style="margin-top: 4px;">
            ${j.date} · ${j.start}~${j.end}<br>
            <strong style="color:#111827;">일급 ${j.wage.toLocaleString()}원</strong> · 포인트 ${reward.toLocaleString()}P
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:6px; border-top:0.5px solid rgba(0,0,0,0.06);">
            <div style="font-size:10px; color:#6B7684;">모집 ${j.apply}/${j.cap}명</div>
            <button style="background:#2563EB; color:#fff; border:none; border-radius:6px; padding:5px 12px; font-size:10px; font-weight:500;">신청</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      ${phoneStatusBar()}
      <div class="mobile-app-header">
        <div class="mobile-app-header-title">공고</div>
        <div class="mobile-app-header-sub">하루 1건 신청 가능 · 시간대 중복 불가</div>
      </div>
      <div class="mobile-app-body">
        <div style="display:flex; gap:4px; margin-bottom:10px;">
          <div style="background:#fff; padding:5px 10px; border-radius:14px; font-size:10px; border:0.5px solid #2563EB; color:#2563EB; font-weight:500;">전체</div>
          <div style="background:#fff; padding:5px 10px; border-radius:14px; font-size:10px; color:#6B7684;">CJ</div>
          <div style="background:#fff; padding:5px 10px; border-radius:14px; font-size:10px; color:#6B7684;">롯데</div>
          <div style="background:#fff; padding:5px 10px; border-radius:14px; font-size:10px; color:#6B7684;">웨딩</div>
        </div>
        ${rows || '<div class="app-card" style="text-align:center; color:#9CA3AF; font-size:11px;">조건에 맞는 공고가 없습니다</div>'}
      </div>
      ${phoneBottomNav('jobs')}
    `;
  }

  function renderApMyWork(w) {
    // 데이터 — 디자인 바뀌어도 이 블록은 유지
    const buckets = apBucketApps(w);
    const completed = apWorkerCompletedJobs(w, 5);
    const upcomingList = [...buckets.today, ...buckets.upcoming, ...buckets.pending];

    const cancelReject = (s) => s === 'approved' ? '<button style="flex:1; background:#FEF2F2; color:#EF4444; border:none; border-radius:6px; padding:6px; font-size:10px;">신청 취소</button>' : '';

    const upcomingHtml = upcomingList.length === 0
      ? '<div class="app-card" style="text-align:center; color:#9CA3AF; font-size:11px;">예정된 근무가 없습니다</div>'
      : upcomingList.map(a => {
          const isToday = a.job.date === TODAY;
          const borderColor = a.status === 'pending' ? '#F59E0B' : isToday ? '#22C55E' : '#2563EB';
          const chipCls = a.status === 'pending' ? 'app-chip-warn' : 'app-chip-ok';
          const chipLabel = a.status === 'pending' ? '승인 대기' : isToday ? '오늘 근무' : '승인됨';
          const subLine = a.status === 'pending'
            ? '12h 이내 신청 · 관리자 검토 중'
            : `${a.site.site.bus ? '통근버스 운영' : '통근버스 없음'} · 담당: ${a.job.contact || '-'}`;
          return `
            <div class="app-card" style="border-left:3px solid ${borderColor};">
              <div class="app-card-title">${a.site.site.name}</div>
              <div class="app-card-meta">
                <span class="app-chip ${chipCls}">${chipLabel}</span>
                ${a.job.date} · ${a.job.slot} ${a.job.start}~${a.job.end}<br>
                ${subLine}
              </div>
              <div style="display:flex; gap:6px; margin-top:8px;">
                ${a.status === 'approved' ? '<button style="flex:1; background:#F3F4F6; color:#374151; border:none; border-radius:6px; padding:6px; font-size:10px;">계약서</button>' : ''}
                ${cancelReject(a.status)}
                ${a.status === 'pending' ? '<button style="flex:1; background:#F3F4F6; color:#374151; border:none; border-radius:6px; padding:6px; font-size:10px;">신청 취소</button>' : ''}
              </div>
            </div>
          `;
        }).join('');

    const completedHtml = completed.length === 0
      ? '<div style="text-align:center; color:#9CA3AF; font-size:10px; padding:14px 0;">최근 완료된 근무가 없습니다</div>'
      : completed.map(c => `
          <div class="app-list-row">
            <div>
              <div class="app-list-row-main">${c.site.site.name}</div>
              <div class="app-list-row-sub">${c.job.date} · ${c.job.slot} · ${c.status}</div>
            </div>
            <div class="app-list-row-val plus">+${c.reward.toLocaleString()} P</div>
          </div>
        `).join('');

    return `
      ${phoneStatusBar()}
      <div class="mobile-app-header">
        <div class="mobile-app-header-title">내 근무</div>
        <div class="mobile-app-header-sub">총 ${w.total}회 · No-show ${w.noshow}회</div>
      </div>
      <div class="mobile-app-body">
        <div style="display:flex; gap:4px; margin-bottom:10px;">
          <div style="flex:1; background:#2563EB; padding:6px; border-radius:6px; font-size:10px; color:#fff; text-align:center; font-weight:500;">예정 (${buckets.upcoming.length + buckets.pending.length})</div>
          <div style="flex:1; background:#fff; padding:6px; border-radius:6px; font-size:10px; color:${buckets.today.length>0?'#22C55E':'#6B7684'}; text-align:center; font-weight:${buckets.today.length>0?'500':'400'};">진행중 (${buckets.today.length})</div>
          <div style="flex:1; background:#fff; padding:6px; border-radius:6px; font-size:10px; color:#6B7684; text-align:center;">완료 (${completed.length})</div>
        </div>
        ${upcomingHtml}
        <div class="app-section-title">최근 완료</div>
        ${completedHtml}
      </div>
      ${phoneBottomNav('mywork')}
    `;
  }

  function renderApPoints(w) {
    // 데이터 — 디자인 바뀌어도 이 블록은 유지
    const myTxs = pointTxs.filter(t => t.workerId === w.id).slice(0, 6);
    const thisMonthEarned = apThisMonthEarnings(w);

    const rows = myTxs.map(t => {
      const isPositive = t.amount > 0;
      const label = t.type === 'withdraw' ? `출금 (${t.bank || ''})` : t.type === 'deduct' ? (t.reason || '차감') : (t.reason || '보상');
      return `
        <div class="app-list-row">
          <div>
            <div class="app-list-row-main">${label}</div>
            <div class="app-list-row-sub">${t.requestedAt || t.processedAt || ''} · ${t.status === 'done' ? '완료' : t.status === 'pending' ? '처리 중' : t.status === 'failed' ? '실패' : ''}</div>
          </div>
          <div class="app-list-row-val ${isPositive ? 'plus' : 'minus'}">${isPositive ? '+' : ''}${t.amount.toLocaleString()} P</div>
        </div>
      `;
    }).join('');

    return `
      ${phoneStatusBar()}
      <div class="mobile-app-header">
        <div class="mobile-app-header-title">포인트</div>
        <div class="mobile-app-header-sub">3만P부터 출금 · 1만P 단위</div>
      </div>
      <div class="mobile-app-body">
        <div class="app-big-point">
          <div class="app-big-point-label">보유 포인트</div>
          <div class="app-big-point-value">${w.points.toLocaleString()} P</div>
          <div class="app-big-point-hint">이번 달 적립 ${thisMonthEarned > 0 ? '+' : ''}${thisMonthEarned.toLocaleString()}P</div>
        </div>
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <button style="flex:1; background:${w.points >= POLICY.POINT_MIN_WITHDRAW ? '#2563EB' : '#E5E7EB'}; color:${w.points >= POLICY.POINT_MIN_WITHDRAW ? '#fff' : '#9CA3AF'}; border:none; border-radius:8px; padding:10px; font-size:11px; font-weight:500;">${w.points >= POLICY.POINT_MIN_WITHDRAW ? '💸 출금 신청' : '출금 가능 조건 미달'}</button>
          <button style="background:#fff; color:#374151; border:0.5px solid rgba(0,0,0,0.12); border-radius:8px; padding:10px 14px; font-size:11px;">⚙</button>
        </div>
        <div class="app-section-title">최근 내역</div>
        ${rows || '<div class="app-card" style="text-align:center; color:#9CA3AF; font-size:11px;">내역이 없습니다</div>'}
      </div>
      ${phoneBottomNav('points')}
    `;
  }

  function renderApProfile(w) {
    return `
      ${phoneStatusBar()}
      <div class="mobile-app-header">
        <div class="mobile-app-header-title">MY 프로필</div>
      </div>
      <div class="mobile-app-body">
        <div class="app-card" style="text-align:center; padding:20px 12px;">
          <div style="width:60px; height:60px; border-radius:50%; background:#E5E7EB; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; font-size:24px;">👤</div>
          <div style="font-weight:600; font-size:14px; color:#111827;">${w.name}</div>
          <div style="font-size:10px; color:#6B7684; font-family:'SF Mono',Monaco,monospace; margin-top:2px;">${w.phone}</div>
          <div style="margin-top:8px;">
            ${w.negotiation ? '<span class="app-chip app-chip-neg">협의대상</span>' : ''}
            ${w.warnings > 0 ? `<span class="app-chip app-chip-warn">경고 ${w.warnings}회</span>` : ''}
            ${w.warnings === 0 && !w.negotiation ? '<span class="app-chip app-chip-ok">정상</span>' : ''}
          </div>
        </div>
        <div class="app-card">
          <div style="display:flex; justify-content:space-between; font-size:11px; padding:4px 0;">
            <span style="color:#6B7684;">총 근무</span><strong style="color:#111827;">${w.total}회</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; padding:4px 0; border-top:0.5px solid rgba(0,0,0,0.06);">
            <span style="color:#6B7684;">No-show</span><strong style="color:${w.noshow > 0 ? '#EF4444' : '#111827'};">${w.noshow}회</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; padding:4px 0; border-top:0.5px solid rgba(0,0,0,0.06);">
            <span style="color:#6B7684;">가입일</span><strong style="color:#111827;">${w.joinedAt}</strong>
          </div>
        </div>
        <div class="app-section-title">설정</div>
        <div class="app-list-row"><div><div class="app-list-row-main">⭐ 즐겨찾기 근무지</div><div class="app-list-row-sub">${w.favParts.length}곳 설정됨</div></div><div style="color:#9CA3AF; font-size:12px;">›</div></div>
        <div class="app-list-row"><div><div class="app-list-row-main">🏦 계좌 정보</div><div class="app-list-row-sub">출금용 계좌 등록</div></div><div style="color:#9CA3AF; font-size:12px;">›</div></div>
        <div class="app-list-row"><div><div class="app-list-row-main">🔔 알림 설정</div><div class="app-list-row-sub">마케팅 · 긴급 구인</div></div><div style="color:#9CA3AF; font-size:12px;">›</div></div>
        <div class="app-list-row"><div><div class="app-list-row-main">💬 문의하기</div><div class="app-list-row-sub">운영팀 1:1 문의</div></div><div style="color:#9CA3AF; font-size:12px;">›</div></div>
        <div class="app-list-row" style="margin-top:10px; color:#EF4444;"><div class="app-list-row-main" style="color:#EF4444;">🚪 로그아웃</div></div>
      </div>
      ${phoneBottomNav('profile')}
    `;
  }

  function renderAppPreviewInfo(w) {
    const t = appPreviewState.tab;
    const titles = {
      home:    { title: '홈 화면', desc: '알바생이 앱에 처음 진입했을 때 보는 화면' },
      jobs:    { title: '공고 리스트', desc: '신청 가능한 공고를 파트너사별로 필터·검색' },
      mywork:  { title: '내 근무', desc: '신청·진행·완료된 근무 관리 · 계약서 조회' },
      points:  { title: '포인트', desc: '보유 포인트 확인 · 출금 신청 · 이력 조회' },
      profile: { title: '프로필', desc: '계정 정보·설정·문의·로그아웃' },
    };
    const info = titles[t] || titles.home;

    const sections = {
      home: `
        <div class="ap-info-section">
          <h4>핵심 UI 요소</h4>
          <ul>
            <li><b>보유 포인트 카드</b> — 최상단 강조 (출금 가능 여부 표시)</li>
            <li><b>근처 추천 공고</b> — GPS + 즐겨찾기 근무지 기반</li>
            <li><b>이번 주 근무 예정</b> — 승인된 내 공고</li>
          </ul>
        </div>
        <div class="ap-info-section">
          <h4>진입 흐름</h4>
          <p>앱 실행 → 스플래시 → (로그인 필요시 → 카카오 로그인 + 전화번호 2FA) → 홈</p>
        </div>
        <div class="ap-info-section">
          <h4>기능 규칙</h4>
          <ul>
            <li>미성년자는 가입 단계에서 차단 (생년월일 확인)</li>
            <li>협의대상 상태면 상단에 고정 배너 노출 (현재 없음 · 마스터 전용 해제)</li>
          </ul>
        </div>
      `,
      jobs: `
        <div class="ap-info-section">
          <h4>핵심 UI 요소</h4>
          <ul>
            <li><b>파트너사 필터 칩</b> — 전체/CJ/롯데/웨딩</li>
            <li><b>공고 카드</b> — 근무지·날짜·시간대·일급·포인트·모집률</li>
            <li><b>신청 버튼</b> — 탭 시 확인 팝업 (주휴수당 팝업 ON이면 먼저 노출)</li>
          </ul>
        </div>
        <div class="ap-info-section">
          <h4>핵심 제약</h4>
          <ul>
            <li><b>하루 1건 신청만 가능</b> — 시간대 다른 공고라도 중복 불가</li>
            <li><b>12h 전 신청</b>: 자동 승인 / <b>12h 이내</b>: 관리자 승인 대기</li>
            <li><b>협의대상 / 경고 3회 이상</b>: 시간 무관 관리자 승인 필요</li>
            <li><b>CJ/롯데는 파트너사별 주 4일 제한</b></li>
          </ul>
        </div>
      `,
      mywork: `
        <div class="ap-info-section">
          <h4>핵심 UI 요소</h4>
          <ul>
            <li><b>상태 탭</b> — 예정 / 진행중 / 완료 (탭별 카운트)</li>
            <li><b>좌측 테두리 색상</b> — 승인 ○ · 대기 ! · 거절 ✗</li>
            <li><b>액션</b> — 계약서 조회 / 신청 취소 (12h 전까지 자유, 이후 사유 필요)</li>
          </ul>
        </div>
        <div class="ap-info-section">
          <h4>취소 규칙</h4>
          <ul>
            <li>12h 전까지: 자유 취소</li>
            <li>12h 이내: 사유 작성 후 관리자 검토 → <b>단순 변심은 1,000P 자동 차감</b></li>
            <li>경고 사유 해당 시 경고 1회 부여 (별도 프로세스)</li>
          </ul>
        </div>
        <div class="ap-info-section">
          <h4>출퇴근 플로우</h4>
          <p>근무일 당일 → 근무지 도착 후 GPS 인증 → 출근 체크 → 근무 → 퇴근 체크<br>GPS 영역 밖 퇴근 시 <b>사유 입력 → 관리자 승인 대기</b> (관제 시스템에서 처리)</p>
        </div>
      `,
      points: `
        <div class="ap-info-section">
          <h4>핵심 UI 요소</h4>
          <ul>
            <li><b>보유 포인트 카드</b> — 파란 그라디언트 강조</li>
            <li><b>출금 신청 버튼</b> — 3만P 미달 시 회색 비활성화</li>
            <li><b>최근 내역</b> — 적립/출금/차감 혼합</li>
          </ul>
        </div>
        <div class="ap-info-section">
          <h4>출금 정책</h4>
          <ul>
            <li>최초 <b>3만P 달성</b> 시 출금 가능</li>
            <li><b>1만P 단위</b> 출금 · 1일 최대 10만P</li>
            <li><b>반자동 처리</b> — 관리자가 수동 이체 후 완료 클릭</li>
          </ul>
        </div>
        <div class="ap-info-section">
          <h4>포인트 적립 규칙</h4>
          <ul>
            <li>주간 2,000P · 야간 2,500P · 새벽 3,000P · 웨딩 2,500P</li>
            <li>알바비(일급 10~12만 원)는 파트너사가 <b>직접 지급</b> (잡핏 책임 아님)</li>
          </ul>
        </div>
      `,
      profile: `
        <div class="ap-info-section">
          <h4>핵심 UI 요소</h4>
          <ul>
            <li><b>프로필 카드</b> — 이름 · 전화 · 상태 배지(정상/경고/협의대상)</li>
            <li><b>누적 통계</b> — 총 근무 · No-show · 가입일</li>
            <li><b>설정 메뉴</b> — 즐겨찾기 · 계좌 · 알림 · 문의 · 로그아웃</li>
          </ul>
        </div>
        <div class="ap-info-section">
          <h4>계정 관련 규칙</h4>
          <ul>
            <li><b>탈퇴 시</b> 전화번호는 협의대상 추적용으로 유지 (재가입 자동 매칭)</li>
            <li><b>경고 3회 누적</b> → 자동 협의대상 등록 (해제는 마스터 전용)</li>
            <li><b>알림 동의</b>는 서비스/마케팅/긴급구인 3개 카테고리 개별 설정</li>
          </ul>
        </div>
      `,
    };

    return `
      <div class="ap-info-title">${info.title}</div>
      <div style="font-size:12px; color:#6B7684; margin-bottom:14px;">${info.desc}</div>
      ${sections[t] || sections.home}
      <div class="ap-info-section" style="margin-top:14px; background:#EFF6FF; padding:12px; border-radius:8px; border:none;">
        <h4 style="color:#1E3A8A;">현재 시뮬 사용자</h4>
        <p style="color:#1E40AF; line-height:1.6;">
          <b>${w.name}</b> (${w.phone}) · 총 ${w.total}회 · No-show ${w.noshow}회 · 포인트 ${w.points.toLocaleString()}P<br>
          경고 ${w.warnings}회 ${w.negotiation ? '· <b>협의대상</b>' : ''}
        </p>
      </div>
    `;
  }

  window.__apTab = function(tab) { appPreviewState.tab = tab; renderAppPreview(); };
  window.__apSet = function(key, val) { appPreviewState[key] = val; renderAppPreview(); };

  // ───────────────────────────────────────────────────────
  // 처리 이력 전체 보기 (신청/협의대상/포인트 통합)
  // ───────────────────────────────────────────────────────
  const historyState = {
    cat: 'all',          // all / approval / negotiation / point
    search: '',
    dateRange: 'month',  // today / week / month / all
    referrer: 'home',
  };

  function collectActivities() {
    const acts = [];
    // 신청 처리 이력
    applications.forEach(a => {
      if (!a.processedAt) return;
      const w = findWorker(a.workerId);
      const j = findJob(a.jobId);
      if (!w || !j) return;
      const site = findSite(j.siteId);
      acts.push({
        at: a.processedAt,
        cat: 'approval',
        icon: a.status === 'approved' ? '✓' : '✕',
        color: a.status === 'approved' ? '#22C55E' : '#EF4444',
        title: `${w.name} 님 신청 ${a.status === 'approved' ? '승인' : '거절'}`,
        sub: `${site.site.name} · ${j.date} ${j.slot} ${j.start}~${j.end}${a.rejectReason ? ' · 거절 사유: ' + a.rejectReason : ''}`,
        by: a.processedBy,
        ref: { type: 'worker', id: w.id, name: w.name, phone: w.phone },
      });
    });
    // 협의대상 등록 이력
    negotiations.forEach(n => {
      const reasonLabel = { auto: '경고 3회 자동', manual: '수동 등록', rematch: '재가입 매칭' }[n.reason];
      acts.push({
        at: n.registeredAt,
        cat: 'negotiation',
        icon: '⚠',
        color: '#EF4444',
        title: `${n.name} 협의대상 등록`,
        sub: `${reasonLabel} · ${n.sub}`,
        by: n.registeredBy,
        ref: n.workerId ? { type: 'worker', id: n.workerId, name: n.name, phone: n.phone } : null,
      });
    });
    // 포인트 출금/차감 이력
    pointTxs.forEach(t => {
      const w = findWorker(t.workerId);
      if (!w) return;
      if (t.type === 'withdraw' && t.processedAt) {
        acts.push({
          at: t.processedAt,
          cat: 'point',
          icon: t.status === 'done' ? '💰' : '⚠',
          color: t.status === 'done' ? '#2563EB' : '#EF4444',
          title: `${w.name} 님 출금 ${t.status === 'done' ? '완료' : '실패'}`,
          sub: `${t.amount.toLocaleString()}P · ${t.bank} ${t.account}${t.failReason ? ' · 사유: ' + t.failReason : ''}`,
          by: t.processedBy,
          ref: { type: 'worker', id: w.id, name: w.name, phone: w.phone },
        });
      }
      if (t.type === 'deduct') {
        acts.push({
          at: t.requestedAt,
          cat: 'point',
          icon: '⊖',
          color: '#F59E0B',
          title: `${w.name} 님 포인트 차감`,
          sub: `${Math.abs(t.amount).toLocaleString()}P · ${t.reason}`,
          by: t.processedBy,
          ref: { type: 'worker', id: w.id, name: w.name, phone: w.phone },
        });
      }
    });
    // 최신순 정렬
    return acts.sort((a, b) => b.at.localeCompare(a.at));
  }

  function renderHistory(initialCat, referrer) {
    if (initialCat) historyState.cat = initialCat;
    if (referrer) historyState.referrer = referrer;

    const q = historyState.search.trim().toLowerCase();
    const todayStr = TODAY;
    const weekAgo = new Date(TODAY); weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    const monthAgo = new Date(TODAY); monthAgo.setDate(monthAgo.getDate() - 29);
    const monthAgoStr = monthAgo.toISOString().slice(0, 10);

    let list = collectActivities();
    list = list.filter(a => {
      if (historyState.cat !== 'all' && historyState.cat !== a.cat) return false;
      if (historyState.dateRange === 'today' && !a.at.startsWith(todayStr)) return false;
      if (historyState.dateRange === 'week' && a.at.slice(0, 10) < weekAgoStr) return false;
      if (historyState.dateRange === 'month' && a.at.slice(0, 10) < monthAgoStr) return false;
      if (q && !(a.title.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q) || (a.ref?.name || '').toLowerCase().includes(q))) return false;
      return true;
    });

    const totalCount = collectActivities().length;
    const byCat = {
      approval: collectActivities().filter(a => a.cat === 'approval').length,
      negotiation: collectActivities().filter(a => a.cat === 'negotiation').length,
      point: collectActivities().filter(a => a.cat === 'point').length,
    };

    // 날짜별 그룹핑
    const groups = {};
    list.forEach(a => {
      const date = a.at.slice(0, 10);
      if (!groups[date]) groups[date] = [];
      groups[date].push(a);
    });
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    main.innerHTML = `
      <span class="jf-back" onclick="window.__navGoto('${historyState.referrer}')">← 이전으로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">처리 이력</div>
          <div class="jf-subtitle">신청 승인 · 협의대상 · 포인트 처리 통합 타임라인 · 총 ${totalCount}건</div>
        </div>
      </div>

      <div class="jobs-filters">
        <div class="jf-search"><input type="text" placeholder="이름 · 사유 · 근무지 검색" value="${historyState.search}" oninput="window.__histSearch(this.value)" /></div>
        <div class="jobs-view-toggle">
          <button class="${historyState.cat==='all'?'active':''}" onclick="window.__histCat('all')">전체 (${totalCount})</button>
          <button class="${historyState.cat==='approval'?'active':''}" onclick="window.__histCat('approval')">신청 (${byCat.approval})</button>
          <button class="${historyState.cat==='negotiation'?'active':''}" onclick="window.__histCat('negotiation')">협의대상 (${byCat.negotiation})</button>
          <button class="${historyState.cat==='point'?'active':''}" onclick="window.__histCat('point')">포인트 (${byCat.point})</button>
        </div>
        <div class="jobs-view-toggle">
          <button class="${historyState.dateRange==='today'?'active':''}" onclick="window.__histRange('today')">오늘</button>
          <button class="${historyState.dateRange==='week'?'active':''}" onclick="window.__histRange('week')">최근 7일</button>
          <button class="${historyState.dateRange==='month'?'active':''}" onclick="window.__histRange('month')">최근 30일</button>
          <button class="${historyState.dateRange==='all'?'active':''}" onclick="window.__histRange('all')">전체</button>
        </div>
        <div style="margin-left:auto; font-size:12px; color:#6B7684; align-self:center;">${list.length}건 표시</div>
      </div>

      ${list.length === 0
        ? `<div class="jf-placeholder"><div class="jf-placeholder-icon">📜</div><div class="jf-placeholder-title">조건에 맞는 이력이 없습니다</div><div class="jf-placeholder-desc">필터를 변경해보세요.</div></div>`
        : sortedDates.map(date => `
            <div class="jf-panel" style="margin-bottom: 10px;">
              <div style="font-size: 12px; font-weight: 500; color: #6B7684; padding-bottom: 10px; border-bottom: 0.5px solid rgba(0,0,0,0.08); margin-bottom: 10px;">
                ${date} <span style="color:#9CA3AF; font-weight:400;">(${'일월화수목금토'[new Date(date).getDay()]}) · ${groups[date].length}건</span>
              </div>
              <div class="tl" style="padding-left: 18px;">
                ${groups[date].map(a => `
                  <div class="tl-item" style="cursor:${a.ref ? 'pointer' : 'default'};" ${a.ref ? `onclick="window.__histGoRef('${a.ref.type}','${a.ref.id}')"` : ''}>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                      <div style="flex:1;">
                        <div class="tl-title" style="display:flex; align-items:center; gap:6px;">
                          <span style="color:${a.color}; font-weight:600;">${a.icon}</span>
                          ${a.title}
                        </div>
                        <div class="tl-sub">${a.sub}</div>
                        <div class="tl-date" style="margin-top:4px;">${a.at} · 처리: ${a.by}${a.ref ? ' · <span style="color:#2563EB;">상세 →</span>' : ''}</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')
      }
    `;
  }

  window.__histSearch = function(val) { historyState.search = val; renderHistory(); };
  window.__histCat = function(cat) { historyState.cat = cat; renderHistory(); };
  window.__histRange = function(r) { historyState.dateRange = r; renderHistory(); };
  window.__histGoRef = function(type, id) {
    if (type === 'worker') {
      window.__navGoto('workers');
      setTimeout(() => window.__wrkDetail(id), 50);
    }
  };

  // ───────────────────────────────────────────────────────
  // 엑셀 업/다운로드 모달 (공용)
  // ───────────────────────────────────────────────────────
  const EXCEL_CONTEXTS = {
    workers: {
      title: '근무자 엑셀 관리',
      filename: 'jobfit_workers.xlsx',
      columns: [
        { name: '이름',      desc: '실명', required: true },
        { name: '전화번호',  desc: '010-XXXX-XXXX 형식', required: true },
        { name: '가입일',    desc: 'YYYY-MM-DD', required: false },
        { name: '경고 횟수', desc: '0~3', required: false },
        { name: '보유 포인트', desc: '숫자', required: false },
        { name: '최근 근무지', desc: '근무지 ID', required: false },
      ],
    },
    jobs: {
      title: '공고 엑셀 관리',
      filename: 'jobfit_jobs.xlsx',
      columns: [
        { name: '근무지 ID',  desc: 'gonjiam, icheon 등', required: true },
        { name: '날짜',       desc: 'YYYY-MM-DD', required: true },
        { name: '시간대',     desc: '주간/야간/새벽/웨딩', required: true },
        { name: '시작/종료',  desc: 'HH:MM~HH:MM', required: true },
        { name: '모집 인원',  desc: '숫자', required: true },
        { name: '알바비',     desc: '일급/시급 + 금액', required: true },
      ],
    },
    points: {
      title: '포인트 거래 엑셀 다운로드',
      filename: 'jobfit_point_transactions.xlsx',
      columns: [
        { name: '거래 ID',     desc: '자동', required: false },
        { name: '알바생',      desc: '이름/전화번호', required: false },
        { name: '종류',        desc: '출금/차감/지급', required: false },
        { name: '금액',        desc: '숫자 (P 단위)', required: false },
        { name: '상태',        desc: '대기/완료/실패', required: false },
        { name: '처리 일시',   desc: 'YYYY-MM-DD HH:MM', required: false },
      ],
    },
    sites: {
      title: '근무지 엑셀 관리',
      filename: 'jobfit_worksites.xlsx',
      columns: [
        { name: '파트너사 키', desc: 'cj/lotte/convention', required: true },
        { name: '근무지명',    desc: '표시 이름', required: true },
        { name: '주소',        desc: '도로명', required: true },
        { name: '좌표',        desc: 'lat,lng', required: false },
        { name: '담당자',      desc: '010-XXXX-XXXX', required: true },
      ],
    },
    audit: {
      title: '감사로그 엑셀 다운로드',
      filename: 'jobfit_audit_logs.xlsx',
      columns: [
        { name: '일시',     desc: 'YYYY-MM-DD HH:MM', required: false },
        { name: '카테고리', desc: '신청/경고/협의대상/GPS/포인트/공고 등', required: false },
        { name: '액션',     desc: 'approve/reject/add/release 등', required: false },
        { name: '대상',     desc: '근무자명 / 공고 정보', required: false },
        { name: '요약',     desc: '사유/변경사항', required: false },
        { name: '처리자',   desc: '관리자 이름 + 등급', required: false },
      ],
    },
  };

  const excelState = { context: 'workers', mode: 'download', uploading: false, progress: 0 };

  function showExcelModal(context) {
    excelState.context = context || 'workers';
    excelState.mode = 'download';
    excelState.uploading = false;
    excelState.progress = 0;
    renderExcelModal();
  }

  function renderExcelModal() {
    document.querySelectorAll('.jf-modal-overlay.excel').forEach(el => el.remove());
    const e = excelState;
    const ctx = EXCEL_CONTEXTS[e.context];

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay excel';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 600px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">${ctx.title}</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="jobs-view-toggle" style="margin-bottom: 16px;">
            <button class="${e.mode==='download'?'active':''}" onclick="excelState.mode='download'; renderExcelModal();">다운로드</button>
            <button class="${e.mode==='upload'?'active':''}" onclick="excelState.mode='upload'; renderExcelModal();">업로드</button>
          </div>

          ${e.mode === 'download' ? `
            <div style="font-size: 13px; color: #6B7684; margin-bottom: 14px;">
              현재 조건에 맞는 데이터를 엑셀 파일로 내려받습니다.
            </div>
            <div class="jf-panel" style="padding: 14px; background: #F9FAFB;">
              <div style="display:flex; gap:12px; align-items:center;">
                <div style="width:44px; height:52px; background:#16A34A; color:#fff; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; flex-shrink:0;">XLSX</div>
                <div style="flex:1;">
                  <div style="font-weight:500; font-size:13px;">${ctx.filename}</div>
                  <div style="font-size:11px; color:#6B7684; margin-top:2px;">컬럼 ${ctx.columns.length}개 · 예상 행 수 ${e.context==='workers'?workers.length:e.context==='jobs'?jobs.length:e.context==='points'?pointTxs.length:(function(){let n=0;Object.values(worksites).forEach(p=>n+=p.sites.length);return n;})()}건</div>
                </div>
                <button class="btn-primary" onclick="window.__excelDownload()">↓ 다운로드</button>
              </div>
            </div>
            <div style="font-size: 12px; color: #6B7684; margin-top: 12px;">포함 컬럼:</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; margin-top:6px;">
              ${ctx.columns.map(c => `<div style="font-size:11px; color:#374151; padding:4px 0;">• ${c.name}</div>`).join('')}
            </div>
          ` : `
            <div style="font-size: 13px; color: #6B7684; margin-bottom: 14px;">
              엑셀 파일로 데이터를 일괄 등록/업데이트합니다.
            </div>
            <div style="margin-bottom: 12px;">
              <button onclick="window.__excelTemplate()" style="font-size:12px;">📥 빈 양식 다운로드</button>
            </div>
            <div style="border: 2px dashed rgba(0,0,0,0.15); border-radius: 8px; padding: 40px 20px; text-align: center; background: #FAFBFC; cursor: pointer;" onclick="window.__excelPickFile()">
              ${e.uploading ? `
                <div style="font-size: 14px; color: #2563EB; margin-bottom: 12px;">업로드 중... ${e.progress}%</div>
                <div style="height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; max-width: 300px; margin: 0 auto;">
                  <div style="height:100%; background: #2563EB; width: ${e.progress}%; transition: width 0.2s;"></div>
                </div>
              ` : `
                <div style="font-size: 36px; opacity: 0.3; margin-bottom: 8px;">📂</div>
                <div style="font-size: 13px; color: #111827; font-weight: 500;">엑셀 파일을 끌어다 놓거나 클릭하여 선택</div>
                <div style="font-size: 11px; color: #6B7684; margin-top: 4px;">.xlsx, .xls, .csv 지원 · 최대 5MB</div>
              `}
            </div>
            <div class="ws-warn-box" style="margin-top: 14px;">
              ℹ 양식에 맞지 않거나 필수 컬럼이 비어있는 행은 <strong>자동 제외</strong>됩니다. 업로드 후 결과 보고서를 확인해주세요.
            </div>

            <div style="font-size: 12px; color: #6B7684; margin-top: 14px;">필수 컬럼:</div>
            <div style="margin-top: 6px;">
              ${ctx.columns.map(c => `
                <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:0.5px solid rgba(0,0,0,0.06);">
                  <span style="color:#111827; font-weight:500;">${c.name} ${c.required ? '<span style="color:#EF4444;">*</span>' : ''}</span>
                  <span style="color:#6B7684; font-size:11px;">${c.desc}</span>
                </div>
              `).join('')}
            </div>
          `}

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top: 20px; padding-top:14px; border-top:0.5px solid rgba(0,0,0,0.08);">
            <button onclick="this.closest('.jf-modal-overlay').remove()">닫기</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  window.__excelDownload = function() {
    const ctx = EXCEL_CONTEXTS[excelState.context];
    alert(`${ctx.filename} 다운로드 시작.\n\n(시뮬레이션: 실제 앱에서는 Supabase Edge Function이 데이터를 조회해서 XLSX 파일을 생성 후 전송합니다.)`);
    document.querySelectorAll('.jf-modal-overlay.excel').forEach(el => el.remove());
  };
  window.__excelTemplate = function() {
    const ctx = EXCEL_CONTEXTS[excelState.context];
    alert(`빈 양식 다운로드: ${ctx.filename.replace('.xlsx', '_template.xlsx')}\n\n양식 파일에는 컬럼 헤더와 예시 1행이 포함됩니다.`);
  };
  window.__excelPickFile = function() {
    if (excelState.uploading) return;
    excelState.uploading = true;
    excelState.progress = 0;
    renderExcelModal();
    // 가짜 업로드 진행 시뮬레이션
    const step = () => {
      if (!document.querySelector('.jf-modal-overlay.excel')) return; // 모달 닫히면 중단
      excelState.progress += 10;
      if (excelState.progress >= 100) {
        excelState.uploading = false;
        excelState.progress = 0;
        alert('업로드 완료.\n\n결과: 48건 성공 · 2건 오류 (필수 컬럼 누락)\n\n(실제 앱에서는 결과 상세 리포트 모달 표시 예정)');
        document.querySelectorAll('.jf-modal-overlay.excel').forEach(el => el.remove());
        return;
      }
      renderExcelModal();
      setTimeout(step, 180);
    };
    setTimeout(step, 300);
  };

  // ───────────────────────────────────────────────────────
  // 알림 발송 모달 (공용)
  // ───────────────────────────────────────────────────────
  const notifState = {
    targets: [],       // [{id, name, phone, type}]  type: worker/admin/group
    groupMode: 'specific',  // specific / all_workers / negotiation / warn / all_admins
    notifType: 'service',   // service / marketing / urgent
    title: '',
    body: '',
    allowNight: false,
    scheduled: false,
    scheduleAt: '',
  };

  function showNotificationModal(initialTargets = []) {
    document.querySelectorAll('.jf-modal-overlay.notif').forEach(el => el.remove());
    Object.assign(notifState, {
      targets: initialTargets,
      groupMode: initialTargets.length > 0 ? 'specific' : 'all_workers',
      notifType: 'service',
      title: '',
      body: '',
      allowNight: false,
      scheduled: false,
      scheduleAt: '',
    });
    renderNotificationModal();
  }

  function renderNotificationModal() {
    document.querySelectorAll('.jf-modal-overlay.notif').forEach(el => el.remove());
    const n = notifState;

    // 수신 대상 개수 계산
    let recipientCount = 0;
    if (n.groupMode === 'specific') recipientCount = n.targets.length;
    if (n.groupMode === 'all_workers') recipientCount = workers.length;
    if (n.groupMode === 'negotiation') recipientCount = workers.filter(w => w.negotiation).length;
    if (n.groupMode === 'warn') recipientCount = workers.filter(w => w.warnings >= 1 && !w.negotiation).length;
    if (n.groupMode === 'all_admins') recipientCount = admins.filter(a => a.active).length;

    const TYPE_LABEL = { service: '서비스 알림', marketing: '마케팅', urgent: '긴급 구인' };
    const TYPE_HINT = {
      service: '필수 알림 · 야간 제한 해제 가능',
      marketing: '수신 동의자에게만 발송 · 22:00~08:00 발송 금지',
      urgent: '수신 동의자에게만 발송 · 야간 발송 허용',
    };

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay notif';
    overlay.innerHTML = `
      <div class="jf-modal" style="max-width: 540px;" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">알림 발송</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="jf-form-row">
            <div class="jf-form-label">수신 대상</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${n.targets.length > 0 ? `<button class="login-role-btn ${n.groupMode==='specific'?'active':''}" onclick="notifState.groupMode='specific'; renderNotificationModal();">지정 (${n.targets.length}명)</button>` : ''}
              <button class="login-role-btn ${n.groupMode==='all_workers'?'active':''}" onclick="notifState.groupMode='all_workers'; renderNotificationModal();">전체 근무자</button>
              <button class="login-role-btn ${n.groupMode==='warn'?'active':''}" onclick="notifState.groupMode='warn'; renderNotificationModal();">경고 보유</button>
              <button class="login-role-btn ${n.groupMode==='negotiation'?'active':''}" onclick="notifState.groupMode='negotiation'; renderNotificationModal();">협의대상</button>
              <button class="login-role-btn ${n.groupMode==='all_admins'?'active':''}" onclick="notifState.groupMode='all_admins'; renderNotificationModal();">전체 관리자</button>
            </div>
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label"></div>
            <div style="font-size:12px; color:#2563EB; font-weight:500; padding-top:2px;">→ 발송 예정: ${recipientCount}명</div>
          </div>

          <div class="jf-form-row">
            <div class="jf-form-label">알림 유형</div>
            <div>
              <div style="display:flex; gap:6px;">
                ${['service','marketing','urgent'].map(t => `
                  <button class="login-role-btn ${n.notifType===t?'active':''}" onclick="notifState.notifType='${t}'; renderNotificationModal();">${TYPE_LABEL[t]}</button>
                `).join('')}
              </div>
              <div class="jf-form-hint">${TYPE_HINT[n.notifType]}</div>
            </div>
          </div>

          <div class="jf-form-row">
            <div class="jf-form-label">제목<span class="req">*</span></div>
            <input type="text" placeholder="최대 30자" maxlength="30" value="${n.title}" oninput="notifState.title = this.value" />
          </div>
          <div class="jf-form-row top">
            <div class="jf-form-label">내용<span class="req">*</span></div>
            <textarea rows="4" placeholder="알림 본문을 입력하세요..." oninput="notifState.body = this.value">${n.body}</textarea>
          </div>

          <div class="jf-form-row top" style="padding-top:14px;">
            <div class="jf-form-label">옵션</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <label class="jf-toggle">
                <input type="checkbox" ${n.allowNight?'checked':''} ${n.notifType==='marketing'?'disabled':''} onchange="notifState.allowNight = this.checked">
                <span class="jf-toggle-switch"></span>
                <span class="jf-toggle-text">야간 시간대(22:00~08:00)에도 발송</span>
              </label>
              <label class="jf-toggle">
                <input type="checkbox" ${n.scheduled?'checked':''} onchange="notifState.scheduled = this.checked; renderNotificationModal();">
                <span class="jf-toggle-switch"></span>
                <span class="jf-toggle-text">예약 발송</span>
              </label>
              ${n.scheduled ? `
                <input type="datetime-local" value="${n.scheduleAt}" oninput="notifState.scheduleAt = this.value" style="max-width:240px; margin-left:48px;" />
              ` : ''}
            </div>
          </div>

          <div style="display:flex; gap:8px; margin-top: 20px; padding-top:14px; border-top:0.5px solid rgba(0,0,0,0.08);">
            <button onclick="this.closest('.jf-modal-overlay').remove()">취소</button>
            <button onclick="alert('발송 전 미리보기 (추후 구현)')">미리보기</button>
            <div style="flex:1;"></div>
            <button class="btn-primary" onclick="window.__notifSend()" ${recipientCount===0 ? 'disabled' : ''}>${n.scheduled ? '예약 등록' : '즉시 발송'} (${recipientCount}명)</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  window.__notifSend = function() {
    const n = notifState;
    if (!n.title.trim()) { alert('제목을 입력해주세요'); return; }
    if (!n.body.trim()) { alert('내용을 입력해주세요'); return; }
    if (n.scheduled && !n.scheduleAt) { alert('예약 시간을 선택해주세요'); return; }

    let count = 0;
    let groupLabel = '';
    if (n.groupMode === 'specific')    { count = n.targets.length;                                         groupLabel = '지정 ' + count + '명'; }
    if (n.groupMode === 'all_workers') { count = workers.length;                                            groupLabel = '전체 근무자 ' + count + '명'; }
    if (n.groupMode === 'warn')        { count = workers.filter(w => w.warnings >= 1 && !w.negotiation).length; groupLabel = '경고 보유 ' + count + '명'; }
    if (n.groupMode === 'negotiation') { count = workers.filter(w => w.negotiation).length;                groupLabel = '협의대상 ' + count + '명'; }
    if (n.groupMode === 'all_admins')  { count = admins.filter(a => a.active).length;                      groupLabel = '관리자 ' + count + '명'; }

    const typeLabel = ({service:'서비스',marketing:'마케팅',urgent:'긴급 구인'})[n.notifType];
    const action = n.scheduled ? `예약 등록 (${n.scheduleAt})` : '즉시 발송';
    logAudit({
      category: 'notification', action: n.scheduled ? 'schedule' : 'send',
      target: groupLabel,
      summary: typeLabel + ' · ' + n.title + (n.scheduled ? ' · 예약 ' + n.scheduleAt : ''),
    });
    alert(`알림 ${action}\n\n유형: ${typeLabel}\n대상: ${count}명\n제목: ${n.title}`);
    document.querySelectorAll('.jf-modal-overlay.notif').forEach(el => el.remove());
  };

  // ───────────────────────────────────────────────────────
  // 파트너사 추가/수정 모달
  // ───────────────────────────────────────────────────────
  const partnerFormState = {
    mode: 'add',        // add / edit
    key: '',
    name: '',
    category: '택배',    // 택배 / 컨벤션 / 기타
    applyLimit: true,
    weekLimit: 4,
    description: '',
  };

  function renderPartnerForm(mode, existingKey) {
    const f = partnerFormState;
    f.mode = mode;
    if (mode === 'edit' && existingKey) {
      const p = worksites[existingKey];
      if (!p) return;
      f.key = existingKey;
      f.name = p.name;
      f.category = p.category || (existingKey === 'convention' ? '컨벤션' : '택배');
      f.applyLimit = p.applyLimit !== undefined ? p.applyLimit : (existingKey !== 'convention');
      f.weekLimit = p.weekLimit || 4;
      f.description = p.description || '';
    } else {
      Object.assign(f, { mode: 'add', key: '', name: '', category: '택배', applyLimit: true, weekLimit: 4, description: '' });
    }
    showPartnerFormModal();
  }

  function showPartnerFormModal() {
    const f = partnerFormState;
    document.querySelectorAll('.jf-modal-overlay.partner-form').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'jf-modal-overlay partner-form';
    overlay.innerHTML = `
      <div class="jf-modal" onclick="event.stopPropagation()">
        <div class="jf-modal-head">
          <div class="jf-modal-title">${f.mode === 'edit' ? '파트너사 설정' : '+ 새 파트너사 추가'}</div>
          <button class="jf-modal-close" onclick="this.closest('.jf-modal-overlay').remove()">×</button>
        </div>
        <div class="jf-modal-body">
          <div class="jf-form-row">
            <div class="jf-form-label">파트너사명<span class="req">*</span></div>
            <input type="text" placeholder="예: CJ대한통운" value="${f.name}" oninput="partnerFormState.name = this.value" style="max-width:280px;" />
          </div>
          <div class="jf-form-row">
            <div class="jf-form-label">업종 카테고리</div>
            <div style="display:flex; gap:6px;">
              ${['택배','컨벤션','기타'].map(c => `
                <button class="login-role-btn ${f.category===c?'active':''}" onclick="partnerFormState.category='${c}'; showPartnerFormModal();">${c}</button>
              `).join('')}
            </div>
          </div>
          <div class="jf-form-row top" style="padding-top: 14px;">
            <div class="jf-form-label">주 근무일 제한</div>
            <div>
              <label class="jf-toggle">
                <input type="checkbox" ${f.applyLimit?'checked':''} onchange="partnerFormState.applyLimit = this.checked; showPartnerFormModal();">
                <span class="jf-toggle-switch"></span>
                <span class="jf-toggle-text">파트너사 내 주 N일 제한 적용</span>
              </label>
              ${f.applyLimit ? `
                <div style="margin-top: 10px; display:flex; align-items:center; gap:8px;">
                  <span style="font-size:12px; color:#6B7684;">주 최대</span>
                  <input type="number" min="1" max="7" value="${f.weekLimit}" onchange="partnerFormState.weekLimit = parseInt(this.value)||4" style="width:60px;" />
                  <span style="font-size:12px; color:#6B7684;">일 근무 가능</span>
                </div>
              ` : ''}
              <div class="jf-form-hint">택배(CJ/롯데)는 보통 4일 제한. 컨벤션은 제한 없음.</div>
            </div>
          </div>
          <div class="jf-form-row top">
            <div class="jf-form-label">비고</div>
            <textarea rows="3" placeholder="특이사항, 계약 조건 등..." oninput="partnerFormState.description = this.value">${f.description}</textarea>
          </div>
          ${f.mode === 'edit' ? `
            <div style="margin-top: 16px; padding: 12px; background: #F5F7FA; border-radius: 8px; font-size: 12px; color: #6B7684;">
              이 파트너사에 등록된 근무지: <strong style="color:#111827;">${worksites[f.key]?.sites.length || 0}곳</strong>
            </div>
          ` : ''}
          <div style="display:flex; gap:8px; margin-top: 20px;">
            ${f.mode === 'edit' ? `<button class="btn-danger" onclick="window.__partnerDelete()" style="color:#EF4444;">삭제</button>` : ''}
            <div style="flex:1;"></div>
            <button onclick="this.closest('.jf-modal-overlay').remove()">취소</button>
            <button class="btn-primary" onclick="window.__partnerSubmit()">${f.mode === 'edit' ? '저장' : '추가'}</button>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  window.__partnerSubmit = function() {
    const f = partnerFormState;
    if (!f.name.trim()) { alert('파트너사명을 입력해주세요'); return; }

    if (f.mode === 'add') {
      const key = f.name.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase().slice(0, 10) + '_' + Date.now().toString(36).slice(-3);
      worksites[key] = {
        name: f.name,
        category: f.category,
        applyLimit: f.applyLimit,
        weekLimit: f.weekLimit,
        description: f.description,
        count: 0,
        sites: [],
      };
      alert(`"${f.name}" 파트너사 추가 완료.\n키: ${key}\n\n이제 "+ 근무지 추가"로 근무지를 등록해주세요.`);
    } else {
      const p = worksites[f.key]; if (!p) return;
      p.name = f.name;
      p.category = f.category;
      p.applyLimit = f.applyLimit;
      p.weekLimit = f.weekLimit;
      p.description = f.description;
      alert(`"${f.name}" 정보 저장 완료.`);
    }
    document.querySelectorAll('.jf-modal-overlay.partner-form').forEach(el => el.remove());
    renderList();
  };
  window.__partnerDelete = function() {
    const f = partnerFormState;
    const p = worksites[f.key]; if (!p) return;
    if (p.sites.length > 0) { alert(`이 파트너사에 등록된 근무지가 ${p.sites.length}곳 있습니다.\n먼저 근무지를 모두 삭제하거나 다른 파트너사로 이동해주세요.`); return; }
    if (!confirm(`"${p.name}" 파트너사를 삭제합니다. 계속하시겠습니까?`)) return;
    delete worksites[f.key];
    alert('삭제 완료.');
    document.querySelectorAll('.jf-modal-overlay.partner-form').forEach(el => el.remove());
    renderList();
  };

  window.__wsAddSite = function() {
    Object.assign(siteFormState, { step: 1, partnerKey: '', siteName: '', address: '', lat: 37.5665, lng: 126.9780, bus: false, wage: 100000, wageType: '일급', holiday: '주 4일 만근', contact: '', manager1: '', manager2: '' });
    renderSiteWizard();
  };

  // ───────────────────────────────────────────────────────
  // 글로벌 검색 (Cmd+K / Ctrl+K) — 페이지/근무자/공고/근무지/관리자 통합
  // ───────────────────────────────────────────────────────
  const PAGE_INDEX = [
    { kind: 'page', title: '홈',           sub: '대시보드 · KPI · 이상감지', icon: '🏠', goto: 'home' },
    { kind: 'page', title: '공고 관리',    sub: '공고 리스트 · 등록 · 템플릿', icon: '📋', goto: 'jobs' },
    { kind: 'page', title: '신청 승인',    sub: '대기 중인 신청 검토', icon: '✓', goto: 'approval' },
    { kind: 'page', title: '대기열 승인',  sub: 'FULL 공고 자리 제안', icon: '⏱', goto: 'waitlistapv' },
    { kind: 'page', title: '퇴근 승인',    sub: 'GPS 미검증 퇴근 검토', icon: '📍', goto: 'gpsapproval' },
    { kind: 'page', title: '근무자 관리',  sub: '50명 알바생 · 경고 이력', icon: '👥', goto: 'workers' },
    { kind: 'page', title: '근무지 관리',  sub: '11개 근무지 · GPS 영역', icon: '🏢', goto: 'worksite' },
    { kind: 'page', title: '협의대상',     sub: '전화번호 기반 차단 명단', icon: '🚫', goto: 'negotiation' },
    { kind: 'page', title: '포인트',       sub: '출금 요청 · 이력 · 회수', icon: '💰', goto: 'points' },
    { kind: 'page', title: '문의',         sub: '알바생 문의 답변', icon: '💬', goto: 'inquiry' },
    { kind: 'page', title: '앱 미리보기',  sub: '알바생 앱 모바일 화면', icon: '📱', goto: 'apppreview' },
    { kind: 'page', title: '관제 시스템',  sub: '실시간 출결 · 별도 창', icon: '🖥', goto: 'control' },
    { kind: 'page', title: '통계 리포트',  sub: '파트너사/시간대/트렌드', icon: '📊', goto: 'stats' },
    { kind: 'page', title: '관리자 계정',  sub: '권한 3등급 · 근무지 배정', icon: '👤', goto: 'accounts' },
    { kind: 'page', title: '감사로그',     sub: '관리자 액션 추적 (마스터)', icon: '📜', goto: 'audit' },
  ];

  const gsState = { open: false, q: '', activeIdx: 0, results: [] };

  function buildSearchResults(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      // 기본: 페이지만 보여주기
      return PAGE_INDEX.map(p => ({ ...p, score: 0 }));
    }
    const out = [];
    // 페이지
    PAGE_INDEX.forEach(p => {
      const blob = (p.title + ' ' + p.sub).toLowerCase();
      if (blob.includes(query)) out.push({ ...p, score: p.title.toLowerCase().startsWith(query) ? 0 : 1 });
    });
    // 근무자
    workers.forEach(w => {
      const blob = (w.name + ' ' + w.phone).toLowerCase();
      if (blob.includes(query)) {
        out.push({
          kind: 'worker', title: w.name, sub: w.phone + ' · 경고 ' + w.warnings + ' · ' + w.points.toLocaleString() + 'P' + (w.negotiation?' · 협의대상':''),
          icon: w.negotiation ? '🚫' : (w.warnings > 0 ? '⚠' : '👤'),
          goto: () => { window.__navGoto('workers'); setTimeout(() => window.__wrkDetail(w.id), 60); },
          score: 2,
        });
      }
    });
    // 공고
    jobs.forEach(j => {
      const site = findSite(j.siteId); if (!site) return;
      const blob = (site.site.name + ' ' + site.partner + ' ' + j.date + ' ' + j.slot + ' ' + j.id).toLowerCase();
      if (blob.includes(query)) {
        out.push({
          kind: 'job', title: site.site.name + ' · ' + j.slot + ' ' + j.start + '~' + j.end,
          sub: j.date + ' · ' + site.partner + ' · 모집 ' + j.apply + '/' + j.cap + ' · ' + j.id,
          icon: '📋',
          goto: () => { window.__navGoto('jobs'); setTimeout(() => window.__jobsDetail(j.id), 60); },
          score: 3,
        });
      }
    });
    // 근무지
    Object.values(worksites).flatMap(p => p.sites).forEach(s => {
      const blob = (s.name + ' ' + s.addr).toLowerCase();
      if (blob.includes(query)) {
        out.push({
          kind: 'site', title: s.name, sub: s.addr + ' · ' + (s.gps ? 'GPS ✓' : 'GPS ✗') + ' · 진행 ' + (s.activeJobs || 0),
          icon: '🏢',
          goto: () => { window.__navGoto('worksite'); setTimeout(() => window.__wsDetail(s.id), 60); },
          score: 4,
        });
      }
    });
    // 관리자
    admins.forEach(a => {
      const blob = (a.name + ' ' + a.phone + ' ' + (ROLE_LABEL[a.role]||'')).toLowerCase();
      if (blob.includes(query)) {
        out.push({
          kind: 'admin', title: a.name + ' (' + (ROLE_LABEL[a.role]||a.role) + ')', sub: a.phone + ' · ' + (a.active ? '활성' : '비활성'),
          icon: '🛡',
          goto: () => { window.__navGoto('accounts'); setTimeout(() => window.__admDetail(a.id), 60); },
          score: 5,
        });
      }
    });
    return out.sort((x, y) => x.score - y.score).slice(0, 50);
  }

  function renderGlobalSearch() {
    document.querySelectorAll('.gs-overlay').forEach(el => el.remove());
    if (!gsState.open) return;

    const grouped = {};
    gsState.results.forEach(r => {
      const k = r.kind;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(r);
    });
    const KIND_LABEL = { page: '📍 페이지', worker: '👥 근무자', job: '📋 공고', site: '🏢 근무지', admin: '🛡 관리자' };
    const order = ['page', 'worker', 'job', 'site', 'admin'];

    let listHtml = '';
    let flatIdx = 0;
    if (gsState.results.length === 0) {
      listHtml = `<div class="gs-empty">검색 결과 없음 — 다른 키워드를 시도해보세요</div>`;
    } else {
      order.forEach(k => {
        if (!grouped[k]) return;
        listHtml += `<div class="gs-section">${KIND_LABEL[k] || k} <span style="opacity:0.6; font-weight:400;">${grouped[k].length}</span></div>`;
        grouped[k].forEach(r => {
          const isActive = flatIdx === gsState.activeIdx;
          listHtml += `
            <div class="gs-item ${isActive?'active':''}" data-gs-idx="${flatIdx}" onclick="window.__gsSelect(${flatIdx})">
              <div class="gs-item-icon">${r.icon || '·'}</div>
              <div class="gs-item-main">
                <div class="gs-item-title">${esc(r.title)}</div>
                <div class="gs-item-sub">${esc(r.sub || '')}</div>
              </div>
              <div class="gs-item-arrow">↵</div>
            </div>
          `;
          flatIdx++;
        });
      });
    }

    const overlay = document.createElement('div');
    overlay.className = 'gs-overlay';
    overlay.innerHTML = `
      <div class="gs-modal" onclick="event.stopPropagation()">
        <div class="gs-input-wrap">
          <input type="text" class="gs-input" id="gs-input" placeholder="페이지 · 근무자 이름/전화번호 · 공고 · 근무지 · 관리자 검색..." value="${esc(gsState.q)}" autofocus />
          <span class="gs-kbd">ESC</span>
        </div>
        <div class="gs-results">${listHtml}</div>
        <div class="gs-foot">
          <span class="gs-foot-key"><span class="gs-kbd">↑↓</span> 이동</span>
          <span class="gs-foot-key"><span class="gs-kbd">↵</span> 선택</span>
          <span class="gs-foot-key"><span class="gs-kbd">Esc</span> 닫기</span>
          <span style="margin-left:auto;">${gsState.results.length}개 결과</span>
        </div>
      </div>
    `;
    overlay.addEventListener('click', () => window.__gsClose());
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#gs-input');
    if (input) {
      input.focus();
      // 커서를 끝으로 이동
      const len = input.value.length;
      input.setSelectionRange(len, len);
      input.addEventListener('input', (e) => {
        gsState.q = e.target.value;
        gsState.results = buildSearchResults(gsState.q);
        gsState.activeIdx = 0;
        renderGlobalSearch();
      });
    }

    // 활성 항목으로 스크롤
    setTimeout(() => {
      const active = overlay.querySelector('.gs-item.active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  window.__gsOpen = function() {
    gsState.open = true;
    gsState.q = '';
    gsState.results = buildSearchResults('');
    gsState.activeIdx = 0;
    renderGlobalSearch();
  };
  window.__gsClose = function() {
    gsState.open = false;
    document.querySelectorAll('.gs-overlay').forEach(el => el.remove());
  };
  window.__gsSelect = function(idx) {
    const r = gsState.results[idx];
    if (!r) return;
    window.__gsClose();
    if (typeof r.goto === 'function') r.goto();
    else if (typeof r.goto === 'string') window.__navGoto(r.goto);
  };

  // 키보드: Cmd+K / Ctrl+K 토글, ESC 닫기, ↑↓ 이동, Enter 선택
  document.addEventListener('keydown', (e) => {
    const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
    if (isCmdK) {
      e.preventDefault();
      if (gsState.open) window.__gsClose();
      else window.__gsOpen();
      return;
    }
    if (!gsState.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      window.__gsClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (gsState.results.length === 0) return;
      gsState.activeIdx = (gsState.activeIdx + 1) % gsState.results.length;
      renderGlobalSearch();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (gsState.results.length === 0) return;
      gsState.activeIdx = (gsState.activeIdx - 1 + gsState.results.length) % gsState.results.length;
      renderGlobalSearch();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      window.__gsSelect(gsState.activeIdx);
      return;
    }
  });

  const pageRouters = {
    home: renderHome,
    worksite: renderList,
    jobs: () => { jobsState.tab = 'list'; renderJobs(); },
    approval: renderApproval,
    waitlistapv: renderWaitlistApv,
    gpsapproval: renderGpsApproval,
    workers: renderWorkers,
    negotiation: renderNegotiation,
    points: () => { pointState.tab = 'request'; renderPoints(); },
    control: () => window.__openControlBoard(),
    accounts: renderAdmins,
    inquiry: renderInquiries,
    stats: renderStats,
    apppreview: renderAppPreview,
    audit: renderAuditLog,
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      const renderer = pageRouters[page];
      if (!renderer) {
        alert(pageNameFor(page) + ' 페이지는 아직 구현되지 않았습니다.');
        return;
      }
      // 퇴근 승인 페이지를 벗어나면 시계/자동갱신 타이머 중단
      if (page !== 'gpsapproval') ctrlStopTimers();
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderer();
    });
  });

  function pageNameFor(page) {
    const names = { home: '홈', jobs: '공고 관리', approval: '신청 승인', waitlistapv: '대기열 승인', gpsapproval: '퇴근 승인', workers: '근무자 관리', control: '관제 시스템', negotiation: '협의대상', points: '포인트', inquiry: '문의', accounts: '관리자 계정', stats: '통계 리포트', apppreview: '앱 미리보기', audit: '감사로그' };
    return names[page] || '';
  }

  initWaitlistTimers();
  startWaitlistTicker();
  updateApprovalBadge();
  updateWaitlistBadge();
  updateGpsBadge();
  renderHome();

  // 관제 창에서 공고 상세로 딥링크 (#job=xxx) — 진입 시 자동 이동
  if (location.hash && location.hash.startsWith('#job=')) {
    const jid = location.hash.slice(5);
    if (findJob(jid)) {
      setTimeout(() => {
        window.__navGoto('jobs');
        setTimeout(() => window.__jobsDetail(jid), 50);
      }, 100);
    }
    history.replaceState(null, '', location.pathname); // 해시 제거
  }
})();
