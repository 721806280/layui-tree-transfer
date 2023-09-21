layui.define(['jquery', 'form', 'tree'], function (exports) {
    "use strict";

    var $ = layui.$,                                // jQuery
        form = layui.form,                          // form
        tree = layui.tree,                          // tree
        moduleName = 'treeTransfer',         // 模块名

        //外部接口
        treeTransfer = {
            version: '1.0.0',
            config: {
                // 是否展示关键词搜索
                showSearch: false,
                // 初始化的所有菜单在 右侧 ,默认 左侧
                isRight: false,
            },
            index: layui[moduleName] ? (layui[moduleName].index + 10000) : 0,

            //设置全局项
            set: function (options) {
                let that = this;
                that.config = $.extend({}, that.config, options);
                return that;
            }
        },
        //操作当前实例
        thisModule = function () {
            let that = this,
                options = that.config,
                id = options.id || that.index;

            thisModule.that[id] = that; //记录当前实例对象

            return {
                config: options,
                // 重置实例
                reload: function () {
                    that.reload(true);
                },
                // 获取数据
                getData: function () {
                    return that.getData.call(that);
                }
            }
        },
        // 构造器
        Class = function (options) {
            let that = this;
            options = $.extend({
                index: ++treeTransfer.index,
                id: 'tree-transfer',            // 容器
                data: [],                       // 源数据
                value: [],                      // 已选数据
                title: [],                      // 左右标题
                showSearch: false,              // 是否显示关键词搜索
                isRight: false,                 // 是否将初始化数据放右侧
            }, options);

            that.config = options;
            that.index = options.index;
            that.elem = "#" + options.id;
            that.allTree = options.data;
            that.initLeftTree = options.leftTree || [];
            that.initRightTree = options.rightTree || [];
            that.leftTree = deepClone(this.initLeftTree);
            that.rightTree = deepClone(this.initRightTree);
            that.tempLeftTree = null;
            that.tempRightTree = null;
        },
        //判断一个字符串是否为空
        isEmpty = function (str) {
            return str === null || str === '' || str === 'undefined' || typeof str === 'undefined';
        },
        deepClone = function (source) {
            if (!source && typeof source !== 'object') {
                throw new Error('深复制传入数据错误')
            }
            var targetObj = source.constructor === Array ? [] : {}
            $.each(source, function (keys, val) {
                if (source[keys] && typeof source[keys] === 'object') {
                    targetObj[keys] = deepClone(source[keys])
                } else {
                    targetObj[keys] = source[keys]
                }
            })
            return targetObj
        };

    // 渲染树形穿梭框
    Class.prototype.render = function () {
        let that = this, options = that.config, $elem = $(that.elem);
        // 清空容器
        $elem.empty();

        // 创建外层容器
        $elem.append('<div class="layui-transfer layui-form layui-border-box" lay-filter="' + that.elem + '"></div>');

        // 创建左右两个盒子
        $elem.find('.layui-transfer').append('<div class="layui-transfer-box"></div>');
        $elem.find('.layui-transfer').append('<div class="layui-transfer-active"></div>');
        $elem.find('.layui-transfer').append('<div class="layui-transfer-box"></div>');

        // 添加左右盒子的内容
        this.addBox(0);
        this.addBox(1);

        // 添加转换箭头的内容
        this.addArrow($elem.find('.layui-transfer-active'));

        // 重新组织初始化树数据，根据左右渲染和已选初始值进行处理
        this.initTreeData(deepClone(this.allTree), options.value);
    }

    // 初始化树形穿梭框
    Class.prototype.initTreeData = function (allTree, historyValue) {
        var that = this;
        // 左右重新渲染
        if (that.config.isRight) {
            that.initRightTree = this.removeChooseTree(allTree, historyValue)
            that.initLeftTree = historyValue || []
        } else {
            that.initLeftTree = this.removeChooseTree(allTree, historyValue)
            that.initRightTree = historyValue || []
        }
        that.rightTree = deepClone(that.initRightTree)
        that.leftTree = deepClone(that.initLeftTree)
        that.reload()
    }

    // 绘制树形穿梭框
    Class.prototype.addBox = function (index) {
        // 保存this引用
        var that = this, options = that.config;

        // 获取容器元素
        var $ele = $(that.elem).find('.layui-transfer-box').eq(index).html('');

        // 获取标题和数据
        var title = options.title[index];
        var data = index ? options.rightTree : options.leftTree; // 根据索引选择左侧树或右侧树的数据

        // 是否显示搜索框
        var showSearch = options.showSearch;

        // 添加标题和复选框
        if (title) {
            $ele.append('<div class="layui-transfer-header"></div>');
            $ele.find('.layui-transfer-header').append('<input type="checkbox" name="transferCheckbox' + index + that.elem + '" lay-filter="transferCheckbox' + index + that.elem + '" lay-skin="primary" title="' + title + '">');
        }

        if (showSearch) {
            // 添加搜索框
            $ele.append('<div class="layui-transfer-search"><i class="layui-icon layui-icon-search"></i><input class="layui-input ' + (index === 0 ? 'leftSearch' : 'rightSearch') + '" placeholder="关键词搜索"></div>');
        }

        // 渲染页面
        form.render();

        // 添加数据容器
        $ele.append('<ul class="layui-transfer-data" style="height:267px"></ul>');

        // 渲染树形组件
        tree.render({
            elem: $ele.find('.layui-transfer-data'),
            data: data,
            showCheckbox: true, // 是否显示复选框
            showLine: false,
            id: that.elem + '-' + index,
            // 复选框选中事件回调
            oncheck: function (obj) {
                var parentId = this.id.split('-')[0];
                var index = this.id.split('-')[1];
                var checkedVal = tree.getChecked(this.id);

                // 控制全选复选框的选中状态
                that.controlCheckAll(checkedVal, index);

                // 控制左右穿梭箭头的禁用状态
                that.controlArrow(checkedVal, parentId, index);
            }
        });

        // 初始化复选框事件
        this.initCheckboxEvent();

        // 初始化搜索框事件
        this.initSearchEvent();
    };

    // 穿梭箭头 disable 控制
    Class.prototype.controlArrow = function (checkedVal, parentId, index) {
        var arrowSelector = index === '0' ? '.layui-icon-next' : '.layui-icon-prev';
        var $arrowParent = $(parentId).find(arrowSelector).parent();

        if (checkedVal.length) {
            $arrowParent.removeClass('layui-btn-disabled');
        } else {
            $arrowParent.addClass('layui-btn-disabled');
        }
    }

    // 全选 checkBox 选中状态筛选
    Class.prototype.controlCheckAll = function (checkedVal, index) {
        // 检查是否全部选中
        var isAllChecked = checkAllSelected(index === 0 ? (this.tempLeftTree || this.leftTree) : (this.tempRightTree || this.rightTree), checkedVal);
        // 更新表单值
        form.val('transferCheckbox' + index + this.elem, isAllChecked);

        /**
         * 检查是否全部选中
         * @param {Array} allVal - 树形数据的数组
         * @param {Array} checkedVal - 已选中的数据的数组
         * @returns {boolean} - 是否全部选中
         */
        function checkAllSelected(allVal, checkedVal) {
            // 检查第一层长度是否一致，不一致则直接返回 false
            if (allVal.length !== checkedVal.length) {
                return false;
            }

            // 比对第二层，如果有子节点且长度不一致则返回 false
            for (let i = 0; i < allVal.length; i++) {
                if (checkedVal[i].children && allVal[i].children && checkedVal[i].children.length !== allVal[i].children.length) {
                    return false;
                }
            }

            return true;
        }
    }

    // 关键词搜索 事件绑定
    Class.prototype.initSearchEvent = function () {
        // 将当前上下文保存到 that 变量中，以便在内部函数中引用
        var that = this, options = that.config;
        // 绑定左右侧搜索框的键盘输入事件
        $(that.elem).find('.leftSearch, .rightSearch').keyup(function () {
            // 获取搜索框的值并去除首尾空格
            var val = $(this).val().trim();
            // 调用 keywordSearch 方法进行关键词搜索，
            // 根据搜索框是否包含 leftSearch 类名来确定索引值 0 或 1
            that.keywordSearch(val, $(this).hasClass('leftSearch') ? 0 : 1);
        });
    }

    // 关键词搜索
    Class.prototype.keywordSearch = function (val, index) {
        // 根据索引选择要搜索的树进行深拷贝
        var tempTree = index === 0 ? deepClone(this.leftTree) : deepClone(this.rightTree);

        var resultTree = [];

        // 遍历树的每个节点
        tempTree.forEach(function (data) {
            // 如果节点的标题中包含搜索关键词，将节点添加到结果树中
            if (data.title.indexOf(val) !== -1) {
                resultTree.push(data);
            } else if (data.children && data.children.length) {
                // 如果节点有子节点
                var childTemp = [];
                // 遍历子节点
                data.children.forEach(function (childData) {
                    // 如果子节点的标题中包含搜索关键词，将子节点添加到临时数组中
                    if (childData.title.indexOf(val) !== -1) {
                        childTemp.push(childData);
                    }
                });
                // 如果临时数组中存在子节点
                if (childTemp.length) {
                    var tempObj = deepClone(data);
                    // 如果节点之前未展开过，则设置展开状态为 true
                    if (!tempObj.spread) {
                        tempObj.spread = true;
                        tempObj.spreadTemp = true;
                    }
                    tempObj.children = childTemp;
                    // 将包含子节点的节点添加到结果树中
                    resultTree.push(tempObj);
                }
            }
        });

        // 重新渲染树形结构
        tree.reload(this.elem + '-' + index, {
            data: resultTree
        });

        // 根据索引赋值临时树
        if (index === 0) {
            this.tempLeftTree = resultTree;
        } else {
            this.tempRightTree = resultTree;
        }
    }

    // 初始化 全选 CheckBox 事件
    Class.prototype.initCheckboxEvent = function () {
        // 将this存储为that，以便在嵌套函数中使用
        var that = this, options = that.config;

        transferCheckbox(0);
        transferCheckbox(1);

        function transferCheckbox(index) {
            // 监听复选框改变事件
            form.on('checkbox(transferCheckbox' + index + that.elem + ')', function (data) {
                if (data.elem.checked) { // 复选框被选中
                    // 获取对应的树形数据
                    var treeData = index === 0 ? (that.tempLeftTree || that.leftTree) : (that.tempRightTree || that.rightTree);

                    var treeArr = [];
                    // 遍历树形数据，将节点的id添加到treeArr数组中
                    traverseTree(treeData, function (node) {
                        treeArr.push(node.id);
                    });

                    // 设置对应树形组件的选中节点
                    tree.setChecked(that.elem + '-' + index, treeArr);
                } else { // 复选框未选中
                    // 重新加载对应的树形组件
                    tree.reload(that.elem + '-' + index);
                    // 添加禁用样式至按钮
                    $(that.elem).find(index === 0 ? '.layui-icon-next' : '.layui-icon-prev').parent().addClass('layui-btn-disabled');
                }
            });
        }

        // 遍历树形数据的工具函数，接受一个回调函数作为参数
        function traverseTree(treeData, callback) {
            treeData.forEach(function (node) {
                callback(node);
                if (node.children && node.children.length) {
                    traverseTree(node.children, callback); // 递归调用
                }
            });
        }
    };

    // 左右箭头穿梭点击事件
    Class.prototype.addArrow = function ($ele) {
        var that = this, options = that.config; // 将this存储为that，以便在嵌套函数中使用

        // 添加左右箭头按钮
        $ele.append('<button type="button" class="layui-btn layui-btn-sm layui-btn-disabled"><i class="layui-icon layui-icon-next"></i></button><button type="button" class="layui-btn layui-btn-sm layui-btn-disabled"><i class="layui-icon layui-icon-prev"></i></button>');

        // 左箭头按钮点击事件
        $ele.find('.layui-icon-next').parent().click(function () {
            // 获取左侧已选数据
            var leftChoose = tree.getChecked(that.elem + '-' + 0);
            if (!leftChoose.length) return; // 如果未选择任何数据，则直接返回

            // 整理左右数据
            that.leftTree = that.removeChooseTree(that.leftTree, leftChoose); // 从左侧树形数据中移除选择的节点
            that.rightTree = that.addChooseTree(that.rightTree, leftChoose); // 将选择的节点添加到右侧树形数据中

            that.reload(); // 重新渲染左右树形组件
        });

        // 右箭头按钮点击事件
        $ele.find('.layui-icon-prev').parent().click(function () {
            // 获取右侧已选数据
            var rightChoose = tree.getChecked(that.elem + '-' + 1);
            if (!rightChoose.length) return; // 如果未选择任何数据，则直接返回

            // 整理左右数据
            that.leftTree = that.addChooseTree(that.leftTree, rightChoose); // 将选择的节点添加到左侧树形数据中
            that.rightTree = that.removeChooseTree(that.rightTree, rightChoose); // 从右侧树形数据中移除选择的节点

            that.reload(); // 重新渲染左右树形组件
        });
    };

    // 重载树形穿梭框
    Class.prototype.reload = function (reset) {
        let that = this, options = that.config, $elem = $(that.elem);

        if (reset) {
            that.leftTree = deepClone(that.initLeftTree);
            that.rightTree = deepClone(that.initRightTree);
        }

        // 重新加载左侧树形组件
        tree.reload(that.elem + '-' + 0, {
            data: that.leftTree,
        });

        // 重新加载右侧树形组件
        tree.reload(that.elem + '-' + 1, {
            data: that.rightTree,
        });

        // 禁用箭头按钮
        $elem.find('.layui-icon-next, .layui-icon-prev').parent().addClass('layui-btn-disabled');

        // 全选按钮置为 false
        var setValues = {
            ['transferCheckbox0' + that.elem]: false,
            ['transferCheckbox1' + that.elem]: false,
        };
        form.val(that.elem, setValues);

        // 清除临时树形数据
        that.tempLeftTree = null;
        that.tempRightTree = null;

        // 清除关键词输入框的值
        $elem.find('.layui-input').val('');
    };

    // 删除已选树节点
    Class.prototype.removeChooseTree = function (origin, choose) {
        // 递归处理每个节点
        $.each(choose, function (n, data) {
            if (!data.children) {
                // 如果没有子节点，则表示为一级节点，直接比对id并删除
                var id = data.id;
                $.each(origin, function (i, originData) {
                    if (!originData || originData.children) return;
                    // 比对id，找到匹配的节点并删除
                    var isChoose = false;
                    if (id === originData.id) {
                        isChoose = true;
                    }
                    if (isChoose) {
                        origin.splice(i, 1);
                    }
                });
                return;
            }
            // 有子节点的情况
            $.each(data.children, function (m, dataChild) {
                var id = dataChild.id;
                $.each(origin, function (i, data) {
                    if (!data || !data.children) return;
                    $.each(data.children, function (j, dataChild) {
                        // 比对id，找到匹配的节点并删除
                        var isChoose = false;
                        if (dataChild && id === dataChild.id) {
                            isChoose = true;
                        }
                        if (isChoose) {
                            data.children.splice(j, 1);
                        }
                    });
                    // 如果父节点没有子节点，则将父节点从原始树中删除
                    if (data && !data.children.length) {
                        origin.splice(i, 1);
                    }
                });
            });
        });
        return origin;
    };

    // 添加树节点
    Class.prototype.addChooseTree = function (origin, choose) {
        // 创建字典存储原始数据
        var dict = {};
        for (var i = 0; i < origin.length; i++) {
            dict[origin[i].id] = origin[i];
        }

        // 遍历 choose 数组
        for (var j = 0; j < choose.length; j++) {
            var data = choose[j];
            if (data.spreadTemp) {
                data.spread = false;
            }
            if (dict.hasOwnProperty(data.id)) {
                // 原始数据存在，合并子节点
                if (data.children) {
                    dict[data.id].children = data.children.concat(dict[data.id].children || []);
                }
            } else {
                // 原始数据不存在，直接插入
                origin.unshift(data);
            }
        }

        return origin;
    };

    //获得右侧面板数据
    Class.prototype.getData = function () {
        var that = this, options = that.config;
        return options.isRight ? that.leftTree : that.rightTree;
    };

    //记录所有实例
    thisModule.that = {}; //记录所有实例对象

    //获取当前实例对象
    thisModule.getThis = function (id) {
        var that = thisModule.that[id];
        if (!that) {
            throw new Error(id ? (moduleName + " instance with ID '" + id + "' not found") : 'ID argument required');
        }
        return that;
    };

    //获得选中的数据（右侧面板）
    treeTransfer.getData = function (id) {
        return thisModule.getThis(id).getData();
    };

    //重载实例
    treeTransfer.reload = function (id) {
        return thisModule.getThis(id).reload(true);
    };

    //核心入口
    treeTransfer.render = function (options) {
        var inst = new Class(options);
        if (treeTransfer.index === 1)
            console.log("欢迎使用树形穿梭框组件v" + treeTransfer.version);
        inst.render(options);
        return thisModule.call(inst);
    };

    exports(moduleName, treeTransfer);

});