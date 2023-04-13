/*
    Copyright (C) 2022-2023 KKonaOG

    This file is part of GenLite.
    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/


// Import GenLite Plugin Interface
import { GenLitePlugin } from '../core/interfaces/plugin.class';
import { Text } from 'troika-three-text';

export class GenLiteNamePlatesPlugin extends GenLitePlugin {
    static pluginName = 'GenLiteNamePlatesPlugin';

    // Plugin Settings
    isPluginEnabled: boolean = false;
    scaleFactor: number = 25;
    scaleDistance: boolean = false;
    showPlayerNames: boolean = false;
    showNPCNames: boolean = false;
    showItemNames: boolean = false;

    pluginSettings: Settings = {
        "Global Scaling": {
            type: 'range',
            min: 1,
            max: 100,
            value: this.scaleFactor,
            stateHandler: this.handleScaleFactorSettingChange.bind(this)
        },
        "Distance Scaling": {
            type: 'checkbox',
            value: this.scaleDistance,
            stateHandler: this.handleScaleDistanceSettingChange.bind(this)
        },
        "Show Player Names": {
            type: 'checkbox',
            value: this.showPlayerNames,
            stateHandler: this.handleShowPlayerNamesSettingChange.bind(this)
        },
        "Show NPC Names": {
            type: 'checkbox',
            value: this.showNPCNames,
            stateHandler: this.handleShowNPCNamesSettingChange.bind(this)
        },
        "Show Item Names": {
            type: 'checkbox',
            value: this.showItemNames,
            stateHandler: this.handleShowItemNamesSettingChange.bind(this)
        }
    };


    // Plugin Data
    NamePlates = {
        "Players": {},
        "NPCs": {},
        "Items": {}
    };

    async init() {
        document.genlite.registerPlugin(this);
    }

    async postInit() {
        this.pluginSettings = document.genlite.ui.registerPlugin("Name Plates", null, this.handlePluginState.bind(this), this.pluginSettings);
    }

    async handlePluginState(state: boolean) {
        this.isPluginEnabled = state;
    }

    async handleScaleDistanceSettingChange(value: boolean) {
        this.scaleDistance = value;
    }

    async handleScaleFactorSettingChange(value: number) {
        this.scaleFactor = value;
    }

    async handleShowPlayerNamesSettingChange(value: boolean) {
        this.showPlayerNames = value;

        // Loop through all players and set their visibility
        // This is preferred over constantly udpating the visibility of the text in Character_update()
        for (var player in this.NamePlates["Players"]) {
            this.NamePlates["Players"][player].visible = value;
        }
    }

    async handleShowNPCNamesSettingChange(value: boolean) {
        this.showNPCNames = value;

        for (var npc in this.NamePlates["NPCs"]) {
            this.NamePlates["NPCs"][npc].name.visible = value;
        }
    }

    async handleShowItemNamesSettingChange(value: boolean) {
        this.showItemNames = value;

        for (var item in this.NamePlates["Items"]) {
            this.NamePlates["Items"][item].visible = value;
        }
    }

    async Character_update(camera: any, dt: any, character: any): Promise<void> {
        if (!this.isPluginEnabled) { return; }
        if (!this.showPlayerNames) { return; }
        if (character == document.game.GAME.me.character) { return; }

        if (!this.NamePlates["Players"][character.id]) {
            this.NamePlates["Players"][character.id] = new Text();
            this.NamePlates["Players"][character.id].text = character.name();
            this.NamePlates["Players"][character.id].color = "#FFFFFF";
            this.NamePlates["Players"][character.id].fontSize = 0.15;
            this.NamePlates["Players"][character.id].anchorX = "center";
            this.NamePlates["Players"][character.id].anchorY = "bottom";
            this.NamePlates["Players"][character.id].font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";

            // Apply a slight outline to the text
            this.NamePlates["Players"][character.id].outlineColor = "#000000";
            this.NamePlates["Players"][character.id].outlineWidth = 0.010;
            this.NamePlates["Players"][character.id].outlineBlur = 0.005;

            this.NamePlates["Players"][character.id].visible = this.isPluginEnabled;

            document.game.GRAPHICS.scene.threeScene.add(this.NamePlates["Players"][character.id]);

            this.NamePlates["Players"][character.id].sync(() => {
                this.NamePlates["Players"][character.id].renderOrder = 10001;
                this.NamePlates["Players"][character.id].material[0].depthTest = false;
                this.NamePlates["Players"][character.id].material[0].depthWrite = false;
                this.NamePlates["Players"][character.id].material[1].depthTest = false;
                this.NamePlates["Players"][character.id].material[1].depthWrite = false;
            });
        }

        // Update Player Text Position
        this.NamePlates["Players"][character.id].position.x = character.worldPos.x;
        this.NamePlates["Players"][character.id].position.y = character.worldPos.y + character.height;
        this.NamePlates["Players"][character.id].position.z = character.worldPos.z;

        // Update Player Text Scale
        if (!this.scaleDistance) {
            var scaleVector = new document.game.THREE.Vector3();
            var scale = scaleVector.subVectors(this.NamePlates["Players"][character.id].position, camera.position).length() / this.scaleFactor;
            this.NamePlates["Players"][character.id].scale.set(scale, scale, scale);    
        } else {
            // Scale the text to slowly get smaller as the player moves away from the camera;
            this.NamePlates["Players"][character.id].scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);
        }

        // Update Player Text Quaternion (Rotation)
        this.NamePlates["Players"][character.id].quaternion.copy(camera.quaternion);
    }

    async Game_deletePlayer(playerID: any, player: any): Promise<void> {
        if (!this.NamePlates["Players"][playerID]) {
            return;
        }

        document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["Players"][playerID]);
        this.NamePlates["Players"][playerID].dispose();
        delete this.NamePlates["Players"][playerID]
    }

    async NPC_update(camera: any, dt: any, npc: any): Promise<void> {
        if (!this.isPluginEnabled) { return; }
        if (!this.showNPCNames) { return; }

        if (!this.NamePlates["NPCs"][npc.id]) {
            this.NamePlates["NPCs"][npc.id] = {};
            this.NamePlates["NPCs"][npc.id].name = new Text();
            this.NamePlates["NPCs"][npc.id].name.text = npc.name();
            this.NamePlates["NPCs"][npc.id].name.color = "#FFFF00";
            this.NamePlates["NPCs"][npc.id].name.fontSize = 0.15;
            this.NamePlates["NPCs"][npc.id].name.anchorX = "center";
            this.NamePlates["NPCs"][npc.id].name.anchorY = "bottom";
            this.NamePlates["NPCs"][npc.id].name.font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";

            // Apply a slight outline to the text
            this.NamePlates["NPCs"][npc.id].name.outlineColor = "#000000";
            this.NamePlates["NPCs"][npc.id].name.outlineWidth = 0.010;
            this.NamePlates["NPCs"][npc.id].name.outlineBlur = 0.005;

            document.game.GRAPHICS.scene.threeScene.add(this.NamePlates["NPCs"][npc.id].name);

            this.NamePlates["NPCs"][npc.id].name.sync(() => {
                this.NamePlates["NPCs"][npc.id].name.renderOrder = 10001;
                this.NamePlates["NPCs"][npc.id].name.material[0].depthTest = false;
                this.NamePlates["NPCs"][npc.id].name.material[0].depthWrite = false;
                this.NamePlates["NPCs"][npc.id].name.material[1].depthTest = false;
                this.NamePlates["NPCs"][npc.id].name.material[1].depthWrite = false;


                if (npc.info.attackable) {
                    this.NamePlates["NPCs"][npc.id].name.position.y += npc.height;


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
                    this.NamePlates["NPCs"][npc.id].attackText = new Text();
                    this.NamePlates["NPCs"][npc.id].attackText.text = " (Level " + npc.info.level + ")";
                    this.NamePlates["NPCs"][npc.id].attackText.color = color;
                    this.NamePlates["NPCs"][npc.id].attackText.font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";
                    this.NamePlates["NPCs"][npc.id].attackText.fontSize = 0.10;
                    this.NamePlates["NPCs"][npc.id].attackText.anchorX = "center";
                    this.NamePlates["NPCs"][npc.id].attackText.anchorY = "top";
                    this.NamePlates["NPCs"][npc.id].attackText.renderOrder = 10001;
                    this.NamePlates["NPCs"][npc.id].attackText.material.depthTest = false;
                    this.NamePlates["NPCs"][npc.id].attackText.material.depthWrite = false;
                    this.NamePlates["NPCs"][npc.id].attackText.visible = this.isPluginEnabled;
                    this.NamePlates["NPCs"][npc.id].name.add(this.NamePlates["NPCs"][npc.id].attackText);

                    // Apply a slight outline to the text
                    this.NamePlates["NPCs"][npc.id].attackText.outlineColor = "#000000";
                    this.NamePlates["NPCs"][npc.id].attackText.outlineWidth = 0.010;
                    this.NamePlates["NPCs"][npc.id].attackText.outlineBlur = 0.005;

                    this.NamePlates["NPCs"][npc.id].attackText.sync(() => {
                        this.NamePlates["NPCs"][npc.id].attackText.renderOrder = 10001;
                        this.NamePlates["NPCs"][npc.id].attackText.material[0].depthTest = false;
                        this.NamePlates["NPCs"][npc.id].attackText.material[0].depthWrite = false;
                        this.NamePlates["NPCs"][npc.id].attackText.material[1].depthTest = false;
                        this.NamePlates["NPCs"][npc.id].attackText.material[1].depthWrite = false;
                    });
                }

                this.NamePlates["NPCs"][npc.id].name.sync(() => {
                    if (this.NamePlates["NPCs"][npc.id].attackText) {
                        this.NamePlates["NPCs"][npc.id].attackText.position.y -= npc.height;
                    }
                });
            });
        }

        this.NamePlates["NPCs"][npc.id].name.position.x = npc.worldPos.x;
        this.NamePlates["NPCs"][npc.id].name.position.y = npc.worldPos.y + npc.height;
        this.NamePlates["NPCs"][npc.id].name.position.z = npc.worldPos.z;

        // Update NPC Text Position
        if (npc.info.attackable && !this.NamePlates["NPCs"][npc.id].attackText) {
            // There was a bug where the text didn't show up if the NPC was too close to the player at the start of the game
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
            this.NamePlates["NPCs"][npc.id].attackText = new Text();
            this.NamePlates["NPCs"][npc.id].attackText.text = " (Level " + npc.info.level + ")";
            this.NamePlates["NPCs"][npc.id].attackText.color = color;
            this.NamePlates["NPCs"][npc.id].attackText.font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";
            this.NamePlates["NPCs"][npc.id].attackText.fontSize = 0.10;
            this.NamePlates["NPCs"][npc.id].attackText.anchorX = "center";
            this.NamePlates["NPCs"][npc.id].attackText.anchorY = "top";
            this.NamePlates["NPCs"][npc.id].attackText.renderOrder = 10001;
            this.NamePlates["NPCs"][npc.id].attackText.material.depthTest = false;
            this.NamePlates["NPCs"][npc.id].attackText.material.depthWrite = false;
            this.NamePlates["NPCs"][npc.id].attackText.visible = this.isPluginEnabled;
            this.NamePlates["NPCs"][npc.id].name.add(this.NamePlates["NPCs"][npc.id].attackText);

            // Apply a slight outline to the text
            this.NamePlates["NPCs"][npc.id].attackText.outlineColor = "#000000";
            this.NamePlates["NPCs"][npc.id].attackText.outlineWidth = 0.010;
            this.NamePlates["NPCs"][npc.id].attackText.outlineBlur = 0.005;

            this.NamePlates["NPCs"][npc.id].attackText.sync(() => {
                this.NamePlates["NPCs"][npc.id].attackText.renderOrder = 10001;
                this.NamePlates["NPCs"][npc.id].attackText.material[0].depthTest = false;
                this.NamePlates["NPCs"][npc.id].attackText.material[0].depthWrite = false;
                this.NamePlates["NPCs"][npc.id].attackText.material[1].depthTest = false;
                this.NamePlates["NPCs"][npc.id].attackText.material[1].depthWrite = false;
            });

            this.NamePlates["NPCs"][npc.id].attackText.position.y = 0;
        }

        // Update NPC Text Scale
        if (!this.scaleDistance) {
            var scaleVector = new document.game.THREE.Vector3();
            var scale = scaleVector.subVectors(this.NamePlates["NPCs"][npc.id].name.position, camera.position).length() / this.scaleFactor;
            this.NamePlates["NPCs"][npc.id].name.scale.set(scale, scale, scale);
        } else {
            this.NamePlates["NPCs"][npc.id].name.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);
        }



        // Update NPC Text Quaternion (Rotation)
        this.NamePlates["NPCs"][npc.id].name.quaternion.copy(camera.quaternion);
    }

    async Game_deleteNPC(npcID: any, npc: any): Promise<void> {
        if (this.NamePlates["NPCs"][npcID]) {
            if (this.NamePlates["NPCs"][npcID].name) {
                document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["NPCs"][npcID].name);
                this.NamePlates["NPCs"][npcID].name.dispose();
                delete this.NamePlates["NPCs"][npcID].name;
            }

            if (this.NamePlates["NPCs"][npcID].attackText) {
                document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["NPCs"][npcID].attackText);
                this.NamePlates["NPCs"][npcID].attackText.dispose();
                delete this.NamePlates["NPCs"][npcID].attackText;
            }

            delete this.NamePlates["NPCs"][npcID];
        }
    }

    async ItemStack_update(camera: any, dt: any, itemstack: any): Promise<void> {
        if (!this.isPluginEnabled) { return; }
        if (!this.showItemNames) { return; }

        let height = 0.25;
        for (const key in itemstack.item_info) {
            const currItem = itemstack.item_info[key];
            const uid = Object.keys(currItem.ids)[0];
            if (!this.NamePlates["Items"][uid]) {
                this.NamePlates["Items"][uid] = new Text();
                this.NamePlates["Items"][uid].text = currItem.name;
                this.NamePlates["Items"][uid].fontSize = 0.15;
                this.NamePlates["Items"][uid].font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";
                this.NamePlates["Items"][uid].color = '#ffffff';
                this.NamePlates["Items"][uid].anchorX = 'center';
                this.NamePlates["Items"][uid].anchorY = 'bottom';

                this.NamePlates["Items"][uid].outlineColor = "#000000";
                this.NamePlates["Items"][uid].outlineWidth = 0.010;
                this.NamePlates["Items"][uid].outlineBlur = 0.005;

                this.NamePlates["Items"][uid].position.x = itemstack.worldPos.x;
                this.NamePlates["Items"][uid].position.y = itemstack.worldPos.y + height;
                this.NamePlates["Items"][uid].position.z = itemstack.worldPos.z;
                document.game.GRAPHICS.scene.threeScene.add(this.NamePlates["Items"][uid]);

                this.NamePlates["Items"][uid].sync(() => {
                    this.NamePlates["Items"][uid].renderOrder = 10000;
                    this.NamePlates["Items"][uid].material[0].depthTest = false;
                    this.NamePlates["Items"][uid].material[0].depthWrite = false;
                    this.NamePlates["Items"][uid].material[1].depthTest = false;
                    this.NamePlates["Items"][uid].material[1].depthWrite = false;
                });
            }
            // Update Scaling
            if (!this.scaleDistance) {
                var scaleVector = new document.game.THREE.Vector3();
                var scale = scaleVector.subVectors(itemstack.worldPos, camera.position).length() / (this.scaleFactor);
                this.NamePlates["Items"][uid].scale.set(scale, scale, scale);
            } else {
                this.NamePlates["Items"][uid].scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);
            }



            // Update Position
            this.NamePlates["Items"][uid].position.x = itemstack.worldPos.x;
            this.NamePlates["Items"][uid].position.y = itemstack.worldPos.y + height;
            this.NamePlates["Items"][uid].position.z = itemstack.worldPos.z;

            // Update Orientation
            this.NamePlates["Items"][uid].quaternion.copy(camera.quaternion);
            height += 0.15;
        }
    }

    async Game_deleteItem(e: any) {
        if (this.NamePlates["Items"][e]) {
            document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["Items"][e]);
            this.NamePlates["Items"][e].dispose();
            delete this.NamePlates["Items"][e.uid];
        }
    }

}