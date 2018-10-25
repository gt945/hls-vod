Class('App.FileInfo', 'xui.Com',{
	Instance:{
		iniComponents : function(){
			// [[Code created by CrossUI RAD Studio
			var host=this, children=[], append=function(child){children.push(child.get(0));};
			
			append(
				xui.create("xui.UI.Dialog")
				.setHost(host,"dialog")
				.setLeft(240)
				.setTop(160)
				.setResizer(false)
				.setCaption("Codec Info")
				.setMovable(false)
				.setMinBtn(false)
				.setMaxBtn(false)
				.setRestoreBtn(false)
				.beforeClose("_dialog_beforeclose")
			);
			
			host.dialog.append(
				xui.create("xui.UI.TreeGrid")
				.setHost(host,"grid_format")
				.setDirtyMark(false)
				.setShowDirtyMark(false)
				.setAutoTips(false)
				.setDock("top")
				.setLeft(0)
				.setHeight(94)
				.setRowNumbered(true)
				.setIniFold(false)
				.setShowHeader(false)
				.setRowHandler(false)
				.setColResizer(false)
				.setColSortable(false)
				.setHeader([{
					"id" : "col1",
					"caption" : "col1",
					"width" : 80,
					"cellStyle" : "text-align:center",
					"type" : "input"
				},
				{
					"id" : "col2",
					"caption" : "col2",
					"width" : 205,
					"type" : "input"
				}])
				.setRows([{
					"id" : "type",
					"cells" : [{
						"value" : "Format"
					},
					{
						"value" : ""
					}]
				},
				{
					"id" : "size",
					"cells" : [{
						"value" : "Size"
					},
					{
						"value" : ""
					}]
				},
				{
					"id" : "duration",
					"cells" : [{
						"value" : "Duration"
					},
					{
						"value" : ""
					}]
				},
				{
					"id" : "resolution",
					"cells" : [{
						"value" : "Resolution"
					},
					{
						"value" : ""
					}]
				}])
				.setTreeMode("none")
				);
			
			host.dialog.append(
				xui.create("xui.UI.TreeGrid")
				.setHost(host,"grid_stream")
				.setShowDirtyMark(false)
				.setAutoTips(false)
				.setLeft(0)
				.setTop(0)
				.setRowNumbered(true)
				.setRowHandler(false)
				.setColResizer(false)
				.setColSortable(false)
				.setHeader([{
					"id" : "index",
					"caption" : "Stream",
					"width" : 40,
					"type" : "input",
					"cellStyle" : "text-align:center"
				},
				{
					"id" : "codec_name",
					"caption" : "Codec",
					"width" : 122,
					"type" : "input"
				},
				{
					"id" : "codec_type",
					"caption" : "Type",
					"width" : 122,
					"type" : "input"
				}])
				);
			
			return children;
			// ]]Code created by CrossUI RAD Studio
		},
		events:{"onRender":"_com_onrender", "onDestroy":"_com_ondestroy"},
		customAppend : function(parent, subId, left, top){
			var ns=this,info=ns.properties.info;
			ns.dialog.showModal(parent, left, top);
			xui.publish('dialog',['fileinfo',ns]);
			if(info&&info.format){
				var format=info.format;
				if(format.format_long_name){
					ns.grid_format.updateCellByRowCol('type', 'col2', format.format_long_name);
				}
				if(format.size){
					ns.grid_format.updateCellByRowCol('size', 'col2', parseInt(format.size/1024/1024)+ ' MB');
				}
				if(format.duration){
					ns.grid_format.updateCellByRowCol('duration', 'col2', parseInt(format.duration/60)+ ' Min');
				}
			}
			if(info&&info.streams){
				for(i in info.streams){
					if(info.streams[i]['codec_type']=='video'){
						var vstream=info.streams[i];
						ns.grid_format.updateCellByRowCol('resolution', 'col2', vstream.coded_width + ' x ' +vstream.coded_height);
					}
				}
				ns.grid_stream.setRows(info.streams);
			}
			return true;
		},
		_com_onrender:function(com,threadid){
			var ns=this;
			ns.save_hook=_.merge({},xui.$cache.hookKey);
			xui.$cache.hookKey={};
			xui.Event.keyboardHook("esc",0,0,0,function(){
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
		}
	}
});
