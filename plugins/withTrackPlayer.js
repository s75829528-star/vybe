const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Configures the Android manifest for background audio playback.
 *
 * React Native Track Player's own library manifest already declares its
 * MusicService. This plugin adds the runtime permissions modern Android needs
 * for a media foreground service and a visible playback notification, and makes
 * the service contract explicit so a library upgrade cannot silently drop it.
 */
function withTrackPlayer(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];

    const requiredPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ];

    for (const name of requiredPermissions) {
      if (!permissions.some((permission) => permission.$?.['android:name'] === name)) {
        permissions.push({ $: { 'android:name': name } });
      }
    }
    manifest['uses-permission'] = permissions;

    const application = manifest.application?.[0];
    if (!application) {
      return config;
    }

    const services = application.service ?? [];
    const serviceName = 'com.doublesymmetry.trackplayer.service.MusicService';
    const existing = services.find((service) => service.$?.['android:name'] === serviceName);

    const serviceAttributes = {
      'android:name': serviceName,
      'android:enabled': 'true',
      'android:exported': 'true',
      'android:foregroundServiceType': 'mediaPlayback',
    };

    if (existing) {
      existing.$ = { ...existing.$, ...serviceAttributes };
    } else {
      services.push({
        $: serviceAttributes,
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MEDIA_BUTTON' } }],
          },
        ],
      });
    }

    application.service = services;
    return config;
  });
}

module.exports = withTrackPlayer;
