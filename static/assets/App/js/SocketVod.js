// 默认的代码是一个从 xui.Com 派生来的类
Class('App.SocketVod', 'xui.Com',{
	autoDestroy : true,
	// 要确保键值对的值不能包含外部引用
	Instance:{
		// 本Com是否随着第一个控件的销毁而销毁
		autoDestroy : true,
		// 初始化属性
		properties : {

		},
		// 实例的属性要在此函数中初始化，不要直接放在Instance下
		initialize : function(){
			var ns=this;
			ns._cwd='';
			ns._player='';
			ns._prev=null;
			ns._next=null;
		},
		// 初始化内部控件（通过界面编辑器生成的代码，大部分是界面控件）
		// *** 如果您不是非常熟悉XUI框架，请慎重手工改变本函数的代码 ***
		iniComponents : function(){
			// [[Code created by CrossUI RAD Studio
			var host=this, children=[], append=function(child){children.push(child.get(0));};

			append(
				(new xui.UI.Dialog())
				.setHost(host,"dialog")
				.setDock("cover")
				.setCaption("")
				.setMovable(false)
				.setMinBtn(false)
				.setMaxBtn(false)
				.setRestoreBtn(false)
				.setOptBtn(true)
				.setStatus("max")
				.setCaption("Files")
				.beforeClose("_dialog_beforeclose")
				.onShowOptions("_dialog_onshowoptions")
			);
			host.dialog.append(
				(new xui.UI.TreeBar())
				.setHost(host,"tree")
				.setDock("fill")
				.setShowDirtyMark(false)
				.setAutoTips(false)
				.setOptBtn(true)
				.onShowOptions("_tree_onshowoptions")
				.onItemSelected("_tree_itemselected")
				.onContextmenu("_tree_contextmenu")
			);

			host.dialog.append(
				(new xui.UI.Block())
				.setHost(host,"header")
				.setDock("top")
				.setHeight(30)
				);

			host.header.append(
				(new xui.UI.ToolBar())
				.setHost(host,"toolbar1")
				.setItems([{
					"id" : "grp0",
					"sub" : [
					{
						"id" : "delete",
						"caption": "Delete",
						"tips" : "Delete Current Directory",
						"image" : "@xui_ini.appPath@image\/delete.png"
					}],
					"caption" : "grp0"
				},{
					"id":"grp1",
					"sub":[
						{
							"id":"filter",
							object: new xui.UI.ComboInput({type:'input'})
							.setHost(host,"filter")
							.onChange("_filter_onchange")
						}
					]
				},{
					"id":"grp2",
					"sub":[
						{
							"id":"prev",
							"caption" : "Prev",
							"tips": "Prev Directory"
						},{
							"id":"next",
							"caption" : "Next",
							"tips": "Next Directory"
						}
					]
				}])
				.onClick("_toolbar_onclick")
				.setDisableHoverEffect(true)
				.setHandler(false)
				);

			host.dialog.append(
				(new xui.UI.Block())
				.setHost(host,"footer")
				.setDock("bottom")
				.setHeight(30)
			);

			host.footer.append(
				(new xui.UI.ToolBar())
				.setHost(host,"toolbar2")
				.setItems([{
					"id":"grp1",
					"sub":[
						{
							"id":"device",
							object: new xui.UI.ComboInput()
							.setHost(host,"device")
							.setWidth(245)
							.setLabelSize(60)
							.setLabelCaption("Renders：")
							.setType("listbox")
							.setShowDirtyMark(false)
							.beforePopShow("_device_beforepopshow")
							.onChange("_device_onchange")
						}
					]
				}])
				.onClick("_toolbar_onclick")
				.setDisableHoverEffect(true)
				.setHandler(false)
				);

			return children;
			// ]]Code created by CrossUI RAD Studio
		},
		events:{"onRender":"_com_onrender", "onDestroy":"_com_ondestroy"},
		customAppend : function(parent, subId, left, top){
			this.dialog.showModal(parent, left, top);
			xui.publish('dialog',['socketvod',this]);
			return true;
		},
		_com_onrender:function(com,threadid){
			var ns=this;
			var filter=xui(ns.filter).query('input').get(0);
			filter.onfocus=function(){
				this.isfocus=true;
			}
			filter.onblur=function(){
				this.isfocus=false;
			}
			filter.hasfocus=function(){
				return this.isfocus==true;
			}
			ns.save_hook=_.merge({},xui.$cache.hookKey);
			xui.$cache.hookKey={};
			xui.Event.keyboardHook("esc",0,0,0,function(){
				if (filter.hasfocus()){
					filter.blur();
				}else{
					if(ns._cwd=='/'){
						xui.confirm("Confirm","OK",function(){
							ns.dialog.close();
						});
					}else{
						ns.loadPath(ns._cwd+'/..');
					}
				}
			});
			xui.Event.keyboardHook("j",0,0,0,function(){
				var tree=ns.tree;
				var items=tree.getItems();
				var item=tree.getItemByItemId(tree.getUIValue());
				var i=0;
				if (filter.hasfocus()) return;
				if (item){
					 i=_.arr.subIndexOf(items, 'id', item.id);
					 if(i+1<items.length){
					 	i++;
					 }
				}
				tree.setTabindex(null);
				tree.setUIValue(items[i].id);
			});

			xui.Event.keyboardHook("k",0,0,0,function(){
				var tree=ns.tree;
				var items=tree.getItems();
				var item=tree.getItemByItemId(tree.getUIValue());
				var i=items.length-1;
				if (filter.hasfocus()) return;
				if(item){
					i=_.arr.subIndexOf(items, 'id', item.id);
					if(i>0){
						i--;
					}
				}
				tree.setTabindex(null);
				tree.setUIValue(items[i].id);
			});

			xui.Event.keyboardHook("enter",0,0,0,function(){
				var value=ns.tree.getUIValue();
				if(value&&!filter.hasfocus()){
					ns.tree.setUIValue("");
					ns.tree.fireItemClickEvent(value);
				}else{
					filter.blur();
				}
				return false;
			});

			xui.Event.keyboardHook("u",0,0,0,function(){
				var tree=ns.tree;
				var items=tree.getItems();
				if (filter.hasfocus()) return;
				var i=_.arr.subIndexOf(items, 'caption', '..');
				if(i>=0){
					tree.setTabindex(null);
					tree.setUIValue('');
					tree.fireItemClickEvent(items[i].id);
				}
			});

			xui.Event.keyboardHook("c",0,0,0,function(){
				var value=ns.tree.getUIValue();
				if(value&&!filter.hasfocus()){
					ns.tree.getSubNodeByItemId('BAR', value).onContextmenu();
				}
			});

			xui.Event.keyboardHook("/",0,0,0,function(){
				xui(ns.filter).query('input').focus();
				return false;
			});

			xui.Event.keyboardHook("o",0,0,0,function(){
				xui.ComFactory.newCom("App.VideoSetting",function(){
					this.show();
				});
			});
			xui.Event.keyboardHook("n",0,0,0,function(){
				ns.toolbar1.fireItemClickEvent('next');
			});
			xui.Event.keyboardHook("p",0,0,0,function(){
				ns.toolbar1.fireItemClickEvent('prev');
			});


			if(_.isDefined(ns.properties.path)){
				ns.loadPath(ns.properties.path);
			}else{
				ns.loadPath("/");
			}
		},
		_com_ondestroy:function(){
			var ns=this;
			xui.$cache.hookKey=_.merge({},ns.save_hook);
		},
		loadPath:function(path){
			var ns=this,tree=ns.tree;
			var paras={
				action:"list",
				path:path
			}
			tree.busy();
			xui.request(XVODURL+"xui", paras, function(rsp){
				if(rsp&&rsp.msg&&rsp.msg=='success'){
					tree.setItems(rsp.list);
					ns._cwd=rsp.cwd;
					ns._prev=rsp.prev;
					ns._next=rsp.next;
				}
				tree.free();
			},function(){
				tree.free();
			},null,{method:'post'});
		},
		_tree_itemselected:function(profile,item){
			var ns=this,tree=ns.tree;
			switch(item.type){
				case "directory":
					ns.loadPath(item.path);
					break;
				case "image":
					var f=function(){
						xui.ComFactory.newCom("App.ImageView",function(){
							this.show();
						},null,{
							path:XVODURL+'raw/'+encodeURIComponent(item.path)
							//path:XVODURL+'raw2/'+encodeURIComponent(item.base64)+'/'+encodeURIComponent(item.caption)
						});
					}
					_.asyRun(f);
					break;
				case "video":
					var protocol='ws';
					if (xui.browser.isIOS){
						protocol='m3u8';
					}
					var f=function(){
						xui.ComFactory.newCom("App.Video",function(){
							this.show();
						},null,{
							url:XVODURL+'play.html?path='+encodeURIComponent(item.base64)+'&protocol='+protocol
						});
					}
					_.asyRun(f);
					break;
			}
			tree.setUIValue("");
		},
		_tree_contextmenu:function(profile,e,src,item){
			var ns=this,tree=ns.tree;
			var items=[];
			var context=new xui.UI.PopMenu();
			if(!item||!item.caption||item.caption==".."){
				return false;
			}
			items.push({
				id:"del",
				caption:"Delete"
			});
			
			if(item.type!="directory"){
				items.push({
					id:"raw",
					caption:"URL"
				});
			}
			if(item.type=="video"){
				items.push({
					id:"info",
					caption:"Info"
				});
				items.push({
					id:"play",
					caption:"DLNA"
				});
			}
			context.setItems(items);
			var callback=function(prf,i){
				switch(i.id){
				case "del":
					xui.confirm("Confirm","Delete \""+item.caption+"\"？",function(){
						var paras={
							action:"del",
							path:item.path
						}
						tree.busy();
						xui.request(XVODURL+"xui", paras, function(rsp){
							if(rsp&&rsp.msg&&rsp.msg=='success'){
								ns.loadPath(ns._cwd);
							}else{
								alert('Delete failed');
								tree.free();
							}

						},function(){
							tree.free();
						},null,{method:'post'});
					});
					break;
				case "raw":
					var vodurl=XVODURL;
					if (vodurl=='') {
						vodurl=window.location.href;
					}
					var rawUrl=vodurl+'raw2/'+encodeURIComponent(item.base64)+'/'+encodeURIComponent(item.value);
					if (xui.browser.isIOS){
						xui.ComFactory.newCom("App.Input",function(){
							this.show();
						},null,{caption:"URL",value:rawUrl}, {});
					}else{
						var textArea=document.createElement("textarea");
						textArea.value=rawUrl;
						textArea.style.opacity='0';
						document.body.appendChild(textArea);
						textArea.select();
						try {
							document.execCommand('copy');
						}catch(err) {
						}
						document.body.removeChild(textArea);
					}
					break;
				case "info":
					var paras={
						action:"info",
						path:item.path
					}
					tree.busy();
					xui.request(XVODURL+"xui", paras, function(rsp){
						if(rsp&&rsp.msg&&rsp.msg=='success'){
							xui.ComFactory.newCom("App.FileInfo",function(){
								this.show();
							},null,{info:rsp.info});
						}
						tree.free();
					},function(){
						tree.free();
					},null,{method:'post'});
					break;
				case "play":
					var paras={
						action:"play",
						path:item.path,
						player:ns._player
					}
					tree.busy();
					xui.request(XVODURL+"xui", paras, function(rsp){
						tree.free();
					},function(){
						tree.free();
					},null,{method:'post'});
					break;
				}
			}
			context.onMenuSelected(callback);
			context.onHide(function(profile){
				pop_onHide(profile);
				delete context;
			});
			pop_item(context,src);
			return false;
		},
		_dialog_beforeclose:function(profile){
			var ns=this, uictrl=profile.boxing();
			xui.publish('goback');
		},
		_dialog_onshowoptions:function(){
			xui.ComFactory.newCom("App.VideoSetting",function(){
				this.show();
			});
		},
		_toolbar_onclick:function(profile, item, group, e, src){
			var ns=this,tree=ns.tree,ctrl=profile.boxing();
			switch(item.id){
				case "delete":
					xui.confirm("Confirm","Delete\""+ns._cwd+"\"？",function(){
						var paras={
							action:"del",
							path:ns._cwd
						}
						tree.busy();
						xui.request(XVODURL+"xui", paras, function(rsp){
							if(rsp&&rsp.msg&&rsp.msg=='success'){
								ns.loadPath(ns._cwd+'/..');
							}else{
								alert('Delete failed');
								tree.free();
							}
						},function(){
							tree.free();
						},null,{method:'post'});
					});
					break;
				case "prev":
					if(ns._prev){
						ns.loadPath(ns._prev);
					}
					break;
				case "next":
					if(ns._next){
						ns.loadPath(ns._next);
					}
					break
			}
			ctrl.setTabindex(null);
		},
		_tree_onshowoptions:function(profile,item,e,src){
			var ns=this;
			ns._tree_contextmenu(profile,e,src,item);
		},
		_filter_onchange:function(profile,oldValue,newValue,force,tag){
			var ns=this,uictrl=profile.boxing(),tree=ns.tree;
			if(oldValue!=newValue){
				var items=tree.getItems();
				var reg=new RegExp(uictrl.getUIValue(),'i');
				_.arr.each(items,function(item){
					if (!reg.test(item.caption)){
						tree.updateItem(item.id, {hidden:true})
					}else{
						tree.updateItem(item.id, {hidden:false})
					}
				});
			}
		},
		_device_beforepopshow:function(profile,popCtl){
			var ns=this, uictrl=profile.boxing(),elem=popCtl.boxing();
			var paras={
				action:"discovery"
			}

			uictrl.busy();
			xui.request(XVODURL+"xui", paras, function(rsp){
				if(rsp&&rsp.msg&&rsp.msg=='success'){
					uictrl.setItems(rsp.items);
				}
				uictrl.free();
			},function(){
				uictrl.free();
			},null,{method:'post'});
		},
		_device_onchange:function(profile,oldValue,newValue,force,tag){
			var ns=this,item=profile.getItemByItemId(newValue);
			if(item){
				ns._player=item.xml;
			}
		},
		_device_stop:function(){
			var ns=this;
			var paras={
				action:"stop",
				player:ns._player
			}
			xui.request(XVODURL+"xui", paras, function(rsp){
			},function(){
			},null,{method:'post'});
		}

	},
	Static:{
		designViewConf:{
			"width" : 320,
			"height" : 480,
			"mobileFrame" : false
		}
	}
});
