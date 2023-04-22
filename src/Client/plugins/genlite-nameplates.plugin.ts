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
    invertTagging: boolean = false;
    itemPrioritization: boolean = true;

    uiTab: HTMLElement = null;
    settingsMenu: HTMLElement = null;
    listContainer: HTMLElement = null;
    itemElements: Record<string, HTMLElement> = {};
    itemPriorities: Record<string, string> = {};

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
            stateHandler: this.handleShowNPCNamesSettingChange.bind(this),
            children: {
                "Invert Tagging": {
                    type: 'checkbox',
                    value: this.invertTagging,
                    stateHandler: this.handleInvertTaggingSettingChange.bind(this)
                }
            }
        },
        "Show Item Names": {
            type: 'checkbox',
            value: this.showItemNames,
            stateHandler: this.handleShowItemNamesSettingChange.bind(this)
        },
        "Item Prioritization": {
            type: 'checkbox',
            value: this.itemPrioritization,
            stateHandler: this.handleItemPrioritizationChange.bind(this)
        },
    };


    // Plugin Data
    NamePlates: Object = {
        "Players": {},
        "NPCs": {},
        "Items": {}
    };

    untaggedNPCs: Array<string> = [];

    async init() {
        document.genlite.registerPlugin(this);
        document.genlite.database.add((db) => {
            if (db.objectStoreNames.contains('itempri')) return;
            let store = db.createObjectStore('itempri', {
                keyPath: 'itemId',
            });
        });

        // Parse the JSON array stored in localStorage and convert it to array of strings (the NPC names to hide)
        this.untaggedNPCs = JSON.parse(localStorage.getItem("GenLite.NamePlates.HiddenNPCs") || "[]");
    }

    async postInit() {
        this.createCSS();
        this.createUITab();
        this.pluginSettings = document.genlite.ui.registerPlugin("Name Plates", null, this.handlePluginState.bind(this), this.pluginSettings);
    }

    createCSS() {
        const style = document.createElement('style');
        style.innerHTML = `
            .genlite-items-container {
                display: flex;
                flex-direction: column;
                overflow-x: hidden;
                color: #ffd593;
                font-family: acme,times new roman,Times,serif;
                height: 100%;
            }

            .genlite-items-list {
                display: flex;
                flex-direction: column;
                overflow-y: scroll;
                height: 100%;
                flex-grow: 1;
                border-bottom: 1px solid rgb(66, 66, 66);
            }

            .genlite-items-row {
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
                border-bottom: 1px solid rgb(66, 66, 66);
                border-top: 1px solid rgb(0, 0, 0);
            }

            .genlite-items-iconlist {
                display: flex;
                column-gap: 0.5em;
                padding: 0.25em;
                padding-left: 1em;
                position: relative;
                align-items: center;
            }

            .genlite-items-icon {
                width: 28px;
                height: 28px;
                position: relative;
                flex-shrink: 0;
            }

            .genlite-items-search-row {
                width: 100%;
                height: 25px;
                border-bottom: 1px solid rgb(66, 66, 66);
                display: flex;
                align-items: center;
            }

            .genlite-items-search {
                background-color: rgb(42, 40, 40);
                color: rgb(255, 255, 255);
                font-size: 16px;
                border-radius: 0px;
                padding-left: 10px;
                padding-right: 10px;
                box-sizing: border-box;
                outline: none;
                width: 100%;
                border: medium none;
                margin-left: auto;
                margin-right: auto
            }

            .genlite-items-title {
                flex-grow: 1;
                display: flex;
                align-items: center;
                color: white;
            }

            .genlite-items-high-pri {
                color: gold;
                text-shadow: 0 0 2px goldenrod;
            }

            .genlite-items-low-pri {
                color: gray;
                text-decoration-line: line-through;
            }

            .genlite-arrow-holder {
                flex-shrink: 0;
                padding-right: 1em;
                display: flex;
                flex-direction: column;
            }

            .genlite-items-arrow-up {
                color: gold;
                cursor: pointer;
            }

            .genlite-items-arrow-down {
                color: lightgray;
                cursor: pointer;
            }

        `;
        document.head.appendChild(style);
    }

    createUITab() {
        if (this.uiTab) {
            // not creating, redrawing
            this.settingsMenu.innerHTML = '';
            this.itemElements = {};
        } else {
            this.settingsMenu = <HTMLElement>document.createElement("div");
            this.settingsMenu.classList.add("genlite-items-container");
        }

        // search bar
        let searchrow = <HTMLElement>document.createElement("div");
        searchrow.classList.add("genlite-items-search-row");
        this.settingsMenu.appendChild(searchrow);

        let search = <HTMLInputElement>document.createElement("input");
        searchrow.appendChild(search);
        search.classList.add("genlite-items-search");
        search.placeholder = "Search Items...";
        search.type = "text";

        search.onfocus = () => {
            document.game.CHAT.focus_locked = true;
        }

        search.onblur = () => {
            document.game.CHAT.focus_locked = false;
        }

        search.oninput = function (e) {
            let value = search.value.trim().toLowerCase();
            let values = [];
            for (const v of value.split(",")) {
                values.push(v.trim());
            }

            let rows = document.getElementsByClassName("genlite-items-row");
            for (let i = 0; i < rows.length; i++) {
                let row = rows[i] as HTMLElement;
                let content = row["seo"].toLowerCase();
                if (value === "") {
                    row.style.removeProperty("display");
                    continue;
                }

                let match = true;
                for (let v of values) {
                    let invert = v[0] === "-";
                    if (invert) {
                        v = v.substr(1);
                    }

                    if (!invert && !content.includes(v)) {
                        match = false;
                        break;
                    } else if (invert && content.includes(v)) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    row.style.removeProperty("display");
                } else {
                    row.style.display = "none";
                }
            }
        };

        // item list
        this.listContainer = <HTMLElement>document.createElement("div");
        this.listContainer.classList.add("genlite-items-list");
        this.settingsMenu.appendChild(this.listContainer);
        this.createItemsList();

        if (!this.uiTab) {
            this.uiTab = document.genlite.ui.addTab("sack-dollar", "Item Priority", this.settingsMenu, this.isPluginEnabled);
        }
    }

    createItemsList() {
        let droprecorder = document["GenLiteDropRecorderPlugin"];
        if (!droprecorder) {
            console.log("no drop recorder!");
            return;
        }

        for (const item in droprecorder.itemList) {
            let count = droprecorder.itemList[item];
            this.createItemRow(item, count);
        }
    }

    createItemRow(itemId: string, count: number) {
        if (!document.game.DATA.items[itemId]) {
            // e.g. "nothing"
            return;
        }
        let name = document.game.DATA.items[itemId].name;
        let row = <HTMLElement>document.createElement("div");
        row.classList.add("genlite-items-row");
        this.listContainer.appendChild(row);
        this.itemElements[itemId] = row;
        row["seo"] = name + ";" + "pri:normal;"

        let icons = <HTMLElement>document.createElement("div");
        icons.classList.add("genlite-items-iconlist");
        row.appendChild(icons);

        let icon = this.createIconDiv(itemId);
        icons.appendChild(icon);

        let title = <HTMLElement>document.createElement("div");
        title.classList.add("genlite-items-title");
        title.innerText = name;
        icons.appendChild(title);

        let arrowHolder = <HTMLElement>document.createElement("div");
        arrowHolder.classList.add("genlite-arrow-holder");
        icons.appendChild(arrowHolder);

        let plugin = this;

        let upArrow = <HTMLElement>document.createElement("div");
        upArrow.innerHTML = '<i class="fas fa-chevron-up"></i>';
        upArrow.classList.add("genlite-items-arrow-up");
        arrowHolder.appendChild(upArrow);
        upArrow.onclick = function (e) {
            plugin.upPriority(title, itemId);
        };

        let downArrow = <HTMLElement>document.createElement("div");
        downArrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
        downArrow.classList.add("genlite-items-arrow-down");
        arrowHolder.appendChild(downArrow);
        downArrow.onclick = function (e) {
            plugin.downPriority(title, itemId);
        };
    }

    createIconDiv(item) {
        let div = <HTMLImageElement>document.createElement("div");
        div.classList.add("genlite-items-icon");

        let icon = <HTMLImageElement>document.createElement("img");
        icon.classList.add("genlite-items-icon");
        icon.title = item;
        div.appendChild(icon);

        const itemdata = document.game.DATA.items[item];
        if (itemdata) {
            if (itemdata.name) {
                icon.title = itemdata.name;
            }

            if (itemdata.image) {
                icon.src = document.game.getStaticPath('items/' + itemdata.image);
            } else if (itemdata.images) {
                let image = itemdata.images[itemdata.images.length - 1][1];
                icon.src = document.game.getStaticPath('items/' + image);
            }

            if (itemdata.border) {
                let path = `items/placeholders/${ itemdata.border }_border.png`;
                path = document.game.getStaticPath(path);
                let qual = <HTMLImageElement>document.createElement("img");
                qual.classList.add("new_ux-inventory_quality-image");
                qual.src = path;
                div.appendChild(qual);
            }
        }

        if (!icon.src) {
            icon.src = document.game.getStaticPath('items/unknown.png');
        }
        return div;
    }

    async handlePluginState(state: boolean) {
        this.isPluginEnabled = state;

        if (this.uiTab) {
            this.uiTab.style.display = state ? "flex" : "none";
        }

        if (state == false) {
            this.handleShowPlayerNamesSettingChange(false, false);
            this.handleShowNPCNamesSettingChange(false, false);
            this.handleShowItemNamesSettingChange(false, false);
        } else {
            this.handleShowPlayerNamesSettingChange(this.showPlayerNames);
            this.handleShowNPCNamesSettingChange(this.showNPCNames);
            this.handleShowItemNamesSettingChange(this.showItemNames);
        }
    }

    async handleScaleDistanceSettingChange(value: boolean) {
        this.scaleDistance = value;
    }

    async handleScaleFactorSettingChange(value: number) {
        this.scaleFactor = value;
    }

    async handleShowPlayerNamesSettingChange(value: boolean, doChange: boolean = true) {
        if (doChange) {
            this.showPlayerNames = value;
        }

        // Loop through all players and set their visibility
        // This is preferred over constantly udpating the visibility of the text in Character_update()
        for (var player in this.NamePlates["Players"]) {
            this.NamePlates["Players"][player].visible = value;
        }
    }

    async handleShowNPCNamesSettingChange(value: boolean, doChange: boolean = true) {
        if (doChange) {
            this.showNPCNames = value;
        }

        for (var npc in this.NamePlates["NPCs"]) {
            this.NamePlates["NPCs"][npc].name.visible = value;
        }
    }

    async handleShowItemNamesSettingChange(value: boolean, doChange: boolean = true) {
        if (doChange) {
            this.showItemNames = value;
        }

        for (var item in this.NamePlates["Items"]) {
            this.NamePlates["Items"][item].visible = value;
        }
    }

    async handleInvertTaggingSettingChange(value: boolean) {
        this.invertTagging = value;

        if (value) {
            // Hide all NPCs that are not in the untaggedNPCs array
            for (var npc in this.NamePlates["NPCs"]) {
                if (this.untaggedNPCs.indexOf(this.NamePlates["NPCs"][npc].name.text) == -1) {
                    this.NamePlates["NPCs"][npc].name.visible = false;
                } else {
                    this.NamePlates["NPCs"][npc].name.visible = true;
                }
            }
        } else {
            // Show all NPCs that are not in the untaggedNPCs array
            for (var npc in this.NamePlates["NPCs"]) {
                if (this.untaggedNPCs.indexOf(this.NamePlates["NPCs"][npc].name.text) == -1) {
                    this.NamePlates["NPCs"][npc].name.visible = true;
                } else {
                    this.NamePlates["NPCs"][npc].name.visible = false;
                }
            }
        }
    }

    async handleItemPrioritizationChange(value: boolean) {
        this.itemPrioritization = true;
        if (this.uiTab) {
            this.uiTab.style.display = value && this.isPluginEnabled ? "flex" : "none";
        }
    }

    async Character_update(camera: any, dt: any, character: any): Promise<void> {
        if (!this.isPluginEnabled) { return; }
        if (!this.showPlayerNames) { return; }
        if (character == document.game.GAME.me.character) { return; }
        if (!document.game.GAME.players[character.id]) { return; }

        if (!this.NamePlates["Players"][character.id]) {
            this.NamePlates["Players"][character.id] = new Text();
            this.NamePlates["Players"][character.id].text = character.name();
            this.NamePlates["Players"][character.id].color = "#FFFFFF";
            this.NamePlates["Players"][character.id].fontSize = 0.15;
            this.NamePlates["Players"][character.id].anchorX = "center";
            this.NamePlates["Players"][character.id].anchorY = "bottom";
            this.NamePlates["Players"][character.id].font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";

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

        // Update Player Text Color (Based on Friend)
        this.NamePlates["Players"][character.id].color = character.is_friend ? "#00BB27" : "#FFFFFF";

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

    NPC_intersects(ray: any, list: any, NPC: any): void {
        // Only log if the number of elements in the list is greater than 1
        if (list.length == 0) { return; }

        // Create a Map to store the actions
        let NPCs = new Map();

        for (let i = 0; i < list.length; i++) {
            // Get the action object
            let actionObject = list[i].object;

            if (actionObject.type === "player") {
                continue;
            }

            // See if the object is already in the set
            if (NPCs.has(actionObject)) {
                // Push the action to the existing array
                NPCs.get(actionObject).push(list[i]);
            }
            else {
                // Create a new array and push the action
                NPCs.set(actionObject, [list[i]]);
            }
        }

        NPCs.forEach((value, key) => {
            // Remove any existing "Tag" or "UnTag" options from value


            // If the NPC's nameplate is not visible, then don't add the option to the list
            if (!this.NamePlates["NPCs"][key.id].name.visible && !value.some((action: any) => action.text === "Tag")) {
                // Get distance to the NPC
                list.push({
                    object: key,
                    distance: value[0].distance,
                    priority: -4,
                    text: "Tag",
                    action: () => {
                        if (this.invertTagging) {
                            // Remove the "UnTag" option from the list
                            list.splice(list.findIndex((action: any) => action.text === "Tag"), 1);

                            // Add the NPC to the list of hidden NPCs (by name)
                            this.untaggedNPCs.push(key.info.name);

                            // Update the localStorage with the new list of hidden NPCs
                            localStorage.setItem("GenLite.NamePlates.HiddenNPCs", JSON.stringify(this.untaggedNPCs));
                        } else {
                            // Remove the "Tag" option from the list
                            list.splice(list.findIndex((action: any) => action.text === "Tag"), 1);

                            // Remove the NPC from the list of hidden NPCs
                            this.untaggedNPCs.splice(this.untaggedNPCs.findIndex((name: any) => name === key.info.name), 1);

                            // Update the local storage
                            localStorage.setItem("GenLite.NamePlates.HiddenNPCs", JSON.stringify(this.untaggedNPCs));
                        }

                        // Update the NPC's nameplate visibility
                        this.handleInvertTaggingSettingChange(this.invertTagging);
                    }
                });

            } else if (this.NamePlates["NPCs"][key.id].name.visible && !value.some((action: any) => action.text === "UnTag")) {
                list.push({
                    object: key,
                    distance: value[0].distance,
                    priority: -4,
                    text: "UnTag",
                    action: () => {
                        if (!this.invertTagging) {
                            // Remove the "UnTag" option from the list
                            list.splice(list.findIndex((action: any) => action.text === "UnTag"), 1);

                            // Add the NPC to the list of hidden NPCs (by name)
                            this.untaggedNPCs.push(key.info.name);

                            // Update the localStorage with the new list of hidden NPCs
                            localStorage.setItem("GenLite.NamePlates.HiddenNPCs", JSON.stringify(this.untaggedNPCs));
                        } else {
                            // Remove the "Tag" option from the list
                            list.splice(list.findIndex((action: any) => action.text === "UnTag"), 1);

                            // Remove the NPC from the list of hidden NPCs
                            this.untaggedNPCs.splice(this.untaggedNPCs.findIndex((name: any) => name === key.info.name), 1);

                            // Update the local storage
                            localStorage.setItem("GenLite.NamePlates.HiddenNPCs", JSON.stringify(this.untaggedNPCs));
                        }

                        // Update the NPC's nameplate visibility
                        this.handleInvertTaggingSettingChange(this.invertTagging);
                    }
                });
            }

        });
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
        if (!document.game.GAME.npcs[npc.id]) { return; }


        if (!this.NamePlates["NPCs"][npc.id]) {
            this.NamePlates["NPCs"][npc.id] = {};
            this.NamePlates["NPCs"][npc.id].name = new Text();
            this.NamePlates["NPCs"][npc.id].name.text = npc.name();

            // Determine if the NPC is hidden
            if (this.untaggedNPCs.includes(npc.name())) {
                if (this.invertTagging) {
                    this.NamePlates["NPCs"][npc.id].name.visible = true;
                } else {
                    this.NamePlates["NPCs"][npc.id].name.visible = false;
                }
            } else {
                if (this.invertTagging) {
                    this.NamePlates["NPCs"][npc.id].name.visible = false;
                } else {
                    this.NamePlates["NPCs"][npc.id].name.visible = true;
                }
            }
            this.NamePlates["NPCs"][npc.id].name.color = "#FFFF00";
            this.NamePlates["NPCs"][npc.id].name.fontSize = 0.15;
            this.NamePlates["NPCs"][npc.id].name.anchorX = "center";
            this.NamePlates["NPCs"][npc.id].name.anchorY = "bottom";
            this.NamePlates["NPCs"][npc.id].name.font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";

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
                    let color = "#ffff00";

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
                    this.NamePlates["NPCs"][npc.id].attackText.font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";
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

        // If not visible, don't update
        if (!this.NamePlates["NPCs"][npc.id].name.visible) {
            return;
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
            this.NamePlates["NPCs"][npc.id].attackText.font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";
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
        if (!document.game.GAME.item_stacks[itemstack.id]) { return; }

        let height = 0.25;
        for (const key in itemstack.item_info) {
            const currItem = itemstack.item_info[key];
            const uid = Object.keys(currItem.ids)[0];
            if (!this.NamePlates["Items"][uid]) {
                this.NamePlates["Items"][uid] = new Text();
                this.NamePlates["Items"][uid].text = currItem.name;
                this.NamePlates["Items"][uid].fontSize = 0.15;
                this.NamePlates["Items"][uid].font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";
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
            } else {
                // Update the Text with an x amount of items (number of ids associated with currItem)
                if (Object.keys(currItem.ids).length > 1) {
                    this.NamePlates["Items"][uid].text = currItem.name + " x" + Object.keys(currItem.ids).length;
                } else {
                    this.NamePlates["Items"][uid].text = currItem.name;
                }
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

    async loginOK() {
        for (const key in this.NamePlates["NPCs"]) {
            // Remove the nameplate from the scene
            document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["NPCs"][key].name);

            if (this.NamePlates["NPCs"][key].attackText) {
                document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["NPCs"][key].attackText);
                this.NamePlates["NPCs"][key].attackText.dispose();
                delete this.NamePlates["NPCs"][key].attackText;
            }

            // Dispose of the nameplate
            this.NamePlates["NPCs"][key].name.dispose();
            // Delete the nameplate from the NamePlates object
            delete this.NamePlates["NPCs"][key];

            this.NamePlates["NPCs"][key] = undefined;
        }

        for (const key in this.NamePlates["Items"]) {
            // Remove the nameplate from the scene
            document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["Items"][key]);
            // Dispose of the nameplate
            this.NamePlates["Items"][key].dispose();
            // Delete the nameplate from the NamePlates object
            delete this.NamePlates["Items"][key];

            this.NamePlates["Items"][key] = undefined;
        }


        for (const key in this.NamePlates["Players"]) {
            // Remove the nameplate from the scene
            document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["Players"][key]);
            // Dispose of the nameplate
            this.NamePlates["Players"][key].dispose();
            // Delete the nameplate from the NamePlates object
            delete this.NamePlates["Players"][key];

            this.NamePlates["Players"][key] = undefined;
        }
    }

    loadPrioritiesFromIDB() {
        this.itemPriorities = {};
        let plugin = this;
        document.genlite.database.storeTx(
            'itempri',
            'readwrite',
            (store) => {
                store.openCursor(null, 'prev').onsuccess = (e) => {
                    const cursor = e.target.result;
                    let item = cursor.value;
                    plugin.setPriority(item.itemId, item.value);
                    cursor.continue();
                };
            }
        );
    }

    setPriority(itemId: string, value: "low"|"normal"|"high") {
        if (value === "normal" && this.itemPriorities[itemId]) {
            delete this.itemPriorities[itemId];
        } else if (value !== "normal") {
            this.itemPriorities[itemId] = value;
        }

        document.genlite.database.storeTx(
            'itempri',
            'readwrite',
            (store) => {
                if (value === "normal") {
                    let request = store.delete(itemId);
                } else {
                    let request = store.put({
                        itemId: itemId,
                        value: value,
                    });
                }
            }
        );
    }

    getPriority(itemId: string) {
        switch (this.itemPriorities[itemId]) {
            case "high":
                return 2;
            case "low":
                return -1;
            default:
                return 1;
        }
    }

    upPriority(dom: HTMLElement, itemId: string) {
        let name = document.game.DATA.items[itemId].name;
        if (dom.classList.contains("genlite-items-low-pri")) {
            dom.classList.remove("genlite-items-low-pri");
            this.itemElements[itemId]["seo"] = name + ";" + "pri:normal;";
            this.setPriority(itemId, "normal");
            return;
        }
        this.itemElements[itemId]["seo"] = name + ";" + "pri:high;";
        dom.classList.add("genlite-items-high-pri");
        this.setPriority(itemId, "high");
    }

    downPriority(dom: HTMLElement, itemId: string) {
        let name = document.game.DATA.items[itemId].name;
        if (dom.classList.contains("genlite-items-high-pri")) {
            this.itemElements[itemId]["seo"] = name + ";" + "pri:normal;";
            dom.classList.remove("genlite-items-high-pri");
            this.setPriority(itemId, "normal");
            return;
        }
        this.itemElements[itemId]["seo"] = name + ";" + "pri:low;";
        dom.classList.add("genlite-items-low-pri");
        this.setPriority(itemId, "low");
    }
}
