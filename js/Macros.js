//--
//-- Macro definitions
//--

config.macros.today.handler = function(place,macroName,params)
{
	var now = new Date();
	var text;
	if(params[0])
		text = now.formatString(params[0].trim());
	else
		text = now.toLocaleString();
	createTiddlyElement(place,"span",null,null,text);
};

config.macros.version.handler = function(place)
{
	createTiddlyElement(place,"span",null,null,version.major + "." + version.minor + "." + version.revision + (version.beta ? " (beta " + version.beta + ")" : ""));
};

config.macros.list.handler = function(place,macroName,params)
{
	var type = params[0] ? params[0] : "all";
	var list = document.createElement("ul");
	place.appendChild(list);
	if(this[type].prompt)
		createTiddlyElement(list,"li",null,"listTitle",this[type].prompt);
	var results;
	if(this[type].handler)
		results = this[type].handler(params);
	for(var t = 0; t < results.length; t++) {
		var li = document.createElement("li");
		list.appendChild(li);
		createTiddlyLink(li,typeof results[t] == "string" ? results[t] : results[t].title,true);
	}
};

config.macros.list.all.handler = function(params)
{
	return store.reverseLookup("tags","excludeLists",false,"title");
};

config.macros.list.missing.handler = function(params)
{
	return store.getMissingLinks();
};

config.macros.list.orphans.handler = function(params)
{
	return store.getOrphans();
};

config.macros.list.shadowed.handler = function(params)
{
	return store.getShadowed();
};

config.macros.list.touched.handler = function(params)
{
	return store.getTouched();
}

config.macros.allTags.handler = function(place,macroName,params)
{
	var tags = store.getTags(params[0]);
	var ul = createTiddlyElement(place,"ul");
	if(tags.length == 0)
		createTiddlyElement(ul,"li",null,"listTitle",this.noTags);
	for(var t=0; t<tags.length; t++) {
		var title = tags[t][0];
		var info = getTiddlyLinkInfo(title);
		var li =createTiddlyElement(ul,"li");
		var btn = createTiddlyButton(li,title + " (" + tags[t][1] + ")",this.tooltip.format([title]),onClickTag,info.classes);
		btn.setAttribute("tag",title);
		btn.setAttribute("refresh","link");
		btn.setAttribute("tiddlyLink",title);
	}
};

config.macros.timeline.handler = function(place,macroName,params)
{
	var field = params[0] ? params[0] : "modified";
	var tiddlers = store.reverseLookup("tags","excludeLists",false,field);
	var lastDay = "";
	var last = params[1] ? tiddlers.length-Math.min(tiddlers.length,parseInt(params[1])) : 0;
	for(var t=tiddlers.length-1; t>=last; t--) {
		var tiddler = tiddlers[t];
		var theDay = tiddler[field].convertToLocalYYYYMMDDHHMM().substr(0,8);
		if(theDay != lastDay) {
			var theDateList = document.createElement("ul");
			place.appendChild(theDateList);
			createTiddlyElement(theDateList,"li",null,"listTitle",tiddler[field].formatString(this.dateFormat));
			lastDay = theDay;
		}
		var theDateListItem = createTiddlyElement(theDateList,"li",null,"listLink");
		theDateListItem.appendChild(createTiddlyLink(place,tiddler.title,true));
	}
};

config.macros.search.handler = function(place,macroName,params)
{
	var searchTimeout = null;
	var btn = createTiddlyButton(place,this.label,this.prompt,this.onClick);
	var txt = createTiddlyElement(place,"input",null,"txtOptionInput");
	if(params[0])
		txt.value = params[0];
	txt.onkeyup = this.onKeyPress;
	txt.onfocus = this.onFocus;
	txt.setAttribute("size",this.sizeTextbox);
	txt.setAttribute("accessKey",this.accessKey);
	txt.setAttribute("autocomplete","off");
	txt.setAttribute("lastSearchText","");
	if(config.browser.isSafari) {
		txt.setAttribute("type","search");
		txt.setAttribute("results","5");
	} else {
		txt.setAttribute("type","text");
	}
};

// Global because there's only ever one outstanding incremental search timer
config.macros.search.timeout = null;

config.macros.search.doSearch = function(txt)
{
	if(txt.value.length > 0) {
		story.search(txt.value,config.options.chkCaseSensitiveSearch,config.options.chkRegExpSearch);
		txt.setAttribute("lastSearchText",txt.value);
	}
};

config.macros.search.onClick = function(e)
{
	config.macros.search.doSearch(this.nextSibling);
	return false;
};

config.macros.search.onKeyPress = function(e)
{
	if(!e) var e = window.event;
	switch(e.keyCode) {
		case 13: // Ctrl-Enter
		case 10: // Ctrl-Enter on IE PC
			config.macros.search.doSearch(this);
			break;
		case 27: // Escape
			this.value = "";
			clearMessage();
			break;
	}
	if(this.value.length > 2) {
		if(this.value != this.getAttribute("lastSearchText")) {
			if(config.macros.search.timeout)
				clearTimeout(config.macros.search.timeout);
			var txt = this;
			config.macros.search.timeout = setTimeout(function() {config.macros.search.doSearch(txt);},500);
		}
	} else {
		if(config.macros.search.timeout)
			clearTimeout(config.macros.search.timeout);
	}
};

config.macros.search.onFocus = function(e)
{
	this.select();
};

config.macros.tiddler.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	params = paramString.parseParams("name",null,true,false,true);
	var names = params[0]["name"];
	var tiddlerName = names[0];
	var className = names[1] ? names[1] : null;
	var args = params[0]["with"];
	var wrapper = createTiddlyElement(place,"span",null,className);
	if(!args) {
		wrapper.setAttribute("refresh","content");
		wrapper.setAttribute("tiddler",tiddlerName);
	}
	var text = store.getTiddlerText(tiddlerName);
	if(text) {
		var stack = config.macros.tiddler.tiddlerStack;
		if(stack.indexOf(tiddlerName) !== -1)
			return;
		stack.push(tiddlerName);
		try {
			var n = args ? Math.min(args.length,9) : 0;
			for(var i=0; i<n; i++) {
				var placeholderRE = new RegExp("\\$" + (i + 1),"mg");
				text = text.replace(placeholderRE,args[i]);
			}
			config.macros.tiddler.renderText(wrapper,text,tiddlerName,params);
		} finally {
			stack.pop();
		}
	}
};

config.macros.tiddler.renderText = function(place,text,tiddlerName,params) 
{
	wikify(text,place,null,store.getTiddler(tiddlerName));
};

config.macros.tiddler.tiddlerStack = [];

config.macros.tag.handler = function(place,macroName,params)
{
	createTagButton(place,params[0]);
};

config.macros.tags.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	params = paramString.parseParams("anon",null,true,false,false);
	var theList = createTiddlyElement(place,"ul");
	var title = getParam(params,"anon","");
	if(title && store.tiddlerExists(title))
		tiddler = store.getTiddler(title);
	var sep = getParam(params,"sep"," ");
	var lingo = config.views.wikified.tag;
	var prompt = tiddler.tags.length == 0 ? lingo.labelNoTags : lingo.labelTags;
	createTiddlyElement(theList,"li",null,"listTitle",prompt.format([tiddler.title]));
	for(var t=0; t<tiddler.tags.length; t++) {
		createTagButton(createTiddlyElement(theList,"li"),tiddler.tags[t],tiddler.title);
		if(t<tiddler.tags.length-1)
			createTiddlyText(theList,sep);
	}
};

config.macros.tagging.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	params = paramString.parseParams("anon",null,true,false,false);
	var theList = createTiddlyElement(place,"ul");
	var title = getParam(params,"anon","");
	if(title == "" && tiddler instanceof Tiddler)
		title = tiddler.title;
	var sep = getParam(params,"sep"," ");
	theList.setAttribute("title",this.tooltip.format([title]));
	var tagged = store.getTaggedTiddlers(title);
	var prompt = tagged.length == 0 ? this.labelNotTag : this.label;
	createTiddlyElement(theList,"li",null,"listTitle",prompt.format([title,tagged.length]));
	for(var t=0; t<tagged.length; t++) {
		createTiddlyLink(createTiddlyElement(theList,"li"),tagged[t].title,true);
		if(t<tagged.length-1)
			createTiddlyText(theList,sep);
	}
};

config.macros.closeAll.handler = function(place)
{
	createTiddlyButton(place,this.label,this.prompt,this.onClick);
};

config.macros.closeAll.onClick = function(e)
{
	story.closeAllTiddlers();
	return false;
};

config.macros.permaview.handler = function(place)
{
	createTiddlyButton(place,this.label,this.prompt,this.onClick);
};

config.macros.permaview.onClick = function(e)
{
	story.permaView();
	return false;
};

config.macros.saveChanges.handler = function(place)
{
	if(!readOnly)
		createTiddlyButton(place,this.label,this.prompt,this.onClick,null,null,this.accessKey);
};

config.macros.saveChanges.onClick = function(e)
{
	saveChanges();
	return false;
};

config.macros.slider.onClickSlider = function(e)
{
	if(!e) var e = window.event;
	var n = this.nextSibling;
	var cookie = n.getAttribute("cookie");
	var isOpen = n.style.display != "none";
	if(config.options.chkAnimate && anim && typeof Slider == "function")
		anim.startAnimating(new Slider(n,!isOpen,null,"none"));
	else
		n.style.display = isOpen ? "none" : "block";
	config.options[cookie] = !isOpen;
	saveOptionCookie(cookie);
	return false;
};

config.macros.slider.createSlider = function(place,cookie,title,tooltip)
{
	var cookie = cookie ? cookie : "";
	var btn = createTiddlyButton(place,title,tooltip,this.onClickSlider);
	var panel = createTiddlyElement(null,"div",null,"sliderPanel");
	panel.setAttribute("cookie",cookie);
	panel.style.display = config.options[cookie] ? "block" : "none";
	place.appendChild(panel);
	return panel;
};

config.macros.slider.handler = function(place,macroName,params)
{
	var panel = this.createSlider(place,params[0],params[2],params[3]);
	var text = store.getTiddlerText(params[1]);
	panel.setAttribute("refresh","content");
	panel.setAttribute("tiddler",params[1]);
	if(text)
		wikify(text,panel,null,store.getTiddler(params[1]));
};

config.macros.option.genericCreate = function(place,type,opt,className,desc)
{
	var typeInfo = config.macros.option.types[type];
    var c = document.createElement(typeInfo.elementType);
    if(typeInfo.typeValue)
        c.setAttribute("type",typeInfo.typeValue);
    c[typeInfo.eventName] = typeInfo.onChange;
    c.setAttribute("option",opt);
	if(className)
		c.className = className;
	else
    	c.className = typeInfo.className;
	if(config.optionsDesc[opt])
		c.setAttribute("title",config.optionsDesc[opt]);
    place.appendChild(c);
	if(desc != "no")
		createTiddlyText(place,config.optionsDesc[opt] ? config.optionsDesc[opt] : opt);
    c[typeInfo.valueField] = config.options[opt];
    return c;
};

config.macros.option.genericOnChange = function(e)
{
	var opt = this.getAttribute("option");
	if(opt) {
		var optType = opt.substr(0,3);
		var handler = config.macros.option.types[optType];
		if (handler.elementType && handler.valueField)
			config.macros.option.propagateOption(opt,handler.valueField,this[handler.valueField],handler.elementType)
		}
	return true;
};

config.macros.option.types = {
	'txt': {
		elementType: "input",
		valueField: "value",
		eventName: "onkeyup",
		className: "txtOptionInput",
		create: config.macros.option.genericCreate,
		onChange: config.macros.option.genericOnChange
	},
	'chk': {
		elementType: "input",
		valueField: "checked",
		eventName: "onclick",
		className: "chkOptionInput",
		typeValue: "checkbox",
		create: config.macros.option.genericCreate,
		onChange: config.macros.option.genericOnChange
	}
};

config.macros.option.propagateOption = function(opt,valueField,value,elementType)
{
	config.options[opt] = value;
	saveOptionCookie(opt);
	var nodes = document.getElementsByTagName(elementType);
	for(var t=0; t<nodes.length; t++) {
		var optNode = nodes[t].getAttribute("option");
		if(opt == optNode)
			nodes[t][valueField] = value;
		}
};

config.macros.option.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	params = paramString.parseParams("anon",null,true,false,false);
	var opt = (params[1] && params[1].name == "anon") ? params[1].value : getParam(params,"name",null);
	var className = (params[2] && params[2].name == "anon") ? params[2].value : getParam(params,"class",null);
	var desc = getParam(params,"desc","no");
	var type = opt.substr(0,3);
	var h = config.macros.option.types[type];
	if (h && h.create)
		h.create(place,type,opt,className,desc);
};

config.macros.options.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	params = paramString.parseParams("anon",null,true,false,false);
	var showHidden = getParam(params,"showHidden","no");
	var wizard = new Wizard();
	wizard.createWizard(place,this.wizardTitle);
	wizard.addStep(this.step1Title,this.step1Html);
	var markList = wizard.getElement("markList");
	var chkHidden = wizard.getElement("chkHidden");
	chkHidden.checked = showHidden == "yes";
	chkHidden.onchange = this.onChangeHidden;
	var listWrapper = document.createElement("div");
	markList.parentNode.insertBefore(listWrapper,markList);
	wizard.setValue("listWrapper",listWrapper);
	this.refreshOptions(listWrapper,showHidden == "yes");
}

config.macros.options.refreshOptions = function(listWrapper,showHidden)
{	
	var opts = [];
	for(var n in config.options) {
		var opt = {};
		opt.option = "";
		opt.name = n;
		opt.lowlight = !config.optionsDesc[n];
		opt.description = opt.lowlight ? this.unknownDescription : config.optionsDesc[n];
		if(!opt.lowlight || showHidden)
			opts.push(opt);
	}
	opts.sort(function(a,b) {return a.name.substr(3) < b.name.substr(3) ? -1 : (a.name.substr(3) == b.name.substr(3) ? 0 : +1);});
	var listview = ListView.create(listWrapper,opts,config.macros.options.listViewTemplate);
	for(n=0; n<opts.length; n++) {
		var type = opts[n].name.substr(0,3);
		var h = config.macros.option.types[type];
		if (h && h.create) {
			h.create(opts[n].colElements['option'],type,opts[n].name,null,"no");
		}
	}
};

config.macros.options.onChangeHidden = function(e)
{
	var wizard = new Wizard(this);
	var listWrapper = wizard.getValue("listWrapper");
	removeChildren(listWrapper);
	config.macros.options.refreshOptions(listWrapper,this.checked);
	return false;
};

config.macros.newTiddler.createNewTiddlerButton = function(place,title,params,label,prompt,accessKey,newFocus,isJournal)
{
	var tags = [];
	for(var t=1; t<params.length; t++) {
		if((params[t].name == "anon" && t != 1) || (params[t].name == "tag"))
			tags.push(params[t].value);
	}
	label = getParam(params,"label",label);
	prompt = getParam(params,"prompt",prompt);
	accessKey = getParam(params,"accessKey",accessKey);
	newFocus = getParam(params,"focus",newFocus);
	var customFields = getParam(params,"fields");
	if(!customFields && !store.isShadowTiddler(title))
		customFields = String.encodeHashMap(config.defaultCustomFields);
	var btn = createTiddlyButton(place,label,prompt,this.onClickNewTiddler,null,null,accessKey);
	btn.setAttribute("newTitle",title);
	btn.setAttribute("isJournal",isJournal);
	btn.setAttribute("params",tags.join("|"));
	btn.setAttribute("newFocus",newFocus);
	btn.setAttribute("newTemplate",getParam(params,"template",DEFAULT_EDIT_TEMPLATE));
	btn.setAttribute("customFields",customFields);
	var text = getParam(params,"text");
	if(text !== undefined) 
		btn.setAttribute("newText",text);
	return btn;
};

config.macros.newTiddler.onClickNewTiddler = function()
{
	var title = this.getAttribute("newTitle");
	if(this.getAttribute("isJournal")) {
		var now = new Date();
		title = now.formatString(title.trim());
	}
	var params = this.getAttribute("params").split("|");
	var focus = this.getAttribute("newFocus");
	var template = this.getAttribute("newTemplate");
	var customFields = this.getAttribute("customFields");
	story.displayTiddler(null,title,template,false,null,customFields);
	var text = this.getAttribute("newText");
	if(typeof text == "string")
		story.getTiddlerField(title,"text").value = text.format([title]);
	for(var t=0;t<params.length;t++)
		story.setTiddlerTag(title,params[t],+1);
	story.focusTiddler(title,focus);
	return false;
};

config.macros.newTiddler.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	if(!readOnly) {
		params = paramString.parseParams("anon",null,true,false,false);
		var title = params[1] && params[1].name == "anon" ? params[1].value : this.title;
		title = getParam(params,"title",title);
		this.createNewTiddlerButton(place,title,params,this.label,this.prompt,this.accessKey,"title",false);
	}
};

config.macros.newJournal.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	if(!readOnly) {
		params = paramString.parseParams("anon",null,true,false,false);
		var title = params[1] && params[1].name == "anon" ? params[1].value : "";
		title = getParam(params,"title",title);
		config.macros.newTiddler.createNewTiddlerButton(place,title,params,this.label,this.prompt,this.accessKey,"text",true);
	}
};

config.macros.sparkline.handler = function(place,macroName,params)
{
	var data = [];
	var min = 0;
	var max = 0;
	for(var t=0; t<params.length; t++) {
		var v = parseInt(params[t]);
		if(v < min)
			min = v;
		if(v > max)
			max = v;
		data.push(v);
	}
	if(data.length < 1)
		return;
	var box = createTiddlyElement(place,"span",null,"sparkline",String.fromCharCode(160));
	box.title = data.join(",");
	var w = box.offsetWidth;
	var h = box.offsetHeight;
	box.style.paddingRight = (data.length * 2 - w) + "px";
	box.style.position = "relative";
	for(var d=0; d<data.length; d++) {
		var tick = document.createElement("img");
		tick.border = 0;
		tick.className = "sparktick";
		tick.style.position = "absolute";
		tick.src = "data:image/gif,GIF89a%01%00%01%00%91%FF%00%FF%FF%FF%00%00%00%C0%C0%C0%00%00%00!%F9%04%01%00%00%02%00%2C%00%00%00%00%01%00%01%00%40%02%02T%01%00%3B";
		tick.style.left = d*2 + "px";
		tick.style.width = "2px";
		var v = Math.floor(((data[d] - min)/(max-min)) * h);
		tick.style.top = (h-v) + "px";
		tick.style.height = v + "px";
		box.appendChild(tick);
	}
};

config.macros.tabs.handler = function(place,macroName,params)
{
	var cookie = params[0];
	var numTabs = (params.length-1)/3;
	var wrapper = createTiddlyElement(null,"div",null,cookie);
	var tabset = createTiddlyElement(wrapper,"div",null,"tabset");
	tabset.setAttribute("cookie",cookie);
	var validTab = false;
	for(var t=0; t<numTabs; t++) {
		var label = params[t*3+1];
		var prompt = params[t*3+2];
		var content = params[t*3+3];
		var tab = createTiddlyButton(tabset,label,prompt,this.onClickTab,"tab tabUnselected");
		tab.setAttribute("tab",label);
		tab.setAttribute("content",content);
		tab.title = prompt;
		if(config.options[cookie] == label)
			validTab = true;
	}
	if(!validTab)
		config.options[cookie] = params[1];
	place.appendChild(wrapper);
	this.switchTab(tabset,config.options[cookie]);
};

config.macros.tabs.onClickTab = function(e)
{
	config.macros.tabs.switchTab(this.parentNode,this.getAttribute("tab"));
	return false;
};

config.macros.tabs.switchTab = function(tabset,tab)
{
	var cookie = tabset.getAttribute("cookie");
	var theTab = null;
	var nodes = tabset.childNodes;
	for(var t=0; t<nodes.length; t++) {
		if(nodes[t].getAttribute && nodes[t].getAttribute("tab") == tab) {
			theTab = nodes[t];
			theTab.className = "tab tabSelected";
		} else {
			nodes[t].className = "tab tabUnselected";
		}
	}
	if(theTab) {
		if(tabset.nextSibling && tabset.nextSibling.className == "tabContents")
			removeNode(tabset.nextSibling);
		var tabContent = createTiddlyElement(null,"div",null,"tabContents");
		tabset.parentNode.insertBefore(tabContent,tabset.nextSibling);
		var contentTitle = theTab.getAttribute("content");
		wikify(store.getTiddlerText(contentTitle),tabContent,null,store.getTiddler(contentTitle));
		if(cookie) {
			config.options[cookie] = tab;
			saveOptionCookie(cookie);
		}
	}
};

// <<gradient [[tiddler name]] vert|horiz rgb rgb rgb rgb... >>
config.macros.gradient.handler = function(place,macroName,params,wikifier)
{
	var terminator = ">>";
	var panel;
	if(wikifier)
		panel = createTiddlyElement(place,"div",null,"gradient");
	else
		panel = place;
	panel.style.position = "relative";
	panel.style.overflow = "hidden";
	panel.style.zIndex = "0";
	var t;
	if(wikifier) {
		var styles = config.formatterHelpers.inlineCssHelper(wikifier);
		config.formatterHelpers.applyCssHelper(panel,styles);
	}
	var colours = [];
	for(t=1; t<params.length; t++) {
		var c = new RGB(params[t]);
		if(c)
			colours.push(c);
	}
	drawGradient(panel,params[0] != "vert",colours);
	if(wikifier)
		wikifier.subWikify(panel,terminator);
	if(document.all) {
		panel.style.height = "100%";
		panel.style.width = "100%";
	}
};

config.macros.message.handler = function(place,macroName,params)
{
	if(params[0]) {
		var m = config;
		var p = params[0].split(".");
		for(var t=0; t<p.length; t++) {
			if(p[t] in m)
				m = m[p[t]];
			else
				break;
		}
		createTiddlyText(place,m.toString().format(params.splice(1)));
	}
};

config.macros.view.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	if((tiddler instanceof Tiddler) && params[0]) {
		var value = store.getValue(tiddler,params[0]);
		if(value != undefined) {
			switch(params[1]) {
				case undefined:
					highlightify(value,place,highlightHack,tiddler);
					break;
				case "link":
					createTiddlyLink(place,value,true);
					break;
				case "wikified":
					wikify(value,place,highlightHack,tiddler);
					break;
				case "date":
					value = Date.convertFromYYYYMMDDHHMM(value);
					createTiddlyText(place,value.formatString(params[2] ? params[2] : config.views.wikified.dateFormat));
					break;
			}
		}
	}
};

config.macros.edit.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	var field = params[0];
	if((tiddler instanceof Tiddler) && field) {
		story.setDirty(tiddler.title,true);
		if(field != "text") {
			var e = createTiddlyElement(null,"input");
			if(tiddler.isReadOnly())
				e.setAttribute("readOnly","readOnly");
			e.setAttribute("edit",field);
			e.setAttribute("type","text");
			var v = store.getValue(tiddler,field);
			if(!v) 
				v = "";
			e.value = v;
			e.setAttribute("size","40");
			e.setAttribute("autocomplete","off");
			place.appendChild(e);
		} else {
			var wrapper1 = createTiddlyElement(null,"fieldset",null,"fieldsetFix");
			var wrapper2 = createTiddlyElement(wrapper1,"div");
			var e = createTiddlyElement(wrapper2,"textarea");
			if(tiddler.isReadOnly())
				e.setAttribute("readOnly","readOnly");
			var v = store.getValue(tiddler,field);
			if(!v) 
				v = "";
			e.value = v;
			var rows = 10;
			var lines = v.match(/\n/mg);
			var maxLines = Math.max(parseInt(config.options.txtMaxEditRows),5);
			if(lines != null && lines.length > rows)
				rows = lines.length + 5;
			rows = Math.min(rows,maxLines);
			e.setAttribute("rows",rows);
			e.setAttribute("edit",field);
			place.appendChild(wrapper1);
		}
	}
};

config.macros.tagChooser.onClick = function(e)
{
	if(!e) var e = window.event;
	var lingo = config.views.editor.tagChooser;
	var popup = Popup.create(this);
	var tags = store.getTags();
	if(tags.length == 0)
		createTiddlyText(createTiddlyElement(popup,"li"),lingo.popupNone);
	for(var t=0; t<tags.length; t++) {
		var theTag = createTiddlyButton(createTiddlyElement(popup,"li"),tags[t][0],lingo.tagTooltip.format([tags[t][0]]),config.macros.tagChooser.onTagClick);
		theTag.setAttribute("tag",tags[t][0]);
		theTag.setAttribute("tiddler",this.getAttribute("tiddler"));
	}
	Popup.show();
	e.cancelBubble = true;
	if(e.stopPropagation) e.stopPropagation();
	return false;
};

config.macros.tagChooser.onTagClick = function(e)
{
	if(!e) var e = window.event;
	var tag = this.getAttribute("tag");
	var title = this.getAttribute("tiddler");
	if(!readOnly)
		story.setTiddlerTag(title,tag,0);
	return false;
};

config.macros.tagChooser.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	if(tiddler instanceof Tiddler) {
		var title = tiddler.title;
		var lingo = config.views.editor.tagChooser;
		var btn = createTiddlyButton(place,lingo.text,lingo.tooltip,this.onClick);
		btn.setAttribute("tiddler",title);
	}
};

// Create a toolbar command button
// place - parent DOM element
// command - reference to config.commands[] member -or- name of member
// tiddler - reference to tiddler that toolbar applies to
// theClass - the class to give the button
config.macros.toolbar.createCommand = function(place,commandName,tiddler,theClass)
{
	if(typeof commandName != "string") {
		var c = null;
		for(var t in config.commands) {
			if(config.commands[t] == commandName)
				c = t;
		}
		commandName = c;
	}
	if((tiddler instanceof Tiddler) && (typeof commandName == "string")) {
		var command = config.commands[commandName];
		if(command.isEnabled ? command.isEnabled(tiddler) : this.isCommandEnabled(command,tiddler)) {
			var text = command.getText ? command.getText(tiddler) : this.getCommandText(command,tiddler);
			var tooltip = command.getTooltip ? command.getTooltip(tiddler) : this.getCommandTooltip(command,tiddler);
			var cmd;
			switch(command.type) {
				case "command":
				default:
					cmd = this.onClickCommand;
					break;
				case "popup":
					cmd = this.onClickPopup;
					break;
			}
			var btn = createTiddlyButton(null,text,tooltip,cmd);
			btn.setAttribute("commandName",commandName);
			btn.setAttribute("tiddler",tiddler.title);
			if(theClass)
				addClass(btn,theClass);
			place.appendChild(btn);
		}
	}
};

config.macros.toolbar.isCommandEnabled = function(command,tiddler)
{
	var title = tiddler.title;
	var ro = tiddler.isReadOnly();
	var shadow = store.isShadowTiddler(title) && !store.tiddlerExists(title);
	return (!ro || (ro && !command.hideReadOnly)) && !(shadow && command.hideShadow);
};

config.macros.toolbar.getCommandText = function(command,tiddler)
{
	return tiddler.isReadOnly() && command.readOnlyText ? command.readOnlyText : command.text;
};

config.macros.toolbar.getCommandTooltip = function(command,tiddler)
{
	return tiddler.isReadOnly() && command.readOnlyTooltip ? command.readOnlyTooltip : command.tooltip;
};

config.macros.toolbar.onClickCommand = function(e)
{
	if(!e) var e = window.event;
	var command = config.commands[this.getAttribute("commandName")];
	return command.handler(e,this,this.getAttribute("tiddler"));
};

config.macros.toolbar.onClickPopup = function(e)
{
	if(!e) var e = window.event;
	var popup = Popup.create(this);
	var command = config.commands[this.getAttribute("commandName")];
	var title = this.getAttribute("tiddler");
	var tiddler = store.fetchTiddler(title);
	popup.setAttribute("tiddler",title);
	command.handlePopup(popup,title);
	Popup.show();
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();
	return false;
};

// Invoke the first command encountered from a given place that is tagged with a specified class
config.macros.toolbar.invokeCommand = function(place,theClass,event)
{
	var children = place.getElementsByTagName("a");
	for(var t=0; t<children.length; t++) {
		var c = children[t];
		if(hasClass(c,theClass) && c.getAttribute && c.getAttribute("commandName")) {
			if(c.onclick instanceof Function)
				c.onclick.call(c,event);
			break;
		}
	}
};

config.macros.toolbar.onClickMore = function(e)
{
	var e = this.nextSibling;
	e.style.display = "inline";
	removeNode(this);
	return false;
};

config.macros.toolbar.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	for(var t=0; t<params.length; t++) {
		var c = params[t];
		switch(c) {
			case '>':
				var btn = createTiddlyButton(place,this.moreLabel,this.morePrompt,config.macros.toolbar.onClickMore);
				addClass(btn,"moreCommand");
				var e = createTiddlyElement(place,"span",null,"moreCommand");
				e.style.display = "none";
				place = e;
				break;
			default:
				var theClass = "";
				switch(c.substr(0,1)) {
					case "+":
						theClass = "defaultCommand";
						c = c.substr(1);
						break;
					case "-":
						theClass = "cancelCommand";
						c = c.substr(1);
						break;
				}
				if(c in config.commands)
					this.createCommand(place,c,tiddler,theClass);
				break;
		}
	}
};

config.macros.refreshDisplay.handler = function(place)
{
	createTiddlyButton(place,this.label,this.prompt,this.onClick);
};

config.macros.refreshDisplay.onClick = function(e)
{
	refreshAll();
	return false;
};

config.macros.viewDetails.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	if(!tiddler)
		return;
	params = paramString.parseParams("anon",null,true,false,false);
	var fields = {};
	store.forEachField(tiddler,function(tiddler,fieldName,value) {fields[fieldName] = value;},true);
	var isOpen = null;
	if(params[0]['start']) {
		switch(params[0]['start'][0]) {
			case 'open':
				isOpen = true;
				break;
			case 'closed':
				isOpen = false;
				break;
		}
	}
	if(isOpen === null && config.options.chkShowTiddlerDetails)
		isOpen = true;
	if(isOpen) {
		this.createOpenPanel(place,null,fields);
	} else {
		this.createClosedPanel(place,null,fields);
	}
};

config.macros.viewDetails.createOpenPanel = function(place,before,fields)
{
	var items = [];
	for(var t in fields) {
		items.push({
			field: t,
			value: fields[t]
		});
	}
	items.sort(function(a,b) {return a.field < b.field ? -1 : (a.field == b.field ? 0 : +1);});
	var panel = createTiddlyElement(null,"div",null,"viewDetails");
	place.insertBefore(panel,before);
	panel.setAttribute("fields",String.encodeHashMap(fields));
	if(items.length > 0)
		ListView.create(panel,items,config.macros.viewDetails.listViewTemplate);
	else
		createTiddlyElement(panel,"div",null,"detailsMessage",this.emptyDetailsText);
	var btn = createTiddlyButton(createTiddlyElement(panel,"div"),this.hideLabel,this.hidePrompt,this.onClickHide);
	return panel;
};

config.macros.viewDetails.createClosedPanel = function(place,before,fields)
{
	var btn = createTiddlyButton(null,config.macros.viewDetails.label,config.macros.viewDetails.prompt,config.macros.viewDetails.onClickShow);
	place.insertBefore(btn,before);
	btn.setAttribute("fields",String.encodeHashMap(fields));
	return btn;
};

config.macros.viewDetails.onClickHide = function(e)
{
	var panel = findRelated(this,"viewDetails","className");
	var fields = panel.getAttribute("fields").decodeHashMap();
	config.macros.viewDetails.createClosedPanel(panel.parentNode,panel,fields);
	if(anim && config.options.chkAnimate) {
		anim.startAnimating(new Slider(panel,false,null,"all",true));
	} else {
		removeNode(panel);
	}
	return false;
};

config.macros.viewDetails.onClickShow = function(e)
{
	var fields = this.getAttribute("fields").decodeHashMap();
	var panel = config.macros.viewDetails.createOpenPanel(this.parentNode,this,fields);
	if(anim && config.options.chkAnimate) {
		anim.startAnimating(new Slider(panel,true,null,null,true));
	}
	removeNode(this);
	return false;
};

