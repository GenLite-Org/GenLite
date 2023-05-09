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
    itemPriorities: Record<string, "low" | "high"> = {};

    isHealthInit: boolean = false;
    heathList: { [id: string]: number } = {} // where id is mob id is name-level

    testX = 0.1;

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

        document.genlite.database.add((db) => {
            if (db.objectStoreNames.contains('healthList')) return;
            let store = db.createObjectStore('healthList', {
                keyPath: 'healthKey',
            });
        });

        // Parse the JSON array stored in localStorage and convert it to array of strings (the NPC names to hide)
        this.untaggedNPCs = JSON.parse(localStorage.getItem("GenLite.NamePlates.HiddenNPCs") || "[]");
    }

    async postInit() {
        this.createCSS();
        this.createUITab();
        this.pluginSettings = document.genlite.ui.registerPlugin("Name Plates", null, this.handlePluginState.bind(this), this.pluginSettings);

        this.loadPrioritiesFromIDB();
        this.loadHealthValsFromIDB();
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
        search.id = "genlite-item-priority-search";
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
            let searches = []
            let query = search.value.trim().toLowerCase();
            for (const s of query.split("|")) {
                let values = [];
                for (const v of s.trim().split(",")) {
                    values.push(v.trim());
                }
                searches.push(values);
            }

            let rows = document.getElementsByClassName("genlite-items-row");
            for (let i = 0; i < rows.length; i++) {
                let row = rows[i] as HTMLElement;
                let content = row["seo"].toLowerCase();
                if (query === "") {
                    row.style.removeProperty("display");
                    continue;
                }

                let match = true;
                for (let s of searches) {
                    match = true;
                    for (let v of s) {
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

                    if (match) break;
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
        if (droprecorder) {
            for (const item in droprecorder.itemList) {
                let count = droprecorder.itemList[item];
                this.createItemRow(item, count);
            }
        }

        let reciperecorder = document["GenLiteRecipeRecorderPlugin"];
        if (reciperecorder) {
            for (const item in reciperecorder.itemList) {
                this.createItemRow(item, 0);
            }
        }

        this.sortItemList();
    }

    sortItemList() {
        this.listContainer.innerHTML = '';
        let sorted = Object.keys(this.itemElements).sort(
            (a, b) => document.game.DATA.items[a].name.localeCompare(
                document.game.DATA.items[b].name
            )
        );
        for (const itemId of sorted) {
            this.listContainer.appendChild(this.itemElements[itemId]);
        }
    }

    createItemRow(itemId: string, count: number) {
        if (!document.game.DATA.items[itemId] || !!this.itemElements[itemId]) {
            // e.g. "nothing" or already added items
            return null;
        }
        let name = document.game.DATA.items[itemId].name;
        let row = <HTMLElement>document.createElement("div");
        row.classList.add("genlite-items-row");
        this.listContainer.appendChild(row);
        this.itemElements[itemId] = row;
        row["seo"] = name + ";id:" + itemId + ";pri:normal;"

        let icons = <HTMLElement>document.createElement("div");
        icons.classList.add("genlite-items-iconlist");
        row.appendChild(icons);

        let icon = this.createIconDiv(itemId);
        icons.appendChild(icon);

        let title = <HTMLElement>document.createElement("div");
        title.classList.add("genlite-items-title");
        title.innerText = name;
        icons.appendChild(title);
        row["titleElement"] = title;

        let arrowHolder = <HTMLElement>document.createElement("div");
        arrowHolder.classList.add("genlite-arrow-holder");
        icons.appendChild(arrowHolder);

        let plugin = this;

        let upArrow = <HTMLElement>document.createElement("div");
        upArrow.innerHTML = '<i class="fas fa-chevron-up"></i>';
        upArrow.classList.add("genlite-items-arrow-up");
        arrowHolder.appendChild(upArrow);
        upArrow.onclick = function (e) {
            plugin.upPriority(itemId);
        };

        let downArrow = <HTMLElement>document.createElement("div");
        downArrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
        downArrow.classList.add("genlite-items-arrow-down");
        arrowHolder.appendChild(downArrow);
        downArrow.onclick = function (e) {
            plugin.downPriority(itemId);
        };
        return row;
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
                let path = `items/placeholders/${itemdata.border}_border.png`;
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
            var scale = scaleVector.subVectors(this.NamePlates["Players"][character.id].position, camera.position).length() * 0.005 * this.scaleFactor;
            this.NamePlates["Players"][character.id].scale.set(scale, scale, scale);
        } else {
            // Scale the text to slowly get smaller as the player moves away from the camera;
            let scaledScaleFactor = this.scaleFactor * 0.05;
            this.NamePlates["Players"][character.id].scale.set(scaledScaleFactor, scaledScaleFactor, scaledScaleFactor);
        }

        // Update Player Text Quaternion (Rotation)
        this.NamePlates["Players"][character.id].quaternion.copy(camera.quaternion);
    }

    NPC_intersects(ray: any, list: any, NPC: any): void {
        // Only log if the number of elements in the list is greater than 1
        if (list.length == 0) return;
        if (!this.isPluginEnabled || !this.showNPCNames) return;

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
        if (!this.isHealthInit) { return; }


        if (!this.NamePlates["NPCs"][npc.id]) {
            this.NamePlates["NPCs"][npc.id] = {};
            this.NamePlates["NPCs"][npc.id].name = new Text();
            this.createNPCTextElement(this.NamePlates["NPCs"][npc.id].name, npc, "#FFFF00")
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
        }
        // If not visible, don't update
        if (!this.NamePlates["NPCs"][npc.id].name.visible) {
            return;
        }
        let curPos = npc.object.position();
        this.NamePlates["NPCs"][npc.id].name.position.x = curPos.x;
        this.NamePlates["NPCs"][npc.id].name.position.y = curPos.y + npc.height;
        this.NamePlates["NPCs"][npc.id].name.position.z = curPos.z;

        // Update NPC Text Position
        if (npc.info.attackable && !this.NamePlates["NPCs"][npc.id].attackText) {
            // There was a bug where the text didn't show up if the NPC was too close to the player at the start of the game
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
                color = "#ccc";
            }
            this.NamePlates["NPCs"][npc.id].attackText = new Text();
            this.createAttackTextElement(this.NamePlates["NPCs"][npc.id].name, this.NamePlates["NPCs"][npc.id].attackText, " (Level " + npc.info.level + ")", color);
            let heathKey = `${npc.name()}-${npc.info.level}`
            if (this.heathList[heathKey]) {
                this.NamePlates["NPCs"][npc.id].healthText = new Text();
                this.createHealthTextElement(this.NamePlates["NPCs"][npc.id].healthText, `${this.heathList[heathKey]}HP`, "#FFFF00")
            }
        }

        // Update NPC Text Scale
        if (!this.scaleDistance) {
            var scaleVector = new document.game.THREE.Vector3();
            var scale = scaleVector.subVectors(this.NamePlates["NPCs"][npc.id].name.position, camera.position).length() * 0.005 * this.scaleFactor;
            this.NamePlates["NPCs"][npc.id].name.scale.set(scale, scale, scale);
        } else {
            let scaledScaleFactor = this.scaleFactor * 0.05;
            this.NamePlates["NPCs"][npc.id].name.scale.set(scaledScaleFactor, scaledScaleFactor, scaledScaleFactor);
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
            if (this.NamePlates["NPCs"][npcID].healthText) {
                document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["NPCs"][npcID].healthText);
                this.NamePlates["NPCs"][npcID].healthText.dispose();
                delete this.NamePlates["NPCs"][npcID].healthText;
            }

            delete this.NamePlates["NPCs"][npcID];
        }
    }

    async Game_combatUpdate(update: any): Promise<void> {
        let npcPlate = this.NamePlates["NPCs"][update.id];
        if (!npcPlate)
            return;
        let npc = document.game.GAME.npcs[update.id];
        let healthKey = `${npc.name()}-${npc.info.level}`
        if (!this.heathList[healthKey]) {
            this.setHeathVal(healthKey, update.maxhp);
            for (let key of Object.keys(this.NamePlates["NPCs"])) {
                let npcToTest = document.game.GAME.npcs[key];
                let healthKeyB = `${npcToTest.name()}-${npcToTest.info.level}`
                if (healthKey == healthKeyB)
                    this.Game_deleteNPC(key, undefined);
            }
        }
        if (!npcPlate.healthText) {
            npcPlate.healthText = new Text();
        }
        this.createHealthTextElement(npcPlate.healthText, ` ${update.hp}/${update.maxhp}HP`, "#FFFF00")

    }

    async ItemStack_update(camera: any, dt: any, itemstack: any): Promise<void> {
        if (!this.isPluginEnabled) { return; }
        if (!this.showItemNames) { return; }
        if (!document.game.GAME.item_stacks[itemstack.id]) { return; }

        let height = 0.25;

        // sort by priority
        let keys = Object.keys(itemstack.item_info);
        let sorted = keys.sort((a, b) => this.getPriority(a) - this.getPriority(b));

        for (const key of sorted) {
            const currItem = itemstack.item_info[key];
            const uid = Object.keys(currItem.ids)[0];

            const priority = this.getPriority(key);
            let text = this.NamePlates["Items"][uid];
            if (priority >= 0 && !text) {
                text = new Text();
                this.NamePlates["Items"][uid] = text;

                text.text = currItem.name;
                text.fontSize = 0.15;
                text.font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";
                text.color = this.getItemColor(key);
                text.anchorX = 'center';
                text.anchorY = 'bottom';

                text.outlineColor = "#000000";
                text.outlineWidth = 0.010;
                text.outlineBlur = 0.005;

                text.position.x = itemstack.worldPos.x;
                text.position.y = itemstack.worldPos.y + height;
                text.position.z = itemstack.worldPos.z;
                document.game.GRAPHICS.scene.threeScene.add(text);

                text.sync(() => {
                    text.renderOrder = 10000;
                    text.material[0].depthTest = false;
                    text.material[0].depthWrite = false;
                    text.material[1].depthTest = false;
                    text.material[1].depthWrite = false;
                });
            } else if (priority >= 0) {
                // Update the Text with an x amount of items (number of ids associated with currItem)
                if (Object.keys(currItem.ids).length > 1) {
                    text.text = currItem.name + " x" + Object.keys(currItem.ids).length;
                } else {
                    text.text = currItem.name;
                }
            } else if (text) {
                // it exists, but priority <= means we deprioritized it
                document.game.GRAPHICS.scene.threeScene.remove(text);
                delete this.NamePlates["Items"][uid];
                text.dispose();
            }

            if (!text) {
                // removed, or never added
                continue;
            }

            let newColor = this.getItemColor(key);
            if (text.color != newColor) {
                text.color = newColor;
            }

            // Update Scaling
            if (!this.scaleDistance) {
                var scaleVector = new document.game.THREE.Vector3();
                var scale = scaleVector.subVectors(itemstack.worldPos, camera.position).length() * 0.005 * (this.scaleFactor);
                this.NamePlates["Items"][uid].scale.set(scale, scale, scale);
            } else {
                let scaledScaleFactor = this.scaleFactor * 0.05;
                this.NamePlates["Items"][uid].scale.set(scaledScaleFactor, scaledScaleFactor, scaledScaleFactor);
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

    async ItemStack_intersects(ray, list, itemstack) {
        if (!this.isPluginEnabled || !this.itemPrioritization) return;

        let n = ray.intersectObject(itemstack.mesh);
        if (!n || n.length == 0 || list.length == 0) return;

        let distance = 0;
        let items = [];
        let priorityOption = null;

        for (let entry of list) {
            distance = entry.distance;
            if (entry.text === 'Set Priorities') {
                priorityOption = entry;
            }
            if (entry.text.startsWith('Take')) {
                // itemId is not stored in the list entry, but theres a
                // roundabout way of getting to it through an instance.
                //
                // TODO: can there be multiple item_info.ids with different
                //       item ids? or empty ids?
                const itemInfo = entry.object;
                const inst = Object.keys(itemInfo.ids)[0];
                const itemId = document.game.GAME.items[inst].item_keys[inst].item_id;
                const priority = this.getPriority(itemId);
                entry.priority += priority * 50;
                items.push(itemId);

                if (this.createItemRow(itemId, 0) != null) {
                    this.sortItemList();
                }
            }
        }

        if (priorityOption === null) {
            let obj = {
                text: () => '',
            };
            list.push({
                color: 'aqua',
                distance: distance,
                priority: -100,
                object: obj,
                text: 'Set Priorities',
                action: () => document['GenLiteNamePlatesPlugin'].priorityEditor(items)
            });
        } else {
            priorityOption.action = () => document['GenLiteNamePlatesPlugin'].priorityEditor(items);
        }
    }

    async Game_deleteItem(e: any) {
        if (this.NamePlates["Items"][e]) {
            document.game.GRAPHICS.scene.threeScene.remove(this.NamePlates["Items"][e]);
            this.NamePlates["Items"][e].dispose();
            delete this.NamePlates["Items"][e];
        }
    }

    async loginOK() {
        for (const key in this.NamePlates["NPCs"]) {
            // Remove the nameplate from the scene
            this.Game_deleteNPC(key, undefined);
        }

        for (const key in this.NamePlates["Items"]) {
            // Remove the nameplate from the scene
            this.Game_deleteItem(key)
        }


        for (const key in this.NamePlates["Players"]) {
            // Remove the nameplate from the scene
            this.Game_deletePlayer(key, undefined);
        }
    }

    createNPCTextElement(object: any, npc: any, color: string) {
        object.text = npc.name();
        object.color = color;
        object.fontSize = 0.15;
        object.anchorX = "center";
        object.anchorY = "bottom";
        object.font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";

        // Apply a slight outline to the text
        object.outlineColor = "#000000";
        object.outlineWidth = 0.010;
        object.outlineBlur = 0.005;

        document.game.GRAPHICS.scene.threeScene.add(object);

        object.sync(() => {
            object.renderOrder = 10001;
            object.material[0].depthTest = false;
            object.material[0].depthWrite = false;
            object.material[1].depthTest = false;
            object.material[1].depthWrite = false;


            if (npc.info.attackable) {
                object.position.y += npc.height;


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
                    color = "#ccc";
                }

                // It should be the Name (Level X)
                this.createAttackTextElement(object, this.NamePlates["NPCs"][npc.id].attackText, " (Level " + npc.info.level + ")", color)
                let heathKey = `${npc.name()}-${npc.info.level}`
                if (this.heathList[heathKey]) {
                    this.NamePlates["NPCs"][npc.id].healthText = new Text();
                    this.NamePlates["NPCs"][npc.id].name.add(this.NamePlates["NPCs"][npc.id].healthText);
                    this.createHealthTextElement(this.NamePlates["NPCs"][npc.id].healthText, `${this.heathList[heathKey]}HP`, "#FFFF00")
                }
            }

            object.sync(() => {
                if (this.NamePlates["NPCs"][npc.id].attackText) {
                    this.NamePlates["NPCs"][npc.id].attackText.position.y -= npc.height;
                }
            });
        });
    }

    createAttackTextElement(parent: any, object: any, text: string, color: string) {
        object.text = text;
        object.color = color;
        object.font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";
        object.fontSize = 0.10;
        object.anchorX = "center";
        object.anchorY = "top";
        object.renderOrder = 10001;
        object.material.depthTest = false;
        object.material.depthWrite = false;
        object.visible = this.isPluginEnabled;
        parent.add(object);

        // Apply a slight outline to the text
        object.outlineColor = "#000";
        object.outlineWidth = 0.010;
        object.outlineBlur = 0.005;

        object.sync(() => {
            object.renderOrder = 10001;
            object.material[0].depthTest = false;
            object.material[0].depthWrite = false;
            object.material[1].depthTest = false;
            object.material[1].depthWrite = false;
        });

    }

    createHealthTextElement(object: any, text: string, color: string) {
        object.text = text;
        object.color = color;
        object.font = "https://raw.githubusercontent.com/KKonaOG/Old-GenLite/main/Acme-Regular.ttf";
        object.fontSize = 0.10;
        object.anchorX = "left";
        object.anchorY = "top";
        object.position.x = 0.2;
        object.renderOrder = 10001;
        object.material.depthTest = false;
        object.material.depthWrite = false;
        object.visible = this.isPluginEnabled;

        // Apply a slight outline to the text
        object.outlineColor = "#000";
        object.outlineWidth = 0.010;
        object.outlineBlur = 0.005;

        object.sync(() => {
            object.renderOrder = 10001;
            object.material[0].depthTest = false;
            object.material[0].depthWrite = false;
            object.material[1].depthTest = false;
            object.material[1].depthWrite = false;
        });

    }

    loadHealthValsFromIDB() {
        this.heathList = {};
        let plugin = this;
        document.genlite.database.storeTx(
            'healthList',
            'readwrite',
            (store) => {
                store.getAll().onsuccess = (result) => {
                    let res = result.target.result;
                    for (let i in res) {
                        this.heathList[res[i].healthKey] = res[i].value;
                    }
                    this.isHealthInit = true;
                };
            }
        );

    }

    setHeathVal(healthKey: string, value: number) {
        this.heathList[healthKey] = value;
        document.genlite.database.storeTx(
            'healthList',
            'readwrite',
            (store) => {
                let request = store.put({
                    healthKey: healthKey,
                    value: value,
                });
            }
        );
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
                    if (cursor === null) return;
                    let item = cursor.value;
                    switch (item.value) {
                        case "high":
                            plugin.upPriority(item.itemId);
                            break;
                        case "low":
                            plugin.downPriority(item.itemId);
                            break;
                        default:
                    }
                    cursor.continue();
                };
            }
        );
    }

    setPriority(itemId: string, value: "low" | "normal" | "high") {
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

    getItemColor(itemId: string) {
        if (!this.itemPrioritization) return "#ffffff";
        switch (this.itemPriorities[itemId]) {
            case "high":
                return "gold";
            case "low":
                return "gray";
            default:
                return "#ffffff";
        }
    }

    getPriority(itemId: string) {
        if (!this.itemPrioritization) return 0;
        switch (this.itemPriorities[itemId]) {
            case "high":
                return 1;
            case "low":
                return -1;
            default:
                return 0;
        }
    }

    upPriority(itemId: string) {
        let element = this.itemElements[itemId];
        if (!element)
            return;
        let dom = element["titleElement"] as HTMLElement;

        let name = document.game.DATA.items[itemId].name;
        element["seo"] = name + ";id:" + itemId + ";";
        if (dom.classList.contains("genlite-items-low-pri")) {
            dom.classList.remove("genlite-items-low-pri");
            element["seo"] += "pri:normal;";
            this.setPriority(itemId, "normal");
            return;
        }
        element["seo"] += "pri:high;";
        dom.classList.add("genlite-items-high-pri");
        this.setPriority(itemId, "high");
    }

    downPriority(itemId: string) {
        let element = this.itemElements[itemId];
        let dom = element["titleElement"] as HTMLElement;

        let name = document.game.DATA.items[itemId].name;
        element["seo"] = name + ";id:" + itemId + ";";
        if (dom.classList.contains("genlite-items-high-pri")) {
            element["seo"] += "pri:normal;";
            dom.classList.remove("genlite-items-high-pri");
            this.setPriority(itemId, "normal");
            return;
        }
        element["seo"] += "pri:low;";
        dom.classList.add("genlite-items-low-pri");
        this.setPriority(itemId, "low");
    }

    priorityEditor(itemIds: Array<string>) {
        let ui = document['GenLiteUIPlugin'];

        // TODO: this is hacky, and should be a ui plugin method
        // if ui is closed, open it
        if (ui.sidePanel.style.right === '-302px') {
            let button = document.getElementById('genlite-ui-close-button');
            button.dispatchEvent(new Event('click'));
        }

        setTimeout(function () {
            ui.showTab('Item Priority');

            let search = document.getElementById("genlite-item-priority-search") as HTMLInputElement;
            search.value = 'id:' + itemIds.join(';|id:') + ';';
            search.dispatchEvent(new Event('input'));
        }, 100);
    }
}
