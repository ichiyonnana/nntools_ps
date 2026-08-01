#target photoshop

// 選択パスのシンメトリ化
function symmetrize_shape(forceDialogMode) {

    /*
    Code for Import https://scriptui.joonas.me — (Triple click to select):
    {"activeId":11,"items":{"item-0":{"id":0,"type":"Dialog","parentId":false,"style":{"enabled":true,"varName":"SymmetrizeShape","windowType":"Dialog","creationProps":{"su1PanelCoordinates":false,"maximizeButton":false,"minimizeButton":false,"independent":false,"closeButton":true,"borderless":false,"resizeable":false},"text":"SymmetrizeShape","preferredSize":[0,0],"margins":16,"orientation":"column","spacing":10,"alignChildren":["center","top"]}},"item-1":{"id":1,"type":"Group","parentId":0,"style":{"enabled":true,"varName":null,"preferredSize":[0,0],"margins":0,"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-2":{"id":2,"type":"Button","parentId":1,"style":{"enabled":true,"varName":null,"text":"Top","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-3":{"id":3,"type":"Group","parentId":0,"style":{"enabled":true,"varName":null,"preferredSize":[0,0],"margins":0,"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-4":{"id":4,"type":"Button","parentId":3,"style":{"enabled":true,"varName":null,"text":"Left","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-5":{"id":5,"type":"Button","parentId":3,"style":{"enabled":true,"varName":null,"text":"Right","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-6":{"id":6,"type":"Group","parentId":0,"style":{"enabled":true,"varName":null,"preferredSize":[0,0],"margins":0,"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-7":{"id":7,"type":"Button","parentId":6,"style":{"enabled":true,"varName":null,"text":"Bottom","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-8":{"id":8,"type":"Group","parentId":0,"style":{"enabled":true,"varName":null,"preferredSize":[0,0],"margins":0,"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-9":{"id":9,"type":"Button","parentId":8,"style":{"enabled":true,"varName":null,"text":"CenterH","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-10":{"id":10,"type":"Button","parentId":8,"style":{"enabled":true,"varName":null,"text":"CenterV","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-11":{"id":11,"type":"Button","parentId":8,"style":{"enabled":true,"varName":null,"text":"Auto","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-12":{"id":12,"type":"Group","parentId":0,"style":{"enabled":true,"varName":null,"preferredSize":[0,0],"margins":0,"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-13":{"id":13,"type":"Button","parentId":12,"style":{"enabled":true,"varName":null,"text":"Close","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}}},"order":[0,1,2,3,4,5,6,7,8,11,9,10,12,13],"settings":{"importJSON":true,"indentSize":false,"cepExport":false,"includeCSSJS":true,"showDialog":true,"functionWrapper":false,"afterEffectsDockable":false,"itemReferenceList":"None"}}
    */

    // SYMMETRIZESHAPE
    // ===============
    var SymmetrizeShape = new Window("dialog");
    SymmetrizeShape.text = "SymmetrizeShape";
    SymmetrizeShape.orientation = "column";
    SymmetrizeShape.alignChildren = ["center", "top"];
    SymmetrizeShape.spacing = 10;
    SymmetrizeShape.margins = 16;

    // GROUP1
    // ======
    var group1 = SymmetrizeShape.add("group", undefined, { name: "group1" });
    group1.orientation = "row";
    group1.alignChildren = ["left", "center"];
    group1.spacing = 10;
    group1.margins = 0;

    var button1 = group1.add("button", undefined, undefined, { name: "button1" });
    button1.text = "Top";
    button1.onClick = function () { flipMode = FM_Y_MIN; SymmetrizeShape.close(); };

    // GROUP2
    // ======
    var group2 = SymmetrizeShape.add("group", undefined, { name: "group2" });
    group2.orientation = "row";
    group2.alignChildren = ["left", "center"];
    group2.spacing = 10;
    group2.margins = 0;

    var button2 = group2.add("button", undefined, undefined, { name: "button2" });
    button2.text = "Left";
    button2.onClick = function () { flipMode = FM_X_MIN; SymmetrizeShape.close(); };

    var button3 = group2.add("button", undefined, undefined, { name: "button3" });
    button3.text = "Right";
    button3.onClick = function () { flipMode = FM_X_MAX; SymmetrizeShape.close(); };

    // GROUP3
    // ======
    var group3 = SymmetrizeShape.add("group", undefined, { name: "group3" });
    group3.orientation = "row";
    group3.alignChildren = ["left", "center"];
    group3.spacing = 10;
    group3.margins = 0;

    var button4 = group3.add("button", undefined, undefined, { name: "button4" });
    button4.text = "Bottom";
    button4.onClick = function () { flipMode = FM_Y_MAX; SymmetrizeShape.close(); };

    // GROUP4
    // ======
    var group4 = SymmetrizeShape.add("group", undefined, { name: "group4" });
    group4.orientation = "row";
    group4.alignChildren = ["left", "center"];
    group4.spacing = 10;
    group4.margins = 0;

    var button5 = group4.add("button", undefined, undefined, { name: "button5" });
    button5.text = "Auto";
    button5.onClick = function () { flipMode = FM_AUTO; SymmetrizeShape.close(); };

    var button6 = group4.add("button", undefined, undefined, { name: "button6" });
    button6.text = "CenterH";
    button6.onClick = function () { flipMode = FM_X_CENTER; SymmetrizeShape.close(); };

    var button7 = group4.add("button", undefined, undefined, { name: "button7" });
    button7.text = "CenterV";
    button7.onClick = function () { flipMode = FM_Y_CENTER; SymmetrizeShape.close(); };

    // GROUP5
    // ======
    var group5 = SymmetrizeShape.add("group", undefined, { name: "group5" });
    group5.orientation = "row";
    group5.alignChildren = ["left", "center"];
    group5.spacing = 10;
    group5.margins = 0;

    var button8 = group5.add("button", undefined, undefined, { name: "button8" });
    button8.text = "Cancel";
    button8.onClick = function () { flipMode = FM_NOP; doSymmetize = false; SymmetrizeShape.close(); };



    // メッセージ
    MSG_MULTIPATH_SELECTED = "複数レイヤーのパスが選択されているかパスが選択されていません。"

    function puts(s) {
        $.writeln(s);
    }

    function getTool() {
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var cTool = typeIDToStringID(executeActionGet(ref).getEnumerationType(stringIDToTypeID('tool')));
        return cTool;
    }

    // https://www.ps-scripts.com/viewtopic.php?f=68&t=11342&p=152772
    function setTool(tool) {
        var desc9 = new ActionDescriptor();
        var ref7 = new ActionReference();
        ref7.putClass(app.stringIDToTypeID(tool));
        desc9.putReference(app.charIDToTypeID('null'), ref7);
        executeAction(app.charIDToTypeID('slct'), desc9, DialogModes.NO);
    }

    function matchThreshold(x1, x2) {
        threshold = 1.0;
        return (Math.abs(x1 - x2) < threshold);
    }

    // in case we double clicked the file
    app.bringToFront();

    // 実際に反転処理が行われる場合は True
    // 処理が行われない (最後まで false ) の場合はシェイプ複製前までヒストリを戻す
    var doSymmetize = false;

    // フリップモード
    FM_NOP = -1;
    FM_AUTO = 0;
    FM_X_MIN = 1;
    FM_X_MAX = 2;
    FM_Y_MIN = 3;
    FM_Y_MAX = 4;
    FM_X_CENTER = 5;
    FM_Y_CENTER = 6;
    var flipMode = FM_AUTO;

    // フリップ方向
    FD_HORIZONTAL = 0;
    FD_VERTICAL = 1;
    var flipDirection = undefined;

    // ドキュメントサイズ
    var docWidth = app.activeDocument.width.as('px');
    var docHeight = app.activeDocument.height.as('px');

    // コンポーネント選択ツールでサブパス全体を選択
    setTool('pathComponentSelectTool');

    // 現在のパス数取得
    // n>1 の場合はコピペがおかしくなるので処理しない
    nPathItems = app.activeDocument.pathItems.length;
    if (nPathItems != 1) {
        // シェイプの選択が複数レイヤーもしくは選択されていない場合
        alert(MSG_MULTIPATH_SELECTED);
        return;
    }


    // 現在のサブパス数取得
    var subPaths = app.activeDocument.pathItems[0].subPathItems;
    var nSubPaths = subPaths.length;

    // パス複製前に復帰ポイント作成
    var t = new Date();
    var timeStamp = t.getTime();
    var recoveryPointName = "recoverypoint_" + timeStamp;
    app.activeDocument.suspendHistory(recoveryPointName, "");

    // パスのコピー&ペースト
    var idcopy = charIDToTypeID("copy");
    executeAction(idcopy, undefined, DialogModes.NO);
    var idpast = charIDToTypeID("past");
    executeAction(idpast, undefined, DialogModes.NO);

    // 増分の全てのサブパスの全ての制御点をまとめる
    var nOldSubPathItems = nSubPaths;
    var currentSubPathItems = app.activeDocument.pathItems[0].subPathItems;
    var allPathPoints = [];

    for (i = nOldSubPathItems; i < currentSubPathItems.length; i++) {
        subPathItem = currentSubPathItems[i];
        pathPoints = subPathItem.pathPoints;

        for (j = 0; j < pathPoints.length; j++) {
            allPathPoints.push(pathPoints[j]);
        }
    }

    // X,Y それぞれの Min/Max 値と、水平垂直に並んだ制御点が無いか調べる
    // 各軸の最小・最大座標
    var minX = Number.MAX_VALUE;
    var maxX = Number.MIN_VALUE;
    var minY = Number.MAX_VALUE;
    var maxY = Number.MIN_VALUE;

    // 軸として有効かどうか
    // 最小・最大座標で水平垂直に並ぶ制御点が複数あれば true
    var minXAvailable = false;
    var maxXAvailable = false;
    var minYAvailable = false;
    var maxYAvailable = false;

    for (i = 0; i < allPathPoints.length; i++) {
        a = allPathPoints[i].anchor;
        x = a[0];
        y = a[1];
        if (matchThreshold(x, minX)) {
            minXAvailable = true;
        } else if (x < minX) {
            minX = x;
            minXAvailable = false;
        }

        if (matchThreshold(x, maxX)) {
            maxXAvailable = true;
        } else if (x > maxX) {
            maxX = x;
            maxXAvailable = false;
        }

        if (matchThreshold(y, minY)) {
            minYAvailable = true;
        } else if (y < minY) {
            minY = y;
            minYAvailable = false;
        }

        if (matchThreshold(y, maxY)) {
            maxYAvailable = true;
        } else if (y > maxY) {
            maxY = y;
            maxYAvailable = false;
        }
    }

    // forceDiralogMode が有効ならフリップモードを手動で設定する
    if (forceDialogMode) {
        SymmetrizeShape.show();
    }

    // ピボットと反転方向の決定
    var pivX = 0;
    var pivY = 0;
    if (flipMode == FM_AUTO) {
        if (minXAvailable && !maxXAvailable && !minYAvailable && !maxYAvailable) {
            flipDirection = FD_HORIZONTAL;
            pivX = minX;
            doSymmetize = true;
        }
        if (!minXAvailable && maxXAvailable && !minYAvailable && !maxYAvailable) {
            flipDirection = FD_HORIZONTAL;
            pivX = maxX;
            doSymmetize = true;
        }
        if (!minXAvailable && !maxXAvailable && minYAvailable && !maxYAvailable) {
            flipDirection = FD_VERTICAL;
            pivY = minY;
            doSymmetize = true;
        }
        if (!minXAvailable && !maxXAvailable && !minYAvailable && maxYAvailable) {
            flipDirection = FD_VERTICAL;
            pivY = maxY;
            doSymmetize = true;
        }

        if (!doSymmetize) {
            doSymmetize
            SymmetrizeShape.show();
        }
    }

    switch (flipMode) {
        case FM_AUTO:
            break;
        case FM_X_MIN:
            flipDirection = FD_HORIZONTAL;
            pivX = minX;
            doSymmetize = true;
            break;
        case FM_X_MAX:
            flipDirection = FD_HORIZONTAL;
            pivX = maxX;
            doSymmetize = true;
            break;
        case FM_Y_MIN:
            flipDirection = FD_VERTICAL;
            pivY = minY;
            doSymmetize = true;
            break;
        case FM_Y_MAX:
            flipDirection = FD_VERTICAL;
            pivY = maxY;
            doSymmetize = true;
            break;
        case FM_X_CENTER:
            flipDirection = FD_HORIZONTAL;
            pivX = docWidth / 2;
            doSymmetize = true;
            break;
        case FM_Y_CENTER:
            flipDirection = FD_VERTICAL;
            pivY = docHeight / 2;
            doSymmetize = true;
            break;
        case FM_NOP:
            doSymmetize = false;
            break;
        default:
            doSymmetize = false;
            break;
    }

    var xScale = 100;
    var yScale = 100;

    if (flipDirection == FD_HORIZONTAL) {
        xScale = -100;
    }

    if (flipDirection == FD_VERTICAL) {
        yScale = -100;
    }

    if (doSymmetize) {
        // ピボット指定して反転処理
        var idTrnf = charIDToTypeID("Trnf");
        var desc1148 = new ActionDescriptor();
        var idnull = charIDToTypeID("null");
        var ref300 = new ActionReference();
        var idPath = charIDToTypeID("Path");
        var idOrdn = charIDToTypeID("Ordn");
        var idTrgt = charIDToTypeID("Trgt");
        ref300.putEnumerated(idPath, idOrdn, idTrgt);
        desc1148.putReference(idnull, ref300);
        var idFTcs = charIDToTypeID("FTcs");
        var idQCSt = charIDToTypeID("QCSt");
        var idQcsi = charIDToTypeID("Qcsi");
        desc1148.putEnumerated(idFTcs, idQCSt, idQcsi);
        var idPstn = charIDToTypeID("Pstn");
        var desc1149 = new ActionDescriptor();
        var idHrzn = charIDToTypeID("Hrzn");
        var idPxl = charIDToTypeID("#Pxl");
        desc1149.putUnitDouble(idHrzn, idPxl, pivX);
        var idVrtc = charIDToTypeID("Vrtc");
        var idPxl = charIDToTypeID("#Pxl");
        desc1149.putUnitDouble(idVrtc, idPxl, pivY);
        var idPnt = charIDToTypeID("Pnt ");
        desc1148.putObject(idPstn, idPnt, desc1149);
        var idOfst = charIDToTypeID("Ofst");
        var desc1150 = new ActionDescriptor();
        var idHrzn = charIDToTypeID("Hrzn");
        var idPxl = charIDToTypeID("#Pxl");
        desc1150.putUnitDouble(idHrzn, idPxl, 0.0);
        var idVrtc = charIDToTypeID("Vrtc");
        var idPxl = charIDToTypeID("#Pxl");
        desc1150.putUnitDouble(idVrtc, idPxl, 0.0);
        var idOfst = charIDToTypeID("Ofst");
        desc1148.putObject(idOfst, idOfst, desc1150);
        var idWdth = charIDToTypeID("Wdth");
        var idPrc = charIDToTypeID("#Prc");
        desc1148.putUnitDouble(idWdth, idPrc, xScale);
        var idHght = charIDToTypeID("Hght");
        var idPrc = charIDToTypeID("#Prc");
        desc1148.putUnitDouble(idHght, idPrc, yScale);
        executeAction(idTrnf, desc1148, DialogModes.NO);
    }

    // 処理が行われなかった場合はシェイプの複製前まで復帰する
    if (!doSymmetize) {
        var myHistory = app.activeDocument.historyStates[recoveryPointName];
        app.activeDocument.activeHistoryState = myHistory;
    }
}
