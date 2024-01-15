// ==UserScript==
// @name         GenLite-GenLite-Org
// @namespace    GenLite-GenLite-Org
// @version      0.2.29
// @description  try to take over the world!
// @author       https://github.com/Retoxified/GenLite/blob/main/CREDITS.md
// @match        https://play.genfanad.com/play/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=genfanad.com
// @run-at       document-start
// ==/UserScript==

/*
    Copyright (C) 2022-2023 Retoxified, dpeGit, snwhd, BonesdogNardwe, KKonaOG, FrozenReality, Xortrox
*/
/*
    This file is part of GenLite.
    GenLite is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
    GenLite is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
    You should have received a copy of the GNU General Public License along with Foobar. If not, see <https://www.gnu.org/licenses/>.
*/

(()=>{"use strict";var __webpack_modules__={832:e=>{e.exports=JSON.parse('{"type":"release","repoOwner":"GenLite-Org"}')}},__webpack_module_cache__={};function __webpack_require__(e){var t=__webpack_module_cache__[e];if(void 0!==t)return t.exports;var n=__webpack_module_cache__[e]={exports:{}};return __webpack_modules__[e](n,n.exports,__webpack_require__),n.exports}var __webpack_exports__={};(()=>{var githubConfig=__webpack_require__(832),targetFork=localStorage.getItem("GenLite.Fork"),targetForkDownload="https://raw.githubusercontent.com/".concat(targetFork,"/GenLite/release/dist/genliteClient.user.js");null==targetFork||"release"==githubConfig.type?(targetFork="https://api.github.com/repos/GenLite-Org/GenLite/releases/latest",targetForkDownload="https://raw.githubusercontent.com/GenLite-Org/GenLite/release/dist/genliteClient.user.js",localStorage.setItem("GenLite.Fork","GenLite-Org")):githubConfig.repoOwner=targetFork;var genliteUpdateTimestamp=localStorage.getItem("GenLite.UpdateTimestamp");null==genliteUpdateTimestamp&&(localStorage.setItem("GenLite.UpdateTimestamp",new Date(0).toString()),genliteUpdateTimestamp=localStorage.getItem("GenLite.UpdateTimestamp"));var genliteUpdateTimestampDate=new Date(genliteUpdateTimestamp),genfanadUpdateTimestamp=localStorage.getItem("GenFanad.UpdateTimestamp");null==genfanadUpdateTimestamp&&(localStorage.setItem("GenFanad.UpdateTimestamp",new Date(0).toString()),genfanadUpdateTimestamp=localStorage.getItem("GenFanad.UpdateTimestamp"));var genfanadUpdateTimestampDate=new Date(genfanadUpdateTimestamp),genliteLastModified,genfanadLastModified,xhrGenfanadModified=new XMLHttpRequest;xhrGenfanadModified.open("HEAD","https://play.genfanad.com/play/js/client.js",!1),xhrGenfanadModified.setRequestHeader("Cache-Control","no-cache, no-store, must-revalidate"),xhrGenfanadModified.send();var genfanadModifiedDate=xhrGenfanadModified.getResponseHeader("Last-Modified"),releasesUrl,distUrl;if(genfanadLastModified=null==genfanadModifiedDate||null==genfanadModifiedDate?new Date(0):new Date(genfanadModifiedDate),"release"==githubConfig.type)releasesUrl="https://api.github.com/repos/".concat(githubConfig.repoOwner,"/GenLite/releases/latest"),distUrl="https://raw.githubusercontent.com/".concat(githubConfig.repoOwner,"/GenLite/release/dist/genliteClient.user.js");else{var release=new XMLHttpRequest;release.open("GET","https://api.github.com/repos/".concat(githubConfig.repoOwner,"/GenLite/releases"),!1),release.setRequestHeader("Accept","application/vnd.github.v3+json"),release.send();var releasesArray=eval(release.responseText);releasesUrl=releasesArray[0].url,distUrl="https://raw.githubusercontent.com/".concat(githubConfig.repoOwner,"/GenLite/beta/dist/genliteClient.user.js")}var xhrGenliteModified=new XMLHttpRequest;xhrGenliteModified.open("GET",releasesUrl,!1),xhrGenliteModified.setRequestHeader("Accept","application/vnd.github.v3+json"),xhrGenliteModified.send();var genliteAPIRespose=JSON.parse(xhrGenliteModified.responseText),genliteModifiedDate=genliteAPIRespose.published_at,genliteVersion=genliteAPIRespose.tag_name;genliteLastModified=null==genliteModifiedDate||null==genliteModifiedDate?new Date(0):new Date(genliteModifiedDate);var genfanadJS=localStorage.getItem("GenFanad.Client"),xhrClientJS=new XMLHttpRequest;xhrClientJS.open("GET","https://play.genfanad.com/play/js/client.js"),xhrClientJS.onload=function(){200==xhrClientJS.status?(genfanadJS=(genfanadJS=(genfanadJS=xhrClientJS.responseText).replace(/import.meta.url/g,'("https://play.genfanad.com/play/js/client.js")')).substring(0,genfanadJS.length-5)+"; document.client = {};document.client.get = function(a) {return eval(a);};document.client.set = function(a, b) {eval(a + ' = ' + b);};"+genfanadJS.substring(genfanadJS.length-5)+"//# sourceURL=client.js",localStorage.setItem("GenFanad.Client",genfanadJS)):console.error("GenFanad Client.js failed to load. Status: "+xhrClientJS.status),localStorage.setItem("GenFanad.UpdateTimestamp",genfanadLastModified.toString())},xhrClientJS.send();var needsUpdate=genliteLastModified>genliteUpdateTimestampDate||null==localStorage.getItem("GenLite.Client")||null==localStorage.getItem("GenLite.Client");if(needsUpdate)document.addEventListener("DOMContentLoaded",(function(){document.documentElement.innerHTML="";var e=document.createElement("link");e.rel="stylesheet",e.href="https://fonts.googleapis.com/css2?family=Acme&display=swap",document.head.appendChild(e),document.body.style.fontFamily="Acme, sans-serif",document.documentElement.style.backgroundColor="black";var t=document.createElement("div");t.style.position="fixed",t.style.top="0",t.style.left="0",t.style.width="100%",t.style.height="100%",t.style.backgroundImage="url(https://i.imgur.com/KutJ1gO.png)",t.style.zIndex="99",t.style.filter="blur(5px)",t.style.backgroundSize="cover",t.style.backgroundRepeat="no-repeat",t.style.backgroundPosition="center",document.body.appendChild(t);var n=document.createElement("div");n.style.position="absolute",n.style.top="0",n.style.left="0",n.style.width="100%",n.style.height="100%",n.style.backgroundColor="black",n.style.opacity="0.5",n.style.filter="blur(5px)",t.appendChild(n);var a=document.createElement("div");a.id="genlite-confirm-modal",a.style.position="fixed",a.style.top="50%",a.style.left="50%",a.style.width="40%",a.style.transform="translate(-50%, -50%)",a.style.zIndex="100",document.documentElement.appendChild(a);var i=document.createElement("div");i.id="genlite-confirm-header",i.style.backgroundImage='url("https://genfanad-static.s3.us-east-2.amazonaws.com/versioned/0.120/data_client/img/new_ux/login_screen_images/generic_modal_top.png")',i.style.backgroundSize="100%, 100%",i.style.width="100%",i.style.aspectRatio="2106/310",a.appendChild(i);var o=document.createElement("div");o.style.backgroundImage='url("https://genfanad-static.s3.us-east-2.amazonaws.com/versioned/0.120/data_client/img/new_ux/login_screen_images/modal_title.png")',o.style.position="fixed",o.style.width="40%",o.style.aspectRatio="632/120",o.style.backgroundSize="100%, 100%",o.style.top="0",o.style.left="50%",o.style.transform="translate(-50%, -25%)",o.style.textAlign="center",o.style.textShadow="-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000",o.style.fontFamily="acme,times new roman,Times,serif",o.style.fontSize="1.5rem",o.style.color="white",o.style.overflow="hidden",o.style.display="flex",o.style.justifyContent="center",o.style.alignContent="center",o.style.flexDirection="column",o.innerText="GenLite is out of date!",i.appendChild(o);var l=document.createElement("div");l.id="genlite-confirm-body",l.style.backgroundImage='url("https://genfanad-static.s3.us-east-2.amazonaws.com/versioned/0.120/data_client/img/new_ux/login_screen_images/generic_modal_mid_and_bottom.png")',l.style.backgroundSize="100%, 100%",l.style.width="100%",l.style.aspectRatio="2104/1316",l.style.textAlign="center",l.style.textShadow="-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000",l.style.fontFamily="acme,times new roman,Times,serif",l.style.fontSize="1.5rem",l.style.color="white",a.appendChild(l);var s=document.createElement("div");s.style.width="90%",s.style.height="75%",s.style.margin="auto",s.style.overflowY="scroll",l.appendChild(s);var r=document.createElement("span");r.style.display="inline-block",r.style.width="75%",r.style.textAlign="center",r.style.paddingBottom="2em",r.innerText="A new version of GenLite is available. It is highly recommended that you update to the latest version, as older versions may not work properly. If you choose to continue with this version, you may experience issues or bugs that have been fixed in the latest version. You will only be notified of this update once.",s.appendChild(r);var d=document.createElement("div");d.style.backgroundImage='url("https://genfanad-static.s3.us-east-2.amazonaws.com/versioned/0.120/data_client/img/new_ux/login_screen_images/return_button.png")',d.style.backgroundSize="100%, 100%",d.style.width="15%",d.style.aspectRatio="131/52",d.style.position="fixed",d.style.top="100%",d.style.left="40%",d.style.transform="translate(-50%, -175%)",d.style.display="flex",d.style.justifyContent="center",d.style.alignContent="center",d.style.flexDirection="column",d.style.cursor="pointer",d.innerText="Update Now",d.onclick=function(e){localStorage.setItem("GenLite.UpdateTimestamp",genliteLastModified.toString());var t=new XMLHttpRequest;t.open("GET",distUrl),t.onload=function(){if(200==t.status){var e=t.responseText;localStorage.setItem("GenLite.Client",e),localStorage.setItem("GenLite.Version",genliteVersion),setTimeout((function(){window.location.reload()}),100)}else r.innerText="\n                    An error occurred while trying to update GenLite. Please try again later. \n                    Please report this issue in the GenLite Discord server with following information:\n\n\n                    Error Code: ".concat(t.status),t.statusText&&(r.innerText+="\nError Status: ".concat(t.statusText)),r.innerText+="\n                    Error Response: ".concat(t.responseText,"\n\n                    Target URL: ").concat(githubConfig.distUrl,"\n\n                    \nIf you continue to see this message, please clear your browser cache and try again.\n"),d.innerText="Try Again",d.onclick=function(e){window.location.reload()},c.innerText="Continue Anyway",c.onclick=function(e){a.style.display="none"}},t.send()},s.appendChild(d);var c=document.createElement("div");c.style.backgroundImage='url("https://genfanad-static.s3.us-east-2.amazonaws.com/versioned/0.120/data_client/img/new_ux/crafting/crafting_2/make_all.png")',c.style.backgroundSize="100%, 100%",c.style.width="15%",c.style.aspectRatio="188/72",c.style.position="fixed",c.style.top="100%",c.style.left="60%",c.style.transform="translate(-50%, -175%)",c.style.display="flex",c.style.justifyContent="center",c.style.alignContent="center",c.style.flexDirection="column",c.style.cursor="pointer",c.innerText="Remind Me Later",c.onclick=function(e){localStorage.setItem("GenLite.UpdateTimestamp",genliteLastModified.toString()),a.remove()},s.appendChild(c)}));else{var genliteJS=localStorage.getItem("GenLite.Client"),genliteVersion_1=localStorage.getItem("GenLite.Version"),genliteFork_1=localStorage.getItem("GenLite.Fork"),label_1,select_1;if("release"!=githubConfig.type){select_1=document.createElement("select"),select_1.style.border="1px solid #000",select_1.style.borderRadius="0.25em",select_1.style.background="#fff",select_1.style.color="#000",select_1.style.cursor="pointer",select_1.style.outline="none",label_1=document.createElement("label"),label_1.innerText="GenLite Fork: ";var defaultOption=document.createElement("option");defaultOption.innerText=genliteFork_1,defaultOption.value=genliteFork_1,defaultOption.selected=!0,select_1.appendChild(defaultOption),select_1.addEventListener("change",(function(e){var t=e.target;genliteFork_1=t.value,localStorage.setItem("GenLite.Fork",genliteFork_1),localStorage.removeItem("GenLite.Client"),localStorage.removeItem("GenLite.Version"),localStorage.removeItem("GenLite.UpdateTimestamp"),window.location.reload()}));var xhrForks_1=new XMLHttpRequest;xhrForks_1.open("GET","https://api.github.com/repos/GenLite-Org/GenLite/forks"),xhrForks_1.onload=function(){for(var e=JSON.parse(xhrForks_1.responseText),t=function(t){if(e[t].owner.login==genliteFork_1)return"continue";var n="https://raw.githubusercontent.com/".concat(e[t].owner.login,"/GenLite/release/dist/genliteClient.user.js"),a=new XMLHttpRequest;a.open("GET",n),a.onload=function(){var n=e[t];if(200==a.status){var i=document.createElement("option");i.value=n.owner.login,i.innerText=n.owner.login,select_1.appendChild(i)}},a.send()},n=0;n<e.length;n++)t(n)},xhrForks_1.send()}window.addEventListener("load",(function(){var e=document.createElement("p");e.innerText="GenLite Version:"+genliteVersion_1,e.id="genlite-version",e.style.padding="0",e.style.margin="0";var t=document.getElementById("loginversion");t.appendChild(e),"release"!=githubConfig.type&&(t.appendChild(label_1),t.appendChild(select_1)),document.getElementById("login__client-info").style.marginTop="4em"})),eval(genliteJS)}})()})();