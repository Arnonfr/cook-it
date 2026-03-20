package com.cookit.app.plugin;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.cookit.app.MainActivity;

@CapacitorPlugin(name = "DeepLink")
public class DeepLinkPlugin extends Plugin {

    @PluginMethod
    public void getPendingUrl(PluginCall call) {
        String url = MainActivity.getPendingUrl();
        JSObject ret = new JSObject();
        ret.put("url", url);
        call.resolve(ret);
    }
}
