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

    trackedNpcs = {};
    npcData = {};
    npc_highlight_div = null;
    render = false;
    npcHealthList: {
        [key: string]: any
        version: string
    };
    curCombat: string = "";
    curEnemy: string = ""

    combatX = 0;
    combatY = 0;

    isPluginEnabled: boolean = false;
    hideInvert: boolean = true;
    isAltDown: boolean = false;

    packList;
    async init() {
        document.genlite.registerPlugin(this);

        this.npc_highlight_div = document.createElement('div');
        this.npc_highlight_div.className = 'npc-indicators-list';
        document.body.appendChild(this.npc_highlight_div);
        this.npcHealthList = JSON.parse(localStorage.getItem("GenliteNPCHealthList"));
        if (this.npcHealthList == null || GenLiteNPCHighlightPlugin.healthListVersion != this.npcHealthList.version)
            this.npcHealthList = { version: GenLiteNPCHighlightPlugin.healthListVersion };
        this.npcData = JSON.parse(localStorage.getItem("GenliteNpcHideData"));
        if (this.npcData == null || GenLiteNPCHighlightPlugin.healthListVersion != this.npcHealthList.version)
            this.npcData = {};

        window.addEventListener('keydown', this.keyDownHandler.bind(this));
        window.addEventListener('keyup', this.keyUpHandler.bind(this));
        window.addEventListener("blur", this.blurHandler.bind(this));
    }

    async postInit() {
        this.packList = document['GenLiteWikiDataCollectionPlugin'].packList;
        document.genlite.ui.registerPlugin("NPC Highlights", "GenLite.NpcHighlight.Enable", this.handlePluginState.bind(this), this.pluginSettings);
        for (let key in document.game.GAME.npcs) {
            this.Game_createNPC(key, null);
        }
    }

    handlePluginState(state: boolean): void {
        // when disabling the plugin clear the current list of npcs
        if (state === false) {
            this.npc_highlight_div.innerHTML = '';
            this.trackedNpcs = {};
        }

        this.isPluginEnabled = state;
    }

    handleHideInvertEnableDisable(state: boolean) {
        // always clear the current list of npcs
        this.npc_highlight_div.innerHTML = '';
        this.trackedNpcs = {};

        this.hideInvert = state;
    }

    Game_createNPC(objectKey: any, t: any): void {
        let npc = document.game.GAME.npcs[objectKey];
        let hpKey = this.packList[npc.id.split('-')[0]]
        let text = npc.htmlName;
        if (this.npcHealthList[hpKey] !== undefined)
            text += ` HP: ${this.npcHealthList[hpKey]}`
        text += `<div class="genlite-npc-setting" style="display: ${this.isAltDown ? "inline-block" : "none"}; pointer-events: auto;" onclick="document.${GenLiteNPCHighlightPlugin.pluginName}.hide_npc('${hpKey}');void(0);"> &#8863;</div>`;
        this.trackedNpcs[objectKey] = this.create_text_element(hpKey, text);
        this.trackedNpcs[objectKey].hasHp = this.npcHealthList[hpKey] !== undefined;

        let originalNPCUpdate = npc.update;
        let pluginContext = this;
        npc.update = function () {
            originalNPCUpdate.apply(npc, arguments);
            if (pluginContext.isPluginEnabled) {
                let worldPos;

                /* if the health was updated but the npc tag doesnt have that regen the tag */
                if (!pluginContext.trackedNpcs[this.id].hasHp && pluginContext.npcHealthList[pluginContext.packList[objectKey.split('-')[0]]]) {
                    pluginContext.trackedNpcs[this.id].remove();
                    delete pluginContext.trackedNpcs[this.id];
                    pluginContext.Game_createNPC(this.id, null);
                    this.update = originalNPCUpdate;
                    return;
                }

                /* if in combat grab the threeObject position (the actual current position of the sprite not the world pos)
                    mult by 0.8 which is the height of the health bar
                */
                let npcHide = pluginContext.hideInvert ? pluginContext.npcData[pluginContext.packList[this.id.split('-')[0]]] == 1 : !(pluginContext.npcData[pluginContext.packList[this.id.split('-')[0]]] == 1);
                let zHide = false;
                if (!npcHide || pluginContext.isAltDown) {
                    if (this.id == pluginContext.curEnemy) {
                        worldPos = new document.game.THREE.Vector3().copy(this.object.position());
                        worldPos.y += 0.8;
                    } else {
                        worldPos = new document.game.THREE.Vector3().copy(document.game.GAME.npcs[this.id].position());
                        worldPos.y += this.height
                    }
                    let screenPos = pluginContext.world_to_screen(worldPos);
                    if (this.id == pluginContext.curEnemy)
                        screenPos.y *= 0.9; // move the name tag a fixed position above the name tag
                    zHide = screenPos.z > 1.0; //if behind camera
                    if (zHide || (npcHide && !pluginContext.isAltDown)) {
                        pluginContext.trackedNpcs[this.id].style.visibility = 'hidden';
                    } else {
                        pluginContext.trackedNpcs[this.id].style.visibility = 'visible';
                    }
                    pluginContext.trackedNpcs[this.id].style.top = screenPos.y + "px";
                    pluginContext.trackedNpcs[this.id].style.left = screenPos.x + "px";
                }
            }
        }
    }

    Game_deleteNPC(objectKey: any): void {
        this.trackedNpcs[objectKey].remove();
        delete this.trackedNpcs[objectKey];
    }

    // Camera_update(dt) {
    // }

    async loginOK() {
        this.render = true;
    }

    Network_logoutOK() {
        this.npc_highlight_div.innerHTML = '';
        this.trackedNpcs = {};
        this.render = false;
    }

    /* figure out which npc we are fighting and when that combat ends */
    Network_handle(verb, payload) {
        if (this.isPluginEnabled === false || document.game.NETWORK.loggedIn === false) {
            return;
        }

        /* look for start of combat set the curEnemy and record data */
        if (verb == "spawnObject" && payload.type == "combat" &&
            (payload.participant1 == document.game.PLAYER.id || payload.participant2 == document.game.PLAYER.id)) {
            this.curCombat = payload.id;
            let curCombat = document.game.GAME.combats[payload.id];
            this.curEnemy = curCombat.left.id == document.game.PLAYER.id ? curCombat.right.id : curCombat.left.id;
            return;
        }
        if (verb == "removeObject" && payload.type == "combat" && payload.id == this.curCombat) {
            this.curCombat = "";
            this.curEnemy = "";
            return;
        }
    }

    Game_combatUpdate(update) {
        if (this.isPluginEnabled === false) {
            return;
        }
        let object = document.game.GAME.objectById(update.id);
        if (update.id == document.game.PLAYER.id || document.game.GAME.players[update.id] !== undefined || object === undefined)
            return;

        let hpKey = this.packList[object.id.split('-')[0]];
        if (hpKey === undefined)
            return;

        let npcsToMod;
        if (this.npcHealthList[hpKey] === undefined) {
            this.npcHealthList[hpKey] = update.maxhp;
            localStorage.setItem("GenliteNPCHealthList", JSON.stringify(this.npcHealthList));
        }
        npcsToMod = Object.keys(document.game.GAME.npcs).filter(x => document.game.GAME.npcs[x].id.split('-')[0] == object.id.split('-')[0]);
        for (let key in npcsToMod) {
            let npcid = npcsToMod[key];

            if (this.trackedNpcs[npcid] === undefined || this.trackedNpcs[npcid].hasHp) {
                continue;
            }

            this.trackedNpcs[npcid].innerHTML += ` HP: ${this.npcHealthList[hpKey]}`;
            this.trackedNpcs[npcid].hasHp = true;
        }
        if (this.trackedNpcs.hasOwnProperty(object.id))
            this.trackedNpcs[object.id].innerHTML = `<div>${object.htmlName}</div><div>HP: ${update.hp}/${update.maxhp}</div>`;
    }


    world_to_screen(pos) {
        var p = pos;
        var screenPos = p.project(document.game.GRAPHICS.threeCamera());

        screenPos.x = (screenPos.x + 1) / 2 * document.body.clientWidth;
        screenPos.y = -(screenPos.y - 1) / 2 * document.body.clientHeight;

        return screenPos;
    }

    create_text_element(key, text) {
        let element = document.createElement('div');
        if (this.hideInvert) {
            element.className = this.npcData[key] == 1 ? 'spell-locked' : 'text-yellow';
        } else {
            element.className = this.npcData[key] == 1 ? 'text-yellow' : 'spell-locked';
        }
        element.style.position = 'absolute';
        //element.style.zIndex = '99999';
        element.innerHTML = text;
        element.style.transform = 'translateX(-50%)';
        element.style.fontFamily = 'acme, times new roman, Times, serif'; // Set Font
        element.style.textShadow = '-1px -1px 0 #000,0   -1px 0 #000, 1px -1px 0 #000, 1px  0   0 #000, 1px  1px 0 #000, 0    1px 0 #000, -1px  1px 0 #000, -1px  0   0 #000';
        element.style.pointerEvents = 'none';

        this.npc_highlight_div.appendChild(element);

        return element;
    }

    hide_npc(packId) {
        if (!this.npcData.hasOwnProperty(packId))
            this.npcData[packId] = 0;

        if (this.npcData[packId] != 1)
            this.npcData[packId] = 1;
        else
            this.npcData[packId] = 0;

        this.save_item_list();
    }

    save_item_list() {
        this.npc_highlight_div.innerHTML = '';
        this.trackedNpcs = {};
        localStorage.setItem("GenliteNpcHideData", JSON.stringify(this.npcData));
    }


    keyDownHandler(event) {
        if (event.key !== "Alt")
            return;

        event.preventDefault();
        if (!event.repeat) {
            this.isAltDown = true;
            this.setDisplayState("inline-block");
        }
    }
    keyUpHandler(event) {
        if (event.key !== "Alt")
            return;

        event.preventDefault();

        this.isAltDown = false;
        this.setDisplayState("none");
    }

    blurHandler() {
        this.isAltDown = false;
        this.setDisplayState("none");
    }

    setDisplayState(state) {
        const hiddenElements = document.querySelectorAll('.genlite-npc-setting') as NodeListOf<HTMLElement>;

        hiddenElements.forEach((element) => {
            element.style.display = state;
        });
    }
}