var browserAction = browserAction || {};

browserAction.show = function(callback, tab) {
	var data = {};
	if(!page.tabs[tab.id] || page.tabs[tab.id].stack.length == 0) {
		browserAction.showDefault(callback, tab);
		return;
	}
	else {
		data = page.tabs[tab.id].stack[page.tabs[tab.id].stack.length - 1];
	}

	chrome.browserAction.setIcon({
		tabId: tab.id,
		path: "/icons/19x19/" + browserAction.generateIconName(data.iconType, data.icon)
	});

	if(data.popup) {
		chrome.browserAction.setPopup({
			tabId: tab.id,
			popup: "popups/" + data.popup
		});
	}
}

browserAction.update = function() {
	if(!page.tabs[page.currentTabId] || page.tabs[page.currentTabId].stack.length == 0) {
		return;
	}

	var data = page.tabs[page.currentTabId].stack[page.tabs[page.currentTabId].stack.length - 1];

	if(data.intervalIcon) {
		data.intervalIcon.counter += 1;
		if(data.intervalIcon.counter < data.intervalIcon.max) {
			return;
		}

		data.intervalIcon.counter = 0;
		data.intervalIcon.index += 1;

		if(data.intervalIcon.index > data.intervalIcon.icons.length - 1) {
			data.intervalIcon.index = 0;
		}

		chrome.browserAction.setIcon({
			tabId: page.currentTabId,
			path: "/icons/19x19/" + browserAction.generateIconName(null, data.intervalIcon.icons[data.intervalIcon.index])
		});
	}
}

browserAction.showDefault = function(callback, tab) {
	var stackData = {
		level: 1,
		iconType: "normal",
		popup: "popup.html"
	}
	if(!keepass.isConfigured() || keepass.isDatabaseClosed || !keepass.isKeePassHttpAvailable || page.tabs[tab.id].errorMessage) {
		stackData.iconType = "cross";
	}

	browserAction.stackUnshift(stackData, tab.id);

	browserAction.show(null, tab);
}

browserAction.stackAdd = function(callback, tab, icon, popup, level, push, visibleForPageUpdates, dontShow) {
	var id = tab.id || page.currentTabId;

	if(!level) {
		level = 1;
	}

	var stackData = {
		"level": level,
		"icon": icon
	}

	if(popup) {
		stackData.popup = popup;
	}

	if(visibleForPageUpdates) {
		stackData.visibleForPageUpdates = visibleForPageUpdates;
	}

	if(push) {
		browserAction.stackPush(stackData, id);
	}
	else {
		browserAction.stackUnshift(stackData, id);
	}

	if(!dontShow) {
		browserAction.show(null, {"id": id});
	}
}


browserAction.removeLevelFromStack = function(callback, tab, level, type, dontShow) {
	if(!page.tabs[tab.id]) {
		return;
	}

	if(!type) {
		type = "<=";
	}

	var newStack = [];
	for(var i = 0; i < page.tabs[tab.id].stack.length; i++) {
		if(
			(type == "<" && page.tabs[tab.id].stack[i].level >= level) ||
			(type == "<=" && page.tabs[tab.id].stack[i].level > level) ||
			(type == "=" && page.tabs[tab.id].stack[i].level != level) ||
			(type == "==" && page.tabs[tab.id].stack[i].level != level) ||
			(type == "!=" && page.tabs[tab.id].stack[i].level == level) ||
			(type == ">" && page.tabs[tab.id].stack[i].level <= level) ||
			(type == ">=" && page.tabs[tab.id].stack[i].level < level)
		) {
			newStack.push(page.tabs[tab.id].stack[i]);
		}
	}

	page.tabs[tab.id].stack = newStack;

	if(!dontShow) {
		browserAction.show(callback, tab);
	}
}

browserAction.stackPop = function(tabId) {
	var id = tabId || page.currentTabId;

	page.tabs[id].stack.pop();
}

browserAction.stackPush = function(data, tabId) {
	var id = tabId || page.currentTabId;

	browserAction.removeLevelFromStack(null, {"id": id}, data.level, "<=", true);
	page.tabs[id].stack.push(data);
}

browserAction.stackUnshift = function(data, tabId) {
	var id = tabId || page.currentTabId;

	browserAction.removeLevelFromStack(null, {"id": id}, data.level, "<=", true);
	page.tabs[id].stack.unshift(data);
}


browserAction.removeRememberPopup = function(callback, tab, immediately) {
	if(!page.tabs[tab.id]) {
		return;
	}

	if(page.tabs[tab.id].stack.length == 0) {
		page.clearCredentials(tab.id);
		return;
	}

	var data = page.tabs[tab.id].stack[page.tabs[tab.id].stack.length - 1];
	if(typeof data.visibleForPageUpdates != "undefined") {
		if(data.visibleForPageUpdates <= 0 || immediately) {
			browserAction.stackPop(tab.id);
			browserAction.show(null, {"id": tab.id});
			page.clearCredentials(tab.id);
			return;
		}
		data.visibleForPageUpdates -= 1;
	}
}

browserAction.setRememberPopup = function(tabId, username, password, url, usernameExists, credentialsList) {
	var id = tabId || page.currentTabId;

	var stackData = {
		visibleForPageUpdates: 2,
		level: 10,
		intervalIcon: {
			index: 0,
			counter: 0,
			max: 5,
			icons: ["icon_remember_red_background_19x19.png", "icon_remember_red_lock_19x19.png"]
		},
		icon: "icon_remember_red_background_19x19.png",
		popup: "popup_remember.html"
	}

	browserAction.stackPush(stackData, id);

	page.tabs[id].credentials = {
		"username": username,
		"password": password,
		"url": url,
		"usernameExists": usernameExists,
		"list": credentialsList
	};

	browserAction.show(null, {"id": id});
}

browserAction.generateIconName = function(iconType, icon) {
	if(icon) {
		return icon;
	}

	var name = "icon_";
	name += (keepass.keePassHttpUpdateAvailable()) ? "new_" : "";
	name += (!iconType || iconType == "normal") ? "normal_" : iconType + "_";
	name += keepass.getIconColor();
	name += "_19x19.png";

	return name;
}