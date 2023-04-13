/*
    Copyright (C) 2022-2023 Retoxified, dpeGit, snwhd
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/

interface Element {
    element: HTMLElement,
    itemId: string,
    itemName: string,
    instanceId: number,
    x: number,
    y: number,
};

/*
 * how dropped items work as of 0.117
 *  Item.js defines a class, ItemStack which represents the stack of all
 *          items at one particular location in the world.
 *
 *  Since multiple kinds of string identifier are used, I've come up with some
 *  terms for them. This might not map to genfanad source code, but are used in
 *  genlite.
 *
 *      instanceId - a unique identifier for a specific item on the ground
 *                   e.g: "i1cc50" or "is217-1557e"
 *
 *      itemId - a unique identifier for a kind of item
 *               e.g: "cooking-raw-rat_lq"
 *
 *      itemName - a human readable item name
 *               e.g.: "L.Q. Raw Rat Meat"
 *
 *  Game.js maintains two separate maps of ItemStacks:
 *      GAME.item_stacks maps from a location it's ItemStack
 *      GAME.items maps from an instanceId to it's ItemStack
 *
 *  WorldItem was removed in v0.117
 *
 * This plugin's update loop checks GAME.items for any new item instances,
 * generates UI for displaying their name and setting priorities. It then
 * overrides the ItemStack.intersect method to apply our custom priorities
 * to each item, modifying the left-click and right-click actions order.
*/

import { GenLitePlugin } from '../core/interfaces/plugin.class';
import { Text } from 'troika-three-text';

export class GenLiteItemHighlightPlugin extends GenLitePlugin {
    static pluginName = 'GenLiteItemHighlightPlugin';


    isPluginEnabled: boolean = false;
    ItemStacksCanvasText: any = {};

    pluginSettings: Settings = {
        // "Show Item Labels": {
        //     type: "checkbox",
        //     oldKey: "GenLite.HideItemLabels.Enable",
        //     value: this.hideLables,
        //     stateHandler: this.handleHideLabelsEnableDisable.bind(this),
        // },
        // "Priority Item Color": {
        //     value: "#ffa500",
        //     oldKey: "GenLite.ItemHighlight.PriorityColor",
        //     type: "color",
        //     stateHandler: this.handleColorChange.bind(this),
        // },
    }

    async init() {
        document.genlite.registerPlugin(this);
    }

    async postInit() {
        document.genlite.ui.registerPlugin("Item Highlights", "GenLite.ItemHighLight.Enable", this.handlePluginState.bind(this), this.pluginSettings);
    }

    async Camera_update() {
        // Update the rotation of the text
        for (const key in this.ItemStacksCanvasText) {
            this.ItemStacksCanvasText[key].quaternion.copy(document.game.GRAPHICS.camera.camera.quaternion);
        }


    }

    async ItemStack_update(e: any, t: any, ItemStack: any) {
        let height = 0.25;
        for (const key in ItemStack.item_info) {
            const currItem = ItemStack.item_info[key];
            const uid = Object.keys(currItem.ids)[0];
            if (this.ItemStacksCanvasText[uid]) {
                continue;
            }

            this.ItemStacksCanvasText[uid] = new Text();
            this.ItemStacksCanvasText[uid].text = currItem.name;
            this.ItemStacksCanvasText[uid].fontSize = 0.5;
            this.ItemStacksCanvasText[uid].font = "https://raw.githubusercontent.com/KKonaOG/GenLite/main/Acme-Regular.ttf";
            this.ItemStacksCanvasText[uid].color = '#ffffff';
            this.ItemStacksCanvasText[uid].anchorX = 'center';
            this.ItemStacksCanvasText[uid].anchorY = 'bottom';
            this.ItemStacksCanvasText[uid].visible = this.isPluginEnabled;

            this.ItemStacksCanvasText[uid].outlineColor = "#000000";
            this.ItemStacksCanvasText[uid].outlineWidth = 0.010;
            this.ItemStacksCanvasText[uid].outlineBlur = 0.005;

            this.ItemStacksCanvasText[uid].position.x = ItemStack.worldPos.x;
            this.ItemStacksCanvasText[uid].position.y = ItemStack.worldPos.y + height;
            this.ItemStacksCanvasText[uid].position.z = ItemStack.worldPos.z;
            document.game.GRAPHICS.scene.threeScene.add(this.ItemStacksCanvasText[uid]);

            this.ItemStacksCanvasText[uid].sync(() => {
                this.ItemStacksCanvasText[uid].renderOrder = 10000;
                this.ItemStacksCanvasText[uid].material[0].depthTest = false;
                this.ItemStacksCanvasText[uid].material[0].depthWrite = false;
                this.ItemStacksCanvasText[uid].material[1].depthTest = false;
                this.ItemStacksCanvasText[uid].material[1].depthWrite = false;
            });

            height += 0.5;
        }
    }

    async Game_deleteItem(e: any) {
        if (this.ItemStacksCanvasText[e]) {
            document.game.GRAPHICS.scene.threeScene.remove(this.ItemStacksCanvasText[e]);
            this.ItemStacksCanvasText[e].dispose();
            delete this.ItemStacksCanvasText[e];
        }

    }


    handlePluginState(state: boolean): void {
        this.isPluginEnabled = state;

        for (const key in this.ItemStacksCanvasText) {
            this.ItemStacksCanvasText[key].visible = state;
        }
    }
}
