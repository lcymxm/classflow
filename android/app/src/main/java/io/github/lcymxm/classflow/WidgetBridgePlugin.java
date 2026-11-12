package io.github.lcymxm.classflow;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void sync(PluginCall call) {
        String payload = call.getString("payload");
        if (payload == null) {
            call.reject("Missing widget payload");
            return;
        }
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(
            ClassFlowWidgetProvider.PREFS_NAME,
            Context.MODE_PRIVATE
        );
        prefs.edit()
            .putString(ClassFlowWidgetProvider.KEY_PAYLOAD, payload)
            .putLong(ClassFlowWidgetProvider.KEY_UPDATED, System.currentTimeMillis())
            .apply();
        ClassFlowWidgetProvider.updateAll(context);
        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }
}
