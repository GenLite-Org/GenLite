/*
    Copyright (C) 2023 FrozenReality dpeGit
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/


/* note if copying change import to `../core/interfaces/plugin.interface` */
import { GenLitePlugin } from '../core/interfaces/plugin.class';

export class GenLiteHotKeyPlugin extends GenLitePlugin {
    static pluginName = 'GenLiteHotKeyPlugin';
    isPluginEnabled: boolean = false;

    pluginSettings: Settings = {};

    INVENTORY: Inventory;
    SPELLS: any;
    CURRENCY: any;
    PLAYER_INFO: any;

    async init() {
        document.genlite.registerPlugin(this);
        this.INVENTORY = document.game.INVENTORY;
        this.SPELLS = document.game.SPELLS;
        this.CURRENCY = document.game.CURRENCY;
        this.PLAYER_INFO = document.game.PLAYER_INFO;
    }

    async postInit() {
        document.genlite.ui.registerPlugin("HotKeys", null, this.handlePluginState.bind(this), this.pluginSettings);
    }

    handlePluginState(state: boolean): void {
        this.isPluginEnabled = state;
    }

    initializeUI(): void {
        document.addEventListener('keydown', this.menuSwitcher.bind(this));
    }

    menuSwitcher(e) {
        if (!this.isPluginEnabled) return;
        if (e.keyCode == 112) {
            e.preventDefault();
            if (this.INVENTORY.visible) {
                this.INVENTORY.hide();
            } else {
                this.SPELLS.hide();
                this.CURRENCY.hide();
                this.INVENTORY.show();
            }
        } else if (e.keyCode == 113) {
            if (this.SPELLS.visible && this.SPELLS.current_tab_name == "sorcery") {
                this.SPELLS.hide();
            } else {
                this.INVENTORY.hide();
                this.CURRENCY.hide();
                this.SPELLS.show();
                this.SPELLS._switchTab("sorcery");
            }
        } else if (e.keyCode == 114) {
            e.preventDefault();
            if (this.SPELLS.visible && this.SPELLS.current_tab_name == "rituals") {
                this.SPELLS.hide();
            } else {
                this.INVENTORY.hide();
                this.CURRENCY.hide();
                this.SPELLS.show();
                this.SPELLS._switchTab("rituals");
            }
        } else if (e.keyCode == 115) {
            this.PLAYER_INFO.visible ? this.PLAYER_INFO.hide() : this.PLAYER_INFO.show();
        }
    }
}
