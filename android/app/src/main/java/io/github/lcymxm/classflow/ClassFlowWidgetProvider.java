package io.github.lcymxm.classflow;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class ClassFlowWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "classflow_widget";
    public static final String KEY_PAYLOAD = "payload";
    public static final String KEY_UPDATED = "updated";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        updateAll(context);
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, ClassFlowWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.classflow_widget);
        String dateText = "打开课序同步今日课表";
        String body = "打开课序后，小组件会自动显示今天的课程。";
        String hint = "课序 · 一学期，排得明明白白";
        String title = "课序 · 今日";

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String payload = prefs.getString(KEY_PAYLOAD, "");

        try {
            if (!payload.isEmpty()) {
                JSONObject root = new JSONObject(payload);
                String current = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
                JSONObject day = findDay(root.optJSONArray("days"), current);
                if (day != null) {
                    String label = day.optString("label", "今天");
                    int week = day.optInt("week", 0);
                    dateText = label + (week > 0 ? " · 第 " + week + " 周" : "");
                    String timetableName = root.optString("timetableName", "我的课表");
                    String termState = day.optString("termState", "during");
                    String holiday = day.optString("holiday", "");
                    JSONArray classes = day.optJSONArray("classes");
                    JSONArray events = day.optJSONArray("events");
                    String classBody = "";

                    if ("before".equals(termState)) {
                        classBody = "学期尚未开始。\n打开课序查看完整课表。";
                    } else if ("after".equals(termState)) {
                        classBody = "学期已经结束。\n打开课序查看完整课表。";
                    } else if (!holiday.isEmpty()) {
                        classBody = "今天放假 · " + holiday + "\n课程已自动隐藏。";
                    } else if (classes == null || classes.length() == 0) {
                        classBody = "今天没有课，给自己留一点空白。";
                    } else {
                        StringBuilder builder = new StringBuilder();
                        int limit = Math.min(classes.length(), 3);
                        for (int index = 0; index < limit; index += 1) {
                            JSONObject item = classes.optJSONObject(index);
                            if (item == null) continue;
                            if (builder.length() > 0) builder.append("\n");
                            builder.append(item.optString("start")).append("  ").append(item.optString("name"));
                            String location = item.optString("location", "");
                            if (!location.isEmpty()) builder.append(" · ").append(location);
                        }
                        if (classes.length() > limit) {
                            builder.append("\n…还有 ").append(classes.length() - limit).append(" 节课");
                        }
                        classBody = builder.toString();
                    }

                    if (events != null && events.length() > 0) {
                        boolean showEvent = classes == null || classes.length() == 0 || !holiday.isEmpty();
                        if (showEvent) {
                            JSONObject event = events.optJSONObject(0);
                            if (event != null) {
                                classBody += "\n日程 · " + event.optString("title");
                            }
                        }
                    }

                    body = classBody;
                    hint = timetableName + (week > 0 ? " · 第 " + week + " 周" : "") + " · 打开课序查看完整课表";
                }
            }
        } catch (Exception ignored) {
            body = "课表同步失败。\n打开课序后再试一次。";
            hint = "课序 · 打开应用更新小组件";
        }

        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_date, dateText);
        views.setTextViewText(R.id.widget_body, body);
        views.setTextViewText(R.id.widget_hint, hint);

        Intent launchIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        manager.updateAppWidget(appWidgetId, views);
    }

    private static JSONObject findDay(JSONArray days, String current) {
        if (days == null) return null;
        for (int index = 0; index < days.length(); index += 1) {
            JSONObject day = days.optJSONObject(index);
            if (day != null && current.equals(day.optString("date"))) return day;
        }
        return null;
    }
}
