# Keep Capacitor bridge classes
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keep @androidx.annotation.Keep class *
-keepclassmembers class * { @androidx.annotation.Keep *; }
-keep class dev.gitswipe.mobile.** { *; }
