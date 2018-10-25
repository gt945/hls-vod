Class('App.Video', 'xui.Com',{
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
				.setDock("fill")
				.setCaption("Video")
				.setMovable(false)
				.setMinBtn(false)
				.setMaxBtn(false)
				.setRestoreBtn(false)
				.setOptBtn(true)
				.setStatus("max")
				.beforeClose("_dialog_beforeclose")
				.onShowOptions("_dialog_onshowoptions")
			);

			host.dialog.append(
				(new xui.UI.Pane())
				.setHost(host,"content")
				.setDock("fill")
				.setPosition("relative")
				.setIframeAutoLoad(host.properties.url)
				.onRender("_content_onrender")
			);
			return children;
			// ]]Code created by CrossUI RAD Studio
		},
		events:{"onRender":"_com_onrender", "onDestroy":"_com_ondestroy"},
		customAppend : function(parent,subId,left,top){
			var ns=this;
			ns.dialog.showModal(parent,left,top);
			xui.publish('dialog',['video',ns]);
			return true;
		},
		_com_onrender:function(com,threadid){
			var ns=this;
			ns.save_hook=_.merge({},xui.$cache.hookKey);
			xui.$cache.hookKey={};
			xui.Event.keyboardHook("esc",0,0,0,function(key){
				ns.dialog.close();
			});
		},
		_content_onrender:function(profile){
			var uictrl=profile.boxing();
			xui(uictrl).query('iframe').attr('allowfullscreen', 'true');
		},
		_com_ondestroy:function(){
			var ns=this;
			xui.$cache.hookKey=_.merge({},ns.save_hook);
		},
		_dialog_beforeclose:function(profile){
			var ns = this, uictrl = profile.boxing();
			xui.publish('goback');
		},
		_dialog_onshowoptions:function(){
			xui.ComFactory.newCom("App.VideoSetting",function(){
				this.show();
			});
		}
	}
});
