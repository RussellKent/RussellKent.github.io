let CurrentRegionFile = "";

async function getRegionFile() {
  if ( ! ("showOpenFilePicker" in window) ) {
    alert("Your Browser does not support the FSA API")
    return;
  }

  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: "Region map",
          accept: {  "application/json": [".json"] },
        },
      ],
    });
    CurrentRegionFile = fileHandle.name;

    const file = await fileHandle.getFile();
    const content = await file.text();

    const annoData = JSON.parse(content);

    let index = 0;
    anno.clearAnnotations();
    for (let an of annoData.regions)
    {
      //{
      //  "type":"Annotation",
      //  "body":[],
      //  "target":{
      //      "source":"file:///C:/Users/Russell/source/repos/PZ_MapCleaner_Server/undefined",
      //      "selector":{
      //          "type":"FragmentSelector",
      //          "conformsTo":"http://www.w3.org/TR/media-frags/",
      //          "value":"xywh=pixel:5477.66455078125,5839.18212890625,213.88330078125,180.83251953125"
      //       }
      //   },
      //  "@context":"http://www.w3.org/ns/anno.jsonld",
      //  "id":"#1af8f61d-c658-4173-95d2-430eb95ee5bf"}

      let annoInst = {
        "type":"Annotation",
        "id" : "#" + self.crypto.randomUUID(),
        "@context":"http://www.w3.org/ns/anno.jsonld",
        "target" : {
          //"source":"file:///C:/Users/Russell/source/repos/PZ_MapCleaner_Server/undefined",
          "selector":{
                "type":"FragmentSelector",
                "conformsTo":"http://www.w3.org/TR/media-frags/",
                "value":"xywh=" + an.x + "," + an.y + "," + an.w + "," + an.h
            }
        }
      }
      anno.addAnnotation(annoInst);
    }
    //console.log("Loaded " + index);

    return;
  } catch (e) {
    console.log(e);
  }
}



async function putRegionFile() {
  if ( ! ("showOpenFilePicker" in window) ) {
    alert("Your Browser does not support the FSA API")
    return;
  }
  
  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: CurrentRegionFile,
      types: [
        {
          description: "Region map",
          accept: {  "application/json": [".json"] },
        },
      ],
    });

    // Write the regions to the file.
    const writable = await fileHandle.createWritable();

    await writable.write("{\"regions\":[");
    
    let separator = "\n";

    const annolist = anno.getAnnotations();

    for (let an of annolist) {
      const arr = an.target.selector.value.replace("xywh=", "").replace("pixel:", "").split(",");
      await writable.write(separator + "{ \"x\":" +  arr[0] + ", \"y\":" +  arr[1] + ", \"w\":" +  arr[2] + ", \"h\":" +  arr[3] + "}");
      separator = ",\n";
    }
    
    await writable.write("\n]}");
    await writable.close();
    return;
  } catch (e) {
    console.log(e);
  }
}


function CreateLineArray(Coords) {
  let LineArr = [];
  let lastcoord = new ChunkCoordinate(0, 0);
  let currentCoord = new ChunkCoordinate(0, 0);
  let w = 0;
  let h = 0
  let startx = 0;
  let starty = 0;
  let endx = 0;
  let endy = 0;
  let AnnoName = "";
  Coords.sort((a, b) => { return a.x - b.x; });

  for (let i = 0; i < Coords.length; i++) {

    AnnoName = Coords[i].x + "-" + Coords[i].y;
    currentCoord = Coords[i];

    if (currentCoord.x == lastcoord.x && currentCoord.y == parseInt(lastcoord.y, 10) + 1) {
      h = h + 10;
      lastcoord = new ChunkCoordinate(currentCoord.x, currentCoord.y);
      endx = currentCoord.x;
      endy = currentCoord.y;
    }
    else if (startx <= 0) {
      lastcoord = new ChunkCoordinate(currentCoord.x, currentCoord.y);
      startx = currentCoord.x;
      starty = currentCoord.y;
      endx = currentCoord.x;
      endy = currentCoord.y;
    }
    else {
      LineArr.push(new overlayLine(startx, starty, endx, endy));
      lastcoord = new ChunkCoordinate(currentCoord.x, currentCoord.y);
      startx = currentCoord.x;
      starty = currentCoord.y;
      endx = currentCoord.x;
      endy = currentCoord.y;
    }
  }
  return LineArr;
}

function LineArrToRect(LineArr) {
  let rectList = [];
  let lastline;
  let newRect;
  let line = LineArr[0];
  let LinesToSearch = LineArr.length;

  for (let i = 0; i < LinesToSearch; i++) {
    if (!lastline) {
      line = LineArr[0];
      newRect = new overlayLine(line.sx, line.sy, line.ex, line.ey);
      lastline = new overlayLine(line.sx, line.sy, line.ex, line.ey);
    }
    else if ((line.sx == parseInt(lastline.sx, 10) + 1) && (line.sy == lastline.sy && line.ey == lastline.ey)) {
      newRect.ex = line.ex;
    }
    else if ((line.sx == parseInt(lastline.sx, 10) - 1) && (line.sy == lastline.sy && line.ey == lastline.ey)) {
      newRect.sx = line.sx;
    } else {
      rectList.push(new overlayLine(newRect.sx, newRect.sy, newRect.ex, newRect.ey));
      newRect.sx = line.sx;
      newRect.sy = line.sy;
      newRect.ex = line.ex;
      newRect.ey = line.ey;
    }
    lastline.sx = line.sx;
    lastline.sy = line.sy;
    lastline.ex = line.ex;
    lastline.ey = line.ey;
    LineArr.shift();
    sortByDistance(LineArr, { x: lastline.sx, y: lastline.sy });
    line = LineArr[0];
  }
  return rectList;
}

function drawRectangles(rectList) {
  let cnt = 0;
  for (let Orect of rectList) {
    let w = (Orect.ex - parseInt(Orect.sx, 10) + 1) * 10;
    let h = (Orect.ey - parseInt(Orect.sy, 10) + 1) * 10;
    //console.log(`adding rect ${Orect.sx},${Orect.sy},${w},${h}`);
    addOverlay(viewer, cnt.toString(), Orect.sx, Orect.sy, w, h);
    cnt++;
  }
  //console.log("Rectangles drawn: " + rectList.length);
}
