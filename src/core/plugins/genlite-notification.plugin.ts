export class GenLiteNotificationPlugin {
    static pluginName = 'GenLiteNotificationPlugin';

    static defaultIcon = 'https://www.google.com/s2/favicons?sz=64&domain=genfanad.com';

    async init() {
        await this.askPermission();
    }

    handlePluginState(state: boolean): void {
        // TODO: Implement
    }

    /** Should always be awaited before you use notifications. */
    askPermission() {
        return this.hasPermission();
    }

    /**
     * Displays a browser notification if permissions are granted for doing so.
     * @param title - Title of the notification
     * @param text - Notification message text
     * @param icon - Optional parameter, e.g a link to a picture or icon to use for this notification display
     */
    notify(title, text, icon) {
        if (!icon) {
            icon = GenLiteNotificationPlugin.defaultIcon;
        }

        this.hasPermission().then(function (result) {
            if (result === true) {
                let popup = new window.Notification(title, { body: text, icon: icon });
                popup.onclick = function () {
                    window.focus();
                }
            }
        });
    }

    hasPermission() {
        return new Promise(function (resolve) {
            if ('Notification' in window) {
                if (window.Notification.permission === 'granted') {
                    resolve(true);
                } else {
                    window.Notification.requestPermission().then(function (permission) {
                        if (permission === 'granted') {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                }
            } else {
                resolve(true);
            }
        });
    }
}
