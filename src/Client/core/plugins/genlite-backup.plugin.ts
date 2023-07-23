/*
    Copyright (C) 2023 dpeGit
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/

const IDBExportImport = require('indexeddb-export-import');

import { GenLiteConfirmation } from '../helpers/genlite-confirmation.class';
import { GenLitePlugin } from '../interfaces/plugin.class';

export class GenLiteExportPlugin extends GenLitePlugin {
    static pluginName = 'GenLiteExportPlugin';


    pluginSettings: Settings = {
        "Export Saved Data": {
            type: "button",
            value: "Export",
            stateHandler: this.exportData.bind(this)
        },
        "Import Saved Data": {
            type: "file",
            stateHandler: this.importData.bind(this)
        },
        "Clear Saved Data": {
            type: "button",
            value: "Clear",
            stateHandler: this.clearData.bind(this)
        }
    };

    async init() {

    }

    async postInit() {
        document.genlite.ui.registerPlugin("Inport/Export Data", "Genlite.Export.Enable", this.handlePluginState.bind(this), this.pluginSettings)
    }

    handlePluginState(state: boolean) {
        //TODO: Implement
    }

    async exportData() {
        let output = {
            db: null,
            storage: {},
        };
        const regex = /genlite/i;
        const regex2 = /highscores/i;
        const blackregex = /Client|UpdateTimestamp/i

        for (let key of Object.keys(localStorage)) {
            if ((regex.test(key) || regex2.test(key)) && !blackregex.test(key)) {
                output.storage[key] = localStorage[key];
            }
        }
        async function waitforExport() {
            return new Promise((resolve, reject) => {
                document.genlite.database.open(
                    function (db) {
                        IDBExportImport.exportToJsonString(db,
                            function (err, jsonString) {
                                if (err) {
                                    this.error(err)
                                    return reject();
                                }
                                output.db = jsonString;
                                resolve(null);
                            });
                    }
                )
            });
        }

        await waitforExport();

        /* actual export stuff */
        const link = document.createElement("a");
        const file = new Blob([JSON.stringify(output)], { type: "text/plain" });
        link.href = URL.createObjectURL(file);
        const date = new Date();
        link.download = `GenliteExport-${date.getFullYear()}-${date.getMonth()}-${date.getDay()}-${date.getHours()}-${date.getMinutes()}.genlite.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async importData(value, e) {
        if (!e) return;

        const file = e.target.files[0];
        const text = await file.text();
        const json = JSON.parse(text);

        for (let key of Object.keys(json.storage)) {
            localStorage.setItem(key, json.storage[key]);
        }

        document.genlite.database.open(
            function (db) {
                IDBExportImport.clearDatabase(db, function (err) {
                    if (err) {
                        this.error(err);
                        return
                    }
                    IDBExportImport.importFromJsonString(db, json.db, function (err) {
                        if (err) {
                            this.error(err);
                            return;
                        }
                        console.log("Datebase imported");
                    });
                });
            }
        );

        GenLiteConfirmation.confirmAlert(["Please refresh you game for the import to take effect"]);
    }

    async clearData() {
        const regex = /genlite/i;
        const regex2 = /highscores/i;
        const blackregex = /Client|UpdateTimestamp/i

        for (let key of Object.keys(localStorage)) {
            if ((regex.test(key) || regex2.test(key)) && !blackregex.test(key)) {
                localStorage.removeItem(key);
            }
        }

        document.genlite.database.open(
            function (db) {
                IDBExportImport.clearDatabase(db, function (err) {
                    if (err) {
                        this.error(err);
                        return
                    }
                });
            }
        );
    }
}
