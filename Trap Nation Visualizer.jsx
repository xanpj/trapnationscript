/************************************************/
/***********************************************/
/***********TRAP NATION VISUALIZER*************/
/*********************************************/
/********************************************/

//REQUIREMENTS: 1. AE LANGUAGE MUST BE ENGLISH
//              2. SELECTABLE FOLDER MUST CONTAIN
//                   - background.png/jpg
//                   - cover.png/jpg
//                   - audio file with ending .wav|wma|mp3|m4a|aac|aiff|aifc
//COMPATIBLE: ADOBE AFTER EFFECTS CS5, CS6, CC 17/18/19

//AUTHOR: Alexander Jagaciak
//DATE: 05.02.2019
//VERSION: 1.0
//DESCRIPTION: Generates a "Trap Nation"-like audio visualization
//based on the AE template from https://www.youtube.com/watch?v=ZzAbmW09Zv4

app.beginUndoGroup("Trap Nation Visualizer");

/**********************/
/**CONSTS & GLOBALS***/
/********************/
var VERSION = parseInt(app.version.substring(0,2));
var LANGUAGE = app.isoLanguage.substring(0,2);
var REQUIRED_LANGUAGE = "en"
var EXPRESSION = "expression"
var BACKGROUND = "background"
var COVER = "cover"
var MASK = "\\.(wav|wma|mp3|m4a|aac|aiff|aifc)$";
var myImportOptions = new ImportOptions();
var importedLayers = new Array();
var folder;
var selectedFolderName;
var folderSelected;

if(LANGUAGE !== REQUIRED_LANGUAGE ) {
    alert("Please switch After Effects to english language to use this plugin.")
} else {
/*************************/
/****STATIC FUNCTIONS****/
/***********************/
//Hack for opening a composition in viewer instead of openInViewer() which is not available in CS5
//Credit to https://forums.creativecow.net/docs/forums/post.php?forumid=227&postid=10710&univpostid=10710&pview=t
function openCompPanel(thisComp) {
    // remember the original work area duration
    var duration = thisComp.workAreaDuration;

    // temporarily set the work area to 2 frames
    // I know, I should use the comp fps to calculate it,
    // but I only work in NTSC 30 fps.
    // Anything less than 2 frames makes AE barf
    thisComp.workAreaDuration = 0.06;

    // make a 2 frame ram preview which forces the comp window to open
    // I don't know the first and last arguments, and they may not want
    // strings, but this works for me. The second argument is a scaling
    // factor for the viewport. Use 0.5 for 50%, etc.
    thisComp.ramPreviewTest("",1,"");

    // Play nice and put things back the way they were
    thisComp.workAreaDuration = duration;
}

//apply all fx and respective params as given in the dict to a layer
function applyFxToLayer(layer, fxDict){
    for (var fxName in fxDict){ //fx list
        var layerFx = layer.Effects.addProperty(fxName);
        for (var paramId = 0;paramId < fxDict[fxName].length;paramId++) { //param list
                fxObj = fxDict[fxName];
                param = fxObj[paramId];
                if (param.type !== undefined && param.type == EXPRESSION) {
                    layerFx.property(param.name).expression = param.value;
                } else {
                    layerFx.property(param.name).setValue(param.value);
                }
        }
    }
}

//apply all fx and respective params as given in the dict to many layers
//cloneWithValue params are used if params differ for each layer
function applyFxToLayers(layers, fxDict){
    var i = 0;
    for (var layerId = 0;layerId < layers.length;layerId++) { //layers
        for (var fxName in fxDict){ //fx list
            var layerFx = layers[layerId].Effects.addProperty(fxName);
            for (var paramId = 0;paramId < fxDict[fxName].length;paramId++) {  //param list
                    var fxObj = fxDict[fxName];
                    var param = fxObj[paramId];
                    var value;
                    if(param.value !== undefined){
                        value = param.value;
                    }
                    if(param.cloneWithValues !== undefined){
                        value = param.cloneWithValues[i];
                    }
                    if (param.type !== undefined && param.type == EXPRESSION) {
                        layerFx.property(param.name).expression = value;
                    } else {
                        layerFx.property(param.name).setValue(value);
                    }
            }
        }
        i++;
    }
}

//change fx and respective params as given in the dict for a layer
function changeFxOfLayer(layer, fxDictNew){
    for (fxName in fxDictNew){ //fx list
        if (layer.Effects.property(fxName) === undefined){
            var layerFx = layer.Effects.addProperty(fxName);
        }
        for (var paramId = 0;paramId < fxDictNew[fxName].length;paramId++) {  //param list
            var fxObj = fxDictNew[fxName];
            var param = fxObj[paramId];
            if (param.type !== undefined && param.type == EXPRESSION) {
                layerFx.property(param.name).expression = param.value;
            } else {
                layerFx.property(param.name).setValue(param.value);
            }
        }
    }
}


/************/
/****GUI****/
/**********/
var mainWindow = new Window("palette","Trap Nation Visualizer", undefined);
mainWindow.graphics.backgroundColor = mainWindow.graphics.newBrush(mainWindow.graphics.BrushType.SOLID_COLOR, [0.5, 0.5, 0.5]);
mainWindow.orientation = "column";

var groupOne = mainWindow.add("group", undefined, "groupOne");
groupOne.orientation = "row";
var fileLocBox = groupOne.add("edittext",undefined, "Select your resources folder.");
fileLocBox.size=[200,20];
var getFolderButton = groupOne.add("button", undefined, "Folder...");
getFolderButton.helpTip = "Select the folder with the images and song.";
var groupOneTxtObj;

var groupTwo = mainWindow.add("group", undefined, "groupTwo");
groupTwo.orientation = "row";
var applyButton = groupTwo.add("button", undefined, "Apply");

mainWindow.center();
mainWindow.show();

//Select folder with resources
getFolderButton.onClick = function(){
    folder = new Folder(Folder.desktop);
    selectedFolderName = folder.selectDlg("Select your resources folder.");
    fileLocBox.text = selectedFolderName
    folderSelected = true;
}

applyButton.onClick = function(){
    if(!folderSelected){
        alert("Please select a folder!");
        return false;
    } else {
        groupOne.remove(1)
        groupOne.remove(0)
        groupTwo.remove(0)
        groupOneTxtObj = groupOne.add ('statictext {text: "Processing audio", characters: 60, justify: "center"}')
        groupOneTxtObj.text = "Processing audio..."; //Doesnt show due to bug but is meant as a placeholder
        compose()
    }
}


/**********************/
/****FUNCTIONALITY****/
/********************/
function compose(){

    //clear previous items in project
    var itemsLength = app.project.numItems
    for (var i = itemsLength; i > 0;i--){ //top to bottom so indices do not get messed up
        app.project.item(i).remove()
    }

    //load all files in selected folder
    var myFolder = new Folder(selectedFolderName);
    var re = new RegExp(MASK, "i");
    var myAudioFiles = myFolder.getFiles(re);
    var myFiles = myFolder.getFiles(BACKGROUND+".png");
    var myFiles = myFiles.concat(myFolder.getFiles(BACKGROUND+".jpg"));
    var myFiles = myFiles.concat(myFolder.getFiles(COVER+".png"));
    var myFiles = myFiles.concat(myFolder.getFiles(COVER+".jpg"));
    var allMyFiles = myFiles.concat(myAudioFiles)

    //import relevant files to project
    var numFiles = allMyFiles.length;
    var numAudio = 0;
    var numVisuals = 0;
    var audioArray = new Array();
    var visualArray = new Array();
    var coverImgFile;
    duration = 0;
    for(var i= 0; i < allMyFiles.length; i++){
            myImportOptions.file = allMyFiles[i]
            importedFile = app.project.importFile(myImportOptions)
            if(importedFile.hasAudio){
                duration = importedFile.duration
                audioArray.push(importedFile)
            } else if(importedFile.name.indexOf(BACKGROUND) != -1) {
                visualArray.push(importedFile)
            } else if(importedFile.name.indexOf(COVER) != -1){
                coverImgFile = importedFile;
            }
            importedLayers.push(importedFile)
        }

    /****************/
    /** MAIN COMP **/
    /**************/
    app.project.items.addComp("Main", 1920, 1080, 1, duration, 30);

    //explicit retrieval of Main Composition because AE is buggy otherwise ...
    for (var itemId = 1; itemId <= app.project.items.length; itemId++ ){
        var item = app.project.item(itemId)
        if (item.name == "Main") {
            mainComp = item;
        }
    }

    /** Background image/s **/
    var startTime = 0;
    for(var q = 0;q<visualArray.length;q++){
            var thisLayer = mainComp.layers.add(visualArray[q]);
            if(thisLayer.name.indexOf(BACKGROUND) != -1){
                thisLayer.selected = true
                var fitToCompCmd = app.findMenuCommandId("Fit to Comp Width");
                if(fitToCompCmd == 0){
                    fitToCompCmd= (VERSION <= 10) ? 2156 :  2156;
                }
                app.executeCommand(fitToCompCmd);
            }
             thisLayer.outPoint = duration;
        }

    /****************/
    /** SPECTRUMS **/
    /***************/
    var SPECTRUMS_LAYER = "Spectrums";
    var spectrumComp = app.project.items.addComp(SPECTRUMS_LAYER, 1920, 1080, 1, duration, 30);
    var spectrumCompLayer = mainComp.layers.add(spectrumComp);

    /** MusicComp **/
    groupOneTxtObj.text = "Processing audio ... (Click after 10 seconds of idle)"; //Doesnt show due to bug but is meant as a placeholder

    var musicComp = app.project.items.addComp("Music", 1920, 1080, 1, duration, 30);
    spectrumComp.layers.add(musicComp);

        /** Audio file **/
        var audioLayer = musicComp.layers.add(audioArray[0]);

    //activate musicComp
    if (VERSION <= 10) {
        //AE <= 11
        openCompPanel(musicComp)
    } else {
        //AE > 11
        musicComp.openInViewer();
    }

    audioLayer.selected = true;
    var convertAudioToKeyFramesCmd = app.findMenuCommandId("Convert Audio to Keyframes");
    if(convertAudioToKeyFramesCmd == 0){
        //AE <> 11
        convertAudioToKeyFramesCmd = (VERSION <= 10) ? 5013 :  5026;
    }
    app.executeCommand(convertAudioToKeyFramesCmd);
    groupOneTxtObj.text = "Audio conversion succeeded!";
    $.sleep(1000);
    groupOneTxtObj.text = "Switch to 'Main' Composition now, please.";
    $.sleep(2000);

    //activate mainComp
    if (VERSION <= 10) {
        //AE < 11
        mainWindow.close();
    } else {
        //AE >= 11
        app.activeViewer.setActive();
        mainComp.openInViewer();
    }

    /* AdjustmentScaler (for following layers) */
    var SPECTRUM_ADJUSTMENT_LAYER = "Spectrum Adjustment Layer";
    spectrumComp.layers.addSolid([0, 0, 0], SPECTRUM_ADJUSTMENT_LAYER , 1920, 1080, 1, 2); //in sec
    var spectrumAdjustmentLayer = spectrumComp.layer(SPECTRUM_ADJUSTMENT_LAYER);
    spectrumAdjustmentLayer.adjustmentLayer = true;

    /** Cover Image **/
    var coverImg = spectrumComp.layers.add(coverImgFile);
    coverImgFile.outPoint = duration;

    //create elliptic mask
    //Credit to http://aenhancers.com/viewtopic.php?t=2084
    myLayer = coverImg
    ratio = 0.5523;
    h = myLayer.width/2.0;
    v = myLayer.height/2.0;
    th = h*ratio;
    tv = v*ratio;
    newMask = myLayer.Masks.addProperty("ADBE Mask Atom");
    newMask.maskMode = MaskMode.ADD;
    myProperty = newMask.property("ADBE Mask Shape");
    myShape = myProperty.value;
    myShape.vertices = [[h,0],[0,v],[h,2*v],[2*h,v]];
    myShape.inTangents = [[th,0],[0,-tv],[-th,0],[0,tv]];
    myShape.outTangents = [[-th,0],[0,tv],[th,0],[0,-tv]];
    myShape.closed = true;
    myProperty.setValue(myShape);
    var coverImgScaleProperty = coverImg.property("transform").property("scale")
    var CIRCLE_SIZE = 504.0
    coverImgScaleProperty.setValue([
        (CIRCLE_SIZE / myLayer.width)*100,
         CIRCLE_SIZE / myLayer.height*100,
         CIRCLE_SIZE / myLayer.width*100])
    coverImg.moveToEnd();

    /* Center Circle */
    centerCircle = spectrumComp.layers.addSolid([0, 0, 0], "Center Circle", 1920, 1080, 1, duration);

    var ON_TOP = 1;
    var NONE = 1;
    centerCircleFx = {
        "Circle": [
        {
            name: "Radius",
            value: 275.0
        }
        ],
        "Glow": [
        {
            name: "Composite Original",
            value: 1
        },
        {
            name: "Glow Operation",
            value: 1
        }
        ]
    }
    applyFxToLayer(centerCircle, centerCircleFx);
    centerCircle.moveToEnd();

    /* White Spectrums */
    var RECT_TO_POLAR = 1
    var whiteSpectrumsFx = {
        "Audio Spectrum": [
        {
            name: "Audio Layer",
            value: 2
        },
        {
            name: "Start Point",
            value: [0, 540]
        },
        {
            name: "End Point",
            value: [1920, 540]
        },
        {
            name: "End Frequency",
            value: 250
        },
        {
            name: "Frequency bands",
            value: 2000
        },
        {
            name: "Maximum Height",
            cloneWithValues: [700, 750, 800, 850, 900, 950, 1000, 1100, 1050]
        },
        {
            name: "Audio Duration (milliseconds)",
            cloneWithValues: [170, 160, 150, 130, 120, 110, 100, 100, 90]
        },
        {
            name: "Thickness",
            value: 3
        },
        {
            name: "Inside Color",
            cloneWithValues: [
            [255, 255, 255],
            [255, 246, 0] ,
            [255, 162, 0] ,
            [255, 0, 0] ,
            [255, 54, 248] ,
            [24, 0, 255] ,
            [66, 115, 255],
            [0, 228, 255],
            [18, 255, 0]
            ]
        },
        {
            name: "Outside Color",
            cloneWithValues: [
            [255, 255, 255],
            [255, 246, 0] ,
            [255, 162, 0] ,
            [255, 0, 0] ,
            [255, 54, 248] ,
            [24, 0, 255] ,
            [66, 115, 255],
            [0, 228, 255],
            [18, 255, 0]
            ]
        },
        {
            name: "Side Options",
            value: 2
        }
        ],
        "Polar Coordinates": [
        {
            name: "Interpolation",
            value: 1.0
        },
        {
            name: "Type of Conversion",
            value: RECT_TO_POLAR
        }
        ],
         "Glow": [
        {
            name: "Composite Original",
            value: ON_TOP
        },
        {
            name: "Glow Operation",
            value: NONE
        },
        {
            name: "Glow Radius",
            value: 34
        }
        ] ,
        "Mirror": [
        {
            name: "Reflection Center",
            value: [960, 540],
        }
        ]
    }

    //create all spectrums on the white circle
    var WHITE_SPECTRUMS_NUM = 9;
    var whiteSpectrums = []
    for(var i = 0; i < WHITE_SPECTRUMS_NUM; i++) {
        var spectrumName = "White Spectrum " + i.toString();
        var whiteSpectrumLayer = spectrumComp.layers.addSolid([0, 0, 0], spectrumName, 1920, 1080, 1, duration)
        whiteSpectrumLayer.moveToEnd();
        whiteSpectrums.push(whiteSpectrumLayer);
    }
    applyFxToLayers(whiteSpectrums, whiteSpectrumsFx)

    /*********************/
    /** PARTICLES COMP **/
    /*******************/
    var PARTICLES = "Particles"
    particlesComp = app.project.items.addComp(PARTICLES, 1920, 1080, 1, duration, 30);
    mainComp.layers.add(particlesComp);
    particlesCompFx = {
        "Transform": [
        {
            name: "Opacity",
            value: 63
        }
        ]
    }
    applyFxToLayer(mainComp.layer(PARTICLES), particlesCompFx) //not mentioned in reference video


    /* Particles Solid */
    PARTICLES_SOLID = "Particles Solid";
    particlesComp.layers.addSolid([0, 0, 0], PARTICLES_SOLID, 1920, 1080, 1, duration);

    var FRACTAL_OMNI = 13;
    var LENS_CONVEX = 18;
    var OFF = 0;
    var particlesSolidFx = {
        "CC Particle World": [
            {
                name: "Position",
                value: OFF,
                type: OFF
            },
            {
                name: "Radius",
                value: OFF
            },
            {
                name: "Motion Path",
                value: OFF
            },
            {
                name: "Motion Path Frames",
                value: 30
            },
            {
                name: "Grid",
                value: OFF
            },
            {
                name: "Horizon",
                value: OFF
            },
            {
                name: "Axis Box",
                value: OFF
            },
            {
                name: "Birth Rate",
                value: 2.0
            },
            {
                name: "Longevity (sec)",
                value: 4.0
            },
            {
                name: "Animation",
                value: FRACTAL_OMNI
            },
            {
                name: "Particle Type",
                value: LENS_CONVEX
            },
            {
                name: "Gravity",
                value: 0.0
            },
            {
                name: "Extra Angle",
                value: 0.0
            },
            {
                name: "Max Opacity",
                value: 100
            },
            {
                name: "Radius X",
                value: 0.0
            },
            {
                name: "Radius Y",
                value: 0.0
            },
            {
                name: "Radius Z",
                value: 0.0
            },
            {
                name: "Birth Size",
                value: 0.030
            },
            {
                name: "Death Size",
                value: 0.030
            },
            {
                name: "Rotation X",
                value: 'value + (comp("Music").layer("Audio Amplitude").effect("Both Channels")("Slider"))/ 10',
                type: EXPRESSION
            },
            {
                name: "Rotation Z",
                value:  'value + (comp("Music").layer("Audio Amplitude").effect("Both Channels")("Slider"))/ 30',
                type: EXPRESSION
             }
        ],
        "Fill": [
            {
                name: "Color",
                value: [255,255,255],
            }
        ],
        "Mirror": [
            {
                name: "Reflection Center",
                value: [960, 540],
            }
        ]
    }
    applyFxToLayer(particlesComp.layer(PARTICLES_SOLID), particlesSolidFx)

    /* Spectrum comp fx */
    //must be applied last because of buggy behaviour otherwise
    var spectrumCompFx = {
        "Magnify": [
        {
            name: "Magnification",
            value: '(value - 50) + (comp("Music").layer("Audio Amplitude").effect("Both Channels")("Slider"))/5',
            type: EXPRESSION
        },
        {
            name: "Size",
            value: 1100
        }
        ]
    }
    applyFxToLayer(mainComp.layer(SPECTRUMS_LAYER), spectrumCompFx)

    mainComp.layer(SPECTRUMS_LAYER).moveToBeginning()
}

}
