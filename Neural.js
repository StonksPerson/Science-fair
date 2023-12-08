const isTraining = false;
const cleanRes = 100;
var bestScore = 0;
const tpsDiv = document.getElementById("tps");
const genDiv = document.getElementById("gen");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
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
var time = Date.now();
var startTime = Date.now();
const maxRunTime = 3000000;
const minRunTime = 1000; // about 100 ticks per second
const maxUncleanTicks = 800;
const trainingRate = .2;
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
canvas.width = roomWidth;
canvas.height = roomHeight;
canvas.style.width = String(roomWidth)+"px";
canvas.style.height = String(roomHeight)+"px";
canvas.style.top = "0px";
canvas.style.left = "0px";
canvas.style.zIndex = -1;

for(var i = 0; i < walls.length; i++){
    var rect = walls[i].getBoundingClientRect()
    colideWalls.push(rect)
}

genCoord()
var savedNetwork = localStorage.getItem("best");
var bestAI = !savedNetwork ? createNetwork(): createNetwork(JSON.parse(savedNetwork));
//var bestAI = createNetwork()
var networkData = [];
if(bestAI)
{
    genDiv.innerHTML = "Generation "+String(bestAI.network.gen);
    networkData.push(bestAI);
}
setInterval(Tick,1);

if(isTraining)
    newGen();

function updateAi(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    bestAI.reset();
    localStorage.setItem("best", JSON.stringify(bestAI.network));
    genDiv.innerHTML = "Generation "+String(bestAI.network.gen);
}

function newGen() {
    lastCleanedSquareTime = Date.now();
    startTime = Date.now();
    uncleanTicks = 0;
    ticks = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bestAI && bestAI.network.gen % 10 == 0){
        genCoord();
    }

    if(networkData.length > 0){

        var currentBestScore = -10000000;
        var currentBestAi = bestAI;

        for(var j = 0; j < networkData.length; j++){
            networkData[j].calcScore()
            var score = networkData[j].network.score;
            if(currentBestScore < score){
                currentBestScore = score;
                currentBestAi = networkData[j];
            }
        }
        bestScore = currentBestScore;
        bestAI = currentBestAi;    

        for(var n = 0; n < networkData.length; n++){
            if(networkData[n] != bestAI){
                networkData[n].delete();
            }
        }
    }
    networkData = [bestAI ?? createNetwork()];
    bestAI.reset();
    bestAI.network.gen += 1;
    bestAI.network.color = bestColor;
    for(var i = 1; i < bulkTrain; i++){
        var newAI = bestAI.copy();
        newAI.modifyWeights();
        newAI.network.color = colors[i % colors.length];
        networkData.push(newAI);
    }
    
    var clean = document.getElementsByClassName('clean')
    
    while(clean.length > 0){

        for(var i = 0; i < clean.length; i++){
            clean[i].remove()
        }
        clean = document.getElementsByClassName('clean')
    }
    genDiv.innerHTML = "Generation "+String(bestAI.network.gen);
    localStorage.setItem("best", JSON.stringify(bestAI.network));
    if (bestAI.network.gen % 50 == 0){
        //localStorage.setItem("gen4/generation-"+String(bestAI.network.gen), JSON.stringify(bestAI.network));
        writeData(bestAI.network, "gen5/generation-" + bestAI.network.gen + ".json");
    }

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
        },
        update: function(){

            for(var i = input_n; i < network.neurons.length; i++){
                network.neurons[i].charge = 0;
            }
    

            for(var i = input_n; i < network.neurons.length; i++){
                for(var e = 0; e < network.neurons[i].connections.length; e++){
                    network.neurons[i].charge += (network.neurons[(network.neurons[i].connections[e].ref)].charge * network.neurons[i].connections[e].wt);
                }
                network.neurons[i].charge = Math.max(Math.min(network.neurons[i].charge / network.neurons[i].connections.length, 1), -1);
            }
            
            network.v = network.neurons[network.neurons.length - output_n].charge * max_speed;
            network.v = Math.max(Math.min(network.v, max_speed), -max_speed);
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
        modifyWeights: function() {
            for(var i = input_n; i < network.neurons.length; i++){
                for(var j = 0; j < network.neurons[i].connections.length; j++){
                    network.neurons[i].connections[j].wt = network.neurons[i].connections[j].wt + (Math.random() * 2 - 1) * trainingRate;
                }
            }
        },
        copy: function(){
            return(createNetwork(network))
        },
        calcScore: function(){
            network.score = 0;
            network.cleanGrid.forEach(s => network.score += s * 4);
            network.score += network.dist;
        },
        network: network
    }
}

function createNeurons(network) {

    for(var i = 0; i < input_n; i++){
        network.neurons.push({charge: 0});
    }

    var currentNeuron = [];
    for(var c = 0; c < n_colums; c++){
        for(var r = 1; r < n_rows + 1; r++){
            if(c > 0){
                for(var i = 0; i < n_rows; i++){
                    currentNeuron.push({ ref : (i + input_n + ((c - 1) * n_rows)), wt : Math.floor(((Math.random() * 2) - 1) * 100) / 100})
                }
                network.neurons.push({ connections: currentNeuron, charge: 0})
                currentNeuron = []
            }else{
                for(var i = 0; i < input_n; i ++){
                    currentNeuron.push({ ref : i, wt : Math.floor(((Math.random() * 2) - 1) * 100) / 100})
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
    if(isTraining && ticks > minRunTime){
        if(ticks > maxRunTime) {
            newGen();
        }
        else if((uncleanTicks) > maxUncleanTicks) {
            newGen();
        }
    }
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

                ctx.save();
                ctx.fillStyle = network.color;
                ctx.globalAlpha = .2;
                ctx.fillRect(floorX * cellSize, floorY * cellSize,cellSize,cellSize);
                ctx.restore();
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
                maxDist = Math.max(Math.min(maxDist, getDist(curX, curY, left, y)-.01), 0);

            // Check right
            y = -(rayFunc.a * right + rayFunc.c) / rayFunc.b;
            if(y > top && y <= bottom)
                maxDist = Math.max(Math.min(maxDist, getDist(curX, curY, right, y)-.01), 0);

            // Check top
            x = -(rayFunc.b * top + rayFunc.c) / rayFunc.a;
            if(x > left && x <= right)
                maxDist = Math.max(Math.min(maxDist, getDist(curX, curY, x, top)-.01), 0);
            
            // Check bottom
            x = -(rayFunc.b * bottom + rayFunc.c) / rayFunc.a;
            if(x > left && x <= right)
                maxDist = Math.max(Math.min(maxDist, getDist(curX, curY, x, bottom)-.01), 0);
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
        inputs.push((castCleanRay(network.x, network.y, dir + c * fov / cleanRayCount, 200, 1) / 100) - 1)
    }

    return inputs;
}

function genCoord() {
    //randX = 969
    //randY = 447
    //return;
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

async function writeData(Obj, fileName){

    var xhr = new XMLHttpRequest();
    xhr.open("PUT", `https://api.github.com/repos/StonksPerson/Science-fair/contents/${fileName}` , true);
    xhr.setRequestHeader("Accept","application/vnd.github+json")
    xhr.setRequestHeader("Authorization", "Bearer <PERSONAL_TOKEN>")
    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28")
    xhr.send(JSON.stringify({
        message: `Added Data ${fileName}`,
        committer: {
          name: 'Connor',
          email: 'andersonconnor09@gmail.com'
        },
        content: btoa(JSON.stringify(Obj)),

      }
    ));

}