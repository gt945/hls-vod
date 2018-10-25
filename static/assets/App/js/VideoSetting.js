Class('App.VideoSetting', 'xui.Com',{
	Instance:{
		autoDestroy : true,
		iniComponents : function(){
			// [[Code created by CrossUI RAD Studio
			var host=this, children=[], append=function(child){children.push(child.get(0));};
			
			append(
				xui.create("xui.UI.Dialog")
				.setHost(host,"dialog")
				.setAutoTips(false)
				.setLeft(230)
				.setTop(190)
				.setHeight(180)
				.setSelectable(false)
				.setResizer(false)
				.setCaption("Play Setting")
				.setMovable(false)
				.setMinBtn(false)
				.setMaxBtn(false)
				.setRestoreBtn(false)
				.beforeClose("_dialog_beforeclose")
				);
			
			host.dialog.append(
				xui.create("xui.UI.ComboInput")
				.setHost(host,"width")
				.setLeft(40)
				.setTop(30)
				.setWidth(190)
				.setLabelSize(60)
				.setLabelCaption("Width：")
				.setType("listbox")
				.setItems([{
					"id" : "320",
					"caption" : "320"
				},
				{
					"id" : "480",
					"caption" : "480"
				},
				{
					"id" : "800",
					"caption" : "800"
				},
				{
					"id" : "960",
					"caption" : "960"
				},
				{
					"id" : "1280",
					"caption" : "1280"
				},
				{
					"id" : "1920",
					"caption" : "1920"
				}])
				
				);
			
			host.dialog.append(
				xui.create("xui.UI.ComboInput")
				.setHost(host,"crf")
				.setLeft(40)
				.setTop(70)
				.setWidth(190)
				.setLabelSize(60)
				.setLabelCaption("Quality：")
				.setType("listbox")
				.setItems([{
					"id" : "18",
					"caption" : "18"
				},
				{
					"id" : "19",
					"caption" : "19"
				},
				{
					"id" : "20",
					"caption" : "20"
				},
				{
					"id" : "21",
					"caption" : "21"
				},
				{
					"id" : "22",
					"caption" : "22"
				},
				{
					"id" : "23",
					"caption" : "23"
				},
				{
					"id" : "24",
					"caption" : "24"
				},
				{
					"id" : "25",
					"caption" : "25"
				},
				{
					"id" : "26",
					"caption" : "26"
				},
				{
					"id" : "27",
					"caption" : "27"
				},
				{
					"id" : "28",
					"caption" : "28"
				}])
				);
			
			host.dialog.append(
				xui.create("xui.UI.HTMLButton")
				.setHost(host,"ok")
				.setLeft(36)
				.setTop(115)
				.setWidth(100)
				.setHeight(22)
				.setHtml("OK")
				.onClick("_ok_onclick")
				);
			
			host.dialog.append(
				xui.create("xui.UI.HTMLButton")
				.setHost(host,"cancel")
				.setLeft(166)
				.setTop(115)
				.setWidth(100)
				.setHeight(22)
				.setHtml("Cancel")
				.onClick("_cancel_onclick")
				);
			
			return children;
			// ]]Code created by CrossUI RAD Studio
		},
		events:{"onRender":"_com_onrender", "onDestroy":"_com_ondestroy"},
		customAppend : function(parent,subId,left,top){
			var ns=this,dialog=ns.dialog;
			ns.dialog.showModal(parent,left,top);
			xui.publish('dialog',['videosetting',ns]);
			var paras={
				action:"get_conf"
			}
			dialog.busy();
			xui.request(XVODURL+"xui", paras, function(rsp){
				if(rsp&&rsp.msg&&rsp.msg=='success'){
					ns.width.setValue(rsp.width);
					ns.width.setUIValue(rsp.width);
					ns.crf.setValue(rsp.crf);
					ns.crf.setUIValue(rsp.crf);
				}
				dialog.free();
			},function(){
				dialog.free();
			},null,{method:'post'});
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
		_com_ondestroy:function(){
			var ns=this;
			xui.$cache.hookKey=_.merge({},ns.save_hook);
		},
		_dialog_beforeclose:function(profile){
			var ns = this, uictrl = profile.boxing();
			xui.publish('goback');
		},
		_ok_onclick:function (profile, e, src, value){
			var ns=this,dialog=ns.dialog;
			var paras={
				action:"set_conf",
				width:ns.width.getUIValue(),
				crf:ns.crf.getUIValue()
			}
			dialog.busy();
			xui.request(XVODURL+"xui", paras, function(rsp){
				dialog.free();
				dialog.close();
			},function(){
				dialog.free();
			},null,{method:'post'});
		},
		_cancel_onclick:function(){
			var ns=this;
			ns.dialog.close();
		},
	}
});
