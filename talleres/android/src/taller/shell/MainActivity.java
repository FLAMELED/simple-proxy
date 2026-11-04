package taller.shell;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Contenedor de la app. Muestra la interfaz (assets/www) en un WebView con un
 * origen https fijo para que IndexedDB guarde los datos en el teléfono y los
 * conserve entre actualizaciones. No carga nada de internet.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/index.html";
    static final int REQ_FILE = 11;
    static final int REQ_SAVE = 12;

    WebView web;
    ValueCallback<Uri[]> fileCallback;
    Uri cameraUri;
    final Map<String, File> pendingFiles = new HashMap<>();
    String savingId;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            ApplicationInfo ai = getPackageManager().getApplicationInfo(getPackageName(), PackageManager.GET_META_DATA);
            String color = ai.metaData != null ? ai.metaData.getString("statusBarColor") : null;
            if (color != null) getWindow().setStatusBarColor(Color.parseColor(color));
        } catch (Exception ignored) { }

        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "Android");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) {
                    // Sin conexión a internet desde la interfaz: todo viene del APK.
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
                }
                String path = u.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                try {
                    InputStream in = getAssets().open("www" + path);
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-cache");
                    return new WebResourceResponse(mime(path), "utf-8", 200, "OK", headers, in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
                }
            }

            // API 24+ (el android.jar de compilación es 23, por eso no lleva @Override).
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return external(req.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return external(Uri.parse(url));
            }

            boolean external(Uri u) {
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                String[] types = params.getAcceptTypes();
                boolean images = types != null && types.length > 0 && types[0] != null && types[0].startsWith("image");
                if (images && params.isCaptureEnabled() && openCamera()) return true;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType(images ? "image/*" : "*/*");
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(pick, images ? "Elegir foto" : "Elegir archivo"), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null); fileCallback = null; return false;
                }
                return true;
            }
        });

        if (state != null) web.restoreState(state);
        else web.loadUrl(START);
    }

    boolean openCamera() {
        try {
            File dir = new File(getCacheDir(), "camara");
            dir.mkdirs();
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) f.delete();
            String name = "foto-" + System.currentTimeMillis() + ".jpg";
            cameraUri = Uri.parse("content://" + getPackageName() + ".fotos/" + name);
            Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            cam.setClipData(ClipData.newRawUri("", cameraUri));
            cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(cam, REQ_FILE);
            return true;
        } catch (Exception e) {
            cameraUri = null;
            return false;
        }
    }

    static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg")) return "image/jpeg";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FILE) {
            Uri[] result = null;
            if (res == RESULT_OK) {
                if (cameraUri != null) {
                    File f = new File(new File(getCacheDir(), "camara"), cameraUri.getLastPathSegment());
                    if (f.exists() && f.length() > 0) result = new Uri[]{cameraUri};
                } else if (data != null) {
                    ClipData clip = data.getClipData();
                    if (clip != null) {
                        result = new Uri[clip.getItemCount()];
                        for (int i = 0; i < clip.getItemCount(); i++) result[i] = clip.getItemAt(i).getUri();
                    } else if (data.getData() != null) result = new Uri[]{data.getData()};
                }
            }
            cameraUri = null;
            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
        } else if (req == REQ_SAVE) {
            String id = savingId; savingId = null;
            File tmp = pendingFiles.remove(id);
            if (res != RESULT_OK || data == null || data.getData() == null) { done(id, true, "cancelled"); if (tmp != null) tmp.delete(); return; }
            try (InputStream in = new java.io.FileInputStream(tmp); OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                byte[] buf = new byte[65536]; int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                done(id, true, "saved");
            } catch (Exception e) {
                done(id, false, "No se pudo escribir el archivo: " + e.getMessage());
            } finally { if (tmp != null) tmp.delete(); }
        } else super.onActivityResult(req, res, data);
    }

    void done(final String id, final boolean ok, final String msg) {
        final String js = "window.__nativeDone(" + q(id) + "," + ok + "," + q(msg) + ")";
        runOnUiThread(new Runnable() { public void run() { web.evaluateJavascript(js, null); } });
    }

    static String q(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ") + "\"";
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    /** Funciones que la interfaz puede llamar como window.Android.* */
    class Bridge {
        @JavascriptInterface
        public void beginFile(String id) {
            try {
                File f = File.createTempFile("salida", ".tmp", getCacheDir());
                synchronized (pendingFiles) { pendingFiles.put(id, f); }
            } catch (IOException e) { done(id, false, "No hay espacio para preparar el archivo."); }
        }

        @JavascriptInterface
        public void appendFile(String id, String base64) {
            File f; synchronized (pendingFiles) { f = pendingFiles.get(id); }
            if (f == null) return;
            try (FileOutputStream out = new FileOutputStream(f, true)) {
                out.write(Base64.decode(base64, Base64.DEFAULT));
            } catch (IOException e) { done(id, false, "No hay espacio para preparar el archivo."); }
        }

        @JavascriptInterface
        public void finishFile(final String id, final String name, final String mime) {
            runOnUiThread(new Runnable() {
                public void run() {
                    savingId = id;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType(mime);
                    i.putExtra(Intent.EXTRA_TITLE, name);
                    try { startActivityForResult(i, REQ_SAVE); }
                    catch (ActivityNotFoundException e) { done(id, false, "Este teléfono no tiene dónde guardar archivos."); }
                }
            });
        }

        @JavascriptInterface
        public void print(final String title) {
            runOnUiThread(new Runnable() {
                public void run() {
                    PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                    String job = title == null || title.isEmpty() ? "Documento" : title;
                    PrintDocumentAdapter adapter = web.createPrintDocumentAdapter(job);
                    pm.print(job, adapter, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                }
            });
        }

        @JavascriptInterface
        public String version() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
            catch (Exception e) { return ""; }
        }
    }
}
