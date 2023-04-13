/*
    Copyright (C) 2022-2023 Retoxified, dpeGit
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/

import { GenLitePlugin } from '../core/interfaces/plugin.class';
import { Text } from 'troika-three-text';

export class GenLiteNPCHighlightPlugin extends GenLitePlugin {
    static pluginName = 'GenLiteNPCHighlightPlugin';
    static healthListVersion = "3";

    pluginSettings: Settings = {
        "Invert Hiding": {
            type: "checkbox",
            oldKey: "GenLite.NpcHideInvert.Enable",
            value: true,
            stateHandler: this.handleHideInvertEnableDisable.bind(this)
        },
    };

    isPluginEnabled: boolean = true;
    hideTagMode = false;
    lastQuat: any = null
    lastZoom: any = null

    NPCCanvasText = {};
    async init() {
        document.genlite.registerPlugin(this);
    }

    async postInit() {
        document.genlite.ui.registerPlugin("NPC Highlights", "GenLite.NpcHighlight.Enable", this.handlePluginState.bind(this), this.pluginSettings);

        window.addEventListener('keydown', this.keyDownHandler.bind(this));
        window.addEventListener('keyup', this.keyUpHandler.bind(this));
    }

    keyDownHandler(e: KeyboardEvent): void {
        if (e.key == "Alt" && e.repeat == false) {
            e.preventDefault();
            this.hideTagMode = true;
            console.log("Hiding Tags Enabled")
        }
    }

    keyUpHandler(e: KeyboardEvent): void {
        if (e.key === "Alt") {
            this.hideTagMode = false;
            console.log("Hiding Tags Disabled")
        }
    }

    handlePluginState(state: boolean): void {
        this.isPluginEnabled = state;

        for (const key in this.NPCCanvasText) {
            this.NPCCanvasText[key].name.visible = state;
        }
    }


    Game_deleteNPC(e: any, t: any): void {
        if (this.NPCCanvasText[e] && this.NPCCanvasText[e].name) {
            document.game.GRAPHICS.scene.threeScene.remove(this.NPCCanvasText[e].name);
            if (this.NPCCanvasText[e].attackText) {
                document.game.GRAPHICS.scene.threeScene.remove(this.NPCCanvasText[e].attackText);
            }

            // Dispose of the canvas text
            this.NPCCanvasText[e].name.dispose();
            if (this.NPCCanvasText[e].attackText) {
                this.NPCCanvasText[e].attackText.dispose();
            }

            // Remove the canvas text from the list
            delete this.NPCCanvasText[e];
        }
    }


    NPC_update(camera: any, dt: any, npc: any): void {
        if (!this.isPluginEnabled) return;
        if (this.NPCCanvasText[npc.id]) {
            // Update Player Text Position
            this.NPCCanvasText[npc.id].name.position.x = npc.worldPos.x;
            if (npc.info.attackText) {
                this.NPCCanvasText[npc.id].name.position.y = npc.worldPos.y + npc.height*2
                this.NPCCanvasText[npc.id].attackText.position.y -= npc.height;
            } else {
                this.NPCCanvasText[npc.id].name.position.y = npc.worldPos.y + npc.height;
            }
            this.NPCCanvasText[npc.id].name.position.y = npc.worldPos.y + npc.height;
            this.NPCCanvasText[npc.id].name.position.z = npc.worldPos.z;

            // Update Player Text Scale
            let scale = 1 / (camera.zoom * 0.5);

            scale *= (1 + this.NPCCanvasText[npc.id].name.position.distanceTo(camera.position) / 100);

            this.NPCCanvasText[npc.id].name.scale.set(scale, scale, scale);


            // Quaternion should be the same as camera
            this.NPCCanvasText[npc.id].name.quaternion.copy(document.game.GRAPHICS.camera.camera.quaternion);
        } else {
            // Create
            console.log("Creating NPC Canvas Text: " + npc.id);
            this.NPCCanvasText[npc.id] = {};
            this.NPCCanvasText[npc.id].name = new Text();

            this.NPCCanvasText[npc.id].name.text = npc.info.name;
            this.NPCCanvasText[npc.id].name.color = "#FFFF00";
            this.NPCCanvasText[npc.id].name.fontSize = 0.15;
            this.NPCCanvasText[npc.id].name.anchorX = "center";
            this.NPCCanvasText[npc.id].name.anchorY = "bottom";
            this.NPCCanvasText[npc.id].name.font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";

            document.game.GRAPHICS.scene.threeScene.add(this.NPCCanvasText[npc.id].name);

            this.NPCCanvasText[npc.id].name.position.y += npc.height;
            this.NPCCanvasText[npc.id].name.visible = this.isPluginEnabled;

            // Apply a slight outline to the text
            this.NPCCanvasText[npc.id].name.outlineColor = "#000000";
            this.NPCCanvasText[npc.id].name.outlineWidth = 0.010;
            this.NPCCanvasText[npc.id].name.outlineBlur = 0.005;

            this.NPCCanvasText[npc.id].name.sync(() => {
                this.NPCCanvasText[npc.id].name.renderOrder = 10001;
                this.NPCCanvasText[npc.id].name.material[0].depthTest = false;
                this.NPCCanvasText[npc.id].name.material[0].depthWrite = false;
                this.NPCCanvasText[npc.id].name.material[1].depthTest = false;
                this.NPCCanvasText[npc.id].name.material[1].depthWrite = false;

                if (npc.info.attackable) {
                    this.NPCCanvasText[npc.id].name.position.y += npc.height;


                    let playerLevel = document.game.PLAYER.character.combatLevel;

                    let levelDiff = npc.info.level - playerLevel
                    let color = "#4C4E52";

                    if (levelDiff > 3 && levelDiff < 6) {
                        color = "#f80"
                    } else if (levelDiff >= 6) {
                        color = "#f00";
                    } else if (levelDiff < -3 && levelDiff > -6) {
                        color = "#8f0";
                    } else if (levelDiff <= -6) {
                        color = "#4C4E52";
                    }

                    // It should be the Name (Level X)
                    this.NPCCanvasText[npc.id].attackText = new Text();
                    this.NPCCanvasText[npc.id].attackText.text = " (Level " + npc.info.level + ")";
                    this.NPCCanvasText[npc.id].attackText.color = color;
                    this.NPCCanvasText[npc.id].attackText.font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";
                    this.NPCCanvasText[npc.id].attackText.fontSize = 0.10;
                    this.NPCCanvasText[npc.id].attackText.anchorX = "center";
                    this.NPCCanvasText[npc.id].attackText.anchorY = "top";
                    this.NPCCanvasText[npc.id].attackText.renderOrder = 10001;
                    this.NPCCanvasText[npc.id].attackText.material.depthTest = false;
                    this.NPCCanvasText[npc.id].attackText.material.depthWrite = false;
                    this.NPCCanvasText[npc.id].attackText.visible = this.isPluginEnabled;
                    this.NPCCanvasText[npc.id].name.add(this.NPCCanvasText[npc.id].attackText);

                    // Apply a slight outline to the text
                    this.NPCCanvasText[npc.id].attackText.outlineColor = "#000000";
                    this.NPCCanvasText[npc.id].attackText.outlineWidth = 0.010;
                    this.NPCCanvasText[npc.id].attackText.outlineBlur = 0.005;

                    this.NPCCanvasText[npc.id].attackText.sync(() => {
                        this.NPCCanvasText[npc.id].attackText.renderOrder = 10001;
                        this.NPCCanvasText[npc.id].attackText.material[0].depthTest = false;
                        this.NPCCanvasText[npc.id].attackText.material[0].depthWrite = false;
                        this.NPCCanvasText[npc.id].attackText.material[1].depthTest = false;
                        this.NPCCanvasText[npc.id].attackText.material[1].depthWrite = false;
                    });
                }

                this.NPCCanvasText[npc.id].name.sync(() => {
                    if (this.NPCCanvasText[npc.id].attackText) {
                        this.NPCCanvasText[npc.id].attackText.position.y -= npc.height;
                    }
                });
            });
        }
    }


    Game_combatUpdate(update: any): void {
    }

    handleHideInvertEnableDisable(state: boolean) {
        // // always clear the current list of npcs
        // this.npc_highlight_div.innerHTML = '';
        // this.trackedNpcs = {};

        // this.hideInvert = state;
    }

    loginOK() {
    }
}