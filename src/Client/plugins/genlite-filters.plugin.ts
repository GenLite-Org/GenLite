/*
    Copyright (C) 2022-2023 Xortrox dpeGit
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/


import { GenLitePlugin } from '../core/interfaces/plugin.class';

export class GenLiteFilterPlugin extends GenLitePlugin {
    static pluginName = 'GenLiteFilterPlugin';

    isPluginEnabled: boolean = false;

    filters = {
        brightness: 1,
        contrast: 1,
        saturate: 1,
        grayscale: 0,
        invert: 0,
        sepia: 0
    }

    elementsToFilter: HTMLCollectionOf<HTMLCanvasElement>;

    pluginSettings: Settings = {
        "Brightness (default 1)": {
            type: "range",
            value: this.filters.brightness,
            stateHandler: this.handleBrightness.bind(this),
            min: 0,
            max: 2,
            step: 0.1
        },
        "Contrast (default 1)": {
            type: "range",
            value: this.filters.contrast,
            stateHandler: this.handleContrast.bind(this),
            min: 0,
            max: 2,
            step: 0.1
        },
        "Saturate (default 1)": {
            type: "range",
            value: this.filters.saturate,
            stateHandler: this.handleSaturate.bind(this),
            min: 0,
            max: 2,
            step: 0.1
        },
        "Grayscale (default 0)": {
            type: "range",
            value: this.filters.grayscale,
            stateHandler: this.handleGrayscale.bind(this),
            min: 0,
            max: 1,
            step: 0.1
        },
        "Invert (default 0)": {
            type: "range",
            value: this.filters.invert,
            stateHandler: this.handleInvert.bind(this),
            min: 0,
            max: 1,
            step: 0.1
        },
        "Sepia (default 0)": {
            type: "range",
            value: this.filters.sepia,
            stateHandler: this.handleSepia.bind(this),
            min: 0,
            max: 1,
            step: 0.1
        }
    }

    async init() {
        document.genlite.registerPlugin(this);
        this.elementsToFilter = document.getElementsByTagName("canvas");
    }

    async postInit() {
        document.genlite.ui.registerPlugin("Camera Filters", null, this.handlePluginState.bind(this), this.pluginSettings);
    }

    handlePluginState(state: boolean): void {
        this.isPluginEnabled = state;
        if (state) {
            this.loginOK();
        } else {
            for (let element of Object.keys(this.elementsToFilter))
                this.elementsToFilter[element].style.filter = '';
        }
    }

    handleBrightness(value) {
        this.filters.brightness = value;
        this.updateFilters();
    }

    handleContrast(value) {
        this.filters.contrast = value;
        this.updateFilters();
    }

    handleSaturate(value) {
        this.filters.saturate = value;
        this.updateFilters();
    }

    handleGrayscale(value) {
        this.filters.grayscale = value;
        this.updateFilters();
    }

    handleInvert(value) {
        this.filters.invert = value;
        this.updateFilters();
    }

    handleSepia(value) {
        this.filters.sepia = value;
        this.updateFilters();
    }

    updateFilters() {
        if (!this.isPluginEnabled)
            return;
        let filterString = "";
        for (let filter of Object.keys(this.filters)) {
            filterString += ` ${filter}(${this.filters[filter]})`
        }
        for (let element of Object.keys(this.elementsToFilter))
            this.elementsToFilter[element].style.filter = filterString;
    }

    loginOK(): void {
        /* mod to the game canvas */
        this.elementsToFilter[3].style.position = 'absolute';
        this.elementsToFilter[3].style.zIndex = '-1';
        this.updateFilters();
    }
}
