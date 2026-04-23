// 잡핏(JobFit) 관리자 웹 — 앱 로직
// 헬퍼 함수 · 페이지 렌더 함수 · 이벤트 핸들러 · 초기화
// 데이터는 js/data.js 에서 로드됨 (worksites · jobs · workers · ...)

(function(){
  const main = document.getElementById('jf-main-content');
  const navItems = document.querySelectorAll('.jf-nav-item');


  function findSite(siteId) {
    for (const key in worksites) {
      const s = worksites[key].sites.find(s => s.id === siteId);
      if (s) return { site: s, partner: worksites[key].name, partnerKey: key };
    }
    return null;
  }

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
            <div class="ws-info-row"><div class="ws-info-label">통근버스</div><div class="ws-info-val">${s.bus ? '운영 중' : '없음'}</div></div>
            <div class="ws-info-row"><div class="ws-info-label">주 근무일 제한</div><div class="ws-info-val">${found.partnerKey==='convention'?'제한 없음':'파트너사 기준 주 4일'}</div></div>
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
    const newAnswer = prompt('답변을 수정하세요:', it.answer);
    if (newAnswer === null) return;
    it.answer = newAnswer.trim();
    it.answeredAt = TODAY + ' ' + new Date().toTimeString().slice(0,5);
    renderInquiryDetail(id);
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
    alert(`${f.name} (${ROLE_LABEL[f.role]}) 관리자 추가 완료.${f.role === 'admin2' ? `\n담당 근무지 ${f.sites.length}곳 배정됨.` : ''}`);
    document.querySelectorAll('.jf-modal-overlay.admin-add').forEach(el => el.remove());
    renderAdmins();
  };
  window.__admToggleActive = function(id) {
    const a = findAdmin(id); if (!a) return;
    if (!confirm(`${a.name} 님 계정을 ${a.active ? '비활성화' : '활성화'}하시겠습니까?`)) return;
    a.active = !a.active;
    renderAdminDetail(id);
  };
  window.__admDelete = function(id) {
    const a = findAdmin(id); if (!a) return;
    if (a.role === 'master') { alert('마스터 계정은 삭제할 수 없습니다.'); return; }
    if (!confirm(`${a.name} 님 계정을 삭제합니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) return;
    const idx = admins.indexOf(a); if (idx >= 0) admins.splice(idx, 1);
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

      <div class="jf-metric-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 12px;">
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('control')">
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
        <div class="jf-metric" style="cursor:pointer;" onclick="window.__navGoto('control')">
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
                  <div onclick="window.__navGoto('control'); setTimeout(() => window.__ctrlDetail('${j.id}'), 50);" style="padding: 10px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06); cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:10px;">
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
  // 관제 시스템
  // ───────────────────────────────────────────────────────
  const ctrlState = {
    partnerKey: '',
    siteId: '',
    slot: '',
    dateRange: 'today',  // today / week / all / past
  };

  function addMin(hhmm, m) {
    const [h, mm] = hhmm.split(':').map(Number);
    const total = h * 60 + mm + m;
    return String(Math.floor(total/60) % 24).padStart(2,'0') + ':' + String(total%60).padStart(2,'0');
  }

  // 도넛 SVG — segments: [{value, color}]
  function donutSvg(segments, size = 90, thick = 10) {
    const center = size / 2;
    const r = (size - thick) / 2;
    const circ = 2 * Math.PI * r;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    let paths = '';
    if (total === 0) {
      paths = `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#E5E7EB" stroke-width="${thick}"/>`;
    } else {
      let offset = 0;
      paths = `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#F3F4F6" stroke-width="${thick}"/>`;
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

  // 잡핏 포인트 보상 — 시간대별 (알바비와는 별개, 잡핏은 중계 업체로 포인트만 지급)
  // 알바비(일급)는 파트너사가 알바생에게 직접 지급함
  const POINT_REWARDS = { 주간: 2000, 야간: 2500, 새벽: 3000, 웨딩: 2500 };
  function pointRewardFor(job) {
    return POINT_REWARDS[job.slot] || 2000;
  }

  // 출결 → 도넛 segments + 중앙 텍스트 생성
  function attendanceDonut(sum, size = 90, thick = 10) {
    const segments = [
      { value: sum.출근, color: '#22C55E' },
      { value: sum.지각, color: '#F59E0B' },
      { value: sum.결근, color: '#EF4444' },
      { value: sum.대기, color: '#D1D5DB' },
    ];
    const attended = sum.출근 + sum.지각 + sum.결근;
    let centerHtml;
    if (attended === 0) {
      const totalWait = sum.대기;
      centerHtml = `<div class="ctrl-donut-pct">${totalWait}</div><div class="ctrl-donut-label">대기 명</div>`;
    } else {
      const rate = Math.round((sum.출근 + sum.지각) / attended * 100);
      centerHtml = `<div class="ctrl-donut-pct">${rate}%</div><div class="ctrl-donut-label">출근율</div>`;
    }
    return `
      <div class="ctrl-donut-wrap" style="width:${size}px; height:${size}px;">
        ${donutSvg(segments, size, thick)}
        <div class="ctrl-donut-center">${centerHtml}</div>
      </div>
    `;
  }

  // 결정적 출결 시뮬레이션 — 공고 상태에 따라 분포 조정
  function getAttendance(jobId) {
    const job = findJob(jobId); if (!job) return [];
    const st = jobStatus(job);
    const seed = [...jobId].reduce((s, c) => s + c.charCodeAt(0), 0);
    const actualCount = Math.min(job.apply, workers.length);
    const shuffled = [...workers].sort((a, b) =>
      ((seed + a.id.charCodeAt(3)) % 100) - ((seed + b.id.charCodeAt(3)) % 100)
    );
    const picked = shuffled.slice(0, actualCount);

    return picked.map((w, i) => {
      const r = (seed + i * 7) % 100;
      if (st === 'open' || st === 'closed') {
        return { worker: w, status: '대기', checkin: null, checkout: null };
      }
      if (st === 'progress') {
        if (r < 70) return { worker: w, status: '출근', checkin: job.start, checkout: null };
        if (r < 90) return { worker: w, status: '지각', checkin: addMin(job.start, 8 + (r % 20)), checkout: null };
        return { worker: w, status: '결근', checkin: null, checkout: null };
      }
      // done
      if (r < 85) return { worker: w, status: '출근', checkin: job.start, checkout: job.end };
      if (r < 95) return { worker: w, status: '지각', checkin: addMin(job.start, 5 + (r % 15)), checkout: job.end };
      return { worker: w, status: '결근', checkin: null, checkout: null };
    });
  }

  function attendanceSummary(jobId) {
    const list = getAttendance(jobId);
    const sum = { 출근: 0, 지각: 0, 결근: 0, 대기: 0 };
    list.forEach(a => sum[a.status]++);
    return sum;
  }

  function renderControl() {
    // 날짜 필터
    const todayStr = TODAY;
    const weekAgo = new Date(TODAY); weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    let list = jobs.filter(j => {
      const site = findSite(j.siteId); if (!site) return false;
      if (ctrlState.partnerKey && ctrlState.partnerKey !== site.partnerKey) return false;
      if (ctrlState.siteId && ctrlState.siteId !== j.siteId) return false;
      if (ctrlState.slot && ctrlState.slot !== j.slot) return false;
      if (ctrlState.dateRange === 'today') return j.date === todayStr;
      if (ctrlState.dateRange === 'week')  return j.date >= weekAgoStr && j.date <= todayStr;
      if (ctrlState.dateRange === 'past')  return j.date < todayStr;
      return true; // all
    });

    // 시작 시간 임박순: 오늘+미래는 오름차순, 과거는 최근순
    list = list.sort((a, b) => {
      if (a.date === b.date) return (a.start || '').localeCompare(b.start || '');
      return a.date.localeCompare(b.date);
    });

    // 메트릭 (오늘 기준)
    const todayJobs = jobs.filter(j => j.date === todayStr);
    const todayProgress = todayJobs.filter(j => jobStatus(j) === 'progress').length;
    const todayWaiting = todayJobs.filter(j => ['open', 'closed'].includes(jobStatus(j))).length;
    const todayDone = todayJobs.filter(j => jobStatus(j) === 'done').length;
    // 오늘 평균 출근율 (진행/종료 공고 대상)
    const rateJobs = todayJobs.filter(j => ['progress', 'done'].includes(jobStatus(j)));
    let avgRate = '-';
    if (rateJobs.length > 0) {
      let totalSum = 0, okSum = 0;
      rateJobs.forEach(j => {
        const s = attendanceSummary(j.id);
        const tot = s.출근 + s.지각 + s.결근;
        totalSum += tot;
        okSum += s.출근 + s.지각;
      });
      avgRate = totalSum > 0 ? Math.round(okSum / totalSum * 100) + '%' : '-';
    }

    const partnerOpts = Object.keys(worksites).map(k =>
      `<option value="${k}" ${ctrlState.partnerKey === k ? 'selected' : ''}>${worksites[k].name}</option>`).join('');
    const siteOpts = (() => {
      const sites = ctrlState.partnerKey
        ? worksites[ctrlState.partnerKey].sites
        : Object.values(worksites).flatMap(p => p.sites);
      return sites.map(s => `<option value="${s.id}" ${ctrlState.siteId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    })();

    let html = `
      <div class="jf-header">
        <div>
          <div class="jf-title">관제 시스템</div>
          <div class="jf-subtitle">실시간 출근 현황 · 전 근무지 열람 (등급 무관)</div>
        </div>
        <div class="ws-actions">
          <button onclick="window.__ctrlRefresh()">↻ 새로고침</button>
        </div>
      </div>

      <div class="jf-metric-grid">
        <div class="jf-metric"><div class="jf-metric-label">진행 중</div><div class="jf-metric-value" style="color:#22C55E;">${todayProgress}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">오늘 근무 중</div></div>
        <div class="jf-metric"><div class="jf-metric-label">대기 (시작 전)</div><div class="jf-metric-value" style="color:#F59E0B;">${todayWaiting}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">오늘 예정 공고</div></div>
        <div class="jf-metric"><div class="jf-metric-label">종료</div><div class="jf-metric-value" style="color:#6B7684;">${todayDone}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">오늘 마감된 공고</div></div>
        <div class="jf-metric"><div class="jf-metric-label">평균 출근율</div><div class="jf-metric-value">${avgRate}</div><div class="jf-metric-hint">오늘 진행·종료 기준</div></div>
      </div>

      <div class="jobs-filters">
        <select onchange="window.__ctrlFilter('dateRange', this.value)">
          <option value="today" ${ctrlState.dateRange==='today'?'selected':''}>오늘</option>
          <option value="week"  ${ctrlState.dateRange==='week'?'selected':''}>최근 7일</option>
          <option value="past"  ${ctrlState.dateRange==='past'?'selected':''}>과거 전체</option>
          <option value="all"   ${ctrlState.dateRange==='all'?'selected':''}>전체 (과거+예정)</option>
        </select>
        <select onchange="window.__ctrlFilter('partnerKey', this.value)">
          <option value="">전체 파트너사</option>${partnerOpts}
        </select>
        <select onchange="window.__ctrlFilter('siteId', this.value)">
          <option value="">전체 근무지</option>${siteOpts}
        </select>
        <select onchange="window.__ctrlFilter('slot', this.value)">
          <option value="">전체 시간대</option>
          <option value="주간" ${ctrlState.slot==='주간'?'selected':''}>주간</option>
          <option value="야간" ${ctrlState.slot==='야간'?'selected':''}>야간</option>
          <option value="새벽" ${ctrlState.slot==='새벽'?'selected':''}>새벽</option>
          <option value="웨딩" ${ctrlState.slot==='웨딩'?'selected':''}>웨딩</option>
        </select>
        <div style="margin-left:auto; font-size:12px; color:#6B7684; align-self:center;">${list.length}건 · 시작 임박순 정렬</div>
      </div>
    `;

    if (list.length === 0) {
      html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">📡</div><div class="jf-placeholder-title">조건에 맞는 공고가 없습니다</div><div class="jf-placeholder-desc">날짜 범위나 필터를 변경해보세요.</div></div>`;
    } else {
      html += `<div class="ctrl-grid">`;
      list.forEach(j => {
        const site = findSite(j.siteId);
        const st = jobStatus(j);
        const cls = st === 'done' ? 'done' : st === 'progress' ? 'progress' : 'waiting';
        const stLabel = STATUS_LABEL[st];
        const stColor = { open:'#2563EB', closed:'#F59E0B', progress:'#22C55E', done:'#6B7684' }[st];
        const sum = attendanceSummary(j.id);

        html += `
          <div class="ctrl-card ${cls}" onclick="window.__ctrlDetail('${j.id}')">
            <div class="ctrl-card-time">${j.date} · ${j.slot} ${j.start}~${j.end}</div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div>
                <div class="ctrl-card-site">${site.site.name}</div>
                <div class="ctrl-card-partner">${site.partner} · 모집 ${j.apply}/${j.cap}명</div>
              </div>
              <span class="jobs-status" style="background:${stColor}22; color:${stColor};">${stLabel}</span>
            </div>
            <div class="ctrl-donut-row">
              ${attendanceDonut(sum, 92, 11)}
              <div class="ctrl-donut-legend">
                <div><span class="ctrl-donut-dot" style="background:#22C55E;"></span>출근<strong>${sum.출근}</strong></div>
                <div><span class="ctrl-donut-dot" style="background:#F59E0B;"></span>지각<strong>${sum.지각}</strong></div>
                <div><span class="ctrl-donut-dot" style="background:#EF4444;"></span>결근<strong>${sum.결근}</strong></div>
                <div><span class="ctrl-donut-dot" style="background:#D1D5DB;"></span>대기<strong>${sum.대기}</strong></div>
              </div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    main.innerHTML = html;
  }

  function renderControlDetail(jobId) {
    const j = findJob(jobId); if (!j) return;
    const site = findSite(j.siteId);
    const st = jobStatus(j);
    const attend = getAttendance(jobId);
    const sum = attendanceSummary(jobId);
    const stLabel = STATUS_LABEL[st];
    const stColor = { open:'#2563EB', closed:'#F59E0B', progress:'#22C55E', done:'#6B7684' }[st];

    // 잡핏 포인트 지급 내역 (종료된 공고만)
    // 알바비(일급)는 파트너사가 알바생에게 직접 지급 — 잡핏은 중계업체로 포인트만 지급
    const reward = pointRewardFor(j);
    const paidCount = sum.출근 + sum.지각;
    const payoutHtml = st === 'done'
      ? `<div class="jf-panel" style="margin-top:12px;">
          <div class="ws-section-title">
            잡핏 포인트 지급 내역
            <span style="font-size:11px; color:#6B7684; font-weight:400;">중계 수수료 성격 · 알바비(${j.wage.toLocaleString()}원)는 ${site.partner}에서 직접 지급</span>
          </div>
          ${paidCount === 0
            ? '<div style="padding:14px 0; color:#6B7684; font-size:12px; text-align:center;">지급 대상자가 없습니다.</div>'
            : attend.filter(a => a.status !== '결근' && a.status !== '대기').map(a =>
              `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid rgba(0,0,0,0.06); font-size:13px;">
                <span>${a.worker.name} <span style="color:#6B7684; font-size:11px;">${a.worker.phone}</span></span>
                <strong style="color:#2563EB;">+${reward.toLocaleString()} P</strong>
              </div>`).join('')
          }
          <div style="display:flex; justify-content:space-between; padding:12px 0 0; font-size:13px; font-weight:500;">
            <span>잡핏 포인트 총 지급</span>
            <strong>${(paidCount * reward).toLocaleString()} P <span style="color:#6B7684; font-size:11px; font-weight:400;">(${paidCount}명 × ${reward.toLocaleString()}P)</span></strong>
          </div>
        </div>`
      : '';

    main.innerHTML = `
      <span class="jf-back" onclick="window.__ctrlBack()">← 관제 목록으로</span>
      <div class="jf-header">
        <div>
          <div class="jf-title">${site.site.name} <span class="ws-mini-tag" style="vertical-align:middle;">${site.partner}</span></div>
          <div class="jf-subtitle">${j.date} · ${j.slot} ${j.start}~${j.end} · 알바비 ${j.wage.toLocaleString()}원 <span style="color:#9CA3AF;">(${site.partner} 직접 지급)</span> · 잡핏 포인트 ${reward.toLocaleString()}P</div>
        </div>
        <div>
          <span class="jobs-status" style="background:${stColor}22; color:${stColor}; font-size:13px; padding:6px 14px;">${stLabel}</span>
        </div>
      </div>

      <div class="jf-panel" style="margin-bottom: 16px; padding: 28px;">
        <div style="display: flex; gap: 32px; align-items: center;">
          <div class="ctrl-donut-big">
            ${attendanceDonut(sum, 200, 22)}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 13px; color: #6B7684; margin-bottom: 14px; font-weight: 500;">출결 현황</div>
            <div class="ctrl-donut-legend ctrl-donut-legend-big">
              <div><span class="ctrl-donut-dot" style="background:#22C55E; width:12px; height:12px;"></span>🟢 출근<strong>${sum.출근}</strong></div>
              <div><span class="ctrl-donut-dot" style="background:#F59E0B; width:12px; height:12px;"></span>🟡 지각<strong>${sum.지각}</strong></div>
              <div><span class="ctrl-donut-dot" style="background:#EF4444; width:12px; height:12px;"></span>🔴 결근<strong>${sum.결근}</strong></div>
              <div><span class="ctrl-donut-dot" style="background:#D1D5DB; width:12px; height:12px;"></span>⚪ 대기<strong>${sum.대기}</strong></div>
            </div>
            <div style="margin-top: 16px; padding-top: 14px; border-top: 0.5px solid rgba(0,0,0,0.08); font-size: 12px; color: #6B7684;">
              ${(sum.출근 + sum.지각 + sum.결근) > 0
                ? `확정 ${sum.출근 + sum.지각 + sum.결근 + sum.대기}명 중 출석 ${sum.출근 + sum.지각}명 · 결근 ${sum.결근}명`
                : `확정 ${sum.대기}명 · 근무 시작 전 대기 상태`}
            </div>
          </div>
        </div>
      </div>

      <div class="jf-panel">
        <div class="ws-section-title">알바생 명단 <span style="font-size:11px; color:#6B7684; font-weight:400;">이름 클릭 시 계약서 + 서명 확인</span></div>
        <div class="jf-table-head" style="grid-template-columns: 30px 1.5fr 1fr 1fr 0.8fr auto; padding: 10px 12px;">
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
            return `
              <div class="ctrl-roster-row" onclick="window.__ctrlContract('${j.id}','${a.worker.id}')">
                <div><span class="ctrl-roster-dot ${dotCls}"></span></div>
                <div>
                  <div style="font-weight:500;">${a.worker.name}</div>
                  <div style="font-size:11px; color:#6B7684; font-family:'SF Mono',Monaco,monospace;">${a.worker.phone}</div>
                </div>
                <div style="font-size:12px; color:${a.checkin ? '#111827' : '#D1D5DB'};">${a.checkin || '-'}</div>
                <div style="font-size:12px; color:${a.checkout ? '#111827' : '#D1D5DB'};">${a.checkout || '-'}</div>
                <div style="color:${stClr}; font-size:12px; font-weight:500;">${a.status}</div>
                <div style="text-align:right; color:#2563EB; font-size:12px;">📄 계약서</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${payoutHtml}
    `;
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

  window.__ctrlFilter = function(key, val) {
    ctrlState[key] = val;
    if (key === 'partnerKey') ctrlState.siteId = '';
    renderControl();
  };
  window.__ctrlRefresh = function() { renderControl(); };
  window.__ctrlDetail = function(id) { renderControlDetail(id); };
  window.__ctrlBack = function() { renderControl(); };
  window.__ctrlContract = function(jobId, workerId) { renderContractModal(jobId, workerId); };

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
    alert(`${w.name} 님 출금 ${t.amount.toLocaleString()}P 처리 완료.`);
    renderPoints();
  };
  window.__ptFail = function(id) {
    const t = findTx(id); if (!t) return;
    const w = findWorker(t.workerId);
    const reason = prompt(`${w.name} 님의 출금 처리 실패 사유를 입력하세요:\n(예: 계좌번호 오류, 은행 점검 중 등)`);
    if (!reason) return;
    t.status = 'failed';
    t.processedAt = TODAY + ' ' + new Date().toTimeString().slice(0,5);
    t.processedBy = '테스트(마스터)';
    t.failReason = reason;
    alert(`출금 실패 로그 저장됨. 알바생에게 알림 발송.\n포인트는 차감되지 않음. 재요청을 기다려주세요.`);
    renderPoints();
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
    const phone = prompt('협의대상으로 등록할 전화번호를 입력하세요:\n(예: 010-0000-0000)');
    if (!phone) return;
    const reason = prompt('등록 사유를 입력하세요:');
    if (!reason) return;
    const id = 'n' + String(negotiations.length + 1).padStart(3, '0');
    // 기존 근무자 매칭 확인
    const matched = workers.find(w => w.phone === phone);
    if (matched) {
      matched.negotiation = true;
      matched.warnings = Math.max(matched.warnings, 3);
    }
    negotiations.push({
      id,
      phone,
      name: matched ? matched.name : '(수동 등록 · 번호만)',
      registeredAt: TODAY,
      reason: 'manual',
      sub: reason,
      lastSite: matched ? '(근무자 이력 참조)' : '-',
      lastDate: matched ? matched.lastWorked : '-',
      workerId: matched ? matched.id : null,
      registeredBy: '테스트(마스터)',
    });
    alert(`협의대상 등록 완료.\n전화번호: ${phone}\n${matched ? '기존 근무자 ' + matched.name + ' 님과 자동 매칭됨.' : '미가입 전화번호로 등록됨.'}`);
    renderNegotiation();
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

    // 경고 이력 mock — 실제는 별도 테이블에서 조회
    const warnHistory = [];
    if (w.warnings >= 1) warnHistory.push({ date: '2026-03-15', type: 'warn', title: '경고 1회 부여', sub: '무단결근 — CJ대한통운 곤지암 MegaHub / 관리자: 김관리' });
    if (w.warnings >= 2) warnHistory.push({ date: '2026-02-20', type: 'warn', title: '경고 2회 부여', sub: '12시간 이내 취소 — 컨벤션 L타워 / 관리자: 한담당' });
    if (w.warnings >= 3) warnHistory.push({ date: '2026-01-28', type: 'neg', title: '경고 3회 누적 → 협의대상 자동 등록', sub: '지각 — 롯데택배 진천 MegaHub / 관리자: 박관리' });
    if (warnHistory.length === 0) warnHistory.push({ date: w.joinedAt, type: 'ok', title: '가입', sub: '경고 이력 없음 — 모범 근무자' });

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
  window.__wrkWarnAdd = function(id) {
    const w = findWorker(id); if (!w) return;
    const reason = prompt(`${w.name} 님에게 경고를 부여합니다.\n사유를 선택/입력하세요:\n- 12시간 이내 취소 / 지각 / 무단결근 / 무응답 / GPS 미검증`);
    if (!reason) return;
    w.warnings = Math.min(w.warnings + 1, 3);
    if (w.warnings >= 3) {
      w.negotiation = true;
      alert(`경고가 3회 누적되어 ${w.name} 님이 협의대상으로 자동 등록되었습니다.\n해제는 마스터 권한이 필요합니다.`);
    } else {
      alert(`${w.name} 님에게 경고 ${w.warnings}회가 부여되었습니다.\n사유: ${reason}`);
    }
    renderWorkerDetail(id);
  };
  window.__wrkNegRelease = function(id) {
    const w = findWorker(id); if (!w) return;
    if (!confirm(`${w.name} 님의 협의대상 상태를 해제합니다. (마스터 전용)\n경고 카운트도 초기화됩니다. 계속하시겠습니까?`)) return;
    w.negotiation = false;
    w.warnings = 0;
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

  function renderApproval() {
    const pending = applications.filter(a => a.status === 'pending');
    const today = TODAY;
    const processedToday = applications.filter(a =>
      a.status !== 'pending' && a.processedAt && a.processedAt.startsWith(today)
    ).length;
    const urgentCount = pending.filter(a => a.reason === 'urgent').length;
    const negCount = pending.filter(a => a.reason === 'neg').length;
    const warnCount = pending.filter(a => a.reason === 'warn3').length;

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
      if (apvState.reason && apvState.reason !== a.reason) return false;
      const j = findJob(a.jobId); if (!j) return false;
      const site = findSite(j.siteId); if (!site) return false;
      if (apvState.partnerKey && apvState.partnerKey !== site.partnerKey) return false;
      if (apvState.siteId && apvState.siteId !== j.siteId) return false;
      return true;
    });

    // 우선순위 정렬: 협의대상 > 경고3회 > 12h이내, 동순위는 신청시간 오래된 것 우선
    const reasonPriority = { neg: 0, warn3: 1, urgent: 2, normal: 3 };
    const sorted = [...filtered].sort((a, b) =>
      (reasonPriority[a.reason] ?? 9) - (reasonPriority[b.reason] ?? 9) ||
      a.appliedAt.localeCompare(b.appliedAt)
    );

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
        <div class="jf-metric"><div class="jf-metric-label">12h 이내 신청</div><div class="jf-metric-value" style="color:#F59E0B;">${urgentCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">근무 시작 임박</div></div>
        <div class="jf-metric"><div class="jf-metric-label">협의대상 / 경고3회</div><div class="jf-metric-value" style="color:#EF4444;">${negCount + warnCount}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">협의대상 ${negCount} · 경고 ${warnCount}</div></div>
        <div class="jf-metric"><div class="jf-metric-label">오늘 처리 완료</div><div class="jf-metric-value">${processedToday}<span style="font-size:13px; color:#6B7684; font-weight:400;"> 건</span></div><div class="jf-metric-hint">승인 + 거절 합계</div></div>
      </div>

      ${pending.length > 0 && pending.some(a => a.reason === 'neg' || a.reason === 'warn3')
        ? `<div class="ws-warn-box">⚠ 협의대상 또는 경고 3회 이상 누적 알바생의 신청이 있습니다. 마스터/관리자가 직접 검토해주세요.</div>` : ''}

      <div class="jobs-filters">
        <select onchange="window.__apvFilter('partnerKey', this.value)">
          <option value="">전체 파트너사</option>${partnerOpts}
        </select>
        <select onchange="window.__apvFilter('siteId', this.value)">
          <option value="">전체 근무지</option>${siteOpts}
        </select>
        <select onchange="window.__apvFilter('reason', this.value)">
          <option value="">전체 사유</option>
          <option value="neg"    ${apvState.reason==='neg'?'selected':''}>협의대상</option>
          <option value="warn3"  ${apvState.reason==='warn3'?'selected':''}>경고 3회 이상</option>
          <option value="urgent" ${apvState.reason==='urgent'?'selected':''}>12시간 이내</option>
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

        html += `
          <div class="apv-card ${cardCls}">
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
              <div class="apv-job-sub">신청 ${a.appliedAt}</div>
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
    if (!confirm(`${w.name} (${w.phone}) 님의 신청을 승인하시겠습니까?\n\n근무지: ${findSite(j.siteId).site.name}\n일시: ${j.date} ${j.slot} ${j.start}~${j.end}`)) return;
    a.status = 'approved';
    a.processedAt = TODAY + ' ' + new Date().toTimeString().slice(0,5);
    a.processedBy = '테스트(마스터)';
    j.apply = Math.min(j.apply + 1, j.cap); // 공고 모집인원 업데이트
    updateApprovalBadge();
    renderApproval();
  };
  window.__apvReject = function(appId) {
    const a = findApp(appId); if (!a) return;
    const w = findWorker(a.workerId);
    const reason = prompt(`${w.name} 님의 신청을 거절합니다.\n거절 사유를 입력하세요 (알바생에게 알림 발송):`);
    if (!reason) return; // 취소 또는 빈 값
    a.status = 'rejected';
    a.processedAt = TODAY + ' ' + new Date().toTimeString().slice(0,5);
    a.processedBy = '테스트(마스터)';
    a.rejectReason = reason;
    updateApprovalBadge();
    renderApproval();
  };

  // ───────────────────────────────────────────────────────
  // 공고 관리 페이지
  // ───────────────────────────────────────────────────────
  const jobsState = {
    tab: 'list',           // list / create / template
    view: 'list',          // list / calendar
    partnerKey: '',        // 파트너사 필터
    siteId: '',            // 근무지 필터
    status: '',            // 상태 필터
    slot: '',              // 시간대 필터
    calYear: 2026,
    calMonth: 4,           // 1~12
  };

  function jobsTabsHtml() {
    const pendingWl = waitlist.filter(w => w.status === 'pending_accept').length;
    const tabs = [
      { id: 'list',     label: '공고 리스트' },
      { id: 'create',   label: '공고 등록' },
      { id: 'waitlist', label: '대기열' + (pendingWl > 0 ? ` (${pendingWl})` : '') },
      { id: 'template', label: '템플릿 관리' },
    ];
    return `<div class="jf-tabs">${tabs.map(t =>
      `<div class="jf-tab ${jobsState.tab === t.id ? 'active' : ''}" onclick="window.__jobsTab('${t.id}')">${t.label}</div>`
    ).join('')}</div>`;
  }

  function renderJobs() {
    if (jobsState.tab === 'list')     renderJobsList();
    if (jobsState.tab === 'create')   renderJobsCreate();
    if (jobsState.tab === 'waitlist') renderJobsWaitlist();
    if (jobsState.tab === 'template') renderJobsTemplate();
  }

  function renderJobsList() {
    // 현재 필터 적용된 공고
    const filtered = jobs.filter(j => {
      const st = jobStatus(j);
      if (jobsState.status && jobsState.status !== st) return false;
      if (jobsState.slot && jobsState.slot !== j.slot) return false;
      const site = findSite(j.siteId);
      if (!site) return false;
      if (jobsState.partnerKey && jobsState.partnerKey !== site.partnerKey) return false;
      if (jobsState.siteId && jobsState.siteId !== j.siteId) return false;
      return true;
    });

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
        <div class="jobs-view-toggle">
          <button class="${jobsState.view==='list'?'active':''}" onclick="window.__jobsView('list')">리스트</button>
          <button class="${jobsState.view==='calendar'?'active':''}" onclick="window.__jobsView('calendar')">캘린더</button>
        </div>
      </div>
    `;

    if (jobsState.view === 'list') {
      if (filtered.length === 0) {
        html += `<div class="jf-placeholder"><div class="jf-placeholder-icon">📋</div><div class="jf-placeholder-title">조건에 맞는 공고가 없습니다</div><div class="jf-placeholder-desc">필터를 변경하거나 새 공고를 등록해주세요.</div></div>`;
      } else {
        // 날짜 오름차순, 같은 날짜는 시간대 순서
        const slotOrder = { 새벽: 0, 주간: 1, 야간: 2, 웨딩: 3 };
        const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date) || (slotOrder[a.slot]||9) - (slotOrder[b.slot]||9));
        html += `<div class="jobs-grid">`;
        sorted.forEach(j => {
          const site = findSite(j.siteId);
          const st = jobStatus(j);
          const pct = Math.round((j.apply / j.cap) * 100);
          const wlCount = currentWaitCount(j.id);
          const wlPending = waitlist.filter(w => w.jobId === j.id && w.status === 'pending_accept').length;
          html += `
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
                <button onclick="window.__jobEdit('${j.id}')">수정</button>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
    } else {
      // 캘린더 뷰
      html += renderJobsCalendar(filtered);
    }

    main.innerHTML = html;
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
      const dow = idx % 7;
      const numClass = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';
      const statusColors = { open:'#2563EB', progress:'#22C55E', closed:'#F59E0B', done:'#9CA3AF' };
      const dots = dayJobs.slice(0, 6).map(j =>
        `<span class="jobs-cal-day-dot" style="background:${statusColors[jobStatus(j)]};"></span>`).join('');
      daysHtml += `
        <div class="jobs-cal-day ${dayJobs.length > 0 ? 'has-jobs' : ''} ${isToday ? 'today' : ''}"
             ${dayJobs.length > 0 ? `onclick="window.__jobsCalDay('${dateStr}')"` : ''}>
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
    const pct = Math.round((j.apply / j.cap) * 100);
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
        </div>

        <!-- 우측: 모집 현황 & 출결 -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="jf-panel">
            <div class="ws-section-title">모집 현황</div>
            <div style="font-size: 28px; font-weight: 500; color: #111827; text-align: center; padding: 14px 0;">
              ${j.apply}<span style="color:#6B7684; font-size:16px;"> / ${j.cap}명</span>
            </div>
            <div class="jobs-progress-bar" style="height:8px;"><div class="jobs-progress-bar-fill" style="width:${pct}%;"></div></div>
            <div class="jobs-progress-label"><span>달성률</span><span><strong style="color:#2563EB;">${pct}%</strong></span></div>
            <div style="margin-top:14px; padding-top:12px; border-top: 0.5px solid rgba(0,0,0,0.06); font-size: 12px; color: #6B7684;">
              ${st === 'open' ? '모집 중 · 신청 가능' : st === 'closed' ? '정원 마감 · 시작 대기' : st === 'progress' ? '근무 진행 중' : '종료됨'}
            </div>
          </div>

          ${st === 'progress' || st === 'done' ? `
            <div class="jf-panel">
              <div class="ws-section-title">출결 현황</div>
              <div style="display:flex; gap:14px; align-items:center; margin-top:6px;">
                ${attendanceDonut(sum, 110, 13)}
                <div class="ctrl-donut-legend" style="flex:1;">
                  <div><span class="ctrl-donut-dot" style="background:#22C55E;"></span>출근<strong>${sum.출근}</strong></div>
                  <div><span class="ctrl-donut-dot" style="background:#F59E0B;"></span>지각<strong>${sum.지각}</strong></div>
                  <div><span class="ctrl-donut-dot" style="background:#EF4444;"></span>결근<strong>${sum.결근}</strong></div>
                  <div><span class="ctrl-donut-dot" style="background:#D1D5DB;"></span>대기<strong>${sum.대기}</strong></div>
                </div>
              </div>
              <button onclick="window.__navGoto('control'); setTimeout(() => window.__ctrlDetail('${j.id}'), 50);" style="width:100%; margin-top:12px; font-size:12px;">관제 시스템에서 상세 보기 →</button>
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
    alert(`공고 복제 완료 (${newId}, 날짜: ${newDate})\n필요시 수정 탭에서 편집해주세요.`);
    renderJobDetail(newId);
  };
  window.__jobsDelete = function(jobId) {
    const j = findJob(jobId); if (!j) return;
    if (!confirm('이 공고를 삭제합니다. 신청자가 있는 경우 거절 알림이 발송됩니다. 계속하시겠습니까?')) return;
    const idx = jobs.indexOf(j); if (idx >= 0) jobs.splice(idx, 1);
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
                <label class="jf-toggle">
                  <input type="checkbox" ${f.showHolidayPopup?'checked':''} onchange="window.__jfSet('showHolidayPopup', this.checked)">
                  <span class="jf-toggle-switch"></span>
                  <span class="jf-toggle-text"><strong>주휴수당 안내 팝업</strong></span>
                </label>
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
    const name = prompt('템플릿 이름을 입력하세요:'); if (!name) return;
    const type = prompt('유형을 입력하세요 (contract 또는 safety):');
    if (!type || !['contract','safety'].includes(type)) { alert('contract 또는 safety 여야 합니다.'); return; }
    const partner = prompt('적용 파트너사 키 (쉼표 구분, 예: cj,lotte — 전체 적용은 cj,lotte,convention):');
    if (!partner) return;
    const partnerKeys = partner.split(',').map(s => s.trim()).filter(k => worksites[k]);
    if (partnerKeys.length === 0) { alert('유효한 파트너사 키를 입력해주세요.'); return; }
    const id = 't' + String(templates.length + 1).padStart(3, '0');
    templates.push({
      id, type, name,
      partnerKeys,
      siteIds: [],
      version: 'v1.0',
      uploadedAt: TODAY,
      fileName: name.replace(/\s+/g, '_').toLowerCase() + '_v10.pdf',
      fileSize: Math.floor(Math.random() * 2000) + 'KB',
      inUse: 0,
      uploadedBy: '테스트(마스터)',
    });
    alert(`템플릿 "${name}" 업로드 완료.\n\n(실제 앱에서는 PDF 파일 드래그 앤 드롭 업로드 UI 제공)`);
    renderJobsTemplate();
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
  window.__jobsView = function(v) { jobsState.view = v; renderJobsList(); };
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
  window.__jobEdit = function(id) { renderJobEdit(id); };
  window.__jobsCalDay = function(dateStr) {
    // 해당 날짜 공고가 1건이면 바로 상세로, 여러 개면 리스트 뷰로 전환 후 필터
    const dayJobs = jobs.filter(j => j.date === dateStr);
    if (dayJobs.length === 1) {
      renderJobDetail(dayJobs[0].id);
    } else {
      jobsState.view = 'list';
      alert(`${dateStr} 일 공고 ${dayJobs.length}건 — 리스트 뷰로 전환합니다.`);
      renderJobsList();
    }
  };

  window.__wsToggle = function(key) {
    const el = document.querySelector('.ws-partner[data-partner="' + key + '"]');
    if (el) el.classList.toggle('open');
  };
  window.__wsDetail = function(id) { renderDetail(id); };
  window.__wsGps = function(id) { renderGpsEditor(id); };
  window.__wsBack = function() { renderList(); };
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
          <div class="jf-title">공고 관리</div>
          <div class="jf-subtitle">대기열 관리 · 실시간 자동 처리</div>
        </div>
      </div>
      ${jobsTabsHtml()}

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
    period: 'month',  // week / month / quarter / all
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
    if (n.groupMode === 'specific') count = n.targets.length;
    if (n.groupMode === 'all_workers') count = workers.length;
    if (n.groupMode === 'warn') count = workers.filter(w => w.warnings >= 1 && !w.negotiation).length;
    if (n.groupMode === 'negotiation') count = workers.filter(w => w.negotiation).length;
    if (n.groupMode === 'all_admins') count = admins.filter(a => a.active).length;

    const action = n.scheduled ? `예약 등록 (${n.scheduleAt})` : '즉시 발송';
    alert(`알림 ${action}\n\n유형: ${({service:'서비스',marketing:'마케팅',urgent:'긴급 구인'})[n.notifType]}\n대상: ${count}명\n제목: ${n.title}`);
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

  const pageRouters = {
    home: renderHome,
    worksite: renderList,
    jobs: () => { jobsState.tab = 'list'; renderJobs(); },
    approval: renderApproval,
    workers: renderWorkers,
    negotiation: renderNegotiation,
    points: () => { pointState.tab = 'request'; renderPoints(); },
    control: renderControl,
    accounts: renderAdmins,
    inquiry: renderInquiries,
    stats: renderStats,
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      const renderer = pageRouters[page];
      if (!renderer) {
        alert(pageNameFor(page) + ' 페이지는 아직 구현되지 않았습니다.');
        return;
      }
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderer();
    });
  });

  function pageNameFor(page) {
    const names = { home: '홈', jobs: '공고 관리', approval: '신청 승인', workers: '근무자 관리', control: '관제 시스템', negotiation: '협의대상', points: '포인트', inquiry: '문의', accounts: '관리자 계정', stats: '통계 리포트' };
    return names[page] || '';
  }

  initWaitlistTimers();
  startWaitlistTicker();
  updateApprovalBadge();
  renderHome();
})();
