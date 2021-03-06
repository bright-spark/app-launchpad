/**
 * Created by haseebriaz on 02/04/15.
 */


window.addEventListener("DOMContentLoaded", function(){

    fin.desktop.main(function(){

        fin.desktop.System.clearCache({
            cache: true,
            appcache: true,
            userData: true
        });

        new Controller(new View());
    });
});

var Controller = (function(){

    var currentWindow = null;
    var currentApp = null;

    function Controller(view){

        this.view = view;
        this.loadConfig();
        window.addEventListener("keydown", this.onKeydown.bind(this));
    };

    Controller.prototype.view = null;
    Controller.prototype.model = null;

    Controller.prototype.onKeydown = function(event){

        if(event.keyCode >= 65 && event.keyCode <= 90) {

            this.view.showSearch(true);

        } else switch (event.keyCode){

            case 40: //down;
            case 39: // right;
                this._selectNext();
                break;

            case 38: // up;
            case 37: // left;
                this._selectPrevious();
                break;

            case 13: if(this.model.selectedIndex >= 0) this.model.applications[this.model.selectedIndex].launch();
        }
    };

    Controller.prototype._selectNext = function(){

        this.model.selectNext();
    };

    Controller.prototype._selectPrevious = function(){

        this.model.selectPrevious();
    };

    Controller.prototype._onMinimized = function(){

        currentWindow.hide();
        currentApp.setTrayIcon(this.model.config.trayIcon,this._onTrayIconClicked.bind(this));
    };

    Controller.prototype._onTrayIconClicked = function(){

        currentApp.removeTrayIcon();
        currentWindow.show();
        currentWindow.restore();
    };

    Controller.prototype.loadConfig = function(){

        var xhr = new XMLHttpRequest();
        xhr.onload = this.onConfigLoaded.bind(this);
        xhr.open("get", "appList.json");
        xhr.send();
    };

    Controller.prototype.onConfigLoaded = function(event){

        var config = JSON.parse(event.target.response);
        this.model = new Model(config);
        this.model.onReady = this._onModelReady.bind(this);
        this.model.onupdate = this.onFilterUpdate.bind(this);

        if(config.trayIcon){

            currentWindow = fin.desktop.Window.getCurrent();
            currentWindow.addEventListener("minimized", this._onMinimized.bind(this));
            currentApp = fin.desktop.Application.getCurrent();
        }
    };

    Controller.prototype._onModelReady = function(){

        this.model.addApplications(this.view.initialize(this.model.config, this.model.existingAppList));
    };

    Controller.prototype.onFilterUpdate = function(){

        return this.view.filter(this.model.filter);
    };

    return Controller;

})();

var View = (function(){

    function View(){

        var template = document.querySelector('#app-launcher-template');
        this._node = document.importNode(template.content, true);
        this._onDragStart = this._onDragStart.bind(this);
        this._onDragOver = this._onDragOver.bind(this);
        this._onDrop = this._onDrop.bind(this);

        var bar = document.getElementById("bar");
        document.body.removeChild(bar);
        this._bar = bar;
    }

    View.prototype._node = null;
    View.prototype._bar = null;
    View.prototype._apps = [];

    View.prototype.initialize = function(config, existingApps){


        document.getElementById("title").innerText = config.title;
        var apps = [];
        var applist = config.applications;
        var length = applist.length;
        var item = null;
        var app = null;

        for(var i = 0; i < length; i++){

            item = applist[i];
            app = this.addAppTile(item, config.iconWidth, config.iconHeight);
            if(item.appOptions && existingApps[item.appOptions.uuid] !== undefined) app.getWebApp(item.appOptions.uuid);
            apps.push(app);
        }

        return apps;
    };

    View.prototype.addAppTile = function(config, width, height){

        var node = this._node.querySelector('.app').cloneNode(true);
        node.id = config.name;
        node.draggable = true;
        node.ondragstart = this._onDragStart;
        node.ondrop = this._onDrop;
        node.ondragover = this._onDragOver;

        var icon = node.querySelector('.icon');
        icon.draggable = false;
        icon.src = config.icon;
        icon.width = width;
        icon.height = height;

        node.querySelector('.name').innerText = config.name;
        var app = new App(node, config.name, config.url, config.type === 'systemApp'? config.arguments: config.appOptions, config.type);
        this._apps.push(app);
        document.body.appendChild(node);

        return app;
    };

    var dragTarget = null;

    View.prototype._onDragStart = function(event){

        //event.dataTransfer.setData("id", event.target.id);
        dragTarget = event.target;
    };

    View.prototype._onDrop = function(event){

        if(dragTarget == event.target.parentNode || event.target.parentNode.className != "app" ) return;

        document.body.removeChild(this._bar);

        var dropTargetIndex = [].indexOf.call(document.body.children, event.target.parentNode);
        var dragTargetIndex = [].indexOf.call(document.body.children, dragTarget);

        if(dragTargetIndex > dropTargetIndex)
            document.body.insertBefore(dragTarget, event.target.parentNode);
        else
            document.body.insertBefore(dragTarget, event.target.parentNode.nextSibling);
    };

    View.prototype._onDragOver = function(event){

        event.preventDefault();

        if(event.target == dragTarget || event.target.parentNode == dragTarget || event.target.parentNode.className != "app") {

            if( document.body.contains(this._bar))document.body.removeChild(this._bar);
            return;
        }

        var dropTargetIndex = [].indexOf.call(document.body.children, event.target.parentNode);
        var dragTargetIndex = [].indexOf.call(document.body.children, dragTarget);

        if(dragTargetIndex > dropTargetIndex)
            document.body.insertBefore(this._bar, event.target.parentNode);
        else
            document.body.insertBefore(this._bar, event.target.parentNode.nextSibling);

    };

    View.prototype.showSearch = function(value){

        if(value) {

            //document.querySelector('.search').style.display = "block";
            document.querySelector('.searchInput').focus();
            document.getElementById("style").href = "res/search.css";

        } else {

            //document.querySelector('.search').style.display = "none";
            document.querySelector('.searchInput').value = "";
            document.getElementById("style").href = "res/app-launcher.css";
        }
    };

    View.prototype.filter = function(filterString){

        this.showSearch(filterString != "");
        var length = this._apps.length;
        var currentApp = null;
        var anyVisible = false;

        for(var i = 0; i < length; i++){

            currentApp = this._apps[i];
            currentApp.show(filterString == "" || currentApp.name.toLowerCase().indexOf(filterString) > -1);
            if(currentApp.isVisible) anyVisible = true;
        }

        return anyVisible;
    };

    return View;
})();

var Model = (function(){

    var searchInput = null;

    function Model(config){

        this.config = config;
        searchInput = document.querySelector('.searchInput');
        searchInput.onkeyup = this.onSearchChange.bind(this);
        this._onAppLaunch = this._onAppLaunch.bind(this);
        fin.desktop.System.getAllApplications(this._getAllApplicationCallback.bind(this));
    }

    Model.prototype.config = null;
    Model.prototype.filter = "";
    Model.prototype.onupdate = null;
    Model.prototype.selectedIndex = -1;
    Model.prototype.applications = null;
    Model.prototype.hasResult = false;
    Model.prototype.existingAppList = {};
    Model.prototype.onReady = function(){};

    Model.prototype._getAllApplicationCallback = function(applicationInfoList){

        console.log(applicationInfoList);
        var length = applicationInfoList.length;

        for(var i = 0; i < length; i++){

            this.existingAppList[applicationInfoList[i].uuid] = applicationInfoList[i].isRunning;
        }

        this.onReady();
    };

    Model.prototype.addApplications = function(apps){

        for(var i = 0; i < apps.length; i++){

            apps[i].onLaunch = this._onAppLaunch;
        }

        this.applications = apps;
    };

    Model.prototype.onSearchChange = function(event){

        switch (event.keyCode){

            case 37:
            case 38:
            case 39:
            case 40: return;
        };

        if(event.keyCode == 27) searchInput.value = "";
        this.filter  = searchInput.value.toLowerCase();
        if(this.hasResult = this.onupdate()) {

            this.resetSelect();
            if (this.filter != "")this.selectNext();
        }
    };

    Model.prototype.selectNext = function(){

        if(!this.hasResult) return;

        this.unSelect();

        do{

            this.selectedIndex++;
            if(this.selectedIndex == this.applications.length)this.selectedIndex = 0;

        } while( !this.applications[this.selectedIndex].isVisible );

        this._selectCurrentIndex();
    };

    Model.prototype.selectPrevious = function(){

        if(!this.hasResult) return;

        this.unSelect();

        do {

            this.selectedIndex--;
            if (this.selectedIndex < 0) this.selectedIndex = this.applications.length - 1;

        } while(!this.applications[this.selectedIndex].isVisible);

        this._selectCurrentIndex();
    };

    Model.prototype._selectCurrentIndex = function(){

        this.applications[this.selectedIndex].select(true);
        this.applications[this.selectedIndex].onLaunch = this._onAppLaunch;
    };

    Model.prototype.unSelect = function(){

        if(this.applications[this.selectedIndex]) this.applications[this.selectedIndex].select(false);
    };

    Model.prototype.resetSelect = function(){

        if(this.applications[this.selectedIndex]) this.applications[this.selectedIndex].select(false);
        this.selectedIndex = -1;
    };

    Model.prototype._onAppLaunch = function(){

        this.resetSelect();
        this.filter = searchInput.value = "";
        this.onupdate();
    };

    return Model;
})();

var App = (function(){

    function App(node, name, url, arguments, type){

        this.url = url;
        this.name = name;
        node.onclick = this.onClick.bind(this);
        this._node = node;
        this.arguments = arguments;
        this.type = type;

        this._onWebAppStarted = this._onWebAppStarted.bind(this);
        this._onWebAppClosed = this._onWebAppClosed.bind(this);
    }

    App.prototype.url = "";
    App.prototype.name = "";
    App.prototype._node = null;
    App.prototype.arguments = null;
    App.prototype.type = "";
    App.prototype._webApp = null;
    App.prototype.isRunning = false;
    App.prototype.isSelected = true;
    App.prototype.isVisible = true;
    App.prototype.onLaunch = function(){};

    App.prototype.onClick = function(){

        this.launch();
    };

    App.prototype.launch = function(){

        if(this.type == "systemApp") {

            fin.desktop.System.launchExternalProcess(this.url, this.arguments);

        } else {

            this._node.style.cursor = "wait";

            this.arguments.name = this.name;
            this.arguments.url = this.url;
            this.arguments.autoShow = true;

            if(!this.isRunning) {
                if(this._webApp) {

                    this._webApp.run();
                } else {

                    this._webApp = new fin.desktop.Application(this.arguments, this._onWebAppLaunch.bind(this));
                    this._addAppListeners();
                }
            }
        }

        this.onLaunch();
    };

    App.prototype._addAppListeners = function(){

        this._webApp.addEventListener("started", this._onWebAppStarted);
        this._webApp.addEventListener("closed", this._onWebAppClosed);
    };

    App.prototype._onWebAppLaunch = function(){

        this._webApp.run();
    };

    App.prototype._onWebAppStarted = function(){

        this._node.style.cursor = "pointer";
        this.isRunning = true;
    };

    App.prototype._onWebAppClosed = function(){

        this.isRunning = false;
    };

    App.prototype.show = function(value){

        this._node.style.display  = value? "table-row": "none";
        this.isVisible = value;
    };

    App.prototype.getWebApp = function(uuid){

        this._webApp = fin.desktop.Application.wrap(uuid, this.name);
        this._addAppListeners();
    };

    App.prototype.select = function(value){

        this.isSelected = value;

        if(value){

            this._node.className = "appSelected";
        } else {

            this._node.className = "app";
        }
    };

    return App;
})();


