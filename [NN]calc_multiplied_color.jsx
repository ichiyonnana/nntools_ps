#target photoshop
// メインカラーとサブカラーから乗算食の色を計算して描画色に設定するスクリプト

// 明るい色と暗い色の判定
var fore_brightness = app.foregroundColor.hsb.brightness;
var back_brightness = app.backgroundColor.hsb.brightness;

var light_color;
var dark_color;

if (fore_brightness > back_brightness) {
    light_color = app.foregroundColor.rgb;
    dark_color = app.backgroundColor.rgb;

} else {
    light_color = app.backgroundColor.rgb;
    dark_color = app.foregroundColor.rgb;
}

// 乗算色の計算
var mul_color = new SolidColor();
mul_color.model = ColorModel.RGB;
mul_color.rgb.red = Math.min(1.0, dark_color.red / light_color.red) * 255;
mul_color.rgb.green = Math.min(1.0, dark_color.green / light_color.green) * 255;
mul_color.rgb.blue = Math.min(1.0, dark_color.blue / light_color.blue) * 255;

// 描画色に設定
app.foregroundColor = mul_color;