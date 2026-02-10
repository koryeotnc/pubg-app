// 메인 애플리케이션
(function() {
    let map = null;
    let tileLayer = null;
    let currentMapId = 'erangel';
    let currentMapConfig = MAP_CONFIG.erangel;
    let gridLayerGroup = null;
    let subGridLayerGroup = null;
    let isPanelCollapsed = false;

    // 패널 너비 상수
    const PANEL_WIDTH = 260;
    const PANEL_MARGIN = 10;
    const PANEL_TOTAL = PANEL_WIDTH + PANEL_MARGIN * 2; // 280px

    // 초기화
    function init() {
        initMap();
        initModules();
        initUI();
        resizeMap();
        loadMap('erangel');
        window.addEventListener('resize', resizeMap);
    }

    function initMap() {
        map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: 0,
            maxZoom: 7,
            zoomSnap: 0.25,
            zoomDelta: 0.5,
            attributionControl: false,
            zoomControl: false
        });

        // 줌 컨트롤 위치
        L.control.zoom({ position: 'topright' }).addTo(map);

        // 그리드 레이어 그룹
        gridLayerGroup = L.layerGroup().addTo(map);
        subGridLayerGroup = L.layerGroup().addTo(map);

        // 줌 변경 시 100m 서브그리드 표시/숨김
        map.on('zoomend', function() {
            const zoom = map.getZoom();
            if (zoom > 2) {
                if (!map.hasLayer(subGridLayerGroup)) {
                    map.addLayer(subGridLayerGroup);
                }
            } else {
                if (map.hasLayer(subGridLayerGroup)) {
                    map.removeLayer(subGridLayerGroup);
                }
            }
        });

        // 마우스 좌표 표시
        map.on('mousemove', function(e) {
            if (!currentMapConfig) return;
            const coords = latLngToGameCoords(e.latlng.lat, e.latlng.lng, currentMapConfig);
            document.getElementById('coord-display').textContent =
                `${coords.x}m, ${coords.y}m`;
        });
    }

    // 맵을 정사각형으로 리사이즈
    function resizeMap() {
        const headerHeight = 50;
        const mapEl = document.getElementById('map');

        const panelOffset = isPanelCollapsed ? 0 : PANEL_TOTAL;
        const availableWidth = window.innerWidth - panelOffset;
        const availableHeight = window.innerHeight - headerHeight;

        // 정사각형: 가용 너비/높이 중 작은 값
        const side = Math.min(availableWidth, availableHeight);

        mapEl.style.width = side + 'px';
        mapEl.style.height = side + 'px';
        mapEl.style.left = (panelOffset + (availableWidth - side) / 2) + 'px';
        mapEl.style.top = (headerHeight + (availableHeight - side) / 2) + 'px';

        if (map) {
            map.invalidateSize();
        }
    }

    function initModules() {
        FlightPath.init(map, currentMapConfig, onFlightPathChange);
        Parachute.init(map, currentMapConfig, () => FlightPath.getPath());
    }

    function initUI() {
        // 맵 선택 탭
        document.querySelectorAll('.map-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const mapId = this.dataset.map;
                loadMap(mapId);
            });
        });

        // 비행경로 버튼
        document.getElementById('btn-flight-path').addEventListener('click', function() {
            FlightPath.activate();
        });

        // 낙하산 착지 버튼
        document.getElementById('btn-landing').addEventListener('click', function() {
            Parachute.activate();
        });

        // 거리 드롭다운 토글
        const distToggle = document.getElementById('distance-toggle');
        const distMenu = document.getElementById('distance-menu');

        distToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = distMenu.classList.toggle('show');
            distToggle.classList.toggle('open', isOpen);
        });

        // 드롭다운 외부 클릭 시 닫기
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#distance-dropdown')) {
                distMenu.classList.remove('show');
                distToggle.classList.remove('open');
            }
        });

        // 드롭다운 체크박스 변경
        distMenu.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', function() {
                updateDistanceSelection();
            });
        });

        // 초기화 버튼
        document.getElementById('btn-reset').addEventListener('click', resetAll);

        // 키보드 단축키
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                resetAll();
            }
        });

        // 패널 토글
        document.getElementById('panel-toggle').addEventListener('click', function() {
            const panel = document.getElementById('tool-panel');
            panel.classList.toggle('collapsed');
            isPanelCollapsed = panel.classList.contains('collapsed');
            this.textContent = isPanelCollapsed ? '▶' : '◀';
            resizeMap();
        });
    }

    // 드롭다운에서 선택된 거리값 업데이트
    function updateDistanceSelection() {
        const checkboxes = document.querySelectorAll('#distance-menu input[type="checkbox"]');
        const selected = [];
        checkboxes.forEach(chk => {
            if (chk.checked) {
                selected.push(parseInt(chk.value));
            }
        });

        // 토글 버튼 텍스트 업데이트
        const toggleBtn = document.getElementById('distance-toggle');
        if (selected.length === 0) {
            toggleBtn.textContent = '선택 없음 ▾';
        } else if (selected.length === 1) {
            toggleBtn.textContent = selected[0] + 'm 선택됨 ▾';
        } else {
            toggleBtn.textContent = selected.length + '개 선택됨 ▾';
        }

        // Parachute 모듈에 전달
        Parachute.setRadiusValues(selected);
    }

    function loadMap(mapId) {
        currentMapId = mapId;
        currentMapConfig = MAP_CONFIG[mapId];

        if (!currentMapConfig) {
            console.error('알 수 없는 맵:', mapId);
            return;
        }

        // UI 업데이트
        document.querySelectorAll('.map-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.map === mapId);
        });

        // 기존 요소 제거
        resetAll();
        if (tileLayer) {
            map.removeLayer(tileLayer);
        }

        const size = currentMapConfig.imageSize;

        // CRS.Simple에서 바운드 설정
        const southWest = map.unproject([0, size], currentMapConfig.maxZoom);
        const northEast = map.unproject([size, 0], currentMapConfig.maxZoom);
        const bounds = L.latLngBounds(southWest, northEast);

        // 타일 소스 결정: 로컬 또는 CDN
        const isLocal = currentMapConfig.tileSource === 'local';
        const codename = currentMapConfig.codename;

        const CustomTileLayer = L.TileLayer.extend({
            getTileUrl: function(coords) {
                const z = coords.z;
                const x = coords.x;
                const y = coords.y;
                if (isLocal) {
                    return `tiles/${currentMapConfig.id}/${z}/${x}/${y}.png`;
                }
                return `https://battlegrounds.party/map/map/${codename}/tiles/${z}/${x}/${y}.webp`;
            }
        });

        tileLayer = new CustomTileLayer('', {
            minZoom: 0,
            maxZoom: 7,
            maxNativeZoom: 5,
            tileSize: 256,
            noWrap: true,
            bounds: bounds
        });

        tileLayer.addTo(map);

        // 맵 바운드 및 뷰 설정
        const maxBounds = bounds.pad(0.1);
        map.setMaxBounds(maxBounds);
        map.fitBounds(bounds);

        // 모듈 설정 업데이트
        FlightPath.updateConfig(currentMapConfig);
        Parachute.updateConfig(currentMapConfig);

        // 그리드 그리기
        drawGrid();

        // 맵 크기 정보 업데이트
        document.getElementById('map-info').textContent =
            `${currentMapConfig.name} (${currentMapConfig.sizeKm}×${currentMapConfig.sizeKm}km)`;
    }

    // 그리드 그리기 (1km + 100m 간격)
    function drawGrid() {
        gridLayerGroup.clearLayers();
        subGridLayerGroup.clearLayers();

        if (!currentMapConfig) return;

        const sizeKm = currentMapConfig.sizeKm;
        const imageSize = currentMapConfig.imageSize;

        // 1km당 LatLng 단위: imageSize / sizeKm / LATLNG_SCALE
        const kmInLatLng = (imageSize / sizeKm) / LATLNG_SCALE;

        // 100m = 0.1km 단위
        const subStep = kmInLatLng / 10;

        // 전체 LatLng 범위: 0 ~ imageSize/LATLNG_SCALE
        const totalLatLng = imageSize / LATLNG_SCALE;

        const majorLineStyle = {
            color: 'rgba(255, 255, 255, 0.25)',
            weight: 1.5,
            interactive: false
        };

        const minorLineStyle = {
            color: 'rgba(255, 255, 255, 0.2)',
            weight: 0.8,
            interactive: false
        };

        // ===== 1km 메이저 그리드 =====

        // 수직선 + 상단 라벨 (X축)
        for (let i = 0; i <= sizeKm; i++) {
            const x = i * kmInLatLng;

            gridLayerGroup.addLayer(
                L.polyline([[0, x], [-totalLatLng, x]], majorLineStyle)
            );

            // 라벨 (상단, 맵 안쪽)
            if (i < sizeKm) {
                const labelX = (i + 0.5) * kmInLatLng;
                const label = L.marker([-2, labelX], {
                    icon: L.divIcon({
                        className: 'grid-label',
                        html: `${i + 1}`,
                        iconSize: [20, 14],
                        iconAnchor: [10, 0]
                    }),
                    interactive: false
                });
                gridLayerGroup.addLayer(label);
            }
        }

        // 수평선 + 좌측 라벨 (Y축)
        for (let i = 0; i <= sizeKm; i++) {
            const y = -i * kmInLatLng;

            gridLayerGroup.addLayer(
                L.polyline([[y, 0], [y, totalLatLng]], majorLineStyle)
            );

            // 라벨 (좌측, 맵 안쪽)
            if (i < sizeKm) {
                const labelY = -(i + 0.5) * kmInLatLng;
                const letter = String.fromCharCode(65 + i);
                const label = L.marker([labelY, 2], {
                    icon: L.divIcon({
                        className: 'grid-label',
                        html: letter,
                        iconSize: [14, 14],
                        iconAnchor: [0, 7]
                    }),
                    interactive: false
                });
                gridLayerGroup.addLayer(label);
            }
        }

        // ===== 100m 서브 그리드 =====
        const totalSubs = sizeKm * 10; // 8km → 80 lines each direction

        for (let i = 0; i <= totalSubs; i++) {
            // 1km 경계는 메이저 그리드에서 이미 그리므로 건너뛰기
            if (i % 10 === 0) continue;

            const x = i * subStep;
            const y = -i * subStep;

            // 수직선
            subGridLayerGroup.addLayer(
                L.polyline([[0, x], [-totalLatLng, x]], minorLineStyle)
            );

            // 수평선
            subGridLayerGroup.addLayer(
                L.polyline([[y, 0], [y, totalLatLng]], minorLineStyle)
            );
        }

        // 초기 줌 레벨에 따라 서브그리드 표시/숨김
        if (map.getZoom() <= 2) {
            map.removeLayer(subGridLayerGroup);
        }
    }

    function onFlightPathChange(start, end) {
        Parachute.onFlightPathChange();
    }

    function resetAll() {
        FlightPath.reset();
        Parachute.reset();
    }

    // DOM 로드 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
