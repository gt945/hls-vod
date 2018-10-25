Class('App.ImageView', 'xui.Com',{
	Instance:{
		autoDestroy : true,
		properties : {},
		initialize : function(){
		},
		iniComponents : function(){
			// [[Code created by CrossUI RAD Studio
			var host=this, children=[], append=function(child){children.push(child.get(0));};

			append(
				(new xui.UI.Dialog())
				.setHost(host,"dialog")
				.setDock("cover")
				.setCaption("Image")
				.setMovable(false)
				.setMinBtn(false)
				.setStatus("max")
				.beforeClose("_dialog_beforeclose")
			);

			host.dialog.append(
				(new xui.UI.Pane())
				.setHost(host,"content")
				.setDock("fill")
				.setPosition("relative")
				.setOverflow("overflow-x:hidden;overflow-y:auto;")
			);

			host.content.append(
				(new xui.UI.Image())
				.setHost(host,"image")
				.setDock("width")
				.setPosition("relative")
				);

			return children;
			// ]]Code created by CrossUI RAD Studio
		},
		events:{"onRender":"_com_onrender", "onDestroy":"_com_ondestroy"},
		customAppend : function(parent, subId, left, top){
			var ns=this;
			ns.image.setSrc(ns.properties.path);
			ns.dialog.showModal(parent, left, top);
			xui.publish('dialog',['imageview',ns]);
			return true;
		},
		_com_onrender:function(com,threadid){
			var ns=this;
			ns.save_hook=_.merge({},xui.$cache.hookKey);
			xui.$cache.hookKey={};
			xui.Event.keyboardHook("esc",0,0,0,function(key){
				ns.dialog.close();
			});
			xui.Event.keyboardHook("j",0,0,0,function(){
				ns.content.getSubNode('xui.UI.Pane').get(0).scrollTop+=320;
			});
			xui.Event.keyboardHook("k",0,0,0,function(){
				ns.content.getSubNode('xui.UI.Pane').get(0).scrollTop-=320;
			});
		},
		_com_ondestroy:function(){
			var ns=this;
			xui.$cache.hookKey=_.merge({},ns.save_hook);
		},
		_dialog_beforeclose:function(profile){
			xui.publish('goback');
		}
	}
});
