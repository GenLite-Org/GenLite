/*
    Copyright (C) 2022-2023 Retoxified, dpeGit, snwhd
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/

import {
    SkyboxUriLeft,
    SkyboxUriRight,
    SkyboxUriUp,
    SkyboxUriDown,
    SkyboxUriBack,
    SkyboxUriFront,
} from "../core/data/skybox-data";
import { GenLitePlugin } from '../core/interfaces/plugin.class';

export class GenLiteCameraPlugin extends GenLitePlugin {
    static pluginName = 'GenLiteCameraPlugin';

    static minRenderDistance = 40;
    static maxRenderDistance = 150;
    static defaultRenderDistance = 65;

    static minFogLevel = 0.0;
    static maxFogLevel = 1.0;
    static defaultFogLevel = 0.5;

    originalCameraMode: Function;
    originalAdvanceToBB: Function;

    unlockCamera: boolean = true;
    maxDistance: number = 15;
    minDistance: number = Math.PI;
    minAngle: number = 0.35;
    maxAngle: number = 1.4;

    renderDistance: number = 65;
    distanceFog: boolean = false;
    fogLevel: number = 0.5;
    skyboxEnabled: boolean = false;
    skybox: any = null;

    isPluginEnabled = true;

    WORLDMANAGER: WorldManager

    pluginSettings: Settings = {
        "Unlock Camera": {
            type: "checkbox",
            oldKey: "GenLite.Camera.UnlockCam",
            value: this.unlockCamera,
            stateHandler: this.handleUnlockCameraToggle.bind(this),
            "children": {
                "Max Distance": {
                    type: "range",
                    oldKey: "GenLite.Camera.maxDistance",
                    value: this.maxDistance,
                    stateHandler: this.handleMaxDistance.bind(this),
                    min: 8,
                    max: 32,
                    step: 1,
                },
                "Min Distance": {
                    "type": "range",
                    "oldKey": "GenLite.Camera.minDistance",
                    "value": this.minDistance,
                    "stateHandler": this.handleMinDistance.bind(this),
                    "min": 0,
                    "max": 8,
                    "step": 1,
                },
                "Max Pitch": {
                    "type": "range",
                    "value": this.minAngle,
                    "stateHandler": this.handleMinAngle.bind(this),
                    "min": 0,
                    "max": 1.5,
                    "step": 0.05,
                },
                "Min Pitch": {
                    "type": "range",
                    "value": this.maxAngle,
                    "stateHandler": this.handleMaxAngle.bind(this),
                    "min": 0,
                    "max": 1.5,
                    "step": 0.05,
                },
            }
        },
        "Enable Skybox": {
            type: "checkbox",
            oldKey: "GenLite.Camera.Skybox",
            value: this.skyboxEnabled,
            stateHandler: this.handleSkybox.bind(this),
        },
        "Enable Fog": {
            type: "checkbox",
            oldKey: "GenLite.Camera.Fog",
            value: this.distanceFog,
            stateHandler: this.handleFog.bind(this),
            children: {
                "Fog Level": {
                    type: "range",
                    oldKey: "GenLite.Camera.FogLevel",
                    value: this.fogLevel,
                    stateHandler: this.handleFogLevel.bind(this),
                    min: GenLiteCameraPlugin.minFogLevel,
                    max: GenLiteCameraPlugin.maxFogLevel,
                    step: 0.05,
                }
            }
        },
        "Render Distance": {
            type: "range",
            oldKey: "GenLite.Camera.RenderDistance",
            value: this.renderDistance,
            stateHandler: this.handleRenderDistance.bind(this),
            min: GenLiteCameraPlugin.minRenderDistance,
            max: GenLiteCameraPlugin.maxRenderDistance,
            step: 5,
        }
    }


    async init() {
        document.genlite.registerPlugin(this);
        this.originalCameraMode = document.game.WorldManager.updatePlayerTile;
        this.originalAdvanceToBB = document.game.Segment.prototype.advanceToBB;
        this.WORLDMANAGER = document.game.WORLDMANAGER;
    }

    async postInit() {
        document.genlite.ui.registerPlugin("Camera", null, this.handlePluginState.bind(this), this.pluginSettings);
    }

    handlePluginState(state: boolean): void {
        this.isPluginEnabled = state;
        if (state) {
            let self = this;
            document.game.Segment.prototype.advanceToBB = function (c, d, debug = false) {
                c.y = Math.round(c.y * 100) / 100;
                return self.originalAdvanceToBB.call(this, c, d, debug);
            };
        } else {
            document.game.Segment.prototype.advanceToBB = this.originalAdvanceToBB;
        }
        this.updateCameraMode();
        this.updateSkyboxAndFog();
    }

    handleUnlockCameraToggle(state: boolean) {
        this.unlockCamera = state;
        this.updateCameraMode();
    }

    handleMaxDistance(value: number) {
        this.maxDistance = value;
        this.updateCameraMode();
    }

    handleMinDistance(value: number) {
        this.minDistance = value;
        this.updateCameraMode();
    }

    handleMinAngle(value: number) {
        this.minAngle = value;
        this.updateCameraMode();
    }

    handleMaxAngle(value: number) {
        this.maxAngle = value;
        this.updateCameraMode();
    }

    handleRenderDistance(value: number) {
        this.renderDistance = value;
        document.game.GRAPHICS.camera.camera.far = value;
        document.game.GRAPHICS.camera.camera.updateProjectionMatrix();

        // genfanad does a bit of it's own object pruning, so we update that
        // distance as well Then we need to iterate over every object and
        // render the newly visible ones, because by default this would only
        // occur when the player moves.
        document.game.GRAPHICS.scene.dd2 = value * value;
        for (let i in document.game.GRAPHICS.scene.allObjects) {
            let o = document.game.GRAPHICS.scene.allObjects[i];
            if (document.game.GRAPHICS.scene.checkObject(o)) {
                document.game.GRAPHICS.scene.showObject(i);
            }
        }

        this.handleFog(this.distanceFog); // update fog distance
    }

    handleSkybox(value: boolean) {
        this.skyboxEnabled = value;
        this.updateSkyboxAndFog();
    }

    handleFog(value: boolean) {
        this.distanceFog = value;
        this.updateFog();
    }

    handleFogLevel(value: number) {
        this.fogLevel = value;
        this.updateFog();
    }

    updateSkyboxAndFog() {
        if (this.isPluginEnabled && this.skyboxEnabled) {
            if (this.skybox == null) {
                const loader = new document.game.THREE.CubeTextureLoader();
                this.skybox = loader.load([
                    SkyboxUriLeft,
                    SkyboxUriRight,
                    SkyboxUriUp,
                    SkyboxUriDown,
                    SkyboxUriBack,
                    SkyboxUriFront,
                ]);
            }
            document.game.GRAPHICS.scene.threeScene.background = this.skybox;
        } else {
            document.game.GRAPHICS.scene.threeScene.background = null;
            this.skybox = null;
        }

        this.handleFog(this.distanceFog); // update fog color
    }

    updateFog() {
        if (this.isPluginEnabled && this.distanceFog) {
            let color = 0x000000;
            if (this.skyboxEnabled) {
                color = 0xDEFDFF;
            }
            let far = this.renderDistance;
            let near = -1.0 + (far - (far * this.fogLevel));
            document.game.GRAPHICS.scene.threeScene.fog = new document.game.THREE.Fog(color, near, far);
        } else {
            document.game.GRAPHICS.scene.threeScene.fog = null;
        }
    }

    loginOK() {
        this.updateCameraMode();
        this.handleRenderDistance(this.renderDistance);
        this.handleSkybox(this.skyboxEnabled);
    }

    updateCameraMode() {
        if (document.game.WORLDMANAGER !== undefined) {
            document.game.WORLDMANAGER.updatePlayerTile.call(document.game.WORLDMANAGER);
        }

        if (document.game.GRAPHICS !== undefined) {
            if (this.isPluginEnabled && this.unlockCamera === true) {
                document.game.GRAPHICS.camera.controls.minDistance = this.minDistance;
                document.game.GRAPHICS.camera.controls.maxDistance = this.maxDistance;
                document.game.GRAPHICS.camera.controls.minPolarAngle = this.minAngle;
                document.game.GRAPHICS.camera.controls.maxPolarAngle = this.maxAngle;
            } else {
                document.game.GRAPHICS.camera.controls.minDistance = 8
                document.game.GRAPHICS.camera.controls.maxDistance = 8;
                document.game.GRAPHICS.camera.controls.minPolarAngle = document.game.THREE.MathUtils.degToRad(45);
                document.game.GRAPHICS.camera.controls.maxPolarAngle = document.game.THREE.MathUtils.degToRad(57);
            }
        }
    }

    /* some gross hack for a bug i dont quite understand but it seems to work so :shrug: - dpepls */
    Segment_load(segmentObjects: any, thisSegment: Segment): void {
        thisSegment.bb.min.x = Math.floor(Math.round(thisSegment.bb.min.x * 100) / 100) - 0.001;
        thisSegment.bb.min.y = Math.floor(Math.round(thisSegment.bb.min.y * 100) / 100) - 0.001;
        thisSegment.bb.max.x = Math.ceil(Math.round(thisSegment.bb.max.x * 100) / 100) + 0.001;
        thisSegment.bb.max.y = Math.ceil(Math.round(thisSegment.bb.max.y * 100) / 100) + 0.001;

    }
}
