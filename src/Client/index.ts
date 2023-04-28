/*
    Copyright (C) 2023 Xortrox, Retoxified, dpeGit, snwhd, KKonaOG
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/
/** Core Features */
import { GenLite } from "./core/genlite.class";
import { GenLiteNotificationPlugin } from "./core/plugins/genlite-notification.plugin";
import { GenLiteSettingsPlugin } from "./core/plugins/genlite-settings.plugin";
import { GenLiteCommandsPlugin } from "./core/plugins/genlite-commands.plugin";
import { GenLiteConfirmation } from "./core/helpers/genlite-confirmation.class";
import { GenLiteDatabasePlugin } from "./core/plugins/genlite-database.plugin";

/** Official Plugins */
import { GenLiteCameraPlugin } from "./plugins/genlite-camera.plugin";
import { GenLiteChatPlugin } from "./plugins/genlite-chat.plugin";
import { GenLiteDropRecorderPlugin } from "./plugins/genlite-drop-recorder.plugin";
import { GenLiteInventoryPlugin } from "./plugins/genlite-inventory.plugin";
import { GenLiteItemHighlightPlugin } from "./plugins/genlite-item-highlight.plugin";
import { GenLiteNPCHighlightPlugin } from "./plugins/genlite-npc-highlight.plugin";
import { GenLiteRecipeRecorderPlugin } from "./plugins/genlite-recipe-recorder.plugin";
import { GenLiteWikiDataCollectionPlugin } from "./plugins/genlite-wiki-data-collection.plugin";
import { GenLiteXpCalculator } from "./plugins/genlite-xp-calculator.plugin";
import { GenLiteHitRecorder } from "./plugins/genlite-hit-recorder.plugin";
import { GenLiteMenuScaler } from "./plugins/genlite-menu-scaler.plugin";
import { GenLiteMusicPlugin } from "./plugins/genlite-music.plugin";
import { GenLiteLocationsPlugin } from "./plugins/genlite-locations.plugin";
import { GenLiteItemTooltips } from "./plugins/genlite-item-tooltips.plugin";
import { GenLiteSoundNotification } from "./plugins/genlite-sound-notification/genlite-sound-notification.plugin";
import { GenLiteGeneralChatCommands } from "./plugins/genlite-generalchatcommand.plugin";
import { GenLiteUIPlugin } from "./core/plugins/genlite-ui-plugin";
import { GenLitePlayerToolsPlugin } from "./plugins/genlite-playertools.plugin";
import { GenLiteHighscores } from "./plugins/genlite-highscores.plugin";
import { GenLiteItemDisplays } from "./plugins/genlite-itemdisplay.plugin";
import { GenLiteFPSCounter } from "./plugins/genlite-fps.plugin";
import { GenLiteEnhancedContextMenu } from "./plugins/genlite-enhanced-context-menu.plugin";
import { GenLiteQuestPlugin } from "./plugins/genlite-quest.plugin";
import { GenLiteEnhancedBanking } from "./plugins/genlite-enhanced-banking.plugin";
import { GenLiteTaggingPlugin } from "./plugins/genlite-tagging.plugin";
import { GenliteSimplifiedChatUiPlugin } from './plugins/genlite-simplified-chat-ui.plugin';

// TODO: use globals.ts?
declare global {
    interface Document {
        game: any;
        client: any;
        genlite: {
            [key: string]: any,
            settings: GenLiteSettingsPlugin,
        };
        initGenLite: () => void;
    }
}

const DISCLAIMER = [
    "GenLite is NOT associated with Rose-Tinted Games.",
    "DO NOT talk about GenLite in the Genfanad Discord.",
    "DO NOT report bugs to Genfanad with GenLite enabled. They will ignore you and get annoyed.",
    "DO disable GenLite first and test for the bug again.",
    "If you find a bug and are unsure, post in the GenLite Discord. We will help you.",
    "While we work to ensure compatibility, Use At Your Own Risk.",
];

let isInitialized = false;

/* GenLite Startup order with the format FILENAME: functName() followed by a description of what its doing, when, and how many times 
index.ts: load()
    - entry point for everything
    - interupts genfanad client from running so we can hook in to it
    - contains firefox compatibility code
    + runs once per page load
index.ts: window.addEventListener('load'...)
    - checks for the GenLite disclaimer then calls hookStartScene()
    + runs once per page load
    index.ts: hookStartScene()
        - hooks the Original StartScene() function from genfanad client
        + runs once per page load
document.client.qS (the StartSceneFunction)
    - runs the the Genfanad's StartScene()
    - execution of further init is now blocked untill user presses the login button
-+-+-+-+-+ GENFANAD STARTED HERE -+-+-+-+-+
    - waits 100ms then run initGenLite()
    + runs every time the login button is pressed
******* Everything above this point should only be touched if modifying the GenfanadJS capture process ********

index.ts: initGenLite()
-+-+-+-+-+ GENFANAD GAME OBJECTS ASSIGNED HERE -+-+-+-+-+
    - calls initGameObjects()
    index.ts: initGameObjects()
        - assigns the minified names from the Genfanad Client to human friendly names
        + runs once every time the login button is pressed
    + will return form here if isInitialized is set to true
-+-+-+-+-+ GENLITE INIT HERE -+-+-+-+-+
    - calls addPlugins()
    index.ts: addPlugins()
        - creates a new GenLite object
        genlite.class.ts: constructor()
            - creates a new GenLitePluginLoader and assigns it to genlite.pluginLoader
            + runs once per page load
        - sets it at document.genlite
        - calls genlite.init()
-+-+-+-+-+ GENLITE HOOKS INSTALLED HERE -+-+-+-+-+
        genlite.class.ts: init()
            - installs the hooks for the various functions
            + runs once per page load
-+-+-+-+-+ GENLITE PLUGINS LOADED HERE -+-+-+-+-+
        - core plugins are loaded
        - core plugins are assined under genlite.coreName
        - standard plugins are loaded
        genlite-plugin-loader.class.ts: addPlugin(GenLitePlugin)
            - checks that plugins have the right structure
-+-+-+-+-+ PLUGIN CONSTRUCTOR CALLED HERE -+-+-+-+-+
            - creates a new instance of the class calling their constructor
-+-+-+-+-+ PLUGIN INIT CALLED HERE -+-+-+-+-+
            - calls GenLitePlugin.init()
            - sets plugin under document.pluginName
            - stores plugin instance in genlite.pluginoader.plugins
            - runs once per page load per plugin being loaded
        + runs once per page load
    - set isInitalized to true
    + runs everytime login button is pressed but only runs initGameObjects() after the first login

genlite.class.ts: hookPhased
    - at this point we are now waiting for Genfanad to finish the login process
    - when PHASED_LOADING_MANAGER reaches game_loaded we
-+-+-+-+-+ PLUGIN LOGIN OK CALLED HERE -+-+-+-+-+
    + call loginOK if we are currently logged out (at login screen due to page load, logout, or disconnect)
-+-+-+-+-+ PLUGIN INITALIZEUI CALLED HERE -+-+-+-+-+
    - if ui has not been inited yet call genlite.onUIInitialized()
    genlite.class.ts: onUIInitialized()
        - calls plugins initializeUI()
        + runs once per page load
-+-+-+-+-+ PLUGIN POST INIT CALLED HERE -+-+-+-+-+
    - if ui has not been inited yet call pluginLoader.postInit()
    genlite-plugin-loader: postInit()
        - calls postInit() on each plugin
        + runs once per page load



TLDR - general order

Page Load
Intercept Genfanad
Pre Init (currently not needed and unimplimented)
Hook StartScene()
------------ above is once per page load ------------
Wait for login button press
OriginalStartScene - every login
initGameObjects() - every login
Init GenLite Object - once per page load
Install Hooks - once per page load
Init CorePlugins - once per page load
Init StandardPlugins - once per page load
LoginOK - every login
initalizeUI() - once per page load
Post Init Plugins - once per page load

*/

(async function load() {
    async function initGenLite() {
        initGameObjects();
        if (!isInitialized)
            addPlugins();
        isInitialized = true;
        return;

    }

    function initGameObjects() {
        function gameObject(
            name: string,
            minified: string,
            parent: Object = null
        ): any {
            var o = document.client.get(minified);
            if (!o) {
                console.log(`${minified} (${name}) is not defined: ${o}`);
            }

            if (!parent) {
                parent = document.game;
            }
            parent[name] = o;
        }

        /* KEYBOARD is redefined everytime the get gets focus
    so we set a second listener with a small timeout that sets out variable just after genfanads
    this feels really fucking hacky though
*/
        function hookKeyboard() {
            window.addEventListener("focus", (e) => {
                setTimeout(() => {
                    document.game.KEYBOARD = document.client.get('ZS');
                }, 10);
            });
        }

        document.game = {};
        document.game.ITEM_RIGHTCLICK_LIMIT = 20; // TODO: Is this equivalent? It seems to no longer be included in client.js


        // Classes
        gameObject('Bank', 'tv');
        gameObject('Chat', 'rv');
        gameObject('Actor', 'Dg');
        gameObject('Animation', 'h_');
        gameObject('Camera', 'PS');
        gameObject('Character', 'A_');
        gameObject('DeduplicatingCachedLoader', 'wS');
        gameObject('FadeAnimation', 'd_');
        gameObject('FrozenEffect', 'Gg');
        gameObject('Game', 'X_');
        gameObject('Graphics', 'BS');
        gameObject('HumanCharacter', 'jg');
        gameObject('ItemStack', 'Lg');
        gameObject('MinimapRenderer', 'j_');
        gameObject('ModelProjectileAnimation', 'g_');
        gameObject('MonsterCharacter', 'Hg');
        gameObject('Network', 'ug');
        gameObject('NewSegmentLoader', 'yS');
        gameObject('OptimizedScene', 'NS');
        gameObject('PassThroughSpineTexture', 'Pg');
        gameObject('Player', 'O_');
        gameObject('Seed', 'z_');
        gameObject('Segment', 'B_');
        gameObject('ShrinkForBoatAnimation', 'p_');
        gameObject('SpriteAnimation', '__');
        gameObject('SpriteProjectileAnimation', 'f_');
        gameObject('TeleportAnimation', 'u_');
        gameObject('TemporaryScenery', 'H_');
        gameObject('WorldManager', 'LS');
        gameObject('WorldObject', 'E_');
        gameObject('Math', 'xi', document.game.THREE);
        gameObject('SFXPlayer', '$m');
        gameObject('PlayerHUD', 'Ov');
        gameObject('PlayerInfo', 'Xg');
        gameObject('Inventory', 'zv');
        gameObject('PhasedLoadingManager', 'vS');
        gameObject('Trade', 'Gv');
        gameObject('Friends', 'G_');
        gameObject('Shop', 'jv');


        // Objects
        gameObject('BANK', 'tw');
        gameObject('CHAT', 'iw');
        gameObject('DATA', 'eS');
        gameObject('FRIENDS', 'uw');
        gameObject('GAME', 'K_.game');
        gameObject('GRAPHICS', '$S.graphics');
        gameObject('INVENTORY', 'pw');
        gameObject('NETWORK', 'pg.network');
        gameObject('PHASEDLOADINGMANAGER', 'vS');
        gameObject('PLAYER', 'JS.player');
        gameObject('SFX_PLAYER', 'Jm');
        gameObject('WORLDMANAGER', 'LS');
        gameObject('MUSIC_PLAYER', 'Bv');
        gameObject('MUSIC_TRACK_NAMES', 'Nv');
        gameObject('SETTINGS', 'yw');
        gameObject('THREE', 'e');
        gameObject('PLAYER_INFO', 'gw');
        gameObject('PLAYER_HUD', 'fw');
        gameObject('NPC', 'I_');
        gameObject('TRADE', 'Tw');
        gameObject('NETWORK_CONTAINER', 'mg');
        gameObject('SHOP', 'Sw');

        /* Special Case Objects */
        /* have to do this here because keyboard is constantly redefined */
        gameObject('KEYBOARD', 'ZS');
        hookKeyboard();

        //Functions
        gameObject('returnsAnItemName', 'Mg');
        gameObject('getStaticPath', 'O');
        gameObject('toDisplayName', 'W_');
        gameObject('getSegmentStringfromObject', 'kS');

        //Constants
        gameObject('SOME_CONST_USED_FOR_BANK', 'P');


    }

    async function addPlugins() {


        const genlite = new GenLite();
        document.genlite = genlite;
        await genlite.init();

        /** Core Features */
        genlite.notifications = await genlite.pluginLoader.addPlugin(GenLiteNotificationPlugin);
        genlite.settings = await genlite.pluginLoader.addPlugin(GenLiteSettingsPlugin);
        genlite.commands = await genlite.pluginLoader.addPlugin(GenLiteCommandsPlugin);
        genlite.database = await genlite.pluginLoader.addPlugin(GenLiteDatabasePlugin);
        genlite.ui = await genlite.pluginLoader.addPlugin(GenLiteUIPlugin);



        /** Official Plugins */
        await genlite.pluginLoader.addPlugin(GenLiteCameraPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteChatPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteNPCHighlightPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteItemHighlightPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteInventoryPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteDropRecorderPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteWikiDataCollectionPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteXpCalculator);
        await genlite.pluginLoader.addPlugin(GenLiteRecipeRecorderPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteHitRecorder);
        await genlite.pluginLoader.addPlugin(GenLiteMenuScaler);
        await genlite.pluginLoader.addPlugin(GenLiteMusicPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteLocationsPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteItemTooltips);
        await genlite.pluginLoader.addPlugin(GenLiteSoundNotification);
        await genlite.pluginLoader.addPlugin(GenLiteGeneralChatCommands);
        await genlite.pluginLoader.addPlugin(GenLitePlayerToolsPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteHighscores);
        await genlite.pluginLoader.addPlugin(GenLiteItemDisplays);
        await genlite.pluginLoader.addPlugin(GenLiteFPSCounter);
        await genlite.pluginLoader.addPlugin(GenLiteEnhancedContextMenu);
        await genlite.pluginLoader.addPlugin(GenLiteQuestPlugin);
        await genlite.pluginLoader.addPlugin(GenLiteEnhancedBanking);
        await genlite.pluginLoader.addPlugin(GenLiteTaggingPlugin);
        await genlite.pluginLoader.addPlugin(GenliteSimplifiedChatUiPlugin);




        // NOTE: currently initGenlite is called after the scene has started
        //       (in minified function qS). The initializeUI function does not
        //       exist in genfanad and is inlined in qS. So at this point, UI
        //       is already initialized and we update the plugins.
        //
        //       We should eventually move genlite to init at page start, then
        //       this needs to move to the qS override at the bottom of this
        //       file.
        // NOTE 2: This is now also used to call postInit on plugins through GenLitePluginLoader
        //         The GenLiteUIPlugin.registerPlugin function requires being present in the postInit for a function
        //         as it calls various things involving settings that may not be ready until after init.
    }
    
    function hookStartScene() {

        let doc = (document as any);
        doc.client.set('document.client.originalStartScene', doc.client.get('WS'));
        doc.client.set('WS', function () {
            document.client.originalStartScene();
            setTimeout(document.initGenLite, 100);
        });
    }

    window.addEventListener('load', (e) => {

        document.initGenLite = initGenLite;

        let confirmed = localStorage.getItem("GenLiteConfirms");
        if (confirmed === "true") {
            hookStartScene();
        } else {
            GenLiteConfirmation.confirmModal(DISCLAIMER, async () => {
                // calls back only if accepted
                localStorage.setItem("GenLiteConfirms", "true");
                hookStartScene();
            });
        }
    });

    function firefoxOverride(e) {
        let src = e.target.src;
        if (src === 'https://play.genfanad.com/play/js/client.js') {
            e.preventDefault(); // do not load
            e.stopPropagation();
            var script = document.createElement('script');
            script.textContent = genfanadJS;
            script.type = 'module';
            (document.head || document.documentElement).appendChild(script);
        }
    }

    let genfanadJS = localStorage.getItem("GenFanad.Client");
    if (!genfanadJS) {
        console.error("GenFanad.Client not found in localStorage. GenLite will not work.");
    } else {
        genfanadJS = genfanadJS.replace(/window\.innerWidth/g, "document.body.clientWidth");
        genfanadJS = genfanadJS.replace(/background-image: linear-gradient\(var\(--yellow-3\), var\(--yellow-3\)\);/g, "");

        // if (document.head) {
        //     throw new Error('Head already exists - make sure to enable instant script injection');
        // }

        const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

        if (isFirefox) {
            document.addEventListener("beforescriptexecute", firefoxOverride, true);
        } else {
            new MutationObserver((_, observer) => {
                const clientjsScriptTag = document.querySelector('script[src*="client.js"]');
                if (clientjsScriptTag) {
                    clientjsScriptTag.removeAttribute('src');
                    clientjsScriptTag.textContent = genfanadJS;
                }
            }).observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    }
})();
