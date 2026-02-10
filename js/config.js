// PUBG 맵 설정 데이터
const MAP_CONFIG = {
    erangel: {
        id: 'erangel',
        name: '에란겔',
        codename: 'Baltic',
        sizeKm: 8,
        sizeMeters: 8000,
        imageSize: 8192,
        maxZoom: 5,
        minZoom: 1,
        defaultZoom: 2,
        center: [4096, 4096],
        get pixelsPerMeter() { return this.imageSize / this.sizeMeters; }
    },
    miramar: {
        id: 'miramar',
        name: '미라마',
        codename: 'Desert',
        sizeKm: 8,
        sizeMeters: 8000,
        imageSize: 8192,
        maxZoom: 5,
        minZoom: 1,
        defaultZoom: 2,
        center: [4096, 4096],
        get pixelsPerMeter() { return this.imageSize / this.sizeMeters; }
    },
    sanhok: {
        id: 'sanhok',
        name: '사녹',
        codename: 'Savage',
        sizeKm: 4,
        sizeMeters: 4000,
        imageSize: 8192,
        maxZoom: 5,
        minZoom: 1,
        defaultZoom: 2,
        center: [4096, 4096],
        sizeScale: 0.5,
        get pixelsPerMeter() { return this.imageSize / this.sizeMeters; }
    },
    vikendi: {
        id: 'vikendi',
        name: '비켄디',
        codename: 'DihorOtok',
        sizeKm: 8,
        sizeMeters: 8000,
        imageSize: 8192,
        maxZoom: 5,
        minZoom: 1,
        defaultZoom: 2,
        center: [4096, 4096],
        get pixelsPerMeter() { return this.imageSize / this.sizeMeters; }
    },
    taego: {
        id: 'taego',
        name: '태이고',
        codename: 'Tiger',
        sizeKm: 8,
        sizeMeters: 8000,
        imageSize: 8192,
        maxZoom: 5,
        minZoom: 1,
        defaultZoom: 2,
        center: [4096, 4096],
        get pixelsPerMeter() { return this.imageSize / this.sizeMeters; }
    },
    rondo: {
        id: 'rondo',
        name: '론도',
        codename: 'Neon',
        sizeKm: 8,
        sizeMeters: 8000,
        imageSize: 8192,
        maxZoom: 5,
        minZoom: 1,
        defaultZoom: 2,
        center: [4096, 4096],
        tileSource: 'local',
        get pixelsPerMeter() { return this.imageSize / this.sizeMeters; }
    }
};

// 타일 서버 기본 URL (로컬 타일 또는 외부 소스)
const TILE_BASE_URL = 'tiles';

// 차량 타입 정의
const VEHICLE_TYPES = {
    dacia:      { name: 'Dacia',      nameKr: '다치아',       color: '#2196F3' },
    uaz:        { name: 'UAZ',        nameKr: 'UAZ',         color: '#4CAF50' },
    buggy:      { name: 'Buggy',      nameKr: '버기',         color: '#FF9800' },
    motorcycle: { name: 'Motorcycle', nameKr: '오토바이',     color: '#9C27B0' },
    boat:       { name: 'Boat',       nameKr: '보트',         color: '#00BCD4' },
    glider:     { name: 'Glider',     nameKr: '모터 글라이더', color: '#E91E63' },
    pickup:     { name: 'Pickup',     nameKr: '픽업트럭',     color: '#795548' },
    aquarail:   { name: 'AquaRail',   nameKr: '아쿠아레일',   color: '#03A9F4' },
    couperb:    { name: 'Coupe RB',   nameKr: '쿠페 RB',     color: '#F44336' },
    dirtbike:   { name: 'Dirt Bike',  nameKr: '더트바이크',   color: '#8BC34A' },
    sidecar:    { name: 'Sidecar',    nameKr: '사이드카',     color: '#FF5722' }
};

// 낙하산 거리 프리셋 (미터)
const PARACHUTE_DISTANCES = [1000, 1500, 2000, 2500, 3000];

// 비행기 속도 (m/s) - 약 600km/h
const PLANE_SPEED = 166;
