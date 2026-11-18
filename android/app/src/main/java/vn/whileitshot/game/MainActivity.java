package vn.whileitshot.game;

import android.content.res.Configuration;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    if (Build.VERSION.SDK_INT >= 28) {
      getWindow().getAttributes().layoutInDisplayCutoutMode =
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
    }
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    hideBars();
    // Real cutout insets -> CSS variables (env(safe-area-inset-*) is unreliable in WebView).
    View decor = getWindow().getDecorView();
    decor.setOnApplyWindowInsetsListener((v, insets) -> {
      injectCutout(insets);
      return v.onApplyWindowInsets(insets);
    });
  }

  private void hideBars() {
    WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
    c.hide(WindowInsetsCompat.Type.systemBars());
    c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
  }

  private void injectCutout(WindowInsets insets) {
    if (getBridge() == null || getBridge().getWebView() == null) return;
    float d = getResources().getDisplayMetrics().density;
    int l = 0, r = 0, t = 0, b = 0;
    if (Build.VERSION.SDK_INT >= 28) {
      DisplayCutout cut = insets.getDisplayCutout();
      if (cut != null) {
        l = cut.getSafeInsetLeft(); r = cut.getSafeInsetRight();
        t = cut.getSafeInsetTop(); b = cut.getSafeInsetBottom();
      }
    }
    final String js = String.format(Locale.US,
        "(function(s){s.setProperty('--cut-l','%.1fpx');s.setProperty('--cut-r','%.1fpx');"
            + "s.setProperty('--cut-t','%.1fpx');s.setProperty('--cut-b','%.1fpx');})(document.documentElement.style)",
        l / d, r / d, t / d, b / d);
    getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) hideBars();
  }

  @Override
  public void onResume() {
    super.onResume();
    hideBars();
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    View decor = getWindow().getDecorView();
    decor.requestApplyInsets();
  }
}
