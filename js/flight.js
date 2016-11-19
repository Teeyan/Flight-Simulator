var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

var lastTime = 0;

var keyPress = {};

//angle by which to rotate view by
var rot = degToRad(0.5);

// Stores Terrain Geometry
var tVertexPositionBuffer;

//Stores normals for shading
var tVertexNormalBuffer;

// Stores triangles from terrain
var tIndexTriBuffer;

//Stores triangle edges
var tIndexEdgeBuffer;

var lightPos = vec3.fromValues(0,20,1);

//max x,y value for diamond square
var maxX = 513;
var maxY = 513;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

//-------------------------------------------------------------------------

//function to check if sound is playing

function isPlaying(playerId)
{
      
    var player = document.getElementById(playerId);
    return !player.paused && !player.ended && 0 < player.currentTime;
    
}


//-------------------------------------------------------------------------
function setupTerrainBuffers() {
    
    var vTerrain=[];
    
    //store the x values for the terain
    var vTerrainX = [];
    //store the y values for the terrain
    var vTerrainY = [];

    //size of the terrain map 
    var mapSize = 129;

    //factor by which to scale the generated heights - for fluidity
   // var roughness = 0.0015;
    var roughness = 0.25;
    
    //height map for the terrain
    var heightMap = [];
    
    //initialize 2D array heightmap and seed corner values
    create2D(heightMap, mapSize);
    
   // console.log(heightMap[0][0]);
    
    //sets the heights in the heightmap using d/s algorithm
    diamondSquare(mapSize-1, mapSize-1, roughness, heightMap);
    
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var gridN=128;
    
    //put vertices into vertex array
    var numT = terrainFromIteration(gridN, -10,10,-10,10, vTerrain, fTerrain, nTerrain, heightMap);
    
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
    
     
}

//-------------------------------------------------------------------------
function drawTerrain(){
    
    //enable passing uint into arrayb uffer
    var uints_for_indices = gl.getExtension("OES_element_index_uint");
   
    //console.log(uints_for_indices);
    
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_INT,0);      
}

//-------------------------------------------------------------------------
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");

    
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
function draw() { 
    
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    

    //make sure light position is transformed with view transformations
    var lightPosEye4 = vec4.fromValues(0.0,20.0,0.0,1.0);
    lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
    var lightPosEye = vec3.fromValues(lightPosEye4[0], lightPosEye4[1], lightPosEye4[2]);
    
    //Draw Terrain
    mvPushMatrix();
    //og -0.25, -3
    
   // vec3.set(0.0, 0.0, 0.0);
    
   // vec3.set(transformVec,0.0,0.0,-40.0);
    
    //put eyept in proper position
    
    vec3.set(transformVec, 0.0, 7.0, -10.0);
    
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-87));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(90));     
    
    //mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    //mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));
    
    setMatrixUniforms();
    uploadLightsToShader(lightPosEye,[0.0,0.0,0.0],[0.0392,0.749,0.1804],[0.0,0.0,0.0]);
    drawTerrain();
   
    uploadLightsToShader(lightPosEye,[1.0,1.0,1.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
    drawTerrainEdges();

   mvPopMatrix();
  
}

//----------------------------------------------------------------------------------
function animate() {
    
     //create quaternion for rotation

    var q = quat.fromValues(0.0,0.0,0.0,1.0);
    
    //adjust quaternion based off of key presses
    handleKeys(q);
    
    //Move forward by moving eyepoint
    
    var speed = vec3.create();
    vec3.scale(speed, viewDir, 0.0075);
    vec3.add(eyePt,eyePt,speed);
    
    //normalize quaternion
    quat.normalize(q,q);
    
    //apply rotations
    vec3.transformQuat(up, up, q);
    vec3.transformQuat(viewDir, viewDir, q);
    
    
}

//----------------------------------------------------------------------------------
function startup() {
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.8, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//----------------------------------------------------------------------------------

function handleKeyDown(event)
{
   // console.log("down");
   // console.log(event.keyCode);
    keyPress[event.keyCode] = true; 
    console.log(event.keyCode, keyPress[event.keyCode]);
    
}
    
function handleKeyUp(event)
{
   // console.log("up");
   // console.log(event.keyCode)
    keyPress[event.keyCode] = false;
    console.log(event.keyCode,keyPress[event.keyCode]);
}
   

function handleKeys(q)
{
    
    var pitchVec = vec3.create();
    vec3.cross(pitchVec, up, viewDir);
    
    //console.log(keyPress[65]);
    
    //left key press
    if(keyPress[65])
    {
        quat.setAxisAngle(q, viewDir, -rot);  
    }
    //up key press
    if(keyPress[87])
    {
        quat.setAxisAngle(q, pitchVec, -rot);
   
    }
    //right key press
    if(keyPress[68])
    {
        quat.setAxisAngle(q, viewDir, rot);
    
    }
    //down key press
    if(keyPress[83])
    {
        quat.setAxisAngle(q, pitchVec, rot);
    }
    
    
} 

function tick() {
    
    //check if startup song is playing
    var begin = isPlaying("song");
    
    requestAnimFrame(tick);
    draw();
   // console.log(begin);
    if(!begin)
    {
        //play flying song and begin animation
        plane.loop = true;
        plane.play();
        animate();
    }
}