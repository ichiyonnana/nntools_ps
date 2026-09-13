#target photoshop
// 最上位にあるレイヤーグループの表示・非表示を切り替える

if (app.documents.length === 0) {
    // ドキュメントが開かれていない場合は何もしない

} else {
    var doc = app.activeDocument;
    var topGroup = null;

    // 最上位のレイヤーグループを探す
    for (var i = 0; i < doc.layerSets.length; i++) {
        var group = doc.layerSets[i];
        if (group.parent === doc) {
            topGroup = group;
            break;
        }
    }

    // 見つかった場合、表示・非表示を切り替える
    // 見つからない場合も何もしない
    if (topGroup) {
        topGroup.visible = !topGroup.visible;
    }
}