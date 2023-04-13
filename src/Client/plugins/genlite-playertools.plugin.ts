/*
    Copyright (C) 2022-2023 KKonaOG
*/
/*
    This file is part of GenLite.
    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/

// Import GenLite Plugin Interface
import { GenLitePlugin } from '../core/interfaces/plugin.class';
import { Text } from 'troika-three-text';

// Create PlayerTools Plugin Class
export class GenLitePlayerToolsPlugin extends GenLitePlugin {
    static pluginName = 'GenLitePlayerToolsPlugin';

    // Plugin Settings
    isPluginEnabled: boolean = false;
    
    // Plugin Data
    PlayerCanvasText = {};


    pluginSettings: Settings = {
        // Checkbox Example
        "Hide Character": {
            type: 'checkbox',
            oldKey: 'GenLite.PlayerTools.HidePlayer',
            value: this.isPluginEnabled,
            stateHandler: this.handleHidePlayerSettingChange.bind(this)
        }
    };


    // Hooked Functions


    // Plugin Hooks
    async init() {
        document.genlite.registerPlugin(this);
    }

    async postInit() {
        this.pluginSettings = document.genlite.ui.registerPlugin("Player Tools", null, this.handlePluginState.bind(this), this.pluginSettings);
    }

    Character_update(e: any, t: any, character: any): void {
        if (!this.isPluginEnabled) {
            return;
        }

        if (character == document.game.GAME.me.character) {
            return;
        }

        if (!this.PlayerCanvasText[character.id]) {
            this.PlayerCanvasText[character.id] = new Text();
            this.PlayerCanvasText[character.id].text = character.name();
            this.PlayerCanvasText[character.id].color = "#FFFFFF";
            this.PlayerCanvasText[character.id].fontSize = 0.15;
            this.PlayerCanvasText[character.id].anchorX = "center";
            this.PlayerCanvasText[character.id].anchorY = "bottom";
            this.PlayerCanvasText[character.id].font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";

            // Apply a slight outline to the text
            this.PlayerCanvasText[character.id].outlineColor = "#000000";
            this.PlayerCanvasText[character.id].outlineWidth = 0.010;
            this.PlayerCanvasText[character.id].outlineBlur = 0.005;

            this.PlayerCanvasText[character.id].visible = this.isPluginEnabled;
    
            document.game.GRAPHICS.scene.threeScene.add(this.PlayerCanvasText[character.id]);

            this.PlayerCanvasText[character.id].sync(() => {
                this.PlayerCanvasText[character.id].renderOrder = 10002;
                this.PlayerCanvasText[character.id].material[0].depthTest = false;
                this.PlayerCanvasText[character.id].material[0].depthWrite = false;
                this.PlayerCanvasText[character.id].material[1].depthTest = false;
                this.PlayerCanvasText[character.id].material[1].depthWrite = false;
            });
        }

        // Update Player Text Position
        this.PlayerCanvasText[character.id].position.x = character.worldPos.x;
        this.PlayerCanvasText[character.id].position.y = character.worldPos.y + character.height;
        this.PlayerCanvasText[character.id].position.z = character.worldPos.z;

        // Update Player Text Scale
        let scale = 1 / (document.game.GRAPHICS.camera.camera.zoom * 0.5);

        scale *= (1 + this.PlayerCanvasText[character.id].position.distanceTo(document.game.GRAPHICS.camera.camera.position) / 100);

        this.PlayerCanvasText[character.id].scale.set(scale, scale, scale);


        // Quaternion should be the same as camera
        this.PlayerCanvasText[character.id].quaternion.copy(document.game.GRAPHICS.camera.camera.quaternion);

    }


    Game_deletePlayer(playerID: string, playerData: Object) {
        if (!this.PlayerCanvasText[playerID]) {
            return;
        }

        document.game.GRAPHICS.scene.threeScene.remove(this.PlayerCanvasText[playerID]);
        delete this.PlayerCanvasText[playerID];
    }


    handlePluginState(state: boolean): void {
        this.isPluginEnabled = state;

        for (let playerID in this.PlayerCanvasText) {
            this.PlayerCanvasText[playerID].visible = state;
        }
    }

    handleHidePlayerSettingChange(state: boolean) {
    }

}
