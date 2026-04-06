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

container.append(markerLayer);  

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
    plane: { color: "#000000", speed: 800, cost: 1000, label: "plane", offset: 1.1 }
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

window.addEventListener("keydown", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    if (e.key == "=" || e.key == "+") {
        zoomAt(container.scrollWidth / 2, container.scrollHeight / 2, 1.1);
    }
    if (e.key == "-") {
        zoomAt(container.scrollWidth / 2, container.scrollHeight / 2, .9);
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

    tempClick = {x: percentX, y: percentY};

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
    if(!inputKota.value || inputKota.value == "") {
        inputKota.focus(); return;
    }

    addMarker(tempClick.x, tempClick.y, inputKota.value.trim());
    closeModalKota();

}

function addMarker(percentX, percentY, name, otherId = null) {
    let id = Number(otherId !== null ? otherId : nextId++);
    if(otherId !== null && otherId > nextId) nextId = Number(otherId) + 1;

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
     <div style="border: 1px solid black; background-color: white; color: black; font-weight: 700; border-radius: 10px; padding: 5px; display: flex; align-items: center; white-space: nowrap; gap: 6px;  ">
        <span>${name}</span>
         <div style="width: 1px; height: 15px; background-color: black;"></div>
        <button class="btn-connect" style="background-color: white; border: none;">🔗</button>
        <div style="width: 1px; height: 15px; background-color: black;"></div>
        <button class="btn-delete" style="border: none; background-color: red; color: white; border-radius: 50%; width: 20px; height: 20px">X</button>
    </div>
    <img src="./location3.png" style="width: 28px; height: auto; pointer-events: none;" alt="">
    `

    let point = {id, x: percentX, y: percentY, name, connections: []};
    points.push(point);

    markerLayer.append(el);

    el.querySelector(".btn-connect").addEventListener("click", () => {
        if(connectSourceId && id !== connectSourceId) finishConnect(id) ;
       else {
            startConnect(id);
       }
    })
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
    if(connectSourceId == sourceId) {
        cancelConnect();
        return;
    }
    connectSourceId = sourceId;
    container.querySelector(`#marker-${sourceId}`).style.filter = "drop-shadow(0 0 8px #a855f7)"
}

function finishConnect(targetId) {
    let source = points.find(p => p.id == connectSourceId);
    let target = points.find(p => p.id == targetId);
    tempConnectionData = {source, target};
    showModalConnection();
}

function cancelConnect() {
     if (connectSourceId !== null) {
        let elConnect = document.querySelector(`#marker-${connectSourceId}`);
        if(elConnect) elConnect.style.filter = "";
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
    inputDistance.value == "";
    inputMethod.value == "train";

    let markerEl = container.querySelector(`#marker-${connectSourceId}`);
    if(markerEl) {
        markerEl.style.filter = "";
    }
}

submitConnection.onclick = () => {
    if(!inputDistance.value || inputDistance.value == "") {
        inputDistance.focus();
        return;
    }

    let modeKey = inputMethod.value;
    let mode = transportMethod[modeKey];
    

    let {source, target} = tempConnectionData;
    source.connections.push({to: target.id, distance: Number(inputDistance.value.trim()), mode: modeKey, color: mode.color, speed: mode.speed, cost: mode.cost });
    target.connections.push({to: source.id, distance: Number(inputDistance.value.trim()), mode: modeKey, color: mode.color, speed: mode.speed, cost: mode.cost });

    drawLine(source, target, modeKey, inputDistance.value.trim());
    closeModalConnection();
    console.log(points);

}

function drawLine(source, target, mode, distance) {

}