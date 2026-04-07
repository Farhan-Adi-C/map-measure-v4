let wrapper = document.getElementById("map-wrapper")
let container = document.getElementById("zoom-container")
let svg = document.getElementById("indonesia-map");

let markerLayer = document.createElement("div")
markerLayer.id = "marker-layer"
markerLayer.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
`

let lineLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
lineLayer.id = "line-layer";
lineLayer.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
`;

container.append(markerLayer);

container.insertBefore(lineLayer, markerLayer);



let scale = 1;

let pointX = 0;
let pointY = 0;

let minScale = 1;
let maxScale = 5;

let isPanning = false;

let startClick;

let tempClick;

let points = [];
let nextId = 1;

let connectSourceId = null;

let tempConnectionData = null;

let transportMethod = {
    train: { color: "#33E339", speed: 120, cost: 500, label: "Train", offset: 0 },
    bus: { color: "#A83BE8", speed: 80, cost: 100, label: "Bus", offset: -1.2 },
    plane: { color: "#000000", speed: 800, cost: 1000, label: "plane", offset: 1.2 }
}

function updateContainer() {
    container.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

function limitContainer() {
    let wrapperW = wrapper.clientWidth, wrapperH = wrapper.clientHeight;
    let containerW = container.scrollWidth, containerH = container.scrollHeight;

    let minX = wrapperW - containerW * scale;
    let minY = wrapperH - containerH * scale;
    let maxX = 0, maxY = 0;
    pointX = Math.min(maxX, Math.max(minX, pointX));
    pointY = Math.min(maxY, Math.max(minY, pointY));
}

function zoomAt(x, y, zoomFactor) {

    let newScale = Math.min(maxScale, Math.max(minScale, scale * zoomFactor));
    let jarakX = (x - pointX) / scale;
    let jarakY = (y - pointY) / scale;

    pointX = x - jarakX * newScale;
    pointY = y - jarakY * newScale;
    scale = newScale;

    limitContainer()
    updateContainer();

}

container.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? .9 : 1.1);
})

wrapper.addEventListener("wheel", (e) => { e.preventDefault(); return; });

window.addEventListener("keydown", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    if (e.key == "=" || e.key == "+") {
        zoomAt(container.scrollWidth / 2, container.scrollHeight / 2, 1.1);
    }
    if (e.key == "-") {
        zoomAt(container.scrollWidth / 2, container.scrollHeight / 2, .9);
    }

    if (e.code == "Space") {
        console.log(points);

    }
})

container.addEventListener("mousedown", (e) => {
    isPanning = true;

    startClick = { x: e.clientX - pointX, y: e.clientY - pointY };
})

container.addEventListener("mouseup", () => {
    isPanning = false;
})

container.addEventListener("mouseleave", () => isPanning = false)

container.addEventListener("mousemove", (e) => {
    if (!isPanning) return;

    pointX = e.clientX - startClick.x;
    pointY = e.clientY - startClick.y;

    limitContainer();
    updateContainer();
})

container.addEventListener("dblclick", (e) => {
    showModalKota();

    let svgRect = svg.getBoundingClientRect();
    let percentX = (e.clientX - svgRect.left) / svgRect.width * 100;
    let percentY = (e.clientY - svgRect.top) / svgRect.height * 100;

    tempClick = { x: percentX, y: percentY };

})


let modalKota = document.getElementById("modalKota");
let closeKota = document.getElementById("closeKota");
let inputKota = document.getElementById("inputKota");
let submitKota = document.getElementById("submitKota");

closeKota.onclick = () => {
    closeModalKota();
}

function showModalKota() {
    modalKota.style.display = "flex";
    inputKota.focus();
}

function closeModalKota() {
    modalKota.style.display = "none"
    inputKota.value = "";
    tempClick = null;
}

submitKota.onclick = () => {
    if (!inputKota.value || inputKota.value == "") {
        inputKota.focus(); return;
    }

    addMarker(tempClick.x, tempClick.y, inputKota.value.trim());
    saveToStorage();
    closeModalKota();

}

function addMarker(percentX, percentY, name, otherId = null) {
    let id = Number(otherId !== null ? otherId : nextId++);
    if (otherId !== null && otherId >= nextId) nextId = Number(otherId) + 1;

    let el = document.createElement("div");
    el.id = `marker-${id}`;
    el.style.cssText = `
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        z-index: 10;
        top: ${percentY}%;
        left: ${percentX}%;
    `

    el.innerHTML = `
     <div style="border: 1px solid black; background-color: white; color: black; font-weight: 700; border-radius: 10px; padding: 3px; display: flex; align-items: center; white-space: nowrap; gap: 6px;  ">
        <span>${name}</span>
         <div style="width: 1px; height: 10px; background-color: black;"></div>
        <button class="btn-connect" style="background-color: white; border: none;">🔗</button>
        <div style="width: 1px; height: 10px; background-color: black;"></div>
        <button class="btn-delete" style="border: none; background-color: red; color: white; border-radius: 50%; width: 20px; height: 20px">X</button>
    </div>
    <img src="./location3.png" style="width: 25px; height: auto; pointer-events: none;" alt="">
    `

    let point = { id, x: percentX, y: percentY, name, connections: [] };
    points.push(point);

    markerLayer.append(el);

    el.querySelector(".btn-connect").addEventListener("click", () => {
        if (connectSourceId && id !== connectSourceId) finishConnect(id);
        else {
            startConnect(id);
        }
    })

    el.querySelector(".btn-delete").addEventListener("click", () => {
        deleteMarker(id);
    })

    return point;
}

let modalConnection = document.getElementById("modalConnection")
let closeConnection = document.getElementById("closeConnection")
let inputDistance = document.getElementById("inputDistance")
let inputMethod = document.getElementById("inputMethod");
let submitConnection = document.getElementById("submitConnection");

closeConnection.onclick = () => {
    closeModalConnection();
}


function startConnect(sourceId) {
    if (connectSourceId == sourceId) {
        cancelConnect();
        return;
    }
    connectSourceId = sourceId;
    container.querySelector(`#marker-${sourceId}`).style.filter = "drop-shadow(0 0 8px #a855f7)"
}

function finishConnect(targetId) {
    let source = points.find(p => p.id == connectSourceId);
    let target = points.find(p => p.id == targetId);
    tempConnectionData = { source, target };
    showModalConnection();
}

function cancelConnect() {
    if (connectSourceId !== null) {
        let elConnect = document.querySelector(`#marker-${connectSourceId}`);
        if (elConnect) elConnect.style.filter = "";
    }
    connectSourceId = null;
    closeModalConnection()
}

function showModalConnection() {
    modalConnection.style.display = "flex";
    inputDistance.focus();
}

function closeModalConnection() {
    modalConnection.style.display = "none";
    inputDistance.value = "";
    inputMethod.value = "train";

    let markerEl = container.querySelector(`#marker-${connectSourceId}`);
    if (markerEl) {
        markerEl.style.filter = "";
    }
    connectSourceId = null;
}

submitConnection.onclick = () => {
    if (!inputDistance.value || inputDistance.value == "") {
        inputDistance.focus();
        return;
    }

    let modeKey = inputMethod.value;
    let mode = transportMethod[modeKey];


    let { source, target } = tempConnectionData;

    let conn = source.connections.find(c => c.to == target.id);
    if (conn && conn.mode == modeKey) {
        alert(`jalur dengan mode ${modeKey} sudah ada`);
        inputDistance.value = "";
        inputDistance.focus();
        return;
    }


    source.connections.push({ to: target.id, distance: Number(inputDistance.value.trim()), mode: modeKey, color: mode.color, speed: mode.speed, cost: mode.cost });
    target.connections.push({ to: source.id, distance: Number(inputDistance.value.trim()), mode: modeKey, color: mode.color, speed: mode.speed, cost: mode.cost });

    drawLine(source, target, modeKey, inputDistance.value.trim());
    closeModalConnection();
    saveToStorage();

}

function drawLine(source, target, modeKey, distance) {
    let mode = transportMethod[modeKey];
    let connectKey = [source.id, target.id].sort().join("-") + "-" + modeKey;

    if (lineLayer.querySelector(`[data-key="${connectKey}"]`)) return;

    let dx = target.x - source.x;
    let dy = target.y - source.y;

    let svgRect = lineLayer.getBoundingClientRect();
    let aspecRatio = svgRect.width / svgRect.height

    let xScreen = dx;
    let yScreen = dy / aspecRatio;
    let len = Math.sqrt(xScreen * xScreen + yScreen * yScreen);

    let offset = mode.offset;

    let x = (-yScreen / len) * offset;
    let y = (xScreen / len) * offset / aspecRatio;

    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("data-key", connectKey);

    let angle = Math.atan2(yScreen, xScreen) * (180 / Math.PI)

    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${source.x + x}%`);
    line.setAttribute("x2", `${target.x + x}%`);
    line.setAttribute("y1", `${source.y + y}%`);
    line.setAttribute("y2", `${target.y + y}%`);
    line.setAttribute("stroke", mode.color);
    line.setAttribute("stroke-width", "2");

    let midX = (source.x + target.x) / 2 + x;
    let midY = (source.y + target.y) / 2 + y;

    let textAngle = angle;
    if (textAngle > 90 || textAngle < -90) textAngle += 180;

    let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", `${midX}%`);
    text.setAttribute("y", `${midY}%`)
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "11");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", mode.color);
    text.style.transformOrigin = `${midX}% ${midY}%`;
    text.setAttribute("transform", `rotate(${textAngle})`)
    text.textContent = `${distance}`;

    g.append(line, text);
    lineLayer.append(g);

}

function deleteMarker(deleteId) {
    points.forEach(p => {
        p.connections = p.connections.filter(t => t.to !== deleteId);
    })

    lineLayer.querySelectorAll(`[data-key]`).forEach(line => {
        if (line.dataset.key.split("-").includes(String(deleteId))) line.remove();
    })

    container.querySelector(`#marker-${deleteId}`).remove();
    let pIdx = points.findIndex(p => p.id == deleteId);
    points.splice(pIdx, 1);

    saveToStorage();
}

function saveToStorage() {
    localStorage.setItem("map-points-v2", JSON.stringify(points))
}

function loadToStorage() {
    let data;
    try {
        data = JSON.parse(localStorage.getItem("map-points-v2")) ?? [];
    } catch (error) {
        return;
    }

    points = [];

    data.forEach(m => {
        let pn = addMarker(m.x, m.y, m.name, m.id);
        pn.connections = m.connections ?? [];

    })

    data.forEach(m => {
        (m.connections || []).forEach(conn => {
            let source = points.find(p => p.id == m.id);
            let target = points.find(p => p.id == conn.to);
            if (source && target) {

                drawLine(source, target, conn.mode, conn.distance);
            }
        })
    })

}

let routePanel = document.getElementById("find-route-panel");
let inputFrom = document.getElementById("inputFrom")
let inputTo = document.getElementById("inputTo")
let routeSearch = document.getElementById("route-search")
let buttonFastest = document.getElementById("buttonFastest")
let buttonCheapest = document.getElementById("buttonCheapest")
let contentRoute = document.getElementById("content-route")


inputFrom.addEventListener("input", validateRouteInput);
inputTo.addEventListener("input", validateRouteInput);

function getPointByName(name) {
    let point = points.find(p => p.name == name);
    return point ?? null;
}

let sortMode = "fastest";
let lastRoutes = [];

function validateRouteInput() {
    let fromVal = inputFrom.value.trim();
    let toVal = inputTo.value.trim();

    let fromPoint = getPointByName(fromVal)
    let toPoint = getPointByName(toVal)

    inputFrom.style.border = fromPoint ? "1px solid rgb(153, 233, 133)" : "1px solid red";
    inputTo.style.border = toPoint ? "1px solid rgb(153, 233, 133)" : "1px solid red";

    if (fromPoint && toPoint) {
        routeSearch.style.backgroundColor = "rgb(199, 90, 221)"
        routeSearch.disabled = false;
        routeSearch.style.cursor = "pointer"
    } else {
        routeSearch.style.backgroundColor = "rgba(199, 90, 221, .4)"
        routeSearch.disabled = true;
        routeSearch.style.cursor = "not-allowed"
    }

}

routeSearch.onclick = () => {
    doSearch()
};

function doSearch() {
    let sourcePoint = getPointByName(inputFrom.value.trim())
    let toPoint = getPointByName(inputTo.value.trim())

    if (!sourcePoint || !toPoint) return;
 

   let routes = getAllRoutes(sourcePoint.id,toPoint.id);

//    console.log(routes);

   routes.sort((a, b) => {
        let totalA = getTotal(a.edges), totalB = getTotal(b.edges);
        sortMode == "fastest" ? 
        totalA.totalDuration - totalB.totalDuration :
        totalA.totalCost - totalB.totalCost;
   })

//    routes.forEach(e => {
//     console.log(getTotal(e.edges));
    
//    }) 

renderRoutes(routes);
   

}

function getAllRoutes(fromId, toId) {
    fromId = Number(fromId);
    toId = Number(toId);

    let results = [];
    let queue = [{ path: [fromId], edges: [] }];
    let iterations = 0;

    while (queue.length > 0 && iterations++ < 2000) {
        let { path, edges } = queue.shift();
        let current = Number(path[path.length - 1]);

        if (current == toId) {
            results.push({ path, edges });
            if (results.length > 10) break;
            continue;
        }

        let point = points.find(p => p.id == current);
        if (!point) continue;

        for (let conn of point.connections) {
            let tId = Number(conn.to);
            if(path.includes(tId)) continue;

            let modeData = transportMethod[conn.mode];
            queue.push({
                path: [...path, tId],
                edges: [...edges, {
                    from: current,
                    to: tId,
                    mode: conn.mode,
                    distance: conn.distance,
                    speed: modeData.speed,
                    cost: modeData.cost * Number(conn.distance)
                }]
            })

        }
    }

    return results;
}

function getTotal(edge) {
    let totalCost = 0;
    let totalDuration = 0;
    for(let e of edge) {
        totalDuration += Number(e.distance) / Number(e.speed);
        totalCost += e.cost
    };

    return {totalCost, totalDuration};
}

function renderRoutes(routes) {
    if(!routes.length) {
           resultEl.innerHTML = `<p style="color:#888;font-size:13px;text-align:center;margin-top:12px;">Tidak ada rute ditemukan.</p>`;
        return;
    }

    contentRoute.innerHTML = routes.map(r => {
        let fromName = points.find(p => p.id == r.path[0])?.name || "";
        let toName = points.find(p => p.id == r.path[r.path.length -1])?.name || "";
        let {totalCost, totalDuration} = getTotal(r.edges);

        let steps = r.edges.map((e, i) => {
            let fn = points.find(p => p.id == e.from)?.name || e.from;
            let tn = points.find(p => p.id == e.to)?.name || e.to;
            let m = transportMethod[e.mode];

            return `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#444;margin-bottom:3px;">
                <span style="width:10px;height:10px;border-radius:50%;background:${m.color};border:1px solid #ccc;flex-shrink:0;display:inline-block;"></span>
                <span>${i + 1}. ${fn} → ${tn} (${m.label})</span>
            </div>`;
        }).join("")

        return `
         <div style="background:#f9f9fb;border-radius:12px;padding:14px;margin-bottom:12px;border:1.5px solid #ede9fe;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;">
                ${fromName} - ${toName}
                <span style="float:right;font-size:13px;font-weight:600;color:#6b7280;">${fmtDuration(totalDuration)}</span>
            </div>
            <div style="margin-bottom:8px;">${steps}</div>
            <div style="font-weight:700;font-size:13px;color:#6b21a8;">${fmtCost(totalCost)}</div>
        </div>
        `


    }).join("")
}


function fmtDuration(duration) {
    let hh = Math.floor(duration), mm = Math.round(duration - hh) * 60;
    return hh === 0 ? `${mm}m` : mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}


function fmtCost(c) {
    return "Rp" + c.toLocaleString("id-ID");
}

loadToStorage()