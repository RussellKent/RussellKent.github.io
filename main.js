document.getElementById('loadRegions').addEventListener('click', async () => {
  let RegionFile = await getRegionFile();
});

document.getElementById('saveRegions').addEventListener('click', async () => {
  let RegionFile = await putRegionFile();
});

document.getElementById('generate').addEventListener('click', async () => {

  if ( ! ("showOpenFilePicker" in window) ) {
    alert("Your Browser does not support the FSA API")
    return;
  }

  let deleteMapData = document.getElementById('chk_Mapdata').checked;
  let deleteChunkData = document.getElementById('chk_Chunkdata').checked;
  let deleteZPopData = document.getElementById('chk_ZpopData').checked;

  if (deleteMapData == false && deleteChunkData == false && deleteZPopData == false) {
    alert("Select at least one filetype to Delete")
    return
  }

  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: CurrentRegionFile.replace(".json", ".txt"),
      types: [
        {
          description: "SFTP command batch",
          accept: {  "text/plain": [".bat"] },
        },
      ],
    });

    // Write the regions to the file.
    const writable = await fileHandle.createWritable();

    toggleprogressbar(true);
    areasCleared = 0;
    annolist = anno.getAnnotations();
    AreasToClear = annolist.length;
    console.log("AreasToClear=" + AreasToClear);
    
    // for each annotation...
    for (let an of annolist) {
      //console.log("Area: " + an.target.selector.value);

      rectinfo = annoCoordToPZCoord(an.target.selector.value)
      //console.log("rectinfo: sx: " + rectinfo.sx + "  ex: " + rectinfo.ex + "  sy: " + rectinfo.sy + "  ey: " + rectinfo.ey);

      let FilesToCheck = (rectinfo.ex-rectinfo.sx) * (rectinfo.ey - rectinfo.sy) + 1;
      let filesChecked = 0;
      for (let i = rectinfo.sx; i < rectinfo.ex; i++) {
        for (let j = rectinfo.sy; j < rectinfo.ey; j++) {
          filesChecked++;

          if (deleteMapData == true) {
            let filename = CoordinateToFileName(i, j, "M");
            await writable.write("rm " + filename + "\n");
          }
          if (deleteChunkData == true) {
            let filename = CoordinateToFileName(i, j, "C");
            await writable.write("rm " + filename + "\n");
          }
          if (deleteZPopData == true) {
            let filename = CoordinateToFileName(i, j, "Z");
            await writable.write("rm " + filename + "\n");
          }

        }
        updateProgressBar (FilesToCheck, filesChecked, AreasToClear, areasCleared);
      }
      areasCleared++;
    }
      
    await writable.close();
  } catch (e) {
    console.log(e);
  }  

  viewer.clearOverlays();

  toggleprogressbar(false);


});
