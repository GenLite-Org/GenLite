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
import { ThisExpression } from 'estree';

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
            this.NPCCanvasText[key].name.sync();
            if (this.NPCCanvasText[key].attackText) {
                this.NPCCanvasText[key].attackText.visible = state;
                this.NPCCanvasText[key].attackText.sync();
            }
        }
    }

    updateNPCTagRotations(): void {
        for (const key in this.NPCCanvasText) {
            this.NPCCanvasText[key].name.quaternion.copy(document.game.GRAPHICS.camera.camera.quaternion);
        }
    }

    Camera_update() {
        if (!this.isPluginEnabled) {
            return;
        }

        if (this.lastQuat == null) {
            this.lastQuat = document.game.GRAPHICS.camera.camera.quaternion.clone();
        }

        if (this.lastZoom == null) {
            this.lastZoom = document.game.GRAPHICS.camera.camera.zoom;
        }

        if (this.lastQuat.equals(document.game.GRAPHICS.camera.camera.quaternion) && this.lastZoom == document.game.GRAPHICS.camera.camera.zoom) {
            return;
        }


        this.lastQuat.copy(document.game.GRAPHICS.camera.camera.quaternion);
        this.lastZoom = document.game.GRAPHICS.camera.camera.zoom;

        for (const key in this.NPCCanvasText) {
            this.NPCCanvasText[key].name.quaternion.copy(document.game.GRAPHICS.camera.camera.quaternion);
            let scale = 1 / (document.game.GRAPHICS.camera.camera.zoom * 0.5);
            scale *= (1 + this.NPCCanvasText[key].name.position.distanceTo(document.game.GRAPHICS.camera.camera.position) / 100);
            this.NPCCanvasText[key].name.scale.set(scale, scale, scale);
        }



    }

    Game_createNPC(objectID: any, objectData: any): void {
        if (this.NPCCanvasText[objectID]) {
            return;
        }

        const NPC = document.game.GAME.npcs[objectID];
        const NPCObject = NPC.object;

        // if (!NPC && !NPC.info) {
        //     // Remove the object from the list
        //     document.game.GAME.npcs[objectID].object.getThreeObject().remove(this.NPCCanvasText[objectID].name);
        //     this.NPCCanvasText[objectID].name.dispose();
        //     if (this.NPCCanvasText[objectID].attackText) {
        //         document.game.GAME.npcs[objectID].object.getThreeObject().remove(this.NPCCanvasText[objectID].attackText);
        //         this.NPCCanvasText[objectID].attackText.dispose();
        //     }
        //     delete this.NPCCanvasText[objectID];
        // }

        this.NPCCanvasText[objectID] = {};
        this.NPCCanvasText[objectID].name = new Text();
        
        this.NPCCanvasText[objectID].name.text = NPC.info.name;
        this.NPCCanvasText[objectID].name.color = "#FFFF00";
        this.NPCCanvasText[objectID].name.fontSize = 0.15;
        this.NPCCanvasText[objectID].name.anchorX = "center";
        this.NPCCanvasText[objectID].name.anchorY = "bottom";

        document.game.GRAPHICS.scene.threeScene.add(this.NPCCanvasText[objectID].name);

        // Text should not be affected by camera fog


        this.NPCCanvasText[objectID].name.position.y += NPC.height;
        this.NPCCanvasText[objectID].name.visible = this.isPluginEnabled;

        // Apply a slight outline to the text
        this.NPCCanvasText[objectID].name.outlineColor = "#000000";
        this.NPCCanvasText[objectID].name.outlineWidth = 0.010;
        this.NPCCanvasText[objectID].name.outlineBlur = 0.005;

        this.NPCCanvasText[objectID].name.sync(() => {
            this.NPCCanvasText[objectID].name.renderOrder = 10001;
            this.NPCCanvasText[objectID].name.material[0].depthTest = false;
            this.NPCCanvasText[objectID].name.material[0].depthWrite = false;
            this.NPCCanvasText[objectID].name.material[1].depthTest = false;
            this.NPCCanvasText[objectID].name.material[1].depthWrite = false;

            if (NPC.info.attackable) {
                this.NPCCanvasText[objectID].name.position.y += NPC.height;


                let playerLevel = document.game.PLAYER.character.combatLevel;

                let levelDiff = NPC.info.level - playerLevel
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
                this.NPCCanvasText[objectID].attackText = new Text();
                this.NPCCanvasText[objectID].attackText.text = " (Level " + NPC.info.level + ")";
                this.NPCCanvasText[objectID].attackText.color = color;
                this.NPCCanvasText[objectID].attackText.fontSize = 0.10;
                this.NPCCanvasText[objectID].attackText.anchorX = "center";
                this.NPCCanvasText[objectID].attackText.anchorY = "top";
                this.NPCCanvasText[objectID].attackText.renderOrder = 10001;
                this.NPCCanvasText[objectID].attackText.material.depthTest = false;
                this.NPCCanvasText[objectID].attackText.material.depthWrite = false;
                this.NPCCanvasText[objectID].attackText.visible = this.isPluginEnabled;
                this.NPCCanvasText[objectID].name.add(this.NPCCanvasText[objectID].attackText);

                // Apply a slight outline to the text
                this.NPCCanvasText[objectID].attackText.outlineColor = "#000000";
                this.NPCCanvasText[objectID].attackText.outlineWidth = 0.010;
                this.NPCCanvasText[objectID].attackText.outlineBlur = 0.005;

                this.NPCCanvasText[objectID].attackText.sync(() => {
                    this.NPCCanvasText[objectID].attackText.renderOrder = 10001;
                    this.NPCCanvasText[objectID].attackText.material[0].depthTest = false;
                    this.NPCCanvasText[objectID].attackText.material[0].depthWrite = false;
                    this.NPCCanvasText[objectID].attackText.material[1].depthTest = false;
                    this.NPCCanvasText[objectID].attackText.material[1].depthWrite = false;
                });
            }

            this.NPCCanvasText[objectID].name.sync(() => {
                if (this.NPCCanvasText[objectID].attackText) {
                    this.NPCCanvasText[objectID].attackText.position.y -= NPC.height;
                }
            });
        });
       
        let NPCObjectUpdate = NPCObject.update;
        let pluginContext = this;
        NPCObject.update = function () {
            // Call the original update function with the original context
            NPCObjectUpdate.apply(this, arguments);


            pluginContext.NPCCanvasText[objectID].name.position.x = this.getThreeObject().position.x;
            pluginContext.NPCCanvasText[objectID].name.position.y = this.getThreeObject().position.y + NPC.height;
            pluginContext.NPCCanvasText[objectID].name.position.z = this.getThreeObject().position.z;

            if (pluginContext.NPCCanvasText[objectID].attackText) {
                pluginContext.NPCCanvasText[objectID].name.position.y += NPC.height;
            }


            let scale = 1 / (document.game.GRAPHICS.camera.camera.zoom * 0.5);

            scale *= (1 + pluginContext.NPCCanvasText[objectID].name.position.distanceTo(document.game.GRAPHICS.camera.camera.position) / 100);

            pluginContext.NPCCanvasText[objectID].name.scale.set(scale, scale, scale);

            pluginContext.NPCCanvasText[objectID].name.quaternion.copy(document.game.GRAPHICS.camera.camera.quaternion);
        };
    }

    Game_removeNPC(e: any, t: any): void {
        if (this.NPCCanvasText[e]) {
            if (this.NPCCanvasText[e].name) {
                document.game.GAME.npcs[e].object.getThreeObject().remove(this.NPCCanvasText[e].name);
                this.NPCCanvasText[e].name.dispose();
            }
            if (this.NPCCanvasText[e].attackText) {
                document.game.GAME.npcs[e].object.getThreeObject().remove(this.NPCCanvasText[e].attackText);
                this.NPCCanvasText[e].attackText.dispose();
            }
            delete this.NPCCanvasText[e];
        }
    }


    handleHideInvertEnableDisable(state: boolean) {
        // // always clear the current list of npcs
        // this.npc_highlight_div.innerHTML = '';
        // this.trackedNpcs = {};

        // this.hideInvert = state;
    }

    loginOK() {
        for (const key in document.game.GAME.npcs) {
            this.Game_createNPC(key, document.game.GAME.npcs[key]);
        }
    }

}
