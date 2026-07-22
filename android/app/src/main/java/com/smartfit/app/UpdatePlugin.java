package com.smartfit.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "Update")
public class UpdatePlugin extends Plugin {

    @PluginMethod
    public void installUpdate(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null) {
            call.reject("URL is required");
            return;
        }

        new Thread(() -> {
            try {
                URL url = new URL(apkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(120000);
                conn.setInstanceFollowRedirects(true);
                conn.connect();

                // Follow redirects manually if needed
                int status = conn.getResponseCode();
                if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
                    status == HttpURLConnection.HTTP_MOVED_PERM ||
                    status == 307 || status == 308) {
                    String newUrl = conn.getHeaderField("Location");
                    conn.disconnect();
                    conn = (HttpURLConnection) new URL(newUrl).openConnection();
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(120000);
                    conn.connect();
                }

                int contentLength = conn.getContentLength();

                PackageInstaller packageInstaller =
                    getContext().getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                    PackageInstaller.SessionParams.MODE_FULL_INSTALL
                );
                if (contentLength > 0) params.setSize(contentLength);

                int sessionId = packageInstaller.createSession(params);
                PackageInstaller.Session session = packageInstaller.openSession(sessionId);

                try (InputStream is = conn.getInputStream();
                     OutputStream os = session.openWrite("package", 0, contentLength)) {
                    byte[] buffer = new byte[65536];
                    int read;
                    while ((read = is.read(buffer)) != -1) {
                        os.write(buffer, 0, read);
                    }
                    session.fsync(os);
                }

                Intent intent = new Intent(getContext(), MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    getContext(), 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
                );

                session.commit(pendingIntent.getIntentSender());
                session.close();

                JSObject result = new JSObject();
                result.put("status", "installing");
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Update failed: " + e.getMessage());
            }
        }).start();
    }
}
