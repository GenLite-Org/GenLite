/*
    Copyright (C) 2022-2023 dpeGit
*/
/*
    This file is part of GenLite.

    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/

import { GenLitePlugin } from '../core/interfaces/plugin.class';

export class GenLiteXpCalculator extends GenLitePlugin {
    static pluginName = 'GenLiteXpCalculatorPlugin';

    skillsList = {
        vitality: {
            numActions: 0,
            avgActionXP: 0,
            actionsToNext: 0,
            tsStart: 0,
            startXP: 0,
            trackerReference: null
        },
        attack: {},
        strength: {},
        defense: {},
        ranged: {},
        sorcery: {},
        cooking: {},
        forging: {},
        artistry: {},
        tailoring: {},
        whittling: {},
        evocation: {},
        survival: {},
        piety: {},
        logging: {},
        mining: {},
        botany: {},
        butchery: {},
        total: {
            numActions: 0,
            avgActionXP: 0,
            tsStart: 0,
            startXP: 0,
            gainedXP: 0
        }
    };
    totalXP;
    tracking;
    tracking_skill = "";
    isHookInstalled = false;

    isPluginEnabled: boolean = false;
    uiTab: HTMLElement = null;
    uiTabBody: HTMLElement = null;

    updateTimer: any = null;
    skillContext: HTMLDivElement = null;
    canvasHolder: HTMLDivElement = null;


    async init() {
        document.genlite.registerPlugin(this);
    }

    async postInit() {
        document.genlite.ui.registerPlugin("XP Calculator", null, this.handlePluginState.bind(this));
        this.createUITab();
        this.resetCalculatorAll();

        // Create a div element that should be used to display skill canvases, it will hold three skill canvases max, there should always be a canvas in the horizontal center of the screen
        // It will always be displaying but should be transparent and act purely as a container for the skill canvases, it will be allowed to take up 50% of the screen width and 150px of the screen height
        // The div element should be 25% from the left of the screen and 25% from the right of the screen
        // The skill canvases will be 150px wide and 150px tall, they will be positioned in the center of the screen and will be 50px apart from each other
        this.canvasHolder = document.createElement("div");
        this.canvasHolder.style.position = "absolute";
        this.canvasHolder.style.top = "50px";
        this.canvasHolder.style.width = "50%";
        this.canvasHolder.style.height = "150px";
        this.canvasHolder.style.backgroundColor = "transparent";
        this.canvasHolder.style.zIndex = "10000";
        this.canvasHolder.style.pointerEvents = "none";
        this.canvasHolder.style.display = "flex";
        this.canvasHolder.style.flexDirection = "row";
        this.canvasHolder.style.justifyContent = "center";
        this.canvasHolder.style.fontFamily = "Acme, sans-serif";
        this.canvasHolder.style.color = "white";


        // Center the canvas holder
        this.canvasHolder.style.left = "25%";
        this.canvasHolder.style.right = "25%";

        document.body.appendChild(this.canvasHolder);

        // Check if user is holding down the ALT key
        document.addEventListener("keydown", (e) => {
            if (e.altKey) {
                this.canvasHolder.style.pointerEvents = "auto";
            }
        }
        );

        // Check if user is no longer holding down the ALT key
        document.addEventListener("keyup", (e) => {
            if (!e.altKey) {
                this.canvasHolder.style.pointerEvents = "none";
            }
        }
        );
    }

    async loginOK(): Promise<void> {
        if (!this.updateTimer) {
            // Start the timer
            this.updateTimer = setInterval(this.updateUITrackingInformation.bind(this), 5000);
        }
        if (this.canvasHolder) {
            this.canvasHolder.style.display = "flex";
        }

    }

    async Network_logoutOK(): Promise<void> {
        if (this.updateTimer) {
            // Destroy the timer
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }


    updateUITrackingInformation() {
        // Call the update function for every skill
        for (let skillName in this.skillsList) {
            this.updateSkillInfo(skillName);
        }
    }

    handlePluginState(state: boolean): void {
        this.isPluginEnabled = state;
        if (this.uiTab) {
            this.uiTab.style.display = state ? "flex" : "none";
            this.uiTabBody.innerHTML = "";
        }

        this.resetCalculatorAll();

        /* if toggle on mid way through we have to run the init code */
        if (state) {
            this.initializeUI();
            this.PlayerInfo_updateSkills();
            this.updateTimer = setInterval(this.updateUITrackingInformation.bind(this), 5000);
        } else {
            // Destroy the timer
            clearInterval(this.updateTimer);

            // Delete any references to the skill info
            for (let skillName in this.skillsList) {
                if (this.skillsList[skillName].trackerReference !== null && this.skillsList[skillName].trackerReference !== undefined) {
                    this.skillsList[skillName].trackerReference = null;
                }
            }
        }
    }

    createUITab() {
        if (this.uiTab) {
            this.uiTab.remove();
        }

        this.uiTabBody = document.createElement("div");

        this.uiTab = document.genlite.ui.addTab("chart-simple", "XP Calculator", this.uiTabBody, this.isPluginEnabled);
    }


    createSkillInfo(skillName: string) {
        if (skillName === "total") {
            return;
        };

        let skill = this.skillsList[skillName];

        let skillInfo: HTMLElement = document.createElement("div");
        skillInfo.style.padding = "8px";


        let skillImageURL: string = null;
        let piSkill = document.game.PLAYER_INFO.skills[skillName]

        // Find the right skill in the skill container
        let allSkillContainers = document.getElementsByClassName("new_ux-player-info-modal__modal__window--stats__skill__container");
        for (let i = 0; i < allSkillContainers.length; i++) {
            let skillContainer = <HTMLElement>allSkillContainers[i];
            let skillNameElement = <HTMLElement>skillContainer.getElementsByClassName("new_ux-player-info-modal__modal__window--stats__section__list__name__text")[0];
            if (skillNameElement.innerText.toLowerCase() === skillName) {
                skillImageURL = skillContainer.getElementsByClassName("new_ux-player-info-modal__modal__window--stats__skill__icon__image")[0].getAttribute("src");
                break;
            }
        }

        let skillInfoContainer = document.createElement("div");
        skillInfoContainer.style.padding = "4px";
        skillInfoContainer.style.borderRadius = "5px";
        skillInfoContainer.style.backgroundColor = "rgba(30, 30, 30, 1)";
        skillInfo.appendChild(skillInfoContainer);

        let skillInfoGroup = document.createElement("div");
        skillInfoGroup.style.display = "flex";
        skillInfoGroup.id = "skillInfoGroup";
        skillInfoGroup.style.flexDirection = "row";
        skillInfoGroup.style.flexWrap = "nowrap";
        skillInfoGroup.style.justifyContent = "space-between";
        skillInfoGroup.style.alignItems = "center";
        skillInfoGroup.style.fontSize = "0.845em";
        skillInfoContainer.appendChild(skillInfoGroup);

        // Skill Image
        let skillImage = document.createElement("img");
        skillImage.src = skillImageURL;
        skillImage.style.width = "65px";
        skillImage.id = "skillImage"
        skillInfoGroup.appendChild(skillImage);

        // Create a Grouping Div for the Skill Calculations
        let skillCalculations = document.createElement("div");
        skillCalculations.style.display = "flex";
        skillCalculations.id = "skillCalculations";
        skillCalculations.style.flexDirection = "row";
        skillCalculations.style.flexWrap = "nowrap";
        skillCalculations.style.justifyContent = "space-evenly";
        skillCalculations.style.width = "100%";
        skillInfoGroup.appendChild(skillCalculations);

        // Skill Calc Set 1
        let skillCalculations1 = document.createElement("div");
        skillCalculations1.style.display = "flex";
        skillCalculations1.id = "skillCalculations1";
        skillCalculations1.style.flexDirection = "column";
        skillCalculations1.style.alignItems = "self-start";
        skillCalculations.appendChild(skillCalculations1);
        

        // XP Gained
        let xpGained = document.createElement("span");
        xpGained.id = "xpGained";
        xpGained.innerText = `XP Tracked: ${skill.startXP == 0 ? 0 : this.prettyPrintNumber(((piSkill.xp - skill.startXP) / 10))}`;
        skillCalculations1.appendChild(xpGained);

        // XP/Hour
        let xpRate = 0;
        let timeDiff = Date.now() - skill.tsStart;
        if (skill.tsStart != 0) {
            xpRate = Math.round((piSkill.xp - skill.startXP) / (timeDiff / 3600000)) / 10;
        }

        let xpHour = document.createElement("span");
        xpHour.id = "xpHour";
        xpHour.style.marginTop = "5px";
        xpHour.innerText = `XP/Hour: ${this.prettyPrintNumber(xpRate)}`;
        skillCalculations1.appendChild(xpHour);


        // The remaining information is shown on a new line
        let skillCalculations2 = document.createElement("div");
        skillCalculations2.id = "skillCalculations2";
        skillCalculations2.style.display = "flex";
        skillCalculations2.style.flexDirection = "column";
        skillCalculations2.style.alignItems = "self-end";
        skillCalculations.appendChild(skillCalculations2);

        // XP Left
        let xpLeft = document.createElement("span");
        xpLeft.id = "xpLeft";
        xpLeft.innerText = `XP Left: ${this.prettyPrintNumber(piSkill.tnl / 10)}`;
        skillCalculations2.appendChild(xpLeft);

        // Actions
        let actions = document.createElement("span");
        actions.innerText = `Actions: ${this.prettyPrintNumber(skill.actionsToNext)}`;
        actions.id = "actions";
        actions.style.marginTop = "5px";
        skillCalculations2.appendChild(actions);

        // Progress Bar
        let progressBar = document.createElement("div");
        progressBar.style.width = "100%";
        progressBar.style.height = "19px";
        progressBar.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        progressBar.style.marginTop = "10px";
        progressBar.style.marginBottom = "10px";
        progressBar.style.overflow = "hidden";
        progressBar.id = "progressBar";
        skillInfoContainer.appendChild(progressBar);

        let progressBarFill = document.createElement("div");
        progressBarFill.style.width = `${piSkill.percent}%`;
        progressBarFill.style.height = "100%";
        progressBarFill.style.backgroundColor = "green";
        progressBarFill.id = "progressBarFill";
        progressBar.appendChild(progressBarFill);

        // Show the percentage of the progress bar (centered in the progress bar)
        let progressBarPercent = document.createElement("span");
        progressBarPercent.innerText = `${Math.round(piSkill.percent*10)/10}%`;
        progressBarPercent.style.position = "absolute";
        progressBarPercent.style.left = "45%";
        progressBarPercent.style.fontSize = "0.9em";
        progressBarPercent.id = "progressBarPercent";
        progressBarFill.appendChild(progressBarPercent);

        // Show the current level (left in the progress bar)
        let progressBarLevel = document.createElement("span");
        progressBarLevel.innerText = `Level ${piSkill.level}`;
        progressBarLevel.style.position = "absolute";
        progressBarLevel.style.left = "15px";
        progressBarLevel.style.fontSize = "0.9em";
        progressBarLevel.id = "progressBarLevel";
        progressBarFill.appendChild(progressBarLevel);

        // Show the next level (right in the progress bar)
        let progressBarNextLevel = document.createElement("span");
        progressBarNextLevel.innerText = `Level ${piSkill.level + 1}`;
        progressBarNextLevel.style.position = "absolute";
        progressBarNextLevel.style.right = "15px";
        progressBarNextLevel.style.fontSize = "0.9em";
        progressBarNextLevel.id = "progressBarNextLevel";
        progressBarFill.appendChild(progressBarNextLevel);
        
        // When the user hovers over the progress bar, show a tool tip with the time remaining to the next level
        progressBar.onmouseover = () => {
            progressBarLevel.innerText = 'Time to Level:';
            progressBarNextLevel.innerText = '';
            progressBarFill.style.backgroundColor = "red";
            if (this.skillsList[skillName].tsStart != 0) {
                let xpRate = 0;
                let timeDiff = Date.now() - skill.tsStart;
                if (skill.tsStart != 0) {
                    xpRate = Math.round((piSkill.xp - skill.startXP) / (timeDiff / 3600000)) / 10;
                }
                let ttl = Math.round(piSkill.tnl / xpRate) / 10;
                progressBarPercent.innerText = ttl.toLocaleString("en-US") + " hours";
            }  else {
                progressBarPercent.innerText = "Infinite";
            }

        }
        progressBar.onmouseout = () => {
            progressBarFill.style.backgroundColor = "green";
            progressBarPercent.innerText = `${Math.round(piSkill.percent*10)/10}%`;
            progressBarLevel.innerText = `Level ${piSkill.level}`;
            progressBarNextLevel.innerText = `Level ${piSkill.level + 1}`;
        }
        

        // Button Div
        let buttonDiv = document.createElement("div");
        buttonDiv.style.display = "flex";
        buttonDiv.style.flexDirection = "row";
        buttonDiv.style.alignItems = "center";
        buttonDiv.style.justifyContent = "space-evenly";
        buttonDiv.id = "buttonDiv";
        skillInfoContainer.appendChild(buttonDiv);


        // Add an X button to remove the skill from the tracker in the top right corner of the skill info
        let removeSkillButton = document.createElement("button");
        removeSkillButton.innerText = "[Remove Tracker]";
        removeSkillButton.style.backgroundColor = "transparent";
        removeSkillButton.style.border = "none";
        removeSkillButton.style.color = "white";
        removeSkillButton.style.fontSize = "0.75em";
        removeSkillButton.style.fontWeight = "bold";
        removeSkillButton.style.cursor = "pointer";
        removeSkillButton.onclick = () => {
            skillInfo.remove();
            this.skillsList[skillName].trackerReference = null;
        };
        buttonDiv.appendChild(removeSkillButton);

        // Add a button to reset the skill tracker
        let resetSkillButton = document.createElement("button");
        resetSkillButton.innerText = "[Reset Tracker]";
        resetSkillButton.style.backgroundColor = "transparent";
        resetSkillButton.style.border = "none";
        resetSkillButton.style.color = "white";
        resetSkillButton.style.fontSize = "0.75em";
        resetSkillButton.style.fontWeight = "bold";
        resetSkillButton.style.cursor = "pointer";
        resetSkillButton.onclick = () => {
            this.resetCalculator(skillName);
        };
        buttonDiv.appendChild(resetSkillButton);

        // Add the skill info to the UI
        this.uiTabBody.appendChild(skillInfo);

        // Modify the skillInfo to allow named access to the elements
        const skillTrackerReference = {
            container: skillInfo,
            xpGained: xpGained,
            xpHour: xpHour,
            xpLeft: xpLeft,
            actions: actions,
            progressBar: progressBar,
            progressBarFill: progressBarFill,
            progressBarPercent: progressBarPercent,
            progressBarLevel: progressBarLevel,
            progressBarNextLevel: progressBarNextLevel,
            removeSkillButton: removeSkillButton,
            resetSkillButton: resetSkillButton
        };


        this.skillsList[skillName].trackerReference = skillTrackerReference;

        // Add a check to see if the user right clicks on the skill info
        skillInfo.oncontextmenu = (e) => {
            e.preventDefault();

            if (this.skillContext) {
                this.skillContext.remove();
            }

            // Add an option to "Add to Canvas" if the user right clicks on the skill info
            this.skillContext = document.createElement("div");
            this.skillContext.innerText = "Add to Canvas";
            this.skillContext.style.position = "absolute";
            this.skillContext.style.top = e.clientY + "px";
            this.skillContext.style.left = e.clientX + "px";
            this.skillContext.style.backgroundColor = "#383838";
            this.skillContext.style.border = "1px solid black";
            this.skillContext.style.fontFamily = "Acme";
            this.skillContext.style.color = "white";
            this.skillContext.style.padding = "5px";
            this.skillContext.style.cursor = "pointer";
            this.skillContext.style.zIndex = "10001";
            this.skillContext.style.borderRadius = "10px";
            this.skillContext.style.boxShadow = "0px 0px 2px 0px black";
            this.skillContext.onclick = () => {
                // Place a copy of the skill info on the canvas
  
                let newTrackerReference = this.createSkillInfoCanvas(skillName, skillInfo, skillTrackerReference);

                // set the the tracker reference to null so that the skill info can be removed from the canvas
                this.skillsList[skillName].trackerReference = newTrackerReference;

                // Remove the skill info from the UI
                skillInfo.remove();

                this.skillContext.remove();
            }

            document.body.appendChild(this.skillContext);
        }

        document.addEventListener("click", (e) => {
            if (this.skillContext && e.target !== this.skillContext) {
                this.skillContext.remove();
            }
        });


    }

    createSkillInfoCanvas(skillName, skillUI, trackerReference) {
        let skillInfoCopy = skillUI.cloneNode(true) as HTMLDivElement;
        skillInfoCopy.style.width = "250px";
        skillInfoCopy.style.height = "150px";
        
        let firstChild = skillInfoCopy.children[0] as HTMLElement;
        firstChild.style.backgroundColor = "#1e1e1ebf";

        // Remove all of the buttons from the copy
        let buttons = skillInfoCopy.querySelectorAll("button");
        buttons.forEach((button) => {
            button.remove();
        });

        // Set the image width to be 45px
        let image = skillInfoCopy.querySelector("img");
        image.style.width = "45px";

        // Set the skill info group to have a height of 45px
        let skillInfoGroup = skillInfoCopy.querySelector("#skillInfoGroup") as HTMLDivElement;
        skillInfoGroup.style.height = "45px";


        // Rereference the skill info elements to the copy
        trackerReference.container = skillInfoCopy;
        trackerReference.xpGained = skillInfoCopy.querySelector("#xpGained");
        trackerReference.xpHour = skillInfoCopy.querySelector("#xpHour");
        trackerReference.xpLeft = skillInfoCopy.querySelector("#xpLeft");
        trackerReference.actions = skillInfoCopy.querySelector("#actions");
        trackerReference.progressBar = skillInfoCopy.querySelector("#progressBar");
        trackerReference.progressBarFill = skillInfoCopy.querySelector("#progressBarFill");
        trackerReference.progressBarPercent = skillInfoCopy.querySelector("#progressBarPercent");
        trackerReference.progressBarLevel = skillInfoCopy.querySelector("#progressBarLevel");
        trackerReference.progressBarNextLevel = skillInfoCopy.querySelector("#progressBarNextLevel");


        // Add just trackerReference.progressBar to have margin-bottom of 5px
        trackerReference.progressBar.style.marginBottom = "5px";

        // Create a div to hold progressBarFill elements
        let progressBarFillContainer = document.createElement("div");
        progressBarFillContainer.style.width = "100%";

        // The current container for progressBarLevel, progressBarNextLevel, and progressBarPercent is progressBarFill, so we need to instead make their parent progressBar
        trackerReference.progressBarLevel.parentElement.removeChild(trackerReference.progressBarLevel);
        trackerReference.progressBarNextLevel.parentElement.removeChild(trackerReference.progressBarNextLevel);
        trackerReference.progressBarPercent.parentElement.removeChild(trackerReference.progressBarPercent);
        trackerReference.progressBarFill.parentElement.removeChild(trackerReference.progressBarFill);


        // Add the progressBarFill elements to the progressBarFillContainer
        progressBarFillContainer.appendChild(trackerReference.progressBarLevel);
        progressBarFillContainer.appendChild(trackerReference.progressBarPercent);
        progressBarFillContainer.appendChild(trackerReference.progressBarNextLevel);
        progressBarFillContainer.appendChild(trackerReference.progressBarFill);

        // Adjust the z-index of the progressBarFill elements
        trackerReference.progressBarLevel.style.zIndex = "999";
        trackerReference.progressBarNextLevel.style.zIndex = "999";
        trackerReference.progressBarPercent.style.zIndex = "999";

        trackerReference.progressBarLevel.style.position = "relative";
        trackerReference.progressBarLevel.style.left = "0px";
        trackerReference.progressBarLevel.style.float = "left";

        trackerReference.progressBarNextLevel.style.position = "relative";
        trackerReference.progressBarNextLevel.style.left = "0px";
        trackerReference.progressBarNextLevel.style.float = "right";

        trackerReference.progressBarPercent.style.position = "relative";

        // Remove left from progressBarPercent
        trackerReference.progressBarPercent.style.left = "0px";


        // Progress Bar align text center
        trackerReference.progressBar.style.textAlign = "center";

        trackerReference.progressBar.appendChild(progressBarFillContainer);

        // Fix progressBarFill height, top, z-index, left, and position
        trackerReference.progressBarFill.style.height = "19px";
        trackerReference.progressBarFill.style.top = "-20px";
        trackerReference.progressBarFill.style.zIndex = "5";
        trackerReference.progressBarFill.style.left = "0px";
        trackerReference.progressBarFill.style.position = "relative";
        
        this.canvasHolder.appendChild(skillInfoCopy);



        // Add a check to see if the user right clicks on the skill info
        skillInfoCopy.oncontextmenu = (e) => {
            e.preventDefault();

            if (this.skillContext) {
                this.skillContext.remove();
            }

            // Add an option to "Add to Canvas" if the user right clicks on the skill info
            this.skillContext = document.createElement("div");
            this.skillContext.innerText = "Remove from Canvas";
            this.skillContext.style.position = "absolute";
            this.skillContext.style.top = e.clientY + "px";
            this.skillContext.style.left = e.clientX + "px";
            this.skillContext.style.backgroundColor = "#383838";
            this.skillContext.style.border = "1px solid black";
            this.skillContext.style.fontFamily = "Acme";
            this.skillContext.style.color = "white";
            this.skillContext.style.padding = "5px";
            this.skillContext.style.cursor = "pointer";
            this.skillContext.style.zIndex = "10001";
            this.skillContext.style.borderRadius = "10px";
            this.skillContext.style.boxShadow = "0px 0px 2px 0px black";
            this.skillContext.onclick = () => {
                
                // Remove the skill info from the UI
                skillInfoCopy.remove();
                this.skillContext.remove();

                // Create a new skill info element and add it to the UI
                this.createSkillInfo(skillName);
            }

            document.body.appendChild(this.skillContext);
        }

        return trackerReference;
    }

    updateSkillInfo(skillName) {
        let skill = this.skillsList[skillName];
        if (skill.trackerReference == null) return;

        let skillInfo = skill.trackerReference;
        let piSkill = document.game.PLAYER_INFO.skills[skillName];

        // XP Gained
        skillInfo.xpGained.innerText = `XP Tracked: ${skill.startXP == 0 ? 0 : this.prettyPrintNumber(((piSkill.xp - skill.startXP) / 10))}`;


        // XP/Hour
        let xpRate = 0;
        let timeDiff = Date.now() - skill.tsStart;
        if (skill.tsStart != 0) {
            xpRate = Math.round((piSkill.xp - skill.startXP) / (timeDiff / 3600000)) / 10;
        }

        // XP/Hour
        skillInfo.xpHour.innerText = `XP/Hour: ${this.prettyPrintNumber(xpRate)}`;

        // XP Left
        skillInfo.xpLeft.innerText = `XP Left: ${this.prettyPrintNumber(piSkill.tnl / 10)}`;

        // Actions
        skillInfo.actions.innerText = `Actions: ${this.prettyPrintNumber(skill.actionsToNext)}`;

        // Progress Bar
        skillInfo.progressBarFill.style.width = `${piSkill.percent}%`;

        // if currently moused over the progress bar, show the time to level instead of the percent
        if (skillInfo.progressBarFill.style.backgroundColor == "red") {
            if (skill.tsStart != 0) {
                let xpRate = 0;
                let timeDiff = Date.now() - skill.tsStart;
                if (skill.tsStart != 0) {
                    xpRate = Math.round((piSkill.xp - skill.startXP) / (timeDiff / 3600000)) / 10;
                }
                let ttl = Math.round(piSkill.tnl / xpRate) / 10;
                skillInfo.progressBarPercent.innerText = ttl.toLocaleString("en-US") + " hours";
            } else {
                skillInfo.progressBarPercent.innerText = "Infinite";
            }

        } else {
            // Progress Bar Percent
            skillInfo.progressBarPercent.innerText = `${Math.round(piSkill.percent*10)/10}%`;

            // Progress Bar Current Level
            skillInfo.progressBarLevel.innerText = `Level ${piSkill.level}`;

            // Progress Bar Next Level
            skillInfo.progressBarNextLevel.innerText = `Level ${piSkill.level + 1}`;
        }
    }


    /* we need the UI to be initalized before hooking */
    initializeUI() {
        if (!this.isPluginEnabled || this.isHookInstalled) {
            return;
        }
        let toolTipRoot = document.getElementsByClassName("new_ux-player-info-modal__modal__window--stats__skill__container");
        let totLevelRoot = <HTMLElement>document.getElementsByClassName("new_ux-player-info-modal__modal__window--stats__section__list__row")[1];
        for (let i = 0; i < 18; i++) {
            let tooltip = <HTMLElement>toolTipRoot[i];
            tooltip.onmouseenter = this.installEventHook(tooltip.onmouseenter, this.onmouseenter, this);
            tooltip.onmousedown = this.installEventHook(tooltip.onmousedown, this.onmousedown, this)
        }
        // set up the tool tip for total levels
        totLevelRoot.onmouseenter = (event) => (this.totalLevelCalc(event, this));
        totLevelRoot.onmousedown = (event) => (this.onmousedown(event, this));
        totLevelRoot.onmousemove = (<HTMLElement>toolTipRoot[0]).onmousemove;
        totLevelRoot.onmouseleave = (<HTMLElement>toolTipRoot[0]).onmouseleave;
        this.isHookInstalled = true
    }

    /* when an xp update comes calculate skillsList fields */
    PlayerInfo_updateXP(xp) {
        if (!this.isPluginEnabled) {
            return;
        }

        // this section feels ugly and should be cleaned up
        [xp.skill, "total"].forEach(element => {
            let skill = this.skillsList[element];
            let avg = skill.avgActionXP;
            avg *= skill.numActions;
            avg += xp.xp;
            skill.numActions++;
            skill.avgActionXP = avg / skill.numActions;
            if (element == "total")
                skill.gainedXP += xp.xp;
            if (element != "total")
                skill.actionsToNext = Math.ceil(document.game.PLAYER_INFO.skills[element].tnl / skill.avgActionXP);
            if (skill.tsStart == 0) {
                skill.tsStart = Date.now();
                if (element != "total")
                    skill.startXP = document.game.PLAYER_INFO.skills[element].xp - xp.xp;
            }


            if (skill.trackerReference == null || skill.trackerReference == undefined) {
                this.createSkillInfo(element);
            } else {
                this.updateSkillInfo(element);
            }

        });
    }

    /* onmouseenter fill out tooltip with additional info */
    onmouseenter(event, callback_this) {
        if (!callback_this.isPluginEnabled) {
            return;
        }
        callback_this.tracking_skill = document.game.PLAYER_INFO.tracking_skill.id;
        let div = <HTMLElement>document.getElementById("skill_status_popup");
        let piSkill = document.game.PLAYER_INFO.skills[document.game.PLAYER_INFO.tracking_skill.id];
        let skill = callback_this.skillsList[document.game.PLAYER_INFO.tracking_skill.id];
        let xpRate = 0;
        let timeDiff = Date.now() - skill.tsStart;
        if (skill.tsStart != 0) {
            xpRate = Math.round((piSkill.xp - skill.startXP) / (timeDiff / 3600000)) / 10;
        }
        let ttl = Math.round(piSkill.tnl / xpRate) / 10;
        div.innerHTML += `
            <div>XP per Action: ${(Math.round(skill.avgActionXP) / 10).toLocaleString("en-US")}</div>
            <div>Action TNL: ${skill.actionsToNext.toLocaleString("en-US")}</div>
            <div>XP per Hour: ${xpRate.toLocaleString("en-US")}</div>
            <div>Time to Level: ${ttl.toLocaleString("en-US")}</div>
            <div>XP Tracked: ${skill.startXP == 0 ? 0 : ((piSkill.xp - skill.startXP) / 10).toLocaleString("en-US")}`;
    }

    /* clicking on a skill with shift will reset it
         ctrl-shift will reset them all
    */
    onmousedown(event, callback_this) {
        if (!callback_this.isPluginEnabled) {
            return;
        }
        if (event.shiftKey && event.ctrlKey) {
            callback_this.resetCalculatorAll(event);
        } else if (event.shiftKey) {
            let skill = callback_this.tracking_skill;
            callback_this.resetCalculator(skill, event);
        }
    }

    /* if tooltip is update just run onmouseenter() again */
    PlayerInfo_updateTooltip() {
        if (!this.isPluginEnabled) {
            return;
        }
        if (document.game.PLAYER_INFO.tracking && this.tracking_skill != "total") {
            this.onmouseenter(null, this);
        } else if (document.game.PLAYER_INFO.tracking && this.tracking_skill == "total") {
            this.totalLevelCalc(null, this);
        }
    }

    /* calculates tot exp on login */
    PlayerInfo_updateSkills() {
        if (!this.isPluginEnabled) {
            return;
        }
        if (this.skillsList.total.startXP != 0) //updateSkills sometimes runs additional times, I dont know why
            return;
        for (let i in this.skillsList) {
            if (i == "total")
                continue;
            this.skillsList.total.startXP += document.game.PLAYER_INFO.skills[i].xp;
        }
    }

    /* simple hook that runs this.onmouseenter() after the game function */
    installEventHook(eventBase, callback, callback_this) {
        let oldE = eventBase;
        if (typeof eventBase != 'function') // if event base isnt a function just set the callback
            return (event) => { callback(event, callback_this) };
        let newE = (event) => { oldE(event); callback(event, callback_this); };
        return newE;
    }

    /* format for the total xp tooltip
        may be called as an event callback or independantly
    */
    totalLevelCalc(event, callback_this) {
        if (!callback_this.isPluginEnabled)
            return;
        document.game.PLAYER_INFO.tracking = true;
        callback_this.tracking_skill = "total"
        let total = callback_this.skillsList.total;
        let div = document.getElementById("skill_status_popup");
        let xp = (total.startXP + total.gainedXP) / 10;
        let xpRate = 0;
        let timeDiff = Date.now() - total.tsStart;
        if (total.tsStart != 0) {
            xpRate = Math.round(total.gainedXP / (timeDiff / 3600000)) / 10;
        }
        div.innerHTML = `
        <div>Total</div>
        <div>Current XP: ${xp.toLocaleString("en-US")}</div>
        <div>Gained XP: ${(total.gainedXP / 10).toLocaleString("en-US")}</div>
        <div>XP per Action: ${(Math.round(total.avgActionXP) / 10).toLocaleString("en-US")}</div>
        <div>XP per hour: ${xpRate.toLocaleString("en-US")}</div>
        `;
        if (event) { //if its an event update he poistion of the tooltip
            div.style.left = event.clientX + 15 + "px";
            div.style.top = event.clientY + 15 + "px";
            div.style.display = 'block';
        }
    }

    /* resets calculator without requiring a reload */
    resetCalculator(skill, event = null) {
        let temp = {
            numActions: 0,
            avgActionXP: 0,
            actionsToNext: 0,
            tsStart: 0,
            startXP: 0,
            gainedXP: 0,
            trackerReference: this.skillsList[skill].trackerReference
        }
        if (skill == "total") {
            delete temp.actionsToNext;
            let xp = this.skillsList.total.startXP + this.skillsList.total.gainedXP;
            this.skillsList.total = temp;
            this.skillsList.total.startXP = xp;
            this.skillsList.total.gainedXP = 0;
            this.totalLevelCalc(event, this);
            document.game.PLAYER_INFO.tracking = false;
            return;
        } else {
            let piSkill = document.game.PLAYER_INFO.skills[skill];
            temp.startXP = piSkill.xp;
            temp.actionsToNext = piSkill.tnl;
        }
        delete temp.gainedXP;
        this.skillsList[skill] = temp;

        this.updateSkillInfo(skill);

        if (this.isHookInstalled && document.game.PLAYER_INFO.tracking_skill && document.game.PLAYER_INFO.tracking_skill.group)
            document.game.PLAYER_INFO.updateTooltip();


    }

    resetCalculatorAll(event = null) {
        for (let i in this.skillsList) {
            this.resetCalculator(i, event);
        }
    }

    prettyPrintNumber(num) {
        if (!isFinite(num)) {
            return "∞"
        }

        // Converts number to 1.2k, 1.2m, 1.2b, etc.
        if (num < 1000) {
            return num;
        }
        let exp = Math.floor(Math.log(num) / Math.log(1000));
        let suffix = "kmb"[exp - 1];
        return (num / Math.pow(1000, exp)).toFixed(1) + suffix;
    }
}
