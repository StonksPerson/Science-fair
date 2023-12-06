var showTrails = false;
const cleanRes = 100;
var bestScore = 0;
const tpsDiv = document.getElementById("tps");
const genDiv = document.getElementById("gen");
const bulkTrain = 30;
const sensorDist = 200;
const wallRayCount = 8;
const cleanRayCount = 8;
const fov = Math.PI / 2;
const roomWidth = 1000;
const roomHeight = 1000;
const cellSize = 1000 / cleanRes;
const walls = document.getElementsByClassName(`walls`);
var colideWalls = [];
var cleanCells = [];
var lastCleanedSquareTime = Date.now();
var randX = 0;
var randY = 0;
var enemyData = {x: 500, vx:0 , y: 500, vy:0};
const enemy = document.getElementById("enemy");
// const network = document.getElementById("network");
// var networkData = {x: 0, y: 0, rot: 0, v: 0};
var time = Date.now();
var startTime = Date.now();
const maxRunTime = 30000;
const minRunTime = 0; // about 100 ticks per second
const maxUncleanTicks = 100;
const trainingRate = .25;
var uncleanTicks = 0;
var ticks = 0;
const input_n = wallRayCount + cleanRayCount;
const output_n = 2;
const n_rows = 8;
const n_colums = 3;
var currentNeuron = [];
const size = 20;
const d_size = Math.sqrt((2 * (size * size)));
const max_speed = 4;
const max_turn = 0.2;
started = true;
var bestColor = "red";
var colors = [
    "blue",
    "orange",
    "yellow",
    "purple",
    "green"
];

for(var i = 0; i < walls.length; i++){
    var rect = walls[i].getBoundingClientRect()
    colideWalls.push(rect)
}

genCoord()
var savedNetwork = localStorage.getItem("best");
var bestAI = createNetwork();
//bestAI = createNetwork()
var networkData = [bestAI];
setInterval(Tick,1);

function updateAi(){
    genCoord()
    for(var i = 0; i < networkData.length; i++){
        networkData[i].delete()
    }
    var clean = document.getElementsByClassName('clean')
    
    while(clean.length > 0){

        for(var i = 0; i < clean.length; i++){
            clean[i].remove()
        }
        clean = document.getElementsByClassName('clean')
    }
    var ai = document.getElementById("baseAi").value;
    bestAI = createNetwork(JSON.parse(ai));
    bestAI.network.color = bestColor;
    networkData = [bestAI];
    bestAI.reset()
    genDiv.innerHTML = "Generation "+String(bestAI.network.gen);
}

function createNetwork (baseNetwork) {

    var network = { neurons: [], x: randX, y: randY, rot: 0, v: 0, icon: null, gen: 0, score: 0, cleanGrid: [], dist: 0};
    for(var x = 0; x < cleanRes; x++){
        for(var y = 0; y < cleanRes; y++){
            network.cleanGrid.push(0)
        }
    }
    createNeurons(network);
    createIcon(network);
    if(baseNetwork){
        for(var i = input_n; i < baseNetwork.neurons.length; i++){
            for(var j = 0; j < baseNetwork.neurons[i].connections.length; j++){
                network.neurons[i].connections[j].wt = baseNetwork.neurons[i].connections[j].wt;
            }
        }
        network.gen = (baseNetwork.gen ?? 0);
    }
    
    return {
        setInput: function (input) {
            for(var i = 0; i < input.length; i++){
                network.neurons[i].charge = input[i];
            }
        },
        reset: function(){
            for(var i = 0; i < cleanRes * cleanRes; i++){
                network.cleanGrid[i] = 0;
            }
            network.x = randX;
            network.y = randY;
            network.v = 0;
            network.rot = 0;
            network.score = 0;
            network.dist = 0;
            network.gen += 1;
        },
        update: function(){

            for(var i = input_n; i < network.neurons.length; i++){
                network.neurons[i].charge = 0;
            }
    

            for(var i = input_n; i < network.neurons.length; i++){
                for(var e = 0; e < network.neurons[i].connections.length; e++){
                    network.neurons[i].charge += (network.neurons[(network.neurons[i].connections[e].ref)].charge * network.neurons[i].connections[e].wt);
                }
                network.neurons[i].charge = network.neurons[i].charge / network.neurons[i].connections.length;
            }
            
            network.v = network.neurons[network.neurons.length - output_n].charge * max_speed;
            network.v = Math.max(Math.min(network.v, max_speed), 0);
            network.rot += network.neurons[network.neurons.length - output_n + 1].charge * max_turn;
            
            var moveDist = castWallRay(network.x, network.y, network.rot, network.v, size);
            network.x = Math.max(Math.min((network.x + Math.cos(network.rot) * moveDist), roomWidth - 30), 30);
            network.y = Math.max(Math.min((network.y + Math.sin(network.rot) * moveDist), roomHeight - 30), 30);
            network.dist = (network.dist ?? 0) + moveDist;

            network.icon.style.top =  String(network.y - size) + "px";
            network.icon.style.left = String((network.x - size)) + "px";
            network.icon.style.rotate = String((network.rot * 57.2958 + 90)) + "deg";
            network.icon.style.width = String(size * 2) + "px";
            network.icon.style.height = String(size * 2) + "px";
            
            var offset = 3.14159265 / 4;
            var dist1 = castWallRay(network.x, network.y, network.rot + offset, sensorDist, 5);
            var x1 = network.x + Math.cos(network.rot + offset) * dist1;
            var y1 = network.y + Math.sin(network.rot + offset) * dist1;
            network.ray1.style.top =  String(y1 - 5) + "px";
            network.ray1.style.left = String(x1 - 5) + "px";
            network.ray1.style.backgroundColor = network.color;

            var dist2 = castWallRay(network.x, network.y, network.rot - offset, sensorDist, 5);
            var x2 = network.x + Math.cos(network.rot - offset) * dist2;
            var y2 = network.y + Math.sin(network.rot - offset) * dist2;
            network.ray2.style.top =  String(y2 - 5) + "px";
            network.ray2.style.left = String(x2 - 5) + "px";
            network.ray2.style.backgroundColor = network.color;
        },
        delete: function(){
            network.icon.remove()
            network.ray1.remove()
            network.ray2.remove()
        },
        copy: function(){
            return(createNetwork(network))
        },
        calcScore: function(){
            //network.score +=  1 - Math.abs((Math.atan2((network.y - enemyData.y), (network.x - enemyData.x)) - network.rot) / Math.PI);
            //network.score += 1 - Math.sqrt(Math.pow(network.y - enemyData.y, 2) + Math.pow(network.x - enemyData.x, 2)) / Math.max(window.innerWidth, window.innerHeight);
            network.score = 0;
            network.cleanGrid.forEach(s => network.score += s * 2);
            network.score += network.dist;
        },
        network: network
    }
}

function createNeurons(network) {

    for(var i = 0; i < input_n; i++){
        network.neurons.push({charge: 0});
    }

    for(var c = 0; c < n_colums; c++){
        for(var r = 1; r < n_rows + 1; r++){
            if(c > 0){
                for(var i = 0; i < n_rows; i++){
                    currentNeuron.push({ ref : (i + input_n + ((c - 1) * n_rows)), wt : 0})
                }
                network.neurons.push({ connections: currentNeuron, charge: 0})
                currentNeuron = []
            }else{
                for(var i = 0; i < input_n; i ++){
                    currentNeuron.push({ ref : i, wt : 0})
                }
                network.neurons.push({ connections: currentNeuron, charge: 0})
                currentNeuron = []
            }
        }
    }

    for(var o = 0; o < output_n; o++){
        for(var e = 0; e < n_rows; e++){
            currentNeuron.push({ ref : e + ((n_rows * (n_colums - 1)) + input_n), wt : 0})
        }
        network.neurons.push({ connections: currentNeuron, charge: 0})
        currentNeuron = [];
    }

}

function createIcon(network){
    var icon = document.createElement("div");
    icon.setAttribute("class", "network");
    document.body.appendChild(icon);
    network.icon = icon;

    var ray1 = document.createElement("div");
    ray1.setAttribute("class", "target");
    document.body.appendChild(ray1);
    network.ray1 = ray1;

    var ray2 = document.createElement("div");
    ray2.setAttribute("class", "target");
    document.body.appendChild(ray2);
    network.ray2 = ray2;
}

function Tick() {
    uncleanTicks++;
    ticks++;
    time = Date.now();
    tpsDiv.innerHTML = String(Math.round(ticks / ((time - startTime) / 1000))) + " tps";

    networkTick()
}
const cellOffsets = [
    { x: 0, y: 2 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: -2, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 0, y: -2 }
];
function networkTick() {

    for(var n = 0; n < networkData.length; n++){

        var network = networkData[n].network;
        var input = calcInputs(network);
        var cellX = Math.floor(network.x / cellSize);
        var cellY = Math.floor(network.y / cellSize);
        for(var i=0; i< cellOffsets.length; ++i){
            var floorX = cellX + cellOffsets[i].x;
            var floorY = cellY + cellOffsets[i].y;
            if(network.cleanGrid[floorX + floorY * cleanRes] == 0){
                uncleanTicks = 0;
                lastCleanedSquareTime = Date.now();
                network.cleanGrid[floorX + floorY * cleanRes] = 1;
                if(showTrails){
                    var cell = document.createElement('div');
                    cell.setAttribute('class', 'clean')
                    cell.setAttribute('id', String(floorX + floorY * cleanRes))
                    cell.style.position = "absolute";
                    cell.style.top = String(floorY * cellSize) + "px";
                    cell.style.left = String(floorX * cellSize) + "px";
                    cell.style.backgroundColor = network.color;
                    document.body.appendChild(cell)
                }
            }
        }

        networkData[n].setInput(input);
        networkData[n].update();
    }
}

function castWallRay(curX, curY, dir, dist, radius){
    var isNegative = false;
    if(dist < 0){
        isNegative = true;
        dist = -dist;
        dir += Math.PI;
    }
    var maxDist = dist;
    var dx = Math.cos(dir) * dist;
    var dy = Math.sin(dir) * dist;
    var courseHitbox = new DOMRect(
        Math.min(curX, curX + dx) - radius,
        Math.min(curY, curY + dy) - radius,
        Math.abs(dx) + radius * 2,
        Math.abs(dy) + radius * 2
    );
    var x=0;
    var y=0;
    var rayFunc = getStandardForm(curX, curY, curX + dx, curY + dy)
    for(var i = 0; i < colideWalls.length; i++){
        var wall = colideWalls[i];
        if(rectsOverlap(wall, courseHitbox)) {
            var left = wall.left - radius;
            var right = wall.right + radius;
            var top = wall.top - radius;
            var bottom = wall.bottom + radius;

            // Check left
            y = -(rayFunc.a * left + rayFunc.c) / rayFunc.b;
            if(y > top && y <= bottom)
                maxDist = Math.min(maxDist, getDist(curX, curY, left, y)-.01);

            // Check right
            y = -(rayFunc.a * right + rayFunc.c) / rayFunc.b;
            if(y > top && y <= bottom)
                maxDist = Math.min(maxDist, getDist(curX, curY, right, y)-.01);

            // Check top
            x = -(rayFunc.b * top + rayFunc.c) / rayFunc.a;
            if(x > left && x <= right)
                maxDist = Math.min(maxDist, getDist(curX, curY, x, top)-.01);
            
            // Check bottom
            x = -(rayFunc.b * bottom + rayFunc.c) / rayFunc.a;
            if(x > left && x <= right)
                maxDist = Math.min(maxDist, getDist(curX, curY, x, bottom)-.01);
        }
    }
    if(isNegative)
        maxDist = -maxDist;
    return maxDist;
}

const cleanRayGranularity = 5

function castCleanRay(curX, curY, dir, dist, radius){

    var dx = Math.cos(dir);
    var dy = Math.sin(dir);
    var rayX = curX + dx * size * 2;
    var rayY = curY + dy * size * 2;
    var count = dist / cleanRayGranularity;

    for(var i = 0; i < count; i++){

        if(rayX > 0 && rayX < roomWidth && rayY > 0 && rayY < roomHeight){
            var cellX = Math.floor(rayX / cellSize);
            var cellY = Math.floor(rayY / cellSize);

            if(cleanCells[cellX + cellY * cleanRes] == 1){
                return i * cleanRayGranularity;
            }
            
            rayX += dx * cleanRayGranularity;
            rayY += dy * cleanRayGranularity;
        }else{
            break
        }
    }
    return dist;

}


function getDist(x1, y1, x2, y2){
    var dx = x2 - x1;
    var dy = y2 - y1;
    
    return Math.sqrt(dx * dx + dy * dy);
}
function rectsOverlap(rect1, rect2){
    if(rect2.right <= rect1.left || rect2.left >= rect1.right) {
        return false;
    }
    if(rect2.bottom <= rect1.top || rect2.top >= rect1.bottom) {
        return false;
    }
    return true;
}

function getStandardForm(x1, y1, x2, y2) {
    // ax + by + c = 0
    
    return { 
        a: (y1 - y2), 
        b: (x2 - x1), 
        c: (y2 - y1) * x1 + (x1 - x2) * y1
    };

}

function calcInputs(network) {
    var dir = network.rot - fov / 2;
    var inputs = [];
    for(var w = 0; w < wallRayCount; w++){
        inputs.push((castWallRay(network.x, network.y, dir + w * fov / wallRayCount, 200, 1) / 100) - 1)
    }
    for(var c = 0; c < cleanRayCount; c++){
        inputs.push((castWallRay(network.x, network.y, dir + c * fov / cleanRayCount, 200, 1) / 100) - 1)
    }

    return inputs;
}

function genCoord() {
    var isValid = false;
    while(!isValid){
        
        randX = Math.floor(Math.random() * (roomWidth - size * 2)) + size
        randY = Math.floor(Math.random() * (roomHeight - size * 2)) + size

        var rect = new DOMRect(randX - size, randY - size, size * 2, size * 2);
        isValid = true;

        for(var i = 0; i < colideWalls.length; i++){
            var wall = colideWalls[i];
            if(rectsOverlap(rect, wall)){
                isValid = false
                break
            };
        }
    }
}
