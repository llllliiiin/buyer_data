// ================= 初期地図設定 =================
const map = L.map('map').setView([37.5, 137.0], 5);

// グレースケール地図
const tileLayer = L.tileLayer('https://tile.openstreetmap.jp/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);
tileLayer.getContainer().style.filter = 'grayscale(55%) brightness(97%)';

// ================= 月切替に応じたデータ設定 =================
const monthSelect = document.getElementById('monthSelect');
const dateSelect = document.getElementById('dateSelect');

// 現在使用するデータ
let currentData = data;
let currentFlowData = flow_data;

// マーカーと矢印管理用
let markers = [];
let activeFlowLayers = [];
let highlightLayer = L.layerGroup().addTo(map);
let activeFromPref = null;

// メイン都道府県リスト
const mainPrefs = ["東京都","埼玉県","千葉県","大阪府","京都府","福岡県","広島県"];

// ================= データ切替関数 =================
function updateDataByMonth(month) {
    if(month === "8") {
        currentData = data;
        currentFlowData = flow_data;
    } else if(month === "9") {
        currentData = data_9;
        currentFlowData = flow_data_9;
    }

    // 日付選択肢を更新
    const datesSet = [...new Set(currentData.map(d => d.date))];
    dateSelect.innerHTML = "";
    datesSet.forEach(d => {
        const option = document.createElement('option');
        option.value = d;
        option.text = d;
        dateSelect.appendChild(option);
    });

    // 初期日付は月の最初のデータ
    const initialDate = datesSet[0];
    dateSelect.value = initialDate;
    drawMap(initialDate);
}

// ================= 円グラフアイコン作成 =================
function createPieIcon(rate, forecast) {
    const canvas = document.createElement('canvas');
    const size = 50;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const center = size / 2;
    const radius = size / 2 - 3;
    const innerRadius = radius * 0.6;

    // 背景灰色リング
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2*Math.PI);
    ctx.arc(center, center, innerRadius, 2*Math.PI, 0, true);
    ctx.fillStyle = '#e5e7eb';
    ctx.fill();

    // 青い割合扇形
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, -Math.PI/2, -Math.PI/2 + 2*Math.PI*rate, false);
    ctx.arc(center, center, innerRadius, -Math.PI/2 + 2*Math.PI*rate, -Math.PI/2, true);
    ctx.closePath();
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    if(forecast > 0){
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = Math.round(rate*100) + '%';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeText(text, center, center);
        ctx.fillStyle = '#173e79ff';
        ctx.fillText(text, center, center);
    }

    return L.icon({
        iconUrl: canvas.toDataURL(),
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

// ================= ハイライト円描画 =================
function drawHighlightBase() {
    highlightLayer.clearLayers();
    mainPrefs.forEach(pref => {
        const coord = prefectureCoords[pref];
        if(!coord) return;

        const circle = L.circle(coord, {
            color: "#f87171",
            fillColor: "#fecaca",
            fillOpacity: 0.5,
            weight: 1,
            radius: 18000
        }).addTo(highlightLayer);

        circle.bindTooltip(`${pref}`, { direction: "top", offset:[0,-5], opacity:0.9 });

        circle.on("mouseover", ()=> circle.setStyle({fillColor:"#f87171", fillOpacity:0.7}));
        circle.on("mouseout", ()=> circle.setStyle({fillColor:"#fecaca", fillOpacity:0.5}));

        // クリックで矢印表示/非表示
        circle.on("click", ()=> toggleFlowsFrom(pref));
    });
}
drawHighlightBase();

// ================= 矢印描画関数 =================
function drawFlowsFrom(fromPref, selectedDate){
    activeFlowLayers.forEach(l=>map.removeLayer(l));
    activeFlowLayers = [];

    const flows = currentFlowData.filter(f => f.date===selectedDate && f.from===fromPref && f.number>0);

    flows.forEach(f=>{
        const fromCoord = prefectureCoords[f.from];
        const toCoord = prefectureCoords[f.to];
        if(!fromCoord || !toCoord) return;

        const zoomFactor = 0.05*(6/map.getZoom());
        const latDiff = toCoord[0]-fromCoord[0];
        const lngDiff = toCoord[1]-fromCoord[1];
        const dist = Math.sqrt(latDiff*latDiff+lngDiff*lngDiff);

        const start = [fromCoord[0]+(latDiff/dist)*zoomFactor, fromCoord[1]+(lngDiff/dist)*zoomFactor];
        const end = [toCoord[0]-(latDiff/dist)*zoomFactor, toCoord[1]-(lngDiff/dist)*zoomFactor];
        const mid = [(start[0]+end[0])/2,(start[1]+end[1])/2];

        const polyline = L.polyline([start,end], {color:"#ef4444", weight:8, opacity:0.7}).addTo(map);

        function drawArrow(){
            const startPt = map.latLngToLayerPoint(start);
            const endPt = map.latLngToLayerPoint(end);
            const angle = Math.atan2(endPt.y-startPt.y,endPt.x-startPt.x);
            const arrowLength = polyline.options.weight*3;
            const arrowLeft = L.point(endPt.x - arrowLength*Math.cos(angle-Math.PI/6), endPt.y - arrowLength*Math.sin(angle-Math.PI/6));
            const arrowRight = L.point(endPt.x - arrowLength*Math.cos(angle+Math.PI/6), endPt.y - arrowLength*Math.sin(angle+Math.PI/6));
            const arrowLatLngs = [map.layerPointToLatLng(endPt), map.layerPointToLatLng(arrowLeft), map.layerPointToLatLng(arrowRight)];

            if(polyline._arrow){
                polyline._arrow.setLatLngs(arrowLatLngs);
            } else {
                polyline._arrow = L.polygon(arrowLatLngs,{
                    color:"#ef4444",
                    fillColor:"#ef4444",
                    fillOpacity:0.7,
                    weight:0
                }).addTo(map);
            }
        }

        drawArrow();
        map.on('zoomend', drawArrow);

        // 中央ラベル
        const label = L.marker(mid,{
            icon:L.divIcon({
                className:"arrow-label",
                html:`<div style="
                    color:#310303ff;
                    font-size:18px;
                    font-weight:bold;
                    text-align:center;
                    font-family:'Arial',sans-serif;
                    -webkit-text-stroke:0.5px white;
                    text-stroke:0.5px white;">${f.number}</div>`,
                iconSize:[30,20],
                iconAnchor:[15,10]
            })
        }).addTo(map);

        polyline.on("mouseover", ()=>{ polyline.setStyle({color:"#f87171",opacity:1}); label.getElement().style.color="#f87171"; });
        polyline.on("mouseout", ()=>{ polyline.setStyle({color:"#ef4444",opacity:0.7}); label.getElement().style.color="#b91c1c"; });

        activeFlowLayers.push(polyline,polyline._arrow,label);
    });
}

// ================= 矢印表示切替 =================
function toggleFlowsFrom(pref){
    if(activeFromPref === pref){
        activeFlowLayers.forEach(l=>map.removeLayer(l));
        activeFlowLayers=[];
        activeFromPref=null;
    } else {
        activeFromPref = pref;
        drawFlowsFrom(pref,dateSelect.value);
    }
}

// ================= 地図描画 =================
function drawMap(selectedDate){
    markers.forEach(m=>map.removeLayer(m));
    markers=[];

    const filteredData = currentData.filter(d=>d.date===selectedDate);

    filteredData.forEach(d=>{
        const coord = prefectureCoords[d.pref];
        if(!coord) return;

        const marker = L.marker(coord,{icon:createPieIcon(d.rate,d.forecast)}).addTo(map);

        marker.bindTooltip(`
            <div style="text-align:left;font-size:12px;font-family:-apple-system,sans-serif;">
                <div><strong>${d.pref}</strong></div>
                <div>アポ数：${d.actual}</div>
                <div>キャパ数：${d.forecast}</div>
                <div>充足率：${(d.rate*100).toFixed(1)}%</div>
            </div>
        `,{direction:'top',offset:[0,-20],opacity:0.9});

        markers.push(marker);
    });

    if(activeFromPref){
        drawFlowsFrom(activeFromPref,selectedDate);
    }
}

// ================= 初期表示 =================
updateDataByMonth(monthSelect.value);

// 月選択イベント
monthSelect.addEventListener('change', e=>{
    updateDataByMonth(e.target.value);
});

// 日付変更イベント
dateSelect.addEventListener('change', e=>{
    drawMap(e.target.value);
});

// ズーム時に矢印再描画
map.on('zoomend', ()=>{
    if(activeFromPref){
        drawFlowsFrom(activeFromPref,dateSelect.value);
    }
});
