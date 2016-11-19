//function to create a 2D array of 2^n + 1 - empty heightmap
//sets corner values to 0.5 (seed values)
function create2D(heightMap, mapSize)
{
    
    for(i = 0; i < mapSize+1; i++)
    {
        heightMap[i] = new Array();
        for(j = 0; j < mapSize+1; j++)
        {
            
            if((i == 0 && j == 0) ||
                (i == 0 && j == mapSize) ||
                (i == mapSize && j == 0) ||
                (i == mapSize && j == mapSize))
            {
                heightMap[i][j] = Math.random(); //make height 
            }
            
            else
            {
                heightMap[i][j] = 0;  
            }
            
        }    
    }
    console.log(heightMap[0][0]);
    
}
//------------------------------------------------------------------

//function to generate heightmap using the diamond square algorithm
//divide the "map" up and adjust their height values
function diamondSquare(size, maxSize, roughness, heightMap)
{
    
    var x, y, mid = size / 2;
    
   // var debugCount = 1;
    
    var scale = roughness * size;
    
    //base case
    if (mid < 1)
        return;
    
    //recurse through diamond and square phases
    for (y = mid; y < maxSize; y+=size)
    {
        for(x = mid; x < maxSize; x+=size)
            {
                squareStep(x, y, mid, Math.random()*2*scale-scale, heightMap);
            }
    }
    
    for ( y = 0; y <= maxSize; y+= mid)
    {
       // console.log("iteration ", debugCount);
        for( x = (y+mid) % size; x <= maxSize; x+=size)
        {
           // console.log("sending x of ", x);
        //    console.log("sending y of", y);
        //    console.log("sending mid of", mid);
            
          diamondStep(x, y, mid, maxSize, Math.random()*2*scale-scale, heightMap)
        }
        //console.log("finished iteration ", debugCount);
    }
    
    diamondSquare(size/2, maxSize, roughness, heightMap);
    
}
//-------------------------------------------------------------------------

//square step of d/s algortihm
function squareStep(x, y, size, offset, heightMap)
{
    //average to get average value of height map values
    var ave = 0;
    
    ave += heightMap[x-size][y-size];
    ave += heightMap[x+size][y-size];
    ave += heightMap[x-size][y+size];
    ave += heightMap[x+size][y+size];
    
    ave = ave/4;
    
    var val = ave + offset;
    
    heightMap[x][y] = val;
    
}

//diamond step of d/s algorithm
function diamondStep(x, y, size, maxSize, offset, heightMap)
{
    //average to get average value of height map values
    var ave = 0;
    
    var pointCount = 0;
    
    if((y-size)>=0)
    {
        ave += heightMap[x][y-size];
        pointCount++;
    }
    
    if((x+size) <= maxSize)
    {
        ave += heightMap[x+size][y];
        pointCount++;
    }
    
    if((y+size) <= maxSize)
    {
        ave += heightMap[x][y+size];
        pointCount++;
    }
    
    if((x-size)>=0)
    {
        ave += heightMap[x-size][y];
        pointCount++;
    }
    
    ave = ave / 4;
    
    var val = ave + offset;
    
    heightMap[x][y] = val;
    
    
}

//-------------------------------------------------------------------------
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray, heightMap)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    var deltaZ= (maxY-minY)/n;
    
    var x = 0;
    var y = 0;
    var z = 0;
    
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
            x = minX + deltaX*i;
            y = minY + deltaY*j;
       
            z = minX + deltaZ*heightMap[j][i];
           // z = heightMap[j][i];
          // console.log("z-value at ",x,",",y,"is: ",heightMap[j][i]);
           
           vertexArray.push(x);
           vertexArray.push(y);
           vertexArray.push(z);
           
           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(1);
       }

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

//-------------------------------------------------------------------------