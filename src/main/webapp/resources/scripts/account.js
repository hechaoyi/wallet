Ext.define("wallet.account", {
	extend : "Ext.panel.Panel",

	initComponent : function() {
		var store = util.store({
			model : "model.account",
			url : "/account/sorted",
			load : function() {
				this.sumBalance = this.sum("balance");
				var sum = util.currency(this.sumBalance);
				Ext.getCmp("account-sum").setText(
						"总资产：<span class='statistics'>" + sum + "</span>");
			}
		});
		Ext.apply(this, {
			title : "账户管理",
			bodyStyle : "background:#DFE8F6",
			layout : {
				type : "vbox",
				align : "stretch"
			},
			items : [ this.initGrid(store), this.initChart(store) ]
		});
		this.callParent(arguments);
	},

	initGrid : function(store) {
		var editor = {
			ptype : "rowediting",
			clicksToMoveEditor : 1,
			listeners : {
				validateedit : this.edit.delegate(store)
			}
		};
		var accountType = Ext.create("Ext.data.ArrayStore", {
			fields : [ "name" ],
			data : [ [ "现金" ], [ "储蓄卡" ], [ "信用卡" ], [ "充值卡" ], [ "虚拟账户" ] ]
		});
		return {
			xtype : "grid",
			flex : 1,
			margin : "3",
			loadMask : true,
			forceFit : true,
			store : store,
			plugins : editor,
			columns : [ {
				xtype : "rownumberer"
			}, {
				text : "名称",
				dataIndex : "name",
				width : 120,
				menuDisabled : true,
				editor : {
					emptyText : "请输入...",
					allowBlank : false
				}
			}, {
				header : "类型",
				dataIndex : "type",
				width : 80,
				menuDisabled : true,
				editor : {
					xtype : "combobox",
					editable : false,
					valueField : "name",
					displayField : "name",
					store : accountType,
					emptyText : "请选择...",
					allowBlank : false
				}
			}, {
				text : "余额",
				dataIndex : "balance",
				width : 120,
				menuDisabled : true,
				renderer : util.currency,
				editor : {
					xtype : "numberfield",
					emptyText : "请输入...",
					step : 10,
					allowBlank : false
				}
			}, {
				header : "备注",
				dataIndex : "description",
				width : 240,
				menuDisabled : true,
				editor : {
					allowBlank : true
				}
			}, {
				header : "最后更新时间",
				dataIndex : "lastUpdate",
				width : 120,
				menuDisabled : true,
				renderer : util.datetime
			}, {
				header : "创建时间",
				dataIndex : "createTime",
				width : 120,
				menuDisabled : true,
				renderer : util.datetime
			}, {
				header : "收入",
				dataIndex : "defaultIncome",
				width : 40,
				menuDisabled : true,
				renderer : util.status
			}, {
				header : "支出",
				dataIndex : "defaultOutlay",
				width : 40,
				menuDisabled : true,
				renderer : util.status
			}, {
				header : "显示",
				dataIndex : "display",
				width : 40,
				menuDisabled : true,
				renderer : util.status
			} ],
			tbar : [ {
				text : "刷新",
				iconCls : "icon-reload",
				handler : function() {
					store.load();
				}
			}, "-", {
				text : "添加账户",
				iconCls : "icon-add",
				handler : function() {
					// store.load();
				}
			}, {
				text : "删除账户",
				iconCls : "icon-remove",
				handler : function() {
					// store.load();
				}
			}, "-", {
				text : "设为默认收入",
				iconCls : "icon-income",
				id : "incomeBtn",
				disabled : true,
				handler : this.setup.delegate(this, store, "/account/income")
			}, {
				text : "设为默认支出",
				iconCls : "icon-outlay",
				id : "outlayBtn",
				disabled : true,
				handler : this.setup.delegate(this, store, "/account/outlay")
			}, {
				text : "显示/隐藏",
				iconCls : "icon-show-hide",
				id : "displayBtn",
				disabled : true,
				handler : this.setup.delegate(this, store, "/account/display")
			}, "->", {
				xtype : "tbtext",
				id : "account-sum",
				text : "总资产：<span class='statistics'>￥0.00</span>"
			} ],
			listeners : {
				selectionchange : function() {
					var sm = this.getSelectionModel();
					var multi = sm.getCount() != 1;
					var sl = sm.getSelection();
					this.down("#incomeBtn").setDisabled(
							multi || sl[0].get("defaultIncome"));
					this.down("#outlayBtn").setDisabled(
							multi || sl[0].get("defaultOutlay"));
					this.down("#displayBtn").setDisabled(multi);
				}
			}
		};
	},
	edit : function(store) {
		var editor = this;
		var form = editor.getEditor().getForm();
		var params = form.getValues();
		var record = editor.context.record;
		params.id = record.getId();
		params.version = record.get("version");
		params.lastUpdate = util.datetime(record.get("lastUpdate"));
		params.createTime = util.datetime(record.get("createTime"));
		params.defaultIncome = record.get("defaultIncome");
		params.defaultOutlay = record.get("defaultOutlay");
		params.display = record.get("display");
		params.orderNo = record.get("orderNo");
		form.submit({
			clientValidation : false,
			url : "/account/update",
			params : params,
			waitTitle : "提示",
			waitMsg : "保存中...",
			success : function() {
				store.load();
			},
			failure : function(form, action) {
				if (action.failureType != "server") {
					Ext.Msg.alert("提示", "发生错误");
				} else if (!action.result.errors) {
					Ext.Msg.alert("提示", action.result.message);
				} else {
					editor.startEdit(record, 0);
					for ( var name in action.result.errors) {
						var field = form.findField(name);
						if (field) {
							var message = action.result.errors[name];
							field.markInvalid(message);
							var chain = field.validator;
							field.validator = function(value) {
								if (typeof (chain) == "function") {
									var msg = chain(value);
									if (msg !== true)
										return msg;
								}
								return (value != params[name]) || message;
							};
						}
					}
				}
			}
		});
	},
	setup : function(panel, store, url) {
		var mask = new Ext.LoadMask(Ext.getBody(), {
			msg : "设置中..."
		});
		mask.show();
		var grid = panel.down("grid");
		var record = grid.getSelectionModel().getSelection()[0];
		Ext.Ajax.request({
			url : url,
			params : {
				id : record.getId()
			},
			callback : function(opt, success, response) {
				mask.destroy();
				if (success) {
					var json = Ext.JSON.decode(response.responseText);
					if (json.success)
						store.load();
					else
						Ext.Msg.alert("提示", json.message);
				} else {
					Ext.Msg.alert("提示", "发生错误");
				}
			}
		});
	},

	initChart : function(store) {
		return {
			flex : 1,
			margin : "0 3 3 3"
		};
	}
});
